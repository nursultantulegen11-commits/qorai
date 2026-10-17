import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import type { PoolClient } from 'pg';
import { database, transaction } from './db.ts';
import { AppError } from './errors.ts';
import { appOrigin } from './config.ts';
import { hashPassword, verifyPassword, newSessionToken, tokenDigest, cookieToken } from './security.ts';
import { emptyState } from './domain.ts';

export type Account = { id: string; name: string; email: string };
const sessionAge = 7 * 24 * 60 * 60;
export function sessionName(): string { return appOrigin().protocol === 'https:' ? '__Host-qorai_session' : 'qorai_session'; }
export function sessionCookie(token: string, clear = false): string {
  return `${sessionName()}=${clear ? '' : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : sessionAge}${appOrigin().protocol === 'https:' ? '; Secure' : ''}`;
}
async function findAccount(token: string | null): Promise<Account | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const { rows } = await database().query<Account>('SELECT u.id,u.name,u.email FROM sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [tokenDigest(token)]);
  return rows[0] || null;
}
export async function currentAccount(): Promise<Account | null> {
  const jar = await cookies();
  return findAccount(jar.get(sessionName())?.value || null);
}
export async function requireAccount(request: Request): Promise<Account> {
  const account = await findAccount(cookieToken(request.headers.get('cookie'), sessionName()));
  if (!account) throw new AppError('Войдите в аккаунт, чтобы работать со складом', 401);
  return account;
}
async function issueSession(accountId: string, client: Pick<PoolClient, 'query'> = database()): Promise<string> {
  const token = newSessionToken();
  await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')", [tokenDigest(token), accountId]);
  return token;
}
export async function registerAccount(name: string, email: string, password: string): Promise<{ account: Account; token: string }> {
  const passwordHash = await hashPassword(password);
  try {
    return await transaction(async client => {
      const account = { id: randomUUID(), name, email };
      await client.query('INSERT INTO app_users(id,name,email,password_hash) VALUES($1,$2,$3,$4)', [account.id, name, email, passwordHash]);
      await client.query('INSERT INTO workspaces(owner,data,revision) VALUES($1,$2,0)', [account.id, JSON.stringify(emptyState())]);
      return { account, token: await issueSession(account.id, client) };
    });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') throw new AppError('Этот email уже зарегистрирован. Войдите в аккаунт.', 409);
    throw error;
  }
}
let dummyHash: Promise<string> | undefined;
export async function loginAccount(email: string, password: string): Promise<{ account: Account; token: string }> {
  const { rows } = await database().query<Account & { password_hash: string }>('SELECT id,name,email,password_hash FROM app_users WHERE email=$1', [email]);
  const row = rows[0];
  const encoded = row?.password_hash || await (dummyHash ||= hashPassword('QorAI dummy verification value'));
  const valid = await verifyPassword(password, encoded);
  if (!valid || !row) throw new AppError('Неверный email или пароль', 401);
  return transaction(async client => {
    const locked = await client.query('SELECT id FROM app_users WHERE id=$1 AND password_hash=$2 FOR UPDATE', [row.id,row.password_hash]);
    if (!locked.rows[0]) throw new AppError('Неверный email или пароль', 401);
    await client.query('DELETE FROM sessions WHERE user_id=$1 AND expires_at<=now()', [row.id]);
    return { account: { id: row.id, name: row.name, email: row.email }, token: await issueSession(row.id,client) };
  });
}
export async function revokeSession(request: Request): Promise<void> {
  const token = cookieToken(request.headers.get('cookie'), sessionName());
  if (token) await database().query('DELETE FROM sessions WHERE token_hash=$1', [tokenDigest(token)]);
}
export async function changePassword(accountId: string, oldPassword: string, password: string): Promise<string> {
  const { rows } = await database().query<{ password_hash: string }>('SELECT password_hash FROM app_users WHERE id=$1', [accountId]);
  if (!rows[0] || !await verifyPassword(oldPassword, rows[0].password_hash)) throw new AppError('Текущий пароль указан неверно', 400);
  const encoded = await hashPassword(password);
  return transaction(async client => {
    const changed = await client.query('UPDATE app_users SET password_hash=$1 WHERE id=$2 AND password_hash=$3', [encoded, accountId, rows[0].password_hash]);
    if (changed.rowCount !== 1) throw new AppError('Пароль уже изменился. Войдите заново.', 409);
    await client.query('DELETE FROM sessions WHERE user_id=$1', [accountId]);
    return issueSession(accountId, client);
  });
}
export async function limitRequest(scope: string, identity: string, maximum: number, seconds: number): Promise<void> {
  const bucket = tokenDigest(scope + ':' + identity);
  const { rows } = await database().query<{ attempts: number }>(`INSERT INTO request_limits(bucket,attempts,reset_at) VALUES($1,1,now()+make_interval(secs=>$2)) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN request_limits.reset_at<=now() THEN 1 ELSE request_limits.attempts+1 END,reset_at=CASE WHEN request_limits.reset_at<=now() THEN EXCLUDED.reset_at ELSE request_limits.reset_at END RETURNING attempts`, [bucket, seconds]);
  if (rows[0].attempts > maximum) throw new AppError('Слишком много попыток. Повторите позже.', 429);
}
export function clientAddress(request: Request): string {
  const value = process.env.TRUST_PROXY === '1' ? request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() : '';
  return value && /^[a-fA-F0-9:.]{3,64}$/.test(value) ? value : 'unknown';
}
