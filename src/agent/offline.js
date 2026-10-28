'use strict';
const {copy}=require('../i18n/index.js');
const {executeTool,inferRisk}=require('../tools/index.js');const {changeFromText}=require('./intent.js');
const refusal=require('../i18n/en.json');
function renderSafe(session,events,reason){
 if(refusal[reason])return copy(session,reason);const outputs=events.map(e=>e.output),cap=outputs.findLast(o=>o.ui?.type==='capacity'),change=outputs.findLast(o=>o.ui?.type==='change');
 if(!session.customerId)return copy(session,'anonymous');
 if(cap?.safeMonthly===0)return copy(session,'bufferFirst');
 if(change)return copy(session,'changed');
 if(session.customerId==='elena')return copy(session,'business');
 if(session.customerId==='mihai')return session.memory.riskComfort?copy(session,'irregularPlan'):copy(session,'irregularRisk');
 if(!session.memory.riskComfort)return copy(session,'askRisk');
 return copy(session,'plan');
}
function offlinePlan(store,session,text,{onEvent=()=>{},reason}={}){
 const events=[];const call=(name,input={})=>{const e=executeTool(store,session,name,input,onEvent);events.push(e);return e.output;};
 if(reason){if(reason==='adviser')call('handoff_to_adviser',{reason:'Tax or legal question needs a qualified adviser'});return{events,text:renderSafe(session,events,reason)};}
 if(!store.profile(session)){call('simulate',{monthly:session.memory.monthly,years:Math.max(1,Math.round(session.memory.horizonYears)),productId:session.memory.riskComfort||'balanced'});call('request_authentication',{kind:'choice'});return{events,text:require('../coach.js').guidedReply(text,{monthly:session.memory.monthly,years:Math.max(1,Math.round(session.memory.horizonYears)),risk:session.memory.riskComfort||'balanced',language:session.language},session.messages.filter(m=>m.role==='user').at(-2)?.text)};}
 call('get_customer_profile');call('get_spending_summary',{months:12});let cap=call('find_savings_capacity');
 const change=session.lastChange?.turn===session.turnSequence&&session.lastChange.customer===session.customerId?session.lastChange.output.change:changeFromText(text,store.profile(session),session.memory);if(change){call('what_if',{change});cap=call('find_savings_capacity');}
 const risk=inferRisk(text);if(risk)call('set_risk_profile',{answer:risk});
 const comparison=call('compare_products');
 let product=comparison.products.find(p=>p.eligible);
 if(session.customerId==='mihai'&&risk)product=comparison.products.find(p=>p.type==='fund'&&p.eligible)||product;
 if(cap.safeMonthly===0)product=comparison.products.find(p=>p.type==='savings'&&p.eligible);
 const requested=text.match(/(?:invest|save|monthly|lunar|economis).{0,20}?(\d[\d,]*)\s*(?:lei|ron)?/i);
 let monthly=cap.safeMonthly===0?cap.microSaving:Math.min(500,cap.safeMonthly);
 if(requested)monthly=Number(requested[1].replace(/,/g,''));if(product?.type==='ladder')monthly=0;
 if(product){call('simulate',{monthly,years:Math.max(1,Math.round(session.memory.horizonYears)),productId:product.id});
  const mayPropose=cap.safeMonthly===0?cap.microSaving>0:product.type!=='fund'||Boolean(session.memory.riskComfort);
  if(mayPropose)call('propose_plan',{productId:product.id,monthly});
 }
 return{events,text:renderSafe(session,events)};
}
module.exports={offlinePlan,renderSafe,refusal};
