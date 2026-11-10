/* The daytime clouds on Today never linger as grey smudges when you switch to another tab (and back).
   The tabs after Today have a plain dark (or light) background that appears at once, so the clouds must be gone
   about as fast as Today's own content (a fraction of a second), not fade away slowly over a second.
   App and concept page, light and dark.   NODE_PATH=$(npm root -g) node tests/clouds-fade.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m);
const H=3600000,D=24*H;
function seed(){ const now=Date.now(); return {v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:now-9*D}; }
/* a frame-by-frame record of how visible the clouds are */
const watch=()=>{ window.__cl=[]; window.__stop=false; const t0=performance.now(); (function f(){ if(window.__stop) return; const c=document.querySelector('#ph .clouds'); if(c) window.__cl.push({t:performance.now()-t0,o:parseFloat(getComputedStyle(c).opacity)}); requestAnimationFrame(f); })(); };
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const scheme of ['light','dark']) {
  /* the app: noon in Shanghai, so the sky is the bright day sky with clouds */
  {const ctx=await b.newContext({viewport:{width:390,height:844},colorScheme:scheme,timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   await p.addInitScript(s=>{ localStorage.setItem('lightly:v1',JSON.stringify(s)); },seed());
   await p.clock.setFixedTime(new Date('2026-11-10T12:00:00+08:00')); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(2500);
   const full=await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#ph .clouds')).opacity)); assert(full>.5,'clouds are up on a daytime Today ('+full+')');
   await p.evaluate(watch); await p.click('#tabs button[data-tab=days]'); await p.waitForTimeout(1600);
   let cl=await p.evaluate(()=>{ window.__stop=true; return window.__cl; }); const t0=cl[0].t; let gone=cl.find(x=>x.o<.03); assert(gone,'the clouds go away'); assert(gone.t-t0<=450,scheme+' app: clouds are gone within 450 ms of leaving Today (took '+Math.round(gone.t-t0)+' ms)');
   const mid=cl.filter(x=>x.t-t0>=450&&x.t-t0<1200); assert(mid.every(x=>x.o<.03),'and stay gone while the tab settles');
   await p.evaluate(watch); await p.click('#tabs button[data-tab=today]'); await p.waitForTimeout(1600); cl=await p.evaluate(()=>{ window.__stop=true; return window.__cl; });
   const back=cl[cl.length-1].o; assert(back>.5,'clouds are back on Today ('+back+')'); assert.deepStrictEqual(errs,[]);
   await ctx.close(); ok(scheme+' app: the clouds leave with Today (gone in '+Math.round(gone.t-t0)+' ms) and return when you come back');}
  /* the concept page: same two taps */
  {const ctx=await b.newContext({viewport:{width:1280,height:1000},colorScheme:scheme,timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
   await p.clock.setFixedTime(new Date('2026-11-10T12:00:00+08:00')); await p.goto('http://localhost:'+port+'/concept/'); await p.waitForTimeout(2500);
   await p.evaluate(()=>{ document.getElementById('ph').style.setProperty('--clouds','.85'); }); await p.waitForTimeout(1600);   // the concept page shows its own demo sky (night at this hour): bring the daytime clouds up
   const full=await p.evaluate(()=>parseFloat(getComputedStyle(document.querySelector('#ph .clouds')).opacity));
   if(full>.5){ await p.evaluate(watch); await p.click('#ph .tabs>span:nth-of-type(2)'); await p.waitForTimeout(1600);
    const cl=await p.evaluate(()=>{ window.__stop=true; return window.__cl; }); const t0=cl[0].t; const gone=cl.find(x=>x.o<.03); assert(gone&&gone.t-t0<=450,scheme+' concept: clouds are gone within 450 ms (took '+(gone?Math.round(gone.t-t0):'never')+' ms)'); assert.deepStrictEqual(errs,[]);
    ok(scheme+' concept: the clouds leave with Today (gone in '+Math.round(gone.t-t0)+' ms)'); } else console.log('skip concept ('+scheme+'): no daytime clouds at this clock ('+full+')');
   await ctx.close(); }
 }
 await b.close(); srv.close(); console.log('clouds fade tests passed'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
