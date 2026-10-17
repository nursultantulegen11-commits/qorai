import { env } from 'cloudflare:workers';
export async function GET(){try{await env.DB!.prepare('SELECT 1').first();return Response.json({status:'ok',database:'ok',time:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({status:'degraded',database:'unavailable'},{status:503})}}
