'use strict';
const {project,purchasingPower}=require('./engine.js');const {byId}=require('./products.js');
function restoreJourney(value){const v=value&&typeof value==='object'?value:{};return{monthly:Number.isInteger(v.monthly)&&v.monthly>=100&&v.monthly<=2000&&v.monthly%50===0?v.monthly:500,years:[1,2,3,5,7,10,15,20].includes(v.years)?v.years:10,risk:['steady','balanced','growth'].includes(v.risk)?v.risk:'balanced',question:Number.isInteger(v.question)&&v.question>=0&&v.question<=3?v.question:0,messages:Array.isArray(v.messages)?v.messages.filter(m=>m&&['user','assistant'].includes(m.role)&&typeof m.text==='string'&&m.text.length<=6000&&typeof m.id==='string').slice(-40):[],authenticated:v.authenticated===true,activated:v.activated===true&&v.authenticated===true,productId:byId(v.productId)?v.productId:'balanced',planDay:[1,15,28].includes(v.planDay)?v.planDay:1};}
const {copy}=require('./i18n/index.js');
function guidedReply(question,context={monthly:500,years:10,risk:'balanced'},previous){
 let q=String(question).toLowerCase().trim();const lang={language:context.language||'en'},n=value=>new Intl.NumberFormat(lang.language==='ro'?'ro-RO':'en-GB',{maximumFractionDigits:0}).format(value),say=(key,values)=>copy(lang,'faq_'+key,values);
 if(/^(hi|hello|hey|bună|buna)[!.\s]*$/.test(q))return say('hello');
 if(/^(thanks|thank you|mulțumesc|multumesc)[!.\s]*$/.test(q))return say('thanks');
 if(/^(tell me more|why|how so|de ce|mai multe)[?!.\s]*$/.test(q)&&previous)q=previous.toLowerCase();
 const p=byId(context.risk)||byId('balanced');
 if(/withdraw|access|liquid|cash.*out|emergency|retrag|lichid|urgen/.test(q))return say('withdraw');
 if(/fee|cost|charge|tax|comisio/.test(q))return say('fees',{product:p.name,fee:String(Math.round(p.fee*10000)/100).replace('.',lang.language==='ro'?',':'.'),rate:String(Math.round(p.returnAssumption*10000)/100).replace('.',lang.language==='ro'?',':'.')});
 if(/los|risk|safe|afraid|fall|guarantee|risc|pierder|sigur/.test(q))return say('risk');
 if(/projection|how much|my (plan|scenario)|this chart|proiec|cât|cat|grafic/.test(q)){const r=project(context.monthly,context.years,p.returnAssumption,p.fee);return say('projection',{monthly:n(context.monthly),years:context.years,contributed:n(r.contributed),balance:n(r.balance)});}
 if(/inflation|purchas|infla|cumpărare/.test(q))return say('inflation',{power:n(purchasingPower(10000,5))});
 if(/bond|obligațiun|obligatiun/.test(q))return say('bond');
 if(/stock|share|equit|acțiun|actiun/.test(q))return say('stock');
 if(/fund|diversif|fond/.test(q))return say('fund');
 if(/compound|interest|capitaliz|dobând|doband/.test(q))return say('compound');
 return say('start');
}
module.exports={restoreJourney,guidedReply};
