'use strict';
const {settings}=require('../config.js');
function createProvider(config=settings()){
 if(config.provider==='anthropic'&&process.env.AGENT_ANTHROPIC_API_KEY)return require('./anthropic.js').createAnthropic();
 if(config.provider==='openai'&&(process.env.AGENT_OPENAI_API_KEY||(process.env.AGENT_OPENAI_BASE_URL&&process.env.AGENT_OPENAI_BASE_URL!=='https://api.openai.com/v1')))return require('./openai.js').createOpenAI();
 if(config.provider==='bedrock'&&process.env.AWS_BEARER_TOKEN_BEDROCK)return require('./bedrock.js').createBedrock();return null;
}
module.exports={createProvider};
