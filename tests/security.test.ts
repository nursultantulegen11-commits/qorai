import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword,verifyPassword,newSessionToken,tokenDigest,cookieToken,verifyOrigin } from '../lib/security.ts';
import { registerInput } from '../lib/auth-input.ts';

test('Unicode passwords round-trip, salts differ, and wrong passwords fail',async()=>{
 const value='Мой склад в Таразе 🥛 2026';
 const first=await hashPassword(value),second=await hashPassword(value);
 assert.notEqual(first,second);assert.ok(!first.includes(value));
 assert.equal(await verifyPassword(value,first),true);
 assert.equal(await verifyPassword(value+'x',first),false);
 assert.equal(await verifyPassword(value,'invalid-hash'),false);
});
test('session tokens are random, hashed at rest, and ambiguous cookies are rejected',()=>{
 const first=newSessionToken(),second=newSessionToken();assert.notEqual(first,second);assert.equal(first.length,43);
 assert.equal(tokenDigest(first).length,64);assert.notEqual(tokenDigest(first),first);
 assert.equal(cookieToken('other=1; qorai_session='+first,'qorai_session'),first);
 assert.equal(cookieToken('qorai_session='+first+'; qorai_session='+second,'qorai_session'),null);
 assert.equal(cookieToken('qorai_session=not-a-session','qorai_session'),null);
});
test('state-changing requests require the configured origin even behind a proxy',()=>{
 const origin='https://qorai.example';
 assert.doesNotThrow(()=>verifyOrigin(new Request('http://internal:3000/api/action',{headers:{origin}}),origin));
 const cases:Record<string,string>[]=[{},{origin:'https://attacker.example'},{origin,'sec-fetch-site':'cross-site'}];
 for(const headers of cases)assert.throws(()=>verifyOrigin(new Request('http://internal:3000/api/action',{headers}),origin));
});
test('registration normalizes email and enforces password length without truncation',()=>{
 const valid=registerInput.parse({name:'Нурсултан',email:'  Owner@Example.COM ',password:'пароль для моей кофейни'});assert.equal(valid.email,'owner@example.com');
 for(const password of ['short',' '.repeat(20),'x'.repeat(129)])assert.equal(registerInput.safeParse({name:'Owner',email:'owner@example.com',password}).success,false);
});
