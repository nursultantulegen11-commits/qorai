import { user,readState,json,failure } from '@/lib/server';
export async function GET(request:Request){try{return json(await readState(await user(request)))}catch(e){return failure(e)}}
