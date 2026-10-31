/* The wheel pickers: momentum, snap at rest, looping, 24-hour columns, a haptic tick per value. usage: NODE_PATH=$(npm root -g) node tests/wheel.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
const ok=n=>console.log('ok -',n);
(async()=>{await new Promise(r=>srv.listen(0,r));const base='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const page of ['',  'concept/']){
  const ctx=await b.newContext({viewport:{width:390,height:844},hasTouch:false});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{window.__v=[];navigator.vibrate=function(x){window.__v.push(x);return true;};});
  await p.goto(base+page);await p.waitForTimeout(600);
  const app=page==='';
  if(app){ // onboarding: "I've fasted before" opens the start-time wheel
   await p.click('[data-act=obnext]');await p.waitForTimeout(900);await p.click('[data-act=obopt][data-v=before]');await p.click('[data-act=obnext]');await p.waitForTimeout(900);await p.click('.ob-step.on [data-act=obnext]');await p.waitForTimeout(900);
   await p.click('#obStart .pk-row');
  } else { // concept page: same wheel in its onboarding demo
   await p.evaluate(()=>document.getElementById('obph').scrollIntoView({block:'center'}));await p.waitForTimeout(500);
   const nx=async()=>{await p.click('#obStage .ob-step.on [data-next], #obStage [data-next]');await p.waitForTimeout(1000);};
   await nx(); await p.click('#obStage [data-v=some]'); await nx(); await nx();
   assert(await p.$('#obStage .pk-row'),'concept has a wheel row'); await p.click('#obStage .pk-row');
  }
  await p.waitForTimeout(700);
  const sel=app?'#obStart':'#obStage .pk';
  const info=()=>p.evaluate(s=>{const pk=document.querySelector(s);const c=k=>pk.querySelector('[data-c='+k+']');return {cols:[...pk.querySelectorAll('.pk-c')].map(x=>x.dataset.c),h:c('h').dataset.sel,m:c('m').dataset.sel,top:c('m').scrollTop,val:pk.dataset.val,txt:pk.querySelector('.pk-v').textContent,rows:c('h').children.length};},sel);
  let i=await info();
  assert.deepStrictEqual(i.cols,['h','m'],'only hour and minute columns: no AM/PM');
  assert.strictEqual(i.rows,24*7,'hour wheel loops (7 copies of 24)');
  assert.match(i.txt,/^\d\d:\d\d$/,'the row shows a 24-hour time, got '+i.txt);
  assert(!(await p.evaluate(s=>/AM|PM|上午|下午/.test(document.querySelector(s).innerText),sel)),'no AM or PM anywhere in the picker');
  ok((app?'app':'concept')+': 24-hour columns, looping');
  const box=await (await p.$(sel+' [data-c=m]')).boundingBox(), x=box.x+box.width/2, y0=box.y+box.height/2;
  // a hard flick upward (finger moves up, values go forward): quick 100 px stroke
  await p.evaluate(()=>{window.__v.length=0;});
  await p.mouse.move(x,y0+50);await p.mouse.down();await p.mouse.move(x,y0-50,{steps:5});await p.mouse.up();
  await p.waitForTimeout(150);const mid=(await info()).top;
  await p.waitForTimeout(250);const later=(await info()).top;
  assert(later!==mid,'still gliding 400 ms after the finger left (momentum)');
  await p.waitForTimeout(4500);
  const after=await info();
  assert.strictEqual(after.top%36,0,'comes to rest exactly on a row (snap only at rest), top='+after.top);
  const moved=((+after.m-+i.m)+60)%60;
  assert(moved>=8,'a quick flick carries past many values, moved '+moved);
  const ticks=await p.evaluate(()=>window.__v.length);
  assert(ticks>=6,'a haptic tick per value passed, got '+ticks);
  ok((app?'app':'concept')+': flick glides '+moved+' values, ends on a row, '+ticks+' ticks');
  // loop: from 59 going forward lands on 00 with no end
  await p.evaluate(s=>{const c=document.querySelector(s+' [data-c=m]');c.scrollTop=(60*3+59)*36;},sel);await p.waitForTimeout(300);
  assert.strictEqual((await info()).m,'59');
  await p.mouse.move(x,y0+30);await p.mouse.down();for(let k=1;k<=4;k++){await p.mouse.move(x,y0+30-k*18);await p.waitForTimeout(10);}await p.mouse.up();await p.waitForTimeout(4500);
  const wrapped=await info();assert(+wrapped.m<59,'minutes loop past 59, now '+wrapped.m);
  ok((app?'app':'concept')+': minutes loop past 59 to '+wrapped.m);
  // no tick when the wheel recentres, and Vibration off silences the tick (app only)
  if(app){
   await p.evaluate(()=>{window.__v.length=0;});await p.keyboard.press('Escape');
   const h0=(await info()).h;await p.focus(sel+' [data-c=h]');await p.keyboard.press('ArrowDown');await p.waitForTimeout(500);
   assert.strictEqual(+(await info()).h,(+h0+1)%24,'arrow key steps one value');
   ok('app: arrow keys step one value');
  }
  assert.deepStrictEqual(errs,[]);await ctx.close();
 }
 // Reduce Motion: follows the finger, jumps to a row instead of gliding
 {const ctx=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await ctx.newPage();await p.goto(base);await p.waitForTimeout(600);
  await p.click('[data-act=obnext]');await p.waitForTimeout(900);await p.click('[data-act=obopt][data-v=before]');await p.click('[data-act=obnext]');await p.waitForTimeout(900);await p.click('.ob-step.on [data-act=obnext]');await p.waitForTimeout(900);await p.click('#obStart .pk-row');await p.waitForTimeout(700);
  const box=await (await p.$('#obStart [data-c=m]')).boundingBox(), x=box.x+box.width/2, y0=box.y+box.height/2;
  await p.mouse.move(x,y0+50);await p.mouse.down();await p.mouse.move(x,y0-50,{steps:5});await p.mouse.up();await p.waitForTimeout(100);
  const t=await p.evaluate(()=>document.querySelector('#obStart [data-c=m]').scrollTop);assert.strictEqual(t%36,0,'Reduce Motion: lands on a row at once');ok('Reduce Motion: no gliding');await ctx.close();}
 await b.close();srv.close();console.log('wheel tests ok');})().catch(e=>{console.error(e);process.exit(1);});
