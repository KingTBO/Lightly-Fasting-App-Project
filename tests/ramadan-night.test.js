/* Ramadan after sunset (v0.114.1, audit items M1 and M2).
   1. At night Today shows when suhoor ends, with no Start button and no streak card; only the last two hours before dawn count down.
   2. A Ramadan fast that is still running at sunset ends by itself at sunset: saved with sunset as its end, no counting up, no summary sheet.
      If the app is open at that moment it turns to "Iftar"; later in the evening it says the day's fast is kept.
   3. During the day the fast runs from dawn (v0.115.0: it starts by itself, see tests/ramadan-day.test.js). Picking Ramadan at night starts nothing.
   4. 中文 and a 320 px phone.
   5. The concept page's Ramadan phone says the same at night.
   NODE_PATH=$(npm root -g) node tests/ramadan-night.test.js   (SHOTS=<dir> also saves pictures) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const C=require('../js/core.js');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'application/octet-stream'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000; const SHOTS=process.env.SHOTS; if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
/* day 13 of Ramadan 1448 in Shanghai: Sat 20 Feb 2027 */
const DAY=Date.UTC(2027,1,20,4), pi=C.placeInfo({key:'shanghai'},DAY), sun=C.sunTimes(pi,DAY), F=C.dawnHour(pi,DAY), Fn=C.dawnHour(pi,DAY+D);   /* today's dawn and tomorrow's */
const at=h=>Date.UTC(2027,1,19,16)+h*H;   /* hour h of 20 Feb, Shanghai time */
const hhmm=h=>{ const m=Math.floor(h*60);   /* as the app's clockMs, from the timestamp */ return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); };
const regular=[3,4,5,6].map(i=>({id:'f'+i,start:Date.UTC(2027,1,1+i,12),end:Date.UTC(2027,1,2+i,4),goalH:16,plan:'16'}));
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'ramadan',customH:16,place:{key:'shanghai'},cur:null,
  fasts:regular.slice(),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true},ramadanPreview:false,startedAt:Date.UTC(2027,0,1)},o||{});
