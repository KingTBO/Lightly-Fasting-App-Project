/* First day and Eid (v0.118.0): the person follows their mosque.
   1. Day 1 can move to the day after the calendar's. On the calendar's day 1 Today then says "Ramadan begins · Tomorrow", nothing starts,
      and Ramadan mode stays on. Moving it during the month renumbers the days and takes out the calendar's day 1.
   2. Me has a "This Ramadan" group: First day, Last day, Days to make up.
   3. On the evening of day 29 Today asks "Is Eid tomorrow?". "Not yet" gives a day 30; "Yes, Eid tomorrow" ends Ramadan after day 29.
      Moons shows a "?" day 30 until it is answered. 中文.
   NODE_PATH=$(npm root -g) node tests/ramadan-eid.test.js   (SHOTS=<dir> also saves pictures) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const C=require('../js/core.js');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000; const SHOTS=process.env.SHOTS; if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
const noon=(m,d)=>Date.UTC(2027,m,d,4), CAL='2027-02-08';
const k1={id:'r1',start:Date.UTC(2027,1,7,21,45),end:Date.UTC(2027,1,8,9,50),goalH:12.1,plan:'ramadan'};
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'ramadan',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true},ramadanPreview:false,startedAt:Date.UTC(2027,0,1),
  ramOff:[],ramMade:{},ramAdj:{shift:{},eid:{}}},o||{});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,t,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:SHOTS?2:1,colorScheme:'light',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(t)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300); return p; };
 const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}); };
 const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const t=(p,id)=>p.evaluate(id=>(document.getElementById(id).textContent||'').trim(),id);
 const actOn=p=>p.evaluate(()=>getComputedStyle(document.getElementById('act')).visibility!=='hidden');
 const tab=async(p,x)=>{ await p.click('#tabs [data-tab='+x+']'); await p.waitForTimeout(700); };

 /* 1. a day later */
 let p=await open(seed({ramAdj:{shift:{[CAL]:1},eid:{}},ramNext:CAL}),noon(1,8)); let s=await S(p);
 assert.strictEqual(s.planId,'ramadan','Ramadan mode stays on'); assert.strictEqual(s.cur,null,'nothing starts on the calendar\'s day 1');
 assert.strictEqual(await t(p,'readK'),'Ramadan begins'); assert.strictEqual(await t(p,'readBig'),'Tomorrow'); assert(/Your first day is tomorrow, as you chose\. Suhoor ends at \d\d:\d\d\./.test(await t(p,'readTip'))); assert(!(await actOn(p)));
 await shot(p,'eid-wait'); await tab(p,'days'); const sub=(await p.textContent('#days .mo-s')).trim(); assert(/Feb 9 to Mar 9$/.test(sub),'Moons runs Feb 9 to Mar 9: '+sub);
 assert.strictEqual(await p.getAttribute('#days .mc[data-k="2027-02-09"]','aria-label').then(x=>x.split(',')[0]),'Day 1'); await p.context().close();
 p=await open(seed({ramAdj:{shift:{[CAL]:1},eid:{}},ramNext:CAL}),noon(1,9)); s=await S(p); assert(s.cur&&s.cur.planId==='ramadan','the next day the fast starts at dawn'); assert(/Day 1/.test(await t(p,'planChip'))); await p.context().close();
 ok('day 1 a day later: the calendar\'s day 1 waits ("Ramadan begins · Tomorrow"), then the fast starts');

 /* 2. Me: This Ramadan, and moving day 1 in the middle of the month */
 p=await open(seed({fasts:[k1],ramOff:[],ramNext:'2027-02-20'}),noon(1,20)); assert(/Day 13/.test(await t(p,'planChip')));
 await tab(p,'me'); const me=await t(p,'me'); assert(/This Ramadan/.test(me)&&/First day\s*Feb 8/.test(me)&&/Last day\s*Day 29 or 30/.test(me)&&/Days to make up\s*0/.test(me),me.slice(0,400)); await shot(p,'eid-me');
 await p.click('#me [data-act=ramfirstopen]'); await p.waitForSelector('#sheet.open [data-act=ramfirst]'); assert(/Countries begin on different days/.test(await t(p,'sheet'))); assert.strictEqual(await p.getAttribute('#sheet [data-v="0"]','aria-checked'),'true');
 await p.click('#sheet [data-v="1"]'); await p.waitForTimeout(500); s=await S(p); assert.strictEqual(s.ramAdj.shift[CAL],1); assert(!s.fasts.some(f=>f.id==='r1'),'the calendar\'s day 1 is no longer a Ramadan day'); assert(s.del.includes('r1'));
 assert.strictEqual(await p.getAttribute('#sheet [data-v="1"]','aria-checked'),'true'); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400);
 assert(/Day 12/.test(await t(p,'planChip')),'today is day 12 now'); assert(/First day\s*Feb 9/.test(await t(p,'me'))); await p.context().close();
 ok('Me shows This Ramadan; moving day 1 renumbers the days');

 /* 3. the evening of day 29 */
 const eve=Date.UTC(2027,2,8,11,30);   /* 19:30 in Shanghai, after sunset */
 p=await open(seed(),eve); assert.strictEqual(await t(p,'planChip'),'Eid night?','until answered, Eid is only expected');
 assert(await actOn(p),'the button shows on the evening of day 29'); assert.strictEqual(await t(p,'actLbl'),'Is Eid tomorrow?'); await shot(p,'eid-ask');
 await tab(p,'days'); assert.strictEqual(await p.locator('#days .mc .ring.open').count(),1,'Moons shows a "?" day 30'); await tab(p,'today');
 await p.click('#act'); await p.waitForSelector('#sheet.open [data-act=rameidset]'); await p.waitForTimeout(600); assert(/Has the new moon been announced\?/.test(await t(p,'sheet'))&&/Your mosque decides/.test(await t(p,'sheet'))); await shot(p,'eid-sheet');
 await p.click('#sheet [data-v=no]'); await p.waitForTimeout(600); s=await S(p); assert.strictEqual(s.ramAdj.eid[CAL],'no'); assert.strictEqual(await t(p,'planChip'),'Night 30'); assert(!(await actOn(p)),'answered: the button goes');
 await tab(p,'days'); assert.strictEqual(await p.locator('#days .mc[data-k]').count(),30); assert.strictEqual(await p.locator('#days .mc .ring.open').count(),0); await p.context().close();
 p=await open(seed({ramAdj:{shift:{},eid:{[CAL]:'no'}}}),noon(2,9)); s=await S(p); assert.strictEqual(s.planId,'ramadan'); assert(s.cur,'day 30 is a fast day'); assert.strictEqual(await t(p,'planChip'),'Day 30'); await p.context().close();
 p=await open(seed(),eve); await p.click('#act'); await p.waitForSelector('#sheet.open [data-act=rameidset]'); await p.click('#sheet [data-v=eid]'); await p.waitForTimeout(600);
 assert.strictEqual(await t(p,'planChip'),'Eid night'); s=await S(p); assert.strictEqual(s.ramAdj.eid[CAL],'eid'); await p.context().close();
 p=await open(seed({ramAdj:{shift:{},eid:{[CAL]:'eid'}}}),noon(2,9)); s=await S(p); assert.strictEqual(s.planId,'16','after Eid the usual plan is back'); await p.context().close();
 p=await open(seed({lang:'zh'}),eve,{w:320,h:568}); assert.strictEqual(await t(p,'actLbl'),'明天是开斋节吗？'); await p.click('#act'); await p.waitForSelector('#sheet.open [data-act=rameidset]');
 assert(/新月宣布了吗/.test(await t(p,'sheet'))&&/是，明天开斋节/.test(await t(p,'sheet'))); await shot(p,'eid-zh-320'); await p.context().close();
 ok('the evening of day 29 asks about Eid: Not yet gives day 30, Yes ends Ramadan; 中文 and 320 px');

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | ')); await b.close(); srv.close(); console.log('ramadan eid ok');
})().catch(e=>{ console.error(e); process.exit(1); });
