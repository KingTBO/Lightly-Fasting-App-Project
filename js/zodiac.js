/* The month's western star sign for the group screen (see friends-ui.js). Pure data and a few small functions, no DOM, so it can be tested in Node.
   The sign follows the usual tropical dates and the person's own local date. Scorpio and Sagittarius have their own slot layouts and an engraved figure
   (img/sky/*.webp, from Sidney Hall's Urania's Mirror, 1825, public domain); the other ten use a simple ring of slots and show stars and lines only. */
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

/* Ten slots along each pattern, in the order people join (you first). The panel is 358 x 400 px, slot centres in panel px.
   The first N slots hold people, the rest are open seats. Only the two signs with a figure have their own layout. */
var LAYOUTS={
  scorpio:{art:'img/sky/scorpio.webp', slots:[[72,56],[130,92],[116,160],[172,214],[150,282],[196,338],[262,350],[306,308],[300,244],[252,206]]},
  sagittarius:{art:'img/sky/sagittarius.webp', slots:[[61,195],[111,152],[159,103],[224,90],[258,152],[298,237],[233,294],[159,310],[132,248],[185,186]]}
};
/* every other sign: a plain ring of ten slots, starting at the top and turning clockwise */
function ring(){ var out=[], cx=179, cy=196, r=128; for(var i=0;i<10;i++){ var a=-Math.PI/2+i*Math.PI*2/10; out.push([Math.round(cx+r*Math.cos(a)),Math.round(cy+r*Math.sin(a))]); } return out; }
var RING=ring();
/* the layout for a sign; `up` lifts the pattern for the shorter panel of a group that is just you */
function layout(s,up){ var L=LAYOUTS[s.k], slots=(L?L.slots:RING).map(function(p){ return [p[0],p[1]-(up||0)]; });
  return {slots:slots, art:L?L.art:'', fig:!!L}; }
/* every slot at least this far from every other, so 44 px stars never overlap */
function minGap(slots){ var m=1e9; for(var i=0;i<slots.length;i++) for(var j=i+1;j<slots.length;j++){ var dx=slots[i][0]-slots[j][0], dy=slots[i][1]-slots[j][1]; m=Math.min(m,Math.sqrt(dx*dx+dy*dy)); } return m; }

var api={SIGNS:SIGNS,LAYOUTS:LAYOUTS,signAt:signAt,name:name,range:range,caption:caption,layout:layout,minGap:minGap};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyZodiac=api;
})(typeof self!=='undefined'?self:this);
