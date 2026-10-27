/* End-to-end flows in a real browser. usage: NODE_PATH=$(npm root -g) node tests/flow.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
const H=3600000,D=24*H;
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',geolocation:{latitude:31.23,longitude:121.47},permissions:['geolocation']});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const S=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')||'null'));
 const ok=n=>console.log('ok -',n);
 await p.goto(url);await p.waitForTimeout(500);
 // onboarding: first time + no safety flags -> Sunrise 13:11 suggested
 await p.click('[data-act=obnext]');await p.waitForTimeout(600);
 await p.click('[data-act=obopt][data-v=first]');await p.click('[data-act=obnext]');await p.waitForTimeout(600);
 await p.click('[data-act=obsafe][data-v=none]');await p.click('[data-act=obnext]');await p.waitForTimeout(600);
 assert(await p.$('.ob-step.on .plan.sel[data-id="13"]'),'13:11 suggested for a first timer');
 await p.click('.ob-step.on [data-act=obnext]');await p.waitForTimeout(600);
 await p.selectOption('#obCity','london');await p.click('[data-act=obdone]');await p.waitForTimeout(800);
 let s=await S();assert.strictEqual(s.planId,'13');assert.strictEqual(s.place.key,'london');assert(s.onboarded);ok('onboarding sets plan, city and profile');
 // start, reload, still running
 await p.click('#act');await p.waitForTimeout(400);s=await S();assert(s.cur&&s.cur.goalH===13);
 await p.reload();await p.waitForTimeout(700);assert((await S()).cur,'fast survives reload');
 assert.match(await p.textContent('#actLbl'),/Hold to End/);ok('fast persists across reload');
 // long fasts locked and shown with progress
 await p.click('#planBtn');await p.click('[data-act=more]');
 assert(await p.$('.plan[data-id="24"][disabled]'),'24h locked');assert(await p.$('.plan[data-id="36"][disabled]'));ok('24 h and 36 h locked for a newcomer');
 await p.click('#sheet [data-act=close]');
 // edit start time to 3 hours ago
 await p.click('#endA');const three=await p.evaluate(h=>{const d=new Date(Date.now()-h*3600000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16);},3);
 await p.fill('#stS',three);await p.click('[data-act=stsave]');await p.waitForTimeout(300);s=await S();assert(Math.abs((Date.now()-s.cur.start)/H-3)<.05);ok('start time editable');
 // hold to end: short press does nothing, long press saves and does not restart
 const box=await p.locator('#act').boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await p.mouse.down();await p.waitForTimeout(300);await p.mouse.up();assert((await S()).cur,'short press keeps fasting');
 await p.mouse.down();await p.waitForTimeout(1500);await p.mouse.up();await p.waitForTimeout(400);s=await S();
 assert(!s.cur&&s.fasts.length===1,'long press ends and saves');assert(await p.$('#sheet.open'),'saved sheet');ok('hold to end saves exactly one fast, no restart');
 await p.click('#sheet [data-act=close]');
 // eating window
 assert.match(await p.textContent('#readK'),/Eating window/);ok('eating window after a fast');
 // days: edit fast
 await p.click('#tabs [data-tab=days]');await p.click('.cal-g button.today');await p.click('[data-act=edit]');
 const e1=await p.evaluate(()=>document.getElementById('fsE').value);await p.fill('#fsG','3');await p.click('[data-act=fssave]');await p.waitForTimeout(300);
 s=await S();assert.strictEqual(s.fasts[0].goalH,3);ok('past fast editable');
 // delete it, add a missed one (overlaps are refused), delete again
 await p.click('#days [data-act=edit]');await p.click('[data-act=fsdel]');await p.waitForTimeout(200);assert.strictEqual((await S()).fasts.length,0);
 await p.click('#days [data-act=add]');await p.click('[data-act=fssave]');await p.waitForTimeout(300);assert.strictEqual((await S()).fasts.length,1,'a missed fast can be added');
 await p.click('#days [data-act=add]');await p.click('[data-act=fssave]');await p.waitForTimeout(300);assert.strictEqual((await S()).fasts.length,1,'overlap refused');await p.click('#sheet [data-act=close]');
 await p.click('#days [data-act=edit]');await p.click('[data-act=fsdel]');await p.waitForTimeout(200);assert.strictEqual((await S()).fasts.length,0);ok('fasts can be added, deleted; overlaps refused');
 // cheat day: use today, then it is spent
 await p.click('#tabs [data-tab=today]');await p.click('#streakBtn');await p.click('#sheet [data-act=usecheat]');await p.waitForTimeout(300);s=await S();
 assert.strictEqual(s.flex.used.length,1);ok('cheat day used');
 // language
 await p.click('#tabs [data-tab=me]');await p.click('[data-act=lang][data-v=zh]');await p.waitForTimeout(200);assert.match(await p.textContent('#me .h-title'),/我的/);assert.strictEqual(await p.evaluate(()=>document.documentElement.lang),'zh-Hans');ok('language switch');
 // ramadan preview adds the plan
 await p.click('[data-act=sw][data-k=ram]');await p.click('[data-act=plan]');assert(await p.$('.plan[data-id="ramadan"]'));ok('Ramadan row appears only with season/preview');
 // export + erase
 await p.click('#sheet [data-act=close]');await p.click('[data-act=erase]');await p.click('[data-act=eraseok]');await p.waitForTimeout(800);assert.strictEqual(await p.evaluate(()=>(JSON.parse(localStorage.getItem('lightly:v1'))||{}).onboarded||false),false);ok('erase resets');
 assert.deepStrictEqual(errs,[]);console.log('all flows ok');await b.close();srv.close();})().catch(e=>{console.error(e);process.exit(1);});
