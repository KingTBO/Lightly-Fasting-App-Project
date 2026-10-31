/* Lightly: the app. State lives in localStorage; a fast is just a start time, so it survives reloads and closed tabs. */
(function(){
'use strict';
var C=window.LightlyCore, H=C.H, D=C.D, KEY='lightly:v1';
function $(i){return document.getElementById(i);}
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- state ---------- */
function tzGuess(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone; }catch(e){ return ''; } }
function fresh(){ return {v:1,lang:/^zh/i.test(navigator.language||'')?'zh':'en',theme:'auto',onboarded:false,profile:{fastedBefore:null,safety:false},
  planId:'16',customH:16,place:{key:C.guessCity(tzGuess())},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},off:[],unwell:null,unlocked:{},
  prefs:{sound:true,haptics:true,d3:true,notify:false},ramadanPreview:false,startedAt:null,mod:0,del:[]}; }
var S=fresh(), storageOk=true;
function load(){
  try{ var raw=localStorage.getItem(KEY); if(raw){ var o=JSON.parse(raw), f=fresh(); for(var k in f) if(o[k]!==undefined) S[k]=o[k];
    ['profile','flex','prefs','unlocked'].forEach(function(k){ S[k]=Object.assign({},f[k],o[k]||{}); });
    if(!Array.isArray(S.fasts)) S.fasts=[]; if(!Array.isArray(S.flex.used)) S.flex.used=[]; if(!Array.isArray(S.off)) S.off=[]; } }
  catch(e){ storageOk=false; }
}
var saveT=0;
var quiet=false;
function save(){ if(!quiet) S.mod=Date.now(); clearTimeout(saveT); saveT=setTimeout(saveNow,60); if(!quiet) cloudSoon(); }
function saveNow(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){ storageOk=false; } }
window.addEventListener('pagehide',saveNow);
load();

/* ---------- language ---------- */
function L(en,zh){ return S.lang==='zh'?zh:en; }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function loc(){ return S.lang==='zh'?'zh-CN':'en-US'; }
function clockMs(ms){ var d=new Date(ms); return clockH(d.getHours()+d.getMinutes()/60); }
function clockH(h){ h=((h%24)+24)%24; var hh=Math.floor(h), mm=Math.round((h-hh)*60); if(mm===60){mm=0;hh=(hh+1)%24;}
  var m=(mm<10?'0':'')+mm;
  if(S.lang==='zh'){ var p=hh<5?'凌晨':hh<11?'上午':hh<13?'中午':hh<18?'下午':'晚上', h12=hh%12===0?12:hh%12; return p+' '+h12+':'+m; }
  return (hh%12===0?12:hh%12)+':'+m+' '+(hh<12?'AM':'PM'); }
function dateLbl(ms,o){ return new Intl.DateTimeFormat(loc(),o||{weekday:'short',month:'short',day:'numeric'}).format(new Date(ms)); }
/* the big numerals: h:mm:ss, tabular digits that never shift the layout; only digits that changed roll in from below */
var bigEl=$('readBig'), bigStr='', bigTime=false, altEl=$('readAlt');
function hms(sec){ sec=Math.max(0,Math.floor(sec)); var h=Math.floor(sec/3600), m=Math.floor(sec%3600/60), x=sec%60; return h+':'+(m<10?'0':'')+m+':'+(x<10?'0':'')+x; }
function spoken(sec){ sec=Math.max(0,Math.floor(sec)); var h=Math.floor(sec/3600), m=Math.floor(sec%3600/60); return S.lang==='zh'?h+' 小时 '+m+' 分':h+(h===1?' hour ':' hours ')+m+(m===1?' minute':' minutes'); }
function setBigTime(sec){
  var str=hms(sec); if(bigTime&&str===bigStr) return;
  if(!bigTime||str.length!==bigStr.length){ bigEl.innerHTML=str.split('').map(function(c){ return c===':'?'<i class="co">:</i>':'<b class="dg">'+c+'</b>'; }).join(''); }
  else{ var kids=bigEl.children; for(var i=0;i<str.length;i++){ if(str[i]!==bigStr[i]){ var k=kids[i]; k.textContent=str[i]; if(!reduce&&k.animate) k.animate([{transform:'translateY(.32em)',opacity:0},{transform:'none',opacity:1}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'}); } } }
  if(!bigTime||Math.floor(sec/60)!==Math.floor((bigSec||0)/60)) bigEl.setAttribute('aria-label',spoken(sec));
  bigSec=sec; bigStr=str; bigTime=true; cache.b=null;
}
var bigSec=0;
function setBigText(t){ if(bigTime){ bigTime=false; bigStr=''; bigEl.removeAttribute('aria-label'); } put(bigEl,'b',t); }
function fmtH(hrs){ var m=Math.max(0,Math.round(hrs*60)), a=Math.floor(m/60), b=m%60; return a+'<small>'+L('h','小时')+'</small>'+(b?(b<10?'0':'')+b+'<small>'+L('m','分')+'</small>':''); }
/* hours and minutes, leaving out a zero part: "16 h", "45 m", "1 h 20 m" */
function hmTxt(m){ var a=Math.floor(m/60), b=m%60, zh=S.lang==='zh', o=[]; if(a||!b) o.push(a+(zh?' 小时':' h')); if(b) o.push(b+(zh?' 分':' m')); return o.join(' '); }
function durTxt(hrs){ return hmTxt(Math.max(0,Math.round(hrs*60))); }
/* the plan button on Today shows the fasting hours (16h), because 16:8 reads like a clock */
function chipHours(p){ return p.fast+L('h','小时'); }
function pName(p){ return S.lang==='zh'?p.zh:p.name; }

/* ---------- place and sun ---------- */
var pi, sun, sunDay='';
function refreshSun(now){ var k=C.dayKey(now)+S.place.key+(S.place.lat||''); if(k===sunDay&&pi) return; sunDay=k; pi=C.placeInfo(S.place,now); sun=C.sunTimes(pi,now); }
function placeName(){ return S.place.key==='here'?L('Your location','当前位置'):C.CITIES[S.place.key][S.lang==='zh'?'zh':'en']; }
function placeMs(hr,now){ /* today's local hour hr at the place, as a timestamp */ return now-C.placeHour(pi,now)*H+hr*H; }

/* ---------- fasts ---------- */
function plan(){ return C.planById(S.planId,S.customH); }
function streakFasts(){ return S.fasts.filter(function(f){return f.plan!=='ramadan';}); }
function lastFast(){ var b=null; S.fasts.forEach(function(f){ if(!b||f.end>b.end) b=f; }); return b; }
function eatH(f){ return f.goalH>=24?12:Math.max(24-f.goalH,1); }
function today(){ return C.dayKey(Date.now()); }
function inRamadan(){ return C.ramadanDay()>0||S.ramadanPreview; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function bestStreak(){
  var fs=streakFasts().filter(function(f){return f.end;}); if(!fs.length) return 0;
  var offK=C.offKeys(S.off), first=C.dayKey(Math.min.apply(null,fs.map(function(f){return f.end;}))), t=today(), k=first, chain=0, best=0, g=0;
  while(k<=t&&g++<5000){ var st=C.dayStatus(k,fs,S.flex.used,offK); if(st==='done'){chain++; best=Math.max(best,chain);} else if(st==='flex'||st==='off'){} else if(k!==t) chain=0; k=C.addDays(k,1); }
  return best;
}
function curStreak(){ return C.streak(streakFasts(),S.flex.used.concat(C.offKeys(S.off))); }
function checkUnlocks(){ [24,36].forEach(function(k){ var r=C.longStatus(k,S.profile,{fasts:S.fasts,unwell:S.unwell,unlocked:S.unlocked}); if((r.st==='ok'||r.st==='wait'||r.st==='paused')&&!S.unlocked[k]){ S.unlocked[k]=Date.now(); save(); } }); }
function usualTxt(){ var t=(S.prefs.usualStart||'20:00').split(':'); var d=new Date(); d.setHours(+t[0],+t[1],0,0); return clockMs(d.getTime()); }
function pst(id){ return C.planStatus(id,S.profile,{fasts:S.fasts}); }
function planOk(id){ return pst(id).st==='ok'; }
function normalisePlan(){ if(S.planId==='ramadan') return; if(planOk(S.planId)) return; var best=['20','18','16','13'].filter(planOk)[0]||'13'; S.planId=best; save(); }
function overTxt(h){ var m=Math.max(0,Math.round(h*60)); return S.lang==='zh'?'超出目标 '+hmTxt(m):hmTxt(m)+' past your goal'; }
function longSt(k){ checkUnlocks(); return C.longStatus(k,S.profile,{fasts:S.fasts,unwell:S.unwell,unlocked:S.unlocked}); }

/* ---------- sound and haptics (tiny synthesized tones; the page follows the phone's silent switch) ---------- */
var ac=null;
function actx(){ if(!S.prefs.sound) return null; try{ if(!ac){ var A=window.AudioContext||window.webkitAudioContext; if(!A) return null; ac=new A(); } if(ac.state==='suspended') ac.resume(); }catch(e){ return null; } return ac; }
function tone(f,dur,vol,type,at){ var c=actx(); if(!c) return; var t=c.currentTime+(at||0), o=c.createOscillator(), g=c.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur+.02); }
function sChime(){ tone(1318.5,1.4,.06); tone(1975.5,1.6,.04,'sine',.09); tone(2637,1.2,.02,'sine',.18); }
function buzz(p){ if(!S.prefs.haptics) return; try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }
/* one fixed vocabulary, so the same thing always feels the same:
   select = a wheel detent, light = a touch or toggle, hour = the hour turns, medium = a fast starts or a hold completes,
   success = the goal is reached (the only sound in the app is its soft chime). Nothing fires on routine saves. */
var FX={select:3,light:6,hour:8,medium:14,success:[30,60,30]};
function fx(k){ buzz(FX[k]); if(k==='success') sChime(); }

/* ---------- toast, sheet ---------- */
var toastT=0;
var toastFn=null;
function toast(msg,undo){ var t=$('toast'); toastFn=undo||null; t.textContent=msg; t.classList.toggle('has-undo',!!undo);
  if(undo){ var b=document.createElement('button'); b.type='button'; b.className='tundo'; b.dataset.act='toastundo'; b.textContent=L('Undo','撤销'); t.appendChild(b); }
  t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('on'); toastFn=null; },undo?5600:3400); }
var sheetEl=$('sheet'), scrim=$('scrim'), sheetOpen=false, sheetBack=null;
var sheetFrom=null, BEHIND=['today','days','me','tabs','dayFab'];
function setInert(v){ BEHIND.forEach(function(id){ var e=$(id); if(v) e.setAttribute('inert',''); else e.removeAttribute('inert'); }); }
/* one sheet pattern: the title row carries the dismiss (a round X, same as the concept page); a sheet keeps one primary button and no Cancel, Close or Done pill.
   Start a sheet with <!--keep--> to leave its buttons alone (confirmations that must be answered). */
var SHX='<button type="button" class="x" data-act="close" aria-label="Close"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button>';
function shChrome(html){ if(html.indexOf('<h3>')!==0) return html; var i=html.indexOf('</h3>')+5;
  return ('<div class="sh-h">'+html.slice(0,i)+SHX.replace('aria-label="Close"','aria-label="'+L('Close','关闭')+'"')+'</div>'+html.slice(i)).replace(/<button class="btn sec" data-act="close">[^<]*<\/button>/g,'').replace('<div class="btns"></div>',''); }
function openSheet(html,back,float){ if(!float) html=shChrome(html); if(!sheetOpen) sheetFrom=document.activeElement; var again=sheetOpen; sheetEl.classList.toggle('float',!!float); scrim.classList.remove('peek'); sheetEl.innerHTML='<div class="grab"></div>'+html; sheetEl.scrollTop=0; sheetEl.classList.add('open'); scrim.classList.add('on'); sheetOpen=true; sheetBack=back||null; setInert(true);
  sheetEl.setAttribute('aria-label',(sheetEl.querySelector('h3')||{}).textContent||''); sheetEl.tabIndex=-1; if(!again) sheetEl.focus({preventScroll:true}); }
function closeSheet(){ if(!sheetOpen) return; sheetEl.classList.remove('open'); scrim.classList.remove('on'); sheetOpen=false; sheetBack=null; setInert(false); var f=sheetFrom; sheetFrom=null; if(f&&document.contains(f)&&f.offsetParent!==null) try{ f.focus({preventScroll:true}); }catch(e){} }
/* drag the grabber: 1:1 with the finger, then project where the flick was going and dismiss or spring back */
(function(){ var y0=0,dy=0,vy=0,lt=0,ly=0,drag=false;
  sheetEl.addEventListener('pointerdown',function(e){ if(reduce||!e.target.closest('.grab')) return; drag=true; y0=e.clientY; ly=e.clientY; lt=performance.now(); vy=0; dy=0; sheetEl.style.transition='none'; try{ sheetEl.setPointerCapture(e.pointerId); }catch(x){} });
  sheetEl.addEventListener('pointermove',function(e){ if(!drag) return; var raw=e.clientY-y0, now=performance.now(); vy=.6*vy+.4*((e.clientY-ly)/Math.max(now-lt,1)*1000); ly=e.clientY; lt=now;
    dy=raw>=0?raw:-(Math.abs(raw)*30*.55)/(30+.55*Math.abs(raw)); /* rubber-band when pulled up */
    sheetEl.style.transform='translateY('+dy+'px)'; scrim.style.opacity=Math.max(0,1-Math.max(dy,0)/sheetEl.offsetHeight); });
  function end(){ if(!drag) return; drag=false; var h=sheetEl.offsetHeight, proj=dy+(vy/1000)*.998/(1-.998); sheetEl.style.transition=''; sheetEl.style.transform=''; scrim.style.opacity='';
    if(proj>h*.45||vy>900) closeSheet(); }
  sheetEl.addEventListener('pointerup',end); sheetEl.addEventListener('pointercancel',end); })();
scrim.addEventListener('click',closeSheet);
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&sheetOpen) closeSheet(); });
var IC_PLUS='<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>', IC_MOON='<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>';
var CHECK='<svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var CHEV='<svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 7 7l-5.5 5.5"/></svg>';

/* ---------- Today ---------- */
var ph=$('ph'), cache={}, mode='idle', el=0, tgtP=0, endHold=null, shownP=-1, moonV=1, fullS=0, boost=0, tiltX=0, tiltY=0, tgtX=0, tgtY=0, lastHour=-1, firstTick=true, nowMs=Date.now();
function put(node,key,val,html){ if(cache[key]===val) return; var had=cache[key]!=null; cache[key]=val; if(html) node.innerHTML=val; else node.textContent=val;
  if(had&&(key==='sub'||key==='k'||key==='t')){ node.classList.remove('swap'); void node.offsetWidth; node.classList.add('swap'); } }
var TIPS={night:['The long quiet stretch. Most of it passes while you sleep.','最安静的一段，大部分在睡梦中度过。'],first:['Hunger often comes in waves and passes. Water helps.','饥饿感常常一阵一阵，会过去的。喝点水会好些。'],
  early:['Last meal done. The first hours are the easy part.','最后一餐结束了，最初几个小时最轻松。'],mid:['Past halfway. Keep it light and keep sipping water.','已经过半了。保持轻松，记得喝水。'],
  late:['The last two hours. You have done the hard part.','最后两小时，最难的部分已经过去了。'],
  ram:['A quiet day. Nothing to count, nothing to prove.','平静的一天。无需计算，也无需证明什么。'],long:['A long fast: sip water, add a pinch of salt if you feel faint, and stop if you feel unwell.','长时间断食：多喝水，头晕时可加一点点盐，不舒服就停下。']};
/* the hint speaks at moments (a new stage, each hour, opening the app) and then goes quiet; idle and break notes stay, since they carry facts */
var tipEl=$('readTip'), tipUntil=0, tipTxt='', tipHr=-1;
function tip(txt,always,hr){ var t=Date.now(); if(txt!==tipTxt){ tipTxt=txt; tipUntil=t+6000; }
  if(hr!=null){ if(tipHr>=0&&hr>tipHr) tipUntil=t+6000; tipHr=hr; } else tipHr=-1;
  put(tipEl,'t',txt); tipEl.classList.toggle('quiet',!always&&t>tipUntil); }
function tipFor(el,goal,sk,moon,p){ if(p.id==='ramadan') return TIPS.ram; if(goal-el<=2) return TIPS.late; if(p.long) return TIPS.long; if(sk==='night'&&moon>=.5) return TIPS.night; if(sk==='first') return TIPS.first; return el<4?TIPS.early:TIPS.mid; }

/* the quadratic timeline track */
function tPt(t){ return {x:8+326*t,y:52-96*t*(1-t)}; }
var LUT=[]; (function(){ var acc=0, prev=tPt(0); LUT[0]=0; for(var j=1;j<=64;j++){ var q=tPt(j/64); acc+=Math.hypot(q.x-prev.x,q.y-prev.y); LUT[j]=acc; prev=q; } })();
function lenAt(t){ var f=t*64, i=Math.min(Math.floor(f),63); return LUT[i]+(LUT[i+1]-LUT[i])*(f-i); }
var ticksKey='', tickEls=[];
function buildTicks(n){ var k=n+''; if(k===ticksKey) return; ticksKey=k; var o=''; for(var i=1;i<=n;i++){ var q=tPt(i/n); o+='<circle class="tick" cx="'+q.x.toFixed(1)+'" cy="'+q.y.toFixed(1)+'" r="'+(i===n?4.5:n>24?2:2.6)+'"/>'; } $('ticks').innerHTML=o; tickEls=[].slice.call($('ticks').children); }
(function(){ $('tDone').style.strokeDasharray=lenAt(1)+' 9999'; })();

var orb=null, flat=true;
function initOrb(){ try{ orb=window.LightlySphere?window.LightlySphere($('disc')):null; }catch(e){ orb=null; } if(orb) orb.set(!!S.prefs.d3); }
function phasePath(p,r){ p=Math.min(Math.max(p,0),1); if(p<=0.001) return ''; var rx=r*Math.abs(1-2*p), s=p<0.5?0:1; return 'M0 '+(-r)+' A'+r+' '+r+' 0 0 1 0 '+r+' A'+rx.toFixed(2)+' '+r+' 0 0 '+s+' 0 '+(-r)+'Z'; }

function chrome(){ /* the colour behind the app (page background, status bar, home-indicator area) always matches the screen on top of it */
  var c=(curTab==='today'?getComputedStyle(ph).getPropertyValue('--sky'):getComputedStyle(document.documentElement).getPropertyValue('--bg')).trim()||'#0E1430';
  document.documentElement.style.backgroundColor=c; document.body.style.backgroundColor=c;
  var m=document.querySelector('meta[name=theme-color]'); if(m) m.setAttribute('content',c); }
/* iOS home-screen apps sometimes lay the page out shorter than the screen (a band shows under the tab bar). Stretch the frame to the real screen height when that happens. */
function fitScreen(){ var root=document.documentElement, st=window.navigator.standalone||(window.matchMedia&&matchMedia('(display-mode:standalone)').matches), sh=Math.max(screen.height||0,screen.width||0), ih=window.innerHeight, short=sh-ih;
  if(st&&window.innerWidth<600&&window.innerHeight>window.innerWidth&&short>2&&short<140) root.style.setProperty('--fill-h',sh+'px'); else root.style.removeProperty('--fill-h'); }
function setSky(k){ if(ph.getAttribute('data-sky')!==k){ ph.setAttribute('data-sky',k); chrome(); } }

