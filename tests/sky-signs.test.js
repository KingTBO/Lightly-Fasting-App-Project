/* Every month's sky on the concept page's group screen, in light and dark: the sign of the month, its figure loads, and nothing overlaps (avatars, name chips,
   open seats, the caption), everything stays inside the panel.   NODE_PATH=$(npm root -g) node tests/sky-signs.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const Z=require('../js/zodiac.js');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m);
const days=[[0,5],[1,5],[2,5],[3,5],[4,5],[5,5],[6,5],[7,5],[8,5],[9,5],[10,8],[11,5]];   // month index, day: one date in every sign
(async()=>{ await new Promise(r=>srv.listen(0,r)); const url='http://localhost:'+srv.address().port+'/concept/'; const b=await chromium.launch();
 const seen=[];
 for(const [mo,d] of days){ const sign=Z.signAt(new Date(2026,mo,d));
  const ctx=await b.newContext({viewport:{width:1280,height:1000}}); await ctx.addInitScript(([mo,d])=>{ const R=Date; class D extends R{ constructor(...a){ if(a.length) super(...a); else super(2026,mo,d,12,0,0); } static now(){ return new R(2026,mo,d,12,0,0).getTime(); } } window.Date=D; },[mo,d]);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message)); await p.goto(url); await p.waitForTimeout(600); await p.click('#tryFr'); await p.waitForSelector('.fr-sky'); await p.waitForTimeout(500);
  for(const theme of ['light','dark']){ await p.evaluate(t=>document.documentElement.setAttribute('data-theme',t),theme); await p.waitForTimeout(150);
   const r=await p.evaluate(async()=>{ const sky=document.querySelector('#frScr .fr-sky'), sr=sky.getBoundingClientRect(), box=e=>{ const q=e.getBoundingClientRect(); return [q.left-sr.left,q.top-sr.top,q.right-sr.left,q.bottom-sr.top]; }, k=sr.width/358;
    const stars=[...sky.querySelectorAll('.fr-st')], seats=[...sky.querySelectorAll('.fr-seat i')]; const rings=stars.map(s=>box(s.querySelector('.fr-ring'))), chips=stars.map(s=>box(s.querySelector('.fr-sl'))), seatB=seats.map(box), cap=box(sky.querySelector('.fr-skycap'));
    const hit=(a,b,pad)=>a[0]<b[2]-pad&&a[2]>b[0]+pad&&a[1]<b[3]-pad&&a[3]>b[1]+pad; const bad=[]; const all=[...rings.map((x,i)=>['avatar '+i,x]),...seatB.map((x,i)=>['seat '+i,x])];
    for(let i=0;i<all.length;i++) for(let j=i+1;j<all.length;j++) if(hit(all[i][1],all[j][1],2)) bad.push(all[i][0]+' x '+all[j][0]);
    chips.forEach((c,i)=>{ all.forEach(([n,x])=>{ if(n!=='avatar '+i&&hit(c,x,1)) bad.push('name '+i+' x '+n); }); chips.forEach((c2,j)=>{ if(j>i&&hit(c,c2,1)) bad.push('name '+i+' x name '+j); }); });
    [...rings.map((x,i)=>['avatar '+i,x]),...chips.map((x,i)=>['name '+i,x]),...seatB.map((x,i)=>['seat '+i,x])].forEach(([n,x])=>{ if(hit(x,cap,0)) bad.push(n+' x caption'); if(x[0]<-1||x[1]<-1||x[2]>sr.width+1||x[3]>sr.height+1) bad.push(n+' outside the panel'); });
    const edge=rings.filter(x=>x[0]<28*k||x[1]<28*k||x[2]>sr.width-28*k||x[3]>sr.height-28*k).length;
    const art=sky.querySelector('.fr-art'), url=art&&art.getAttribute('data-art'); let w=0,h=0; if(url){ const i=new Image(); i.src=url; try{ await i.decode(); w=i.naturalWidth; h=i.naturalHeight; }catch(e){} }
    return {cap:sky.querySelector('.fr-skycap b').textContent,stars:stars.length,seats:seats.length,bad,edge,w,h,url}; });
   assert.strictEqual(r.cap,sign.en,'the sign of '+(mo+1)+'/'+d); assert.strictEqual(r.stars,6); assert.strictEqual(r.seats,4); assert.deepStrictEqual(r.bad,[],sign.en+' ('+theme+'): nothing overlaps: '+JSON.stringify(r.bad)); assert.strictEqual(r.edge,0,sign.en+': every avatar is at least 28 px from the panel edge'); assert.strictEqual(r.url,'../'+Z.layout(sign,0).art,'the figure of '+sign.en); assert.deepStrictEqual([r.w,r.h],[716,800],sign.en+': the figure loads'); }
  assert.deepStrictEqual(errs,[]); seen.push(sign.en); await ctx.close(); }
 assert.deepStrictEqual(seen,['Capricorn','Aquarius','Pisces','Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius']);
 ok('all twelve months: the right sign and figure, six people and four seats, nothing overlaps, light and dark ('+seen.join(', ')+')');
 await b.close(); srv.close(); console.log('sky signs tests passed'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
