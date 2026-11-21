/* Ramadan and everyday plans are two separate modes (v0.122.2, Tengbo 2026-11-21): a running fast never carries from one into the other.
   1. In Ramadan mode with the day's fast running, picking 16:8 asks first ("Today's Ramadan fast stops here"). closing it changes nothing;
      Stop and switch ends the timer: Today is ready for a fresh 16:8 with no prayer dots, and nothing starts again by itself.
   2. A running 16:8 fast and Ramadan picked: it asks first ("this fast ends now and is saved"). closing it changes nothing (no prayer dots on the 16:8 arc);
      End fast and switch saves the 16:8 fast and Ramadan takes over from dawn with its prayers.
   3. A phone left in the old mixed state (plan Ramadan, a 16:8 fast running) goes back to 16:8. Picking Ramadan again in Ramadan just closes the sheet. 中文.
   NODE_PATH=$(npm root -g) node tests/ramadan-switch.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000;
const T=Date.UTC(2027,1,20,6);   /* 14:00 in Shanghai, day 13 of Ramadan 1448 */
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'ramadan',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true},ramadanPreview:false,startedAt:Date.UTC(2027,0,1),
  ramOff:[],ramMade:{},ramAdj:{shift:{},eid:{}},ramNext:'2027-02-20'},o||{});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async s=>{ const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',reducedMotion:'reduce'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(T)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300); return p; };
 const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const dots=p=>p.$$eval('#prayG *',a=>a.length);
 const sheet=p=>p.evaluate(()=>{ const w=document.createTreeWalker(document.getElementById('sheet'),NodeFilter.SHOW_TEXT), a=[]; while(w.nextNode()){ const x=w.currentNode.textContent.trim(); if(x) a.push(x); } return a.join(' '); });
 const pick=async(p,id)=>{ await p.click('#planBtn'); await p.waitForSelector('#sheet.open .plan[data-id="'+id+'"]'); await p.click('#sheet .plan[data-id="'+id+'"]'); await p.waitForTimeout(400); };
 const later=async(p,ms)=>{ await p.clock.setFixedTime(new Date(T+ms)); await p.waitForTimeout(1200); };

 /* 1. Ramadan -> 16:8 */
 let p=await open(seed()); let s=await S(p); assert(s.cur&&s.cur.planId==='ramadan','the day\'s Ramadan fast runs'); assert((await dots(p))>0);
 await pick(p,'16'); assert(/^Switch to Classic\? Today’s Ramadan fast stops here\. Classic starts fresh when you tap Start\. Stop and switch$/.test(await sheet(p)),await sheet(p));
 await p.click('#sheet [data-act=close]'); await p.waitForTimeout(300); s=await S(p); assert(s.planId==='ramadan'&&s.cur&&s.cur.planId==='ramadan','closing it changes nothing');
 await pick(p,'16'); await p.click('#sheet [data-act=modego]'); await p.waitForTimeout(500); s=await S(p);
 assert.strictEqual(s.planId,'16'); assert.strictEqual(s.cur,null,'the Ramadan timer stops'); assert.strictEqual(s.fasts.length,0,'a half Ramadan day is not saved as a fast');
 assert.strictEqual(await dots(p),0,'no prayer dots on the everyday arc'); assert.strictEqual(await p.isVisible('#prayBtn'),false);
 await later(p,3*H); s=await S(p); assert.strictEqual(s.cur,null,'nothing starts again by itself'); await later(p,20*H); s=await S(p); assert.strictEqual(s.cur,null,'not at the next dawn either');
 await p.context().close(); ok('Ramadan -> 16:8 asks, stops the timer, no prayer dots, nothing restarts');

 /* 2. 16:8 running -> Ramadan */
 p=await open(seed({planId:'16',cur:{start:T-15*H,goalH:16,planId:'16',reached:false}})); assert.strictEqual(await dots(p),0);
 await pick(p,'ramadan'); assert(/^Switch to Ramadan\? Ramadan runs from dawn to sunset, so this fast ends now and is saved\. End fast and switch$/.test(await sheet(p)),await sheet(p));
 s=await S(p); assert.strictEqual(s.planId,'16','asking changes nothing yet'); assert.strictEqual(await dots(p),0,'no prayer dots while the 16:8 fast runs');
 await p.click('#sheet [data-act=close]'); await p.waitForTimeout(300); s=await S(p); assert(s.planId==='16'&&s.cur.planId==='16'&&s.cur.goalH===16,'closing it changes nothing');
 await pick(p,'ramadan'); await p.click('#sheet [data-act=modego]'); await p.waitForTimeout(600); s=await S(p);
 assert.strictEqual(s.planId,'ramadan'); assert.strictEqual(s.fasts.length,1); assert.strictEqual(s.fasts[0].plan,'16'); assert.strictEqual(Math.round((s.fasts[0].end-s.fasts[0].start)/H),15,'the 16:8 fast is saved');
 assert(s.cur&&s.cur.planId==='ramadan'&&s.cur.start<T,'Ramadan takes over from dawn'); assert((await dots(p))>0,'its prayers show');
 assert.strictEqual(await p.textContent('#toast'),'Fast saved: 15 h.');
 await p.context().close(); ok('16:8 -> Ramadan asks, saves the 16:8 fast, Ramadan starts from dawn');

 /* 3. old mixed state, Ramadan picked again in Ramadan, 中文 */
 p=await open(seed({planId:'ramadan',cur:{start:T-5*H,goalH:16,planId:'16',reached:false}})); s=await S(p);
 assert.strictEqual(s.planId,'16','the running fast\'s own plan wins'); assert(s.cur&&s.cur.planId==='16'&&s.cur.goalH===16); assert.strictEqual(await dots(p),0); await p.context().close();
 p=await open(seed()); await pick(p,'ramadan'); s=await S(p); assert(s.planId==='ramadan'&&s.cur&&s.cur.planId==='ramadan'); assert.strictEqual(await p.$('#sheet.open'),null,'just closes'); await p.context().close();
 p=await open(seed({lang:'zh'})); await pick(p,'16'); assert(/^切换到.+？ 今天的斋戒到此为止。.+在你点开始时重新计时。 停止并切换$/.test(await sheet(p)),await sheet(p)); await p.context().close();
 ok('old mixed state repaired; Ramadan again just closes; 中文');

 /* 4. Days outside Ramadan mode: Ramadan days carry a crescent and say Ramadan; a day saved twice (two phones) is kept once */
 { const day=(d,h,m)=>Date.UTC(2027,1,d,h-8,m||0), rf=(id,d)=>({id,start:day(d,5,1),end:day(d,16,54),goalH:(day(d,16,54)-day(d,5,1))/H,plan:'ramadan'});
   const fasts=[{id:'a',start:day(17,20),end:day(18,12),goalH:16,plan:'16'},rf('r1',19),rf('r2',19),rf('r3',20)];
   p=await open(seed({planId:'16',ramNext:null,fasts})); s=await S(p);
   assert.strictEqual(s.fasts.filter(f=>f.plan==='ramadan').length,2,'19 Feb saved twice is kept once'); assert(s.del.includes('r2'),'the copy goes from the backup too');
   await p.click('#tabs [data-tab=days]'); await p.waitForTimeout(700);
   assert.strictEqual(await p.$$eval('.cal-g button .rm',a=>a.length),2,'a crescent on the two Ramadan days'); assert(/Ramadan/.test(await p.textContent('.legend')));
   assert.strictEqual(await p.$('.cal-g button[data-k="2027-02-18"] .rm'),null,'not on an everyday fast');
   await p.click('.cal-g button[data-k="2027-02-19"]'); await p.waitForTimeout(500);
   const rows=await p.$$eval('#dayd .dd-row',a=>a.map(x=>x.innerText.replace(/\s+/g,' ').trim()));
   assert.deepStrictEqual(rows,['Ramadan · Day 12 11 h 53 m · 05:01 → 16:54 · dawn to sunset Edit'],JSON.stringify(rows));
   if(process.env.SHOTS){ fs.mkdirSync(process.env.SHOTS,{recursive:true}); await p.evaluate(()=>document.getElementById('dayd').scrollIntoView({block:'center'})); await p.waitForTimeout(600); await p.screenshot({path:path.join(process.env.SHOTS,'days-ramadan.png')}); }
   await p.context().close(); ok('Days: crescent and "Ramadan · Day 12" outside Ramadan mode; a doubled day is kept once'); }

 assert.deepStrictEqual(errs,[],'no page errors'); await b.close(); srv.close(); console.log('ramadan switch ok');
})().catch(e=>{ console.error(e); process.exit(1); });