function updateToday(){
  nowMs=Date.now(); var now=nowMs; refreshSun(now);
  var hp=C.placeHour(pi,now), sk=C.skyAt(hp,sun), p=plan(), cur=S.cur, le=lastFast();
  moonV=C.moonAmt(hp,sun);
  mode=cur?'fast':(le&&now-le.end<eatH(le)*H?'eat':'idle');
  var offA=offNow(), brk=!!offA&&!cur; if(brk) mode='idle';
  setSky(sk[1]);
  if(S.planId==='ramadan'&&!inRamadan()){ S.planId='16'; normalisePlan(); p=plan(); save(); }
  var ram=S.planId==='ramadan'&&!cur, goal=cur?cur.goalH:(mode==='eat'?le.goalH:p.fast), eatLen=le?eatH(le):0, eatEl=mode==='eat'?(now-le.end)/H:0;
  el=cur?(now-cur.start)/H:0;
  /* disc: new to full during the fast, then waning through the eating window */
  tgtP=mode==='fast'?C.discFill(el,goal):mode==='eat'?1-Math.min(eatEl/eatLen,1):0;
  /* closing moment: the disc keeps the phase you reached for a beat after you end, before the summary opens */
  if(endHold){ if(Date.now()<endHold.until) tgtP=endHold.p; else endHold=null; }
  var moonNow=moonV>=.5;
  var skyName=S.lang==='zh'?sk[3]:sk[2];
  put($('sub'),'sub',skyName+' · '+(mode==='eat'?L('Eating window','进食窗口'):moonNow?L('Moon until ','月亮，直到 ')+clockH(sun.rise):L('Sun until ','太阳，直到 ')+clockH(sun.set)));
  var bar=$('offBar'); bar.hidden=!offA; if(offA) { var dn0=Math.min(C.offDayNo(offA),offA.days); put(bar,'ob',(offA.kind==='travel'?L('Travelling · day '+dn0+' of '+offA.days,'旅行中 · 第 '+dn0+' 天，共 '+offA.days+' 天'):L('Resting · day '+dn0+' of '+offA.days,'休养中 · 第 '+dn0+' 天，共 '+offA.days+' 天'))+'<span>'+L('End break','结束休息')+'</span>',1); }
  put($('planChip'),'pc',(cur&&cur.planId==='ramadan')||ram?L('Ramadan','斋月'):chipHours(cur?C.planById(cur.planId,cur.goalH):p));
  var ramadan=cur&&cur.planId==='ramadan';
  if(brk){ var dn=Math.min(C.offDayNo(offA),offA.days);
      put($('readK'),'k',L('Day '+dn+' of '+offA.days,'第 '+dn+' 天，共 '+offA.days+' 天')); setBigText(offA.kind==='travel'?L('Break','休息'):L('Rest','静养'));
      tip(L('Your streak is safe. End the break above to start sooner.','连续记录不会断。想提前开始，请先结束上方的休息。'),1); put($('actLbl'),'a',L('Start fast','开始断食')); }
  else if(mode==='idle'){
    put($('readK'),'k',ram?L('Dawn to sunset','黎明到日落'):L(p.fast+'-hour plan',p.fast+' 小时计划')); setBigText(L('Ready','准备好了')); put(altEl,'alt','');
    tip(ram?L('The fast ends at sunset, ','斋戒在日落时结束，')+clockH(sun.set)+L('.','。'):(S.prefs.usualStart?L('Your usual start is ','你习惯的开始时间是 ')+usualTxt()+L('. ','。'):'')+L('Start now and you finish at ','现在开始，')+clockMs(now+p.fast*H)+L('.',' 结束。'),1); put($('actLbl'),'a',L('Start fast','开始断食'));
  }else if(mode==='fast'){
    if(el<goal){ var elS=Math.floor(el*3600), leftS=Math.max(0,Math.ceil((goal-el)*3600)), showEl=!!S.prefs.showElapsed; put($('readK'),'k',showEl?L('Elapsed','已断食'):L('Time left','剩余时间')); setBigTime(showEl?elS:leftS); put(altEl,'alt',showEl?L('Left ','剩余 ')+hms(leftS):L('Elapsed ','已断食 ')+hms(elS)); var tp=tipFor(el,goal,sk[1],moonV,ramadan?{id:'ramadan'}:C.planById(cur.planId,cur.goalH)); tip(tp[S.lang==='zh'?1:0],0,Math.floor(el)); }
    else{ var over=el-goal; put($('readK'),'k',ramadan?L('Sunset has come','日落了'):over<1/60?L('Goal reached','目标达成'):overTxt(over)); setBigTime(Math.floor(el*3600)); put(altEl,'alt',L('Goal ','目标 ')+Math.round(goal)+L(' h',' 小时')); tip(ramadan?L('You can break the fast. May it be easy.','可以开斋了。愿一切顺利。'):L('Extra time isn’t scored, so end whenever you like.','超出的时间不计分，想什么时候结束都可以。'));
      if(!ramadan&&over>=2&&!cur.nudged){ cur.nudged=true; save(); toast(L('You’re well past your goal. Eat when you’re ready; extra time isn’t scored.','已经超过目标很久了。准备好就可以吃东西，超出的时间不计分。')); } }
    if(!holdOn) put($('actLbl'),'a',L('Hold to end fast','按住结束断食'));
  }else{
    put($('readK'),'k',L('Eating window left','进食窗口还剩')); setBigTime(Math.max(0,Math.ceil((eatLen-eatEl)*3600))); put(altEl,'alt','');
    tip(L('Your next fast can start whenever you’re ready.','下一次断食可以在你准备好时开始。')); put($('actLbl'),'a',L('Start fast','开始断食'));
  }
  act.disabled=brk; act.setAttribute('aria-disabled',brk); $('track').style.visibility=brk?'hidden':'';
  /* timeline */
  var a0=mode==='eat'?le.end:mode==='fast'?cur.start:now, a1=mode==='eat'?le.end+eatLen*H:mode==='fast'?cur.start+goal*H:ram?placeMs(sun.set,now):now+p.fast*H;
  var n=Math.min(Math.round(mode==='eat'?eatLen:ram?13:goal),36)||1; buildTicks(n);
  var tt=mode==='fast'?Math.min(el/goal,1):mode==='eat'?Math.min(eatEl/eatLen,1):0;
  put($('endA'),'ea',mode==='fast'||mode==='eat'?clockMs(a0)+'<svg class="ic-edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>':mode==='idle'?L('Now','现在'):clockMs(a0),1);
  put($('endB'),'eb','<b>'+clockMs(a1)+'</b>',1);
  $('tDone').style.strokeDasharray=(mode==='idle'?0:lenAt(tt))+' 9999';
  var q=tPt(tt); $('marker').setAttribute('cx',q.x.toFixed(1)); $('marker').setAttribute('cy',q.y.toFixed(1)); $('marker').style.opacity=mode==='idle'?0:1;
  /* where the moon turns into the sun (or back) inside this window; Ramadan runs dawn to sunset, so it has none */
  var wl=mode==='eat'?eatLen:goal, tn=mode==='idle'||ram||ramadan?null:C.nextTurn(C.placeHour(pi,a0),sun);
  if(tn&&tn.inH<wl){ var eq=tPt(tn.inH/wl), ex=Math.min(Math.max(eq.x,34),308).toFixed(1);
    $('evtL').setAttribute('x1',eq.x.toFixed(1)); $('evtL').setAttribute('x2',eq.x.toFixed(1)); $('evtL').setAttribute('y1',(eq.y-14).toFixed(1)); $('evtL').setAttribute('y2',(eq.y-6).toFixed(1));
    $('evtT').setAttribute('x',ex); $('evtT').setAttribute('y',(eq.y-18).toFixed(1)); put($('evtT'),'ev',(tn.k==='rise'?L('Sunrise ','日出 '):L('Sunset ','日落 '))+clockH(tn.at)); $('evt').setAttribute('opacity','1'); } else $('evt').setAttribute('opacity','0');
  var done=mode==='idle'?0:Math.floor(tt*n+1e-6); tickEls.forEach(function(c,i){ c.style.fill=i<done?'var(--ink)':''; });
  /* streak card */
  var st=curStreak(); $('streakBtn').hidden=!streakFasts().length;
  put($('streakTx'),'st','<span>'+(st>0?L(st+(st===1?' day':' days')+' in a row',st+' 天连续'):L('No streak running','目前没有连续记录'))+'</span>',1);
  var dots='', t0=today(), offK=C.offKeys(S.off); for(var i=6;i>=0;i--){ var k=C.addDays(t0,-i), s=C.dayStatus(k,streakFasts(),S.flex.used,offK); dots+='<i class="dot '+(s==='done'?'done':s==='flex'||s==='off'?'flex':'')+(i===0?' today':'')+'"></i>'; }
  put($('streakDots'),'sd',dots,1);
  $('disc').setAttribute('aria-label',L('Fast progress: ','断食进度：')+Math.round(tgtP*100)+'%');
  /* hour tick + goal moment */
  if(mode==='fast'){
    var hr=Math.floor(el);
    if(lastHour>=0&&hr>lastHour&&el<goal&&!ramadan){ fx('hour'); }
    lastHour=hr;
    if(el>=goal&&!cur.reached){ cur.reached=true; save(); if(!firstTick||el-goal<.02){ fx('success'); boost=1; } }
  }else lastHour=-1;
  firstTick=false;
  fullS+=(((mode==='fast'&&el>=goal)?1:0)-fullS)*.12;
  fitDisc();
}

var holdOn=false;
/* the lit part of the disc: a wedge that fills counter-clockwise from 12 o'clock (and is taken away the same way while it wanes) */
function wedgePath(p,r,wane){ p=Math.min(Math.max(p,0),1); if(p<=.001) return ''; if(p>=.999) return 'M0 '+(-r)+' A'+r+' '+r+' 0 1 0 0 '+r+' A'+r+' '+r+' 0 1 0 0 '+(-r)+'Z';
  var f=wane?(1-p):0, t=wane?1:p, a0=f*2*Math.PI, a1=t*2*Math.PI, sx=-r*Math.sin(a0), sy=-r*Math.cos(a0), ex=-r*Math.sin(a1), ey=-r*Math.cos(a1);
  return 'M0 0 L'+sx.toFixed(2)+' '+sy.toFixed(2)+' A'+r+' '+r+' 0 '+((a1-a0)>Math.PI?1:0)+' 0 '+ex.toFixed(2)+' '+ey.toFixed(2)+'Z'; }
function drawDisc(dt){
  shownP=shownP<0||reduce?tgtP:shownP+(tgtP-shownP)*Math.min(dt*5,1);
  if(Math.abs(shownP-tgtP)<.0004) shownP=tgtP;
  tiltX+=(tgtX-tiltX)*Math.min(dt*10,1); tiltY+=(tgtY-tiltY)*Math.min(dt*10,1);
  boost=Math.max(0,boost-dt/2.5);
  var wane=mode==='eat', night=/night|first|evening/.test(ph.getAttribute('data-sky'));
  var o3=orb&&orb.ok();
  if(o3){ flatShow(false); orb.draw({p:shownP,wane:wane,moon:moonV,tx:tiltX,ty:tiltY,ox:0,oy:0,scale:1,alpha:1,night:night,glow:(1-moonV)*shownP*(.35+.65*fullS)+boost*.3,halo:moonV*Math.max(fullS,boost)}); }
  else{ flatShow(true); var lit=$('lit'); lit.setAttribute('d',wedgePath(shownP,84,wane)); lit.removeAttribute('transform'); $('litMoon').style.opacity=moonV; $('litSun').style.opacity=1-moonV; $('disc').style.transform=reduce?'':'rotateY('+tiltX.toFixed(1)+'deg) rotateX('+(-tiltY).toFixed(1)+'deg)'; }
}
function flatShow(v){ if(flat===v) return; flat=v; $('unlit').style.display=$('litMoon').parentNode.style.display=v?'':'none'; if(!v) $('disc').style.transform=''; }

/* touch the disc: it tilts toward your finger and springs back */
(function(){ var d=$('disc'), down=false;
  function pos(e){ var r=d.getBoundingClientRect(); tgtX=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2))*14; tgtY=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height-.5)*2))*-14; }
  d.addEventListener('pointerdown',function(e){ down=true; try{ d.setPointerCapture(e.pointerId); }catch(x){} pos(e); fx('light'); });
  d.addEventListener('pointermove',function(e){ if(down&&!reduce) pos(e); });
  function up(){ down=false; tgtX=tgtY=0; } d.addEventListener('pointerup',up); d.addEventListener('pointercancel',up);
})();

/* ---------- hold to end ---------- */
var act=$('act'), holdT0=0, holdRaf=0, HOLD_MS=1200, swallow=false;
function holdStep(){ if(!holdOn) return; var f=Math.min((performance.now()-holdT0)/HOLD_MS,1); act.style.setProperty('--hold',f); if(f>=1){ holdEnd(false); swallow=true; fx('medium'); endFast(); return; } holdRaf=requestAnimationFrame(holdStep); }
function holdBegin(){ if(!S.cur||holdOn) return; holdOn=true; holdT0=performance.now(); act.classList.add('holding','pressed'); put($('actLbl'),'a',L('Keep holding…','继续按住…')); fx('light'); holdRaf=requestAnimationFrame(holdStep); }
function holdEnd(cancel){ if(!holdOn) return; holdOn=false; cancelAnimationFrame(holdRaf); act.classList.remove('holding','pressed'); act.style.setProperty('--hold',0); if(cancel) cache.a=null; }
act.addEventListener('pointerdown',function(e){ if(S.cur){ e.preventDefault(); try{ act.setPointerCapture(e.pointerId); }catch(x){} holdBegin(); } else act.classList.add('pressed'); });
['pointerup','pointercancel','pointerleave'].forEach(function(n){ act.addEventListener(n,function(){ holdEnd(true); act.classList.remove('pressed'); if(S.cur) updateToday(); if(swallow) setTimeout(function(){ swallow=false; },80); }); });
act.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&S.cur){ e.preventDefault(); if(!e.repeat) holdBegin(); } });
act.addEventListener('keyup',function(e){ if((e.key==='Enter'||e.key===' ')&&S.cur){ holdEnd(true); updateToday(); } if(swallow) setTimeout(function(){ swallow=false; },80); });
act.addEventListener('click',function(){ if(swallow){ swallow=false; return; } if(!S.cur) startFlow(); });

/* a button in a sheet that must be held to confirm, the same press-and-hold as ending a fast */
var HB=null;
function hbEnd(){ if(!HB) return; var x=HB; HB=null; cancelAnimationFrame(x.raf); x.b.classList.remove('holding'); x.b.style.setProperty('--hold',0); x.lbl.textContent=x.orig; }
function hbBegin(b){ if(HB||b.disabled) return; var lbl=b.querySelector('.hl'), t0=performance.now(); HB={b:b,lbl:lbl,orig:lbl.textContent,raf:0}; b.classList.add('holding'); lbl.textContent=L('Keep holding…','继续按住…'); fx('light');
  (function step(){ if(!HB||HB.b!==b) return; var f=Math.min((performance.now()-t0)/HOLD_MS,1); b.style.setProperty('--hold',f); if(f>=1){ hbEnd(); fx('medium'); A[b.dataset.hold](b); return; } HB.raf=requestAnimationFrame(step); })(); }
document.addEventListener('pointerdown',function(e){ var b=e.target.closest&&e.target.closest('.btn[data-hold]'); if(!b||!ph.contains(b)) return; e.preventDefault(); try{ b.setPointerCapture(e.pointerId); }catch(x){} hbBegin(b); });
['pointerup','pointercancel'].forEach(function(n){ document.addEventListener(n,hbEnd); });
document.addEventListener('keydown',function(e){ var b=e.target.closest&&e.target.closest('.btn[data-hold]'); if(b&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); if(!e.repeat) hbBegin(b); } });
document.addEventListener('keyup',function(e){ if(e.key==='Enter'||e.key===' ') hbEnd(); });

/* ---------- start and end ---------- */
function startFlow(planId){
  if(offNow()){ toast(L('You’re on a break. End it first to start a fast.','你正在休息中。先结束休息才能开始断食。')); return; }
  var id=planId||S.planId, p=C.planById(id,S.customH);
  if(id==='ramadan'){ return startRamadan(); }
  if(!p.long&&!planOk(id)){ normalisePlan(); p=plan(); toast(L('That plan opens later. Starting '+C.planLabel(p)+' instead.','那个计划稍后开放，先用 '+C.planLabel(p)+'。')); }
  if(p.long){ var st=longSt(p.fast); if(st.st!=='ok'){ toast(L('That fast isn’t available yet. Open your plan to see why.','这个断食现在还不能用，打开计划看看原因。')); return; } return longSafety(p); }
  beginFast(p,Date.now());
}
function longSafety(p){
  openSheet('<h3>'+L('Before a '+p.fast+'-hour fast','开始 '+p.fast+' 小时断食之前')+'</h3><p class="lede">'+L('A short check. This takes ten seconds.','简单确认一下，只要十秒。')+'</p>'+
   '<div class="group" id="lsChecks"><button class="check" role="checkbox" aria-checked="false" data-act="lsck"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+L('I feel well today and have no fever or illness','我今天感觉良好，没有发烧或生病')+'</span></button>'+
   '<button class="check" role="checkbox" aria-checked="false" data-act="lsck"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+L('I will drink water, and add a pinch of salt or electrolytes if I feel faint','我会多喝水，头晕时加一点点盐或电解质')+'</span></button>'+
   '<button class="check" role="checkbox" aria-checked="false" data-act="lsck"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+L('I will stop if I feel dizzy, unwell, or unsafe','如果头晕、不舒服或觉得不安全，我会停下')+'</span></button></div>'+
   '<div class="btns"><button class="btn" id="lsGo" data-act="lsgo" data-p="'+p.id+'" disabled>'+L('Start '+p.fast+'-hour fast','开始 '+p.fast+' 小时断食')+'</button><button class="btn sec" data-act="close">'+L('Not now','以后再说')+'</button></div>');
}
function beginFast(p,start,extra){
  S.cur=Object.assign({start:start,goalH:p.fast,planId:p.id,reached:false},extra||{}); save(); closeSheet(); fx('medium'); lastHour=-1; shownP=-1; cache={}; updateToday(); scheduleGoal();
  toast(L('Fast started. Hold the button when you want to end it.','断食开始了。想结束时按住按钮。'));
}
function startRamadan(){
  if(offNow()){ toast(L('You’re on a break. End it first to start a fast.','你正在休息中。先结束休息才能开始断食。')); return; }
  var now=Date.now(), f=C.fajrHour(pi,now); if(f==null){ toast(L('Dawn can’t be worked out at this latitude yet.','这个纬度暂时算不出黎明时间。')); return; }
  var s=placeMs(f,now), e=placeMs(sun.set,now);
  if(now>=e){ toast(L('The fast has already ended for today. Come back before dawn.','今天的斋戒已经结束，黎明前再来。')); return; }
  beginFast({id:'ramadan',fast:(e-s)/H},Math.min(s,now));
}
function endFast(){
  var cur=S.cur; if(!cur) return; var now=Date.now(), hrs=(now-cur.start)/H, openBefore=['16','18','20','23'].filter(planOk);
  S.cur=null;
  if(hrs<1/6){ save(); cache={}; shownP=-1; updateToday(); toast(L('Under 10 minutes, so it wasn’t saved.','不到 10 分钟，没有保存。')); return; }
  var f={id:uid(),start:cur.start,end:now,goalH:cur.goalH,plan:cur.planId};
  S.fasts.push(f); save(); cancelGoal(); cache={}; updateToday(); checkUnlocks();
  var done=C.isDone(f), st=curStreak(), beat=done?(reduce?300:850):(reduce?0:700); if(!done&&beat) endHold={p:Math.min(hrs/cur.goalH,1),until:now+beat}; var news=['16','18','20','23'].filter(function(i){ return planOk(i)&&openBefore.indexOf(i)<0; }).map(function(i){ return C.planLabel(C.planById(i)); });
  var ask=!S.prefs.backupAsked&&S.fasts.filter(C.isDone).length===1&&CL&&CL.ready()&&!CL.getAuth(); if(ask){ S.prefs.backupAsked=true; save(); }
  if(done) celebrate();
  setTimeout(function(){ openSheet('<span class="k">'+(done?L('Fast saved','断食已保存'):L('Ended early','提前结束'))+'</span><span class="big">'+fmtH(hrs)+'</span><span class="of">'+(done?L('Your '+durTxt(cur.goalH)+' goal, reached','你的 '+durTxt(cur.goalH).replace(' 小时','小时')+'目标，达成了'):L('of your '+durTxt(cur.goalH)+' goal','目标是 '+durTxt(cur.goalH).replace(' 小时','小时')))+'</span>'+
    '<div class="facts"><div><b>'+(f.plan==='ramadan'?'–':st)+'</b><span>'+L('day streak','天连续')+'</span></div><div><b>'+clockMs(now)+'</b><span>'+L('ended','结束时间')+'</span></div></div>'+
    '<p class="note">'+(done?L('You reached your goal. Eat gently and drink some water.','你达成了目标。慢慢吃，先喝点水。'):L('That still counts as a fast. Listening to your body is the point, and your streak is yours to keep going.','这也算一次断食。倾听身体才是重点，你的连续记录还可以继续。'))+'</p>'+
    (news.length?'<p class="note" style="color:var(--label)"><b>'+L(news.join(' and ')+' is now open.',news.join('、')+' 现已开放。')+'</b> '+L('Choose it from the plan button on Today.','在今天页面的计划按钮里选择。')+'</p>':'')+
    (ask?'<p class="note">'+L('Want to keep these fasts if you change phones? Back them up with your email. It’s optional, and everything works without it.','想在换手机时保留这些记录吗？可以用邮箱备份。这是可选的，不备份也能正常使用。')+'</p>':'')+
    '<div class="btns"><button class="btn dark" data-act="close">'+L('Start eating window','开始进食窗口')+'</button>'+(ask?'<button class="btn sec" data-act="emailsheet">'+L('Back up my fasts','备份我的记录')+'</button>':'')+'<button class="btn sec" data-act="edit" data-id="'+f.id+'">'+L('Edit times','修改时间')+'</button></div>'); countUp(document.querySelector('#sheet .big'),hrs); },beat);
}

