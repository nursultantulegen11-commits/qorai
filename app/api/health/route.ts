import { database } from '@/lib/db';
import { appOrigin } from '@/lib/config';
export const dynamic='force-dynamic';
export async function GET(){try{appOrigin();await database().query('SELECT 1 FROM schema_migrations LIMIT 1');return Response.json({status:'ok',database:'ok',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({status:'degraded',database:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})}}
