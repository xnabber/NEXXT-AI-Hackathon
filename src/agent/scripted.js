'use strict';
function scripted(sequence){let index=0;return{name:'scripted',model:'deterministic-replay',async complete(input){const step=sequence[index++];if(step===undefined)throw new Error('Script exhausted');return typeof step==='function'?step(input):{text:'',toolCalls:[],usage:{inputTokens:0,outputTokens:0},...step};}};}
module.exports={scripted};
