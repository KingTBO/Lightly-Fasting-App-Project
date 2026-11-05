/* Swipe right to go back in setup, in a real browser with a real touch screen. usage: NODE_PATH=$(npm root -g) node tests/swipe.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 async function fresh(reduced){const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:reduced?'reduce':'no-preference',timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(()=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:false,prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}});
  await q.goto(url);await q.waitForTimeout(700);q.cdp=await c.newCDPSession(q);return q;}
 /* a finger: down, a run of moves, up */
 async function swipe(q,x0,y0,x1,y1,o){o=o||{};const n=o.steps||8,ms=o.ms==null?12:o.ms,t=q.cdp,send=(type,x,y)=>t.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y}]});
  await send('touchStart',x0,y0);for(let i=1;i<=n;i++){await send('touchMove',x0+(x1-x0)*i/n,y0+(y1-y0)*i/n);await q.waitForTimeout(ms);}
  if(o.hold) await q.waitForTimeout(o.hold);
  if(o.mid){await o.mid();}
  await send('touchEnd');await q.waitForTimeout(o.settle==null?900:o.settle);}
 const step=q=>q.evaluate(()=>__lightly.setup.step), key=q=>q.evaluate(()=>__lightly.setup.key), kids=q=>q.evaluate(()=>document.getElementById('ob').children.length);
 const next=async q=>{await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(900);};

 // 1. nothing to go back to on the welcome; a right swipe there does nothing
 {const q=await fresh();assert.strictEqual(await step(q),0);await swipe(q,40,400,340,410);assert.strictEqual(await step(q),0,'welcome stays');assert.strictEqual(await kids(q),1);
  // 2. step 2: an answer, then forward and back. The answer is kept.
  await next(q);assert.strictEqual(await key(q),'fasted');await q.click('[data-act=obopt][data-v=before]');await q.waitForTimeout(300);
  await swipe(q,300,500,60,505);assert.strictEqual(await key(q),'fasted','swiping forward (left) does nothing');
  await next(q);assert.strictEqual(await key(q),'plan');
  await swipe(q,40,500,330,505);assert.strictEqual(await key(q),'fasted','swipe right goes back one step');assert.strictEqual(await kids(q),1,'the old step is gone');
  assert(await q.$('.ob-step.on .plan.sel[data-v=before]'),'the earlier answer is still chosen');
  ok('swipe right goes back one step, forward swipes do nothing, answers are kept');
  // 3. not a back swipe: mostly vertical, short and slow, or released early
  await next(q);const y=await q.evaluate(()=>document.querySelector('.ob-step.on').scrollTop);
  await swipe(q,200,300,260,700);assert.strictEqual(await key(q),'plan','a vertical drag is not a swipe');
  await swipe(q,100,500,160,505,{steps:6,ms:40});assert.strictEqual(await key(q),'plan','a short slow drag springs back');assert.strictEqual(await kids(q),1,'the step behind is removed again');
  assert.strictEqual(await q.evaluate(()=>document.querySelector('.ob-step.on').style.transform),'','the step is back in place');
  ok('vertical, short and slow drags do not go back and leave nothing behind');
  // 4. while dragging the step follows the finger and the previous one is behind it
  await swipe(q,40,500,240,505,{steps:6,ms:30,settle:0,mid:async()=>{const r=await q.evaluate(()=>{const s=[].slice.call(document.querySelectorAll('#ob .ob-step'));return {n:s.length,top:s[s.length-1].style.transform,under:s[0].getAttribute('data-i')};});assert.strictEqual(r.n,2,'the step before sits behind');assert.match(r.top,/translateX\(1[5-9]\d|translateX\(2\d\d/,'the step follows the finger');assert.strictEqual(r.under,'1');}});
  await q.waitForTimeout(1000);assert.strictEqual(await key(q),'fasted','releasing past the middle goes back');
  ok('the step follows the finger with the previous one behind it');
  // 5. the moon progress bar follows
  await next(q);await q.waitForTimeout(1200);const n=await q.evaluate(()=>__lightly.setup.n);assert(Math.abs(await q.evaluate(()=>__lightly.setup.moon)-2/(n-1))<.02,'moon at step 2');
  await swipe(q,40,500,330,505);await q.waitForTimeout(1200);assert(Math.abs(await q.evaluate(()=>__lightly.setup.moon)-1/(n-1))<.02,'moon back at step 1');assert(await q.evaluate(()=>document.getElementById('obLayer').classList.contains('head')));
  ok('the moon progress bar goes back with the step');
  // 6. the wheels keep their own swipes: a horizontal drag on an open wheel does not leave the step
  await next(q);await next(q);assert.strictEqual(await key(q),'custom');await q.click('#obStart .pk-row');await q.waitForTimeout(600);
  const bx=await q.locator('#obStart .pk-c').first().boundingBox();await swipe(q,bx.x+bx.width/2,bx.y+90,bx.x+bx.width/2+250,bx.y+95);assert.strictEqual(await key(q),'custom','a swipe that starts on a wheel stays on the wheel');
  // but a swipe from the empty part of the same step goes back
  await swipe(q,12,480,330,485);assert.strictEqual(await key(q),"plan");
  ok('swipes that start on a wheel are left to the wheel');
  await q.context().close();}

 // 7. Reduce Motion: nothing follows the finger, a clear swipe still goes back
 {const q=await fresh(true);await next(q);await q.click('[data-act=obopt][data-v=first]');await q.waitForTimeout(300);await next(q);assert.strictEqual(await key(q),'plan');
  await swipe(q,40,500,240,505,{steps:6,ms:30,settle:0,mid:async()=>{assert.strictEqual(await kids(q),1,'no second step is drawn under Reduce Motion');assert.strictEqual(await q.evaluate(()=>document.querySelector('.ob-step.on').style.transform),'','the step does not move');}});
  await q.waitForTimeout(700);assert.strictEqual(await key(q),'fasted','still goes back');assert(await q.$('.ob-step.on .plan.sel[data-v=first]'));
  ok('Reduce Motion: no movement, a clear swipe still goes back');
  await q.context().close();}

 // 8. the concept page's phone does the same
 {const c=await b.newContext({viewport:{width:430,height:1000},hasTouch:true,isMobile:true,timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url+'concept/');await q.waitForTimeout(800);q.cdp=await c.newCDPSession(q);
  await q.evaluate(()=>document.getElementById('obph').scrollIntoView({block:'center'}));await q.waitForTimeout(500);
  const bb=await q.locator('#obph').boundingBox(),cx=bb.x+bb.width/2,cy=bb.y+bb.height*.6;
  const cstep=()=>q.evaluate(()=>{const s=document.querySelectorAll('#obStage .ob-step');return s.length+':'+(s[s.length-1].querySelector('h4')||{}).textContent;});
  await swipe(q,bb.x+20,cy,bb.x+bb.width-20,cy);assert.match(await cstep(),/^1:Lightly/,'welcome: nothing to go back to');
  await q.click('#obStage [data-next]');await q.waitForTimeout(900);const second=await cstep();assert.match(second,/^1:Have you fasted/);
  await swipe(q,cx+120,cy,cx-120,cy);assert.strictEqual(await cstep(),second,'forward swipe does nothing');
  await swipe(q,bb.x+20,cy,bb.x+bb.width-20,cy);assert.match(await cstep(),/^1:Lightly/,'swipe right goes back to the welcome');
  ok('concept page: swipe right goes back, forward does nothing');
  await c.close();}

 await b.close();srv.close();
 assert.deepStrictEqual(errs,[],'no page errors');console.log('done');
})().catch(e=>{console.error(e);process.exit(1)});
