/* The strip under the page on iPhone (v0.102.1).
   On an iPhone Home Screen app iOS lays the page out one status bar shorter than the screen (WebKit bug 313800: 894 of 956 points)
   and leaves a strip below it. A page cannot draw there; the strip only takes the page's background colour.
   So that colour must be the colour of the page's bottom edge, whatever is on screen:
   1. Today: the last colour of the sky, by day and by night
   2. the other tabs: the page colour
   3. a sheet, a centred dialog over the dimmed page, the recap pop-up and the recap itself
   4. setup
   5. nothing may be cut off at that edge (the tab bar's shadow ends above it)
   6. everywhere else nothing changes
   The test emulates the short page (a 440 x 894 page that says it is a Home Screen app on a 440 x 956 screen) and compares
   the colour of the strip with the pixels along the page's bottom edge.
   NODE_PATH=$(npm root -g) node tests/short-page.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.png')?'image/png':'text/html'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000;
const seed=(AT,o)=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[1,3,4,5,6,40].map(i=>({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D,goalH:16,plan:'16'})),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:AT-30*D},o||{});
const nums=c=>{ let m=c.match(/[\d.]+/g).map(Number); if(/^color\(srgb/.test(c)) m=m.map((v,i)=>i<3?v*255:v); return m.slice(0,3).map(Math.round); };
const near=(a,b,t)=>a.every((v,i)=>Math.abs(v-b[i])<=t);
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const util=await (await b.newContext()).newPage();
 const open=async(time,o)=>{ o=o||{}; const AT=new Date(time).getTime(); const ctx=await b.newContext({viewport:{width:o.w||440,height:o.h||894},colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  if(!o.browser) await p.addInitScript(()=>{ Object.defineProperty(navigator,'standalone',{get:()=>true}); Object.defineProperty(screen,'height',{get:()=>956}); Object.defineProperty(screen,'width',{get:()=>440}); });
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },o.state||seed(AT,o.seed));
  await p.clock.setFixedTime(new Date(time)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(o.wait||1800); return p; };
 /* the colour of one pixel of the page */
 const px=async(p,x,y)=>{ const buf=await p.screenshot({clip:{x,y,width:1,height:1}}); return util.evaluate(async s=>{ const im=new Image(); im.src='data:image/png;base64,'+s; await im.decode(); const c=document.createElement('canvas'); c.width=c.height=1; const g=c.getContext('2d'); g.drawImage(im,0,0); return Array.from(g.getImageData(0,0,1,1).data).slice(0,3); },buf.toString('base64')); };
 const strip=p=>p.evaluate(()=>({html:getComputedStyle(document.documentElement).backgroundColor,body:getComputedStyle(document.body).backgroundColor,meta:document.querySelector('meta[name=theme-color]').getAttribute('content'),short:document.documentElement.classList.contains('short'),sab:getComputedStyle(document.documentElement).getPropertyValue('--sab').trim()}));
 const cssVar=(p,sel,v)=>p.evaluate(a=>{ const i=document.createElement('i'); i.style.color=getComputedStyle(document.querySelector(a[0])).getPropertyValue(a[1]); document.body.appendChild(i); const c=getComputedStyle(i).color; i.remove(); return c; },[sel,v]);
 /* the strip is one colour with the page's bottom edge, at the left, in the middle (under the tab bar) and at the right */
 const joined=async(p,what,tol)=>{ const s=await strip(p), c=nums(s.html), h=await p.evaluate(()=>innerHeight), w=await p.evaluate(()=>innerWidth);
  assert.deepStrictEqual(nums(s.body),c,what+': html and body agree'); assert.deepStrictEqual(nums(s.meta),c,what+': theme-color agrees');
  for(const x of [3,Math.round(w/2),w-4]){ const e=await px(p,x,h-1); assert(near(e,c,tol||3),what+': the strip '+c+' continues the bottom edge '+e+' at x='+x); } return c; };

 /* 1. Today */
 let p=await open('2026-11-11T17:00:00+08:00'); let s=await strip(p);
 assert(s.short&&s.sab==='0px','the short page is recognised');
 let c=await joined(p,'Today at sunset'); assert.deepStrictEqual(c,nums(await cssVar(p,'#ph','--sky2')),'it is the last colour of the sky'); assert.deepStrictEqual(c,[243,176,124]);
 assert(!near(c,nums(await cssVar(p,'#ph','--sky')),20),'and not the top of the sky, which is what made the bar');
 ok('Today at sunset: the strip is the last colour of the sky and joins the bottom edge');

 /* 3a. a sheet */
 await p.click('#planBtn'); await p.waitForTimeout(900); c=await joined(p,'plan sheet');
 assert.deepStrictEqual(c,nums(await p.evaluate(()=>getComputedStyle(document.getElementById('sheet')).backgroundColor)),'the strip takes the sheet colour');
 await p.click('#sheet [data-act=close]'); await p.waitForTimeout(1000); c=await joined(p,'sheet closed'); assert.deepStrictEqual(c,[243,176,124],'and goes back to the sky when the sheet has left');
 ok('a sheet: the strip is the sheet colour while it is up and the sky again after');

 /* 2. the other tabs, 3b. a centred dialog over the dimmed page */
 await p.click('#tabs button[data-tab=days]'); await p.waitForTimeout(900); c=await joined(p,'Days'); assert.deepStrictEqual(c,nums(await cssVar(p,'html','--bg')),'Days: the page colour');
 await p.click('#days [data-act=calpick]'); await p.waitForTimeout(900); const dim=await joined(p,'month picker',8);
 assert(dim.every((v,i)=>v<c[i]-30),'the strip dims with the page behind a centred dialog: '+dim);
 await p.evaluate(()=>document.getElementById('scrim').click()); await p.waitForTimeout(1000); assert.deepStrictEqual(await joined(p,'dialog closed'),c);
 await p.click('#tabs button[data-tab=me]'); await p.waitForTimeout(900); assert.deepStrictEqual(await joined(p,'Me'),c);
 await p.click('#tabs button[data-tab=today]'); await p.waitForTimeout(900); assert.deepStrictEqual(await joined(p,'back on Today'),[243,176,124]);
 ok('Days and Me: the page colour; behind a centred dialog the strip dims with the page');

 /* 5. the tab bar's shadow ends above the edge */
 const sh=await p.evaluate(()=>{ const t=document.getElementById('tabs'), m=getComputedStyle(t).boxShadow.split(/,(?![^(]*\))/).filter(x=>!/inset/.test(x)).map(x=>x.replace(/(rgba?|color)\([^)]*\)/,'').match(/-?[\d.]+px/g).map(parseFloat)); return {gap:innerHeight-t.getBoundingClientRect().bottom,reach:Math.max.apply(null,m.map(v=>v[1]+v[2]+(v[3]||0)))}; });
 assert(sh.reach<=sh.gap,'the shadow reaches '+sh.reach+' px below the bar, the edge is '+sh.gap+' px below it');
 ok('the tab bar shadow ends above the bottom edge');
 await p.context().close();

 /* 1. by night and at noon, in dark mode too */
 p=await open('2026-11-11T23:00:00+08:00'); assert.deepStrictEqual(await joined(p,'Today at night'),[26,34,80]); await p.context().close();
 p=await open('2026-11-11T12:00:00+08:00',{dark:true}); c=await joined(p,'Today at noon, dark'); assert.deepStrictEqual(c,nums(await cssVar(p,'#ph','--sky2')));
 await p.click('#tabs button[data-tab=days]'); await p.waitForTimeout(900); assert.deepStrictEqual(await joined(p,'Days, dark'),nums(await cssVar(p,'html','--bg'))); await p.context().close();
 ok('night, noon and dark mode');

 /* 3c. the recap pop-up and the recap */
 const AT2=new Date('2026-11-02T09:00:00+08:00').getTime();
 const oct=[3,6,9,12].map(d=>{ const e=new Date('2026-10-'+String(d).padStart(2,'0')+'T12:00:00+08:00').getTime(); return {id:'rc'+d,start:e-17*H,end:e,goalH:16,plan:'16'}; });
 p=await open('2026-11-02T09:00:00+08:00',{state:seed(AT2,{fasts:oct,profile:{fastedBefore:false,safety:false,care:[]}}),wait:3200});
 if(await p.$('#sheet.open .rpop')){
  assert.deepStrictEqual(await joined(p,'recap pop-up'),[14,20,48],'the night-sky sheet ends in its darkest blue');
  await p.click('#sheet [data-act=recappop]'); await p.waitForSelector('#report:not([hidden])',{timeout:6000}); await p.waitForTimeout(2600);
  assert.deepStrictEqual(await joined(p,'recap, first page'),[14,20,48]);
  await p.evaluate(()=>{ const sc=document.getElementById('rpScroll'); sc.scrollTop=sc.scrollHeight; }); await p.waitForTimeout(1200);
  c=await joined(p,'recap, last page',4); assert.deepStrictEqual(c,nums(await p.evaluate(()=>getComputedStyle(document.querySelector('#report .rp-end')).backgroundColor)),'the last page of the recap is yellow to the bottom');
  ok('the recap pop-up and the recap: night blue, then yellow on the last page');
 } else assert.fail('the recap pop-up did not open');
 await p.context().close();

 /* 4. setup */
 p=await open('2026-11-11T12:00:00+08:00',{state:{v:1,lang:'en'}}); c=await joined(p,'setup');
 assert.deepStrictEqual(c,nums(await p.evaluate(()=>getComputedStyle(document.querySelector('.ob-step.on')).backgroundColor)));
 /* the sky that arrives on the last setup screen is a layer (.dawnbg) over the page colour: the strip follows its last colour as it fades in */
 await p.evaluate(()=>{ const d=document.createElement('div'); d.className='dawnbg'; d.style.cssText='position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:1;background:linear-gradient(180deg,#D98A7B 0%,#F0B48C 55%,#F7D2A6 100%)'; document.querySelector('.ob-step.on').appendChild(d); window.dispatchEvent(new Event('resize')); });
 await p.waitForTimeout(300); assert.deepStrictEqual(await joined(p,'setup sky'),[247,210,166]);
 await p.evaluate(()=>{ document.querySelector('.ob-step.on .dawnbg').style.opacity='.5'; window.dispatchEvent(new Event('resize')); }); await p.waitForTimeout(300);
 const half=await joined(p,'setup sky, half way'); assert(near(half,c.map((v,i)=>(v+[247,210,166][i])/2),2),'half way in, the strip is half way too: '+half);
 ok('setup: the strip is the setup page colour, and follows the sky as it arrives on the last screen'); await p.context().close();

 /* 6. everywhere else nothing changes: in Safari, and on a Home Screen app that fills its screen */
 p=await open('2026-11-11T17:00:00+08:00',{browser:true}); s=await strip(p);
 assert(!s.short,'not short in a browser tab'); assert.deepStrictEqual(nums(s.html),nums(await cssVar(p,'#ph','--sky')),'the background is the top of the sky as before'); await p.context().close();
 p=await open('2026-11-11T17:00:00+08:00',{h:956}); s=await strip(p);
 assert(!s.short,'a Home Screen app that fills the screen is left alone'); assert.deepStrictEqual(nums(s.html),nums(await cssVar(p,'#ph','--sky'))); await p.context().close();
 ok('a browser tab and a full-height Home Screen app are unchanged');

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close(); srv.close(); console.log('\nshort-page: all passed'); })().catch(e=>{ console.error(e); process.exit(1); });
