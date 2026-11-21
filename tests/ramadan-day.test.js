/* The Ramadan day (v0.115.0).
   1. Ramadan dates follow the Islamic calendar: 29 days in 1448, local dates; outside the season nothing shows.
   2. Dawn starts the day's fast by itself, from dawn, even when the app opens at noon: no Start button. Today counts down "Iftar in".
   3. The button during the day is "I'm not fasting today": a sheet with no reason asked; the day is stored as a date only, nothing is saved as a fast,
      Today shows the iftar time, and "I'm fasting after all" brings the fast back from dawn. Never a press-and-hold.
   4. A day already kept is not started again. 中文 and a 320 px phone.
   5. The concept page's Ramadan phone says the same.
   NODE_PATH=$(npm root -g) node tests/ramadan-day.test.js   (SHOTS=<dir> also saves pictures) */
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
 const read=p=>p.evaluate(()=>{ const t=id=>(document.getElementById(id).textContent||'').trim(), act=document.getElementById('act'), big=document.getElementById('readBig');
   return {k:t('readK'),big:t('readBig'),tip:document.getElementById('readTip').classList.contains('quiet')?'':t('readTip'),act:getComputedStyle(act).visibility!=='hidden',glass:act.classList.contains('end'),actLbl:t('actLbl'),
     streak:!document.getElementById('streakBtn').hidden,sheet:!!document.querySelector('#sheet.open'),chip:t('planChip'),bigFits:big.scrollWidth<=big.clientWidth+1}; });

 /* 1. dates */
 assert.strictEqual(C.ramadanSeason('2027-03-08').n,29); assert.strictEqual(C.ramadanSeason('2027-03-09'),null);
 let p=await open(seed(),Date.UTC(2027,2,9,4)); let s=await S(p); assert.strictEqual(s.planId,'16','on Eid day (9 March 2027) Ramadan has ended and the usual plan is back'); await p.context().close();
 ok('Ramadan 1448 is 29 days by the Islamic calendar; on Eid the usual plan is back');

 /* 2. dawn starts the fast */
 p=await open(seed(),at(12)); s=await S(p);
 assert(s.cur&&s.cur.planId==='ramadan','opening the app at noon finds the day\'s fast running'); assert(Math.abs(s.cur.start-at(F))<60000,'it began at dawn'); assert(Math.abs(s.cur.start+s.cur.goalH*H-at(sun.set))<60000,'and ends at sunset');
 let r=await read(p); assert(/^Iftar in( · Next: Dhuhr 12:10)?$/.test(r.k),'iftar, and the next prayer once it fades in (v0.120.0): '+r.k); assert(/^5:\d\d:\d\d$/.test(r.big),'counts down to iftar: '+r.big); assert(r.glass,'the button is quiet glass'); assert.strictEqual(r.actLbl,'I’m not fasting today'); assert(!r.streak);
 assert(!(await p.locator('#today').getByText(/Start fast|Hold to end/).filter({visible:true}).count()),'no Start and no hold to end in Ramadan'); await shot(p,'ram-day');
 ok('dawn starts the day\'s fast, even when the app opens at noon; Today counts down to iftar');

 /* 3. not fasting today */
 const box=await p.locator('#act').boundingBox(); await p.mouse.move(box.x+box.width/2,box.y+box.height/2); await p.mouse.down(); await p.waitForTimeout(1600); await p.mouse.up(); await p.waitForTimeout(600);
 s=await S(p); assert(s.cur,'a long press does not end a Ramadan fast'); assert.strictEqual(s.fasts.filter(f=>f.plan==='ramadan').length,0);
 if(!(await read(p)).sheet) await p.click('#act'); await p.waitForSelector('#sheet.open [data-act=ramoffgo]'); const sh=await p.textContent('#sheet');
 assert(/No reason needed/.test(sh)&&!/travel|unwell|period|why/i.test(sh),'no reason is asked: '+sh); await shot(p,'ram-off-sheet');
 await p.click('#sheet [data-act=close]'); await p.waitForTimeout(500); assert((await S(p)).cur,'Keep fasting keeps it');
 await p.click('#act'); await p.waitForSelector('#sheet.open [data-act=ramoffgo]'); await p.click('#sheet [data-act=ramoffgo]'); await p.waitForTimeout(800);
 s=await S(p); assert.strictEqual(s.cur,null); assert.deepStrictEqual(s.ramOff,['2027-02-20'],'only the date is stored'); assert.strictEqual(s.fasts.filter(f=>f.plan==='ramadan').length,0,'nothing is saved as a fast');
 r=await read(p); assert.strictEqual(r.k,'Iftar at'); assert.strictEqual(r.big,new Date(at(sun.set)).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'}),'the iftar time stays on screen');
 assert.strictEqual(r.tip,'Not fasting today. It joins your days to make up.'); assert.strictEqual(r.actLbl,'I’m fasting after all'); assert(r.glass); await shot(p,'ram-off');
 await p.reload(); await p.waitForTimeout(1300); assert.strictEqual((await S(p)).cur,null,'it does not start again after a reload');
 await p.click('#act'); await p.waitForTimeout(800); s=await S(p); assert(s.cur&&Math.abs(s.cur.start-at(F))<60000,'fasting after all brings the fast back from dawn'); assert.deepStrictEqual(s.ramOff,[]); await p.context().close();
 ok('"I\'m not fasting today": no reason, only the date, the iftar time stays, and it can be taken back; a long press never ends the fast');

 /* 4. a kept day is not started again; 中文 and 320 px */
 const kept={id:'k1',start:at(F),end:at(sun.set),goalH:sun.set-F,plan:'ramadan'};
 p=await open(seed({fasts:regular.concat([kept])}),at(sun.set+.2)); s=await S(p); assert.strictEqual(s.cur,null,'after sunset the kept day does not restart'); assert.strictEqual(s.fasts.length,regular.length+1); await p.context().close();
 p=await open(seed({lang:'zh'}),at(12),{w:320,h:568}); r=await read(p); assert.strictEqual(r.k,'离开斋还有'); assert.strictEqual(r.actLbl,'今天不斋戒'); assert(r.bigFits);
 await p.click('#act'); await p.waitForSelector('#sheet.open [data-act=ramoffgo]'); assert(/不需要理由/.test(await p.textContent('#sheet'))); await p.click('#sheet [data-act=ramoffgo]'); await p.waitForTimeout(700);
 r=await read(p); assert.strictEqual(r.k,'开斋时间'); assert.strictEqual(r.actLbl,'其实我在斋戒'); assert(r.bigFits); await shot(p,'ram-off-zh-320'); await p.context().close();
 ok('a kept day is not started again; 中文 and a 320 px phone');

 /* 5. the concept page */
 p=await open(seed(),at(12)); await p.goto('http://localhost:'+port+'/concept/'); await p.waitForTimeout(1200);
 await p.click('#rMoments [data-r=mid]'); await p.waitForTimeout(1500);
 assert(/^Iftar in( · Next: \w+ [0-9:]+)?$/.test((await p.textContent('#rK')).trim())); assert.strictEqual((await p.textContent('#rAct')).trim(),'I’m not fasting today');
 await p.click('#rAct'); await p.waitForTimeout(700); const cs=await p.textContent('#rSheet'); assert(/No reason needed/.test(cs)&&!/Travelling|Unwell|Period/.test(cs),'the concept sheet asks no reason');
 await p.click('#rWhy [data-why=off]'); await p.waitForTimeout(600); assert.strictEqual((await p.textContent('#rK')).trim(),'Iftar at'); assert.strictEqual((await p.textContent('#rAct')).trim(),'I’m fasting after all'); await p.context().close();
 ok('the concept page\'s Ramadan phone: Iftar in, I\'m not fasting today with no reason, then the iftar time');

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | ')); await b.close(); srv.close(); console.log('ramadan day ok');
})().catch(e=>{ console.error(e); process.exit(1); });
