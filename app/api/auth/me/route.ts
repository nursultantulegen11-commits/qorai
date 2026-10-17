import { requireAccount } from '@/lib/auth';
import { json,failure } from '@/lib/server';
export async function GET(request:Request){try{return json({user:await requireAccount(request)})}catch(error){return failure(error)}}
