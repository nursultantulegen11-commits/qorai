import test from 'node:test';
import assert from 'node:assert/strict';
import { demoState } from '../lib/domain.ts';
import { restoreBackup } from '../lib/backup.ts';

test('legacy exports preserve stock and history while resetting old request IDs',()=>{
 const state=demoState();state.requests=['legacy-request'];
 const result=restoreBackup({state,exportedAt:new Date().toISOString()});
 assert.deepEqual(result.products,state.products);assert.deepEqual(result.lots,state.lots);assert.deepEqual(result.movements,state.movements);assert.deepEqual(result.requests,[]);
});
test('imports reject duplicate IDs, missing products, invalid dates and negative stock',()=>{
 const changes=[
  (s:ReturnType<typeof demoState>)=>s.products.push(s.products[0]),
  (s:ReturnType<typeof demoState>)=>{s.lots[0].productId='missing'},
  (s:ReturnType<typeof demoState>)=>{s.lots[0].expiry='2026-02-30'},
  (s:ReturnType<typeof demoState>)=>{s.lots[0].qty=-10},
 ];
 for(const change of changes){const state=demoState();change(state);assert.throws(()=>restoreBackup(state));}
});
