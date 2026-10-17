import { z } from 'zod';
import { type State } from './domain.ts';
import { validateSupplier } from './suppliers.ts';
const id=z.string().min(1).max(100);
const count=z.number().finite().min(0).max(1e6);
const price=z.number().finite().min(0).max(1e8);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value);
const schema=z.object({
 name:z.string().trim().min(1).max(80),demo:z.boolean(),leadDays:z.number().finite().min(0).max(14),coverDays:z.number().finite().min(1).max(14),
 products:z.array(z.object({id,name:z.string().min(1).max(120),unit:z.string().min(1).max(10),category:z.string().max(40),min:count,weather:z.string().max(12)})).max(2000),
 lots:z.array(z.object({id,productId:id,qty:count,price,expiry:date.nullable()})).max(10000),
 movements:z.array(z.object({id,productId:id,type:z.enum(['purchase','sale','writeoff']),qty:count.positive(),price,at:z.string().datetime(),note:z.string().max(120)})).max(20000),
 suppliers:z.array(z.object({id,name:z.string().min(1).max(100),contact:z.string().max(80),phone:z.string().max(40),telegram:z.string().max(100),category:z.string().max(60),notes:z.string().max(800),createdAt:z.string().datetime()})).max(200).default([]),
});
export function restoreBackup(input:unknown):State{
 const wrapper=input as {state?:unknown}|null;
 const data=schema.parse(wrapper?.state??input);
 for(const rows of [data.products,data.lots,data.movements,data.suppliers])if(new Set(rows.map(row=>row.id)).size!==rows.length)throw Error('В копии есть повторяющиеся идентификаторы');
 const products=new Set(data.products.map(p=>p.id));
 if([...data.lots,...data.movements].some(row=>!products.has(row.productId)))throw Error('В копии есть операции с неизвестными товарами');
 const suppliers=data.suppliers.map(s=>validateSupplier(s,s));
 return {...data,suppliers,requests:[]};
}
