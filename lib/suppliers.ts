export type Supplier = {id:string;name:string;contact:string;phone:string;telegram:string;category:string;notes:string;createdAt:string};
export type OrderItem = {name:string;buy:number;unit:string};
export function normalizePhone(input:unknown):string {
 const raw=String(input??'').trim();
 if(!raw)return '';
 if(!/^[+\d\s().-]+$/.test(raw))throw Error('Укажите номер телефона в международном формате');
 let digits=raw.replace(/\D/g,'');
 if(digits.length===10&&!raw.startsWith('+'))digits='7'+digits;
 if(digits.length===11&&digits.startsWith('8')&&!raw.startsWith('+'))digits='7'+digits.slice(1);
 if(!/^[1-9]\d{7,14}$/.test(digits))throw Error('Номер должен содержать от 8 до 15 цифр с кодом страны');
 return '+'+digits;
}
export function normalizeTelegram(input:unknown):string {
 let value=String(input??'').trim();if(!value)return '';
 value=value.replace(/^https?:\/\/(?:www\.)?t\.me\//i,'').replace(/^@/,'').replace(/\/$/,'');
 if(!/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/.test(value))throw Error('Telegram: укажите @username из 5–32 букв, цифр или знаков подчёркивания');
 return value;
}
export function validateSupplier(input:any,existing?:Supplier):Supplier {
 const clean=(v:unknown,max:number)=>String(v??'').trim().slice(0,max);
 const name=clean(input.name,100);if(!name)throw Error('Укажите имя или компанию поставщика');
 const phone=normalizePhone(input.phone),telegram=normalizeTelegram(input.telegram);
 if(!phone&&!telegram)throw Error('Добавьте телефон для WhatsApp или username Telegram');
 return {id:existing?.id??crypto.randomUUID(),name,contact:clean(input.contact,80),phone,telegram,category:clean(input.category,60),notes:clean(input.notes,800),createdAt:existing?.createdAt??new Date().toISOString()};
}
export function supplierLink(supplier:Supplier,channel:'whatsapp'|'telegram',message=''):string|null {
 if(channel==='whatsapp')return supplier.phone?`https://wa.me/${supplier.phone.replace(/\D/g,'')}${message?'?text='+encodeURIComponent(message):''}`:null;
 return supplier.telegram?`https://t.me/${supplier.telegram}${message?'?text='+encodeURIComponent(message):''}`:null;
}
export function buildSupplierOrder(business:string,items:OrderItem[]):string {
 return `Здравствуйте! Хочу сделать заказ для ${business}.\n\n${items.length?items.map(p=>`${p.name} — ${new Intl.NumberFormat('ru-RU',{maximumFractionDigits:2}).format(p.buy)} ${p.unit}`).join('\n'):'Укажите товары и количество.'}\n\nПодскажите, пожалуйста, наличие, стоимость и ближайшее время доставки. Спасибо!`;
}
