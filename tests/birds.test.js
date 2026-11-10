/* The daytime partner of the shooting stars: an occasional bird or two flying across Today's daytime sky.
   There are no clouds any more. Birds appear only under a daytime sky, never at night, never with Reduce Motion, are gone quickly
   when you switch to another tab, and come back. App and concept page.   NODE_PATH=$(npm root -g) node tests/birds.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m);
const D=24*3600000;
const seed=()=>({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:Date.now()-9*D});
const NOON='2026-11-10T12:00:00+08:00', MIDNIGHT='2026-11-10T00:30:00+08:00';
const count=p=>p.evaluate(()=>document.querySelectorAll('#ph .birds g, .ph .birds g').length);
const op=p=>p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('.birds')).opacity));
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const app=async(time,opts)=>{ const ctx=await b.newContext(Object.assign({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'},opts||{})); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   await p.addInitScript(s=>localStorage.setItem('lightly:v1',JSON.stringify(s)),seed()); await p.clock.setFixedTime(new Date(time)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(2300); return {ctx,p,errs}; };
 // 1. day: birds fly (1 to 3 at a time), above the sun/moon disc, and there are no clouds
 {const {ctx,p,errs}=await app(NOON); assert.strictEqual(await p.evaluate(()=>document.getElementById('ph').dataset.sky),'day'); assert.strictEqual(await p.evaluate(()=>document.querySelectorAll('.clouds').length),0,'no clouds any more');
  assert(await op(p)>.5,'the bird layer is visible in the day'); assert.strictEqual(await p.evaluate(()=>window.lightlyBirds()),true,'a flock starts'); const n=await count(p); assert(n>=1&&n<=3,'one to three birds ('+n+')');
  await p.waitForTimeout(1500); const pos=await p.evaluate(()=>{ const ph=document.getElementById('ph').getBoundingClientRect(), d=document.getElementById('disc').getBoundingClientRect(); return [...document.querySelectorAll('#ph .birds g')].map(g=>{ const r=g.getBoundingClientRect(); return {x:r.left-ph.left,bottom:r.bottom-ph.top,discTop:d.top-ph.top}; }); });
  assert(pos.every(q=>q.bottom<q.discTop+4),'birds fly above the disc'); await p.waitForTimeout(500);
  const x1=await p.evaluate(()=>[...document.querySelectorAll('#ph .birds g')].map(g=>g.getBoundingClientRect().left)); await p.waitForTimeout(1500); const x2=await p.evaluate(()=>[...document.querySelectorAll('#ph .birds g')].map(g=>g.getBoundingClientRect().left)); assert(x1.length&&x1.some((v,i)=>Math.abs(v-x2[i])>4),'they move across the sky');
  // gone quickly when leaving Today, back on return
  await p.click('#tabs button[data-tab=days]'); await p.waitForTimeout(450); assert(await op(p)<.03,'the layer is gone 450 ms after leaving Today'); await p.click('#tabs button[data-tab=today]'); await p.waitForTimeout(1200); assert(await op(p)>.5,'and back on Today');
  assert.deepStrictEqual(errs,[]); await ctx.close(); ok('day: a bird or two fly above the disc, no clouds, the layer leaves and returns with Today');}
 // 2. night: no birds by themselves (the shooting stars have it)
 {const {ctx,p,errs}=await app(MIDNIGHT); assert(/night|first|evening/.test(await p.evaluate(()=>document.getElementById('ph').dataset.sky))); assert.strictEqual(await p.evaluate(()=>window.lightlyBirds()),false,'no birds under a night sky'); assert.strictEqual(await count(p),0); assert(await op(p)<.03); assert.deepStrictEqual(errs,[]); await ctx.close(); ok('night: no birds');}
 // 3. Reduce Motion: none
 {const {ctx,p,errs}=await app(NOON,{reducedMotion:'reduce'}); assert.strictEqual(await p.evaluate(()=>window.lightlyBirds()),false); assert.strictEqual(await p.evaluate(()=>window.lightlyBirds(true)),false); assert.strictEqual(await count(p),0); assert.deepStrictEqual(errs,[]); await ctx.close(); ok('Reduce Motion: no birds');}
 // 4. they come by themselves in the day (the first flock within about 10 seconds), and not over a sheet
 {const {ctx,p,errs}=await app(NOON); await p.waitForFunction(()=>document.querySelectorAll('#ph .birds g').length>0,null,{timeout:12000}); assert.deepStrictEqual(errs,[]); await ctx.close(); ok('day: the first flock comes by itself within about 10 s');}
 // 5. the concept page
 {const ctx=await b.newContext({viewport:{width:1280,height:1000},timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto('http://localhost:'+port+'/concept/'); await p.waitForTimeout(1500);
  assert.strictEqual(await p.evaluate(()=>document.querySelectorAll('.clouds').length),0); assert.strictEqual(await p.evaluate(()=>typeof window.lightlyBirds),'function');
  await p.evaluate(()=>{ document.getElementById('ph').setAttribute('data-sky','day'); }); assert.strictEqual(await p.evaluate(()=>window.lightlyBirds(true)),true); assert(await count(p)>=1); assert.deepStrictEqual(errs,[]); await ctx.close(); ok('concept page: birds fly under a day sky, no clouds');}
 await b.close(); srv.close(); console.log('birds tests passed'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
