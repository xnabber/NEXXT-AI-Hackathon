'use strict';
const{test}=require('node:test');const assert=require('node:assert/strict');const{definitions}=require('../src/tools/index.js');
const request={system:'Use tools',messages:[{role:'user',text:'Compare options'}],tools:definitions};
test('W3 OpenAI-compatible adapter sends tool schemas and parses usage/calls',async()=>{
 const{createOpenAI}=require('../src/agent/openai.js');let sent;
 const provider=createOpenAI({baseURL:'https://models.example.test/v1',request:async(url,body)=>{sent={url,body};return{choices:[{message:{tool_calls:[{id:'t',function:{name:'find_savings_capacity',arguments:'{}'}}]}}],usage:{prompt_tokens:100,completion_tokens:20}};}});
 const r=await provider.complete(request);assert(sent.url.endsWith('/chat/completions'));assert.equal(sent.body.tools.length,10);assert.equal(r.toolCalls[0].name,'find_savings_capacity');assert.equal(r.usage.inputTokens,100);
});
test('W3 Anthropic adapter preserves structured tool results and usage',async()=>{
 const{createAnthropic}=require('../src/agent/anthropic.js');let body;
 const p=createAnthropic({request:async(_url,b)=>{body=b;return{content:[{type:'tool_use',id:'t',name:'get_customer_profile',input:{}}],usage:{input_tokens:50,output_tokens:10}};}});
 const r=await p.complete({...request,messages:[...request.messages,{role:'assistant',text:'',toolCalls:[{id:'x',name:'find_savings_capacity',input:{}}]},{role:'tool',toolCallId:'x',output:{safeMonthly:500}}]});assert.equal(body.messages.at(-1).content[0].type,'tool_result');assert.equal(r.toolCalls[0].id,'t');assert.equal(r.usage.outputTokens,10);
});
test('W3 retained Bedrock adapter calls the same schema interface without an SDK',async()=>{
 const{createBedrock}=require('../src/agent/bedrock.js');let body;const p=createBedrock({request:async(_url,b)=>{body=b;return{output:{message:{content:[{toolUse:{toolUseId:'t',name:'compare_products',input:{}}}]}},usage:{inputTokens:70,outputTokens:15}};}});const r=await p.complete(request);assert.equal(body.toolConfig.tools.length,10);assert.equal(r.toolCalls[0].name,'compare_products');
});
