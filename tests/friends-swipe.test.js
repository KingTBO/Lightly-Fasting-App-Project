/* Swipe between days on a Friends group, with a real touch screen: left is the next day, right the day before; the page follows the finger, gives a little at
   today and at the first day, and the old and new day move side by side. Up and down still scroll, the screen edge is left to the phone, a swipe is never a tap on a star,
   a tap on a day slides too, the arrow keys move the day, a refresh never lands under a finger, Reduce Motion, and the concept page.
   NODE_PATH=$(npm root -g) node tests/friends-swipe.test.js   (about 40 seconds) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const H=3600000;
let bump=0;   /* raising it changes the boards the mock sends, so the page has something new to draw */
const mock=http.createServer((q,r)=>{ r.setHeader('Access-Control-Allow-Origin','*'); r.setHeader('Access-Control-Allow-Headers','*'); r.setHeader('Access-Control-Allow-Methods','*'); if(q.method==='OPTIONS'){ r.writeHead(204); return r.end(); }
  let body=''; q.on('data',d=>body+=d); q.on('end',()=>{ const j=body?JSON.parse(body):{}, u=q.url, out=(c,o)=>{ r.writeHead(c,{'Content-Type':'application/json'}); r.end(JSON.stringify(o)); };
    if(u.startsWith('/auth/v1/settings')) return out(200,{external:{google:true,email:true}});
    if(u.startsWith('/auth/v1/user')) return out(200,{id:'uid-me',email:'me@example.com'});
    if(u.startsWith('/rest/v1/lightly_state')) return out(200,[]);
    if(u.startsWith('/rest/v1/profiles')) return out(200,[{display_name:'Maya',avatar:'lantern'}]);
    const m=/^\/rest\/v1\/rpc\/(\w+)/.exec(u); if(!m) return out(404,{});
    if(m[1]==='my_groups') return out(200,[{group_id:'g1',name:'Morning crew',role:'owner',member_count:5,fasting:2,reached:1,resting:1}]);
    if(m[1]==='group_board'){ const late=j.p_day===j.p_today; const R=(uid,n,a,st,pr,g,me)=>({user_id:uid,display_name:n,avatar:a,is_me:!!me,status:st,progress:pr,goal_hours:g,cheered_by_me:false,cheers_received:me?1+bump:0});
      return out(200,late?[R('uid-me','Maya','lantern','fasting',.4,16,1),R('u-mei','Mei','crescent','fasting',.6,18),R('u-arj','Arjun','sunrise','reached',1,16),R('u-len','Lena','tea','resting',null,null),R('u-sam','Sam','star','none',null,null)]
        :[R('uid-me','Maya','lantern','reached',1,16,1),R('u-mei','Mei','crescent','fasted',.7,18),R('u-arj','Arjun','sunrise','reached',1,16),R('u-len','Lena','tea','resting',null,null),R('u-sam','Sam','star','none',null,null)]); }
    if(m[1]==='current_invite') return out(200,[{code:'K7QM4XD9',expires_at:new Date(Date.now()+6*24*H).toISOString(),member_count:5,max_members:10}]);
    if(m[1]==='publish_me') return out(200,null);
    out(404,{}); }); });
