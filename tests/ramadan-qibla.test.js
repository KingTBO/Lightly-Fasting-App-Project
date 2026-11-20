/* Qibla (v0.122.0): a row at the top of Prayer times (Ramadan mode) opens a compass.
   1. The row says the answer: "285° · west-northwest" for Shanghai. The sheet: Mecca 8,030 km away, no rough-place card for a named city.
   2. Android-style compass (deviceorientationabsolute, magnetic, corrected by the WMM declination): "33° Turn right", "Turn left", then "Facing the Qibla"
      with a buzz, a little give before it lets go, "Hold the phone flat" when tilted. Done goes back to Prayer times.
   3. No compass: a still arrow and the direction in words. A place from the time zone: "Only roughly placed" and Use precise location, which fixes it.
   4. iPhone-style: a "Turn on the compass" tap first (requestPermission), then webkitCompassHeading; poor accuracy asks for a figure 8. 中文.
   NODE_PATH=$(npm root -g) node tests/ramadan-qibla.test.js   (SHOTS=<dir> also saves pictures) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const C=require('../js/core.js');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const SHOTS=process.env.SHOTS; if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
const T=Date.UTC(2027,1,20,6);   /* 14:00 in Shanghai, day 13 of Ramadan 1448 */
const DEC=C.magDecl(31.2304,121.4737,2027+50/365.25);   /* Shanghai, about -6.6: magnetic north is west of true north */
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'ramadan',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:true,d3:false,notify:false,backupAsked:true},ramadanPreview:false,startedAt:Date.UTC(2027,0,1),
  ramOff:[],ramMade:{},ramAdj:{shift:{},eid:{}},ramNext:'2027-02-20'},o||{});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:SHOTS?2:1,colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai',reducedMotion:'reduce',
    geolocation:o.geo,permissions:o.geo?['geolocation']:[]}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); }
    window.__buzz=[]; navigator.vibrate=x=>{ window.__buzz.push(x); return true; }; },s);
  if(o.iphone) await p.addInitScript(()=>{ delete Window.prototype.ondeviceorientationabsolute; delete window.ondeviceorientationabsolute; window.__asked=0;
    DeviceOrientationEvent.requestPermission=()=>{ window.__asked++; return Promise.resolve('granted'); }; });
  await p.clock.setFixedTime(new Date(T)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300); return p; };
 const shot=async(p,n)=>{ if(SHOTS){ await p.waitForTimeout(900); await p.screenshot({path:path.join(SHOTS,n+'.png')}); } };
 const txt=p=>p.evaluate(()=>{ const w=document.createTreeWalker(document.getElementById('sheet'),NodeFilter.SHOW_TEXT), a=[]; while(w.nextNode()){ const x=w.currentNode.textContent.trim(); if(x) a.push(x); } return a.join(' '); });
 const st=p=>p.getAttribute('#qb','data-st'); const mid=async p=>(await p.textContent('#qbBig'))+' '+(await p.textContent('#qbSm')); const foot=p=>p.textContent('#qbF');
 /* heading = where the top of the phone points, from TRUE north; the phone reports magnetic, so alpha = 360 - (heading - declination) */
 const turn=async(p,h,beta)=>{ await p.evaluate(([a,beta])=>window.dispatchEvent(new DeviceOrientationEvent('deviceorientationabsolute',{alpha:a,beta:beta||0,gamma:0,absolute:true})),[((360-(h-DEC))%360+360)%360,beta]); await p.waitForTimeout(120); };
 const toQibla=async p=>{ await p.click('#prayBtn'); await p.waitForSelector('#sheet.open .pr-card'); await p.click('#sheet [data-act=qibla]'); await p.waitForSelector('#sheet #qb'); };

 /* 1. the row and the sheet */
 let p=await open(seed()); await p.click('#prayBtn'); await p.waitForSelector('#sheet.open .pr-card');
 assert.strictEqual((await p.innerText('#sheet [data-act=qibla]')).replace(/\s+/g,' ').trim(),'Qibla 285° · west-northwest'); await shot(p,'qb-row');
 await p.click('#sheet [data-act=qibla]'); await p.waitForSelector('#sheet #qb'); let tx=await txt(p);
 assert(/^Qibla /.test(tx)&&/Qibla 285° · west-northwest Mecca 8,030 km away Done$/.test(tx),tx); assert.strictEqual(await p.$('.qb-rough'),null,'a named city is placed well enough');
 assert.strictEqual(await st(p),'still','still until the compass speaks'); assert.strictEqual(await foot(p),'Hold the phone flat, away from metal.');
 ok('row says 285° · west-northwest; sheet shows Mecca 8,030 km away');
 /* 2. the compass */
 await turn(p,252); assert.strictEqual(await st(p),'live'); assert.strictEqual(await mid(p),'33° Turn right');
 assert(/rotate\(-252\.\d+ 170 170\)/.test(await p.getAttribute('#qbDial','transform')),'the dial turns against the phone'); assert((await p.getAttribute('#qbArc','d')).length>10,'a gold arc shows the turn');
 assert.strictEqual(await foot(p),'Hold the phone flat, away from metal. From Shanghai.'); await shot(p,'qb-turn');
 await turn(p,300); assert.strictEqual(await mid(p),'15° Turn left');
 assert.strictEqual(await p.evaluate(()=>window.__buzz.length),0);
 await turn(p,284); assert.strictEqual(await st(p),'face'); assert.strictEqual(await mid(p),'Facing the Qibla'); assert.strictEqual(await p.getAttribute('#qbArc','d'),'');
 assert.strictEqual(await p.evaluate(()=>window.__buzz.length),1,'one soft buzz'); assert.strictEqual(await p.getAttribute('#qb','aria-label'),'Facing the Qibla'); await shot(p,'qb-face');
 await turn(p,289); assert.strictEqual(await st(p),'face','a little give once facing'); await turn(p,292); assert.strictEqual(await st(p),'live','lets go past 6°');
 await turn(p,285); assert.strictEqual(await p.evaluate(()=>window.__buzz.length),2);
 await turn(p,285,80); assert.strictEqual(await foot(p),'Hold the phone flat.');
 await p.click('#sheet [data-act=prback]'); await p.waitForSelector('#sheet .pr-card'); await turn(p,100); assert.strictEqual(await p.$('#qb'),null); await p.context().close();
 ok('compass: Turn right 33°, Turn left 15°, Facing with one buzz, 6° give, tilt warning, Done goes back');

 /* 3. no compass; a place from the time zone */
 p=await open(seed({place:{key:'zone'}}),{dark:true,geo:{latitude:39.47,longitude:75.99}}); await toQibla(p); await p.waitForTimeout(1800);
 assert.strictEqual(await st(p),'still'); assert.strictEqual(await foot(p),'No compass on this device. Face west-northwest, 285° from north.');
 assert(/Only roughly placed Your place comes from the time zone \(Shanghai\), so this can be a few degrees off\. Use precise location/.test(await txt(p))); await shot(p,'qb-still');
 await p.click('#sheet [data-act=qbgeo]'); await p.waitForTimeout(800); const kash=C.qibla(39.47,75.99);
 assert.strictEqual(await p.$('.qb-rough'),null,'placed now'); assert.strictEqual(C.compassPoint(kash.deg),'wsw'); assert.strictEqual((await p.textContent('#qbV')).trim(),Math.round(kash.deg)+'° · west-southwest');
 assert(Math.round(kash.deg)!==285&&Math.abs(kash.deg-285)>15,'Kashgar is far from Shanghai: '+kash.deg); await p.context().close();
 ok('no compass: still arrow and words; time-zone place offers precise location ('+Math.round(kash.deg)+'° from Kashgar)');

 /* 4. iPhone: a tap first, then webkitCompassHeading (magnetic) */
 p=await open(seed(),{iphone:true}); await toQibla(p); assert(await p.$('#sheet [data-act=qbperm]'),'Turn on the compass');
 assert(/^Tap below so the compass can turn with your phone\. Or face west-northwest, 285° from north\.$/.test(await foot(p)),await foot(p));
 await p.click('#sheet [data-act=qbperm]'); await p.waitForTimeout(300); assert.strictEqual(await p.evaluate(()=>window.__asked),1); assert.strictEqual(await p.$('#sheet [data-act=qbperm]'),null);
 const ios=async(h,acc)=>{ await p.evaluate(([h,acc])=>{ const e=new Event('deviceorientation'); Object.assign(e,{}); Object.defineProperty(e,'webkitCompassHeading',{value:h}); Object.defineProperty(e,'webkitCompassAccuracy',{value:acc}); Object.defineProperty(e,'beta',{value:2}); Object.defineProperty(e,'alpha',{value:0}); window.dispatchEvent(e); },[h,acc]); await p.waitForTimeout(120); };
 await ios(284.7-DEC,10); assert.strictEqual(await st(p),'face','magnetic heading + declination = true');
 await ios(240,35); assert.strictEqual(await foot(p),'Move your phone in a figure 8 to steady the compass.');
 await p.click('#sheet [data-act=prback]'); await p.click('#sheet [data-act=qibla]'); await p.waitForSelector('#sheet #qb'); assert.strictEqual(await p.$('#sheet [data-act=qbperm]'),null,'asked once'); await p.context().close();
 ok('iPhone: one tap to allow, then the compass; figure 8 when unsure');

 /* 5. 中文 */
 p=await open(seed({lang:'zh'})); await p.click('#prayBtn'); await p.waitForSelector('#sheet .pr-card');
 assert.strictEqual((await p.innerText('#sheet [data-act=qibla]')).replace(/\s+/g,' ').trim(),'礼拜朝向 285° · 西北偏西');
 await p.click('#sheet [data-act=qibla]'); await p.waitForSelector('#sheet #qb'); await turn(p,252); assert.strictEqual(await mid(p),'33° 向右转'); assert(/距离 8,030 公里/.test(await txt(p)));
 await shot(p,'qb-zh'); await p.context().close(); ok('中文');

 assert.deepStrictEqual(errs,[],'no page errors'); await b.close(); srv.close(); console.log('ramadan qibla ok');
})().catch(e=>{ console.error(e); process.exit(1); });