/* the hours on the summary count up to their value, so the number lands instead of just appearing */
function countUp(node,hrs){ if(!node||reduce) return; var t0=performance.now(); (function step(){ var k=Math.min((performance.now()-t0)/700,1); node.innerHTML=fmtH(hrs*(1-Math.pow(1-k,3))); if(k<1&&node.isConnected) requestAnimationFrame(step); })(); }

/* ---------- finish celebration: the disc blooms into light, a check draws in, soft sparks drift out. Same for every fast that reaches its goal, however long. ---------- */
function celebrate(){
  var old=$('cele'); if(old) old.remove();
  var d=$('disc').getBoundingClientRect(), p=ph.getBoundingClientRect(), cx=d.left-p.left+d.width/2, cy=d.top-p.top+d.height/2, r=d.width/2||60, NS='http://www.w3.org/2000/svg';
  var el=document.createElement('div'); el.id='cele'; el.setAttribute('aria-hidden','true');
  el.style.cssText='position:absolute;inset:0;z-index:6;pointer-events:none;overflow:hidden';
  var glow=document.createElement('div'); glow.style.cssText='position:absolute;left:'+cx+'px;top:'+cy+'px;width:'+r*2+'px;height:'+r*2+'px;margin:'+(-r)+'px 0 0 '+(-r)+'px;border-radius:50%;background:radial-gradient(circle,rgba(255,236,160,.95) 0%,rgba(255,200,70,.55) 38%,rgba(255,170,40,0) 70%);opacity:0';
  el.appendChild(glow);
  var svg=document.createElementNS(NS,'svg'); svg.setAttribute('viewBox','-30 -30 60 60'); svg.style.cssText='position:absolute;left:'+(cx-r*.42)+'px;top:'+(cy-r*.42)+'px;width:'+r*.84+'px;height:'+r*.84+'px;overflow:visible;opacity:0';
  var ck=document.createElementNS(NS,'path'); ck.setAttribute('d','M-14 1 L-4 11 L15 -11'); ck.setAttribute('fill','none'); ck.setAttribute('stroke','#1C1C1E'); ck.setAttribute('stroke-width','6'); ck.setAttribute('stroke-linecap','round'); ck.setAttribute('stroke-linejoin','round'); ck.setAttribute('pathLength','1'); ck.style.strokeDasharray='1'; ck.style.strokeDashoffset='1';
  svg.appendChild(ck); el.appendChild(svg); ph.appendChild(el);
  var spr='cubic-bezier(.2,1,.3,1)';
  if(reduce){ glow.animate([{opacity:0,transform:'scale(1)'},{opacity:.7,transform:'scale(1.3)',offset:.4},{opacity:0,transform:'scale(1.3)'}],{duration:1400,easing:'ease-in-out',fill:'forwards'});
    svg.animate([{opacity:0},{opacity:1,offset:.25},{opacity:1,offset:.75},{opacity:0}],{duration:1400,fill:'forwards'}); ck.style.strokeDashoffset='0'; setTimeout(function(){ el.remove(); },1500); return; }
  glow.animate([{opacity:0,transform:'scale(.9)'},{opacity:1,transform:'scale(1.5)',offset:.3},{opacity:0,transform:'scale(3.4)'}],{duration:1700,easing:'cubic-bezier(.22,.8,.3,1)',fill:'forwards'});
  svg.animate([{opacity:0,transform:'scale(.6)'},{opacity:1,transform:'scale(1)',offset:.22},{opacity:1,transform:'scale(1)',offset:.7},{opacity:0,transform:'scale(1.08)'}],{duration:1900,easing:spr,fill:'forwards'});
  ck.animate([{strokeDashoffset:1},{strokeDashoffset:1,offset:.1},{strokeDashoffset:0,offset:.4},{strokeDashoffset:0}],{duration:1900,easing:'ease-out',fill:'forwards'});
  /* sparks: small lights leaving the disc in a ring, each a little different, never more than a gentle shimmer */
  var n=22, cols=['#FFF2B8','#FFD45C','#FFFFFF','#FFC24A'];
  for(var i=0;i<n;i++){
    var a=(i/n)*Math.PI*2+Math.random()*.25, dist=r*(1.5+Math.random()*1.5), s=3+Math.random()*4, dot=document.createElement('i'), dl=60+Math.random()*180;
    dot.style.cssText='position:absolute;left:'+cx+'px;top:'+cy+'px;width:'+s+'px;height:'+s+'px;margin:'+(-s/2)+'px 0 0 '+(-s/2)+'px;border-radius:50%;background:'+cols[i%cols.length]+';box-shadow:0 0 '+s*2+'px '+cols[i%cols.length]+';opacity:0';
    el.appendChild(dot);
    dot.animate([{opacity:0,transform:'translate(0,0) scale(.4)'},{opacity:1,offset:.2},{opacity:0,transform:'translate('+(Math.cos(a)*dist).toFixed(0)+'px,'+(Math.sin(a)*dist-r*.3).toFixed(0)+'px) scale(1)'}],{duration:1500+Math.random()*600,delay:dl,easing:'cubic-bezier(.15,.7,.2,1)',fill:'forwards'});
  }
  setTimeout(function(){ el.remove(); },2700);
}

/* ---------- reminders (the browser can only notify while the app is alive) ---------- */
var goalT=0;
function cancelGoal(){ clearTimeout(goalT); }
function scheduleGoal(){
  cancelGoal(); if(!S.cur||!S.prefs.notify||!('Notification' in window)||Notification.permission!=='granted') return;
  var ms=S.cur.start+S.cur.goalH*H-Date.now(); if(ms<=0||ms>2147000000) return;
  var title=L('Your fast is complete','断食完成了'), body=L('You reached your goal. Eat gently.','你达成了目标。慢慢吃。');
  try{ if('showTrigger' in Notification.prototype&&window.TimestampTrigger&&navigator.serviceWorker){ navigator.serviceWorker.ready.then(function(r){ return r.showNotification(title,{body:body,icon:'icon-192.png',tag:'goal',showTrigger:new window.TimestampTrigger(Date.now()+ms)}); }); return; } }catch(e){}
  goalT=setTimeout(function(){ notifyNow(title,body); },ms);
}
function notifyNow(title,body){ try{ if(navigator.serviceWorker&&navigator.serviceWorker.ready){ navigator.serviceWorker.ready.then(function(r){ r.showNotification(title,{body:body,icon:'icon-192.png',tag:'goal'}); }); return; } }catch(e){} try{ new Notification(title,{body:body,icon:'icon-192.png'}); }catch(e){} }
function setNotify(on,done){
  if(!on){ S.prefs.notify=false; save(); cancelGoal(); return done&&done(); }
  if(!('Notification' in window)){ toast(L('This browser can’t show notifications.','这个浏览器不支持通知。')); return done&&done(); }
  Notification.requestPermission().then(function(r){ S.prefs.notify=r==='granted'; save(); if(r==='granted') scheduleGoal(); else toast(L('Notifications are off in your browser settings.','通知在浏览器设置里是关闭的。')); done&&done(); }).catch(function(){ done&&done(); });
}

