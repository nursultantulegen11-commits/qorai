import { loginAccount,sessionCookie,clientAddress,limitRequest } from '@/lib/auth';
import { loginInput } from '@/lib/auth-input';
import { sameOrigin,body,json,failure,AppError } from '@/lib/server';
export async function POST(request:Request){try{
 sameOrigin(request);const input=loginInput.safeParse(await body(request,8000));
 if(!input.success)throw new AppError('Укажите email и пароль');
 const address=clientAddress(request);
 await limitRequest('login-ip',address,address==='unknown'?200:40,600);
 await limitRequest('login-email',input.data.email,12,600);
 const {account,token}=await loginAccount(input.data.email,input.data.password);
 const response=json({user:account});response.headers.set('Set-Cookie',sessionCookie(token));return response;
}catch(error){return failure(error)}}
