/* The QR encoder (js/qr.js) must produce codes a real QR reader decodes. Needs jsqr (a test-only helper, never shipped):
   npm i --no-save jsqr   then   node tests/qr.test.js     (without jsqr it only checks sizes) */
const assert=require('assert'),Q=require('../js/qr.js');
let jsQR=null; try{ jsQR=require('jsqr'); }catch(e){ try{ jsQR=require(require('path').join(process.env.JSQR_PATH||'','jsqr')); }catch(e2){} }
const texts=['A','K7QM4XD9','https://kingtbo.github.io/Lightly-Fasting-App-Project/?join=K7QM4XD9','https://example.com/'+'x'.repeat(100),'轻伴 Lightly 邀请','a'.repeat(213),'https://kingtbo.github.io/Lightly-Fasting-App-Project/?r='+'abcdef0123456789'.repeat(8)];
function decode(text){ const m=Q.matrix(text),n=m.length,S=6,Qz=4,W=(n+Qz*2)*S,px=new Uint8ClampedArray(W*W*4).fill(255);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(m[y][x])for(let dy=0;dy<S;dy++)for(let dx=0;dx<S;dx++){const i=(((y+Qz)*S+dy)*W+(x+Qz)*S+dx)*4;px[i]=px[i+1]=px[i+2]=0;}
  return jsQR(px,W,W); }
texts.forEach(t=>{ const n=Q.matrix(t).length; assert((n-17)%4===0&&n>=21&&n<=57,'size '+n);
  if(jsQR){ const r=decode(t); assert(r&&r.data===t,'decodes: '+t.slice(0,40)+' -> '+(r&&r.data)); } });
assert.throws(()=>Q.matrix('a'.repeat(300)));
assert(/^<svg viewBox="0 0 \d+ \d+"/.test(Q.svg('K7QM4XD9')));
console.log('qr tests ok'+(jsQR?' (decoded with jsqr)':' (jsqr not installed: sizes only)'));
