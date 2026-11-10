/* Tester options: the Ramadan preview switch and the version-line screen-size pop-up are hidden from everyone,
   and come back only after 7 quick taps on the version line (this phone only, never saved with the fasts).
   NODE_PATH=$(npm root -g) node tests/tester.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const D=86400000;
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:Date.now()-9*D},o||{});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch();
 const open=async(s,keep)=>{ const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(([s,keep])=>{ if(!sessionStorage.getItem('seeded')||!keep){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },[s,keep]);
  await p.clock.setFixedTime(new Date('2026-11-10T12:00:00+08:00')); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(600); await p.click('#tabs button[data-tab=me]'); await p.waitForTimeout(300); return {ctx,p,errs}; };
 const hasPreview=p=>p.evaluate(()=>!!document.querySelector('#me [data-k=ram]'));
 const taps=async(p,n)=>{ for(let i=0;i<n;i++){ await p.click('#me [data-act=diag]'); await p.waitForTimeout(40); } };
 /* 1. a normal user: no preview switch, and the version line shows no pop-up */
 {const {ctx,p,errs}=await open(seed()); assert(!(await hasPreview(p)),'no Preview Ramadan switch for a normal user');
  await taps(p,1); await p.waitForTimeout(200); const t=await p.evaluate(()=>{ const x=document.getElementById('toast'); return x&&x.classList.contains('show')?x.textContent:''; }); assert(!/win \d/.test(t),'one tap on the version line shows no screen sizes ('+t+')');
  /* 2. six taps are not enough */
  await taps(p,5); assert(!(await hasPreview(p)),'six taps are not enough');
  /* 3. seven taps turn the tester options on: the switch shows, the line says tester */
  await p.waitForTimeout(2200); await taps(p,7); await p.waitForTimeout(300); assert(await hasPreview(p),'seven taps show the Preview Ramadan switch');
  assert(/tester/.test(await p.textContent('#me [data-act=diag]')),'the version line says tester');
  assert.strictEqual(await p.evaluate(()=>localStorage.getItem('lightly:tester')),'1','kept on this phone');
  assert(!/tester/i.test(await p.evaluate(()=>localStorage.getItem('lightly:v1'))),'but not in the saved fasts (so not in the cloud backup)');
  /* 4. with tester on, one tap shows the sizes */
  await p.waitForTimeout(2200); await taps(p,1); await p.waitForTimeout(200); const t2=await p.evaluate(()=>document.getElementById('toast').textContent); assert(/win \d+×\d+/.test(t2),'tester: a tap shows the screen sizes ('+t2+')');
  /* 5. the switch works */
  await p.click('#me [data-k=ram]'); await p.waitForTimeout(300); assert.strictEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')).ramadanPreview),true,'the preview switch turns Ramadan preview on');
  /* 6. seven more taps turn tester off, but the preview switch stays while the preview is on, so it can be turned off */
  await p.waitForTimeout(2200); await taps(p,7); await p.waitForTimeout(300); assert.strictEqual(await p.evaluate(()=>localStorage.getItem('lightly:tester')),null,'seven taps again turn tester off');
  assert(await hasPreview(p),'a switch already on stays visible so it can be turned off');
  await p.click('#me [data-k=ram]'); await p.waitForTimeout(300); assert(!(await hasPreview(p)),'and goes away once the preview is off');
  assert.deepStrictEqual(errs,[]); await ctx.close(); ok('normal user sees neither; seven taps toggle tester; the switch and the sizes work only in tester'); }
 /* 7. a person who left the preview on before this release can still turn it off */
 {const {ctx,p,errs}=await open(seed({ramadanPreview:true})); assert(await hasPreview(p),'an old preview that is still on keeps its switch'); assert.deepStrictEqual(errs,[]); await ctx.close(); ok('an existing preview can be turned off'); }
 /* 8. 中文 */
 {const {ctx,p}=await open(seed({lang:'zh'})); await taps(p,7); await p.waitForTimeout(300); assert(await hasPreview(p)); assert(/测试/.test(await p.textContent('#me [data-act=diag]'))); await ctx.close(); ok('中文: tester shows 测试'); }
 await b.close(); srv.close(); console.log('tester tests passed'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
