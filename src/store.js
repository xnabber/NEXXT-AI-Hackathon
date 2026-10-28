'use strict';
const {randomUUID}=require('node:crypto');const {personas}=require('./data/index.js');
class MemoryStore{
 constructor(){this.sessions=new Map();this.proposals=new Map();this.plans=new Map();this.audit=[];this.cache=new Map();this.now=()=>Date.now();}
 createSession(){const session={id:randomUUID(),customerId:null,authenticated:false,language:'en',memory:{goal:'Explore investing',horizonYears:10,needsLiquidity:false,riskComfort:null,monthly:500,bonus:0,rentDelta:0},messages:[],revision:0,otpAttempts:0,otpVerified:false,createdAt:this.now()};this.sessions.set(session.id,session);return session;}
 selectPersona(session,id){if(!personas[id])return false;session.customerId=id;session.authenticated=true;session.memory={goal:personas[id].goals[0].name,horizonYears:personas[id].goals[0].horizonYears,needsLiquidity:['mihai','elena','andrei'].includes(id),riskComfort:null,monthly:500,bonus:0,rentDelta:0};session.messages=[];session.revision++;return true;}
 profile(session){return session.customerId?personas[session.customerId]:null;}
 record(session,type,data={}){const {tool,decision,mode,ms,tokens,inputTokens,outputTokens,cost,reason}=data;this.audit.push({at:new Date(this.now()).toISOString(),conversation:session.id,persona:session.customerId||'anonymous',type,...Object.fromEntries(Object.entries({tool,decision,mode,ms,tokens,inputTokens,outputTokens,cost,reason}).filter(([,v])=>v!==undefined))});if(this.audit.length>20000)this.audit.splice(0,1000);}
}
module.exports={MemoryStore};
