/* Care mode in a real browser. usage: NODE_PATH=$(npm root -g) node tests/care.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
const H=3600000,D=24*H;
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:false,safety:false},planId:'13',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:Date.now()-30*D,mod:1,del:[]},o);
 async function fresh(state){const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));await q.addInitScript(x=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',x);sessionStorage.s=1}},JSON.stringify(state));await q.goto(url);await q.waitForTimeout(600);return q;}
 const S=q=>q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const f0=Date.now()-4*D, fasts=[0,1,2].map(i=>({id:'a'+i,start:f0+i*D,end:f0+i*D+16*H,goalH:16,plan:'16'}));

 // an answer given before Care mode existed (safety true, no list) turns Care mode on by itself
 {const q=await fresh(seed({profile:{fastedBefore:true,safety:true},planId:'20',fasts}));await q.waitForTimeout(300);
  let s=await S(q);assert.deepStrictEqual(s.profile.care,['earlier'],'old answers become "earlier"');assert.notStrictEqual(s.planId,'20','20:4 is closed in Care mode');
  assert.match(await q.textContent('#streakTx'),/This week/,'Today shows This week, not a streak');assert(!/in a row/.test(await q.textContent('#streakBtn')));assert(await q.$eval('#streakBtn',e=>e.disabled),'the card opens nothing');
  await q.click('#planBtn');await q.click('[data-act=more]');
  assert(!(await q.$('.plan[data-id="18"]'))&&!(await q.$('.plan[data-id="20"]'))&&!(await q.$('.plan[data-id="23"]')),'18:6, 20:4 and 23:1 are not offered');
  assert(await q.$('.plan[data-id="24"][disabled]')&&await q.$('.plan[data-id="36"][disabled]'),'24 h and 36 h show, closed');assert.match(await q.textContent('.plan[data-id="24"]'),/Not offered/);assert(!(await q.$('.plan[data-id="24"] .bar')),'no progress bar to climb');
  assert(!(await q.$('#cH')),'custom is not selected');await q.click('.plan[data-id="custom"]');await q.waitForTimeout(200);assert.strictEqual(await q.getAttribute('#cH','max'),'16','custom stops at 16 h');
  await q.click('#sheet [data-act=close]');await q.waitForTimeout(400);
  await q.click('#tabs [data-tab=me]');const me=await q.textContent('#me');assert(!/Cheat days/.test(me),'no cheat days row');assert(!/Ramadan/.test(me),'no Ramadan preview switch');assert.match(me,/Care mode on/);
  await q.click('#tabs [data-tab=days]');assert(!/day streak/i.test(await q.textContent('#days')),'Days has no streak');assert.match(await q.textContent('#days'),/Days this month/);
  ok('Care mode from an earlier answer: no streak, no cheat days, no Ramadan, plans stop at 16:8, custom at 16 h, 24 h and 36 h never offered');
  // Health answers: add one at once; ease the earlier one only with the wait
  await q.click('#tabs [data-tab=me]');await q.click('#me [data-act=care]');await q.waitForTimeout(300);
  assert.match(await q.textContent('#sheet'),/Answered earlier/);await q.click('[data-act=carerow][data-k=ed]');await q.waitForTimeout(200);s=await S(q);assert.deepStrictEqual(s.profile.care,['earlier','ed'],'adding an answer is instant');
  await q.click('[data-act=carerow][data-k=ed]');await q.waitForTimeout(200);assert.match(await q.textContent('#sheet'),/keep this on for you/,'an eating-disorder answer cannot be eased in the app');assert.strictEqual((await S(q)).profile.care.length,2);await q.click('#sheet [data-act=care]');await q.waitForTimeout(200);
  await q.click('[data-act=carerow][data-k=earlier]');await q.waitForTimeout(200);assert(await q.$eval('#careGo',e=>e.disabled),'the wait cannot start without the professional tick');await q.click('[data-act=carepro]');assert(!(await q.$eval('#careGo',e=>e.disabled)));await q.click('#careGo');await q.waitForTimeout(250);s=await S(q);assert.deepStrictEqual(s.profile.careOff.keys,['earlier']);assert.deepStrictEqual(s.profile.care,['earlier','ed'],'nothing changes during the wait');assert.match(await q.textContent('#sheet'),/Easing starts/);
  await q.click('[data-act=carecancel]');await q.waitForTimeout(200);assert.strictEqual((await S(q)).profile.careOff,null,'the wait can be cancelled');
  ok('health answers: add instantly, eating disorder cannot be eased, earlier answer needs the professional tick and a 14-day wait you can cancel');
  await q.context().close();}

 // pregnancy ends: one tap, then Care mode is off and long fasts start from zero
 {const q=await fresh(seed({profile:{fastedBefore:true,safety:true,care:['preg']},unlocked:{24:1},fasts}));
  await q.click('#tabs [data-tab=me]');await q.click('#me [data-act=care]');await q.click('[data-act=carerow][data-k=preg]');await q.waitForTimeout(200);assert.match(await q.textContent('#sheet'),/No longer pregnant/);await q.click('[data-act=careeasego]');await q.waitForTimeout(300);
  const s=await S(q);assert.deepStrictEqual(s.profile.care,[]);assert.strictEqual(s.profile.safety,false);assert.strictEqual(s.profile.fastedBefore,false,'the first-timer ladder applies again');assert.deepStrictEqual(s.unlocked,{});
  await q.click('#sheet [data-act=close]');await q.waitForTimeout(400);assert(/Cheat days/.test(await q.textContent('#me')),'cheat days are back');
  ok('pregnancy or breastfeeding ending: one tap, Care mode off, ladder restarts');
  await q.context().close();}

 // the 14 days pass: the diabetes answer is removed by itself
 {const q=await fresh(seed({profile:{fastedBefore:true,safety:true,care:['diab'],careOff:{keys:['diab'],start:Date.now()-15*D}},fasts}));await q.waitForTimeout(300);
  const s=await S(q);assert.deepStrictEqual(s.profile.care,[]);assert.strictEqual(s.profile.safety,false);assert.strictEqual(s.profile.careOff,null);
  ok('after the 14-day wait the answer is cleared and Care mode ends');await q.context().close();}

 // a new user who ticks an answer in onboarding
 {const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',geolocation:{latitude:31.23,longitude:121.47},permissions:['geolocation']});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url);await q.waitForTimeout(500);
  await q.click('[data-act=obnext]');await q.waitForTimeout(600);await q.click('[data-act=obopt][data-v=before]');await q.waitForTimeout(400);await q.click('[data-act=obnext]');await q.waitForTimeout(600);
  await q.click('.ob-step.on [data-act=obplan][data-id="20"]');await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);await q.click('.ob-step.on [data-act=obcityshow]');await q.waitForTimeout(300);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);
  await q.click('[data-act=obsafe][data-v=diab]');await q.waitForTimeout(300);assert.match(await q.textContent('.ob-step.on'),/Care mode keeps Lightly gentle/);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);assert.match(await q.textContent('.ob-step.on'),/Care mode is on/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);
  const s=await S(q);assert.deepStrictEqual(s.profile.care,['diab']);assert.strictEqual(s.profile.safety,true);assert.strictEqual(s.planId,'13','the plan drops to 13:11');
  ok('onboarding: ticking a health answer turns Care mode on and starts at 13:11');await c.close();}

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close();srv.close();console.log('care ok');
})().catch(e=>{console.error(e);process.exit(1);});
