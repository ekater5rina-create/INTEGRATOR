const { test } = require('node:test');
const assert = require('node:assert/strict');
const core = require('../demo-core.js');
const defaults = { quantity:100, material:420, labor:180, overhead:12000, price:1100 };
const header = core.HEADERS.join(';') + '\n';
test('order costs reconcile by units and by expense type', () => {
  const r = core.calculate(defaults);
  assert.equal(r.cost,7200000);
  assert.equal(r.cost,r.material*r.quantity+r.labor*r.quantity+r.overhead);
  assert.equal(r.revenue,11000000); assert.equal(r.profit,3800000);
  assert.equal(r.profit+r.cost,r.revenue);
  assert.equal(r.unitCost,72000); assert.equal(r.breakEvenPrice,72000);
  assert.equal(r.margin,r.profit/r.revenue*100);
});
test('10% materials scenario only changes material cost', () => {
  const initial=core.calculate(defaults), changed=core.calculate({...defaults,material:462});
  assert.equal(changed.cost-initial.cost,420000);
  assert.equal(initial.profit-changed.profit,420000);
});
test('zero revenue and loss remain visible', () => {
  const r=core.calculate({...defaults,price:0});
  assert.equal(r.margin,null); assert.equal(r.profit,-r.cost);
});
test('coverage price always rounds up to one kopeck',()=>{
  const r=core.calculate({quantity:3,material:0,labor:0,overhead:1,price:0.34});
  assert.equal(r.breakEvenPrice,34); assert.equal(r.profit,2);
});
test('exact cents and comma decimal input',()=>{
  assert.equal(core.money('0,29'),29); assert.equal(core.money('1 234,56'),123456);
  assert.equal(core.calculate({quantity:3,material:0.1,labor:0.2,overhead:0,price:0.3}).profit,0);
});
test('invalid and excessive inputs rejected',()=>{
  for(const v of ['', '-1','NaN','Infinity','0.001','1e3','1000001']) assert.throws(()=>core.money(v));
  for(const q of [0,-1,1.5,1000001]) assert.throws(()=>core.calculate({...defaults,quantity:q}));
});
test('maximum order stays within safe integers',()=>{
  const r=core.calculate({quantity:1000000,material:1000000,labor:1000000,overhead:1000000,price:1000000});
  assert(Number.isSafeInteger(r.cost)); assert.equal(r.cost,200000100000000);
});
test('CSV supports BOM, CRLF, quotes, decimal commas and embedded newlines',()=>{
  const rows=core.parseCSV('\uFEFFДата;Заказ;Выручка;Затраты;План выручки\r\n2026-10-01;"Тест; \"\"А\"\"\nзаказ";"10,25";5;12\r\n');
  assert.equal(rows[1][1],'Тест; "А"\nзаказ'); assert.equal(rows[1][2],'10,25');
  assert.equal(core.parseCSV('a,b\n1,2')[1][1],'2');
  assert.equal(core.parseCSV('a\tb\n1\t2')[1][1],'2');
});
test('malformed quotes rejected',()=>{
  for(const v of ['a;"b', 'a;"b"z','a;b"c']) assert.throws(()=>core.parseCSV(v));
});
test('report excludes duplicates and invalid amounts; loss included with warning',()=>{
  const r=core.summarize([
    {name:'a.csv',text:header+'2026-10-01;101;110000;72000;100000\n2026-10-02;102;85000;61000;90000\n'},
    {name:'b.csv',text:header+'2026-10-03;103;40000;47000;50000\n2026-10-01;101;110000;72000;100000\n2026-10-04;104;не указано;20000;30000\n'}
  ]);
  assert.equal(r.accepted.length,3); assert.equal(r.errors.length,2); assert.equal(r.warnings.length,1);
  assert.equal(r.revenue,23500000); assert.equal(r.cost,18000000); assert.equal(r.profit,5500000);
  assert.equal(r.plan,24000000); assert.equal(r.variance,-500000);
  assert.equal(r.profit,r.accepted.reduce((s,row)=>s+row.revenue-row.cost,0));
});
test('calendar dates and empty records are checked',()=>{
  const r=core.summarize([{name:'x.csv',text:header+'2026-02-30;bad;1;1;1\n2026-10-01;;1;1;1\n2026-10-02;ok;0;0;0\n'}]);
  assert.equal(r.errors.length,2); assert.equal(r.accepted.length,1); assert.equal(r.variancePercent,null);
});
test('bad header and schema errors do not silently contribute to totals',()=>{
  const r=core.summarize([{name:'x.csv',text:'wrong;header\n1;2'},{name:'y.csv',text:header+'2026-10-01;1;2;3\n'}]);
  assert.equal(r.errors.length,2); assert.equal(r.accepted.length,0); assert.equal(r.revenue,0);
});
test('file and record limits enforced',()=>{
  assert.throws(()=>core.summarize([]));
  assert.throws(()=>core.summarize(Array(6).fill({name:'x',text:header})));
  assert.throws(()=>core.summarize([{name:'x',text:header+Array(10001).fill('2026-10-01;x;1;1;1').join('\n')}]));
});
