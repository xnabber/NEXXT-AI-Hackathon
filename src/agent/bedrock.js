'use strict';
const {jsonRequest}=require('./http.js');
function createBedrock(options={}){
 const region=process.env.AWS_REGION||'us-west-2',model=options.model||process.env.AGENT_MODEL||process.env.BEDROCK_MODEL_ID||'us.amazon.nova-lite-v1:0';
 if(!/^[a-z]{2}(?:-[a-z]+)+-\d$/.test(region))throw new Error('Invalid AWS region');
 return{name:'bedrock',model,async complete({system,messages,tools,signal}){
  const formatted=[];for(const m of messages){const role=m.role==='tool'?'user':m.role,content=m.role==='tool'?[{toolResult:{toolUseId:m.toolCallId,content:[{json:m.output}],status:m.output.error?'error':'success'}}]:[...(m.text?[{text:m.text}]:[]),...(m.toolCalls||[]).map(c=>({toolUse:{toolUseId:c.id,name:c.name,input:c.input}}))];if(formatted.at(-1)?.role===role)formatted.at(-1).content.push(...content);else formatted.push({role,content});}
  const data=await(options.request||jsonRequest)(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`,{system:[{text:system}],messages:formatted,...(tools.length?{toolConfig:{tools:tools.map(t=>({toolSpec:{name:t.name,description:t.description,inputSchema:{json:t.inputSchema}}}))}}:{}),inferenceConfig:{maxTokens:700,temperature:.2}},{Authorization:`Bearer ${process.env.AWS_BEARER_TOKEN_BEDROCK||''}`},signal);
  const content=data.output?.message?.content||[];return{text:content.filter(c=>c.text).map(c=>c.text).join('\n'),toolCalls:content.filter(c=>c.toolUse).map(c=>({id:c.toolUse.toolUseId,name:c.toolUse.name,input:c.toolUse.input})),usage:{inputTokens:data.usage?.inputTokens||0,outputTokens:data.usage?.outputTokens||0}};
 }};
}
module.exports={createBedrock};
