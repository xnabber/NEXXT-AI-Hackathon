'use strict';
const {jsonRequest}=require('./http.js');
function createOpenAI(options={}){
 const base=options.baseURL||process.env.AGENT_OPENAI_BASE_URL||'https://api.openai.com/v1',model=options.model||process.env.AGENT_MODEL||'gpt-4.1-mini',key=options.key||process.env.AGENT_OPENAI_API_KEY;
 return{name:'openai',model,async complete({system,messages,tools,signal}){
  const formatted=[{role:'system',content:system},...messages.map(m=>m.role==='tool'?{role:'tool',tool_call_id:m.toolCallId,content:JSON.stringify(m.output)}:m.toolCalls?.length?{role:'assistant',content:m.text||null,tool_calls:m.toolCalls.map(c=>({id:c.id,type:'function',function:{name:c.name,arguments:JSON.stringify(c.input)}}))}:{role:m.role,content:m.text})];
  const data=await (options.request||jsonRequest)(`${base.replace(/\/$/,'')}/chat/completions`,{model,messages:formatted,...(tools.length?{tools:tools.map(t=>({type:'function',function:{name:t.name,description:t.description,parameters:t.inputSchema}}))}:{}),max_tokens:700,temperature:.2},{Authorization:`Bearer ${key||''}`},signal);
  const reply=data.choices?.[0]?.message||{};return{text:reply.content||'',toolCalls:(reply.tool_calls||[]).map(c=>{let input;try{input=JSON.parse(c.function.arguments);}catch{input={invalid:true};}return{id:c.id,name:c.function.name,input};}),usage:{inputTokens:data.usage?.prompt_tokens||0,outputTokens:data.usage?.completion_tokens||0}};
 }};
}
module.exports={createOpenAI};
