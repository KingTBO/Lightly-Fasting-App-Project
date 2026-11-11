/* Lightly: the app. State lives in localStorage; a fast is just a start time, so it survives reloads and closed tabs. */
(function(){
'use strict';
var C=window.LightlyCore, H=C.H, D=C.D, KEY='lightly:v1';
function $(i){return document.getElementById(i);}
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- state ---------- */
function tzGuess(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone; }catch(e){ return ''; } }
function fresh(){ return {v:1,lang:/^zh/i.test(navigator.language||'')?'zh':'en',theme:'auto',onboarded:false,profile:{fastedBefore:null,safety:false,care:[],careOff:null,careUndo:null},
  planId:'16',customH:16,avatar:null,name:null,place:{key:C.guessCity(tzGuess())},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},off:[],unwell:null,unlocked:{},
  prefs:{sound:true,haptics:true,d3:true,notify:false},ramadanPreview:false,body:null,startedAt:null,mod:0,del:[]}; }
var S=fresh(), storageOk=true;
function load(){
  try{ var raw=localStorage.getItem(KEY); if(raw){ var o=JSON.parse(raw), f=fresh(); for(var k in f) if(o[k]!==undefined) S[k]=o[k];
    ['profile','flex','prefs','unlocked'].forEach(function(k){ S[k]=Object.assign({},f[k],o[k]||{}); });
    if(!Array.isArray(S.fasts)) S.fasts=[]; if(!Array.isArray(S.flex.used)) S.flex.used=[]; if(!Array.isArray(S.off)) S.off=[]; careMigrate(); } }
  catch(e){ storageOk=false; }
}
/* Care mode keeps the three health answers in profile.care (profile.safety is true while any is ticked). People who answered before Care mode existed have safety true and no list: they are 'earlier'. */
function careMigrate(){ var P=S.profile; if(!P) return; if(!Array.isArray(P.care)) P.care=[]; if(P.safety&&!P.care.length) P.care=['earlier']; P.safety=P.care.length>0; if(P.careOff===undefined) P.careOff=null; if(P.careUndo===undefined) P.careUndo=null; }
var saveT=0;
var quiet=false;
function save(){ if(!quiet) S.mod=Date.now(); clearTimeout(saveT); saveT=setTimeout(saveNow,60); if(!quiet){ cloudSoon(); if(FUI) FUI.changed(); } }
function saveNow(){ try{ localStorage.setItem(KEY,JSON.stringify(S)); }catch(e){ storageOk=false; } }
window.addEventListener('pagehide',saveNow);
load();

/* ---------- language ---------- */
function L(en,zh){ return S.lang==='zh'?zh:en; }
function esc(s){ return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function loc(){ return S.lang==='zh'?'zh-CN':'en-US'; }
function clockMs(ms){ var d=new Date(ms); return clockH(d.getHours()+d.getMinutes()/60); }
/* 24-hour clock everywhere (08:30, 20:05), the same in English and Chinese: no AM/PM and no 上午/下午, which not everyone reads the same way */
function clockH(h){ h=((h%24)+24)%24; var hh=Math.floor(h), mm=Math.round((h-hh)*60); if(mm===60){mm=0;hh=(hh+1)%24;}
  return (hh<10?'0':'')+hh+':'+(mm<10?'0':'')+mm; }
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
function care(){ return C.careOn(S.profile); }
/* a line that differs in Care mode (no streaks there) */
function LC(en,zh,enc,zhc){ return care()?L(enc,zhc):L(en,zh); }
function inRamadan(){ return !care()&&(C.ramadanDay()>0||S.ramadanPreview); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function curStreak(){ return C.streak(streakFasts(),S.flex.used.concat(C.offKeys(S.off))); }
function checkUnlocks(){ [24,36].forEach(function(k){ var r=C.longStatus(k,S.profile,{fasts:S.fasts,unwell:S.unwell,unlocked:S.unlocked}); if((r.st==='ok'||r.st==='wait'||r.st==='paused')&&!S.unlocked[k]){ S.unlocked[k]=Date.now(); save(); } }); }
function usualTxt(){ var t=(S.prefs.usualStart||'20:00').split(':'); var d=new Date(); d.setHours(+t[0],+t[1],0,0); return clockMs(d.getTime()); }
function pst(id){ return C.planStatus(id,S.profile,{fasts:S.fasts}); }
function planOk(id){ var s=pst(id).st; return s==='ok'||s==='soft'; }   /* can be picked (a soft plan carries a warning) */
function planEarned(id){ return pst(id).st==='ok'; }   /* open without a warning */
function normalisePlan(){ if(S.planId==='ramadan') return; if(planOk(S.planId)) return; var best=['20','18','16','13'].filter(planEarned)[0]||'13'; S.planId=best; save(); }
function overTxt(h){ var m=Math.max(0,Math.round(h*60)); return S.lang==='zh'?'超出目标 '+hmTxt(m):hmTxt(m)+' past your goal'; }
function longSt(k){ checkUnlocks(); return C.longStatus(k,S.profile,{fasts:S.fasts,unwell:S.unwell,unlocked:S.unlocked}); }

/* ---------- sound and haptics (tiny synthesized tones; the page follows the phone's silent switch) ---------- */
var ac=null;
function actx(){ if(!S.prefs.sound) return null; try{ if(!ac){ var A=window.AudioContext||window.webkitAudioContext; if(!A) return null; ac=new A(); } if(ac.state==='suspended') ac.resume(); }catch(e){ return null; } return ac; }
function tone(f,dur,vol,type,at){ var c=actx(); if(!c) return; var t=c.currentTime+(at||0), o=c.createOscillator(), g=c.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur+.02); }
/* the wheel's tick: the stock Android UI "tick" (AOSP Effect_Tick, Apache-2.0, sounds/wheel-tick.wav; Apple's own picker sound is not ours to use).
   Until it has loaded (first time only) a short synthesized click stands in. It is quiet and follows the Sound setting like every sound. */
var tickBuf=null, tickLoad=0, clickBuf=null;
function loadTick(c){ if(tickLoad||!c||!window.fetch) return; tickLoad=1;
  fetch('sounds/wheel-tick.wav').then(function(r){ return r.arrayBuffer(); }).then(function(a){ return new Promise(function(ok,no){ c.decodeAudioData(a,ok,no); }); }).then(function(b){ tickBuf=b; }).catch(function(){ tickLoad=0; }); }
function sTick(){ var c=actx(); if(!c) return; loadTick(c);
  var t=c.currentTime, src=c.createBufferSource(), g=c.createGain();
  if(tickBuf){ src.buffer=tickBuf; g.gain.value=.7; src.connect(g); g.connect(c.destination); src.start(t); return; }
  if(!clickBuf){ var n=Math.floor(c.sampleRate*.02), d; clickBuf=c.createBuffer(1,n,c.sampleRate); d=clickBuf.getChannelData(0); for(var i=0;i<n;i++) d[i]=(Math.random()*2-1)*Math.exp(-i/(c.sampleRate*.0025)); }
  var f=c.createBiquadFilter(); src.buffer=clickBuf; f.type='bandpass'; f.frequency.value=2600; f.Q.value=.9; g.gain.value=.22; src.connect(f); f.connect(g); g.connect(c.destination); src.start(t); }
/* load the real tick on the first touch of the page, so even the very first tick (a profile picture tap, say) is the Android tick and not the stand-in click */
function warmTick(){ if(tickBuf||tickLoad) return; var c=actx(); if(c) loadTick(c); }
document.addEventListener('pointerdown',warmTick,true); document.addEventListener('keydown',warmTick,true);
function sChime(){ tone(1318.5,1.4,.06); tone(1975.5,1.6,.04,'sine',.09); tone(2637,1.2,.02,'sine',.18); }
/* Android and desktop Chrome can vibrate from the web. iPhone Safari cannot (no navigator.vibrate and no haptics API at all), but Safari 17.4+ plays a small tap
   when an <input type=checkbox switch> is toggled, so on iPhone we toggle a fresh, invisible one with a label click. It is a hack: it has only been seen to work
   inside a real touch event (so the wheel ticks from the pointermove handler, while the finger is down), not from timers, and not while the wheel coasts. */
var IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function iosTap(){ if(!IOS||navigator.vibrate) return false;
  try{ var l=document.createElement('label'), i=document.createElement('input'); l.setAttribute('aria-hidden','true');
    l.style.cssText='position:fixed;left:0;top:0;width:44px;height:26px;opacity:.01;pointer-events:none;z-index:-1'; i.type='checkbox'; i.setAttribute('switch',''); i.tabIndex=-1; l.appendChild(i);
    document.body.appendChild(l); l.click(); setTimeout(function(){ if(l.parentNode) l.parentNode.removeChild(l); },150); return true; }catch(e){ return false; } }
function canTick(){ return !!navigator.vibrate||IOS; }
function buzz(p){ if(!S.prefs.haptics) return; try{ if(navigator.vibrate) navigator.vibrate(p); else iosTap(); }catch(e){} }
/* one fixed vocabulary, so the same thing always feels the same:
   select = a wheel detent, light = a touch or toggle, hour = the hour turns, medium = a fast starts or a hold completes,
   success = the goal is reached, or an import adds fasts (its soft chime is the biggest sound; the wheels also make a very quiet tick, see sTick), nope = a gentle "not now" (two light taps, no sound), warn = a three-pulse buzz when a sheet asks you to check a change. Nothing fires on routine saves. */
var FX={select:3,light:6,hour:8,medium:14,success:[30,60,30],nope:[8,70,8],warn:[22,50,22,50,34]};
function fx(k){ buzz(FX[k]); if(k==='success') sChime(); else if(k==='select') sTick(); }

/* ---------- toast, sheet ---------- */
var toastT=0;
var toastFn=null;
/* tester switch: this phone only (never in the saved state or the cloud backup). Tap the version line 7 times in a row to turn it on or off. It shows the Ramadan preview switch and makes a tap on the version line show the screen sizes. */
var TESTER_KEY='lightly:tester', testerTaps=0, testerT=0;
function isTester(){ try{ return localStorage.getItem(TESTER_KEY)==='1'; }catch(e){ return false; } }
function setTester(on){ try{ if(on) localStorage.setItem(TESTER_KEY,'1'); else localStorage.removeItem(TESTER_KEY); }catch(e){ return false; } return true; }
function toast(msg,undo){ var t=$('toast'); toastFn=undo||null; t.textContent=msg; t.classList.toggle('has-undo',!!undo);
  if(undo){ var b=document.createElement('button'); b.type='button'; b.className='tundo'; b.dataset.act='toastundo'; b.textContent=L('Undo','撤销'); t.appendChild(b); }
  t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('on'); toastFn=null; },undo?5600:3400); }
var sheetEl=$('sheet'), scrim=$('scrim'), sheetOpen=false, sheetBack=null;
var sheetFrom=null, BEHIND=['today','days','friends','me','tabs'];
function setInert(v){ BEHIND.forEach(function(id){ var e=$(id); if(v) e.setAttribute('inert',''); else e.removeAttribute('inert'); }); }
/* one sheet pattern: the title row carries the dismiss (a round X, same as the concept page); a sheet keeps one primary button and no Cancel, Close or Done pill.
   Start a sheet with <!--keep--> to leave its buttons alone (confirmations that must be answered). */
var SHX='<button type="button" class="x" data-act="close" aria-label="Close"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button>';
function shChrome(html){ if(!/^<h3[ >]/.test(html)) return html; var i=html.indexOf('</h3>')+5;
  return ('<div class="sh-h">'+html.slice(0,i)+SHX.replace('aria-label="Close"','aria-label="'+L('Close','关闭')+'"')+'</div>'+html.slice(i)).replace(/<button class="btn sec" data-act="close">[^<]*<\/button>/g,'').replace('<div class="btns"></div>',''); }
function openSheet(html,back,float){ if(!float) html=shChrome(html); if(!sheetOpen) sheetFrom=document.activeElement; var again=sheetOpen; sheetEl.classList.toggle('float',!!float); sheetEl.classList.remove('pop'); scrim.classList.remove('peek'); sheetEl.innerHTML='<div class="grab"></div>'+html; sheetEl.scrollTop=0; sheetEl.classList.add('open'); scrim.classList.add('on'); sheetOpen=true; sheetBack=back||null; setInert(true);
  sheetEl.setAttribute('aria-label',(sheetEl.querySelector('h3')||{}).textContent||''); sheetEl.tabIndex=-1; if(!again) sheetEl.focus({preventScroll:true}); }
var sheetHold=false; /* true for the short pause before the import result rises: taps on the dim must not close it (a double tap on Add lands there) */
function closeSheet(){ if(!sheetOpen||sheetHold) return; impZip=null; dropCrop(); sheetEl.classList.remove('open'); scrim.classList.remove('on'); sheetOpen=false; sheetBack=null; setInert(false); var f=sheetFrom; sheetFrom=null; if(f&&document.contains(f)&&f.offsetParent!==null) try{ f.focus({preventScroll:true}); }catch(e){} }
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

/* Some iPhones give a Home Screen app a page about 62 pt shorter than the screen, and nothing can be drawn below it. The home indicator is then below the page, so there is no bottom inset to keep clear of. */
function shortPage(){ var root=document.documentElement, st=window.navigator.standalone||(window.matchMedia&&matchMedia('(display-mode:standalone)').matches), gap=Math.max(screen.height||0,screen.width||0)-window.innerHeight;
  shortPg=!!(st&&window.innerWidth<600&&window.innerHeight>window.innerWidth&&gap>20&&gap<140);
  if(shortPg) root.style.setProperty('--sab','0px'); else root.style.removeProperty('--sab'); root.classList.toggle('short',shortPg); }
var shortPg=false; /* true on an iPhone Home Screen app whose page iOS made shorter than the screen (WebKit bug 313800): a strip is left below the page, and the only thing the page controls there is its colour */
/* any CSS colour as [r,g,b,a] */
var colP=null;
function rgbaOf(s){ s=(s||'').trim(); if(!s) return null; var m=/^rgba?\(([^()]+)\)$/.exec(s), p;
  if(m){ p=m[1].split(/[\s,\/]+/).map(parseFloat); return [p[0],p[1],p[2],p.length>3&&!isNaN(p[3])?p[3]:1]; }
  m=/^color\(srgb ([^()]+)\)$/.exec(s); if(m){ p=m[1].split(/[\s\/]+/).map(parseFloat); return [p[0]*255,p[1]*255,p[2]*255,p.length>3&&!isNaN(p[3])?p[3]:1]; }
  if(!colP){ colP=document.createElement('i'); colP.hidden=true; colP.setAttribute('aria-hidden','true'); ph.appendChild(colP); }
  colP.style.color=''; colP.style.color=s; if(!colP.style.color) return null; var c=getComputedStyle(colP).color; return c===s?null:rgbaOf(c); }
