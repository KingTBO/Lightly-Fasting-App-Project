/* Lightly service worker: the app shell is cached so it opens offline. Network first, so updates arrive as soon as you are online. */
var V='lightly-v116', SHELL=['./','index.html','css/app.css','js/core.js','js/version.js','js/import.js','js/config.js','js/cloud.js','js/avatars.js','js/sphere.js','js/app.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png','sounds/wheel-tick.wav'];
self.addEventListener('install',function(e){ self.skipWaiting(); e.waitUntil(caches.open(V).then(function(c){ return c.addAll(SHELL); })); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){return k!==V;}).map(function(k){return caches.delete(k);})); }).then(function(){ return self.clients.claim(); })); });
/* Network first, so updates arrive as soon as you are online, but never let a slow connection hold up opening the app: after 0.8 seconds the cached copy is used (the network answer still refreshes the cache for next time). ignoreSearch so the sign-in link (index.html?r=...) opens from the cache too. */
var WAIT=800;
self.addEventListener('fetch',function(e){
  var r=e.request; if(r.method!=='GET') return; var u=new URL(r.url); if(u.origin!==location.origin) return;
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(function(hit){
    var net=fetch(r).then(function(res){ if(res&&res.ok&&!u.search){ var cp=res.clone(); caches.open(V).then(function(c){ c.put(r,cp); }); } return res; }); /* a sign-in link's ?r= copy is not kept */
    if(!hit) return net.catch(function(){ return r.mode==='navigate'?caches.match('index.html'):undefined; });
    return Promise.race([net.catch(function(){ return hit; }),new Promise(function(ok){ setTimeout(function(){ ok(hit); },WAIT); })]);
  }));
});
self.addEventListener('notificationclick',function(e){ e.notification.close(); e.waitUntil(self.clients.matchAll({type:'window'}).then(function(cs){ if(cs.length) return cs[0].focus(); return self.clients.openWindow('./'); })); });
