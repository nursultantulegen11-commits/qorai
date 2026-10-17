import { Coffee, Croissant, CupSoda, Milk, Package, type LucideIcon } from 'lucide-react';


export default function ProductIcon({category}:{category:string}) {
  let Icon:LucideIcon=Package;
  let tone='neutral';
  if(category.includes('Молоч')) {Icon=Milk;tone='dairy';}
  else if(category.includes('Кофе')) {Icon=Coffee;tone='coffee';}
  else if(category.includes('Выпеч')) {Icon=Croissant;tone='bakery';}
  else if(category.includes('Напит')) {Icon=CupSoda;tone='drink';}
  else if(category.includes('Упаков')) {Icon=Package;tone='packaging';}
  return <span className={`product-icon ${tone}`} aria-hidden="true"><Icon size={24} strokeWidth={1.8}/></span>;
}
