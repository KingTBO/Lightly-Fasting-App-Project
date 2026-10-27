/* Alignment check for the real app (index.html at the site root).
   usage: node qa/run-app.js [shots-dir]     needs Playwright, serves the repo itself.
   Covers 390 and 1440 wide, light/dark, EN/中文, and every screen and sheet. Prints only what breaks the rules:
   16 px side margin, 44 pt tap targets, centred icons and labels, no clipped text, nothing outside the phone. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http');
const root=path.join(__dirname,'..'),shots=process.argv[2]||'';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
const H=3600000,D=24*H,probe=fs.readFileSync(path.join(__dirname,'probe.js'),'utf8');
const mk=(n,h,goal=16,ago=n)=>{const e=new Date();e.setDate(e.getDate()-ago);e.setHours(12,0,0,0);return {id:'q'+n+'_'+h,start:e.getTime()-h*H,end:e.getTime(),goalH:goal,plan:'16'};};
function seed(kind,lang){const now=Date.now();const s={v:1,lang,theme:'auto',onboarded:kind!=='ob',profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
 fasts:[mk(1,16.5),mk(2,16),mk(3,15,16),mk(5,17),mk(6,18)],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:true,notify:false},ramadanPreview:false,startedAt:now-9*D};
 if(kind==='mid') s.cur={start:now-6*H,goalH:16,planId:'16',reached:false};
 if(kind==='goal') s.cur={start:now-17*H,goalH:16,planId:'16',reached:true};
 if(kind==='eat'){s.fasts.push({id:'z',start:now-17*H,end:now-2*H,goalH:16,plan:'16'});}
 if(kind==='empty'){s.fasts=[];s.profile.fastedBefore=false;}
 return s;}
(async()=>{await new Promise(r=>srv.listen(0,r));const port=srv.address().port;
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const all={};const add=(st,arr)=>arr.forEach(x=>{const k=x[0]+' | '+x[1];(all[k]=all[k]||{v:x[2],st:new Set()}).st.add(st);});
 const margin=()=>{const ph=document.getElementById('ph').getBoundingClientRect(),out=[];
   document.querySelectorAll('#ph .on .group:not(.ob .group), #ph .on > .btn, #ph .on .act, #ph .on .streak, #ph .on .track, #ph .on .nav, #ph .on .h-title, #ph .tabs, #ph .sheet.open .group, #ph .sheet.open .btn, #ph .sheet.open .facts, #ph .sheet.open h3, #ph .ob-step.on .btn, #ph .ob-step.on .group, #ph .ob-step.on h1, #ph .ob-step.on .ob-top').forEach(e=>{
     const r=e.getBoundingClientRect();if(r.width<2||r.height<2||getComputedStyle(e).visibility==='hidden')return;
     const cs=getComputedStyle(e),L=r.left-ph.left+(e.matches('.h-title,.nav,.sheet h3,.ob-step h1,.ob-top')?parseFloat(cs.paddingLeft)||0:0),R=ph.right-r.right+(e.matches('.h-title,.nav,.sheet h3,.ob-top')?parseFloat(cs.paddingRight)||0:0);
     if(e.matches('.ob-step h1')&&cs.textAlign==='center')return;
     if(Math.abs(L-16)>.6||Math.abs(R-16)>.6)out.push(['margin-16',(e.className||e.tagName)+' "'+(e.textContent||'').trim().slice(0,18)+'"',L.toFixed(1)+'/'+R.toFixed(1)]);});return out;};
 const pages=[];
 for(const w of [390,1440])for(const scheme of ['light','dark'])for(const lng of ['en','zh']){
  const h=w===390?844:900;
  const run=async(kind,steps)=>{const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme,timezoneId:'Asia/Shanghai',geolocation:{latitude:31.23,longitude:121.47},permissions:['geolocation']});
   const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
   await p.addInitScript(([k,v])=>{ if(!sessionStorage.getItem('seeded')){localStorage.setItem(k,v);sessionStorage.setItem('seeded','1');} },['lightly:v1',JSON.stringify(seed(kind,lng))]);
   await p.goto('http://localhost:'+port+'/');await p.addScriptTag({content:probe});await p.waitForTimeout(900);
   const st=`${w}/${scheme}/${lng}`;
   const A=async n=>{await p.waitForTimeout(650);add(st+'/'+n,await p.evaluate(()=>__audit('#ph')));add(st+'/'+n,await p.evaluate(margin));
     if(shots&&w===390&&scheme==='light'&&lng==='en') await p.screenshot({path:path.join(shots,n+'.png')});};
   await steps(p,A,st);if(errs.length)console.log('ERR',st,errs);await ctx.close();};
  await run('idle',async(p,A)=>{await A('today-idle');
    await p.click('#planBtn');await A('plan-sheet');await p.click('[data-act=more]');await A('plan-more');await p.click('[data-act=close]');
    await p.click('#streakBtn');await A('cheat-sheet');await p.click('#sheet [data-act=close]');
    await p.click('#tabs [data-tab=days]');await A('days');await p.click('.cal-g button.done');await p.waitForTimeout(100);await p.click('[data-act=edit]');await A('edit-fast');await p.click('#sheet [data-act=close]');
    await p.click('[data-act=add]');await A('add-fast');await p.click('#sheet [data-act=close]');
    await p.click('#tabs [data-tab=me]');await A('me');await p.click('[data-act=place]');await A('place-sheet');await p.click('#sheet [data-act=close]');
    await p.click('[data-act=unwell]');await A('unwell-sheet');await p.click('#sheet [data-act=close]');await p.click('[data-act=erase]');await A('erase-sheet');await p.click('#sheet [data-act=close]');
    await p.click('#tabs [data-tab=today]');await p.click('#act');await p.waitForTimeout(500);await A('today-started');});
  await run('mid',async(p,A)=>{await A('today-mid');await p.click('#endA');await A('start-edit');});
  await run('goal',async(p,A)=>{await A('today-goal');});
  await run('eat',async(p,A)=>{await A('today-eat');});
  await run('empty',async(p,A)=>{await A('days-empty');await p.click('#tabs [data-tab=days]');await A('days-empty2');});
  await run('ob',async(p,A)=>{await A('ob0');for(let i=1;i<=4;i++){const o=await p.$('#ob .ob-step.on [data-act=obopt],#ob .ob-step.on [data-act=obsafe]:last-child');if(o){await o.click();await p.waitForTimeout(150);}
     const nx=await p.$('#ob .ob-step.on [data-act=obnext]:not([disabled])');if(nx){await nx.click();await p.waitForTimeout(100);await A('ob'+i);}}});
 }
 const keys=Object.keys(all).sort();let n=0;keys.forEach(k=>{if(all[k].v.length||true){}});
 const bad=keys.filter(k=>true);console.log('issues:',bad.length);
 bad.forEach(k=>console.log(k,'=>',all[k].v,'['+[...all[k].st].length+' states e.g. '+[...all[k].st][0]+']'));
 await b.close();srv.close();process.exit(bad.length?1:0);})();
