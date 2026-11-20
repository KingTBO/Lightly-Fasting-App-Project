/* The phone's Back (Android's back button or gesture, the iPhone's swipe from the left edge) steps back through the app instead of leaving it:
   a sheet closes first, then the recap or an open group, then the tab goes back to Today; only Back on Today (or the first step of setup) leaves.
   Closing something with its own button takes its history entry away again, so Back is never spent on nothing. Sheets with their own way back
   (the time-off sheets, the long-fast warning) step back like their Back button. Setup steps back one step at a time. On iPhone the layer goes at once.
   NODE_PATH=$(npm root -g) node tests/back.test.js   (about 40 seconds) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium,devices}=require('playwright'); const root=path.join(__dirname,'..'); const H=3600000,D=86400000;
const mock=http.createServer((q,r)=>{ r.setHeader('Access-Control-Allow-Origin','*'); r.setHeader('Access-Control-Allow-Headers','*'); r.setHeader('Access-Control-Allow-Methods','*'); if(q.method==='OPTIONS'){ r.writeHead(204); return r.end(); }
  let body=''; q.on('data',d=>body+=d); q.on('end',()=>{ const u=q.url, out=(c,o)=>{ r.writeHead(c,{'Content-Type':'application/json'}); r.end(JSON.stringify(o)); };
    if(u.startsWith('/auth/v1/settings')) return out(200,{external:{google:true,email:true}});
    if(u.startsWith('/auth/v1/user')) return out(200,{id:'uid-me',email:'me@example.com'});
    if(u.startsWith('/rest/v1/lightly_state')) return out(200,[]);
    if(u.startsWith('/rest/v1/profiles')) return out(200,[{display_name:'Maya',avatar:'lantern'}]);
    const m=/^\/rest\/v1\/rpc\/(\w+)/.exec(u); if(!m) return out(404,{});
    if(m[1]==='my_groups') return out(200,mock.groups);
    if(m[1]==='group_board'||m[1]==='group_today') { const R=(uid,n,a,me)=>({user_id:uid,display_name:n,avatar:a,is_me:!!me,status:'fasting',progress:.4,goal_hours:16,cheered_by_me:false,cheers_received:0}); return out(200,[R('uid-me','Maya','lantern',1),R('u-mei','Mei','crescent'),R('u-arj','Arjun','sunrise')]); }
    if(m[1]==='current_invite') return out(200,[{code:'K7QM4XD9',expires_at:new Date(Date.now()+6*24*H).toISOString(),member_count:1,max_members:10}]);
    out(200,null); }); });
const srv=http.createServer((q,r)=>{ let p=path.join(root,decodeURIComponent(q.url.split('?')[0])); if(p.endsWith('/')) p+='index.html'; fs.readFile(p,(e,d)=>{ if(e){ r.writeHead(404); r.end(); } else{ r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'}); r.end(d); } }); });
const ok=n=>console.log('ok -',n);
const NOON='2026-11-05T12:00:00+08:00', AT=new Date(NOON).getTime();
/* five fasts last month (so Days has a recap) and three this month */
const seed=o=>Object.assign({v:1,lang:'en',theme:'light',onboarded:true,profile:{fastedBefore:true,safety:false,care:[],careOff:null},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[12,14,15,16,17,1,2,3].map((i,k)=>({id:'f'+k,start:AT-i*D-17*H,end:AT-i*D,goalH:16,plan:'16'})),flex:{bank:1,mon:null,used:[]},off:[],unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false,recapPop:'2026-10'},ramadanPreview:false,startedAt:AT-60*D},o||{});
(async()=>{ await new Promise(r=>mock.listen(0,r)); await new Promise(r=>srv.listen(0,r));
  const murl='http://localhost:'+mock.address().port, base='http://localhost:'+srv.address().port; const b=await chromium.launch(); const errs=[];
  /* a page that opens after another one, so Back on Today has somewhere to go */
  async function open(s,o){ o=o||{}; const ctx=await b.newContext(Object.assign({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'},o.dev||{}));
    await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:o.auth?`window.LIGHTLY_CLOUD={url:'${murl}',key:'anon'};`:'window.LIGHTLY_CLOUD=null;'}));
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(([s,a])=>{ if(location.pathname.indexOf('before')>=0) return; if(!sessionStorage.s){ localStorage.setItem('lightly:v1',s); if(a){ localStorage.setItem('lightly:auth',a); localStorage.setItem('lightly:friends',JSON.stringify({tip:1})); } sessionStorage.s=1; } },
      [JSON.stringify(s),o.auth?JSON.stringify({access:'tok-1',refresh:'r',exp:Math.floor(Date.now()/1000)+3600,email:'me@example.com',uid:'uid-me',photo:'',name:''}):'']);
    if(!o.auth) await p.clock.setFixedTime(new Date(NOON));
    await p.goto(base+'/before.html'); await p.goto(base+'/'); await p.waitForTimeout(900); return p; }
  const st=p=>p.evaluate(()=>({d:history.state&&history.state.lightly,len:history.length,tab:['today','days','friends','me'].filter(k=>document.getElementById(k).classList.contains('on'))[0],
    sheet:document.getElementById('sheet').classList.contains('open'),h3:(document.querySelector('#sheet.open h3')||{}).textContent||'',rp:!document.getElementById('report').hidden,
    ob:!document.getElementById('ob').hidden,step:window.__lightly.setup.step,url:location.pathname}));
  const back=async(p,ms)=>{ await p.evaluate(()=>history.back()); await p.waitForTimeout(ms==null?800:ms); };
  const tab=async(p,t)=>{ await p.click('#tabs [data-tab='+t+']'); await p.waitForTimeout(600); };

  {const p=await open(seed()); let s=await st(p); const len0=s.len;
   assert.strictEqual(s.d,0,'Today is the root'); assert.strictEqual(s.tab,'today');
   // 1. another tab: Back goes to Today
   await tab(p,'days'); s=await st(p); assert.strictEqual(s.d,1,'Days is one step'); await back(p); s=await st(p); assert.strictEqual(s.tab,'today','Back from Days goes to Today'); assert.strictEqual(s.url,'/','and stays in the app');
   await tab(p,'me'); await tab(p,'days'); s=await st(p); assert.strictEqual(s.d,1,'moving between tabs adds nothing: '+s.d); assert.strictEqual(s.len,len0+1,'one entry, not one per tab');
   await back(p); s=await st(p); assert.strictEqual(s.tab,'today','Back from any tab goes straight to Today');
   // 2. a tab picked with its own button takes the entry away again
   await tab(p,'me'); await tab(p,'today'); await p.waitForTimeout(300); s=await st(p); assert.strictEqual(s.d,0,'Today tapped: back at the root');
   ok('another tab is one step: Back goes to Today, switching tabs adds nothing, tapping Today takes the step away');
   // 3. a sheet on Today: Back closes it and stays
   await p.click('#planBtn'); await p.waitForSelector('#sheet.open'); s=await st(p); assert.strictEqual(s.d,1);
   await back(p); s=await st(p); assert(!s.sheet,'Back closes the sheet'); assert.strictEqual(s.tab,'today'); assert.strictEqual(s.d,0);
   // 4. a sheet on Me: sheet first, then the tab
   await tab(p,'me'); await p.click('#me [data-act=timeoff]'); await p.waitForSelector('#sheet.open'); s=await st(p); assert.strictEqual(s.d,2,'Me and a sheet are two steps');
   // the time-off sheet has a second page with its own Back: the phone's Back goes there first
   await p.click('#sheet [data-act=offtravel]'); await p.waitForSelector('#sheet.open [data-act=offback]'); const inner=(await st(p)).h3;
   await back(p); s=await st(p); assert(s.sheet&&s.h3!==inner,'Back from the second page goes to the first, like its Back button: '+s.h3); assert.strictEqual(s.d,2,'still two steps');
   await back(p); s=await st(p); assert(!s.sheet,'then the sheet closes'); assert.strictEqual(s.tab,'me','and Me stays'); assert.strictEqual(s.d,1);
   await back(p); s=await st(p); assert.strictEqual(s.tab,'today','then Today');
   ok('a sheet closes first (a second page steps back to the first), then the tab goes back to Today');
   // 5. the recap from Days: Back closes it into Days
   await tab(p,'days'); await p.click('#days .rcard .rcmain'); await p.waitForSelector('#report:not([hidden])'); await p.waitForTimeout(900); s=await st(p); assert.strictEqual(s.d,2,'Days and the recap are two steps');
   await back(p,1200); s=await st(p); assert(!s.rp,'Back closes the recap'); assert.strictEqual(s.tab,'days'); assert.strictEqual(s.d,1);
   await p.click('#days .rcard .rcmain'); await p.waitForSelector('#report:not([hidden])'); await p.waitForTimeout(900); await p.click('#report [data-act=rpclose]'); await p.waitForTimeout(1000); s=await st(p); assert.strictEqual(s.d,1,'Done on the recap takes its step away');
   await back(p); assert.strictEqual((await st(p)).tab,'today');
   ok('the recap is one step: Back closes it into Days; Done takes the step away');
   // 6. a sheet closed with its own × leaves no step behind, and Back on Today leaves the app
   await p.click('#planBtn'); await p.waitForSelector('#sheet.open'); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(700); s=await st(p); assert.strictEqual(s.d,0,'× takes the step away');
   await p.keyboard.press('Escape'); await tab(p,'days'); await tab(p,'today'); await p.waitForTimeout(300);
   await back(p,1200); assert.match(p.url(),/before\.html$/,'Back on Today leaves the app at once, no step is spent on nothing: '+p.url());
   ok('closing with × or the Today tab leaves no extra step; Back on Today leaves the app');
   await p.context().close(); }

  // 7. setup: Back goes one step back; on the first step it leaves
  {const p=await open(seed({onboarded:false})); let s=await st(p); assert(s.ob&&s.step===0&&s.d===0,'setup starts at the root');
   await p.click('#ob .ob-step.on [data-act=obnext]'); await p.waitForTimeout(800); await p.click('#ob .ob-step.on [data-act=obopt][data-v=before]'); await p.waitForTimeout(300); await p.click('#ob .ob-step.on [data-act=obnext]'); await p.waitForTimeout(800);
   s=await st(p); assert.strictEqual(s.step,2); assert.strictEqual(s.d,2,'each step of setup is one step back');
   await back(p); s=await st(p); assert.strictEqual(s.step,1,'Back goes to the step before'); await back(p); s=await st(p); assert.strictEqual(s.step,0); assert(s.ob,'still in setup');
   await back(p,1200); assert.match(p.url(),/before\.html$/,'Back on the first step leaves');
   await p.context().close(); ok('setup: Back goes back one step at a time, and leaves from the first step'); }

  // 8. iPhone: the swipe has already shown what is underneath, so the sheet goes at once
  {const p=await open(seed(),{dev:devices['iPhone 13']}); await p.click('#planBtn'); await p.waitForSelector('#sheet.open'); await p.waitForTimeout(700);
   const r=await p.evaluate(()=>new Promise(res=>{ addEventListener('popstate',()=>setTimeout(()=>{ const sh=document.getElementById('sheet'), cs=getComputedStyle(sh); res({snap:document.documentElement.classList.contains('bk-snap'),tr:cs.transform,dim:+getComputedStyle(document.getElementById('scrim')).opacity}); },30),{once:true}); history.back(); }));
   assert(r.snap,'the page is marked while the swipe closes the sheet'); assert(/0, 0, 1, 0, \d/.test(r.tr)&&r.dim===0,'the sheet and the dim are gone at once: '+JSON.stringify(r));
   await p.waitForTimeout(300); assert(!(await p.evaluate(()=>document.documentElement.classList.contains('bk-snap'))),'and the mark goes again');
   await tab(p,'days'); await p.evaluate(()=>history.back()); await p.waitForTimeout(80); assert.strictEqual((await st(p)).tab,'today','Days to Today at once');
   await p.context().close(); ok('iPhone: the sheet and the tab go at once, without their own animation'); }
  {const p=await open(seed()); await p.click('#planBtn'); await p.waitForSelector('#sheet.open'); await p.waitForTimeout(700);
   const r=await p.evaluate(()=>new Promise(res=>{ addEventListener('popstate',()=>setTimeout(()=>res({snap:document.documentElement.classList.contains('bk-snap'),tr:getComputedStyle(document.getElementById('sheet')).transform,dim:+getComputedStyle(document.getElementById('scrim')).opacity}),30),{once:true}); history.back(); }));
   assert(!r.snap&&r.dim>0.05,'Android: the sheet slides down and the dim fades as usual: '+JSON.stringify(r)); await p.context().close(); ok('Android: Back closes with the usual slide'); }

  // 8b. setup on iPhone (and on Android when Chrome draws its own back animation): the step swaps in the same frame. Nothing slides, fades or
  //     staggers in afterwards, because that would show the step that was just swiped away again for a moment (the flash after the swipe)
  for(const dev of ['iPhone 13','Pixel 7']){
   const p=await open(seed({onboarded:false}),{dev:devices[dev]});
   if(dev!=='iPhone 13') await p.evaluate(()=>{ Object.defineProperty(PopStateEvent.prototype,'hasUAVisualTransition',{configurable:true,get(){ return true; }}); });
   await p.click('#ob .ob-step.on [data-act=obnext]'); await p.waitForTimeout(800); await p.click('#ob .ob-step.on [data-act=obopt][data-v=before]'); await p.waitForTimeout(300); await p.click('#ob .ob-step.on [data-act=obnext]'); await p.waitForTimeout(1200);
   const r=await p.evaluate(()=>new Promise(res=>{ addEventListener('popstate',()=>{
       const now=[].map.call(document.querySelectorAll('#ob .ob-step'),e=>({i:e.dataset.i,on:e.classList.contains('on'),tr:getComputedStyle(e).transform}));
       setTimeout(()=>{ const box=document.getElementById('ob'), ml=document.getElementById('obLayer');
         const anim=document.getAnimations().filter(a=>{ const t=a.effect&&a.effect.target; return t&&(box.contains(t)||t===ml)&&a.playState==='running'; }).map(a=>(a.animationName||a.transitionProperty||'js')+':'+(a.effect.target.className||a.effect.target.tagName));
         res({now,anim,step:window.__lightly.setup.step}); },60); },{once:true}); history.back(); }));
   assert.strictEqual(r.step,1,dev+': Back goes to the step before');
   assert.strictEqual(r.now.length,1,dev+': only the step underneath is left, in the same frame: '+JSON.stringify(r.now));
   assert(r.now[0].i==='1'&&r.now[0].on&&r.now[0].tr==='none',dev+': and it sits in place at once: '+JSON.stringify(r.now));
   assert.deepStrictEqual(r.anim,[],dev+': nothing animates in after the swipe');
   await p.waitForTimeout(400); assert(!(await p.evaluate(()=>document.documentElement.classList.contains('bk-snap'))),dev+': the mark goes again');
   // the step still answers back as usual after a swipe
   await p.click('#ob .ob-step.on [data-act=obopt][data-v=first]'); await p.waitForTimeout(100);
   assert(await p.evaluate(()=>!document.querySelector('#ob .ob-step.on').classList.contains('snap')),dev+': the next answer animates again');
   await p.context().close(); }
  ok('setup on iPhone, and on Android with Chrome\'s own back animation: the step underneath is there in the same frame, with nothing sliding or fading in after');

  // 9. Friends: one group is the tab itself; with two, an open group closes into its card first
  for(const n of [1,2]){ mock.groups=[{group_id:'g1',name:'Morning crew',role:'owner',member_count:3,fasting:1,reached:0,resting:0}].concat(n>1?[{group_id:'g2',name:'Family',role:'member',member_count:2,fasting:0,reached:0,resting:0}]:[]);
   const p=await open(seed({fasts:[]}),{auth:true}); await tab(p,'friends');
   if(n>1){ await p.waitForSelector('#friends .fr-kc'); await p.click('#friends .fr-kc'); await p.waitForSelector('#friends [data-act=frback]'); await p.waitForTimeout(700); let s=await st(p); assert.strictEqual(s.d,2,'Friends and an open group are two steps');
     await back(p,900); assert(await p.$('#friends .fr-kc')&&!(await p.$('#friends [data-act=frback]')),'Back closes the group into its card'); s=await st(p); assert.strictEqual(s.tab,'friends'); assert.strictEqual(s.d,1);
     await p.click('#friends .fr-kc'); await p.waitForSelector('#friends [data-act=frback]'); await p.waitForTimeout(700); await p.click('#friends [data-act=frback]'); await p.waitForTimeout(800); assert.strictEqual((await st(p)).d,1,'the group\'s own Back takes its step away'); }
   else{ await p.waitForSelector('#friends .fr-days'); assert.strictEqual((await st(p)).d,1,'one group: just the tab'); }
   await back(p); assert.strictEqual((await st(p)).tab,'today','then Today');
   await p.context().close(); }
  ok('Friends: with two groups Back closes the open group into its card, then goes to Today; with one group it goes to Today');

  assert.deepStrictEqual(errs,[],'no page errors');
  await b.close(); srv.close(); mock.close(); console.log('back: all passed');
})().catch(e=>{ console.error(e); process.exit(1); });
