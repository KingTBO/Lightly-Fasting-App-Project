/* The monthly recap pop-up: once per month, on the first open between the 1st and the 3rd, only with a recap. usage: NODE_PATH=$(npm root -g) node tests/recappop.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const errs=[];const ok=n=>console.log('ok -',n);
 const H=3600000,mk=n=>[3,6,9,12].slice(0,n).map(d=>{const e=new Date('2026-10-'+String(d).padStart(2,'0')+'T12:00:00+08:00').getTime();return{id:'rc'+d,start:e-17*H,end:e,goalH:16,plan:'16'};});
 const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:false,safety:false,care:[]},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:mk(4),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:new Date('2026-10-01T12:00:00+08:00').getTime(),mod:1,del:[]},o);
 async function open(when,state,keep){const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',deviceScaleFactor:1});await c.clock.install({time:new Date(when)});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));
  await q.addInitScript(x=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',x);sessionStorage.s=1}},JSON.stringify(state));await q.goto(url);await q.waitForTimeout(500);await q.clock.runFor(2000);await q.waitForTimeout(700);return q;}
 const shown=q=>q.evaluate(()=>document.getElementById('sheet').classList.contains('open')&&!!document.querySelector('#sheet .rpop'));
 let q=await open('2026-11-02T09:00:00+08:00',seed());
 assert(await shown(q),'pop-up on the 2nd');
 assert.match(await q.textContent('#sheet h3'),/^Your October recap is ready$/);assert.match(await q.textContent('#sheet .lede'),/hours, days and sky/);
 assert.strictEqual((await q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).prefs.recapPop,'2026-10');
 await q.screenshot({path:process.env.SHOT||'/tmp/recappop.png'});
 await q.click('#sheet [data-act=close]');await q.waitForTimeout(700);assert(!(await shown(q)),'Later closes it');
 await q.reload();await q.waitForTimeout(500);await q.clock.runFor(3000);await q.waitForTimeout(500);assert(!(await shown(q)),'and it does not come back this month');
 ok('shows once, Later closes it');
 q=await open('2026-11-02T09:00:00+08:00',seed());
 await q.click('#sheet [data-act=recappop]');await q.waitForSelector('#report:not([hidden])',{timeout:6000});await q.waitForTimeout(900);
 assert.match(await q.textContent('#rpT'),/^Your October recap$/);assert(!(await shown(q)));
 ok('See my recap opens the report');
 q=await open('2026-11-02T09:00:00+08:00',seed({lang:'zh'}));assert.match(await q.textContent('#sheet h3'),/^你的十月回顾准备好了$/);assert.match(await q.textContent('#sheet [data-act=recappop]'),/查看回顾/);
 ok('中文');
 for(const [when,st,why] of [['2026-11-10T09:00:00+08:00',seed(),'after the 3rd'],['2026-11-02T09:00:00+08:00',seed({fasts:mk(2)}),'fewer than three fasts'],['2026-11-02T09:00:00+08:00',seed({prefs:{sound:false,haptics:false,d3:false,notify:false,recapSeen:'2026-10'}}),'recap already dismissed'],['2026-11-02T09:00:00+08:00',seed({onboarded:false}),'not set up yet']]){
  q=await open(when,st);assert(!(await shown(q)),'no pop-up: '+why);}
 ok('not shown late, with too few fasts, once dismissed, or before setup');
 await b.close();srv.close();
 assert.deepStrictEqual(errs,[],'page errors: '+errs.join(' | '));console.log('recappop ok');
})().catch(e=>{console.error(e);process.exit(1);});
