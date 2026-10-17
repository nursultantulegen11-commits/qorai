import Dashboard from './dashboard';
import { currentAccount } from '@/lib/auth';
export const dynamic='force-dynamic';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const [account,params]=await Promise.all([currentAccount(),searchParams]);
 const guest=!account||params?.demo==='1';
 return <Dashboard userName={guest?'Гость':account!.name} guest={guest}/>;
}
