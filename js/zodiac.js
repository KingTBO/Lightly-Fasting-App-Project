/* The month's western star sign for the group screen (see friends-ui.js). Pure data and a few small functions, no DOM, so it can be tested in Node.
   The sign follows the usual tropical dates and the person's own local date. Every sign has its own slot layout and an engraved figure
   (img/sky/*.webp, from Sidney Hall's Urania's Mirror, 1825, public domain). */
(function(root){
'use strict';
/* from/to are [month, day], inclusive; Capricorn wraps the new year */
var SIGNS=[
  {k:'capricorn',  en:'Capricorn',  zh:'摩羯座', el:['Earth','土象'], from:[12,22], to:[1,19]},
  {k:'aquarius',   en:'Aquarius',   zh:'水瓶座', el:['Air','风象'],   from:[1,20],  to:[2,18]},
  {k:'pisces',     en:'Pisces',     zh:'双鱼座', el:['Water','水象'], from:[2,19],  to:[3,20]},
  {k:'aries',      en:'Aries',      zh:'白羊座', el:['Fire','火象'],  from:[3,21],  to:[4,19]},
  {k:'taurus',     en:'Taurus',     zh:'金牛座', el:['Earth','土象'], from:[4,20],  to:[5,20]},
  {k:'gemini',     en:'Gemini',     zh:'双子座', el:['Air','风象'],   from:[5,21],  to:[6,20]},
  {k:'cancer',     en:'Cancer',     zh:'巨蟹座', el:['Water','水象'], from:[6,21],  to:[7,22]},
  {k:'leo',        en:'Leo',        zh:'狮子座', el:['Fire','火象'],  from:[7,23],  to:[8,22]},
  {k:'virgo',      en:'Virgo',      zh:'处女座', el:['Earth','土象'], from:[8,23],  to:[9,22]},
  {k:'libra',      en:'Libra',      zh:'天秤座', el:['Air','风象'],   from:[9,23],  to:[10,22]},
  {k:'scorpio',    en:'Scorpio',    zh:'天蝎座', el:['Water','水象'], from:[10,23], to:[11,21]},
  {k:'sagittarius',en:'Sagittarius',zh:'射手座', el:['Fire','火象'],  from:[11,22], to:[12,21]}
];
var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* "2026-11-08" (or a Date) -> the sign that month-day falls in */
function signAt(day){
  var m, d;
  if(day instanceof Date){ m=day.getMonth()+1; d=day.getDate(); }
  else{ var p=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(day||'')); if(!p){ var t=new Date(); m=t.getMonth()+1; d=t.getDate(); } else{ m=+p[2]; d=+p[3]; } }
  var v=m*100+d;
  for(var i=0;i<SIGNS.length;i++){ var s=SIGNS[i], a=s.from[0]*100+s.from[1], b=s.to[0]*100+s.to[1];
    if(a<=b?(v>=a&&v<=b):(v>=a||v<=b)) return s; }
  return SIGNS[0];
}
function name(s,lang){ return lang==='zh'?s.zh:s.en; }
function range(s,lang){ var f=s.from, t=s.to;
  return lang==='zh'?f[0]+'月'+f[1]+'日 – '+t[0]+'月'+t[1]+'日':MON[f[0]-1]+' '+f[1]+' – '+MON[t[0]-1]+' '+t[1]; }
/* "Oct 23 – Nov 21 · Water" */
function caption(s,lang){ return range(s,lang)+' · '+s.el[lang==='zh'?1:0]; }

/* Ten slots along each sign's figure, in the order people join (you first). The panel is 358 x 400 px, slot centres in panel px.
   The first N slots hold people, the rest are open seats. Every sign has its own layout and engraved figure; the ring below is only a fallback. */
var LAYOUTS={
  scorpio:{art:'img/sky/scorpio.webp', slots:[[72,56],[130,92],[116,160],[172,214],[150,282],[196,338],[262,350],[306,308],[300,244],[252,206]]},
  sagittarius:{art:'img/sky/sagittarius.webp', slots:[[61,195],[111,152],[159,103],[224,90],[262,156],[298,237],[233,294],[159,310],[132,248],[185,186]]},
  capricorn:{art:'img/sky/capricorn.webp', slots:[[304,138],[249,173],[191,201],[137,238],[110,172],[54,204],[90,280],[185,283],[251,290],[304,251]]},
  aquarius:{art:'img/sky/aquarius.webp', slots:[[80,136],[140,162],[203,182],[229,114],[285,159],[256,234],[200,263],[153,299],[94,296],[54,256]]},
  pisces:{art:'img/sky/pisces.webp', slots:[[145,120],[142,186],[86,219],[71,285],[134,285],[192,264],[247,243],[304,251],[304,185],[248,156]]},
  aries:{art:'img/sky/aries.webp', slots:[[304,142],[249,174],[190,150],[136,186],[75,169],[54,235],[116,248],[180,242],[245,237],[301,270]]},
  taurus:{art:'img/sky/taurus.webp', slots:[[66,108],[123,141],[178,174],[232,136],[292,161],[304,227],[286,288],[224,302],[195,243],[158,300]]},
  gemini:{art:'img/sky/gemini.webp', slots:[[88,117],[145,160],[167,226],[226,255],[273,322],[292,255],[298,190],[254,138],[213,88],[149,94]]},
  cancer:{art:'img/sky/cancer.webp', slots:[[133,65],[168,134],[164,200],[219,236],[165,274],[107,296],[207,332],[266,284],[278,208],[244,152]]},
  leo:{art:'img/sky/leo.webp', slots:[[230,80],[227,148],[230,214],[167,228],[113,263],[58,228],[273,268],[230,317],[167,298],[59,299]]},
  virgo:{art:'img/sky/virgo.webp', slots:[[266,119],[206,146],[190,213],[127,199],[117,265],[54,258],[292,189],[287,253],[226,272],[170,299]]},
  libra:{art:'img/sky/libra.webp', slots:[[77,153],[132,117],[198,110],[256,140],[265,208],[230,274],[165,279],[112,241],[140,182],[205,181]]}
};
/* a plain ring of ten slots, starting at the top and turning clockwise, kept as a fallback for a sign without a layout */
function ring(){ var out=[], cx=179, cy=196, r=128; for(var i=0;i<10;i++){ var a=-Math.PI/2+i*Math.PI*2/10; out.push([Math.round(cx+r*Math.cos(a)),Math.round(cy+r*Math.sin(a))]); } return out; }
var RING=ring();
/* the layout for a sign; `up` lifts the pattern for the shorter panel of a group that is just you */
function layout(s,up){ var L=LAYOUTS[s.k], slots=(L?L.slots:RING).map(function(p){ return [p[0],p[1]-(up||0)]; });
  return {slots:slots, art:L?L.art:'', fig:!!L}; }
/* every slot at least this far from every other, so 44 px stars never overlap */
function minGap(slots){ var m=1e9; for(var i=0;i<slots.length;i++) for(var j=i+1;j<slots.length;j++){ var dx=slots[i][0]-slots[j][0], dy=slots[i][1]-slots[j][1]; m=Math.min(m,Math.sqrt(dx*dx+dy*dy)); } return m; }


/* ---------- Your sky (the Days tab): one sign's season with its real dates ---------- */
function pad(n){ return (n<10?'0':'')+n; }
/* "2026-11-08" -> {sign, from:'2026-10-23', to:'2026-11-21'}: the season that day falls in. Capricorn runs from one year into the next. */
function season(day){
  var p=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(day||'')); if(!p){ var t=new Date(); p=[0,t.getFullYear(),t.getMonth()+1,t.getDate()]; }
  var y=+p[1], m=+p[2], s=signAt(y+'-'+pad(m)+'-'+pad(+p[3])), fy=y, ty=y;
  if(s.from[0]>s.to[0]){ if(m>=s.from[0]) ty=y+1; else fy=y-1; }
  return {sign:s, from:fy+'-'+pad(s.from[0])+'-'+pad(s.from[1]), to:ty+'-'+pad(s.to[0])+'-'+pad(s.to[1])}; }
