import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.QORAI_TEST_URL||'http://127.0.0.1:8787';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Tests must only run locally');
const owner='test-'+crypto.randomUUID();
async function call(path,method='GET',data,auth=owner){const r=await fetch(base+path,{method,headers:{...(auth?{'oai-authenticated-user-id':auth,'oai-authenticated-user-email':'test@example.test'}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};}
test('persistent API: authentication, atomic purchase, idempotency, conflict and isolation',async()=>{
 assert.equal((await call('/api/state','GET',undefined,null)).status,401);
 const initial=await call('/api/state');assert.equal(initial.status,200);assert.equal(initial.data.revision,0);
 const action={type:'purchase',items:[{name:'API Milk',qty:20,price:450,unit:'л'}],revision:0,requestId:crypto.randomUUID()};
 const saved=await call('/api/action','POST',action);assert.equal(saved.status,200);assert.equal(saved.data.state.lots[0].qty,20);
 const duplicate=await call('/api/action','POST',action);assert.equal(duplicate.status,200);assert.equal(duplicate.data.duplicate,true);assert.equal(duplicate.data.state.lots.length,1);
 const conflict=await call('/api/action','POST',{...action,requestId:crypto.randomUUID()});assert.equal(conflict.status,409);
 const other=await call('/api/state','GET',undefined,owner+'-other');assert.equal(other.data.state.products.length,0);
 const persisted=await call('/api/state');assert.equal(persisted.data.state.products[0].name,'API Milk');
 const oversell=await call('/api/action','POST',{type:'sale',productId:saved.data.state.products[0].id,qty:21,revision:1,requestId:crypto.randomUUID()});assert.equal(oversell.status,400);
 const after=await call('/api/state');assert.equal(after.data.revision,1);assert.equal(after.data.state.lots[0].qty,20);
 const simultaneous=await Promise.all([1,2].map(()=>call('/api/action','POST',{type:'sale',productId:saved.data.state.products[0].id,qty:1,revision:1,requestId:crypto.randomUUID()})));assert.deepEqual(simultaneous.map(x=>x.status).sort(),[200,409]);
 const form=new FormData();form.set('text','Молоко 2 л по 450');const parsed=await fetch(base+'/api/parse',{method:'POST',headers:{'oai-authenticated-user-id':owner},body:form});assert.equal(parsed.status,200);assert.equal((await parsed.json()).items[0].qty,2);
 const csrf=await fetch(base+'/api/action',{method:'POST',headers:{'oai-authenticated-user-id':owner,'Origin':'https://example.com','Content-Type':'application/json'},body:JSON.stringify(action)});assert.equal(csrf.status,403);
});