/* ---------- tabs ---------- */
var curTab='today';
function showTab(t){
  var prev=curTab, order=['today','days','me']; curTab=t; if(t==='today') tipUntil=Date.now()+6000; closeSheet(); ph.classList.remove('tabs-off');
  /* Today has the sky behind it and the other tabs a plain background: the colours must swap instantly, not fade in over a second */
  if((prev==='today')!==(t==='today')){ ph.classList.add('snap'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ ph.classList.remove('snap'); }); }); }
  order.forEach(function(k){ $(k).classList.remove('leaving'); });
  order.forEach(function(k){ var e=$(k), was=e.classList.contains('on'); e.classList.toggle('on',k===t); if(!reduce&&prev!==t&&e.animate){ if(k===t){ e.getAnimations().forEach(function(a){ a.cancel(); }); e.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'}); } else if(was){ e.classList.add('leaving'); var an=e.animate([{opacity:1},{opacity:0}],{duration:160,easing:'ease-out'}); an.onfinish=function(){ e.classList.remove('leaving'); }; } } });
  ph.style.setProperty('--ti',order.indexOf(t));
  document.querySelectorAll('#tabs button').forEach(function(b){ b.classList.toggle('sel',b.dataset.tab===t); b.setAttribute('aria-current',b.dataset.tab===t?'page':'false'); });
  ph.classList.toggle('sys',t!=='today');
  if(t==='days'){ ringPlay=true; fabOn=false; selDay=null; } if(t==='days') renderDays(); if(t==='me') renderMe(); fabSync(); if(t==='today') updateToday();
  chrome();
  $(t).scrollTop=0;
}
function tabLabels(){ $('tabT').textContent=L('Today','今天'); $('tabD').textContent=L('Days','日子'); $('tabM').textContent=L('Me','我的'); }

/* ---------- Days ---------- */
/* ---------- time off ---------- */
var offDays=3;
function offNow(){ return C.offActive(S.off); }
function offIco(k){ return k==='travel'?'<svg viewBox="-3 -3 30 30" width="32" height="32" aria-hidden="true"><g transform="rotate(45 12 12)"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="translate(1 -0.5)"/></g></svg>':'<svg viewBox="2 3.4 20 19.2" width="34" height="33" aria-hidden="true"><path fill="currentColor" d="M12 20.3s-7.6-4.6-7.6-10.3A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.6 10c0 5.7-7.6 10.3-7.6 10.3Z"/></svg>'; }
function offBackLbl(o){ var e=C.keyToDate(C.addDays(C.dayKey(o.start),o.days)).getTime(); return dateLbl(e); }
function timeOffSheet(){
  var o=offNow();
  if(o){
    var n=Math.min(C.offDayNo(o),o.days), dots=''; for(var i=1;i<=o.days;i++) dots+='<i class="od'+(i<n?' past':i===n?' now':'')+'"></i>';
    return openSheet('<h3>'+(o.kind==='travel'?L('Travelling','旅行中'):L('Taking a rest','好好休息'))+'</h3><p class="lede">'+(o.kind==='travel'?L('Your streak is waiting. Nothing to do until you are back.','连续记录在等你。回来之前什么都不用做。'):L('Rest well. Your streak is on hold and long fasts stay paused.','好好休息。连续记录暂停，长时间断食也保持暂停。'))+'</p>'+
     '<div class="group"><div class="offcard"><b>'+L('Day '+n+' of '+o.days,'第 '+n+' 天，共 '+o.days+' 天')+'</b><div class="ods" aria-hidden="true">'+dots+'</div><small>'+L('Back to fasting on ','恢复断食：')+offBackLbl(o)+'</small></div></div>'+
     '<div class="btns"><button class="btn" data-act="offend">'+L('I’m back, end the break','我回来了，结束休息')+'</button><button class="btn sec" data-act="close">'+L('Keep resting','继续休息')+'</button></div>');
  }
  openSheet('<h3>'+L('Time off','休息一下')+'</h3><p class="lede">'+L('Life comes first. Choose a break and your streak waits for you.','生活优先。选择休息，连续记录会等着你。')+'</p>'+
   '<div class="offopts"><button class="offopt" data-act="offtravel"><span class="oi">'+offIco('travel')+'</span><span class="stack"><b>'+L('Travel','旅行')+'</b><small>'+L('Away from your routine. You choose how many days, up to 14.','暂时离开日常节奏。选择天数，最多 14 天。')+'</small></span>'+CHEV+'</button>'+
   '<button class="offopt" data-act="offunwell"><span class="oi">'+offIco('unwell')+'</span><span class="stack"><b>'+L('I feel unwell','我感觉不舒服')+'</b><small>'+L('A two-week break starts right away. End it whenever you are ready.','立即开始两周休息，准备好了随时结束。')+'</small></span>'+CHEV+'</button></div>');
}
function offTravelSheet(){
  var d=offDays, end=C.keyToDate(C.addDays(today(),d)).getTime(), chips='';
  var OFF_PICKS=[3,7,10,14], pi0=OFF_PICKS.indexOf(d); OFF_PICKS.forEach(function(n){ chips+='<button type="button" data-act="offset" data-n="'+n+'" aria-pressed="'+(d===n)+'">'+n+'</button>'; });
  openSheet('<h3>'+L('Travel','旅行')+'</h3><p class="lede">'+L('How long will you be away? Your streak keeps, and you can end the break early.','你要离开多久？连续记录会保留，也可以提前结束。')+'</p>'+
   '<div class="group"><div class="stepper"><button type="button" data-act="offdays" id="offMinus" data-d="-1" aria-label="'+L('One day less','少一天')+'"'+(d<=1?' disabled':'')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg></button><div class="sv" role="status" aria-live="polite"><b id="offN">'+d+'</b><span id="offUnit">'+L(d===1?'day':'days','天')+'</span></div><button type="button" data-act="offdays" id="offPlus" data-d="1" aria-label="'+L('One day more','多一天')+'"'+(d>=C.OFF_MAX?' disabled':'')+'><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12M12 6v12"/></svg></button></div>'+
   '<div class="offchips seg" id="offChips" role="group" aria-label="'+L('Quick pick','快速选择')+'"><i class="thumb" style="--i:'+Math.max(pi0,0)+';opacity:'+(pi0<0?0:1)+'"></i>'+chips+'</div>'+
   '<div class="row"><span>'+L('Back to fasting','恢复断食')+'</span><span class="v" id="offDate">'+dateLbl(end)+'</span></div></div>'+
   '<div class="btns"><button class="btn" data-act="offgo" data-k="travel">'+L('Start travel break','开始旅行休息')+'</button><button class="btn sec" data-act="offback">'+L('Back','返回')+'</button></div>',timeOffSheet);
}
function offTravelSync(){
  var d=offDays, picks=[3,7,10,14], i=picks.indexOf(d), th=document.querySelector('#offChips .thumb');
  if(!$('offN')) return offTravelSheet();
  $('offN').textContent=d; $('offUnit').textContent=L(d===1?'day':'days','天');
  $('offDate').textContent=dateLbl(C.keyToDate(C.addDays(today(),d)).getTime());
  $('offMinus').disabled=d<=1; $('offPlus').disabled=d>=C.OFF_MAX;
  if(th){ if(i>=0) th.style.setProperty('--i',i); th.style.opacity=i<0?0:1; }
  picks.forEach(function(n,k){ var b=document.querySelectorAll('#offChips button')[k]; if(b) b.setAttribute('aria-pressed',n===d); });
}
function offUnwellSheet(){
  var end=C.keyToDate(C.addDays(today(),14)).getTime();
  openSheet('<h3>'+L('I feel unwell','我感觉不舒服')+'</h3><p class="lede">'+L('Thank you for listening to your body. If you are fasting now, it is fine to stop and eat. If this feels serious, please see a doctor.','谢谢你倾听身体的声音。如果你正在断食，停下来吃点东西没有问题。如果情况严重，请就医。')+'</p>'+
   '<div class="group"><div class="row"><span>'+L('Break length','休息时长')+'</span><span class="v">'+L('2 weeks','两周')+'</span></div><div class="row"><span>'+L('Back to fasting','恢复断食')+'</span><span class="v">'+dateLbl(end)+'</span></div></div>'+
   '<p class="note">'+L('Your streak is kept. Long fasts stay paused. You can end the break early from Me, Time off.','连续记录会保留，长时间断食保持暂停。你可以在“我的 · 休息一下”里提前结束。')+'</p>'+
   '<div class="btns"><button class="btn" data-act="offgo" data-k="unwell">'+L('Start 2-week break','开始两周休息')+'</button><button class="btn sec" data-act="offback">'+L('Back','返回')+'</button></div>',timeOffSheet);
}
function startOff(kind,days){
  if(offNow()) return;
  S.off.push({id:uid(),kind:kind,start:Date.now(),days:Math.max(1,Math.min(C.OFF_MAX,days))});
  if(kind==='unwell'){ S.unwell=Date.now(); if(S.planId==='24'||S.planId==='36') S.planId=S.profile.safety||!S.profile.fastedBefore?'13':'16'; }
  save(); closeSheet(); cache={}; updateToday(); if(curTab==='days') renderDays(); if(curTab==='me') renderMe();
  toast(kind==='travel'?L('Safe travels. Your streak will wait.','旅途平安，连续记录会等你。'):L('Take care. Your streak is on hold for two weeks.','多保重。连续记录暂停两周。'));
}
function endOff(){
  var o=offNow(); if(!o) return;
  o.endedAt=Date.now(); save(); closeSheet(); cache={}; updateToday(); if(curTab==='days') renderDays(); if(curTab==='me') renderMe();
  toast(L('Welcome back. Your streak is where you left it.','欢迎回来。连续记录还在原来的位置。'));
}

var calY, calM, selDay, fabOn=false;
/* the round edit button on Days: slides in from the right once a date is tapped; pencil edits that day's fast, plus adds one */
function fabSync(){ var f=$('dayFab'); if(!f) return; var on=curTab==='days'&&fabOn&&!!selDay&&selDay<=today(), has=!!selDay&&!!(C.fastDays(S.fasts)[selDay]||[]).length;
  f.classList.toggle('on',on); f.setAttribute('aria-hidden',!on); f.tabIndex=on?0:-1; f.dataset.mode=has?'edit':'add';
  f.setAttribute('aria-label',has?L('Edit this day’s fast','编辑这天的断食'):L('Add a fast for this day','为这天补记断食')); }
function initCal(){ var d=new Date(); calY=d.getFullYear(); calM=d.getMonth(); selDay=null; }
/* the Days header: one ring toward the next streak milestone, then the two numbers that matter */
var MILES=[3,7,14,30,60,100,200,365];
function dayWord(n){ return L(n===1?'day':'days','天'); }
var ringPlay=true;
/* one quiet line instead of a row of stat tiles: this month's fasts, then the longest streak */
function statLine(best){ var d=new Date(), m0=new Date(d.getFullYear(),d.getMonth(),1).getTime(), n=S.fasts.filter(function(f){ return C.isDone(f)&&f.end>=m0; }).length;
  var a=n?L(n+(n===1?' fast':' fasts')+' this month','本月 '+n+' 次断食'):L('No fasts yet this month','本月还没有断食');
  return a+(best>0?' · '+L('longest streak '+best+' '+dayWord(best),'最长连续 '+best+' 天'):''); }
function milestoneHtml(st,best,total){
  var next=0, prev=0; MILES.forEach(function(m){ if(m<=st) prev=m; });
  for(var i=0;i<MILES.length;i++) if(MILES[i]>st){ next=MILES[i]; break; }
  var R=52, CIR=2*Math.PI*R, frac=next?(st-prev)/(next-prev):1, off=CIR*(1-Math.max(0,Math.min(1,frac)));
  var record=st>=3&&st>=best, left=next-st;
  var line=next?(L(left+' '+dayWord(left)+' to your '+next+'-day streak','还差 '+left+' 天，达成 '+next+' 天连续')):L('Every streak milestone reached','所有连续记录里程碑都已达成');
  var sub=st?(next?L('Keep going. One fast a day.','继续保持，每天一次断食。'):L('That is a full year.','整整一年了。')):L('Finish a fast to start your streak.','完成一次断食，开启你的连续记录。');
  var chips=MILES.slice(0,6).map(function(m){ return '<span class="mchip'+(m<=best?' on':'')+'"'+(m<=best?'':' aria-hidden="true"')+'>'+m+'</span>'; }).join('');
  return '<div class="group mile"><div class="mhero"><div class="ring" role="img" aria-label="'+L('Current streak: '+st+' '+dayWord(st),'当前连续 '+st+' 天')+'"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="rt" cx="60" cy="60" r="'+R+'"/><circle class="rp'+(ringPlay?' play':'')+'" cx="60" cy="60" r="'+R+'" style="--cir:'+CIR.toFixed(1)+';--off:'+off.toFixed(1)+'" stroke-dasharray="'+CIR.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/></svg><div class="rn"><b>'+st+'</b><span>'+L('day streak','天连续')+'</span></div></div>'+
    '<div class="mtx"><b>'+line+'</b><small>'+sub+'</small>'+(record?'<span class="rec"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8L3.5 9.7l5.9-.9z"/></svg>'+L('Your longest streak','你的最长连续')+'</span>':'')+'</div></div>'+
    '<p class="mline">'+statLine(best)+'</p>'+
    '<div class="mchips" aria-label="'+L('Streak milestones reached','已达成的连续里程碑')+'">'+chips+'</div></div>';
}
/* the month and year picker: a floating card, only offered once there is more than one month to move between */
var pickY=0;
function monthRange(){ var all=S.fasts, first=all.length?new Date(Math.min.apply(null,all.map(function(f){return f.start;}))):new Date(), n=new Date(); return [first.getFullYear()*12+first.getMonth(), n.getFullYear()*12+n.getMonth()]; }
function pickHtml(){
  var r=monthRange(), y0=Math.floor(r[0]/12), y1=Math.floor(r[1]/12), mf=new Intl.DateTimeFormat(loc(),{month:S.lang==='zh'?'long':'short'});
  var have={}; S.fasts.forEach(function(f){ var d=new Date(f.start); have[d.getFullYear()*12+d.getMonth()]=1; });
  var h='<h3>'+L('Go to a month','跳到某个月')+'</h3>';
  if(y1>y0){ h+='<div class="pyears" role="tablist">'; for(var y=y1;y>=y0;y--) h+='<button role="tab" aria-selected="'+(y===pickY)+'" class="pyr'+(y===pickY?' on':'')+'" data-act="pickyear" data-y="'+y+'">'+y+'</button>'; h+='</div>'; }
  else h+='<p class="lede">'+pickY+'</p>';
  h+='<div class="pmonths">'; for(var m=0;m<12;m++){ var idx=pickY*12+m, ok=idx>=r[0]&&idx<=r[1], on=pickY===calY&&m===calM;
    h+='<button class="pm'+(on?' on':'')+'" data-act="pickmonth" data-y="'+pickY+'" data-m="'+m+'"'+(ok?'':' disabled')+(on?' aria-current="true"':'')+'>'+mf.format(new Date(pickY,m,1))+(have[idx]?'<i aria-hidden="true"></i>':'')+'</button>'; }
  h+='</div><div class="btns"><button class="btn sec" data-act="pickthis">'+L('This month','本月')+'</button><button class="btn" data-act="close">'+L('Done','完成')+'</button></div>';
  return h;
}
var slideEnd=null;
/* month change: the new grid slides in beside the old one as a pager, and the card eases to the new height */
function calGo(y,m,dir,x0){ if(slideEnd) slideEnd(); calY=y; calM=m;
  var D=$('days'), v=D.querySelector('.cal-v'), og=v&&v.querySelector('.cal-g'), mn=D.querySelector('.cal-h .mn'), r=monthRange(), cur=y*12+m;
  if(mn) mn.textContent=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(y,m,1));
  var pv=D.querySelector('[data-act=calprev]'), nx=D.querySelector('[data-act=calnext]'); if(pv) pv.disabled=cur<=r[0]; if(nx) nx.disabled=cur>=r[1];
  if(!v||!og){ renderDays(); return; }
  var ng=og.cloneNode(false); ng.innerHTML=gridInner(y,m); ng.classList.add('in'); v.appendChild(ng);
  if(reduce||!dir||!ng.animate){ og.remove(); ng.classList.remove('in'); og.style.cssText=''; return; }
  var w=v.offsetWidth, h0=v.offsetHeight, h1=ng.offsetHeight, o={duration:520,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}; x0=x0||0;
  v.style.height=h0+'px'; og.style.transition='none'; og.style.transform=''; og.style.opacity='';
  var a1=og.animate([{transform:'translateX('+x0+'px)',opacity:Math.max(.5,1-Math.abs(x0)/260)},{transform:'translateX('+(-dir*w*.5)+'px)',opacity:0}],o);
  var a2=ng.animate([{transform:'translateX('+(dir*w*.5+x0)+'px)',opacity:0},{transform:'none',opacity:1}],o);
  var a3=v.animate([{height:h0+'px'},{height:h1+'px'}],o), done=false;
  slideEnd=function(){ if(done) return; done=true; slideEnd=null; [a1,a2,a3].forEach(function(a){ try{ a.cancel(); }catch(e){} }); og.remove(); ng.classList.remove('in'); v.style.height=''; };
  a2.finished.then(function(){ if(slideEnd) slideEnd(); }).catch(function(){}); }
/* swipe the month grid: right goes back in time, left goes forward; follows the finger, springs back at the ends */
(function(){ var x0=0,y0=0,dx=0,lt=0,lx=0,vx=0,on=false,live=false,g=null,gone=0;
  var days=$('days');
  days.addEventListener('pointerdown',function(e){ var el=e.target.closest&&e.target.closest('.cal-g'); if(!el||el.classList.contains('in')||(e.pointerType==='mouse'&&e.button)) return; if(slideEnd) slideEnd(); g=el; x0=lx=e.clientX; y0=e.clientY; dx=0; vx=0; lt=performance.now(); on=true; live=false; });
  days.addEventListener('pointermove',function(e){ if(!on) return; var mx=e.clientX-x0, my=e.clientY-y0;
    if(!live){ if(Math.abs(mx)<10||Math.abs(mx)<Math.abs(my)*1.2){ if(Math.abs(my)>10) on=false; return; } live=true; try{ g.setPointerCapture(e.pointerId); }catch(x){} g.style.transition='none'; }
    var now=performance.now(); vx=.6*vx+.4*((e.clientX-lx)/Math.max(now-lt,1)); lx=e.clientX; lt=now;
    var r=monthRange(), cur=calY*12+calM, blocked=(mx>0&&cur<=r[0])||(mx<0&&cur>=r[1]); dx=blocked?mx*.25:mx; g.style.transform='translateX('+dx.toFixed(1)+'px)'; g.style.opacity=(1-Math.min(Math.abs(dx)/260,.5)).toFixed(2); });
  function end(){ if(!on) return; on=false; if(!live) return; gone=performance.now(); var r=monthRange(), cur=calY*12+calM, dir=dx>0?-1:1, tgt=cur+dir, go=(Math.abs(dx)>60||Math.abs(vx)>.45)&&tgt>=r[0]&&tgt<=r[1];
    g.style.transition=''; g.style.transform=''; g.style.opacity='';
    if(go) calGo(Math.floor(tgt/12),((tgt%12)+12)%12,dir<0?-1:1,dx);
    else if(!reduce&&g.animate) g.animate([{transform:'translateX('+dx.toFixed(1)+'px)',opacity:Math.max(.5,1-Math.abs(dx)/260)},{transform:'none',opacity:1}],{duration:520,easing:'cubic-bezier(.22,1,.36,1)'});
    live=false; }
  days.addEventListener('pointerup',end); days.addEventListener('pointercancel',end);
  days.addEventListener('click',function(e){ if(performance.now()-gone<350){ e.stopPropagation(); e.preventDefault(); gone=0; } },true);
})();
function gridInner(y,m){ var h='', t=today(), all=S.fasts;
  var wd=S.lang==='zh'?['一','二','三','四','五','六','日']:['M','T','W','T','F','S','S']; wd.forEach(function(w){ h+='<span class="wd">'+w+'</span>'; });
  var lead=(new Date(y,m,1).getDay()+6)%7, dim=new Date(y,m+1,0).getDate(); for(var i=0;i<lead;i++) h+='<button class="out" tabindex="-1" aria-hidden="true"></button>';
  var offK=C.offKeys(S.off); for(var d=1;d<=dim;d++){ var k=y+'-'+('0'+(m+1)).slice(-2)+'-'+('0'+d).slice(-2), s=C.dayStatus(k,all,S.flex.used,offK), fut=k>t;
    h+='<button class="'+s+(k===t?' today':'')+(k===selDay?' sel':'')+(fut?' fut':'')+'" data-act="day" data-k="'+k+'" aria-label="'+dateLbl(C.keyToDate(k).getTime())+(s==='done'?', '+L('fast done','已完成'):s==='flex'?', '+L('cheat day','弹性日'):s==='off'?', '+L('time off','休息'):s==='early'?', '+L('ended early','提前结束'):'')+'"><span class="d">'+d+'</span></button>'; }
  return h; }
function renderDays(){
  var fs=streakFasts(), all=S.fasts, t=today(), first=all.length?new Date(Math.min.apply(null,all.map(function(f){return f.start;}))):new Date();
  var canPrev=calY*12+calM>first.getFullYear()*12+first.getMonth()-0, canNext=calY*12+calM<new Date().getFullYear()*12+new Date().getMonth();
  var total=all.filter(C.isDone).length, st=curStreak(), best=bestStreak();
  var first1=!all.length, h=first1?'<div class="group firstuse"><p>'+L('Fasts you finish show up here as filled days.','完成的断食会在这里显示为实心的日子。')+'</p><button class="btn sec" data-act="gotoday">'+L('Start a fast','开始断食')+'</button></div>':milestoneHtml(st,best,total);
  var mname=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(calY,calM,1));
  h+='<div class="group'+(first1?' dim':'')+'"><div class="cal"><div class="cal-h"><button data-act="calprev" aria-label="'+L('Previous month','上个月')+'"'+(canPrev?'':' disabled')+'><svg viewBox="0 0 10 18"><path d="M8.5 1.5 1.5 9l7 7.5"/></svg></button>'+(monthRange()[0]<monthRange()[1]?'<button class="cal-t" data-act="calpick" aria-haspopup="dialog"><span class="mn">'+mname+'</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5"/></svg></button>':'<b class="cal-t0"><span class="mn">'+mname+'</span></b>')+'<button data-act="calnext" aria-label="'+L('Next month','下个月')+'"'+(canNext?'':' disabled')+'><svg viewBox="0 0 10 18"><path d="M1.5 1.5 8.5 9l-7 7.5"/></svg></button></div>';
  h+='<div class="cal-v"><div class="cal-g">'+gridInner(calY,calM);
  h+='</div></div></div>'+(first1?'':'<div class="legend"><span><i style="background:var(--tint)"></i>'+L('Goal reached','达成目标')+'</span><span><i style="border-color:var(--orange)"></i>'+L('Ended early','提前结束')+'</span><span><i style="border:1.5px dashed var(--label-2)"></i>'+L('Cheat day','弹性日')+'</span><span><i style="border:1.5px dotted var(--label-2)"></i>'+L('Time off','休息')+'</span></div>')+'</div>';
  /* the chosen day */
  /* the chosen day: nothing is shown until a date is tapped */
  if(selDay){
  var list=C.fastDays(all)[selDay]||[], fl=S.flex.used.indexOf(selDay)>=0;
  h+='<div class="gh">'+dateLbl(C.keyToDate(selDay).getTime(),{weekday:'long',month:'long',day:'numeric'})+'</div><div class="group">';
  if(!list.length&&!fl){ if(selDay>t) h+='<div class="empty">'+L('Nothing here yet.','这天还没有记录。')+'</div>';
    else h+='<div class="row nolog"><span>'+L('Nothing logged','没有记录')+'</span></div><button class="row" data-act="addday">'+IC_PLUS+'<span>'+L('Add a fast','补记断食')+'</span></button>'+(C.flexBlock(selDay,{fasts:S.fasts,flex:S.flex})?'':'<button class="row" data-act="cheatday" data-k="'+selDay+'">'+IC_MOON+'<span>'+L('Use a cheat day','使用弹性日')+'</span></button>'); }
  list.sort(function(a,b){return a.end-b.end;}).forEach(function(f){ h+='<button class="row fast-row" data-act="edit" data-id="'+f.id+'"><span class="stack"><b>'+durTxt(C.hours(f))+'</b><small>'+clockMs(f.start)+' → '+clockMs(f.end)+' · '+(C.isDone(f)?L('goal reached','达成目标')+(C.hours(f)-f.goalH>=1/60?' · '+(S.lang==='zh'?'多 '+durTxt(C.hours(f)-f.goalH):'+'+durTxt(C.hours(f)-f.goalH)):''):L('ended early','提前结束'))+'</small></span>'+CHEV.replace('class="chev"','class="chev" style="margin-left:auto"')+'</button>'; });
  if(fl) h+='<div class="row"><span class="stack"><b>'+L('Cheat day','弹性日')+'</b><small>'+L('Your streak holds, and doesn’t grow.','连续记录保持不变，但不增加。')+'</small></span></div>';
  h+='</div>';
  }
  $('days').innerHTML=h; ringPlay=false; fabSync();
}

/* ---------- in-app wheel pickers: they replace the browser's date, time and select controls ----------
   A row shows the value in a capsule and opens a wheel inline. Columns snap, scroll by touch, wheel or arrow keys. */
var PKH=36, pkTimer=null;
function pkPad(n){ return (n<10?'0':'')+n; }
function pkDayStart(ms){ var d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); }
function pkDayText(ms){ var t=pkDayStart(Date.now()), d=pkDayStart(ms), diff=Math.round((t-d)/D);
  if(diff===0) return L('Today','今天'); if(diff===1) return L('Yesterday','昨天');
  return dateLbl(ms,new Date(ms).getFullYear()===new Date().getFullYear()?{weekday:'short',month:'short',day:'numeric'}:{year:'numeric',month:'short',day:'numeric'}); }
function pkText(kind,val){ if(kind==='dt') return pkDayText(+val)+(S.lang==='zh'?' ':', ')+clockMs(+val); if(kind==='t'){ var a=String(val).split(':'); return clockH((+a[0])+(+a[1])/60); } return String(val); }
function pkCol(key,label,items,sel,flex){ return '<div class="pk-c" role="listbox" tabindex="0" data-c="'+key+'" data-sel="'+sel+'" aria-label="'+esc(label)+'" style="flex:'+flex+'">'+items.map(function(t,i){ return '<div class="pk-i'+(i===sel?' sel':'')+'" role="option" aria-selected="'+(i===sel)+'" data-i="'+i+'">'+t+'</div>'; }).join('')+'</div>'; }
/* kind: 'dt' (ms), 't' ('HH:MM') or 'sel' (a key from opts: [[key,label],...]) */
function pkField(id,label,val,kind,opts){
  var cols='', d, hh, mm, a, hrs=[], mins=[], i;
  if(kind==='sel'){ cols=pkCol('s',label,opts.map(function(o){ return esc(o[1]); }),Math.max(0,opts.map(function(o){ return o[0]; }).indexOf(val)),1); }
  else{
    if(kind==='dt'){ d=new Date(+val); } else { a=String(val).split(':'); d=new Date(); d.setHours(+a[0]||0,+a[1]||0,0,0); }
    hh=d.getHours(); mm=d.getMinutes(); for(i=1;i<=12;i++) hrs.push(i); for(i=0;i<60;i++) mins.push(pkPad(i));
    if(kind==='dt'){ var first=Math.min(pkDayStart(+val),pkDayStart(Date.now()-365*D)), last=Math.max(pkDayStart(+val),pkDayStart(Date.now())), days=[], x=new Date(first);
      while(x.getTime()<=last){ days.push(pkDayText(x.getTime())); x.setDate(x.getDate()+1); }
      cols+=pkCol('d',L('Day','日期'),days,Math.round((pkDayStart(+val)-first)/D),2.6); }
    cols+=pkCol('h',L('Hour','小时'),hrs,(hh%12||12)-1,1)+pkCol('m',L('Minute','分钟'),mins,mm,1)+pkCol('p',L('AM or PM','上午或下午'),[L('AM','上午'),L('PM','下午')],hh<12?0:1,1.2);
  }
  return '<div class="pk" id="'+id+'" data-kind="'+kind+'" data-val="'+esc(String(val))+'"'+(kind==='dt'?' data-d0="'+Math.min(pkDayStart(+val),pkDayStart(Date.now()-365*D))+'"':'')+(kind==='sel'?' data-opts="'+esc(JSON.stringify(opts.map(function(o){return o[0];})))+'" data-labels="'+esc(JSON.stringify(opts.map(function(o){return o[1];})))+'"':'')+'>'+
    '<button type="button" class="row pk-row" data-act="pktog" data-id="'+id+'" aria-expanded="false" aria-controls="'+id+'-w"><span>'+label+'</span><span class="pk-v">'+esc(kind==='sel'?(opts.filter(function(o){return o[0]===val;})[0]||opts[0])[1]:pkText(kind,val))+'</span></button>'+
    '<div class="pk-w" id="'+id+'-w" role="group" aria-label="'+esc(label)+'"><i class="pk-band" aria-hidden="true"></i>'+cols+'</div></div>';
}
function pkVal(id){ return $(id).dataset.val; }
function pkRead(pk){
  var kind=pk.dataset.kind, c=function(k){ var e=pk.querySelector('[data-c="'+k+'"]'); return e?+e.dataset.sel:0; };
  if(kind==='sel') return JSON.parse(pk.dataset.opts)[c('s')];
  var hh=((c('h')+1)%12)+(c('p')?12:0), mm=c('m');
  if(kind==='t') return pkPad(hh)+':'+pkPad(mm);
  var d=new Date(+pk.dataset.d0); d.setDate(d.getDate()+c('d')); d.setHours(hh,mm,0,0); return String(d.getTime()); }
