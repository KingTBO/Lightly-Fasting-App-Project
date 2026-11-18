/* Moons (v0.117.0): in Ramadan mode the Days tab is a month of moons.
   1. Days that passed in Ramadan mode with the app closed mark themselves as kept at sunset, once each; days before Ramadan mode stay blank.
   2. The tab is "Moons": a title with the Hijri year and dates, three tiles (Kept, Not fasting, Made up), a weekday grid of 29 days with a ring per day,
      ✦ on the odd nights of the last ten, and a "Days to make up" row that only the person sees.
   3. Tapping a past day offers Kept, Not fasting and Made up (which remembers the date); today before sunset and later days only explain.
   4. The days to make up list marks a day made up; the same row shows in Me while days are owed.
   5. Out of Ramadan mode the tab is Days again. 中文, dark and a 320 px phone.
   NODE_PATH=$(npm root -g) node tests/ramadan-moons.test.js   (SHOTS=<dir> also saves pictures) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const C=require('../js/core.js');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000; const SHOTS=process.env.SHOTS; if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
/* day 13 of Ramadan 1448 in Shanghai: Sat 20 Feb 2027, at noon */
const NOON=Date.UTC(2027,1,20,4);
const kept16={id:'r16',start:Date.UTC(2027,1,15,21,40),end:Date.UTC(2027,1,16,10,20),goalH:12.67,plan:'ramadan'};
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'ramadan',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[kept16],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true},ramadanPreview:false,startedAt:Date.UTC(2027,0,1),
  ramOff:['2027-02-17'],ramMade:{},ramNext:'2027-02-15'},o||{});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,t,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:SHOTS?2:1,colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(t)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300); return p; };
 const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}); };
 const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const keptOn=(s,k)=>s.fasts.filter(f=>f.plan==='ramadan'&&C.dayKey(f.end)===k);
 const tiles=p=>p.$$eval('#days .mo-leg b',bs=>bs.map(x=>+x.textContent.trim()));
 const dayBtn=n=>'#days .mc[data-k="'+C.addDays('2027-02-08',n-1)+'"]';
 const tab=async(p,t)=>{ await p.click('#tabs [data-tab='+t+']'); await p.waitForTimeout(700); };

 /* 1. days that passed mark themselves */
 let p=await open(seed(),NOON); let s=await S(p);
 ['2027-02-15','2027-02-18','2027-02-19'].forEach(k=>assert.strictEqual(keptOn(s,k).length,1,k+' marks itself as kept'));
 assert.strictEqual(keptOn(s,'2027-02-16').length,1,'a day already kept is not doubled'); assert.strictEqual(keptOn(s,'2027-02-17').length,0,'a not fasting day stays so');
 assert.strictEqual(keptOn(s,'2027-02-14').length,0,'days before Ramadan mode stay blank'); assert.strictEqual(s.ramNext,'2027-02-20'); assert(s.cur&&s.cur.planId==='ramadan','today is running');
 const f15=keptOn(s,'2027-02-15')[0], t15=C.placeInfo({key:'shanghai'},Date.UTC(2027,1,15,4)); assert(Math.abs((f15.end-Date.UTC(2027,1,14,16))/H-C.sunTimes(t15,Date.UTC(2027,1,15,4)).set)<.02,'it ends at that day\'s sunset');
 ok('days that passed with the app closed mark themselves as kept, from the day Ramadan mode began');

 /* 2. the Moons tab */
 assert.strictEqual((await p.textContent('#tabD')).trim(),'Moons'); await tab(p,'days');
 assert.strictEqual((await p.textContent('#days h1')).trim(),'Moons'); assert(/^Ramadan 1448 · Feb 8 to Mar 8$/.test((await p.textContent('#days .mo-s')).trim()),await p.textContent('#days .mo-s'));
 assert.deepStrictEqual(await tiles(p),[4,1,0],'Kept 4, Not fasting 1, Made up 0');
 assert.strictEqual(await p.locator('#days .mc[data-k]').count(),29,'29 days'); assert.strictEqual(await p.locator('#days .mc .ring.open').count(),1,'and a "?" day 30 until Eid is answered (v0.118.0)'); assert.strictEqual(await p.locator('#days .mc .star').count(),5,'✦ on nights 21, 23, 25, 27 and 29');
 assert.strictEqual(await p.getAttribute('#days .mc.today','data-k'),'2027-02-20'); assert.strictEqual(await p.locator('#days .mc .ring.kept').count(),4); assert.strictEqual(await p.locator('#days .mc .ring.rest').count(),1);
 assert(/Day 10, Wednesday, February 17, Not fasting/.test(await p.getAttribute(dayBtn(10),'aria-label')));
 assert.strictEqual((await p.textContent('#days [data-act=rammakeup] .v')).trim(),'1'); assert(/Only you can see this/.test(await p.textContent('#days')));
 const lead=await p.$$eval('#days .mo-g > span:not(.wd)',x=>x.length); assert.strictEqual(lead,0,'8 Feb 2027 is a Monday: no blank cells first');
 await shot(p,'moons');
 ok('the Days tab is Moons: tiles, 29 rings, odd nights and days to make up');

 /* 3. a day sheet */
 await p.click(dayBtn(10)); await p.waitForSelector('#sheet.open [data-act=ramset]'); await p.waitForTimeout(600); let sh=await p.textContent('#sheet');
 assert(/Day 10 · Wednesday, February 17/.test(sh)&&/Fajr \d\d:\d\d · Iftar \d\d:\d\d/.test(sh),sh); assert.strictEqual(await p.getAttribute('#sheet [data-v=rest]','aria-checked'),'true');
 await shot(p,'moons-day');
 await p.click('#sheet [data-v=made]'); await p.waitForTimeout(400); s=await S(p); assert.strictEqual(s.ramMade['2027-02-17'],'2027-02-20','made up remembers the date');
 assert(/On Feb 20/.test(await p.textContent('#sheet'))); assert.deepStrictEqual(await tiles(p),[4,0,1]); assert.strictEqual(await p.locator('#days .mc .ring.made').count(),1);
 await p.click('#sheet [data-v=kept]'); await p.waitForTimeout(400); s=await S(p); assert.strictEqual(keptOn(s,'2027-02-17').length,1,'kept saves the day as a fast'); assert(!s.ramOff.includes('2027-02-17')&&!s.ramMade['2027-02-17']);
 assert.deepStrictEqual(await tiles(p),[5,0,0]); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400);
 await p.click(dayBtn(11)); await p.waitForSelector('#sheet.open [data-act=ramset]'); const id18=keptOn(await S(p),'2027-02-18')[0].id; await p.click('#sheet [data-v=rest]'); await p.waitForTimeout(400);
 s=await S(p); assert.strictEqual(keptOn(s,'2027-02-18').length,0,'not fasting removes the day\'s fast'); assert(s.del.includes(id18)); assert(s.ramOff.includes('2027-02-18')); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400);
 await p.click(dayBtn(13)); await p.waitForSelector('#sheet.open'); sh=await p.textContent('#sheet'); assert(/Today marks itself at sunset/.test(sh)&&!(await p.locator('#sheet [data-act=ramset]').count()),'today before sunset only explains'); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400);
 await p.click(dayBtn(20)); await p.waitForSelector('#sheet.open'); assert(/This day hasn’t come yet/.test(await p.textContent('#sheet'))); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400);
 await p.reload(); await p.waitForTimeout(1300); s=await S(p); assert.strictEqual(keptOn(s,'2027-02-18').length,0,'a day changed by hand is not marked again');
 ok('a day offers Kept, Not fasting and Made up; today and later days only explain; changes stay');

 /* 4. days to make up, in Moons and in Me */
 await tab(p,'me'); assert(/Days to make up\s*1/.test(await p.textContent('#me [data-act=rammakeup]')),'Me shows the days owed');
 await p.click('#me [data-act=rammakeup]'); await p.waitForSelector('#sheet.open [data-act=rammade]'); await p.waitForTimeout(600); assert(/Day 11/.test(await p.textContent('#sheet'))); await shot(p,'moons-makeup');
 await p.click('#sheet [data-act=rammade]'); await p.waitForTimeout(500); s=await S(p); assert.strictEqual(s.ramMade['2027-02-18'],'2027-02-20'); assert(/Nothing to make up/.test(await p.textContent('#sheet')));
 await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400); assert.strictEqual((await p.textContent('#me [data-act=rammakeup] .v')).trim(),'0','nothing owed now'); await p.context().close();
 p=await open(seed({planId:'16',ramNext:null}),Date.UTC(2027,2,15,4)); await tab(p,'me'); assert(/Days to make up\s*1/.test(await p.textContent('#me [data-act=rammakeup]')),'after Eid the row stays in Me while a day is owed'); await p.context().close();
 p=await open(seed({planId:'16',ramNext:null,ramMade:{'2027-02-17':'2027-03-14'}}),Date.UTC(2027,2,15,4)); await tab(p,'me'); assert.strictEqual(await p.locator('#me [data-act=rammakeup]').count(),0,'and goes when nothing is owed'); await p.context().close();
 ok('days to make up: a list to mark made up, also in Me while days are owed');

 /* 5. out of Ramadan mode; 中文, dark, 320 px */
 p=await open(seed({planId:'16'}),NOON); assert.strictEqual((await p.textContent('#tabD')).trim(),'Days'); s=await S(p); assert.strictEqual(keptOn(s,'2027-02-15').length,0,'nothing marks itself outside Ramadan mode'); await p.context().close();
 p=await open(seed({lang:'zh'}),NOON,{w:320,h:568,dark:true}); assert.strictEqual((await p.textContent('#tabD')).trim(),'月相'); await tab(p,'days');
 assert(/^斋月 1448 · /.test((await p.textContent('#days .mo-s')).trim())); assert(/每天日落时自动标记/.test(await p.textContent('#days')));
 const over=await p.evaluate(()=>{ const w=document.documentElement.clientWidth; return [...document.querySelectorAll('#days *')].filter(e=>{ const r=e.getBoundingClientRect(); return r.width&&(r.right>w+.5||r.left<-.5); }).map(e=>e.className).slice(0,5); });
 assert.deepStrictEqual(over,[],'nothing spills at 320 px'); await shot(p,'moons-zh-320-dark');
 await p.click(dayBtn(10)); await p.waitForSelector('#sheet.open [data-act=ramset]'); assert(/已完成/.test(await p.textContent('#sheet'))&&/已补/.test(await p.textContent('#sheet'))); await p.context().close();
 ok('out of Ramadan mode the tab is Days; 中文, dark and 320 px');

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | ')); await b.close(); srv.close(); console.log('ramadan moons ok');
})().catch(e=>{ console.error(e); process.exit(1); });
