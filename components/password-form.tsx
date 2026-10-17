'use client';
import { useState,type FormEvent } from 'react';
import { LockKeyhole,Check } from 'lucide-react';
export default function PasswordForm(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=event.currentTarget,data=new FormData(form);setMessage('');setError('');
  if(data.get('password')!==data.get('confirmation')){setError('Новые пароли не совпадают');return;}
  setBusy(true);try{const response=await fetch('/api/auth/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({oldPassword:data.get('oldPassword'),password:data.get('password')})});const result=await response.json();if(!response.ok)throw Error(result.error||'Не удалось изменить пароль');form.reset();setMessage('Пароль изменён. Вход на остальных устройствах завершён.');}catch(e){setError((e as Error).message)}finally{setBusy(false)}
 }
 return <section className="password-settings"><h2><LockKeyhole size={21}/>Безопасность аккаунта</h2><p>Пароль защищает доступ к вашему складу и контактам поставщиков.</p><form onSubmit={submit}><label>Текущий пароль<input name="oldPassword" type="password" autoComplete="current-password" maxLength={128} required disabled={busy}/></label><label>Новый пароль<input name="password" type="password" autoComplete="new-password" minLength={15} maxLength={128} placeholder="Не менее 15 символов" required disabled={busy}/></label><label>Повторите новый пароль<input name="confirmation" type="password" autoComplete="new-password" minLength={15} maxLength={128} required disabled={busy}/></label>{error&&<p className="password-error" role="alert">{error}</p>}{message&&<p className="password-success" role="status">{message}</p>}<button className="primary" type="submit" disabled={busy}><Check size={16}/>{busy?'Сохраняем…':'Изменить пароль'}</button></form></section>;
}
