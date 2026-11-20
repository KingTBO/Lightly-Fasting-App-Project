/* Prayer times (v0.120.0): Ramadan mode only.
   1. Today: the prayers inside the arc are dots with their names (filled once passed), and the small line names the next one ("Next: Asr 15:19").
      Fajr and Maghrib are left to the line above them (suhoor ends, iftar). Outside Ramadan mode none of this shows.
   2. Tapping the arc opens Prayer times: the next prayer and its countdown, the day's sun path, the six times with the next one marked.
   3. Calculation method and Asr Hanafi change the times, and Fajr on Today follows the method.
   4. Reminders per prayer, This month's timetable (what changes, then any day with arrows or a swipe), the Me row. Night, after Isha: tomorrow's Fajr. 中文.
   NODE_PATH=$(npm root -g) node tests/ramadan-prayers.test.js   (SHOTS=<dir> also saves pictures) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const C=require('../js/core.js');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000; const SHOTS=process.env.SHOTS; if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
const at=(d,h,m)=>Date.UTC(2027,1,d,h-8,m||0);   /* Shanghai clock, February 2027 */
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'ramadan',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true},ramadanPreview:false,startedAt:Date.UTC(2027,0,1),
  ramOff:[],ramMade:{},ramAdj:{shift:{},eid:{}},ramNext:'2027-02-20'},o||{});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,t,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:SHOTS?2:1,colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  if(o.notify) await ctx.grantPermissions(['notifications'],{origin:'http://localhost:'+port});
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(t)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300); return p; };
 const shot=async(p,n)=>{ if(SHOTS){ await p.waitForTimeout(900); await p.screenshot({path:path.join(SHOTS,n+'.png')}); } };
 const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const t=(p,id)=>p.evaluate(id=>(document.getElementById(id).textContent||'').trim(),id);
 const tab=async(p,x)=>{ await p.click('#tabs [data-tab='+x+']'); await p.waitForTimeout(700); };
 const labels=p=>p.$$eval('#prayG text',a=>a.map(x=>x.textContent));
 const sheetTxt=p=>p.evaluate(()=>{ const w=document.createTreeWalker(document.getElementById('sheet'),NodeFilter.SHOW_TEXT), a=[]; while(w.nextNode()){ const x=w.currentNode.textContent.trim(); if(x) a.push(x); } return a.join(' '); });

 /* 1. Today, day 13 at 14:00 */
 let p=await open(seed(),at(20,14)); let s=await S(p); assert(s.cur&&s.cur.planId==='ramadan','the day\'s fast runs');
 assert.deepStrictEqual(await labels(p),['Sunrise','Dhuhr','Asr'],'prayers inside dawn to sunset');
 assert.strictEqual(await p.$$eval('#prayG .pd.past',a=>a.length),2,'sunrise and Dhuhr have passed');
 assert.strictEqual(await t(p,'readAlt'),'Next: Asr 15:19'); assert.strictEqual(await p.isVisible('#prayBtn'),true); await shot(p,'pr-today');
 /* 2. the sheet */
 await p.click('#prayBtn'); await p.waitForSelector('#sheet.open .pr-card'); let tx=await sheetTxt(p);
 assert(/Next prayer Shanghai Asr 1:19:13/.test(tx),tx.slice(0,200)); assert(/Fajr 05:10 Sunrise 06:31 Dhuhr 12:10 Asr 15:19 Maghrib 17:44 Isha 19:00/.test(tx),tx);
 assert.strictEqual(await p.textContent('#sheet .pr-c.nx span'),'Asr'); assert.strictEqual(await p.$$eval('#sheet .pr-sky circle.past',a=>a.length),3,'Fajr, sunrise, Dhuhr filled'); assert(await p.$('#sheet .pr-sky circle.sun'),'the sun is now');
 assert(/Sat, Feb 20 · Muslim World League · Asr standard/.test(tx)); await shot(p,'pr-sheet');
 await p.clock.setFixedTime(new Date(at(20,14)+2000)); await p.waitForTimeout(1200); assert.strictEqual((await p.textContent('#prCd')).trim(),'1:19:11','the countdown runs');
 /* 3. method and Asr */
 await p.click('#sheet [data-act=prmethod]'); await p.waitForSelector('#sheet [data-act=prm]'); await shot(p,'pr-method');
 await p.click('#sheet [data-act=prm][data-v=isna]'); await p.waitForTimeout(300); await p.click('#sheet [data-act=prasr][data-v="2"]'); await p.waitForTimeout(300); s=await S(p); assert.deepStrictEqual([s.pray.m,s.pray.asr],['isna',2]);
 assert.strictEqual(await p.getAttribute('#sheet [data-act=prm][data-v=isna]','aria-checked'),'true');
 await p.click('#sheet [data-act=prback]'); await p.waitForSelector('#sheet .pr-card'); tx=await sheetTxt(p); assert(/ISNA · Asr Hanafi/.test(tx),tx); const fj=/Fajr (\d\d:\d\d)/.exec(tx)[1], asr=/Asr (\d\d:\d\d)/.exec(tx)[1];
 assert(fj>'05:10'&&asr>'15:50','ISNA Fajr '+fj+', Hanafi Asr '+asr); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(500);
 assert.strictEqual(await t(p,'endA'),'Fajr'+fj,'Fajr on Today follows the method');
 /* 4. reminders, timetable, Me */
 await p.context().close(); p=await open(seed({pray:{m:'mwl',asr:1,rem:[]}}),at(20,14),{notify:true});
 await p.click('#prayBtn'); await p.waitForSelector('#sheet .pr-card'); await p.click('#sheet [data-act=prrem]'); await p.waitForSelector('#sheet [data-act=prremk]');
 await p.click('#sheet [data-act=prremk][data-k=asr]'); await p.waitForTimeout(300); await p.click('#sheet [data-act=prremk][data-k=maghrib]'); await p.waitForTimeout(300);
 s=await S(p); assert.deepStrictEqual(s.pray.rem,['asr','maghrib']); assert.strictEqual(await p.getAttribute('#sheet [data-k=asr]','aria-checked'),'true'); await shot(p,'pr-rem');
 await p.click('#sheet [data-act=prback]'); await p.waitForSelector('#sheet .pr-card'); assert(/Reminders Asr, Maghrib/.test(await sheetTxt(p)));
 /* This month's timetable (C): only what changes, then any one day with arrows */
 await p.click('#sheet [data-act=prtable]'); await p.waitForSelector('#sheet .pt-day'); tx=await sheetTxt(p);
 assert(/This month .*Suhoor ends 26 min earlier by day 29 05:19 → 04:53 Iftar 22 min later by day 29 17:34 → 17:56 Any day Day 13 Sat, Feb 20 · Today Fajr 05:10 Sunrise 06:31 Dhuhr 12:10 Asr 15:19 Maghrib 17:44 Isha 19:00/.test(tx),tx.slice(0,500)); await shot(p,'pr-table');
 await p.click('#sheet .pt-arr[aria-label="Day after"]'); await p.waitForTimeout(300); tx=await sheetTxt(p); assert(/Day 14 Sun, Feb 21 · Tomorrow Fajr 05:09/.test(tx),tx.slice(0,500));
 await p.click('#sheet .pt-arr[aria-label="Day before"]'); await p.click('#sheet .pt-arr[aria-label="Day before"]'); await p.waitForTimeout(300); assert(/Day 12 Fri, Feb 19 · Yesterday/.test(await sheetTxt(p)));
 for(let i=0;i<11;i++){ await p.click('#sheet .pt-arr[aria-label="Day before"]'); } await p.waitForTimeout(300); assert(/Day 1 Mon, Feb 8 · 12 days ago/.test(await sheetTxt(p))); assert(await p.$eval('#sheet .pt-arr.l',b=>b.disabled),'no day before day 1');
 await p.click('#sheet [data-act=prback]'); await p.waitForSelector('#sheet .pr-card #prCd');
 await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400); await tab(p,'me'); assert(/Prayer times\s*Asr 15:19/.test(await t(p,'me')));
 await p.click('#me [data-act=prayers]'); await p.waitForSelector('#sheet .pr-card'); await p.context().close();
 ok('Today shows the prayers on the arc and the next one; the sheet, method, Asr, reminders, timetable and Me row work');

 /* 4b. swipe between days on Any day (v0.121.0): left is the next day, right the day before; vertical drags scroll; it gives at day 1 */
 { const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,hasTouch:true,isMobile:true,timezoneId:'Asia/Shanghai'}); p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
   await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'})); await p.addInitScript(s=>{ localStorage.setItem('lightly:v1',JSON.stringify(s)); },seed());
   await p.clock.setFixedTime(new Date(at(20,14))); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300); const cdp=await ctx.newCDPSession(p);
   const swipe=async(x0,y0,x1,y1)=>{ const send=(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]}); await send('touchStart',x0,y0); for(let i=1;i<=8;i++){ await send('touchMove',x0+(x1-x0)*i/8,y0+(y1-y0)*i/8); await p.waitForTimeout(12); } await send('touchEnd'); await p.waitForTimeout(800); };
   const dayTxt=()=>p.$$eval('#prAny .pt-day b',a=>a.map(x=>x.textContent).join('|'));
   await p.click('#prayBtn'); await p.waitForSelector('#sheet .pr-card'); await p.click('#sheet [data-act=prtable]'); await p.waitForSelector('#prAny'); await p.waitForTimeout(600);
   const r=await p.$eval('#prAny .pr-row',e=>{ const b=e.getBoundingClientRect(); return {x:b.left+b.width/2,y:b.top+b.height/2}; });
   await swipe(r.x+120,r.y,r.x-120,r.y); assert.strictEqual(await dayTxt(),'Day 14','swipe left: the next day');
   await swipe(r.x-120,r.y,r.x+120,r.y); await swipe(r.x-120,r.y,r.x+120,r.y); assert.strictEqual(await dayTxt(),'Day 12','swipe right: the day before');
   await swipe(r.x,r.y,r.x+10,r.y-120); assert.strictEqual(await dayTxt(),'Day 12','a vertical drag does not change the day');
   await swipe(r.x,r.y,r.x-30,r.y); assert.strictEqual(await dayTxt(),'Day 12','a short drag springs back');
   assert.strictEqual(await p.$eval('#prAny .pt-pg',e=>e.style.transform),'translateX(0px)');
   for(let i=0;i<11;i++){ await p.click('#prAny .pt-arr.l'); await p.waitForTimeout(600); } assert.strictEqual(await dayTxt(),'Day 1'); assert(await p.$eval('#prAny .pt-arr.l',b=>b.disabled));
   await swipe(r.x-120,r.y,r.x+120,r.y); assert.strictEqual(await dayTxt(),'Day 1','gives at day 1');
   await ctx.close(); ok('swipe between days: left next, right before, vertical ignored, short drag springs back, day 1 holds'); }

 /* 5. evening: Isha ahead; after Isha the next is tomorrow's Fajr and the line stays quiet */
 p=await open(seed(),at(20,18,10),{dark:true}); assert.strictEqual(await t(p,'readAlt'),'Next: Isha 19:00'); assert.deepStrictEqual(await labels(p),['Isha']);
 p.clock.setFixedTime(new Date(at(20,21))); await p.waitForTimeout(1200); assert.strictEqual(await t(p,'readAlt'),'','Fajr is already the line above');
 await p.click('#prayBtn'); await p.waitForSelector('#sheet .pr-card'); tx=await sheetTxt(p); assert(/Next prayer, tomorrow/.test(tx)&&/Sun, Feb 21/.test(tx),tx.slice(0,300));
 assert.strictEqual(await p.$$eval('#sheet .pr-sky circle.past',a=>a.length),0); await shot(p,'pr-night'); await p.context().close();
 ok('evening: Next Isha, then tomorrow\'s Fajr in the sheet');

 /* 6. Chinese, and nothing outside Ramadan mode */
 p=await open(seed({lang:'zh'}),at(20,14)); assert.strictEqual(await t(p,'readAlt'),'下一次：晡礼 15:19'); assert.deepStrictEqual(await labels(p),['日出','晌礼','晡礼']);
 await p.click('#prayBtn'); await p.waitForSelector('#sheet .pr-card'); assert(/礼拜时间/.test(await sheetTxt(p))); await shot(p,'pr-sheet-zh'); await p.context().close();
 p=await open(seed({planId:'16',ramNext:null}),at(20,14)); assert.strictEqual(await p.$$eval('#prayG *',a=>a.length),0); assert.strictEqual(await p.isVisible('#prayBtn'),false); await p.context().close();
 ok('中文 works; a 16:8 plan in Ramadan shows no prayers');

 assert.deepStrictEqual(errs,[],'no page errors'); await b.close(); srv.close(); console.log('ramadan prayers ok');
})().catch(e=>{ console.error(e); process.exit(1); });
