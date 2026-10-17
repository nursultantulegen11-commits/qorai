import Dashboard from './dashboard';
import { getChatGPTUser } from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
  const [user,params]=await Promise.all([getChatGPTUser(),searchParams]);
  const guest=!user||params?.demo==='1';
  return <Dashboard userName={guest?'Гость':user!.displayName} guest={guest}/>;
}
