/* Lightly profile pictures.
   DESIGNERS: the default pictures are placeholders and live in ONE place, the LIST below. To replace one, give its entry a `src`
   (a square PNG, SVG or JPEG, 256 px or larger, for example 'avatars/crescent.png'; the app crops it to a circle) and it is used
   instead of the drawing. To add, remove or rename one, edit the list: the picker, the default and the tests follow it. Keep each
   `id` stable once people can pick it, because the choice is saved by id. `unlock` is the number of finished fasts that opens it.
   No food, body or scale imagery. */
(function(root){
'use strict';
var LIST=[
  {id:'crescent',en:'Crescent moon',zh:'新月'},
  {id:'full',en:'Full moon',zh:'满月'},
  {id:'sunrise',en:'Sunrise',zh:'日出'},
  {id:'star',en:'Morning star',zh:'晨星'},
  {id:'stars',en:'Your stars',zh:'星座'},
  {id:'lantern',en:'Lantern',zh:'灯笼'},
  {id:'tea',en:'A cup of tea',zh:'一杯茶'},
  {id:'drop',en:'Water drop',zh:'一滴水'},
  {id:'eclipse',en:'Eclipse',zh:'日食',unlock:30}
];
var SIZE=256;   /* a picked photo is cropped to a square and stored at this many pixels */

/* ---------- placeholder drawings (replace with `src` in LIST) ---------- */
var uid=0;
function draw(k){
  var i='av'+(uid++);
  function bg(a,b){ return '<defs><linearGradient id="'+i+'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="'+a+'"/><stop offset="1" stop-color="'+b+'"/></linearGradient><radialGradient id="'+i+'m" cx=".35" cy=".32" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#EEE8D9"/><stop offset="1" stop-color="#C9BFA7"/></radialGradient><radialGradient id="'+i+'s" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#FFF6C2"/><stop offset=".55" stop-color="#FFD21F"/><stop offset="1" stop-color="#FFA900"/></radialGradient><radialGradient id="'+i+'g"><stop offset=".3" stop-color="#FFD60A" stop-opacity=".7"/><stop offset="1" stop-color="#FFD60A" stop-opacity="0"/></radialGradient></defs><circle r="20" fill="url(#'+i+'b)"/>'; }
  var D={
    crescent:function(){ return bg('#2C3762','#0E1430')+'<mask id="'+i+'k"><circle r="10" fill="#fff"/><circle cx="-5" cy="-3" r="9" fill="#000"/></mask><circle r="10" fill="url(#'+i+'m)" mask="url(#'+i+'k)"/><circle cx="-11" cy="9" r=".8" fill="#fff"/><circle cx="10" cy="-11" r=".6" fill="#fff" opacity=".7"/>'; },
    full:function(){ return bg('#33406E','#141B3D')+'<circle r="15" fill="#F4EFE2" opacity=".12"/><circle r="11" fill="url(#'+i+'m)"/><circle cx="-3" cy="-4" r="2.6" fill="#B9AF96" opacity=".45"/><circle cx="4" cy="3" r="3.2" fill="#B9AF96" opacity=".38"/><circle cx="-4" cy="5" r="1.6" fill="#B9AF96" opacity=".4"/>'; },
    sunrise:function(){ return bg('#8FC3E8','#F3C58E')+'<clipPath id="'+i+'c"><rect x="-20" y="-20" width="40" height="27"/></clipPath><circle cy="7" r="14" fill="url(#'+i+'g)" clip-path="url(#'+i+'c)"/><circle cy="7" r="9" fill="url(#'+i+'s)" clip-path="url(#'+i+'c)"/><rect x="-20" y="7" width="40" height="13" fill="#F0B48C"/><path d="M-20 7h40" stroke="#fff" stroke-opacity=".7" stroke-width="1"/>'; },
    star:function(){ return bg('#33406E','#F0B48C')+'<circle r="9" fill="url(#'+i+'g)"/><path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10Z" fill="#FFF8E1"/><circle cx="-11" cy="-9" r=".7" fill="#fff"/><circle cx="12" cy="-6" r=".6" fill="#fff" opacity=".8"/>'; },
    tea:function(){ return bg('#A9D8B4','#6FB383')+'<path d="M-4 -12c-2 2 2 3 0 6M1 -12c-2 2 2 3 0 6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".9"/><path d="M-10 -3h17v4a8.5 8.5 0 0 1-17 0z" fill="#fff"/><path d="M7 -1h1.5a3.5 3.5 0 0 1 0 7H6" fill="none" stroke="#fff" stroke-width="2"/><path d="M-9 -1.5h15v2.5a7.5 7.5 0 0 1-15 0z" fill="#9CCB8E" opacity=".55"/><rect x="-12" y="9.5" width="21" height="2" rx="1" fill="#fff" opacity=".85"/>'; },
    drop:function(){ return bg('#CDE6F6','#8FC3E8')+'<defs><linearGradient id="'+i+'d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7FC4FF"/><stop offset="1" stop-color="#0A60D0"/></linearGradient></defs><path d="M0 -12C4 -6 9 -1 9 4a9 9 0 0 1-18 0c0-5 5-10 9-16z" fill="url(#'+i+'d)"/><path d="M-4 1c-1 2-1 5 1 7" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>'; },
    lantern:function(){ return bg('#2C3762','#141B3D')+'<circle cy="2" r="13" fill="url(#'+i+'g)"/><path d="M0 -15v3" stroke="#E0B040" stroke-width="1.4"/><rect x="-4" y="-12" width="8" height="3" rx="1" fill="#E0B040"/><path d="M-6 -9h12l2 4v10l-2 4h-12l-2-4v-10z" fill="url(#'+i+'s)"/><path d="M-2 -9v18M2 -9v18" stroke="#C88A00" stroke-width=".8" opacity=".6"/><rect x="-5" y="9" width="10" height="2.5" rx="1" fill="#E0B040"/>'; },
    stars:function(){ var p=[[-11,-6],[-4,-11],[3,-4],[10,-9],[7,6],[-5,8]]; return bg('#0E1430','#2C3762')+'<path d="M'+p.map(function(q){return q.join(' ');}).join('L')+'" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".8"/>'+p.map(function(q,n){ return '<circle cx="'+q[0]+'" cy="'+q[1]+'" r="'+(n===2?2:1.3)+'" fill="#fff"/>'; }).join(''); },
    eclipse:function(){ return bg('#0E1430','#000')+'<circle r="14" fill="url(#'+i+'g)"/><circle r="10.5" fill="none" stroke="#FFE9A8" stroke-width="1.2"/><circle r="10" fill="#0B0F22"/><circle cx="7" cy="-7" r="1.4" fill="#FFF6C2"/>'; } };
  return '<svg viewBox="-20 -20 40 40" aria-hidden="true">'+D[k]()+'</svg>';
}
function find(id){ for(var i=0;i<LIST.length;i++) if(LIST[i].id===id) return LIST[i]; return null; }
/* the picture for one id, as HTML that fills its circle */
function html(id){ var a=find(id); if(!a) return ''; return a.src?'<img class="avi" alt="" src="'+a.src+'">':draw(id); }
function locked(a,done){ return !!(a&&a.unlock&&(done||0)<a.unlock); }

/* ---------- which picture shows ----------
   saved choice: {t:'icon',id} | {t:'google'} | {t:'photo',d:<jpeg data URL>}; none saved means the default.
   Default: a Google account's own photo, else one of the placeholder icons picked from the account id (so each account starts with one), else the plain person for someone signed out. */
function hash(s){ var h=0; for(var i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0; return h; }
function defaultIcon(uidStr){ var open=LIST.filter(function(a){ return !a.unlock; }); return open[hash(uidStr||'')%open.length].id; }
function choose(saved,au,done){
  saved=saved||{};
  if(saved.t==='photo'&&saved.d) return {t:'photo',d:saved.d};
  if(saved.t==='icon'){ var a=find(saved.id); if(a&&!locked(a,done)) return {t:'icon',id:a.id}; }
  if(saved.t==='google'&&au&&au.photo) return {t:'google'};
  if(au&&au.photo) return {t:'google'};
  if(au) return {t:'icon',id:defaultIcon(au.uid||au.email)};
  return {t:'none'};
}

/* ---------- cropping a photo (pure maths, tested in Node) ----------
   The photo covers a SIZE x SIZE square; zoom 1 is the smallest size that still covers it, and the photo can be dragged but never off the square.
   (ox, oy) is how far the photo's centre sits from the square's centre. Returns the clamped offset and where to draw the photo. */
function fit(w,h,zoom,ox,oy){
  zoom=Math.min(4,Math.max(1,zoom||1)); var s=Math.max(SIZE/w,SIZE/h)*zoom, dw=w*s, dh=h*s, mx=(dw-SIZE)/2, my=(dh-SIZE)/2;
  ox=Math.min(mx,Math.max(-mx,ox||0)); oy=Math.min(my,Math.max(-my,oy||0));
  return {zoom:zoom,scale:s,dw:dw,dh:dh,ox:ox,oy:oy,x:(SIZE-dw)/2+ox,y:(SIZE-dh)/2+oy};
}

root.LightlyAvatars={LIST:LIST,SIZE:SIZE,html:html,find:find,locked:locked,choose:choose,defaultIcon:defaultIcon,fit:fit};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LightlyAvatars;
})(typeof self!=='undefined'?self:this);
