'use strict';
function metrics(store){
 const events=store.audit,turns=events.filter(e=>e.type==='turn'),tools=events.filter(e=>e.type==='tool'),conversations=new Set(turns.map(e=>e.conversation));
 const countBy=(items,key)=>items.reduce((counts,event)=>{const value=key(event);if(value)counts[value]=(counts[value]||0)+1;return counts;},{});
 const days={};for(const turn of turns){const day=turn.at.slice(0,10);(days[day]??=new Set()).add(turn.conversation);}
 const modeCounts=countBy(turns,e=>e.mode),pricingKnown=turns.every(t=>typeof t.cost==='number'&&Number.isFinite(t.cost)),totalCost=pricingKnown?turns.reduce((s,t)=>s+t.cost,0):null;
 const proposals=events.filter(e=>e.type==='proposal').length,activations=events.filter(e=>e.type==='activation').length;
 return{specialistRuns:countBy(events.filter(e=>e.type==='agent_stage'),e=>e.agent),retainedEvents:events.length,retentionLimit:20000,conversations:conversations.size,conversationsPerDay:Object.fromEntries(Object.entries(days).map(([k,v])=>[k,v.size])),turns:turns.length,modeCounts,modeShare:Object.fromEntries(Object.entries(modeCounts).map(([k,v])=>[k,turns.length?v/turns.length:0])),averageToolsPerConversation:conversations.size?tools.length/conversations.size:0,averageTurnMs:turns.length?turns.reduce((s,t)=>s+t.ms,0)/turns.length:0,totalModelCostUSD:totalCost,costPerConversationUSD:totalCost===null||!conversations.size?null:totalCost/conversations.size,costPerActivatedPlanUSD:totalCost===null||!activations?null:totalCost/activations,proposals,activations,proposalConfirmationRate:proposals?activations/proposals:0,topTools:countBy(tools,e=>e.tool),topRefusalReasons:countBy(events.filter(e=>e.reason),e=>e.reason),funnel:countBy(events.filter(e=>['visit','coach_started','onboarding_started','signup_completed','login','product_selected','review_started','proposal','activation'].includes(e.type)),e=>e.type)};
}
module.exports={metrics};
