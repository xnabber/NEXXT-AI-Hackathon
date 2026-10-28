'use strict';
const {round}=require('../engine.cjs');const {products}=require('../products.cjs');
const essentialCategories=['rent/mortgage','utilities','groceries','transport','health','tax'];
function safeLabel(value){const text=String(value).replace(/[\u0000-\u001f\u007f]/g,'').slice(0,120);return /ignore.*instruction|system prompt|override|reveal.*secret|confirm.*plan|invest.*everything/i.test(text)?'[untrusted demo label]':text;}
function spending(profile,months=12){
 const groups=[...new Set(profile.transactions.map(t=>t.date.slice(0,7)))].sort().slice(-months);const tx=profile.transactions.filter(t=>groups.includes(t.date.slice(0,7)));
 const byCategory={},byMonth=Object.fromEntries(groups.map(m=>[m,{income:0,spend:0}])),bills={};
 for(const t of tx){const key=t.date.slice(0,7);if(t.amount>0)byMonth[key].income+=t.amount;else{byMonth[key].spend-=t.amount;byCategory[t.category]=(byCategory[t.category]||0)-t.amount;if(t.recurring){const label=safeLabel(t.merchant);bills[label]??={merchant:label,category:t.category,total:0,count:0};bills[label].total-=t.amount;bills[label].count++;}}}
 const income=Object.values(byMonth).reduce((s,m)=>s+m.income,0),spend=Object.values(byMonth).reduce((s,m)=>s+m.spend,0);
 const recurring=Object.values(bills).map(b=>({...b,monthly:round(b.total/groups.length)}));
 return {months:groups.length,income,spend,monthlyIncome:round(income/groups.length),monthlySpend:round(spend/groups.length),monthlySurplus:round((income-spend)/groups.length),byCategory,monthly:Object.entries(byMonth).map(([month,v])=>({month,...v})),recurringBills:recurring,subscriptions:recurring.filter(b=>b.category==='subscriptions'),trend:round(Object.values(byMonth).at(-1).spend-Object.values(byMonth)[0].spend),synthetic:true};
}
function capacity(profile,memory={}){
 const summary=spending(profile);const essentials=round(essentialCategories.reduce((s,k)=>s+(summary.byCategory[k]||0),0)/summary.months+(memory.rentDelta||0));
 const business=profile.segment==='business',bufferMonths=business?3:profile.incomePattern==='irregular'?6:3;
 const buffer=round(essentials*bufferMonths),obligations=profile.obligations.reduce((s,o)=>s+o.amount,0),balance=profile.balance+(memory.bonus||0);
 const incomeValues=summary.monthly.map(m=>m.income).sort((a,b)=>a-b);const conservativeIncome=profile.incomePattern==='regular'?summary.monthlyIncome:incomeValues[Math.floor(incomeValues.length/4)];
 const discretionary=round(summary.monthlySpend-essentialCategories.reduce((s,k)=>s+(summary.byCategory[k]||0),0)/summary.months);
 const availableMonthly=Math.max(0,Math.floor((conservativeIncome-essentials-discretionary)*.5/50)*50);
 const idleCash=Math.max(0,round(balance-buffer-obligations)),bufferShortfall=Math.max(0,round(buffer+obligations-balance));
 const subscriptionCuts=summary.subscriptions.filter(b=>b.merchant!=='Study Cloud Demo').slice(0,2).map(b=>({merchant:b.merchant,monthly:b.monthly}));
 const microSaving=bufferShortfall>0&&summary.monthlySurplus+subscriptionCuts.reduce((s,b)=>s+b.monthly,0)>=100?100:0;
 const safeMonthly=bufferShortfall>0?0:Math.min(business?10000:2000,availableMonthly);
 const starterTarget=essentials,starterMonths=microSaving?Math.max(0,Math.ceil((starterTarget-balance)/microSaving)):null;
 const rungs=business?[30,60,90].map(days=>({days,amount:Math.floor(idleCash/3/100)*100})):[];
 return {balance,essentials,bufferMonths,buffer,obligations,obligationItems:profile.obligations.map(o=>({...o,name:safeLabel(o.name)})),idleCash,bufferShortfall,conservativeIncome,monthlySurplus:summary.monthlySurplus,safeMonthly,microSaving,starterTarget,starterMonths,subscriptionCuts,rungs,segment:profile.segment,ready:bufferShortfall===0&&safeMonthly>0,deductions:[{reason:'emergency_buffer',amount:buffer},{reason:'upcoming_obligations',amount:obligations}],synthetic:true};
}
function businessSurplus(profile,product,cap){return profile.segment==='business'&&product.type==='ladder'&&cap.idleCash>=300;}
function compare(profile,memory,options={}){
 const cap=capacity(profile,memory),horizon=options.horizonYears??memory.horizonYears??10,liquid=options.needsLiquidity??memory.needsLiquidity??false,risk=options.riskComfort??memory.riskComfort;
 const ceiling={steady:2,balanced:4,growth:7}[risk]||1;
 const ranked=products.filter(p=>p.segment===profile.segment).map(p=>{const why=[],whyNot=[];
  if(p.minimumHorizon>horizon)whyNot.push('horizon_too_short');else why.push('horizon_fits');
  if(p.risk>ceiling)whyNot.push('risk_answer_required_or_lower_risk');else why.push('risk_fits');
  if(p.type==='fund'&&!cap.ready)whyNot.push('buffer_first');
  if(liquid&&p.liquidity==='locked'&&!(businessSurplus(profile,p,cap)))whyNot.push('money_locked');else if(p.liquidity==='instant')why.push('instant_access');
  if(p.type==='ladder'&&cap.idleCash<300)whyNot.push('no_ladder_surplus');
  let score=100-whyNot.length*40;
  if(profile.segment==='business'&&p.type==='ladder'&&cap.idleCash>=300)score+=15;
  if(profile.segment==='individual'&&p.type==='fund'&&horizon>=5&&cap.ready)score+=20;
  if(!cap.ready&&p.type==='savings')score+=40;
  if(profile.incomePattern==='irregular'&&p.liquidity==='instant')score+=25;
  return {...p,score,eligible:whyNot.length===0,why,whyNot};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 return {goal:safeLabel(options.goal||memory.goal||profile.goals[0].name),horizonYears:horizon,needsLiquidity:liquid,riskComfort:risk||'unknown',products:ranked,synthetic:true};
}
module.exports={safeLabel,spending,capacity,compare};
