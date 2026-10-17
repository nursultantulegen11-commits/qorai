import AuthForm from '@/components/auth-form';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'Вход — QorAI'};
export default function Login(){return <AuthForm mode="login"/>}
