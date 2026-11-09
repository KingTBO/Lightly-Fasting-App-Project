/* 24 h and 36 h for people who have fasted before: open at once, behind an amber warning and a buzz. First-timers stay locked; Care mode hides both.
   usage: NODE_PATH=$(npm root -g) node tests/longfast.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
const H=3600000,D=24*H;
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:true,d3:false,notify:false},ramadanPreview:false,startedAt:Date.now()-30*D,mod:1,del:[]},o);
 async function fresh(state){const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',reducedMotion:'no-preference'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(x=>{window.__vib=[];navigator.vibrate=function(p){window.__vib.push(p);return true;};if(!sessionStorage.s){localStorage.setItem('lightly:v1',x);sessionStorage.s=1}},JSON.stringify(state));await q.goto(url);await q.waitForTimeout(600);return q;}
 const S=q=>q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const open=async q=>{await q.click('#planBtn');await q.waitForTimeout(350);await q.click('[data-act=more]');await q.waitForTimeout(250);};
 const ago=(d,h)=>{const e=Date.now()-d*D;return{id:'l'+d+'_'+h,start:e-h*H,end:e,goalH:h,plan:String(h)};};

 // someone who has fasted before, with no fasts at all: both rows are open, tagged Advanced, with the once-a-week and twice-a-month advice
 {const q=await fresh(seed({}));await open(q);
  for(const [id,rx] of [['24',/[Oo]nce a week at most/],['36',/[Tt]wice a month at most/]]){
   assert(!(await q.$('.plan[data-id="'+id+'"][disabled]')),id+' h is open');const t=await q.textContent('.plan[data-id="'+id+'"]');assert.match(t,/Advanced/);assert.match(t,/Only if you have done it before/);assert.match(t,rx);assert(!/Locked|Rest first|Paused/.test(t),'no lock on '+id);}
  // choosing 24 h: the warning opens, the phone buzzes, nothing is chosen until Yes
  await q.evaluate(()=>{window.__vib.length=0;});await q.click('.plan[data-id="24"]');await q.waitForTimeout(300);
  let t=await q.textContent('#sheet');assert.match(t,/Done a 24-hour fast before\?/);assert.match(t,/only if you have done one before, not as your first time/);assert.match(t,/once a week at most/);
  assert(await q.$('#sheet .warn-ico'),'the amber warning mark');assert.deepStrictEqual(await q.evaluate(()=>window.__vib.slice(-1)[0]),[22,50,22,50,34],'the warning buzz');
  assert.strictEqual((await S(q)).planId,'16','nothing is chosen while it is asked');
  // Not now goes back to the plan list, still on 16:8
  await q.click('[data-act=lwback]');await q.waitForTimeout(300);assert.match(await q.textContent('#sheet'),/Your plan/);assert.strictEqual((await S(q)).planId,'16');
  // Yes picks it
  await open(q).catch(()=>{});
  if(!(await q.$('.plan[data-id="24"]'))) await q.click('[data-act=more]');
  await q.click('.plan[data-id="24"]');await q.waitForTimeout(300);await q.click('[data-act=lwgo]');await q.waitForTimeout(300);
  assert.strictEqual((await S(q)).planId,'24','Yes picks 24 h');assert.match(await q.textContent('#sheet'),/Your plan/);
  // 36 h has its own words
  await q.evaluate(()=>{window.__vib.length=0;});if(!(await q.$('.plan[data-id="36"]'))) await q.click('[data-act=more]');
  await q.click('.plan[data-id="36"]');await q.waitForTimeout(300);t=await q.textContent('#sheet');assert.match(t,/Done a 36-hour fast before\?/);assert.match(t,/twice a month at most/);assert(await q.evaluate(()=>window.__vib.length)>0,'buzz');
  await q.click('[data-act=lwgo]');await q.waitForTimeout(300);assert.strictEqual((await S(q)).planId,'36');
  ok('experienced: 24 h and 36 h open with no fasts, Advanced tag, advice words, warning + buzz, Not now, Yes');
  // the short safety check before the fast is unchanged
  await q.click('#sheet [data-act=close]');await q.waitForTimeout(400);await q.click('#act');await q.waitForTimeout(350);
  assert.match(await q.textContent('#sheet'),/Before a 36-hour fast/);assert(await q.$eval('#lsGo',e=>e.disabled),'start still waits for the three checks');
  ok('the safety check before the fast still appears');
  await q.context().close();}

 // the vibration switch off: the warning is still shown but nothing buzzes
 {const q=await fresh(seed({prefs:{sound:false,haptics:false,d3:false,notify:false}}));await open(q);await q.evaluate(()=>{window.__vib.length=0;});await q.click('.plan[data-id="24"]');await q.waitForTimeout(300);
  assert.match(await q.textContent('#sheet'),/Done a 24-hour fast before/);assert.strictEqual(await q.evaluate(()=>window.__vib.length),0,'the Vibration switch off means no buzz');
  ok('the warning follows the Vibration switch');await q.context().close();}

 // advice, never a block: a recent long fast and an unwell check-in add an amber line, and the row says to rest
 {const q=await fresh(seed({fasts:[ago(2,24)]}));await open(q);assert(!(await q.$('.plan[data-id="24"][disabled]')),'still open');assert.match(await q.textContent('.plan[data-id="24"]'),/Maybe rest a few more days first/);
  await q.click('.plan[data-id="24"]');await q.waitForTimeout(300);assert.match(await q.textContent('#sheet .lw-note'),/less than 3 days ago/);await q.click('[data-act=lwgo]');await q.waitForTimeout(300);assert.strictEqual((await S(q)).planId,'24','the advice does not stop anyone');
  ok('a recent long fast: an amber note and a rest hint, not a block');await q.context().close();}
 {const q=await fresh(seed({fasts:[ago(5,24)]}));await open(q);await q.click('.plan[data-id="24"]');await q.waitForTimeout(300);assert.match(await q.textContent('#sheet .lw-note'),/one a week at most/);await q.context().close();}
 {const q=await fresh(seed({fasts:[ago(5,36),ago(12,36)]}));await open(q);await q.click('.plan[data-id="36"]');await q.waitForTimeout(300);assert.match(await q.textContent('#sheet .lw-note'),/two a month at most/);await q.context().close();}
 {const q=await fresh(seed({unwell:Date.now()-2*D}));await open(q);assert(!(await q.$('.plan[data-id="24"][disabled]')),'unwell no longer locks the row');await q.click('.plan[data-id="24"]');await q.waitForTimeout(300);assert.match(await q.textContent('#sheet .lw-note'),/felt unwell recently/);
  ok('a week since the last 24 h, two 36 h in a month, and a recent unwell check-in each add one amber line');await q.context().close();}

 // 中文
 {const q=await fresh(seed({lang:'zh'}));await open(q);await q.click('.plan[data-id="24"]');await q.waitForTimeout(300);const t=await q.textContent('#sheet');assert.match(t,/以前做过 24 小时断食吗/);assert.match(t,/不要作为第一次/);assert.match(t,/每周最多一次/);assert.match(t,/是的，我以前做过/);
  const bb=await q.locator('#sheet').boundingBox();const bt=await q.locator('[data-act=lwgo]').boundingBox();assert(bt.x>=bb.x&&bt.x+bt.width<=bb.x+bb.width+1,'the button fits');
  ok('中文 warning');await q.context().close();}

 // first-timers: closed, with the shorter climb
 {const q=await fresh(seed({profile:{fastedBefore:false,safety:false},fasts:[1,2,3].map(d=>({id:'z'+d,start:Date.now()-d*D-16*H,end:Date.now()-d*D,goalH:16,plan:'16'}))}));await open(q);
  assert(await q.$('.plan[data-id="24"][disabled]'),'24 h is locked for first-timers');let t=await q.textContent('.plan[data-id="24"]');assert.match(t,/Locked/);assert.match(t,/3 of 6 fasts of 16 h or more, week 0 of 2/);
  assert(await q.$('.plan[data-id="36"][disabled]'));assert.match(await q.textContent('.plan[data-id="36"]'),/First finish a 24 h fast/);
  ok('first-timers: locked, 3 of 6 fasts, week 0 of 2');await q.context().close();}
 {const fs6=[1,3,5,8,11,15].map(d=>({id:'y'+d,start:Date.now()-d*D-16*H,end:Date.now()-d*D,goalH:16,plan:'16'}));
  const q=await fresh(seed({profile:{fastedBefore:false,safety:false},fasts:fs6}));await open(q);assert(!(await q.$('.plan[data-id="24"][disabled]')),'24 h opens after six fasts over two weeks');
  const t=await q.textContent('.plan[data-id="24"]');assert.match(t,/Unlocked/);assert(!/Advanced/.test(t),'no experienced warning for someone who earned it');
  await q.click('.plan[data-id="24"]');await q.waitForTimeout(300);assert(!/Done a 24-hour fast before/.test(await q.textContent('#sheet')),'no warning for first-timers who have earned it');assert.strictEqual((await S(q)).planId,'24');
  ok('first-timers: 24 h opens after 6 fasts of 16 h over two weeks, with no experienced warning');await q.context().close();}

 // Care mode keeps hiding both, even for "fasted before"
 {const q=await fresh(seed({profile:{fastedBefore:true,safety:true,care:['diab']}}));await open(q);
  for(const id of ['24','36']){assert(await q.$('.plan[data-id="'+id+'"][disabled]'));assert.match(await q.textContent('.plan[data-id="'+id+'"]'),/Not offered/);}
  ok('Care mode: 24 h and 36 h still not offered');await q.context().close();}

 // the concept page mirrors it
 {const c=await b.newContext({viewport:{width:1280,height:900}});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url+'concept/');await q.waitForTimeout(800);
  const html=await q.content();assert(/Open if you have fasted before, at most once a week/.test(html)&&/6 fasts of 16 h or more over at least 2 weeks/.test(html)&&/Yes, I have done this before/.test(html),'concept page copy');
  assert(!/12 fasts of 16 h|4 weeks and 12/.test(html),'no old rule left on the concept page');
  ok('concept page mirrors the new rules');await c.close();}

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close();srv.close();console.log('longfast ok');
})().catch(e=>{console.error(e);process.exit(1);});
