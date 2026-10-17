import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const client = new pg.Client({connectionString:process.env.DATABASE_URL, connectionTimeoutMillis:10000, ...(process.env.DB_SSL==='1'?{ssl:{rejectUnauthorized:true,...(process.env.DB_SSL_CA?{ca:process.env.DB_SSL_CA}:{})}}:{})});
try {
 await client.connect();
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(717672410)');
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
 const dir=fileURLToPath(new URL('../migrations/',import.meta.url));
 for(const name of (await readdir(dir)).filter(n=>/^\d+_.+\.sql$/.test(n)).sort()){
  const sql=await readFile(new URL('../migrations/'+name,import.meta.url),'utf8');
  const checksum=createHash('sha256').update(sql).digest('hex');
  const {rows}=await client.query('SELECT checksum FROM schema_migrations WHERE version=$1',[name]);
  if(rows.length){if(rows[0].checksum!==checksum)throw new Error('Applied migration was changed: '+name);continue;}
  await client.query(sql);
  await client.query('INSERT INTO schema_migrations(version,checksum) VALUES($1,$2)',[name,checksum]);
  console.log('Applied migration:',name);
 }
 await client.query('COMMIT');
 console.log('Database migrations are up to date');
} catch(error){
 await client.query('ROLLBACK').catch(()=>{});
 console.error('Database migration failed:',error?.code||error?.name||'Error');process.exitCode=1;
} finally {await client.end();}
