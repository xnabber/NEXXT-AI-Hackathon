'use strict';
const http=require('node:http'),https=require('node:https'),tls=require('node:tls'),fs=require('node:fs');
async function jsonRequest(url,body,headers={},signal){
 const target=new URL(url);if(target.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(target.hostname))throw new Error('Provider URLs must use HTTPS.');
 const proxy=process.env.HTTPS_PROXY||process.env.https_proxy;
 if(!proxy||target.protocol!=='https:'){
  // The built-in fetch path supports local OpenAI-compatible servers too.
  const response=await fetch(target,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body),signal});
  if(!response.ok)throw Object.assign(new Error('Provider request failed'),{status:response.status});return response.json();
 }
 const caPath=process.env.AWS_CA_BUNDLE||process.env.SSL_CERT_FILE||process.env.REQUESTS_CA_BUNDLE;
 const trust=caPath?{ca:fs.readFileSync(caPath)}:{};
 return new Promise((resolve,reject)=>{
  const p=new URL(proxy),transport=p.protocol==='https:'?https:http;
  let outgoing,socket,settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);if(error){outgoing?.destroy();socket?.destroy();reject(error);}else resolve(value);};
  const abort=()=>finish(Object.assign(new Error('Provider request aborted'),{name:'AbortError'}));
  if(signal?.aborted)return abort();signal?.addEventListener('abort',abort,{once:true});
  const connect=transport.request({hostname:p.hostname,port:p.port||(p.protocol==='https:'?443:80),method:'CONNECT',path:`${target.hostname}:${target.port||443}`,headers:{Host:`${target.hostname}:${target.port||443}`},...trust});
  outgoing=connect;connect.on('error',error=>finish(error));
  connect.on('connect',(response,tunnel,head)=>{
   socket=tunnel;if(response.statusCode!==200)return finish(Object.assign(new Error('Proxy rejected connection'),{status:response.statusCode}));if(head.length)tunnel.unshift(head);
   const secure=tls.connect({socket:tunnel,servername:target.hostname,...trust});socket=secure;
   secure.once('error',error=>finish(error));secure.once('secureConnect',()=>{
    const agent=new https.Agent({keepAlive:false});agent.createConnection=()=>secure;
    const request=https.request(target,{method:'POST',agent,headers:{'Content-Type':'application/json',...headers},...trust},response=>{
     let text='';response.setEncoding('utf8');response.on('data',chunk=>{text+=chunk;if(text.length>2000000)finish(new Error('Provider response too large'));});response.on('error',error=>finish(error));response.on('end',()=>{if(response.statusCode<200||response.statusCode>=300)return finish(Object.assign(new Error('Provider request failed'),{status:response.statusCode}));try{finish(null,JSON.parse(text));}catch{finish(new Error('Invalid provider response'));}secure.end();});
    });outgoing=request;request.on('error',error=>finish(error));request.end(JSON.stringify(body));
   });
  });connect.end();
 });
}
module.exports={jsonRequest};
