'use strict';
const {settings}=require('../config.cjs');
function createProvider(config=settings()){
 if(config.provider==='anthropic'&&process.env.AGENT_ANTHROPIC_API_KEY)return require('./anthropic.cjs').createAnthropic();
 if(config.provider==='openai'&&(process.env.AGENT_OPENAI_API_KEY||process.env.AGENT_OPENAI_BASE_URL))return require('./openai.cjs').createOpenAI();
 if(config.provider==='bedrock'&&process.env.AWS_BEARER_TOKEN_BEDROCK)return require('./bedrock.cjs').createBedrock();return null;
}
module.exports={createProvider};