const srv=http.createServer((q,r)=>{ let p=path.join(root,decodeURIComponent(q.url.split('?')[0])); if(p.endsWith('/')) p+='index.html'; fs.readFile(p,(e,d)=>{ if(e){ r.writeHead(404); r.end(); } else{ r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'}); r.end(d); } }); });
const ok=n=>console.log('ok -',n);
(async()=>{ await new Promise(r=>mock.listen(0,r)); await new Promise(r=>srv.listen(0,r));
  const murl='http://localhost:'+mock.address().port, url='http://localhost:'+srv.address().port+'/'; const b=await chromium.launch(); const now=Date.now(), errs=[];
  const state={v:1,lang:'en',theme:'light',onboarded:true,profile:{fastedBefore:true,safety:false,care:[],careOff:null},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},off:[],unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:now-9*24*H,mod:now-1000,del:[]};
  async function device(reduced){ const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:reduced?'reduce':'no-preference',timezoneId:'Asia/Shanghai'});
    await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:`window.LIGHTLY_CLOUD={url:'${murl}',key:'anon'};`}));
    const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(([s,a])=>{ if(!sessionStorage.s){ localStorage.setItem('lightly:v1',s); localStorage.setItem('lightly:auth',a); localStorage.setItem('lightly:friends',JSON.stringify({tip:1})); sessionStorage.s=1; } },[JSON.stringify(state),JSON.stringify({access:'tok-1',refresh:'r',exp:Math.floor(Date.now()/1000)+3600,email:'me@example.com',uid:'uid-me',photo:'',name:''})]);
    await p.goto(url); await p.waitForTimeout(500); p.cdp=await ctx.newCDPSession(p);
    await p.tap('#tabs [data-tab=friends]'); await p.waitForSelector('#friends .fr-card .fr-row'); await p.waitForTimeout(400); return p; }
  /* a finger: down, a run of moves, up */
  async function swipe(p,x0,y0,x1,y1,o){ o=o||{}; const n=o.steps||8, ms=o.ms==null?12:o.ms, send=(type,x,y)=>p.cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
    await send('touchStart',x0,y0); for(let i=1;i<=n;i++){ await send('touchMove',x0+(x1-x0)*i/n,y0+(y1-y0)*i/n); await p.waitForTimeout(ms); }
    if(o.mid) await o.mid(); await send('touchEnd'); await p.waitForTimeout(o.settle==null?800:o.settle); }
  const day=(p,sel)=>p.$$eval((sel||'#friends')+' .fr-days button',bs=>bs.findIndex(x=>x.getAttribute('aria-pressed')==='true'));
  const pg=(p,sel)=>p.evaluate(s=>{ const e=document.querySelector(s+' .fr-pg'); return {t:e.style.transform,o:e.style.opacity,ghosts:document.querySelectorAll(s+' .fr-ghost').length}; },sel||'#friends');
  const sum=p=>p.textContent('#friends .fr-sum');

  {const p=await device(false);
   assert.strictEqual(await day(p),6,'the group opens on today'); assert.match(await sum(p),/^Today/);
   // 1. at today a swipe to the left (the next day) gives a little and comes back
   await swipe(p,300,420,100,425,{settle:0,mid:async()=>{ const s=await pg(p); const x=parseFloat(/-?[\d.]+/.exec(s.t)[0]); assert(x<-10&&x>-120,'past today the page only gives a little: '+s.t); }});
   await p.waitForTimeout(700); assert.strictEqual(await day(p),6,'still today'); assert.strictEqual((await pg(p)).t,'','and back in place');
   // 2. a swipe to the right: the page follows the finger, and the day before slides in from the left over a still copy of today
   await swipe(p,80,420,300,425,{settle:0,mid:async()=>{ const s=await pg(p); const x=parseFloat(/-?[\d.]+/.exec(s.t)[0]); assert(x>150,'the page follows the finger: '+s.t); }});
   await p.waitForTimeout(60); assert.strictEqual(await day(p),5,'the day before'); assert.strictEqual((await pg(p)).ghosts,1,'today slides away as a still copy');
   assert(await p.$eval('#friends .fr-ghost',g=>g.inert&&g.getAttribute('aria-hidden')==='true'&&!g.querySelector('[id]')),'the copy cannot be tapped or read');
   await p.waitForTimeout(700); assert.strictEqual((await pg(p)).ghosts,0,'and is gone after the slide'); assert(!/^Today/.test(await sum(p)),'the page shows that day: '+await sum(p));
   ok('right goes to the day before and follows the finger; at today the page only gives a little');
   // 3. a swipe that starts on a star is a swipe, not a tap on the star
   const st=await p.$eval('#friends .fr-st[data-u=u-mei]',e=>{ const r=e.getBoundingClientRect(); return [r.left+r.width/2,r.top+r.height/2]; });
   await swipe(p,st[0],st[1],st[0]+200,st[1]+6); assert.strictEqual(await day(p),4,'it moved a day'); assert(!await p.$('#friends .fr-sc'),'and no star card opened');
   // 4. short and slow springs back; a quick flick is enough
   await swipe(p,150,420,190,422,{steps:6,ms:40}); assert.strictEqual(await day(p),4,'a short slow drag springs back'); assert.strictEqual((await pg(p)).t,'');
   await swipe(p,250,420,195,421,{steps:3,ms:4}); assert.strictEqual(await day(p),5,'a quick flick to the left moves to the next day');
   ok('a swipe over a star is not a tap; short and slow springs back; a quick flick is enough');
   // 5. up and down still scroll the page; a touch at the very edge is left to the phone
   const y0=await p.evaluate(()=>document.getElementById('friends').scrollTop); await swipe(p,200,700,215,300);
   assert.strictEqual(await day(p),5,'a vertical drag is not a swipe'); assert(await p.evaluate(()=>document.getElementById('friends').scrollTop)>y0,'and the page scrolled');
   await p.evaluate(()=>document.getElementById('friends').scrollTo(0,0)); await p.waitForTimeout(200);
   await swipe(p,6,420,300,425); assert.strictEqual(await day(p),5,'a swipe from the left edge belongs to the phone');
   await swipe(p,386,420,100,425); assert.strictEqual(await day(p),5,'and from the right edge');
   ok('vertical drags scroll, edge swipes are left alone');
   // 6. the days themselves: swiping on them works, a tap slides the same way, the arrow keys move a day, and day 1 gives a little
   const dy=await p.$eval('#friends .fr-days',e=>{ const r=e.getBoundingClientRect(); return r.top+r.height/2; });
   await swipe(p,120,dy,320,dy+4); assert.strictEqual(await day(p),4,'a swipe on the days moves a day');
   await p.tap('#friends .fr-days button:nth-child(1)'); await p.waitForTimeout(60); assert.strictEqual(await day(p),0); assert.strictEqual((await pg(p)).ghosts,1,'a tap on a day slides too'); await p.waitForTimeout(700);
   await swipe(p,80,420,300,425,{settle:0,mid:async()=>{ const x=parseFloat(/-?[\d.]+/.exec((await pg(p)).t)[0]); assert(x>0&&x<120,'before the first day the page only gives a little: '+x); }}); await p.waitForTimeout(700); assert.strictEqual(await day(p),0);
   await p.focus('#friends .fr-days button:nth-child(1)'); await p.keyboard.press('ArrowRight'); assert.strictEqual(await day(p),1,'arrow right is the next day');
   assert.strictEqual(await p.evaluate(()=>document.activeElement.getAttribute('aria-pressed')),'true','focus follows the day'); await p.keyboard.press('ArrowLeft'); assert.strictEqual(await day(p),0);
   ok('the days: swipe on them, a tap slides, arrow keys, the first day gives a little');
   // 7. new boards arriving during a swipe never redraw the page under the finger; they are drawn when the finger lifts
   bump=4; await swipe(p,150,420,230,422,{steps:6,ms:40,mid:async()=>{ await p.evaluate(()=>window.dispatchEvent(new Event('focus'))); await p.waitForTimeout(600); const s=await pg(p); assert(s.t&&s.t!=='none','the page is still under the finger: '+s.t); }});
   await p.waitForTimeout(400); await p.tap('#friends .fr-days button:nth-child(7)'); await p.waitForTimeout(800); assert.strictEqual(await day(p),6); assert.match(await p.textContent('#friends .fr-row'),/5 cheers/,'the new boards were drawn after the swipe');
   ok('a refresh waits for the finger to lift');
   await p.context().close();}

  // 8. Reduce Motion: nothing follows the finger and nothing slides; a clear swipe still changes the day
  {const p=await device(true);
   await swipe(p,80,420,300,425,{settle:0,mid:async()=>{ assert.strictEqual((await pg(p)).t,'','the page does not move'); }}); await p.waitForTimeout(60);
   assert.strictEqual(await day(p),5,'still the day before'); assert.strictEqual((await pg(p)).ghosts,0,'no slide');
   ok('Reduce Motion: no movement, a clear swipe still changes the day');
   await p.context().close();}

  // 9. the concept page's demo phone does the same
  {const ctx=await b.newContext({viewport:{width:430,height:1000},hasTouch:true,isMobile:true,timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
   await p.goto(url+'concept/'); await p.waitForTimeout(700); p.cdp=await ctx.newCDPSession(p); await p.tap('#tryFr'); await p.waitForSelector('#frScr .fr-days'); await p.waitForTimeout(1200);
   const sky=await p.$eval('#frScr .fr-sky',e=>{ const r=e.getBoundingClientRect(); return [r.left,r.right,r.top+r.height/2]; }), cx=(sky[0]+sky[1])/2;
   assert.strictEqual(await day(p,'#frScr'),6);
   await swipe(p,cx-100,sky[2],cx+100,sky[2]+4,{settle:0,mid:async()=>{ const x=parseFloat(/-?[\d.]+/.exec((await pg(p,'#frScr')).t)[0]); assert(x>120,'follows the finger: '+x); }}); await p.waitForTimeout(60);
   assert.strictEqual(await day(p,'#frScr'),5,'right goes to the day before'); assert.strictEqual((await pg(p,'#frScr')).ghosts,1,'with the slide'); await p.waitForTimeout(700);
   await swipe(p,cx+100,sky[2],cx-100,sky[2]+4); assert.strictEqual(await day(p,'#frScr'),6,'left comes back to today');
   await swipe(p,cx+100,sky[2],cx-100,sky[2]+4); assert.strictEqual(await day(p,'#frScr'),6,'and stops there');
   ok('concept page: the same swipe between days');
   await ctx.close();}

  assert.deepStrictEqual(errs,[]); console.log('friends swipe ok'); await b.close(); mock.close(); srv.close();
})().catch(e=>{ console.error(e); process.exit(1); });
