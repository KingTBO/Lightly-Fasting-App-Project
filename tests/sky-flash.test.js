/* The engraved figure on the concept page's group screen never flashes: switch light and dark, leave the Friends tab and come back, and its opacity changes smoothly on every frame.
   Also under Reduce Motion (no automatic cycle; tapping the sky still shows the figure).   NODE_PATH=$(npm root -g) node tests/sky-flash.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m);
(async()=>{ await new Promise(r=>srv.listen(0,r)); const url='http://localhost:'+srv.address().port+'/concept/'; const b=await chromium.launch();
 const open=async(opts)=>{ const ctx=await b.newContext(Object.assign({viewport:{width:1280,height:1000}},opts||{})); await ctx.addInitScript(()=>{ const R=Date, fixed=new R(2026,10,12,12,0,0).getTime(); class D extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()); } } window.Date=D; });   /* Scorpio */
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto(url); await p.waitForTimeout(700); await p.click('#tryFr'); await p.waitForSelector('.fr-sky'); await p.waitForTimeout(500); return {ctx,p,errs}; };
 const tab=(p,n)=>p.click('#ph .tabs>span:nth-of-type('+n+')');
 // 1. the automatic cycle across a theme switch and a trip to another tab
 {const {ctx,p,errs}=await open(); assert.strictEqual(await p.getAttribute('.fr-sky','data-look'),'auto');
  await p.evaluate(()=>{ window.__fr=[]; window.__stop=false; const seen=new WeakSet(); let prev=null; (function f(){ if(window.__stop) return; const fr=document.getElementById('frScr'), vis=fr&&fr.classList.contains('open'); const a=document.querySelector('#frScr .fr-art');
     if(vis&&a){ const cs=getComputedStyle(a); const eff=cs.visibility==='hidden'?0:parseFloat(cs.opacity); const fresh=!seen.has(a); seen.add(a); window.__fr.push({o:eff,fresh,prev}); prev=eff; } else prev=null; requestAnimationFrame(f); })(); });
  await p.waitForFunction(()=>{ const a=document.querySelector('#frScr .fr-art'); return a&&parseFloat(getComputedStyle(a).opacity)>.3; },null,{timeout:25000});   // leave while the figure is in full view
  await tab(p,4); await p.waitForTimeout(400); await p.evaluate(()=>document.documentElement.setAttribute('data-theme','dark')); await p.waitForTimeout(300); await tab(p,3); await p.waitForSelector('#frScr .fr-sky'); await p.waitForTimeout(2500);
  await tab(p,4); await p.waitForTimeout(300); await p.evaluate(()=>document.documentElement.setAttribute('data-theme','light')); await tab(p,3); await p.waitForSelector('#frScr .fr-sky'); await p.waitForTimeout(14500);
  const fr=await p.evaluate(()=>{ window.__stop=true; return window.__fr; });
  let worst=0, popped=0; for(let i=1;i<fr.length;i++){ if(fr[i].prev!==null){ worst=Math.max(worst,Math.abs(fr[i].o-fr[i-1].o)); if(fr[i].fresh&&fr[i].o>.05&&fr[i-1].o>.05) popped++; } }
  assert(fr.length>200,'sampled every frame ('+fr.length+')'); assert(worst<=.25,'the figure never jumps between frames: '+worst.toFixed(3)); assert.strictEqual(popped,0,'a re-built figure never pops in mid-fade'); assert(Math.max(...fr.map(x=>x.o))>.2,'and it rises out of the blur'); assert.deepStrictEqual(errs,[]);
  await ctx.close(); ok('concept page: the figure never flashes across a theme switch and a trip to another tab (largest step '+worst.toFixed(3)+')');}
 // 2. Reduce Motion: no automatic cycle, tapping the sky still shows the figure, gently
 {const {ctx,p,errs}=await open({reducedMotion:'reduce'}); await p.waitForTimeout(800);
  const st=()=>p.evaluate(()=>{ const a=document.querySelector('#frScr .fr-art'), cs=getComputedStyle(a); return {an:cs.animationName,op:parseFloat(cs.opacity),vis:cs.visibility}; });
  const s1=await st(); assert.strictEqual(s1.an,'none'); assert.strictEqual(s1.op,0); await p.waitForTimeout(3000); assert.strictEqual((await st()).op,0,'nothing cycles by itself');
  await p.click('#frScr .fr-look',{position:{x:20,y:200}}); await p.waitForTimeout(900); const s2=await st(); assert(s2.op>.2&&s2.vis==='visible','tapping the sky shows the figure'); await p.click('#frScr .fr-look',{position:{x:20,y:200}}); await p.waitForTimeout(900); assert.strictEqual((await st()).op,0,'and tapping again hides it'); assert.deepStrictEqual(errs,[]);
  await ctx.close(); ok('concept page, Reduce Motion: no automatic cycle, tap switches Stars and Figure');}
 await b.close(); srv.close(); console.log('sky flash tests passed'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
