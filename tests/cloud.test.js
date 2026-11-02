/* merge rules and the sign-in + backup flow against a mock Supabase.  NODE_PATH=$(npm root -g) node tests/cloud.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const CL=require('../js/cloud.js');const H=3600000;
const f=(id,s,g=16)=>({id,start:s,end:s+g*H,goalH:g,plan:'16'});
// a precise location never goes to the backup or the sign-in link; merge keeps this device's own coordinates
{ const st={onboarded:true,place:{key:'here',lat:31.23,lon:121.47},fasts:[],flex:{used:[]},mod:5};
  assert.strictEqual(JSON.stringify(CL.unpack(CL.pack(st)).place),JSON.stringify({key:'here',lat:null,lon:null}));
  const m=CL.merge(Object.assign({},st,{mod:1}),{place:{key:'here',lat:null,lon:null},fasts:[],flex:{used:[]},mod:9});
  assert.strictEqual(m.place.lat,31.23); console.log('place stays on the phone ok'); }
// union, tombstones, newer wins, flex union
const a={mod:10,fasts:[f('a',1e12),f('b',2e12)],del:[],flex:{bank:1,used:['2026-10-01']},planId:'16',startedAt:5,unwell:null,unlocked:{24:9}};
const b={mod:20,fasts:[f('b',2e12,18),f('c',3e12),f('a',1e12)],del:['a'],flex:{bank:2,used:['2026-10-02']},planId:'18',startedAt:3,unwell:7,unlocked:{24:4,36:8}};
const m=CL.merge(a,b);
assert.deepStrictEqual(m.fasts.map(x=>x.id),['b','c'],'a deleted, b and c kept');
assert.strictEqual(m.fasts[0].goalH,18,'newer copy wins for the same fast');
assert.strictEqual(m.planId,'18');assert.strictEqual(m.flex.bank,2);assert.deepStrictEqual(m.flex.used,['2026-10-01','2026-10-02']);
assert.strictEqual(m.startedAt,3);assert.strictEqual(m.unwell,7);assert.deepStrictEqual(m.unlocked,{24:4,36:8});assert.strictEqual(m.mod,20);
const m2=CL.merge(b,a);assert.deepStrictEqual(m2.fasts.map(x=>x.id),['b','c'],'merge is symmetric');
console.log('merge ok');
if(!process.argv.includes('--e2e')&&!process.env.NODE_PATH){process.exit(0);}
const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
let rows={},codes={},googleOn=false,delFail=false,deleted=[],goneTok=new Set();
const mock=http.createServer((q,r)=>{
  r.setHeader('Access-Control-Allow-Origin','*');r.setHeader('Access-Control-Allow-Headers','*');r.setHeader('Access-Control-Allow-Methods','*');
  if(q.method==='OPTIONS'){r.writeHead(204);return r.end();}
  let body='';q.on('data',d=>body+=d);q.on('end',()=>{const j=body?JSON.parse(body):{};const u=q.url;const out=(c,o)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(o));};
    if(u.startsWith('/auth/v1/settings')) return out(200,{external:{google:googleOn,email:true}});
    if(u.startsWith('/auth/v1/otp')){codes[j.email]='123456';return out(200,{});}
    if(u.startsWith('/auth/v1/verify')){if(j.token!==codes[j.email])return out(400,{msg:'Token has expired or is invalid'});return out(200,{access_token:'tok-'+j.email,refresh_token:'r',expires_in:3600,user:{id:'uid-'+j.email,email:j.email}});}
    if(u.startsWith('/auth/v1/user')){if(goneTok.has(q.headers.authorization))return out(403,{msg:'User from sub claim in JWT does not exist'});return out(200,(q.headers.authorization||'').includes('google')?{id:'uid-g',email:'mina.k@gmail.com',user_metadata:{given_name:'Mina',full_name:'Mina Kato',avatar_url:''}}:{id:'uid-x',email:'x@y.z'});}
    if(u.startsWith('/auth/v1/logout')) return out(204,{});
    if(u.startsWith('/functions/v1/delete-account')){const tk=(q.headers.authorization||'');if(!tk.startsWith('Bearer tok-'))return out(401,{error:'signed out'});if(delFail)return out(500,{error:'account'});const uid=tk.replace('Bearer tok-','uid-');delete rows[uid];deleted.push(uid);return out(200,{ok:true});}
    if(u.startsWith('/rest/v1/lightly_state')){const uid=(q.headers.authorization||'').replace('Bearer tok-','uid-');
      if(goneTok.has(q.headers.authorization)) return out(409,{message:'violates foreign key constraint'});
      if(q.method==='GET') return out(200,rows[uid]?[rows[uid]]:[]);
      rows[uid]={data:j.data,updated_at:j.updated_at};return out(201,{});}
    out(404,{});});});
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});r.end(d);}});});
(async()=>{await new Promise(r=>mock.listen(0,r));await new Promise(r=>srv.listen(0,r));
 const murl='http://localhost:'+mock.address().port,url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();
 async function device(seedState,code){code=code!==false;const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:`window.LIGHTLY_CLOUD={url:'${murl}',key:'anon'${code?",code:true":''}};`}));
  const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
  if(seedState)await p.addInitScript(s=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',s);sessionStorage.s=1}},JSON.stringify(seedState));
  await p.goto(url);await p.waitForTimeout(500);return {ctx,p,errs};}
 const now=Date.now();
 const base=(fasts,extra)=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts,flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:now-9*24*H,mod:now-1000,del:[]},extra||{});
 // device 1: sign in with a wrong code, then the right one, backup lands in the mock
 const d1=await device(base([f('one',now-48*H)]));
 await d1.p.click('#tabs [data-tab=me]');await d1.p.click('[data-act=emailsheet]');await d1.p.fill('#emIn','tb@example.com');await d1.p.click('[data-act=emsend]');await d1.p.waitForSelector('#emCode');
 await d1.p.fill('#emCode','000000');await d1.p.click('[data-act=emverify]');await d1.p.waitForSelector('#sheet .note.err');assert.match(await d1.p.textContent('#sheet .note.err'),/didn.t work/);ok('wrong code is refused');
 await d1.p.fill('#emCode','123456');await d1.p.click('[data-act=emverify]');await d1.p.waitForTimeout(1200);
 assert.match(await d1.p.textContent('#me .me-card b'),/Add your name/);assert(rows['uid-tb@example.com'],'backup written');assert.strictEqual(rows['uid-tb@example.com'].data.fasts.length,1);ok('email code sign-in and first backup');
 // device 2: fresh install, has a different fast, signs in as the same person: fasts are combined, account settings win
 const d2=await device(base([f('two',now-24*H)],{planId:'20',mod:now}));
 await d2.p.click('#tabs [data-tab=me]');await d2.p.click('[data-act=emailsheet]');await d2.p.fill('#emIn','tb@example.com');await d2.p.click('[data-act=emsend]');await d2.p.waitForSelector('#emCode');await d2.p.fill('#emCode','123456');await d2.p.click('[data-act=emverify]');await d2.p.waitForTimeout(1500);
 const s2=await d2.p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));assert.deepStrictEqual(s2.fasts.map(x=>x.id).sort(),['one','two']);assert.strictEqual(s2.planId,'16','account settings win on a new device');
 assert.strictEqual(rows['uid-tb@example.com'].data.fasts.length,2);ok('second device merges fasts and takes account settings');
 // sign out keeps local data
 await d2.p.click('#tabs [data-tab=me]');await d2.p.click('[data-act=signout]');await d2.p.click('[data-act=signoutok]');await d2.p.waitForTimeout(300);
 assert(await d2.p.$('[data-act=emailsheet]'),'signed-out card is back');assert.strictEqual((await d2.p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).fasts.length,2);ok('sign out keeps local fasts');
 // Google: off in the project -> a friendly toast; on -> the browser goes to Supabase's authorize URL with a redirect back here
 {const g=await device(base([f('g',now-20*H)]));await g.p.click('#tabs [data-tab=me]');await g.p.click('#me [data-act=google]');await g.p.waitForTimeout(700);
 assert.match(await g.p.textContent('#toast'),/Google sign-in is not switched on/);assert(!(await g.p.evaluate(()=>document.querySelector('#me [data-act=google]').disabled)),'button usable again');
 googleOn=true;const g2=await device(base([f('g2',now-20*H)]));await g2.p.click('#tabs [data-tab=me]');
 const [rq]=await Promise.all([g2.p.waitForRequest(r=>r.url().includes('/auth/v1/authorize'),{timeout:5000}),g2.p.click('#me [data-act=google]')]);
 const ru=new URL(rq.url());assert.strictEqual(ru.searchParams.get('provider'),'google');assert(ru.searchParams.get('redirect_to').startsWith(url),'redirect comes back to the app');googleOn=false;
 ok('Google sign-in: friendly fallback when off, authorize redirect when on');}
 // link-only emails (no code field): send, then return through the link; also an expired link
 const d3=await device(base([f('three',now-30*H)]),false);
 await d3.p.click('#tabs [data-tab=me]');await d3.p.click('[data-act=emailsheet]');await d3.p.fill('#emIn','link@example.com');await d3.p.click('[data-act=emsend]');await d3.p.waitForSelector('#emResend');
 assert(!(await d3.p.$('#emCode')),'no code field when code emails are off');assert(await d3.p.isDisabled('#emResend'),'resend is cooling down');ok('link-only sheet has no code field and a resend cooldown');
 await d3.p.goto(url+'#access_token=tok-link@example.com&refresh_token=r&expires_in=3600&token_type=bearer&type=magiclink');await d3.p.reload();await d3.p.waitForTimeout(1500);
 assert(await d3.p.evaluate(()=>!!localStorage.getItem('lightly:auth')),'signed in from the link');assert(!(await d3.p.evaluate(()=>location.hash)),'hash cleared');ok('returning through the magic link signs in');
 const d4=await device(base([]),false);await d4.p.goto(url+'#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');await d4.p.reload();await d4.p.waitForTimeout(800);
 assert.match(await d4.p.textContent('#toast'),/expired/);assert(!(await d4.p.evaluate(()=>localStorage.getItem('lightly:auth'))));ok('expired link shows a friendly message');
 // the link opens in a different, empty browser: the state rides along in ?r=, so no onboarding and straight to Today
 const d5=await device(null,false);await d5.p.evaluate(()=>localStorage.clear());
 const carried=await d3.p.evaluate(()=>LightlyCloud.pack(JSON.parse(localStorage.getItem('lightly:v1'))));assert(carried&&carried.length<=1800,'state packs small');
 await d5.p.goto(url+'?r='+carried+'#access_token=tok-link@example.com&refresh_token=r&expires_in=3600&type=magiclink');await d5.p.reload();await d5.p.waitForTimeout(1800);
 assert(await d5.p.evaluate(()=>document.getElementById('ob').hidden),'onboarding stays hidden');assert((await d5.p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).fasts.some(x=>x.id==='three'),'fasts carried over');assert.strictEqual(await d5.p.evaluate(()=>location.search),'');ok('link in a fresh browser skips onboarding and lands on Today');
 // a brand-new account on a fresh browser still gets onboarding, once, after sign-in resolves
 const d6=await device(null,false);await d6.p.evaluate(()=>localStorage.clear());await d6.p.goto(url+'#access_token=tok-new@example.com&refresh_token=r&expires_in=3600&type=magiclink');await d6.p.reload();await d6.p.waitForTimeout(1800);
 assert(!(await d6.p.evaluate(()=>document.getElementById('ob').hidden)),'new account sees onboarding');ok('new account still gets onboarding');
 // delete account: only when signed in; a failed attempt changes nothing; a good one removes the account, signs out and asks what to do with the fasts on the phone
 {await d4.p.goto(url);await d4.p.waitForTimeout(500);await d4.p.click('#tabs [data-tab=me]');assert(!(await d4.p.$('[data-act=delacct]')),'no Delete account row when signed out');
 await d3.p.goto(url);await d3.p.waitForTimeout(1500);await d3.p.click('#tabs [data-tab=me]');assert(await d3.p.$('[data-act=delacct]'),'Delete account row when signed in');
 const holdDel=async()=>{await d3.p.waitForFunction(()=>{const g=document.getElementById('delGo');return g&&!g.disabled;},null,{timeout:6000});const bb=await d3.p.locator('#delGo').boundingBox();await d3.p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await d3.p.mouse.down();await d3.p.waitForTimeout(2400);await d3.p.mouse.up();};
 await d3.p.click('[data-act=delacct]');assert(await d3.p.isDisabled('#delGo'),'delete is locked at first');assert.match(await d3.p.textContent('#sheet'),/Delete your account\?/);
 await d3.p.mouse.click(5,5);await d3.p.waitForTimeout(500);assert(await d3.p.evaluate(()=>!!localStorage.getItem('lightly:auth')),'closing the sheet deletes nothing');
 delFail=true;await d3.p.click('[data-act=delacct]');await holdDel();await d3.p.waitForSelector('#sheet .note.err');assert.match(await d3.p.textContent('#sheet .note.err'),/Couldn.t delete/);assert(await d3.p.evaluate(()=>!!localStorage.getItem('lightly:auth')),'a failed delete keeps the sign-in');assert.deepStrictEqual(deleted,[]);ok('delete account: locked first, cancel safe, failure keeps everything');
 delFail=false;await holdDel();await d3.p.waitForSelector('[data-act=delkeep]',{timeout:6000});
 assert.deepStrictEqual(deleted,['uid-link@example.com']);assert(!rows['uid-link@example.com'],'backup removed on the server');assert(await d3.p.evaluate(()=>!localStorage.getItem('lightly:auth')),'signed out');
 assert((await d3.p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).fasts.some(x=>x.id==='three'),'fasts still on the phone');assert(await d3.p.$('[data-act=erase]'),'offers to erase them');
 await d3.p.click('[data-act=delkeep]');await d3.p.waitForTimeout(400);assert(await d3.p.$('[data-act=emailsheet]'),'back to the signed-out card');assert(!(await d3.p.$('[data-act=delacct]')),'row gone');ok('delete account: server delete, sign out, keep or erase the fasts');}
 // the same account is deleted on another phone: this phone finds out on its next backup, signs out, keeps its fasts and says why
 {const o=await device(base([f('keep',now-30*H)]),false);await o.p.goto(url+'#access_token=tok-other@example.com&refresh_token=r&expires_in=3600&type=magiclink');await o.p.reload();await o.p.waitForTimeout(1500);
 assert(await o.p.evaluate(()=>!!localStorage.getItem('lightly:auth')),'signed in on the other phone');
 goneTok.add('Bearer tok-other@example.com');await o.p.click('#tabs [data-tab=me]');await o.p.click('[data-act=syncnow]');await o.p.waitForTimeout(1500);
 assert(await o.p.evaluate(()=>!localStorage.getItem('lightly:auth')),'signed out after the account was deleted elsewhere');assert.match(await o.p.textContent('#toast'),/no longer exists/);
 assert((await o.p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).fasts.some(x=>x.id==='keep'),'fasts kept');assert(await o.p.$('[data-act=emailsheet]'),'signed-out card shown');ok('account deleted on another phone: this phone signs out, keeps its fasts, says why');}
 // the name on the Me tab: a Google first name by default, "Add your name" for email accounts, editable by anyone, saved in the backup
 {const n=await device(base([f('nm',now-30*H)]),false);await n.p.goto(url+'#access_token=tok-google@example.com&refresh_token=r&expires_in=3600&type=magiclink');await n.p.reload();await n.p.waitForTimeout(1500);
 await n.p.click('#tabs [data-tab=me]');assert.strictEqual((await n.p.textContent('#me .me-card b')).trim(),'Mina','Google first name is the default');
 await n.p.click('#me [data-act=namesheet]');await n.p.fill('#nmIn','Sam');await n.p.keyboard.press('Enter');await n.p.waitForTimeout(500);
 assert.strictEqual((await n.p.textContent('#me .me-card b')).trim(),'Sam','chosen name wins');await n.p.waitForTimeout(4500);assert.strictEqual(rows['uid-google@example.com'].data.name,'Sam','the name rides along in the backup');
 await n.p.click('#me [data-act=namesheet]');await n.p.fill('#nmIn','');await n.p.click('[data-act=namesave]');await n.p.waitForTimeout(400);assert.strictEqual((await n.p.textContent('#me .me-card b')).trim(),'Mina','clearing goes back to the Google name');
 await n.p.click('[data-act=signout]');await n.p.click('[data-act=signoutok]');await n.p.waitForTimeout(300);assert.strictEqual((await n.p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).name,null,'name leaves with the sign-in');
 const e=await device(base([f('nm2',now-30*H)]),false);await e.p.goto(url+'#access_token=tok-plain@example.com&refresh_token=r&expires_in=3600&type=magiclink');await e.p.reload();await e.p.waitForTimeout(1500);await e.p.click('#tabs [data-tab=me]');
 assert.match(await e.p.textContent('#me .me-card b.noname'),/Add your name/,'email account is asked to add a name');assert(!/@/.test(await e.p.textContent('#me .me-card')),'no email shown as a name');
 await e.p.click('#me [data-act=namesheet]');assert.match(await e.p.textContent('#sheet'),/x@y\.z/,'the email is in the edit sheet');ok('display name: Google first name, add-your-name for email, editable, saved in the backup');}
 // the public deletion page signs in and deletes the same way
 {const w=await device(null,false);await w.p.goto(url+'delete-account/?lang=en');await w.p.waitForTimeout(600);assert(await w.p.isVisible('#out'),'signed-out sign-in card');
 await w.p.goto(url+'delete-account/#access_token=tok-page@example.com&refresh_token=r&expires_in=3600&type=magiclink');await w.p.reload();await w.p.waitForTimeout(800);
 assert(await w.p.isVisible('#in'),'signed-in card');assert.match(await w.p.textContent('#who'),/x@y.z/);
 const bb=await w.p.locator('#del').boundingBox();await w.p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await w.p.mouse.down();await w.p.waitForTimeout(500);await w.p.mouse.up();assert.strictEqual(deleted.length,1,'a short press deletes nothing');
 await w.p.mouse.move(bb.x+bb.width/2,bb.y+bb.height/2);await w.p.mouse.down();await w.p.waitForTimeout(2400);await w.p.mouse.up();await w.p.waitForSelector('#done:not([hidden])',{timeout:5000});
 assert.deepStrictEqual(deleted,['uid-link@example.com','uid-page@example.com']);assert(await w.p.evaluate(()=>!localStorage.getItem('lightly:auth')));await w.p.click('.lang [data-l=zh]');assert.match(await w.p.textContent('#done'),/账号已删除/);ok('public deletion page: hold to delete, then done, EN and ZH');}
 assert.deepStrictEqual(d1.errs.concat(d2.errs,d3.errs,d4.errs,d5.errs,d6.errs),[]);console.log('cloud e2e ok');await b.close();mock.close();srv.close();})().catch(e=>{console.error(e);process.exit(1);});
function ok(n){console.log('ok -',n);}

