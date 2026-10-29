'use strict';
const {randomUUID}=require('node:crypto');const {personas}=require('./data/index.js');
class MemoryStore{
 constructor(){this.sessions=new Map();this.proposals=new Map();this.plans=new Map();this.audit=[];this.cache=new Map();this.now=()=>Date.now();}
 createSession(){const session={id:randomUUID(),customerId:null,authenticated:false,language:'en',memory:{goal:'Explore investing',horizonYears:10,needsLiquidity:false,riskComfort:null,monthly:500,bonus:0,rentDelta:0},messages:[],revision:0,otpAttempts:0,otpVerified:false,createdAt:this.now()};this.sessions.set(session.id,session);return session;}
 selectPersona(session,id){if(!personas[id])return false;session.customerId=id;session.authenticated=true;session.memory={goal:personas[id].goals[0].name,horizonYears:personas[id].goals[0].horizonYears,needsLiquidity:['mihai','elena','andrei'].includes(id),riskComfort:null,monthly:500,bonus:0,rentDelta:0};session.messages=[];session.lastChange=null;session.pendingHorizon=null;session.lastResult=null;session.revision++;return true;}
 profile(session){return session.customerId?personas[session.customerId]:null;}
 toolValue(session,name,input,compute){
  const cacheable=['get_customer_profile','get_spending_summary','find_savings_capacity','compare_products','simulate'];if(!cacheable.includes(name))return compute();
  const key=JSON.stringify([session.id,session.customerId,session.revision,name,input]),cached=this.cache.get(key);
  if(cached&&cached.until>this.now())return structuredClone(cached.value);
  const value=compute();if(!value.error){if(this.cache.size>=500)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,{until:this.now()+60000,value:structuredClone(value)});}return value;
 }
 record(session,type,data={}){const {tool,agent,decision,mode,ms,tokens,inputTokens,outputTokens,cost,reason}=data;this.audit.push({at:new Date(this.now()).toISOString(),conversation:session.id,persona:session.customerId||'anonymous',type,...Object.fromEntries(Object.entries({tool,agent,decision,mode,ms,tokens,inputTokens,outputTokens,cost,reason}).filter(([,v])=>v!==undefined))});if(this.audit.length>20000)this.audit.splice(0,1000);}
}
module.exports={MemoryStore};
