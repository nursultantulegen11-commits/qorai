import { user,readState,writeState,json,failure,body,sameOrigin,AppError } from '@/lib/server';
import { applyAction } from '@/lib/domain';
export async function POST(request:Request){try{
 sameOrigin(request);const owner=await user(request);const data=await body(request);
 if(typeof data.requestId!=='string'||!data.requestId||data.requestId.length>100)throw new AppError('Нужен идентификатор операции');
 const current=await readState(owner);
 if(current.state.requests.includes(data.requestId))return json({...current,duplicate:true});
 if(data.revision!==current.revision)throw new AppError('Данные изменились на другом устройстве. Обновите страницу и повторите.',409);
 let state;try{state=applyAction(current.state,data)}catch(e){throw new AppError(e instanceof Error?e.message:'Проверьте данные')}
 state.requests=[data.requestId,...current.state.requests].slice(0,2000);
 if(!await writeState(owner,current.revision,state)){
  const latest=await readState(owner);
  if(latest.state.requests.includes(data.requestId))return json({...latest,duplicate:true});
  throw new AppError('Одновременное изменение склада. Обновите данные и повторите.',409);
 }
 return json({state,revision:current.revision+1});
}catch(e){return failure(e)}}
