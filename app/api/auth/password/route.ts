import { requireAccount,changePassword,sessionCookie,limitRequest } from '@/lib/auth';
import { changePasswordInput } from '@/lib/auth-input';
import { sameOrigin,body,json,failure,AppError } from '@/lib/server';
export async function POST(request:Request){try{
 sameOrigin(request);const account=await requireAccount(request);await limitRequest('password-change',account.id,10,3600);
 const input=changePasswordInput.safeParse(await body(request,8000));
 if(!input.success)throw new AppError('Введите текущий пароль и новый пароль от 15 до 128 символов');
 const token=await changePassword(account.id,input.data.oldPassword,input.data.password);
 const response=json({ok:true});response.headers.set('Set-Cookie',sessionCookie(token));return response;
}catch(error){return failure(error)}}
