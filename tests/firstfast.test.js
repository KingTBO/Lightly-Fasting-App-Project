/* Today's big word before a fast: "First fast" (首次断食) until the first fast is done, then "Ready" (准备好了).   NODE_PATH=$(npm root -g) node tests/firstfast.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path'),{chromium}=require('playwright');const root=path.join(__dirname,'..'),H=3600000;
const srv=http.createServer((q,r)=>{ let p=path.join(root,decodeURIComponent(q.url.split('?')[0])); if(p.endsWith('/')) p+='index.html'; fs.readFile(p,(e,d)=>{ if(e){ r.writeHead(404); r.end(); } else{ r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'}); r.end(d); } }); });
(async()=>{ await new Promise(r=>srv.listen(0,r)); const url='http://localhost:'+srv.address().port+'/'; const b=await chromium.launch(); const now=Date.now();
  const state=(lang,fasts)=>({v:1,lang,theme:'light',onboarded:true,profile:{fastedBefore:false,safety:false,care:[],careOff:null},planId:'13',customH:16,place:{key:'shanghai'},cur:null,fasts,flex:{bank:1,mon:null,used:[]},off:[],unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},startedAt:now-2*24*H,mod:now-1000,del:[]});
  async function big(lang,fasts,w){ const ctx=await b.newContext({viewport:{width:w||390,height:760},timezoneId:'Asia/Shanghai'}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(s=>{ if(!sessionStorage.s){ localStorage.setItem('lightly:v1',s); sessionStorage.s=1; } },JSON.stringify(state(lang,fasts))); await p.goto(url); await p.waitForTimeout(700);
    const t=(await p.textContent('#readBig')).trim(), box=await (await p.$('#readBig')).boundingBox(); await ctx.close(); assert.deepStrictEqual(errs,[]); return {t,box,w:w||390}; }
  const done=[{id:'a',start:now-30*H,end:now-14*H,goal:16}];
  let r=await big('en',[]); assert.strictEqual(r.t,'First fast'); assert(r.box.x>=0&&r.box.x+r.box.width<=r.w,'fits');
  r=await big('zh',[]); assert.strictEqual(r.t,'首次断食'); r=await big('en',[],320); assert.strictEqual(r.t,'First fast'); assert(r.box.x+r.box.width<=320,'fits at 320');
  r=await big('en',done); assert.strictEqual(r.t,'Ready','after the first fast it is Ready again'); r=await big('zh',done); assert.strictEqual(r.t,'准备好了');
  console.log('ok - First fast before the first fast, Ready after, English and Chinese, fits at 320'); await b.close(); srv.close(); console.log('firstfast ok'); })().catch(e=>{ console.error(e); process.exit(1); });
