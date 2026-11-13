/* The plan step of setup: the pre-selected plan follows the answer, custom hours, start time and reminder live on this step, and first-timers get a warning on 18:6 and 20:4. usage: NODE_PATH=$(npm root -g) node tests/setup-plan.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 async function fresh(reduced){const c=await b.newContext({viewport:{width:390,height:844},reducedMotion:reduced?'reduce':'no-preference',timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(()=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:false,prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}});await q.goto(url);await q.waitForTimeout(700);return q;}
 const next=async q=>{await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(900);};
 const sel=q=>q.$eval('.ob-step.on .plan.sel',e=>e.dataset.id);
 const pick=async(q,id,v)=>{if(!(await q.$('#'+id+'.open'))){await q.click('#'+id+' .pk-row');await q.waitForTimeout(500);}await q.evaluate(([id,v])=>{const pk=document.getElementById(id),c=pk.querySelector('[data-c=s]'),i=JSON.parse(pk.dataset.opts).indexOf(v);c.scrollTo({top:i*36});},[id,v]);await q.waitForTimeout(500);};
 const big=async q=>{await q.waitForSelector('#obBigN:not([data-rolling])',{timeout:5000});return (await q.textContent('#obBigN')).trim();};
 const S=q=>q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));

 // 1. the pre-selected plan follows the answer until a plan is picked
 {const q=await fresh();await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);assert.strictEqual(await sel(q),'13','first-timer: 13:11');
  await q.click('.ob-step.on [data-act=obback]');await q.waitForTimeout(900);await q.click('[data-act=obopt][data-v=before]');await next(q);assert.strictEqual(await sel(q),'16','changed to "fasted before": 16:8 is pre-selected');
  await q.click('.ob-step.on .plan[data-id="13"]');await q.waitForTimeout(300);await q.click('.ob-step.on [data-act=obback]');await q.waitForTimeout(900);await q.click('[data-act=obopt][data-v=first]');await next(q);await q.click('.ob-step.on [data-act=obback]');await q.waitForTimeout(900);await q.click('[data-act=obopt][data-v=before]');await next(q);assert.strictEqual(await sel(q),'13','a plan the person picked is kept');
  ok('the pre-selected plan follows the answer, a picked plan is kept');await q.context().close();}

 // 2. fasted before: custom hours, start time and the reminder on one screen, saved at the end
 {const q=await fresh();await next(q);await q.click('[data-act=obopt][data-v=before]');await next(q);
  await q.click('.ob-step.on .plan[data-id=custom]');await q.waitForTimeout(900);assert(await q.$('#obCustom'),'the hours wheel appears');await pick(q,'obCustom',19);
  assert.strictEqual(await big(q),'19','the big number follows the wheel');assert.match(await q.textContent('.ob-step.on .ob-win'),/Your own rhythm\. Eat 15:00 to 20:00\./);
  await pick(q,'obCustom',21);assert.strictEqual(await big(q),'21');
  await q.click('.ob-step.on .plan[data-id="18"]');await q.waitForTimeout(500);assert(!(await q.$('#obCustom')),'the wheel goes when another plan is picked');assert.strictEqual(await big(q),'18');
  await q.click('.ob-step.on .plan[data-id=custom]');await q.waitForTimeout(900);assert.strictEqual(await big(q),'21','the custom hours are remembered');
  await next(q);assert(await q.waitForSelector('.ob-step.on #obImpFile',{state:'attached',timeout:8000}).catch(()=>null));await next(q);await q.click('.ob-step.on [data-act=obcityshow]');await q.waitForTimeout(800);await next(q);await q.click('[data-act=obsafe][data-v=none]');await next(q);await q.click('.ob-step.on [data-act=obbodyskip]');await q.waitForTimeout(800);
  assert.match(await q.textContent('.ob-step.on .ob-firsts'),/^21:3 · /,'the last screen names the custom plan');await q.click('[data-act=obdone]');await q.waitForTimeout(800);
  const s=await S(q);assert.strictEqual(s.planId,'custom');assert.strictEqual(s.customH,21,'the custom hours are saved');
  ok('fasted before: custom hours and start time on the plan step are saved');await q.context().close();}

 // 3. first-timer: start time and reminder on the plan step, shown in "You're set"
 {const q=await fresh();await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);
  {const gaps=await q.evaluate(()=>{const k=[...document.querySelectorAll('.ob-step.on > .group')].map(e=>e.getBoundingClientRect());return k.slice(1).map((r,i)=>Math.round(r.top-k[i].bottom));});assert(gaps.length>=2&&gaps.every(g=>g>=12),'cards on the plan step keep a gap between them: '+gaps);}assert(await q.$('.ob-step.on [data-act=sw][data-k=notify]'),'the reminder switch is on the plan step');
  await q.click('#obStart .pk-row');await q.waitForTimeout(500);
  await q.evaluate(()=>{const pk=document.getElementById('obStart'),h=pk.querySelector('[data-c=h]');h.scrollTo({top:(7+ +h.dataset.loop*3)*36});});await q.waitForTimeout(700);
  assert.match(await q.textContent('.ob-step.on .ob-win'),/Eat 20:00 to 07:00/,'the line follows the start time');
  await next(q);await q.click('.ob-step.on [data-act=obcityshow]');await q.waitForTimeout(800);await next(q);await q.click('[data-act=obsafe][data-v=none]');await next(q);await q.click('.ob-step.on [data-act=obbodyskip]');await q.waitForTimeout(800);
  assert.match(await q.textContent('.ob-step.on'),/07:00/,'the last screen names the chosen start time');await q.click('[data-act=obdone]');await q.waitForTimeout(800);
  assert.strictEqual((await S(q)).prefs.usualStart,'07:00','a first-timer’s start time is saved too');
  ok('first-timer: start time and reminder on the plan step');await q.context().close();}

 // 4. Reduce Motion: picking 20:4 as a first-timer still shows the note (no bounce)
 {const q=await fresh(true);await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);await q.click('.ob-step.on .plan[data-id="20"]');await q.waitForTimeout(400);assert.match(await q.textContent('.ob-step.on .obnote'),/New to fasting/);assert.strictEqual(await q.$$eval('.ob-step.on .plan.bump',e=>e.length),0,'no bounce under Reduce Motion');
  ok('Reduce Motion: the note shows, nothing bounces');await q.context().close();}

 // 5. the bounce itself
 {const q=await fresh();await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);await q.click('.ob-step.on .plan[data-id="18"]');await q.waitForTimeout(150);assert(await q.$('.ob-step.on .plan.bump'),'the tile bounces when a first-timer picks 18:6');await q.waitForTimeout(900);assert(!(await q.$('.ob-step.on .plan.bump')),'and stops');
  ok('18:6 bounces once for a first-timer');await q.context().close();}

 // 6. the concept page's phone does the same
 {const c=await b.newContext({viewport:{width:430,height:1000},timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url+'concept/');await q.waitForTimeout(800);
  await q.evaluate(()=>document.getElementById('obph').scrollIntoView({block:'center'}));await q.waitForTimeout(400);
  const cn=async()=>{await q.click('#obStage [data-next]');await q.waitForTimeout(900);};
  await cn();await q.click('#obStage .ob-opt[data-v=first]');await q.waitForTimeout(300);await cn();
  assert.match(await q.textContent('#obStage'),/Pick your plan/);assert(await q.$('#obStage .ob-opt[data-v="16"]:not([disabled])'),'16:8 open for a first-timer');assert(await q.$('#obStage .ob-opt[data-v="18"]:not([disabled])'),'18:6 can be picked');assert.match(await q.textContent('#obStage .ob-opt[data-v="18"]'),/Advanced/);assert(!(await q.$('#obStage .ob-opt[data-v=custom]')),'no custom for a first-timer');assert.match(await q.textContent('#obStage'),/When will you start\?/);assert.match(await q.textContent('#obStage'),/Remind me when I reach my goal/);
  await q.click('#obStage .ob-opt[data-v="20"]');await q.waitForTimeout(500);assert.match(await q.textContent('#obStage .ob-note'),/New to fasting/);
  await q.click('#obStage .ob-opt[data-v="13"]');await q.waitForTimeout(400);assert(!(await q.$('#obStage .ob-note')),'no note on 13:11');
  await q.goto(url+'concept/');await q.waitForTimeout(800);await q.evaluate(()=>document.getElementById('obph').scrollIntoView({block:'center'}));await q.waitForTimeout(400);await cn();await q.click('#obStage .ob-opt[data-v=some]');await q.waitForTimeout(300);await cn();
  assert(await q.$('#obStage .ob-opt[data-v=custom]'),'custom for people who fasted before');assert.strictEqual(await q.$eval('#obStage .ob-opt.on,#obStage .ob-opt[aria-checked=true]',e=>e.dataset.v),'16','16:8 pre-selected');assert.match(await q.textContent('#obStage'),/Usual start time/);
  await cn();assert.match(await q.textContent('#obStage'),/Bring your fasts with you/,'the next step is the import, there is no separate start-time step');
  ok('concept page: same plan step (16:8 open, 18:6 and 20:4 with a note, custom, start time, reminder)');await c.close();}

 // 7. during setup the strips behind the status bar and home indicator match the setup screen (they showed the Today sky around it), in light and dark
 for(const scheme of ['light','dark']){const c=await b.newContext({viewport:{width:390,height:844},colorScheme:scheme,timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(()=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:false,prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}});await q.goto(url);await q.waitForTimeout(900);
  for(let i=0;i<2;i++){const r=await q.evaluate(()=>({page:document.body.style.backgroundColor,root:document.documentElement.style.backgroundColor,step:getComputedStyle(document.querySelector('.ob-step.on')).backgroundColor,bar:document.querySelector('meta[name=theme-color]').content,bg:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()}));
   assert.strictEqual(r.page,r.step,scheme+': page colour matches the setup screen '+JSON.stringify(r));assert.strictEqual(r.root,r.step);assert(r.bar.toLowerCase()===r.bg.toLowerCase()||r.bar===r.step,scheme+': the status bar colour is the setup screen colour '+JSON.stringify(r));
   if(i===0){await next(q);}}
  ok('setup: the bars around the screen match it ('+scheme+')');await c.close();}

 await b.close();srv.close();assert.deepStrictEqual(errs,[],'no page errors');console.log('done');
})().catch(e=>{console.error(e);process.exit(1)});
