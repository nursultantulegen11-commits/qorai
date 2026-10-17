import { user,readState,writeState,body,sameOrigin,json,failure,AppError } from '@/lib/server';
import { limitRequest } from '@/lib/auth';
import { restoreBackup } from '@/lib/backup';
export async function POST(request:Request){try{
 sameOrigin(request);const owner=await user(request);await limitRequest('import',owner,5,3600);
 const input=await body(request,8*1024*1024),current=await readState(owner);
 if(current.revision!==input.revision)throw new AppError('Данные изменились. Обновите склад и повторите.',409);
 if(current.state.products.length||current.state.lots.length||current.state.movements.length||current.state.suppliers.length)throw new AppError('Загрузить резервную копию можно только в пустой склад. Текущие данные не изменены.',409);
 let state;try{state=restoreBackup(input.backup)}catch{throw new AppError('Файл не является корректной резервной копией QorAI')}
 if(!await writeState(owner,current.revision,state))throw new AppError('Склад изменился во время импорта. Обновите данные.',409);
 return json({state,revision:current.revision+1});
}catch(error){return failure(error)}}
