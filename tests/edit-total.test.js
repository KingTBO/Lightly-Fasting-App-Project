/* The edit sheet shows the total, and the fasting goal is a wheel (v0.111.0):
   1. Edit fast: a Total row under Started and Ended adds the fast up and follows either wheel as it turns (a fast you forgot to end, fixed by moving the end back)
   2. the goal is "Fasting goal (hours)", a wheel of whole hours with a fixed "hours" beside the band; Save keeps the hours the wheel rests on
   3. the plan sheet's Custom plan and the setup's Custom plan use the same wheel and words
   4. 中文, dark, a 320 px phone, and the concept page
   NODE_PATH=$(npm root -g) node tests/edit-total.test.js [shotsdir] */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const SHOTS=process.argv[2]||'';
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.wav')?'audio/wav':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000;
const NOON='2026-11-16T12:00:00+08:00', AT=new Date(NOON).getTime();
/* one fast, started yesterday at 18:00 and only ended now: 18 hours against a 16 hour goal */
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[{id:'f1',start:AT-18*H,end:AT,goalH:16,plan:'16'}],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:AT-30*D},o||{});
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:SHOTS?2:1,colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(o.time||NOON)); await p.goto('http://localhost:'+port+(o.url||'/')); await p.waitForTimeout(o.wait||900); return p; };
 const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 /* turn one column of a wheel to a row (the looping hour column rests in its middle copy) */
 const turn=async(p,id,col,v)=>{ if(!(await p.$('#'+id+'.open'))){ await p.click('#'+id+' .pk-row'); await p.waitForTimeout(500); }
  await p.evaluate(([id,col,v])=>{ const pk=document.getElementById(id), c=pk.querySelector('[data-c='+col+']'), n=+c.dataset.loop||0, i=col==='s'?JSON.parse(pk.dataset.opts).indexOf(v):v; c.scrollTo({top:(n*3+i)*36}); },[id,col,v]); await p.waitForTimeout(500); };
 const shot=async(p,name)=>{ if(!SHOTS) return; fs.mkdirSync(SHOTS,{recursive:true}); await p.screenshot({path:path.join(SHOTS,name+'.png')}); };
 const editSheet=async p=>{ await p.click('#tabs [data-tab=days]'); await p.waitForTimeout(700); await p.click('.cal-g button.today'); await p.waitForTimeout(400); await p.click('#days [data-act=edit]'); await p.waitForTimeout(600); };

 /* 1. the total, live */
 let p=await open(seed()); await editSheet(p);
 assert.strictEqual((await p.textContent('#fsTl')).trim(),'Total'); assert.strictEqual(await p.textContent('#fsT'),'18 h','the total of the saved fast');
 const order=await p.evaluate(()=>[...document.getElementById('fsS').parentNode.children].map(e=>e.id||e.className));
 assert.deepStrictEqual(order.slice(0,4),['fsS','fsE','row tot-r','fsG'],'Started, Ended, Total, then the goal');
 await turn(p,'fsE','h',10); assert.strictEqual(await p.textContent('#fsT'),'16 h','moving the end back to 10:00 takes the total down as the wheel turns');
 await turn(p,'fsE','m',20); assert.strictEqual(await p.textContent('#fsT'),'16 h 20 m');
 await shot(p,'1-edit-total_light_en');
 await turn(p,'fsS','h',19); assert.strictEqual(await p.textContent('#fsT'),'15 h 20 m','the start wheel moves it too');
 const box=await p.evaluate(()=>{ const r=document.querySelector('.tot-r').getBoundingClientRect(), v=document.getElementById('fsT').getBoundingClientRect(), s=document.querySelector('#sheet .group').getBoundingClientRect(); const c=getComputedStyle(document.getElementById('fsT')), l=getComputedStyle(document.getElementById('fsTl')); return {h:r.height,right:s.right-v.right,fw:c.fontWeight,same:c.color===l.color}; });
 assert(box.h>=44,'the row is a full row'); assert(Math.abs(box.right-16)<=1,'the value keeps the 16 px margin'); assert.strictEqual(box.fw,'600'); assert(box.same,'the total is in the main label colour, not grey');
 ok('Total under Started and Ended: 18 h, then 16 h, 16 h 20 m and 15 h 20 m as the wheels turn');

 /* 2. the goal wheel */
 assert.strictEqual((await p.textContent('#fsG .pk-row span:first-child')).trim(),'Fasting goal (hours)'); assert.strictEqual(await p.textContent('#fsG .pk-v'),'16','the value is the number of hours');
 assert.deepStrictEqual(await p.$eval('#fsG',e=>{ const o=JSON.parse(e.dataset.opts); return [o[0],o[o.length-1]]; }),[1,36],'1 to 36 hours, as before');
 await turn(p,'fsG','s',14); assert.strictEqual(await p.textContent('#fsG .pk-v'),'14');
 const u=await p.evaluate(()=>{ const un=document.querySelector('#fsG .pk-u'), band=document.querySelector('#fsG .pk-band').getBoundingClientRect(), r=un.getBoundingClientRect(), sel=document.querySelector('#fsG .pk-i.sel').getBoundingClientRect(), t=document.querySelector('#fsG .pk-i.sel'); const rg=document.createRange(); rg.selectNodeContents(t); const tx=rg.getBoundingClientRect();
  return {txt:un.textContent,mid:Math.abs((r.top+r.bottom)/2-(band.top+band.bottom)/2),selMid:Math.abs((sel.top+sel.bottom)/2-(band.top+band.bottom)/2),gap:r.left-tx.right,hidden:un.getAttribute('aria-hidden')}; });
 assert.strictEqual(u.txt,'hours'); assert(u.mid<1.5&&u.selMid<1.5,'number and unit sit on the band'); assert(u.gap>=4&&u.gap<=14,'the unit follows the number: '+u.gap); assert.strictEqual(u.hidden,'true','the label already says hours to a screen reader');
 await shot(p,'2-goal-wheel_light_en');
 await p.click('[data-act=fssave]'); await p.waitForTimeout(400); let s=await S(p);
 assert.strictEqual(s.fasts[0].goalH,14); assert.strictEqual(s.fasts[0].start,AT-17*H); assert.strictEqual(s.fasts[0].end,AT-100*60000);
 assert(!(await p.$('#sheet input[type=number]')),'no number field is left');
 ok('Fasting goal (hours) is a wheel of whole hours with "hours" beside the band; Save keeps 14 h and the new times');

 /* 3. the plan sheet's Custom plan */
 p=await open(seed()); await p.click('#planBtn'); await p.waitForTimeout(500); if(!(await p.$('#sheet .plan[data-id=custom]'))){ await p.click('#sheet [data-act=more]'); await p.waitForTimeout(400); }
 await p.click('#sheet .plan[data-id=custom]'); await p.waitForTimeout(500);
 assert(await p.$('#cH.pk'),'the custom hours are a wheel'); assert.strictEqual((await p.textContent('#cH .pk-row span:first-child')).trim(),'Fasting goal (hours)');
 assert.deepStrictEqual(await p.$eval('#cH',e=>{ const o=JSON.parse(e.dataset.opts); return [o[0],o[o.length-1]]; }),[10,23]);
 await turn(p,'cH','s',19); await p.waitForTimeout(400); const inView=await p.evaluate(()=>{ const w=document.getElementById('cH-w').getBoundingClientRect(), sh=document.getElementById('sheet').getBoundingClientRect(); return w.bottom<=Math.min(sh.bottom,innerHeight)+1; }); assert(inView,'the open wheel scrolls fully into view'); s=await S(p);
 assert.strictEqual(s.customH,19); assert.strictEqual(s.planId,'custom'); assert(await p.$('#cH.open'),'the wheel stays open while the plan changes');
 assert.match(await p.textContent('#sheet .plan[data-id=custom] .pr'),/19/,'the custom row shows the new plan');
 await shot(p,'3-plan-custom_light_en');
 ok('Custom in the plan sheet: the same wheel, 10 to 23, applied when it rests, without closing');

 /* 4. 中文, dark, 320 px, and the setup step */
 p=await open(seed({lang:'zh'}),{dark:true}); await editSheet(p);
 assert.strictEqual((await p.textContent('#fsTl')).trim(),'总时长'); assert.strictEqual(await p.textContent('#fsT'),'18 小时'); await turn(p,'fsE','m',30); assert.strictEqual(await p.textContent('#fsT'),'18 小时 30 分');
 await p.click('#fsE .pk-row'); await p.waitForTimeout(450);
 assert.strictEqual((await p.textContent('#fsG .pk-row span:first-child')).trim(),'断食目标（小时）'); await turn(p,'fsG','s',16); assert.strictEqual(await p.textContent('#fsG .pk-u'),'小时');
 await shot(p,'4-edit-total_dark_zh');
 ok('中文 and dark: 总时长 18 小时 30 分, 断食目标（小时）, 小时 beside the band');
 p=await open(seed(),{w:320,h:568}); await editSheet(p); await turn(p,'fsG','s',16);
 const fit=await p.evaluate(()=>{ const sh=document.getElementById('sheet').getBoundingClientRect(), q=[...document.querySelectorAll('#sheet .pk-row span, #fsT, #fsTl, #fsG .pk-u, #fsG .pk-i.sel')]; return q.filter(e=>{ const r=e.getBoundingClientRect(); return r.left<sh.left||r.right>sh.right||e.scrollWidth>e.clientWidth+1; }).map(e=>e.textContent); });
 assert.deepStrictEqual(fit,[],'nothing spills on a 320 px phone');
 ok('320 px phone: the rows and the wheel fit');

 /* the concept page */
 p=await open(seed(),{url:'/concept/'}); const html=await p.content();
 assert.match(html,/Fasting goal \(hours\)/); assert.match(html,/断食目标（小时）/); assert(!/Goal \(hours\)'/.test(html.replace(/Fasting goal \(hours\)/g,'')),'the old label is gone');
 assert.match(html,/'Total'/,'the concept edit sheet has the total'); assert(html.includes("'sel',hrs,L('hours'"),'the setup wheel has its unit');
 ok('concept page: the same words and the total');

 assert.deepStrictEqual(errs,[],'no page errors'); await b.close(); srv.close(); console.log('all edit-total tests passed');
})().catch(e=>{ console.error(e); process.exit(1); });
