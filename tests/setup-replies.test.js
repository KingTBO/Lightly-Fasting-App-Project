/* Setup answers back, and Today without the everyday hints (v0.109.0).
   1. Welcome: the line asks for the drag ("Drag the moon."); once the moon has been dragged full it says "A full moon is a finished fast." and keeps saying it.
      With Reduce Motion the moon does not follow a drag, so the line is the old "Fasting that follows the sky."
   2. "Have you fasted before?": nothing is said until there is an answer; each answer gets its own short line, and the step keeps its number of children.
   3. Plan: one line per plan with the eating hours, which follows the start time.
   4. The last screen is one sentence (tonight, today, or waiting when the hour has passed), then the plan and the place in one quiet line. No table, no "You're set".
   5. Today during a fast: no everyday hint under the timer, the body line stands there from the start. The safety line of a long fast and the line after the goal still speak.
   6. 中文, a 320 px phone, and the concept page.
   NODE_PATH=$(npm root -g) node tests/setup-replies.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.png')?'image/png':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000;
const AFTERNOON='2026-11-13T15:40:00+08:00', LATE='2026-11-13T21:40:00+08:00', MORNING='2026-11-13T09:00:00+08:00';
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const errs=[];
 const on='#ob .ob-step.on ';
 /* a fresh phone at the first screen of setup */
 const setup=async o=>{ o=Object.assign({lang:'en',w:390,h:844,time:AFTERNOON},o||{}); const ctx=await b.newContext({viewport:{width:o.w,height:o.h},timezoneId:'Asia/Shanghai',reducedMotion:o.reduce?'reduce':'no-preference'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(l=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:l,theme:'auto',onboarded:false,prefs:{sound:false,haptics:false,d3:false,notify:false}})); sessionStorage.setItem('seeded','1'); } },o.lang);
  await p.clock.setFixedTime(new Date(o.time)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(2200); return p; };
 const txt=(p,s)=>p.evaluate(s=>{ const e=document.querySelector('#ob .ob-step.on '+s); return e?e.textContent:null; },s);
 const next=async p=>{ await p.click(on+'[data-act=obnext]'); await p.waitForTimeout(1100); };
 const dragFull=async p=>{ const r=await p.evaluate(()=>{ const q=document.querySelector('#ob .ob-step.on .ob-bslot').getBoundingClientRect(); return {x:q.left+q.width/2,y:q.top+q.height/2,w:q.width}; });
  await p.mouse.move(r.x-60,r.y); await p.mouse.down(); for(let i=0;i<=24;i++){ await p.mouse.move(r.x-60+i*r.w/26,r.y); await p.waitForTimeout(30); } await p.waitForTimeout(500); await p.mouse.up(); await p.waitForTimeout(300); };
 /* from the plan step to the last screen, with the answers that keep everything ordinary */
 const toEnd=async(p,safe)=>{ for(let i=0;i<7;i++){ const k=await p.evaluate(()=>[...document.querySelectorAll('#ob .ob-step.on [data-act]')].map(x=>x.dataset.act+':'+(x.dataset.v||'')).join(',')); if(/obdone/.test(k)) return;
   if(/obsafe/.test(k)){ const e=await p.$(on+'[data-act=obsafe][data-v='+(safe||'none')+']'); await e.scrollIntoViewIfNeeded(); await e.click(); await p.waitForTimeout(200); await p.click(on+'[data-act=obnext]'); }
   else if(/obcityshow/.test(k)){ await p.click(on+'[data-act=obcityshow]'); await p.waitForTimeout(300); await p.click(on+'[data-act=obnext]'); }
   else if(/obbodyskip/.test(k)){ await p.click(on+'[data-act=obbodyskip]'); } else await p.click(on+'[data-act=obnext]'); await p.waitForTimeout(1100); } throw new Error('the last screen was not reached'); };
 const startAt=async(p,hour)=>{ await p.click('#obStart .pk-row'); await p.waitForTimeout(500); await p.evaluate(h=>{ const c=document.querySelector('#obStart [data-c=h]'); c.scrollTo({top:(h+ +c.dataset.loop*3)*36}); },hour); await p.waitForTimeout(800); await p.click('#obStart .pk-row'); await p.waitForTimeout(400); };

 /* 1. welcome */
 { const p=await setup(); assert.strictEqual(await txt(p,'.ob-wline'),'Drag the moon.','the welcome line asks for the drag');
  await dragFull(p); assert.strictEqual(await txt(p,'.ob-wline'),'A full moon is a finished fast.','a full moon changes the line');
  await p.waitForTimeout(900); assert.strictEqual(await txt(p,'.ob-wline'),'A full moon is a finished fast.','and it stays after the finger lifts');
  await next(p); await p.click(on+'[data-act=obback]'); await p.waitForTimeout(1100); assert.strictEqual(await txt(p,'.ob-wline'),'A full moon is a finished fast.','coming back to the first screen keeps it');
  await p.click(on+'[data-act=lang]'); await p.waitForTimeout(700); assert.strictEqual(await txt(p,'.ob-wline'),'月亮圆了，就是一次断食完成。','中文'); await p.context().close();
  const q=await setup({reduce:true}); assert.strictEqual(await txt(q,'.ob-wline'),'Fasting that follows the sky.','Reduce Motion: no drag is asked for, since the moon would not follow it'); await q.context().close();
  ok('welcome: "Drag the moon." becomes "A full moon is a finished fast." once the moon is full, and stays; Reduce Motion keeps the old line'); }

 /* 2. fasted before */
 { const p=await setup(); await next(p);
  const say=()=>p.evaluate(()=>{ const e=document.querySelector('#ob .ob-step.on .ob-say'), st=e.parentNode; return {text:e.textContent,vis:getComputedStyle(e).visibility,kids:st.children.length,live:e.getAttribute('aria-live')}; });
  let a=await say(); assert.deepStrictEqual([a.text,a.vis,a.live],['','hidden','polite'],'nothing is said before an answer');
  await p.click(on+'[data-act=obopt][data-v=first]'); await p.waitForTimeout(500); let f=await say(); assert.deepStrictEqual([f.text,f.vis],['Welcome. We start easy, with 13 hours.','visible']); assert.strictEqual(f.kids,a.kids,'the step keeps its children, so nothing jumps');
  await p.click(on+'[data-act=obopt][data-v=before]'); await p.waitForTimeout(500); let g=await say(); assert.strictEqual(g.text,'Welcome back. Your past fasts can come too.');
  assert.strictEqual(await p.evaluate(()=>document.querySelectorAll('#ob .ob-step.on .ob-say').length),1,'one line, not two');
  await p.click(on+'[data-act=obopt][data-v=first]'); await p.waitForTimeout(400);
  /* 3. plan */
  await next(p); assert.strictEqual(await txt(p,'.ob-win'),'The gentle one. Eat 09:00 to 20:00.','a first-timer lands on 13:11');
  const want={'16':'The classic. Eat 12:00 to 20:00.','18':'A longer stretch. Eat 14:00 to 20:00.','20':'One main meal. Eat 16:00 to 20:00.','13':'The gentle one. Eat 09:00 to 20:00.'};
  for(const id of ['16','18','20','13']){ await p.click(on+'[data-act=obplan][data-id="'+id+'"]'); await p.waitForTimeout(700); assert.strictEqual(await txt(p,'.ob-win'),want[id],'plan '+id); }
  assert(!/Fast \d\d:\d\d to/.test(await txt(p,'')||await p.textContent(on)),'the old "Fast 20:00 to 09:00, eat 11 hours." line is gone');
  await p.click(on+'[data-act=obplan][data-id="16"]'); await p.waitForTimeout(700); await startAt(p,14); assert.strictEqual(await txt(p,'.ob-win'),'The classic. Eat 06:00 to 14:00.','the line follows the start time');
  await startAt(p,20);
  /* 4. the last screen, in the afternoon: tonight */
  await toEnd(p); await p.waitForTimeout(600);
  assert.strictEqual(await txt(p,'.ob-first'),'Tonight at 20:00, your first moon starts to fill.'); assert.strictEqual(await txt(p,'.ob-firsts'),'16:8 · Shanghai sunrise and sunset');
  const end=await p.evaluate(()=>{ const s=document.querySelector('#ob .ob-step.on'); return {text:s.textContent,groups:s.querySelectorAll('.group').length,h1:s.querySelectorAll('h1').length}; });
  assert(!/You’re set|First fast|Change anything later/.test(end.text),'no "You’re set", no table rows'); assert.deepStrictEqual([end.groups,end.h1],[0,1],'one sentence as the heading, no table');
  await p.click(on+'[data-act=obdone]'); await p.waitForTimeout(1200); const S=await p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1'))); assert.strictEqual(S.onboarded,true); assert.strictEqual(S.planId,'16'); await p.context().close();
  ok('each answer gets one short line: fasted before, every plan with its eating hours, and one sentence on the last screen'); }

 /* 4b. the hour has passed, a daytime start, Care mode */
 { let p=await setup({time:LATE}); await next(p); await p.click(on+'[data-act=obopt][data-v=first]'); await next(p); await toEnd(p);
  assert.strictEqual(await txt(p,'.ob-first'),'Your first moon is waiting. Start when you’re ready.','20:00 has passed tonight: nothing is promised for a time that is gone');
  assert.strictEqual(await txt(p,'.ob-firsts'),'13:11 · usual start 20:00 · Shanghai sunrise and sunset','the chosen time is still named'); await p.context().close();
  p=await setup({time:MORNING}); await next(p); await p.click(on+'[data-act=obopt][data-v=first]'); await next(p); await startAt(p,14); await toEnd(p);
  assert.strictEqual(await txt(p,'.ob-first'),'Today at 14:00, your first sun starts to fill.','a daytime start is a sun, by the local sunrise and sunset'); await p.context().close();
  p=await setup(); await next(p); await p.click(on+'[data-act=obopt][data-v=first]'); await next(p); await toEnd(p,'ed');
  assert.match(await p.textContent(on),/Care mode is on\. You start at 13:11\./,'Care mode still says so'); assert.match(await txt(p,'.ob-firsts'),/^13:11 · /); await p.context().close();
  ok('the last screen: waiting once the hour has passed (the time is still named), a sun for a daytime start, and the Care mode line'); }

 /* 5. Today during a fast */
 { const AT=new Date(MORNING).getTime(), seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
   fasts:[1,3,4,5,6,7,8].map(i=>({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D,goalH:16,plan:'16'})),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{'24':true},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:AT-30*D},o||{});
  const open=async s=>{ const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
   await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
   await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
   await p.clock.setFixedTime(new Date(AT)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1800); return p; };
  const tip=p=>p.evaluate(()=>{ const t=document.getElementById('readTip'), n=document.getElementById('nowBtn'); return {text:t.textContent,quiet:t.classList.contains('quiet'),now:n.hidden?null:n.textContent,nowOp:+getComputedStyle(n).opacity}; });
  for(const el of [1,5,9,13.2,14.5]){ const p=await open(seed({cur:{start:AT-el*H,goalH:16,planId:'16'}})); const t=await tip(p);
   assert.deepStrictEqual([t.text,t.quiet],['',true],el+' h into a 16 h fast: no hint'); assert.match(t.now,/^Your body now: /); assert.strictEqual(t.nowOp,1,'the body line shows at once'); await p.context().close(); }
  let p=await open(seed({planId:'24',cur:{start:AT-13*H,goalH:24,planId:'24'}})); let t=await tip(p); assert.match(t.text,/A long fast: sip water/,'a long fast keeps its safety line'); assert.strictEqual(t.quiet,false);
  await p.clock.setFixedTime(new Date(AT+8000)); await p.waitForTimeout(2300); t=await tip(p); assert.strictEqual(t.quiet,true,'which goes quiet after a few seconds'); assert.match(t.now,/^Your body now: /); await p.context().close();
  p=await open(seed({cur:{start:AT-16.5*H,goalH:16,planId:'16',reached:true}})); t=await tip(p); assert.match(t.text,/Extra time isn’t scored/,'past the goal the calm line still speaks'); await p.context().close();
  p=await open(seed()); t=await tip(p); assert.match(t.text,/Start now and you finish at/,'at rest the line with the finish time stays'); assert.strictEqual(t.quiet,false); await p.context().close();
  const src=fs.readFileSync(path.join(root,'js/app.js'),'utf8')+fs.readFileSync(path.join(root,'concept/index.html'),'utf8'); for(const w of ['Past halfway','The last two hours','Hunger often comes in waves and passes. Water','The long quiet stretch','Last meal done']) assert(!src.includes(w),'the hint "'+w+'" is gone from the app and the concept page');
  ok('Today during a fast: no everyday hint, the body line from the start; the long-fast safety line, the line after the goal and the line at rest stay'); }

 /* 6. 中文 on a 320 px phone */
 { const p=await setup({lang:'zh',w:320,h:568}); assert.strictEqual(await txt(p,'.ob-wline'),'拖一拖月亮。'); await next(p);
  await p.click(on+'[data-act=obopt][data-v=before]'); await p.waitForTimeout(500); assert.strictEqual(await txt(p,'.ob-say'),'欢迎回来。以前的断食记录也可以带来。');
  await p.click(on+'[data-act=obopt][data-v=first]'); await p.waitForTimeout(500); assert.strictEqual(await txt(p,'.ob-say'),'欢迎。我们从轻松的 13 小时开始。');
  const fit=()=>p.evaluate(()=>{ const s=document.querySelector('#ob .ob-step.on'), e=s.querySelector('.ob-say'), r=e.getBoundingClientRect(), g=s.getBoundingClientRect(); return {in:r.left>=g.left&&r.right<=g.right+.5,sw:document.documentElement.scrollWidth,font:parseFloat(getComputedStyle(e).fontSize)}; });
  let f=await fit(); assert(f.in&&f.sw<=320&&f.font>=15,'the line fits a 320 px phone: '+JSON.stringify(f));
  await next(p); assert.strictEqual(await txt(p,'.ob-win'),'最温和。进食 09:00 至 20:00。'); const tops=[];
  for(const id of ['16','18','20','13']){ await p.click(on+'[data-act=obplan][data-id="'+id+'"]'); await p.waitForTimeout(600); tops.push(await p.evaluate(()=>Math.round(document.querySelector('#ob .ob-step.on .group.tiles').getBoundingClientRect().top))); }
  assert(tops.every(t=>t===tops[0]),'the plan tiles stay put when the line changes: '+tops); f=await fit(); assert(f.in&&f.sw<=320,'the plan line fits: '+JSON.stringify(f));
  await toEnd(p); assert.strictEqual(await txt(p,'.ob-first'),'今晚 20:00，第一轮月亮开始亮起来。'); assert.strictEqual(await txt(p,'.ob-firsts'),'13:11 · 上海的日出日落');
  const lay=await p.evaluate(()=>{ const s=document.querySelector('#ob .ob-step.on'), h=s.querySelector('.ob-first').getBoundingClientRect(), c=s.querySelector('.ob-cta').getBoundingClientRect(), l=s.querySelector('.ob-firsts').getBoundingClientRect(); return {gap:c.top-l.bottom,sw:document.documentElement.scrollWidth,hw:h.width}; });
  assert(lay.gap>=8&&lay.sw<=320,'the sentence and its line sit above the button on a small phone: '+JSON.stringify(lay)); await p.context().close();
  ok('中文 on a 320 px phone: every line, nothing off the screen, the tiles stay put, the last screen fits'); }

 /* 7. the concept page mirrors it */
 { const ctx=await b.newContext({viewport:{width:1280,height:1000},timezoneId:'Asia/Shanghai'}); const c=await ctx.newPage(); c.on('pageerror',e=>errs.push('concept: '+e.message));
  await c.clock.setFixedTime(new Date(AFTERNOON)); await c.goto('http://localhost:'+port+'/concept/'); await c.waitForTimeout(1500); await c.evaluate(()=>document.getElementById('obph').scrollIntoView({block:'center'})); await c.waitForTimeout(1500);
  const ct=s=>c.evaluate(s=>{ const e=document.querySelector('#obStage .ob-step:last-child '+s); return e?e.textContent:null; },s);
  assert.strictEqual(await ct('.ob-wline'),'Drag the moon.');
  const r=await c.evaluate(()=>{ const q=document.querySelector('#obStage .ob-bslot').getBoundingClientRect(); return {x:q.left+q.width/2,y:q.top+q.height/2,w:q.width}; });
  await c.mouse.move(r.x-60,r.y); await c.mouse.down(); for(let i=0;i<=24;i++){ await c.mouse.move(r.x-60+i*r.w/26,r.y); await c.waitForTimeout(30); } await c.waitForTimeout(500); await c.mouse.up(); await c.waitForTimeout(400);
  assert.strictEqual(await ct('.ob-wline'),'A full moon is a finished fast.');
  await c.click('#obStage [data-next]'); await c.waitForTimeout(1000); assert.strictEqual(await ct('.ob-say'),'');
  await c.click('#obStage .ob-opt[data-v=some]'); await c.waitForTimeout(500); assert.strictEqual(await ct('.ob-say'),'Welcome back. Your past fasts can come too.');
  await c.click('#obStage .ob-opt[data-v=first]'); await c.waitForTimeout(500); assert.strictEqual(await ct('.ob-say'),'Welcome. We start easy, with 13 hours.');
  await c.click('#obStage [data-next]'); await c.waitForTimeout(1200); assert.strictEqual(await ct('.ob-win'),'The gentle one. Eat 09:30 to 20:30.');
  await c.click('#obStage .ob-opt[data-v="16"]'); await c.waitForTimeout(900); assert.strictEqual(await ct('.ob-win'),'The classic. Eat 12:30 to 20:30.');
  for(let i=0;i<6;i++){ if(await c.$('#obStage [data-done]')) break; if(await c.$('#obStage .ob-step:last-child .ob-opt[data-v=none]')){ await c.click('#obStage .ob-step:last-child .ob-opt[data-v=none]'); await c.waitForTimeout(300); }
   const loc=await c.$('#obStage .ob-step:last-child [data-loc=city]'); if(loc){ await loc.click(); await c.waitForTimeout(400); } const sk=await c.$('#obStage .ob-step:last-child [data-skip]'); if(sk) await sk.click(); else await c.click('#obStage .ob-step:last-child [data-next]'); await c.waitForTimeout(1100); }
  assert.strictEqual(await ct('.ob-first'),'Tonight at 20:30, your first moon starts to fill.'); assert.strictEqual(await ct('.ob-firsts'),'16:8 · Shanghai sunrise and sunset'); assert(!/You’re set/.test(await c.textContent('#obStage')));
  /* the demo phone: a running fast has no hint */
  await c.click('#moments [data-go="f50"]'); await c.waitForTimeout(1500); const dt=await c.evaluate(()=>{ const t=document.getElementById('readTip'), n=document.getElementById('nowBtn'); return {text:t.textContent,quiet:t.classList.contains('quiet'),now:n.hidden?null:n.textContent}; });
  assert.deepStrictEqual([dt.text,dt.quiet],['',true],'concept: no hint during the fast'); assert.match(dt.now,/^Your body now: /); await ctx.close();
  ok('concept page: the same lines in its setup demo, and no hint on its demo phone'); }

 assert.deepStrictEqual(errs,[],'no page errors'); await b.close(); srv.close(); console.log('setup-replies: all passed'); process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
