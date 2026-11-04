const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const E=require('../../app/assets/tax-review.js'),A=require('../../app/assets/analysis2-core.js'),M=require('../../app/assets/result-matrix.js'),R=require('../../app/assets/evidence-requirements.js');
const fixture=require('./synthetic-model.cjs'),support=require('../../app/data/analysis_support.json'),registry=require('../../app/data/acquisition_routes.json');
test('startup contains no bundled company model, archive, report or restoration action',()=>{
 const html=fs.readFileSync('app/index.html','utf8');assert(!html.includes('RETURN_CHECK_SOURCE'));assert(!html.includes('analyzed_sources'));assert(!html.includes('id="restoreSource"'));assert(!fs.existsSync('input'));assert(!fs.existsSync('app/reports'));assert(!fs.existsSync('app/data/analyzed_sources.json'));
 assert.equal((html.match(/data-report="[1-4]"/g)||[]).length,4);assert(registry.routes.every(r=>r.attached.length===0));
});
test('empty startup never creates a calculated refund or worker population',()=>{
 const empty={company:'',companyId:'',taxes:{},employment:null},r=E.estimate(empty),m=M.build(r,A.buildRows(empty,r,support));
 assert(r.rows.every(x=>x.refund===null&&x.net===null));assert(m.annual.every(x=>x.knownSubtotal===null));
});
test('synthetic tax rows reconcile signed payments, rural tax and category totals',()=>{
 const m=fixture(),r=E.estimate(m),rows=A.buildRows(m,r,support),matrix=M.build(r,rows);
 assert.equal(rows.length,150);assert(rows.every(x=>x.type==='세액공제'));assert.equal(new Set(rows.map(x=>x.key)).size,150);
 assert.deepEqual(matrix.categories.map(x=>x.category),['세액공제·감면','기타']);
 for(const y of matrix.annual)assert.equal(matrix.categories.reduce((s,c)=>s+(c.years[y.year].amount||0),0),y.knownSubtotal);
 assert.equal(r.net+r.rural,r.gross);assert(r.comparisons.every(p=>p.net<=r.net));
});
test('negative repayment is not clipped and missing return stays unknown',()=>{
 const m=fixture();m.taxes[2024].burden=m.taxes[2024].minimum;
 const r=E.simulate(m,{2022:'old',2025:'integrated'});assert(r.rows.find(y=>y.year===2024).refund<0);
 delete m.taxes[2023];assert.equal(E.estimate(m).rows.find(y=>y.year===2023).refund,null);
});
test('all tax items retain company-specific evidence requirements without customer records',()=>{
 const m=fixture(),r=E.estimate(m),matrix=M.build(r,A.buildRows(m,r,support));
 for(const item of matrix.items){assert(R.ids.includes(item.id));const v=R.get(item.id,2024,registry.routes);assert(v.government.length&&v.company.length&&v.questions.length)}
 assert(R.get('social',2024,registry.routes).government.some(g=>g.id==='insurance'));assert(R.get('rnd',2024,registry.routes).company.some(x=>x.includes('연구노트')));
});
test('consultation completion requires a verified response, not a draft',()=>{
 assert.throws(()=>A.validateCase({status:'해결완료'}));assert(A.validateCase({status:'해결완료',response:'synthetic reply',evidence:'synthetic evidence',evidenceChecked:true}));
 assert.throws(()=>A.mailto('test@example.invalid\r\nBcc:bad@example.invalid','',''));
});
