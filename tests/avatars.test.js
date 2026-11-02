/* profile pictures: which picture shows, the default per account, the crop maths.  node tests/avatars.test.js */
const assert=require('assert'),A=require('../js/avatars.js'),CL=require('../js/cloud.js');
const ids=A.LIST.map(a=>a.id);
assert.strictEqual(new Set(ids).size,ids.length,'ids are unique'); assert(A.LIST.length>=8,'a set of default icons');
A.LIST.forEach(a=>{ assert(a.en&&a.zh,a.id+' has both languages'); assert(A.html(a.id).length>20,a.id+' draws'); });
assert.strictEqual(A.html('nope'),'','unknown id draws nothing');
assert(/<img[^>]+avatars\/x\.png/.test((A.LIST.push({id:'x',en:'X',zh:'叉',src:'avatars/x.png'}),A.html('x'))),'an entry with src uses the image'); A.LIST.pop();
// default: signed out = plain person; Google account = its photo; email account = a stable placeholder icon, never a locked one
assert.strictEqual(A.choose(null,null,0).t,'none');
assert.strictEqual(A.choose(null,{uid:'u1',email:'a@b.c',photo:'https://x/p=s96-c'},0).t,'google');
const d=A.choose(null,{uid:'u1',email:'a@b.c',photo:''},0); assert.strictEqual(d.t,'icon'); assert(!A.find(d.id).unlock,'default is never a locked icon');
assert.strictEqual(A.choose(null,{uid:'u1',photo:''},0).id,d.id,'same account, same default');
const seen=new Set(); for(let i=0;i<60;i++) seen.add(A.defaultIcon('user-'+i)); assert(seen.size>3,'defaults are spread across the icons');
// saved choices
const au={uid:'u1',email:'a@b.c',photo:'https://x/p'};
assert.strictEqual(A.choose({t:'icon',id:'lantern'},au,0).id,'lantern','an icon beats the Google photo');
assert.strictEqual(A.choose({t:'photo',d:'data:image/jpeg;base64,AA'},au,0).t,'photo');
assert.strictEqual(A.choose({t:'photo'},au,0).t,'google','a photo with no data falls back');
assert.strictEqual(A.choose({t:'google'},{uid:'u',photo:''},0).t,'icon','Google chosen but no photo: an icon');
assert.strictEqual(A.choose({t:'google'},null,0).t,'none','signed out: no Google photo');
assert.strictEqual(A.choose({t:'icon',id:'gone'},null,0).t,'none','unknown saved icon is ignored');
assert.strictEqual(A.choose({t:'icon',id:'eclipse'},null,29).t,'none','a locked icon does not show');
assert.strictEqual(A.choose({t:'icon',id:'eclipse'},null,30).id,'eclipse','it shows once unlocked');
assert.strictEqual(A.choose({t:'photo',d:'data:x'},null,0).t,'photo','a gallery photo works signed out');
// crop: covers the square at zoom 1, never leaves a gap, zoom is bounded
let f=A.fit(1000,500,1,0,0); assert.strictEqual(f.dh,256); assert.strictEqual(f.dw,512); assert.strictEqual(f.x,-128);
f=A.fit(1000,500,1,9999,9999); assert.strictEqual(f.ox,128); assert.strictEqual(f.oy,0); assert.strictEqual(f.x,0,'dragged to the edge, no gap');
f=A.fit(1000,500,1,-9999,0); assert.strictEqual(f.x+f.dw,256);
f=A.fit(800,800,9,0,0); assert.strictEqual(f.zoom,4); f=A.fit(800,800,.2,5,5); assert.strictEqual(f.zoom,1); assert.strictEqual(f.ox,0);
f=A.fit(300,900,2,100,-100); assert(f.x<=0&&f.x+f.dw>=256&&f.y<=0&&f.y+f.dh>=256,'always covers the square');
// the photo never goes into a sign-in link, and the newer copy's picture wins in a merge
const big={onboarded:true,fasts:[],flex:{used:[]},mod:5,avatar:{t:'photo',d:'data:image/jpeg;base64,'+'A'.repeat(20000)}};
const packed=CL.pack(big); assert(packed&&CL.unpack(packed).avatar===undefined,'photo stays out of the link'); assert(packed.length<1800);
const m=CL.merge({mod:1,fasts:[],flex:{used:[]},avatar:{t:'icon',id:'drop'}},{mod:9,fasts:[],flex:{used:[]},avatar:{t:'icon',id:'tea'}}); assert.strictEqual(m.avatar.id,'tea');
const m2=CL.merge({mod:9,fasts:[],flex:{used:[]}},{mod:1,fasts:[],flex:{used:[]},avatar:{t:'icon',id:'tea'}}); assert.strictEqual(m2.avatar.id,'tea','a copy that never chose one keeps the other\'s');
console.log('avatars ok');
if(!process.argv.includes('--e2e')&&!process.env.NODE_PATH) process.exit(0);
/* in the browser: Me tab picker, gallery photo (crop, stored small, kept offline), Google photo (cached, fallback), remove, sign-in link stays small */
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
let gOk=true,gPng=null;
const srv=http.createServer((q,r)=>{ const u=decodeURIComponent(q.url.split('?')[0]);
  if(u==='/g.png'){ if(!gOk||!gPng){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':'image/png'}); return r.end(gPng); }
  let f=path.join(root,u); if(f.endsWith('/')) f+='index.html'; fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);r.end();} else{ r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}); r.end(d);} }); });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch(); const errs=[]; const ok=n=>console.log('ok -',n);
 const seed={v:1,onboarded:true,planId:'16',prefs:{sound:false,haptics:false,d3:false}};
 const page=async(o={})=>{ const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',serviceWorkers:'block'}); const p=await c.newPage(); p.on('pageerror',e=>errs.push(e.message));
   await p.route('**/supabase.co/**',r=>r.abort()); /* no real network */
   await p.addInitScript(([s,a])=>{ if(!sessionStorage.s){ localStorage.setItem('lightly:v1',JSON.stringify(s)); if(a) localStorage.setItem('lightly:auth',JSON.stringify(a)); sessionStorage.s=1; } },[Object.assign({},seed,o.state||{}),o.auth||null]);
   await p.goto(url); await p.waitForTimeout(500); await p.click('#tabs [data-tab=me]'); await p.waitForTimeout(400); return {c,p}; };
 const S=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));
 const png=p=>p.evaluate(()=>{ const c=document.createElement('canvas'); c.width=600; c.height=300; const x=c.getContext('2d'); x.fillStyle='#c33'; x.fillRect(0,0,300,300); x.fillStyle='#36c'; x.fillRect(300,0,300,300); return c.toDataURL('image/png').split(',')[1]; });
 // signed out: plain person, picker works, a gallery photo is cropped to 256 px and kept
 { const {c,p}=await page(); assert(await p.$('#me .avb .av svg.def'),'signed out shows the plain person');
   await p.click('#me [data-act=avatar]'); await p.waitForTimeout(500); assert.strictEqual(await p.locator('#sheet .avt').count(),A.LIST.length);
   assert.strictEqual(await p.locator('#sheet .avt.lk').count(),1,'Eclipse is locked'); assert(!(await p.$('#sheet [data-act=avgoogle]')),'no Google row without a Google photo'); assert(!(await p.$('#sheet [data-act=avremove]')),'nothing to remove yet');
   await p.click('#sheet .avt.lk'); assert.match(await p.textContent('#toast'),/Eclipse unlocks after 30 fasts/); assert(await p.$('#sheet.open'),'a locked icon keeps the picker open');
   await p.click('#sheet .avt[data-id=lantern]'); await p.waitForTimeout(500); assert.deepStrictEqual((await S(p)).avatar,{t:'icon',id:'lantern'}); assert(!(await p.$('#sheet.open')),'picking closes the sheet'); assert(await p.$('#me .avb .av svg:not(.def)'));
   await p.click('#me [data-act=avatar]'); await p.waitForTimeout(500); assert.strictEqual(await p.getAttribute('#sheet .avt[data-id=lantern]','aria-pressed'),'true');
   const buf=Buffer.from(await png(p),'base64'); await p.setInputFiles('#avFile',{name:'wide.png',mimeType:'image/png',buffer:buf}); await p.waitForSelector('#cropC'); await p.waitForTimeout(300);
   assert.strictEqual(await p.getAttribute('#cropC','width'),'256');
   const px=()=>p.evaluate(()=>{ const x=document.getElementById('cropC').getContext('2d'); return [x.getImageData(20,128,1,1).data[0],x.getImageData(236,128,1,1).data[2]]; });
   let [r0,b0]=await px(); assert(r0>150&&b0>150,'centre crop shows both halves of the wide photo'); assert(await p.evaluate(()=>{ const d=document.getElementById('cropC').getContext('2d').getImageData(100,128,1,1).data; return d[0]>150&&d[2]<100; }),'red at x=100 before the drag');
   const box=await p.locator('#crop').boundingBox(); await p.mouse.move(box.x+128,box.y+128); await p.mouse.down(); await p.mouse.move(box.x+28,box.y+128,{steps:5}); await p.mouse.up(); await p.waitForTimeout(100);
   const mid=await p.evaluate(()=>{ const d=document.getElementById('cropC').getContext('2d').getImageData(100,128,1,1).data; return [d[0],d[2]]; }); assert(mid[1]>150&&mid[0]<100,'dragging left moves the photo: blue now where red was');
   await p.fill('#cropZ','2'); await p.waitForTimeout(100);
   await p.click('[data-act=avsave]'); await p.waitForTimeout(500); const st=await S(p); assert.strictEqual(st.avatar.t,'photo'); assert(/^data:image\/jpeg;base64,/.test(st.avatar.d)); assert(st.avatar.d.length<40000,'stored small: '+st.avatar.d.length);
   const dim=await p.evaluate(d=>new Promise(r=>{ const i=new Image(); i.onload=()=>r([i.width,i.height]); i.src=d; }),st.avatar.d); assert.deepStrictEqual(dim,[256,256]);
   assert(await p.$('#me .avb img.avi')); ok('signed out: icon, locked Eclipse, gallery photo cropped to 256 px and kept');
   await p.reload(); await p.waitForTimeout(500); await p.click('#tabs [data-tab=me]'); await p.waitForTimeout(300); assert(await p.$('#me .avb img.avi'),'photo survives reload (and works offline: no network used)');
   await p.click('#me [data-act=avatar]'); await p.waitForTimeout(500); await p.click('#sheet [data-act=avremove]'); await p.waitForTimeout(500); assert.strictEqual((await S(p)).avatar,null); assert(await p.$('#me .avb .av svg.def'),'removing goes back to the default'); ok('remove photo'); await c.close(); }
 // a broken photo falls back instead of showing a broken image
 { const {c,p}=await page({state:{avatar:{t:'photo',d:'data:image/jpeg;base64,AAAA'}}}); await p.waitForTimeout(400); assert(!(await p.$('#me .avb img.avi')),'damaged photo is swapped'); assert(await p.$('#me .avb .av svg.def')); ok('damaged photo falls back'); await c.close(); }
 // email account: starts with a placeholder icon, no Google row
 { const {c,p}=await page({auth:{access:'t',refresh:'r',exp:9e9,email:'a@b.c',uid:'uid-7',photo:''}}); assert(await p.$('#me .avb .av svg:not(.def)'),'an email account starts with a placeholder icon'); await p.click('#me [data-act=avatar]'); await p.waitForTimeout(500); assert.strictEqual(await p.locator('#sheet .avt.sel').count(),1,'the starting icon is marked'); assert(!(await p.$('#sheet [data-act=avgoogle]'))); ok('email account default icon'); await c.close(); }
 // Google account: its photo by default, cached on the phone, fallback to an icon if it cannot load, and switching away and back
 { gPng=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEUlEQVR4nGP4z8DwHwyBDAA/6wn7eyXU3QAAAABJRU5ErkJggg==','base64');
   const photo=url+'g.png'; const {c,p}=await page({auth:{access:'t',refresh:'r',exp:9e9,email:'g@b.c',uid:'uid-g',photo}}); await p.waitForTimeout(1500);
   assert(await p.$('#me .avb img.avi'),'Google account shows its photo by default'); assert(await p.evaluate(u=>{ const g=JSON.parse(localStorage.getItem('lightly:avg')||'{}'); return g.u===u&&/^data:image\/jpeg/.test(g.d); },photo),'Google photo copied to the phone');
   await p.click('#me [data-act=avatar]'); await p.waitForTimeout(500); assert(await p.$('#sheet [data-act=avgoogle] .v svg.ck'),'Google photo row is checked');
   await p.click('#sheet .avt[data-id=tea]'); await p.waitForTimeout(500); assert(await p.$('#me .avb .av svg:not(.def)'));
   await p.click('#me [data-act=avatar]'); await p.waitForTimeout(500); await p.click('#sheet [data-act=avgoogle]'); await p.waitForTimeout(500); assert(await p.$('#me .avb img.avi')); assert.deepStrictEqual((await S(p)).avatar,{t:'google'});
   gOk=false; await p.evaluate(()=>localStorage.removeItem('lightly:avg')); await p.reload(); await p.waitForTimeout(800); await p.click('#tabs [data-tab=me]'); await p.waitForTimeout(500);
   assert(!(await p.$('#me .avb img.avi'))&&await p.$('#me .avb .av svg:not(.def)'),'Google photo that cannot load falls back to an icon'); ok('Google account: photo by default, cached, switchable, falls back'); 
   await c.close(); }
 assert.deepStrictEqual(errs,[],'no page errors: '+errs.join('|')); await b.close(); srv.close(); console.log('avatars e2e ok'); })().catch(e=>{ console.error(e); process.exit(1); });
