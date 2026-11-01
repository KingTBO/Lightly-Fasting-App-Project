/* Lightly import: reads fasting history exported from other apps. Pure functions, no DOM; everything runs on the device. */
(function(root){
'use strict';
var H=3600000, MAXH=72;

function ts(v){ if(typeof v==='number') return v>1e12?v:v>1e9?v*1000:NaN; if(typeof v!=='string') return NaN; var s=v.trim(); if(!s) return NaN;
  if(/^\d{10,13}$/.test(s)) return ts(+s);
  s=s.replace(/^(\d{4}-\d\d-\d\d) (\d)/,'$1T$2').replace(/(\.\d{3})\d+/,'$1');
  if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?$/.test(s)) return new Date(s).getTime(); /* no zone: device local time */
  var t=Date.parse(s); return isFinite(t)?t:NaN; }

function arr(a){ return Array.isArray(a)?a:[]; }

/* Zero: the export has firestore.json (fasts[].data) and biodata.json (fast_data[]); both list the same fasts. */
function fromZero(j){
  var items=[], open=0;
  if(j&&Array.isArray(j.fasts)&&j.fasts.length&&j.fasts[0]&&j.fasts[0].data){
    j.fasts.forEach(function(r){ var d=r.data||{}, s=ts(d.start), e=ts(d.endWithSeconds||d.end);
      if(d.isEnded===false||!isFinite(e)){ open++; return; }
      items.push({id:'zero:'+(d.id||r.id),start:s,end:e,goalH:d.goal&&d.goal.hours}); });
    return {source:'Zero',items:items,open:open};
  }
  if(j&&Array.isArray(j.fast_data)){
    j.fast_data.forEach(function(r){ var s=ts(r.StartDTM), e=ts(r.EndDTM);
      if(r.IsEnded===false){ open++; return; }
      items.push({id:'zero:'+r.FastID,start:s,end:e,goalH:r.GoalHours}); });
    return {source:'Zero',items:items,open:open};
  }
  return null;
}

/* Lightly's own export, so a backup file can be restored on another phone. */
function fromLightly(j){
  if(!j||!Array.isArray(j.fasts)||!j.fasts.length||typeof j.fasts[0].start!=='number') return null;
  return {source:'Lightly',items:j.fasts.map(function(f){ return {id:f.id,start:f.start,end:f.end,goalH:f.goalH}; }),open:0};
}

/* Any other app: a JSON list or CSV with start and end columns. */
var KS=/^(start|started|startedat|starttime|startdate|starttimestamp|begin|from|faststart|startdtm)$/, KE=/^(end|ended|endedat|endtime|enddate|endtimestamp|stop|stopped|finish|finished|to|fastend|enddtm)$/, KG=/^(goal|goalhours|goalh|target|targethours|hours|plan|durationgoal)$/, KID=/^(id|fastid|uuid)$/;
function norm(k){ return String(k).toLowerCase().replace(/[^a-z0-9]/g,''); }
function pick(o,re){ for(var k in o) if(re.test(norm(k))) return o[k]; }
function fromRows(rows,source){
  var items=[], open=0, seen=0;
  rows.forEach(function(o){ if(!o||typeof o!=='object') return; var sv=pick(o,KS), ev=pick(o,KE); if(sv==null) return; seen++;
    var s=ts(sv), e=ts(ev); if(!isFinite(e)){ open++; return; }
    var g=pick(o,KG); g=typeof g==='string'?parseFloat(g):g; var id=pick(o,KID);
    items.push({id:id!=null&&id!==''?String(source)+':'+id:null,start:s,end:e,goalH:g}); });
  return seen?{source:source,items:items,open:open}:null;
}
function csv(text){
  var rows=[], row=[], f='', q=false, i=0, c;
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  var first=text.split(/\r?\n/,1)[0], d=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':((first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length?'\t':',');
  for(;i<text.length;i++){ c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
    else if(c==='"') q=true;
    else if(c===d){ row.push(f); f=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); f=''; if(row.length>1||row[0]!=='') rows.push(row); row=[]; }
    else f+=c; }
  if(f!==''||row.length){ row.push(f); rows.push(row); }
  if(rows.length<2) return [];
  var head=rows[0];
  return rows.slice(1).map(function(r){ var o={}; head.forEach(function(h,k){ o[h]=r[k]; }); return o; });
}

