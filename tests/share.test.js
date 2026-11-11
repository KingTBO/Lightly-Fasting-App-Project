/* Share a picture (v0.105.0).
   1. The summary of a fast has a round share button. It opens a sheet that shows the picture first (1080 x 1350), with Save picture,
      and with Share as the main button when the phone can share files. The close button goes back to the summary.
   2. The picture is drawn from a short list of facts: sky, moon or sun, how full, the hours, the goal line, the date, the brand.
      Never weight, a streak, a name, a place or how the fast felt. Sharing sends the picture file and nothing else.
   3. A fast that ended early is a part-filled disc; a fast that ended at night has the moon and the night sky.
   4. Days: the edit sheet has "Share a picture", and its close button goes back to the edit sheet.
   5. The recap ends with "Share this month"; its sheet opens above the recap and closing it leaves the recap open.
   6. Not offered in Care mode or for a Ramadan fast.
   7. 中文 and a 320 px phone.
   8. The concept page shows the same picture.
   NODE_PATH=$(npm root -g) node tests/share.test.js   (SHOTS=<dir> also saves pictures) */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':p.endsWith('.png')?'image/png':'text/html'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000; const SHOTS=process.env.SHOTS; if(SHOTS) fs.mkdirSync(SHOTS,{recursive:true});
const AT=new Date('2026-11-11T13:00:00+08:00').getTime();
const seed=o=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,body:{kg:72,unit:'kg'},
  fasts:[1,3,4,5,6].map(i=>({id:'f'+i,start:AT-i*D-17*H,end:AT-i*D,goalH:16,plan:'16',feel:'hard'})),flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true},ramadanPreview:false,startedAt:AT-30*D},o||{});