function pkSet(col,i,smooth){ var n=col.children.length; i=Math.max(0,Math.min(n-1,i)); col.scrollTo({top:i*PKH,behavior:smooth?'smooth':'auto'}); }
function pkTune(col){
  var pk=col.closest('.pk'), i=Math.max(0,Math.min(col.children.length-1,Math.round(col.scrollTop/PKH)));
  if(+col.dataset.sel===i) return; var old=col.children[+col.dataset.sel]; if(old){ old.classList.remove('sel'); old.setAttribute('aria-selected','false'); }
  col.dataset.sel=i; col.children[i].classList.add('sel'); col.children[i].setAttribute('aria-selected','true'); fx('select');
  var v=pkRead(pk); pk.dataset.val=v; var kind=pk.dataset.kind;
  pk.querySelector('.pk-v').textContent=kind==='sel'?JSON.parse(pk.dataset.labels)[col.dataset.sel]:pkText(kind,v);
  pkChange(pk.id,v); }
function pkChange(id,v){
  if(id==='obStart') ob.start=v;
  else if(id==='obCity') setPlace({key:v});
  else if(id==='usualStart'){ clearTimeout(pkTimer); pkTimer=setTimeout(function(){ S.prefs.usualStart=v; save(); cache={}; updateToday(); },400); } }
function pkToggle(id){
  var pk=$(id), open=!pk.classList.contains('open');
  Array.prototype.forEach.call(pk.parentNode.querySelectorAll('.pk.open'),function(o){ if(o!==pk){ o.classList.remove('open'); o.querySelector('.pk-row').setAttribute('aria-expanded','false'); } });
  pk.classList.toggle('open',open); pk.querySelector('.pk-row').setAttribute('aria-expanded',String(open));
  if(!open) return;
  Array.prototype.forEach.call(pk.querySelectorAll('.pk-c'),function(c){
    pkSet(c,+c.dataset.sel,false);
    if(c._on) return; c._on=true;
    c.addEventListener('scroll',function(){ pkTune(c); },{passive:true});
    c.addEventListener('click',function(e){ var it=e.target.closest('.pk-i'); if(it) pkSet(c,+it.dataset.i,true); });
    c.addEventListener('keydown',function(e){ var step={ArrowUp:-1,ArrowDown:1,PageUp:-5,PageDown:5}[e.key], i=Math.round(c.scrollTop/PKH);
      if(e.key==='Home') step=-i; if(e.key==='End') step=c.children.length-1-i; if(step==null) return; e.preventDefault(); pkSet(c,i+step,true); }); });
  setTimeout(function(){ try{ pk.scrollIntoView({block:'nearest',behavior:reduce?'auto':'smooth'}); }catch(x){} },60); }
function fastSheet(f,addKey){
  var isNew=!f, now=Date.now(), end, start;
  if(isNew){ var base=C.keyToDate(addKey); end=addKey===today()?now:base.getTime()+12*H; if(end>now) end=now; start=end-plan().fast*H; }
  else{ start=f.start; end=f.end; }
  var goal=isNew?plan().fast:f.goalH;
  openSheet('<h3>'+(isNew?L('Add a fast','补记断食'):L('Edit fast','编辑断食'))+'</h3><p class="lede">'+L('Fix a start or end time, or add one you forgot to log.','修改开始或结束时间，或补上忘记记录的一次。')+'</p>'+
   '<div class="group">'+pkField('fsS',L('Started','开始'),start,'dt')+pkField('fsE',L('Ended','结束'),end,'dt')+'<div class="field"><label for="fsG">'+L('Goal (hours)','目标（小时）')+'</label><input id="fsG" type="number" min="1" max="36" step="1" inputmode="numeric" value="'+Math.round(goal)+'"></div></div>'+
   (isNew?'':'<div class="group"><button class="row red" data-act="fsdel" data-id="'+f.id+'">'+L('Delete this fast','删除这次断食')+'</button></div>')+'<div class="btns"><button class="btn" data-act="fssave" data-id="'+(isNew?'':f.id)+'">'+L('Save','保存')+'</button></div>');
}
function fastSave(id){
  var s=+pkVal('fsS'), e=+pkVal('fsE'), g=Math.round(+$('fsG').value), now=Date.now();
  if(!isFinite(s)||!isFinite(e)) return toast(L('Pick a start and an end.','请选择开始和结束时间。'));
  if(e<=s) return toast(L('The end has to be after the start.','结束时间必须晚于开始时间。'));
  if(e>now+60000) return toast(L('The end can’t be in the future.','结束时间不能在未来。'));
  if((e-s)/H>72) return toast(L('Fasts longer than 72 hours aren’t supported.','不支持超过 72 小时的断食。'));
  if(!(g>=1&&g<=36)) return toast(L('Goal must be between 1 and 36 hours.','目标需在 1 到 36 小时之间。'));
  var clash=S.fasts.some(function(f){ return f.id!==id&&s<f.end&&e>f.start; })||(S.cur&&e>S.cur.start);
  if(clash) return toast(L('That overlaps another fast.','和另一次断食时间重叠了。'));
  if(id){ var f=S.fasts.filter(function(x){return x.id===id;})[0]; if(f){ f.start=s; f.end=e; f.goalH=g; } }
  else S.fasts.push({id:uid(),start:s,end:e,goalH:g,plan:g>=24?String(g):String(g)==='16'?'16':'custom'});
  selDay=C.dayKey(e); fabOn=true; var d=new Date(e); calY=d.getFullYear(); calM=d.getMonth();
  save(); closeSheet(); renderDays(); cache={}; toast(L('Saved.','已保存。'));
}

