/* Lightly service worker: the app shell is cached so it opens offline. Network first, so updates arrive as soon as you are online. */
var V='lightly-v52', SHELL=['./','index.html','css/app.css','js/core.js','js/version.js','js/import.js','js/config.js','js/cloud.js','js/sphere.js','js/app.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',function(e){ self.skipWaiting(); e.waitUntil(caches.open(V).then(function(c){ return c.addAll(SHELL); })); });
self.addEventListener('activate',function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){return k!==V;}).map(function(k){return caches.delete(k);})); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener('fetch',function(e){
  var r=e.request; if(r.method!=='GET') return; var u=new URL(r.url); if(u.origin!==location.origin) return;
  e.respondWith(fetch(r).then(function(res){ if(res&&res.ok){ var cp=res.clone(); caches.open(V).then(function(c){ c.put(r,cp); }); } return res; }).catch(function(){ return caches.match(r).then(function(m){ return m||(r.mode==='navigate'?caches.match('index.html'):undefined); }); }));
});
self.addEventListener('notificationclick',function(e){ e.notification.close(); e.waitUntil(self.clients.matchAll({type:'window'}).then(function(cs){ if(cs.length) return cs[0].focus(); return self.clients.openWindow('./'); })); });
