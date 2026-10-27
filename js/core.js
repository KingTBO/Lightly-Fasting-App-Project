/* Lightly core: sun maths, plans, unlock rules, streaks and cheat days. No DOM here, so it can be tested in Node. */
(function(root){
'use strict';
var H=3600000, D=86400000;

/* ---------- places ---------- */
var CITIES={
  shanghai:{en:'Shanghai',zh:'上海',lat:31.23,lon:121.47,zone:'Asia/Shanghai'},
  beijing:{en:'Beijing',zh:'北京',lat:39.90,lon:116.40,zone:'Asia/Shanghai'},
  guangzhou:{en:'Guangzhou',zh:'广州',lat:23.13,lon:113.26,zone:'Asia/Shanghai'},
  hongkong:{en:'Hong Kong',zh:'香港',lat:22.32,lon:114.17,zone:'Asia/Hong_Kong'},
  singapore:{en:'Singapore',zh:'新加坡',lat:1.35,lon:103.82,zone:'Asia/Singapore'},
  tokyo:{en:'Tokyo',zh:'东京',lat:35.68,lon:139.69,zone:'Asia/Tokyo'},
  sydney:{en:'Sydney',zh:'悉尼',lat:-33.87,lon:151.21,zone:'Australia/Sydney'},
  london:{en:'London',zh:'伦敦',lat:51.51,lon:-0.13,zone:'Europe/London'},
  mogadishu:{en:'Mogadishu',zh:'摩加迪沙',lat:2.05,lon:45.32,zone:'Africa/Mogadishu'},
  newyork:{en:'New York',zh:'纽约',lat:40.71,lon:-74.01,zone:'America/New_York'},
  chicago:{en:'Chicago',zh:'芝加哥',lat:41.88,lon:-87.63,zone:'America/Chicago'},
  losangeles:{en:'Los Angeles',zh:'洛杉矶',lat:34.05,lon:-118.24,zone:'America/Los_Angeles'},
  vancouver:{en:'Vancouver',zh:'温哥华',lat:49.28,lon:-123.12,zone:'America/Vancouver'}
};
/* nearest preset for the device time zone, used until the person shares a location */
function guessCity(zone){
  if(!zone) return 'shanghai';
  for(var k in CITIES) if(CITIES[k].zone===zone) return k;
  var map={'Asia/Chongqing':'shanghai','Asia/Macau':'hongkong','Asia/Taipei':'hongkong','Asia/Kuala_Lumpur':'singapore','Asia/Seoul':'tokyo','Australia/Melbourne':'sydney','America/Toronto':'newyork','America/Denver':'chicago','America/Phoenix':'losangeles','Europe/Paris':'london','Europe/Berlin':'london','Europe/Dublin':'london','Africa/Nairobi':'mogadishu'};
  return map[zone]||(/^Asia\//.test(zone)?'shanghai':/^America\//.test(zone)?'newyork':/^Europe\//.test(zone)?'london':'shanghai');
}
function zoneOffset(zone,at){
  try{ var d=new Date(at||Date.now()), a=new Date(d.toLocaleString('en-US',{timeZone:zone})), u=new Date(d.toLocaleString('en-US',{timeZone:'UTC'})); return Math.round((a-u)/60000)/60; }
  catch(e){ return -new Date(at||Date.now()).getTimezoneOffset()/60; }
}
/* place = {key:'shanghai'} or {key:'here',lat,lon}. Returns {lat,lon,off} */
function placeInfo(place,at){
  if(place&&place.key==='here'&&isFinite(place.lat)) return {lat:place.lat,lon:place.lon,off:-new Date(at||Date.now()).getTimezoneOffset()/60};
  var c=CITIES[(place&&place.key)]||CITIES.shanghai;
  return {lat:c.lat,lon:c.lon,off:zoneOffset(c.zone,at)};
}
/* hours since midnight in the place's own clock */
function placeHour(pi,at){ var t=(at==null?Date.now():at)/H+pi.off; return ((t%24)+24)%24; }

/* ---------- NOAA solar equations. zenith 90.833 = sunrise/sunset, 108 = Fajr at 18 degrees below the horizon ---------- */
function solar(pi,at,zenith){
  var d=new Date((at==null?Date.now():at)+pi.off*H), y0=Date.UTC(d.getUTCFullYear(),0,0), N=Math.floor((d.getTime()-y0)/D), g=2*Math.PI/365*(N-1);
  var eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  var dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  var la=pi.lat*Math.PI/180, c=Math.cos((zenith||90.833)*Math.PI/180)/(Math.cos(la)*Math.cos(dec))-Math.tan(la)*Math.tan(dec);
  var polar=c>1?'night':c<-1?'day':null;
  var ha=Math.acos(Math.min(Math.max(c,-1),1))*180/Math.PI;
  return {rise:((720-4*(pi.lon+ha)-eq)/60+pi.off+48)%24, set:((720-4*(pi.lon-ha)-eq)/60+pi.off+48)%24, polar:polar};
}
function sunTimes(pi,at){ var s=solar(pi,at,90.833); if(s.polar==='night'){s.rise=12;s.set=12;} if(s.polar==='day'){s.rise=0;s.set=24;} return s; }
function fajrHour(pi,at){ var s=solar(pi,at,108); return s.polar?null:s.rise; }

function smooth(x){ x=Math.min(Math.max(x,0),1); return x*x*(3-2*x); }
var FADE=1/3;
function dist(a,b){ var d=a-b; if(d>12)d-=24; if(d<-12)d+=24; return d; }
/* 1 = moon, 0 = sun, with a 40 minute cross-fade centred on sunrise and sunset */
function moonAmt(hDay,sun){
  hDay=((hDay%24)+24)%24;
  var up=smooth((dist(hDay,sun.rise)+FADE)/(2*FADE)), down=smooth((dist(hDay,sun.set)+FADE)/(2*FADE));
  var day=dist(hDay,sun.rise)>=-FADE&&dist(hDay,sun.set)<=FADE;
  return day?1-up*(1-down):1;
}
var SKY=[[0,'night','Night','深夜'],[1,'first','First light','破晓'],[2,'dawn','Dawn','黎明'],[3,'morning','Morning','清晨'],[4,'day','Day','白天'],[5,'sunset','Sunset','日落'],[6,'evening','Evening','傍晚']];
function skyAt(hDay,sun){
  hDay=((hDay%24)+24)%24; var r=sun.rise, st=sun.set, k;
  if(hDay>=r-1.2&&hDay<r-.3) k=1; else if(hDay>=r-.3&&hDay<r+.9) k=2; else if(hDay>=r+.9&&hDay<r+3.5) k=3; else if(hDay>=r+3.5&&hDay<st-1.4) k=4; else if(hDay>=st-1.4&&hDay<st+.35) k=5; else if(hDay>=st+.35&&hDay<st+1.6) k=6; else k=0;
  return SKY[k];
}
/* next sunrise or sunset after hDay, within 24 hours: {k:'rise'|'set', in: hours} */
function nextTurn(hDay,sun){
  var a=((sun.rise-hDay)%24+24)%24, b=((sun.set-hDay)%24+24)%24;
  return a<b?{k:'rise',inH:a,at:sun.rise}:{k:'set',inH:b,at:sun.set};
}
/* phase of the disc: 0 new to 1 full, waning during the eating window */
function discFill(elapsedH,goalH){ return Math.min(Math.max(elapsedH/goalH,0),1); }

/* ---------- plans ---------- */
var PLANS=[
  {id:'13',name:'Sunrise',zh:'日出',fast:13,eat:11,top:true},
  {id:'16',name:'Classic',zh:'经典',fast:16,eat:8,top:true,def:true},
  {id:'18',name:'Steady',zh:'稳健',fast:18,eat:6,top:true},
  {id:'20',name:'Warrior',zh:'勇士',fast:20,eat:4,top:true},
  {id:'23',name:'One meal',zh:'一餐',fast:23,eat:1},
  {id:'24',name:'24 hours',zh:'24 小时',fast:24,eat:0,long:true},
  {id:'36',name:'36 hours',zh:'36 小时',fast:36,eat:0,long:true},
  {id:'custom',name:'Custom',zh:'自定义',fast:16,eat:8,custom:true}
];
function planById(id,custom){
  for(var i=0;i<PLANS.length;i++) if(PLANS[i].id===id){
    var p=PLANS[i]; if(p.custom){ var f=Math.min(Math.max(Math.round(custom||16),12),23); return {id:'custom',name:p.name,zh:p.zh,fast:f,eat:24-f,custom:true}; } return p; }
  return PLANS[1];
}
function planLabel(p){ return p.long?p.fast+'h':p.fast+':'+p.eat; }

/* Ramadan: opt-in, shown only in season (expected 2027-02-08 for 30 days, 2028-01-28 for 30 days) */
var RAMADAN=[[Date.UTC(2027,1,8),30],[Date.UTC(2028,0,28),30]];
function ramadanDay(at){ at=at==null?Date.now():at; for(var i=0;i<RAMADAN.length;i++){ var n=Math.floor((at-RAMADAN[i][0])/D); if(n>=0&&n<RAMADAN[i][1]) return n+1; } return 0; }

/* ---------- dates ---------- */
function pad(n){ return (n<10?'0':'')+n; }
function dayKey(ms){ var d=new Date(ms); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function keyToDate(k){ var p=k.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
function addDays(k,n){ var d=keyToDate(k); d.setDate(d.getDate()+n); return dayKey(d.getTime()); }
function mondayOf(ms){ var d=new Date(ms); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7)); return dayKey(d.getTime()); }

/* ---------- fasts ----------
   fast = {id,start,end,goalH,plan}   done = lasted at least its goal */
function hours(f){ return (f.end-f.start)/H; }
function isDone(f){ return hours(f)+1e-6>=f.goalH-0.0167; } /* one minute of grace */

/* ---------- unlock rules for long fasts (24 h, 36 h) ----------
   profile = {fastedBefore:boolean, safety:boolean}
   state   = {fasts, unwell:ms|null, unlocked:{24:ms,36:ms}}   returns {st, label, pct, until}
   st: hidden (safety flag) | locked | paused | wait | ok */
function longStatus(kind,profile,state,now){
  now=now||Date.now();
  if(profile.safety) return {st:'hidden'};
  var fasts=state.fasts.filter(function(f){return f.end;}), done=fasts.filter(isDone);
  var first=fasts.length?Math.min.apply(null,fasts.map(function(f){return f.start;})):null;
  var n16=done.filter(function(f){return f.goalH>=16&&hours(f)>=15.98;}), n18=n16.filter(function(f){return hours(f)>=17.98;});
  var l24=done.filter(function(f){return f.goalH>=24;}).sort(function(a,b){return a.end-b.end;});
  var unwellRecent=state.unwell&&now-state.unwell<14*D;
  var ok=false,label='',pct=0;
  if(kind===24){
    if(profile.fastedBefore){ ok=n16.length>=3; label=Math.min(n16.length,3)+' of 3 fasts of 16 h or more'; pct=Math.min(n16.length/3,1); }
    else{
      var weeks=first?Math.floor((now-first)/(7*D)):0;
      ok=weeks>=4&&n16.length>=12&&n18.length>=2&&!unwellRecent;
      var a=Math.min(n16.length,12),b=Math.min(n18.length,2),w=Math.min(weeks,4);
      label=a+' of 12 fasts of 16 h or more, '+b+' of 2 of 18 h or more, week '+w+' of 4';
      pct=(a/12+b/2+w/4)/3;
    }
  }else{
    var f24=l24[0];
    if(profile.fastedBefore){ ok=!!f24; label=(f24?1:0)+' of 1 fast of 24 h'; pct=f24?1:0; }
    else{ var wk=f24?Math.floor((now-f24.end)/(7*D)):0; ok=!!f24&&wk>=4; label=(f24?'24 h done, ':'First finish a 24 h fast, ')+'week '+Math.min(wk,4)+' of 4'; pct=(f24?.5:0)+Math.min(wk,4)/8; }
  }
  if(!ok) return {st:'locked',label:label,pct:pct};
  var u=state.unlocked&&state.unlocked[kind]||now;
  if(state.unwell&&now-state.unwell<14*D) return {st:'paused',until:state.unwell+14*D,unlockedAt:u};
  var longs=done.filter(function(f){return f.goalH>=24;}).concat(fasts.filter(function(f){return f.goalH>=24&&!isDone(f);}));
  var last=longs.length?Math.max.apply(null,longs.map(function(f){return f.end;})):0;
  if(last&&now-last<3*D) return {st:'wait',until:last+3*D,unlockedAt:u};
  var early=now-u<61*D, same=longs.filter(function(f){return (kind===24?f.goalH===24:f.goalH===36);});
  if(early){ var m=longs.filter(function(f){return now-f.end<30*D;}); if(m.length) return {st:'wait',until:Math.max.apply(null,m.map(function(f){return f.end;}))+30*D,unlockedAt:u,monthly:true}; }
  else if(kind===24){ var w7=same.filter(function(f){return now-f.end<7*D;}); if(w7.length) return {st:'wait',until:Math.max.apply(null,w7.map(function(f){return f.end;}))+7*D,unlockedAt:u}; }
  else{ var m36=same.filter(function(f){return now-f.end<7*D;}), c36=same.filter(function(f){return now-f.end<30*D;}); if(m36.length||c36.length>=2) return {st:'wait',until:(m36.length?Math.max.apply(null,m36.map(function(f){return f.end;}))+7*D:Math.min.apply(null,c36.map(function(f){return f.end;}))+30*D),unlockedAt:u}; }
  return {st:'ok',unlockedAt:u};
}

/* ---------- days, streaks, cheat days (弹性日) ----------
   One new cheat day each Monday once the first full week is over, bank of 2, at most 2 used in any 7 days.
   A cheat day keeps the streak but does not grow it. */
function fastDays(fasts){ var m={}; fasts.forEach(function(f){ if(!f.end) return; var k=dayKey(f.end); (m[k]=m[k]||[]).push(f); }); return m; }
function dayStatus(k,fasts,flexUsed){
  var fm=fastDays(fasts), list=fm[k]||[];
  if(list.some(isDone)) return 'done';
  if(flexUsed.indexOf(k)>=0) return 'flex';
  if(list.length) return 'early';
  return 'none';
}
function streak(fasts,flexUsed,now){
  now=now||Date.now(); var today=dayKey(now), k=today, n=0, fm=fastDays(fasts);
  function st(x){ return fm[x]&&fm[x].some(isDone)?'done':flexUsed.indexOf(x)>=0?'flex':'none'; }
  if(st(k)==='none') k=addDays(k,-1);
  var guard=0;
  while(st(k)!=='none'&&guard++<4000){ if(st(k)==='done') n++; k=addDays(k,-1); }
  return n;
}
function flexRefill(flex,startMs,now){
  now=now||Date.now(); var mon=mondayOf(now); flex.bank=flex.bank==null?1:flex.bank; flex.mon=flex.mon||mondayOf(startMs||now);
  var guard=0;
  while(flex.mon<mon&&guard++<600){ flex.mon=addDays(flex.mon,7); if(keyToDate(flex.mon).getTime()>=(startMs||now)+7*D) flex.bank=Math.min(2,flex.bank+1); }
  return flex;
}
/* can a cheat day be used for day k (today, or yesterday before noon)? returns reason code or '' */
function flexBlock(k,state,now){
  now=now||Date.now(); var today=dayKey(now), y=addDays(today,-1), hr=new Date(now).getHours();
  if(k!==today&&!(k===y&&hr<12)) return 'window';
  if(state.flex.used.indexOf(k)>=0) return 'used';
  if(dayStatus(k,state.fasts,[])==='done') return 'fasted';
  if(state.flex.bank<1) return 'bank';
  var recent=state.flex.used.filter(function(x){ var d=(keyToDate(k)-keyToDate(x))/D; return d>-7&&d<7; });
  if(recent.length>=2) return 'week';
  return '';
}

var api={H:H,D:D,CITIES:CITIES,guessCity:guessCity,zoneOffset:zoneOffset,placeInfo:placeInfo,placeHour:placeHour,solar:solar,sunTimes:sunTimes,fajrHour:fajrHour,moonAmt:moonAmt,skyAt:skyAt,nextTurn:nextTurn,discFill:discFill,
  PLANS:PLANS,planById:planById,planLabel:planLabel,ramadanDay:ramadanDay,dayKey:dayKey,keyToDate:keyToDate,addDays:addDays,mondayOf:mondayOf,hours:hours,isDone:isDone,longStatus:longStatus,
  fastDays:fastDays,dayStatus:dayStatus,streak:streak,flexRefill:flexRefill,flexBlock:flexBlock};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyCore=api;
})(typeof self!=='undefined'?self:this);
