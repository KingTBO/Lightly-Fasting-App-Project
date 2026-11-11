/* The design release from the UI audit (v0.102.0):
   1. Days: a day that ended early is a disc filled as far as the fast got (no orange ring), in the calendar, the legend and the monthly recap
   2. Days: the tapped day opens inside the calendar card with its own Edit or Add button and stays above the tab bar; there is no floating button
   3. Days: the moon beside the total is Today's moon (a pale moon on a night disc)
   4. empty states: Days shows an example week before the first fast; Friends leads with an example group, one sentence, and the button at the bottom
   5. the concept page mirrors it
   (Today at rest, the loaded time, is in tests/firstfast.test.js.)   NODE_PATH=$(npm root -g) node tests/days-detail.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000;
const NOON='2026-11-10T12:00:00+08:00', AT=new Date(NOON).getTime();
/* five fasts on the 5th to the 9th; the one that ended on the 7th stopped after 11 of 16 hours */
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[1,2,3,4,5].map(i=>({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D-(i===3?6*H:0),goalH:16,plan:'16'})),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:AT-30*D},o||{});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(o.time||NOON)); await p.goto('http://localhost:'+port+(o.url||'/')); await p.waitForTimeout(o.wait||900); return p; };
 const tab=async(p,t)=>{ await p.click('#tabs [data-tab='+t+']'); await p.waitForTimeout(700); };
 /* luminance contrast of two rgb() colours */
 const lum=c=>{ const m=c.match(/[\d.]+/g).map(Number).slice(0,3).map(v=>{ v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); }); return .2126*m[0]+.7152*m[1]+.0722*m[2]; };
 const ratio=(a,b)=>{ const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };

 /* 1. the early day */
 for(const dark of [false,true]){ const p=await open(seed(),{dark}); await tab(p,'days');
  const e=await p.evaluate(()=>{ const btn=document.querySelector('#days .cal-g button.early'), d=btn.querySelector('.d'), cs=getComputedStyle(d), root=getComputedStyle(document.documentElement), leg=document.querySelector('#days .legend i.wedge');
    const probe=document.createElement('i'); probe.style.color='var(--disc-u)'; document.body.appendChild(probe); const u=getComputedStyle(probe).color; probe.style.color='var(--tint)'; const t=getComputedStyle(probe).color; probe.remove();
    return {p:parseFloat(btn.style.getPropertyValue('--p')),bg:cs.backgroundImage,border:cs.borderTopColor,color:cs.color,u,t,leg:leg?getComputedStyle(leg).backgroundImage:'',legend:document.querySelector('#days .legend').innerHTML,n:document.querySelectorAll('#days .cal-g button.early').length,label:btn.getAttribute('aria-label')}; });
  assert.strictEqual(e.n,1,'one early day'); assert(Math.abs(e.p-11/16)<.01,'filled as far as the fast got, 11 of 16 hours: '+e.p); assert(/conic-gradient/.test(e.bg),'a part-filled disc'); assert(/rgba\(0, 0, 0, 0\)|transparent/.test(e.border),'no ring: '+e.border);
  assert(ratio(e.color,e.u)>=4.5&&ratio(e.color,e.t)>=4.5,'the date holds 4.5:1 on both the filled and the empty part ('+(dark?'dark':'light')+'): '+ratio(e.color,e.u).toFixed(2)+', '+ratio(e.color,e.t).toFixed(2));
  assert(/conic-gradient/.test(e.leg)&&!/--orange/.test(e.legend),'the legend shows the same part-filled disc, no orange'); assert(/ended early/.test(e.label),'still announced as ended early');
  await p.context().close(); }
 {const css=fs.readFileSync(path.join(root,'css/app.css'),'utf8'); assert(!/\.cal-g button\.early \.d\{border-color:var\(--orange\)\}/.test(css)&&!/\.rp-day\.e\{border/.test(css),'no orange ring left in the calendar or the recap'); assert(/\.rp-day\.e\{background:conic-gradient/.test(css),'the monthly recap draws the same disc');}
 ok('an early day is a disc filled as far as the fast got, light and dark, in the calendar, legend and recap');

 /* 2. the tapped day, inside the calendar card */
 for(const v of [{w:390,h:844},{w:320,h:568,lang:'zh'},{w:360,h:640}]){ const p=await open(seed({lang:v.lang||'en',fasts:seed().fasts.concat([{id:'old',start:AT-40*D-17*H,end:AT-40*D,goalH:16,plan:'16'}])}),v); await tab(p,'days');
  assert(!(await p.$('#dayFab'))&&!(await p.$('.fab')),'no floating button'); assert(!(await p.$('#dayd')),'nothing shown until a date is tapped');
  const fits=async what=>{ await p.waitForTimeout(900); const r=await p.evaluate(()=>{ const d=document.getElementById('dayd').getBoundingClientRect(), t=document.getElementById('tabs').getBoundingClientRect(), s=document.getElementById('days').getBoundingClientRect(), ph=document.getElementById('ph'); return {top:d.top,bottom:d.bottom,lim:Math.min(t.top,s.bottom),phScroll:ph.scrollTop,tabsOff:ph.classList.contains('tabs-off'),inCard:!!document.querySelector('#days .group > .cal + #dayd'),beforeLegend:!!document.querySelector('#days .group > #dayd + .legend')}; });
   assert(r.inCard&&r.beforeLegend,what+': the detail is inside the calendar card, between the grid and the legend'); assert(r.bottom<=r.lim+.5&&r.top>=0,what+': the detail is on screen, above the tab bar: '+JSON.stringify(r)+' at '+v.w+'x'+v.h); assert.strictEqual(r.phScroll,0,'the phone frame itself never scrolls'); assert(!r.tabsOff,what+': the tab bar stays'); };
  await p.click('#days .cal-g button.early'); await fits('early day');
  let t=await p.textContent('#dayd'); assert.match(t,v.lang?/11 小时/:/11 h/); assert.match(t,v.lang?/提前结束/:/ended early/); assert.match(await p.textContent('#dayd [data-act=edit] .dd-e'),v.lang?/^编辑$/:/^Edit$/);
  assert(await p.$eval('#dayd .dd-m',m=>/conic-gradient/.test(getComputedStyle(m).backgroundImage)&&Math.abs(parseFloat(m.style.getPropertyValue('--p'))-11/16)<.01),'the row draws the same part-filled disc');
  const hit=await p.$eval('#dayd [data-act=edit]',e=>e.getBoundingClientRect().height); assert(hit>=44,'the row is a 44 px target: '+hit);
  await p.click('#dayd [data-act=edit]'); await p.waitForSelector('#sheet.open [data-act=fssave]'); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(500);
  await p.click('#days .cal-g button.done'); await fits('full day'); assert(await p.$('#dayd .dd-m.full'),'a full day shows a full disc'); assert.match(await p.textContent('#dayd'),v.lang?/达成目标/:/goal reached/);
  await p.click('#days .cal-g button.today'); await fits('empty day'); t=await p.textContent('#dayd'); assert.match(t,v.lang?/没有记录/:/Nothing logged/); assert(await p.isVisible('#dayd [data-act=addday]')&&await p.isVisible('#dayd [data-act=cheatday]'),'Add a fast and Use a cheat day are buttons in the card');
  const pill=await p.$$eval('#dayd .dd-acts button',bs=>Math.min.apply(null,bs.map(e=>e.getBoundingClientRect().height))); assert(pill>=44,'the buttons are 44 px tall: '+pill);
  await p.click('#dayd [data-act=addday]'); await p.waitForSelector('#sheet.open [data-act=fssave]'); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400);
  await p.click('#days .cal-g button.done'); await p.waitForTimeout(500); assert(await p.$('#dayd')); await p.click('#days [data-act=calprev]'); await p.waitForTimeout(900); assert(!(await p.$('#dayd'))&&!(await p.$('#days .cal-g button.sel')),'leaving the month closes the open day'); await p.click('#days [data-act=calnext]'); await p.waitForTimeout(900);
  await tab(p,'today'); await tab(p,'days'); assert(!(await p.$('#dayd')),'leaving Days clears the chosen day');
  await p.context().close(); }
 ok('the tapped day opens inside the calendar card with Edit or Add, above the tab bar at 390, 360 and 320 px; no floating button');

 /* 3. the month's moon */
 {const p=await open(seed()); await tab(p,'days'); const m=await p.evaluate(()=>{ const s=document.querySelector('#days .tmoon svg'), cs=getComputedStyle(s); return {bg:cs.backgroundColor,stops:[...s.querySelectorAll('#tmG stop')].map(x=>x.getAttribute('stop-color')),label:s.getAttribute('aria-label')}; });
  assert.strictEqual(m.bg,'rgb(14, 20, 48)','a night disc'); assert.deepStrictEqual(m.stops,['#FFFFFF','#EEE8D9','#CFC7B2'],'the pale moon of Today'); assert.match(m.label,/5 of 30 days/); await p.context().close(); ok('the moon beside the total is Today\'s moon on a night disc');}

 /* 4. empty states */
 for(const v of [{w:390,h:844},{w:320,h:568,lang:'zh'}]){ const p=await open(seed({fasts:[],lang:v.lang||'en',profile:{fastedBefore:false,safety:false}}),v); await tab(p,'days');
  const d=await p.evaluate(()=>{ const f=document.querySelector('#days .firstuse'), w=f.querySelector('.fu-wk'); return {hidden:w.getAttribute('aria-hidden'),ex:w.querySelector('.fu-ex').textContent,discs:w.querySelectorAll('.fu-g i').length,full:w.querySelectorAll('.fu-g i.full').length,part:w.querySelectorAll('.fu-g i.part').length,order:[...f.children].map(e=>e.className||e.tagName),ps:f.querySelectorAll('p').length}; });
  assert.strictEqual(d.hidden,'true'); assert.match(d.ex,v.lang?/^示例$/:/^Example$/); assert(d.discs===7&&d.full>=3&&d.part===1,'an example week of discs: '+JSON.stringify(d)); assert.deepStrictEqual(d.order,['fu-wk','P','btn sec'],'example, one sentence, then the button'); assert.strictEqual(d.ps,1);
  await tab(p,'friends');
  const f=await p.evaluate(()=>{ const el=document.getElementById('friends'), demo=el.querySelector('.fr-demo'), cta=el.querySelector('[data-act=frsignin]').getBoundingClientRect(), tabs=document.getElementById('tabs').getBoundingClientRect(), dr=demo.getBoundingClientRect(), h=el.querySelector('.fr-h').getBoundingClientRect();
    return {hidden:demo.getAttribute('aria-hidden'),ex:demo.querySelector('.fr-ex').textContent,controls:demo.querySelectorAll('button,a,[tabindex]').length,people:demo.querySelectorAll('.fr-st').length,seats:demo.querySelectorAll('.fr-seat').length,first:el.firstElementChild.firstElementChild===demo,ps:el.querySelectorAll('.fr-p:not(.fr-fine)').length,rows:el.querySelectorAll('.fr-pts').length,ctaBottom:cta.bottom,tabsTop:tabs.top,demoBottom:dr.bottom,hTop:h.top,scroll:el.scrollHeight-el.clientHeight,gap:tabs.top-cta.bottom,text:el.textContent}; });
  assert.strictEqual(f.hidden,'true','the example is a picture: screen readers skip it'); assert.strictEqual(f.controls,0,'nothing in the example can be tapped'); assert.match(f.ex,v.lang?/^示例$/:/^Example$/); assert(f.people===5&&f.seats===2,'five example people and two open places');
  assert(f.first&&f.demoBottom<=f.hTop,'the example leads'); assert(f.ps===1&&f.rows===0,'one sentence, not three rows'); assert.match(f.text,v.lang?/轻伴里只有朋友功能需要账号。/:/Friends is the only part of Lightly that needs an account\./);
  assert(f.ctaBottom<=f.tabsTop&&f.gap<40,'the button sits at the bottom, just above the tab bar: '+JSON.stringify({b:f.ctaBottom,t:f.tabsTop})); assert(f.scroll<=1,'and the screen does not scroll at '+v.w+'x'+v.h+': '+f.scroll);
  await p.context().close(); }
 ok('Days and Friends lead with an example marked Example, say one sentence, and keep the button at the bottom (390 and 320 px)');

 /* 5. the concept page mirrors it */
 {const c=fs.readFileSync(path.join(root,'concept/index.html'),'utf8');
  assert(!/dyFab|dy-fab/.test(c),'the concept page has no floating button'); assert(/id="dyDet"/.test(c)&&/function dyDetail\(/.test(c),'the concept page opens the tapped day under the grid');
  assert(/\.dy-cal button\.early\{background:conic-gradient/.test(c),'the concept page draws the part-filled disc'); assert(/readBig\.classList\.toggle\('set'/.test(c)&&/put\(readBig,'b',fmtS\(GOAL\),1\)/.test(c),'the concept page shows the loaded time at rest');
  assert(/function demo\(\)/.test(c)&&!/fr-pts/.test(c),'the concept page leads Friends with the example group'); assert(/id="tmG"[^>]*><stop offset="0" stop-color="#FFFFFF"/.test(c),'the concept page has Today\'s moon on Days');
  const p=await open(seed(),{w:1200,h:1000,url:'/concept/',wait:2500}); await p.evaluate(()=>window.refreshToday(true)); await p.waitForTimeout(600);
  const r=await p.evaluate(()=>({k:document.getElementById('readK').textContent,big:document.getElementById('readBig').textContent,set:document.getElementById('readBig').classList.contains('set')})); assert(r.set&&/^\d+:00:00$/.test(r.big)&&/Ready/.test(r.k),'concept at rest: '+JSON.stringify(r));
  await p.context().close(); ok('the concept page mirrors it');}

 assert.deepStrictEqual(errs,[],'no page errors'); await b.close(); srv.close(); console.log('days-detail tests passed'); process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
