'use strict';
require('../src/config.js').loadEnv();const {createProvider}=require('../src/agent/provider.js');const {visibleReply}=require('../src/llm.js');
const provider=process.argv.includes('--bedrock')&&process.env.AWS_BEARER_TOKEN_BEDROCK?require('../src/agent/bedrock.js').createBedrock():createProvider();
if(!provider){console.error('No provider is configured. The application works in offline mode. Set AGENT_PROVIDER and its server-side key in your ignored .env.');process.exitCode=1;}else{
 console.log(`Provider: ${provider.name}; model: ${provider.model}. Key values are hidden.`);
 provider.complete({system:'Reply only OK. Do not call tools or show reasoning.',messages:[{role:'user',text:'Reply with OK.'}],tools:[],signal:AbortSignal.timeout(12000)}).then(result=>{if(!result.text?.trim())throw new Error('EMPTY_REPLY');console.log('Provider connection succeeded.');console.log(visibleReply(result.text));}).catch(error=>{console.error(`Connection failed: ${error.status?`HTTP ${error.status}`:error.name==='AbortError'?'timeout':'network or response error'}. Check provider, model, credentials and network access.`);process.exitCode=1;});
}
