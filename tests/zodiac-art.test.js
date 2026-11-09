/* The engraved figures behind the star signs: every one fits inside the 358 x 400 panel with a soft border, and none is cut by a hard edge.
   The files are masks (the figure is the alpha channel), so this reads their pixels in a real browser.   NODE_PATH=$(npm root -g) node tests/zodiac-art.test.js */
const assert=require('assert'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const Z=require('../js/zodiac.js');
const ok=m=>console.log('ok  '+m);
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage();
 const arts=Z.SIGNS.map(s=>Z.layout(s,0)).filter(l=>l.fig).map(l=>l.art); assert(arts.length>=2,'at least Scorpio and Sagittarius have a figure');
 for(const a of arts){
  const data='data:image/webp;base64,'+fs.readFileSync(path.join(__dirname,'..',a)).toString('base64');
  const r=await p.evaluate(async src=>{ const i=new Image(); i.src=src; await i.decode(); const c=document.createElement('canvas'); c.width=i.naturalWidth; c.height=i.naturalHeight; const x=c.getContext('2d'); x.drawImage(i,0,0); const d=x.getImageData(0,0,c.width,c.height).data, W=c.width, H=c.height;
   const A=(xx,yy)=>d[(yy*W+xx)*4+3]; let outer=0; const E=6; for(let y=0;y<H;y++) for(let xx=0;xx<W;xx++) if((y<E||y>=H-E||xx<E||xx>=W-E)&&A(xx,y)>2) outer++;
   let minx=W,maxx=-1,miny=H,maxy=-1; for(let y=0;y<H;y++) for(let xx=0;xx<W;xx++) if(A(xx,y)>20){ minx=Math.min(minx,xx); maxx=Math.max(maxx,xx); miny=Math.min(miny,y); maxy=Math.max(maxy,y); }
   // the longest straight run of clearly visible pixels on the first and last few rows and columns of the figure: a hard cut shows up as a long flat line
   const rowRun=y=>{ let best=0,cur=0; for(let xx=0;xx<W;xx++){ if(A(xx,y)>30){ cur++; best=Math.max(best,cur); } else cur=0; } return best; };
   const colRun=xx=>{ let best=0,cur=0; for(let y=0;y<H;y++){ if(A(xx,y)>30){ cur++; best=Math.max(best,cur); } else cur=0; } return best; };
   let flat=0; for(let k=0;k<4;k++){ flat=Math.max(flat,rowRun(maxy-k),rowRun(miny+k),colRun(minx+k),colRun(maxx-k)); }
   return {W,H,outer,minx,maxx,miny,maxy,flat}; },data);
  assert.strictEqual(r.W,716); assert.strictEqual(r.H,800,a+' is the 2x panel size');
  assert.strictEqual(r.outer,0,a+': the outer 6 px ring is fully transparent ('+r.outer+' pixels are not)');
  const M=40; assert(r.minx>=M&&r.maxx<=r.W-1-M&&r.miny>=M&&r.maxy<=r.H-1-M,a+': the whole figure sits inside the panel with a margin: '+JSON.stringify(r));
  assert(r.flat<=90,a+': no hard straight cut at the edge of the figure (longest flat run '+r.flat+' px)');
  ok(a+': whole figure inside the panel, transparent border, no hard cut (bounds '+r.minx+'-'+r.maxx+' x '+r.miny+'-'+r.maxy+', flat run '+r.flat+')');
 }
 await b.close(); console.log('zodiac art tests passed'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
