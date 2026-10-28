'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {generatePersonas,personas,CATEGORIES}=require('../src/data/index.js');
test('W1 seeded transaction generation is deterministic',()=>assert.deepEqual(generatePersonas(),generatePersonas()));
for(const profile of Object.values(personas)){
 test(`W1 ${profile.id}: twelve months and balance reconciliation`,()=>{
  assert.equal(new Set(profile.transactions.map(t=>t.date.slice(0,7))).size,12);
  assert.equal(profile.openingBalance+profile.transactions.reduce((sum,t)=>sum+t.amount,0),profile.balance);
  assert(profile.transactions.every(t=>CATEGORIES.includes(t.category)&&Number.isFinite(t.amount)));
 });
 test(`W1 ${profile.id}: recurring bills and subscriptions`,()=>{
  assert(profile.transactions.filter(t=>t.recurring&&t.amount<0).length>=24);
  assert(profile.transactions.some(t=>t.category==='subscriptions'&&t.recurring));
 });
}
test('W1 catalogue retains three actual baseline funds and adds personal cash and two business products',()=>{
 const {products}=require('../src/products.js');assert.equal(products.length,7);
 for(const id of ['steady','balanced','growth'])assert(products.some(p=>p.id===id));
 assert.equal(products.filter(p=>p.segment==='business').length,2);
 assert(products.every(p=>p.illustrative&&p.liquidity&&p.minimumHorizon>=0&&p.fee>=0));
});
