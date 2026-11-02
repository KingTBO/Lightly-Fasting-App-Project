/* Coming back from a sign-in link (Google or email) must never flash Today: neutral screen first, then Me (or onboarding for a brand-new account).
   NODE_PATH=$(npm root -g) node tests/signin-return.test.js   (needs Playwright; a few seconds) */
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert');
const {chromium}=require('playwright');
const root=path.join(__dirname,'..'),H=3600e3;
let userDelay=700,userDrop=false;
const jwt=(o)=>'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify(o)).toString('base64url')+'.sig';
const mock=http.createServer((q,r)=>{
  r.setHeader('Access-Control-Allow-Origin','*');r.setHeader('Access-Control-Allow-Headers','*');r.setHeader('Access-Control-Allow-Methods','*');
  if(q.method==='OPTIONS'){r.writeHead(204);return r.end();}
  let body='';q.on('data',d=>body+=d);q.on('end',()=>{const u=q.url;const out=(c,o)=>{r.writeHead(c,{'Content-Type':'application/json'});r.end(JSON.stringify(o));};
    if(u.startsWith('/auth/v1/user')){ if(userDrop){ q.socket.destroy(); return; } return setTimeout(()=>out(200,{id:'uid-1',email:'a@b.c',user_metadata:{given_name:'Mina'}}),userDelay); }
    if(u.startsWith('/auth/v1/settings')) return out(200,{external:{google:true,email:true}});
    if(u.startsWith('/rest/v1/lightly_state')) return q.method==='GET'?out(200,[]):out(201,{});
    out(404,{});});});
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'});r.end(d);}});});
const ok=m=>console.log('ok  '+m);
(async()=>{await new Promise(r=>mock.listen(0,r));await new Promise(r=>srv.listen(0,r));
 const murl='http://localhost:'+mock.address().port,url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch(); const now=Date.now();
 const seed=(on)=>JSON.stringify({v:1,lang:'en',theme:'auto',onboarded:on,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:on?now-9*24*H:null,mod:now-1000,del:[]});
 /* every frame from the first one: is Today actually on screen? (the neutral screen hides all tabs with html.signing) */
 const watch=()=>{ window.__frames=[]; (function f(){ const t=document.getElementById('today'),m=document.getElementById('me'),h=document.documentElement;
   if(t&&m) window.__frames.push({signing:h.classList.contains('signing'),today:t.classList.contains('on'),me:m.classList.contains('on'),ob:!document.getElementById('ob').hidden}); requestAnimationFrame(f); })(); };
 async function open(hash,{onboarded=true,search=''}={}){
  const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});
  await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:`window.LIGHTLY_CLOUD={url:'${murl}',key:'anon'};`}));
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(s=>{ if(!sessionStorage.s){ if(s) localStorage.setItem('lightly:v1',s); sessionStorage.s=1; } },onboarded===null?null:seed(onboarded));
  await p.addInitScript(watch);
  await p.goto(url+search+hash); await p.waitForTimeout(2200);
  const fr=await p.evaluate(()=>window.__frames); return {ctx,p,fr,errs}; }
 const todayShown=fr=>fr.filter(f=>!f.signing&&f.today&&!f.ob).length;
 const tok=(e)=>'#access_token=tok-'+e+'&refresh_token=r&expires_in=3600&token_type=bearer&type=magiclink';

 /* 1. already set up on this phone, slow answer from the server: neutral first, then Me, never Today */
 {const t=await open(tok('a@b.c')); const last=t.fr[t.fr.length-1];
  assert(t.fr[0].signing,'first frame is the neutral screen'); assert.strictEqual(todayShown(t.fr),0,'Today never shown (frames: '+t.fr.length+')');
  assert(last.me&&!last.signing&&!last.today,'ends on Me'); assert(await t.p.evaluate(()=>!!localStorage.getItem('lightly:auth')),'signed in');
  assert.match(await t.p.textContent('#toast'),/Signed in/); assert.match(await t.p.textContent('#me .me-card'),/Mina|Add your name/); assert.deepStrictEqual(t.errs,[]); await t.ctx.close(); ok('sign-in link: neutral screen, then Me, Today never shown');}

 /* 2. the network drops right after the redirect: the tokens in the link are not lost */
 {userDrop=true; const t=await open('#access_token='+jwt({sub:'uid-9',email:'drop@b.c',user_metadata:{given_name:'Lin'}})+'&refresh_token=r&expires_in=3600&type=magiclink'); userDrop=false;
  const a=await t.p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:auth')||'null')); assert(a&&a.email==='drop@b.c'&&a.uid==='uid-9','signed in from the token itself');
  assert.strictEqual(todayShown(t.fr),0); assert(t.fr[t.fr.length-1].me); await t.ctx.close(); ok('network drop during the redirect still signs in');}

 /* 3. expired link: Me with a message, no Today */
 {const t=await open('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  assert.strictEqual(todayShown(t.fr),0); assert(t.fr[t.fr.length-1].me); assert.match(await t.p.textContent('#toast'),/expired/); await t.ctx.close(); ok('expired link: Me with a message, no Today');}

 /* 4. link opened in a fresh browser (state rides in ?r=): straight to Me */
 {const src=await open('#',{onboarded:true}); const carried=await src.p.evaluate(()=>LightlyCloud.pack(JSON.parse(localStorage.getItem('lightly:v1')))); await src.ctx.close();
  const t=await open(tok('a@b.c'),{onboarded:null,search:'?r='+carried}); assert.strictEqual(todayShown(t.fr),0); assert(!t.fr.some(f=>f.ob&&!f.signing),'no onboarding flash'); assert(t.fr[t.fr.length-1].me); await t.ctx.close(); ok('fresh browser with a carried copy: straight to Me');}

 /* 5. a brand-new account: neutral screen, then onboarding, never Today */
 {const t=await open(tok('new@b.c'),{onboarded:null}); const last=t.fr[t.fr.length-1];
  assert.strictEqual(todayShown(t.fr),0,'Today never shown'); assert(last.ob&&!last.signing,'ends on onboarding'); await t.ctx.close(); ok('new account: neutral screen, then onboarding');}

 /* 6. a normal launch is unchanged: Today straight away, no neutral screen */
 {const t=await open('#'); assert(!t.fr.some(f=>f.signing),'no neutral screen'); assert(t.fr[t.fr.length-1].today,'Today'); await t.ctx.close(); ok('normal launch still opens on Today');}

 await b.close(); mock.close(); srv.close(); console.log('signin-return tests passed'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
