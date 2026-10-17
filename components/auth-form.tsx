'use client';
import { useState,type FormEvent } from 'react';
import { ArrowRight,Eye,EyeOff,Package,ShieldCheck,Check,LoaderCircle,ArrowUpRight } from 'lucide-react';
import './auth.css';
export default function AuthForm({mode}:{mode:'login'|'register'}){
 const register=mode==='register';
 const [visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setError('');const data=new FormData(event.currentTarget);
  if(register&&data.get('password')!==data.get('confirmation')){setError('Пароли не совпадают');return;}
  setBusy(true);
  try{
   const response=await fetch(`/api/auth/${mode}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:data.get('name'),email:data.get('email'),password:data.get('password')})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Не удалось войти. Повторите попытку.');
   window.location.assign('/');
  }catch(e){setError(e instanceof Error?e.message:'Проверьте подключение к интернету');setBusy(false);}
 }
 return <main className="auth-page">
  <section className="auth-story">
   <a className="auth-brand" href="/"><span><Package size={27}/></span>QorAI</a>
   <div className="auth-story-content"><span className="auth-eyebrow">С ЗАБОТОЙ О ВАШЕМ ДЕЛЕ</span><h1>Ваш бизнес.<br/>Ваш склад.<br/><em>Всё под контролем.</em></h1><p>Запасы, закупки и поставщики в одном месте. На компьютере и в вашем телефоне.</p><div className="auth-points"><span><Check size={18}/>Личный склад для вашего бизнеса</span><span><Check size={18}/>Понятный план закупок</span><span><Check size={18}/>Контакты поставщиков под рукой</span></div></div>
   <p className="auth-story-footer">QorAI · Тараз, Казахстан</p>
  </section>
  <section className="auth-form-panel">
   <a href="/?demo=1" className="auth-demo">Посмотреть демо <ArrowUpRight size={17}/></a>
   <div className="auth-form-wrap">
    <span className="auth-symbol"><ShieldCheck size={28}/></span>
    <h2>{register?'Начните своё дело с порядка':'С возвращением'}</h2>
    <p className="auth-description">{register?'Создайте аккаунт, чтобы сохранять запасы и управлять закупками.':'Войдите в свой аккаунт и продолжите работу со складом.'}</p>
    <form onSubmit={submit} className="auth-form">
     {register&&<label>Ваше имя<input name="name" autoComplete="name" placeholder="Как к вам обращаться" minLength={2} maxLength={80} required disabled={busy}/></label>}
     <label>Email<input name="email" type="email" autoComplete="email" placeholder="you@example.com" maxLength={254} required disabled={busy}/></label>
     <label>Пароль<span className="auth-password"><input name="password" type={visible?'text':'password'} autoComplete={register?'new-password':'current-password'} placeholder={register?'Не менее 15 символов':'Ваш пароль'} minLength={register?15:1} maxLength={128} required disabled={busy}/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?'Скрыть пароль':'Показать пароль'}>{visible?<EyeOff size={19}/>:<Eye size={19}/>}</button></span></label>
     {register&&<label>Повторите пароль<input name="confirmation" type={visible?'text':'password'} autoComplete="new-password" placeholder="Ещё раз, чтобы не ошибиться" minLength={15} maxLength={128} required disabled={busy}/></label>}
     {error&&<p className="auth-error" role="alert">{error}</p>}
     <button className="auth-submit" disabled={busy} type="submit">{busy?<><LoaderCircle className="auth-spin" size={19}/>Подождите…</>:<>{register?'Создать аккаунт':'Войти'}<ArrowRight size={19}/></>}</button>
    </form>
    <p className="auth-switch">{register?'Уже есть аккаунт?':'Впервые в QorAI?'} <a href={register?'/login':'/register'}>{register?'Войти':'Создать аккаунт'}</a></p>
    <p className="auth-privacy"><ShieldCheck size={15}/>Ваши запасы доступны только в вашем аккаунте.</p>
   </div>
  </section>
 </main>;
}
