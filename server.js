'use strict';
require('./src/config.js').loadEnv();
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {MemoryStore}=require('./src/store.js');const {agentTurn}=require('./src/agent/agent.js');const {createProvider}=require('./src/agent/provider.js');const {executeTool,inferRisk}=require('./src/tools/index.js');const {confirmProposal,publicProposal}=require('./src/bank.js');const {personas}=require('./src/data/index.js');const {products}=require('./src/products.js');const {purchasingPower}=require('./src/engine.js');const {settings}=require('./src/config.js');const {clean}=require('./src/agent/intent.js');
const {metrics}=require('./src/metrics.js');
const ROOT=path.join(__dirname,'public');
function createApp(options={}){
 const store=options.store||new MemoryStore(),config={...settings(),...options.config},limits=new Map();
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 function sessionFor(req,res){const id=req.headers.cookie?.match(/(?:^|;\s*)agent_session=([a-f0-9-]{36})(?:;|$)/)?.[1];let session=store.sessions.get(id);if(!session){session=store.createSession();res.setHeader('Set-Cookie',`agent_session=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);}return session;}
 function bootstrap(session){return{demo:config.demo,providerConfigured:Boolean(createProvider(config)),provider:config.provider,limits:{monthlyMin:100,monthlyMax:2000,monthlyStep:50,years:[1,2,3,5,7,10,15,20],inflation:.055,expiryMinutes:10},intro:{amount:10000,years:5,inflation:.055,purchasingPower:purchasingPower(10000,5)},personas:config.demo?Object.values(personas).map(p=>({id:p.id,name:p.name,segment:p.segment,incomePattern:p.incomePattern,prompt:p.prompt})):[],products,session:{authenticated:session.authenticated,personaId:session.customerId,name:store.profile(session)?.name||'Demo visitor',language:session.language,memory:session.memory,messages:session.messages,stage:session.onboardingStage||'profile',otpAttempts:session.otpAttempts},result:session.lastResult||null,plans:[...store.plans.values()].filter(p=>p.owner===session.id&&p.customer===session.customerId).map(publicProposal)};}
 async function body(req){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>32768)throw Object.assign(new Error('Request too large'),{status:413});}try{const parsed=text?JSON.parse(text):{};if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('Object required');return parsed;}catch{throw Object.assign(new Error('Invalid JSON'),{status:400});}}
 function allowAdmin(req){if(config.demo)return true;const value=req.headers['x-admin-token']||'',expected=process.env.ADMIN_TOKEN||'';return expected&&value.length===expected.length&&crypto.timingSafeEqual(Buffer.from(value),Buffer.from(expected));}
 const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  let session;
  try{
   const url=new URL(req.url,'http://localhost');
   if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:{code:'ORIGIN_DENIED',message:'Use the same-origin app.'}});
   if(url.pathname.startsWith('/api/')){
    session=sessionFor(req,res);if(!session.languageDetected){session.language=/^ro/i.test(req.headers['accept-language']||'')?'ro':'en';session.languageDetected=true;}
    if(req.method==='GET'&&url.pathname==='/api/health')return send(res,200,{status:'ok',coachMode:createProvider(config)?'agent-configured':'offline',provider:config.provider});
    if(req.method==='GET'&&url.pathname==='/api/bootstrap')return send(res,200,bootstrap(session));
    if(req.method==='POST'&&url.pathname==='/api/language'){const input=await body(req);if(!['en','ro'].includes(input.language))return send(res,400,{error:{code:'INVALID_LANGUAGE'}});session.language=input.language;return send(res,200,bootstrap(session));}
    if(req.method==='POST'&&url.pathname==='/api/demo/persona'){
     const input=await body(req);if(!config.demo)return send(res,403,{error:{code:'DEMO_DISABLED'}});if(!personas[input.personaId])return send(res,400,{error:{code:'UNKNOWN_PERSONA'}});
     const fresh=store.createSession();fresh.language=session.language;fresh.languageDetected=true;store.selectPersona(fresh,input.personaId);store.record(fresh,'login');res.setHeader('Set-Cookie',`agent_session=${fresh.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);return send(res,200,bootstrap(fresh));
    }
    if(req.method==='POST'&&url.pathname==='/api/reset'){const fresh=store.createSession();fresh.language=session.language;res.setHeader('Set-Cookie',`agent_session=${fresh.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);return send(res,200,bootstrap(fresh));}
    if(req.method==='POST'&&url.pathname==='/api/events'){const input=await body(req);if(['visit','coach_started','onboarding_started','product_selected','review_started'].includes(input.event))store.record(session,input.event);return send(res,200,{ok:true});}
    if(req.method==='POST'&&url.pathname==='/api/scenario'){
     if(session.activeTurn)return send(res,409,{error:{code:'TURN_IN_PROGRESS'}});
     const input=await body(req),allowed=['monthly','horizonYears','riskComfort','needsLiquidity'];if(Object.keys(input).some(k=>!allowed.includes(k)))return send(res,400,{error:{code:'INVALID_SCENARIO'}});
     if(input.monthly!==undefined&&(!Number.isInteger(input.monthly)||input.monthly<100||input.monthly>2000||input.monthly%50))return send(res,400,{error:{code:'INVALID_AMOUNT'}});
     if(input.horizonYears!==undefined&&![1,2,3,5,7,10,15,20].includes(input.horizonYears))return send(res,400,{error:{code:'INVALID_HORIZON'}});
     if(input.riskComfort!==undefined&&!['steady','balanced','growth'].includes(input.riskComfort))return send(res,400,{error:{code:'INVALID_RISK'}});
     if(input.needsLiquidity!==undefined&&typeof input.needsLiquidity!=='boolean')return send(res,400,{error:{code:'INVALID_LIQUIDITY'}});
     for(const key of ['monthly','horizonYears'])if(input[key]!==undefined)session.memory[key]=input[key];
     if(input.needsLiquidity!==undefined){if(typeof input.needsLiquidity!=='boolean')return send(res,400,{error:{code:'INVALID_LIQUIDITY'}});session.memory.needsLiquidity=input.needsLiquidity;}
     if(input.riskComfort){session.lastUserText=input.riskComfort;executeTool(store,session,'set_risk_profile',{answer:input.riskComfort});}
     session.memory.explicit=true;session.revision++;session.lastResult=null;return send(res,200,bootstrap(session));
    }
    if(req.method==='POST'&&['/api/agent','/api/coach','/api/chat'].includes(url.pathname)){
     const input=await body(req),raw=input.message||(Array.isArray(input.messages)?input.messages.filter(m=>m?.role==='user').at(-1)?.text:null),text=typeof raw==='string'?clean(raw):'';
     if(typeof text!=='string'||!text.trim()||text.length>1200)return send(res,400,{error:{code:'INVALID_MESSAGE'}});
     if(session.activeTurn)return send(res,409,{error:{code:'TURN_IN_PROGRESS'}});
     const now=store.now();for(const[key,value]of limits)if(value.until<now)limits.delete(key);const current=limits.get(session.id)||{count:0,until:now+60000};if(++current.count>30)return send(res,429,{error:{code:'RATE_LIMIT',message:'Please wait a moment before asking again.'}});limits.set(session.id,current);
     const controller=new AbortController(),onClose=()=>{if(!res.writableEnded)controller.abort();};res.on('close',onClose);session.activeTurn=true;
     const opts={signal:controller.signal,config,...(Object.hasOwn(options,'provider')?{provider:options.provider}: {})};
     try{if(req.headers.accept?.includes('text/event-stream')){
      res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no','Connection':'keep-alive'});res.write(': connected\n\n');
      opts.onEvent=event=>{if(!res.destroyed)res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);};
      const result=await agentTurn(store,session,text,opts);if(!result.cancelled)session.lastResult=result;if(!res.destroyed)res.end();return;
     }
     const result=await agentTurn(store,session,text,opts);if(!result.cancelled)session.lastResult=result;
     if(url.pathname!=='/api/agent')return send(res,200,{...result,text:result.messages?.[0]?.text,source:result.mode==='agent'?(result.provider==='bedrock'?'bedrock':'agent'):'guided'});
     return send(res,200,result);
     }finally{session.activeTurn=false;res.removeListener('close',onClose);}
    }
    if(req.method==='POST'&&url.pathname==='/api/simulate'){const input=await body(req);const result=executeTool(store,session,'simulate',input).output;return send(res,result.error?400:200,result);}
    if(req.method==='GET'&&url.pathname==='/api/products'){const result=executeTool(store,session,'compare_products',{}).output;return send(res,result.error?401:200,result);}
    if(req.method==='POST'&&url.pathname==='/api/proposals'){const input=await body(req);const result=executeTool(store,session,'propose_plan',input).output;return send(res,result.error?422:200,result);}
    const confirmation=url.pathname.match(/^\/api\/proposals\/([a-f0-9-]+)\/confirm$/);
    if(req.method==='POST'&&confirmation){const input=await body(req);if(Object.keys(input).some(k=>k!=='confirm'))return send(res,400,{error:{code:'IMMUTABLE_PROPOSAL'}});const result=confirmProposal(store,session,confirmation[1],input.confirm);return send(res,result.error?422:200,result);}
    if(req.method==='POST'&&url.pathname==='/api/auth/login'){
     const input=await body(req);if(input.demo!==true)return send(res,400,{error:{code:'DEMO_ACK_REQUIRED'}});const before={...session.memory};store.selectPersona(session,'ioana');if(before.explicit)session.memory={...session.memory,...before};store.record(session,'login');return send(res,200,bootstrap(session));
    }
    if(req.method==='POST'&&url.pathname==='/api/onboarding'){
     const input=await body(req),stage=session.onboardingStage||'profile';
     if(stage==='profile'&&input.step==='profile'){session.onboardingStage='contact';store.record(session,'onboarding_started');}
     else if(stage==='contact'&&input.step==='contact')session.onboardingStage='otp';
     else if(stage==='otp'&&input.step==='otp'){
      if(session.otpAttempts>=3)return send(res,429,{error:{code:'OTP_LOCKED'}});session.otpAttempts++;
      if(input.code!=='123456')return send(res,422,{error:{code:'OTP_INVALID',attemptsRemaining:3-session.otpAttempts}});session.otpVerified=true;session.onboardingStage='review';
     }else if(stage==='review'&&input.step==='complete'&&session.otpVerified&&input.demo===true){const before={...session.memory};store.selectPersona(session,'ioana');if(before.explicit)session.memory={...session.memory,...before};session.onboardingStage='complete';store.record(session,'signup_completed');}
     else return send(res,409,{error:{code:'ONBOARDING_ORDER'}});return send(res,200,bootstrap(session));
    }
    if(req.method==='GET'&&url.pathname==='/api/admin'){if(!allowAdmin(req))return send(res,403,{error:{code:'ADMIN_REQUIRED'}});const turns=store.audit.filter(e=>e.type==='turn');return send(res,200,{events:store.audit,metrics:metrics(store),turns:turns.length,plans:store.plans.size,proposals:store.proposals.size});}
    return send(res,404,{error:{code:'NOT_FOUND'}});
   }
   const relative=url.pathname.startsWith('/i18n/')?url.pathname:'/index.html';
   const asset=/\.[a-z0-9]+$/i.test(url.pathname)&&!url.pathname.startsWith('/account/')?url.pathname:relative;
   const file=path.resolve(ROOT,`.${asset}`);if(!file.startsWith(ROOT+path.sep)||asset.includes('..'))return send(res,404,{error:{code:'NOT_FOUND'}});
   let data;try{data=fs.readFileSync(file);}catch{return send(res,404,{error:{code:'NOT_FOUND'}});}
   const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':`${type}; charset=utf-8`,'Cache-Control':'no-cache'});res.end(data);
  }catch(error){if(!res.headersSent)send(res,error.status||500,{error:{code:error.status===413?'REQUEST_TOO_LARGE':'REQUEST_FAILED',message:'The request could not be completed.'}});else if(!res.destroyed)res.end();}
 });
 return {server,store};
}
if(require.main===module){const{server}=createApp();server.listen(Number(process.env.PORT)||5173,process.env.HOST||'127.0.0.1',()=>console.log(`Investment Coach on port ${Number(process.env.PORT)||5173}; mode selection: ${settings().provider}; synthetic demo only.`));for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));}
module.exports={createApp};