/* ---------- import from other apps ---------- */
var impPlan=null;
function importSheet(err){
  impPlan=null;
  openSheet('<h3>'+L('Import from another app','从其他应用导入')+'</h3><p class="lede">'+L('Bring your past fasts with you. The file is read on this phone and never uploaded.','把过去的断食记录带过来。文件只在这台手机上读取，不会上传。')+'</p>'+
   '<div class="group"><div class="row"><span class="stack"><span>Zero</span><small>'+L('Download your data from Zero, unzip it, then choose firestore.json.','在 Zero 里下载你的数据并解压，然后选择 firestore.json。')+'</small></span></div>'+
   '<div class="row"><span class="stack"><span>'+L('Other apps','其他应用')+'</span><small>'+L('A CSV or JSON file with a start and an end time for each fast.','包含每次断食开始和结束时间的 CSV 或 JSON 文件。')+'</small></span></div></div>'+
   (err?'<p class="note err" role="alert">'+err+'</p>':'')+
   '<div class="btns"><label class="btn" for="impFile">'+L('Choose a file','选择文件')+'</label><input id="impFile" type="file" accept=".json,.csv,.txt,application/json,text/csv,text/plain" hidden><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>');
}
function importPreview(p){
  impPlan=p; var skip=[];
  if(p.dup) skip.push(L(p.dup+' already in Lightly',p.dup+' 次已在轻伴里'));
  if(p.overlap) skip.push(L(p.overlap+' overlap'+(p.overlap>1?'':'s')+' a fast you have',p.overlap+' 次与已有记录重叠'));
  if(p.open) skip.push(L(p.open+' still running',p.open+' 次仍在进行'));
  if(p.bad||p.future) skip.push(L((p.bad+p.future)+' with unusable times',(p.bad+p.future)+' 次时间无效'));
  var n=p.add.length, o={year:'numeric',month:'short',day:'numeric'}, rng=n?dateLbl(p.first,o)+' – '+dateLbl(p.last,o):'';
  var ok=p.add.filter(function(f){ return C.isDone(f); }).length;
  openSheet('<h3>'+L('Ready to import','准备导入')+'</h3><p class="lede">'+L('From '+p.source+'. Nothing is added until you confirm.','来自 '+p.source+'。确认之前不会添加任何内容。')+'</p>'+
   '<div class="group"><div class="row"><span>'+L('New fasts','新增断食')+'</span><span class="v">'+n+'</span></div>'+
   (n?'<div class="row"><span>'+L('Dates','日期范围')+'</span><span class="v">'+rng+'</span></div><div class="row"><span>'+L('Reached the goal','达成目标')+'</span><span class="v">'+ok+'</span></div>':'')+
   (skip.length?'<div class="row"><span class="stack"><span>'+L('Skipped','已跳过')+'</span><small>'+skip.join(' · ')+'</small></span></div>':'')+'</div>'+
   (n?'':'<p class="note">'+L('There is nothing new in this file.','这个文件里没有新的记录。')+'</p>')+
   '<div class="btns"><button class="btn" data-act="impdo"'+(n?'':' disabled')+'>'+(n?L('Add '+n+' fasts','添加 '+n+' 次断食'):L('Nothing to add','没有可添加的内容'))+'</button><button class="btn quiet" data-act="import">'+L('Choose another file','换一个文件')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>');
}
function importDo(){
  var p=impPlan; if(!p||!p.add.length) return;
  /* check again against the latest state, so a double tap can never create duplicates */
  var q=LightlyImport.plan({source:p.source,items:p.add,open:0},S.fasts,S.cur,S.del,Date.now());
  q.add.forEach(function(f){ S.fasts.push(f); });
  impPlan=null; save(); cache={}; closeSheet(); renderMe(); updateToday(); checkUnlocks(); if(!$('ob').hidden&&ob&&obFlow()[ob.step]==='import') setTimeout(function(){ A.obnext(); },260);
  toast(L('Added '+q.add.length+' fasts.','已添加 '+q.add.length+' 次断食。'));
}
document.addEventListener('change',function(e){
  var t=e.target; if(!t||(t.id!=='impFile'&&t.id!=='obImpFile')||!t.files||!t.files[0]) return; var f=t.files[0];
  if(f.size>20*1048576) return importSheet(L('That file is too large.','文件太大了。'));
  if(/\.zip$/i.test(f.name)) return importSheet(L('Unzip it first, then choose the file inside.','请先解压，再选择里面的文件。'));
  var r=new FileReader();
  r.onerror=function(){ importSheet(L('Couldn’t read that file.','无法读取这个文件。')); };
  r.onload=function(){ var res=LightlyImport.parse(String(r.result||''));
    if(res.error) return importSheet(res.error==='format'?L('I couldn’t find fasts with a start and an end time in that file.','在这个文件里没有找到带开始和结束时间的断食记录。'):L('That file isn’t readable.','这个文件无法读取。'));
    importPreview(LightlyImport.plan(res,S.fasts,S.cur,S.del,Date.now())); };
  r.readAsText(f);
});

/* ---------- cheat days (弹性日) ---------- */
function flexTick(){ C.flexRefill(S.flex,S.startedAt||Date.now()); }
function cheatSheet(day){
  flexTick(); var k=typeof day==='string'?day:today(), used=S.flex.used.indexOf(k)>=0, blk=C.flexBlock(k,{fasts:S.fasts,flex:S.flex}), b=S.flex.bank;
  var moons=''; for(var i=0;i<2;i++) moons+='<svg width="30" height="30" viewBox="-15 -15 30 30" style="margin-right:6px" aria-hidden="true"><circle r="12" style="fill:'+(i<b?'var(--moon)':'none')+';stroke:'+(i<b?'var(--moon-edge)':'var(--label-2)')+'" stroke-width="1.5"/></svg>';
  var why={used:'',fasted:L('You fasted today, so you don’t need one.','今天你已经断食了，不需要使用。'),bank:L('None left. A new one arrives every Monday.','已经用完。每周一会补一个。'),week:L('Two in a week is the limit, so you still fast at least five days.','一周最多两个，这样每周至少断食五天。'),window:''}[blk]||'';
  openSheet('<h3>'+L('Cheat days','弹性日')+'</h3><p class="lede">'+L('A day off that keeps your streak going.','休息一天，连续记录不会断。')+'</p>'+
    '<div class="group"><div class="row" style="min-height:60px"><span style="display:flex">'+moons+'</span><span class="v">'+L(b+' left',b+' 个可用')+'</span></div></div>'+
    '<p class="note">'+(why||L('A new one arrives every Monday. You can keep two.','每周一补充一个，最多存两个。'))+'</p>'+
    '<div class="btns">'+(used?'<button class="btn sec" data-act="undocheat" data-k="'+k+'">'+(k===today()?L('Take today’s cheat day back','收回今天的弹性日'):L('Take this cheat day back','收回这天的弹性日'))+'</button>':'<button class="btn hold" data-hold="usecheat" data-k="'+k+'"'+(blk?' disabled':'')+'><span class="hl">'+L('Hold to use a cheat day','按住使用弹性日')+'</span></button>')+'<button class="btn sec" data-act="close">'+L('Close','关闭')+'</button></div>');
}
function useCheat(k){ flexTick(); var b=C.flexBlock(k,{fasts:S.fasts,flex:S.flex}); if(b) return toast(L('A cheat day can’t be used for that day.','这天不能使用弹性日。')); S.flex.used.push(k); S.flex.bank--; save(); closeSheet(); cache={}; updateToday(); if(curTab==='days') renderDays(); toast(L('Cheat day used. Your streak holds.','已使用弹性日，连续记录保持。')); }

/* ---------- plan sheet ---------- */
var moreOpen=false;
function planSheet(){
  var cur=S.cur, h='<h3>'+L('Your plan','你的计划')+'</h3><p class="lede">'+(cur?L('Switching now keeps your start time. The disc refills to the new goal.','现在切换会保留开始时间，圆盘按新目标重新计算。'):L('This is the plan your next fast uses.','下一次断食会用这个计划。'))+'</p>';
  var selId=cur?cur.planId:S.planId;
  if(inRamadan()) h+='<div class="group"><button class="plan'+(selId==='ramadan'?' sel':'')+'" data-act="pickplan" data-id="ramadan"><span class="pn"><span class="pt"><b>'+L('Ramadan','斋月')+'</b><span class="pill tint">'+L('In season','当季')+'</span></span><small>'+L('Dawn to sunset, this month','黎明到日落，本月')+'</small></span>'+CHECK+'</button></div>';
  h+='<div class="group">'; C.PLANS.filter(function(p){return p.top;}).forEach(function(p){ h+=planRow(p,selId); }); h+='</div>';
  h+='<div class="group"><button class="row" data-act="more" aria-expanded="'+moreOpen+'" style="min-height:52px"><b style="font-weight:600">'+L('More plans','更多计划')+'</b><span class="v" style="margin-left:auto"></span><svg class="chev" viewBox="0 0 8 14" style="transform:rotate('+(moreOpen?90:0)+'deg);transition:transform .3s"><path d="M1.5 1.5 7 7l-5.5 5.5"/></svg></button>';
  if(moreOpen){ C.PLANS.filter(function(p){return !p.top;}).forEach(function(p){ h+=planRow(p,selId); }); if(S.profile.safety) h+='<div class="row"><span class="stack"><small>'+L('Long fasts aren’t offered based on your answers. If you’d like to fast longer, please talk to a doctor first.','根据你的回答，不提供长时间断食。如果想断食更久，请先咨询医生。')+'</small></span></div>'; }
  h+='</div><div class="btns"><button class="btn sec" data-act="close">'+L('Done','完成')+'</button></div>';
  openSheet(h);
}
function planRow(p,selId){
  var pl=p.custom?C.planById('custom',S.customH):p, lab=C.planLabel(pl), sub='', dis=false, pill='', bar='';
  if(p.long){
    var st=longSt(p.fast);
    if(st.st==='hidden') return '';
    if(st.st==='locked'){ dis=true; pill='<span class="pill">'+L('Locked','未解锁')+'</span>'; sub=st.label; bar='<div class="bar"><i style="width:'+Math.round(st.pct*100)+'%"></i></div>'; if(S.lang==='zh') sub=zhProgress(st.label); }
    else if(st.st==='paused'){ dis=true; pill='<span class="pill">'+L('Paused','已暂停')+'</span>'; sub=L('You said you felt unwell. Available again ','你说过身体不适，可用时间：')+dateLbl(st.until); }
    else if(st.st==='wait'){ dis=true; pill='<span class="pill">'+L('Rest first','先休息')+'</span>'; sub=L('Available again ','可用时间：')+dateLbl(st.until); }
    else sub=L('Unlocked. Water and electrolytes recommended.','已解锁。建议补充水分和电解质。');
  }else{
    var ps=pst(p.id);
    if(ps.st==='locked'){ dis=true; pill='<span class="pill">'+L('Locked','未解锁')+'</span>'; sub=S.lang==='zh'?zhProgress(C.planStatusLabel(ps)):C.planStatusLabel(ps); bar='<div class="bar"><i style="width:'+Math.round(ps.pct*100)+'%"></i></div>'; }
    else sub=p.custom?L('Choose 12 to 23 hours','12 到 23 小时之间'):fastSub(p);
  }
  var extra=p.custom&&!dis?'<span class="pr" style="min-width:0"></span>':'';
  var row='<button class="plan'+(selId===p.id?' sel':'')+'" data-act="pickplan" data-id="'+p.id+'"'+(dis?' disabled':'')+'><span class="pn"><b>'+esc(pName(p))+'</b><small>'+sub+'</small>'+bar+'</span>'+pill+'<span class="pr">'+lab+'</span>'+CHECK+'</button>';
  if(p.custom&&selId==='custom') row+='<div class="field"><label for="cH">'+L('Fasting hours','断食小时数')+'</label><input id="cH" type="number" min="12" max="23" step="1" inputmode="numeric" value="'+S.customH+'" data-chg="custom"></div>';
  return row;
}
function zhProgress(l){ return l.replace(/(\d+) of (\d+) fasts of (\d+) h or more/,'$3 小时以上 $1/$2 次').replace(/(\d+) of (\d+) of 18 h or more/,'18 小时以上 $1/$2 次').replace(/week (\d+) of (\d+)/,'第 $1/$2 周').replace(/(\d+) of (\d+) fast of 24 h/,'24 小时断食 $1/$2 次').replace('First finish a 24 h fast, ','先完成一次 24 小时断食，').replace('24 h done, ','24 小时已完成，'); }
function pickPlan(id){
  var p=C.planById(id,S.customH);
  if(id==='ramadan'){ S.planId='ramadan'; if(S.cur){ toast(L('Ramadan runs dawn to sunset. End this fast first.','斋月从黎明到日落。先结束当前断食。')); return; } save(); closeSheet(); updateToday(); return startRamadan(); }
  if(p.long){ var st=longSt(p.fast); if(st.st!=='ok') return; if(S.cur){ return longSafety(p); } S.planId=id; save(); cache={}; updateToday(); return planSheet(); }
  if(!planOk(id)) return;
  S.planId=id; if(S.cur){ S.cur.planId=id; S.cur.goalH=p.fast; S.cur.reached=(Date.now()-S.cur.start)/H>=p.fast; scheduleGoal(); }
  save(); cache={}; ticksKey=''; updateToday(); planSheet();
}

/* ---------- sunrise and sunset: location, or a nearby city ---------- */
function placeSheet(){
  var h='<h3>'+L('Sunrise and sunset','日出日落')+'</h3><p class="lede">'+L('Lightly uses your location on this phone only to find your local sunrise and sunset. It is never uploaded or shared. Prefer not to share? Choose a nearby city.','轻伴只在这台手机上用你的位置来算当地的日出日落，不会上传，也不会分享。不想分享？选一个附近的城市就行。')+'</p>';
  h+='<div class="group"><button class="plan'+(S.place.key==='here'?' sel':'')+'" data-act="geo"><span class="pn"><b>'+L('Use my location','使用我的位置')+'</b><small>'+L('Most accurate. Stays on this phone.','最准确，只留在这台手机上。')+'</small></span>'+CHECK+'</button></div><div class="gh">'+L('Or choose a city','或选择城市')+'</div><div class="group">';
  Object.keys(C.CITIES).forEach(function(k){ h+='<button class="plan'+(S.place.key===k?' sel':'')+'" data-act="city" data-k="'+k+'" style="min-height:48px"><span class="pn"><b style="font-weight:400">'+C.CITIES[k][S.lang==='zh'?'zh':'en']+'</b></span>'+CHECK+'</button>'; });
  h+='</div><div class="btns"><button class="btn sec" data-act="close">'+L('Done','完成')+'</button></div>'; openSheet(h);
}
function setPlace(pl){ S.place=pl; sunDay=''; save(); cache={}; updateToday(); }
function geo(then){
  if(!navigator.geolocation){ toast(L('This browser can’t share a location. Pick a city instead.','这个浏览器无法获取位置，请选择城市。')); return then&&then(false); }
  navigator.geolocation.getCurrentPosition(function(p){ setPlace({key:'here',lat:Math.round(p.coords.latitude*100)/100,lon:Math.round(p.coords.longitude*100)/100}); toast(L('Using your location.','已使用你的位置。')); then&&then(true); },
    function(){ toast(L('Couldn’t get your location, so Lightly is using '+placeName()+'.','没能获取你的位置，先使用'+placeName()+'。')); then&&then(false); },{timeout:10000,maximumAge:3600000});
}

/* ---------- account: email sign-in and backup (Supabase). Everything works signed out; an account only backs up. ---------- */
var CL=window.LightlyCloud, sync={busy:false,msg:'',at:0,err:'',t:0};
function cloudOn(){ return CL&&CL.ready()&&CL.getAuth(); }
function cloudSoon(){ if(!cloudOn()) return; clearTimeout(sync.t); sync.t=setTimeout(function(){ syncNow(true); },4000); }
function applyRemote(m){ quiet=true; Object.keys(m).forEach(function(k){ S[k]=m[k]; }); if(S.place&&S.place.key==='here'&&S.place.lat==null) S.place={key:C.guessCity(tzGuess())}; /* coordinates stay on the phone */ quiet=false; saveNow(); }
function syncNow(silent){
  if(!cloudOn()||sync.busy) return Promise.resolve(); sync.busy=true; sync.err=''; if(curTab==='me') renderMe();
  return CL.pull().then(function(row){
    var au=CL.getAuth(), first=S.cloudUid!==au.uid, local=JSON.parse(JSON.stringify(S));
    if(first&&row&&row.data) local.mod=0;            /* first time on this device: the account's settings win, fasts are combined */
    var merged=row&&row.data?CL.merge(local,row.data):S; merged.cloudUid=au.uid;
    if(row&&row.data){ var before=JSON.stringify(S); applyRemote(merged); if(JSON.stringify(S)!==before){ cache={}; ticksKey=''; applyTheme(); applyLang(); } } else { quiet=true; S.cloudUid=au.uid; quiet=false; }
    if(S.onboarded&&!$('ob').hidden){ ph.classList.remove('onb'); $('ob').hidden=true; $('ob').innerHTML=''; showTab('today'); }
    return CL.push(S);
  }).then(function(){ sync.at=Date.now(); if(!silent) toast(L('Backed up.','已备份。')); }).catch(function(e){ sync.err=e&&e.message||'error'; if(!silent) toast(L('Couldn’t back up: ','备份失败：')+sync.err); })
    .then(function(){ sync.busy=false; if(curTab==='me') renderMe(); if(curTab==='today') updateToday(); });
}
function accountHtml(){
  var zh=S.lang==='zh', au=CL&&CL.getAuth(), h='';
  if(au){
    h+='<div class="group"><div class="me-card"><span class="av"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></span><div><b>'+esc(au.email||L('Signed in','已登录'))+'</b><span>'+(sync.busy?L('Backing up…','正在备份…'):sync.err?L('Couldn’t back up. Tap Back up now to retry.','备份失败，点“立即备份”重试。'):sync.at?L('Backed up just now','刚刚已备份'):L('Your fasts are backed up to your account.','你的记录会备份到账号。'))+'</span></div></div>'+
      '<div class="signin"><button class="btn sec" data-act="syncnow"'+(sync.busy?' disabled':'')+'>'+L('Back up now','立即备份')+'</button><button class="btn sec" data-act="signout">'+L('Sign out','退出登录')+'</button></div></div>';
    return h;
  }
  h+='<div class="group"><div class="me-card"><span class="av"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></svg></span><div><b>'+L('Not signed in','未登录')+'</b><span>'+L('Everything works. Fasts stay on this phone.','所有功能都能用，断食记录保存在这台手机上。')+'</span></div></div>'+
   '<div class="signin"><button class="btn gbtn" data-act="google"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8C3.9 20.6 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.8 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg><span>'+L('Continue with Google','用 Google 继续')+'</span></button><button class="btn sec" data-act="emailsheet">'+L('Continue with email','用邮箱继续')+'</button></div></div>'+
   '<div class="gf" style="margin-top:-8px">'+L('Signing in is optional and only backs up your fasts, so you can change phones.','登录是可选的，只用来备份记录，换手机时不会丢。')+'</div>';
  return h;
}
function emailSheet(step,email,err){
  if(!CL||!CL.ready()){ return toast(L('Cloud backup isn’t set up yet.','云备份还没有设置好。')); }
  var code=CL.codeOn(), h='<h3>'+L('Sign in with email','邮箱登录')+'</h3>';
  if(step!=='sent'){
    h+='<p class="lede">'+(code?L('We’ll email you a sign-in link and a 6-digit code. No password to remember.','我们会给你发一封带登录链接和 6 位验证码的邮件，不用记密码。'):L('We’ll email you a sign-in link. Tap it and you’re in. No password to remember.','我们会给你发一封登录邮件，点里面的链接就能登录，不用记密码。'))+'</p><div class="group"><div class="field"><label for="emIn">'+L('Email','邮箱')+'</label><input id="emIn" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" value="'+esc(email||'')+'" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div>'+(err?'<p class="note err" role="alert" style="color:var(--red)">'+esc(err)+'</p>':'')+
      '<div class="btns"><button class="btn" data-act="emsend">'+L('Send sign-in link','发送登录链接')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>';
  }else{
    h+='<p class="lede">'+L('Check your email at ','请查收邮件：')+'<b>'+esc(email)+'</b>'+L('. Tap the sign-in link in it. It can take a minute, and may land in spam.','。点邮件里的登录链接即可，可能要等一分钟，也可能在垃圾邮件里。')+'</p>'+
      '<p class="note">'+L('Open the link on this phone, in the same browser or app you’re using now. If it opens somewhere else, you’ll be signed in there instead.','请在这台手机上、用你现在用的浏览器或应用打开链接。如果在别处打开，登录的就是别处。')+'</p>';
    if(code) h+='<div class="group"><div class="field"><label for="emCode">'+L('Code','验证码')+'</label><input id="emCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="8" placeholder="123456" style="width:9ch;text-align:center;letter-spacing:.2em;border:0;background:var(--fill);border-radius:8px;min-height:36px;color:var(--label);font:inherit;font-size:1.0625rem"></div></div>';
    h+=(err?'<p class="note err" role="alert" style="color:var(--red)">'+esc(err)+'</p>':'')+'<div class="btns">'+(code?'<button class="btn" data-act="emverify" data-e="'+esc(email)+'">'+L('Sign in with code','用验证码登录')+'</button>':'')+
      '<button class="btn sec" id="emResend" data-act="emresend" data-e="'+esc(email)+'">'+L('Send again','再发一次')+'</button><button class="btn sec" data-act="emback" data-e="'+esc(email)+'">'+L('Use a different email','换一个邮箱')+'</button></div>';
  }
  openSheet(h); var i=$('emIn')||$('emCode'); if(i) setTimeout(function(){ try{ i.focus(); }catch(e){} },350);
  if(step==='sent') resendCool();
}
var emCool=0;
function resendCool(){ var b=$('emResend'); if(!b) return; var left=Math.ceil((emCool-Date.now())/1000); if(left>0){ b.disabled=true; b.textContent=L('Send again in ','可再发送：')+left+L(' s',' 秒'); setTimeout(resendCool,1000); } else { b.disabled=false; b.textContent=L('Send again','再发一次'); } }
function emailErr(x){ return x&&(x.status===429||/rate|seconds|too many/i.test(x.message||''))?L('Too many emails just now. Wait a minute and try again.','邮件发得太频繁了，请等一分钟再试。'):L('Couldn’t send the email: ','邮件没发出去：')+x.message; }

function fastSub(p){ return L('Fast '+p.fast+' hours','断食 '+p.fast+' 小时'); }

/* ---------- Me ---------- */
/* one-of-a-few settings open a list with a check mark, like iOS Settings */
var CHOICES={
  lang:{title:['Language','语言'],opts:[['en','English',''],['zh','中文','']],cur:function(){ return S.lang; }},
  theme:{title:['Appearance','外观'],opts:[['auto',['Auto','自动'],['Follows your phone','跟随手机']],['light',['Light','浅色'],''],['dark',['Dark','深色'],'']],cur:function(){ return S.theme; }},
  tstyle:{title:['Timer style','计时样式'],opts:[['a',['Classic','经典'],['Bold rounded numerals','圆润粗体数字']],['b',['Hero','大字'],['Very large, light numerals','超大轻体数字']]],cur:function(){ return S.prefs.timerStyle||'b'; }}
};
function cl(x){ return typeof x==='string'?x:L(x[0],x[1]); }
function choiceLabel(k,v){ var o=CHOICES[k].opts.filter(function(x){return x[0]===v;})[0]; return o?cl(o[1]):''; }
function choiceSheet(k){
  var c=CHOICES[k], cur=c.cur(), h='<h3>'+L(c.title[0],c.title[1])+'</h3><div class="group">';
  c.opts.forEach(function(o){ h+='<button class="plan'+(o[0]===cur?' sel':'')+'" data-act="pick" data-k="'+k+'" data-v="'+o[0]+'"><span class="pn"><b>'+esc(cl(o[1]))+'</b>'+(o[2]?'<small>'+esc(cl(o[2]))+'</small>':'')+'</span>'+CHECK+'</button>'; });
  openSheet(h+'</div><div class="btns"><button class="btn sec" data-act="close">'+L('Done','完成')+'</button></div>'); scrim.classList.toggle('peek',k==='theme');
}
function renderMe(){
  var zh=S.lang==='zh', h='';
  h+=accountHtml();
  var p=plan(), ls=S.cur?null:null;
  h+='<div class="gh">'+L('Fasting','断食')+'</div><div class="group">'+
   '<button class="row" data-act="place"><span>'+L('Sunrise and sunset','日出日落')+'</span><span class="v">'+esc(placeName())+'</span>'+CHEV+'</button>'+
   (S.prefs.usualStart?pkField('usualStart',L('Usual start time','通常开始时间'),S.prefs.usualStart,'t'):'<button class="row" data-act="usualset"><span>'+L('Usual start time','通常开始时间')+'</span><span class="v">'+L('Not set','未设置')+'</span>'+CHEV+'</button>')+
   '<button class="row" data-act="cheat"><span>'+L('Cheat days','弹性日')+'</span><span class="v">'+L(S.flex.bank+' left',S.flex.bank+' 个可用')+'</span>'+CHEV+'</button></div>';
  h+='<div class="gh">'+L('App','应用')+'</div><div class="group">'+
   '<button class="row" data-act="choice" data-k="lang"><span>'+L('Language','语言')+'</span><span class="v">'+(S.lang==='zh'?'中文':'English')+'</span>'+CHEV+'</button>'+
   '<button class="row" data-act="choice" data-k="theme"><span>'+L('Appearance','外观')+'</span><span class="v">'+choiceLabel('theme',S.theme)+'</span>'+CHEV+'</button>'+
   sw('sound',L('Sound','声音'),S.prefs.sound)+(navigator.vibrate?sw('haptics',L('Vibration','振动'),S.prefs.haptics):'')+sw('d3',L('3D moon and sun','3D 月亮和太阳'),S.prefs.d3&&!!orb,!orb)+
   sw('notify',L('Reminders','提醒'),S.prefs.notify&&('Notification' in window)&&Notification.permission==='granted',!('Notification' in window))+'</div>';
  h+='<div class="gf">'+L('You’ll hear when you reach your goal, as long as Lightly was opened recently.','只要最近打开过轻伴，达成目标时就会提醒你。')+'</div>';
  h+='<div class="gh">'+L('Care','关怀')+'</div><div class="group"><button class="row" data-act="timeoff"><span class="stack"><span>'+L('Time off','休息一下')+'</span></span>'+(offNow()?'<span class="v">'+(offNow().kind==='travel'?L('Travelling','旅行中'):L('Resting','休养中'))+'</span>':'')+CHEV+'</button></div>';
  h+='<div class="gh">'+L('Your data','你的数据')+'</div><div class="group"><button class="row" data-act="import"><span>'+L('Import from another app','从其他应用导入')+'</span>'+CHEV+'</button><button class="row" data-act="export"><span>'+L('Export my fasts','导出我的记录')+'</span>'+CHEV+'</button><button class="row red" data-act="erase"><span>'+L('Erase everything','清除所有数据')+'</span></button></div>';
  if(C.ramadanDay()===0) h+='<div class="group">'+(sw('ram',L('Preview Ramadan mode','预览斋月模式'),S.ramadanPreview))+'</div><div class="gf">'+L('Ramadan appears in your plans only during Ramadan. This switch lets you look at it now.','斋月只在当季出现在计划里。这个开关让你现在就能看看。')+'</div>';
  h+='<p class="gf" data-act="diag" style="text-align:center">'+L('Lightly · web app · v','轻伴 · 网页版 · v')+(window.LIGHTLY_VERSION||'')+L(' · saved on this device',' · 保存在本机')+(storageOk?'':'<br>'+L('Storage is blocked, so nothing will be kept after you close the app.','存储被阻止，关闭应用后记录不会保留。'))+'</p>';
  $('me').innerHTML=h;
}
function sw(k,label,on,dis){ return '<div class="row"><span>'+label+'</span><button class="sw" role="switch" aria-checked="'+!!on+'" aria-label="'+esc(label)+'" data-act="sw" data-k="'+k+'"'+(dis?' disabled':'')+'></button></div>'; }
/* Light / Dark / Auto: every colour changes in the same frame. Any per-element transition is switched off for that frame, so text never sits half-way between black and white; the sheet's blur is untouched. */
function switchTheme(fn){
  var r=document.documentElement; r.classList.add('theme-now'); fn(); void r.offsetHeight;
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ r.classList.remove('theme-now'); }); });
}
function applyTheme(){ var r=document.documentElement; if(S.theme==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',S.theme); }
function applyLang(){ document.documentElement.lang=S.lang==='zh'?'zh-Hans':'en'; tabLabels(); document.title=S.lang==='zh'?'轻伴':'Lightly'; }

/* ---------- onboarding ---------- */
var ob={step:0,fasted:null,safe:[],plan:null,start:'20:00',city:false};
/* a small ladder of everyday plans: lit where you start, outlined where it opens later */
function obLadder(){
  var f=ob.fasted, open=f==='before'?4:1, names=['13:11','16:8','18:6','20:4'];
  var cap=f==='before'?L('Every everyday plan is open from day one, up to 20:4. Longer fasts unlock as you build up.','每个日常计划从第一天起都可用，最高 20:4。更长的断食会随你的进度开放。'):f==='first'?L('You start at 13:11. Each next plan opens after three completed fasts.','你从 13:11 开始。每完成三次断食，开放下一个计划。'):L('Choose one to see where you will start.','选一个，看看你会从哪里开始。');
  return '<div class="ladder" role="img" aria-label="'+esc(cap)+'">'+names.map(function(n,k){ return '<span class="rung'+(k<open?' on':'')+'" style="--k:'+k+'">'+n+'</span>'; }).join('')+'</div><p class="ladcap" aria-live="polite">'+cap+'</p>';
}
function obRisky(){ return !!(ob.safe.length&&ob.safe.indexOf('none')<0); }
/* everyone: welcome, fasted before, safety, plan, where you are. People who have fasted before also get a step to make it theirs. */
/* safety comes last, just before the summary; a flag then lowers the plan to 13:11 */
function obFlow(){ var f=['welcome','fasted','plan']; if(ob.fasted==='before'){ f.push('custom'); f.push('import'); } f.push('set','safety','summary'); return f; }
/* the import step shows a plain file glyph, not look-alike tiles of other apps */
var IMP_GLYPH='<div class="ob-hero imp-glyph" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11.5v5M9.5 14l2.5 2.5 2.5-2.5"/></svg></div>';
function obHtml(i){
  var back=i>0?'<button class="ob-back" data-act="obback"><svg viewBox="0 0 10 18"><path d="M8.5 1.5 1.5 9l7 7.5"/></svg>'+L('Back','返回')+'</button>':'<span></span>';
  var flow=obFlow(), key=flow[i]; var dots='<span class="ob-dots" aria-hidden="true">'+flow.map(function(j){return '<i'+(j===i?' class="on"':'')+'></i>';}).join('')+'</span>';
  var top='<div class="ob-top"><span class="ob-l">'+back+'</span>'+dots+'<span></span></div>', body='', cta='';
  function opt(v,label,sub,on){ return '<button class="plan'+(on?' sel':'')+'" data-act="obopt" data-v="'+v+'"><span class="pn"><b>'+label+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span>'+CHECK+'</button>'; }
  if(key==='welcome'){
    var tile='<svg id="obHero" viewBox="-80 -80 160 160" role="img" aria-label="'+L('The moon. Drag it to change the phase.','月亮。拖动可以改变月相。')+'"><defs><radialGradient id="obM" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#EEE8D9"/><stop offset="1" stop-color="#CFC7B2"/></radialGradient></defs>'+
      '<rect x="-80" y="-80" width="160" height="160" rx="36" style="fill:var(--night)"/>'+
      '<g fill="#fff" class="tw"><circle cx="-52" cy="-46" r="1.4" opacity=".7"/><circle cx="-30" cy="-60" r="1" opacity=".5"/><circle cx="46" cy="-52" r="1.5" opacity=".7"/><circle cx="58" cy="-22" r="1" opacity=".5"/><circle cx="-58" cy="30" r="1" opacity=".5"/><circle cx="50" cy="52" r="1.2" opacity=".6"/></g>'+
      '<circle id="obHalo" r="52" fill="none" stroke="#F4EFE2" stroke-width="1.5" opacity="0"/><circle r="40" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/><path id="obLit" d="" fill="url(#obM)"/></svg>';
    body='<div class="grow"></div><div class="ob-hero">'+tile+'</div><h1 style="text-align:center">'+L('Lightly','轻伴')+'</h1><p class="lede" style="text-align:center">'+L('A fast that follows the sky. A moon at night and a sun by day, set by your real sunrise and sunset.','跟着天空走的断食。夜里是月亮，白天是太阳，由你所在地的真实日出日落决定。')+'</p><div class="seg" style="margin:8px auto 0;width:min(260px,100%)"><button data-act="lang" data-v="en" aria-pressed="'+(S.lang==='en')+'">English</button><button data-act="lang" data-v="zh" aria-pressed="'+(S.lang==='zh')+'">中文</button></div><div class="grow"></div>';
    cta='<button class="btn" data-act="obnext">'+L('Get started','开始')+'</button>';
  }else if(key==='fasted'){
    body='<h1>'+L('Have you fasted before?','你以前断食过吗？')+'</h1><p class="lede">'+L('This only sets your starting plan.','这只会决定你的起始计划。')+'</p><div class="group">'+opt('first',L('This is my first time','这是第一次'),L('Start with 13:11 and build up.','从 13:11 开始，慢慢增加。'),ob.fasted==='first')+opt('before',L('I’ve fasted before','我以前断食过'),L('Every everyday plan is open, and you can tune it next.','所有日常计划都可用，下一步可以细调。'),ob.fasted==='before')+'</div>'+obLadder()+'<div class="grow"></div>';
    cta='<button class="btn" data-act="obnext"'+(ob.fasted?'':' disabled')+'>'+L('Continue','继续')+'</button>';
  }else if(key==='safety'){
    function ck(v,label){ var on=ob.safe.indexOf(v)>=0; return '<button class="check" role="checkbox" aria-checked="'+on+'" data-act="obsafe" data-v="'+v+'"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+label+'</span></button>'; }
    body='<h1>'+L('Is any of this true for you?','下面有符合你的情况吗？')+'</h1><p class="lede">'+L('Fasting isn’t right for everyone. Pick all that apply.','断食并不适合所有人。可多选。')+'</p><div class="group">'+ck('preg',L('Pregnant or breastfeeding','怀孕或哺乳期'))+ck('diab',L('I take medication for diabetes','我在服用糖尿病药物'))+ck('ed',L('I have had an eating disorder','我有过进食障碍'))+ck('none',L('None of these','都不是'))+'</div>'+
      (ob.safe.length&&ob.safe.indexOf('none')<0?'<p class="gf obnote" style="padding:0 4px;color:var(--label)">'+L('Thank you for telling us. We’ll suggest the gentlest plan and never offer long fasts. Please talk to your doctor before fasting.','谢谢你告诉我们。我们会推荐最温和的计划，也不会提供长时间断食。断食前请先咨询医生。')+'</p>':'')+'<div class="grow"></div>';
    cta='<button class="btn" data-act="obnext"'+(ob.safe.length?'':' disabled')+'>'+L('Continue','继续')+'</button>';
  }else if(key==='plan'){
    var risky=obRisky(), sug=risky||ob.fasted==='first'?'13':'16', prof={fastedBefore:ob.fasted==='before',safety:risky}; if(!ob.plan||C.planStatus(ob.plan,prof,{fasts:[]}).st!=='ok') ob.plan=sug;
    body='<h1>'+L('Pick your plan','选择你的计划')+'</h1><p class="lede">'+(risky||ob.fasted==='first'?L('Everyone starts at 13:11. The next plan opens after three completed fasts.','大家都从 13:11 开始，完成三次后开放下一个计划。'):L('Every everyday plan is open. You can change it any time.','所有日常计划都已开放，随时可以更改。'))+'</p><div class="group">'+C.PLANS.filter(function(p){return p.top;}).map(function(p){ var lk=C.planStatus(p.id,prof,{fasts:[]}).st!=='ok';
        return '<button class="plan'+(ob.plan===p.id?' sel':'')+'" data-act="obplan" data-id="'+p.id+'"'+(lk?' disabled':'')+'><span class="pn"><span class="pt"><b>'+pName(p)+'</b>'+(p.id===sug?'<span class="pill tint">'+L('Suggested','推荐')+'</span>':'')+(lk?'<span class="pill">'+L('Locked','未解锁')+'</span>':'')+'</span><small>'+(lk?L('After 3 fasts','完成 3 次后'):fastSub(p))+'</small></span>'+'<span class="pr">'+C.planLabel(p)+'</span>'+CHECK+'</button>'; }).join('')+'</div>'+
      '<p class="gf" style="padding:0 4px">'+(risky?L('Longer fasts stay off for you.','长时间断食对你保持关闭。'):L('A 24-hour fast unlocks later, as you build up.','24 小时断食会在你逐步适应后解锁。'))+'</p><div class="grow"></div>';
    cta='<button class="btn" data-act="obnext">'+L('Continue','继续')+'</button>';
  }else if(key==='import'){
    body='<div class="grow"></div>'+IMP_GLYPH+'<h1 style="text-align:center">'+L('Bring your fasts with you','带上你的断食记录')+'</h1><p class="lede" style="text-align:center">'+L('Using another fasting app? Import your history now so you never lose it. It’s optional, and you can do it later in Me.','正在用别的断食应用？现在导入历史记录，就不会丢失。这是可选的，以后也可以在“我”里导入。')+'</p><p class="gf" style="text-align:center">'+L('Zero: unzip your download and choose firestore.json. Other apps: a CSV or JSON file with start and end times. The file stays on this phone.','Zero：解压下载的文件，选择 firestore.json。其他应用：包含开始和结束时间的 CSV 或 JSON 文件。文件只留在这台手机上。')+'</p><div class="grow"></div><input id="obImpFile" type="file" accept=".json,.csv,.txt,application/json,text/csv,text/plain" hidden>';
    cta='<label class="btn" for="obImpFile">'+L('Choose a file','选择文件')+'</label><button class="btn sec" data-act="obnext">'+L('Skip for now','暂时跳过')+'</button>';
  }else if(key==='custom'){
    body='<h1>'+L('Make it yours','按你的习惯来')+'</h1><p class="lede">'+L('Since you’ve fasted before, tell us how your day usually runs. You can change both later in Me.','你以前断食过，告诉我们你一天通常怎么过。这两项以后都能在“我的”里修改。')+'</p><div class="group">'+pkField('obStart',L('Usual start time','通常开始时间'),ob.start||'20:00','t')+'</div><div class="group">'+sw('notify',L('Remind me when I reach my goal','达成目标时提醒我'),S.prefs.notify&&('Notification' in window)&&Notification.permission==='granted',!('Notification' in window))+'</div><div class="grow"></div>';
    cta='<button class="btn" data-act="obnext">'+L('Continue','继续')+'</button>';
  }else if(key==='set'){
    var hereOn=S.place.key==='here';
    body='<h1>'+L('Match the sky to your day','让天空跟着你的一天')+'</h1><p class="lede">'+L('Lightly shows the moon and sun by your local sunrise and sunset. Your location is used on this phone only to work that out. It is never uploaded or shared.','轻伴按你当地的日出日落显示月亮和太阳。位置只在这台手机上用来计算，不会上传，也不会分享。')+'</p>'+
     (hereOn?'<div class="group"><div class="row"><span class="stack"><span>'+L('Using your location','正在使用你的位置')+'</span><small>'+L('Stays on this phone','只留在这台手机上')+'</small></span><span class="v">'+CHECK+'</span></div></div>':'')+
     (!hereOn&&ob.city?'<div class="group">'+pkField('obCity',L('Nearest city','最近的城市'),S.place.key,'sel',Object.keys(C.CITIES).map(function(k){ return [k,C.CITIES[k][S.lang==='zh'?'zh':'en']]; }))+'</div>':'')+
     (flow.indexOf('custom')<0?'<div class="group">'+sw('notify',L('Remind me when I reach my goal','达成目标时提醒我'),S.prefs.notify&&('Notification' in window)&&Notification.permission==='granted',!('Notification' in window))+'</div>':'')+'<div class="grow"></div>';
    cta=hereOn||ob.city?'<button class="btn" data-act="obnext">'+L('Continue','继续')+'</button>'+(hereOn?'':'<button class="btn quiet" data-act="obgeo">'+L('Use my location instead','改用我的位置')+'</button>')
      :'<button class="btn" data-act="obgeo">'+L('Use my location','使用我的位置')+'</button><button class="btn quiet" data-act="obcityshow">'+L('Choose a city instead','改选城市')+'</button>';
  }else if(key==='summary'){
    var rk=obRisky(), pid=rk?'13':(ob.plan||(ob.fasted==='before'?'16':'13')), usual=ob.fasted==='before'&&!rk&&ob.start?ob.start:'', uh=usual?(+usual.split(':')[0]+ +usual.split(':')[1]/60):null;
    body='<div class="ob-hero"><svg viewBox="-70 -70 140 140" aria-hidden="true"><circle r="60" fill="rgba(142,142,147,.16)" stroke="rgba(142,142,147,.5)"/><path d="'+phasePath(.12,60)+'" fill="#E9E3D3"/></svg></div><h1>'+L('You’re set','准备好了')+'</h1>'+
      '<div class="group"><div class="row"><span>'+L('Plan','计划')+'</span><b>'+esc(C.planLabel(C.planById(pid,S.customH)))+'</b></div><div class="row"><span>'+L('Sunrise and sunset','日出日落')+'</span><b>'+esc(placeName())+'</b></div><div class="row"><span>'+L('First fast','第一次断食')+'</span><b>'+(uh!=null?L('Tonight, ','今晚 ')+clockH(uh):L('When you’re ready','准备好时'))+'</b></div></div>'+
      '<p class="gf" style="padding:0 4px">'+(rk?L('Your plan stays at 13:11 and longer fasts stay off. Please talk to your doctor before changing that.','你的计划保持在 13:11，长时间断食保持关闭。要调整前请先咨询医生。'):L('Everything here can be changed later in Me.','这里的一切都可以之后在“我的”里修改。'))+'</p><div class="grow"></div>';
    cta='<button class="btn" data-act="obdone">'+L('Open Lightly','打开 Lightly')+'</button>';
  }
  return '<div class="ob-step" data-i="'+i+'">'+top+body+'<div class="ob-cta">'+cta+'</div></div>';
}
function obRender(dir){
  /* forward pushes from the right; back reverses the same path (spatial symmetry) */
  var box=$('ob'); box.hidden=false; dir=dir||1;
  var html=obHtml(ob.step), tmp=document.createElement('div'); tmp.innerHTML=html; var n=tmp.firstChild; if(dir<0&&box.children.length) n.classList.add('back'); box.appendChild(n);
  var old=[].slice.call(box.children).filter(function(c){return c!==n;});
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ n.style.transition=''; n.classList.remove('back'); n.classList.add('on'); old.forEach(function(o){ o.classList.remove('on'); o.classList.add(dir<0?'out':'past'); setTimeout(function(){ if(o.parentNode) o.parentNode.removeChild(o); },600); }); }); });
  var f=n.querySelector('h1'); if(f){ f.setAttribute('tabindex','-1'); } [].slice.call(n.children).filter(function(c){return !c.classList.contains('ob-top');}).forEach(function(c,i){ c.style.setProperty('--i',i); });
  heroStart();
}
/* refresh a step in place: elements stay put, only changed attributes and text move, so selection states animate instead of flashing */
function morph(o,n){
  if(o.nodeType!==n.nodeType||o.nodeName!==n.nodeName){ o.parentNode.replaceChild(n,o); return; }
  if(o.nodeType===3){ if(o.nodeValue!==n.nodeValue) o.nodeValue=n.nodeValue; return; }
  if(o.nodeType!==1) return;
  if(o.id==='obHero') return;
  var i; for(i=o.attributes.length-1;i>=0;i--){ var an=o.attributes[i].name; if(!n.hasAttribute(an)) o.removeAttribute(an); }
  for(i=0;i<n.attributes.length;i++){ var at=n.attributes[i]; if(o.getAttribute(at.name)!==at.value) o.setAttribute(at.name,at.value); }
  if((o.tagName==='INPUT'||o.tagName==='SELECT')&&document.activeElement!==o) o.value=n.value;
  if(o.childNodes.length!==n.childNodes.length){ o.innerHTML=n.innerHTML; return; }
  for(i=0;i<o.childNodes.length;i++) morph(o.childNodes[i],n.childNodes[i]);
}
function obRefresh(){ var box=$('ob'), c=box.querySelector('.ob-step.on')||box.lastChild; if(!c) return; var tmp=document.createElement('div'); tmp.innerHTML=obHtml(ob.step); var n=tmp.firstChild; if(c.getAttribute('data-i')!==n.getAttribute('data-i')){ n.classList.add('on'); n.style.transition='none'; box.replaceChild(n,c); heroStart(true); return; } c.classList.add('nostagger'); n.className=c.className; var ap=document.activeElement; morph(c,n); heroStart(true); }
function obStart(){ ph.classList.add('onb'); ob={step:0,fasted:null,safe:[],plan:null,start:'20:00'}; $('ob').innerHTML=''; obRender(); }
function obFinish(){
  var risky=ob.safe.length&&ob.safe.indexOf('none')<0;
  S.profile={fastedBefore:ob.fasted==='before',safety:!!risky}; S.planId=risky?'13':(ob.plan||(ob.fasted==='before'?'16':'13')); if(ob.fasted==='before'&&!risky&&ob.start) S.prefs.usualStart=ob.start; S.onboarded=true; S.startedAt=S.startedAt||Date.now(); S.flex.mon=S.flex.mon||C.mondayOf(S.startedAt);
  save(); ph.classList.remove('onb'); $('ob').hidden=true; $('ob').innerHTML=''; applyLang(); cache={}; ticksKey=''; shownP=-1; showTab('today');
}