const fasting=(elH,goal,plan,o,at)=>seed(Object.assign({cur:{start:(at||AT)-elH*H,goalH:goal||16,planId:plan||'16'},planId:plan==='ramadan'?'16':plan||'16'},o||{}));
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch(); const errs=[];
 const open=async(s,o)=>{ o=o||{}; const ctx=await b.newContext({viewport:{width:o.w||390,height:o.h||844},deviceScaleFactor:SHOTS?2:1,timezoneId:'Asia/Shanghai',reducedMotion:'reduce',acceptDownloads:true}); const p=await ctx.newPage(); p.on('pageerror',e=>errs.push(e.message));
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:'window.LIGHTLY_CLOUD=null;'}));
  await p.addInitScript(s=>{ if(!sessionStorage.getItem('seeded')){ localStorage.setItem('lightly:v1',JSON.stringify(s)); sessionStorage.setItem('seeded','1'); } },s);
  if(o.canShare) await p.addInitScript(()=>{ navigator.canShare=d=>!!(d&&d.files&&d.files.length); navigator.share=d=>{ window.__shared={keys:Object.keys(d),n:d.files.length,name:d.files[0].name,type:d.files[0].type,size:d.files[0].size}; return Promise.resolve(); }; });
  await p.clock.setFixedTime(new Date(o.at||AT)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(1300);
  /* remember what each picture was drawn from */
  await p.evaluate(()=>{ ['fastCard','recapCard'].forEach(k=>{ const f=LightlyShare[k]; LightlyShare[k]=(c,d)=>{ window.__pic={kind:k,d:JSON.parse(JSON.stringify(d))}; return f(c,d); }; }); }); return p; };
 const shot=async(p,n)=>{ if(SHOTS) await p.screenshot({path:path.join(SHOTS,n+'.png')}); };
 const endFast=async p=>{ const bx=await p.locator('#act').boundingBox(); await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2); await p.mouse.down(); await p.waitForTimeout(2300); await p.mouse.up(); await p.waitForSelector('#sheet.open .big',{timeout:15000}); await p.waitForTimeout(900); };
 const picSheet=async p=>{ await p.waitForSelector('#sheet.open .picbox img',{timeout:15000}); await p.waitForFunction(()=>{ const i=document.querySelector('#sheet .picbox img'); return i&&i.complete&&i.naturalWidth>0; }); await p.waitForTimeout(700);
   return p.evaluate(async()=>{ const s=document.getElementById('sheet'), i=s.querySelector('.picbox img'), ph=document.getElementById('ph').getBoundingClientRect(), r=i.getBoundingClientRect(), bs=[...s.querySelectorAll('.btns .btn')];
     const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight; const x=c.getContext('2d'); x.drawImage(i,0,0); const px=(a,b)=>[...x.getImageData(a,b,1,1).data].slice(0,3);
     const mid=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
     return {h3:s.querySelector('h3').textContent,lede:s.querySelector('.lede').textContent,nw:i.naturalWidth,nh:i.naturalHeight,alt:i.alt,ratio:+(r.width/r.height).toFixed(2),inside:r.left>=ph.left+15&&r.right<=ph.right-15,btns:bs.map(b=>b.textContent+'|'+b.className+'|'+b.dataset.act),btnH:bs.map(b=>Math.round(b.getBoundingClientRect().height)),
       top:px(20,20),centre:px(540,520),bottom:px(20,1330),onTop:!!(mid&&s.contains(mid)),x:(s.querySelector('.sh-h .x')||{dataset:{}}).dataset.act,sw:document.documentElement.scrollWidth,lastBtn:bs.length?bs[bs.length-1].getBoundingClientRect().bottom:0,vh:innerHeight,scroll:s.scrollHeight>s.clientHeight+1,pic:window.__pic}; }); };
 const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)); const near=(a,b,t)=>a.every((v,i)=>Math.abs(v-b[i])<=(t||6));

 /* 1. the summary, the sheet, back, save */
 let p=await open(fasting(16.5)); await endFast(p);
 let s=await p.evaluate(()=>{ const b=document.querySelector('#sheet .sh-pic'); if(!b) return null; const r=b.getBoundingClientRect(), sh=document.getElementById('sheet').getBoundingClientRect(), big=document.querySelector('#sheet .big'), rg=document.createRange(); rg.selectNodeContents(big); const br=rg.getBoundingClientRect(); return {label:b.getAttribute('aria-label'),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(sh.right-r.right),top:Math.round(r.top-sh.top),clear:br.right<r.left||br.top>r.bottom,type:b.type}; });
 assert(s,'the summary has a share button'); assert.strictEqual(s.label,'Share a picture'); assert(s.w>=44&&s.h>=44,'44 pt target'); assert(s.right>=6&&s.right<=20&&s.top>=8,'it sits in the top right corner of the sheet: '+JSON.stringify(s)); assert(s.clear,'and does not cover the hours'); await shot(p,'share-summary');
 await p.click('#sheet .feel [data-v=easy]'); await p.waitForTimeout(400);
 await p.click('#sheet .sh-pic'); let a=await picSheet(p);
 assert.strictEqual(a.h3,'Share a picture'); assert(/Made on this phone/.test(a.lede)&&/until you share it/.test(a.lede),'says where the picture is made: '+a.lede); assert(a.nw===1080&&a.nh===1350,'1080 x 1350: '+a.nw+'x'+a.nh); assert.strictEqual(a.ratio,.8); assert(a.inside,'the picture fits in the sheet');
 assert.deepStrictEqual(a.btns,['Save picture|btn|picsave'],'a browser that cannot share files offers Save picture as the main button: '+a.btns); assert(a.btnH.every(h=>h>=44));
 assert.deepStrictEqual(Object.keys(a.pic.d).sort(),['alt','brand','date','fill','line','moon','parts','sky'],'the picture is drawn from these facts and nothing else');
 assert.deepStrictEqual(a.pic.d.parts,[['16','h'],['30','m']]); assert.strictEqual(a.pic.d.line,'16 h goal, reached'); assert.strictEqual(a.pic.d.date,'Wednesday, November 11'); assert.strictEqual(a.pic.d.brand,'Lightly 轻伴'); assert.strictEqual(a.pic.d.fill,1); assert.strictEqual(a.pic.d.moon,false); assert.strictEqual(a.pic.d.sky,'day');
 assert(!/streak|kg|72|weight|shanghai|easy|hard|felt/i.test(JSON.stringify(a.pic.d)),'no streak, weight, place or feeling goes into the picture: '+JSON.stringify(a.pic.d));
 assert(near(a.top,hex('#A9D6F2'))&&near(a.bottom,hex('#E1F0FA'),8),'the picture has the day sky: '+a.top+' '+a.bottom); assert(a.centre[0]>230&&a.centre[1]>180&&a.centre[2]<120,'and a sun in the middle: '+a.centre); assert(/16 h 30 m/.test(a.alt),'the picture has a text description: '+a.alt);
 await shot(p,'share-sheet'); assert.strictEqual(a.x,'picback');
 const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#sheet [data-act=picsave]')]); assert.strictEqual(dl.suggestedFilename(),'lightly-fast-2026-11-11.png'); const buf=fs.readFileSync(await dl.path()); assert(buf.length>20000&&buf.slice(1,4).toString()==='PNG','a real PNG is saved: '+buf.length);
 await p.waitForTimeout(400); assert(/Picture saved/.test(await p.textContent('#toast')),'says it was saved');
 await p.click('#sheet .sh-h .x'); await p.waitForSelector('#sheet.open .big'); await p.waitForTimeout(500); assert(/Fast saved/.test(await p.textContent('#sheet .k')),'the close button goes back to the summary'); assert.strictEqual(await p.getAttribute('#sheet .feel [data-v=easy]','aria-pressed'),'true','with the answer still there');
 await p.click('#sheet .btns [data-act=close]'); await p.waitForTimeout(600); assert(!(await p.$('#sheet.open')));
 ok('the summary has a share button; the sheet shows a 1080 x 1350 picture, saves a PNG, and goes back to the summary'); await p.context().close();

 /* 2. a phone that can share files */
 p=await open(fasting(16.5),{canShare:true}); await endFast(p); await p.click('#sheet .sh-pic'); a=await picSheet(p);
 assert.deepStrictEqual(a.btns,['Share|btn|picshare','Save picture|btn sec|picsave'],'Share is the main button, Save picture the second: '+a.btns);
 await p.click('#sheet [data-act=picshare]'); await p.waitForTimeout(300); const sh=await p.evaluate(()=>window.__shared);
 assert.deepStrictEqual(sh.keys,['files'],'only the picture is shared: no text, no link'); assert(sh.n===1&&sh.name==='lightly-fast-2026-11-11.png'&&sh.type==='image/png'&&sh.size>20000,JSON.stringify(sh));
 ok('where files can be shared, Share is the main button and sends only the picture'); await p.context().close();

 /* 3. early, and at night */
 p=await open(fasting(9.9)); await endFast(p); await p.click('#sheet .sh-pic'); a=await picSheet(p); assert(a.pic.d.fill>.55&&a.pic.d.fill<.68,'an early fast is a part-filled disc: '+a.pic.d.fill); assert.strictEqual(a.pic.d.line,'of a 16 h goal'); assert.deepStrictEqual(a.pic.d.parts,[['9','h'],['54','m']]); await shot(p,'share-sheet-early'); await p.context().close();
 const NIGHT=new Date('2026-11-11T23:30:00+08:00').getTime();
 p=await open(fasting(18,18,'18',{},NIGHT),{at:NIGHT}); await endFast(p); await p.click('#sheet .sh-pic'); a=await picSheet(p); assert.strictEqual(a.pic.d.sky,'night'); assert.strictEqual(a.pic.d.moon,true); assert.deepStrictEqual(a.pic.d.parts,[['18','h']]);
 assert(near(a.top,hex('#0E1430'))&&a.centre[0]>200&&a.centre[2]>180,'night sky and a pale moon: '+a.top+' '+a.centre); await shot(p,'share-sheet-night'); await p.context().close();
 ok('an early fast is part-filled; a fast that ends at night has the moon');

 /* 4. Days: the edit sheet */
 p=await open(seed()); await p.click('#tabs [data-tab=days]'); await p.waitForTimeout(700); await p.click('#days [data-act=day][data-k="2026-11-10"]'); await p.waitForTimeout(500); await p.click('#dayd .dd-row[data-act=edit]'); await p.waitForSelector('#sheet.open [data-act=picfast]'); await p.waitForTimeout(500);
 assert.strictEqual((await p.textContent('#sheet [data-act=picfast]')).trim(),'Share a picture'); await shot(p,'share-edit'); await p.click('#sheet [data-act=picfast]'); a=await picSheet(p); assert.deepStrictEqual(a.pic.d.parts,[['17','h']]); assert.strictEqual(a.pic.d.date,'Tuesday, November 10');
 await p.click('#sheet .sh-h .x'); await p.waitForSelector('#sheet.open [data-act=fssave]'); assert(/Edit fast/.test(await p.textContent('#sheet h3')),'the close button goes back to the edit sheet'); await p.context().close();
 ok('Days: the edit sheet has "Share a picture" and gets you back');

 /* 5. the recap */
 const oct=()=>[2,3,6,9,12,15,18,21].map((d,k)=>{ const e=new Date('2026-10-'+String(d).padStart(2,'0')+'T12:00:00+08:00').getTime(); return {id:'rc'+d,start:e-(k===1?10:17)*H,end:e,goalH:16,plan:'16'}; });
 const recapAt=new Date('2026-11-02T09:00:00+08:00').getTime();
 const recap=async(o,view)=>{ const q=await open(seed(Object.assign({fasts:oct(),startedAt:new Date('2026-10-01T12:00:00+08:00').getTime(),prefs:{sound:false,haptics:false,d3:false,notify:false,backupAsked:true,recapPop:'2026-10'}},o||{})),Object.assign({at:recapAt},view||{}));
   await q.click('#tabs [data-tab=days]'); await q.waitForTimeout(700); await q.click('#days .rcard .rcmain'); await q.waitForSelector('#report:not([hidden])',{timeout:6000}); await q.waitForTimeout(1000); return q; };
 p=await recap(); let rb=await p.evaluate(()=>{ const b=document.querySelector('#report [data-act=picrecap]'); if(!b) return null; b.scrollIntoView({block:'center'}); const r=b.getBoundingClientRect(), d=document.querySelector('#report .rp-end [data-act=rpclose]').getBoundingClientRect(), cs=getComputedStyle(b); return {t:b.textContent,h:Math.round(r.height),below:r.top>=d.bottom,bg:cs.backgroundColor,col:cs.color}; });
 assert(rb,'the recap ends with a share button'); assert.strictEqual(rb.t,'Share this month'); assert(rb.h>=44&&rb.below,'it sits under Done, 44 pt tall: '+JSON.stringify(rb)); assert(/rgba\(0, 0, 0, 0\)|transparent/.test(rb.bg),'and is quieter than Done: '+rb.bg); await p.waitForTimeout(600); await shot(p,'share-recap-end');
 await p.click('#report [data-act=picrecap]'); a=await picSheet(p); assert(a.onTop,'the sheet opens above the recap'); assert.strictEqual(a.x,'close');
 assert.deepStrictEqual(Object.keys(a.pic.d).sort(),['alt','big','brand','days','heads','offset','sub','tint','title','unit']); assert.strictEqual(a.pic.d.title,'October 2026'); assert.strictEqual(a.pic.d.unit,'hours fasted'); assert.strictEqual(a.pic.d.big,'129'); assert.strictEqual(a.pic.d.sub,'8 fasts · 8 of 31 days');
 assert.strictEqual(a.pic.d.days.length,31); assert.strictEqual(a.pic.d.offset,3,'October 2026 starts on a Thursday'); assert.strictEqual(a.pic.d.days[1].s,'done'); assert.strictEqual(a.pic.d.days[2].s,'early'); assert(a.pic.d.days[2].p>.5&&a.pic.d.days[2].p<.7); assert.strictEqual(a.pic.d.days[0].s,'none');
 assert(!/kg|72|weight|streak|felt|hard/i.test(JSON.stringify(a.pic.d)),'no weight, streak or feeling in the month picture'); assert(near(a.top,hex('#FFCC00')),'the month picture is the recap yellow: '+a.top); await shot(p,'share-recap-sheet');
 const [dl2]=await Promise.all([p.waitForEvent('download'),p.click('#sheet [data-act=picsave]')]); assert.strictEqual(dl2.suggestedFilename(),'lightly-recap-2026-11-02.png');
 await p.click('#sheet .sh-h .x'); await p.waitForTimeout(900); let after=await p.evaluate(()=>({sheet:document.getElementById('sheet').classList.contains('open'),report:!document.getElementById('report').hidden,inert:document.getElementById('report').hasAttribute('inert'),up:document.getElementById('ph').classList.contains('picup')}));
 assert.deepStrictEqual(after,{sheet:false,report:true,inert:false,up:false},'closing the sheet leaves the recap open and usable: '+JSON.stringify(after)); await p.click('#report .rp-end [data-act=rpclose]'); await p.waitForTimeout(1200); assert(await p.evaluate(()=>document.getElementById('report').hidden),'Done still closes the recap');
 ok('the recap ends with "Share this month"; its sheet opens above the recap and closing it leaves the recap open'); await p.context().close();

 /* 6. Care mode and Ramadan */
 const careP={profile:{fastedBefore:true,safety:true,care:['preg']}};
 p=await open(fasting(13.2,13,'13',careP)); await endFast(p); assert.strictEqual(await p.$('#sheet .sh-pic'),null,'Care mode: no share button on the summary'); await p.click('#sheet .btns [data-act=edit]'); await p.waitForSelector('#sheet.open [data-act=fssave]'); assert.strictEqual(await p.$('#sheet [data-act=picfast]'),null,'Care mode: none in the edit sheet'); await p.context().close();
 p=await recap(careP); assert.strictEqual(await p.$('#report [data-act=picrecap]'),null,'Care mode: none in the recap'); await p.context().close();
 p=await open(fasting(13,14,'ramadan',{ramadanPreview:true})); await endFast(p); assert.strictEqual(await p.$('#sheet .sh-pic'),null,'a Ramadan fast has no share button'); await p.click('#sheet .btns [data-act=edit]'); await p.waitForSelector('#sheet.open [data-act=fssave]'); assert.strictEqual(await p.$('#sheet [data-act=picfast]'),null,'nor in its edit sheet'); await p.context().close();
 ok('not offered in Care mode or for a Ramadan fast');

 /* 7. 中文 and a 320 px phone */
 p=await open(fasting(16.5,16,'16',{lang:'zh'}),{w:320,h:568}); await endFast(p); assert.strictEqual(await p.getAttribute('#sheet .sh-pic','aria-label'),'分享图片'); await p.click('#sheet .sh-pic'); a=await picSheet(p);
 assert.strictEqual(a.h3,'分享图片'); assert(/在手机上生成/.test(a.lede)); assert.deepStrictEqual(a.btns,['保存图片|btn|picsave']); assert.deepStrictEqual(a.pic.d.parts,[['16','小时'],['30','分']]); assert.strictEqual(a.pic.d.line,'16小时目标，达成了'); assert(/11月11日/.test(a.pic.d.date),a.pic.d.date);
 assert(a.inside&&a.sw<=320,'the picture fits at 320 px'); assert(a.lastBtn<=a.vh||a.scroll,'the button can be reached: '+a.lastBtn+' / '+a.vh); await shot(p,'share-sheet-zh-320'); await p.context().close();
 p=await recap({lang:'zh'},{w:320,h:568}); assert.strictEqual(await p.textContent('#report [data-act=picrecap]'),'分享这个月'); await p.evaluate(()=>document.querySelector('#report [data-act=picrecap]').scrollIntoView({block:'center'})); await p.click('#report [data-act=picrecap]'); a=await picSheet(p);
 assert(a.onTop&&a.sw<=320); assert.strictEqual(a.pic.d.title,'2026年10月'); assert.strictEqual(a.pic.d.unit,'小时断食'); assert.deepStrictEqual(a.pic.d.heads,['一','二','三','四','五','六','日']); assert.strictEqual(a.pic.d.sub,'8 次断食 · 8 / 31 天'); await p.context().close();
 ok('中文, and a 320 px phone');

 /* 8. the concept page */
 { const ctx=await b.newContext({viewport:{width:1280,height:1000},reducedMotion:'reduce',deviceScaleFactor:SHOTS?2:1}); p=await ctx.newPage(); p.on('pageerror',e=>errs.push('concept: '+e.message)); await p.goto('http://localhost:'+port+'/concept/'); await p.waitForTimeout(1500);
   await p.click('#moments [data-go="finish"]'); await p.waitForSelector('#sheet.open',{timeout:20000}); await p.waitForTimeout(900);
   let c=await p.evaluate(()=>{ const bt=document.getElementById('shPic'); if(!bt) return null; const r=bt.getBoundingClientRect(), sh=document.getElementById('sheet').getBoundingClientRect(); return {label:bt.getAttribute('aria-label'),w:Math.round(r.width),h:Math.round(r.height),right:Math.round(sh.right-r.right)}; });
   assert(c&&c.label==='Share a picture'&&c.w>=44&&c.h>=44&&c.right>=6&&c.right<=24,'concept: the summary has the share button: '+JSON.stringify(c));
   await p.click('#shPic'); await p.waitForSelector('#picSheet.open',{timeout:15000}); await p.waitForFunction(()=>{ const i=document.querySelector('#picSheet img'); return i&&i.complete&&i.naturalWidth>0; }); await p.waitForTimeout(700);
   c=await p.evaluate(()=>{ const s=document.getElementById('picSheet'), i=s.querySelector('img'), ph=document.getElementById('ph').getBoundingClientRect(), r=i.getBoundingClientRect(); return {t:s.querySelector('h4').textContent,note:s.querySelector('.ps-note').textContent,nw:i.naturalWidth,nh:i.naturalHeight,inside:r.left>=ph.left+15&&r.right<=ph.right-15&&r.bottom<=ph.bottom,btn:[...s.querySelectorAll('.pic-b')].map(x=>x.textContent)}; });
   assert.strictEqual(c.t,'Share a picture'); assert(/Made on this phone/.test(c.note)); assert(c.nw===1080&&c.nh===1350&&c.inside,'concept: the same 1080 x 1350 picture, inside the phone: '+JSON.stringify(c)); assert(c.btn.indexOf('Save picture')>=0,'concept: Save picture');
   if(SHOTS) await (await p.$('#ph')).screenshot({path:path.join(SHOTS,'share-concept.png')});
   await p.click('#picClose'); await p.waitForTimeout(600); assert(!(await p.evaluate(()=>document.getElementById('picSheet').classList.contains('open'))),'concept: it closes'); assert(await p.evaluate(()=>document.getElementById('sheet').classList.contains('open')),'concept: back on the summary');
   const html=fs.readFileSync(path.join(root,'concept/index.html'),'utf8'); assert(/Share this month/.test(html)&&/分享这个月/.test(html),'concept: the recap has Share this month'); assert(/\.\.\/js\/share\.js/.test(html),'concept: draws with the app\'s own share.js'); await ctx.close(); }
 ok('the concept page shows the same picture');

 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join(' | '));
 await b.close(); srv.close(); console.log('\nshare: all passed');
})().catch(e=>{ console.error(e); process.exit(1); });
