'use strict';
const {spending,capacity,compare,safeLabel}=require('./analysis.js');const {project}=require('../engine.js');const {byId}=require('../products.js');const {proposePlan,publicProposal,failure}=require('../bank.js');
const object=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const string=(maxLength=160)=>({type:'string',minLength:1,maxLength});const number=(minimum,maximum)=>({type:'number',minimum,maximum});
const definitions=[
 ['get_customer_profile','Read the session customer’s synthetic profile and goals.',object()],
 ['get_spending_summary','Analyse synthetic income, expenses, recurring bills and subscriptions.',object({months:{type:'integer',minimum:1,maximum:12}})],
 ['find_savings_capacity','Calculate buffers, upcoming bills, idle cash and safe monthly capacity before proposing anything.',object()],
 ['compare_products','Rank fictional products with explicit fit and exclusion reasons for this customer.',object({goal:string(),horizonYears:number(.25,50),needsLiquidity:{type:'boolean'},riskComfort:{enum:['steady','balanced','growth','unknown']}})],
 ['simulate','Calculate a transparent monthly scenario and losing-market stress case.',object({monthly:{type:'integer',minimum:0,maximum:10000},years:{type:'integer',minimum:1,maximum:50},productId:string(40)},['monthly','years'])],
 ['what_if','Replan for a changed goal, a one-off bonus, or a monthly rent increase.',object({change:{oneOf:[object({type:{enum:['goal']},goal:string(),horizonYears:number(.25,50),needsLiquidity:{type:'boolean'}},['type','goal','horizonYears']),object({type:{enum:['bonus','rent']},amount:{type:'integer',minimum:0,maximum:1000000}},['type','amount'])]}},['change'])],
 ['set_risk_profile','Record a risk choice explicitly expressed in the latest user message; never guess it.',object({answer:{enum:['steady','balanced','growth']}},['answer'])],
 ['propose_plan','Prepare a checked, expiring proposal. This does not activate a plan or move money.',object({productId:string(40),monthly:{type:'integer',minimum:0,maximum:10000}},['productId','monthly'])],
 ['request_authentication','Offer demo signup or login without collecting real personal data.',object({kind:{enum:['signup','login','choice']}},['kind'])],
 ['handoff_to_adviser','Prepare a simulated adviser handoff with the conversation; sends nothing externally.',object({reason:string(240)},['reason'])],
].map(([name,description,inputSchema])=>({name,description,inputSchema}));
function valid(spec,value){
 if(spec.oneOf)return spec.oneOf.some(s=>valid(s,value));if(spec.enum)return spec.enum.includes(value);
 if(spec.type==='object'){if(!value||typeof value!=='object'||Array.isArray(value))return false;if(spec.required?.some(k=>value[k]===undefined))return false;return Object.entries(value).every(([k,v])=>spec.properties[k]&&valid(spec.properties[k],v));}
 if(spec.type==='string')return typeof value==='string'&&value.trim().length>=(spec.minLength||0)&&value.length<=(spec.maxLength||Infinity)&&!/[\u0000-\u001f\u007f]/.test(value);
 if(spec.type==='boolean')return typeof value==='boolean';if(spec.type==='integer'||spec.type==='number')return typeof value==='number'&&Number.isFinite(value)&&(spec.type!=='integer'||Number.isInteger(value))&&value>=spec.minimum&&value<=spec.maximum;return false;
}
function inferRisk(text){const value=String(text||'').toLowerCase();if(/steady|cautious|cautios|prudent|conservator/.test(value))return 'steady';if(/balanced|balance|moderate|moderat|echilibrat|some ups/.test(value))return 'balanced';if(/growth|aggressive|agresiv|accept.*risk|risc ridicat/.test(value))return 'growth';return null;}
function executeTool(store,session,name,input={},notify=()=>{}){
 const start=performance.now();const spec=definitions.find(d=>d.name===name);let output;
 try{
  if(!spec)output=failure('UNKNOWN_TOOL','Unknown tool.');
  else if(input&&typeof input==='object'&&Object.hasOwn(input,'customerId'))output=failure('FORBIDDEN','Tools are scoped to the session customer.');
  else if(!valid(spec.inputSchema,input))output=failure('INVALID_INPUT','The tool input does not match its schema.');
  else output=run(store,session,name,input);
 }catch{output=failure('TOOL_FAILURE','The tool could not complete. Please try a simpler request.');}
 let safeInput;try{safeInput=JSON.parse(JSON.stringify(input||{}));}catch{safeInput={invalid:true};}
 const event={tool:name,input:safeInput,output,summary:output.error?output.error.code:output.ui?.type||'completed',ms:Math.round((performance.now()-start)*100)/100};
 store.record(session,'tool',{tool:name,decision:output.error?'denied':'completed',ms:event.ms,reason:output.error?.code});notify(event);return event;
}
function run(store,session,name,input){
 const profile=store.profile(session),memory=session.memory;
 if(name==='request_authentication')return{kind:input.kind,ui:{type:'auth',kind:input.kind}};
 if(name==='set_risk_profile'){if(inferRisk(session.lastUserText)!==input.answer)return failure('EXPLICIT_RISK_REQUIRED','Choose your own risk preference before we record it.');if(memory.riskComfort!==input.answer){memory.riskComfort=input.answer;session.revision++;}return{answer:input.answer,ui:{type:'risk',answer:input.answer}};}
 if(name==='handoff_to_adviser'){session.handoff={reason:safeLabel(input.reason),conversation:session.messages.slice(-12),preparedAt:store.now()};return{prepared:true,sent:false,ui:{type:'handoff',reason:safeLabel(input.reason),sent:false}};}
 if(name==='simulate'){
  const product=byId(input.productId||'balanced');if(!product)return failure('INVALID_PRODUCT','Unknown example product.');
  if(profile&&product.segment!==profile.segment)return failure('PRODUCT_NOT_ALLOWED','Choose a product in this customer segment.');
  const baseline=project(input.monthly,input.years,product.returnAssumption,product.fee),stress=project(input.monthly,input.years,-.02,product.fee),cash=project(input.monthly,input.years,0,0);
  return{...baseline,productId:product.id,productName:product.name,stress,cash,ui:{type:'simulation',...baseline,productName:product.name,stressValue:stress.balance,cashValue:cash.balance}};
 }
 if(!profile||!session.authenticated)return{...failure('AUTH_REQUIRED','Choose a fictional persona or continue through demo account access.'),ui:{type:'auth',kind:'choice'}};
 if(name==='get_customer_profile'){const output={name:safeLabel(profile.name),ageBand:profile.age<25?'18–24':profile.age<35?'25–34':'35–49',segment:profile.segment,incomePattern:profile.incomePattern,goals:profile.goals.map(g=>({...g,name:safeLabel(g.name)})),asOf:profile.asOf,synthetic:true};return{...output,ui:{type:'profile',...output}};}
 if(name==='get_spending_summary'){const result=spending(profile,input.months||12);return{...result,ui:{type:'budget',...result}};}
 if(name==='find_savings_capacity'){const result=capacity(profile,memory);return{...result,ui:{type:'capacity',...result}};}
 if(name==='compare_products'){const result=compare(profile,memory,input);return{...result,ui:{type:'compare',...result}};}
 if(name==='what_if'){
  const key=JSON.stringify([session.customerId,session.turnSequence||0,input.change]);
  if(session.lastChange?.key===key)return session.lastChange.output;
  const requested=require('../agent/intent.js').changeFromText(session.lastUserText,profile,memory);
  if(!requested||requested.type!==input.change.type||(requested.type==='goal'?requested.horizonYears!==input.change.horizonYears:requested.amount!==input.change.amount))return failure('EXPLICIT_CHANGE_REQUIRED','Only apply the change the customer actually requested.');
  const before=capacity(profile,memory),oldHorizon=memory.horizonYears,change=input.change;
  if(change.type==='goal'&&session.pendingHorizon&&change.horizonYears!==session.pendingHorizon)return failure('EXPLICIT_CHANGE_REQUIRED','Use the horizon the customer requested.');
  if(change.type==='goal'){delete session.pendingHorizon;memory.goal=safeLabel(change.goal);memory.horizonYears=change.horizonYears;memory.needsLiquidity=change.needsLiquidity??true;}
  if(change.type==='bonus')memory.bonus+=change.amount;if(change.type==='rent')memory.rentDelta+=change.amount;
  session.revision++;const after=capacity(profile,memory);const diff={safeMonthly:after.safeMonthly-before.safeMonthly,idleCash:after.idleCash-before.idleCash,horizonYears:memory.horizonYears-oldHorizon};
  const output={change,before,after,diff,goal:memory.goal,horizonYears:memory.horizonYears,ui:{type:'change',change,before,after,diff,goal:memory.goal,horizonYears:memory.horizonYears}};session.lastChange={key,output,turn:session.turnSequence||0,customer:session.customerId};return output;
 }
 if(name==='propose_plan'){const result=proposePlan(store,session,input);if(result.error)return result;const proposal=publicProposal(result.proposal);return{proposal,ui:{type:'plan_proposal',...proposal}};}
 return failure('UNKNOWN_TOOL','Unknown tool.');
}
module.exports={definitions,valid,inferRisk,executeTool};