/* ---------- the welcome moon: it waxes in, breathes, and follows your finger. Drag sideways to change the phase; it springs home. ---------- */
var hero={p:0,t:.3,drag:false,x0:0,pull:0,loop:false,full:false,last:0,pulse:0};
function hq(id){ var st=$('ob').lastElementChild; return st&&st.querySelector('#'+id); }
function heroStart(keep){
  var sv=hq('obHero'); if(!sv) return;
  if(!sv.dataset.on){ sv.dataset.on='1'; sv.style.touchAction='none'; sv.style.cursor='grab';
    sv.addEventListener('pointerdown',function(e){ hero.drag=true; hero.x0=e.clientX; try{ sv.setPointerCapture(e.pointerId); }catch(x){} sv.style.cursor='grabbing'; fx('light'); });
    sv.addEventListener('pointermove',function(e){ if(hero.drag&&!reduce) hero.pull=(e.clientX-hero.x0)/sv.getBoundingClientRect().width; });
    var up=function(){ hero.drag=false; hero.pull=0; sv.style.cursor='grab'; }; sv.addEventListener('pointerup',up); sv.addEventListener('pointercancel',up); }
  if(reduce){ hero.p=.3; hq('obLit').setAttribute('d',phasePath(.3,40)); return; }
  if(!keep) hero.p=0; hero.last=performance.now(); if(!hero.loop){ hero.loop=true; requestAnimationFrame(heroFrame); }
}
function heroFrame(t){
  var lit=hq('obLit'); if(!lit||$('ob').hidden||ob.step!==0){ hero.loop=false; return; }
  var dt=Math.min((t-hero.last)/1000,.05); hero.last=t;
  var breathe=hero.drag?0:Math.sin(t/1000*.9)*.035, target=hero.drag?Math.min(1,Math.max(.04,.3+hero.pull*1.6)):.3+breathe;
  hero.p+=(target-hero.p)*(1-Math.exp(-dt*(hero.drag?18:5)));            /* critically damped: no overshoot */
  lit.setAttribute('d',phasePath(hero.p,40));
  var full=hero.p>.93; if(full&&!hero.full){ hero.pulse=1; fx('success'); } hero.full=full; hero.pulse=Math.max(0,hero.pulse-dt/1.4);
  var h=hq('obHalo'); h.setAttribute('r',(46+14*(1-hero.pulse)).toFixed(1)); h.setAttribute('opacity',(hero.pulse*.8).toFixed(2));
  requestAnimationFrame(heroFrame);
}
/* ---------- click routing ---------- */
var A={
  close:closeSheet,
  lsck:function(b){ b.setAttribute('aria-checked',b.getAttribute('aria-checked')!=='true'); var all=[].slice.call(document.querySelectorAll('#lsChecks .check')); $('lsGo').disabled=!all.every(function(x){return x.getAttribute('aria-checked')==='true';}); },
  lsgo:function(b){ var p=C.planById(b.dataset.p); if(S.cur){ S.planId=p.id; S.cur.planId=p.id; S.cur.goalH=p.fast; S.cur.reached=false; save(); closeSheet(); cache={}; ticksKey=''; updateToday(); scheduleGoal(); } else { S.planId=p.id; save(); beginFast(p,Date.now()); } },
  day:function(b){ selDay=b.dataset.k; fabOn=true; renderDays(); },
  gotoday:function(){ showTab('today'); },
  addday:function(){ fastSheet(null,selDay); },
  cheatday:function(b){ cheatSheet(b.dataset.k); },
  fab:function(){ var l=(C.fastDays(S.fasts)[selDay]||[]).slice().sort(function(a,b){return a.end-b.end;}); if(l.length) fastSheet(l[l.length-1]); else fastSheet(null,selDay); },
  calprev:function(){ var i=calY*12+calM-1; calGo(Math.floor(i/12),((i%12)+12)%12,-1); },
  calnext:function(){ var i=calY*12+calM+1; calGo(Math.floor(i/12),((i%12)+12)%12,1); },
  calpick:function(){ pickY=calY; openSheet(pickHtml(),null,true); },
  pickyear:function(b){ pickY=+b.dataset.y; openSheet(pickHtml(),null,true); },
  pickmonth:function(b){ var i=(+b.dataset.y)*12+(+b.dataset.m), c=calY*12+calM; closeSheet(); calGo(+b.dataset.y,+b.dataset.m,i<c?-1:i>c?1:0); },
  pickthis:function(){ var n=new Date(), i=n.getFullYear()*12+n.getMonth(), c=calY*12+calM; closeSheet(); calGo(n.getFullYear(),n.getMonth(),i<c?-1:i>c?1:0); },
  edit:function(b){ var f=S.fasts.filter(function(x){return x.id===b.dataset.id;})[0]; if(f) fastSheet(f); },
  add:function(b){ fastSheet(null,b.dataset.k); },
  fssave:function(b){ fastSave(b.dataset.id); },
  fsdel:function(b){ var id=b.dataset.id, gone=S.fasts.filter(function(x){return x.id===id;})[0]; S.fasts=S.fasts.filter(function(x){return x.id!==id;}); (S.del=S.del||[]).push(id); save(); closeSheet(); renderDays(); cache={}; updateToday();
    toast(L('Fast deleted.','已删除这次断食。'),gone?function(){ S.del=(S.del||[]).filter(function(x){return x!==id;}); S.fasts.push(gone); save(); cache={}; updateToday(); if(curTab==='days') renderDays(); }:null); },
  toastundo:function(){ var f=toastFn; if(!f) return; toastFn=null; $('toast').classList.remove('on'); f(); fx('light'); },
  usecheat:function(b){ useCheat(b.dataset.k||today()); },
  undocheat:function(b){ var k=(b&&b.dataset.k)||today(), i=S.flex.used.indexOf(k); if(i>=0){ S.flex.used.splice(i,1); S.flex.bank=Math.min(2,S.flex.bank+1); save(); closeSheet(); cache={}; updateToday(); if(curTab==='me') renderMe(); } },
  more:function(){ moreOpen=!moreOpen; planSheet(); },
  pickplan:function(b){ pickPlan(b.dataset.id); },
  geo:function(){ geo(function(){ placeSheet(); }); },
  city:function(b){ setPlace({key:b.dataset.k}); placeSheet(); },
  plan:planSheet, place:placeSheet, cheat:cheatSheet,
  google:function(b){ if(b.disabled) return; var soon=function(){ b.disabled=false; toast(L('Google sign-in is not switched on yet. Email works now.','Google 登录还没开启，现在可用邮箱。')); };
    if(!CL.ready()) return soon(); b.disabled=true;
    CL.providerOn('google').then(function(on){ if(!on) return soon(); location.assign(CL.oauthUrl('google',S)); }).catch(soon); },
  emailsheet:function(){ emailSheet('email'); },
  emback:function(b){ emailSheet('email',b.dataset.e); },
  soon:function(b){ toast(({apple:L('Apple sign-in is coming. Email works now.','Apple 登录即将推出，现在可用邮箱。'),google:L('Google sign-in is coming. Email works now.','Google 登录即将推出，现在可用邮箱。'),wechat:'微信登录会随中国大陆版本推出，现在可用邮箱。',phone:'手机号登录会随中国大陆版本推出，现在可用邮箱。'})[b.dataset.k]); },
  emsend:function(b){ var e=($('emIn').value||'').trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return emailSheet('email',e,L('That doesn’t look like an email address.','这个邮箱地址看起来不对。')); b.disabled=true; b.textContent=L('Sending…','发送中…');
    emCool=Date.now()+60000; CL.sendCode(e,S).then(function(){ emailSheet('sent',e); }).catch(function(x){ emCool=0; emailSheet('email',e,emailErr(x)); }); },
  emresend:function(b){ var e=b.dataset.e; if(Date.now()<emCool) return; emCool=Date.now()+60000; CL.sendCode(e,S).then(function(){ emailSheet('sent',e); toast(L('Sent again.','已重新发送。')); }).catch(function(x){ emCool=0; emailSheet('sent',e,emailErr(x)); }); },
  emverify:function(b){ var e=b.dataset.e, c=($('emCode').value||'').trim(); if(c.length<6) return emailSheet('sent',e,L('Enter the 6-digit code.','请输入 6 位验证码。')); b.disabled=true; b.textContent=L('Checking…','验证中…');
    CL.verify(e,c).then(function(){ closeSheet(); toast(L('Signed in.','已登录。')); renderMe(); syncNow(true); }).catch(function(x){ emailSheet('sent',e,L('That code didn’t work. ','验证码不对：')+x.message); }); },
  signout:function(){ openSheet('<!--keep--><h3>'+L('Sign out?','退出登录？')+'</h3><p class="lede">'+L('Your fasts stay on this phone and in your account. You can sign back in any time.','记录会保留在这台手机和你的账号里，随时可以重新登录。')+'</p><div class="btns"><button class="btn dark" data-act="signoutok">'+L('Sign out','退出登录')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>'); },
  signoutok:function(){ CL.signOut(); sync.at=0; sync.err=''; closeSheet(); renderMe(); },
  syncnow:function(){ syncNow(false); },
  lang:function(b){ S.lang=b.dataset.v; save(); applyLang(); cache={}; if(!$('ob').hidden){ obRefresh(); } else renderMe(); updateToday(); },
  choice:function(b){ choiceSheet(b.dataset.k); },
  pick:function(b){ var f=A[b.dataset.k]; if(f) f(b); if(b.dataset.k!=='theme') setTimeout(closeSheet,180); /* appearance stays open so you can see the change behind it */ },
  theme:function(b){ S.theme=b.dataset.v; save(); switchTheme(function(){ applyTheme(); renderMe(); [].forEach.call(sheetEl.querySelectorAll('[data-act=pick][data-k=theme]'),function(x){ x.classList.toggle('sel',x.dataset.v===S.theme); });
    chrome(); }); },
  sw:function(b){ var k=b.dataset.k, on=b.getAttribute('aria-checked')!=='true';
    if(k==='notify') return setNotify(on,function(){ if(!$('ob').hidden) obRefresh(); else renderMe(); });
    if(k==='ram'){ S.ramadanPreview=on; save(); return renderMe(); }
    S.prefs[k]=on; save(); if(k==='d3'&&orb) orb.set(on); b.setAttribute('aria-checked',on); if(k==='sound'&&on) sChime(); else fx('light'); },
  timeoff:timeOffSheet,
  offtravel:function(){ offDays=offDays||3; offTravelSheet(); },
  offdays:function(b){ offDays=Math.max(1,Math.min(C.OFF_MAX,offDays+(+b.dataset.d))); offTravelSync(); },
  offset:function(b){ offDays=+b.dataset.n; offTravelSync(); },
  offback:timeOffSheet,
  offgo:function(b){ startOff(b.dataset.k,b.dataset.k==='unwell'?14:offDays); },
  offunwell:offUnwellSheet,
  offend:endOff,
  diag:function(){ var vv=window.visualViewport; toast('win '+innerWidth+'×'+innerHeight+' · screen '+screen.width+'×'+screen.height+' · vv '+(vv?Math.round(vv.width)+'×'+Math.round(vv.height):'-')+' · ph '+ph.offsetHeight+' · '+(navigator.standalone?'home screen':'browser')); },
  import:function(){ importSheet(); },
  impdo:function(){ importDo(); },
  export:function(){ try{ var blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='lightly-fasts-'+today()+'.json'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500); }catch(e){ toast(L('Couldn’t export.','导出失败。')); } },
  erase:function(){ openSheet('<!--keep--><h3>'+L('Erase everything?','清除所有数据？')+'</h3><p class="lede">'+L('This deletes your fasts, streak and settings from this phone. It can’t be undone.','这会删除这台手机上的断食记录、连续天数和设置，无法撤销。')+'</p><div class="btns"><button class="btn red" data-act="eraseok">'+L('Erase everything','清除所有数据')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>'); },
  eraseok:function(){ try{ localStorage.removeItem(KEY); }catch(e){} S=fresh(); storageOk=true; location.reload(); },
  usualset:function(){ S.prefs.usualStart='20:00'; save(); cache={}; updateToday(); renderMe(); pkToggle('usualStart'); },
  pktog:function(b){ pkToggle(b.dataset.id); },
  tstyle:function(b){ S.prefs.timerStyle=b.dataset.v; ph.dataset.ts=b.dataset.v; save(); renderMe(); cache={}; fitDisc(); },
  obnext:function(){ if(ob.step<obFlow().length-1){ ob.step++; obRender(); } },
  obback:function(){ if(ob.step>0){ ob.step--; obRender(-1); } },
  obopt:function(b){ ob.fasted=b.dataset.v; obRefresh(); },
  obsafe:function(b){ var v=b.dataset.v, i=ob.safe.indexOf(v); if(v==='none') ob.safe=i>=0?[]:['none']; else{ ob.safe=ob.safe.filter(function(x){return x!=='none';}); if(i>=0) ob.safe.splice(ob.safe.indexOf(v),1); else ob.safe.push(v); } obRefresh(); },
  obplan:function(b){ if(b.disabled) return; ob.plan=b.dataset.id; obRefresh(); },
  obgeo:function(){ geo(function(ok){ if(!ok) ob.city=true; obRefresh(); }); },
  obcityshow:function(){ ob.city=true; obRefresh(); },
  obdone:obFinish
};
document.addEventListener('click',function(e){ var b=e.target.closest('[data-act]'); if(!b||!ph.contains(b)) return; var f=A[b.dataset.act]; if(f){ if(b.tagName==='BUTTON'&&b.disabled) return; f(b); } });
document.addEventListener('change',function(e){ var t=e.target; if(!t.dataset||!t.dataset.chg) return;
  if(t.dataset.chg==='custom'){ var v=Math.min(23,Math.max(12,Math.round(+t.value)||16)); S.customH=v; S.planId='custom'; if(S.cur){ S.cur.planId='custom'; S.cur.goalH=v; } save(); cache={}; ticksKey=''; updateToday(); planSheet(); }
  });
/* the real viewport height, so a Home Screen launch fills the glass edge to edge on every phone (ignored while the keyboard is up) */
(function(){ var sa=document.createElement('div'); sa.setAttribute('aria-hidden','true'); sa.style.cssText='position:absolute;left:0;top:0;width:0;visibility:hidden;pointer-events:none;padding:var(--sat) 0 var(--sab)'; ph.appendChild(sa); function fit(){ var a=document.activeElement; if(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
    ph.style.setProperty('--app-h',Math.round(window.innerHeight)+'px'); ph.classList.toggle('tight',window.innerHeight-sa.offsetHeight<=600); }
  fit(); window.addEventListener('resize',fit); window.addEventListener('orientationchange',function(){ setTimeout(fit,200); }); window.addEventListener('pageshow',fit); })();
/* scrolling down gives the screen to the content; scrolling up (or reaching the top) brings the tab bar back */
(function(){ var last={}, acc={};
  ['today','days','me'].forEach(function(id){ var e=$(id); last[id]=0; acc[id]=0;
    e.addEventListener('scroll',function(){ var y=e.scrollTop, d=y-last[id]; last[id]=y; if(y<0||y>e.scrollHeight-e.clientHeight+1) return;
      if(y<24){ ph.classList.remove('tabs-off'); acc[id]=0; return; }
      if((d>0)!==(acc[id]>0)) acc[id]=0; acc[id]+=d;
      if(acc[id]>28) ph.classList.add('tabs-off'); else if(acc[id]<-12) ph.classList.remove('tabs-off'); },{passive:true}); }); })();
$('tabs').addEventListener('click',function(e){ var b=e.target.closest('button[data-tab]'); if(b){ if(b.dataset.tab!==curTab) fx('light'); showTab(b.dataset.tab); } });
$('streakBtn').addEventListener('click',cheatSheet);
$('planBtn').addEventListener('click',planSheet);
(function(){ var b=$('readBig'); b.addEventListener('click',function(){ if(!S.cur||(Date.now()-S.cur.start)/H>=S.cur.goalH) return; S.prefs.showElapsed=!S.prefs.showElapsed; save(); cache={}; bigStr=''; updateToday(); fx('light'); }); })();
$('endA').addEventListener('click',function(){ if(S.cur) startEdit(); else if(mode==='eat'&&lastFast()) fastSheet(lastFast()); });
function startEdit(){
  var cur=S.cur, now=Date.now();
  openSheet('<h3>'+L('When did you start?','你是什么时候开始的？')+'</h3><p class="lede">'+L('Forgot to press start? Set the real time.','忘了按开始？在这里改成真实时间。')+'</p><div class="group">'+pkField('stS',L('Started','开始'),cur.start,'dt')+'</div><div class="btns"><button class="btn" data-act="stsave">'+L('Save','保存')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>');
}
A.stsave=function(){ var s=+pkVal('stS'), now=Date.now(); if(!isFinite(s)||s>now) return toast(L('The start can’t be in the future.','开始时间不能在未来。')); if(now-s>72*H) return toast(L('That’s more than 72 hours ago.','这超过了 72 小时。'));
  var clash=S.fasts.some(function(f){ return s<f.end&&now>f.start; }); if(clash) return toast(L('That overlaps another fast.','和另一次断食时间重叠了。'));
  S.cur.start=s; S.cur.reached=(now-s)/H>=S.cur.goalH; save(); closeSheet(); cache={}; shownP=-1; updateToday(); scheduleGoal(); };
/* the endA label doubles as a button */
(function(){ var a=$('endA'); a.setAttribute('role','button'); a.tabIndex=0; a.style.cssText='display:inline-flex;align-items:center;min-height:44px;cursor:pointer'; a.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(S.cur) startEdit(); else if(mode==='eat'&&lastFast()) fastSheet(lastFast()); } });
  $('endB').style.cssText='display:inline-flex;align-items:center;min-height:44px'; })();

/* ---------- boot ---------- */
(function stars(){ var o='', s=7; function r(){ s=(s*9301+49297)%233280; return s/233280; } for(var i=0;i<70;i++) o+='<circle cx="'+(r()*390).toFixed(0)+'" cy="'+(r()*400).toFixed(0)+'" r="'+(0.6+r()*1.1).toFixed(1)+'" opacity="'+(0.3+r()*0.6).toFixed(2)+'"/>'; $('stars').innerHTML=o; })();
/* the moon hides the stars behind it, and none sit on the words: stars that fall on the disc or on the readout fade out, and come back when it moves */
var starSig='';
function clearStars(){ var svg=$('stars'), dr=$('disc').getBoundingClientRect(); if(!svg||dr.width<2) return;
  var ids=['sub','readK','readBig','readAlt','readTip','endA','endB'], sig=ids.map(function(i){ return i==='readBig'?$(i).textContent.length:$(i).textContent; }).join('|')+'|'+dr.width.toFixed(0)+'|'+dr.top.toFixed(0)+'|'+innerWidth+'x'+innerHeight; if(sig===starSig) return; starSig=sig;
  var zones=ids.map(function(i){ var rg=document.createRange(); rg.selectNodeContents($(i)); var r=rg.getBoundingClientRect(); return r.width>1&&r.height>1?{l:r.left-10,r:r.right+10,t:r.top-6,b:r.bottom+6}:null; }).filter(Boolean),
    cx=dr.left+dr.width/2, cy=dr.top+dr.height/2, rad=dr.width*84/236+5;
  Array.prototype.forEach.call(svg.querySelectorAll('circle'),function(c){ var r=c.getBoundingClientRect(), x=(r.left+r.right)/2, y=(r.top+r.bottom)/2;
    var hid=(x-cx)*(x-cx)+(y-cy)*(y-cy)<rad*rad||zones.some(function(z){ return x>z.l&&x<z.r&&y>z.t&&y<z.b; });
    if(hid) c.style.opacity='0'; else c.style.removeProperty('opacity'); }); }
var dsNow=1;
/* the disc gives way first: it shrinks until the streak card and the button both fit above the tab bar */
function fitDisc(){ var t=$('today'); if(curTab!=='today'||!t.clientHeight) return; var free=$('gap').offsetHeight-14, over=t.scrollHeight-t.clientHeight, d=(free>0?free:0)-(over>0?over:0);
  if(Math.abs(d)<2) return; var n=Math.max(ph.classList.contains('tight')?.3:.4,Math.min(1,dsNow+d/236)); if(Math.abs(n-dsNow)<.004) return; dsNow=n; $('discWrap').style.setProperty('--ds',n.toFixed(3)); }
window.addEventListener('resize',fitDisc);
if(S.onboarded) normalisePlan();
(function(){ var ti=['today','days','me'].indexOf(curTab||'today'); ph.style.setProperty('--ti',ti<0?0:ti); })();
if(S.prefs.timerStyle==='c') S.prefs.timerStyle='b';
ph.dataset.ts=S.prefs.timerStyle||'b';
applyTheme(); applyLang(); initCal(); initOrb(); fitDisc(); flexTick(); checkUnlocks();
chrome(); fitScreen();
['resize','orientationchange','pageshow'].forEach(function(e){ window.addEventListener(e,function(){ fitScreen(); chrome(); }); });
if(window.matchMedia){ var mq=matchMedia('(prefers-color-scheme:dark)'); if(mq.addEventListener) mq.addEventListener('change',function(){ setTimeout(chrome,50); }); }
var carried=CL&&CL.takeCarried&&CL.takeCarried(), returning=/access_token=|error=/.test(location.hash);
if(carried&&!S.onboarded){ applyRemote(carried); applyTheme(); applyLang(); }
/* coming back through a sign-in link: let the account restore first, so onboarding never flashes for someone who already did it */
if(!S.onboarded&&!(returning&&CL&&CL.ready())){ updateToday(); obStart(); } else if(S.onboarded){ showTab('today'); }
scheduleGoal();
if(CL&&CL.ready()){ window.addEventListener('storage',function(ev){ if(ev.key===CL.AK&&ev.newValue){ closeSheet(); renderMe(); toast(L('Signed in.','已登录。')); syncNow(true); } });
  CL.fromHash().then(function(a){ if(a){ closeSheet(); toast(L('Signed in.','已登录。')); if(S.onboarded) showTab('me'); } }).catch(function(x){ if(x&&x.linkError){ showTab('me'); toast(/expired|otp/i.test(x.linkError+x.message)?L('That link expired or was already used. Send a new one.','链接已过期或已用过，请重新发送。'):L('Couldn’t sign in with that link. Send a new one.','这个链接登录失败，请重新发送。')); } }).then(function(){ return cloudOn()?syncNow(true):null; }).then(function(){ if(!S.onboarded&&$('ob').hidden){ updateToday(); obStart(); } }); }

/* a shooting star now and then, only under a night sky; one at a time, never with Reduce Motion, never over a sheet or onboarding */
(function(){ var NS='http://www.w3.org/2000/svg', svg=$('stars'); if(!svg) return;
  var defs=document.createElementNS(NS,'defs'); defs.innerHTML='<linearGradient id="shootG" gradientUnits="userSpaceOnUse" x1="-52" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient>'; svg.insertBefore(defs,svg.firstChild);
  function dark(){ return /night|first|evening/.test(ph.getAttribute('data-sky')); }
  function shoot(force){
    if(reduce||!svg.animate) return false;
    if(!force&&(document.hidden||curTab!=='today'||!dark()||sheetOpen||!$('ob').hidden)) return false;
    var dir=Math.random()<.5?-1:1, x=dir<0?150+Math.random()*200:40+Math.random()*200, y=24+Math.random()*120, ang=(16+Math.random()*16)*Math.PI/180, dist=170+Math.random()*110;
    var g=document.createElementNS(NS,'g'), l=document.createElementNS(NS,'line');
    g.setAttribute('transform','translate('+x.toFixed(1)+' '+y.toFixed(1)+') rotate('+(dir<0?180-(ang*180/Math.PI):ang*180/Math.PI).toFixed(1)+')');
    l.setAttribute('x1','-52'); l.setAttribute('x2','0'); l.setAttribute('stroke','url(#shootG)'); l.setAttribute('stroke-width','1.6'); l.setAttribute('stroke-linecap','round'); l.setAttribute('class','shoot');
    g.appendChild(l); svg.appendChild(g);
    var an=l.animate([{transform:'translateX(0)',opacity:0},{opacity:1,offset:.15},{opacity:.9,offset:.6},{transform:'translateX('+dist.toFixed(0)+'px)',opacity:0}],{duration:800+Math.random()*450,easing:'cubic-bezier(.4,0,.7,1)'});
    an.onfinish=function(){ if(g.parentNode) g.parentNode.removeChild(g); }; return true;
  }
  function plan(first){ setTimeout(function(){ shoot(); plan(); },(first?7000+Math.random()*8000:22000+Math.random()*38000)); }
  window.lightlyShoot=shoot; plan(true);
})();
var lastT=performance.now(), lastSec=0, frame=0;
function loop(t){
  var dt=Math.min((t-lastT)/1000,.1); lastT=t; frame++;
  if(!document.hidden&&curTab==='today'&&$('ob').hidden){ var sn=Math.floor(Date.now()/1000); if(sn!==lastSec){ lastSec=sn; updateToday(); clearStars(); } if(reduce?frame%6===0:(frame%2===0||boost>0||Math.abs(shownP-tgtP)>.001||Math.abs(tiltX)>.01||Math.abs(tiltY)>.01||tgtX||tgtY)) drawDisc(dt*(reduce?6:2)); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.addEventListener('visibilitychange',function(){ if(!document.hidden){ var dk=today(); if(cloudOn()&&Date.now()-sync.at>60000) syncNow(true); flexTick(); if(curTab==='today'){ tipUntil=Date.now()+6000; cache={}; updateToday(); } scheduleGoal(); } });
if('serviceWorker' in navigator&&location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(function(){});
window.__lightly={get state(){return S;},tick:updateToday,core:C};
})();
