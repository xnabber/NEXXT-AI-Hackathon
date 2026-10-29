'use strict';
const round=value=>Math.round((value+Number.EPSILON)*100)/100;
function purchasingPower(amount,years,inflation=.055){if(![amount,years,inflation].every(Number.isFinite)||amount<0||years<0||inflation<=-1)throw new RangeError('Invalid assumptions');return amount/(1+inflation)**years;}
function project(monthly,years,annualReturn=.06,annualFee=.009,inflation=.055){
 if(![monthly,years,annualReturn,annualFee,inflation].every(Number.isFinite)||monthly<0||!Number.isInteger(years)||years<1||years>50||annualFee<0||annualReturn-annualFee<=-1||inflation<=-1)throw new RangeError('Invalid assumptions');
 const rate=(1+annualReturn-annualFee)**(1/12)-1;let balance=0;const points=[{year:0,contributed:0,projected:0,real:0}];
 for(let month=1;month<=years*12;month++){balance=balance*(1+rate)+monthly;if(month%12===0)points.push({year:month/12,contributed:month*monthly,projected:round(balance),real:round(purchasingPower(balance,month/12,inflation))});}
 const contributed=monthly*years*12;return{balance:round(balance),contributed,growth:round(balance-contributed),real:round(purchasingPower(balance,years,inflation)),points,annualReturn,annualFee,inflation,monthly,years,withdrawalDays:[3,5],inflationExample:{initial:10000,years:5,power:round(purchasingPower(10000,5))},illustrative:true};
}
module.exports={round,purchasingPower,project};