function bgOf(el){ var s=getComputedStyle(el), g=/gradient\(/.test(s.backgroundImage)?(s.backgroundImage.match(/(?:rgba?|color)\([^()]*\)/g)||[]).pop():null; return rgbaOf(g||s.backgroundColor); }   /* a gradient counts as its last colour, the one at the bottom */
/* the colour along the bottom edge of the page right now: the last colour of the Today sky, the page colour on the other tabs, and whatever sheet, dim or recap lies over that edge */
function edgeColour(top){
  var base=rgbaOf(top)||[14,20,48,1], onb=ph.classList.contains('onb'), over=[], i, col;
  if(onb){ var bgEl=ph.querySelector('.ob-step.on .dawnbg'); if(bgEl){ col=bgOf(bgEl); if(col){ col[3]*=parseFloat(getComputedStyle(bgEl).opacity)||0; over.push(col); } } }
  else if(curTab==='today'&&!holding) base=rgbaOf(getComputedStyle(ph).getPropertyValue('--sky2'))||base;
  var els=document.elementsFromPoint?document.elementsFromPoint(Math.round(window.innerWidth/2),window.innerHeight-1):[], rep=$('report'), up=[];
  for(i=0;i<els.length;i++){ var el=els[i]; if(el===ph||!ph.contains(el)) break; var lay=el; while(lay.parentNode!==ph) lay=lay.parentNode;
    if(lay!==scrim&&lay!==sheetEl&&lay!==rep) continue; if(lay===sheetEl&&el!==sheetEl) continue;   /* a sheet counts as its own background, not the rows inside it */
    col=bgOf(el); if(!col||!col[3]) continue; var o=parseFloat(getComputedStyle(lay).opacity); col[3]*=isNaN(o)?1:o; up.push(col); if(col[3]>=.999) break; }
  over=up.concat(over);   /* topmost first */
  for(i=over.length-1;i>=0;i--){ var a=over[i][3]; base=[0,1,2].map(function(k){ return over[i][k]*a+base[k]*(1-a); }); }
  return 'rgb('+Math.round(base[0])+','+Math.round(base[1])+','+Math.round(base[2])+')'; }
/* follow a change for a moment: the sky's last colour glides for 1.2 s, a sheet takes half a second to rise or leave */
var chN=0, chT=0;
function chromeFor(ms){ if(!shortPg) return; chN=Math.max(chN,Math.ceil(ms/50)); if(chT) return; (function f(){ chT=0; chrome(); if(chN-->0) chT=setTimeout(f,50); })(); }
var holding=false; /* true while a sign-in link is being processed: a neutral screen, never Today */
function chrome(){ /* the colour behind the app (page background, status bar, home-indicator area) always matches the screen on top of it */
  var onb=ph.classList.contains('onb'), st=onb?ph.querySelector('.ob-step.on'):null, c=(onb&&st?getComputedStyle(st).backgroundColor:(curTab==='today'&&!holding&&!onb?getComputedStyle(ph).getPropertyValue('--sky'):getComputedStyle(document.documentElement).getPropertyValue('--bg'))).trim();
  if(!c||c==='transparent'||/rgba\(.*,\s*0\)$/.test(c)) c=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()||'#0E1430';
  if(shortPg) c=edgeColour(c);   /* the strip iOS leaves under a short page continues the bottom of the screen, not the top of the sky */
  document.documentElement.style.backgroundColor=c; document.body.style.backgroundColor=c;
  var m=document.querySelector('meta[name=theme-color]'); if(m&&m.getAttribute('content')!==c) m.setAttribute('content',c); }
function setSky(k){ if(ph.getAttribute('data-sky')!==k){ ph.setAttribute('data-sky',k); chrome(); } }

/* the small moon or sun beside the stage name, drawn with the same gradients as the disc */
function skyGlyph(moon){ return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="url(#'+(moon?'gMoon':'gSun')+')" stroke="var(--rim)" stroke-width=".8"/>'+(moon?'<circle cx="8.6" cy="9.4" r="2.1" fill="rgba(60,50,30,.10)"/><circle cx="14.6" cy="14.6" r="2.8" fill="rgba(60,50,30,.09)"/><circle cx="14" cy="7.4" r="1.2" fill="rgba(60,50,30,.08)"/>':'')+'</svg>'; }
function updateToday(){
  careTick(); nowMs=Date.now(); var now=nowMs; refreshSun(now); planTimes();
  var hp=C.placeHour(pi,now), sk=C.skyAt(hp,sun), p=plan(), cur=S.cur, le=lastFast();
  moonV=C.moonAmt(hp,sun);
  mode=cur?'fast':(le&&now-le.end<eatH(le)*H?'eat':'idle');
  var offA=offNow(), brk=!!offA&&!cur, chd=cheatToday(); if(brk||chd) mode='idle';
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
  /* sky pill: the stage and what the sky does next. While you fast or eat the progress line already shows the turn's clock time (not in Ramadan), so the pill counts down instead */
  var turnAt=moonNow?sun.rise:sun.set, countDown=(mode==='fast'||mode==='eat')&&!(cur&&cur.planId==='ramadan')&&!(S.planId==='ramadan'), left=Math.max(1,Math.round((((turnAt-hp)%24+24)%24)*60));
  if(cache.skgs!==(moonNow?'m':'s')){ cache.skgs=moonNow?'m':'s'; $('skyG').innerHTML=skyGlyph(moonNow); $('skyG').className='sg '+(moonNow?'moon':'sun'); }
  put($('skyStage'),'sub',skyName);
  /* the pill always names the sky event, so it can't be read as your fast: "Sunrise 06:12" before you start, "Sunrise in 1 h 22 m" while you fast or eat */
  var evEn=moonNow?'Sunrise':'Sunset', evZh=moonNow?'日出':'日落', skyTxt=countDown?L(evEn+' in '+hmTxt(left),hmTxt(left)+'后'+evZh):L(evEn+' ',evZh+' ')+clockH(turnAt);
  put($('skyTx'),'skx',skyTxt);
  var skyAria=skyName+', '+skyTxt+'. '+L('Opens an explanation.','打开说明。'); if(cache.skal!==skyAria){ cache.skal=skyAria; $('sub').setAttribute('aria-label',skyAria); }
  var bar=$('offBar'); bar.hidden=!offA&&!chd; bar.dataset.act=chd&&!offA?'cheat':'timeoff'; if(chd&&!offA) put(bar,'ob',L('Cheat day today','今天是弹性日')+'<span>'+L('Take back','收回')+'</span>',1); else if(offA) { var dn0=Math.min(C.offDayNo(offA),offA.days); put(bar,'ob',(offA.kind==='travel'?L('Travelling · day '+dn0+' of '+offA.days,'旅行中 · 第 '+dn0+' 天，共 '+offA.days+' 天'):L('Resting · day '+dn0+' of '+offA.days,'休养中 · 第 '+dn0+' 天，共 '+offA.days+' 天'))+'<span>'+L('End break','结束休息')+'</span>',1); }
  put($('planChip'),'pc',(cur&&cur.planId==='ramadan')||ram?L('Ramadan','斋月'):chipHours(cur?C.planById(cur.planId,cur.goalH):p));
  var ramadan=cur&&cur.planId==='ramadan';
  bigEl.classList.toggle('greet',!!brk); /* a break greets in words, set smaller than the numerals */ bigEl.classList.toggle('set',mode==='idle'&&!brk&&!chd&&!ram); /* the loaded time, not yet running: dimmed */
  if(brk){ var dn=Math.min(C.offDayNo(offA),offA.days);
      put($('readK'),'k',L('Day '+dn+' of '+offA.days,'第 '+dn+' 天，共 '+offA.days+' 天')); setBigText(offA.kind==='travel'?L('Safe travels','旅途平安'):L('Get well soon','早日康复'));
      tip(offA.kind==='travel'?LC('Your streak will wait.','连续记录会等你。','Enjoy your trip.','旅途愉快。'):LC('Rest up. Your streak is safe.','好好休息，连续记录不会断。','Rest up. There is nothing to catch up on.','好好休息，没有什么需要补的。'),1); put($('actLbl'),'a',L('Start fast','开始断食')); }
  else if(chd){ put($('readK'),'k',L('Cheat day','弹性日')); setBigText(L('Day off','休息')); tip(L('Your streak holds. Take back the cheat day above to start a fast.','连续记录保持。想断食，请先收回上方的弹性日。'),1); put($('actLbl'),'a',L('Start fast','开始断食')); }
  else if(mode==='idle'){
    /* at rest the readout shows the time that is loaded, like a timer that has been set: Start lights the same digits and they begin to count. Ramadan keeps its words. */
    if(ram){ put($('readK'),'k',L('Dawn to sunset','黎明到日落')); setBigText(S.fasts.length?L('Ready','准备好了'):L('First fast','首次断食')); put(altEl,'alt',''); }
    else{ put($('readK'),'k',S.fasts.length?L('Ready','准备好了'):L('First fast','首次断食')); setBigTime(p.fast*3600); put(altEl,'alt',L(p.fast+'-hour plan',p.fast+' 小时计划')); }
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
  act.setAttribute('aria-disabled',brk||chd); /* stays tappable during a break or a cheat day: a tap shakes it and says why (see restNudge) */ act.classList.toggle('end',mode==='fast'&&!brk&&!chd); /* quiet glass while a fast runs, yellow for Start */ $('track').style.visibility=brk||chd?'hidden':'';
  /* timeline */
  var a0=mode==='eat'?le.end:mode==='fast'?cur.start:now, a1=mode==='eat'?le.end+eatLen*H:mode==='fast'?cur.start+goal*H:ram?placeMs(sun.set,now):now+p.fast*H;
  var n=Math.min(Math.round(mode==='eat'?eatLen:ram?13:goal),36)||1; buildTicks(n);
  var tt=mode==='fast'?Math.min(el/goal,1):mode==='eat'?Math.min(eatEl/eatLen,1):0;
  /* the two times: a caption, the sky at that moment (moon or sun), then the clock time. Only the start is tappable, and only once a fast exists */
  var capA=mode==='eat'?L('Ended','结束于'):L('Start','开始'), capB=mode==='eat'?L('Next fast','下次断食'):L('Finish','完成'),
      gA=skyGlyph(C.moonAmt(C.placeHour(pi,a0),sun)>=.5), gB=skyGlyph(C.moonAmt(C.placeHour(pi,a1),sun)>=.5), edA=mode==='fast'||mode==='eat';
  put($('endA'),'ea','<span class="cap">'+capA+'</span><span class="trow"><span class="eg">'+gA+'</span><span class="tm">'+(edA?clockMs(a0):L('Now','现在'))+'</span>'+(edA?'<svg class="ic-edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>':'')+'</span>',1);
  put($('endB'),'eb','<span class="cap">'+capB+'</span><span class="trow"><span class="eg">'+gB+'</span><span class="tm">'+clockMs(a1)+'</span></span>',1);
  if($('endA').dataset.ed!==String(edA)){ $('endA').dataset.ed=edA; if(edA){ $('endA').setAttribute('role','button'); $('endA').tabIndex=0; } else { $('endA').removeAttribute('role'); $('endA').removeAttribute('tabindex'); } }
  $('tDone').style.strokeDasharray=(mode==='idle'?0:lenAt(tt))+' 9999';
  var q=tPt(tt); $('marker').setAttribute('cx',q.x.toFixed(1)); $('marker').setAttribute('cy',q.y.toFixed(1)); $('marker').style.opacity=mode==='idle'?0:1;
  /* where the moon turns into the sun (or back) inside this window; Ramadan runs dawn to sunset, so it has none */
  var wl=mode==='eat'?eatLen:goal, tn=ram||ramadan?null:C.nextTurn(C.placeHour(pi,a0),sun);   /* at rest it previews the coming fast */
  if(tn&&tn.inH<wl){ var eq=tPt(tn.inH/wl), ex=Math.min(Math.max(eq.x,34),308).toFixed(1);
    $('evtL').setAttribute('x1',eq.x.toFixed(1)); $('evtL').setAttribute('x2',eq.x.toFixed(1)); $('evtL').setAttribute('y1',(eq.y-14).toFixed(1)); $('evtL').setAttribute('y2',(eq.y-6).toFixed(1));
    $('evtT').setAttribute('x',ex); $('evtT').setAttribute('y',(eq.y-18).toFixed(1)); put($('evtT'),'ev',(tn.k==='rise'?L('Sunrise ','日出 '):L('Sunset ','日落 '))+clockH(tn.at)); $('evt').setAttribute('opacity','1'); } else $('evt').setAttribute('opacity','0');
  var tls=S.prefs.tl==='strip'; $('track').classList.toggle('tls',tls); if(tls) drawStrip(a0,(a1-a0)/H,mode==='fast'?el:mode==='eat'?eatEl:0,mode);
  var done=mode==='idle'?0:Math.floor(tt*n+1e-6); tickEls.forEach(function(c,i){ c.style.fill=i<done?'var(--ink)':''; });
  /* streak card */
  var st=curStreak(), cm=care(); $('streakBtn').hidden=!streakFasts().length; $('streakBtn').disabled=!!offA||cm; /* during time off the card only shows the streak; cheat days are not offered. In Care mode it is just "This week": no number, no cheat days */
  put($('streakTx'),'st','<span>'+(cm?L('This week','这一周'):st>0?L(st+(st===1?' day':' days')+' in a row',st+' 天连续'):L('No streak running','目前没有连续记录'))+'</span>',1);
  var dots='', t0=today(), offK=C.offKeys(S.off); for(var i=6;i>=0;i--){ var k=C.addDays(t0,-i), s=C.dayStatus(k,streakFasts(),S.flex.used,offK); dots+='<i class="dot '+(s==='done'||(cm&&s==='early')?'done':!cm&&(s==='flex'||s==='off')?'flex':'')+(i===0?' today':'')+'"></i>'; }
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

/* day strip (Me > Timeline): your 24 hours from the start of the window, painted in the sky colours of each hour, with the fast on it, the goal mark and a small sun or moon at each sunrise and sunset */
var SKYLOW={night:'#1A2250',first:'#5A5A92',dawn:'#F0B48C',morning:'#CDE6F6',day:'#E1F0FA',sunset:'#F3B07C',evening:'#6C5A88'};
var SUN_I='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg>', MOON_I='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>';
function drawStrip(a0,wl,spent,kind){
  var n=Math.max(2,Math.min(Math.round(wl*2),72)), key=Math.floor(a0/600000)+'|'+wl.toFixed(2)+'|'+pi.off, i;
  if(cache.stripK!==key){ cache.stripK=key; var st=[]; for(i=0;i<=n;i++){ var sk=C.skyAt(C.placeHour(pi,a0+i/n*wl*H),sun)[1]; st.push(SKYLOW[sk]+' '+(i/n*100).toFixed(1)+'%'); } $('sBar').style.background='linear-gradient(90deg,'+st.join(',')+')'; }
  var h0=C.placeHour(pi,a0), t=0, ev='';
  for(i=0;i<4;i++){ var tn=C.nextTurn(h0+t,sun); t+=tn.inH+.001; if(t>=wl) break; var x=Math.min(Math.max(t/wl*100,8),92); ev+='<span style="left:'+x.toFixed(1)+'%">'+(tn.k==='rise'?SUN_I:MOON_I)+clockH(tn.at)+'</span>'; }
  put($('sEv'),'sev',ev,1);
  var f=(Math.min(Math.max(spent,0),wl)/wl*100).toFixed(2)+'%';
  $('sDash').style.width=kind==='idle'?'100%':'0'; $('sFill').style.width=kind==='idle'?'0':f; $('sFill').classList.toggle('eat',kind==='eat');
  var nw=$('sNow'); nw.style.left=f; nw.style.display=kind==='idle'?'none':'';
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
act.addEventListener('pointerdown',function(e){ if(S.cur){ e.preventDefault(); try{ act.setPointerCapture(e.pointerId); }catch(x){} holdBegin(); } else if(!restNow()) act.classList.add('pressed'); });
['pointerup','pointercancel','pointerleave'].forEach(function(n){ act.addEventListener(n,function(){ holdEnd(true); act.classList.remove('pressed'); if(S.cur) updateToday(); if(swallow) setTimeout(function(){ swallow=false; },80); }); });
act.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&S.cur){ e.preventDefault(); if(!e.repeat) holdBegin(); } });
act.addEventListener('keyup',function(e){ if((e.key==='Enter'||e.key===' ')&&S.cur){ holdEnd(true); updateToday(); } if(swallow) setTimeout(function(){ swallow=false; },80); });
/* Start fast during time off: the button looks unavailable but is still a real control. A tap gives a short Apple-style shake (still under Reduce Motion: no movement, just the words), two light haptic taps, and says what to do; the End break pill lights up so the eye goes there. */
function breakMsg(){ return offNow()?L('Ready to fast? Tap End break at the top first.','准备好断食了吗？先点上方的“结束休息”。'):L('Today is a cheat day. Tap Take back at the top first.','今天是弹性日。先点上方的“收回”。'); }
function breakNudge(){
  fx('nope'); toast(breakMsg());
  var bar=$('offBar'); bar.classList.add('nudge'); clearTimeout(breakNudge.t); breakNudge.t=setTimeout(function(){ bar.classList.remove('nudge'); },1400);
  if(act.animate&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){ if(breakNudge.a) breakNudge.a.cancel();
    breakNudge.a=act.animate([{transform:'translateX(0)'},{transform:'translateX(-9px)',offset:.16},{transform:'translateX(8px)',offset:.34},{transform:'translateX(-6px)',offset:.52},{transform:'translateX(4px)',offset:.7},{transform:'translateX(-2px)',offset:.86},{transform:'translateX(0)'}],{duration:480,easing:'cubic-bezier(.36,.07,.19,.97)'}); }
}
act.addEventListener('click',function(){ if(swallow){ swallow=false; return; } if(!S.cur){ if(restNow()) breakNudge(); else startFlow(); } });

/* a button in a sheet that must be held to confirm, the same press-and-hold as ending a fast */
var HB=null;
function hbEnd(){ if(!HB) return; var x=HB; HB=null; cancelAnimationFrame(x.raf); clearInterval(x.bz); var w=sheetEl.querySelector('.warn-ico'); if(w) w.classList.remove('trem'); x.b.classList.remove('holding'); x.b.style.setProperty('--hold',0); x.lbl.textContent=x.orig; }
function hbBegin(b){ if(HB||b.disabled) return; var lbl=b.querySelector('.hl'), t0=performance.now(), ms=+b.dataset.ms||HOLD_MS; HB={b:b,lbl:lbl,orig:lbl.textContent,raf:0,bz:0}; b.classList.add('holding'); lbl.textContent=L('Keep holding…','继续按住…'); fx('light');
  if(b.dataset.buzz){ var w=sheetEl.querySelector('.warn-ico'); if(w) w.classList.add('trem'); HB.bz=setInterval(function(){ buzz(12); },140); } /* a warning hold (Care mode): the mark trembles and the phone buzzes for as long as you hold */
  (function step(){ if(!HB||HB.b!==b) return; var f=Math.min((performance.now()-t0)/ms,1); b.style.setProperty('--hold',f); if(f>=1){ hbEnd(); fx('medium'); A[b.dataset.hold](b); return; } HB.raf=requestAnimationFrame(step); })(); }
document.addEventListener('pointerdown',function(e){ var b=e.target.closest&&e.target.closest('.btn[data-hold]'); if(!b||!ph.contains(b)) return; e.preventDefault(); try{ b.setPointerCapture(e.pointerId); }catch(x){} hbBegin(b); });
['pointerup','pointercancel'].forEach(function(n){ document.addEventListener(n,hbEnd); });
document.addEventListener('keydown',function(e){ var b=e.target.closest&&e.target.closest('.btn[data-hold]'); if(b&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); if(!e.repeat) hbBegin(b); } });
document.addEventListener('keyup',function(e){ if(e.key==='Enter'||e.key===' ') hbEnd(); });

/* ---------- start and end ---------- */
function startFlow(planId){
  if(restNow()){ breakNudge(); return; }
  var id=planId||S.planId, p=C.planById(id,S.customH);
  if(id==='ramadan'){ return startRamadan(); }
  if(!p.long&&!planOk(id)){ normalisePlan(); p=plan(); toast(L('That plan opens later. Starting '+C.planLabel(p)+' instead.','那个计划稍后开放，先用 '+C.planLabel(p)+'。')); }
  if(p.long){ var st=longSt(p.fast); if(st.st!=='ok'){ toast(L('That fast isn’t available yet. Open your plan to see why.','这个断食现在还不能用，打开计划看看原因。')); return; } return longSafety(p); }
  beginFast(p,Date.now());
}
/* 24 h and 36 h for people who have fasted before: open from the start, but choosing one asks first, with an amber warning mark that shakes and a buzz.
   It is advice, not a lock: how often (once a week at most for 24 h, twice a month for 36 h) is only a note, and a rest the person's own history suggests is added in amber. */
function longPick(p){ if(S.cur){ return longSafety(p); } S.planId=p.id; save(); cache={}; updateToday(); return planSheet(); }
function longNoteTxt(n){
  if(!n) return '';
  if(n.k==='unwell') return L('You said you felt unwell recently. Wait until you feel well.','你最近说过身体不适，等恢复了再试。');
  if(n.k==='gap') return L('Your last long fast ended under 3 days ago. Rest a little more.','上一次长时间断食结束还不到 3 天，再休息一下。');
  if(n.k==='week') return L('You did a 24-hour fast this week. Once a week is plenty.','你这周已做过 24 小时断食，每周一次就够了。');
  return L('You did two 36-hour fasts in the last 30 days. Two a month is plenty.','过去 30 天你已做过两次 36 小时断食，每月两次就够了。');
}
function longWarn(p,st){
  var is24=p.fast===24, note=longNoteTxt(st.note);
  openSheet('<!--keep--><div class="warn-ico care">'+WARN+'</div><h3 class="ctr">'+(is24?L('Done a 24-hour fast before?','以前做过 24 小时断食吗？'):L('Done a 36-hour fast before?','以前做过 36 小时断食吗？'))+'</h3>'+
    '<p class="lede ctr">'+L('Only if you have done it before. ','做过再选。')+(is24?L('Once a week at most.','每周最多一次。'):L('Twice a month at most.','每月最多两次。'))+'</p>'+
    (note?'<p class="note lw-note">'+note+'</p>':'')+
    '<div class="btns"><button class="btn warm solid" data-act="lwgo" data-p="'+p.id+'">'+L('Yes, I have done this before','是的，我以前做过')+'</button><button class="btn sec" data-act="lwback">'+L('Not now','以后再说')+'</button></div>');
  fx('warn');
}
function longSafety(p){
  openSheet('<h3>'+L('Before a '+p.fast+'-hour fast','开始 '+p.fast+' 小时断食之前')+'</h3><p class="lede">'+L('A short check. This takes ten seconds.','简单确认一下，只要十秒。')+'</p>'+
   '<div class="group" id="lsChecks"><button class="check" role="checkbox" aria-checked="false" data-act="lsck"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+L('I feel well today and have no fever or illness','我今天感觉良好，没有发烧或生病')+'</span></button>'+
   '<button class="check" role="checkbox" aria-checked="false" data-act="lsck"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+L('I will drink water, and add a pinch of salt or electrolytes if I feel faint','我会多喝水，头晕时加一点点盐或电解质')+'</span></button>'+
   '<button class="check" role="checkbox" aria-checked="false" data-act="lsck"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+L('I will stop if I feel dizzy, unwell, or unsafe','如果头晕、不舒服或觉得不安全，我会停下')+'</span></button></div>'+
   '<div class="btns"><button class="btn" id="lsGo" data-act="lsgo" data-p="'+p.id+'" disabled>'+L('Start '+p.fast+'-hour fast','开始 '+p.fast+' 小时断食')+'</button><button class="btn sec" data-act="close">'+L('Not now','以后再说')+'</button></div>');
}
function beginFast(p,start,extra){
  if(restNow()) return; /* a break or a cheat day holds the streak; no fast starts until it ends or is taken back */
  S.cur=Object.assign({start:start,goalH:p.fast,planId:p.id,reached:false},extra||{}); save(); closeSheet(); fx('medium'); lastHour=-1; shownP=-1; cache={}; updateToday(); scheduleGoal();
  toast(L('Fast started. Hold the button when you want to end it.','断食开始了。想结束时按住按钮。'));
}
function startRamadan(){
  if(restNow()){ breakNudge(); return; }
  var now=Date.now(), f=C.fajrHour(pi,now); if(f==null){ toast(L('Dawn can’t be worked out at this latitude yet.','这个纬度暂时算不出黎明时间。')); return; }
  var s=placeMs(f,now), e=placeMs(sun.set,now);
  if(now>=e){ toast(L('The fast has already ended for today. Come back before dawn.','今天的斋戒已经结束，黎明前再来。')); return; }
  beginFast({id:'ramadan',fast:(e-s)/H},Math.min(s,now));
}
function endFast(){
  var cur=S.cur; if(!cur) return; var now=Date.now(), hrs=(now-cur.start)/H, openBefore=['16','18','20','23'].filter(planEarned);
  S.cur=null;
  if(hrs<1/6){ save(); cache={}; shownP=-1; updateToday(); toast(L('Under 10 minutes, so it wasn’t saved.','不到 10 分钟，没有保存。')); return; }
  var f={id:uid(),start:cur.start,end:now,goalH:cur.goalH,plan:cur.planId};
  S.fasts.push(f); save(); cancelGoal(); cache={}; updateToday(); checkUnlocks();
  var done=C.isDone(f), st=curStreak(), beat=done?(reduce?300:850):(reduce?0:700); if(!done&&beat) endHold={p:Math.min(hrs/cur.goalH,1),until:now+beat}; var news=['16','18','20','23'].filter(function(i){ return planEarned(i)&&openBefore.indexOf(i)<0; }).map(function(i){ return C.planLabel(C.planById(i)); });
  var ask=!S.prefs.backupAsked&&S.fasts.filter(C.isDone).length===1&&CL&&CL.ready()&&!CL.getAuth(); if(ask){ S.prefs.backupAsked=true; save(); }
  if(done) celebrate();
  setTimeout(function(){ openSheet('<span class="k">'+(done?L('Fast saved','断食已保存'):L('Ended early','提前结束'))+'</span><span class="big">'+fmtH(hrs)+'</span><span class="of">'+(done?L('Your '+durTxt(cur.goalH)+' goal, reached','你的 '+durTxt(cur.goalH).replace(' 小时','小时')+'目标，达成了'):L('of your '+durTxt(cur.goalH)+' goal','目标是 '+durTxt(cur.goalH).replace(' 小时','小时')))+'</span>'+
    '<div class="facts"><div><b>'+(care()?C.totals(S.fasts).n:f.plan==='ramadan'?'–':st)+'</b><span>'+(care()?L('Fasts','次断食'):L('Day streak','天连续'))+'</span></div><div><b>'+clockMs(now)+'</b><span>'+L('Ended','结束时间')+'</span></div></div>'+
    '<p class="note">'+(done?L('You reached your goal. Eat gently and drink some water.','你达成了目标。慢慢吃，先喝点水。'):LC('That still counts as a fast. Listening to your body is the point, and your streak is yours to keep going.','这也算一次断食。倾听身体才是重点，你的连续记录还可以继续。','That still counts as a fast. Listening to your body is the point.','这也算一次断食。倾听身体才是重点。'))+'</p>'+
    (news.length?'<p class="note" style="color:var(--label)"><b>'+L(news.join(' and ')+' is now open.',news.join('、')+' 现已开放。')+'</b> '+L('Choose it from the plan button on Today.','在今天页面的计划按钮里选择。')+'</p>':'')+
    (ask?'<p class="note">'+L('Want to keep these fasts if you change phones? Back them up with your email. It’s optional, and everything works without it.','想在换手机时保留这些记录吗？可以用邮箱备份。这是可选的，不备份也能正常使用。')+'</p>':'')+
    '<div class="btns"><button class="btn" data-act="close">'+L('Start eating window','开始进食窗口')+'</button>'+(ask?'<button class="btn sec" data-act="emailsheet">'+L('Back up my fasts','备份我的记录')+'</button>':'')+'<button class="btn sec" data-act="edit" data-id="'+f.id+'">'+L('Edit times','修改时间')+'</button></div>'); countUp(document.querySelector('#sheet .big'),hrs); },beat);
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
var curTab='today', FUI=null; /* the Friends screens (js/friends-ui.js), created below once the action table exists */
function showTab(t,instant){
  var prev=curTab, order=FUI?FUI.order():['today','days','me']; curTab=t; if(t==='today') tipUntil=Date.now()+6000; closeSheet(); ph.classList.remove('tabs-off');
  /* Today has the sky behind it and the other tabs a plain background: the colours must swap instantly, not fade in over a second */
  if((prev==='today')!==(t==='today')){ ph.classList.add('snap'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ ph.classList.remove('snap'); }); }); }
  ['today','days','friends','me'].forEach(function(k){ $(k).classList.remove('leaving'); });
  order.forEach(function(k){ var e=$(k), was=e.classList.contains('on'); e.classList.toggle('on',k===t); if(!reduce&&!instant&&prev!==t&&e.animate){ if(k===t){ e.getAnimations().forEach(function(a){ a.cancel(); }); e.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.16,1,.3,1)'}); } else if(was){ e.classList.add('leaving'); var an=e.animate([{opacity:1},{opacity:0}],{duration:160,easing:'ease-out'}); an.onfinish=function(){ e.classList.remove('leaving'); }; } } });
  if(instant){ ph.classList.add('boot'); requestAnimationFrame(function(){ requestAnimationFrame(function(){ ph.classList.remove('boot'); }); }); }
  ph.style.setProperty('--ti',order.indexOf(t));
  document.querySelectorAll('#tabs button').forEach(function(b){ b.classList.toggle('sel',b.dataset.tab===t); b.setAttribute('aria-current',b.dataset.tab===t?'page':'false'); });
  ph.classList.toggle('sys',t!=='today');
  if(t==='days'){ avgPlay=true; numPlay=true; avgSel=null; selDay=null; } if(t==='days') renderDays(); if(t==='me') renderMe(); if(t==='friends'&&FUI) FUI.show(); if(t==='today') updateToday();
  chrome();
  $(t).scrollTop=0;
}
function tabLabels(){ $('tabF').textContent=L('Friends','朋友'); $('tabT').textContent=L('Today','今天'); $('tabD').textContent=L('Days','日子'); $('tabM').textContent=L('Me','我的'); }

/* ---------- Days ---------- */
/* ---------- time off ---------- */
var offDays=3;
function offNow(){ return C.offActive(S.off); }
/* today is a cheat day and no fast is running: like time off, Start fast stays closed until the cheat day is taken back */
function cheatToday(){ return !care()&&!S.cur&&!offNow()&&S.flex.used.indexOf(today())>=0; }
function restNow(){ return !!offNow()||cheatToday(); }
function offIco(k){ return k==='travel'?'<svg viewBox="-3 -3 30 30" width="32" height="32" aria-hidden="true"><g transform="rotate(45 12 12)"><path fill="currentColor" d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" transform="translate(1 -0.5)"/></g></svg>':'<svg viewBox="2 3.4 20 19.2" width="34" height="33" aria-hidden="true"><path fill="currentColor" d="M12 20.3s-7.6-4.6-7.6-10.3A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.6 10c0 5.7-7.6 10.3-7.6 10.3Z"/></svg>'; }
function offBackLbl(o){ var e=C.keyToDate(C.addDays(C.dayKey(o.start),o.days)).getTime(); return dateLbl(e); }
function timeOffSheet(){
  var o=offNow();
  if(o){
    var n=Math.min(C.offDayNo(o),o.days), dots=''; for(var i=1;i<=o.days;i++) dots+='<i class="od'+(i<n?' past':i===n?' now':'')+'"></i>';
    return openSheet('<h3>'+(o.kind==='travel'?L('Travelling','旅行中'):L('Taking a rest','好好休息'))+'</h3><p class="lede">'+(o.kind==='travel'?LC('Your streak is waiting. Nothing to do until you are back.','连续记录在等你。回来之前什么都不用做。','Nothing to do until you are back.','回来之前什么都不用做。'):LC('Rest well. Your streak is on hold and long fasts stay paused.','好好休息。连续记录暂停，长时间断食也保持暂停。','Rest well. Fasting is on hold.','好好休息，断食先暂停。'))+'</p>'+
     '<div class="group"><div class="offcard"><b>'+L('Day '+n+' of '+o.days,'第 '+n+' 天，共 '+o.days+' 天')+'</b><div class="ods" aria-hidden="true">'+dots+'</div><small>'+L('Back to fasting on ','恢复断食：')+offBackLbl(o)+'</small></div></div>'+
     '<div class="btns"><button class="btn" data-act="offend">'+L('I’m back, end the break','我回来了，结束休息')+'</button><button class="btn sec" data-act="close">'+L('Keep resting','继续休息')+'</button></div>');
  }
  openSheet('<h3>'+L('Time off','休息一下')+'</h3><p class="lede">'+LC('Life comes first. Choose a break and your streak waits for you.','生活优先。选择休息，连续记录会等着你。','Life comes first. Choose a break and Lightly waits for you.','生活优先。选择休息，轻伴会等着你。')+'</p>'+
   '<div class="offopts"><button class="offopt" data-act="offtravel"><span class="oi">'+offIco('travel')+'</span><span class="stack"><b>'+L('Travel','旅行')+'</b><small>'+L('Away from your routine. You choose how many days, up to 14.','暂时离开日常节奏。选择天数，最多 14 天。')+'</small></span>'+CHEV+'</button>'+
   '<button class="offopt" data-act="offunwell"><span class="oi">'+offIco('unwell')+'</span><span class="stack"><b>'+L('I feel unwell','我感觉不舒服')+'</b><small>'+L('A two-week break starts right away. End it whenever you are ready.','立即开始两周休息，准备好了随时结束。')+'</small></span>'+CHEV+'</button></div>');
}
function offTravelSheet(){
  var d=offDays, end=C.keyToDate(C.addDays(today(),d)).getTime(), chips='';
  var OFF_PICKS=[3,7,10,14], pi0=OFF_PICKS.indexOf(d); OFF_PICKS.forEach(function(n){ chips+='<button type="button" data-act="offset" data-n="'+n+'" aria-pressed="'+(d===n)+'">'+n+'</button>'; });
  openSheet('<h3>'+L('Travel','旅行')+'</h3><p class="lede">'+LC('How long will you be away? Your streak keeps, and you can end the break early.','你要离开多久？连续记录会保留，也可以提前结束。','How long will you be away? You can end the break early.','你要离开多久？也可以提前结束。')+'</p>'+
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
   '<p class="note">'+LC('Your streak is kept. Long fasts stay paused. You can end the break early from Me, Time off.','连续记录会保留，长时间断食保持暂停。你可以在“我的 · 休息一下”里提前结束。','You can end the break early from Me, Time off.','你可以在“我的 · 休息一下”里提前结束。')+'</p>'+
   '<div class="btns"><button class="btn" data-act="offgo" data-k="unwell">'+L('Start 2-week break','开始两周休息')+'</button><button class="btn sec" data-act="offback">'+L('Back','返回')+'</button></div>',timeOffSheet);
}
function startOff(kind,days){
  if(offNow()) return;
  S.off.push({id:uid(),kind:kind,start:Date.now(),days:Math.max(1,Math.min(C.OFF_MAX,days))});
  if(kind==='unwell'){ S.unwell=Date.now(); if(S.planId==='24'||S.planId==='36') S.planId=S.profile.safety||!S.profile.fastedBefore?'13':'16'; }
  save(); closeSheet(); cache={}; updateToday(); if(curTab==='days') renderDays(); if(curTab==='me') renderMe();
  toast(kind==='travel'?LC('Safe travels. Your streak will wait.','旅途平安，连续记录会等你。','Safe travels.','旅途平安。'):LC('Take care. Your streak is on hold for two weeks.','多保重。连续记录暂停两周。','Take care. Rest for two weeks.','多保重，好好休息两周。'));
}
function endOff(){
  var o=offNow(); if(!o) return;
  o.endedAt=Date.now(); save(); closeSheet(); cache={}; updateToday(); if(curTab==='days') renderDays(); if(curTab==='me') renderMe();
  toast(LC('Welcome back. Your streak is where you left it.','欢迎回来。连续记录还在原来的位置。','Welcome back.','欢迎回来。'));
}

var calY, calM, selDay, ddIn=false;
/* how far a day's longest fast got toward its goal: an early day's disc is filled that far, counter-clockwise like the timer disc */
function dayPart(list){ var p=0; (list||[]).forEach(function(f){ p=Math.max(p,C.hours(f)/(f.goalH||16)); }); return Math.min(Math.max(p,.08),.92); }
/* bring the tapped day's detail above the tab bar: scroll the Days screen itself, and only as far as needed. This scroll is the app's, not the finger's, so it does not hide the tab bar (keepTabs). */
var keepTabs=0;
function ddShow(){ var dd=$('dayd'), sc=$('days'), tb=$('tabs'); if(!dd) return; var over=dd.getBoundingClientRect().bottom-(Math.min(sc.getBoundingClientRect().bottom,tb?tb.getBoundingClientRect().top:1e9)-12); if(over>0){ keepTabs=performance.now()+900; sc.scrollBy({top:over,behavior:reduce?'auto':'smooth'}); } }
function initCal(){ var d=new Date(); calY=d.getFullYear(); calM=d.getMonth(); selDay=null; }
/* the Days header: how long you have fasted in all, then streak, fasts and the average fast */
function numTxt(h){ var r=h>=100; return new Intl.NumberFormat(loc(),{minimumFractionDigits:r||!h?0:1,maximumFractionDigits:r?0:1}).format(h); }
function totalsHtml(){
  var t=C.totals(S.fasts), st=curStreak(), since=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(t.since));
  return '<div class="group tot"><div class="tmain"><div class="tt"><span class="tk">'+L('Total fasted','累计断食')+'</span><b class="tn" aria-label="'+numTxt(t.hours)+' '+L('hours','小时')+'"><span class="rn">'+numTxt(t.hours)+'</span><small>'+L('hours','小时')+'</small></b><span class="ts">'+L('Since '+since,'自 '+since+' 起')+'</span></div>'+monthMoon()+'</div>'+
    '<div class="tstats"><div><b>'+(care()?monthDays():st)+'</b><span>'+(care()?L('Days this month','本月天数'):L('Day streak','天连续'))+'</span></div><div><b>'+t.n+'</b><span>'+L(t.n===1?'Fast':'Fasts','次断食')+'</span></div><div><b>'+numTxt(t.avg)+'<small>'+L(' h',' 小时')+'</small></b><span>'+L('Average','平均')+'</span></div></div></div>';
}
/* Care mode: days this month with a fast, in place of the streak */
function monthDays(){ var d=new Date(); return C.monthRecap(S.fasts,d.getFullYear(),d.getMonth(),[],[]).days.filter(function(s){ return s==='done'||s==='early'; }).length; }
/* the moon beside the total: it fills counter-clockwise, one slice for every day this month that has a fast on it (the same way the timer disc fills) */
function monthMoon(){
  var d=new Date(), r=C.monthRecap(S.fasts,d.getFullYear(),d.getMonth(),S.flex.used,C.offKeys(S.off)), n=r.days.filter(function(s){ return s==='done'||s==='early'; }).length, dim=r.days.length, p=n/dim;
  return '<div class="tmoon"><svg viewBox="-18 -18 36 36" role="img" aria-label="'+L(n+' of '+dim+' days fasted this month','本月已断食 '+n+' / '+dim+' 天')+'"><defs><radialGradient id="tmG" cx=".34" cy=".3" r=".8"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#EEE8D9"/><stop offset="1" stop-color="#CFC7B2"/></radialGradient></defs>'+
    '<circle r="16" class="tm-u"/><path class="tm-l" data-p="'+p.toFixed(4)+'" d="'+wedgePath(p,16)+'" fill="url(#tmG)"/><circle cx="-5.6" cy="-4.8" r="2.6" class="tm-c"/><circle cx="4.4" cy="4.6" r="3.4" class="tm-c"/><circle cx="3.6" cy="-7.6" r="1.6" class="tm-c"/><circle r="16" class="tm-r"/></svg>'+
    '<span aria-hidden="true">'+L(n+' of '+dim+' days',n+' / '+dim+' 天')+'</span></div>';
}
function moonFill(el){
  var l=el&&el.querySelector('.tm-l'); if(!l||reduce) return;
  var p=+l.getAttribute('data-p'); if(!p) return; var t0=performance.now(), D=1100;
  (function step(t){ var k=Math.min((t-t0)/D,1), e=1-Math.pow(1-k,3); if(!document.body.contains(l)) return; l.setAttribute('d',wedgePath(p*e,16)); if(k<1) requestAnimationFrame(step); })(t0);
}
/* the month in review: on the 1st to the 7th, last month's recap sits above the totals until it is dismissed. It needs at least three fasts, and nothing is sent. */
function recapMonth(){ var d=new Date(); if(d.getDate()>7) return null; var pm=new Date(d.getFullYear(),d.getMonth()-1,1); return {y:pm.getFullYear(),m:pm.getMonth(),key:pm.getFullYear()+'-'+('0'+(pm.getMonth()+1)).slice(-2)}; }
function monthName(pm,long){ return new Intl.DateTimeFormat(loc(),{month:long?'long':'short'}).format(new Date(pm.y,pm.m,1)); }
function recapHtml(){
  var pm=recapMonth(); if(!pm||S.prefs.recapSeen===pm.key) return '';
  var r=C.monthRecap(S.fasts,pm.y,pm.m,S.flex.used,C.offKeys(S.off)); if(r.n<3) return '';
  var name=monthName(pm,true), dots=r.days.map(function(s){ return '<i class="'+(s==='done'?'d':s==='flex'||s==='off'?'f':s==='early'?'e':'')+'"></i>'; }).join('');
  return '<div class="rcard"><button type="button" class="rcmain" data-act="recap"><b class="rct">'+L('Your '+name+' Recap','你的'+name+'回顾')+'</b>'+
    '<span class="rcs">'+r.n+' '+L(r.n===1?'fast':'fasts','次断食')+' · '+numTxt(r.hours)+' '+L('hours','小时')+'</span>'+
    '<span class="rcd" aria-hidden="true">'+dots+'</span><span class="rcgo">'+L('See your recap','查看回顾')+'<svg viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 7 7l-5.5 5.5"/></svg></span></button>'+
    '<button type="button" class="rcx" data-act="recapx" aria-label="'+L('Dismiss recap','关闭回顾')+'"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button></div>';
}

/* ---------- the rolling number: digits spin like an odometer from 0 to the value, then the plain text comes back ---------- */
function odo(el){
  if(reduce||!el||!el.animate) return; var txt=el.textContent; if(!/\d/.test(txt)) return;
  var chars=txt.split(''), nd=chars.filter(function(c){ return /\d/.test(c); }).length, di=0, html='', cols=[];
  chars.forEach(function(c){ if(!/\d/.test(c)){ html+='<span class="rls">'+c+'</span>'; return; }
    var k=nd-1-di, loops=Math.max(1,3-k), s=''; for(var i=0;i<(loops+1)*10;i++) s+='<i>'+(i%10)+'</i>';
    html+='<span class="rlo"><span class="rlc">'+s+'</span></span>'; cols.push({d:+c,loops:loops,rank:di}); di++; });
  el.setAttribute('data-rolling','1'); el.innerHTML=html;
  var cs=el.querySelectorAll(".rlc"), left=cols.length;
  cols.forEach(function(c,i){ var total=(c.loops+1)*10, to=-100*(c.loops*10+c.d)/total, a=cs[i].animate([{transform:'translateY(0)'},{transform:'translateY('+to+'%)'}],{duration:850+c.rank*130,easing:'cubic-bezier(.16,1,.3,1)',fill:'forwards'});
    a.onfinish=function(){ if(--left===0){ el.textContent=el._to!=null?el._to:txt; el._to=null; el.removeAttribute('data-rolling'); } }; });
}
var numPlay=false;

/* ---------- the recap report: the card on Days grows into a full screen of the month, in chapters ---------- */
var rp={open:false,busy:false,src:null,io:null,h:null};
var RP_EASE='cubic-bezier(.32,.72,0,1)';
function rngLab(s,e){ var a=C.keyToDate(s), b=C.keyToDate(e);
  if(S.lang==='zh') return (a.getMonth()+1)+'/'+a.getDate()+(s===e?'':'–'+(a.getMonth()===b.getMonth()?'':(b.getMonth()+1)+'/')+b.getDate());
  return dateLbl(a.getTime(),{month:'short',day:'numeric'})+(s===e?'':'–'+dateLbl(b.getTime(),a.getMonth()===b.getMonth()?{day:'numeric'}:{month:'short',day:'numeric'})); }
/* ---------- compare with others (opt-in, off by default) ----------
   Only the CHANGE in percent of the person's own starting weight, at about day 30, 60 and 90, goes to the server (supabase/trend.sql), after they turn it on and only
   while signed in. Never the weight, age, gender or name. Turning it off, removing the weight or erasing everything deletes what was shared. */
function trendOn(){ return !!(S.body&&S.body.share&&cloudOn()&&!care()&&C.weightFit(S.body)); }
function pctTxt(p){ return (p>0?'+':p<0?'−':'')+Math.abs(p).toFixed(1)+'%'; }
function trendSync(){
  if(!trendOn()) return; var bk=C.trendBuckets(C.trendPoints(S.body)), sig=JSON.stringify(bk); if(!bk.length||S.body.sent===sig) return;
  CL.rpc('trend_share',{p_points:bk}).then(function(){ if(S.body&&S.body.share){ quiet=true; S.body.sent=sig; quiet=false; saveNow(); } }).catch(function(){});
}
function trendLeave(){ if(!cloudOn()) return Promise.resolve(); return CL.rpc('trend_leave').then(function(){ if(S.prefs.trendLeave){ delete S.prefs.trendLeave; save(); } }); }
/* stop sharing: the switch off, "Don't ask me again", removing the weight. If the phone is offline the deletion waits (prefs.trendLeave) and runs on the next sync. */
function trendStop(){ if(S.body){ delete S.body.share; delete S.body.sent; } S.prefs.trendLeave=true; save(); trendLeave().catch(function(){}); }
function trendBoot(){ if(!cloudOn()) return; if(S.prefs.trendLeave) trendLeave().catch(function(){}); else trendSync(); }
function trendFetch(cb){ if(!trendOn()) return cb(null); CL.rpc('trend_compare').then(function(r){ cb(Array.isArray(r)?r:null); }).catch(function(){ cb(null); }); }
function trendPaint(){ var e=$('rpTr'); if(!e) return; e.innerHTML=trendInner(null); trendFetch(function(cmp){ var x=$('rpTr'); if(x&&cmp) x.innerHTML=trendInner(cmp); }); }
function trendInner(cmp){
  var pts=C.trendPoints(S.body), you=[{day:0,pct:0}].concat(pts), avg=[{day:0,pct:0}], rows=cmp||[], lo=-2, hi=1, maxD=90, last=null;
  rows.forEach(function(c){ if(c.enough&&c.avg!=null){ avg.push({day:c.day,pct:c.avg}); if(c.you!=null) last=c; } });
  var hasAvg=avg.length>1; you.concat(hasAvg?avg:[]).forEach(function(p){ lo=Math.min(lo,p.pct); hi=Math.max(hi,p.pct); maxD=Math.max(maxD,p.day); });
  lo=Math.floor(lo-.4); hi=Math.ceil(hi+.4);
  var X=function(d){ return 30+d/maxD*262; }, Y=function(v){ return 10+(hi-v)/(hi-lo)*116; }, pl=function(a){ return a.map(function(p){ return X(p.day).toFixed(1)+','+Y(p.pct).toFixed(1); }).join(' '); }, g='';
  [0,30,60,90].forEach(function(d){ if(d<=maxD) g+='<text class="tr-t" x="'+X(d).toFixed(1)+'" y="146" text-anchor="'+(d===0?'start':d===maxD?'end':'middle')+'">'+(d===0?L('Day 0','第 0 天'):d)+'</text>'; });
  var svg='<svg viewBox="0 0 300 152" role="img" aria-label="'+esc(L('Your weight change over time'+(hasAvg?' next to the average':''),'你的体重变化'+(hasAvg?'，和平均线对比':'')))+'"><line class="tr-grid" x1="30" x2="292" y1="'+Y(0).toFixed(1)+'" y2="'+Y(0).toFixed(1)+'"/>'+
    '<text class="tr-t" x="24" y="'+(Y(0)+3.5).toFixed(1)+'" text-anchor="end">0%</text><text class="tr-t" x="24" y="'+(Y(lo)-1).toFixed(1)+'" text-anchor="end">'+(lo<0?'−'+Math.abs(lo):lo)+'%</text>'+g+
    (hasAvg?'<polyline class="tr-avg" points="'+pl(avg)+'"/>':'')+(you.length>1?'<polyline class="tr-you" points="'+pl(you)+'"/>':'')+
    you.slice(1).map(function(p){ return '<circle class="tr-dot" cx="'+X(p.day).toFixed(1)+'" cy="'+Y(p.pct).toFixed(1)+'" r="4.5"/>'; }).join('')+'</svg>';
  var cap='';
  if(cmp){ if(!hasAvg) cap=L('Not enough people yet. The average joins your line when there are.','还没有足够的人。人数够了，平均线就会出现。');
    else if(last) cap=L('Day '+last.day+': you '+pctTxt(last.you)+', average '+pctTxt(last.avg)+'.','第 '+last.day+' 天：你 '+pctTxt(last.you)+'，平均 '+pctTxt(last.avg)+'。')+(last.ahead!=null&&last.ahead>=50&&last.you<=0&&last.you>-10?' '+L('Down more than '+Math.round(last.ahead)+'% of people.','比 '+Math.round(last.ahead)+'% 的人降得更多。'):'');
    else cap=L('The average is in. Your next check-in joins it.','平均线已有，你下一次记录会加入。'); }
  return '<h4 class="tr-h">'+L('You and others','你和其他人')+'</h4><div class="tr-box">'+svg+'<div class="tr-leg"><span><i style="background:var(--tint)"></i>'+L('You','你')+'</span>'+(hasAvg?'<span><i style="background:#A7ACC0"></i>'+L('Average','平均')+'</span>':'')+'</div></div>'+(cap?'<p class="rp-cap">'+cap+'</p>':'')+(hasAvg?'<p class="rp-cap tr-note">'+L('Everyone’s pace is different. This is not medical advice.','每个人的节奏不同。这不是医疗建议。')+'</p>':'');
}
function trendBlock(saved){
  var b=S.body; if(!b||care()) return '';
  if(b.share) return '<div class="rp-tr" id="rpTr"></div>';
  if(b.share===false||!saved) return '';
  if(!cloudOn()) return '<p class="rp-cap rp-ask">'+L('Want to compare with others? Sign in on Me first.','想和其他人比较？先在“我的”里登录。')+'</p>';
  return '<div class="rp-ask"><h4>'+L('Compare with others?','和其他人比较？')+'</h4><p class="rp-cap">'+L('Only your change in percent, no name, at day 30, 60 and 90. You can stop any time.','只分享体重变化的百分比，不带名字，在第 30、60、90 天。随时可以停止。')+'</p><button type="button" class="btn" data-act="trendyes">'+L('Share my change','分享我的变化')+'</button><button type="button" class="btn quiet" data-act="trendno">'+L('No thanks','不用了')+'</button></div>';
}
function rpWeightPaint(){ var pm=recapMonth(), e=$('rpW'); if(!pm||!e||!S.body) return; e.innerHTML=rpWeightHtml(pm); trendPaint(); }
/* optional monthly check-in (only if weight was given in setup, never in Care mode): one weight, saved on the phone and in the backup, shown with no judgement */
function rpWeightHtml(pm){
  var b=S.body, u=b.unit||'kg', ck=b.checks||[], cur=ck.filter(function(c){ return c.key===pm.key; })[0], prev=ck.filter(function(c){ return c.key<pm.key; }).pop()||{kg:b.kg},
      num=function(kg){ return Math.round(C.kgTo(kg,u))+' '+uLbl(u); };
  if(cur) return '<h3 id="rpTw" class="rpi">'+L('Your check-in','你的记录')+'</h3><p class="rp-line rpi" style="--i:1">'+L('Before <b>'+num(prev.kg)+'</b> · now <b>'+num(cur.kg)+'</b>','之前 <b>'+num(prev.kg)+'</b> · 现在 <b>'+num(cur.kg)+'</b>')+'</p><button type="button" class="btn quiet rpi" style="--i:2" data-act="rpwedit">'+L('Change it','修改')+'</button>'+trendBlock(true);
  rp.wkg=prev.kg;
  return '<h3 id="rpTw" class="rpi">'+L('A quick check-in','简单记一下')+'</h3><p class="rp-cap rpi" style="--i:1">'+L('Optional. Only you see this.','可选，只有你能看到。')+'</p><div class="group rpi" style="--i:2">'+pkField('rpWt',L('Weight now','现在的体重'),Math.round(C.kgTo(prev.kg,u)),'sel',wtOpts(u))+'</div><button type="button" class="btn rpi" style="--i:3" data-act="rpwsave">'+L('Save','保存')+'</button><button type="button" class="btn quiet rpi" style="--i:4" data-act="rpwoff">'+L('Don’t ask me again','不再询问')+'</button>'+trendBlock(false);
}
function reportHtml(pm,r){
  var name=monthName(pm,true), nxt=monthName({y:pm.m===11?pm.y+1:pm.y,m:(pm.m+1)%12},true), goal=S.planId==='ramadan'?0:plan().fast, i;
  var steady=r.n&&r.reached/r.n>=.8;
  /* the month in the sky: Monday first, one disc a day */
  var off=(new Date(pm.y,pm.m,1).getDay()+6)%7, grid='', heads=S.lang==='zh'?['一','二','三','四','五','六','日']:['M','T','W','T','F','S','S'];
  heads.forEach(function(x){ grid+='<span class="rp-wd" aria-hidden="true">'+x+'</span>'; });
  for(i=0;i<off;i++) grid+='<span></span>';
  var fmR=C.fastDays(S.fasts), ym=pm.y+'-'+('0'+(pm.m+1)).slice(-2)+'-';
  r.days.forEach(function(s,d){ grid+='<span class="rp-day '+(s==='done'?'d':s==='flex'?'f':s==='off'?'o':s==='early'?'e':'n')+'" style="--i:'+d+(s==='early'?';--p:'+dayPart(fmR[ym+('0'+(d+1)).slice(-2)]).toFixed(3):'')+'">'+(d+1)+'</span>'; });
  var gl=[]; if(r.daysWith) gl.push(r.daysWith+' '+L(r.daysWith===1?'day with a fast':'days with a fast','天有断食')); if(r.flex&&!care()) gl.push(r.flex+' '+L(r.flex===1?'cheat day':'cheat days','天弹性日'));
  /* weeks */
  var wk=r.weeks.filter(function(w){ return w.n; }), mx=Math.max(goal,wk.reduce(function(a,w){ return Math.max(a,w.h); },0))*1.08||1, wh='';
  wk.forEach(function(w,j){ var lab=rngLab(w.s,w.e);
    wh+='<li style="--i:'+j+'"><span class="rp-wl">'+lab+'</span><span class="rp-bar"><i style="width:'+(100*w.h/mx).toFixed(1)+'%"></i>'+(goal?'<u style="left:'+(100*goal/mx).toFixed(1)+'%"></u>':'')+'</span><b>'+numTxt(w.h)+'<small> '+L('h','小时')+'</small></b></li>'; });
  /* moon and sun */
  var tot=r.moonH+r.sunH||1, mp=Math.round(100*r.moonH/tot);
  /* rhythm: a 24 hour strip with the usual window lit */
  var bands='', s0=r.start, f0=r.finish;
  if(s0!=null&&f0!=null){ if(f0>s0) bands='<i style="left:'+(100*s0/24).toFixed(2)+'%;width:'+(100*(f0-s0)/24).toFixed(2)+'%"></i>';
    else bands='<i style="left:'+(100*s0/24).toFixed(2)+'%;width:'+(100*(24-s0)/24).toFixed(2)+'%"></i><i style="left:0;width:'+(100*f0/24).toFixed(2)+'%"></i>'; }
  var bw=r.busy?rngLab(r.busy.s,r.busy.e):'';
  var tiles='<div class="rp-t rpi" style="--i:0"><b><span class="rn">'+r.reached+'</span><small> / '+r.n+'</small></b><span>'+L('reached your goal','达成目标')+'</span></div>'+
    (care()?'<div class="rp-t rpi" style="--i:1"><b><span class="rn">'+r.daysWith+'</span><small> / '+r.dim+'</small></b><span>'+L('days with a fast','天有断食')+'</span></div>':'<div class="rp-t rpi" style="--i:1"><b><span class="rn">'+r.run+'</span></b><span>'+L(r.run===1?'day in a row':'days in a row','天连续达成')+'</span></div>')+
    '<div class="rp-t rpi" style="--i:2"><b><span class="rn">'+numTxt(r.avg)+'</span><small> '+L('h','小时')+'</small></b><span>'+L('average fast','平均每次')+'</span></div>'+
    (r.busy?'<div class="rp-t rpi" style="--i:3"><b class="rp-bw">'+bw+'</b><span>'+L('busiest week, '+r.busy.n+' fasts','最忙的一周 · '+r.busy.n+' 次')+'</span></div>':'<div class="rp-t rpi" style="--i:3"><b><span class="rn">'+(care()?r.n:r.daysWith)+'</span>'+(care()?'':'<small> / '+r.dim+'</small>')+'</b><span>'+(care()?L('fasts','次断食'):L('days with a fast','天有断食'))+'</span></div>');
  return '<div class="rp-in" id="rpIn"><div class="rp-scroll" id="rpScroll" tabindex="-1">'+
    '<section class="rp-s rp-hero rv" aria-labelledby="rpT"><h2 id="rpT" class="rpi" style="--i:0">'+L('Your '+name+' Recap','你的'+name+'回顾')+'</h2>'+
    '<div class="rp-big rpi" style="--i:1" role="img" aria-label="'+numTxt(r.hours)+' '+L('hours fasted','小时断食')+'"><span class="rn">'+numTxt(r.hours)+'</span></div><p class="rp-unit rpi" style="--i:2">'+L('hours fasted','小时断食')+'</p>'+
    '<div class="rp-orb rpi" style="--i:3" aria-hidden="true"><svg class="rp-disc" viewBox="-118 -118 236 236"><defs><radialGradient id="rpG" cx=".38" cy=".34" r=".78"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#EEE8D9"/><stop offset="1" stop-color="#CFC7B2"/></radialGradient><radialGradient id="rpGs" cx=".4" cy=".36" r=".78"><stop offset="0" stop-color="#FFF6C2"/><stop offset=".5" stop-color="#FFD21F"/><stop offset="1" stop-color="#F5A800"/></radialGradient><filter id="rpF" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4"/></filter><mask id="rpM" maskUnits="userSpaceOnUse" x="-120" y="-120" width="240" height="240"><path id="rpLit" fill="#fff" filter="url(#rpF)"/></mask></defs><circle r="84" class="u"/><g mask="url(#rpM)"><circle r="84" fill="url(#rpG)" id="rpMoon"/><g class="cr" id="rpCr"><circle cx="-32" cy="-28" r="16"/><circle cx="28" cy="-43" r="8"/><circle cx="43" cy="9" r="13"/><circle cx="-7" cy="32" r="18"/><circle cx="-52" cy="20" r="7"/><circle cx="13" cy="-7" r="5"/></g><circle r="84" fill="url(#rpGs)" id="rpSun" opacity="0"/></g><circle r="84" class="rim"/></svg></div>'+
    '<p class="rp-sub rpi" style="--i:4">'+r.n+' '+L(r.n===1?'fast':'fasts','次断食')+' · '+r.daysWith+' '+L('of','/')+' '+r.dim+' '+L('days','天')+'</p>'+
    '<svg class="rp-more" viewBox="0 0 14 8" aria-hidden="true"><path d="M1.5 1.5 7 6.5l5.5-5"/></svg></section>'+
    '<section class="rp-s rv" aria-labelledby="rpT2"><h3 id="rpT2" class="rpi">'+L('Your month in the sky','这个月的天空')+'</h3><div class="rp-cal" role="img" aria-label="'+esc(gl.join(', '))+'">'+grid+'</div><p class="rp-cap rpi" style="--i:2">'+gl.join(' · ')+'</p></section>'+
    (wk.length?'<section class="rp-s rp-card rv" aria-labelledby="rpT3"><h3 id="rpT3" class="rpi">'+L('Week by week','每周一览')+'</h3><p class="rp-cap rpi" style="--i:1">'+L('Average length of each fast','每次断食的平均时长')+'</p><ul class="rp-wk">'+wh+'</ul></section>':'')+
    '<section class="rp-s rp-night rv" aria-labelledby="rpT4"><h3 id="rpT4" class="rpi">'+L('Moon and sun','月亮与太阳')+'</h3><p class="rp-cap rpi" style="--i:1">'+L('Where your fasting hours fell','断食的时间落在哪里')+'</p>'+
    '<div class="rp-sky" role="img" aria-label="'+L(numTxt(r.moonH)+' hours under the moon, '+numTxt(r.sunH)+' under the sun',numTxt(r.moonH)+' 小时在月下，'+numTxt(r.sunH)+' 小时在日下')+'"><i class="m" style="width:'+mp+'%"></i><i class="s" style="width:'+(100-mp)+'%"></i></div>'+
    '<div class="rp-skyl rpi" style="--i:3"><div><b><span class="rn">'+numTxt(r.moonH)+'</span><small> '+L('h','小时')+'</small></b><span><i class="m"></i>'+L('under the moon','月下')+'</span></div><div><b><span class="rn">'+numTxt(r.sunH)+'</span><small> '+L('h','小时')+'</small></b><span><i class="s"></i>'+L('under the sun','日下')+'</span></div></div></section>'+
    (bands?'<section class="rp-s rv" aria-labelledby="rpT5"><h3 id="rpT5" class="rpi">'+L('Your rhythm','你的节奏')+'</h3><p class="rp-line rpi" style="--i:1">'+L('You usually start around <b>'+clockH(s0)+'</b> and finish around <b>'+clockH(f0)+'</b>.','你通常在 <b>'+clockH(s0)+'</b> 左右开始，<b>'+clockH(f0)+'</b> 左右结束。')+'</p>'+
      '<div class="rp-24" aria-hidden="true"><div class="trk">'+bands+'</div><div class="lbl"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></div></section>':'')+
    '<section class="rp-s rv" aria-labelledby="rpT6"><h3 id="rpT6" class="rpi">'+L('Highlights','亮点')+'</h3><div class="rp-tiles">'+tiles+'</div></section>'+
    (S.body&&!S.body.checkOff&&!care()?'<section class="rp-s rp-card rv" id="rpW" aria-labelledby="rpTw">'+rpWeightHtml(pm)+'</section>':'')+
    '<section class="rp-s rp-end rv"><p class="rp-bye rpi">'+(steady?L('A steady month.','稳稳的一个月。'):L('Every fast counted.','每一次断食都算数。'))+'</p><p class="rp-line rpi" style="--i:1">'+L('See you in '+nxt+'.','我们'+nxt+'见。')+'</p><button type="button" class="btn rpi" style="--i:2" data-act="rpclose">'+L('Done','完成')+'</button></section></div><button type="button" class="rp-x" data-act="rpclose" aria-label="'+L('Close recap','关闭回顾')+'"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button></div>';
}
/* the hero disc is the same moon and sun as Today: the real 3D ball when the 3D switch is on (and WebGL works), the flat drawing otherwise.
   The lit part fills counter-clockwise like the moon on Today, then the moon turns into the sun, with the goal bloom. */
var rpOrb=null, rpOrbCv=null, rpOrbTried=false;
function rpOrbGet(){
  var wrap=document.querySelector('#report .rp-orb'); if(!wrap||!S.prefs.d3||!window.LightlySphere) return null;
  try{ if(!rpOrbTried){ rpOrbTried=true; rpOrb=window.LightlySphere(wrap.querySelector('svg')); rpOrbCv=wrap.querySelector('canvas.orb'); }
    else if(rpOrb&&rpOrbCv) wrap.appendChild(rpOrbCv); }catch(e){ rpOrb=null; }
  if(rpOrb){ rpOrb.set(true); if(!rpOrb.ok()) return null; } return rpOrb;
}
function rpHeroDraw(){
  var h=rp.h, svg=document.querySelector('#report .rp-disc'); if(!h||!svg) return;
  if(h.orb&&h.orb.ok()){ svg.style.visibility='hidden'; h.orb.draw({p:h.p,wane:false,moon:h.moon,tx:0,ty:0,ox:0,oy:0,scale:1,alpha:1,night:1,glow:(1-h.moon)*h.p*(.35+.65*h.boost)+h.boost*.3,halo:h.moon*h.boost}); return; }
  svg.style.visibility=''; $('rpLit').setAttribute('d',wedgePath(h.p,84,false)); $('rpMoon').style.opacity=1; $('rpSun').style.opacity=1-h.moon; $('rpCr').style.opacity=h.moon;
}
function rpDisc(p,play){
  if(!$('rpLit')) return; rp.h={p:play?0:p,moon:play||p<=0?1:0,boost:0,orb:rpOrbGet()}; rpHeroDraw();
  if(!play||reduce) return;
  var t0=null, FILL=1700, TURN=1300, bloomed=false;
  function f(t){ var h=rp.h; if(!rp.open||!h||!$('rpLit')) return; if(t0===null) t0=t; var el=t-t0;
    var u=Math.min(el/FILL,1); h.p=p*(1-Math.pow(1-u,4));
    if(el>FILL){ var v=Math.min((el-FILL)/TURN,1), e=v*v*(3-2*v); h.moon=1-e; h.boost=Math.max(0,1-v*1.15); if(!bloomed){ bloomed=true; rpBloom(); } }
    rpHeroDraw(); if(el<FILL+TURN+80||h.orb) requestAnimationFrame(f); }
  requestAnimationFrame(f);
}
/* when the moon has filled, the same soft bloom and drifting lights as reaching a goal on Today (no check: this is not a goal) */
function rpBloom(){
  var svg=document.querySelector('#report .rp-orb'), hero=svg&&svg.parentNode; if(!hero||reduce||!hero.animate) return;
  var hr=hero.getBoundingClientRect(), d=svg.getBoundingClientRect(), cx=d.left-hr.left+d.width/2, cy=d.top-hr.top+d.height/2, r=d.width*.36, el=document.createElement('div');
  el.setAttribute('aria-hidden','true'); el.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:0';
  var glow=document.createElement('div'); glow.style.cssText='position:absolute;left:'+cx+'px;top:'+cy+'px;width:'+r*2+'px;height:'+r*2+'px;margin:'+(-r)+'px 0 0 '+(-r)+'px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9) 0%,rgba(255,255,255,.45) 40%,rgba(255,255,255,0) 70%);opacity:0'; el.appendChild(glow);
  hero.appendChild(el); glow.animate([{opacity:0,transform:'scale(.9)'},{opacity:1,transform:'scale(1.4)',offset:.3},{opacity:0,transform:'scale(2.6)'}],{duration:1600,easing:'cubic-bezier(.22,.8,.3,1)',fill:'forwards'});
  svg.animate([{transform:'scale(1)'},{transform:'scale(1.05)',offset:.3},{transform:'scale(1)'}],{duration:900,easing:'cubic-bezier(.2,1,.3,1)'});
  var cols=['#FFFFFF','#FFF7D1','#F4EFE2','#FFFFFF'], n=20;
  for(var i=0;i<n;i++){ var a=(i/n)*Math.PI*2+Math.random()*.25, dist=r*(1.35+Math.random()*1.3), s=3+Math.random()*4, dot=document.createElement('i');
    dot.style.cssText='position:absolute;left:'+cx+'px;top:'+cy+'px;width:'+s+'px;height:'+s+'px;margin:'+(-s/2)+'px 0 0 '+(-s/2)+'px;border-radius:50%;background:'+cols[i%cols.length]+';box-shadow:0 0 '+s*2+'px '+cols[i%cols.length]+';opacity:0'; el.appendChild(dot);
    dot.animate([{opacity:0,transform:'translate(0,0) scale(.4)'},{opacity:1,offset:.2},{opacity:0,transform:'translate('+(Math.cos(a)*dist).toFixed(0)+'px,'+(Math.sin(a)*dist-r*.2).toFixed(0)+'px) scale(1)'}],{duration:1400+Math.random()*600,delay:40+Math.random()*160,easing:'cubic-bezier(.15,.7,.2,1)',fill:'forwards'}); }
  setTimeout(function(){ el.remove(); },2400);
}
function rpWatch(R,r){
  var sc=$('rpScroll'), els=[].slice.call(R.querySelectorAll('.rv')); rp.heroGo=null;
  if(reduce||!('IntersectionObserver' in window)){ els.forEach(function(e){ e.classList.add('in'); }); rpDisc(r.dim?r.daysWith/r.dim:0,false); return; }
  R.classList.add('mv'); if(rp.io) rp.io.disconnect();
  rp.io=new IntersectionObserver(function(es){ es.forEach(function(en){ if(!en.isIntersecting||en.target.classList.contains('in')) return; var e=en.target; e.classList.add('in'); rp.io.unobserve(e);
    [].forEach.call(e.querySelectorAll('.rn'),function(n,j){ setTimeout(function(){ odo(n); },e.classList.contains('rp-hero')?0:260+j*90); });
    if(e.classList.contains('rp-hero')) rpDisc(r.dim?r.daysWith/r.dim:0,true); }); },{root:sc,threshold:.3});
  els.forEach(function(e,i){ if(i>0) rp.io.observe(e); });
  rpDisc(0,false);
  rp.heroGo=function(){ var h=els[0]; if(!h||h.classList.contains('in')) return; h.classList.add('in'); odo(h.querySelector('.rn')); rpDisc(r.dim?r.daysWith/r.dim:0,true); };
}
function rpRect(){ var pr=$('ph').getBoundingClientRect(), cr=rp.src.getBoundingClientRect(); return 'inset('+Math.max(0,cr.top-pr.top).toFixed(1)+'px '+Math.max(0,pr.right-cr.right).toFixed(1)+'px '+Math.max(0,pr.bottom-cr.bottom).toFixed(1)+'px '+Math.max(0,cr.left-pr.left).toFixed(1)+'px round 14px)'; }
/* the pop-up that announces last month's recap: once per month, on the first open between the 1st and the 3rd, only when the recap exists (three or more fasts) and nothing else is on screen. "Later" and the dim both just close it. */
function recapPop(){
  var d=new Date(); if(d.getDate()>3||!S.onboarded||sheetOpen||holding||rp.open||rp.busy||!$('ob').hidden) return;
  var pm=recapMonth(); if(!pm||S.prefs.recapSeen===pm.key||S.prefs.recapPop===pm.key) return;
  var r=C.monthRecap(S.fasts,pm.y,pm.m,S.flex.used,C.offKeys(S.off)); if(r.n<3) return;
  S.prefs.recapPop=pm.key; save();
  var name=monthName(pm,true), st='';
  for(var i=0;i<14;i++) st+='<i style="left:'+((i*37+11)%97+1)+'%;top:'+((i*53+7)%71+2)+'%;animation-delay:'+((i*0.37)%3).toFixed(2)+'s"></i>';
  openSheet('<div class="rpop"><span class="rpop-s" aria-hidden="true">'+st+'</span>'+
    '<svg class="rpop-m" viewBox="-30 -30 60 60" role="img" aria-label="'+L('A full moon','一轮满月')+'"><defs><radialGradient id="rpG" cx=".34" cy=".3" r=".8"><stop offset="0" stop-color="#FFF8DC"/><stop offset=".55" stop-color="#F5DE8C"/><stop offset="1" stop-color="#E8C867"/></radialGradient></defs>'+
    '<circle r="27" fill="url(#rpG)"/><circle cx="-9" cy="-8" r="4.4" class="c"/><circle cx="8" cy="8" r="6" class="c"/><circle cx="9.5" cy="-13" r="2.6" class="c"/></svg>'+
    '<span class="rpop-k">'+L('New','新')+'</span><h3>'+L('Your '+name+' recap is ready','你的'+name+'回顾准备好了')+'</h3>'+
    '<p class="lede">'+L('Your month in hours, days and sky.','你这个月的时长、天数与天空。')+'</p>'+
    '<div class="btns"><button type="button" class="btn rpop-go" data-act="recappop">'+L('See my recap','查看回顾')+'</button><button type="button" class="btn quiet" data-act="close">'+L('Later','稍后')+'</button></div></div>');
  sheetEl.classList.add('pop'); fx('light');
}
function recapPopGo(){
  closeSheet(); showTab('days');
  setTimeout(function(){ var b=$('days').querySelector('.rcard .rcmain'); if(b) openReport(b); },420);
}
function openReport(btn){
  if(rp.open||rp.busy) return; var pm=recapMonth(); if(!pm) return;
  var r=C.monthReport(S.fasts,pm.y,pm.m,S.flex.used,C.offKeys(S.off),S.place); if(r.n<3) return;
  var R=$('report'), D=$('days'); rp.src=btn.closest('.rcard')||btn; R.getAnimations({subtree:true}).forEach(function(x){ x.cancel(); }); R.innerHTML=reportHtml(pm,r); trendPaint(); R.hidden=false; R.style.transform=''; R.style.borderRadius='';
  rp.open=true; rpWatch(R,r); fx('light');
  var sc=$('rpScroll'); sc.scrollTop=0;
  if(reduce||!R.animate){ R.animate&&R.animate([{opacity:0},{opacity:1}],{duration:220,fill:'none'}); if(rp.heroGo) rp.heroGo(); sc.focus({preventScroll:true}); return; }
  rp.busy=true;
  var bg0=getComputedStyle(R).backgroundColor, a=R.animate([{clipPath:rpRect(),backgroundColor:bg0},{clipPath:'inset(0px 0px 0px 0px round 0px)',backgroundColor:'#0E1430'}],{duration:620,easing:RP_EASE,fill:'both'});
  $('rpIn').animate([{opacity:0},{opacity:0,offset:.3},{opacity:1}],{duration:620,easing:'linear',fill:'both'});
  D.animate([{transform:'scale(1)',opacity:1},{transform:'scale(.94)',opacity:.5}],{duration:620,easing:RP_EASE,fill:'both'});
  setTimeout(function(){ if(rp.heroGo) rp.heroGo(); },300);
  a.onfinish=function(){ rp.busy=false; a.cancel(); $('rpIn').getAnimations().forEach(function(x){ x.cancel(); }); R.style.clipPath='none'; sc.focus({preventScroll:true}); };
}
function closeReport(fromDrag){
  if(!rp.open||rp.busy) return; var R=$('report'), D=$('days'), sc=$('rpScroll'); rp.busy=true; fx('light');
  function done(){ R.getAnimations({subtree:true}).forEach(function(x){ x.cancel(); }); rp.busy=false; rp.open=false; R.hidden=true; R.innerHTML=''; R.style.cssText=''; D.getAnimations().forEach(function(x){ x.cancel(); }); if(rp.io) rp.io.disconnect(); rp.heroGo=null; if(rp.src&&document.body.contains(rp.src)){ var b=rp.src.querySelector('.rcmain'); if(b) b.focus({preventScroll:true}); } }
  if(reduce||!R.animate){ var f=R.animate([{opacity:1},{opacity:0}],{duration:180,fill:'both'}); f.onfinish=done; return; }
  var from=getComputedStyle(R).transform, rad=R.style.borderRadius||'0px'; R.getAnimations().forEach(function(x){ x.cancel(); }); R.style.clipPath='inset(0px 0px 0px 0px round 0px)';
  var bg1=getComputedStyle(R).backgroundColor, a=R.animate([{clipPath:'inset(0px 0px 0px 0px round 0px)',transform:from==='none'?'none':from,backgroundColor:'#0E1430'},{clipPath:rpRect(),transform:'none',backgroundColor:bg1}],{duration:440,easing:RP_EASE,fill:'both'});
  $('rpIn').animate([{opacity:1},{opacity:0}],{duration:200,easing:'ease-out',fill:'both'});
  D.getAnimations().forEach(function(x){ x.cancel(); }); D.animate([{transform:'scale(.94)',opacity:.5},{transform:'scale(1)',opacity:1}],{duration:440,easing:RP_EASE,fill:'both'});
  a.onfinish=done;
}
/* pull the report down from the top and it shrinks back into its card, following the finger */
(function(){ var R=$('report'), y0=null, dy=0, t0=0, active=false;
  R.addEventListener('touchstart',function(e){ var sc=$('rpScroll'); if(!rp.open||rp.busy||!sc||sc.scrollTop>0||e.touches.length!==1){ y0=null; return; } y0=e.touches[0].clientY; dy=0; t0=Date.now(); active=false; },{passive:true});
  R.addEventListener('touchmove',function(e){ if(y0===null) return; dy=e.touches[0].clientY-y0; if(dy<=6&&!active) return; if($('rpScroll').scrollTop>0){ y0=null; return; }
    active=true; e.preventDefault(); var k=Math.min(dy/700,.3); R.style.transform='translateY('+(dy*.55).toFixed(1)+'px) scale('+(1-k*.35).toFixed(3)+')'; R.style.borderRadius=Math.min(dy/6,40)+'px'; R.style.overflow='hidden'; },{passive:false});
  R.addEventListener('touchend',function(){ if(y0===null||!active){ y0=null; return; } var v=dy/Math.max(Date.now()-t0,1); y0=null; active=false;
    if(dy>140||v>.9) closeReport(true);
    else{ var from=getComputedStyle(R).transform; var a=R.animate([{transform:from},{transform:'none'}],{duration:420,easing:'cubic-bezier(.34,1.3,.5,1)'}); R.style.transform=''; R.style.borderRadius=''; a.onfinish=function(){ R.style.overflow=''; }; } });
})();
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&rp.open&&!sheetOpen) closeReport(); });
/* average fast under the calendar: Weeks follows the month you are viewing, Months looks back over the last six */
var avgMode='weeks', avgSel=null, avgPlay=true;
function avgData(){
  var now=new Date(), nowI=now.getFullYear()*12+now.getMonth(), viewI=calY*12+calM;
  if(avgMode==='months'){ var endI=viewI<nowI-5?viewI:nowI, d=C.monthAvgs(S.fasts,Math.floor(endI/12),endI%12,6); return {mode:'months',bars:d.map(function(x){ return {n:x.n,h:x.h,lab:new Intl.DateTimeFormat(loc(),{month:'short'}).format(new Date(x.y,x.m,1)),full:new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(x.y,x.m,1)),cur:x.y*12+x.m===viewI}; })}; }
  var w=C.weekAvgs(S.fasts,calY,calM); return {mode:'weeks',bars:w.map(function(x){ var a=C.keyToDate(x.s).getTime(), e=C.keyToDate(x.e).getTime();
    var dt=new Date(a); return {n:x.n,h:x.h,lab:S.lang==='zh'?(dt.getMonth()+1)+'/'+dt.getDate():dateLbl(a,{month:'short',day:'numeric'}),full:x.s===x.e?dateLbl(a,{month:'short',day:'numeric'}):dateLbl(a,{month:'short',day:'numeric'})+'–'+dateLbl(e,{day:'numeric'}),cur:false}; })}; }
