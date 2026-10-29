'use strict';
const dictionaries={en:require('./en.json'),ro:require('./ro.json')};
function copy(session,key,values={}){const template=dictionaries[session?.language==='ro'?'ro':'en'][key]||dictionaries.en[key]||key;return Object.entries(values).reduce((text,[name,value])=>text.replaceAll(`{${name}}`,String(value)),template);}
module.exports={copy,dictionaries};
