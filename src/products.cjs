'use strict';
const {freeze}=require('./data/index.cjs');
const products=freeze([
 {id:'savings',name:'Everyday Buffer',type:'savings',segment:'individual',liquidity:'instant',minimumHorizon:0,returnAssumption:.02,fee:0,risk:1,minimumMonthly:100,illustrative:true},
 {id:'deposit',name:'Flexible Term Deposit',type:'deposit',segment:'individual',liquidity:'locked',minimumHorizon:.25,returnAssumption:.04,fee:0,risk:1,minimumMonthly:100,illustrative:true},
 {id:'steady',name:'Steady Start',type:'fund',segment:'individual',liquidity:'days',minimumHorizon:3,returnAssumption:.04,fee:.006,risk:2,minimumMonthly:100,illustrative:true},
 {id:'balanced',name:'Balanced Future',type:'fund',segment:'individual',liquidity:'days',minimumHorizon:5,returnAssumption:.06,fee:.009,risk:4,minimumMonthly:100,illustrative:true},
 {id:'growth',name:'Long-Term Growth',type:'fund',segment:'individual',liquidity:'days',minimumHorizon:10,returnAssumption:.08,fee:.012,risk:6,minimumMonthly:100,illustrative:true},
 {id:'business-liquid',name:'Business Cash Reserve',type:'savings',segment:'business',liquidity:'instant',minimumHorizon:0,returnAssumption:.025,fee:0,risk:1,minimumMonthly:100,illustrative:true},
 {id:'business-ladder',name:'Business Deposit Ladder',type:'ladder',segment:'business',liquidity:'locked',minimumHorizon:.25,returnAssumption:.045,fee:0,risk:1,minimumMonthly:0,rungsDays:[30,60,90],illustrative:true},
]);
module.exports={products,byId:id=>products.find(p=>p.id===id)};
