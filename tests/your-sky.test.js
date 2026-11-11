/* Your sky (v0.106.0): every day with a finished fast lights a star in the season's star sign.
   1. A card on the Days tab, under the calendar: the sign and how many stars are lit, with a small picture of the same sky.
   2. The sheet: the sign's figure, one star for each day, open places for the rest, and the season's own dates.
   3. The rule: any finished fast counts (ended early too), a day counts once, a star looks the same for every length of fast,
      a day outside the season or a fast kept in Ramadan mode lights nothing, and nothing ever says how many are left.
   4. A tap on a star names its day; the same tap clears it.
   5. After ten days the figure is whole and more days add small stars.
   6. Earlier skies can be looked at, back to the season of the first fast.
   7. With no fast this season it says so kindly. Not shown in Care mode, with the Ramadan plan, or before the first fast.
   8. 中文, dark, and a 320 px phone.
   9. The concept page shows the same sky from the sample days of its calendar.
   NODE_PATH=$(npm root -g) node tests/your-sky.test.js   (SHOTS=<dir> also saves pictures) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const Z=require('../js/zodiac.js');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.png')?'image/png':'text/html'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000; const SHOTS=process.env.SHOTS; if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
const NOW='2026-11-11T09:00:00+08:00', AT=new Date(NOW).getTime();   /* a Wednesday in Scorpio (Oct 23 to Nov 21); Libra is the season before */
/* a fast that ended at 08:00 i days ago */
const fast=(i,o)=>Object.assign({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D-H,goalH:16,plan:'16'},o||{});
const seed=(fasts,o)=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
  fasts:fasts,flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:AT-60*D},o||{});
