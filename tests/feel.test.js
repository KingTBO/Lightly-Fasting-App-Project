/* How did it feel (v0.104.0).
   1. When a fast ends, the summary asks "How did it feel?" with three choices (Easy, Okay, Hard). One tap picks and saves, the same tap again clears,
      the sheet stays open, and nothing is said back about the answer.
   2. Asked after a fast that ended early too, and in Care mode; not after a Ramadan fast.
   3. Days: the day says "felt easy", the edit sheet can change or clear it (saved with Save), and a fast added by hand can carry one.
   4. The monthly recap counts the marked fasts ("How it felt"); with none marked the section is not there. Hard is never red.
   5. 中文 and a 320 px phone.
   6. The concept page has the same three choices, the day line and the recap section.
   NODE_PATH=$(npm root -g) node tests/feel.test.js   (SHOTS=<dir> also saves pictures) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.png')?'image/png':'text/html'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000; const SHOTS=process.env.SHOTS; if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
const AT=new Date('2026-11-11T13:00:00+08:00').getTime();
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,
  fasts:[1,3,4,5,6].map(i=>({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D,goalH:16,plan:'16'})),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true},ramadanPreview:false,startedAt:AT-30*D},o||{});
const fasting=(elH,goal,plan,o)=>seed(Object.assign({cur:{start:AT-elH*H,goalH:goal||16,planId:plan||'16'},planId:plan==='ramadan'?'16':plan||'16'},o||{}));
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:SHOTS?2:1,colorScheme:o.dark?'dark':'light',timezoneId:'Asia/Shanghai',reducedMotion:'reduce'}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  await p.clock.setFixedTime(new Date(o.at||AT)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300); return p; };
 const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}); };
 const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const endFast=async p=>{ const bx=await p.locator('#act').boundingBox(); await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2); await p.mouse.down(); await p.waitForTimeout(2300); await p.mouse.up(); await p.waitForSelector('#sheet.open .big',{timeout:5000}); await p.waitForTimeout(900); };
 const seg=p=>p.evaluate(()=>{ const f=document.querySelector('#sheet .feel'); if(!f) return null; const bs=[...f.querySelectorAll('.seg button')], ph=document.getElementById('ph').getBoundingClientRect();
   return {q:f.querySelector('.feel-q').textContent,names:bs.map(x=>x.textContent),on:bs.map(x=>x.getAttribute('aria-pressed')),h:bs.map(x=>Math.round(x.getBoundingClientRect().height)),fits:bs.every(x=>x.scrollWidth<=x.clientWidth+1),inside:bs.every(x=>{ const r=x.getBoundingClientRect(); return r.left>=ph.left+15&&r.right<=ph.right-15; }),group:f.querySelector('.seg').getAttribute('role'),labelled:!!document.getElementById(f.querySelector('.seg').getAttribute('aria-labelledby'))}; });
 const last=async p=>{ const s=await S(p); return s.fasts.slice().sort((a,b)=>a.end-b.end).pop(); };

 /* 1. the summary asks, one tap saves, the same tap clears */
 let p=await open(fasting(16.5)); await endFast(p); let a=await seg(p);
 assert(a,'the summary of a finished fast asks how it felt'); assert.strictEqual(a.q,'How did it feel?'); assert.deepStrictEqual(a.names,['Easy','Okay','Hard']); assert.deepStrictEqual(a.on,['false','false','false'],'nothing is picked for the person');
 assert(a.h.every(h=>h>=44),'each choice is at least 44 pt tall: '+a.h); assert(a.fits&&a.inside,'the choices fit inside the sheet'); assert(a.group==='group'&&a.labelled,'the three choices are a labelled group for a screen reader');
 assert.strictEqual((await last(p)).feel,undefined,'nothing is saved before a tap'); await shot(p,'feel-summary');
 const before=await p.textContent('#sheet');
 await p.click('#sheet .feel [data-v=easy]'); await p.waitForTimeout(700); a=await seg(p); assert.deepStrictEqual(a.on,['true','false','false']); assert.strictEqual((await last(p)).feel,'easy','one tap saves it on the fast');
 assert(await p.$('#sheet.open'),'the sheet stays open after the tap'); assert.strictEqual(await p.textContent('#sheet'),before,'nothing is said back about the answer'); await shot(p,'feel-summary-easy');
 await p.click('#sheet .feel [data-v=hard]'); await p.waitForTimeout(600); assert.deepStrictEqual((await seg(p)).on,['false','false','true']); assert.strictEqual((await last(p)).feel,'hard','another tap changes it');
 assert.strictEqual(await p.textContent('#sheet'),before,'hard gets no comment either');
 await p.click('#sheet .feel [data-v=hard]'); await p.waitForTimeout(600); assert.deepStrictEqual((await seg(p)).on,['false','false','false']); assert(!('feel' in (await last(p))),'the same tap again clears it');
 await p.click('#sheet .feel [data-v=ok]'); await p.waitForTimeout(600); await p.click('#sheet .btns [data-act=close]'); await p.waitForTimeout(700); assert(!(await p.$('#sheet.open')),'Start eating window still closes the sheet'); assert.strictEqual((await last(p)).feel,'ok');
 ok('the summary asks "How did it feel?": one tap saves, the same tap clears, the sheet stays, nothing is said back'); await p.context().close();

 /* 2. early, Care mode, Ramadan */
 p=await open(fasting(9)); await endFast(p); assert(/Ended early/.test(await p.textContent('#sheet .k'))); assert(await seg(p),'a fast that ended early is asked too'); await p.click('#sheet .feel [data-v=hard]'); await p.waitForTimeout(600); assert.strictEqual((await last(p)).feel,'hard'); await p.context().close();
 p=await open(fasting(13.2,13,'13',{profile:{fastedBefore:true,safety:true,care:['preg']}})); await endFast(p); assert(await seg(p),'Care mode is asked too'); assert(!/streak/i.test(await p.textContent('#sheet')),'and still shows no streak'); await p.context().close();
 p=await open(fasting(13,14,'ramadan',{ramadanPreview:true})); await endFast(p); assert.strictEqual(await seg(p),null,'a Ramadan fast is not asked'); assert.strictEqual((await last(p)).plan,'ramadan'); await p.context().close();
 ok('asked after an early end and in Care mode; not after a Ramadan fast');

 /* 3. Days: the line, the edit sheet, a fast added by hand */
 const marked=seed({fasts:[1,3,4,5,6].map((i,k)=>({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D,goalH:16,plan:'16',feel:['easy','ok',undefined,'hard','easy'][k]}))});
 p=await open(marked); await p.click('#tabs [data-tab=days]'); await p.waitForTimeout(700);
 const dayKey=t=>{ const d=new Date(t+8*H); return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0'); };
 const tapDay=async k=>{ await p.click('#days [data-act=day][data-k="'+k+'"]'); await p.waitForTimeout(500); };
 await tapDay(dayKey(AT-1*D)); let row=await p.textContent('#dayd .dd-row small'); assert(/goal reached/.test(row)&&/ · felt\seasy$/.test(row),'the day says how it felt: '+row); await shot(p,'feel-day');
 await tapDay(dayKey(AT-4*D)); row=await p.textContent('#dayd .dd-row small'); assert(!/felt/.test(row),'a fast that was not marked says nothing: '+row);
 await tapDay(dayKey(AT-5*D)); row=await p.textContent('#dayd .dd-row small'); assert(/felt\shard$/.test(row));
 await p.click('#dayd .dd-row[data-act=edit]'); await p.waitForSelector('#sheet.open .feel'); await p.waitForTimeout(500); a=await seg(p); assert.deepStrictEqual(a.on,['false','false','true'],'the edit sheet shows the saved answer'); await shot(p,'feel-edit');
 await p.click('#sheet .feel [data-v=ok]'); await p.waitForTimeout(300); assert.strictEqual((await S(p)).fasts.filter(f=>f.id==='f5')[0].feel,'hard','in the edit sheet nothing is saved until Save');
 await p.click('#sheet [data-act=fssave]'); await p.waitForTimeout(800); assert.strictEqual((await S(p)).fasts.filter(f=>f.id==='f5')[0].feel,'ok'); row=await p.textContent('#dayd .dd-row small'); assert(/felt\sokay$/.test(row),'the day follows: '+row);
 await p.click('#dayd .dd-row[data-act=edit]'); await p.waitForSelector('#sheet.open .feel'); await p.waitForTimeout(500); await p.click('#sheet .feel [data-v=ok]'); await p.click('#sheet [data-act=fssave]'); await p.waitForTimeout(800);
 assert(!('feel' in (await S(p)).fasts.filter(f=>f.id==='f5')[0]),'clearing it in the edit sheet removes it'); assert(!/felt/.test(await p.textContent('#dayd .dd-row small')));
 await tapDay(dayKey(AT-2*D)); await p.click('#dayd [data-act=addday]'); await p.waitForSelector('#sheet.open .feel'); await p.waitForTimeout(500); assert.deepStrictEqual((await seg(p)).on,['false','false','false']);
 await p.click('#sheet .feel [data-v=easy]'); await p.click('#sheet [data-act=fssave]'); await p.waitForTimeout(800); const added=(await S(p)).fasts.filter(f=>!/^f\d$/.test(f.id)); assert(added.length===1&&added[0].feel==='easy','a fast added by hand can carry it: '+JSON.stringify(added));
 ok('Days: the day says "felt easy", the edit sheet changes or clears it with Save, a fast added by hand can carry one'); await p.context().close();

 /* 4. the recap */
 const oct=n=>[3,6,9,12,15,18].map((d,k)=>{ const e=new Date('2026-10-'+String(d).padStart(2,'0')+'T12:00:00+08:00').getTime(); const f={id:'rc'+d,start:e-17*H,end:e,goalH:16,plan:'16'}; if(k<n) f.feel=['easy','easy','ok','hard','easy'][k]; return f; });
 const recapAt=new Date('2026-11-02T09:00:00+08:00').getTime();
 const recap=async(st,o)=>{ const q=await open(seed(Object.assign({fasts:st,startedAt:new Date('2026-10-01T12:00:00+08:00').getTime(),prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true,recapPop:'2026-10'}},o||{})),Object.assign({at:recapAt},o&&o.view||{}));
   await q.click('#tabs [data-tab=days]'); await q.waitForTimeout(700); await q.click('#days .rcard .rcmain'); await q.waitForSelector('#report:not([hidden])',{timeout:6000}); await q.waitForTimeout(1000); return q; };
 p=await recap(oct(5)); let f=await p.evaluate(()=>{ const s=document.getElementById('rpT7'); if(!s) return null; const sec=s.closest('section'); sec.scrollIntoView(); const bar=[...sec.querySelectorAll('.rp-feel i')];
   return {h:s.textContent,cap:sec.querySelector('.rp-cap').textContent,aria:sec.querySelector('.rp-feel').getAttribute('aria-label'),w:bar.map(i=>i.style.width),nums:[...sec.querySelectorAll('.rp-feell div')].map(d=>d.textContent),hard:getComputedStyle(sec.querySelector('.rp-feel .f-hard')).backgroundColor,before:sec.previousElementSibling.querySelector('h3').textContent,after:sec.nextElementSibling.querySelector('h3').textContent,text:sec.textContent}; });
 assert(f,'the recap has "How it felt"'); assert.strictEqual(f.h,'How it felt'); assert.strictEqual(f.cap,'From the 5 fasts you marked'); assert.strictEqual(f.aria,'3 easy, 1 okay, 1 hard'); assert.deepStrictEqual(f.w,['60%','20%','20%']); assert.deepStrictEqual(f.nums,['3Easy','1Okay','1Hard']);
 { const m=f.hard.match(/[\d.]+/g).map(Number); assert(!(m[0]>m[1]+40&&m[0]>m[2]+40),'hard is not drawn in red: '+f.hard); }
 assert.strictEqual(f.after,'Highlights'); assert(!/well done|great|try|should|too/i.test(f.text),'the section gives no verdict: '+f.text); await p.waitForTimeout(900); await shot(p,'feel-recap'); await p.context().close();
 p=await recap(oct(1)); assert.strictEqual(await p.textContent('#rpT7 + .rp-cap'),'From the one fast you marked'); assert.strictEqual(await p.$$eval('.rp-feel i',x=>x.length),1,'a choice nobody tapped has no slice'); await p.context().close();
 p=await recap(oct(0)); assert.strictEqual(await p.$('#rpT7'),null,'with no fast marked the section is not there'); await p.context().close();
 ok('the recap counts the marked fasts, gives no verdict, and is absent when nothing was marked');

 /* 5. 中文 and a 320 px phone */
 p=await open(fasting(16.5,16,'16',{lang:'zh'}),{w:320,h:568}); await endFast(p); a=await seg(p); assert.strictEqual(a.q,'感觉怎么样？'); assert.deepStrictEqual(a.names,['轻松','还行','有点难']); assert(a.fits&&a.inside&&a.h.every(h=>h>=44),'中文 fits at 320 px: '+JSON.stringify(a));
 let g=await p.evaluate(()=>{ const s=document.getElementById('sheet'), b=s.querySelector('.btns .btn'), r=b.getBoundingClientRect(), sr=s.getBoundingClientRect(); return {top:sr.top,scroll:s.scrollHeight>s.clientHeight+1,btnBottom:r.bottom,vh:innerHeight,sw:document.documentElement.scrollWidth}; });
 assert(g.sw<=320,'no sideways scroll'); assert(g.top>=0&&(g.btnBottom<=g.vh||g.scroll),'the sheet stays on the screen and its button can be reached: '+JSON.stringify(g)); await shot(p,'feel-summary-zh-320');
 await p.click('#sheet .feel [data-v=hard]'); await p.waitForTimeout(600); assert.strictEqual((await last(p)).feel,'hard'); await p.click('#sheet .btns [data-act=close]'); await p.waitForTimeout(600);
 await p.click('#tabs [data-tab=days]'); await p.waitForTimeout(700); await p.click('#days [data-act=day][data-k="'+dayKey(AT)+'"]'); await p.waitForTimeout(500); row=await p.textContent('#dayd .dd-row small'); assert(/感觉有点难$/.test(row),'中文 day line: '+row);
 g=await p.evaluate(()=>{ const r=document.querySelector('#dayd .dd-row'), e=r.querySelector('.dd-e').getBoundingClientRect(), ph=document.getElementById('ph').getBoundingClientRect(); return {edit:e.right<=ph.right-15,sw:document.documentElement.scrollWidth}; }); assert(g.edit&&g.sw<=320,'the day row holds at 320 px');
 await p.context().close();
 p=await recap(oct(5),{lang:'zh',view:{w:320,h:568}}); f=await p.evaluate(()=>{ const sec=document.getElementById('rpT7').closest('section'); sec.scrollIntoView(); return {h:sec.querySelector('h3').textContent,cap:sec.querySelector('.rp-cap').textContent,nums:[...sec.querySelectorAll('.rp-feell div')].map(d=>d.textContent),fit:[...sec.querySelectorAll('.rp-feell div')].every(d=>d.scrollWidth<=d.clientWidth+1),sw:document.documentElement.scrollWidth}; });
 assert.strictEqual(f.h,'感觉如何'); assert.strictEqual(f.cap,'来自你标记的 5 次断食'); assert.deepStrictEqual(f.nums,['3轻松','1还行','1有点难']); assert(f.fit&&f.sw<=320,'the recap section fits at 320 px'); await p.context().close();
 ok('中文, and a 320 px phone');

 /* 6. the concept page */
 { const ctx=await b.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce',deviceScaleFactor:SHOTS?2:1}); p=await ctx.newPage(); p.on('pageerror',e=>errs.push('concept: '+e.message)); await p.goto('http://localhost:'+port+'/concept/'); await p.waitForTimeout(1500);
   await p.click('#moments [data-go="finish"]'); await p.waitForSelector('#sheet.open',{timeout:20000}); await p.waitForTimeout(900);
   let c=await p.evaluate(()=>{ const f=document.getElementById('shFeel'), bs=[...f.querySelectorAll('button')], sh=document.getElementById('sheet').getBoundingClientRect(); return {q:f.querySelector('.feel-q').textContent,names:bs.map(x=>x.textContent),on:bs.map(x=>x.getAttribute('aria-pressed')),h:bs.map(x=>Math.round(x.getBoundingClientRect().height)),op:getComputedStyle(f).opacity,inside:bs.every(x=>{ const r=x.getBoundingClientRect(); return r.left>=sh.left+15&&r.right<=sh.right-15; }),order:!!(f.compareDocumentPosition(document.getElementById('shNote'))&4)}; });
   assert.strictEqual(c.q,'How did it feel?'); assert.deepStrictEqual(c.names,['Easy','Okay','Hard']); assert.deepStrictEqual(c.on,['false','false','false']); assert(c.h.every(h=>h>=44)&&c.inside&&c.op==='1'&&c.order,'concept: the three choices sit in the summary above the note: '+JSON.stringify(c));
   if(SHOTS) await (await p.$('#ph')).screenshot({path:path.join(SHOTS,'feel-concept.png')});
   await p.click('#shFeel [data-v=easy]'); assert.deepStrictEqual(await p.$$eval('#shFeel button',x=>x.map(y=>y.getAttribute('aria-pressed'))),['true','false','false']); await p.click('#shFeel [data-v=easy]'); assert.deepStrictEqual(await p.$$eval('#shFeel button',x=>x.map(y=>y.getAttribute('aria-pressed'))),['false','false','false'],'concept: the same tap clears');
   const html=fs.readFileSync(path.join(root,'concept/index.html'),'utf8'); assert(/felt easy/.test(html)&&/感觉轻松/.test(html),'concept: the day line says how it felt'); assert(/How it felt/.test(html)&&/感觉如何/.test(html)&&/rp-feel/.test(html),'concept: the recap has the section');
   assert(/data-zh="感觉怎么样？"/.test(html)&&/data-zh="有点难"/.test(html),'concept: 中文'); await ctx.close(); }
 ok('the concept page has the three choices, the day line and the recap section');

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close(); srv.close(); console.log('\nfeel: all passed');
})().catch(e=>{ console.error(e); process.exit(1); });
