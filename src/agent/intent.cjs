'use strict';
function clean(text){return String(text||'').replace(/[\u0000-\u001f\u007f]/g,'').trim();}
function rejection(text,session){
 const q=text.toLowerCase();
 if(/ignore.{0,30}(instructions|rules|previous)|system prompt|override.{0,20}rules|reveal.{0,30}(secret|key)|confirm.{0,25}without|call.{0,20}confirm.*endpoint/i.test(q))return 'injection';
 if(/other customer|another customer|someone else|altui client|alte? conturi|cross.customer/i.test(q)||['ioana','andrei','mihai','elena'].some(id=>id!==session.customerId&&new RegExp(`(?:show|read|access|datele|arată|arata).{0,35}${id}`,'i').test(q)))return 'cross_customer';
 if(/guarantee|garantat|garanteaz|everything.{0,20}(stocks|shares)|all.{0,15}emergency|invest.{0,20}emergency fund|toți.{0,15}acțiuni|tot.{0,15}fondul.*urgen/i.test(q))return 'unsafe_request';
 if(/legal advice|tax advice|evade tax|evaziune|sfat fiscal|sfat juridic/i.test(q))return 'adviser';
 if(!/invest|save|saving|money|cash|budget|buffer|fund|bond|stock|fee|risk|return|income|salary|spend|plan|compare|start|begin|help|hello|^hi\b|bonus|rent|car|year|steady|balanced|growth|tax|payroll|deposit|why|how|what|thanks|credit|bani|econom|buget|fond|risc|chirie|mașin|masin|ani|încep|incep|salariu|depozit|comision|bună|buna|moderat|echilibrat|prudent|agresiv/i.test(q))return 'off_topic';return null;
}
function changeFromText(text,profile,memory={}){
 const q=text.toLowerCase();const year=q.match(/\b(\d+(?:[.,]\d+)?|two|doi|două|doua|cinci|five|seven|șapte|sapte)\s*(?:years?|ani|an)\b/);const word={two:2,doi:2,'două':2,doua:2,cinci:5,five:5,seven:7,'șapte':7,sapte:7};
 if(year&&/need|goal|car|want|what.if|money|plan|nevoie|mașin|masin|vreau|scop|orizont/.test(q))return{type:'goal',goal:/car|mașin|masin/.test(q)?'Car purchase':'Updated financial goal',horizonYears:word[year[1]]||Number(year[1].replace(',','.')),needsLiquidity:true};
 const amount=q.match(/\b(\d[\d, .]*)(?:\s*(?:lei|ron))?/);const n=amount?Number(amount[1].trim().replace(/[ ,]/g,'')):null;
 if(n!==null&&/bonus/.test(q))return{type:'bonus',amount:n};
 if(n!==null&&/rent|chirie/.test(q)){
  const rent=profile?profile.transactions.filter(t=>t.category==='rent/mortgage').reduce((s,t)=>s-t.amount,0)/12+(memory.rentDelta||0):0;
  return{type:'rent',amount:/\b(to|la)\s*\d/.test(q)?Math.max(0,Math.round(n-rent)):n};
 }return null;
}
module.exports={clean,rejection,changeFromText};
