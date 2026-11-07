/* The setup moon and finale: the welcome moon rests completely dark, the finale fills all the way to full and then shows the sun or the moon the real time calls for (sky included), and the location step never loses its Continue. usage: NODE_PATH=$(npm root -g) node tests/finale.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 const at=h=>'2026-11-06T'+h+':00+08:00';   /* Shanghai: sunrise about 06:13, sunset about 17:03 in November */
 async function fresh(time,o){o=o||{};const c=await b.newContext({viewport:{width:390,height:844},reducedMotion:o.reduced?'reduce':'no-preference',colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai',geolocation:{latitude:31.23,longitude:121.47},permissions:['geolocation']});await c.clock.setFixedTime(new Date(time));const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(()=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:false,prefs:{sound:false,haptics:false,d3:false}}));sessionStorage.s=1}});await q.goto(url);await q.waitForTimeout(800);return q;}
 const next=async q=>{await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(1000);};
 async function toFinale(q,o){o=o||{};await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);await next(q);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1500);await next(q);await q.click('[data-act=obsafe][data-v=none]');await next(q);await q.click('.ob-step.on [data-act=obbodyskip]');await q.waitForTimeout(o.reduced?1200:6500);}
 const fin=q=>q.evaluate(()=>{const s=document.querySelector('.ob-step.on');return {p:__lightly.setup.moon,key:__lightly.setup.key,dawn:s.classList.contains('dawn'),fs:s.dataset.fs,bar:document.documentElement.style.backgroundColor};});

 // 1. the welcome moon rests completely dark, and the header moon starts from nothing
 {const q=await fresh(at('20:30'));const w=await q.evaluate(()=>__lightly.setup.moon);assert(w<.01,'the welcome moon is completely dark, got '+w);
  await next(q);const n=await q.evaluate(()=>__lightly.setup.n);assert(Math.abs(await q.evaluate(()=>__lightly.setup.moon)-1/(n-1))<.02,'the progress moves up from nothing to step 1');
  ok('welcome moon rests dark; the progress starts from nothing');await q.context().close();}

 // 2. the location step always has a Continue, even while it is still finding you
 {const q=await fresh(at('20:30'));await q.evaluate(()=>{navigator.geolocation.getCurrentPosition=()=>{};});
  await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);await next(q);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(600);
  assert.match(await q.textContent('.ob-step.on .ob-cta'),/Continue/,'Continue is there while finding the location');assert.match(await q.textContent('.ob-step.on'),/Finding your location/);
  await next(q);assert.strictEqual(await q.evaluate(()=>__lightly.setup.key),'safety','Continue moves on with the nearest city');
  ok('the location step keeps its Continue while finding the location');await q.context().close();}

 // 3. the finale fills to full, then the real time decides: moon by night, sun by day, with the sky to match
 for(const [h,sun,fs] of [['20:30',false,'night'],['03:00',false,'night'],['12:00',true,'day'],['06:30',true,'dawn'],['16:45',true,'sunset']]){
  const q=await fresh(at(h));await toFinale(q);const r=await fin(q);
  assert.strictEqual(r.key,'summary');assert(r.p>.99,h+': the progress finishes, got '+r.p);assert.strictEqual(r.dawn,sun,h+': '+(sun?'sun and day sky':'the moon stays under the night sky'));assert.strictEqual(r.fs,fs,h+': sky');
  if(sun) assert(r.bar!=='rgb(14, 20, 48)',h+': the strips take the sky colour, not navy'); else assert.strictEqual(r.bar,'rgb(14, 20, 48)',h+': night strips');
  ok('finale at '+h+' Shanghai: '+(sun?'full, then the sun ('+fs+' sky)':'full moon, night sky'));await q.context().close();}

 // 3b. the progress never empties on the way to You're set: it carries on from the header and only goes up
 {const q=await fresh(at('20:30'));await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);await next(q);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1500);await next(q);await q.click('[data-act=obsafe][data-v=none]');await next(q);
  const before=await q.evaluate(()=>__lightly.setup.moon);await q.click('.ob-step.on [data-act=obbodyskip]');
  const seen=await q.evaluate(()=>new Promise(r=>{const a=[],t0=performance.now();(function f(){a.push(__lightly.setup.moon);if(performance.now()-t0<3500)setTimeout(f,40);else r(a);})();}));
  assert(before>.5,'the header progress is well along before You\u2019re set, got '+before);assert(Math.min(...seen)>=before-.03,'it never drops below where the header left it: '+before+' then min '+Math.min(...seen));
  assert(seen.every((v,i)=>i===0||v>=seen[i-1]-.02),'it only goes up');assert(seen[seen.length-1]>.99,'and ends full');
  ok('You\u2019re set: the progress carries on from the header to full, never emptying');await q.context().close();}

 // 3c. the reveal is prompt: the sun starts to turn soon after the moon feels full, not after a long wait
 {const q=await fresh(at('12:00'));await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);await next(q);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1500);await next(q);await q.click('[data-act=obsafe][data-v=none]');await next(q);
  await q.click('.ob-step.on [data-act=obbodyskip]');const t0=Date.now();await q.waitForSelector('.ob-step.fin.dawn',{timeout:5000});const ms=Date.now()-t0;
  assert(ms<2300,'the sun starts to turn within about 2 s of arriving, took '+ms+' ms');ok('the sun starts to turn promptly ('+ms+' ms after the last tap)');await q.context().close();}

 // 3d. no dark detour: You're set glides from the plain background straight to the sky for this hour, and follows the phone's light or dark setting
 {const lum=c=>{const m=c.match(/[\d.]+/g).map(Number);return (.2126*m[0]+.7152*m[1]+.0722*m[2])/255;};
  const run=async(h,dark)=>{const q=await fresh(at(h),{dark});await next(q);await q.click('[data-act=obopt][data-v=first]');await next(q);await next(q);await q.click('.ob-step.on [data-act=obgeo]');await q.waitForTimeout(1500);await next(q);await q.click('[data-act=obsafe][data-v=none]');await next(q);
   await q.click('.ob-step.on [data-act=obbodyskip]');
   const seen=await q.evaluate(()=>new Promise(r=>{const a=[],t0=performance.now();(function f(){const s=document.querySelector('.ob-step.fin');if(s)a.push(getComputedStyle(s).backgroundColor+'|'+s.classList.contains('sky')+'|'+getComputedStyle(s.querySelector('.dawnbg')).opacity);if(performance.now()-t0<5200)setTimeout(f,50);else r(a);})();}));
   await q.context().close();const early=seen.filter(x=>x.split('|')[1]==='false'&&+x.split('|')[2]>.02);assert.strictEqual(early.length,0,'the sky never shows before the moon turns, not even while the step slides in: '+early.slice(0,2));return seen.map(x=>lum(x.split('|')[0]));};
  let l=await run('12:00',false);assert(Math.min(...l)>.55,'light mode, daytime: the background never goes dark on the way to the sky (darkest '+Math.min(...l).toFixed(2)+')');ok('light mode, daytime: no dark detour (darkest '+Math.min(...l).toFixed(2)+')');
  l=await run('12:00',true);assert(Math.max(...l)<.4,'dark mode, daytime: the sky stays soft and deep, never a bright flash (brightest '+Math.max(...l).toFixed(2)+')');ok('dark mode, daytime: no bright flash (brightest '+Math.max(...l).toFixed(2)+')');
  l=await run('06:30',true);assert(Math.max(...l)<.4,'dark mode, dawn: never a bright flash (brightest '+Math.max(...l).toFixed(2)+')');ok('dark mode, dawn: no bright flash');
  l=await run('20:30',false);assert(l[0]>.8&&l[l.length-1]<.1,'light mode, night: from the plain light background to night');assert(l.every((v,i)=>i===0||v<=l[i-1]+.01),'and it only gets darker');ok('light mode, night: glides to night, only getting darker');
  l=await run('20:30',true);assert(Math.max(...l)<.1,'dark mode, night: stays dark all the way');ok('dark mode, night: stays dark');}

 // 4. Reduce Motion lands in the same place
 for(const [h,sun] of [['23:00',false],['12:00',true]]){const q=await fresh(at(h),{reduced:true});await toFinale(q,{reduced:true});const r=await fin(q);assert(r.p>.99&&r.dawn===sun,'reduce motion at '+h+': '+JSON.stringify(r));await q.context().close();}
 ok('Reduce Motion: full, and the sun or moon straight away');

 // 5. the concept page does the same
 for(const [h,sun] of [['20:30',false],['12:00',true]]){const c=await b.newContext({viewport:{width:430,height:1000},timezoneId:'Asia/Shanghai'});await c.clock.setFixedTime(new Date(at(h)));const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url+'concept/');await q.waitForTimeout(800);
  await q.evaluate(()=>document.getElementById('obph').scrollIntoView({block:'center'}));await q.waitForTimeout(500);
  assert((await q.evaluate(()=>{const e=document.querySelector('#obph .ob-moonlayer');return !!e;})),'moon layer');
  for(let i=0;i<9&&!(await q.$('#obph.fin'));i++){
   const last='#obStage .ob-step:last-child ';
   if(await q.$(last+'[data-loc=here]')) await q.click(last+'[data-loc=here]');
   else if(await q.$(last+'[data-next][disabled]')) await q.click(last+'.ob-opt');
   await q.waitForTimeout(300);await q.click(last+'[data-next]');await q.waitForTimeout(900);}
  await q.waitForTimeout(6500);const r=await q.evaluate(()=>({dawn:document.getElementById('obph').classList.contains('dawn'),fin:document.getElementById('obph').classList.contains('fin'),fs:document.getElementById('obph').dataset.fs}));
  assert(r.fin,'reached You’re set');assert.strictEqual(r.dawn,sun,'concept '+h+': '+JSON.stringify(r));await c.close();}
 ok('concept page: full, then the sun or the moon by the real time');

 assert.deepStrictEqual(errs,[],'no page errors');await b.close();srv.close();console.log('done');})().catch(e=>{console.error(e);process.exit(1);});
