/* The small release from the UI audit (v0.101.0):
   1. the main button is quiet glass while a fast runs and yellow for Start
   2. the selected tab is a neutral pill on every tab, switches are one colour, no black buttons, row arrows sit at the right edge
   3. each daily plan row draws its share of the day and says when that fast would end
   4. on a 320 px phone the calendar discs are round, the START/FINISH captions are 11 px or more, and the last setup screen does not scroll
   NODE_PATH=$(npm root -g) node tests/quiet-ui.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000;
const NOON='2026-11-10T12:00:00+08:00', AT=new Date(NOON).getTime();
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[1,2,3,4,5].map(i=>({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D-(i===3?6*H:0),goalH:16,plan:'16'})),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:AT-30*D},o||{});
const rgb=c=>{ let m=c.match(/[\d.]+/g).map(Number); if(/^color\(srgb/.test(c)) m=m.map((v,i)=>i<3?v*255:v); return m; };
const neutral=c=>{ const m=rgb(c); return !(m[0]>200&&m[1]>160&&m[2]<110); };   /* glass, grey or white: anything but the accent yellow (whatever its opacity) */
const hhmm=ms=>{ const d=new Date(ms+8*H); return String(d.getUTCHours()).padStart(2,'0')+':'+String(d.getUTCMinutes()).padStart(2,'0'); };   /* Shanghai clock */
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(o.time||NOON)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(o.wait||900); return p; };
 const actLook=p=>p.evaluate(()=>{ const a=document.getElementById('act'), cs=getComputedStyle(a); return {end:a.classList.contains('end'),bg:cs.backgroundColor,color:cs.color,tint:getComputedStyle(document.documentElement).getPropertyValue('--tint').trim(),label:a.textContent.trim(),h:a.getBoundingClientRect().height}; });
 const pill=p=>p.evaluate(()=>getComputedStyle(document.getElementById('tabInd')).backgroundColor);

 /* 1. the main button */
 for(const [time,dark] of [[NOON,false],['2026-11-10T22:00:00+08:00',true]]){ const at=new Date(time).getTime();
  let p=await open(seed({cur:{start:at-6*H,goalH:16,planId:'16'}}),{time,dark}); let a=await actLook(p);
  assert(a.end,'a running fast marks the button quiet'); assert.match(a.label,/Hold to end fast/); assert(neutral(a.bg),'the end button is glass, not yellow ('+a.bg+')'); assert(a.h>=44,'still a full-size target');
  /* holding it still ends the fast */
  const bx=await p.locator('#act').boundingBox(); await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2); await p.mouse.down(); await p.waitForTimeout(1500); await p.mouse.up(); await p.waitForTimeout(600);
  assert.strictEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')).cur),null,'the hold still ends the fast');
  a=await actLook(p); assert(!a.end,'after the fast the button is no longer quiet'); assert(!neutral(a.bg),'and it is yellow again ('+a.bg+')'); await p.context().close();
  /* past the goal it stays quiet */
  p=await open(seed({cur:{start:at-17*H,goalH:16,planId:'16',reached:true}}),{time,dark}); a=await actLook(p); assert(a.end&&neutral(a.bg),'past the goal the button stays quiet'); await p.context().close();
  /* idle: yellow Start */
  p=await open(seed(),{time,dark}); a=await actLook(p); assert(!a.end,'idle: not quiet'); assert.match(a.label,/Start fast/); assert(!neutral(a.bg),'Start is yellow ('+a.bg+')');
  /* 2a. the selected tab pill is neutral on every tab */
  for(const t of ['today','days','friends','me']){ await p.click('#tabs button[data-tab='+t+']'); await p.waitForTimeout(700); const c=await pill(p); assert(neutral(c),'the '+t+' pill is neutral ('+(dark?'dark':'light')+': '+c+')'); }
  await p.context().close(); }
 ok('the main button is quiet glass while a fast runs (day and night, before and after the goal) and yellow for Start');
 ok('the selected tab is a neutral pill on Today, Days, Friends and Me, in light and dark');

 /* 2b. one switch colour, wherever the switch sits; no black buttons; arrows at the right edge */
 {const p=await open(seed()); await p.click('#tabs button[data-tab=me]'); await p.waitForTimeout(400);
  const r=await p.evaluate(()=>{ const mk=(host)=>{ const s=document.createElement('button'); s.className='sw'; s.setAttribute('aria-checked','true'); s.style.transition='none'; host.appendChild(s); const c=getComputedStyle(s).backgroundColor; s.remove(); return c; };
   const probe=document.createElement('span'); probe.style.color='var(--tint)'; document.body.appendChild(probe); const tint=getComputedStyle(probe).color; probe.remove();
   return {me:mk(document.querySelector('#me')),sheet:mk(document.getElementById('sheet')),tint}; });
  assert.strictEqual(r.me,r.tint,'a switch in Me is the accent colour'); assert.strictEqual(r.sheet,r.me,'a switch in a sheet (the Friends group sheet) is the same colour as in Me');
  for(const f of ['js/app.js','js/friends-ui.js','index.html']) assert(!/btn dark/.test(fs.readFileSync(path.join(root,f),'utf8')),f+' has no black button left');
  assert(!/\.btn\.dark/.test(fs.readFileSync(path.join(root,'css/app.css'),'utf8')),'the black button style is gone');
  /* the Erase sheet: grey Cancel, red hold */
  await p.evaluate(()=>document.querySelector('#me [data-act=erase]').scrollIntoView({block:'center'})); await p.click('#me [data-act=erase]'); await p.waitForTimeout(500);
  const er=await p.evaluate(()=>[...document.querySelectorAll('#sheet .btns .btn')].map(x=>x.className)); assert(/\bsec\b/.test(er[0]),'Cancel on the Erase sheet is the standard grey button ('+er[0]+')'); assert(/\bred\b/.test(er[1]),'the erase button is red');
  /* a row whose arrow follows the label (the Friends group sheet rows) keeps the arrow at the right edge */
  const gap=await p.evaluate(()=>{ const sh=document.getElementById('sheet'), g=document.createElement('div'); g.className='group'; g.innerHTML='<button class="row"><span class="mi"></span><span>Invite friends</span><svg class="chev" viewBox="0 0 8 14"><path d="M1.5 1.5 7 7l-5.5 5.5"/></svg></button>'; sh.appendChild(g); const row=g.firstChild.getBoundingClientRect(), ch=g.querySelector('.chev').getBoundingClientRect(); g.remove(); return row.right-ch.right; });
  assert(gap<=20,'the arrow sits at the right edge of the row ('+gap+' px from it)'); await p.context().close();
  ok('one switch colour in Me and in sheets, no black button, grey Cancel on Erase, row arrows at the right edge');}

 /* 3. the plan sheet */
 for(const lang of ['en','zh']){
  let p=await open(seed({lang})); await p.click('#planBtn'); await p.waitForTimeout(500);
  const rows=()=>p.evaluate(()=>[...document.querySelectorAll('#sheet .plan')].map(r=>{ const d=r.querySelectorAll('.day i'); return {id:r.dataset.id,sub:(r.querySelector('small')||{}).textContent||'',bar:d.length===2?[d[0].getBoundingClientRect().width,d[1].getBoundingClientRect().width]:null,prog:!!r.querySelector('.bar'),dis:r.disabled}; }));
  let rs=await rows(); assert.deepStrictEqual(rs.map(r=>r.id),['13','16','18','20']);
  rs.forEach(r=>{ const f=+r.id; assert(r.bar,'plan '+r.id+' draws its share of the day'); const share=r.bar[0]/(r.bar[0]+r.bar[1]); assert(Math.abs(share-f/24)<.03,'the bar of '+r.id+' fills '+f+'/24 of the day ('+share.toFixed(2)+')');
   assert(r.sub.includes(hhmm(AT+f*H)),'plan '+r.id+' says it ends at '+hhmm(AT+f*H)+' if you start now ("'+r.sub+'")'); assert(lang==='zh'?/到/.test(r.sub):/until/.test(r.sub)); });
  assert.match(await p.textContent('#sheet .lede'),lang==='zh'?/时间按现在开始计算/:/Times are if you start now/);
  /* the times keep up with the clock while the sheet stays open */
  await p.clock.setFixedTime(new Date(AT+7*60000)); await p.waitForTimeout(1300); rs=await rows(); assert(rs[1].sub.includes(hhmm(AT+7*60000+16*H)),'an open sheet keeps its end times current ("'+rs[1].sub+'")');
  /* More plans: One meal has a thin eating piece, the long fasts and Custom keep their own lines */
  await p.click('#sheet [data-act=more]'); await p.waitForTimeout(400); rs=await rows(); const by=id=>rs.filter(r=>r.id===id)[0];
  assert(by('23').bar&&by('23').bar[1]>=4,'One meal still shows its one eating hour'); assert(!by('24').bar&&!by('36').bar,'24 h and 36 h are not drawn as a share of a day'); assert(by('custom').bar,'Custom draws its hours too');
  await p.context().close();
  /* during a fast the times count from its start, and a plan already passed says so */
  p=await open(seed({lang,cur:{start:AT-14*H,goalH:16,planId:'16'}})); await p.click('#planBtn'); await p.waitForTimeout(500); rs=await rows();
  assert(lang==='zh'?/已达成/.test(rs[0].sub):/reached/.test(rs[0].sub),'13 h is already reached at hour 14 ("'+rs[0].sub+'")'); assert(rs[1].sub.includes(hhmm(AT+2*H)),'16 h ends 2 hours from now ("'+rs[1].sub+'")');
  await p.context().close();
  /* a first-timer's locked plans keep their unlock bar and get no day bar */
  p=await open(seed({lang,fasts:[],profile:{fastedBefore:false,safety:false},planId:'13',startedAt:AT-D})); await p.click('#planBtn'); await p.waitForTimeout(500); await p.click('#sheet [data-act=more]'); await p.waitForTimeout(400); rs=await rows();
  assert(rs[0].bar&&!rs[0].dis,'13:11 is open and drawn'); assert(rs[2].bar&&!rs[2].dis,'18:6 (advanced for a first-timer) is drawn too'); const lk=rs.filter(r=>r.dis&&r.id!=='24'&&r.id!=='36'); assert(lk.length>0,'a first-timer has locked daily plans'); lk.forEach(r=>{ assert(!r.bar,'locked plan '+r.id+' has no day bar'); assert(r.prog,'locked plan '+r.id+' keeps its unlock bar'); });
  await p.context().close(); }
 ok('plan rows draw their share of the day and say when the fast would end (English and 中文, idle, fasting, locked, More plans)');

 /* 4. the 320 px phone */
 {let p=await open(seed({lang:'zh',cur:{start:AT-17*H,goalH:16,planId:'16',reached:true}}),{w:320,h:568});
  const cap=await p.evaluate(()=>[...document.querySelectorAll('.ends .cap')].map(e=>parseFloat(getComputedStyle(e).fontSize))); assert(cap.length>=2&&cap.every(v=>v>=11),'START and FINISH captions are 11 px or more ('+cap+')');
  const tip=await p.evaluate(()=>{ const t=document.getElementById('readTip'), r=document.createRange(); r.selectNodeContents(t); const ls=[...r.getClientRects()], rows={}; ls.forEach(x=>{ const k=Math.round(x.top); rows[k]=(rows[k]||0)+x.width; }); return {w:Object.values(rows),fs:parseFloat(getComputedStyle(t).fontSize)}; });
  assert(tip.w.length<2||tip.w[tip.w.length-1]>=tip.fs*4,'the tip does not leave one or two characters alone on its last line ('+tip.w.map(Math.round)+')');
  await p.click('#tabs button[data-tab=days]'); await p.waitForTimeout(700);
  const d=await p.evaluate(()=>[...document.querySelectorAll('.cal-g button:not(.out) .d')].map(e=>{ const r=e.getBoundingClientRect(); return [r.width,r.height]; }));
  assert(d.length>=28&&d.every(x=>Math.abs(x[0]-x[1])<.6),'calendar discs are round on a 320 px phone'); await p.context().close();
  p=await open(seed({lang:'en'}),{w:320,h:568}); const cap2=await p.evaluate(()=>[...document.querySelectorAll('.ends .cap')].map(e=>parseFloat(getComputedStyle(e).fontSize))); assert(cap2.every(v=>v>=11),'English captions too ('+cap2+')'); await p.context().close();
  /* the last setup screen fits */
  for(const lang of ['zh','en']){ const ctx=await b.newContext({viewport:{width:320,height:568},timezoneId:'Asia/Shanghai'}); await ctx.clock.install({time:new Date('2026-11-10T21:40:00+08:00')}); try{ await ctx.clock.resume(); }catch(e){}
   await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
   const q=await ctx.newPage(); q.on('pageerror',e=>errs.push(e.message));
   await q.addInitScript(l=>{ if(!sessionStorage.s){ localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:l,theme:'auto',onboarded:false,prefs:{sound:false,haptics:false,d3:false}})); sessionStorage.s=1; } },lang);
   await q.goto('http://localhost:'+port+'/'); await q.waitForTimeout(1500);
   const key=()=>q.evaluate(()=>{ const s=document.querySelector('#ob .ob-step.on'); return s?[...s.querySelectorAll('[data-act]')].map(x=>x.getAttribute('data-act')+(x.dataset.v?':'+x.dataset.v:'')).join(','):'none'; });
   let k=''; for(let i=0;i<12;i++){ k=await key(); if(/obdone/.test(k)) break;
    if(/obopt:before/.test(k)){ await q.click('#ob .ob-step.on [data-act=obopt][data-v=before]'); await q.click('#ob .ob-step.on [data-act=obnext]'); }
    else if(/obsafe/.test(k)){ const e=await q.$('#ob .ob-step.on [data-act=obsafe][data-v=none]'); await e.scrollIntoViewIfNeeded(); await e.click(); await q.click('#ob .ob-step.on [data-act=obnext]'); }
    else if(/obcityshow/.test(k)){ await q.click('#ob .ob-step.on [data-act=obcityshow]'); await q.waitForTimeout(300); await q.click('#ob .ob-step.on [data-act=obnext]'); }
    else if(/obbodyskip/.test(k)){ await q.click('#ob .ob-step.on [data-act=obbodyskip]'); }
    else { const sec=await q.$('#ob .ob-step.on .btn.sec[data-act=obnext]'); if(sec) await sec.click(); else await q.click('#ob .ob-step.on [data-act=obnext]'); }
    await q.waitForTimeout(900); }
   assert(/obdone/.test(k),'reached the last setup screen ('+k+')'); await q.waitForTimeout(1500);
   const f=await q.evaluate(()=>{ const s=document.querySelector('#ob .ob-step.on'), c=s.querySelector('[data-act=obdone]').getBoundingClientRect(); return {sh:s.scrollHeight,ch:s.clientHeight,bottom:c.bottom,vh:innerHeight}; });
   assert(f.sh<=f.ch+1,lang+': the last setup screen does not scroll on a 320 by 568 phone ('+f.sh+' in '+f.ch+')'); assert(f.bottom<=f.vh,'and its button is on the screen'); await ctx.close(); }
  ok('320 px: captions 11 px or more, a balanced tip, round calendar discs, the last setup screen fits');}

 /* the concept page mirrors it */
 {const c=fs.readFileSync(path.join(root,'concept/index.html'),'utf8');
  assert(/\.act\.end\{/.test(c)&&/classList\.toggle\('end'/.test(c),'the concept page has the quiet end button'); assert(!/tabfill:color-mix\(in srgb,var\(--tint\)/.test(c),'the concept page has no yellow tab pill'); assert(!/#34C759/i.test(c.match(/\.sw\[aria-checked="true"\]\{[^}]*\}/)[0]),'the concept page switch is not green');
  ok('the concept page has the quiet button, the neutral pill and the one switch colour');}

 assert.deepStrictEqual(errs,[],'no page errors'); await b.close(); srv.close(); console.log('quiet-ui tests passed'); process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