/* the season before (n < 0) or after (n > 0) */
function seasonStep(se,n){ var p=(n<0?se.from:se.to).split('-'), d=new Date(+p[0],+p[1]-1,+p[2]+(n<0?-1:1)); return season(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())); }
/* "Oct 23 – Nov 21, 2026": the season's dates with its year (the year it ends in) */
function seasonText(se,lang){ var y=se.to.slice(0,4); return lang==='zh'?y+'年 '+range(se.sign,lang):range(se.sign,lang)+', '+y; }
/* Where the small stars go once all ten stars of the figure are lit: up to 24 fixed places for each sign, the same every time,
   clear of the ten slots, of each other, of the panel's edge and of the caption. `up` and `h` are the lift and height of the panel (24 and 360 in Your sky). */
function extras(s,up,h){
  up=up||0; h=h||400; var slots=layout(s,up).slots, out=[], seed=97+SIGNS.indexOf(s)*131, tries=0;
  function rnd(){ seed=(seed*16807)%2147483647; return seed/2147483647; }
  while(out.length<24&&tries++<6000){ var x=Math.round(24+rnd()*310), y=Math.round(24+rnd()*(h-48)), ok=!(x<176&&y>h-66);
    for(var i=0;ok&&i<slots.length;i++) if(Math.abs(slots[i][0]-x)<34&&Math.abs(slots[i][1]-y)<34) ok=false;
    for(var j=0;ok&&j<out.length;j++) if(Math.abs(out[j][0]-x)<30&&Math.abs(out[j][1]-y)<30) ok=false;
    if(ok) out.push([x,y]); }
  return out; }

var api={SIGNS:SIGNS,LAYOUTS:LAYOUTS,signAt:signAt,name:name,range:range,caption:caption,layout:layout,minGap:minGap,season:season,seasonStep:seasonStep,seasonText:seasonText,extras:extras};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyZodiac=api;
})(typeof self!=='undefined'?self:this);