/* text -> {source, items:[{id,start,end,goalH}], open} or {error} */
function parse(text){
  var t=String(text||'').trim(), j=null, r=null;
  if(!t) return {error:'empty'};
  if(t[0]==='{'||t[0]==='['){
    try{ j=JSON.parse(t); }catch(e){ return {error:'json'}; }
    r=fromZero(j)||fromLightly(j);
    if(!r){ var list=Array.isArray(j)?j:(j&&(j.fasts||j.fast_data||j.data||j.records||j.items)); r=fromRows(arr(list),'import'); }
  }else r=fromRows(csv(t),'import');
  return r||{error:'format'};
}

/* Zip files (Zero's export arrives as one, with a password): read the central directory, decrypt (classic ZipCrypto or WinZip AES) and inflate with the browser's own
   DecompressionStream and Web Crypto, then use the first file inside that holds fasts. No library. The password is only used here, never stored or sent. */
var MAXZ=60*1048576;
function u16(b,o){ return b[o]|b[o+1]<<8; } function u32(b,o){ return (b[o]|b[o+1]<<8|b[o+2]<<16|b[o+3]<<24)>>>0; }
function inflate(raw){
  if(typeof DecompressionStream==='undefined') return Promise.reject(new Error('nozip'));
  var ds=new DecompressionStream('deflate-raw'), w=ds.writable.getWriter(); w.write(raw).catch(function(){}); w.close().catch(function(){});
  return new Response(ds.readable).arrayBuffer().then(function(a){ return new Uint8Array(a); });
}
var CRC=null; function crcT(){ if(CRC) return CRC; CRC=new Uint32Array(256); for(var n=0,c,k;n<256;n++){ c=n; for(k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; CRC[n]=c>>>0; } return CRC; }
/* classic ZipCrypto: 12 header bytes, then the data; the last header byte checks the password */
function zipCrypto(raw,pw,check){
  var T=crcT(), k0=0x12345678, k1=0x23456789, k2=0x34567890;
  function up(c){ k0=(T[(k0^c)&255]^(k0>>>8))>>>0; k1=(Math.imul((k1+(k0&255))>>>0,134775813)+1)>>>0; k2=(T[(k2^(k1>>>24))&255]^(k2>>>8))>>>0; }
  var pb=new TextEncoder().encode(pw), i, out=new Uint8Array(raw.length);
  for(i=0;i<pb.length;i++) up(pb[i]);
  for(i=0;i<raw.length;i++){ var t=(k2|2)&0xffff, c=raw[i]^(((t*(t^1))>>>8)&255); up(c); out[i]=c; }
  if(out.length<12||out[11]!==check) throw new Error('password');
  return out.subarray(12);
}
/* AES block encrypt (WinZip AES counts its blocks little-endian, which Web Crypto's CTR mode cannot do, so the keystream is made here) */
var SB=null; function sbox(){ if(SB) return SB; SB=new Uint8Array(256); var p=1,q=1,x; do{ p=p^((p<<1)&255)^(p&128?0x1B:0); q^=q<<1; q^=q<<2; q^=q<<4; q&=255; if(q&128) q^=0x09; x=q^((q<<1|q>>7)&255)^((q<<2|q>>6)&255)^((q<<3|q>>5)&255)^((q<<4|q>>4)&255); SB[p]=(x^0x63)&255; }while(p!==1); SB[0]=0x63; return SB; }
function xt(a){ return ((a<<1)^(a&128?0x1B:0))&255; }
function aesKeys(key){ var S=sbox(), nk=key.length/4, nr=nk+6, w=new Uint8Array(16*(nr+1)), i, t=new Uint8Array(4), rc=1; w.set(key);
  for(i=nk;i<4*(nr+1);i++){ t.set(w.subarray(4*(i-1),4*i)); if(i%nk===0){ t=new Uint8Array([S[t[1]]^rc,S[t[2]],S[t[3]],S[t[0]]]); rc=xt(rc); } else if(nk>6&&i%nk===4) t=new Uint8Array([S[t[0]],S[t[1]],S[t[2]],S[t[3]]]);
    for(var j=0;j<4;j++) w[4*i+j]=w[4*(i-nk)+j]^t[j]; }
  return {w:w,nr:nr}; }
function aesBlock(K,inp){ var S=sbox(), s=new Uint8Array(inp), r, i, c, a0,a1,a2,a3;
  for(i=0;i<16;i++) s[i]^=K.w[i];
  for(r=1;r<=K.nr;r++){ var t=new Uint8Array(16);
    for(i=0;i<16;i++) t[i]=S[s[i]];
    s=new Uint8Array([t[0],t[5],t[10],t[15],t[4],t[9],t[14],t[3],t[8],t[13],t[2],t[7],t[12],t[1],t[6],t[11]]);
    if(r<K.nr) for(c=0;c<4;c++){ a0=s[4*c];a1=s[4*c+1];a2=s[4*c+2];a3=s[4*c+3]; s[4*c]=xt(a0)^xt(a1)^a1^a2^a3; s[4*c+1]=a0^xt(a1)^xt(a2)^a2^a3; s[4*c+2]=a0^a1^xt(a2)^xt(a3)^a3; s[4*c+3]=xt(a0)^a0^a1^a2^xt(a3); }
    for(i=0;i<16;i++) s[i]^=K.w[16*r+i]; }
  return s; }
/* WinZip AES: salt, 2 verifier bytes, data, 10 bytes of authentication code */
function zipAes(raw,pw,strength){
  var sl=[8,12,16][strength-1], kl=[16,24,32][strength-1];
  if(!sl||!(typeof crypto!=='undefined'&&crypto.subtle)) return Promise.reject(new Error(sl?'nozip':'zip'));
  if(raw.length<sl+12) return Promise.reject(new Error('zip'));
  var salt=raw.subarray(0,sl), ver=raw.subarray(sl,sl+2), data=raw.subarray(sl+2,raw.length-10);
  return crypto.subtle.importKey('raw',new TextEncoder().encode(pw),'PBKDF2',false,['deriveBits']).then(function(k){
    return crypto.subtle.deriveBits({name:'PBKDF2',salt:salt,iterations:1000,hash:'SHA-1'},k,(2*kl+2)*8); }).then(function(bits){
    var d=new Uint8Array(bits); if(d[2*kl]!==ver[0]||d[2*kl+1]!==ver[1]) throw new Error('password');
    var K=aesKeys(d.subarray(0,kl)), out=new Uint8Array(data.length), ctr=new Uint8Array(16), n=0, i, ks;
    for(var o=0;o<data.length;o+=16){ n++; ctr[0]=n&255; ctr[1]=(n>>>8)&255; ctr[2]=(n>>>16)&255; ctr[3]=(n>>>24)&255; ks=aesBlock(K,ctr);
      for(i=0;i<16&&o+i<data.length;i++) out[o+i]=data[o+i]^ks[i]; }
    return out; });
}
/* ArrayBuffer (+ password) -> Promise of [{name,bytes}] (only text-like candidates), or rejects with Error('zip'|'encrypted'|'password'|'nozip') */
function unzip(buf,pw){
  var b=new Uint8Array(buf), n=b.length, e=-1, i;
  for(i=n-22;i>=Math.max(0,n-22-65535);i--) if(u32(b,i)===0x06054b50){ e=i; break; }
  if(e<0) return Promise.reject(new Error('zip'));
  var cnt=u16(b,e+10), o=u32(b,e+16), jobs=[], enc=false;
  if(cnt>2000) return Promise.reject(new Error('zip'));
  for(i=0;i<cnt;i++){
    if(o+46>n||u32(b,o)!==0x02014b50) return Promise.reject(new Error('zip'));
    var flag=u16(b,o+8), meth=u16(b,o+10), mtime=u16(b,o+12), crc=u32(b,o+16), csz=u32(b,o+20), usz=u32(b,o+24), nl=u16(b,o+28), xl=u16(b,o+30), cl=u16(b,o+32), lo=u32(b,o+42);
    var name=new TextDecoder().decode(b.subarray(o+46,o+46+nl)), xo=o+46+nl, xe=xo+xl; o+=46+nl+xl+cl;
    if(!/\.(json|csv|txt)$/i.test(name)||/(^|\/)(__MACOSX\/|\._)/.test(name)) continue;
    if(flag&1){ enc=true; if(pw==null) continue; }
    if(usz>MAXZ||lo+30>n||u32(b,lo)!==0x04034b50) continue;
    (function(name,flag,meth,mtime,crc,csz,lo,xo,xe){
      var ds=lo+30+u16(b,lo+26)+u16(b,lo+28), raw=b.subarray(ds,ds+csz), aes=0, step;
      if(flag&1&&meth===99){ /* AES extra field 0x9901: version, "AE", strength, the real method */
        for(var x=xo;x+4<=xe;x+=4+u16(b,x+2)) if(u16(b,x)===0x9901){ aes=b[x+8]; meth=u16(b,x+9); break; }
        step=zipAes(raw,pw,aes);
      }else if(flag&1) step=Promise.resolve().then(function(){ return zipCrypto(raw,pw,flag&8?(mtime>>8)&255:crc>>>24); });
      else step=Promise.resolve(raw);
      jobs.push(step.then(function(by){ return meth===0?by:meth===8?inflate(by):Promise.reject(new Error('zip')); }).then(function(by){ return {name:name,bytes:by}; },
        function(err){ return Promise.reject(flag&1&&!(err&&err.message==='nozip')?new Error('password'):err); }));
    })(name,flag,meth,mtime,crc,csz,lo,xo,xe);
  }
  if(!jobs.length) return Promise.reject(new Error(enc&&pw==null?'encrypted':'zip'));
  return Promise.all(jobs.map(function(j){ return j.then(function(v){ return v; },function(err){ return err; }); })).then(function(rs){
    var ok=rs.filter(function(r){ return !(r instanceof Error); });
    if(ok.length) return ok;
    var bad=rs.filter(function(r){ return r.message==='nozip'; }); throw bad.length?bad[0]:rs[0]; });
}
/* the file to import from a zip: Zero's firestore.json first, then biodata.json, then any other file that holds fasts. Both Zero files list the same fasts, so never merge them. */
function fromZip(buf,pw){
  return unzip(buf,pw).then(function(files){
    var rank=function(f){ var m=f.name.toLowerCase().split('/').pop(); return m==='firestore.json'?0:m==='biodata.json'?1:2; };
    files.sort(function(a,c){ return rank(a)-rank(c)||c.bytes.length-a.bytes.length; });
    for(var i=0;i<files.length;i++){ var r=parse(new TextDecoder().decode(files[i].bytes)); if(r&&!r.error&&r.items.length) return r; }
    return {error:'format'};
  },function(err){ return {error:err&&/^(zip|encrypted|password|nozip)$/.test(err.message)?err.message:'zip'}; });
}

/* Decide what goes in. `have` is the state's fasts, `cur` an open fast, `gone` ids the user deleted. */
function plan(res,have,cur,gone,now){
  var out={source:res.source,add:[],dup:0,overlap:0,bad:0,open:res.open||0,future:0,first:null,last:null};
  var ids={}, del={}; arr(have).forEach(function(f){ ids[f.id]=1; }); arr(gone).forEach(function(g){ del[g]=1; });
  var taken=arr(have).map(function(f){ return [f.start,f.end]; });
  if(cur) taken.push([cur.start,Infinity]);
  res.items.slice().sort(function(a,b){ return a.start-b.start; }).forEach(function(it){
    var s=it.start, e=it.end;
    if(!isFinite(s)||!isFinite(e)||e-s<10*60000||(e-s)/H>MAXH){ out.bad++; return; }
    if(e>now+60000){ out.future++; return; }
    if((it.id&&(ids[it.id]||del[it.id]))){ out.dup++; return; }
    for(var i=0;i<taken.length;i++){ if(s<taken[i][1]&&e>taken[i][0]){ /* same fast already logged by hand or by an earlier import: starts within 30 min counts as the same fast */
      if(Math.abs(s-taken[i][0])<30*60000) out.dup++; else out.overlap++; return; } }
    taken.push([s,e]);
    var g=Math.round(+it.goalH); if(!(g>=1&&g<=36)) g=Math.max(1,Math.min(36,Math.round((e-s)/H)));
    out.add.push({id:it.id||('imp:'+s),start:s,end:e,goalH:g,plan:g>=24?String(g):g===16?'16':'custom'});
    if(out.first==null||s<out.first) out.first=s; if(out.last==null||e>out.last) out.last=e;
  });
  return out;
}

var api={parse:parse,plan:plan,ts:ts,csv:csv,unzip:unzip,fromZip:fromZip};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyImport=api;
})(typeof self!=='undefined'?self:this);
