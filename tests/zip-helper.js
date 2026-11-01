/* Builds a real .zip in memory for tests (stored or deflated, optionally flagged as password-protected). Synthetic data only. */
const zlib=require('zlib');
function crc32(b){let c,t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}let x=0xFFFFFFFF;for(const v of b)x=t[(x^v)&255]^(x>>>8);return (x^0xFFFFFFFF)>>>0;}
function makeZip(files,opt={}){
  const loc=[],cen=[];let off=0;
  files.forEach(([name,data])=>{
    const nb=Buffer.from(name),raw=Buffer.from(data),deflate=!opt.store,body=deflate?zlib.deflateRawSync(raw):raw,flag=opt.encrypt?1:0;
    const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(flag,6);h.writeUInt16LE(deflate?8:0,8);h.writeUInt32LE(crc32(raw),14);h.writeUInt32LE(body.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(nb.length,26);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(flag,8);c.writeUInt16LE(deflate?8:0,10);c.writeUInt32LE(crc32(raw),16);c.writeUInt32LE(body.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(nb.length,28);c.writeUInt32LE(off,42);
    loc.push(h,nb,body);cen.push(c,nb);off+=30+nb.length+body.length;
  });
  const cd=Buffer.concat(cen),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50,0);e.writeUInt16LE(files.length,8);e.writeUInt16LE(files.length,10);e.writeUInt32LE(cd.length,12);e.writeUInt32LE(off,16);
  return Buffer.concat([...loc,cd,e]);
}
module.exports=makeZip;
