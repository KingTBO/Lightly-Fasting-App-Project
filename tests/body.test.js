/* The optional weight estimate in onboarding. usage: NODE_PATH=$(npm root -g) node tests/body.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 const S=q=>q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const nx=async q=>{await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(550);};
 const txt=q=>q.textContent('.ob-step.on');
 async function toSafety(lang){const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',locale:lang==='zh'?'zh-CN':'en-GB'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));await q.goto(url);await q.waitForTimeout(500);
  if(lang==='zh'){await q.click('[data-act=lang][data-v=zh]');await q.waitForTimeout(200);}
  await q.click('[data-act=obnext]');await q.waitForTimeout(550);await q.click('[data-act=obopt][data-v=first]');await q.waitForTimeout(300);await nx(q);await nx(q);await q.click('.ob-step.on [data-act=obcityshow]');await q.waitForTimeout(300);await nx(q);return q;}
 async function pick(q,id,i){await q.click('[data-act=pktog][data-id='+id+']');await q.waitForTimeout(300);await q.click('#'+id+' .pk-i[data-i="'+i+'"]');await q.waitForTimeout(500);}

 // the full path: about you, how you eat, your first 30 days
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);
  await q.click('.ob-step.on [data-act=obbody]');await q.waitForTimeout(600);assert.match(await txt(q),/How do you usually eat/);
  await q.click('[data-act=obeat][data-k=dinner][data-v="3"]');await q.click('[data-act=obeat][data-k=soda][data-v="3"]');await nx(q);
  let t=await txt(q);assert.match(t,/Your first 30 days/);assert.match(t,/About 0\.5–1 kg/,'70 kg at 13:11: '+t);assert.match(t,/A lighter last meal/);assert.match(t,/Fewer sugary drinks/);
  await q.click('[data-act=obboost][data-k=dinner]');await q.click('[data-act=obboost][data-k=soda]');await q.waitForTimeout(400);t=await txt(q);assert.match(t,/About 0\.5–1\.5 kg|About 1–1\.5 kg|About 1–2 kg/,'two boosts raise the range: '+t);
  assert.match(t,/Not a promise/);await nx(q);assert.match(await txt(q),/You’re set/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);
  const s=await S(q);assert.strictEqual(s.body.age,30);assert.strictEqual(s.body.kg,70);assert.strictEqual(s.body.cm,170);assert.strictEqual(s.body.dinner,3);
  await q.click('#tabs [data-tab=me]');await q.waitForTimeout(400);assert.match(await q.textContent('#me'),/Weight and height/);await q.click('#me [data-act=bodyinfo]');await q.waitForTimeout(500);assert.match(await q.textContent('#sheet'),/Never shared/);await q.click('#sheet [data-act=bodyrm]');await q.waitForTimeout(500);
  assert.strictEqual((await S(q)).body,undefined,'removed');assert(!/Weight and height/.test(await q.textContent('#me')));
  ok('about you, how you eat, your first 30 days: a range, optional switches, saved, and removable from Me');await q.context().close();}

 // units
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);
  await q.click('[data-act=obunit][data-v=lb]');await q.waitForTimeout(300);let t=await txt(q);assert.match(t,/154 lb/);assert.match(t,/5′ 7″/);
  await q.click('[data-act=obunit][data-v=jin]');await q.waitForTimeout(300);t=await txt(q);assert.match(t,/140 斤/);assert.match(t,/170 cm/);
  ok('units kg, lb and 斤 convert');await q.context().close();}

 // skip: nothing saved, straight to the summary
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);await q.click('.ob-step.on [data-act=obbodyskip]');await q.waitForTimeout(600);assert.match(await txt(q),/You’re set/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);
  assert.strictEqual((await S(q)).body,undefined);ok('skip: no weight saved');await q.context().close();}

 // a healthy BMI gets a page with no numbers; a low BMI gets nothing at all
 {const q=await toSafety('zh');await q.click('[data-act=obsafe][data-v=none]');await nx(q);assert.match(await txt(q),/关于你/);
  await pick(q,'obWt',30);   // zh defaults to 斤: 90 斤 is 45 kg, BMI 15.6, so no estimate
  await q.click('.ob-step.on [data-act=obbody]');await q.waitForTimeout(600);assert.match(await txt(q),/你的断食|准备好了/,'out of range: straight to the summary');
  ok('an unusable weight skips the estimate quietly');await q.context().close();}
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);await pick(q,'obWt',30);   // 60 kg at 170 cm = BMI 20.8
  await q.click('.ob-step.on [data-act=obbody]');await q.waitForTimeout(600);const t=await txt(q);assert.match(t,/Weight isn’t the point/);assert(!/kg/.test(t),'no numbers');
  await nx(q);await q.click('[data-act=obdone]');await q.waitForTimeout(800);ok('BMI under 24: "Weight isn’t the point", no numbers');await q.context().close();}
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=none]');await nx(q);await pick(q,'obWt',15);   // 45 kg at 170 cm = BMI 15.6
  await q.click('.ob-step.on [data-act=obbody]');await q.waitForTimeout(600);assert.match(await txt(q),/You’re set/,'BMI under 18.5: no estimate, no page');await q.click('[data-act=obdone]');await q.waitForTimeout(800);ok('BMI under 18.5: nothing shown');await q.context().close();}

 // Care mode never sees the weight questions
 {const q=await toSafety('en');await q.click('[data-act=obsafe][data-v=ed]');await nx(q);assert.match(await txt(q),/You’re set/);assert.match(await txt(q),/Care mode is on/);await q.click('[data-act=obdone]');await q.waitForTimeout(800);assert.strictEqual((await S(q)).body,undefined);ok('Care mode: no weight questions');await q.context().close();}

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close();srv.close();console.log('body ok');
})().catch(e=>{console.error(e);process.exit(1);});
