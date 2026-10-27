/* Alignment + contrast check for the concept (landing) page.  usage: NODE_PATH=$(npm root -g) node qa/run.js index.html tag */
const {chromium}=require('playwright');const fs=require('fs');
const [,,file,tag]=process.argv;
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const dir=require('path').join(__dirname,'..','concept')+'/';const probe=fs.readFileSync(__dirname+'/probe.js','utf8')+fs.readFileSync(__dirname+'/contrast.js','utf8');
 fs.writeFileSync(dir+'_wrap.html','<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+fs.readFileSync(dir+file,'utf8')+'</body></html>');
 const all={};
 const add=(st,arr)=>arr.forEach(x=>{const k=x[0]+' | '+x[1]; (all[k]=all[k]||{v:x[2],st:new Set()}).st.add(st);});
 for(const w of [1440,390]) for(const scheme of ['light','dark']) for(const lng of ['en','zh']){
  const ctx=await b.newContext({viewport:{width:w,height:900},colorScheme:scheme});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(l=>{try{localStorage.setItem('lightly-lang',l)}catch(e){}},lng);
  await p.goto('file://'+dir+'_wrap.html');await p.addScriptTag({content:probe});await p.waitForTimeout(900);
  const st=`${w}/${scheme}/${lng}`; const A=async n=>add(st+'/'+n,await p.evaluate(()=>__audit().concat(__contrast('body'))));
  await A('load');
  const steps=[['goal','#moments [data-go="goal"]',2300],['eat','#moments [data-go="eat"]',800],['eat2',null,3500]];
  for(const [n,sel,ms] of steps){ if(sel&&await p.$(sel)) await p.click(sel); await p.waitForTimeout(ms); await A(n); }
  if(await p.$('#planBtn')){ await p.click('#planBtn');await p.waitForTimeout(600);await A('plan-sheet');await p.click('#psMore');await p.waitForTimeout(500);await A('plan-more');await p.click('#psList [data-id="13"]');await p.waitForTimeout(700);await A('plan-picked');await p.click('#planBtn');await p.waitForTimeout(500);await p.click('#psList [data-id="16"]');await p.waitForTimeout(700);}
  if(await p.$('#meScr')){ await p.click('#ph .tabs>span:nth-of-type(4)');await p.waitForTimeout(500);await A('me-out');await p.click('#meBtns button:first-child');await p.waitForTimeout(300);await A('me-in');await p.click('#ph .tabs>span:nth-of-type(1)');await p.waitForTimeout(400);}
  if(await p.$('#rPrev')){ await p.click('#rPrev');await p.waitForTimeout(1200);await A('ram');
    for(const k of ['suhoor','iftar']){await p.click(`#rMoments [data-r="${k}"]`);await p.waitForTimeout(1600);await A('ram-'+k);}
    await p.click('#rMoments [data-r="mid"]');await p.waitForTimeout(1600);await p.click('#rAct');await p.waitForTimeout(600);await A('ram-sheet');await p.click('#rCancel');}
  if(await p.$('#obStage')){ for(let i=0;i<4;i++){ const o=await p.$('#obStage .ob-step:last-child .ob-opt:not([disabled])'); if(o){ await o.click(); await p.waitForTimeout(200);} const nx=await p.$('#obStage .ob-step:last-child [data-next]:not([disabled])'); if(nx){ await nx.click(); await p.waitForTimeout(700); await A('ob'+(i+1)); } } }
  if(errs.length) console.log('ERR',st,errs);
  await ctx.close(); }
 const keys=Object.keys(all).sort(); console.log(tag,'issues:',keys.length);
 keys.forEach(k=>console.log(k,'=>',all[k].v,'['+[...all[k].st].length+' states e.g. '+[...all[k].st][0]+']'));
 await b.close();fs.unlinkSync(dir+'_wrap.html');})();