function avgHtml(play){
  var d=avgData(), bars=d.bars, n=bars.length, used=bars.filter(function(x){return x.n;}), sel=avgSel;
  if(sel===null||sel>=n||!bars[sel]) { sel=-1; for(var i=n-1;i>=0;i--){ if(d.mode==='months'?bars[i].cur:bars[i].n){ sel=i; break; } } if(sel<0&&used.length) sel=bars.indexOf(used[used.length-1]); }
  var goal=S.planId==='ramadan'?0:plan().fast, mx=Math.max(goal,used.reduce(function(a,x){return Math.max(a,x.h);},0)), ymax=Math.max(20,Math.ceil(mx*1.12/4)*4);
  var W=320,Hh=196,l=30,r=8,top=24,bot=26,pH=Hh-top-bot,pW=W-l-r, y=function(v){return top+pH-pH*v/ymax;}, col=pW/n, bw=Math.min(44,col-14), svg='', btns='', i;
  [0,ymax/2,ymax].forEach(function(tk){ svg+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(tk).toFixed(1)+'" y2="'+y(tk).toFixed(1)+'" class="gl"/><text x="'+(l-6)+'" y="'+(y(tk)+4).toFixed(1)+'" text-anchor="end">'+tk+'</text>'; });
  if(goal) svg+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(goal).toFixed(1)+'" y2="'+y(goal).toFixed(1)+'" class="gp"/>';
  bars.forEach(function(b,i){ var cx=l+col*(i+.5), x=cx-bw/2, on=i===sel, hh=b.n?Math.max(3,pH*b.h/ymax):3, yy=top+pH-hh, rr=Math.min(5,bw/2);
    svg+=b.n?'<path class="bar'+(on?' on':'')+'" d="M'+x.toFixed(1)+' '+(top+pH)+'V'+(yy+rr).toFixed(1)+'Q'+x.toFixed(1)+' '+yy.toFixed(1)+' '+(x+rr).toFixed(1)+' '+yy.toFixed(1)+'H'+(x+bw-rr).toFixed(1)+'Q'+(x+bw).toFixed(1)+' '+yy.toFixed(1)+' '+(x+bw).toFixed(1)+' '+(yy+rr).toFixed(1)+'V'+(top+pH)+'Z"/><text class="v'+(on?' on':'')+'" x="'+cx.toFixed(1)+'" y="'+(yy-6).toFixed(1)+'" text-anchor="middle">'+numTxt(b.h)+'</text>':
      '<rect class="bar0" x="'+x.toFixed(1)+'" y="'+(top+pH-3)+'" width="'+bw.toFixed(1)+'" height="3" rx="1.5"/>';
    svg+='<text class="x'+(on?' on':'')+'" x="'+cx.toFixed(1)+'" y="'+(Hh-8)+'" text-anchor="middle">'+esc(b.lab)+'</text>';
    btns+='<button type="button" class="avgcol" data-act="avgbar" data-i="'+i+'" aria-pressed="'+on+'" aria-label="'+esc(b.full)+', '+(b.n?numTxt(b.h)+' '+L('hours per fast','小时 每次')+', '+b.n+' '+L(b.n===1?'fast':'fasts','次断食'):L('no fasts','没有断食'))+'" style="left:'+(100*(l+col*i)/W).toFixed(2)+'%;width:'+(100*col/W).toFixed(2)+'%;top:'+(100*top/Hh).toFixed(2)+'%;height:'+(100*(Hh-top)/Hh).toFixed(2)+'%"></button>'; });
  var tot=used.reduce(function(a,x){return a+x.h*x.n;},0), cnt=used.reduce(function(a,x){return a+x.n;},0), s=sel>=0?bars[sel]:null;
  var head='<div class="avgsum"><b class="num">'+(s&&s.n?numTxt(s.h):'–')+'<small>'+L('h per fast','小时 / 次')+'</small></b><p>'+(s&&s.n?esc(s.full)+' · '+s.n+' '+L(s.n===1?'fast':'fasts','次断食'):(d.mode==='weeks'?L('No fasts this month','这个月还没有断食'):L('No fasts yet','还没有断食')))+'</p></div>';
  var foot='<div class="avgfoot"><span>'+(cnt?(d.mode==='weeks'?L('Month average ','本月平均 '):L('Average ','平均 '))+numTxt(tot/cnt)+' '+L('h','小时'):'')+'</span>'+(goal?'<span class="lg"><i></i>'+L('Plan '+goal+' h','计划 '+goal+' 小时')+'</span>':'')+'</div>';
  return '<div class="group avg"><div class="avgseg"><div class="seg" role="group" aria-label="'+L('Range','范围')+'"><button type="button" data-act="avgmode" data-m="weeks" aria-pressed="'+(avgMode==='weeks')+'">'+L('Weeks','按周')+'</button><button type="button" data-act="avgmode" data-m="months" aria-pressed="'+(avgMode==='months')+'">'+L('Months','按月')+'</button></div></div>'+head+
    '<div class="avgplot'+(play?' avgplay':'')+'" style="aspect-ratio:'+W+'/'+Hh+'"><svg viewBox="0 0 '+W+' '+Hh+'" aria-hidden="true">'+svg+'</svg>'+btns+'</div>'+foot+'</div>';
}
function avgDraw(play){ var el=$('avgBox'); if(el) el.innerHTML=avgHtml(play); }
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
  if(selDay&&selDay.slice(0,7)!==y+'-'+('0'+(m+1)).slice(-2)){ selDay=null; var dd0=$('dayd'); if(dd0) dd0.remove(); }   /* the open day is part of the calendar card: leaving its month closes it */
  var D=$('days'), v=D.querySelector('.cal-v'), og=v&&v.querySelector('.cal-g'), mn=D.querySelector('.cal-h .mn'), r=monthRange(), cur=y*12+m;
  if(mn) mn.textContent=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(y,m,1));
  var pv=D.querySelector('[data-act=calprev]'), nx=D.querySelector('[data-act=calnext]'); if(pv) pv.disabled=cur<=r[0]; if(nx) nx.disabled=cur>=r[1];
  avgSel=null; avgDraw(false);
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
  var offK=C.offKeys(S.off), fm=C.fastDays(all); for(var d=1;d<=dim;d++){ var k=y+'-'+('0'+(m+1)).slice(-2)+'-'+('0'+d).slice(-2), s=C.dayStatus(k,all,S.flex.used,offK), fut=k>t;
    h+='<button class="'+s+(k===t?' today':'')+(k===selDay?' sel':'')+(fut?' fut':'')+'" data-act="day" data-k="'+k+'"'+(s==='early'?' style="--p:'+dayPart(fm[k]).toFixed(3)+'"':'')+' aria-label="'+dateLbl(C.keyToDate(k).getTime())+(s==='done'?', '+L('fast done','已完成'):s==='flex'?', '+L('cheat day','弹性日'):s==='off'?', '+L('time off','休息'):s==='early'?', '+L('ended early','提前结束'):'')+'"><span class="d">'+d+'</span></button>'; }
  return h; }
