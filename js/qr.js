/* Lightly QR: a small QR code encoder (byte mode, error correction M, versions 1 to 10, so up to 213 bytes) for the Friends invite link.
   No dependencies. LightlyQR.matrix(text) gives rows of true (dark) and false; LightlyQR.svg(text) gives one SVG that scales to any size.
   Tested by tests/qr.test.js, which decodes the result with an independent QR reader. */
(function(root){
'use strict';
var ECC_PER_BLOCK=[0,10,16,26,18,24,16,18,22,22,26], BLOCKS=[0,1,1,2,2,4,4,4,5,5,5];   /* error correction level M, versions 1..10 */
function rawModules(v){ var r=(16*v+128)*v+64; if(v>=2){ var n=Math.floor(v/7)+2; r-=(25*n-10)*n-55; if(v>=7) r-=36; } return r; }
function dataCodewords(v){ return Math.floor(rawModules(v)/8)-ECC_PER_BLOCK[v]*BLOCKS[v]; }
function mul(x,y){ var z=0; for(var i=7;i>=0;i--){ z=(z<<1)^((z>>>7)*0x11D); z^=((y>>>i)&1)*x; } return z&255; }
function rsGen(d){ var r=[],i,j,root=1; for(i=0;i<d;i++) r.push(0); r[d-1]=1; for(i=0;i<d;i++){ for(j=0;j<d;j++){ r[j]=mul(r[j],root); if(j+1<d) r[j]^=r[j+1]; } root=mul(root,2); } return r; }
function rsRem(data,gen){ var r=gen.map(function(){return 0;}); data.forEach(function(b){ var f=b^r.shift(); r.push(0); gen.forEach(function(c,i){ r[i]^=mul(c,f); }); }); return r; }
function utf8(s){ return Array.prototype.slice.call(unescape(encodeURIComponent(s))).map(function(c){ return c.charCodeAt(0); }); }

function encode(text){
  var bytes=utf8(text), v, cap;
  for(v=1;v<=10;v++){ cap=dataCodewords(v); if(4+(v<10?8:16)+bytes.length*8<=cap*8) break; }
  if(v>10) throw new Error('too long for this QR code');
  var bits=[]; function put(val,n){ for(var i=n-1;i>=0;i--) bits.push((val>>>i)&1); }
  put(4,4); put(bytes.length,v<10?8:16); bytes.forEach(function(b){ put(b,8); });
  put(0,Math.min(4,cap*8-bits.length)); while(bits.length%8) bits.push(0);
  for(var pad=0xEC;bits.length<cap*8;pad^=0xEC^0x11) put(pad,8);
  var data=[]; for(var i=0;i<bits.length;i+=8){ var b=0; for(var k=0;k<8;k++) b=(b<<1)|bits[i+k]; data.push(b); }
  /* split into blocks, add error correction, interleave */
  var nb=BLOCKS[v], ecl=ECC_PER_BLOCK[v], raw=Math.floor(rawModules(v)/8), shortN=nb-raw%nb, shortLen=Math.floor(raw/nb), gen=rsGen(ecl), blocks=[], off=0;
  for(i=0;i<nb;i++){ var len=shortLen-ecl+(i<shortN?0:1), d=data.slice(off,off+len); off+=len; var e=rsRem(d,gen); if(i<shortN) d.push(0); blocks.push(d.concat(e)); }
  var out=[]; for(i=0;i<blocks[0].length;i++) blocks.forEach(function(bl,j){ if(i!==shortLen-ecl||j>=shortN) out.push(bl[i]); });
  return {v:v,codewords:out};
}

function build(text){
  var enc=encode(text), v=enc.v, size=v*4+17, m=[], fn=[], x, y;
  for(y=0;y<size;y++){ m.push([]); fn.push([]); for(x=0;x<size;x++){ m[y].push(false); fn[y].push(false); } }
  function set(x,y,dark){ if(x>=0&&x<size&&y>=0&&y<size){ m[y][x]=!!dark; fn[y][x]=true; } }
  for(var i=0;i<size;i++){ set(6,i,i%2===0); set(i,6,i%2===0); }
  function finder(cx,cy){ for(var dy=-4;dy<=4;dy++) for(var dx=-4;dx<=4;dx++){ var d=Math.max(Math.abs(dx),Math.abs(dy)); set(cx+dx,cy+dy,d!==2&&d!==4); } }
  finder(3,3); finder(size-4,3); finder(3,size-4);
  var pos=[]; if(v>1){ var na=Math.floor(v/7)+2, step=Math.ceil((v*4+4)/(na*2-2))*2; pos=[6]; for(var p=size-7;pos.length<na;p-=step) pos.splice(1,0,p); }
  pos.forEach(function(a,ia){ pos.forEach(function(b,ib){ if((ia===0&&ib===0)||(ia===0&&ib===pos.length-1)||(ia===pos.length-1&&ib===0)) return; for(var dy=-2;dy<=2;dy++) for(var dx=-2;dx<=2;dx++) set(a+dx,b+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1); }); });
  function format(mask){ var d=mask, r=d; for(var i=0;i<10;i++) r=(r<<1)^((r>>>9)*0x537); var bits=((d<<10)|r)^0x5412; function g(i){ return ((bits>>>i)&1)!==0; }
    for(i=0;i<=5;i++) set(8,i,g(i)); set(8,7,g(6)); set(8,8,g(7)); set(7,8,g(8)); for(i=9;i<15;i++) set(14-i,8,g(i));
    for(i=0;i<8;i++) set(size-1-i,8,g(i)); for(i=8;i<15;i++) set(8,size-15+i,g(i)); set(8,size-8,true); }
  format(0);
  if(v>=7){ var r=v; for(i=0;i<12;i++) r=(r<<1)^((r>>>11)*0x1F25); var vb=(v<<12)|r; for(i=0;i<18;i++){ var dark=((vb>>>i)&1)!==0, a=size-11+i%3, b=Math.floor(i/3); set(a,b,dark); set(b,a,dark); } }
  /* codewords, zigzag from the bottom right */
  var cw=enc.codewords, bi=0;
  for(var right=size-1;right>=1;right-=2){ if(right===6) right=5; for(var vert=0;vert<size;vert++) for(var j=0;j<2;j++){ x=right-j; y=((right+1)&2)===0?size-1-vert:vert; if(!fn[y][x]&&bi<cw.length*8){ m[y][x]=((cw[bi>>>3]>>>(7-(bi&7)))&1)!==0; bi++; } } }
  function mask(k){ for(var y=0;y<size;y++) for(var x=0;x<size;x++){ var inv; switch(k){ case 0:inv=(x+y)%2===0;break; case 1:inv=y%2===0;break; case 2:inv=x%3===0;break; case 3:inv=(x+y)%3===0;break; case 4:inv=(Math.floor(x/3)+Math.floor(y/2))%2===0;break; case 5:inv=x*y%2+x*y%3===0;break; case 6:inv=(x*y%2+x*y%3)%2===0;break; default:inv=((x+y)%2+x*y%3)%2===0; } if(inv&&!fn[y][x]) m[y][x]=!m[y][x]; } }
  function penalty(){ var s=0,x,y,run,c,dark=0, rows=[],cols=[];
    for(y=0;y<size;y++){ var rs='',cs=''; for(x=0;x<size;x++){ rs+=m[y][x]?'1':'0'; cs+=m[x][y]?'1':'0'; if(m[y][x]) dark++; } rows.push(rs); cols.push(cs); }
    rows.concat(cols).forEach(function(l){ run=1; for(var i=1;i<=l.length;i++){ if(l[i]===l[i-1]) run++; else{ if(run>=5) s+=3+run-5; run=1; } } var f=0; ['10111010000','00001011101'].forEach(function(p){ var at=-1; while((at=l.indexOf(p,at+1))>=0) f++; }); s+=f*40; });
    for(y=0;y<size-1;y++) for(x=0;x<size-1;x++){ c=m[y][x]; if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1]) s+=3; }
    s+=(Math.ceil(Math.abs(dark*20-size*size*10)/(size*size))-1)*10; return s; }
  var best=0, bestP=1e9;
  for(var k=0;k<8;k++){ mask(k); format(k); var pn=penalty(); if(pn<bestP){ bestP=pn; best=k; } mask(k); }
  mask(best); format(best);
  return m;
}
function svg(text,quiet){ var m=build(text), n=m.length, q=quiet==null?4:quiet, d='';
  m.forEach(function(row,y){ var x=0; while(x<n){ if(row[x]){ var s=x; while(x<n&&row[x]) x++; d+='M'+(s+q)+' '+(y+q)+'h'+(x-s)+'v1h-'+(x-s)+'z'; } else x++; } });
  var t=n+q*2; return '<svg viewBox="0 0 '+t+' '+t+'" shape-rendering="crispEdges" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="'+d+'"/></svg>'; }
var api={matrix:build,svg:svg,maxBytes:function(){ return Math.floor((dataCodewords(10)*8-4-16)/8); }};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyQR=api;
})(typeof self!=='undefined'?self:this);
