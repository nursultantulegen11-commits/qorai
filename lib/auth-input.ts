import { z } from 'zod';
export const emailInput=z.string().trim().max(254).email().transform(value=>value.toLowerCase());
export const passwordInput=z.string().min(15,'Пароль должен содержать не менее 15 символов').max(128,'Максимальная длина пароля — 128 символов').refine(value=>value.trim().length>0,'Введите пароль');
export const registerInput=z.object({name:z.string().trim().min(2).max(80),email:emailInput,password:passwordInput});
export const loginInput=z.object({email:emailInput,password:z.string().min(1).max(128)});
export const changePasswordInput=z.object({oldPassword:z.string().min(1).max(128),password:passwordInput});
