/* Today's small text stays readable under every sky (WCAG AA, 4.5:1), and the top row and the Days stats hold together on a 320 px phone (audit S2 and S3).
   It reads the real colours: the text is hidden in a screenshot to get the pixels behind it, then the text colour is laid over them. The worst pixel counts.
   NODE_PATH=$(npm root -g) node tests/sky-contrast.test.js */
const http=require('http'),fs=require('fs'),path=require('path'); const {chromium}=require('playwright');
const root=path.join(__dirname,'..'), assert=require('assert');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const lum=c=>{const a=c.map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*a[0]+.7152*a[1]+.0722*a[2]};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
/* 320 px, 中文: the plan button stays on one line, the sky pill is not cut off, and the Days average does not wrap */
async function layout(b,port){ const H=3600000,D=86400000;
 for(const T of ['03:00','06:40','17:20']) for(const plan of ['13','20','36']) for(const cur of [false,true]){
  const ctx=await b.newContext({viewport:{width:320,height:640},timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); const at=new Date('2026-11-10T'+T+':00+08:00').getTime();
  const fasts=[1,2,3].map(i=>({id:'f'+i,start:at-i*D-17*H,end:at-i*D,goalH:16,plan:'16'}));
  await p.addInitScript(s=>localStorage.setItem('lightly:v1',JSON.stringify(s)),{v:1,lang:'zh',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:plan,customH:17,place:{key:'shanghai'},cur:cur?{start:at-3*H,goalH:16,planId:plan}:null,fasts,flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:at-9*D});
  await p.clock.setFixedTime(new Date(at)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(600);
  const m=await p.evaluate(()=>{const g=s=>document.querySelector(s),pl=g('#planBtn'),sx=g('#skyTx'),pill=g('#sub');return {planH:Math.round(pl.getBoundingClientRect().height),clip:sx.scrollWidth-sx.clientWidth,right:pill.getBoundingClientRect().right,planLeft:pl.getBoundingClientRect().left};});
  assert.ok(m.planH<=46,'plan button on one line ('+T+' '+plan+' '+cur+': '+m.planH+' px high)'); assert.ok(m.clip<=0,'sky pill text is not cut off ('+T+' '+plan+' '+cur+')'); assert.ok(m.right<=m.planLeft+1,'pill and plan button do not overlap');
  await ctx.close(); }
 const ctx=await b.newContext({viewport:{width:320,height:640},timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); const at=new Date('2026-11-10T12:00:00+08:00').getTime();
 const fasts=[1,2,3,4,5].map(i=>({id:'f'+i,start:at-i*D-17*H,end:at-i*D,goalH:16,plan:'16'}));
 await p.addInitScript(s=>localStorage.setItem('lightly:v1',JSON.stringify(s)),{v:1,lang:'zh',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts,flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:at-9*D});
 await p.clock.setFixedTime(new Date(at)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(500); await p.click('#tabs button[data-tab=days]'); await p.waitForTimeout(700);
 const st=await p.evaluate(()=>[...document.querySelectorAll('.tstats b')].map(b=>({h:Math.round(b.getBoundingClientRect().height),t:b.textContent})));
 assert.strictEqual(st.length,3); st.forEach(x=>assert.ok(x.h<=26,'the Days stat "'+x.t+'" stays on one line ('+x.h+' px)')); await ctx.close(); console.log('ok  320 px, 中文: plan button, sky pill and Days stats hold together'); }
const SELS={end:'#actLbl',elapsed:'#readK',alt:'#readAlt',tip:'#readTip',pillText:'#skyTx',pillStage:'#skyStage',tabOn:'#tabs>button.sel span',evt:'#evtT',sev:'.strip .sev',cap:'.ends .cap',streak:'.streak .tx small'};
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const out=[];
 const now=Date.now();
 const TIMES=['02:00','05:50','06:25','08:30','12:00','16:40','17:45'];
 for(const [W,LANG] of [[390,'en'],[320,'zh']]) for(const scheme of ['light','dark']) for(const T of TIMES){ const at=new Date('2026-11-10T'+T+':00+08:00').getTime(); 
  const ctx=await b.newContext({viewport:{width:W,height:844},colorScheme:scheme,timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage();
  const seed={v:1,lang:LANG,theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:{start:at-6*3600000,goalH:16,planId:'16'},fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:now-9*86400000};
  await p.addInitScript(s=>localStorage.setItem('lightly:v1',JSON.stringify(s)),seed);
  await p.clock.setFixedTime(new Date(at)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1800); const sky=await p.evaluate(()=>document.getElementById('ph').getAttribute('data-sky')); await p.evaluate(()=>{const st=document.createElement('style'); st.textContent='*{transition:none!important;animation:none!important}'; document.head.appendChild(st);}); await p.waitForTimeout(300);

  for(const [name,sel] of Object.entries(SELS)){
   const info=await p.evaluate(sel=>{ const e=document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(); if(r.width<2||r.height<2) return null; const cs=getComputedStyle(e); let o=1; for(let q=e;q;q=q.parentElement){o*=+getComputedStyle(q).opacity;} return {x:r.x,y:r.y,w:r.width,h:r.height,color:(e instanceof SVGElement?cs.fill:cs.color),o,fill:cs.fill,text:e.textContent.trim().slice(0,20)}; },sel);
   if(!info||!info.text) continue;
   await p.addStyleTag({content:'.__hide *{color:transparent!important;fill:transparent!important;stroke:transparent!important}'}); await p.evaluate(()=>document.getElementById('ph').classList.add('__hide'));
   const buf=await p.screenshot({clip:{x:info.x,y:info.y,width:Math.max(1,info.w),height:Math.max(1,info.h)}}); await p.evaluate(()=>document.getElementById('ph').classList.remove('__hide'));
   const png=await p.evaluate(async b64=>{ const img=new Image(); img.src='data:image/png;base64,'+b64; await img.decode(); const c=document.createElement('canvas'); c.width=img.width; c.height=img.height; const x=c.getContext('2d'); x.drawImage(img,0,0); const d=x.getImageData(0,0,c.width,c.height).data; const px=[]; for(let i=0;i<d.length;i+=4*7) px.push([d[i],d[i+1],d[i+2]]); return px; },buf.toString('base64'));
   let m=info.color.match(/[\d.]+/g).map(Number); if(/^color\(srgb/.test(info.color)) m=m.map((v,i)=>i<3?v*255:v); const a=(m[3]===undefined?1:m[3])*info.o; const fg=m.slice(0,3);
   let worst=99; for(const bg of png){ const f=fg.map((v,i)=>v*a+bg[i]*(1-a)); worst=Math.min(worst,cr(f,bg)); }
   out.push({scheme,sky:W+' '+LANG+' '+T+' '+sky,name,text:info.text,ratio:+worst.toFixed(2)});
  }
  await ctx.close(); }
 const bad=out.filter(o=>o.ratio<4.5); console.log('checked',out.length,'text/sky pairs'); console.log(bad.length?bad.map(o=>`${o.ratio}  ${o.scheme}/${o.sky}/${o.name} "${o.text}"`).join('\n'):'all >= 4.5');
 const min={}; out.forEach(o=>{min[o.name]=Math.min(min[o.name]??99,o.ratio)}); console.log('min per element',JSON.stringify(min));
 assert.ok(out.length>150,'enough pairs were measured ('+out.length+')'); assert.deepStrictEqual(bad,[],'every pair is at least 4.5:1');
 await layout(b,port); await b.close(); srv.close(); console.log('sky contrast and narrow-phone tests passed'); process.exit(0); })().catch(e=>{console.error(e);process.exit(1)});
