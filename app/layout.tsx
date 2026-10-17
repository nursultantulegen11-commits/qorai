import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'QorAI — ваш склад под контролем',description:'Умный помощник для кафе и магазинов Тараза. Учёт товаров, накладные и план закупок.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/icon-192.png'},appleWebApp:{capable:true,title:'QorAI',statusBarStyle:'default'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}