const SEVEN=[1,3,4,5,6,8,10], LIBRA=[25,27,30,31,33];   /* Nov 10, 8, 7, 6, 5, 3, 1 and Oct 17, 15, 12, 11, 9 */
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:SHOTS?2:1,colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(AT)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1500); await p.click('#tabs [data-tab=days]'); await p.waitForTimeout(700); return p; };
 const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}); };
 const card=p=>p.evaluate(()=>{ const c=document.querySelector('#days .skyc'); if(!c) return null; const r=c.getBoundingClientRect(), cal=document.querySelector('#days .cal').getBoundingClientRect(), avg=document.querySelector('#days .avgh').getBoundingClientRect(), th=c.querySelector('.skyc-th');
  return {title:c.querySelector('b').textContent,sub:c.querySelector('small').textContent,h:Math.round(r.height),l:Math.round(r.left),r:Math.round(innerWidth-r.right),under:r.top>=cal.bottom,over:r.bottom<=avg.top,pop:c.getAttribute('aria-haspopup'),lit:th.querySelectorAll('.th-s').length,open:th.querySelectorAll('.th-o').length,hid:th.getAttribute('aria-hidden'),sw:document.documentElement.scrollWidth}; });
 const sky=p=>p.evaluate(()=>{ const s=document.getElementById('sheet'), k=s.querySelector('.my-sky'); if(!k) return null; const kr=k.getBoundingClientRect(), sr=s.getBoundingClientRect(), art=k.querySelector('.fr-art');
  const st=[...k.querySelectorAll('.my-st')].map(x=>{ const r=x.getBoundingClientRect(), g=x.querySelector('svg').getBoundingClientRect(); return {k:x.dataset.k,sm:x.classList.contains('sm'),on:x.getAttribute('aria-pressed'),label:x.getAttribute('aria-label'),w:Math.round(r.width),h:Math.round(r.height),gw:Math.round(g.width*10)/10,x:r.left+r.width/2-kr.left,y:r.top+r.height/2-kr.top,inside:r.left>=kr.left-.5&&r.right<=kr.right+.5&&r.top>=kr.top-.5&&r.bottom<=kr.bottom+.5,fill:getComputedStyle(x.querySelector('svg')).fill}; });
  return {title:s.querySelector('h3').textContent,lede:s.querySelector('.lede').textContent,aria:k.getAttribute('aria-label'),cap:k.querySelector('.fr-cap b').textContent,dates:k.querySelector('.fr-cap span').textContent,open:k.querySelectorAll('.fr-ln circle').length,stars:st,
   lnB:(document.querySelector('#skyLn b')||{}).textContent,lnS:(document.querySelector('#skyLn small')||{}).textContent||'',live:document.getElementById('skyLn').getAttribute('aria-live'),
   nav:[...s.querySelectorAll('.sky-nav button')].map(x=>({d:x.dataset.d,dis:x.disabled,label:x.getAttribute('aria-label'),w:Math.round(x.getBoundingClientRect().width)})),
   lit:k.style.getPropertyValue('--lit'),ks:+k.style.getPropertyValue('--ks'),kw:kr.width,kh:kr.height,inSheet:kr.left>=sr.left+15&&kr.right<=sr.right-15,art:art?{rd:art.classList.contains('rd'),op:+getComputedStyle(art).opacity,src:art.getAttribute('data-art')}:null,sw:document.documentElement.scrollWidth,text:s.textContent}; });
 const openSky=async p=>{ await p.click('#days .skyc'); await p.waitForSelector('#sheet.open .my-sky'); await p.waitForFunction(()=>{ const a=document.querySelector('#sheet .my-sky .fr-art'); return !a||a.classList.contains('rd'); },null,{timeout:15000}); await p.waitForTimeout(900); };
 const NEVER=/to go|left|remaining|more to|missed|behind|streak|goal|kg|weight|calor/i;

 /* 1. the card on Days */
 let p=await open(seed(SEVEN.concat(LIBRA).map(i=>fast(i)))); let c=await card(p);
 assert(c,'the card is on Days'); assert.strictEqual(c.title,'Your sky'); assert.strictEqual(c.sub,'Scorpio · 7 stars lit');
 assert(c.h>=44&&c.l===16&&c.r===16&&c.under&&c.over,'a full-width card between the calendar and Average fast: '+JSON.stringify(c)); assert.strictEqual(c.pop,'dialog');
 assert(c.lit===7&&c.open===3&&c.hid==='true','its small picture shows the same seven stars and three open places: '+JSON.stringify(c));
 await p.evaluate(()=>document.querySelector('#days .skyc').scrollIntoView({block:'center'})); await p.waitForTimeout(300); await shot(p,'sky-card');
 ok('Days: "Your sky, Scorpio · 7 stars lit" sits under the calendar with a small picture of the sky');

 /* 2. the sheet */
 await openSky(p); let s=await sky(p);
 assert.strictEqual(s.title,'Your sky'); assert.strictEqual(s.lede,'Every day you finish a fast lights a star. Any fast counts, whatever its length.');
 assert.strictEqual(s.cap,'Scorpio'); assert.strictEqual(s.dates,'Oct 23 – Nov 21, 2026'); assert.strictEqual(s.stars.length,7); assert.strictEqual(s.open,3,'three places still open');
 assert.strictEqual(s.lnB,'7 stars lit'); assert.strictEqual(s.lnS,'One for each day with a fast. Tap a star to see its day.'); assert.strictEqual(s.live,'polite');
 assert.match(s.aria,/^Scorpio sky, Oct 23 – Nov 21, 2026\. 7 stars lit, one for each day with a fast\.$/);
 assert.deepStrictEqual(s.stars.map(x=>x.k),['2026-11-01','2026-11-03','2026-11-05','2026-11-06','2026-11-07','2026-11-08','2026-11-10'],'the days in order, oldest first');
 { const slots=Z.layout(Z.signAt('2026-11-11'),0).slots; s.stars.forEach((x,i)=>assert(Math.abs(x.x-slots[i][0])<1&&Math.abs(x.y-slots[i][1])<1,'star '+(i+1)+' sits on slot '+(i+1)+' of the sign: '+x.x+','+x.y)); }
 assert(s.stars.every(x=>x.w>=44&&x.h>=44&&x.inside&&x.on==='false'),'every star is a 44 px button inside the panel: '+JSON.stringify(s.stars.map(x=>[x.w,x.h,x.inside])));
 assert.strictEqual(s.stars[0].label,'Sunday, November 1'); assert(s.inSheet&&s.kw===358&&Math.round(s.kh)===400,'the panel is the Friends sky\'s size: '+s.kw+' x '+s.kh);
 assert(s.art&&s.art.rd&&s.art.src==='img/sky/scorpio.webp'&&Math.abs(s.art.op-.42*.7)<.02&&s.lit==='0.7','the figure shows as far as the stars are lit: '+JSON.stringify(s.art)+' '+s.lit);
 assert(!s.nav.length||s.nav.length===2,'arrows come as a pair'); assert(!NEVER.test(s.text),'nothing about what is left, streaks, goals or weight: '+s.text);
 await shot(p,'sky-sheet');
 ok('the sheet: Scorpio with its dates, seven stars on the figure\'s places, three still open, and the figure showing through as far as it is lit');

 /* 4. a tap names the day */
 await p.click('#sheet .my-st[data-k="2026-11-05"]'); await p.waitForTimeout(300); s=await sky(p);
 assert.strictEqual(s.lnB,'Thursday, November 5'); assert.strictEqual(s.lnS,'16 h'); assert.deepStrictEqual(s.stars.filter(x=>x.on==='true').map(x=>x.k),['2026-11-05']); await shot(p,'sky-star');
 await p.click('#sheet .my-st[data-k="2026-11-08"]'); await p.waitForTimeout(300); s=await sky(p); assert.strictEqual(s.lnB,'Sunday, November 8'); assert.deepStrictEqual(s.stars.filter(x=>x.on==='true').map(x=>x.k),['2026-11-08']);
 await p.click('#sheet .my-st[data-k="2026-11-08"]'); await p.waitForTimeout(300); s=await sky(p); assert.strictEqual(s.lnB,'7 stars lit','the same tap clears it'); assert(s.stars.every(x=>x.on==='false'));
 ok('a tap on a star names its day and its hours, another star moves it, the same tap clears it');

 /* 6. earlier skies */
 assert.deepStrictEqual(s.nav.map(x=>[x.d,x.dis,x.label]),[['-1',false,'Earlier sky'],['1',true,'Later sky']]); assert(s.nav.every(x=>x.w>=44));
 await p.click('#sheet [data-act=skygo][data-d="-1"]'); await p.waitForTimeout(900); s=await sky(p);
 assert.strictEqual(s.cap,'Libra'); assert.strictEqual(s.dates,'Sep 23 – Oct 22, 2026'); assert.strictEqual(s.lnB,'5 stars lit'); assert.deepStrictEqual(s.stars.map(x=>x.k),['2026-10-09','2026-10-11','2026-10-12','2026-10-15','2026-10-17']);
 assert.deepStrictEqual(s.nav.map(x=>x.dis),[true,false],'Libra holds the first fast, so there is nothing earlier'); assert.strictEqual(await p.evaluate(()=>document.activeElement.getAttribute('data-d')),'1','focus moves to the arrow that still works');
 await shot(p,'sky-earlier');
 await p.click('#sheet [data-act=skygo][data-d="1"]'); await p.waitForTimeout(900); s=await sky(p); assert.strictEqual(s.cap,'Scorpio'); assert.strictEqual(s.lnB,'7 stars lit');
 await p.click('#sheet [data-act=close]'); await p.waitForTimeout(600); assert(!(await p.evaluate(()=>document.getElementById('sheet').classList.contains('open'))),'it closes'); await p.context().close();
 ok('earlier skies: back to Libra, the season of the first fast, and forward again');

 /* 3. the rule */
 { const list=[fast(1,{goalH:13,start:AT-D-14*H}),fast(3,{goalH:20,start:AT-3*D-21*H}),fast(4,{start:AT-4*D-6*H}),   /* 13 h, 20 h, and one that ended early after 5 h */
    fast(5),{id:'f5b',start:AT-5*D+4*H,end:AT-5*D+12*H,goalH:16,plan:'16'},                                        /* two fasts that end on the same day */
    fast(6,{plan:'ramadan'}),fast(20)];                                                                           /* a Ramadan fast, and Oct 22: the last day of Libra */
   p=await open(seed(list)); c=await card(p); assert.strictEqual(c.sub,'Scorpio · 4 stars lit'); await openSky(p); s=await sky(p);
   assert.deepStrictEqual(s.stars.map(x=>x.k),['2026-11-06','2026-11-07','2026-11-08','2026-11-10'],'ended early counts, a day counts once, Ramadan and the day before the season do not: '+JSON.stringify(s.stars.map(x=>x.k)));
   assert(new Set(s.stars.map(x=>x.gw+'|'+x.fill+'|'+x.w)).size===1,'a star looks the same for a 5 h, a 13 h, a 16 h and a 20 h fast: '+JSON.stringify(s.stars.map(x=>[x.gw,x.fill])));
   await p.click('#sheet .my-st[data-k="2026-11-06"]'); await p.waitForTimeout(300); s=await sky(p); assert.strictEqual(s.lnS,'16 h, 8 h','the day with two fasts lists both');
   assert.strictEqual(s.nav.length,2); await p.click('#sheet [data-act=skygo][data-d="-1"]'); await p.waitForTimeout(900); s=await sky(p); assert.strictEqual(s.cap,'Libra'); assert.deepStrictEqual(s.stars.map(x=>x.k),['2026-10-22'],'Oct 22 belongs to Libra'); await p.context().close(); }
 ok('the rule: any finished fast, once a day, the same star for every length; not a Ramadan fast, not a day outside the season');

 /* 5. more than ten */
 { const days=[]; for(let i=1;i<=19;i++) if(i!==7) days.push(i);   /* Oct 23 to Nov 10 without Nov 4: 18 days */
   p=await open(seed(days.map(i=>fast(i)))); c=await card(p); assert.strictEqual(c.sub,'Scorpio · 18 stars lit'); assert(c.lit===18&&c.open===0); await openSky(p); s=await sky(p);
   const big=s.stars.filter(x=>!x.sm), small=s.stars.filter(x=>x.sm); assert(big.length===10&&small.length===8&&s.open===0,'ten on the figure and eight small ones: '+big.length+' '+small.length);
   assert.strictEqual(s.lnB,'18 stars lit'); assert.strictEqual(s.lnS,'The whole figure is lit. More days add small stars.'); assert(Math.abs(s.art.op-.42)<.02&&s.lit==='1','the whole figure shows');
   assert(small.every(x=>x.w>=28&&x.h>=28&&x.inside&&x.gw<big[0].gw/2),'small stars are smaller, still tappable and inside: '+JSON.stringify(small.map(x=>[x.w,x.gw,x.inside])));
   small.forEach(a=>{ big.forEach(g=>assert(Math.hypot(a.x-g.x,a.y-g.y)>=34,'a small star keeps clear of the figure\'s stars')); small.forEach(o=>{ if(o!==a) assert(Math.hypot(a.x-o.x,a.y-o.y)>=28,'small stars keep clear of each other'); }); assert(!(a.x<176&&a.y>334),'and of the caption'); });
   assert(!s.nav.length,'one season only, so no arrows'); assert(!NEVER.test(s.text)); await p.click('#sheet .my-st.sm'); await p.waitForTimeout(300); s=await sky(p); assert.strictEqual(s.lnB,'Monday, November 2','the eleventh day'); await shot(p,'sky-whole'); await p.context().close(); }
 ok('after ten days the figure is whole and each more day adds a small star, clear of everything else');

 /* 7. nothing yet, and where it is not shown */
 p=await open(seed(LIBRA.map(i=>fast(i)))); c=await card(p); assert.strictEqual(c.sub,'Scorpio · each fast lights a star'); assert(c.lit===0&&c.open===10); await openSky(p); s=await sky(p);
 assert.strictEqual(s.lnB,'No stars yet'); assert.strictEqual(s.lnS,'Your next fast lights the first one.'); assert(s.stars.length===0&&s.open===10&&s.art.op===0,'ten open places and no figure yet'); assert(!NEVER.test(s.text));
 await p.click('#sheet [data-act=skygo][data-d="-1"]'); await p.waitForTimeout(900); s=await sky(p); assert.strictEqual(s.lnB,'5 stars lit'); await p.context().close();
 p=await open(seed([fast(1),fast(70)])); await openSky(p); await p.click('#sheet [data-act=skygo][data-d="-1"]'); await p.waitForTimeout(900); s=await sky(p); assert.strictEqual(s.cap,'Libra'); assert.strictEqual(s.lnB,'A quiet season'); assert.strictEqual(s.lnS,'','a past season without a fast gets no advice'); await p.context().close();
 p=await open(seed(SEVEN.map(i=>fast(i)),{profile:{fastedBefore:true,safety:true,care:{preg:true}}})); assert.strictEqual(await card(p),null,'not in Care mode'); await p.context().close();
 p=await open(seed(SEVEN.map(i=>fast(i)),{planId:'ramadan',ramadanPreview:true})); assert.strictEqual(await card(p),null,'not with the Ramadan plan'); await p.context().close();
 p=await open(seed([])); assert.strictEqual(await card(p),null,'not before the first fast'); await p.context().close();
 ok('no fast this season: "No stars yet", kindly; a past empty season is "A quiet season"; not shown in Care mode, with the Ramadan plan, or before the first fast');

 /* 8. 中文, dark, 320 px */
 p=await open(seed(SEVEN.concat(LIBRA).map(i=>fast(i)),{lang:'zh'}),{dark:true}); c=await card(p); assert.strictEqual(c.title,'你的星空'); assert.strictEqual(c.sub,'天蝎座 · 已点亮 7 颗星'); await openSky(p); s=await sky(p);
 assert.strictEqual(s.title,'你的星空'); assert.strictEqual(s.cap,'天蝎座'); assert.strictEqual(s.dates,'2026年 10月23日 – 11月21日'); assert.strictEqual(s.lnB,'已点亮 7 颗星'); assert(/每个有断食的日子一颗/.test(s.lnS)); assert(!/[A-Za-z]{3,}/.test(s.text),'no English left: '+s.text);
 assert.strictEqual(s.stars[0].fill,'rgb(255, 201, 60)','the dark sky has the brighter gold'); assert(Math.abs(s.art.op-.55*.7)<.02); assert.deepStrictEqual(s.nav.map(x=>x.label),['更早的星空','更近的星空']); await shot(p,'sky-zh-dark'); await p.context().close();
 p=await open(seed(SEVEN.concat(LIBRA).map(i=>fast(i))),{w:320,h:640}); c=await card(p); assert(c.sw<=320&&c.h>=44,'320 px: the card fits: '+JSON.stringify(c)); await openSky(p); s=await sky(p);
 assert(s.sw<=320&&s.kw<=288.5&&Math.abs(s.ks-s.kw/358)<.002&&s.inSheet,'320 px: the whole board scales down together: '+JSON.stringify([s.sw,s.kw,s.ks]));
 assert(s.stars.every(x=>x.inside)&&s.stars[0].fill==='rgb(240, 164, 0)','320 px: every star is inside, in the light sky\'s deeper gold'); await shot(p,'sky-320'); await p.context().close();
 ok('中文, the dark sky, and a 320 px phone');

 /* 9. the concept page */
 { const ctx=await b.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce',deviceScaleFactor:SHOTS?2:1,timezoneId:'Asia/Shanghai'}); p=await ctx.newPage(); p.on('pageerror',e=>errs.push('concept: '+e.message));
   await p.clock.setFixedTime(new Date(AT)); await p.goto('http://localhost:'+port+'/concept/'); await p.waitForTimeout(1500); await p.click('#ph .tabs>span:nth-of-type(2)'); await p.waitForTimeout(1500);
   if(await p.evaluate(()=>document.getElementById('dyRPop').classList.contains('open'))){ await p.click('#dyRPopLater'); await p.waitForTimeout(700); }
   let k=await p.evaluate(()=>{ const c=document.getElementById('skyCard'), s=LightlySky.sample(), cal=[...document.querySelectorAll('#dyCal button.done,#dyCal button.early')].map(x=>'2026-11-'+String(x.dataset.d).padStart(2,'0')); return {title:c.querySelector('b').textContent,sub:c.querySelector('small').textContent,h:c.getBoundingClientRect().height,days:s.days,cal:cal,sign:s.se.sign.k,under:c.getBoundingClientRect().top>=document.getElementById('dyKey').getBoundingClientRect().bottom,over:c.getBoundingClientRect().bottom<=document.getElementById('dyAvgH').getBoundingClientRect().top}; });
   assert.strictEqual(k.title,'Your sky'); assert.strictEqual(k.sign,'scorpio'); assert.strictEqual(k.sub,'Scorpio · '+k.days.length+' stars lit'); assert(k.h>=44&&k.under&&k.over,'concept: the card sits between the calendar and Average fast: '+JSON.stringify(k));
   assert.deepStrictEqual(k.days.filter(d=>d>='2026-11-01'),k.cal,'concept: this month\'s stars are the days its calendar shows filled or part filled');
   await p.evaluate(()=>document.getElementById('skyCard').scrollIntoView({block:'center'})); await p.click('#skyCard'); await p.waitForSelector('#mySky.open .my-sky'); await p.waitForFunction(()=>{ const a=document.querySelector('#mySky .fr-art'); return a&&a.classList.contains('rd'); },null,{timeout:15000}); await p.waitForTimeout(800);
   let m=await p.evaluate(()=>{ const s=document.getElementById('mySky'), kk=s.querySelector('.my-sky'), ph=document.getElementById('ph').getBoundingClientRect(), r=kk.getBoundingClientRect(), st=[...kk.querySelectorAll('.my-st')]; return {t:s.querySelector('h4').textContent,note:s.querySelector('.ps-note').textContent,cap:kk.querySelector('.fr-cap b').textContent,dates:kk.querySelector('.fr-cap span').textContent,n:st.length,big:st.filter(x=>!x.classList.contains('sm')).length,inside:r.left>=ph.left+15&&r.right<=ph.right-15&&r.bottom<=ph.bottom,starsIn:st.every(x=>{ const q=x.getBoundingClientRect(); return q.left>=r.left-.5&&q.right<=r.right+.5&&q.top>=r.top-.5&&q.bottom<=r.bottom+.5; }),ln:document.getElementById('mskLn').textContent,art:kk.querySelector('.fr-art').getAttribute('data-art'),text:s.textContent}; });
   assert.strictEqual(m.t,'Your sky'); assert.strictEqual(m.note,'Every day you finish a fast lights a star. Any fast counts, whatever its length.'); assert.strictEqual(m.cap,'Scorpio'); assert.strictEqual(m.dates,'Oct 23 – Nov 21, 2026');
   assert(m.n===k.days.length&&m.big===Math.min(10,m.n)&&m.inside&&m.starsIn,'concept: one star for each sample day, inside the phone: '+JSON.stringify(m)); assert(m.ln.indexOf(k.days.length+' stars lit')===0); assert.strictEqual(m.art,'../img/sky/scorpio.webp'); assert(!NEVER.test(m.text));
   if(SHOTS) await (await p.$('#ph')).screenshot({path:path.join(SHOTS,'sky-concept.png')});
   await p.click('#mySky .my-st'); await p.waitForTimeout(300); assert.match(await p.textContent('#mskLn b'),/^Friday, October 23$/); await p.click('#mskClose'); await p.waitForTimeout(600); assert(!(await p.evaluate(()=>document.getElementById('mySky').classList.contains('open'))),'concept: it closes');
   const html=fs.readFileSync(path.join(root,'concept/index.html'),'utf8'); assert(/\.\.\/js\/zodiac\.js/.test(html),'concept: the signs come from the app\'s own zodiac.js'); assert(/你的星空/.test(html)&&/已点亮/.test(html),'concept: 中文 is there'); await ctx.close(); }
 ok('the concept page shows the same sky, lit by the sample days of its own calendar');

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close(); srv.close(); console.log('\nyour sky: all passed');
})().catch(e=>{ console.error(e); process.exit(1); });
