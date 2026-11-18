/* Sunrise and sunset (v0.114.0): setup starts on the phone's time zone with precise location optional (it shows it is working, never asks twice, gives up politely after 8 s and still uses a late fix), and Me finds any city by search. usage: NODE_PATH=$(npm root -g) node tests/location.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 /* delay: ms before the phone answers; fail: the person says no */
 async function atLocation(delay,fail,tz){const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,timezoneId:tz||'Asia/Shanghai',geolocation:{latitude:51.5,longitude:-0.12},permissions:['geolocation']});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(([delay,fail])=>{window.__geoCalls=0;navigator.geolocation.getCurrentPosition=(good,bad)=>{window.__geoCalls++;setTimeout(()=>fail?bad({code:1}):good({coords:{latitude:51.5074,longitude:-0.1278}}),delay);};
   if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:false,prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}},[delay,fail]);
  await q.goto(url);await q.waitForTimeout(700);
  const nx=async()=>{await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(900);};
  await nx();await q.click('[data-act=obopt][data-v=first]');await nx();await nx();assert.strictEqual(await q.evaluate(()=>__lightly.setup.key),'set');q.btns=()=>q.evaluate(()=>[].map.call(document.querySelectorAll('.ob-step.on .ob-cta .btn'),b=>b.textContent.trim()+(b.disabled?' (off)':'')));return q;}
 const place=q=>q.evaluate(()=>__lightly.state.place);

 // 1. setup is already matched to the phone's time zone; precise location is optional and the reason is on the screen before anyone is asked
 {const q=await atLocation(1500,false,'Europe/Oslo');const t=await q.textContent('.ob-step.on .lede');assert.match(t,/Matched to Oslo by your phone.s time zone/);assert.match(t,/never leaves this phone/);
  assert.deepStrictEqual(await q.btns(),['Continue','Use precise location'],'Continue first, no city list');assert(!(await q.$('#obCity')),'no city wheel');assert.strictEqual((await place(q)).key,'zone');
  // 2. it shows it is working at once, a second tap does nothing, and the answer lands
  await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(250);assert.match(await q.textContent('.ob-step.on [role=status]'),/Finding your location/,'busy at once');assert.deepStrictEqual(await q.btns(),['Continue'],'Continue is never missing while waiting');
  await q.waitForTimeout(1800);assert.deepStrictEqual(await q.btns(),['Continue'],'done: Continue');const pl=await place(q);assert.strictEqual(pl.key,'here');assert.strictEqual(pl.zone,'Europe/Oslo','the zone it was taken in is kept');assert.strictEqual(await q.evaluate(()=>__geoCalls),1,'asked once');assert.match(await q.textContent('.ob-step.on .lede'),/your own sunrise and sunset/);
  ok('setup: time zone already set, precise location optional, one request');await q.context().close();}

 // 3. Continue while the fix is coming keeps the time zone; the late fix does not change it
 {const q=await atLocation(3000,false,'Europe/Oslo');await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(300);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(3600);assert.strictEqual((await place(q)).key,'zone','moving on cancels the wait');
  ok('moving on while waiting keeps the time zone');await q.context().close();}

 // 4. no answer after 8 s: it says so, and uses the fix when it does arrive
 {const q=await atLocation(11000,false,'Europe/Oslo');await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(8600);assert.match(await q.textContent('#toast'),/taking a while/);assert(!/Finding/.test(await q.textContent('.ob-step.on')),'no longer says finding');
  await q.waitForTimeout(3000);assert.strictEqual((await place(q)).key,'here','a late fix is still used');assert.deepStrictEqual(await q.btns(),['Continue']);
  ok('after 8 s it says so, a late fix is still used');await q.context().close();}

 // 5. Oslo, refused: it stays on Oslo's time zone, never London, says why, and can try again
 {const q=await atLocation(600,true,'Europe/Oslo');await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1200);assert.match(await q.textContent('#toast'),/wasn.t allowed, so Lightly is using Oslo/);assert.strictEqual((await place(q)).key,'zone');assert.deepStrictEqual(await q.btns(),['Continue','Use precise location']);assert.doesNotMatch(await q.textContent('.ob-step.on .lede'),/London/);
  await q.evaluate(()=>{navigator.geolocation.getCurrentPosition=g=>setTimeout(()=>g({coords:{latitude:59.91,longitude:10.75}}),300);});await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1200);assert.strictEqual((await place(q)).key,'here');assert.deepStrictEqual(await q.btns(),['Continue']);
  ok('Oslo, refused: Oslo time zone, not London; a retry works');await q.context().close();}

 // 6. Me: today's times, the time zone, precise location and Another city; search finds Oslo by city or country, in English or Chinese, and picks it
 {const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(()=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}});
  await q.goto(url);await q.waitForTimeout(700);await q.click('[data-tab=me]');await q.waitForTimeout(300);assert.match(await q.textContent('[data-act=place]'),/Shanghai/);
  await q.click('[data-act=place]');await q.waitForTimeout(500);const sh=await q.textContent('#sheet');assert.match(sh,/Sunrise\s*\d\d:\d\d/);assert.match(sh,/Sunset\s*\d\d:\d\d/);assert.match(sh,/Shanghai\s*Your phone.s time zone/);assert.match(sh,/Precise location/);assert.match(sh,/Another city/);
  assert.strictEqual(await q.$$eval('#sheet .plan',x=>x.length),3,'three rows, no list');
  await q.click('[data-act=placefind]');await q.waitForTimeout(400);await q.fill('#plQ','norw');await q.waitForTimeout(200);let names=await q.$$eval('#plR b',x=>x.map(e=>e.textContent));assert(names.includes('Oslo')&&names.includes('Bergen'),'a country finds its cities: '+names);
  await q.fill('#plQ','oslo');await q.waitForTimeout(200);await q.press('#plQ','Enter');await q.waitForTimeout(500);let pl=await q.evaluate(()=>__lightly.state.place);assert.strictEqual(pl.key,'pick');assert.strictEqual(pl.zone,'Europe/Oslo');
  assert.match(await q.textContent('#sheet'),/Oslo\s*Chosen by you/,'the chosen city shows, checked');
  await q.click('[data-act=placefind]');await q.waitForTimeout(300);await q.fill('#plQ','麦加');await q.waitForTimeout(200);await q.click('[data-act=placepick][data-i="0"]');await q.waitForTimeout(400);assert.strictEqual((await q.evaluate(()=>__lightly.state.place)).key,'mecca','a listed city keeps its key');
  await q.click('[data-act=placefind]');await q.waitForTimeout(300);await q.fill('#plQ','zzzz');await q.waitForTimeout(200);assert.match(await q.textContent('#plR'),/No city by that name/);
  await q.click('#sheet [data-act=place]');await q.waitForTimeout(300);await q.click('[data-act=placeauto]');await q.waitForTimeout(300);assert.strictEqual((await q.evaluate(()=>__lightly.state.place)).key,'zone','back to automatic');
  ok('Me: times, time zone, precise, search by city, country and Chinese, back to automatic');await c.close();}

 // 7. a shared location from before a trip: the phone's new time zone is used until it is shared again
 {const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Tokyo'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(()=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:true,placeV:1,place:{key:'here',lat:59.91,lon:10.75,zone:'Europe/Oslo'},profile:{fastedBefore:true,safety:false},prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}});
  await q.goto(url);await q.waitForTimeout(700);await q.click('[data-tab=me]');await q.waitForTimeout(300);assert.match(await q.textContent('[data-act=place]'),/Tokyo/);await q.click('[data-act=place]');await q.waitForTimeout(400);assert.match(await q.textContent('#sheet'),/Saved before your trip/);
  ok('a location from before a trip gives way to the new time zone');await c.close();}

 // 8. someone set up before 0.113.2 in Oslo, still on the old London guess: it becomes Oslo once, and a city picked later stays
 {const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Europe/Oslo'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(()=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},place:{key:'london'},prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}});
  await q.goto(url);await q.waitForTimeout(700);assert.strictEqual((await place(q)).key,'zone','the old guess is put right');
  await q.evaluate(()=>__lightly.state.place={key:'london'});await q.evaluate(()=>localStorage.setItem('lightly:v1',JSON.stringify(__lightly.state)));await q.reload();await q.waitForTimeout(600);assert.strictEqual((await place(q)).key,'london','a city picked after the fix is kept');
  ok('the old London guess in Oslo becomes Oslo once');await c.close();}

 await b.close();srv.close();assert.deepStrictEqual(errs,[],'no page errors');console.log('done');
})().catch(e=>{console.error(e);process.exit(1)});