/* before the first fast, Days shows what a week will look like: a made-up week of discs, marked "Example" (a picture, skipped by screen readers) */
function sampleWeek(){ var wd=S.lang==='zh'?['一','二','三','四','五','六','日']:['M','T','W','T','F','S','S'], k=['full','full','part','full','full','none','none'];
  return '<div class="fu-wk" aria-hidden="true"><span class="fu-ex">'+L('Example','示例')+'</span><div class="fu-g">'+wd.map(function(w,i){ return '<span><small>'+w+'</small><i class="'+k[i]+'"></i></span>'; }).join('')+'</div></div>'; }
function renderDays(){
  var fs=streakFasts(), all=S.fasts, t=today(), first=all.length?new Date(Math.min.apply(null,all.map(function(f){return f.start;}))):new Date();
  var canPrev=calY*12+calM>first.getFullYear()*12+first.getMonth()-0, canNext=calY*12+calM<new Date().getFullYear()*12+new Date().getMonth();
    var first1=!C.finished(all).length, h=first1?'<div class="group firstuse">'+sampleWeek()+'<p>'+L('Fasts you finish show up here as filled days.','完成的断食会在这里显示为实心的日子。')+'</p><button class="btn sec" data-act="gotoday">'+L('Start a fast','开始断食')+'</button></div>':recapHtml()+totalsHtml();
  var mname=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(calY,calM,1));
  h+='<div class="group'+(first1?' dim':'')+'"><div class="cal"><div class="cal-h"><button data-act="calprev" aria-label="'+L('Previous month','上个月')+'"'+(canPrev?'':' disabled')+'><svg viewBox="0 0 10 18"><path d="M8.5 1.5 1.5 9l7 7.5"/></svg></button>'+(monthRange()[0]<monthRange()[1]?'<button class="cal-t" data-act="calpick" aria-haspopup="dialog"><span class="mn">'+mname+'</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1.5 1.5 6 6l4.5-4.5"/></svg></button>':'<b class="cal-t0"><span class="mn">'+mname+'</span></b>')+'<button data-act="calnext" aria-label="'+L('Next month','下个月')+'"'+(canNext?'':' disabled')+'><svg viewBox="0 0 10 18"><path d="M1.5 1.5 8.5 9l-7 7.5"/></svg></button></div>';
  h+='<div class="cal-v"><div class="cal-g">'+gridInner(calY,calM);
  h+='</div></div></div>';
  /* the chosen day sits inside the calendar card, right under the grid, so it never lands under the tab bar; nothing is shown until a date is tapped */
  if(selDay){
  var list=(C.fastDays(all)[selDay]||[]).slice().sort(function(a,b){return a.end-b.end;}), fl=S.flex.used.indexOf(selDay)>=0, none=!list.length&&!fl;
  h+='<div class="dayd'+(ddIn&&!reduce?' in':'')+'" id="dayd"><div class="dd-h"><span>'+dateLbl(C.keyToDate(selDay).getTime(),{weekday:'long',month:'long',day:'numeric'})+'</span>'+(none?'<span class="dd-n">'+(selDay>t?L('Nothing here yet','这天还没有记录'):L('Nothing logged','没有记录'))+'</span>':'')+'</div>';
  if(none&&selDay<=t) h+='<div class="dd-acts"><button class="dd-e" data-act="addday">'+L('Add a fast','补记断食')+'</button>'+(care()||C.flexBlock(selDay,{fasts:S.fasts,flex:S.flex,off:S.off,cur:S.cur})?'':'<button class="dd-e" data-act="cheatday" data-k="'+selDay+'">'+L('Use a cheat day','使用弹性日')+'</button>')+'</div>';
  list.forEach(function(f){ var dn=C.isDone(f); h+='<button class="dd-row" data-act="edit" data-id="'+f.id+'"><i class="dd-m'+(dn?' full':'')+'"'+(dn?'':' style="--p:'+dayPart([f]).toFixed(3)+'"')+' aria-hidden="true"></i><span class="stack"><b>'+durTxt(C.hours(f))+'</b><small>'+clockMs(f.start)+' → '+clockMs(f.end)+' · '+(dn?L('goal reached','达成目标')+(C.hours(f)-f.goalH>=1/60?' · '+(S.lang==='zh'?'多 '+durTxt(C.hours(f)-f.goalH):'+'+durTxt(C.hours(f)-f.goalH)):''):L('ended early','提前结束'))+'</small></span><span class="dd-e">'+L('Edit','编辑')+'</span></button>'; });
  if(fl) h+='<div class="dd-row"><i class="dd-m flex" aria-hidden="true"></i><span class="stack"><b>'+L('Cheat day','弹性日')+'</b><small>'+L('Your streak holds, and doesn’t grow.','连续记录保持不变，但不增加。')+'</small></span></div>';
  h+='</div>';
  }
  h+=(first1?'':'<div class="legend"><span><i style="background:var(--tint)"></i>'+L('Goal reached','达成目标')+'</span><span><i class="wedge"></i>'+L('Ended early','提前结束')+'</span>'+(care()?'':'<span><i style="border:1.5px dashed var(--label-2)"></i>'+L('Cheat day','弹性日')+'</span>')+'<span><i style="border:1.5px dotted var(--label-2)"></i>'+L('Time off','休息')+'</span></div>')+'</div>';
  if(!first1) h+='<div class="gh avgh">'+L('Average fast','平均断食时长')+'</div><div id="avgBox">'+avgHtml(avgPlay)+'</div>';
  $('days').innerHTML=h; avgPlay=false; ddIn=false;
  if(numPlay){ numPlay=false; odo($('days').querySelector('.tot .rn')); moonFill($('days').querySelector('.tot')); }
}

/* ---------- in-app wheel pickers: they replace the browser's date, time and select controls ----------
   A row shows the value in a capsule and opens a wheel inline. The wheel has its own physics, like the Apple Clock picker, so it feels the same on
   every phone: it follows the finger, a flick carries on with momentum (and a long glide), and it only lines up with a row once it has nearly stopped.
   Hours and minutes loop (23 is followed by 00). Mouse wheel, trackpad and arrow keys work too. */
var PKH=36, pkTimer=null, pkTick=0;
var PK_TAU=480, PK_GAIN=1.3, PK_VMAX=9, PK_REPS=7, PK_MID=3;   /* glide time constant (ms), flick gain, max speed (px/ms), copies of a looping list, middle copy */
function pkPad(n){ return (n<10?'0':'')+n; }
function pkClamp(v,a,b){ return v<a?a:v>b?b:v; }
function pkDayStart(ms){ var d=new Date(ms); d.setHours(0,0,0,0); return d.getTime(); }
function pkDayText(ms){ var t=pkDayStart(Date.now()), d=pkDayStart(ms), diff=Math.round((t-d)/D);
  if(diff===0) return L('Today','今天'); if(diff===1) return L('Yesterday','昨天');
  return dateLbl(ms,new Date(ms).getFullYear()===new Date().getFullYear()?{weekday:'short',month:'short',day:'numeric'}:{year:'numeric',month:'short',day:'numeric'}); }
function pkText(kind,val){ if(kind==='dt') return pkDayText(+val)+(S.lang==='zh'?' ':', ')+clockMs(+val); if(kind==='t'){ var a=String(val).split(':'); return clockH((+a[0])+(+a[1])/60); } return String(val); }
/* loop: the list is repeated PK_REPS times and the wheel rests in the middle copy, so it can be spun either way without reaching an end */
function pkCol(key,label,items,sel,flex,loop){
  var n=items.length, base=loop?n*PK_MID:0, rows=items, r;
  if(loop){ rows=[]; for(r=0;r<PK_REPS;r++) rows=rows.concat(items); }
  return '<div class="pk-c" role="listbox" tabindex="0" data-c="'+key+'" data-sel="'+sel+'"'+(loop?' data-loop="'+n+'"':'')+' aria-label="'+esc(label)+'" style="flex:'+flex+'">'+rows.map(function(t,i){
    var on=i===sel+base, hid=loop&&(i<base||i>=base+n);
    return '<div class="pk-i'+(on?' sel':'')+'" role="option" aria-selected="'+on+'"'+(hid?' aria-hidden="true"':'')+' data-i="'+i+'">'+t+'</div>'; }).join('')+'</div>'; }
/* kind: 'dt' (ms), 't' ('HH:MM') or 'sel' (a key from opts: [[key,label],...]) */
function pkField(id,label,val,kind,opts){
  var cols='', d, hh, mm, a, hrs=[], mins=[], i;
  if(kind==='sel'){ cols=pkCol('s',label,opts.map(function(o){ return esc(o[1]); }),Math.max(0,opts.map(function(o){ return o[0]; }).indexOf(val)),1); }
  else{
    if(kind==='dt'){ d=new Date(+val); } else { a=String(val).split(':'); d=new Date(); d.setHours(+a[0]||0,+a[1]||0,0,0); }
    hh=d.getHours(); mm=d.getMinutes(); for(i=0;i<24;i++) hrs.push(pkPad(i)); for(i=0;i<60;i++) mins.push(pkPad(i));
    if(kind==='dt'){ var first=Math.min(pkDayStart(+val),pkDayStart(Date.now()-365*D)), last=Math.max(pkDayStart(+val),pkDayStart(Date.now())), days=[], x=new Date(first);
      while(x.getTime()<=last){ days.push(pkDayText(x.getTime())); x.setDate(x.getDate()+1); }
      cols+=pkCol('d',L('Day','日期'),days,Math.round((pkDayStart(+val)-first)/D),2.6); }
    cols+=pkCol('h',L('Hour','小时'),hrs,hh,1,true)+pkCol('m',L('Minute','分钟'),mins,mm,1,true);
  }
  return '<div class="pk" id="'+id+'" data-kind="'+kind+'" data-val="'+esc(String(val))+'"'+(kind==='dt'?' data-d0="'+Math.min(pkDayStart(+val),pkDayStart(Date.now()-365*D))+'"':'')+(kind==='sel'?' data-opts="'+esc(JSON.stringify(opts.map(function(o){return o[0];})))+'" data-labels="'+esc(JSON.stringify(opts.map(function(o){return o[1];})))+'"':'')+'>'+
    '<button type="button" class="row pk-row" data-act="pktog" data-id="'+id+'" aria-expanded="false" aria-controls="'+id+'-w"><span>'+label+'</span><span class="pk-v">'+esc(kind==='sel'?(opts.filter(function(o){return o[0]===val;})[0]||opts[0])[1]:pkText(kind,val))+'</span></button>'+
    '<div class="pk-w" id="'+id+'-w" role="group" aria-label="'+esc(label)+'"><i class="pk-band" aria-hidden="true"></i>'+cols+'</div></div>';
}
function pkVal(id){ return $(id).dataset.val; }
function pkRead(pk){
  var kind=pk.dataset.kind, c=function(k){ var e=pk.querySelector('[data-c="'+k+'"]'); return e?+e.dataset.sel:0; };
  if(kind==='sel') return JSON.parse(pk.dataset.opts)[c('s')];
  var hh=c('h'), mm=c('m');
  if(kind==='t') return pkPad(hh)+':'+pkPad(mm);
  var d=new Date(+pk.dataset.d0); d.setDate(d.getDate()+c('d')); d.setHours(hh,mm,0,0); return String(d.getTime()); }
/* --- the physics --- */
function pkBase(col){ var n=+col.dataset.loop; return n?n*PK_MID:0; }
function pkMaxY(col){ return (col.children.length-1)*PKH; }
function pkPut(col,y){ y=pkClamp(y,0,pkMaxY(col)); col._y=y; col.scrollTop=y; }
function pkStop(col){ if(col._ra){ cancelAnimationFrame(col._ra); col._ra=0; } col._tgt=null; }
/* at rest (or when a finger lands), move a looping wheel back to its middle copy; the rows look identical, so nothing visibly moves */
function pkCenter(col){ var n=+col.dataset.loop; if(!n) return; var y=col.scrollTop, k=Math.floor(y/PKH/n), s=(PK_MID-k)*n*PKH; if(s){ col.scrollTop=y+s; col._y=col.scrollTop; } }
/* glide to a row with an ease-out that starts at the speed the finger left at (tau shorter = quicker stop) */
function pkRun(col,tgt,tau){
  pkStop(col); tgt=pkClamp(Math.round(tgt/PKH)*PKH,0,pkMaxY(col));
  var y0=col.scrollTop, d=tgt-y0;
  if(reduce||Math.abs(d)<.5){ pkPut(col,tgt); pkCenter(col); return; }
  var t0=performance.now(); col._tgt=tgt;
  function step(now){ var rem=d*Math.exp(-(now-t0)/tau);
    if(Math.abs(rem)<1){ col._ra=0; col._tgt=null; pkPut(col,tgt); pkCenter(col); return; }
    pkPut(col,tgt-rem); col._ra=requestAnimationFrame(step); }
  col._ra=requestAnimationFrame(step); }
/* let go at speed v (px per ms): coast for as long as the speed lasts, and end exactly on a row (no second "settle" step) */
function pkFling(col,v){
  var y=col.scrollTop, tgt=reduce?y:y+v*PK_TAU; tgt=pkClamp(Math.round(tgt/PKH)*PKH,0,pkMaxY(col));
  var d=tgt-y, tau=(d*v>0)?pkClamp(d/v,110,PK_TAU*1.6):190;
  pkRun(col,tgt,tau); }
function pkSet(col,i,smooth){ i=pkClamp(i,0,col.children.length-1); if(smooth&&!reduce) pkRun(col,i*PKH,150); else{ pkStop(col); pkPut(col,i*PKH); } }
/* the drum: rows within three of the centre fade, shrink and tilt away from it; the rest rest at the CSS values */
function pkDrum(col){
  var c=col.scrollTop/PKH, n=col.children.length, lo=Math.max(0,Math.floor(c)-3), hi=Math.min(n-1,Math.ceil(c)+3), i, o, a, el, prev=col._lit||[];
  for(i=0;i<prev.length;i++){ if(prev[i]<lo||prev[i]>hi){ el=col.children[prev[i]]; if(el){ el.style.opacity=''; el.style.transform=''; } } }
  for(i=lo;i<=hi;i++){ el=col.children[i]; o=i-c; a=Math.min(Math.abs(o),3);
    el.style.opacity=(1-a*.24).toFixed(3);
    if(!reduce) el.style.transform='perspective(260px) rotateX('+(-o*15).toFixed(2)+'deg) scale('+(1-a*.045).toFixed(3)+')'; }
  col._lit=[]; for(i=lo;i<=hi;i++) col._lit.push(i); }
/* a new row is under the selection line: a haptic tick (follows the Vibration setting), and the value updates */
function pkTune(col){
  var pk=col.closest('.pk'), n=+col.dataset.loop||0, i=pkClamp(Math.round(col.scrollTop/PKH),0,col.children.length-1), s=n?i%n:i,
      old=col.querySelector('.pk-i.sel');
  if(old&&+old.dataset.i===i) return;
  if(old){ old.classList.remove('sel'); old.setAttribute('aria-selected','false'); } col.children[i].classList.add('sel'); col.children[i].setAttribute('aria-selected','true');
  if(+col.dataset.sel===s) return;   /* only the copy changed (the wheel re-centred): same value, no tick */
  col.dataset.sel=s; var t=performance.now(); if(t-pkTick>38){ pkTick=t; fx('select'); }
  var v=pkRead(pk); pk.dataset.val=v; var kind=pk.dataset.kind;
  pk.querySelector('.pk-v').textContent=kind==='sel'?JSON.parse(pk.dataset.labels)[col.dataset.sel]:pkText(kind,v);
  pkChange(pk.id,v); }
function pkChange(id,v){
  if(id==='obStart'){ ob.start=v; obBigUpdate(); }
  else if(id==='obCustom'){ ob.customH=+v; ob.plan='custom'; ob.planAuto=false; obBigUpdate(); }
  else if(id==='obCity') setPlace({key:v});
  else if(id==='rpWt') rp.wkg=C.toKg(+v,S.body.unit||'kg');
  else if(id==='obAge') ob.age=+v;
  else if(id==='obWt') ob.kg=C.toKg(+v,ob.unit);
  else if(id==='obHt') ob.cm=ob.unit==='lb'?+v*2.54:+v;
  else if(id==='usualStart'){ clearTimeout(pkTimer); pkTimer=setTimeout(function(){ S.prefs.usualStart=v; save(); cache={}; updateToday(); },400); } }
function pkBind(c){
  c.addEventListener('scroll',function(){ pkTune(c); if(!c._raf) c._raf=requestAnimationFrame(function(){ c._raf=0; pkDrum(c); }); },{passive:true});
  c.addEventListener('pointerdown',function(e){ if((c._pid!=null&&performance.now()-(c._pt||0)<1200)||(e.pointerType==='mouse'&&e.button!==0)) return;   /* a finger whose lift was never seen must not freeze the wheel: after 1.2 s of silence the next touch takes over */
    c._pt=performance.now(); actx(); pkStop(c); clearTimeout(c._wt); pkCenter(c); c._y=c.scrollTop; c._pid=e.pointerId; c._py=e.clientY; c._moved=0; c._s=[[e.timeStamp,e.clientY]]; c.classList.add('drag');
    try{ c.setPointerCapture(e.pointerId); }catch(x){} });
  c.addEventListener('pointermove',function(e){ if(c._pid!==e.pointerId) return; c._pt=performance.now();
    var dy=e.clientY-c._py; c._py=e.clientY; c._moved+=Math.abs(dy); pkPut(c,c._y-dy); pkTune(c);   /* tick inside the touch event itself: iPhone only plays its tap from a real touch */
    var s=c._s; s.push([e.timeStamp,e.clientY]); while(s.length>2&&e.timeStamp-s[0][0]>90) s.shift(); });
  function up(e){ if(c._pid!==e.pointerId) return; c._pid=null; c.classList.remove('drag');
    if(c._moved<6){   /* a tap: glide to the row that was tapped */
      var el=document.elementFromPoint(e.clientX,e.clientY), it=el&&el.closest&&el.closest('.pk-i'); if(it&&c.contains(it)&&e.type==='pointerup') pkSet(c,+it.dataset.i,true); else pkRun(c,c.scrollTop,190); return; }
    var s=c._s, a=s[0], z=s[s.length-1], v=0;
    if(e.type==='pointerup'&&s.length>1&&e.timeStamp-z[0]<70&&z[0]>a[0]) v=-(z[1]-a[1])/(z[0]-a[0]);   /* a finger that rested before lifting does not fling */
    pkFling(c,pkClamp(v*PK_GAIN,-PK_VMAX,PK_VMAX)); }
  c.addEventListener('pointerup',up); c.addEventListener('pointercancel',up); c.addEventListener('lostpointercapture',up);
  c.addEventListener('wheel',function(e){ e.preventDefault();
    var dy=e.deltaMode===1?e.deltaY*PKH:e.deltaMode===2?e.deltaY*PKH*5:e.deltaY;
    if(Math.abs(dy)>=40){   /* a mouse-wheel notch: step a few rows */
      var base=c._tgt!=null?c._tgt:Math.round(c.scrollTop/PKH)*PKH; pkRun(c,base+(dy<0?-1:1)*Math.max(1,Math.round(Math.abs(dy)/45))*PKH,150); }
    else{ pkStop(c); pkCenter(c); pkPut(c,c.scrollTop+dy); clearTimeout(c._wt); c._wt=setTimeout(function(){ pkRun(c,c.scrollTop,190); },110); } },{passive:false});
  c.addEventListener('keydown',function(e){ var step={ArrowUp:-1,ArrowDown:1,PageUp:-5,PageDown:5}[e.key]; if(step==null&&e.key!=='Home'&&e.key!=='End') return; e.preventDefault();
    var n=+c.dataset.loop||0, base=pkBase(c), tgt=c._tgt; if(tgt==null){ pkCenter(c); tgt=Math.round(c.scrollTop/PKH)*PKH; }
    var i=Math.round(tgt/PKH), lo=base, hi=base+(n||c.children.length)-1;
    pkSet(c,e.key==='Home'?lo:e.key==='End'?hi:i+step,true); }); }
function pkToggle(id){
  var pk=$(id), open=!pk.classList.contains('open');
  Array.prototype.forEach.call(pk.parentNode.querySelectorAll('.pk.open'),function(o){ if(o!==pk){ o.classList.remove('open'); o.querySelector('.pk-row').setAttribute('aria-expanded','false'); } });
  pk.classList.toggle('open',open); pk.querySelector('.pk-row').setAttribute('aria-expanded',String(open));
  if(!open) return; loadTick(actx());   /* a real tap: lets the wheel's tick sound start on iPhone */
  Array.prototype.forEach.call(pk.querySelectorAll('.pk-c'),function(c){
    pkSet(c,pkBase(c)+(+c.dataset.sel),false); pkDrum(c);
    if(c._on) return; c._on=true; pkBind(c); });
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
  selDay=C.dayKey(e); var d=new Date(e); calY=d.getFullYear(); calM=d.getMonth();
  save(); closeSheet(); renderDays(); cache={}; toast(L('Saved.','已保存。'));
}

