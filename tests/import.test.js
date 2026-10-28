/* usage: node tests/import.test.js  (synthetic data only) */
const I=require('../js/import.js'),assert=require('assert');
const H=3600000,now=Date.parse('2026-10-28T12:00:00Z');
const z=(id,s,e,g,ended=true)=>({id,data:{id,start:s,end:e,endWithSeconds:e,isEnded:ended,goal:{hours:g}}});
const zero={fasts:[z('a','2026-10-01T20:00:00Z','2026-10-02T12:00:00Z',16),z('b','2026-10-02T20:00:00Z','2026-10-03T14:00:00Z',18),z('c','2026-10-03T20:00:00Z',null,16,false)],user:{}};
let r=I.parse(JSON.stringify(zero));assert.strictEqual(r.source,'Zero');assert.strictEqual(r.items.length,2);assert.strictEqual(r.open,1);
let p=I.plan(r,[],null,[],now);assert.strictEqual(p.add.length,2);assert.strictEqual(p.add[0].goalH,16);assert.strictEqual(p.add[0].plan,'16');assert.strictEqual(p.add[1].plan,'custom');
// importing twice adds nothing
let p2=I.plan(r,p.add,null,[],now);assert.strictEqual(p2.add.length,0);assert.strictEqual(p2.dup,2);
// same fast from the other Zero file (different ids, same times) is a duplicate, not a second fast
const bio={fast_data:[{FastID:'X1',StartDTM:'2026-10-01T20:00:00Z',EndDTM:'2026-10-02T12:00:00Z',GoalHours:16,IsEnded:true}]};
p2=I.plan(I.parse(JSON.stringify(bio)),p.add,null,[],now);assert.strictEqual(p2.add.length,0);assert.strictEqual(p2.dup,1);
// a different fast that overlaps is skipped and counted
p2=I.plan(I.parse(JSON.stringify({fast_data:[{FastID:'Y',StartDTM:'2026-10-01T23:00:00Z',EndDTM:'2026-10-02T10:00:00Z',GoalHours:16,IsEnded:true}]})),p.add,null,[],now);assert.strictEqual(p2.overlap,1);
// deleted by the user stays deleted; running fast blocks overlap; future and absurd are rejected
p2=I.plan(r,[],null,['zero:a'],now);assert.strictEqual(p2.add.length,1);
p2=I.plan(r,[],{start:Date.parse('2026-10-02T00:00:00Z')},[],now);assert.strictEqual(p2.add.length,0);
p2=I.plan({source:'x',items:[{start:now+H,end:now+9*H},{start:now-200*H,end:now-1*H},{start:NaN,end:1}],open:0},[],null,[],now);assert.strictEqual(p2.add.length,0);assert.strictEqual(p2.future+p2.bad,3);
// CSV from another app, quoted fields, semicolons, and missing goal falls back to duration
r=I.parse('Start,End,Goal\n"2026-09-01 20:00","2026-09-02 12:00",16\n2026-09-02T20:00:00Z,2026-09-03T08:00:00Z,\n');assert.strictEqual(r.items.length,2);
p=I.plan(r,[],null,[],now);assert.strictEqual(p.add.length,2);assert.strictEqual(p.add[1].goalH,12);
r=I.parse('started_at;ended_at\n2026-09-01T20:00:00Z;2026-09-02T12:00:00Z');assert.strictEqual(r.items.length,1);
// Lightly's own backup restores
r=I.parse(JSON.stringify({fasts:[{id:'q',start:now-20*H,end:now-4*H,goalH:16}]}));assert.strictEqual(r.source,'Lightly');assert.strictEqual(I.plan(r,[],null,[],now).add.length,1);
// garbage
assert.strictEqual(I.parse('').error,'empty');assert.strictEqual(I.parse('{oops').error,'json');assert.strictEqual(I.parse('{"a":1}').error,'format');assert.strictEqual(I.parse('hello,world\n1,2').error,'format');
console.log('import tests ok');
