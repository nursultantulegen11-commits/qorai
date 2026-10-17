import { revokeSession,sessionCookie } from '@/lib/auth';
import { sameOrigin,failure } from '@/lib/server';
export async function POST(request:Request){try{
 sameOrigin(request);await revokeSession(request);
 return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':sessionCookie('',true),'Cache-Control':'no-store'}});
}catch(error){return failure(error)}}
