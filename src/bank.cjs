'use strict';
const {randomUUID}=require('node:crypto');const {freeze}=require('./data/index.cjs');const {byId}=require('./products.cjs');const {capacity,compare}=require('./tools/analysis.cjs');
const failure=(code,message)=>({error:{code,message}});
function checkPlan(store,session,productId,monthly){
 const profile=store.profile(session);if(!session.authenticated||!profile)return failure('AUTH_REQUIRED','Continue with a demo account first.');
 const product=byId(productId);if(!product||product.segment!==profile.segment)return failure('PRODUCT_NOT_ALLOWED','This product is not available for this demo customer.');
 if(!Number.isInteger(monthly)||monthly<0||monthly>10000||monthly%50)return failure('INVALID_AMOUNT','Use an allowed monthly amount in steps of fifty.');
 const cap=capacity(profile,session.memory),fit=compare(profile,session.memory).products.find(p=>p.id===productId);
 if(!fit?.eligible)return failure('UNSUITABLE','The product does not fit the buffer, horizon, liquidity needs, or recorded risk answer.');
 const existing=[...store.plans.values()].filter(p=>p.owner===session.id&&p.customer===session.customerId).reduce((s,p)=>s+p.monthly,0);
 const limit=product.type==='savings'&&!cap.ready?cap.microSaving:cap.safeMonthly;
 if(monthly<product.minimumMonthly||monthly+existing>limit)return failure('CAPACITY_LIMIT','This amount exceeds the current safe capacity or product minimum.');
 if(product.type==='ladder'&&(cap.idleCash<300||monthly!==0))return failure('CAPACITY_LIMIT','A business ladder uses the available one-off surplus, not a monthly fund payment.');
 return {product,capacity:cap,principal:product.type==='ladder'?cap.rungs.reduce((s,r)=>s+r.amount,0):0};
}
function proposePlan(store,session,input){
 const check=checkPlan(store,session,input.productId,input.monthly);if(check.error)return check;
 const proposal=freeze({id:randomUUID(),owner:session.id,customer:session.customerId,revision:session.revision,productId:input.productId,productName:check.product.name,monthly:input.monthly,principal:check.principal,rungs:check.product.type==='ladder'?check.capacity.rungs:[],expiresAt:store.now()+600000,createdAt:store.now(),demo:true});
 store.proposals.set(proposal.id,proposal);store.record(session,'proposal',{decision:'created'});return {proposal};
}
function publicProposal(p){const {owner,customer,revision,...safe}=p;return safe;}
function confirmProposal(store,session,id,confirm){
 const proposal=store.proposals.get(id);if(!proposal||proposal.owner!==session.id||proposal.customer!==session.customerId)return failure('NOT_FOUND','Proposal not found for this customer.');
 if(confirm!==true)return failure('CONFIRMATION_REQUIRED','Confirm the displayed proposal explicitly.');
 const existing=[...store.plans.values()].find(p=>p.proposalId===id);if(existing)return {plan:publicProposal(existing),idempotent:true};
 if(store.now()>=proposal.expiresAt)return failure('EXPIRED','This proposal expired. Ask for a new one.');
 if(proposal.revision!==session.revision)return failure('STALE_PROPOSAL','Your scenario changed. Review a fresh proposal.');
 const check=checkPlan(store,session,proposal.productId,proposal.monthly);if(check.error)return check;
 const plan=freeze({...proposal,id:randomUUID(),proposalId:id,activatedAt:store.now(),status:'demo-active'});
 store.plans.set(plan.id,plan);store.record(session,'activation',{decision:'confirmed'});return {plan:publicProposal(plan),moneyMoved:false,demo:true};
}
module.exports={checkPlan,proposePlan,confirmProposal,publicProposal,failure};
