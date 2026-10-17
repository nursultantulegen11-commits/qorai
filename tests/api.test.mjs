import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,randomBytes } from 'node:crypto';
const base=process.env.QORAI_TEST_URL||'http://127.0.0.1:3100';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Tests must only run locally');
const prefix='test-'+randomUUID();
const password=randomBytes(24).toString('base64url');
async function call(path,{method='GET',data,cookie,origin=base,headers={}}={}){
 const response=await fetch(base+path,{method,redirect:'manual',headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'&&origin?{Origin:origin}:{}),...(data?{'Content-Type':'application/json'}:{}),...headers},...(data?{body:JSON.stringify(data)}:{})});
 return {status:response.status,data:response.headers.get('content-type')?.includes('application/json')?await response.json():null,cookie:response.headers.get('set-cookie')?.split(';')[0],cookieHeader:response.headers.get('set-cookie'),headers:response.headers};
}
async function account(suffix){const email=`${prefix}-${suffix}@qorai.test`;const r=await call('/api/auth/register',{method:'POST',data:{name:'Test Owner',email,password}});assert.equal(r.status,201,JSON.stringify(r.data));return {...r,email};}

test('cookie authentication rejects spoofed headers, rotates sessions, and revokes logout',async()=>{
 assert.equal((await call('/api/state')).status,401);
 assert.equal((await call('/api/state',{headers:{'x-user-id':'forged','x-user-email':'forged@example.com'}})).status,401);
 const first=await account('auth');
 assert.match(first.cookieHeader,/HttpOnly/);assert.match(first.cookieHeader,/SameSite=Lax/);assert.match(first.cookieHeader,/Path=\//);assert.equal(first.data.user.password_hash,undefined);
 assert.equal((await call('/api/auth/me',{cookie:first.cookie})).data.user.email,first.email);
 const bad=await call('/api/auth/login',{method:'POST',data:{email:first.email,password:'wrong password'}});assert.equal(bad.status,401);
 const second=await call('/api/auth/login',{method:'POST',data:{email:first.email.toUpperCase(),password}});assert.equal(second.status,200);assert.notEqual(first.cookie,second.cookie);
 const logout=await call('/api/auth/logout',{method:'POST',cookie:second.cookie});assert.equal(logout.status,303);assert.match(logout.cookieHeader,/Max-Age=0/);
 assert.equal((await call('/api/state',{cookie:second.cookie})).status,401);
 assert.equal((await call('/api/state',{cookie:first.cookie})).status,200);
});
test('account and workspace changes block missing and foreign origins',async()=>{
 for(const origin of [null,'https://attacker.example']){
  const r=await call('/api/auth/register',{method:'POST',origin,data:{name:'Blocked',email:`${prefix}-csrf@qorai.test`,password}});assert.equal(r.status,403);
 }
 const owner=await account('csrf');
 for(const origin of [null,'https://attacker.example'])assert.equal((await call('/api/action',{method:'POST',origin,cookie:owner.cookie,data:{type:'demo',revision:0,requestId:randomUUID()}})).status,403);
 const login=await call('/api/auth/login',{method:'POST',origin:'https://attacker.example',data:{email:owner.email,password}});assert.equal(login.status,403);
});
test('PostgreSQL preserves purchases, idempotency, conflicts and account isolation',async()=>{
 const owner=await account('stock'),other=await account('other');
 const initial=await call('/api/state',{cookie:owner.cookie});assert.equal(initial.status,200);assert.equal(initial.data.revision,0);
 const action={type:'purchase',items:[{name:'API Milk',qty:20,price:450,unit:'л'}],revision:0,requestId:randomUUID()};
 const saved=await call('/api/action',{method:'POST',data:action,cookie:owner.cookie});assert.equal(saved.status,200);assert.equal(saved.data.state.lots[0].qty,20);
 const duplicate=await call('/api/action',{method:'POST',data:action,cookie:owner.cookie});assert.equal(duplicate.status,200);assert.equal(duplicate.data.duplicate,true);assert.equal(duplicate.data.state.lots.length,1);
 assert.equal((await call('/api/action',{method:'POST',cookie:owner.cookie,data:{...action,requestId:randomUUID()}})).status,409);
 assert.equal((await call('/api/state',{cookie:other.cookie})).data.state.products.length,0);
 const oversell=await call('/api/action',{method:'POST',cookie:owner.cookie,data:{type:'sale',productId:saved.data.state.products[0].id,qty:21,revision:1,requestId:randomUUID()}});assert.equal(oversell.status,400);
 const simultaneous=await Promise.all([1,2].map(()=>call('/api/action',{method:'POST',cookie:owner.cookie,data:{type:'sale',productId:saved.data.state.products[0].id,qty:1,revision:1,requestId:randomUUID()}})));assert.deepEqual(simultaneous.map(r=>r.status).sort(),[200,409]);
 const after=await call('/api/state',{cookie:owner.cookie});assert.equal(after.data.revision,2);assert.equal(after.data.state.lots[0].qty,19);
 const form=new FormData();form.set('text','Молоко 2 л по 450');const parsed=await fetch(base+'/api/parse',{method:'POST',headers:{Cookie:owner.cookie,Origin:base},body:form});assert.equal(parsed.status,200);assert.equal((await parsed.json()).items[0].qty,2);
});
test('supplier contacts persist per account and support editing and removal',async()=>{
 const owner=await account('suppliers');
 const saved=await call('/api/action',{method:'POST',cookie:owner.cookie,data:{type:'supplierSave',supplier:{name:'Test Supplier',phone:'8 (701) 123-45-67',telegram:'@test_supplier',notes:'API test'},revision:0,requestId:randomUUID()}});
 assert.equal(saved.status,200);const supplier=saved.data.state.suppliers[0];assert.equal(supplier.phone,'+77011234567');
 const reload=await call('/api/state',{cookie:owner.cookie});assert.equal(reload.data.state.suppliers[0].id,supplier.id);
 const invalid=await call('/api/action',{method:'POST',cookie:owner.cookie,data:{type:'supplierSave',supplier:{name:'Invalid',telegram:'https://evil.example/a'},revision:1,requestId:randomUUID()}});assert.equal(invalid.status,400);
 const edited=await call('/api/action',{method:'POST',cookie:owner.cookie,data:{type:'supplierSave',supplier:{...supplier,name:'Updated Supplier'},revision:1,requestId:randomUUID()}});assert.equal(edited.status,200);assert.equal(edited.data.state.suppliers[0].name,'Updated Supplier');
 const removed=await call('/api/action',{method:'POST',cookie:owner.cookie,data:{type:'supplierDelete',supplierId:supplier.id,revision:2,requestId:randomUUID()}});assert.equal(removed.status,200);assert.deepEqual(removed.data.state.suppliers,[]);
});
test('changing a password revokes old sessions and permits only the new password',async()=>{
 const owner=await account('password');
 const other=await call('/api/auth/login',{method:'POST',data:{email:owner.email,password}});
 const nextPassword=randomBytes(24).toString('base64url');
 const bad=await call('/api/auth/password',{method:'POST',cookie:owner.cookie,data:{oldPassword:'not the password',password:nextPassword}});assert.equal(bad.status,400);
 const changed=await call('/api/auth/password',{method:'POST',cookie:owner.cookie,data:{oldPassword:password,password:nextPassword}});assert.equal(changed.status,200);assert.notEqual(changed.cookie,owner.cookie);
 assert.equal((await call('/api/auth/me',{cookie:owner.cookie})).status,401);assert.equal((await call('/api/auth/me',{cookie:other.cookie})).status,401);assert.equal((await call('/api/auth/me',{cookie:changed.cookie})).status,200);
 assert.equal((await call('/api/auth/login',{method:'POST',data:{email:owner.email,password}})).status,401);
 assert.equal((await call('/api/auth/login',{method:'POST',data:{email:owner.email,password:nextPassword}})).status,200);
});
test('anonymous visitors can use demo HTML and ordinary login pages',async()=>{
 const response=await fetch(base+'/');assert.equal(response.status,200);const html=await response.text();assert.match(html,/Попробуйте QorAI в деморежиме/);assert.match(html,/Демонстрационный доступ/);assert.doesNotMatch(html,/API Milk/);assert.match(html,/href="\/login"/);
 for(const path of ['/login','/register']){const r=await fetch(base+path);assert.equal(r.status,200);assert.match(await r.text(),/name="email"/);}
 assert.equal((await call('/api/health')).status,200);
});
test('backup import preserves data and cannot overwrite a populated workspace',async()=>{
 const source=await account('export'),target=await account('import');
 const saved=await call('/api/action',{method:'POST',cookie:source.cookie,data:{type:'purchase',items:[{name:'Imported Coffee',qty:2,price:6500,unit:'кг'}],revision:0,requestId:randomUUID()}});assert.equal(saved.status,200);
 const backup={state:saved.data.state,exportedAt:new Date().toISOString()};
 const restored=await call('/api/import',{method:'POST',cookie:target.cookie,data:{backup,revision:0}});assert.equal(restored.status,200);assert.equal(restored.data.state.products[0].name,'Imported Coffee');assert.equal(restored.data.state.lots[0].qty,2);
 const overwrite=await call('/api/import',{method:'POST',cookie:target.cookie,data:{backup,revision:1}});assert.equal(overwrite.status,409);
 const retained=await call('/api/state',{cookie:target.cookie});assert.equal(retained.data.revision,1);assert.equal(retained.data.state.lots.length,1);
 assert.equal((await call('/api/import',{method:'POST',data:{backup,revision:0}})).status,401);
});
test('concurrent registration cannot create duplicate email accounts',async()=>{
 const email=`${prefix}-concurrent@qorai.test`;
 const results=await Promise.all([1,2].map(()=>call('/api/auth/register',{method:'POST',data:{name:'Concurrent Owner',email,password}})));
 assert.deepEqual(results.map(r=>r.status).sort(),[201,409]);
});
test('authentication throttling limits repeated wrong passwords',async()=>{
 const owner=await account('throttle');
 for(let i=0;i<12;i++)assert.equal((await call('/api/auth/login',{method:'POST',data:{email:owner.email,password:'wrong password'}})).status,401);
 assert.equal((await call('/api/auth/login',{method:'POST',data:{email:owner.email,password:'wrong password'}})).status,429);
});
