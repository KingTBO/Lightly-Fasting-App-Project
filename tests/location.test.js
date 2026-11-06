/* "Use my location" in setup: it shows it is working, never asks twice, gives up politely after 8 s and still uses a late fix. usage: NODE_PATH=$(npm root -g) node tests/location.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 /* delay: ms before the phone answers; fail: the person says no */
 async function atLocation(delay,fail){const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,geolocation:{latitude:51.5,longitude:-0.12},permissions:['geolocation']});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(([delay,fail])=>{window.__geoCalls=0;navigator.geolocation.getCurrentPosition=(good,bad)=>{window.__geoCalls++;setTimeout(()=>fail?bad({code:1}):good({coords:{latitude:51.5074,longitude:-0.1278}}),delay);};
   if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:false,prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}},[delay,fail]);
  await q.goto(url);await q.waitForTimeout(700);
  const nx=async()=>{await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(900);};
  await nx();await q.click('[data-act=obopt][data-v=first]');await nx();await nx();assert.strictEqual(await q.evaluate(()=>__lightly.setup.key),'set');q.btns=()=>q.evaluate(()=>[].map.call(document.querySelectorAll('.ob-step.on .ob-cta .btn'),b=>b.textContent.trim()+(b.disabled?' (off)':'')));return q;}
 const place=q=>q.evaluate(()=>__lightly.state.place);

 // 1. the reason is on the screen, before anyone is asked
 {const q=await atLocation(1500);const t=await q.textContent('.ob-step.on .lede');assert.match(t,/precise location/);assert.match(t,/sunrise and sunset/);assert.match(t,/stays on this phone/);assert.match(t,/never uploaded or shared/);
  // 2. it shows it is working at once, a second tap does nothing, and the answer lands
  await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(250);let bt=await q.btns();assert.match(await q.textContent('.ob-step.on [role=status]'),/Finding your location/,'busy at once');assert.strictEqual(bt[0],'Continue','Continue is never missing while waiting');assert.match(bt[1],/Choose a city instead/,'a city is one tap away while waiting');
  await q.waitForTimeout(1800);bt=await q.btns();assert.deepStrictEqual(bt,['Continue'],'done: Continue');assert.strictEqual((await place(q)).key,'here');assert.strictEqual(await q.evaluate(()=>__geoCalls),1,'asked once');
  ok('the reason is shown, the button says it is finding the location, one request, then Continue');await q.context().close();}

 // 3. a city picked while waiting wins; the late fix does not change it
 {const q=await atLocation(3000);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(300);await q.click('.ob-step.on [data-act=obcityshow]');await q.waitForTimeout(400);assert(await q.$('#obCity'),'the city list opens');
  await q.waitForTimeout(3200);assert.notStrictEqual((await place(q)).key,'here','the late fix is ignored once the person chose to pick a city');
  ok('choosing a city while waiting cancels the wait');await q.context().close();}

 // 4. no after 8 s: it says so, offers cities, and uses the fix when it does arrive
 {const q=await atLocation(11000);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(8600);assert.match(await q.textContent('#toast'),/taking a while/);assert(await q.$('#obCity'),'cities are offered');assert(!/Finding/.test((await q.btns()).join('|')),'no longer says finding');
  await q.waitForTimeout(3000);assert.strictEqual((await place(q)).key,'here','a late fix is still used');assert.deepStrictEqual(await q.btns(),['Continue'],'step shows Continue after the late fix');
  ok('after 8 s it offers cities, a late fix is still used');await q.context().close();}

 // 5. refused: the city list opens with the guess, nothing hangs
 {const q=await atLocation(600,true);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1200);assert(await q.$('#obCity'),'city list after a refusal');assert.match(await q.textContent('#toast'),/Couldn.t get your location/);assert.notStrictEqual((await place(q)).key,'here');assert(!/Finding/.test((await q.btns()).join('|')));
  ok('refused: city list, no hanging button');await q.context().close();}

 // 6. refused, then 'Use my location instead' with a working phone: the list swaps for the location row without an error
 {const q=await atLocation(500,true);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1000);assert(await q.$('#obCity'));await q.evaluate(()=>{navigator.geolocation.getCurrentPosition=g=>setTimeout(()=>g({coords:{latitude:51.5,longitude:-0.12}}),300);});await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1200);assert(!(await q.$('#obCity')),'the list is gone');assert.match(await q.textContent('.ob-step.on'),/Using your location/);assert.deepStrictEqual(await q.btns(),['Continue']);
  ok('retry after a refusal swaps the city list for the location row');await q.context().close();}

 await b.close();srv.close();assert.deepStrictEqual(errs,[],'no page errors');console.log('done');
})().catch(e=>{console.error(e);process.exit(1)});
