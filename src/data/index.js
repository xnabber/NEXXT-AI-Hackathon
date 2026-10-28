'use strict';
const AS_OF = '2026-02-28';
const CATEGORIES = ['rent/mortgage','utilities','groceries','transport','dining','subscriptions','health','travel','shopping','salary/income','tax','transfers'];
const definitions = [
  { id:'ioana', name:'Ioana Popescu', age:34, segment:'individual', incomePattern:'regular', balance:18400, incomes:Array(12).fill(7200), expenses:{'rent/mortgage':2100,utilities:360,groceries:1050,transport:220,dining:380,health:120,travel:200,shopping:260,tax:0,transfers:100}, subscriptions:[['Film Club',45],['Music Daily',25],['Cloud Notes',20]], goals:[{name:'Apartment down payment',horizonYears:7}], obligations:[{name:'Upcoming rent',amount:2100,due:'2026-03-01'}], prompt:'I have some spare cash, what should I do?' },
  { id:'andrei', name:'Andrei Marin', age:22, segment:'individual', incomePattern:'regular', balance:1150, incomes:Array(12).fill(2300), expenses:{'rent/mortgage':820,utilities:140,groceries:620,transport:100,dining:200,health:40,travel:20,shopping:80,tax:0,transfers:20}, subscriptions:[['Game Pass Demo',55],['Video Plus Demo',45],['Study Cloud Demo',35],['Music Daily',25]], goals:[{name:'Build an emergency buffer',horizonYears:1}], obligations:[], prompt:'I don’t know where to start. Can I afford to invest?' },
  { id:'mihai', name:'Mihai Dumitru', age:41, segment:'individual', incomePattern:'irregular', balance:31000, incomes:[4000,5200,6500,9000,15000,5000,8000,6200,10000,4500,12000,7800], expenses:{'rent/mortgage':1350,utilities:350,groceries:1050,transport:250,dining:300,health:150,travel:300,shopping:200,tax:350,transfers:100}, subscriptions:[['Design Tools Demo',180],['Storage Studio Demo',60]], goals:[{name:'Keep tax money liquid and invest a little long term',horizonYears:7}], obligations:[{name:'Fictional March tax bill',amount:9000,due:'2026-03-25'}], prompt:'My income varies and a tax bill is coming. What can I put aside?' },
  { id:'elena', name:'Elena Radu', age:39, segment:'business', incomePattern:'seasonal', balance:130000, incomes:[42000,40000,48000,62000,68000,72000,75000,82000,65000,62000,88000,95000], expenses:{'rent/mortgage':5000,utilities:1800,groceries:12000,transport:1000,dining:0,health:150,travel:300,shopping:600,tax:2000,transfers:400}, payroll:18000, subscriptions:[['Bakery POS Demo',300],['Invoice Desk Demo',150]], goals:[{name:'Protect payroll and use seasonal business surplus',horizonYears:1}], obligations:[{name:'Payroll on the tenth',amount:18000,due:'2026-03-10'},{name:'Seasonal stock invoice',amount:12000,due:'2026-03-05'}], prompt:'Can our bakery surplus earn something without putting payroll at risk?' },
];
function prng(seed) { let state=seed>>>0; return () => { state^=state<<13;state^=state>>>17;state^=state<<5; return (state>>>0)/4294967296; }; }
function freeze(value) { if(value&&typeof value==='object'){ Object.values(value).forEach(freeze);Object.freeze(value); }return value; }
function generate(definition,index=0) {
  const random=prng(8137+index*1039), transactions=[];
  for(let month=0;month<12;month++) {
    const date=new Date(Date.UTC(2025,2+month,1)); const prefix=date.toISOString().slice(0,7);
    const add=(day,amount,category,merchant,recurring=false)=>transactions.push({date:`${prefix}-${String(day).padStart(2,'0')}`,amount,category,merchant,recurring,account:definition.segment==='business'?'business-current':'personal-current'});
    add(25,definition.incomes[month],'salary/income',definition.segment==='business'?'Bakery customer receipts':definition.incomePattern==='irregular'?'Client invoices Demo':'Employer Demo',definition.incomePattern==='regular');
    let day=1;
    for(const [category,base] of Object.entries(definition.expenses)){
      if(!base)continue;
      const fixed=['rent/mortgage','utilities','tax'].includes(category);
      add(Math.min(day+=2,23),-Math.round(base*(fixed?1:.94+random()*.12)),category,category==='groceries'?(definition.segment==='business'?'Flour Supplier Demo':'Grocer Demo'):`${category} Demo`,fixed);
    }
    definition.subscriptions.forEach(([merchant,amount],i)=>add(8+i,-amount,'subscriptions',merchant,true));
    if(definition.payroll)add(10,-definition.payroll,'salary/income','Payroll Demo',true);
  }
  transactions.sort((a,b)=>a.date.localeCompare(b.date)||a.merchant.localeCompare(b.merchant));
  const net=transactions.reduce((sum,t)=>sum+t.amount,0);
  const {incomes,expenses,subscriptions,payroll,...profile}=definition;
  return freeze({...profile,asOf:AS_OF,synthetic:true,openingBalance:definition.balance-net,transactions});
}
function generatePersonas(){return Object.fromEntries(definitions.map((d,i)=>[d.id,generate(d,i)]));}
const personas=generatePersonas();
module.exports={AS_OF,CATEGORIES,prng,generatePersonas,personas,freeze};
