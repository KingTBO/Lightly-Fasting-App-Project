/* The optional weight in onboarding (about you, kept for the monthly check-in). usage: NODE_PATH=$(npm root -g) node tests/body.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 const S=q=>q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const nx=async q=>{await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(550);};
 const txt=q=>q.textContent('.ob-step.on');
 async function toSafety(lang,scheme){   /* also checks the phone shell never scrolls: a picker overflowing it once shifted every later step up */const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',locale:lang==='zh'?'zh-CN':'en-GB',colorScheme:scheme||'light'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url);await q.waitForTimeout(500);
  if(lang==='zh'&&await q.$('[data-act=lang][data-v=zh]')){await q.click('[data-act=lang][data-v=zh]');await q.waitForTimeout(200);}   /* the welcome shows a link to the other language only */
  await q.click('[data-act=obnext]');await q.waitForTimeout(550);await q.click('[data-act=obopt][data-v=first]');await q.waitForTimeout(300);await nx(q);await nx(q);await q.click('.ob-step.on [data-act=obcityshow]');await q.waitForTimeout(300);await nx(q);assert.strictEqual(await q.evaluate(()=>document.getElementById('ph').scrollTop),0,'the phone shell has not scrolled');return q;}
 async function pick(q,id,i){await q.click('[data-act=pktog][data-id='+id+']');await q.waitForTimeout(300);await q.click('#'+id+' .pk-i[data-i="'+i+'"]');await q.waitForTimeout(500);}

 // the full path: about you (with the privacy line and the monthly check-in promise), then the summary
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);
  let t=await txt(q);assert.match(t,/A little about you/);assert.match(t,/see your weight trend, with a check-in every month/);assert.match(t,/Private to you: it stays on this phone, and in your backup only if you sign in/);assert(!/estimate/i.test(t),'no estimate any more');
  await q.click('.ob-step.on [data-act=obbody]');await q.waitForTimeout(600);t=await txt(q);assert(!/How do you usually eat|Your first 30 days/.test(t),'the eating and estimate steps are gone');assert.match(t,/You’re set/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);
  const s=await S(q);assert.strictEqual(s.body.age,30);assert.strictEqual(s.body.kg,70);assert.strictEqual(s.body.cm,170);assert(!('dinner' in s.body),'no eating answers saved');
  await q.reload();await q.waitForTimeout(700);assert.strictEqual((await S(q)).body.kg,70,'the weight survives a reload');
  await q.click('#tabs [data-tab=me]');await q.waitForTimeout(400);assert.match(await q.textContent('#me'),/Weight and height/);await q.click('#me [data-act=bodyinfo]');await q.waitForTimeout(500);assert.match(await q.textContent('#sheet'),/Never shared/);await q.click('#sheet [data-act=bodyrm]');await q.waitForTimeout(500);
  assert(!(await S(q)).body,'removed');assert(!/Weight and height/.test(await q.textContent('#me')));
  ok('about you: saved for the check-in, removable from Me; no eating or estimate steps');await q.context().close();}

 // units
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);
  await q.click('[data-act=obunit][data-v=lb]');await q.waitForTimeout(300);let t=await txt(q);assert.match(t,/154 lb/);assert.match(t,/5′ 7″/);
  await q.click('[data-act=obunit][data-v=jin]');await q.waitForTimeout(300);t=await txt(q);assert.match(t,/140 斤/);assert.match(t,/170 cm/);
  ok('units kg, lb and 斤 convert');await q.context().close();}

 // skip: nothing saved, straight to the summary
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);await q.click('.ob-step.on [data-act=obbodyskip]');await q.waitForTimeout(600);assert.match(await txt(q),/You’re set/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);
  assert(!(await S(q)).body);ok('skip: no weight saved');await q.context().close();}

 // the weight wheel stays short enough to draw everywhere, and the setup content keeps no lingering animation
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);
  for(const u of ['kg','lb','jin']){await q.click('[data-act=obunit][data-v='+u+']');await q.waitForTimeout(300);const n=await q.evaluate(()=>document.querySelectorAll('#obWt .pk-i').length);assert(n>0&&n<=360,u+' wheel has '+n+' rows');}
  assert.notStrictEqual(await q.evaluate(()=>getComputedStyle(document.querySelector('.ob-step.on .group')).animationFillMode),'both','no fill-forwards animation left on the content');
  ok('weight wheels stay short and the setup content keeps no lingering animation');await q.context().close();}
 // in dark mode the chosen answer must be visible (it was the same colour as its track, so it looked as if nothing could be chosen)
 {const q=await toSafety('en','dark');await q.click('[data-act=obsafe][data-v=none]');await nx(q);
  await q.click('[data-act=obunit][data-v=lb]');await q.waitForTimeout(400);
  const d=await q.evaluate(()=>{const rgba=c=>{const m=c.match(/[\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m.length>3?m[3]:1};};
    const bg=rgba(getComputedStyle(document.querySelector('.ob-step.on')).backgroundColor),tr=rgba(getComputedStyle(document.querySelector('.ob-step.on .seg')).backgroundColor),pill=rgba(getComputedStyle(document.querySelector('[data-act=obunit][data-v=lb]')).backgroundColor);
    const lum=c=>.2126*c.r+.7152*c.g+.0722*c.b, track={r:tr.r*tr.a+bg.r*(1-tr.a),g:tr.g*tr.a+bg.g*(1-tr.a),b:tr.b*tr.a+bg.b*(1-tr.a)};return {track:lum(track),pill:lum(pill)};});
  assert(Math.abs(d.pill-d.track)>20,'the chosen segment is clearly lighter or darker than its track: '+JSON.stringify(d));
  ok('dark mode: the chosen unit is visible');await q.context().close();}
 // a finger whose lift is never seen must not freeze the wheel (a touch that vanished left it dead until the app was restarted)
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);await q.click('[data-act=pktog][data-id=obWt]');await q.waitForTimeout(600);
  await q.evaluate(()=>{const c=document.querySelector('#obWt .pk-c'),r=c.getBoundingClientRect();c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:77,pointerType:'touch',clientX:r.x+50,clientY:r.y+90,bubbles:true}));});
  await q.waitForTimeout(1400);const before=await q.textContent('#obWt .pk-v');const bx=await q.locator('#obWt .pk-c').boundingBox();
  await q.mouse.move(bx.x+bx.width/2,bx.y+90);await q.mouse.down();for(let k=1;k<=10;k++){await q.mouse.move(bx.x+bx.width/2,bx.y+90-k*8);await q.waitForTimeout(15);}await q.mouse.up();await q.waitForTimeout(900);
  assert.notStrictEqual(await q.textContent('#obWt .pk-v'),before,'the wheel still turns after a lost touch');ok('a lost touch does not freeze the wheel');await q.context().close();}

 // only adults with a BMI of 18.5 or more keep a weight: nothing is saved for anyone else, and nothing is said about it
 {const q=await toSafety('zh');await q.click('[data-act=obsafe][data-v=none]');await nx(q);assert.match(await txt(q),/关于你/);assert.match(await txt(q),/每月回顾会带你看体重变化的趋势/);assert.match(await txt(q),/登录后才会存入你的备份/);
  await pick(q,'obWt',30);   // zh defaults to 斤: 90 斤 is 45 kg, BMI 15.6
  await q.click('.ob-step.on [data-act=obbody]');await q.waitForTimeout(600);assert.match(await txt(q),/你的断食|准备好了/,'straight to the summary');await q.click('[data-act=obdone]');await q.waitForTimeout(800);assert(!(await S(q)).body,'BMI under 18.5: nothing saved');
  ok('a low BMI saves nothing, quietly');await q.context().close();}
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);await pick(q,'obWt',30);   // 60 kg at 170 cm = BMI 20.8
  await q.click('.ob-step.on [data-act=obbody]');await q.waitForTimeout(600);assert.match(await txt(q),/You’re set/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);assert.strictEqual((await S(q)).body.kg,60,'a healthy BMI is saved for the check-in');ok('BMI 18.5 or more: saved');await q.context().close();}
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);await pick(q,'obAge',4);   // age 17
  await q.click('.ob-step.on [data-act=obbody]');await q.waitForTimeout(600);assert.match(await txt(q),/You’re set/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);assert(!(await S(q)).body,'under 18: nothing saved');ok('under 18: nothing saved');await q.context().close();}

 // Care mode never sees the weight questions
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=ed]');await nx(q);assert.match(await txt(q),/You’re set/);assert.match(await txt(q),/Care mode is on/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);assert(!(await S(q)).body);ok('Care mode: no weight questions');await q.context().close();}

 // the monthly check-in sits in the recap report: optional, one weight, no judgement; never in Care mode, never without a weight from setup
 {const H=3600000,D=24*H,oct=[3,6,9,12].map(d=>{const e=new Date('2026-10-'+String(d).padStart(2,'0')+'T12:00:00+08:00').getTime();return{id:'rc'+d,start:e-17*H,end:e,goalH:16,plan:'16'};});
  const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:false,safety:false,care:[]},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:oct,flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:Date.now()-30*D,mod:1,del:[]},o);
  async function rep(state){const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});await c.clock.install({time:new Date('2026-11-03T09:00:00+08:00')});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
   await q.addInitScript(x=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',x);sessionStorage.s=1}},JSON.stringify(state));await q.goto(url);await q.waitForTimeout(600);await q.click('#tabs [data-tab=days]');await q.waitForTimeout(800);await q.click('#days [data-act=recap]');await q.waitForSelector('#report:not([hidden])');await q.waitForTimeout(900);return q;}
  let q=await rep(seed({body:{age:30,kg:82,cm:170,unit:'kg',dinner:0,soda:0,at:1}}));
  await q.locator('#rpW').scrollIntoViewIfNeeded();await q.waitForTimeout(600);assert.match(await q.textContent('#rpW'),/A quick check-in/);assert.match(await q.textContent('#rpW'),/Only you see this/);
  await pick(q,'rpWt',50);await q.click('#rpW [data-act=rpwsave]');await q.waitForTimeout(500);
  assert.match(await q.textContent('#rpW'),/Before 82 kg · now 80 kg/,await q.textContent('#rpW'));let s=await S(q);assert.strictEqual(s.body.checks.length,1);assert.strictEqual(s.body.checks[0].key,'2026-10');assert.strictEqual(s.body.checks[0].kg,80);
  await q.click('#rpW [data-act=rpwedit]');await q.waitForTimeout(400);assert.match(await q.textContent('#rpW'),/A quick check-in/);assert.strictEqual((await S(q)).body.checks.length,0);
  ok('monthly check-in in the recap: one weight, saved, changeable');await q.context().close();
  q=await rep(seed({body:{age:30,kg:82,cm:170,unit:'kg',at:1},profile:{fastedBefore:true,safety:true,care:['diab']}}));assert(!(await q.$('#rpW')),'no check-in in Care mode');await q.context().close();
  q=await rep(seed({}));assert(!(await q.$('#rpW')),'no check-in without a weight from setup');ok('no check-in in Care mode or without a weight');await q.context().close();}

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close();srv.close();console.log('body ok');
})().catch(e=>{console.error(e);process.exit(1);});