const ramFast=()=>({cur:{start:at(F),goalH:sun.set-F,planId:'ramadan',reached:false}});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,t,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:SHOTS?2:1,colorScheme:'light',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(t)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300); return p; };
 const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}); };
 const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const read=p=>p.evaluate(()=>{ const lit=document.getElementById('lit').getAttribute('d')||'', t=id=>(document.getElementById(id).textContent||'').trim(), act=document.getElementById('act'), big=document.getElementById('readBig');
   return {k:t('readK'),big:t('readBig'),alt:t('readAlt'),tip:document.getElementById('readTip').classList.contains('quiet')?'':t('readTip'),act:getComputedStyle(act).visibility!=='hidden',actTab:act.tabIndex,act:getComputedStyle(act).visibility!=='hidden',actLbl:t('actLbl'),
     streak:!document.getElementById('streakBtn').hidden,sheet:!!document.querySelector('#sheet.open'),endA:t('endA'),endB:t('endB'),bigFits:big.scrollWidth<=big.clientWidth+1,chip:t('planChip'),litArcs:(lit.match(/A/g)||[]).length,litWedge:/L/.test(lit)}; });

 /* 1. the night */
 let p=await open(seed(),at(21)), r=await read(p);
 assert.strictEqual(r.k,'Suhoor ends at'); assert.strictEqual(r.big,hhmm(Fn),'the big line is the time suhoor ends (tomorrow\'s dawn)'); assert(!r.act&&r.actTab===-1,'no Start button at night'); assert(!r.streak,'no streak card in Ramadan');
 assert(/Sunset/.test(r.endA)&&/Fajr/.test(r.endB),'the line runs from sunset to Fajr: '+r.endA+' | '+r.endB); assert(r.endB.indexOf(r.big)>=0,'the big time and the end of the line agree: '+r.big+' | '+r.endB); assert(!(await p.locator('#today').getByText('Start fast').filter({visible:true}).count()),'nothing visible on Today offers to start a fast'); await shot(p,'ram-night');
 await p.clock.setFixedTime(new Date(at(26))); await p.waitForTimeout(1300); r=await read(p); assert.strictEqual(r.k,'Suhoor ends at','still a time, not a countdown, after midnight'); await p.context().close();
 p=await open(seed(),at(F-1.5)); r=await read(p);
 assert.strictEqual(r.k,'Fast begins in'); assert(/^1:(29|30):\d\d$/.test(r.big),'the last two hours count down: '+r.big); assert.strictEqual(r.alt,'Fajr '+hhmm(F)); assert(!r.act,'still no Start button'); await shot(p,'ram-predawn'); await p.context().close();
 p=await open(seed(),at(21)); r=await read(p); assert.strictEqual(r.chip,'Night 14','after sunset on day 13 the chip names the night that has begun'); assert(r.litArcs===2&&!r.litWedge,'the moon is tonight\'s real phase, not a wedge'); await p.context().close();
 p=await open(seed(),at(3)); r=await read(p); assert.strictEqual(r.chip,'Night 13','before dawn the night still belongs to day 13'); await p.context().close();
 p=await open(seed(ramFast()),at(12)); r=await read(p); assert.strictEqual(r.chip,'Day 13'); assert(r.litWedge,'by day the disc fills as before'); await p.context().close();
 p=await open(seed({lang:'zh'}),at(21)); r=await read(p); assert.strictEqual(r.chip,'第 14 夜'); await p.context().close();
 ok('the night shows when suhoor ends, counts down only in its last two hours, and offers no Start and no streak');

 /* 2. sunset ends the fast by itself */
 p=await open(seed(ramFast()),at(21)); let s=await S(p), f=s.fasts.filter(x=>x.plan==='ramadan')[0];
 assert.strictEqual(s.cur,null,'the fast is no longer running'); assert(f,'it was saved'); assert(Math.abs(f.end-at(sun.set))<1000,'it ends at sunset, not when the app was opened'); assert(C.isDone(f),'and counts as kept');
 r=await read(p); assert(!r.sheet,'no summary sheet pops up hours later'); assert.strictEqual(r.k,'Suhoor ends at'); assert.strictEqual(r.tip,'Today’s fast is kept.'); assert(!r.streak); await shot(p,'ram-kept'); await p.context().close();
 p=await open(seed(ramFast()),at(sun.set)-20000); r=await read(p); assert.strictEqual(r.k,'Iftar in'); assert(/^0:00:[12]\d$/.test(r.big),r.big);
 await p.clock.setFixedTime(new Date(at(sun.set)+3000)); await p.waitForTimeout(1500); r=await read(p);
 assert.strictEqual(r.k,'It’s time'); assert.strictEqual(r.big,'Iftar','the moment of sunset says Iftar, never a count up'); assert.strictEqual(r.tip,'Today’s fast is kept.'); assert(!r.act&&!r.sheet&&!r.streak);
 s=await S(p); assert.strictEqual(s.cur,null); assert(Math.abs(s.fasts.filter(x=>x.plan==='ramadan')[0].end-at(sun.set))<1000); await shot(p,'ram-iftar');
 await p.clock.setFixedTime(new Date(at(sun.set+.6))); await p.waitForTimeout(1300); r=await read(p); assert.strictEqual(r.k,'Suhoor ends at','after half an hour the night begins'); await p.context().close();
 ok('a fast running at sunset ends at sunset: saved, kept, Iftar at the moment, then the night; nothing counts up');

 /* 3. the day counts down to iftar; picking Ramadan at night starts nothing */
 p=await open(seed(ramFast()),at(12)); r=await read(p); assert.strictEqual(r.k,'Iftar in'); assert(!r.streak); await p.context().close();
 p=await open(seed({planId:'16'}),at(21)); r=await read(p); assert(r.streak,'with a regular plan the streak card is there'); assert(r.act);
 await p.click('#planBtn'); await p.waitForSelector('#sheet.open [data-id=ramadan]'); await p.click('#sheet [data-id=ramadan]'); await p.waitForTimeout(900);
 s=await S(p); assert.strictEqual(s.cur,null,'no fast starts at night'); assert.strictEqual(s.planId,'ramadan'); r=await read(p); assert.strictEqual(r.k,'Suhoor ends at'); assert(!/already ended/.test(await p.textContent('body'))); await p.context().close();
 ok('the day counts down to iftar; choosing Ramadan at night starts nothing and shows the night');

 /* 4. 中文 and 320 px */
 p=await open(seed({lang:'zh'}),at(21)); r=await read(p); assert.strictEqual(r.k,'封斋结束于'); assert(/日落/.test(r.endA)&&/晨礼/.test(r.endB)); await p.context().close();
 p=await open(seed({lang:'zh'}),at(F-1)); r=await read(p); assert.strictEqual(r.k,'离开始斋戒还有'); assert.strictEqual(r.alt,'晨礼 '+hhmm(F)); await p.context().close();
 p=await open(seed({lang:'zh',cur:ramFast().cur}),at(sun.set)+60000,{w:320,h:568}); r=await read(p); assert.strictEqual(r.big,'开斋'); assert.strictEqual(r.tip,'今天的斋戒已完成。'); assert(r.bigFits,'fits on a 320 px phone'); await shot(p,'ram-iftar-zh-320'); await p.context().close();
 p=await open(seed(),at(21),{w:320,h:568}); r=await read(p); assert(r.bigFits); await p.context().close();
 ok('中文 and a 320 px phone');

 /* 5. the concept page */
 p=await open(seed(),at(21)); await p.goto('http://localhost:'+port+'/concept/'); await p.waitForTimeout(1200);
 await p.click('#rMoments [data-r=night]'); await p.waitForTimeout(1500);
 assert.strictEqual((await p.textContent('#rK')).trim(),'Suhoor ends at'); assert(/^\d\d:\d\d$/.test((await p.textContent('#rBig')).trim()),'the concept phone shows a time at night'); assert.strictEqual((await p.textContent('#rSub')).trim(),'Ramadan · Night 14','the concept names the night'); assert(!/L/.test(await p.getAttribute('#rLit','d')),'the concept moon at night is a phase, not a wedge');
 await p.click('#rMoments [data-r=suhoor]'); await p.waitForTimeout(1500); assert.strictEqual((await p.textContent('#rK')).trim(),'Fast begins in','within two hours of dawn it counts down');
 await p.click('#rMoments [data-r=iftar]'); await p.waitForTimeout(1600); assert.strictEqual((await p.textContent('#rK')).trim(),'It’s time'); await p.context().close();
 ok('the concept page\'s Ramadan phone says the same at night');

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | ')); await b.close(); srv.close(); console.log('ramadan night ok');
})().catch(e=>{ console.error(e); process.exit(1); });
