import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { AppError } from './errors.ts';

const cost = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
let active = 0;
const waiting: (() => void)[] = [];
async function derive(password: string, salt: Buffer): Promise<Buffer> {
  if (active < 2) active++;
  else {
    if (waiting.length >= 16) throw new AppError('Сервис входа занят. Повторите через минуту.', 429);
    await new Promise<void>(resolve => waiting.push(resolve));
  }
  try {
    return await new Promise<Buffer>((resolve, reject) => scrypt(password, salt, 64, cost, (error, key) => error ? reject(error) : resolve(key)));
  } finally {
    const next = waiting.shift();
    if (next) next(); else active--;
  }
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(24);
  const key = await derive(password, salt);
  return `scrypt$32768$8$3$${salt.toString('base64url')}$${key.toString('base64url')}`;
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const parts = encoded.split('$');
  if (parts.length !== 6 || parts.slice(0, 4).join('$') !== 'scrypt$32768$8$3' || !/^[A-Za-z0-9_-]{32}$/.test(parts[4]) || !/^[A-Za-z0-9_-]{86}$/.test(parts[5])) return false;
  const actual = await derive(password, Buffer.from(parts[4], 'base64url'));
  const expected = Buffer.from(parts[5], 'base64url');
  return expected.length === actual.length && timingSafeEqual(actual, expected);
}
export function tokenDigest(value: string): string { return createHash('sha256').update(value).digest('hex'); }
export function newSessionToken(): string { return randomBytes(32).toString('base64url'); }
export function cookieToken(header: string | null, name: string): string | null {
  const matches = (header || '').split(';').map(part => part.trim()).filter(part => part.startsWith(name + '='));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(name.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function verifyOrigin(request: Request, expected: string): void {
  if (request.headers.get('origin') !== expected || request.headers.get('sec-fetch-site') === 'cross-site') throw new AppError('Недопустимый источник запроса', 403);
}
