/* Custom for beginners (v0.113.0): Custom is open to everyone from 10 hours.
   First-timers go up to 16 h until 3 fasts of 13 h or more, then 23 h; Care mode 13 h, then 16 h; people who have fasted before 23 h.
   Covers the plan sheet, setup (app and concept page), Care mode at the end of setup, 中文 and 320 px.
   usage: NODE_PATH=$(npm root -g) node tests/custom-beginner.test.js [shotsdir] */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..'), shots=process.argv[2];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
const H=3600000,D=24*H;
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 if(shots) fs.mkdirSync(shots,{recursive:true});
 const shot=async(q,n)=>{ if(shots) await q.screenshot({path:path.join(shots,n+'.png')}); };
 const seed=o=>Object.assign({v:1,lang:'en',theme:'light',onboarded:true,profile:{fastedBefore:false,safety:false},planId:'13',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:Date.now()-30*D,mod:1,del:[]},o);
 const fz=(n,h)=>Array.from({length:n},(_,i)=>({id:'f'+i+'-'+h,start:Date.now()-(i+2)*D,end:Date.now()-(i+2)*D+h*H,goalH:h,plan:String(h)}));
 async function open(state,o){o=o||{};const c=await b.newContext({viewport:{width:o.w||390,height:844},deviceScaleFactor:shots?2:1,timezoneId:'Asia/Shanghai',colorScheme:'light'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(x=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',x);sessionStorage.s=1}},JSON.stringify(state));await q.goto(url);await q.waitForTimeout(700);return q;}
 const S=q=>q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const range=(q,id)=>q.$eval('#'+id,e=>{const o=JSON.parse(e.dataset.opts).map(x=>+(Array.isArray(x)?x[0]:x));return [o[0],o[o.length-1]];});
 const crange=q=>q.$eval('#obStage .pk[data-id=chours]',e=>{const o=e._opts.map(x=>+x[0]);return [o[0],o[o.length-1]];});
 const pick=async(q,id,v)=>{if(!(await q.$('#'+id+'.open'))){await q.click('#'+id+' .pk-row');await q.waitForTimeout(500);}await q.evaluate(([id,v])=>{const pk=document.getElementById(id),c=pk.querySelector('[data-c=s]'),i=JSON.parse(pk.dataset.opts).map(x=>+(Array.isArray(x)?x[0]:x)).indexOf(v);c.scrollTo({top:i*36});},[id,v]);await q.waitForTimeout(900);};
 const sheetCustom=async q=>{await q.click('#planBtn');await q.waitForTimeout(500);if(!(await q.$('#sheet .plan[data-id=custom]'))){await q.click('#sheet [data-act=more]');await q.waitForTimeout(400);}};

 // 1. plan sheet, first-timer with no fasts: Custom is open, 10 to 16 hours, and a 10 hour plan works
 {const q=await open(seed());await sheetCustom(q);
  assert(await q.$('#sheet .plan[data-id=custom]:not([disabled])'),'Custom can be picked by a first-timer');assert.match(await q.textContent('#sheet .plan[data-id=custom]'),/Choose 10 to 16 hours/);
  await q.click('#sheet .plan[data-id=custom]');await q.waitForTimeout(500);assert.deepStrictEqual(await range(q,'cH'),[10,16],'the wheel goes from 10 to 16 hours');
  await pick(q,'cH',10);let s=await S(q);assert.strictEqual(s.planId,'custom');assert.strictEqual(s.customH,10,'10 hours is saved');
  assert.match(await q.textContent('#sheet .plan[data-id=custom] .pr'),/10:14/,'the row says 10:14');
  await q.evaluate(()=>{const s=document.getElementById('sheet');s.scrollTop=s.scrollHeight;});await q.waitForTimeout(300);await shot(q,'1-plan-sheet-first-timer_en');
  ok('plan sheet: a first-timer can pick Custom, 10 to 16 hours, and 10:14 is saved');await q.context().close();}

 // 2. three fasts of 13 h or more open the whole wheel; someone who has fasted before gets it from the start
 {let q=await open(seed({fasts:fz(3,13)}));await sheetCustom(q);assert.match(await q.textContent('#sheet .plan[data-id=custom]'),/Choose 10 to 23 hours/);await q.click('#sheet .plan[data-id=custom]');await q.waitForTimeout(500);assert.deepStrictEqual(await range(q,'cH'),[10,23]);await q.context().close();
  q=await open(seed({fasts:fz(2,13)}));await sheetCustom(q);assert.match(await q.textContent('#sheet .plan[data-id=custom]'),/Choose 10 to 16 hours/,'two are not enough');await q.context().close();
  q=await open(seed({profile:{fastedBefore:true,safety:false},planId:'16'}));await sheetCustom(q);assert.match(await q.textContent('#sheet .plan[data-id=custom]'),/Choose 10 to 23 hours/);await q.context().close();
  ok('three fasts of 13 h or more take a first-timer to 23 h; fasted before gets 10 to 23 h');}

 // 3. a saved first-timer custom goal over 16 h comes down to 16 h on load
 {const q=await open(seed({planId:'custom',customH:20}));const s=await S(q);assert.strictEqual(s.customH,16);assert.strictEqual(s.planId,'custom');ok('a first-timer’s saved custom over 16 h comes down to 16 h');await q.context().close();}

 // 4. Care mode: Custom is offered, 10 to 13 h, then 16 h after three fasts of 13 h
 {let q=await open(seed({profile:{fastedBefore:false,safety:true,care:['diab']}}));await sheetCustom(q);assert(await q.$('#sheet .plan[data-id=custom]:not([disabled])'),'Custom in Care mode');assert.match(await q.textContent('#sheet .plan[data-id=custom]'),/Choose 10 to 13 hours/);await q.context().close();
  q=await open(seed({profile:{fastedBefore:false,safety:true,care:['diab']},fasts:fz(3,13)}));await sheetCustom(q);assert.match(await q.textContent('#sheet .plan[data-id=custom]'),/Choose 10 to 16 hours/);await q.context().close();
  ok('Care mode: Custom 10 to 13 h, then 16 h');}

 // 5. setup, first-timer: a Custom tile, 10 to 16 hours, saved at the end
 const next=async q=>{await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(900);};
 const toEnd=async(q,safe)=>{await next(q);await q.waitForTimeout(800);await next(q);await q.click('[data-act=obsafe][data-v='+safe+']');await next(q);if(await q.$('.ob-step.on [data-act=obbodyskip]')){await q.click('.ob-step.on [data-act=obbodyskip]');await q.waitForTimeout(800);}};
 {const q=await open({v:1,lang:'en',theme:'light',onboarded:false,prefs:{sound:false,haptics:false,d3:false}});await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);
  assert(await q.$('.ob-step.on .plan[data-id=custom]'),'a Custom tile for a first-timer');await q.click('.ob-step.on .plan[data-id=custom]');await q.waitForTimeout(900);
  assert.deepStrictEqual(await range(q,'obCustom'),[10,16]);await pick(q,'obCustom',10);
  await q.waitForSelector('#obBigN:not([data-rolling])',{timeout:5000});assert.strictEqual((await q.textContent('#obBigN')).trim(),'10','the big number says 10');
  await shot(q,'2-setup-first-timer-custom_en');
  await toEnd(q,'none');assert.match(await q.textContent('.ob-step.on .ob-firsts'),/^10:14 · /,'the last screen names 10:14');await q.click('[data-act=obdone]');await q.waitForTimeout(900);
  const s=await S(q);assert.strictEqual(s.planId,'custom');assert.strictEqual(s.customH,10);
  ok('setup: a first-timer picks Custom 10 hours and it is saved');await q.context().close();}

 // 6. setup: a health answer at the end keeps a Custom plan, capped at 13 h
 {const q=await open({v:1,lang:'en',theme:'light',onboarded:false,prefs:{sound:false,haptics:false,d3:false}});await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);
  await q.click('.ob-step.on .plan[data-id=custom]');await q.waitForTimeout(900);await pick(q,'obCustom',15);
  await toEnd(q,'diab');assert.match(await q.textContent('.ob-step.on'),/Care mode is on\. You start at 13:11\./,'capped at 13 h');await q.click('[data-act=obdone]');await q.waitForTimeout(900);
  let s=await S(q);assert.strictEqual(s.planId,'custom','Custom stays');assert.strictEqual(s.customH,13);await q.context().close();
  const q2=await open({v:1,lang:'en',theme:'light',onboarded:false,prefs:{sound:false,haptics:false,d3:false}});await next(q2);await q2.click('[data-act=obopt][data-v=first]');await next(q2);
  await q2.click('.ob-step.on .plan[data-id=custom]');await q2.waitForTimeout(900);await pick(q2,'obCustom',11);await toEnd(q2,'diab');assert.match(await q2.textContent('.ob-step.on'),/You start at 11:13\./);await q2.click('[data-act=obdone]');await q2.waitForTimeout(900);
  s=await S(q2);assert.strictEqual(s.planId,'custom');assert.strictEqual(s.customH,11,'a shorter custom plan is never pushed up to 13:11');
  ok('setup: Care mode keeps a Custom plan (capped at 13 h) and never lengthens a shorter one');await q2.context().close();}

 // 7. 中文 and 320 px
 {const q=await open(seed({lang:'zh'}),{w:320});await sheetCustom(q);assert.match(await q.textContent('#sheet .plan[data-id=custom]'),/10 到 16 小时之间/);
  await q.click('#sheet .plan[data-id=custom]');await q.waitForTimeout(500);
  const over=await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('#sheet .plan[data-id=custom] *')].some(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>innerWidth+0.5;}));assert(!over,'nothing runs off a 320 px screen');
  await q.evaluate(()=>{const s=document.getElementById('sheet');s.scrollTop=s.scrollHeight;});await q.waitForTimeout(300);await shot(q,'3-plan-sheet-first-timer_zh_320');
  ok('中文 and 320 px');await q.context().close();}

 // 8. the concept page's setup: Custom for a first-timer, 10 to 16 hours; fasted before 10 to 23
 {const c=await b.newContext({viewport:{width:430,height:1000},timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  const go=async v=>{await q.goto(url+'concept/');await q.waitForTimeout(800);await q.evaluate(()=>document.getElementById('obph').scrollIntoView({block:'center'}));await q.waitForTimeout(400);
   const cn=async()=>{await q.click('#obStage [data-next]');await q.waitForTimeout(900);};await cn();await q.click('#obStage .ob-opt[data-v='+v+']');await q.waitForTimeout(300);await cn();
   if(!(await q.$('#obStage .ob-opt[data-v=custom]'))){await q.click('#obStage .ob-opt[data-v=none]');await q.waitForTimeout(300);await cn();}};
  await go('first');assert(await q.$('#obStage .ob-opt[data-v=custom]'),'Custom for a first-timer');await q.click('#obStage .ob-opt[data-v=custom]');await q.waitForTimeout(600);assert.deepStrictEqual(await crange(q),[10,16]);
  await go('some');await q.click('#obStage .ob-opt[data-v=custom]');await q.waitForTimeout(600);assert.deepStrictEqual(await crange(q),[10,23]);
  assert.match(await q.textContent('#planGrid'),/from 10/,'the plans section says Custom starts at 10 hours');
  ok('concept page: Custom for a first-timer (10 to 16 h) and for fasted before (10 to 23 h)');await c.close();}

 await b.close();srv.close();assert.deepStrictEqual(errs,[],'no page errors');console.log('done');
})().catch(e=>{console.error(e);process.exit(1)});
