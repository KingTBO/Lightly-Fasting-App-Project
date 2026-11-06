/* Compare with others (opt-in): what leaves the phone, when, and what the recap card shows. Supabase is faked. usage: NODE_PATH=$(npm root -g) node tests/trend.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 const S=q=>q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const H=3600000,D=24*H,oct=[3,6,9,12].map(d=>{const e=new Date('2026-10-'+String(d).padStart(2,'0')+'T12:00:00+08:00').getTime();return{id:'rc'+d,start:e-17*H,end:e,goalH:16,plan:'16'};});
 const at0=new Date('2026-10-12T12:00:00+08:00').getTime();   // setup weight given on Oct 12; the recap is read on Nov 3 = day 22
 const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:false,safety:false,care:[]},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:oct,flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:at0,mod:1,del:[]},o);
 const body=o=>Object.assign({age:30,kg:82,cm:170,unit:'kg',at:at0},o||{});
 async function pick(q,id,i){await q.click('[data-act=pktog][data-id='+id+']');await q.waitForTimeout(300);await q.click('#'+id+' .pk-i[data-i="'+i+'"]');await q.waitForTimeout(500);}
 /* opens the recap (Nov 3) with a faked server; compare = what trend_compare answers */
 async function rep(state,o){o=o||{};const calls=[];const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});await c.clock.install({time:new Date('2026-11-03T09:00:00+08:00')});
  const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));q.calls=calls;
  await q.route('https://eqvdxzbnumuudkqfkyyb.supabase.co/**',async r=>{const u=r.request().url(),m=/rpc\/(\w+)/.exec(u);
   if(m){calls.push({fn:m[1],body:r.request().postData()});if(o.fail) return r.fulfill({status:500,contentType:'application/json',body:'{"message":"boom"}'});return r.fulfill({status:200,contentType:'application/json',body:m[1]==='trend_compare'?JSON.stringify(o.compare||[]):'null'});}
   if(/auth\/v1\/user/.test(u)) return r.fulfill({status:200,contentType:'application/json',body:'{"id":"u1","email":"a@b.c"}'});
   return r.fulfill({status:200,contentType:'application/json',body:'[]'});});
  await q.addInitScript(([x,a])=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',x);if(a) localStorage.setItem('lightly:auth',a);sessionStorage.s=1}},[JSON.stringify(state),o.out?'':JSON.stringify({access:'x',refresh:'y',exp:Math.floor(Date.now()/1000)+99999,email:'a@b.c',uid:'u1'})]);
  await q.goto(url);await q.waitForTimeout(900);await q.click('#tabs [data-tab=days]');await q.waitForTimeout(800);await q.click('#days [data-act=recap]');await q.waitForSelector('#report:not([hidden])');await q.waitForTimeout(900);
  if(await q.$('#rpW')) await q.locator('#rpW').scrollIntoViewIfNeeded();await q.waitForTimeout(500);return q;}
 const save=async q=>{await q.evaluate(()=>{const e=document.querySelector('#rpW [data-act=rpwsave]');e.click();});await q.waitForTimeout(500);};
 const rpc=(q,fn)=>q.calls.filter(c=>c.fn===fn);

 // 1. signed in, never asked: after a check-in the card asks once; "Share my change" sends only day and percent
 let q=await rep(seed({body:body()}));
 assert(!(await q.$('#rpW .rp-ask')),'no question before there is a check-in');await pick(q,'rpWt',50);await save(q);
 let t=await q.textContent('#rpW');assert.match(t,/Compare with others\?/);assert.match(t,/Only your change in percent, no name/);assert.strictEqual(rpc(q,'trend_share').length,0,'nothing is sent before the person says yes');
 await q.click('#rpW [data-act=trendyes]');await q.waitForTimeout(700);
 let sh=rpc(q,'trend_share');assert.strictEqual(sh.length,1,'sent once');const sent=JSON.parse(sh[0].body);assert.deepStrictEqual(Object.keys(sent),['p_points']);assert.strictEqual(sent.p_points.length,1);assert.strictEqual(sent.p_points[0].day,30,'day 22 counts for 30');assert(sent.p_points[0].pct<0&&sent.p_points[0].pct>-30);
 assert(!/kg|82|age|sex|sex|name|email|uid/i.test(sh[0].body.replace('p_points','')),'only day and percent leave the phone: '+sh[0].body);
 assert.strictEqual((await S(q)).body.share,true);assert(await q.$('#rpTr svg'),'the chart is there');assert.match(await q.textContent('#rpTr'),/Not enough people yet/,'no average until enough people');assert(!(await q.$('#rpTr .tr-avg')),'no grey line yet');
 assert(!(await q.$('#rpW .rp-ask')),'the question is gone');ok('opt in: only day and percent are sent, the chart shows your line and says why there is no average');await q.context().close();

 // 2. enough people: the grey line and the sentence; "ahead" only when ahead and the loss is modest
 const cmp=y=>[{day:30,enough:true,avg:-1.4,you:y,ahead:62},{day:60,enough:false,avg:null,you:null,ahead:null},{day:90,enough:false,avg:null,you:null,ahead:null}];
 q=await rep(seed({body:body({share:true,checks:[{key:'2026-10',kg:80,at:at0+22*D}]})}),{compare:cmp(-2.4)});await q.waitForTimeout(500);
 assert(await q.$('#rpTr .tr-avg'),'grey line');assert(await q.$('#rpTr .tr-you'),'your line');t=await q.textContent('#rpTr');assert.match(t,/Day 30: you −2\.4%, average −1\.4%\./);assert.match(t,/Down more than 62% of people\./);assert.match(t,/not medical advice/i);
 ok('with enough people: both lines, your number and the average, and the sentence');await q.context().close();
 q=await rep(seed({body:body({share:true,checks:[{key:'2026-10',kg:80,at:at0+22*D}]})}),{compare:[{day:30,enough:true,avg:-1.4,you:-0.4,ahead:20},{day:60,enough:false,avg:null,you:null,ahead:null},{day:90,enough:false,avg:null,you:null,ahead:null}]});await q.waitForTimeout(500);
 t=await q.textContent('#rpTr');assert.match(t,/Day 30: you −0\.4%/);assert(!/Down more than/.test(t),'slower than most: no percentile, no rank');await q.context().close();
 q=await rep(seed({body:body({share:true,checks:[{key:'2026-10',kg:80,at:at0+22*D}]})}),{compare:cmp(-12)});await q.waitForTimeout(500);
 t=await q.textContent('#rpTr');assert(!/Down more than/.test(t),'a big loss is never celebrated with a ranking');await q.context().close();
 ok('slower, or a very large loss: no ranking sentence');

 // 3. "No thanks" asks nothing again and sends nothing; signed out gets a hint, no buttons
 q=await rep(seed({body:body()}));await save(q);await q.click('#rpW [data-act=trendno]');await q.waitForTimeout(400);assert.strictEqual((await S(q)).body.share,false);assert(!(await q.$('#rpW .rp-ask')));assert(!(await q.$('#rpTr')));assert.strictEqual(rpc(q,'trend_share').length,0);await q.context().close();
 q=await rep(seed({body:body()}),{out:true});await save(q);assert.match(await q.textContent('#rpW'),/Sign in on Me first/);assert(!(await q.$('#rpW [data-act=trendyes]')),'no button without an account');await q.context().close();
 ok('no thanks: nothing asked, nothing sent; signed out: a hint only');

 // 4. Me > About you: the switch, off deletes what was shared, "Don't ask me again" stops sharing too, removing the weight too
 {const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.calls=[];
  await p.route('https://eqvdxzbnumuudkqfkyyb.supabase.co/**',r=>{const m=/rpc\/(\w+)/.exec(r.request().url());if(m)p.calls.push({fn:m[1],body:r.request().postData()});return r.fulfill({status:200,contentType:'application/json',body:/auth\/v1\/user/.test(r.request().url())?'{"id":"u1"}':(m&&m[1]==='trend_compare'?'[]':m?'null':'[]')});});
  await p.addInitScript(x=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',x);localStorage.setItem('lightly:auth',JSON.stringify({access:'x',refresh:'y',exp:Math.floor(Date.now()/1000)+99999,email:'a@b.c',uid:'u1'}));sessionStorage.s=1}},JSON.stringify(seed({body:body({share:true,sent:'[{"day":30,"pct":-2.4}]',checks:[{key:'2026-10',kg:80,at:at0+22*D}]})})));
  await p.goto(url);await p.waitForTimeout(900);await p.click('#tabs [data-tab=me]');await p.waitForTimeout(400);await p.click('#me [data-act=bodyinfo]');await p.waitForTimeout(500);
  assert.match(await p.textContent('#sheet'),/Private unless you turn on Compare with others/);assert.strictEqual(await p.getAttribute('#sheet [data-act=bodytrend]','aria-checked'),'true');
  await p.click('#sheet [data-act=bodytrend]');await p.waitForTimeout(500);assert.strictEqual(await p.getAttribute('#sheet [data-act=bodytrend]','aria-checked'),'false');assert.strictEqual(p.calls.filter(x=>x.fn==='trend_leave').length,1,'turning it off deletes what was shared');
  let s=await S(p);assert(!s.body.share&&!s.body.sent,'no leftovers');assert(!s.prefs.trendLeave,'the deletion went through, nothing waits');
  await p.click('#sheet [data-act=bodytrend]');await p.waitForTimeout(500);assert.strictEqual((await S(p)).body.share,true,'and on again');assert.strictEqual(p.calls.filter(x=>x.fn==='trend_share').length,1,'turning it on sends the points');
  await p.click('#sheet [data-act=bodycheck]');await p.waitForTimeout(500);s=await S(p);assert(s.body.checkOff&&!s.body.share,'Don’t ask me again also stops sharing');assert.strictEqual(p.calls.filter(x=>x.fn==='trend_leave').length,2);assert(!(await p.$('#sheet [data-act=bodytrend]')),'no compare switch once check-ins are off');
  await p.click('#sheet [data-act=bodycheck]');await p.waitForTimeout(400);await p.click('#sheet [data-act=bodytrend]');await p.waitForTimeout(400);await p.click('#sheet [data-act=bodyrm]');await p.waitForTimeout(500);assert.strictEqual(p.calls.filter(x=>x.fn==='trend_leave').length,3,'removing the weight deletes what was shared');assert.strictEqual((await S(p)).body,null);await c.close();}
 ok('Me switch on and off, Don’t ask me again and removing the weight all delete what was shared');

 // 5. offline when switching off: the deletion waits and runs on the next sync
 {q=await rep(seed({body:body({share:true,checks:[{key:'2026-10',kg:80,at:at0+22*D}]})}),{fail:true});
  await q.evaluate(()=>document.querySelector('#report [data-act=rpclose],#report .rp-x')&&document.querySelector('#report .rp-x').click());await q.waitForTimeout(500);
  await q.click('#tabs [data-tab=me]');await q.waitForTimeout(400);await q.click('#me [data-act=bodyinfo]');await q.waitForTimeout(500);await q.click('#sheet [data-act=bodytrend]');await q.waitForTimeout(700);
  const s=await S(q);assert(!s.body.share);assert.strictEqual(s.prefs.trendLeave,true,'a failed deletion is remembered and retried');await q.context().close();}
 ok('a failed deletion is remembered');

 // 6. Care mode and no account never send anything
 q=await rep(seed({body:body({share:true,checks:[{key:'2026-10',kg:80,at:at0+22*D}]}),profile:{fastedBefore:false,safety:true,care:['diab']}}));assert(!(await q.$('#rpTr')),'no chart in Care mode');assert.strictEqual(rpc(q,'trend_share').length+rpc(q,'trend_compare').length,0,'nothing is asked or sent in Care mode');await q.context().close();
 q=await rep(seed({body:body({share:true,checks:[{key:'2026-10',kg:80,at:at0+22*D}]})}),{out:true});assert.strictEqual(q.calls.length,0,'signed out: no calls at all');await q.context().close();
 ok('Care mode and signed out: nothing is sent');

 // 7. the concept page shows the same ask and a sample chart
 {const c=await b.newContext({viewport:{width:430,height:1000},timezoneId:'Asia/Shanghai'});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));await p.goto(url+'concept/');await p.waitForTimeout(800);
  const open=async()=>{await p.evaluate(()=>{const t=[...document.querySelectorAll('[role=tab]')].find(b=>/^Days$/.test(b.textContent.trim()));if(t)t.click();});await p.waitForTimeout(800);await p.evaluate(()=>{const e=document.getElementById('dyRcOpen');if(e)e.click();});await p.waitForTimeout(1500);};
  await open();await p.evaluate(()=>document.querySelector('#dyW [data-rpw=save]').click());await p.waitForTimeout(300);assert.match(await p.textContent('#dyW'),/Compare with others\?/);
  await p.evaluate(()=>document.querySelector('#dyW [data-rpw=trendyes]').click());await p.waitForTimeout(300);assert(await p.$('#dyW .tr-box svg .tr-avg'),'sample chart with the grey line');assert.match(await p.textContent('#dyW'),/Sample data/);
  await p.evaluate(()=>document.querySelector('#dyW [data-rpw=edit]').click());await p.waitForTimeout(300);await p.evaluate(()=>document.querySelector('#dyW [data-rpw=save]').click());await p.waitForTimeout(300);await p.evaluate(()=>document.querySelector('#dyW [data-rpw=trendno]').click());await p.waitForTimeout(300);assert(!(await p.$('#dyW .rp-ask'))&&!(await p.$('#dyW .tr-box')));assert.match(await p.textContent('#dyW'),/Your check-in/);await c.close();}
 ok('concept page: the ask and a sample chart');

 await b.close();srv.close();
 assert.deepStrictEqual(errs,[],'page errors: '+errs.join(' | '));console.log('trend ok');
})().catch(e=>{console.error(e);process.exit(1);});
