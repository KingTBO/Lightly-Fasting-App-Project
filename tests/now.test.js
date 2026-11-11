/* What is happening now (v0.103.0).
   1. While an ordinary fast runs, a quiet line under the timer says what the body is doing ("Your body now: switching fuel").
      It takes the hint's place once the hint has gone quiet, and nothing on Today moves when it appears.
   2. A tap opens a sheet with the stages of a fast: the current one open, the others a tap away, with the sources at the foot.
   3. The stage follows the hours fasted. Stages beyond the plan are never listed, so the sheet does not invite a longer fast.
   4. The line is not offered at rest, in the eating window, in Care mode or during a Ramadan fast.
   5. The words stay kind: nothing about weight, calories or burning.
   6. 中文, a 320 px phone, and the concept page.
   NODE_PATH=$(npm root -g) node tests/now.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.png')?'image/png':'text/html'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000;
const NOON='2026-11-11T09:00:00+08:00', AT=new Date(NOON).getTime();
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[1,3,4,5,6].map(i=>({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D,goalH:16,plan:'16'})),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:AT-30*D},o||{});
const fasting=(elH,goal,plan,o)=>seed(Object.assign({cur:{start:AT-elH*H,goalH:goal||16,planId:plan||'16'},planId:plan||'16'},o||{}));
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 /* opens the app; with quiet:true the clock then moves on 8 seconds, so the hint (shown for 6 seconds) has gone quiet */
 const open=async(s,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(AT)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1500);
  if(o.quiet!==false){ await p.clock.setFixedTime(new Date(AT+8000)); await p.waitForTimeout(2300); } return p; };
 const line=p=>p.evaluate(()=>{ const n=document.getElementById('nowBtn'), t=document.getElementById('readTip'), r=n.getBoundingClientRect(), cs=getComputedStyle(n); return {hidden:n.hidden,text:n.textContent,op:+cs.opacity,pe:cs.pointerEvents,h:r.height,l:r.left,r:r.right,tipQuiet:t.classList.contains('quiet'),track:document.getElementById('track').getBoundingClientRect().top,act:document.getElementById('act').getBoundingClientRect().top,sw:document.documentElement.scrollWidth}; });
 const rows=p=>p.evaluate(()=>[...document.querySelectorAll('#sheet .bn-row')].map(r=>({name:r.querySelector('b').textContent,small:r.querySelector('small').textContent,cls:r.className,exp:r.getAttribute('aria-expanded'),text:(r.querySelector('.bn-t')||{}).textContent||''})));

 /* 1. the line, and that nothing moves */
 let p=await open(fasting(13.2),{quiet:false}); let a=await line(p);
 assert(!a.hidden&&!a.tipQuiet&&a.op===0&&a.pe==='none','while the hint speaks the line waits, unseen and untappable: '+JSON.stringify(a));
 await p.clock.setFixedTime(new Date(AT+8000)); await p.waitForTimeout(2300); let q=await line(p);
 assert(q.tipQuiet&&q.op===1&&q.pe==='auto','once the hint is quiet the line shows: '+JSON.stringify(q));
 assert.strictEqual(q.text,'Your body now: switching fuel'); assert(q.h>=44,'a 44 px tap target: '+q.h);
 assert.strictEqual(q.track,a.track,'the progress line does not move'); assert.strictEqual(q.act,a.act,'the button does not move');
 assert.match(await p.getAttribute('#nowBtn','aria-haspopup'),/dialog/);
 ok('Today: "Your body now: switching fuel" takes the hint\'s place and nothing moves');

 /* 2. the sheet */
 await p.click('#nowBtn'); await p.waitForTimeout(800);
 assert.strictEqual(await p.textContent('#sheet h3'),'What is happening now'); let r=await rows(p);
 assert.deepStrictEqual(r.map(x=>x.name),['Digesting','Settling','Stored sugar','Switching fuel'],'a 16-hour fast lists the four stages that begin before its goal');
 assert(/\bnow\b/.test(r[3].cls)&&/\bopen\b/.test(r[3].cls)&&r[3].exp==='true','the current stage is marked and open'); assert.strictEqual(r[3].small,'Now · 12 to 18 hours'); assert.match(r[3].text,/ketones/); assert.match(r[3].text,/between 12 and 36 hours/);
 assert(r.slice(0,3).every(x=>/\bpast\b/.test(x.cls)&&x.exp==='false'&&!x.text),'earlier stages are marked as passed and closed'); assert.strictEqual(r[0].small,'0 to 4 hours');
 await p.click('#sheet .bn-row[data-i="0"]'); await p.waitForTimeout(300); r=await rows(p);
 assert(r[0].exp==='true'&&/last meal/.test(r[0].text)&&r[3].exp==='false'&&!r[3].text&&/\bnow\b/.test(r[3].cls),'a tap opens another stage and closes the first; the current one stays marked');
 await p.click('#sheet .bn-row[data-i="0"]'); await p.waitForTimeout(300); r=await rows(p); assert(r.every(x=>x.exp==='false'),'a second tap closes it');
 const foot=await p.evaluate(()=>({links:[...document.querySelectorAll('#sheet .bn-f a')].map(a=>[a.textContent,a.target,a.rel,a.href]),text:document.getElementById('sheet').textContent}));
 assert.strictEqual(foot.links.length,3); assert(foot.links.every(l=>l[1]==='_blank'&&/noopener/.test(l[2])&&/^https:\/\/doi\.org\//.test(l[3])),'three sources, each a doi link that opens outside the app');
 assert.match(foot.text,/not medical advice/); assert.match(foot.text,/autophagy/); assert.match(foot.text,/has not been measured/);
 await p.click('#sheet [data-act=close]'); await p.waitForTimeout(700); assert(!(await p.evaluate(()=>document.getElementById('sheet').classList.contains('open'))));
 ok('the sheet: stages up to the goal, the current one open, one open at a time, sources and the autophagy note at the foot');
 await p.context().close();

 /* 3. the stage follows the hours; nothing beyond the plan */
 for(const [el,goal,plan,want,names] of [[1,16,'16','digesting',4],[5,16,'16','settling',4],[9.5,16,'16','using stored sugar',4],[12.5,13,'13','switching fuel',4],[19.5,20,'20','running on the new fuel',5],[18.5,16,'16','running on the new fuel',5],[25,36,'36L','a long fast',6]]){
  p=await open(fasting(el,goal,plan,plan==='36L'?{unlocked:{'24':AT-40*D,'36L':AT-20*D}}:{})); q=await line(p);
  assert.strictEqual(q.text,'Your body now: '+want,el+' h of '+goal+': '+q.text); await p.click('#nowBtn'); await p.waitForTimeout(700); r=await rows(p);
  assert.strictEqual(r.length,names,el+' h of '+goal+' lists '+names+' stages, got '+r.map(x=>x.name)); assert(/\bnow\b/.test(r[r.filter(x=>/\bpast\b/.test(x.cls)).length].cls));
  await p.context().close(); }
 ok('the stage follows the hours fasted; stages beyond the plan are not listed until the fast reaches them');

 /* 5. kind words: every stage text, in both languages */
 p=await open(fasting(25,36,'36L',{unlocked:{'24':AT-40*D,'36L':AT-20*D}})); await p.click('#nowBtn'); await p.waitForTimeout(700);
 for(let i=0;i<6;i++){ await p.click('#sheet .bn-row[data-i="'+i+'"]'); await p.waitForTimeout(150); const t=await p.textContent('#sheet .bn-row.open'); assert(!/weight|calorie|burn|lose|slim|detox/i.test(t),'stage '+i+' stays kind: '+t); assert(t.length<330,'stage '+i+' is short'); }
 assert.match(await p.textContent('#sheet .bn-row[data-i="5"]'),/stop if you feel unwell/);
 ok('no stage talks about weight, calories or burning; the long fast says when to stop'); await p.context().close();

 /* 4. where the line is not offered */
 for(const [what,s] of [['at rest',seed()],['in the eating window',seed({fasts:[{id:'e1',start:AT-17*H,end:AT-1*H,goalH:16,plan:'16'}]})],['in Care mode',fasting(13.2,16,'16',{profile:{fastedBefore:true,safety:true,care:['preg']}})],['during a Ramadan fast',fasting(6,14,'ramadan',{ramadanPreview:true})]]){
  p=await open(s); q=await line(p); assert(q.hidden,'no line '+what+': '+JSON.stringify(q)); assert.strictEqual(await p.evaluate(()=>getComputedStyle(document.getElementById('nowBtn')).display),'none'); await p.context().close(); }
 ok('not offered at rest, in the eating window, in Care mode or during a Ramadan fast');

 /* 6. 中文 and 320 px */
 p=await open(fasting(13.2,16,'16',{lang:'zh'})); q=await line(p); assert.strictEqual(q.text,'身体此刻：切换燃料'); await p.click('#nowBtn'); await p.waitForTimeout(700);
 assert.strictEqual(await p.textContent('#sheet h3'),'身体此刻在做什么'); r=await rows(p); assert.strictEqual(r[3].small,'现在 · 12 至 18 小时'); assert.match(r[3].text,/酮体/); await p.context().close();
 for(const lang of ['en','zh']){ p=await open(fasting(9.5,16,'16',{lang}),{w:320,h:568}); q=await line(p); assert(q.op===1&&q.l>=0&&q.r<=320&&q.sw<=320,'320 px '+lang+': the line fits ('+Math.round(q.l)+' to '+Math.round(q.r)+')');
  await p.click('#nowBtn'); await p.waitForTimeout(700); const sw=await p.evaluate(()=>{ const s=document.getElementById('sheet'); return [s.scrollWidth,s.clientWidth]; }); assert(sw[0]<=sw[1],'320 px '+lang+': the sheet does not scroll sideways'); await p.context().close(); }
 ok('中文, and a 320 px phone');

 /* the concept page mirrors it */
 { const ctx=await b.newContext({viewport:{width:1280,height:1000}}); const c=await ctx.newPage(); c.on('pageerror',e=>errs.push('concept: '+e.message));
  await c.goto('http://localhost:'+port+'/concept/'); await c.waitForTimeout(1200); await c.click('#moments [data-go="f50"]'); await c.waitForTimeout(7600);
  const cl=await c.evaluate(()=>{ const n=document.getElementById('nowBtn'); return {hidden:n.hidden,text:n.textContent,op:+getComputedStyle(n).opacity}; });
  assert(!cl.hidden&&cl.op===1,'concept: the line shows once the hint is quiet: '+JSON.stringify(cl)); assert.strictEqual(cl.text,'Your body now: using stored sugar');
  await c.click('#nowBtn'); await c.waitForTimeout(700);
  const cs=await c.evaluate(()=>({open:document.getElementById('nowSheet').classList.contains('open'),title:document.getElementById('nsTitle').textContent,rows:[...document.querySelectorAll('#nowSheet .bn-row')].map(r=>r.querySelector('b').textContent),cur:(document.querySelector('#nowSheet .bn-row.now.open b')||{}).textContent,links:document.querySelectorAll('#nsSrc a').length}));
  assert(cs.open&&cs.title==='What is happening now'&&cs.rows.length===4&&cs.cur==='Stored sugar'&&cs.links===3,'concept sheet: '+JSON.stringify(cs));
  await c.click('#nsClose'); await c.waitForTimeout(500); await c.click('#moments [data-go="start"]'); await c.waitForTimeout(600);
  await ctx.close(); ok('the concept page has the line and the sheet'); }

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close(); srv.close(); console.log('\nnow: all passed'); })().catch(e=>{ console.error(e); process.exit(1); });
