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


// zip files: build real zips (stored and deflated, with a data descriptor-free layout) and read them back
const makeZip0=require('./zip-helper.js');
const makeZip=(f,o)=>{const u=makeZip0(f,o);return u.buffer.slice(u.byteOffset,u.byteOffset+u.length);};
(async()=>{
  const fs1=JSON.stringify(zero), bio1=JSON.stringify(bio);
  // Zero's zip: firestore.json wins, biodata.json is not merged in, mac junk and folders are ignored
  let z=await I.fromZip(makeZip([['export/biodata.json',bio1],['__MACOSX/export/._firestore.json','junk'],['export/firestore.json',fs1],['export/readme.pdf','x']]));
  assert.strictEqual(z.source,'Zero');assert.strictEqual(z.items.length,2);assert.strictEqual(I.plan(z,[],null,[],now).add.length,2);
  // only biodata.json inside still works; stored (not deflated) entries work
  z=await I.fromZip(makeZip([['biodata.json',bio1]],{store:true}));assert.strictEqual(z.items.length,1);
  // a CSV inside a zip
  z=await I.fromZip(makeZip([['fasts.csv','Start,End\n2026-09-01 20:00,2026-09-02 12:00\n']]));assert.strictEqual(z.items.length,1);
  // a zip with nothing usable, a password-protected zip, and a file that is not a zip
  assert.strictEqual((await I.fromZip(makeZip([['photo.png','x'],['notes.txt','hello']]))).error,'format');
  assert.strictEqual((await I.fromZip(makeZip([['firestore.json',fs1]],{encrypt:true}))).error,'encrypted');
  assert.strictEqual((await I.fromZip(makeZip([['photo.png','x']]))).error,'zip');
  assert.strictEqual((await I.fromZip(new Uint8Array([1,2,3,4]).buffer)).error,'zip');
  // password-protected zips made by real tools (zip -e = classic ZipCrypto; pyzipper = WinZip AES 128 and 256), password "lightly-test"
  const fx=n=>{const u=require('fs').readFileSync(require('path').join(__dirname,'fixtures',n));return u.buffer.slice(u.byteOffset,u.byteOffset+u.length);};
  for(const n of ['zero-zipcrypto.zip','zero-aes128.zip','zero-aes256.zip']){
    assert.strictEqual((await I.fromZip(fx(n))).error,'encrypted',n+' asks for a password');
    assert.strictEqual((await I.fromZip(fx(n),'wrong')).error,'password',n+' wrong password');
    assert.strictEqual((await I.fromZip(fx(n),'')).error,'password',n+' empty password');
    z=await I.fromZip(fx(n),'lightly-test');assert.strictEqual(z.source,'Zero',n);assert.strictEqual(z.items.length,2,n);
  }
  /* export to a spreadsheet (audit S4): one line per finished fast, local times, opens in Excel (BOM), and Lightly reads its own CSV back */
  {const T=(y,m,d,h,mi)=>new Date(y,m,d,h,mi).getTime();
   const fasts=[{id:'2',start:T(2026,10,9,20,0),end:T(2026,10,10,11,30),goalH:16,plan:'16'},{id:'1',start:T(2026,10,7,21,0),end:T(2026,10,8,9,0),goalH:16,plan:'custom'},{id:'3',start:T(2026,10,3,8,0),end:T(2026,10,4,10,0),goalH:24,plan:'24'},{id:'x',start:5,end:0,goalH:16},{id:'y',start:T(2026,10,1,8,0),end:T(2026,10,2,8,0),goalH:0,plan:'a,"b"'}];
   const out=I.toCsv(fasts), lines=out.split('\r\n');
   assert.strictEqual(out.charCodeAt(0),0xFEFF,'starts with a BOM so Excel reads 中文 and accents');
   assert.strictEqual(lines[0].slice(1),'start,end,duration_hours,goal_hours,reached_goal,plan_name','header');
   assert.strictEqual(lines.length,6,'header, four fasts, and a closing newline (the broken one is left out)');
   assert.strictEqual(lines[1].split(',')[0],'2026-11-01 08:00','sorted oldest first, local time');
   assert.strictEqual(lines[1],'2026-11-01 08:00,2026-11-02 08:00,24.00,,,"a,""b"""','no goal: empty goal and reached; quotes escaped');
   assert.strictEqual(lines[2],'2026-11-03 08:00,2026-11-04 10:00,26.00,24,yes,24');
   assert.strictEqual(lines[3],'2026-11-07 21:00,2026-11-08 09:00,12.00,16,no,custom','12 h of a 16 h goal: not reached');
   assert.strictEqual(lines[4],'2026-11-09 20:00,2026-11-10 11:30,15.50,16,no,16','15.5 h of a 16 h goal: not reached');
   assert.deepStrictEqual(I.toCsv([]).replace('\uFEFF','').trim(),'start,end,duration_hours,goal_hours,reached_goal,plan_name','an empty list is just the header');
   const back=I.parse(out); assert.strictEqual(back.source,'import');assert.strictEqual(back.items.length,4,'Lightly reads its own spreadsheet back');
   const b3=back.items.filter(x=>x.start===T(2026,10,3,8,0))[0]; assert.ok(b3&&b3.end===T(2026,10,4,10,0)&&b3.goalH===24,'start, end and goal come back exactly (the duration column is not mistaken for the goal)');
   console.log('csv export ok');}
  console.log('import tests ok');
})().catch(e=>{console.error(e);process.exit(1);});
