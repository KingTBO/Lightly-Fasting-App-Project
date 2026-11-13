/* The daytime sky on Today is plain: no birds and no clouds, in the app and on the concept page. The night keeps its shooting stars.
   The birds (v0.99.0) were taken out in v0.108.0.   NODE_PATH=$(npm root -g) node tests/day-sky.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m);
const D=24*3600000;
const seed=()=>({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:Date.now()-9*D});
const NOON='2026-11-10T12:00:00+08:00', MIDNIGHT='2026-11-10T00:30:00+08:00';
const plain=p=>p.evaluate(()=>({birds:document.querySelectorAll('.birds').length,clouds:document.querySelectorAll('.clouds').length,fn:typeof window.lightlyBirds,moving:document.getAnimations().filter(a=>a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('svg')&&/translate\(/.test(JSON.stringify(a.effect.getKeyframes()))&&a.effect.getTiming().duration>5000).length}));
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const app=async(time,url)=>{ const ctx=await b.newContext({viewport:url?{width:1280,height:900}:{width:390,height:844},timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   await p.addInitScript(s=>localStorage.setItem('lightly:v1',JSON.stringify(s)),seed()); await p.clock.setFixedTime(new Date(time)); await p.goto('http://localhost:'+port+(url||'/')); await p.waitForTimeout(2300); return {ctx,p,errs}; };
 // 1. app by day: nothing flies across the sky
 {const {ctx,p,errs}=await app(NOON); assert(/dawn|morning|day|sunset/.test(await p.evaluate(()=>document.getElementById('ph').dataset.sky)),'a daytime sky');
  await p.waitForTimeout(9500); assert.deepStrictEqual(await plain(p),{birds:0,clouds:0,fn:'undefined',moving:0},'no bird layer, no clouds, nothing crossing the sky');
  assert.deepStrictEqual(errs,[]); await ctx.close(); ok('app, day: the sky is plain, no birds and no clouds');}
 // 2. app by night: the stars and the shooting stars are still there
 {const {ctx,p,errs}=await app(MIDNIGHT); assert(/night|first|evening/.test(await p.evaluate(()=>document.getElementById('ph').dataset.sky)));
  assert(await p.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('stars')).opacity))>.4,'the stars show at night'); assert.strictEqual(await p.evaluate(()=>typeof window.lightlyShoot),'function','shooting stars stay');
  assert.strictEqual((await plain(p)).birds,0); assert.deepStrictEqual(errs,[]); await ctx.close(); ok('app, night: stars and shooting stars stay');}
 // 3. concept page: the demo phone has no birds either, by day
 {const {ctx,p,errs}=await app(NOON,'/concept/'); await p.evaluate(()=>{ document.getElementById('ph').setAttribute('data-sky','day'); }); await p.waitForTimeout(6000);
  const q=await plain(p); assert.deepStrictEqual([q.birds,q.clouds,q.fn],[0,0,'undefined']); assert(!/\bbirds?\b/i.test(await p.evaluate(()=>document.body.innerText)),'the page does not talk about birds');
  assert.deepStrictEqual(errs,[]); await ctx.close(); ok('concept page: no birds on the demo phone or in the words');}
 await b.close(); srv.close(); console.log('day sky tests passed'); process.exit(0);
})().catch(e=>{ console.error(e); process.exit(1); });
