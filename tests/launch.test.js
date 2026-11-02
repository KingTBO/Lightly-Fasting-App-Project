/* the app opens from the cache when the network is slow (service worker), also from the sign-in link.  NODE_PATH=$(npm root -g) node tests/launch.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path'),root=path.join(__dirname,'..');
const {chromium}=require('playwright');
let slow=0;
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';
  setTimeout(()=>fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{const t={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.wav':'audio/wav','.webmanifest':'application/manifest+json'}[path.extname(p)]||'application/octet-stream';r.writeHead(200,{'Content-Type':t});r.end(d);}}),slow);});
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
 await p.goto(url);await p.evaluate(()=>navigator.serviceWorker.ready);await p.waitForTimeout(1500);await p.reload();await p.waitForTimeout(800);
 slow=6000; // every file now takes 6 seconds from the network
 let t=Date.now();await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.LIGHTLY_VERSION&&document.getElementById('ob'),null,{timeout:5000});let ms=Date.now()-t;
 assert(ms<4000,'opens from the cache in '+ms+' ms on a slow network');console.log('ok - slow network: app shell shown in '+ms+' ms');
 t=Date.now();await p.goto(url+'?r=abc',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.LIGHTLY_VERSION&&document.getElementById('ob'),null,{timeout:5000});ms=Date.now()-t;
 assert(ms<4000,'sign-in link opens from the cache in '+ms+' ms');console.log('ok - sign-in link on a slow network: '+ms+' ms');
 slow=0;await b.close();srv.close();console.log('launch ok');})().catch(e=>{console.error(e);process.exit(1);});
