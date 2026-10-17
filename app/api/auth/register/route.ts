import { registerAccount,sessionCookie,clientAddress,limitRequest } from '@/lib/auth';
import { registerInput } from '@/lib/auth-input';
import { sameOrigin,body,json,failure,AppError } from '@/lib/server';
export async function POST(request:Request){try{
 sameOrigin(request);const input=registerInput.safeParse(await body(request,8000));
 if(!input.success)throw new AppError('Укажите имя, корректный email и пароль от 15 до 128 символов');
 const address=clientAddress(request);await limitRequest('register',address,address==='unknown'?60:10,3600);
 const {account,token}=await registerAccount(input.data.name,input.data.email,input.data.password);
 const response=json({user:account},201);response.headers.set('Set-Cookie',sessionCookie(token));return response;
}catch(error){return failure(error)}}
