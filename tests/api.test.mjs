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
test('supplier contacts persist per account and support editing and removal',async()=>{
 const account=owner+'-suppliers';
 const initial=await call('/api/state','GET',undefined,account);assert.deepEqual(initial.data.state.suppliers,[]);
 const saved=await call('/api/action','POST',{type:'supplierSave',supplier:{name:'Test Supplier',phone:'8 (701) 123-45-67',telegram:'@test_supplier',notes:'API test'},revision:0,requestId:crypto.randomUUID()},account);
 assert.equal(saved.status,200);const supplier=saved.data.state.suppliers[0];assert.equal(supplier.phone,'+77011234567');
 const reload=await call('/api/state','GET',undefined,account);assert.equal(reload.data.state.suppliers[0].id,supplier.id);
 const other=await call('/api/state','GET',undefined,account+'-other');assert.deepEqual(other.data.state.suppliers,[]);
 const invalid=await call('/api/action','POST',{type:'supplierSave',supplier:{name:'Invalid',telegram:'https://evil.example/a'},revision:1,requestId:crypto.randomUUID()},account);assert.equal(invalid.status,400);
 const edited=await call('/api/action','POST',{type:'supplierSave',supplier:{...supplier,name:'Updated Supplier'},revision:1,requestId:crypto.randomUUID()},account);assert.equal(edited.status,200);assert.equal(edited.data.state.suppliers.length,1);assert.equal(edited.data.state.suppliers[0].name,'Updated Supplier');
 const removed=await call('/api/action','POST',{type:'supplierDelete',supplierId:supplier.id,revision:2,requestId:crypto.randomUUID()},account);assert.equal(removed.status,200);assert.deepEqual(removed.data.state.suppliers,[]);
 const noAuth=await call('/api/action','POST',{type:'supplierSave',supplier:{name:'Blocked',phone:'+77011234567'},revision:0,requestId:crypto.randomUUID()},null);assert.equal(noAuth.status,401);
});
test('anonymous visitors can view demo HTML without opening an account workspace',async()=>{const response=await fetch(base+'/');assert.equal(response.status,200);const html=await response.text();assert.match(html,/Попробуйте QorAI в деморежиме/);assert.match(html,/Демонстрационный доступ/);assert.doesNotMatch(html,/API Milk/);});