/* ---------- import from other apps ---------- */
var impPlan=null, impZip=null; /* impZip: the zip the person chose, kept in memory only while they type its password */
/* Me, Export my fasts: a spreadsheet to read, or a backup file to keep. Says plainly what each brings back. */
function saveFile(text,type,name){ try{ var blob=new Blob([text],{type:type}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500); return true; }catch(e){ toast(L('Couldn’t export.','导出失败。')); } }
function exportSheet(){
  var n=S.fasts.filter(function(f){ return f.end>f.start; }).length;
  openSheet('<h3>'+L('Export my fasts','导出我的记录')+'</h3><p class="lede">'+(n?L('Choose a file to save. It is made on this phone and never uploaded.','选择要保存的文件。文件在手机上生成，不会上传。'):L('There are no finished fasts to export yet.','还没有已完成的断食可以导出。'))+'</p>'+
   '<div class="group"><button class="row" data-act="exportcsv"'+(n?'':' disabled')+'>'+mi('exp','grey')+'<span class="stack"><span>'+L('Spreadsheet (CSV)','表格（CSV）')+'</span><small>'+L('One line per fast: start, end, hours and goal. Opens in Excel, Numbers and Google Sheets.','每次断食一行：开始、结束、时长和目标。可用 Excel、Numbers 和 Google 表格打开。')+'</small></span>'+CHEV+'</button>'+
   '<button class="row" data-act="exportbk">'+mi('exp','grey')+'<span class="stack"><span>'+L('Backup file (JSON)','备份文件（JSON）')+'</span><small>'+L('Everything saved on this phone, including your health answers and weight, so keep it private.','保存在这台手机上的全部内容，包括健康回答和体重，请妥善保管。')+'</small></span>'+CHEV+'</button></div>'+
   '<p class="note">'+L('Importing a backup brings back each fast’s start, end and goal. Your plan, settings and health answers are not restored. Sign in to back up everything.','导入备份会恢复每次断食的开始、结束和目标，不会恢复计划、设置和健康回答。登录后可备份全部。')+'</p>');
}
function importSheet(err){
  impPlan=null; impZip=null;
  openSheet('<h3>'+L('Import from another app','从其他应用导入')+'</h3><p class="lede">'+L('Bring your past fasts with you. The file is read on this phone and never uploaded.','把过去的断食记录带过来。文件只在这台手机上读取，不会上传。')+'</p>'+
   '<div class="group"><div class="row"><span class="stack"><span>Zero</span><small>'+L('Download your data from Zero, then choose the zip.','在 Zero 里下载你的数据，然后选择 zip 文件。')+'</small></span></div>'+
   '<div class="row"><span class="stack"><span>'+L('Other apps','其他应用')+'</span><small>'+L('A CSV or JSON file with a start and an end time for each fast.','包含每次断食开始和结束时间的 CSV 或 JSON 文件。')+'</small></span></div><div class="row"><span class="stack"><span>'+L('Lightly backup','轻伴备份')+'</span><small>'+L('Brings back each fast’s start, end and goal. Your plan, settings and health answers are not restored.','恢复每次断食的开始、结束和目标，不会恢复计划、设置和健康回答。')+'</small></span></div></div>'+
   (err?'<p class="note err" role="alert">'+err+'</p>':'')+
   '<div class="btns"><label class="btn" for="impFile">'+L('Choose a file','选择文件')+'</label><input id="impFile" type="file" accept=".zip,.json,.csv,.txt,application/zip,application/x-zip-compressed,application/json,text/csv,text/plain" hidden><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>');
}
function zipSheet(err){
  openSheet('<h3>'+L('Enter the password','输入密码')+'</h3><p class="lede">'+L('It’s in the email with your download.','密码在随下载一起发来的邮件里。')+'</p>'+
   '<div class="group"><div class="field"><label for="zipPw">'+L('Password','密码')+'</label><input id="zipPw" type="password" name="zip-password" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div>'+
   (err?'<p class="note err" role="alert" style="color:var(--red)">'+L('That password didn’t work.','这个密码不对。')+'</p>':'')+
   '<div class="btns"><button class="btn" id="zipGo" data-act="zipgo">'+L('Unlock','解锁')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>');
  var i=$('zipPw'); if(i){ i.addEventListener('keydown',function(e){ if(e.key==='Enter'){ e.preventDefault(); A.zipgo(); } }); setTimeout(function(){ try{ i.focus(); }catch(e){} },350); }
}
function importPreview(p){
  impPlan=p; impZip=null; var skip=[];
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
/* the result of an import (TEEBO picked option B): the preview sheet closes, a short pause, one new sheet rises with a green check already in its header,
   the check draws, and as it lands the goal chime and success haptic play and the title, the number, the details and the buttons arrive one after another. */
var IMPCK='<svg class="imp-ck" viewBox="0 0 56 56" aria-hidden="true"><circle class="disc" cx="28" cy="28" r="27"/><circle class="ring" cx="28" cy="28" r="26" pathLength="1"/><path class="tick" d="M16.5 29.5l8 8 15-17" pathLength="1"/></svg>';
function importDo(){
  var p=impPlan; if(!p||!p.add.length) return;
  /* check again against the latest state, so a double tap can never create duplicates */
  var q=LightlyImport.plan({source:p.source,items:p.add,open:0},S.fasts,S.cur,S.del,Date.now());
  if(!q.add.length){ impPlan=null; closeSheet(); return; } /* nothing left to add: no sheet, no chime */
  q.add.forEach(function(f){ S.fasts.push(f); });
  var n=q.add.length, onb=!$('ob').hidden&&ob&&obFlow()[ob.step]==='import', ok=q.add.filter(function(f){ return C.isDone(f); }).length, skipped=(q.dup||0)+(q.overlap||0)+(q.open||0)+(q.bad||0)+(q.future||0),
    o={year:'numeric',month:'short',day:'numeric'}, rng=dateLbl(q.first,o)+' – '+dateLbl(q.last,o), hrs=q.add.reduce(function(a,f){ return a+(C.isDone(f)?(f.end-f.start)/H:0); },0);
  impPlan=null; save(); cache={}; renderMe(); updateToday(); checkUnlocks(); if(onb) setTimeout(function(){ A.obnext(); },260);
  var html='<div class="imp-res"><div class="badge">'+IMPCK+'</div><div class="center" role="status"><span class="k stg">'+(onb?L('Welcome. Your fasts came with you.','欢迎。你的断食记录都带来了。'):L('Import complete','导入完成'))+'</span><span class="big stg">'+(onb?numTxt(hrs):n)+'</span><span class="of stg">'+(onb?L('hours already fasted','小时已断食'):L(n===1?'fast added to Days':'fasts added to Days','次断食已添加到“日子”'))+'</span>'+
    '<div class="facts stg">'+(onb?'<div><b>'+n+'</b><span>'+L(n===1?'Fast':'Fasts','次断食')+'</span></div>':'<div><b class="rn">'+numTxt(hrs)+'</b><span>'+L('Hours fasted','小时断食')+'</span></div>')+'<div><b>'+ok+'</b><span>'+L('Reached the goal','达成目标')+'</span></div><div><b>'+skipped+'</b><span>'+L('Skipped','已跳过')+'</span></div></div>'+
    '<p class="note stg">'+L('Covers '+rng+'. Skipped fasts were already in Lightly, overlapped one you have, or had unusable times.','时间范围：'+rng+'。已跳过的记录要么已在轻伴里，要么与已有记录重叠，要么时间无效。')+'</p>'+
    '<div class="btns stg lock"><button class="btn" data-act="close">'+L('Done','完成')+'</button>'+(onb?'':'<button class="btn sec" data-act="impdays">'+L('See in Days','在“日子”里查看')+'</button>')+'</div></div></div>';
  /* the preview sheet slides away (the dim stays), then a pause, then the result rises */
  sheetEl.classList.remove('open'); sheetHold=true;
  setTimeout(function(){
    sheetHold=false;
    if(!sheetOpen){ fx('success'); return; }
    openSheet(html);
    var root=sheetEl.querySelector('.imp-res'), st=[].slice.call(root.querySelectorAll('.stg')), big=st[1], t0=reduce?0:200, land=reduce?300:1000;
    function live(){ return root.isConnected; }
    function T(ms,fn){ setTimeout(function(){ if(live()) fn(); },ms); }
    T(t0,function(){ root.classList.add('go'); });
    setTimeout(function(){ fx('success'); },land); /* the chime and haptic play once as the check lands */
    T(land,function(){ st[0].classList.add('on'); big.classList.add('on'); if(onb){ odo(big); } else if(!reduce){ var c0=performance.now(); big.textContent='0'; (function step(){ var k=Math.min((performance.now()-c0)/600,1); big.textContent=Math.round(n*(1-Math.pow(1-k,3))); if(k<1&&live()) requestAnimationFrame(step); })(); } });
    T(land+150,function(){ st[2].classList.add('on'); st[3].classList.add('on'); if(!onb) odo(root.querySelector('.facts .rn')); });   /* the imported hours roll up like the recap's total */
    T(land+280,function(){ st[4].classList.add('on'); });
    T(land+400,function(){ st[5].classList.add('on'); st[5].classList.remove('lock'); }); /* the buttons arrive last and only then take taps, so a double tap on Add cannot dismiss the result */
  },reduce?250:380);
}
function impMsg(code){ return code==='format'?L('I couldn’t find fasts with a start and an end time in that file.','在这个文件里没有找到带开始和结束时间的断食记录。'):code==='zip'?L('I couldn’t find fasts in that zip.','在这个 zip 里没有找到断食记录。'):code==='nozip'?L('This browser can’t open zips. Unzip it first, then choose the file inside.','这个浏览器无法打开 zip。请先解压，再选择里面的文件。'):L('That file isn’t readable.','这个文件无法读取。'); }
document.addEventListener('change',function(e){
  var t=e.target; if(!t||(t.id!=='impFile'&&t.id!=='obImpFile')||!t.files||!t.files[0]) return; var f=t.files[0];
  if(f.size>20*1048576) return importSheet(L('That file is too large.','文件太大了。'));
  var r=new FileReader();
  function got(res){
    if(res.error==='encrypted'||res.error==='password') return zipSheet(res.error==='password');
    if(res.error) return importSheet(impMsg(res.error));
    importPreview(LightlyImport.plan(res,S.fasts,S.cur,S.del,Date.now()));
  }
  r.onerror=function(){ importSheet(L('Couldn’t read that file.','无法读取这个文件。')); };
  if(/\.zip$/i.test(f.name)||f.type==='application/zip'||f.type==='application/x-zip-compressed'){ r.onload=function(){ impZip=r.result; LightlyImport.fromZip(impZip).then(got); }; r.readAsArrayBuffer(f); return; }
  r.onload=function(){ var res=LightlyImport.parse(String(r.result||'')); got(res); };
  r.readAsText(f);
});

/* ---------- cheat days (弹性日) ---------- */
function flexTick(){ C.flexRefill(S.flex,S.startedAt||Date.now()); }
function cheatSheet(day){
  if(offNow()||care()) return; /* no cheat days during time off (the break already holds the streak), and none in Care mode */
  flexTick(); var k=typeof day==='string'?day:today(), used=S.flex.used.indexOf(k)>=0, blk=C.flexBlock(k,{fasts:S.fasts,flex:S.flex,off:S.off,cur:S.cur}), b=S.flex.bank;
  var moons=''; for(var i=0;i<2;i++) moons+='<svg width="30" height="30" viewBox="-15 -15 30 30" style="margin-right:6px" aria-hidden="true"><circle r="12" style="fill:'+(i<b?'var(--moon)':'none')+';stroke:'+(i<b?'var(--moon-edge)':'var(--label-2)')+'" stroke-width="1.5"/></svg>';
  var why={used:'',fasted:L('You fasted today, so you don’t need one.','今天你已经断食了，不需要使用。'),fasting:L('You’re fasting now. End the fast first.','你正在断食，先结束这次断食。'),bank:L('None left. A new one arrives every Monday.','已经用完。每周一会补一个。'),week:L('Two in a week is the limit, so you still fast at least five days.','一周最多两个，这样每周至少断食五天。'),window:''}[blk]||'';
  openSheet('<h3>'+L('Cheat days','弹性日')+'</h3><p class="lede">'+L('A calendar day off, midnight to midnight. Your streak keeps going.','一个日历天，午夜到午夜，连续不会断。')+'</p>'+
    '<div class="group"><div class="row" style="min-height:60px"><span style="display:flex">'+moons+'</span><span class="v">'+L(b+' left',b+' 个可用')+'</span></div></div>'+
    '<p class="note">'+(why||L('A new one arrives every Monday. You can keep two.','每周一补充一个，最多存两个。'))+'</p>'+
    '<div class="btns">'+(used?'<button class="btn sec" data-act="undocheat" data-k="'+k+'">'+(k===today()?L('Take today’s cheat day back','收回今天的弹性日'):L('Take this cheat day back','收回这天的弹性日'))+'</button>':'<button class="btn hold" data-hold="usecheat" data-k="'+k+'"'+(blk?' disabled':'')+'><span class="hl">'+L('Hold to use a cheat day','按住使用弹性日')+'</span></button>')+'<button class="btn sec" data-act="close">'+L('Close','关闭')+'</button></div>');
}
function useCheat(k){ flexTick(); var b=C.flexBlock(k,{fasts:S.fasts,flex:S.flex,off:S.off,cur:S.cur}); if(b) return toast(L('A cheat day can’t be used for that day.','这天不能使用弹性日。')); S.flex.used.push(k); S.flex.bank--; save(); closeSheet(); cache={}; updateToday(); if(curTab==='days') renderDays(); toast(L('Cheat day used. Your streak holds.','已使用弹性日，连续记录保持。')); }

/* ---------- Care mode: Me, Health answers ----------
   Adding an answer is instant. Pregnancy or breastfeeding ending is one tap. Diabetes medication (or an earlier answer) needs a health professional's OK and a 14 day wait.
   An eating-disorder history cannot be eased here. When the last answer goes, Care mode ends and long fasts start again from zero (the first-timer ladder). */
var CARE_TXT={preg:['Pregnant or breastfeeding','怀孕或哺乳期'],diab:['I take medication for diabetes','我在服用糖尿病药物'],ed:['I have had an eating disorder','我有过进食障碍'],earlier:['Answered earlier','之前的回答']};
var CK_SVG='<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
function careTick(){ var P=S.profile, w=P.careOff; if(!w||!w.keys||Date.now()<w.start+C.CARE_WAIT) return; P.careOff=null; careDrop(w.keys,true); }
/* make everything agree with the answers: Care mode stops at 16:8, has no Ramadan and no long fasts */
function careApply(){ var P=S.profile; careMigrate(); if(!P.safety) return; S.ramadanPreview=false; if(S.customH>16) S.customH=16; if(S.planId==='24'||S.planId==='36'||S.planId==='ramadan') S.planId='13'; normalisePlan(); }
function careDrop(keys,quiet0){
  var P=S.profile; P.care=(P.care||[]).filter(function(k){ return keys.indexOf(k)<0; }); P.careOff=null; if(P.careUndo&&keys.indexOf(P.careUndo.k)>=0) P.careUndo=null;
  if(P.care.length) careApply(); else{ P.safety=false; P.fastedBefore=false; S.unlocked={}; S.flex.mon=C.mondayOf(Date.now()); }
  save(); if(quiet0) return; cache={}; ticksKey=''; updateToday(); if(curTab==='days') renderDays(); if(curTab==='me') renderMe();
}
/* Adding an answer is confirmed first, and can be undone for 24 hours: the plan, custom hours and Ramadan preview from before are kept in profile.careUndo and put back. */
function careUndoOpen(){ var P=S.profile, u=P.careUndo; return u&&(P.care||[]).indexOf(u.k)>=0&&Date.now()<u.at+C.CARE_UNDO?u:null; }
function careAdd(k){
  var P=S.profile; if(!Array.isArray(P.care)) P.care=[]; if(P.care.indexOf(k)>=0) return;
  P.careUndo={k:k,at:Date.now(),prev:{planId:S.planId,customH:S.customH,ramadanPreview:!!S.ramadanPreview}};
  P.care.push(k); careApply(); save(); fx('select'); cache={}; ticksKey=''; updateToday(); if(curTab==='me') renderMe();
}
function careUndoGo(){
  var P=S.profile, u=careUndoOpen(); if(!u) return careSheet();
  P.care=P.care.filter(function(x){ return x!==u.k; }); P.careUndo=null;
  if(P.careOff&&P.careOff.keys){ P.careOff.keys=P.careOff.keys.filter(function(x){ return x!==u.k; }); if(!P.careOff.keys.length) P.careOff=null; }
  P.safety=P.care.length>0;
  if(u.prev){ if(typeof u.prev.planId==='string') S.planId=u.prev.planId; if(typeof u.prev.customH==='number') S.customH=u.prev.customH; S.ramadanPreview=!!u.prev.ramadanPreview; }
  if(P.safety) careApply(); normalisePlan();
  save(); fx('select'); cache={}; ticksKey=''; updateToday(); if(curTab==='days') renderDays(); if(curTab==='me') renderMe(); careSheet();
}
function careConfirm(k){
  var was=care(), what=was?L('Care mode is already on.','关怀模式已经开启。'):L('Fasts stay at 16:8 or shorter, with no streaks.','断食最长 16:8，没有连续天数。');
  if(k==='ed') what+=L(' Friends is hidden.','朋友标签页会隐藏。');
  var lab=was?['Add this answer','加入这个回答']:['Turn on Care mode','开启关怀模式'], ready=was?['Hold to add','按住加入']:['Hold to turn on','按住开启'];
  openSheet('<!--keep--><div class="warn-ico care">'+WARN+'</div><h3 class="ctr">'+(was?L('Add this answer?','加入这个回答？'):L('Turn on Care mode?','开启关怀模式？'))+'</h3><p class="lede ctr">'+what+L(' ','')+L('You can undo it for 24 hours.','24 小时内可以撤销。')+'</p>'+
    '<div class="btns"><button class="btn sec" data-act="care">'+L('Cancel','取消')+'</button>'+lockedHold('careOnGo','careadd',lab,' data-k="'+k+'" data-buzz="1"','warm solid')+'</div>');
  fx('warn'); unlockHold('careOnGo',lab,ready);
}
function careSheet(){
  careTick(); var P=S.profile, cur=P.care||[], w=P.careOff, h='<h3>'+L('Health answers','健康回答')+'</h3><p class="lede">'+L('These keep Lightly gentle for you.','这些回答让轻伴对你更温和。')+'</p><div class="group">';
  ['preg','diab','ed','earlier'].forEach(function(k){ var on=cur.indexOf(k)>=0; if(k==='earlier'&&!on) return;
    h+='<button class="check" role="checkbox" aria-checked="'+on+'" data-act="carerow" data-k="'+k+'"><span class="bx">'+CK_SVG+'</span><span>'+L(CARE_TXT[k][0],CARE_TXT[k][1])+'</span></button>'; });
  h+='</div>';
  if(w) h+='<p class="note">'+L('Easing starts '+dateLbl(w.start+C.CARE_WAIT)+'. Nothing changes until then.','放宽将在 '+dateLbl(w.start+C.CARE_WAIT)+' 开始，在此之前一切照旧。')+'</p><div class="btns"><button class="btn sec" data-act="carecancel">'+L('Cancel the wait','取消等待')+'</button>';
  else{ var u=careUndoOpen(), until=u&&u.at+C.CARE_UNDO;
    if(u) h+='<p class="note">'+L('Added by mistake? You can undo “'+CARE_TXT[u.k][0]+'” until '+dateLbl(until)+', '+clockMs(until)+'. Your plan goes back to how it was.','点错了？可以在 '+dateLbl(until)+' '+clockMs(until)+' 之前撤销“'+CARE_TXT[u.k][1]+'”，你的计划会恢复原样。')+'</p><div class="btns"><button class="btn" data-act="careundo">'+L('Undo','撤销')+'</button>';
    else h+='<p class="note">'+L('Tap an answer to add it. You will be asked to confirm. To change one you already have, tap it.','点一个回答即可加入，加入前会请你确认。已有的回答，点一下可以调整。')+'</p><div class="btns">'; }
  openSheet(h+'<button class="btn sec" data-act="close">'+L('Done','完成')+'</button></div>');
}
function bodySheet(){
  var b=S.body; if(!b) return closeSheet(); var u=b.unit||'kg';
  openSheet('<h3>'+L('About you','关于你')+'</h3><p class="lede">'+L('Saved for your monthly check-ins. Private unless you turn on Compare with others.','只用于你的每月记录。除非你打开“和其他人比较”，否则不会分享。')+'</p><div class="group"><div class="row"><span>'+L('Age','年龄')+'</span><b>'+b.age+'</b></div><div class="row"><span>'+L('Weight','体重')+'</span><b>'+Math.round(C.kgTo(b.kg,u))+' '+uLbl(u)+'</b></div><div class="row"><span>'+L('Height','身高')+'</span><b>'+b.cm+' cm</b></div>'+(b.sex?'<div class="row"><span>'+L('Gender','性别')+'</span><b>'+(b.sex==='f'?L('Female','女'):b.sex==='x'?L('Non-binary','非二元'):L('Male','男'))+'</b></div>':'')+'</div>'+
    '<div class="group"><div class="row"><span>'+L('Monthly weight check-in','每月体重记录')+'</span><button class="sw" role="switch" aria-checked="'+!b.checkOff+'" aria-label="'+L('Monthly weight check-in','每月体重记录')+'" data-act="bodycheck"></button></div></div>'+
    (care()||b.checkOff?'':'<div class="group"><div class="row"><span>'+L('Compare with others','和其他人比较')+'</span><button class="sw" role="switch" aria-checked="'+!!b.share+'" aria-label="'+L('Compare with others','和其他人比较')+'" data-act="bodytrend"></button></div></div><p class="note">'+L('Only your change in percent, no name, at day 30, 60 and 90. Needs an account.','只分享体重变化的百分比，不带名字，在第 30、60、90 天。需要账号。')+'</p>')+
    '<div class="btns"><button class="btn red" data-act="bodyrm">'+L('Remove them','删除')+'</button><button class="btn sec" data-act="close">'+L('Done','完成')+'</button></div>');
}
function careRow(b){
  var k=b.dataset.k, P=S.profile, on=(P.care||[]).indexOf(k)>=0;
  if(!on) return careConfirm(k);
  var how=C.careEase(k);
  if(how==='now') return openSheet('<h3>'+L('No longer pregnant or breastfeeding?','不再怀孕或哺乳了吗？')+'</h3><p class="lede">'+L('Care mode eases once nothing else is ticked. Please check with your doctor before longer fasts.','没有其他勾选时，关怀模式会放宽。想断食更久之前，请先咨询医生。')+'</p>'+
    '<div class="btns"><button class="btn" data-act="careeasego" data-k="'+k+'">'+L('Yes, update','是的，更新')+'</button><button class="btn sec" data-act="care">'+L('Not now','先不用')+'</button></div>');
  if(how==='never') return openSheet('<h3>'+L('We’ll keep this on for you','我们会一直为你保持')+'</h3><p class="lede">'+L('If a health professional supports a change, please contact us. Our details are on the Privacy page.','如果有医护人员支持你调整，请联系我们。联系方式在隐私政策页。')+'</p>'+
    '<div class="btns"><a class="btn" href="privacy/?lang='+S.lang+'" target="_blank" rel="noopener">'+L('Privacy Policy','隐私政策')+'</a><button class="btn sec" data-act="care">'+L('Back','返回')+'</button></div>');
  openSheet('<h3>'+L('My situation has changed','我的情况变了')+'</h3><p class="lede">'+L('Only a doctor, midwife or dietitian who knows you can say whether longer fasts are right for you.','只有了解你情况的医生、助产士或营养师，才能判断更长的断食是否适合你。')+'</p>'+
    '<div class="group" id="lsChecks"><button class="check" role="checkbox" aria-checked="false" data-act="carepro"><span class="bx">'+CK_SVG+'</span><span>'+L('A health professional who knows my situation said it is fine','了解我情况的医护人员说可以')+'</span></button></div>'+
    '<p class="note">'+L('Then a 14-day wait. Nothing changes meanwhile, and you can cancel any time. After it, long fasts start again from zero.','然后等待 14 天，期间一切照旧，随时可以取消。之后长时间断食要重新从零开始。')+'</p>'+
    '<div class="btns"><button class="btn" id="careGo" data-act="carewait" data-k="'+k+'" disabled>'+L('Start the 14-day wait','开始 14 天等待')+'</button><button class="btn sec" data-act="care">'+L('Not now','先不用')+'</button></div>');
}

/* ---------- plan sheet ---------- */
var moreOpen=false;
function planSheet(){
  var cur=S.cur, h='<h3>'+L('Your plan','你的计划')+'</h3><p class="lede">'+(cur?L('Switching now keeps your start time. The disc refills to the new goal.','现在切换会保留开始时间，圆盘按新目标重新计算。'):L('This is the plan your next fast uses. Times are if you start now.','下一次断食会用这个计划。时间按现在开始计算。'))+'</p>';
  var selId=cur?cur.planId:S.planId;
  if(inRamadan()) h+='<div class="group"><button class="plan'+(selId==='ramadan'?' sel':'')+'" data-act="pickplan" data-id="ramadan"><span class="pn"><span class="pt"><b>'+L('Ramadan','斋月')+'</b><span class="pill tint">'+L('In season','当季')+'</span></span><small>'+L('Dawn to sunset, this month','黎明到日落，本月')+'</small></span>'+CHECK+'</button></div>';
  h+='<div class="group">'; C.PLANS.filter(function(p){return p.top;}).forEach(function(p){ h+=planRow(p,selId); }); h+='</div>';
  if(pst(selId).st==='soft') h+='<p class="gf obnote" style="padding:0 4px">'+softNote()+'</p>';
  h+='<div class="group"><button class="row" data-act="more" aria-expanded="'+moreOpen+'" style="min-height:52px"><b style="font-weight:600">'+L('More plans','更多计划')+'</b><span class="v" style="margin-left:auto"></span><svg class="chev" viewBox="0 0 8 14" style="transform:rotate('+(moreOpen?90:0)+'deg);transition:transform .3s"><path d="M1.5 1.5 7 7l-5.5 5.5"/></svg></button>';
  if(moreOpen){ C.PLANS.filter(function(p){return !p.top;}).forEach(function(p){ h+=planRow(p,selId); }); if(S.profile.safety) h+='<div class="row"><span class="stack"><small>'+L('Long fasts aren’t offered based on your answers. If you’d like to fast longer, please talk to a doctor first.','根据你的回答，不提供长时间断食。如果想断食更久，请先咨询医生。')+'</small></span></div>'; }
  h+='</div><div class="btns"><button class="btn sec" data-act="close">'+L('Done','完成')+'</button></div>';
  openSheet(h);
}
function planRow(p,selId){
  var pl=p.custom?C.planById('custom',S.customH):p, lab=C.planLabel(pl), sub='', dis=false, pill='', bar='';
  if(p.long){
    var st=longSt(p.fast);
    if(st.st==='hidden'){ dis=true; pill='<span class="pill">'+L('Not offered','不提供')+'</span>'; } /* Care mode: nothing to unlock, so no progress bar */
    else if(st.st==='locked'){ dis=true; pill='<span class="pill">'+L('Locked','未解锁')+'</span>'; sub=st.label; bar='<div class="bar"><i style="width:'+Math.round(st.pct*100)+'%"></i></div>'; if(S.lang==='zh') sub=zhProgress(st.label); }
    else if(st.st==='paused'){ dis=true; pill='<span class="pill">'+L('Paused','已暂停')+'</span>'; sub=L('You said you felt unwell. Available again ','你说过身体不适，可用时间：')+dateLbl(st.until); }
    else if(st.st==='wait'){ dis=true; pill='<span class="pill">'+L('Rest first','先休息')+'</span>'; sub=L('Available again ','可用时间：')+dateLbl(st.until); }
    else if(st.exp){ pill='<span class="pill">'+L('Advanced','进阶')+'</span>'; sub=p.fast===24?L('Only if you have done it before. Once a week at most.','做过再选，每周最多一次。'):L('Only if you have done it before. Twice a month at most.','做过再选，每月最多两次。'); if(st.note) sub=L('Maybe rest a few more days first.','也许再多休息几天。'); }
    else sub=L('Unlocked. Water and electrolytes recommended.','已解锁。建议补充水分和电解质。');
  }else{
    var ps=pst(p.id);
    if(ps.st==='hidden') return ''; /* Care mode stops at 16:8 */
    if(ps.st==='locked'){ dis=true; pill='<span class="pill">'+L('Locked','未解锁')+'</span>'; sub=S.lang==='zh'?zhProgress(C.planStatusLabel(ps)):C.planStatusLabel(ps); bar='<div class="bar"><i style="width:'+Math.round(ps.pct*100)+'%"></i></div>'; }
    else{ sub=p.custom?L('Choose 12 to '+C.customMax(S.profile)+' hours','12 到 '+C.customMax(S.profile)+' 小时之间'):fastSub(p)+planUntil(p.fast); bar=dayBar(pl); if(ps.st==='soft') pill='<span class="pill">'+L('Advanced','进阶')+'</span>'; }
  }
  var extra=p.custom&&!dis?'<span class="pr" style="min-width:0"></span>':'';
  var row='<button class="plan'+(selId===p.id?' sel':'')+'" data-act="pickplan" data-id="'+p.id+'"'+(dis?' disabled':'')+(pill&&!dis&&!p.long?' data-soft="1"':'')+'><span class="pn"><b>'+esc(pName(p))+'</b><small>'+sub+'</small>'+bar+'</span>'+pill+'<span class="pr">'+lab+'</span>'+CHECK+'</button>';
  if(p.custom&&selId==='custom') row+='<div class="field"><label for="cH">'+L('Fasting hours','断食小时数')+'</label><input id="cH" type="number" min="12" max="'+C.customMax(S.profile)+'" step="1" inputmode="numeric" value="'+S.customH+'" data-chg="custom"></div>';
  return row;
}
/* a daily plan row says when that fast would end (from now, or from the running fast's start) and draws its share of the day: fasting hours filled, eating hours empty */
function planUntil(h){ var now=Date.now(), end=(S.cur?S.cur.start:now)+h*H; return end<=now?L(', reached','，已达成'):L(', until ','，到 ')+'<span class="pu" data-h="'+h+'">'+clockMs(end)+'</span>'; }
function dayBar(p){ return '<span class="day" aria-hidden="true"><i style="flex:'+p.fast+'"></i><i style="flex:'+Math.max(p.eat,0)+'"></i></span>'; }
function planTimes(){ if(!sheetOpen) return; var q=sheetEl.querySelectorAll('.pu'), now=Date.now(); for(var i=0;i<q.length;i++){ var t=clockMs((S.cur?S.cur.start:now)+q[i].dataset.h*H); if(q[i].textContent!==t) q[i].textContent=t; } } /* an open sheet keeps its end times current */
function zhProgress(l){ return l.replace(/(\d+) of (\d+) fasts of (\d+) h or more/,'$3 小时以上 $1/$2 次').replace(/(\d+) of (\d+) of 18 h or more/,'18 小时以上 $1/$2 次').replace(/week (\d+) of (\d+)/,'第 $1/$2 周').replace(/(\d+) of (\d+) fast of 24 h/,'24 小时断食 $1/$2 次').replace('First finish a 24 h fast, ','先完成一次 24 小时断食，').replace('24 h done, ','24 小时已完成，'); }
function pickPlan(id){
  var p=C.planById(id,S.customH);
  if(id==='ramadan'){ S.planId='ramadan'; if(S.cur){ toast(L('Ramadan runs dawn to sunset. End this fast first.','斋月从黎明到日落。先结束当前断食。')); return; } save(); closeSheet(); updateToday(); return startRamadan(); }
  if(p.long){ var st=longSt(p.fast); if(st.st!=='ok') return; if(st.exp) return longWarn(p,st); return longPick(p); }
  if(!planOk(id)) return;
  S.planId=id; if(S.cur){ S.cur.planId=id; S.cur.goalH=p.fast; S.cur.reached=(Date.now()-S.cur.start)/H>=p.fast; scheduleGoal(); }
  var was=pst(id).st==='soft'&&p.id===id; save(); cache={}; ticksKey=''; updateToday(); planSheet();
  if(was){ fx('nope'); var row=sheetEl.querySelector('.plan[data-id="'+id+'"]'); if(row&&!reduce){ void row.offsetWidth; row.classList.add('bump'); setTimeout(function(){ row.classList.remove('bump'); },700); } }
}

/* ---------- sunrise and sunset: location, or a nearby city ---------- */
/* the sky pill's explanation: one line and today's two times */
function skySheet(){
  var pol=!!sun.polar, rise=pol?'–':clockH(sun.rise), set=pol?'–':clockH(sun.set);
  openSheet('<h3>'+L('Moon and sun','月亮和太阳')+'</h3><p class="lede">'+L('The pill counts to the next sunrise or sunset. It’s not your fast.','胶囊里是距离下一次日出或日落的时间，不是你的断食时间。')+'</p>'+
   '<div class="group"><div class="row"><span>'+L('Sunrise','日出')+'</span><span class="v">'+rise+'</span></div><div class="row"><span>'+L('Sunset','日落')+'</span><span class="v">'+set+'</span></div></div>');
}
function placeSheet(){
  var h='<h3>'+L('Sunrise and sunset','日出日落')+'</h3><p class="lede">'+L('Lightly uses your location on this phone only to find your local sunrise and sunset. It is never uploaded or shared. Prefer not to share? Choose a nearby city.','轻伴只在这台手机上用你的位置来算当地的日出日落，不会上传，也不会分享。不想分享？选一个附近的城市就行。')+'</p>';
  h+='<div class="group"><button class="plan'+(S.place.key==='here'?' sel':'')+'" data-act="geo"><span class="pn"><b>'+L('Use my location','使用我的位置')+'</b><small>'+L('Most accurate. Stays on this phone.','最准确，只留在这台手机上。')+'</small></span>'+CHECK+'</button></div><div class="gh">'+L('Or choose a city','或选择城市')+'</div><div class="group">';
  Object.keys(C.CITIES).forEach(function(k){ h+='<button class="plan'+(S.place.key===k?' sel':'')+'" data-act="city" data-k="'+k+'" style="min-height:48px"><span class="pn"><b style="font-weight:400">'+C.CITIES[k][S.lang==='zh'?'zh':'en']+'</b></span>'+CHECK+'</button>'; });
  h+='</div><div class="btns"><button class="btn sec" data-act="close">'+L('Done','完成')+'</button></div>'; openSheet(h);
  var cur=sheetEl.querySelector('[data-act=city].sel'); if(cur) setTimeout(function(){ try{ cur.scrollIntoView({block:'center'}); }catch(x){} },0);   /* a long list opens on your own city */
}
function setPlace(pl){ if(pl.key!=='here') geoTok++; S.place=pl; sunDay=''; save(); cache={}; updateToday(); }
/* A fix can take several seconds on a phone (the permission prompt, then the radio), so the person always sees that Lightly is working, and is never left waiting:
   after 8 s it says so and offers the city list, and if the fix still arrives later (and no city was picked meanwhile) it is used quietly. */
var geoTok=0;
function geo(then,late){
  if(!navigator.geolocation){ toast(L('This browser can’t share a location. Pick a city instead.','这个浏览器无法获取位置，请选择城市。')); return then&&then(false); }
  var tok=++geoTok, done=false;
  var w=setTimeout(function(){ if(done||tok!==geoTok) return; done=true; toast(L('This is taking a while. Pick a city for now.','有点慢，先选一个城市吧。')); then&&then(false); },8000);
  navigator.geolocation.getCurrentPosition(function(p){
    clearTimeout(w); if(tok!==geoTok) return;
    setPlace({key:'here',lat:Math.round(p.coords.latitude*100)/100,lon:Math.round(p.coords.longitude*100)/100}); toast(L('Using your location.','已使用你的位置。'));
    if(done){ late&&late(); } else{ done=true; then&&then(true); } },
    function(){ clearTimeout(w); if(tok!==geoTok||done) return; done=true; toast(L('Couldn’t get your location, so Lightly is using '+placeName()+'.','没能获取你的位置，先使用'+placeName()+'。')); then&&then(false); },
    {timeout:30000,maximumAge:3600000});
}

/* ---------- account: email sign-in and backup (Supabase). Everything works signed out; an account only backs up. ---------- */
var CL=window.LightlyCloud, sync={busy:false,msg:'',at:0,err:'',t:0};
function cloudOn(){ return CL&&CL.ready()&&CL.getAuth(); }
function cloudSoon(){ if(!cloudOn()) return; clearTimeout(sync.t); sync.t=setTimeout(function(){ syncNow(true); },4000); }
function applyRemote(m){ quiet=true; Object.keys(m).forEach(function(k){ S[k]=m[k]; }); careMigrate(); if(S.onboarded) careApply(); if(S.place&&S.place.key==='here'&&S.place.lat==null) S.place={key:C.guessCity(tzGuess())}; /* coordinates stay on the phone */ quiet=false; saveNow(); }
function gone(deleted){ try{ localStorage.removeItem(AVG); }catch(e){} sync.err=''; sync.at=0; quiet=true; S.cloudUid=null; S.name=null; if(S.avatar&&S.avatar.t==='google') S.avatar=null; quiet=false; saveNow(); toast(deleted?L('This account no longer exists, so you’re signed out. Your fasts are still on this phone.','这个账号已不存在，已退出登录。断食记录仍在这台手机上。'):L('Your sign-in expired, so you’re signed out. Your fasts are still on this phone.','登录已过期，已退出登录。断食记录仍在这台手机上。')); }
function syncNow(silent){
  if(!cloudOn()||sync.busy) return Promise.resolve(); sync.busy=true; sync.err=''; if(curTab==='me') renderMe();
  return CL.pull().then(function(row){
    var au=CL.getAuth(), first=S.cloudUid!==au.uid, local=JSON.parse(JSON.stringify(S));
    if(first&&row&&row.data) local.mod=0;            /* first time on this device: the account's settings win, fasts are combined */
    var merged=row&&row.data?CL.merge(local,row.data):S; merged.cloudUid=au.uid;
    if(row&&row.data){ var before=JSON.stringify(S); applyRemote(merged); if(JSON.stringify(S)!==before){ cache={}; ticksKey=''; applyTheme(); applyLang(); } } else { quiet=true; S.cloudUid=au.uid; quiet=false; }
    if(S.onboarded&&!$('ob').hidden){ ph.classList.remove('onb'); $('ob').hidden=true; $('ob').innerHTML=''; showTab('today'); }
    return CL.push(S);
  }).then(function(){ sync.at=Date.now(); sync.retry=0; if(!silent) toast(L('Backed up.','已备份。')); trendBoot(); }).catch(function(e){ sync.err=e&&e.message||'error'; sync.retry=(sync.retry||0)+1; if(sync.retry<=3){ clearTimeout(sync.t); sync.t=setTimeout(function(){ syncNow(true); },60000*sync.retry); } if(!silent) toast(L('Couldn’t back up: ','备份失败：')+sync.err);
      /* the account may be gone (deleted on another phone), or the sign-in expired: sign out here and say why. Offline or a server hiccup keeps you signed in. */
      if(!CL.getAuth()) return gone(false); return CL.alive().then(function(ok){ if(!ok) gone(true); }); })
    .then(function(){ sync.busy=false; if(curTab==='me') renderMe(); if(curTab==='today') updateToday(); avRefresh(); });
}
/* the name on the Me tab: the one the person chose, else a Google account's first name, else none (they are asked to add one) */
function dispName(au){ return String((S.name!=null&&S.name!==''?S.name:(au&&au.name))||'').trim(); }
function nameSheet(){
  var au=CL.getAuth(); if(!au) return;
  openSheet('<h3>'+L('Your name','你的名字')+'</h3><div class="group"><div class="field"><label for="nmIn">'+L('Name','名字')+'</label><input id="nmIn" type="text" maxlength="24" autocomplete="given-name" autocapitalize="words" spellcheck="false" placeholder="'+(au.name?esc(au.name):L('Your name','你的名字'))+'" value="'+esc(S.name||'')+'" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div>'+
    (au.email?'<p class="note">'+L('Signed in as ','登录账号：')+esc(au.email)+'</p>':'')+
    '<div class="btns"><button class="btn" data-act="namesave">'+L('Save','保存')+'</button></div>');
  var i=$('nmIn'); if(i) setTimeout(function(){ try{ i.focus(); i.select(); }catch(e){} },350);
}
var GICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9c-.3 1.4-1 2.5-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.7 3.3-8z"/><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8C3.9 20.6 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.8 14.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V7H2.1C1.4 8.5 1 10.2 1 12s.4 3.5 1.1 5l3.7-2.8z"/><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 2.1 15 1 12 1 7.7 1 3.9 3.4 2.1 7l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z"/></svg>';
function accountHtml(){
  var zh=S.lang==='zh', au=CL&&CL.getAuth(), h='';
  if(au){
    h+='<div class="group"><div class="me-card">'+avatarBtn()+'<button type="button" class="me-id" data-act="namesheet" aria-label="'+L('Edit your name','修改名字')+'">'+(dispName(au)?'<b>'+esc(dispName(au))+'</b>':'<b class="noname">'+L('Add your name','添加你的名字')+'</b>')+'<span>'+(sync.busy?L('Backing up…','正在备份…'):sync.err?L('Couldn’t back up. Lightly will try again soon.','备份失败，轻伴稍后会再试。'):sync.at?'<i class="bk">'+L('Backed up just now','刚刚已备份')+'</i>':L('Your fasts are backed up to your account.','你的记录会备份到账号。'))+'</span></button></div></div>';
    return h;
  }
  h+='<div class="group"><div class="me-card">'+avatarBtn()+'<div><b>'+L('Not signed in','未登录')+'</b><span>'+L('Everything works. Fasts stay on this phone.','所有功能都能用，断食记录保存在这台手机上。')+'</span></div></div>'+
   '<div class="signin"><button class="btn gbtn" data-act="google">'+GICON+'<span>'+L('Continue with Google','用 Google 继续')+'</span></button><button class="btn sec" data-act="emailsheet">'+L('Continue with email','用邮箱继续')+'</button></div></div>'+
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
/* ---------- profile picture: a Google account's own photo, a placeholder icon (js/avatars.js), or a photo from the gallery ----------
   The choice is saved in S.avatar ({t:'icon',id} | {t:'google'} | {t:'photo',d}); nothing saved means the default (see LightlyAvatars.choose).
   A picked photo is cropped to a circle's square, stored at 256 px as a small JPEG, so it works offline and goes into the backup.
   The Google photo is copied into this phone once (lightly:avg) rather than loaded from Google each time; a failed image falls back to an icon. */
var AV=window.LightlyAvatars, AVG='lightly:avg', crop=null;
var PERSON='<svg class="def" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>';
var CAMERA='<svg class="ri" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.3"/></svg>';
function avCache(){ try{ return JSON.parse(localStorage.getItem(AVG))||{}; }catch(e){ return {}; } }
function googleUrl(u){ return String(u).replace(/=s\d+(-c)?$/,'=s256-c'); }
function googleSrc(au){ if(!au||!au.photo) return ''; var g=avCache(); return g.u===au.photo&&g.d?g.d:googleUrl(au.photo); }
function cacheGoogle(){ var au=CL&&CL.getAuth(); if(!au||!au.photo||avCache().u===au.photo) return;
  var im=new Image(); im.crossOrigin='anonymous'; im.referrerPolicy='no-referrer';
  im.onload=function(){ try{ var c=document.createElement('canvas'); c.width=c.height=AV.SIZE; c.getContext('2d').drawImage(im,0,0,AV.SIZE,AV.SIZE); localStorage.setItem(AVG,JSON.stringify({u:au.photo,d:c.toDataURL('image/jpeg',.86)})); }catch(e){} };
  im.src=googleUrl(au.photo); }
/* a session that started before photos were read asks once for its profile, then the Google photo is copied to this phone */
function avRefresh(){ var au=cloudOn()&&CL.getAuth(); if(!au) return; ((au.photo===undefined||au.name===undefined)?CL.profile().catch(function(){}):Promise.resolve()).then(function(){ cacheGoogle(); if(curTab==='me'&&!sheetOpen) renderMe(); }); }
function avPick(){ return AV.choose(S.avatar,CL&&CL.getAuth(),S.fasts.length); }
function avHtml(a){ a=a||avPick();
  if(a.t==='photo') return '<img class="avi" alt="" src="'+a.d+'">';
  if(a.t==='google') return '<img class="avi" alt="" referrerpolicy="no-referrer" src="'+esc(googleSrc(CL.getAuth()))+'">';
  if(a.t==='icon') return AV.html(a.id);
  return PERSON; }
function avatarBtn(){ return '<span class="avw"><button type="button" class="avb" data-act="avatar" aria-label="'+L('Change profile picture','更换头像')+'"><span class="av">'+avHtml()+'</span></button><i class="avedit" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.4-2h5l1.4 2h1.6A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.3"/></svg></i></span>'; }
/* an image that fails to load (offline Google photo, a damaged file) is swapped for the icon you'd have by default */
document.addEventListener('error',function(e){ var t=e.target; if(!t||t.tagName!=='IMG'||!t.classList.contains('avi')||t.dataset.bad) return;
  var au=CL&&CL.getAuth(), f=au?AV.html(AV.defaultIcon(au.uid||au.email)):PERSON; if(f.indexOf('<img')===0) f=PERSON;
  var d=document.createElement('span'); d.innerHTML=f; if(d.firstChild){ d.firstChild.dataset&&(d.firstChild.dataset.bad=1); t.replaceWith(d.firstChild); } },true);
function avatarSheet(){
  var au=CL&&CL.getAuth(), cur=avPick(), done=S.fasts.length, h='<h3>'+L('Profile picture','头像')+'</h3><div class="av-grid" role="group" aria-label="'+L('Profile picture','头像')+'">';
  AV.LIST.forEach(function(a){ var lk=AV.locked(a,done), nm=L(a.en,a.zh);
    h+='<button type="button" class="avt'+(cur.t==='icon'&&cur.id===a.id?' sel':'')+(lk?' lk':'')+'" data-act="avicon" data-id="'+a.id+'" aria-pressed="'+(cur.t==='icon'&&cur.id===a.id)+'" aria-label="'+esc(nm+(lk?L(', locked',', 未解锁'):''))+'">'+AV.html(a.id)+(lk?'<span class="lkm"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></span>':'')+'</button>'; });
  h+='</div><div class="group avrows">';
  if(au&&au.photo) h+='<button class="row" data-act="avgoogle"><span class="avs"><img class="avi" alt="" referrerpolicy="no-referrer" src="'+esc(googleSrc(au))+'"></span><span>'+L('Google photo','Google 头像')+'</span><span class="v">'+(cur.t==='google'?CHECK:'')+'</span></button>';
  h+='<label class="row" for="avFile">'+CAMERA+'<span>'+L('Choose from photos','从相册选择')+'</span>'+CHEV+'</label>';
  if(cur.t==='photo') h+='<button class="row red" data-act="avremove"><span>'+L('Remove photo','移除照片')+'</span></button>';
  h+='</div><input id="avFile" type="file" accept="image/*" hidden>';
  openSheet(h);
}
function dropCrop(){ if(crop&&crop.src&&crop.src.close) try{ crop.src.close(); }catch(e){} crop=null; }
function cropDraw(){ var c=$('cropC'); if(!c||!crop) return; var f=AV.fit(crop.w,crop.h,crop.zoom,crop.ox,crop.oy); crop.ox=f.ox; crop.oy=f.oy; crop.zoom=f.zoom;
  var x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,AV.SIZE,AV.SIZE); x.imageSmoothingQuality='high'; x.drawImage(crop.src,f.x,f.y,f.dw,f.dh); var z=$('cropZ'); if(z&&+z.value!==f.zoom) z.value=f.zoom; }
function cropSheet(){
  openSheet('<h3>'+L('Move and scale','移动和缩放')+'</h3><div class="crop" id="crop"><canvas id="cropC" width="'+AV.SIZE+'" height="'+AV.SIZE+'" role="img" aria-label="'+L('Your photo. Drag to move.','你的照片，拖动可移动。')+'"></canvas><i class="cm" aria-hidden="true"></i></div>'+
    '<div class="zoom"><input id="cropZ" type="range" min="1" max="4" step="0.01" value="1" aria-label="'+L('Zoom','缩放')+'"></div><div class="btns"><button class="btn" data-act="avsave">'+L('Use photo','使用照片')+'</button></div>');
  cropDraw(); }
function avFile(f){
  var open=function(src,w,h){ dropCrop(); crop={src:src,w:w,h:h,zoom:1,ox:0,oy:0}; cropSheet(); };
  var bad=function(){ toast(L('Couldn’t open that photo.','这张照片打不开。')); };
  var viaImg=function(){ var u=URL.createObjectURL(f), im=new Image(); im.onload=function(){ URL.revokeObjectURL(u); open(im,im.naturalWidth,im.naturalHeight); }; im.onerror=function(){ URL.revokeObjectURL(u); bad(); }; im.src=u; };
  if(window.createImageBitmap) createImageBitmap(f,{imageOrientation:'from-image'}).then(function(b){ open(b,b.width,b.height); },viaImg); else viaImg();
}
function avSet(v){ S.avatar=v; save(); closeSheet(); renderMe(); }
document.addEventListener('change',function(e){ var t=e.target; if(!t||t.id!=='avFile'||!t.files||!t.files[0]) return; var f=t.files[0]; t.value=''; avFile(f); });
/* drag to move, pinch or slide or scroll to zoom */
(function(){ var pts={};
  function dist(){ var k=Object.keys(pts); if(k.length<2) return 0; var a=pts[k[0]], b=pts[k[1]]; return Math.hypot(a.x-b.x,a.y-b.y); }
  document.addEventListener('pointerdown',function(e){ var t=e.target.closest&&e.target.closest('#crop'); if(!t||!crop) return; pts[e.pointerId]={x:e.clientX,y:e.clientY}; try{ t.setPointerCapture(e.pointerId); }catch(x){} });
  document.addEventListener('pointermove',function(e){ var p=pts[e.pointerId]; if(!p||!crop) return; var n=Object.keys(pts).length, el=$('crop'); if(!el) return;
    if(n===1){ var k=AV.SIZE/el.getBoundingClientRect().width; crop.ox+=(e.clientX-p.x)*k; crop.oy+=(e.clientY-p.y)*k; p.x=e.clientX; p.y=e.clientY; }
    else{ var d0=dist(); p.x=e.clientX; p.y=e.clientY; var d1=dist(); if(d0>0) crop.zoom*=d1/d0; }
    cropDraw(); });
  function up(e){ delete pts[e.pointerId]; }
  document.addEventListener('pointerup',up); document.addEventListener('pointercancel',up);
  document.addEventListener('wheel',function(e){ if(!crop||!e.target.closest||!e.target.closest('#crop')) return; e.preventDefault(); crop.zoom*=Math.exp(-e.deltaY*.002); cropDraw(); },{passive:false});
  document.addEventListener('input',function(e){ if(e.target.id==='cropZ'&&crop){ crop.zoom=+e.target.value; cropDraw(); } });
})();
function emailErr(x){ return x&&(x.status===429||/rate|seconds|too many/i.test(x.message||''))?L('Too many emails just now. Wait a minute and try again.','邮件发得太频繁了，请等一分钟再试。'):L('Couldn’t send the email: ','邮件没发出去：')+x.message; }

function fastSub(p){ return L('Fast '+p.fast+' hours','断食 '+p.fast+' 小时'); }

/* ---------- Me ---------- */
/* one-of-a-few settings open a list with a check mark, like iOS Settings */
var CHOICES={
  lang:{title:['Language','语言'],opts:[['en','English',''],['zh','中文','']],cur:function(){ return S.lang; }},
  theme:{title:['Appearance','外观'],opts:[['auto',['Auto','自动'],['Follows your phone','跟随手机']],['light',['Light','浅色'],''],['dark',['Dark','深色'],'']],cur:function(){ return S.theme; }},
  tl:{title:['Timeline','时间线'],opts:[['arc',['Arc','弧线'],['A curve from start to finish','从开始到完成的一条弧线']],['strip',['Day strip','日条'],['Your 24 hours, with sunrise and sunset','你的 24 小时，含日出日落']]],cur:function(){ return S.prefs.tl||'arc'; }},
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
  if(FUI) FUI.sync(); careTick(); var zh=S.lang==='zh', h='';
  h+=accountHtml();
  var p=plan(), ls=S.cur?null:null;
  h+='<div class="gh">'+L('Fasting','断食')+'</div><div class="group">'+
   '<button class="row" data-act="place">'+mi('sun','gold')+'<span>'+L('Sunrise and sunset','日出日落')+'</span><span class="v">'+esc(placeName())+'</span>'+CHEV+'</button>'+
   (S.prefs.usualStart?pkField('usualStart',L('Usual start time','通常开始时间'),S.prefs.usualStart,'t').replace('aria-controls="usualStart-w"><span>','aria-controls="usualStart-w">'+mi('clock','gold')+'<span>'):'<button class="row" data-act="usualset">'+mi('clock','gold')+'<span>'+L('Usual start time','通常开始时间')+'</span><span class="v">'+L('Not set','未设置')+'</span>'+CHEV+'</button>')+
   (offNow()||care()?'':'<button class="row" data-act="cheat">'+mi('cal','gold')+'<span>'+L('Cheat days','弹性日')+'</span><span class="v">'+L(S.flex.bank+' left',S.flex.bank+' 个可用')+'</span>'+CHEV+'</button>')+'</div>';
  h+='<div class="gh">'+L('App','应用')+'</div><div class="group">'+
   '<button class="row" data-act="choice" data-k="lang">'+mi('globe','navy')+'<span>'+L('Language','语言')+'</span><span class="v">'+(S.lang==='zh'?'中文':'English')+'</span>'+CHEV+'</button>'+
   '<button class="row" data-act="choice" data-k="theme">'+mi('half','navy')+'<span>'+L('Appearance','外观')+'</span><span class="v">'+choiceLabel('theme',S.theme)+'</span>'+CHEV+'</button>'+
   '<button class="row" data-act="choice" data-k="tl">'+mi('arc','navy')+'<span>'+L('Timeline','时间线')+'</span><span class="v">'+choiceLabel('tl',S.prefs.tl||'arc')+'</span>'+CHEV+'</button>'+
   sw('sound',L('Sound','声音'),S.prefs.sound,0,mi('sound','navy'))+(canTick()?sw('haptics',L('Vibration','振动'),S.prefs.haptics,0,mi('vib','navy')):'')+sw('d3',L('3D moon and sun','3D 月亮和太阳'),S.prefs.d3&&!!orb,!orb,mi('moon','navy'))+
   sw('notify',L('Reminders','提醒'),S.prefs.notify&&('Notification' in window)&&Notification.permission==='granted',!('Notification' in window),mi('bell','navy'))+'</div>';
  h+='<div class="gf">'+L('You’ll hear when you reach your goal, as long as Lightly was opened recently.','只要最近打开过轻伴，达成目标时就会提醒你。')+'</div>';
  h+='<div class="gh">'+L('Care','关怀')+'</div><div class="group"><button class="row" data-act="timeoff">'+mi('heart','gold')+'<span class="stack"><span>'+L('Time off','休息一下')+'</span></span>'+(offNow()?'<span class="v">'+(offNow().kind==='travel'?L('Travelling','旅行中'):L('Resting','休养中'))+'</span>':'')+CHEV+'</button>'+
   '<button class="row" data-act="care">'+mi('shield','gold')+'<span>'+L('Health answers','健康回答')+'</span><span class="v">'+(care()?L('Care mode on','关怀模式已开启'):L('None','无'))+'</span>'+CHEV+'</button></div>'+
   (care()?'<div class="gf">'+L('Care mode keeps Lightly gentle: shorter fasts, no streaks, no long fasts.','关怀模式让轻伴更温和：较短的断食，没有连续天数，没有长时间断食。')+'</div>':'');
  h+='<div class="gh">'+L('Your data','你的数据')+'</div><div class="group">'+(S.body?'<button class="row" data-act="bodyinfo">'+mi('lock','grey')+'<span>'+L('About you','关于你')+'</span><span class="v">'+L('Saved','已保存')+'</span>'+CHEV+'</button>':'')+'<button class="row" data-act="import">'+mi('imp','grey')+'<span>'+L('Import from another app','从其他应用导入')+'</span>'+CHEV+'</button><button class="row" data-act="exportsheet">'+mi('exp','grey')+'<span>'+L('Export my fasts','导出我的记录')+'</span>'+CHEV+'</button><button class="row red" data-act="erase">'+mi('trash','red')+'<span>'+L('Erase everything','清除所有数据')+'</span></button>'+(cloudOn()?'<button class="row red" data-act="delacct">'+mi('userx','red')+'<span>'+L('Delete account','删除账号')+'</span></button>':'')+'</div>';
  if(C.ramadanDay()===0&&!care()&&(isTester()||S.ramadanPreview)) h+='<div class="group">'+(sw('ram',L('Preview Ramadan mode','预览斋月模式'),S.ramadanPreview,0,mi('moon','gold')))+'</div><div class="gf">'+L('Ramadan appears in your plans only during Ramadan. This switch lets you look at it now.','斋月只在当季出现在计划里。这个开关让你现在就能看看。')+'</div>';
  h+='<div class="gh">'+L('About','关于')+'</div><div class="group"><a class="row" href="privacy/?lang='+S.lang+'" target="_blank" rel="noopener">'+mi('lock','grey')+'<span>'+L('Privacy Policy','隐私政策')+'</span>'+CHEV+'</a><a class="row" href="terms/?lang='+S.lang+'" target="_blank" rel="noopener">'+mi('doc','grey')+'<span>'+L('Terms of Use','使用条款')+'</span>'+CHEV+'</a></div>'; /* public pages, also the URLs entered in Google Play */
  if(cloudOn()) h+='<div class="group"><button class="row red so" data-act="signout"><span>'+L('Sign out','退出登录')+'</span></button></div>'; /* signed in only: a plain button at the very end */
  h+='<p class="gf" data-act="diag" style="text-align:center">'+L('Lightly · web app · v','轻伴 · 网页版 · v')+(window.LIGHTLY_VERSION||'')+(isTester()?L(' · tester',' · 测试'):'')+L(' · saved on this device',' · 保存在本机')+(storageOk?'':'<br>'+L('Storage is blocked, so nothing will be kept after you close the app.','存储被阻止，关闭应用后记录不会保留。'))+'</p>';
  $('me').innerHTML=h;
}
/* Me rows: a small tile with a drawn icon (gold for fasting, navy for the app, grey for data and about, red for erase) */
var MI={arc:'M3 17C7 6 17 6 21 17M3 17h.01M21 17h.01',sun:'M3 17h18M7 17a5 5 0 0 1 10 0M12 5v3M5 9l1.6 1.6M19 9l-1.6 1.6',clock:'M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z',cal:'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  globe:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z',half:'M12 3a9 9 0 1 0 0 18V3Z',
  sound:'M4 10v4h4l5 4V6L8 10H4ZM16.5 9a4 4 0 0 1 0 6',vib:'M9 4h6v16H9zM5 8v8M19 8v8',moon:'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z',bell:'M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15L6 16ZM10 21h4',
  heart:'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z',imp:'M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14',exp:'M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14',
  shield:'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z',trash:'M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13',lock:'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z',doc:'M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6',out:'M10 4H5v16h5M15 8l4 4-4 4M19 12H9',people:'M9 11.5a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8ZM2.8 19.5a6.2 6.2 0 0 1 12.4 0M15.6 4.8a3.2 3.2 0 0 1 0 6.2M17.5 13.7a6 6 0 0 1 3.7 5.3',userx:'M16 20v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM17 8l4 4M21 8l-4 4'};
function mi(k,tone){ return '<span class="mi '+tone+'" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="'+MI[k]+'"/></svg></span>'; }
function sw(k,label,on,dis,ico){ return '<div class="row">'+(ico||'')+'<span>'+label+'</span><button class="sw" role="switch" aria-checked="'+!!on+'" aria-label="'+esc(label)+'" data-act="sw" data-k="'+k+'"'+(dis?' disabled':'')+'></button></div>'; }
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
function softNote(){ return L('New to fasting? Start at 13:11 or 16:8 and step up after a few fasts.','第一次断食？先从 13:11 或 16:8 开始，几次之后再往上加。'); }
function obCh(){ return ob.customH||S.customH; }   /* the custom fasting hours chosen in setup, kept until Open Lightly */
function obRisky(){ return !!(ob.safe.length&&ob.safe.indexOf('none')<0); }
/* everyone: welcome, fasted before, plan (with the start time and the reminder), where you are, safety. People who have fasted before also get the import step. */
/* safety comes last, just before the summary; a flag then lowers the plan to 13:11 */
function obFlow(){ var f=['welcome','fasted','plan']; if(ob.fasted==='before') f.push('import'); f.push('set','safety');
  if(!obRisky()&&!ob.skip) f.push('body');   /* no weight questions in Care mode */
  f.push('summary'); return f; }
/* optional weight (before the summary): about you, kept for the monthly check-in */
function obUnit0(){ return S.lang==='zh'?'jin':((navigator.language||'').indexOf('en-US')===0?'lb':'kg'); }
function uLbl(u){ return u==='kg'?L('kg','公斤'):u==='lb'?L('lb','磅'):'斤'; }
function ftIn(i){ return Math.floor(i/12)+'′ '+(i%12)+'″'; }
function obAgeOpts(){ var a=[],i; for(i=13;i<=90;i++) a.push([i,S.lang==='zh'?i+' 岁':String(i)]); return a; }
function wtOpts(u){ var r={kg:[30,250],lb:[70,420],jin:[70,420]}[u]   /* at most about 350 rows: a taller wheel (36 px a row) risks exceeding what iPhone can draw */, a=[],i; for(i=r[0];i<=r[1];i++) a.push([i,i+' '+uLbl(u)]); return a; }
function obWtOpts(){ return wtOpts(ob.unit); }
function obHtOpts(){ var a=[],i; if(ob.unit==='lb'){ for(i=47;i<=87;i++) a.push([i,ftIn(i)]); } else for(i=120;i<=220;i++) a.push([i,i+' cm']); return a; }
function obHtKey(){ return ob.unit==='lb'?Math.round(ob.cm/2.54):Math.round(ob.cm); }
/* the import step shows a plain file glyph, not look-alike tiles of other apps */
var IMP_GLYPH='<div class="ob-hero imp-glyph" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11.5v5M9.5 14l2.5 2.5 2.5-2.5"/></svg></div>';
/* a small moon that previews the plan: the lit wedge is the share of the day you fast, with when a fast would end */
/* the big number, the 24-hour strip and the window line follow the start time and custom hours without redrawing the open wheel */
function obBigUpdate(){
  var n=$('obBigN'); if(!n) return; var t=document.createElement('div'); t.innerHTML=obBigHtml(ob.plan);
  var nt=t.querySelector('#obBigN').textContent; if(n.hasAttribute('data-rolling')) n._to=nt; else n.textContent=nt;   /* a number still rolling lands on the newest value */
  var st=document.querySelector('.ob-step.on'); if(!st) return;
  var o=st.querySelectorAll('.ob-day .trk i'), nw=t.querySelectorAll('.ob-day .trk i'), i; for(i=0;i<o.length&&i<nw.length;i++) o[i].setAttribute('style',nw[i].getAttribute('style'));
  var w=st.querySelector('.ob-win'); if(w) w.textContent=t.querySelector('.ob-win').textContent;
}
/* gender is asked on the health step, so a man is never offered the pregnancy answer; "prefer not to say" saves nothing */
function obSexHtml(){ return '<div class="seg" role="group" aria-label="'+L('Gender','性别')+'">'+[['m',L('Male','男')],['f',L('Female','女')],['x',L('Non-binary','非二元')],['n',L('Prefer not to say','不透露')]].map(function(g){ return '<button type="button" data-act="obsex" data-v="'+g[0]+'" aria-pressed="'+(ob.sex===g[0])+'">'+g[1]+'</button>'; }).join('')+'</div>'; }
function obHtml(i){
  var back=i>0?'<button class="ob-back" data-act="obback"><svg viewBox="0 0 10 18"><path d="M8.5 1.5 1.5 9l7 7.5"/></svg>'+L('Back','返回')+'</button>':'<span></span>';
  var flow=obFlow(), key=flow[i]; var dots=i>0&&i<flow.length-1?'<span class="ob-mslot"></span>':'<span></span>';   /* the one moon parks here as the progress bar */
  var top='<div class="ob-top"><span class="ob-l">'+back+'</span>'+dots+(key==='welcome'?'<button class="ob-lang" data-act="lang" data-v="'+(S.lang==='zh'?'en':'zh')+'" lang="'+(S.lang==='zh'?'en':'zh-Hans')+'">'+(S.lang==='zh'?'English':'中文')+'</button>':'<span></span>')+'</div>', body='', cta='';
  function opt(v,label,sub,on){ return '<button class="plan'+(on?' sel':'')+'" data-act="obopt" data-v="'+v+'"><span class="pn"><b>'+label+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span>'+CHECK+'</button>'; }
  if(key==='welcome'){
    body='<div class="grow" style="flex:.3"></div><div class="ob-bslot" data-p="0" role="img" aria-label="'+L('The moon. Drag it to change the phase.','月亮。拖动可以改变月相。')+'"></div><div class="grow"></div><h1 class="ob-wel">'+L('Lightly','轻伴')+'</h1><p class="lede" style="text-align:center;margin-top:6px">'+L('Fasting that follows the sky.','跟着天空走的断食。')+'</p><div class="grow" style="flex:.35"></div>';
    cta='<button class="btn" data-act="obnext">'+L('Get started','开始')+'</button>';
  }else if(key==='fasted'){
    body='<h1>'+L('Have you fasted before?','你以前断食过吗？')+'</h1><div class="group cards">'+opt('first',L('This is my first time','这是第一次'),'',ob.fasted==='first')+opt('before',L('I’ve fasted before','我以前断食过'),'',ob.fasted==='before')+'</div><div class="grow"></div>';
    cta='<button class="btn" data-act="obnext"'+(ob.fasted?'':' disabled')+'>'+L('Continue','继续')+'</button>';
  }else if(key==='safety'){
    function ck(v,label){ var on=ob.safe.indexOf(v)>=0; return '<button class="check" role="checkbox" aria-checked="'+on+'" data-act="obsafe" data-v="'+v+'"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+label+'</span></button>'; }
    body='<h1>'+L('Is any of this true for you?','下面有符合你的情况吗？')+'</h1><div class="gh obgh">'+L('Gender','性别')+'</div>'+obSexHtml()+'<div class="gh obgh">'+L('Pick all that apply','可多选')+'</div><div class="group cards">'+(ob.sex==='m'?'':ck('preg',L('Pregnant or breastfeeding','怀孕或哺乳期')))+ck('diab',L('I take medication for diabetes','我在服用糖尿病药物'))+ck('ed',L('I have had an eating disorder','我有过进食障碍'))+ck('none',L('None of these','都不是'))+'</div>'+
      (ob.safe.length&&ob.safe.indexOf('none')<0?'<p class="gf obnote" style="padding:0 4px;color:var(--label)">'+L('Care mode keeps Lightly gentle: shorter fasts, no streaks, no long fasts. Please talk to your doctor first.','关怀模式让轻伴更温和：较短的断食，没有连续天数，没有长时间断食。请先咨询医生。')+'</p>':'')+'<div class="grow"></div>';
    cta='<button class="btn" data-act="obnext"'+(ob.safe.length?'':' disabled')+'>'+L('Continue','继续')+'</button>';
  }else if(key==='plan'){
    var risky=obRisky(), before=ob.fasted==='before', prof={fastedBefore:before,safety:risky}, stOf=function(id){ return C.planStatus(id,prof,{fasts:[]}); }, sug=risky||!before?'13':'16';
    if(!ob.plan||ob.planAuto||['ok','soft'].indexOf(stOf(ob.plan).st)<0){ ob.plan=sug; ob.planAuto=true; }   /* the pre-selected plan follows the answer until the person picks one */
    var ids=before&&!risky?['16','13','18','20']:['13','16','18','20'], tiles=ids.map(function(id){ var p=C.planById(id), s=stOf(id).st; if(s==='hidden') return '';
        var lk=s==='locked', soft=s==='soft';
        return '<button class="plan'+(ob.plan===id?' sel':'')+(lk?' lk':'')+'" data-act="obplan" data-id="'+id+'"'+(lk?' disabled':'')+(soft?' data-soft="1"':'')+' aria-label="'+esc(pName(p)+', '+C.planLabel(p)+(soft?', '+L('advanced','进阶'):''))+'"><span class="pn"><b>'+C.planLabel(p)+'</b>'+(lk?'<small>'+L('After 3 fasts','完成 3 次后')+'</small>':soft?'<small>'+L('Advanced','进阶')+'</small>':'')+'</span>'+CHECK+'</button>'; }).join('');
    if(before&&!risky) tiles+='<button class="plan'+(ob.plan==='custom'?' sel':'')+'" data-act="obplan" data-id="custom"><span class="pn"><b>'+L('Custom','自定义')+'</b></span>'+CHECK+'</button>';
    var hrs=[],hh; for(hh=12;hh<=23;hh++) hrs.push([hh,L(hh+' h',hh+' 小时')]);
    body='<h1>'+L('Pick your plan','选择你的计划')+'</h1>'+obBigHtml(ob.plan)+'<div class="group tiles">'+tiles+'</div>'+
      (ob.plan==='custom'?'<div class="group">'+pkField('obCustom',L('Fasting hours','断食小时数'),obCh(),'sel',hrs)+'</div>':'')+
      (stOf(ob.plan).st==='soft'?'<p class="gf obnote" style="padding:0 4px;color:var(--label)">'+softNote()+'</p>':'')+
      (risky?'<p class="gf" style="padding:0 4px">'+L('Longer fasts stay off for you.','长时间断食对你保持关闭。')+'</p>':'')+
      '<div class="group">'+pkField('obStart',before?L('Usual start time','通常开始时间'):L('When will you start?','你打算几点开始？'),ob.start||'20:00','t')+'</div><div class="group">'+sw('notify',L('Remind me when I reach my goal','达成目标时提醒我'),S.prefs.notify&&('Notification' in window)&&Notification.permission==='granted',!('Notification' in window))+'</div><div class="grow"></div>';
    cta='<button class="btn" data-act="obnext">'+L('Continue','继续')+'</button>';
  }else if(key==='import'){
    body='<div class="grow"></div>'+IMP_GLYPH+'<h1 style="text-align:center">'+L('Bring your fasts with you','带上你的断食记录')+'</h1><p class="lede" style="text-align:center">'+L('Optional. Zero’s data zip, or a CSV or JSON file.','可选。Zero 的数据 zip，或 CSV、JSON 文件。')+'</p><div class="grow"></div><input id="obImpFile" type="file" accept=".zip,.json,.csv,.txt,application/zip,application/x-zip-compressed,application/json,text/csv,text/plain" hidden>';
    cta='<label class="btn" for="obImpFile">'+L('Choose a file','选择文件')+'</label><button class="btn sec" data-act="obnext">'+L('Skip for now','暂时跳过')+'</button>';
  }else if(key==='set'){
    var hereOn=S.place.key==='here';
    body='<h1>'+L('Match the sky to your day','让天空跟着你的一天')+'</h1><p class="lede">'+L('Lightly uses your precise location only to match the moon and sun to your own sunrise and sunset. It stays on this phone and is never uploaded or shared.','轻伴只用你的精确位置，让月亮和太阳对上你当地的日出日落。位置只留在这台手机上，不会上传或分享。')+'</p>'+
     obSkyHtml()+(hereOn?'<div class="group"><div class="row"><span>'+L('Using your location','正在使用你的位置')+'</span><span class="v">'+CHECK+'</span></div></div>':ob.geoBusy?'<div class="group"><div class="row" role="status"><span>'+L('Finding your location…','正在定位…')+'</span><span class="v"><i class="spin" aria-hidden="true"></i></span></div></div>':'')+
     (!hereOn&&ob.city?'<div class="group">'+pkField('obCity',L('Nearest city','最近的城市'),S.place.key,'sel',Object.keys(C.CITIES).map(function(k){ return [k,C.CITIES[k][S.lang==='zh'?'zh':'en']]; }))+'</div>':'')+
     '<div class="grow"></div>';
    cta=ob.geoBusy?'<button class="btn" data-act="obnext">'+L('Continue','继续')+'</button><button class="btn sec" data-act="obcityshow">'+L('Choose a city instead','改选城市')+'</button>':   /* never without a Continue: a slow GPS fix no longer holds the step */
      hereOn||ob.city?'<button class="btn" data-act="obnext">'+L('Continue','继续')+'</button>'+(hereOn?'':'<button class="btn sec" data-act="obgeo">'+L('Use my location instead','改用我的位置')+'</button>')
      :'<button class="btn" data-act="obgeo">'+L('Use my location','使用我的位置')+'</button><button class="btn sec" data-act="obcityshow">'+L('Choose a city instead','改选城市')+'</button>';
  }else if(key==='body'){
    body='<h1>'+L('A little about you','关于你')+'</h1><p class="lede">'+L('Add them and see your weight trend, with a check-in every month.','填写后，每月回顾会带你看体重变化的趋势。')+'</p><div class="group">'+pkField('obAge',L('Age','年龄'),ob.age,'sel',obAgeOpts())+pkField('obWt',L('Weight','体重'),Math.round(C.kgTo(ob.kg,ob.unit)),'sel',obWtOpts())+pkField('obHt',L('Height','身高'),obHtKey(),'sel',obHtOpts())+'</div>'+
      '<div class="seg" role="group" aria-label="'+L('Units','单位')+'">'+['kg','lb','jin'].map(function(u){ return '<button type="button" data-act="obunit" data-v="'+u+'" aria-pressed="'+(ob.unit===u)+'">'+uLbl(u)+'</button>'; }).join('')+'</div>'+
      '<p class="gf obnote" style="padding:0 4px">'+L('Private to you: it stays on this phone, and in your backup only if you sign in.','仅你可见：数据留在这部手机上，登录后才会存入你的备份。')+'</p><div class="grow"></div>';
    cta='<button class="btn" data-act="obbody">'+L('Continue','继续')+'</button><button class="btn quiet" data-act="obbodyskip">'+L('Skip','跳过')+'</button>';
  }else if(key==='summary'){
    var rk=obRisky(), pid=rk?'13':(ob.plan||(ob.fasted==='before'?'16':'13')), usual=ob.start||'', uh=usual?(+usual.split(':')[0]+ +usual.split(':')[1]/60):null;
    body='<div class="ob-bslot" data-p="'+(C.planById(pid,obCh()).fast/24).toFixed(4)+'"></div><h1 style="text-align:center">'+L('You’re set','准备好了')+'</h1>'+
      '<div class="group"><div class="row"><span>'+L('Plan','计划')+'</span><b>'+esc(C.planLabel(C.planById(pid,obCh())))+'</b></div><div class="row"><span>'+L('Sunrise and sunset','日出日落')+'</span><b>'+esc(placeName())+'</b></div><div class="row"><span>'+L('First fast','第一次断食')+'</span><b>'+(uh!=null?L('Tonight, ','今晚 ')+clockH(uh):L('When you’re ready','准备好时'))+'</b></div></div>'+
      '<p class="gf" style="padding:0 4px">'+(rk?L('Care mode is on. You start at 13:11.','关怀模式已开启，从 13:11 开始。'):L('Change anything later in Me.','之后可以在“我的”里修改。'))+'</p><div class="grow"></div>';
    cta='<button class="btn" data-act="obdone">'+L('Open Lightly','打开 Lightly')+'</button>';
  }
  var nt=key==='welcome'||key==='summary', sky=nt?obStars()+(key==='summary'?'<i class="dawnbg"></i>':''):'';
  return '<div class="ob-step'+(key==='welcome'?' night':'')+(key==='summary'?' fin':'')+'" data-i="'+i+'">'+sky+top+body+'<div class="ob-cta">'+cta+'</div></div>';
}
function obRender(dir,pre){
  /* forward pushes from the right; back reverses the same path (spatial symmetry). `pre` is the step a swipe already pulled in from behind (see obSwipe) */
  var box=$('ob'); box.hidden=false; dir=dir||1;
  var n=pre;
  if(!n){ var html=obHtml(ob.step), tmp=document.createElement('div'); tmp.innerHTML=html; n=tmp.firstChild; if(dir<0&&box.children.length) n.classList.add('back'); box.appendChild(n); }
  var old=[].slice.call(box.children).filter(function(c){return c!==n;});
  requestAnimationFrame(function(){ requestAnimationFrame(function(){ n.style.transition=''; n.style.transform=''; n.style.opacity=''; n.classList.remove('back'); n.classList.add('on'); old.forEach(function(o){ o.style.transition=''; o.style.transform=''; o.style.opacity=''; o.classList.remove('on'); o.classList.add(dir<0?'out':'past'); setTimeout(function(){ if(o.parentNode) o.parentNode.removeChild(o); },600); }); chrome(); }); });
  var f=n.querySelector('h1'); if(f){ f.setAttribute('tabindex','-1'); } [].slice.call(n.children).filter(function(c){return !c.classList.contains('ob-top');}).forEach(function(c,i){ c.style.setProperty('--i',i); });
  obIn(n);
}
/* refresh a step in place: elements stay put, only changed attributes and text move, so selection states animate instead of flashing */
function morph(o,n){
  if(o.nodeType!==n.nodeType||o.nodeName!==n.nodeName){ o.parentNode.replaceChild(n,o); return; }
  if(o.nodeType===3){ if(o.nodeValue!==n.nodeValue) o.nodeValue=n.nodeValue; return; }
  if(o.nodeType!==1) return;
  if(o.hasAttribute('data-keep')) return;   /* the header moon and the big moons are drawn by their own code */
  var i; for(i=o.attributes.length-1;i>=0;i--){ var an=o.attributes[i].name; if(!n.hasAttribute(an)) o.removeAttribute(an); }
  for(i=0;i<n.attributes.length;i++){ var at=n.attributes[i]; if(o.getAttribute(at.name)!==at.value) o.setAttribute(at.name,at.value); }
  if((o.tagName==='INPUT'||o.tagName==='SELECT')&&document.activeElement!==o) o.value=n.value;
  if(o.childNodes.length!==n.childNodes.length){ o.innerHTML=n.innerHTML; return; }
  var ok=[].slice.call(o.childNodes), nk=[].slice.call(n.childNodes);   /* snapshots: replacing a node moves it out of its parent, which shifts the live lists */
  for(i=0;i<ok.length;i++) morph(ok[i],nk[i]);
}
/* ---------- swipe right to go back ----------
   Only backwards: the step follows the finger and the one before slides in behind it, like an iOS navigation stack. Forward is only ever the buttons.
   It ignores swipes that start on a wheel, a slider, a field, the welcome moon or a sheet, so those keep working. Under Reduce Motion nothing follows the finger:
   a clear swipe simply goes back. Answers are kept (the state `ob` is never touched). */
var SW={id:null,on:false,x0:0,y0:0,lx:0,lt:0,v:0,w:1,cur:null,pre:null};
function obBackTo(pre){ if(ob.step<1) return; ob.step--; obRender(-1,pre); }
function obSwipe(){
  var box=$('ob'), SKIP='.pk-c,.pk.open,input,select,textarea,[role=slider],canvas,.ob-bslot,.crop,[contenteditable]';
  function reset(){ SW.id=null; SW.on=false; SW.cur=SW.pre=null; }
  function settle(commit){
    var cur=SW.cur, pre=SW.pre, d=SW.on;
    if(d){ var stop=function(e){ e.stopPropagation(); e.preventDefault(); }; box.addEventListener('click',stop,true); setTimeout(function(){ box.removeEventListener('click',stop,true); },60); }
    reset(); if(!d) return;
    if(commit){ fx('light'); if(pre) obBackTo(pre); else obBackTo(); return; }
    if(!pre) return;
    cur.style.transition=''; cur.style.transform='';   /* let go: spring back, the step behind tucks away */
    pre.style.transition='transform .35s var(--spr),opacity .35s ease'; pre.style.transform='translateX(-30%)'; pre.style.opacity='.72';
    setTimeout(function(){ if(pre.parentNode) pre.parentNode.removeChild(pre); },380);
  }
  box.addEventListener('pointerdown',function(e){
    if(SW.id!=null||!e.isPrimary||(e.pointerType==='mouse'&&e.button!==0)) return;
    var cur=box.lastElementChild;
    if(box.hidden||!ob||ob.step<1||sheetOpen||box.children.length!==1||!cur||!cur.classList.contains('on')||(e.target.closest&&e.target.closest(SKIP))) return;
    SW.id=e.pointerId; SW.on=false; SW.x0=SW.lx=e.clientX; SW.y0=e.clientY; SW.lt=e.timeStamp; SW.v=0; SW.w=box.getBoundingClientRect().width||1; SW.cur=cur; SW.pre=null; });
  box.addEventListener('pointermove',function(e){
    if(e.pointerId!==SW.id) return;
    var dx=e.clientX-SW.x0, dy=e.clientY-SW.y0;
    if(!SW.on){
      if(Math.abs(dx)<10&&Math.abs(dy)<10) return;
      if(dx<=0||dx<Math.abs(dy)*1.5){ reset(); return; }   /* up, down or forward: not ours */
      SW.on=true; SW.x0=e.clientX-4; SW.lx=e.clientX; SW.lt=e.timeStamp; dx=4;
      try{ box.setPointerCapture(e.pointerId); }catch(x){}
      if(!reduce){ var t=document.createElement('div'); t.innerHTML=obHtml(ob.step-1); var pre=t.firstChild; pre.classList.add('back','nostagger'); pre.style.opacity='.72'; box.insertBefore(pre,SW.cur); SW.pre=pre; SW.cur.style.transition='none'; }
    }
    var dt=e.timeStamp-SW.lt; if(dt>0){ SW.v=.6*SW.v+.4*((e.clientX-SW.lx)/dt); } SW.lx=e.clientX; SW.lt=e.timeStamp;
    dx=Math.max(0,dx);
    if(SW.pre){ var k=Math.min(dx/SW.w,1); SW.cur.style.transform='translateX('+dx.toFixed(1)+'px)'; SW.pre.style.transform='translateX('+(-.3*SW.w*(1-k)).toFixed(1)+'px)'; SW.pre.style.opacity=(.72+.28*k).toFixed(3); } });
  function up(e){
    if(e.pointerId!==SW.id) return;
    var dx=Math.max(0,e.clientX-SW.x0), w=SW.w;
    settle(SW.on&&e.type==='pointerup'&&(dx>w*.33||(SW.v>.45&&dx>w*.08)||(reduce&&dx>w*.2))); }
  box.addEventListener('pointerup',up); box.addEventListener('pointercancel',up);
}
obSwipe();
function obRefresh(){ var box=$('ob'), c=box.querySelector('.ob-step.on')||box.lastChild; if(!c) return; var tmp=document.createElement('div'); tmp.innerHTML=obHtml(ob.step); var n=tmp.firstChild; if(c.getAttribute('data-i')!==n.getAttribute('data-i')){ n.classList.add('on'); n.style.transition='none'; box.replaceChild(n,c); return; } c.classList.add('nostagger'); n.className=c.className; var ap=document.activeElement; morph(c,n); }
function obStart(){ ph.classList.add('onb'); chrome(); ob={step:0,fasted:null,safe:[],plan:null,start:'20:00',age:30,kg:70,cm:170,unit:obUnit0(),sex:'n',skip:false,bodyDone:false}; $('ob').innerHTML=''; obLayerOff(); obRender(); }
function obFinish(){
  var risky=ob.safe.length&&ob.safe.indexOf('none')<0;
  var keys=ob.safe.filter(function(x){ return x!=='none'; }); S.profile={fastedBefore:ob.fasted==='before',safety:keys.length>0,care:keys,careOff:null}; if(risky){ S.customH=Math.min(S.customH,16); S.ramadanPreview=false; } S.planId=risky?'13':(ob.plan||(ob.fasted==='before'?'16':'13')); if(ob.start) S.prefs.usualStart=ob.start; if(S.planId==='custom'&&ob.customH) S.customH=ob.customH; if(!risky&&ob.bodyDone&&!ob.skip&&C.weightFit({age:ob.age,kg:ob.kg,cm:ob.cm})){ S.body={age:ob.age,kg:Math.round(ob.kg*10)/10,cm:Math.round(ob.cm),unit:ob.unit,at:Date.now()}; if(ob.sex==='m'||ob.sex==='f'||ob.sex==='x') S.body.sex=ob.sex; } else S.body=null;   /* gender is only kept when it was chosen: "prefer not to say" saves nothing */
  S.onboarded=true; S.startedAt=S.startedAt||Date.now(); S.flex.mon=S.flex.mon||C.mondayOf(S.startedAt);
  save(); ph.classList.remove('onb'); $('ob').hidden=true; $('ob').innerHTML=''; applyLang(); cache={}; ticksKey=''; shownP=-1; showTab('today'); obFly(); if(FUI) setTimeout(function(){ FUI.pending(true); },1500);
}

/* ---------- the onboarding moon story: ONE moon carries the whole setup ----------
   Welcome: a big moon on a night sky (the real 3D ball when the 3D switch is on) that waxes in, breathes and follows your finger.
   Get started: it shrinks up into the header and stays there as the progress bar, gaining a share with every step.
   You're set: the progress carries on counter-clockwise from the header to full, then it turns into the sun with a soft bloom while the sky goes from night to dawn.
   Open Lightly: the sun flies into the disc on Today. */
var OL={el:null,inn:null,orb:null,tried:false,loop:false,shown:false,mode:'',p:0,moon:1,boost:0,pulse:0,full:false,drag:false,x0:0,pull:0,tw:null,fin:null,last:0};
function obStars(){ return '<svg class="ob-stars" viewBox="0 0 100 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="tw" fill="#fff"><circle cx="10" cy="14" r=".5" opacity=".7"/><circle cx="26" cy="38" r=".35" opacity=".5"/><circle cx="84" cy="22" r=".55" opacity=".7"/><circle cx="92" cy="58" r=".35" opacity=".5"/><circle cx="14" cy="96" r=".4" opacity=".5"/><circle cx="70" cy="76" r=".4" opacity=".55"/><circle cx="88" cy="132" r=".5" opacity=".6"/><circle cx="8" cy="150" r=".35" opacity=".5"/><circle cx="40" cy="170" r=".4" opacity=".5"/><circle cx="62" cy="12" r=".35" opacity=".5"/><circle cx="48" cy="186" r=".5" opacity=".6"/><circle cx="76" cy="168" r=".35" opacity=".45"/></g></svg>'; }
function obLayer(){
  if(OL.el) return OL.el;
  var el=document.createElement('div'); el.className='ob-moonlayer'; el.id='obLayer'; el.setAttribute('aria-hidden','true');
  el.innerHTML='<div class="in"><i class="bg"></i><svg class="ob-disc" viewBox="-118 -118 236 236"><defs><radialGradient id="obG" cx=".38" cy=".34" r=".78"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#EEE8D9"/><stop offset="1" stop-color="#CFC7B2"/></radialGradient><radialGradient id="obGs" cx=".4" cy=".36" r=".78"><stop offset="0" stop-color="#FFF6C2"/><stop offset=".5" stop-color="#FFD21F"/><stop offset="1" stop-color="#F5A800"/></radialGradient><filter id="obF" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="1.4"/></filter><mask id="obM" maskUnits="userSpaceOnUse" x="-120" y="-120" width="240" height="240"><path class="obLit" fill="#fff" filter="url(#obF)"/></mask></defs>'+
    '<circle class="obHalo" r="92" fill="none" stroke="#F4EFE2" stroke-width="1.5" opacity="0"/><circle r="84" class="u"/><g mask="url(#obM)"><circle r="84" fill="url(#obG)"/><g class="cr obCr"><circle cx="-32" cy="-28" r="16"/><circle cx="28" cy="-43" r="8"/><circle cx="43" cy="9" r="13"/><circle cx="-7" cy="32" r="18"/><circle cx="-52" cy="20" r="7"/><circle cx="13" cy="-7" r="5"/></g><circle class="obSun" r="84" fill="url(#obGs)" opacity="0"/></g></svg></div>';
  $('ob').parentNode.insertBefore(el,$('ob').nextSibling); OL.el=el; OL.inn=el.firstChild;
  el.addEventListener('pointerdown',function(e){ if(OL.mode!=='wel') return; OL.drag=true; OL.x0=e.clientX; try{ el.setPointerCapture(e.pointerId); }catch(x){} el.style.cursor='grabbing'; fx('light'); });
  el.addEventListener('pointermove',function(e){ if(OL.drag&&!reduce) OL.pull=(e.clientX-OL.x0)/(el.getBoundingClientRect().width||1); });
  var up=function(){ OL.drag=false; OL.pull=0; el.style.cursor=''; }; el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up);
  return el;
}
/* the real 3D ball is made once, after the first paint, and lives inside the moon layer */
function obOrbInit(){ if(OL.tried||!S.prefs.d3||!window.LightlySphere) return; OL.tried=true;
  try{ OL.orb=window.LightlySphere(OL.inn.querySelector('.ob-disc')); if(OL.orb) OL.orb.set(true); }catch(e){ OL.orb=null; } }
function obPaint(){
  var svg=OL.inn.querySelector('.ob-disc'), orb=OL.orb; OL.el.classList.toggle('flat',!(orb&&orb.ok()&&S.prefs.d3));
  if(orb&&orb.ok()&&S.prefs.d3){ svg.style.opacity=0; orb.draw({p:OL.p,wane:false,moon:OL.moon,tx:0,ty:0,ox:0,oy:0,scale:1,alpha:1,night:1,glow:(1-OL.moon)*OL.p*(.35+.65*OL.boost)+OL.boost*.3,halo:Math.max(OL.moon*OL.boost,OL.pulse*.8)}); return; }
  if(orb) orb.set(false);
  svg.style.opacity=1; var q=function(c){ return svg.querySelector('.'+c); };
  q('obLit').setAttribute('d',wedgePath(OL.p,84,false)); q('obSun').style.opacity=1-OL.moon; q('obCr').style.opacity=OL.moon;
  var ha=q('obHalo'); ha.setAttribute('r',(92+17*(1-OL.pulse)).toFixed(1)); ha.setAttribute('opacity',(OL.pulse*.8).toFixed(2));
}
function obLoop(t){
  if($('ob').hidden&&!OL.flying){ OL.loop=false; return; }
  var dt=Math.min((t-OL.last)/1000,.05); OL.last=t;
  if(OL.mode==='wel'){   /* rests dark, follows a drag, pulses when full */
    var target=OL.drag?Math.min(1,Math.max(0,OL.pull*1.6)):0;   /* rests completely dark: the progress starts from nothing once it moves up */
    OL.p+=(target-OL.p)*(1-Math.exp(-dt*(OL.drag?18:5)));
    var full=OL.p>.93; if(full&&!OL.full){ OL.pulse=1; fx('success'); } OL.full=full; }
  OL.pulse=Math.max(0,OL.pulse-dt/1.4);
  if(OL.tw){ var k=Math.min((t-OL.tw.t0)/OL.tw.ms,1), e=1-Math.pow(1-k,3); OL.p=OL.tw.from+(OL.tw.to-OL.tw.from)*e; if(k>=1) OL.tw=null; }
  if(OL.fin) obFinStep(t);
  obPaint(); requestAnimationFrame(obLoop);
}
function obTo(p){ if(reduce){ OL.p=p; OL.tw=null; return; } OL.tw={from:OL.p,to:p,t0:performance.now(),ms:800}; }
/* where a slot sits inside its step, ignoring any slide that is still running */
function obSlot(st,cls){ var e=st.querySelector(cls); if(!e) return null; var x=0,y=0,n=e; while(n&&n!==st){ x+=n.offsetLeft; y+=n.offsetTop; n=n.offsetParent; } return {x:x,y:y-st.scrollTop,w:e.offsetWidth,p:+e.dataset.p||0}; }
/* the moon goes to wherever this step keeps it: big on the welcome and You're set, small in the header on the steps between */
function obMove(st){
  var key=obFlow()[ob.step], kind=key==='welcome'?'wel':key==='summary'?'fin':'head', el=obLayer(), slot=obSlot(st,kind==='head'?'.ob-mslot':'.ob-bslot'); if(!slot) return;
  el.hidden=false; el.classList.toggle('head',kind==='head'); el.classList.toggle('onbg',kind==='fin'); el.classList.toggle('touch',kind==='wel');
  var first=!OL.shown; OL.shown=true; if(first||reduce) el.style.transition='none';
  el.style.transform='translate('+slot.x+'px,'+slot.y+'px) scale('+(slot.w/236).toFixed(4)+')';
  if(first||reduce){ void el.offsetWidth; el.style.transition=''; }
  var prev=OL.mode; OL.mode=kind; OL.fin=null;
  if(kind!=='fin'){ OL.moon=1; OL.boost=0; }
  if(kind==='head'){ var n=obFlow().length; obTo(ob.step/(n-1)); }
  else if(kind==='fin') obFin(st);
  if(!OL.loop){ OL.loop=true; OL.last=performance.now(); requestAnimationFrame(obLoop); }
  requestAnimationFrame(function(){ requestAnimationFrame(obOrbInit); });
}
/* You're set: carries on from where the header progress was (never empties) and fills all the way to full, then reveals what the sky is doing where you are right now: the sun by day, the moon by night */
function obNow(){ var now=Date.now(); refreshSun(now); var hp=C.placeHour(pi,now), k=C.skyAt(hp,sun)[1], day=C.moonAmt(hp,sun)<.5; return {sun:day,sky:day?(['dawn','morning','day','sunset'].indexOf(k)>=0?k:'day'):'night'}; }
function obFin(st){
  var nw=obNow(); st.setAttribute('data-fs',nw.sky);
  if(reduce){ OL.p=1; OL.moon=nw.sun?0:1; OL.tw=null; obSky(st,nw.sun,true); return; }
  OL.tw=null; OL.fin={t0:performance.now(),p0:OL.p,st:st,sun:nw.sun,turned:false};
}
/* the sky arrives: the page glides from its plain background to the sky for this hour (and this light or dark setting); the strips around the phone follow it */
function obSky(st,sun,now){
  st.classList.add('sky'); if(OL.el) OL.el.classList.remove('onbg');
  if(sun) st.classList.add('dawn'); else if(now) st.classList.add('nsk'); else setTimeout(function(){ st.classList.add('nsk'); },950);   /* the words turn white about as the page darkens */
  if(now){ chrome(); return; }
  var n=0, iv=setInterval(function(){ chrome(); if(++n>25||!st.isConnected) clearInterval(iv); },100);
}
function obFinStep(t){
  var f=OL.fin; if(!f.st.isConnected||obFlow()[ob.step]!=='summary'){ OL.fin=null; return; }
  var el=t-f.t0, GO=200, FILL=1200, TURN=900, REV=FILL*.78; if(el<0) return;   /* no emptying: the progress simply carries on from where the header left it */
  if(el<GO) return;
  var e2=el-GO; OL.p=f.p0+(1-f.p0)*(1-Math.pow(1-Math.min(e2/FILL,1),3));
  if(e2<=REV) return;   /* the reveal starts as the moon nears full, not after the slow last stretch of the fill */
  if(!f.turned){ f.turned=true; fx('success'); obBloom(); obSky(f.st,f.sun,false); if(!f.sun) OL.pulse=1; }
  if(!f.sun){ if(e2>REV+TURN){ OL.p=1; OL.fin=null; } return; }   /* night: it stays a full moon, under the night sky */
  var v=Math.min((e2-REV)/TURN,1), e=v*v*(3-2*v); OL.moon=1-e; OL.boost=Math.max(0,1-v*1.15);
  if(v>=1){ OL.moon=0; OL.boost=0; OL.fin=null; }
}
function obBloom(){
  var el=OL.el; if(reduce||!el.animate) return; var calm=obRisky(), r=85, cx=118, cy=118, box=document.createElement('div');
  box.setAttribute('aria-hidden','true'); box.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:2';
  var glow=document.createElement('div'); glow.style.cssText='position:absolute;left:'+cx+'px;top:'+cy+'px;width:'+r*2+'px;height:'+r*2+'px;margin:'+(-r)+'px 0 0 '+(-r)+'px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.9) 0%,rgba(255,255,255,.45) 40%,rgba(255,255,255,0) 70%);opacity:0'; box.appendChild(glow);
  el.appendChild(box); glow.animate([{opacity:0,transform:'scale(.9)'},{opacity:1,transform:'scale(1.4)',offset:.3},{opacity:0,transform:'scale(2.6)'}],{duration:1600,easing:'cubic-bezier(.22,.8,.3,1)',fill:'forwards'});
  OL.inn.animate([{transform:'scale(1)'},{transform:'scale(1.05)',offset:.3},{transform:'scale(1)'}],{duration:900,easing:'cubic-bezier(.2,1,.3,1)'});
  var cols=['#FFFFFF','#FFF7D1','#F4EFE2','#FFFFFF'], n=calm?0:20;   /* Care mode: only the soft glow, no sparks */
  for(var i=0;i<n;i++){ var a=(i/n)*Math.PI*2+Math.random()*.25, dist=r*(1.35+Math.random()*1.3), s=3+Math.random()*4, dot=document.createElement('i');
    dot.style.cssText='position:absolute;left:'+cx+'px;top:'+cy+'px;width:'+s+'px;height:'+s+'px;margin:'+(-s/2)+'px 0 0 '+(-s/2)+'px;border-radius:50%;background:'+cols[i%cols.length]+';box-shadow:0 0 '+s*2+'px '+cols[i%cols.length]+';opacity:0'; box.appendChild(dot);
    dot.animate([{opacity:0,transform:'translate(0,0) scale(.4)'},{opacity:1,offset:.2},{opacity:0,transform:'translate('+(Math.cos(a)*dist).toFixed(0)+'px,'+(Math.sin(a)*dist-r*.2).toFixed(0)+'px) scale(1)'}],{duration:1400+Math.random()*600,delay:40+Math.random()*160,easing:'cubic-bezier(.15,.7,.2,1)',fill:'forwards'}); }
  setTimeout(function(){ box.remove(); },2400);
}
/* Open Lightly: the sun flies into the disc on Today, then the layer fades and Today's own disc takes over */
function obFly(){
  var el=OL.el, d=$('disc'); if(!el||!OL.shown) return;
  if(reduce||!d||el.hidden){ obLayerOff(); return; }
  var pr=ph.getBoundingClientRect(), r=d.getBoundingClientRect(); if(r.width<10){ obLayerOff(); return; }
  OL.flying=true; el.classList.remove('head','touch'); el.style.transition='transform .85s cubic-bezier(.32,.72,0,1),opacity .35s ease .6s';
  el.style.transform='translate('+(r.left-pr.left).toFixed(1)+'px,'+(r.top-pr.top).toFixed(1)+'px) scale('+(r.width/236).toFixed(4)+')'; el.style.opacity='0';
  setTimeout(obLayerOff,1000);
}
function obLayerOff(){ OL.flying=false; if(OL.el){ OL.el.hidden=true; OL.el.style.opacity=''; OL.el.style.transition=''; } OL.shown=false; OL.mode=''; OL.fin=null; OL.tw=null; OL.p=0; OL.moon=1; OL.boost=0; }
/* sunrise and sunset for the chosen place, rolling in as 24-hour times, with the sun's part of the day marked */
function obSkyHtml(){
  refreshSun(Date.now()); var r=sun.rise, e=sun.set, a=100*r/24, w=Math.max(0,100*(e-r)/24);
  return '<div class="ob-times"><div><b class="rn" data-roll="1">'+clockH(r)+'</b><span>'+L('Moon turns into sun','月亮变成太阳')+'</span></div><div><b class="rn" data-roll="1">'+clockH(e)+'</b><span>'+L('Sun turns into moon','太阳变成月亮')+'</span></div></div>'+
    '<div class="ob-day" aria-hidden="true"><div class="trk"><i style="left:'+a.toFixed(1)+'%;width:'+w.toFixed(1)+'%"></i></div><div class="lbl"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></div>';
}
/* plan: one big number, the fasting hours, rolls when you switch plan; a 24-hour strip shows the window */
function obBigHtml(pid){
  var p=C.planById(pid||'13',obCh()), st=ob.start||'20:00', uh=+st.split(':')[0]+ +st.split(':')[1]/60, eh=(uh+p.fast)%24, wrap=uh+p.fast>24;
  var b1='left:'+(100*uh/24).toFixed(2)+'%;width:'+(100*(wrap?24-uh:p.fast)/24).toFixed(2)+'%', b2='left:0;width:'+(wrap?(100*eh/24).toFixed(2):0)+'%';
  return '<div class="ob-big"><span class="rn" id="obBigN">'+p.fast+'</span><small>'+L('hours fasting','小时断食')+'</small></div>'+
    '<div class="ob-day" aria-hidden="true"><div class="trk"><i style="'+b1+'"></i><i style="'+b2+'"></i></div><div class="lbl"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div></div>'+
    '<p class="ob-win">'+L('Fast '+clockH(uh)+' to '+clockH(eh)+', eat '+(24-p.fast)+' hours.','断食 '+clockH(uh)+' 到 '+clockH(eh)+'，进食 '+(24-p.fast)+' 小时。')+'</p>';
}
function obRoll(delay){ setTimeout(function(){ var st=$('ob').lastElementChild; if(st) [].forEach.call(st.querySelectorAll('.rn[data-roll]'),function(n,j){ setTimeout(function(){ odo(n); },j*90); }); },delay||0); }
/* everything that moves when a step arrives */
function obIn(st){
  var key=obFlow()[ob.step]; obMove(st);
  if(key==='plan') setTimeout(function(){ odo(st.querySelector('#obBigN')); },380);
  else if(key==='set') obRoll(420);
}
/* ---------- click routing ---------- */
/* the erase warning names what the person would lose, with their own numbers, so it lands */
function eraseLine(n,st){
  var en=['all '+n+(n===1?' fast':' fasts')], zh=['全部 '+n+' 次断食记录'];
  if(!n){ en=[]; zh=[]; }
  if(st>0){ en.push('your '+st+'-day streak'); zh.push(st+' 天连续记录'); }
  en.push('your plan and settings'); zh.push('计划和设置');
  var e=en.join(', ');
  return L('You’ll lose '+e+'. This can’t be undone.','你将失去'+zh.join('、')+'。此操作无法撤销。');
}
/* a red button that is locked for 3 seconds (counting down), then must be held for 2 seconds */
var WARN='<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="28" r="28"/><path d="M28 15v17" /><circle class="dot" cx="28" cy="40" r="2.6"/></svg>';
function lockedHold(id,act,lab,extra,cls){ return '<button class="btn '+(cls||'red solid')+' hold" id="'+id+'" data-hold="'+act+'" data-ms="2000"'+(extra||'')+' disabled aria-label="'+L(lab[0]+', available in 3 seconds',lab[1]+'，3 秒后可用')+'"><span class="hl">'+L(lab[0]+' · 3',lab[1]+' · 3')+'</span></button>'; }
function unlockHold(id,lab,ready){
  var go=$(id), lbl=go.querySelector('.hl'), n=3, iv=setInterval(function(){
    if(!go.isConnected||!sheetOpen){ clearInterval(iv); return; } /* closed early: the countdown stops, with no buzz */
    n--; if(n>0){ lbl.textContent=L(lab[0]+' · '+n,lab[1]+' · '+n); return; }
    clearInterval(iv); go.disabled=false; lbl.textContent=L(ready[0],ready[1]); go.setAttribute('aria-label',L(ready[0],ready[1])); fx('light'); },1000);
}
function delAcctSheet(err){
  var au=CL.getAuth(); if(!au) return closeSheet();
  openSheet('<!--keep--><div class="warn-ico">'+WARN+'</div><h3 class="ctr">'+L('Delete your account?','删除账号？')+'</h3><p class="lede ctr">'+L('Your account, backup and profile picture are deleted for good. This can’t be undone.','账号、云端备份和头像将被永久删除，无法撤销。')+'</p>'+
    (err?'<p class="note err ctr" role="alert" style="color:var(--red)">'+esc(err)+'</p>':'')+
    '<div class="btns"><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button>'+lockedHold('delGo','delacctok',['Delete account','删除账号'])+'<button class="btn quiet" data-act="export">'+L('Export my fasts first','先导出我的记录')+'</button></div>');
  unlockHold('delGo',['Delete account','删除账号'],['Hold to delete account','按住删除账号']);
}
/* the account is gone and this phone is signed out: ask what happens to the fasts that are still here */
function delAcctDone(){
  try{ localStorage.removeItem(AVG); }catch(e){}
  sync.at=0; sync.err=''; clearTimeout(sync.t);
  if(S.avatar&&S.avatar.t==='google') S.avatar=null; /* that photo belonged to the account */
  S.cloudUid=null; S.name=null; save();
  fx('success');
  openSheet('<!--keep--><h3 class="ctr">'+L('Account deleted','账号已删除')+'</h3><p class="lede ctr">'+L('Keep your fasts on this phone?','要在这台手机上保留断食记录吗？')+'</p>'+
    '<div class="btns"><button class="btn" data-act="delkeep">'+L('Keep on this phone','保留在手机上')+'</button><button class="btn red" data-act="erase">'+L('Erase from this phone','从手机上清除')+'</button></div>');
  if(curTab==='me') renderMe();
}
var A={
  close:closeSheet,
  delkeep:function(){ closeSheet(); renderMe(); },
  lwgo:function(b){ longPick(C.planById(b.dataset.p)); },
  lwback:function(){ planSheet(); },
  lsck:function(b){ b.setAttribute('aria-checked',b.getAttribute('aria-checked')!=='true'); var all=[].slice.call(document.querySelectorAll('#lsChecks .check')); $('lsGo').disabled=!all.every(function(x){return x.getAttribute('aria-checked')==='true';}); },
  lsgo:function(b){ var p=C.planById(b.dataset.p); if(S.cur){ S.planId=p.id; S.cur.planId=p.id; S.cur.goalH=p.fast; S.cur.reached=false; save(); closeSheet(); cache={}; ticksKey=''; updateToday(); scheduleGoal(); } else { S.planId=p.id; save(); beginFast(p,Date.now()); } },
  day:function(b){ selDay=b.dataset.k; ddIn=true; renderDays(); ddShow(); },
  gotoday:function(){ showTab('today'); },
  recap:function(b){ openReport(b); },
  rpclose:function(){ closeReport(); },
  rpwsave:function(){ var pm=recapMonth(); if(!pm||!S.body) return; var ck=S.body.checks=(S.body.checks||[]).filter(function(c){ return c.key!==pm.key; }); ck.push({key:pm.key,kg:Math.round(rp.wkg*10)/10,at:Date.now()}); ck.sort(function(a,b){ return a.key<b.key?-1:1; }); save(); fx('success'); rpWeightPaint(); trendSync(); },
  rpwedit:function(){ var pm=recapMonth(); if(!pm||!S.body) return; S.body.checks=(S.body.checks||[]).filter(function(c){ return c.key!==pm.key; }); save(); rpWeightPaint(); },
  recappop:function(){ recapPopGo(); },
  recapx:function(){ var pm=recapMonth(); if(pm){ S.prefs.recapSeen=pm.key; save(); renderDays(); } },
  avgmode:function(b){ if(avgMode===b.dataset.m) return; avgMode=b.dataset.m; avgSel=null; avgDraw(true); var n=$('avgBox').querySelector('[data-act=avgmode][aria-pressed=true]'); if(n) n.focus({preventScroll:true}); },
  avgbar:function(b){ avgSel=+b.dataset.i; avgDraw(false); var n=$('avgBox').querySelector('[data-i="'+avgSel+'"]'); if(n) n.focus({preventScroll:true}); },
  addday:function(){ fastSheet(null,selDay); },
  cheatday:function(b){ cheatSheet(b.dataset.k); },
  calprev:function(){ var i=calY*12+calM-1; calGo(Math.floor(i/12),((i%12)+12)%12,-1); },
  calnext:function(){ var i=calY*12+calM+1; calGo(Math.floor(i/12),((i%12)+12)%12,1); },
  calpick:function(){ pickY=calY; openSheet(pickHtml(),null,true); },
  pickyear:function(b){ pickY=+b.dataset.y; openSheet(pickHtml(),null,true); },
  pickmonth:function(b){ var i=(+b.dataset.y)*12+(+b.dataset.m), c=calY*12+calM; closeSheet(); calGo(+b.dataset.y,+b.dataset.m,i<c?-1:i>c?1:0); },
  pickthis:function(){ var n=new Date(), i=n.getFullYear()*12+n.getMonth(), c=calY*12+calM; closeSheet(); calGo(n.getFullYear(),n.getMonth(),i<c?-1:i>c?1:0); },
  impdays:function(){ closeSheet(); showTab('days'); },
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
  geo:function(){ toast(L('Finding your location…','正在定位…')); geo(function(){ placeSheet(); },function(){ if(sheetOpen) placeSheet(); }); },
  city:function(b){ setPlace({key:b.dataset.k}); placeSheet(); },
  plan:planSheet, place:placeSheet, cheat:cheatSheet, sky:skySheet, care:careSheet,
  carerow:careRow,
  careadd:function(b){ careAdd(b.dataset.k); careSheet(); },
  careundo:careUndoGo,
  carepro:function(b){ var on=b.getAttribute('aria-checked')!=='true'; b.setAttribute('aria-checked',on); $('careGo').disabled=!on; },
  carewait:function(b){ var P=S.profile, k=b.dataset.k, keys=(P.careOff&&P.careOff.keys||[]).filter(function(x){ return x!==k; }); keys.push(k); P.careOff={keys:keys,start:Date.now()}; save(); careSheet(); },
  carecancel:function(){ S.profile.careOff=null; save(); careSheet(); },
  careeasego:function(b){ careDrop([b.dataset.k]); careSheet(); },
  google:function(b){ if(b.disabled) return; var soon=function(){ b.disabled=false; toast(L('Google sign-in is not switched on yet. Email works now.','Google 登录还没开启，现在可用邮箱。')); };
    if(!CL.ready()) return soon(); b.disabled=true;
    CL.providerOn('google').then(function(on){ if(!on) return soon(); location.assign(CL.oauthUrl('google',S,FUI&&FUI.joinCode(),fromTab())); }).catch(soon); },
  emailsheet:function(){ emailSheet('email'); },
  emback:function(b){ emailSheet('email',b.dataset.e); },
  soon:function(b){ toast(({apple:L('Apple sign-in is coming. Email works now.','Apple 登录即将推出，现在可用邮箱。'),google:L('Google sign-in is coming. Email works now.','Google 登录即将推出，现在可用邮箱。'),wechat:'微信登录会随中国大陆版本推出，现在可用邮箱。',phone:'手机号登录会随中国大陆版本推出，现在可用邮箱。'})[b.dataset.k]); },
  emsend:function(b){ var e=($('emIn').value||'').trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return emailSheet('email',e,L('That doesn’t look like an email address.','这个邮箱地址看起来不对。')); b.disabled=true; b.textContent=L('Sending…','发送中…');
    emCool=Date.now()+60000; CL.sendCode(e,S,FUI&&FUI.joinCode(),fromTab()).then(function(){ emailSheet('sent',e); }).catch(function(x){ emCool=0; emailSheet('email',e,emailErr(x)); }); },
  emresend:function(b){ var e=b.dataset.e; if(Date.now()<emCool) return; emCool=Date.now()+60000; CL.sendCode(e,S,FUI&&FUI.joinCode(),fromTab()).then(function(){ emailSheet('sent',e); toast(L('Sent again.','已重新发送。')); }).catch(function(x){ emCool=0; emailSheet('sent',e,emailErr(x)); }); },
  emverify:function(b){ var e=b.dataset.e, c=($('emCode').value||'').trim(); if(c.length<6) return emailSheet('sent',e,L('Enter the 6-digit code.','请输入 6 位验证码。')); b.disabled=true; b.textContent=L('Checking…','验证中…');
    CL.verify(e,c).then(function(){ closeSheet(); toast(L('Signed in.','已登录。')); renderMe(); syncNow(true); }).catch(function(x){ emailSheet('sent',e,L('That code didn’t work. ','验证码不对：')+x.message); }); },
  namesheet:nameSheet,
  namesave:function(){ var v=($('nmIn').value||'').trim().slice(0,24); S.name=v||null; save(); closeSheet(); renderMe(); },
  signout:function(){ openSheet('<!--keep--><h3>'+L('Sign out?','退出登录？')+'</h3><p class="lede">'+L('Your fasts stay on this phone and in your account. You can sign back in any time.','记录会保留在这台手机和你的账号里，随时可以重新登录。')+'</p><div class="btns"><button class="btn" data-act="signoutok">'+L('Sign out','退出登录')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>'); },
  signoutok:function(){ CL.signOut(); try{ localStorage.removeItem(AVG); }catch(e){} S.name=null; save(); sync.at=0; sync.err=''; closeSheet(); renderMe(); },
  avatar:function(){ avatarSheet(); },
  avicon:function(b){ var a=AV.find(b.dataset.id); if(!a) return; if(AV.locked(a,S.fasts.length)) return toast(L(a.en+' unlocks after '+a.unlock+' fasts.','完成 '+a.unlock+' 次断食后解锁'+a.zh+'。')); fx('select'); avSet({t:'icon',id:a.id}); },
  avgoogle:function(){ fx('select'); avSet({t:'google'}); },
  avremove:function(){ avSet(null); },
  avsave:function(){ var c=$('cropC'); if(!c||!crop) return; cropDraw(); var d=c.toDataURL('image/jpeg',.86); fx('success'); avSet({t:'photo',d:d}); },
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
  diag:function(){ var now=performance.now(); testerTaps=(now-testerT<2000?testerTaps:0)+1; testerT=now;
    if(testerTaps>=7){ testerTaps=0; var on=!isTester(); if(!setTester(on)) return; toast(on?L('Tester options on','测试选项已开启'):L('Tester options off','测试选项已关闭')); return renderMe(); }
    if(!isTester()) return;   /* everyone else: the version line is only text */
    var vv=window.visualViewport; toast('win '+innerWidth+'×'+innerHeight+' · screen '+screen.width+'×'+screen.height+' · vv '+(vv?Math.round(vv.width)+'×'+Math.round(vv.height):'-')+' · ph '+ph.offsetHeight+' · '+(navigator.standalone?'home screen':'browser')); },
  import:function(){ importSheet(); },
  impdo:function(){ importDo(); },
  zipgo:function(){ var i=$('zipPw'), b=$('zipGo'); if(!impZip||!i||!i.value||(b&&b.disabled)) return; if(b) b.disabled=true; var z=impZip; LightlyImport.fromZip(z,i.value).then(function(res){ if(!sheetOpen||impZip!==z) return; if(res.error==='password') return zipSheet(true); if(res.error==='encrypted') return zipSheet(false); if(res.error) return importSheet(impMsg(res.error)); importPreview(LightlyImport.plan(res,S.fasts,S.cur,S.del,Date.now())); }); },
  exportsheet:exportSheet,
  export:function(){ saveFile(JSON.stringify(S,null,2),'application/json','lightly-fasts-'+today()+'.json'); },   /* from the erase and delete sheets: stays open */
  exportcsv:function(){ if(saveFile(LightlyImport.toCsv(S.fasts),'text/csv;charset=utf-8','lightly-fasts-'+today()+'.csv')) setTimeout(closeSheet,250); },
  exportbk:function(){ if(saveFile(JSON.stringify(S,null,2),'application/json','lightly-fasts-'+today()+'.json')) setTimeout(closeSheet,250); },
  /* Erase everything: the one step that can't be undone. A red warning mark and a plain list of what goes, Cancel as the main button, and the erase button
     is locked for 3 seconds (counting down), then must be held for 2 seconds. An export is one tap away. */
  erase:function(){
    openSheet('<!--keep--><div class="warn-ico">'+WARN+'</div><h3 class="ctr">'+L('Are you sure?','你确定吗？')+'</h3><p class="lede ctr">'+eraseLine(S.fasts.length,care()?0:curStreak())+(cloudOn()?' '+L('Your backup is erased too.','云端备份也会一并清除。'):'')+'</p>'+
      '<div class="btns"><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button>'+lockedHold('eraseGo','eraseok',['Erase everything','清除所有数据'],['Hold to erase everything','按住清除所有数据'])+'<button class="btn quiet" data-act="export">'+L('Export my fasts first','先导出我的记录')+'</button></div>');
    unlockHold('eraseGo',['Erase everything','清除所有数据'],['Hold to erase everything','按住清除所有数据']);
  },
  /* Delete account: same care as Erase everything, because it can't be undone either. Only reachable when signed in. The server does the deleting (supabase/functions/delete-account). */
  delacct:function(){ delAcctSheet(''); },
  delacctok:function(){
    var go=$('delGo'); if(go){ go.disabled=true; go.querySelector('.hl').textContent=L('Deleting…','正在删除…'); }
    CL.deleteAccount().then(function(){ delAcctDone(); }).catch(function(x){ delAcctSheet(x&&(x.status===401||x.status===400)?L('Your sign-in has expired. Sign out, sign in again, then try again.','登录已过期。请退出后重新登录，再试一次。'):L('Couldn’t delete the account. Check your connection and try again.','没能删除账号，请检查网络后重试。')); });
  },
  eraseok:function(){
    var done=function(){ try{ localStorage.removeItem(KEY); localStorage.removeItem(AVG); }catch(e){} S=fresh(); storageOk=true; location.reload(); };
    if(!cloudOn()) return done();
    /* signed in: the backup is part of "everything". Without this the next sync brings it all back. An empty, newest copy replaces it; the account stays. */
    clearTimeout(sync.t); sync.busy=true; var go=$('eraseGo'), hl=go&&go.querySelector('.hl'); if(go) go.disabled=true; if(hl) hl.textContent=L('Erasing…','正在清除…');
    var blank=fresh(); blank.mod=Date.now(); blank.cloudUid=CL.getAuth().uid;
    CL.rpc('trend_leave').catch(function(e){ if(e&&e.status===404) return; throw e; }).then(function(){ return CL.push(blank); }).then(done).catch(function(){ sync.busy=false; closeSheet(); toast(L('Couldn’t erase your backup. Check your connection and try again.','没能清除云端备份，请检查网络后重试。')); });
  },
  usualset:function(){ S.prefs.usualStart='20:00'; save(); cache={}; updateToday(); renderMe(); pkToggle('usualStart'); },
  pktog:function(b){ pkToggle(b.dataset.id); },
  tl:function(b){ S.prefs.tl=b.dataset.v; save(); cache={}; renderMe(); updateToday(); },
  tstyle:function(b){ S.prefs.timerStyle=b.dataset.v; ph.dataset.ts=b.dataset.v; save(); renderMe(); cache={}; fitDisc(); },
  obnext:function(){ if(ob.geoBusy){ geoTok++; ob.geoBusy=false; }   /* moving on while the location is still coming: keep the nearest city */
    if(ob.step<obFlow().length-1){ ob.step++; obRender(); } },
  obback:function(){ obBackTo(); },
  bodyinfo:bodySheet,
  bodycheck:function(b){ if(!S.body) return; S.body.checkOff=!S.body.checkOff; if(!S.body.checkOff) delete S.body.checkOff; else if(S.body.share) trendStop(); save(); fx('select'); b.setAttribute('aria-checked',String(!S.body.checkOff)); if(sheetOpen) bodySheet(); },
  bodytrend:function(b){ if(!S.body) return;
    if(S.body.share){ trendStop(); fx('select'); b.setAttribute('aria-checked','false'); return; }
    if(!cloudOn()) return toast(L('Sign in first, so your change counts once.','请先登录，这样你的变化只算一次。'));
    S.body.share=true; save(); trendSync(); fx('select'); b.setAttribute('aria-checked','true'); },
  trendyes:function(){ if(!S.body) return; if(!cloudOn()) return rpWeightPaint(); S.body.share=true; save(); fx('success'); trendSync(); rpWeightPaint(); },
  trendno:function(){ if(!S.body) return; S.body.share=false; save(); fx('select'); rpWeightPaint(); },
  rpwoff:function(){ if(!S.body) return; S.body.checkOff=true; if(S.body.share) trendStop(); save(); fx('select'); var e=$('rpW'); if(e) e.innerHTML='<h3 id="rpTw" class="rpi">'+L('No more check-ins','不再询问体重')+'</h3><p class="rp-cap rpi" style="--i:1">'+L('Your recap will not include weight any more. You can turn it back on in Me, About you.','回顾里不会再出现体重。你可以在“我的 · 关于你”里重新打开。')+'</p>'; },
  bodyrm:function(){ if(S.body&&S.body.share) trendStop(); S.body=null; save(); closeSheet(); renderMe(); },
  obunit:function(b){ ob.unit=b.dataset.v; obRefresh(); },
  obsex:function(b){ ob.sex=b.dataset.v; if(ob.sex==='m') ob.safe=ob.safe.filter(function(x){ return x!=='preg'; }); fx('select'); obRefresh(); },
  obbody:function(){ ob.bodyDone=true; A.obnext(); },
  obbodyskip:function(){ ob.skip=true; ob.bodyDone=false; obRender(); },
  obopt:function(b){ ob.fasted=b.dataset.v; obRefresh(); },
  obsafe:function(b){ var v=b.dataset.v, i=ob.safe.indexOf(v); if(v==='none') ob.safe=i>=0?[]:['none']; else{ ob.safe=ob.safe.filter(function(x){return x!=='none';}); if(i>=0) ob.safe.splice(ob.safe.indexOf(v),1); else ob.safe.push(v); } obRefresh(); },
  obplan:function(b){ if(b.disabled) return; var id=b.dataset.id, was=ob.plan; ob.plan=id; ob.planAuto=false; obRefresh(); odo($('obBigN'));
    if(id==='custom'&&was!=='custom') setTimeout(function(){ if($('obCustom')) pkToggle('obCustom'); },80);
    var tile=document.querySelector('.ob-step.on .plan[data-id="'+id+'"]'); if(tile&&tile.hasAttribute('data-soft')&&was!==id){ fx('nope'); if(!reduce){ tile.classList.remove('bump'); void tile.offsetWidth; tile.classList.add('bump'); setTimeout(function(){ tile.classList.remove('bump'); },700); } } },
  obgeo:function(){ if(ob.geoBusy) return; ob.geoBusy=true; obRefresh();
    geo(function(ok){ ob.geoBusy=false; if(!ok) ob.city=true; obRefresh(); obRoll(); },
      function(){ if(!$('ob').hidden&&obFlow()[ob.step]==='set'){ ob.geoBusy=false; obRefresh(); obRoll(); } }); },
  obcityshow:function(){ geoTok++; ob.geoBusy=false; ob.city=true; obRefresh(); },
  obdone:obFinish
};
document.addEventListener('keydown',function(e){ if(e.key==='Enter'&&e.target&&e.target.id==='nmIn'){ e.preventDefault(); A.namesave(); } });
FUI=window.LightlyFriendsUI.init({S:function(){ return S; },L:L,esc:esc,$:$,CL:CL,AV:AV,CHEV:CHEV,A:A,ph:ph,tab:function(){ return curTab; },showTab:showTab,today:today,toast:toast,openSheet:openSheet,closeSheet:closeSheet,fx:fx,sw:sw,GICON:GICON});
document.addEventListener('click',function(e){ var b=e.target.closest('[data-act]'); if(!b||!ph.contains(b)) return; var f=A[b.dataset.act]; if(f){ if(b.tagName==='BUTTON'&&b.disabled) return; f(b); } });
document.addEventListener('change',function(e){ var t=e.target; if(!t.dataset||!t.dataset.chg) return;
  if(t.dataset.chg==='custom'){ var v=Math.min(C.customMax(S.profile),Math.max(12,Math.round(+t.value)||16)); S.customH=v; S.planId='custom'; if(S.cur){ S.cur.planId='custom'; S.cur.goalH=v; } save(); cache={}; ticksKey=''; updateToday(); planSheet(); }
  });
/* the real viewport height, so a Home Screen launch fills the glass edge to edge on every phone (ignored while the keyboard is up) */
(function(){ var sa=document.createElement('div'); sa.setAttribute('aria-hidden','true'); sa.style.cssText='position:absolute;left:0;top:0;width:0;visibility:hidden;pointer-events:none;padding:var(--sat) 0 var(--sab)'; ph.appendChild(sa); function fit(){ var a=document.activeElement; if(a&&/^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) return;
    ph.style.setProperty('--app-h',Math.round(window.innerHeight)+'px'); ph.classList.toggle('tight',window.innerHeight-sa.offsetHeight<=600); }
  fit(); window.addEventListener('resize',fit); window.addEventListener('orientationchange',function(){ setTimeout(fit,200); }); window.addEventListener('pageshow',fit); })();
/* scrolling down gives the screen to the content; scrolling up (or reaching the top) brings the tab bar back */
(function(){ var last={}, acc={};
  ['today','days','friends','me'].forEach(function(id){ var e=$(id); last[id]=0; acc[id]=0;
    e.addEventListener('scroll',function(){ var y=e.scrollTop, d=y-last[id]; last[id]=y; if(y<0||y>e.scrollHeight-e.clientHeight+1) return; if(performance.now()<keepTabs){ acc[id]=0; return; }
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
(function(){ var a=$('endA'); a.addEventListener('keydown',function(e){ if(a.getAttribute('role')==='button'&&(e.key==='Enter'||e.key===' ')){ e.preventDefault(); if(S.cur) startEdit(); else if(mode==='eat'&&lastFast()) fastSheet(lastFast()); } }); })();

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
function fitDisc(){ var t=$('today'); if(curTab!=='today'||!t.clientHeight) return; var free=[].reduce.call(t.querySelectorAll('.sp'),function(a,e){ return a+e.offsetHeight; },0)-14, over=t.scrollHeight-t.clientHeight, d=(free>0?free:0)-(over>0?over:0);
  if(Math.abs(d)<2) return; var n=Math.max(ph.classList.contains('tight')?.3:.4,Math.min(1,dsNow+d/236)); if(Math.abs(n-dsNow)<.004) return; dsNow=n; $('discWrap').style.setProperty('--ds',n.toFixed(3)); }
window.addEventListener('resize',fitDisc);
if(S.onboarded){ careTick(); careApply(); normalisePlan(); }
(function(){ var ti=(FUI?FUI.order():['today','days','me']).indexOf(curTab||'today'); ph.style.setProperty('--ti',ti<0?0:ti); })();
if(S.prefs.timerStyle==='c') S.prefs.timerStyle='b';
ph.dataset.ts=S.prefs.timerStyle||'b';
applyTheme(); applyLang(); initCal(); initOrb(); fitDisc(); flexTick(); checkUnlocks();
shortPage(); chrome();
['resize','orientationchange','pageshow'].forEach(function(e){ window.addEventListener(e,function(){ shortPage(); chrome(); }); });
if(window.MutationObserver){ var edgeMo=new MutationObserver(function(){ chromeFor(1400); }); [ph,scrim,sheetEl,$('report')].forEach(function(n){ edgeMo.observe(n,{attributes:true,attributeFilter:['class','data-sky','hidden']}); }); }
$('report').addEventListener('scroll',function(){ chromeFor(150); },true);   /* the recap scrolls through sections of different colours */
if(window.matchMedia){ var mq=matchMedia('(prefers-color-scheme:dark)'); if(mq.addEventListener) mq.addEventListener('change',function(){ setTimeout(chrome,50); }); }
var backTab=CL&&CL.takeTab?CL.takeTab():'', carried=CL&&CL.takeCarried&&CL.takeCarried(), returning=/access_token=|error=/.test(location.hash)&&!!(CL&&CL.ready());
if(carried&&!S.onboarded){ applyRemote(carried); applyTheme(); applyLang(); }
var rootEl=document.documentElement;
/* Coming back through a sign-in link (Google, or the email link): the page opens on a neutral screen (index.html marks it before anything is drawn),
   never on Today. Once the account has answered, the person lands on Me or Friends, where they started, or on onboarding if this really is a new account. */
var landed=false, landMsg='', toasted=false;
function landToast(){ if(landMsg&&!toasted){ toasted=true; toast(landMsg); } }
/* a sign-in comes back to the tab it started from: Friends (or a waiting invite) if the Friends tab is there for this person, otherwise Me */
function landTab(){ var fr=FUI&&FUI.order().indexOf('friends')>=0; return fr&&(backTab==='friends'||FUI.joinCode())?'friends':'me'; }
function fromTab(){ return curTab==='friends'?'friends':''; }   /* the tab a sign-in is started from; from Me it stays Me */
function land(){
  if(landed) return; landed=true; holding=false; rootEl.classList.remove('signing');
  if(!S.onboarded){ ph.classList.remove('sys'); updateToday(); obStart(); chrome(); } else{ showTab(landTab(),true); if(FUI) FUI.pending(); }
  landToast();
}
if(returning){ holding=true; ph.classList.add('sys'); chrome(); setTimeout(land,9000); /* never stay on the neutral screen if the network hangs */ }
else{ rootEl.classList.remove('signing'); if(!S.onboarded){ updateToday(); obStart(); } else{ showTab('today'); if(FUI) FUI.pending(); } }
scheduleGoal(); setTimeout(recapPop,1400);
if(CL&&CL.ready()){ window.addEventListener('storage',function(ev){ if(ev.key===CL.AK&&ev.newValue){ closeSheet(); renderMe(); toast(L('Signed in.','已登录。')); syncNow(true); } });
  CL.fromHash().then(function(a){ if(a){ closeSheet(); landMsg=L('Signed in.','已登录。'); } })
    .catch(function(x){ landMsg=x&&x.linkError&&/expired|otp/i.test(x.linkError+x.message)?L('That link expired or was already used. Send a new one.','链接已过期或已用过，请重新发送。'):L('Couldn’t sign in with that link. Send a new one.','这个链接登录失败，请重新发送。'); })
    .then(function(){
      if(!returning) return cloudOn()?syncNow(true):null;   /* an ordinary launch: just catch the backup up */
      if(S.onboarded){ land(); landToast(); return cloudOn()?syncNow(true):null; }   /* already set up here: show Me at once, the backup catches up behind it */
      return Promise.resolve(cloudOn()?syncNow(true):null).then(function(){ land(); landToast(); });  /* maybe a restore from the account: wait, so onboarding never flashes for someone who already did it */
    }); }
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
/* a bird or two now and then, only under a daytime sky (the daytime partner of the shooting stars); one flock at a time, never with Reduce Motion, never over a sheet or onboarding */
(function(){ var NS='http://www.w3.org/2000/svg', svg=$('birds'); if(!svg) return;
  function light(){ return /dawn|morning|day|sunset/.test(ph.getAttribute('data-sky')); }
  function fly(force){
    if(reduce||!svg.animate) return false;
    if(!force&&(document.hidden||curTab!=='today'||!light()||sheetOpen||!$('ob').hidden)) return false;
    var dir=Math.random()<.5?-1:1, n=1+Math.floor(Math.random()*3), y0=62+Math.random()*46, rise=-14+Math.random()*28, dur=13000+Math.random()*4000, x0=dir>0?-24:414, x1=dir>0?414:-24;
    for(var i=0;i<n;i++){ (function(i){
      var s=(.8+Math.random()*.35).toFixed(2), lag=i*(-1)*dir*(20+Math.random()*10), dy=(i%2?1:-1)*Math.ceil(i/2)*9, by=(Math.random()<.5?-1:1)*(3+Math.random()*3);
      var g=document.createElementNS(NS,'g'), p=document.createElementNS(NS,'path');
      g.setAttribute('transform','translate(-60 -60) scale('+s+')'); p.setAttribute('d','M-7 1.2Q-3.5 -3.6 0 .6Q3.5 -3.6 7 1.2'); g.appendChild(p); svg.appendChild(g);
      var yA=y0+dy, yB=y0+dy+rise;
      var an=g.animate([{transform:'translate('+(x0+lag)+'px,'+yA.toFixed(1)+'px) scale('+s+')',opacity:0},{opacity:1,offset:.12},{transform:'translate('+((x0+x1)/2+lag).toFixed(0)+'px,'+(yA+rise/2+by).toFixed(1)+'px) scale('+s+')',offset:.5},{opacity:1,offset:.88},{transform:'translate('+(x1+lag)+'px,'+yB.toFixed(1)+'px) scale('+s+')',opacity:0}],{duration:dur,delay:i*320+Math.random()*200,easing:'linear',fill:'backwards'});
      p.animate([{transform:'scaleY(1)'},{transform:'scaleY(-.45)',offset:.09},{transform:'scaleY(1)',offset:.2},{transform:'scaleY(-.45)',offset:.29},{transform:'scaleY(1)',offset:.4},{transform:'scaleY(-.45)',offset:.49},{transform:'scaleY(1)',offset:.6},{transform:'scaleY(1)'}],{duration:1900+Math.random()*500,iterations:Infinity,easing:'ease-in-out'});
      an.onfinish=function(){ if(g.parentNode) g.parentNode.removeChild(g); };
    })(i); }
    return true;
  }
  function plan(first){ setTimeout(function(){ fly(); plan(); },(first?4000+Math.random()*5000:20000+Math.random()*30000)); }
  window.lightlyBirds=fly; plan(true);
})();
var lastT=performance.now(), lastSec=0, frame=0;
function loop(t){
  var dt=Math.min((t-lastT)/1000,.1); lastT=t; frame++;
  if(!document.hidden&&curTab==='today'&&$('ob').hidden){ var sn=Math.floor(Date.now()/1000); if(sn!==lastSec){ lastSec=sn; updateToday(); clearStars(); } if(reduce?frame%6===0:(frame%2===0||boost>0||Math.abs(shownP-tgtP)>.001||Math.abs(tiltX)>.01||Math.abs(tiltY)>.01||tgtX||tgtY)) drawDisc(dt*(reduce?6:2)); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.addEventListener('visibilitychange',function(){ if(!document.hidden){ var dk=today(); if(cloudOn()&&Date.now()-sync.at>60000) syncNow(true); flexTick(); if(curTab==='today'){ tipUntil=Date.now()+6000; cache={}; updateToday(); } scheduleGoal(); setTimeout(recapPop,700); } });
if('serviceWorker' in navigator&&location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(function(){});
window.__lightly={get state(){return S;},get setup(){ return {step:ob.step,key:obFlow()[ob.step],n:obFlow().length,moon:OL.p}; },tick:updateToday,core:C};
})();
