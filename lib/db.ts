import { Pool, type PoolClient } from 'pg';
import { AppError } from './errors.ts';

const shared = globalThis as unknown as { qoraiPool?: Pool };
export function database(): Pool {
  if (!process.env.DATABASE_URL) throw new AppError('База данных временно недоступна', 503);
  if (!shared.qoraiPool) {
    shared.qoraiPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 7000,
      statement_timeout: 12000,
      ...(process.env.DB_SSL === '1' ? { ssl: { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {}) } } : {}),
    });
    shared.qoraiPool.on('error', () => console.error('Database connection unavailable'));
  }
  return shared.qoraiPool;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await database().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
