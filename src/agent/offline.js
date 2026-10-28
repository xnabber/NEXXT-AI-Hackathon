'use strict';
const {executeTool,inferRisk}=require('../tools/index.js');const {changeFromText}=require('./intent.js');
const refusal={injection:'I can explain the demo and use its approved tools, but I cannot override safeguards, reveal secrets, or confirm a plan for you.',cross_customer:'I can only use the currently selected fictional customer. Choose a different persona in the demo switcher to start a separate journey.',unsafe_request:'I cannot guarantee returns, invest an emergency fund, or put everything into stocks. We can protect essential cash first and compare suitable options.',off_topic:'I can help with budgeting, saving, investment concepts, or this demo’s onboarding. Please ask a question about those topics.',adviser:'A qualified adviser is the right next step for legal or tax advice. I can prepare a simulated handoff and help organise your questions.'};
function renderSafe(session,events,reason){
 if(refusal[reason])return refusal[reason];const outputs=events.map(e=>e.output),cap=outputs.findLast(o=>o.ui?.type==='capacity'),change=outputs.findLast(o=>o.ui?.type==='change');
 if(!session.customerId)return 'You can explore without an account. Choose a fictional demo persona to analyse its synthetic spending, or continue through demo account access. No real account is opened.';
 if(cap?.safeMonthly===0)return 'Build accessible savings before investing. The budget card identifies subscriptions you could trim; the capacity card shows the first buffer milestone and a small saving habit. I have not invested or moved any money.';
 if(change)return 'I replanned for your updated goal. The change card explains the difference, and the comparison shows which products no longer fit. Review any fresh proposal before confirming it.';
 if(session.customerId==='elena')return 'Payroll and operating reserves come first. The remaining business surplus can be split into a short deposit ladder, so not all of it is locked until the same date. The proposal is only a simulation until you confirm it.';
 if(session.customerId==='mihai')return session.memory.riskComfort?'Keep the upcoming tax bill and the larger irregular-income buffer liquid. Only the smaller monthly amount shown in the cards is available for a fund plan. Check the trade-offs before confirming the proposal.':'Your income varies, so the tax reserve and larger emergency buffer come first. I compared liquid options. How comfortable are you with investment ups and downs: steady, balanced, or growth?';
 if(!session.memory.riskComfort)return 'Your synthetic history shows a surplus after essential reserves and upcoming bills. I compared options using that context. How comfortable are you with investment ups and downs: steady, balanced, or growth?';
 return 'Your buffer and upcoming bills remain reserved. I compared suitable options and calculated an illustrative plan using the amount shown in the cards. Values can fall; review the proposal and confirm only if this demo scenario feels right.';
}
function offlinePlan(store,session,text,{onEvent=()=>{},reason}={}){
 const events=[];const call=(name,input={})=>{const e=executeTool(store,session,name,input,onEvent);events.push(e);return e.output;};
 if(reason){if(reason==='adviser')call('handoff_to_adviser',{reason:'Tax or legal question needs a qualified adviser'});return{events,text:renderSafe(session,events,reason)};}
 if(!store.profile(session)){call('simulate',{monthly:session.memory.monthly,years:Math.max(1,Math.round(session.memory.horizonYears)),productId:session.memory.riskComfort||'balanced'});call('request_authentication',{kind:'choice'});return{events,text:require('../coach.js').guidedReply(text,{monthly:session.memory.monthly,years:Math.max(1,Math.round(session.memory.horizonYears)),risk:session.memory.riskComfort||'balanced'},session.messages.filter(m=>m.role==='user').at(-2)?.text)};}
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
