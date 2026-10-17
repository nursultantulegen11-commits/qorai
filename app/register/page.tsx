import AuthForm from '@/components/auth-form';
import type { Metadata } from 'next';
export const metadata:Metadata={title:'Создать аккаунт — QorAI'};
export default function Register(){return <AuthForm mode="register"/>}
