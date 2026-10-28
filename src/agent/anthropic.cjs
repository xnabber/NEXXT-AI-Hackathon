'use strict';
const {jsonRequest}=require('./http.cjs');
function createAnthropic(options={}){
 const model=options.model||process.env.AGENT_MODEL||'claude-sonnet-4-5',key=options.key||process.env.AGENT_ANTHROPIC_API_KEY;
 return{name:'anthropic',model,async complete({system,messages,tools,signal}){
  const formatted=[];for(const m of messages){const role=m.role==='tool'?'user':m.role;const content=m.role==='tool'?[{type:'tool_result',tool_use_id:m.toolCallId,content:JSON.stringify(m.output),is_error:Boolean(m.output.error)}]:[...(m.text?[{type:'text',text:m.text}]:[]),...(m.toolCalls||[]).map(c=>({type:'tool_use',id:c.id,name:c.name,input:c.input}))];if(formatted.at(-1)?.role===role)formatted.at(-1).content.push(...content);else formatted.push({role,content});}
  const data=await(options.request||jsonRequest)('https://api.anthropic.com/v1/messages',{model,system,messages:formatted,tools:tools.map(t=>({name:t.name,description:t.description,input_schema:t.inputSchema})),max_tokens:700},{'x-api-key':key||'','anthropic-version':'2023-06-01'},signal);
  return{text:(data.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('\n'),toolCalls:(data.content||[]).filter(c=>c.type==='tool_use').map(c=>({id:c.id,name:c.name,input:c.input})),usage:{inputTokens:data.usage?.input_tokens||0,outputTokens:data.usage?.output_tokens||0}};
 }};
}
module.exports={createAnthropic};
