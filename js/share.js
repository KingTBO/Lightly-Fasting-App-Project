/* Lightly share pictures: one finished fast, or one month, drawn on a canvas on the phone (1080 x 1350, the 4:5 that every feed and chat shows whole).
   Nothing is uploaded: the picture only leaves the phone when the person shares or saves it.
   The caller passes plain, already translated words. A picture never carries weight, a streak, a name, a place or how a fast felt,
   and it looks the same for every length of fast: nothing here rewards a longer one. */
(function(root){
var W=1080, HT=1350;
var SANS='-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Inter","Helvetica Neue","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
var ROUND='ui-rounded,"SF Pro Rounded",'+SANS;
/* the skies of Today: top colour, bottom colour, and whether the words are white */
var SKIES={night:['#0E1430','#1A2250',1],first:['#33406E','#5A5A92',1],dawn:['#8FB4DE','#F0B48C',0],morning:['#8FC3EA','#CDE6F6',0],day:['#A9D6F2','#E1F0FA',0],sunset:['#9DB4D8','#F3B07C',0],evening:['#2C3762','#6C5A88',1]};
function setFont(c,weight,px,round){ c.font=weight+' '+px+'px '+(round?ROUND:SANS); }
/* the largest size at which the words fit the width */
function fitFont(c,text,weight,px,maxW,round){ setFont(c,weight,px,round); while(px>22&&c.measureText(text).width>maxW){ px-=2; setFont(c,weight,px,round); } return px; }
function start(canvas){ canvas.width=W; canvas.height=HT; var c=canvas.getContext('2d'); c.textBaseline='alphabetic'; c.textAlign='center'; return c; }
/* a small, fixed scatter of stars: the same picture every time */
function stars(c,alpha){ var s=7; function rnd(){ s=(s*16807)%2147483647; return s/2147483647; }
  for(var i=0;i<70;i++){ var x=rnd()*W, y=rnd()*HT*.62, r=1.2+rnd()*2.2; c.globalAlpha=alpha*(.35+rnd()*.65); c.beginPath(); c.arc(x,y,r,0,7); c.fillStyle='#fff'; c.fill(); } c.globalAlpha=1; }
/* the moon or the sun of Today, flat. The lit part starts at the top and grows counter-clockwise, as it does on Today. */
function disc(c,cx,cy,r,moon,fill,unlit,rim){
  c.save(); c.beginPath(); c.arc(cx,cy,r,0,2*Math.PI); c.fillStyle=unlit; c.fill();
  if(fill>0){ c.beginPath(); if(fill>=.999) c.arc(cx,cy,r,0,2*Math.PI); else{ c.moveTo(cx,cy); c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2-fill*2*Math.PI,true); c.closePath(); } c.clip();
    var g=c.createRadialGradient(cx-r*.24,cy-r*.32,r*.04,cx-r*.1,cy-r*.12,r*1.22);
    if(moon){ g.addColorStop(0,'#FFFFFF'); g.addColorStop(.55,'#EEE8D9'); g.addColorStop(1,'#CFC7B2'); } else{ g.addColorStop(0,'#FFF6C2'); g.addColorStop(.5,'#FFD21F'); g.addColorStop(1,'#F5A800'); }
    c.fillStyle=g; c.fillRect(cx-r,cy-r,2*r,2*r);
    if(moon){ c.fillStyle='rgba(120,110,90,.16)'; [[-.3,-.22,.17],[.26,.1,.22],[-.12,.4,.12],[.38,-.36,.09]].forEach(function(m){ c.beginPath(); c.arc(cx+m[0]*r,cy+m[1]*r,m[2]*r,0,7); c.fill(); }); } }
  c.restore(); c.beginPath(); c.arc(cx,cy,r,0,2*Math.PI); c.lineWidth=3; c.strokeStyle=rim; c.stroke(); }

/* one fast. d = {sky:'day', moon:false, fill:0..1, parts:[['16','h'],['30','m']], line:'16 h goal reached', date:'Wednesday, November 11', brand:'Lightly 轻伴'} */
function fastCard(canvas,d){
  var c=start(canvas), sk=SKIES[d.sky]||SKIES.day, white=!!sk[2], ink=white?'#FFFFFF':'#1C1C1E', ink2=white?'rgba(235,235,245,.82)':'rgba(28,28,30,.72)';
  var bg=c.createLinearGradient(0,0,0,HT); bg.addColorStop(0,sk[0]); bg.addColorStop(1,sk[1]); c.fillStyle=bg; c.fillRect(0,0,W,HT);
  if(white) stars(c,d.sky==='night'?1:.6);
  c.fillStyle=ink2; fitFont(c,d.date,'500',44,W-160); c.fillText(d.date,W/2,128);
  disc(c,W/2,520,236,!!d.moon,Math.max(0,Math.min(1,d.fill)),white?'rgba(255,255,255,.12)':'rgba(28,28,30,.09)',white?'rgba(255,255,255,.3)':'rgba(28,28,30,.22)');
  /* the hours, the way Today writes them: big numbers, small units */
  var big=176, small=84, gap=14, wide=function(){ var w=0; d.parts.forEach(function(p,i){ setFont(c,'600',big,true); w+=c.measureText(p[0]).width; setFont(c,'600',small,true); w+=c.measureText(p[1]).width+gap+(i<d.parts.length-1?30:0); }); return w; };
  while(wide()>W-140&&big>80){ big-=6; small=Math.round(big*.48); }
  var x=(W-wide())/2, y=980; c.textAlign='left';
  d.parts.forEach(function(p,i){ setFont(c,'600',big,true); c.fillStyle=ink; c.fillText(p[0],x,y); x+=c.measureText(p[0]).width+gap; setFont(c,'600',small,true); c.fillStyle=ink2; c.fillText(p[1],x,y); x+=c.measureText(p[1]).width+(i<d.parts.length-1?30:0); });
  c.textAlign='center'; c.fillStyle=ink2; fitFont(c,d.line,'500',48,W-160); c.fillText(d.line,W/2,1066);
  c.fillStyle=ink; setFont(c,'600',42); c.fillText(d.brand,W/2,1262);
  return canvas; }

/* one month. d = {title:'October 2026', big:'428', unit:'hours fasted', heads:['M',...7], offset:3, days:[{s:'done'|'early'|'flex'|'off'|'none', p:0..1}], sub:'25 fasts · 22 of 31 days', brand:'Lightly 轻伴', tint:'#FFCC00'} */
function recapCard(canvas,d){
  var c=start(canvas), ink='#1C1C1E', ink2='rgba(28,28,30,.7)', faint='rgba(28,28,30,.1)';
  c.fillStyle=d.tint||'#FFCC00'; c.fillRect(0,0,W,HT);
  c.fillStyle=ink; fitFont(c,d.title,'600',48,W-160); c.fillText(d.title,W/2,128);
  fitFont(c,d.big,'700',210,W-200,true); c.fillText(d.big,W/2,348);
  c.fillStyle=ink2; fitFont(c,d.unit,'500',46,W-160); c.fillText(d.unit,W/2,420);
  var rows=Math.ceil((d.offset+d.days.length)/7), cell=rows>5?100:110, r=cell*.36, gx=(W-cell*7)/2, gy=520;
  setFont(c,'600',30); c.fillStyle=ink2; d.heads.forEach(function(h,i){ c.fillText(h,gx+cell*(i+.5),gy-8); });
  d.days.forEach(function(day,i){ var k=d.offset+i, cx=gx+cell*(k%7+.5), cy=gy+34+cell*(Math.floor(k/7)+.5)-cell*.1;
    c.setLineDash([]);
    if(day.s==='done'){ c.beginPath(); c.arc(cx,cy,r,0,7); c.fillStyle=ink; c.fill(); }
    else if(day.s==='early'){ c.beginPath(); c.arc(cx,cy,r,0,7); c.fillStyle=faint; c.fill(); c.beginPath(); c.moveTo(cx,cy); c.arc(cx,cy,r,-Math.PI/2,-Math.PI/2-Math.max(.08,Math.min(.92,day.p||.5))*2*Math.PI,true); c.closePath(); c.fillStyle=ink; c.fill(); }
    else if(day.s==='flex'||day.s==='off'){ c.beginPath(); c.arc(cx,cy,r-2,0,7); c.lineWidth=4; c.strokeStyle='rgba(28,28,30,.5)'; c.setLineDash(day.s==='flex'?[14,10]:[3,9]); c.lineCap='round'; c.stroke(); c.setLineDash([]); }
    else{ c.beginPath(); c.arc(cx,cy,r,0,7); c.fillStyle=faint; c.fill(); } });
  c.fillStyle=ink2; fitFont(c,d.sub,'500',44,W-160); c.fillText(d.sub,W/2,1196);
  c.fillStyle=ink; setFont(c,'600',42); c.fillText(d.brand,W/2,1276);
  return canvas; }

var api={W:W,H:HT,SKIES:SKIES,fastCard:fastCard,recapCard:recapCard};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyShare=api;
})(typeof self!=='undefined'?self:this);
