import {validateSupplier,type Supplier} from './suppliers.ts';
export type Product = { id:string; name:string; unit:string; category:string; min:number; weather:string };
export type Lot = { id:string; productId:string; qty:number; price:number; expiry:string|null };
export type Movement = { id:string; productId:string; type:string; qty:number; price:number; at:string; note:string };
export type State = { name:string; demo:boolean; suppliers:Supplier[]; products:Product[]; lots:Lot[]; movements:Movement[]; requests:string[]; leadDays:number; coverDays:number };
export const emptyState = ():State => ({name:"Мой бизнес",demo:false,suppliers:[],products:[],lots:[],movements:[],requests:[],leadDays:1,coverDays:3});
export const today = (date = new Date()) => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
export function stock(s:State,id:string) {return Math.round(s.lots.filter(l=>l.productId===id).reduce((a,l)=>a+l.qty,0)*1000)/1000;}
const num=(v:unknown,min:number,max:number)=>{const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('Проверьте количество и цену');return n;};
const clean=(v:unknown,max=120)=>String(v??'').trim().slice(0,max);
export function applyAction(current:State, action:any, now=new Date()):State {
 const s:State=structuredClone(current);s.suppliers??=[];const at=now.toISOString();const id=()=>crypto.randomUUID();
 if(action.type==='demo') {if(s.products.length||s.movements.length)throw Error('Демо можно включить только в пустом складе');return {...demoState(now),suppliers:s.suppliers};}
 if(action.type==='resetDemo') {if(!s.demo)throw Error('Очистка доступна только для демоданных');return {...emptyState(),suppliers:s.suppliers};}
 if(action.type==='supplierSave') {
  const existing=action.supplier?.id?s.suppliers.find(p=>p.id===action.supplier.id):undefined;
  if(action.supplier?.id&&!existing)throw Error('Поставщик не найден');
  const supplier=validateSupplier(action.supplier??{},existing);
  if(existing)s.suppliers=s.suppliers.map(p=>p.id===supplier.id?supplier:p);
  else {if(s.suppliers.length>=200)throw Error('Можно сохранить до 200 поставщиков');s.suppliers.push(supplier);}
  return s;
 }
 if(action.type==='supplierDelete') {if(!s.suppliers.some(p=>p.id===action.supplierId))throw Error('Поставщик не найден');s.suppliers=s.suppliers.filter(p=>p.id!==action.supplierId);return s;}
 if(action.type==='settings'){s.name=clean(action.name,80)||'Мой бизнес';s.leadDays=num(action.leadDays,0,14);s.coverDays=num(action.coverDays,1,14);return s;}
 if(action.type==='purchase') {
  if(!Array.isArray(action.items)||!action.items.length||action.items.length>100)throw Error('Нужно от 1 до 100 позиций');
  for(const item of action.items){const name=clean(item.name);const unit=clean(item.unit,10)||'шт';if(!name)throw Error('Укажите название товара');
   const qty=num(item.qty,0.001,1000000),price=num(item.price,0,100000000);
   let expiry=clean(item.expiry)||null;
   if(expiry&&(!/^\d{4}-\d{2}-\d{2}$/.test(expiry)||Number.isNaN(Date.parse(expiry))||new Date(expiry).toISOString().slice(0,10)!==expiry))throw Error('Некорректный срок годности');
   let p=s.products.find(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase()&&p.unit===unit);
   if(!p){p={id:id(),name,unit,category:clean(item.category,40)||'Прочее',min:0,weather:clean(item.weather,12)||'neutral'};s.products.push(p);}
   s.lots.push({id:id(),productId:p.id,qty,price,expiry});s.movements.unshift({id:id(),productId:p.id,type:'purchase',qty,price,at,note:clean(action.note)||'Приход товара'});
  }
 } else if(action.type==='sale'||action.type==='writeoff') {
  const p=s.products.find(p=>p.id===action.productId);if(!p)throw Error('Товар не найден');let remaining=num(action.qty,0.001,1000000);
  const amount=remaining;const available=s.lots.filter(l=>l.productId===p.id&&(action.type==='writeoff'||!l.expiry||l.expiry>=today(now))).reduce((a,l)=>a+l.qty,0);if(available+1e-8<remaining)throw Error('Недостаточно товара с допустимым сроком годности. Просроченные партии можно списать.');let cost=0;
  const lots=s.lots.filter(l=>l.productId===p.id&&l.qty>0&&(action.type==='writeoff'||!l.expiry||l.expiry>=today(now))).sort((a,b)=>(a.expiry??'9999').localeCompare(b.expiry??'9999'));
  for(const lot of lots){const used=Math.min(lot.qty,remaining);cost+=used*lot.price;lot.qty=Math.round((lot.qty-used)*1000)/1000;remaining-=used;if(remaining<1e-8)break;}
  s.movements.unshift({id:id(),productId:p.id,type:action.type,qty:amount,price:cost/amount,at,note:clean(action.note)|| (action.type==='sale'?'Продажа':'Списание')});
 } else if(action.type==='product') {
  const p=s.products.find(p=>p.id===action.productId);if(!p)throw Error('Товар не найден');p.min=num(action.min,0,1000000);p.category=clean(action.category,40)||p.category;p.weather=['hot','cold','neutral'].includes(action.weather)?action.weather:'neutral';
 } else throw Error('Неизвестная операция');
 if(s.products.length>2000||s.lots.length>10000||s.movements.length>20000)throw Error('Достигнут лимит MVP. Экспортируйте данные и свяжитесь с командой');
 return s;
}
export function demoState(now=new Date()):State {
 const s=emptyState();s.name='Кофейня «Дәм»';s.demo=true;
 const rows=[['Молоко 3,2%','л','Молочное',8,450,12,2,'neutral'],['Кофе в зёрнах','кг','Кофе и чай',2,6800,4.5,90,'cold'],['Круассан','шт','Выпечка',12,380,18,1,'neutral'],['Сироп ванильный','л','Напитки',1,2400,2.8,60,'neutral'],['Стакан бумажный','шт','Упаковка',100,35,240,null,'neutral'],['Лимонад','л','Напитки',6,520,22,14,'hot'],['Сливки 10%','л','Молочное',3,1100,3,3,'neutral'],['Чай чёрный','кг','Кофе и чай',0.5,4200,1.8,180,'cold']];
 const daily=[6,0.32,14,0.16,38,5,1.1,0.12];
 rows.forEach((r,i)=>{const pid=`demo-${i}`;s.products.push({id:pid,name:String(r[0]),unit:String(r[1]),category:String(r[2]),min:Number(r[3]),weather:String(r[7])});const exp=r[6]===null?null:today(new Date(now.getTime()+Number(r[6])*86400000));s.lots.push({id:`lot-${i}`,productId:pid,qty:Number(r[5]),price:Number(r[4]),expiry:exp});
 for(let d=1;d<=21;d++){const date=new Date(now.getTime()-d*86400000);const raw=daily[i]*(1+(d%5-2)*0.08);const qty=r[1]==='шт'?Math.round(raw):Math.round(raw*100)/100;s.movements.push({id:`sale-${i}-${d}`,productId:pid,type:'sale',qty,price:Number(r[4]),at:date.toISOString(),note:'Демонстрационная продажа'});}
 s.movements.unshift({id:`purchase-${i}`,productId:pid,type:'purchase',qty:Number(r[5])+daily[i]*21,price:Number(r[4]),at:new Date(now.getTime()-22*86400000).toISOString(),note:'Демонстрационный приход'});
 });s.movements.sort((a,b)=>b.at.localeCompare(a.at));return s;
}
export function forecast(s:State, weather:{max:number|null,available:boolean}={max:null,available:false},now=new Date()) {
 return s.products.map(p=>{const sales=s.movements.filter(m=>m.productId===p.id&&m.type==='sale'&&new Date(m.at)<=now&&new Date(m.at).getTime()>=now.getTime()-28*86400000);
 const first=sales.length?Math.min(...sales.map(m=>new Date(m.at).getTime())):now.getTime();const days=Math.min(28,Math.max(1,Math.ceil((now.getTime()-first)/86400000)));
 const daily=sales.reduce((a,m)=>a+m.qty,0)/days;const onHand=stock(s,p.id);const daysAhead=s.leadDays+s.coverDays;
 const dates=Array.from({length:daysAhead},(_,i)=>new Date(now.getTime()+(i+1)*86400000));
 const weekend=(v:Date)=>{const day=new Date(v.toLocaleString('en-US',{timeZone:'Asia/Almaty'})).getDay();return day===0||day===6;};
 const wf=weather.available&&weather.max!==null ? p.weather==='hot'&&weather.max>=25?1.15:p.weather==='cold'&&weather.max<=10?1.1:1:1;
 const expected=daily*dates.reduce((a,d)=>a+(weekend(d)?1.15:1),0)*wf;
 const expiring=s.lots.filter(l=>l.productId===p.id&&l.qty>0&&l.expiry&&l.expiry<=today(new Date(now.getTime()+daysAhead*86400000))).reduce((a,l)=>a+l.qty,0);
 const expired=s.lots.filter(l=>l.productId===p.id&&l.qty>0&&l.expiry&&l.expiry<today(now)).reduce((a,l)=>a+l.qty,0);
 const usable=Math.max(0,onHand-expired);const shortage=sales.length?Math.max(0,expected-usable,p.min-usable):Math.max(0,p.min-usable);
 const unitStep=p.unit==='шт'?1:0.1;const buy=Math.ceil(shortage/unitStep)*unitStep;const last=s.lots.filter(l=>l.productId===p.id).at(-1);const price=last?.price??0;
 return {...p,stock:onHand,daily,daysLeft:daily?usable/daily:null,buy:Math.round(buy*10)/10,cost:Math.round(buy*price),expiring,expired,historyDays:days,hasHistory:sales.length>0,weatherFactor:wf,expected,expiry:s.lots.filter(l=>l.productId===p.id&&l.qty>0&&l.expiry).map(l=>l.expiry!).sort()[0]??null};
 });
}
export function parseText(text:string){
 const lines=text.split(/[\n;]+/).map(l=>l.trim()).filter(Boolean);const items=[];
 for(const line of lines){const m=line.match(/^(.+?)\s*[-:–]?\s+(\d+(?:[.,]\d+)?)\s*(кг|kg|л|литр(?:ов|а)?|шт(?:ук)?|уп|г)?\s*(?:по|x|х|×|@)\s*(\d+(?:[.,]\d+)?)\s*(?:₸|тг|тенге)?\s*$/i);if(m){items.push({name:m[1].replace(/[-:–]\s*$/,'').trim(),qty:Number(m[2].replace(',','.')),unit:m[3]?.startsWith('литр')?'л':m[3]||'шт',price:Number(m[4].replace(',','.')),expiry:''});}}
 return items;
}
