/* Lightly: the app. State lives in localStorage; a fast is just a start time, so it survives reloads and closed tabs. */
(function(){
'use strict';
var C=window.LightlyCore, H=C.H, D=C.D, KEY='lightly:v1';
function $(i){return document.getElementById(i);}
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- state ---------- */
function tzGuess(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone; }catch(e){ return ''; } }
function fresh(){ return {v:1,lang:/^zh/i.test(navigator.language||'')?'zh':'en',theme:'auto',onboarded:false,profile:{fastedBefore:null,safety:false},
  planId:'16',customH:16,place:{key:C.guessCity(tzGuess())},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},
  prefs:{sound:true,haptics:true,d3:true,notify:false},ramadanPreview:false,startedAt:null,mod:0,del:[]}; }
var S=fresh(), storageOk=true;
function load(){
  try{ var raw=localStorage.getItem(KEY); if(raw){ var o=JSON.parse(raw), f=fresh(); for(var k in f) if(o[k]!==undefined) S[k]=o[k];
    ['profile','flex','prefs','unlocked'].forEach(function(k){ S[k]=Object.assign({},f[k],o[k]||{}); });
    if(!Array.isArray(S.fasts)) S.fasts=[]; if(!Array.isArray(S.flex.used)) S.flex.used=[]; } }
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
function fmtH(hrs){ var m=Math.max(0,Math.round(hrs*60)), a=Math.floor(m/60), b=m%60; return a+'<small>'+L('h','小时')+'</small>'+(b<10?'0':'')+b+'<small>'+L('m','分')+'</small>'; }
function durTxt(hrs){ var m=Math.max(0,Math.round(hrs*60)), a=Math.floor(m/60), b=m%60; return S.lang==='zh'?a+' 小时 '+b+' 分':a+' h '+b+' m'; }
function pName(p){ return S.lang==='zh'?p.zh:p.name; }

/* ---------- place and sun ---------- */
var pi, sun, sunDay='';
function refreshSun(now){ var k=C.dayKey(now)+S.place.key+(S.place.lat||''); if(k===sunDay&&pi) return; sunDay=k; pi=C.placeInfo(S.place,now); sun=C.sunTimes(pi,now); }
function placeName(){ return S.place.key==='here'?L('Your location','你的位置'):C.CITIES[S.place.key][S.lang==='zh'?'zh':'en']; }
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
  var first=C.dayKey(Math.min.apply(null,fs.map(function(f){return f.end;}))), t=today(), k=first, chain=0, best=0, g=0;
  while(k<=t&&g++<5000){ var st=C.dayStatus(k,fs,S.flex.used); if(st==='done'){chain++; best=Math.max(best,chain);} else if(st==='flex'){} else if(k!==t) chain=0; k=C.addDays(k,1); }
  return best;
}
function curStreak(){ return C.streak(streakFasts(),S.flex.used); }
function checkUnlocks(){ [24,36].forEach(function(k){ var r=C.longStatus(k,S.profile,{fasts:S.fasts,unwell:S.unwell,unlocked:S.unlocked}); if((r.st==='ok'||r.st==='wait'||r.st==='paused')&&!S.unlocked[k]){ S.unlocked[k]=Date.now(); save(); } }); }
function longSt(k){ checkUnlocks(); return C.longStatus(k,S.profile,{fasts:S.fasts,unwell:S.unwell,unlocked:S.unlocked}); }

/* ---------- sound and haptics (tiny synthesized tones; the page follows the phone's silent switch) ---------- */
var ac=null;
function actx(){ if(!S.prefs.sound) return null; try{ if(!ac){ var A=window.AudioContext||window.webkitAudioContext; if(!A) return null; ac=new A(); } if(ac.state==='suspended') ac.resume(); }catch(e){ return null; } return ac; }
function tone(f,dur,vol,type,at){ var c=actx(); if(!c) return; var t=c.currentTime+(at||0), o=c.createOscillator(), g=c.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.006); g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t+dur+.02); }
function sTick(){ tone(1320*(0.94+Math.random()*0.12),.07,.05,'triangle'); }
function sChime(){ tone(1318.5,1.4,.06); tone(1975.5,1.6,.04,'sine',.09); tone(2637,1.2,.02,'sine',.18); }
function sStart(){ tone(520,.12,.05); tone(780,.16,.04,'sine',.06); }
function sSave(){ tone(988,.5,.05); tone(1318.5,.7,.04,'sine',.1); }
function sBoop(){ tone(660*(0.95+Math.random()*0.1),.09,.045); }
function buzz(p){ if(!S.prefs.haptics) return; try{ if(navigator.vibrate) navigator.vibrate(p); }catch(e){} }

/* ---------- toast, sheet ---------- */
var toastT=0;
function toast(msg){ var t=$('toast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(function(){ t.classList.remove('on'); },3400); }
var sheetEl=$('sheet'), scrim=$('scrim'), sheetOpen=false, sheetBack=null;
var sheetFrom=null, BEHIND=['today','days','me','tabs'];
function setInert(v){ BEHIND.forEach(function(id){ var e=$(id); if(v) e.setAttribute('inert',''); else e.removeAttribute('inert'); }); }
function openSheet(html,back){ if(!sheetOpen) sheetFrom=document.activeElement; var again=sheetOpen; sheetEl.innerHTML='<div class="grab"></div>'+html; sheetEl.scrollTop=0; sheetEl.classList.add('open'); scrim.classList.add('on'); sheetOpen=true; sheetBack=back||null; setInert(true);
  sheetEl.setAttribute('aria-label',(sheetEl.querySelector('h3')||{}).textContent||''); sheetEl.tabIndex=-1; if(!again) sheetEl.focus({preventScroll:true}); }
function closeSheet(){ if(!sheetOpen) return; sheetEl.classList.remove('open'); scrim.classList.remove('on'); sheetOpen=false; sheetBack=null; setInert(false); var f=sheetFrom; sheetFrom=null; if(f&&document.contains(f)&&f.offsetParent!==null) try{ f.focus({preventScroll:true}); }catch(e){} }
/* drag the grabber: 1:1 with the finger, then project where the flick was going and dismiss or spring back */
(function(){ var y0=0,dy=0,vy=0,lt=0,ly=0,drag=false;
  sheetEl.addEventListener('pointerdown',function(e){ if(reduce||!e.target.closest('.grab')) return; drag=true; y0=e.clientY; ly=e.clientY; lt=performance.now(); vy=0; dy=0; sheetEl.style.transition='none'; try{ sheetEl.setPointerCapture(e.pointerId); }catch(x){} });
  sheetEl.addEventListener('pointermove',function(e){ if(!drag) return; var raw=e.clientY-y0, now=performance.now(); vy=.6*vy+.4*((e.clientY-ly)/Math.max(now-lt,1)*1000); ly=e.clientY; lt=now;
    dy=raw>=0?raw:-(Math.abs(raw)*30*.55)/(30+.55*Math.abs(raw)); /* rubber-band when pulled up */
    sheetEl.style.transform='translateY('+dy+'px)'; scrim.style.opacity=Math.max(0,.4*(1-Math.max(dy,0)/sheetEl.offsetHeight)); });
  function end(){ if(!drag) return; drag=false; var h=sheetEl.offsetHeight, proj=dy+(vy/1000)*.998/(1-.998); sheetEl.style.transition=''; sheetEl.style.transform=''; scrim.style.opacity='';
    if(proj>h*.45||vy>900) closeSheet(); }
  sheetEl.addEventListener('pointerup',end); sheetEl.addEventListener('pointercancel',end); })();
scrim.addEventListener('click',closeSheet);
document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&sheetOpen) closeSheet(); });
var CHECK='<svg class="ck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
var CHEV='<svg class="chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1.5 1.5 7 7l-5.5 5.5"/></svg>';

/* ---------- Today ---------- */
var ph=$('ph'), cache={}, mode='idle', el=0, tgtP=0, shownP=-1, moonV=1, fullS=0, boost=0, tiltX=0, tiltY=0, tgtX=0, tgtY=0, lastHour=-1, firstTick=true, nowMs=Date.now();
function put(node,key,val,html){ if(cache[key]===val) return; var had=cache[key]!=null; cache[key]=val; if(html) node.innerHTML=val; else node.textContent=val;
  if(had&&(key==='sub'||key==='k'||key==='t')){ node.classList.remove('swap'); void node.offsetWidth; node.classList.add('swap'); } }
var TIPS={night:['The long quiet stretch. Most of it passes while you sleep.','最安静的一段，大部分在睡梦中度过。'],first:['Hunger often comes in waves and passes. Water helps.','饥饿感常常一阵一阵，会过去的。喝点水会好些。'],
  early:['Last meal done. The first hours are the easy part.','最后一餐结束了，最初几个小时最轻松。'],mid:['Past halfway. Keep it light and keep sipping water.','已经过半了。保持轻松，记得喝水。'],
  late:['The last two hours. You have done the hard part.','最后两小时，最难的部分已经过去了。'],
  ram:['A quiet day. Nothing to count, nothing to prove.','平静的一天。无需计算，也无需证明什么。'],long:['A long fast: sip water, add a pinch of salt if you feel faint, and stop if you feel unwell.','长时间断食：多喝水，头晕时可加一点点盐，不舒服就停下。']};
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

function setSky(k){ if(ph.getAttribute('data-sky')!==k){ ph.setAttribute('data-sky',k); var m=document.querySelector('meta[name=theme-color]'); if(m&&curTab==='today') m.setAttribute('content',getComputedStyle(ph).getPropertyValue('--sky').trim()||'#0E1430'); } }

function updateToday(){
  nowMs=Date.now(); var now=nowMs; refreshSun(now);
  var hp=C.placeHour(pi,now), sk=C.skyAt(hp,sun), p=plan(), cur=S.cur, le=lastFast();
  moonV=C.moonAmt(hp,sun);
  mode=cur?'fast':(le&&now-le.end<eatH(le)*H?'eat':'idle');
  setSky(sk[1]);
  if(S.planId==='ramadan'&&!inRamadan()){ S.planId='16'; p=plan(); save(); }
  var ram=S.planId==='ramadan'&&!cur, goal=cur?cur.goalH:(mode==='eat'?le.goalH:p.fast), eatLen=le?eatH(le):0, eatEl=mode==='eat'?(now-le.end)/H:0;
  el=cur?(now-cur.start)/H:0;
  /* disc: new to full during the fast, then waning through the eating window */
  tgtP=mode==='fast'?C.discFill(el,goal):mode==='eat'?1-Math.min(eatEl/eatLen,1):0;
  var turn=C.nextTurn(hp,sun), moonNow=moonV>=.5;
  var skyName=S.lang==='zh'?sk[3]:sk[2];
  put($('sub'),'sub',skyName+' · '+(mode==='eat'?L('Eating window','进食窗口'):moonNow?L('Moon until ','月亮，直到 ')+clockH(sun.rise):L('Sun until ','太阳，直到 ')+clockH(sun.set)));
  put($('tTitle'),'tt',L('Today','今天'));
  put($('planChip'),'pc',(cur&&cur.planId==='ramadan')||ram?L('Ramadan','斋月'):C.planLabel(cur?C.planById(cur.planId,cur.goalH):p));
  var ramadan=cur&&cur.planId==='ramadan';
  if(mode==='idle'){
    put($('readK'),'k',ram?L('Dawn to sunset','黎明到日落'):L(p.fast+'-hour plan',p.fast+' 小时计划')); put($('readBig'),'b',L('Ready','准备好了'));
    put($('readTip'),'t',ram?L('The fast ends at sunset, ','斋戒在日落时结束，')+clockH(sun.set)+L('.','。'):L('Start now and you finish at ','现在开始，')+clockMs(now+p.fast*H)+L('.',' 结束。')); put($('actLbl'),'a',L('Start Fast','开始断食'));
  }else if(mode==='fast'){
    if(el<goal){ put($('readK'),'k',L('Time left','剩余时间')); put($('readBig'),'b',fmtH(goal-el),1); var tp=tipFor(el,goal,sk[1],moonV,ramadan?{id:'ramadan'}:C.planById(cur.planId,cur.goalH)); put($('readTip'),'t',tp[S.lang==='zh'?1:0]); }
    else{ put($('readK'),'k',ramadan?L('Sunset has come','日落了'):L('Goal reached','目标达成')); put($('readBig'),'b',fmtH(el),1); put($('readTip'),'t',ramadan?L('You can break the fast. May it be easy.','可以开斋了。愿一切顺利。'):L('Extra time isn’t scored, so end whenever you like.','超出的时间不计分，想什么时候结束都可以。')); }
    if(!holdOn) put($('actLbl'),'a',L('Hold to End Fast','按住结束断食'));
  }else{
    put($('readK'),'k',L('Eating window left','进食窗口还剩')); put($('readBig'),'b',fmtH(eatLen-eatEl),1);
    put($('readTip'),'t',L('Your next fast can start whenever you’re ready.','下一次断食可以在你准备好时开始。')); put($('actLbl'),'a',L('Start Fast','开始断食'));
  }
  /* timeline */
  var a0=mode==='eat'?le.end:mode==='fast'?cur.start:now, a1=mode==='eat'?le.end+eatLen*H:mode==='fast'?cur.start+goal*H:ram?placeMs(sun.set,now):now+p.fast*H;
  var n=Math.min(Math.round(mode==='eat'?eatLen:ram?13:goal),36)||1; buildTicks(n);
  var tt=mode==='fast'?Math.min(el/goal,1):mode==='eat'?Math.min(eatEl/eatLen,1):0;
  put($('endA'),'ea',mode==='fast'?clockMs(a0)+' ✎':mode==='idle'?L('Now','现在'):clockMs(a0));
  put($('endB'),'eb','<b>'+clockMs(a1)+'</b>',1);
  $('tDone').style.strokeDasharray=(mode==='idle'?0:lenAt(tt))+' 9999';
  var q=tPt(tt); $('marker').setAttribute('cx',q.x.toFixed(1)); $('marker').setAttribute('cy',q.y.toFixed(1)); $('marker').style.opacity=mode==='idle'?0:1;
  var done=mode==='idle'?0:Math.floor(tt*n+1e-6); tickEls.forEach(function(c,i){ c.style.fill=i<done?'var(--ink)':''; });
  /* streak card */
  var st=curStreak(), left=S.flex.bank;
  var label=st>0?L(st+(st===1?' day':' days')+' in a row',st+' 天连续'):L('No streak yet','还没有连续记录');
  put($('streakTx'),'st','<span>'+label+'</span><small>'+L(left+' cheat day'+(left===1?'':'s')+' left',left+' 个弹性日')+'</small>',1);
  var dots='', t0=today(); for(var i=6;i>=0;i--){ var k=C.addDays(t0,-i), s=C.dayStatus(k,streakFasts(),S.flex.used); dots+='<i class="dot '+(s==='done'?'done':s==='flex'?'flex':'')+(i===0?' today':'')+'"></i>'; }
  put($('streakDots'),'sd',dots,1);
  $('disc').setAttribute('aria-label',L('Fast progress: ','断食进度：')+Math.round(tgtP*100)+'%');
  /* hour tick + goal moment */
  if(mode==='fast'){
    var hr=Math.floor(el);
    if(lastHour>=0&&hr>lastHour&&el<goal&&!ramadan){ sTick(); buzz(8); }
    lastHour=hr;
    if(el>=goal&&!cur.reached){ cur.reached=true; save(); if(!firstTick||el-goal<.02){ sChime(); buzz([30,60,30]); boost=1; } }
  }else lastHour=-1;
  firstTick=false;
  fullS+=(((mode==='fast'&&el>=goal)?1:0)-fullS)*.12;
  fitDisc();
}

var holdOn=false;
function drawDisc(dt){
  shownP=shownP<0||reduce?tgtP:shownP+(tgtP-shownP)*Math.min(dt*5,1);
  if(Math.abs(shownP-tgtP)<.0004) shownP=tgtP;
  tiltX+=(tgtX-tiltX)*Math.min(dt*10,1); tiltY+=(tgtY-tiltY)*Math.min(dt*10,1);
  boost=Math.max(0,boost-dt/2.5);
  var wane=mode==='eat', night=/night|first|evening/.test(ph.getAttribute('data-sky'));
  var o3=orb&&orb.ok();
  if(o3){ flatShow(false); orb.draw({p:shownP,wane:wane,moon:moonV,tx:tiltX,ty:tiltY,ox:0,oy:0,scale:1,alpha:1,night:night,glow:(1-moonV)*shownP*(.35+.65*fullS)+boost*.3,halo:moonV*Math.max(fullS,boost)}); }
  else{ flatShow(true); var lit=$('lit'); lit.setAttribute('d',phasePath(shownP,84)); lit.setAttribute('transform',wane?'scale(-1 1)':''); $('litMoon').style.opacity=moonV; $('litSun').style.opacity=1-moonV; $('disc').style.transform=reduce?'':'rotateY('+tiltX.toFixed(1)+'deg) rotateX('+(-tiltY).toFixed(1)+'deg)'; }
}
function flatShow(v){ if(flat===v) return; flat=v; $('unlit').style.display=$('litMoon').parentNode.style.display=v?'':'none'; if(!v) $('disc').style.transform=''; }

/* touch the disc: it tilts toward your finger and springs back */
(function(){ var d=$('disc'), down=false;
  function pos(e){ var r=d.getBoundingClientRect(); tgtX=Math.max(-1,Math.min(1,((e.clientX-r.left)/r.width-.5)*2))*14; tgtY=Math.max(-1,Math.min(1,((e.clientY-r.top)/r.height-.5)*2))*-14; }
  d.addEventListener('pointerdown',function(e){ down=true; try{ d.setPointerCapture(e.pointerId); }catch(x){} pos(e); sBoop(); buzz(6); });
  d.addEventListener('pointermove',function(e){ if(down&&!reduce) pos(e); });
  function up(){ down=false; tgtX=tgtY=0; } d.addEventListener('pointerup',up); d.addEventListener('pointercancel',up);
})();

/* ---------- hold to end ---------- */
var act=$('act'), holdT0=0, holdRaf=0, HOLD_MS=1200, swallow=false;
function holdStep(){ if(!holdOn) return; var f=Math.min((performance.now()-holdT0)/HOLD_MS,1); act.style.setProperty('--hold',f); if(f>=1){ holdEnd(false); swallow=true; endFast(); return; } holdRaf=requestAnimationFrame(holdStep); }
function holdBegin(){ if(!S.cur||holdOn) return; holdOn=true; holdT0=performance.now(); act.classList.add('holding','pressed'); put($('actLbl'),'a',L('Keep holding…','继续按住…')); buzz(6); holdRaf=requestAnimationFrame(holdStep); }
function holdEnd(cancel){ if(!holdOn) return; holdOn=false; cancelAnimationFrame(holdRaf); act.classList.remove('holding','pressed'); act.style.setProperty('--hold',0); if(cancel) cache.a=null; }
act.addEventListener('pointerdown',function(e){ if(S.cur){ e.preventDefault(); try{ act.setPointerCapture(e.pointerId); }catch(x){} holdBegin(); } else act.classList.add('pressed'); });
['pointerup','pointercancel','pointerleave'].forEach(function(n){ act.addEventListener(n,function(){ holdEnd(true); act.classList.remove('pressed'); if(S.cur) updateToday(); if(swallow) setTimeout(function(){ swallow=false; },80); }); });
act.addEventListener('keydown',function(e){ if((e.key==='Enter'||e.key===' ')&&S.cur){ e.preventDefault(); if(!e.repeat) holdBegin(); } });
act.addEventListener('keyup',function(e){ if((e.key==='Enter'||e.key===' ')&&S.cur){ holdEnd(true); updateToday(); } if(swallow) setTimeout(function(){ swallow=false; },80); });
act.addEventListener('click',function(){ if(swallow){ swallow=false; return; } if(!S.cur) startFlow(); });

/* ---------- start and end ---------- */
function startFlow(planId){
  var id=planId||S.planId, p=C.planById(id,S.customH);
  if(id==='ramadan'){ return startRamadan(); }
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
  S.cur=Object.assign({start:start,goalH:p.fast,planId:p.id,reached:false},extra||{}); save(); closeSheet(); sStart(); buzz(12); lastHour=-1; shownP=-1; cache={}; updateToday(); scheduleGoal();
  toast(L('Fast started. Hold the button when you want to end it.','断食开始了。想结束时按住按钮。'));
}
function startRamadan(){
  var now=Date.now(), f=C.fajrHour(pi,now); if(f==null){ toast(L('Dawn can’t be worked out at this latitude yet.','这个纬度暂时算不出黎明时间。')); return; }
  var s=placeMs(f,now), e=placeMs(sun.set,now);
  if(now>=e){ toast(L('The fast has already ended for today. Come back before dawn.','今天的斋戒已经结束，黎明前再来。')); return; }
  beginFast({id:'ramadan',fast:(e-s)/H},Math.min(s,now));
}
function endFast(){
  var cur=S.cur; if(!cur) return; var now=Date.now(), hrs=(now-cur.start)/H;
  S.cur=null;
  if(hrs<1/6){ save(); cache={}; shownP=-1; updateToday(); toast(L('Under 10 minutes, so it wasn’t saved.','不到 10 分钟，没有保存。')); return; }
  var f={id:uid(),start:cur.start,end:now,goalH:cur.goalH,plan:cur.planId};
  S.fasts.push(f); save(); cancelGoal(); sSave(); buzz([20,40,20]); cache={}; updateToday(); checkUnlocks();
  var done=C.isDone(f), st=curStreak();
  openSheet('<span class="k">'+(done?L('Fast saved','断食已保存'):L('Ended early','提前结束'))+'</span><span class="big">'+fmtH(hrs)+'</span>'+
    '<div class="facts"><div><b>'+(f.plan==='ramadan'?'–':st)+'</b><span>'+L('day streak','天连续')+'</span></div><div><b>'+clockMs(now)+'</b><span>'+L('ended','结束时间')+'</span></div></div>'+
    '<p class="note">'+(done?L('You reached your goal. Eat gently and drink some water.','你达成了目标。慢慢吃，先喝点水。'):L('That still counts as a fast. Listening to your body is the point, and your streak is yours to keep going.','这也算一次断食。倾听身体才是重点，你的连续记录还可以继续。'))+'</p>'+
    '<div class="btns"><button class="btn dark" data-act="close">'+L('Start Eating Window','开始进食窗口')+'</button></div>');
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
  curTab=t; closeSheet(); ['today','days','me'].forEach(function(k){ $(k).classList.toggle('on',k===t); });
  document.querySelectorAll('#tabs button').forEach(function(b){ b.classList.toggle('sel',b.dataset.tab===t); b.setAttribute('aria-current',b.dataset.tab===t?'page':'false'); });
  ph.classList.toggle('sys',t!=='today');
  var m=document.querySelector('meta[name=theme-color]');
  if(t==='days') renderDays(); if(t==='me') renderMe(); if(t==='today') updateToday();
  if(m) m.setAttribute('content',t==='today'?getComputedStyle(ph).getPropertyValue('--sky').trim():getComputedStyle(document.documentElement).getPropertyValue('--bg').trim());
  $(t).scrollTop=0;
}
function tabLabels(){ $('tabT').textContent=L('Today','今天'); $('tabD').textContent=L('Days','日子'); $('tabM').textContent=L('Me','我的'); }

/* ---------- Days ---------- */
var calY, calM, selDay;
function initCal(){ var d=new Date(); calY=d.getFullYear(); calM=d.getMonth(); selDay=today(); }
function renderDays(){
  var fs=streakFasts(), all=S.fasts, t=today(), first=all.length?new Date(Math.min.apply(null,all.map(function(f){return f.start;}))):new Date();
  var canPrev=calY*12+calM>first.getFullYear()*12+first.getMonth()-0, canNext=calY*12+calM<new Date().getFullYear()*12+new Date().getMonth();
  var total=all.filter(C.isDone).length, st=curStreak(), best=bestStreak();
  var h='<h1 class="h-title">'+L('Days','日子')+'</h1>';
  h+='<div class="group"><div class="stats"><div><b>'+st+'</b><span>'+L('streak','当前连续')+'</span></div><div><b>'+best+'</b><span>'+L('best','最长连续')+'</span></div><div><b>'+total+'</b><span>'+L('fasts','次断食')+'</span></div></div></div>';
  var mname=new Intl.DateTimeFormat(loc(),{month:'long',year:'numeric'}).format(new Date(calY,calM,1));
  h+='<div class="group"><div class="cal"><div class="cal-h"><button data-act="calprev" aria-label="'+L('Previous month','上个月')+'"'+(canPrev?'':' disabled')+'><svg viewBox="0 0 10 18"><path d="M8.5 1.5 1.5 9l7 7.5"/></svg></button><b>'+mname+'</b><button data-act="calnext" aria-label="'+L('Next month','下个月')+'"'+(canNext?'':' disabled')+'><svg viewBox="0 0 10 18"><path d="M1.5 1.5 8.5 9l-7 7.5"/></svg></button></div><div class="cal-g">';
  var wd=S.lang==='zh'?['一','二','三','四','五','六','日']:['M','T','W','T','F','S','S']; wd.forEach(function(w){ h+='<span class="wd">'+w+'</span>'; });
  var lead=(new Date(calY,calM,1).getDay()+6)%7, dim=new Date(calY,calM+1,0).getDate(); for(var i=0;i<lead;i++) h+='<button class="out" tabindex="-1" aria-hidden="true"></button>';
  for(var d=1;d<=dim;d++){ var k=calY+'-'+('0'+(calM+1)).slice(-2)+'-'+('0'+d).slice(-2), s=C.dayStatus(k,all,S.flex.used), fut=k>t;
    h+='<button class="'+s+(k===t?' today':'')+(k===selDay?' sel':'')+(fut?' fut':'')+'" data-act="day" data-k="'+k+'" aria-label="'+dateLbl(C.keyToDate(k).getTime())+(s==='done'?', '+L('fast done','已完成'):s==='flex'?', '+L('cheat day','弹性日'):s==='early'?', '+L('ended early','提前结束'):'')+'"><span class="d">'+d+'</span></button>'; }
  h+='</div></div><div class="legend"><span><i style="background:var(--tint)"></i>'+L('Goal reached','达成目标')+'</span><span><i style="border-color:var(--orange)"></i>'+L('Ended early','提前结束')+'</span><span><i style="border:1.5px dashed var(--label-2)"></i>'+L('Cheat day','弹性日')+'</span></div></div>';
  /* the chosen day */
  var list=C.fastDays(all)[selDay]||[], fl=S.flex.used.indexOf(selDay)>=0, blk=C.flexBlock(selDay,{fasts:all,flex:S.flex});
  h+='<div class="gh">'+dateLbl(C.keyToDate(selDay).getTime(),{weekday:'long',month:'long',day:'numeric'})+'</div><div class="group">';
  if(!list.length&&!fl) h+='<div class="empty">'+(selDay>t?L('Nothing here yet.','这天还没有记录。'):L('No fast logged for this day.','这天没有记录断食。'))+'</div>';
  list.sort(function(a,b){return a.end-b.end;}).forEach(function(f){ h+='<button class="row fast-row" data-act="edit" data-id="'+f.id+'"><span class="stack"><b>'+durTxt(C.hours(f))+'</b><small>'+clockMs(f.start)+' → '+clockMs(f.end)+' · '+(C.isDone(f)?L('goal reached','达成目标'):L('ended early','提前结束'))+'</small></span>'+CHEV.replace('class="chev"','class="chev" style="margin-left:auto"')+'</button>'; });
  if(fl) h+='<div class="row"><span class="stack"><b>'+L('Cheat day','弹性日')+'</b><small>'+L('Your streak holds, and doesn’t grow.','连续记录保持不变，但不增加。')+'</small></span></div>';
  if(selDay<=t) h+='<button class="row" data-act="add" data-k="'+selDay+'" style="color:var(--blue)">'+L('Add a fast for this day','为这天补记一次断食')+'</button>';
  if(!fl&&selDay<=t&&!blk) h+='<button class="row" data-act="usecheat" data-k="'+selDay+'" style="color:var(--blue)">'+L('Use a cheat day for this day','这天使用弹性日')+'</button>';
  h+='</div>';
  $('days').innerHTML=h;
}
function toInput(ms){ var d=new Date(ms-new Date(ms).getTimezoneOffset()*60000); return d.toISOString().slice(0,16); }
function fastSheet(f,addKey){
  var isNew=!f, now=Date.now(), end, start;
  if(isNew){ var base=C.keyToDate(addKey); end=addKey===today()?now:base.getTime()+12*H; if(end>now) end=now; start=end-plan().fast*H; }
  else{ start=f.start; end=f.end; }
  var goal=isNew?plan().fast:f.goalH;
  openSheet('<h3>'+(isNew?L('Add a fast','补记断食'):L('Edit fast','编辑断食'))+'</h3><p class="lede">'+L('Fix a start or end time, or add one you forgot to log.','修改开始或结束时间，或补上忘记记录的一次。')+'</p>'+
   '<div class="group"><div class="field"><label for="fsS">'+L('Started','开始')+'</label><input id="fsS" type="datetime-local" value="'+toInput(start)+'" max="'+toInput(now)+'"></div><div class="field"><label for="fsE">'+L('Ended','结束')+'</label><input id="fsE" type="datetime-local" value="'+toInput(end)+'" max="'+toInput(now)+'"></div><div class="field"><label for="fsG">'+L('Goal (hours)','目标（小时）')+'</label><input id="fsG" type="number" min="1" max="36" step="1" inputmode="numeric" value="'+Math.round(goal)+'"></div></div>'+
   '<div class="btns"><button class="btn" data-act="fssave" data-id="'+(isNew?'':f.id)+'">'+L('Save','保存')+'</button>'+(isNew?'':'<button class="btn red" data-act="fsdel" data-id="'+f.id+'">'+L('Delete this fast','删除这次断食')+'</button>')+'<button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>');
}
function fastSave(id){
  var s=new Date($('fsS').value).getTime(), e=new Date($('fsE').value).getTime(), g=Math.round(+$('fsG').value), now=Date.now();
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

/* ---------- cheat days (弹性日) ---------- */
function flexTick(){ C.flexRefill(S.flex,S.startedAt||Date.now()); }
function cheatSheet(){
  flexTick(); var k=today(), used=S.flex.used.indexOf(k)>=0, blk=C.flexBlock(k,{fasts:S.fasts,flex:S.flex}), b=S.flex.bank;
  var moons=''; for(var i=0;i<2;i++) moons+='<svg width="30" height="30" viewBox="-15 -15 30 30" style="margin-right:6px" aria-hidden="true"><circle r="12" style="fill:'+(i<b?'var(--moon)':'none')+';stroke:'+(i<b?'var(--moon-edge)':'var(--label-2)')+'" stroke-width="1.5"/></svg>';
  var why={used:'',fasted:L('You fasted today, so you don’t need one.','今天你已经断食了，不需要使用。'),bank:L('None left. A new one arrives every Monday.','已经用完。每周一会补一个。'),week:L('Two in a week is the limit, so you still fast at least five days.','一周最多两个，这样每周至少断食五天。'),window:''}[blk]||'';
  openSheet('<h3>'+L('Cheat days','弹性日')+'</h3><p class="lede">'+L('A day off that keeps your streak going. Never a failure.','休息一天，连续记录不会断。这不是失败。')+'</p>'+
    '<div class="group"><div class="row" style="min-height:60px"><span style="display:flex">'+moons+'</span><span class="v">'+L(b+' left',b+' 个可用')+'</span></div></div>'+
    '<div class="group"><div class="row"><span class="stack"><small>'+L('You get one new cheat day every Monday and can hold two.','每周一补充一个，最多存两个。')+'</small></span></div><div class="row"><span class="stack"><small>'+L('At most two in any seven days, so you still fast at least five.','任意七天内最多使用两个。')+'</small></span></div><div class="row"><span class="stack"><small>'+L('Use one for today, or for yesterday until noon.','可用于今天，或在中午前补用于昨天。')+'</small></span></div><div class="row"><span class="stack"><small>'+L('Your streak holds, but doesn’t grow. Free, always.','连续记录保持，但不增加。永远免费。')+'</small></span></div></div>'+
    (why?'<p class="note">'+why+'</p>':'')+
    '<div class="btns">'+(used?'<button class="btn sec" data-act="undocheat">'+L('Take today’s cheat day back','收回今天的弹性日')+'</button>':'<button class="btn" data-act="usecheat" data-k="'+k+'"'+(blk?' disabled':'')+'>'+L('Use a cheat day for today','今天使用弹性日')+'</button>')+'<button class="btn sec" data-act="close">'+L('Close','关闭')+'</button></div>');
}
function useCheat(k){ flexTick(); var b=C.flexBlock(k,{fasts:S.fasts,flex:S.flex}); if(b) return toast(L('A cheat day can’t be used for that day.','这天不能使用弹性日。')); S.flex.used.push(k); S.flex.bank--; save(); closeSheet(); cache={}; updateToday(); if(curTab==='days') renderDays(); toast(L('Cheat day used. Your streak holds.','已使用弹性日，连续记录保持。')); }

/* ---------- plan sheet ---------- */
var moreOpen=false;
function planSheet(){
  var cur=S.cur, h='<h3>'+L('Your plan','你的计划')+'</h3><p class="lede">'+(cur?L('Switching now keeps your start time. The disc refills to the new goal.','现在切换会保留开始时间，圆盘按新目标重新计算。'):L('This is the plan your next fast uses.','下一次断食会用这个计划。'))+'</p>';
  var selId=cur?cur.planId:S.planId;
  if(inRamadan()) h+='<div class="group"><button class="plan'+(selId==='ramadan'?' sel':'')+'" data-act="pickplan" data-id="ramadan"><span class="pn"><b>'+L('Ramadan','斋月')+'</b><small>'+L('Dawn to sunset, this month','黎明到日落，本月')+'</small></span><span class="pill tint">'+L('In season','当季')+'</span>'+CHECK+'</button></div>';
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
  }else if(p.custom) sub=L('Choose 12 to 23 hours','12 到 23 小时之间');
  else sub=L(p.eat+(p.eat===1?' hour to eat':' hours to eat'),p.eat+' 小时进食');
  var extra=p.custom&&!dis?'<span class="pr" style="min-width:0"></span>':'';
  var row='<button class="plan'+(selId===p.id?' sel':'')+'" data-act="pickplan" data-id="'+p.id+'"'+(dis?' disabled':'')+'><span class="pn"><b>'+esc(pName(p))+'</b><small>'+sub+'</small>'+bar+'</span>'+pill+'<span class="pr">'+lab+'</span>'+CHECK+'</button>';
  if(p.custom&&selId==='custom') row+='<div class="field"><label for="cH">'+L('Fasting hours','断食小时数')+'</label><input id="cH" type="number" min="12" max="23" step="1" inputmode="numeric" value="'+S.customH+'" data-chg="custom"></div>';
  return row;
}
function zhProgress(l){ return l.replace(/(\d+) of (\d+) fasts of 16 h or more/,'16 小时以上 $1/$2 次').replace(/(\d+) of (\d+) of 18 h or more/,'18 小时以上 $1/$2 次').replace(/week (\d+) of (\d+)/,'第 $1/$2 周').replace(/(\d+) of (\d+) fast of 24 h/,'24 小时断食 $1/$2 次').replace('First finish a 24 h fast, ','先完成一次 24 小时断食，').replace('24 h done, ','24 小时已完成，'); }
function pickPlan(id){
  var p=C.planById(id,S.customH);
  if(id==='ramadan'){ S.planId='ramadan'; if(S.cur){ toast(L('Ramadan runs dawn to sunset. End this fast first.','斋月从黎明到日落。先结束当前断食。')); return; } save(); closeSheet(); updateToday(); return startRamadan(); }
  if(p.long){ var st=longSt(p.fast); if(st.st!=='ok') return; if(S.cur){ return longSafety(p); } S.planId=id; save(); cache={}; updateToday(); return planSheet(); }
  S.planId=id; if(S.cur){ S.cur.planId=id; S.cur.goalH=p.fast; S.cur.reached=(Date.now()-S.cur.start)/H>=p.fast; scheduleGoal(); }
  save(); cache={}; ticksKey=''; updateToday(); planSheet();
}

/* ---------- where you are ---------- */
function placeSheet(){
  var h='<h3>'+L('Where you are','你的位置')+'</h3><p class="lede">'+L('Used only to work out your sunrise and sunset. It never leaves your phone.','只用来计算你所在地的日出日落，不会离开你的手机。')+'</p>';
  h+='<div class="group"><button class="plan'+(S.place.key==='here'?' sel':'')+'" data-act="geo"><span class="pn"><b>'+L('Use my location','使用我的位置')+'</b><small>'+L('Most accurate','最准确')+'</small></span>'+CHECK+'</button></div><div class="group">';
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
function applyRemote(m){ quiet=true; Object.keys(m).forEach(function(k){ S[k]=m[k]; }); quiet=false; saveNow(); }
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
   '<div class="signin"><button class="btn sec" data-act="emailsheet">'+L('Continue with email','用邮箱继续')+'</button>'+
   '<button class="btn sec" data-act="soon" data-k="'+(zh?'wechat':'apple')+'">'+(zh?'微信登录':'Continue with Apple')+'</button><button class="btn sec" data-act="soon" data-k="'+(zh?'phone':'google')+'">'+(zh?'手机号登录':'Continue with Google')+'</button></div></div>'+
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

/* ---------- Me ---------- */
function renderMe(){
  var zh=S.lang==='zh', h='<h1 class="h-title">'+L('Me','我的')+'</h1>';
  h+=accountHtml();
  var p=plan(), ls=S.cur?null:null;
  h+='<div class="gh">'+L('Fasting','断食')+'</div><div class="group">'+
   '<button class="row" data-act="plan"><span>'+L('Plan','计划')+'</span><span class="v">'+(S.cur&&S.cur.planId==='ramadan'?L('Ramadan','斋月'):C.planLabel(p))+'</span>'+CHEV+'</button>'+
   '<button class="row" data-act="place"><span>'+L('Where you are','你的位置')+'</span><span class="v">'+esc(placeName())+'</span>'+CHEV+'</button>'+
   '<button class="row" data-act="cheat"><span>'+L('Cheat days','弹性日')+'</span><span class="v">'+L(S.flex.bank+' left',S.flex.bank+' 个可用')+'</span>'+CHEV+'</button></div>';
  h+='<div class="gh">'+L('App','应用')+'</div><div class="group">'+
   '<div class="row"><span>'+L('Language','语言')+'</span><div class="seg" role="group" aria-label="Language"><button data-act="lang" data-v="en" aria-pressed="'+(S.lang==='en')+'">English</button><button data-act="lang" data-v="zh" aria-pressed="'+(S.lang==='zh')+'">中文</button></div></div>'+
   '<div class="row"><span>'+L('Appearance','外观')+'</span><div class="seg" role="group" aria-label="Appearance"><button data-act="theme" data-v="auto" aria-pressed="'+(S.theme==='auto')+'">'+L('Auto','自动')+'</button><button data-act="theme" data-v="light" aria-pressed="'+(S.theme==='light')+'">'+L('Light','浅色')+'</button><button data-act="theme" data-v="dark" aria-pressed="'+(S.theme==='dark')+'">'+L('Dark','深色')+'</button></div></div>'+
   sw('sound',L('Sound','声音'),S.prefs.sound)+(navigator.vibrate?sw('haptics',L('Vibration','振动'),S.prefs.haptics):'')+sw('d3',L('3D moon and sun','3D 月亮和太阳'),S.prefs.d3&&!!orb,!orb)+
   sw('notify',L('Reminders','提醒'),S.prefs.notify&&('Notification' in window)&&Notification.permission==='granted',!('Notification' in window))+'</div>';
  h+='<div class="gf">'+L('Reminders tell you when your goal is reached. A web app can only do this while it is open or recently open; the phone app will do it properly.','提醒会在达成目标时通知你。网页应用只有在打开或刚刚打开时才能做到，手机应用会做得更好。')+'</div>';
  h+='<div class="gh">'+L('Care','关怀')+'</div><div class="group"><button class="row" data-act="unwell"><span class="stack"><span>'+L('I feel unwell','我感觉不舒服')+'</span><small>'+L('Pauses long fasts for two weeks.','暂停长时间断食两周。')+'</small></span></button>'+
   '<button class="row" data-act="redo"><span>'+L('Redo setup','重新设置')+'</span>'+CHEV+'</button></div>';
  h+='<div class="gh">'+L('Your data','你的数据')+'</div><div class="group"><button class="row" data-act="export"><span>'+L('Export my fasts','导出我的记录')+'</span>'+CHEV+'</button><button class="row red" data-act="erase"><span>'+L('Erase everything','清除所有数据')+'</span></button></div>';
  if(C.ramadanDay()===0) h+='<div class="group">'+(sw('ram',L('Preview Ramadan mode','预览斋月模式'),S.ramadanPreview))+'</div><div class="gf">'+L('Ramadan appears in your plans only during Ramadan. This switch lets you look at it now.','斋月只在当季出现在计划里。这个开关让你现在就能看看。')+'</div>';
  h+='<p class="gf" style="text-align:center">'+L('Lightly · web app · saved on this device','轻伴 · 网页版 · 保存在本机')+(storageOk?'':'<br>'+L('Storage is blocked, so nothing will be kept after you close the app.','存储被阻止，关闭应用后记录不会保留。'))+'</p>';
  $('me').innerHTML=h;
}
function sw(k,label,on,dis){ return '<div class="row"><span>'+label+'</span><button class="sw" role="switch" aria-checked="'+!!on+'" aria-label="'+esc(label)+'" data-act="sw" data-k="'+k+'"'+(dis?' disabled':'')+'></button></div>'; }
function applyTheme(){ var r=document.documentElement; if(S.theme==='auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme',S.theme); }
function applyLang(){ document.documentElement.lang=S.lang==='zh'?'zh-Hans':'en'; tabLabels(); document.title=S.lang==='zh'?'轻伴':'Lightly'; }

/* ---------- onboarding ---------- */
var ob={step:0,fasted:null,safe:[],plan:null};
function obHtml(i){
  var back=i>0?'<button class="ob-back" data-act="obback"><svg viewBox="0 0 10 18"><path d="M8.5 1.5 1.5 9l7 7.5"/></svg>'+L('Back','返回')+'</button>':'<span></span>';
  var dots='<span class="ob-dots" aria-hidden="true">'+[0,1,2,3,4].map(function(j){return '<i'+(j===i?' class="on"':'')+'></i>';}).join('')+'</span>';
  var top='<div class="ob-top"><span class="ob-l">'+back+'</span>'+dots+'<span></span></div>', body='', cta='';
  function opt(v,label,sub,on){ return '<button class="plan'+(on?' sel':'')+'" data-act="obopt" data-v="'+v+'"><span class="pn"><b>'+label+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</span>'+CHECK+'</button>'; }
  if(i===0){
    var tile='<svg id="obHero" viewBox="-80 -80 160 160" role="img" aria-label="'+L('The moon. Drag it to change the phase.','月亮。拖动可以改变月相。')+'"><defs><radialGradient id="obM" cx=".38" cy=".34" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#EEE8D9"/><stop offset="1" stop-color="#CFC7B2"/></radialGradient></defs>'+
      '<rect x="-80" y="-80" width="160" height="160" rx="36" style="fill:var(--night)"/>'+
      '<g fill="#fff" class="tw"><circle cx="-52" cy="-46" r="1.4" opacity=".7"/><circle cx="-30" cy="-60" r="1" opacity=".5"/><circle cx="46" cy="-52" r="1.5" opacity=".7"/><circle cx="58" cy="-22" r="1" opacity=".5"/><circle cx="-58" cy="30" r="1" opacity=".5"/><circle cx="50" cy="52" r="1.2" opacity=".6"/></g>'+
      '<circle id="obHalo" r="52" fill="none" stroke="#F4EFE2" stroke-width="1.5" opacity="0"/><circle r="40" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.28)" stroke-width="1.2"/><path id="obLit" d="" fill="url(#obM)"/></svg>';
    body='<div class="grow"></div><div class="ob-hero">'+tile+'</div><h1 style="text-align:center">'+L('Lightly','轻伴')+'</h1><p class="lede" style="text-align:center">'+L('A fast that follows the sky. A moon at night and a sun by day, set by your real sunrise and sunset.','跟着天空走的断食。夜里是月亮，白天是太阳，由你所在地的真实日出日落决定。')+'</p><div class="seg" style="margin:8px auto 0;width:min(260px,100%)"><button data-act="lang" data-v="en" aria-pressed="'+(S.lang==='en')+'">English</button><button data-act="lang" data-v="zh" aria-pressed="'+(S.lang==='zh')+'">中文</button></div><div class="grow"></div>';
    cta='<button class="btn" data-act="obnext">'+L('Get started','开始')+'</button>';
  }else if(i===1){
    body='<h1>'+L('Have you fasted before?','你以前断食过吗？')+'</h1><p class="lede">'+L('This only sets your starting plan.','这只会决定你的起始计划。')+'</p><div class="group">'+opt('first',L('This is my first time','这是第一次'),L('We’ll start gently.','我们会从温和的开始。'),ob.fasted==='first')+opt('before',L('I’ve fasted before','我以前断食过'),L('You can start with 16:8.','可以直接从 16:8 开始。'),ob.fasted==='before')+'</div><div class="grow"></div>';
    cta='<button class="btn" data-act="obnext"'+(ob.fasted?'':' disabled')+'>'+L('Continue','继续')+'</button>';
  }else if(i===2){
    function ck(v,label){ var on=ob.safe.indexOf(v)>=0; return '<button class="check" role="checkbox" aria-checked="'+on+'" data-act="obsafe" data-v="'+v+'"><span class="bx"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><span>'+label+'</span></button>'; }
    body='<h1>'+L('Is any of this true for you?','下面有符合你的情况吗？')+'</h1><p class="lede">'+L('Fasting isn’t right for everyone. Pick all that apply.','断食并不适合所有人。可多选。')+'</p><div class="group">'+ck('preg',L('Pregnant or breastfeeding','怀孕或哺乳期'))+ck('diab',L('I take medication for diabetes','我在服用糖尿病药物'))+ck('ed',L('I have had an eating disorder','我有过进食障碍'))+ck('none',L('None of these','都不是'))+'</div>'+
      (ob.safe.length&&ob.safe.indexOf('none')<0?'<p class="gf" style="padding:0 4px;color:var(--label)">'+L('Thank you for telling us. We’ll suggest the gentlest plan and never offer long fasts. Please talk to your doctor before fasting.','谢谢你告诉我们。我们会推荐最温和的计划，也不会提供长时间断食。断食前请先咨询医生。')+'</p>':'')+'<div class="grow"></div>';
    cta='<button class="btn" data-act="obnext"'+(ob.safe.length?'':' disabled')+'>'+L('Continue','继续')+'</button>';
  }else if(i===3){
    var risky=ob.safe.length&&ob.safe.indexOf('none')<0, sug=risky||ob.fasted==='first'?'13':'16'; if(!ob.plan) ob.plan=sug;
    body='<h1>'+L('Pick your plan','选择你的计划')+'</h1><p class="lede">'+L('You can change it any time.','随时可以更改。')+'</p><div class="group">'+C.PLANS.filter(function(p){return p.top;}).map(function(p){ return '<button class="plan'+(ob.plan===p.id?' sel':'')+'" data-act="obplan" data-id="'+p.id+'"><span class="pn"><b>'+pName(p)+'</b><small>'+L(p.eat+' hours to eat',p.eat+' 小时进食')+'</small></span>'+(p.id===sug?'<span class="pill tint">'+L('Suggested','推荐')+'</span>':'')+'<span class="pr">'+C.planLabel(p)+'</span>'+CHECK+'</button>'; }).join('')+'</div>'+
      '<p class="gf" style="padding:0 4px">'+(risky?L('Longer fasts stay off for you.','长时间断食对你保持关闭。'):L('A 24-hour fast unlocks later, as you build up.','24 小时断食会在你逐步适应后解锁。'))+'</p><div class="grow"></div>';
    cta='<button class="btn" data-act="obnext">'+L('Continue','继续')+'</button>';
  }else{
    body='<h1>'+L('You’re set','准备好了')+'</h1><p class="lede">'+L('Lightly needs to know where you are to find your sunrise and sunset. Your first fast can start tonight.','Lightly 需要知道你在哪里，才能算出日出日落。今晚就可以开始第一次断食。')+'</p><div class="group"><button class="row" data-act="obgeo"><span class="stack"><span>'+L('Use my location','使用我的位置')+'</span><small>'+L('Stays on your phone','只留在你的手机上')+'</small></span><span class="v">'+(S.place.key==='here'?'✓':'')+'</span></button><div class="row"><span>'+L('Or pick a city','或选择城市')+'</span><select id="obCity" data-chg="obcity" aria-label="'+L('City','城市')+'">'+Object.keys(C.CITIES).map(function(k){ return '<option value="'+k+'"'+(S.place.key===k?' selected':'')+'>'+C.CITIES[k][S.lang==='zh'?'zh':'en']+'</option>'; }).join('')+'</select></div></div><div class="group">'+sw('notify',L('Remind me when I reach my goal','达成目标时提醒我'),S.prefs.notify&&('Notification' in window)&&Notification.permission==='granted',!('Notification' in window))+'</div><div class="grow"></div>';
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
  var f=n.querySelector('h1'); if(f){ f.setAttribute('tabindex','-1'); }
  heroStart();
}
function obRefresh(){ var box=$('ob'), c=box.querySelector('.ob-step.on')||box.lastChild; if(!c) return; var tmp=document.createElement('div'); tmp.innerHTML=obHtml(ob.step); var n=tmp.firstChild; n.classList.add('on'); n.style.transition='none'; box.replaceChild(n,c); heroStart(true); }
function obStart(){ ph.classList.add('onb'); ob={step:0,fasted:null,safe:[],plan:null}; $('ob').innerHTML=''; obRender(); }
function obFinish(){
  var risky=ob.safe.length&&ob.safe.indexOf('none')<0;
  S.profile={fastedBefore:ob.fasted==='before',safety:!!risky}; S.planId=ob.plan||'16'; S.onboarded=true; S.startedAt=S.startedAt||Date.now(); S.flex.mon=S.flex.mon||C.mondayOf(S.startedAt);
  save(); ph.classList.remove('onb'); $('ob').hidden=true; $('ob').innerHTML=''; applyLang(); cache={}; ticksKey=''; shownP=-1; showTab('today');
}

/* ---------- the welcome moon: it waxes in, breathes, and follows your finger. Drag sideways to change the phase; it springs home. ---------- */
var hero={p:0,t:.3,drag:false,x0:0,pull:0,loop:false,full:false,last:0,pulse:0};
function hq(id){ var st=$('ob').lastElementChild; return st&&st.querySelector('#'+id); }
function heroStart(keep){
  var sv=hq('obHero'); if(!sv) return;
  if(!sv.dataset.on){ sv.dataset.on='1'; sv.style.touchAction='none'; sv.style.cursor='grab';
    sv.addEventListener('pointerdown',function(e){ hero.drag=true; hero.x0=e.clientX; try{ sv.setPointerCapture(e.pointerId); }catch(x){} sv.style.cursor='grabbing'; sBoop(); buzz(6); });
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
  var full=hero.p>.93; if(full&&!hero.full){ hero.pulse=1; buzz([14,40,14]); sChime(); } hero.full=full; hero.pulse=Math.max(0,hero.pulse-dt/1.4);
  var h=hq('obHalo'); h.setAttribute('r',(46+14*(1-hero.pulse)).toFixed(1)); h.setAttribute('opacity',(hero.pulse*.8).toFixed(2));
  requestAnimationFrame(heroFrame);
}
/* ---------- click routing ---------- */
var A={
  close:closeSheet,
  lsck:function(b){ b.setAttribute('aria-checked',b.getAttribute('aria-checked')!=='true'); var all=[].slice.call(document.querySelectorAll('#lsChecks .check')); $('lsGo').disabled=!all.every(function(x){return x.getAttribute('aria-checked')==='true';}); },
  lsgo:function(b){ var p=C.planById(b.dataset.p); if(S.cur){ S.planId=p.id; S.cur.planId=p.id; S.cur.goalH=p.fast; S.cur.reached=false; save(); closeSheet(); cache={}; ticksKey=''; updateToday(); scheduleGoal(); } else { S.planId=p.id; save(); beginFast(p,Date.now()); } },
  day:function(b){ selDay=b.dataset.k; renderDays(); },
  calprev:function(){ calM--; if(calM<0){calM=11;calY--;} renderDays(); },
  calnext:function(){ calM++; if(calM>11){calM=0;calY++;} renderDays(); },
  edit:function(b){ var f=S.fasts.filter(function(x){return x.id===b.dataset.id;})[0]; if(f) fastSheet(f); },
  add:function(b){ fastSheet(null,b.dataset.k); },
  fssave:function(b){ fastSave(b.dataset.id); },
  fsdel:function(b){ S.fasts=S.fasts.filter(function(x){return x.id!==b.dataset.id;}); (S.del=S.del||[]).push(b.dataset.id); save(); closeSheet(); renderDays(); cache={}; toast(L('Deleted.','已删除。')); },
  usecheat:function(b){ useCheat(b.dataset.k||today()); },
  undocheat:function(){ var k=today(), i=S.flex.used.indexOf(k); if(i>=0){ S.flex.used.splice(i,1); S.flex.bank=Math.min(2,S.flex.bank+1); save(); closeSheet(); cache={}; updateToday(); if(curTab==='me') renderMe(); } },
  more:function(){ moreOpen=!moreOpen; planSheet(); },
  pickplan:function(b){ pickPlan(b.dataset.id); },
  geo:function(){ geo(function(){ placeSheet(); }); },
  city:function(b){ setPlace({key:b.dataset.k}); placeSheet(); },
  plan:planSheet, place:placeSheet, cheat:cheatSheet,
  emailsheet:function(){ emailSheet('email'); },
  emback:function(b){ emailSheet('email',b.dataset.e); },
  soon:function(b){ toast(({apple:L('Apple sign-in is coming. Email works now.','Apple 登录即将推出，现在可用邮箱。'),google:L('Google sign-in is coming. Email works now.','Google 登录即将推出，现在可用邮箱。'),wechat:'微信登录会随中国大陆版本推出，现在可用邮箱。',phone:'手机号登录会随中国大陆版本推出，现在可用邮箱。'})[b.dataset.k]); },
  emsend:function(b){ var e=($('emIn').value||'').trim(); if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return emailSheet('email',e,L('That doesn’t look like an email address.','这个邮箱地址看起来不对。')); b.disabled=true; b.textContent=L('Sending…','发送中…');
    emCool=Date.now()+60000; CL.sendCode(e,S).then(function(){ emailSheet('sent',e); }).catch(function(x){ emCool=0; emailSheet('email',e,emailErr(x)); }); },
  emresend:function(b){ var e=b.dataset.e; if(Date.now()<emCool) return; emCool=Date.now()+60000; CL.sendCode(e,S).then(function(){ emailSheet('sent',e); toast(L('Sent again.','已重新发送。')); }).catch(function(x){ emCool=0; emailSheet('sent',e,emailErr(x)); }); },
  emverify:function(b){ var e=b.dataset.e, c=($('emCode').value||'').trim(); if(c.length<6) return emailSheet('sent',e,L('Enter the 6-digit code.','请输入 6 位验证码。')); b.disabled=true; b.textContent=L('Checking…','验证中…');
    CL.verify(e,c).then(function(){ closeSheet(); toast(L('Signed in.','已登录。')); renderMe(); syncNow(true); }).catch(function(x){ emailSheet('sent',e,L('That code didn’t work. ','验证码不对：')+x.message); }); },
  signout:function(){ openSheet('<h3>'+L('Sign out?','退出登录？')+'</h3><p class="lede">'+L('Your fasts stay on this phone and in your account. You can sign back in any time.','记录会保留在这台手机和你的账号里，随时可以重新登录。')+'</p><div class="btns"><button class="btn dark" data-act="signoutok">'+L('Sign out','退出登录')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>'); },
  signoutok:function(){ CL.signOut(); sync.at=0; sync.err=''; closeSheet(); renderMe(); },
  syncnow:function(){ syncNow(false); },
  lang:function(b){ S.lang=b.dataset.v; save(); applyLang(); cache={}; if(!$('ob').hidden){ obRefresh(); } else renderMe(); updateToday(); },
  theme:function(b){ S.theme=b.dataset.v; save(); applyTheme(); renderMe(); },
  sw:function(b){ var k=b.dataset.k, on=b.getAttribute('aria-checked')!=='true';
    if(k==='notify') return setNotify(on,function(){ if(!$('ob').hidden) obRefresh(); else renderMe(); });
    if(k==='ram'){ S.ramadanPreview=on; save(); return renderMe(); }
    S.prefs[k]=on; save(); if(k==='d3'&&orb) orb.set(on); b.setAttribute('aria-checked',on); },
  unwell:function(){ openSheet('<h3>'+L('I feel unwell','我感觉不舒服')+'</h3><p class="lede">'+L('Thank you for listening to your body. Long fasts pause for two weeks. If you’re fasting now, it’s fine to stop and eat. If this feels serious, please see a doctor.','谢谢你倾听身体的声音。长时间断食会暂停两周。如果你正在断食，停下来吃点东西没有问题。如果情况严重，请就医。')+'</p><div class="btns"><button class="btn" data-act="unwellok">'+L('Pause long fasts','暂停长时间断食')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>'); },
  unwellok:function(){ S.unwell=Date.now(); if(S.planId==='24'||S.planId==='36') S.planId=S.profile.safety||!S.profile.fastedBefore?'13':'16'; save(); closeSheet(); toast(L('Take care. Long fasts are paused for two weeks.','多保重。长时间断食已暂停两周。')); },
  redo:function(){ closeSheet(); obStart(); },
  export:function(){ try{ var blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='lightly-fasts-'+today()+'.json'; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); },500); }catch(e){ toast(L('Couldn’t export.','导出失败。')); } },
  erase:function(){ openSheet('<h3>'+L('Erase everything?','清除所有数据？')+'</h3><p class="lede">'+L('This deletes your fasts, streak and settings from this phone. It can’t be undone.','这会删除这台手机上的断食记录、连续天数和设置，无法撤销。')+'</p><div class="btns"><button class="btn red" data-act="eraseok">'+L('Erase everything','清除所有数据')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>'); },
  eraseok:function(){ try{ localStorage.removeItem(KEY); }catch(e){} S=fresh(); storageOk=true; location.reload(); },
  obnext:function(){ if(ob.step<4){ ob.step++; obRender(); } },
  obback:function(){ if(ob.step>0){ ob.step--; obRender(-1); } },
  obopt:function(b){ ob.fasted=b.dataset.v; obRefresh(); },
  obsafe:function(b){ var v=b.dataset.v, i=ob.safe.indexOf(v); if(v==='none') ob.safe=i>=0?[]:['none']; else{ ob.safe=ob.safe.filter(function(x){return x!=='none';}); if(i>=0) ob.safe.splice(ob.safe.indexOf(v),1); else ob.safe.push(v); } obRefresh(); },
  obplan:function(b){ ob.plan=b.dataset.id; obRefresh(); },
  obgeo:function(){ geo(function(){ obRefresh(); }); },
  obdone:obFinish
};
document.addEventListener('click',function(e){ var b=e.target.closest('[data-act]'); if(!b||!ph.contains(b)) return; var f=A[b.dataset.act]; if(f){ if(b.tagName==='BUTTON'&&b.disabled) return; f(b); } });
document.addEventListener('change',function(e){ var t=e.target; if(!t.dataset||!t.dataset.chg) return;
  if(t.dataset.chg==='custom'){ var v=Math.min(23,Math.max(12,Math.round(+t.value)||16)); S.customH=v; S.planId='custom'; if(S.cur){ S.cur.planId='custom'; S.cur.goalH=v; } save(); cache={}; ticksKey=''; updateToday(); planSheet(); }
  if(t.dataset.chg==='obcity'){ setPlace({key:t.value}); } });
$('tabs').addEventListener('click',function(e){ var b=e.target.closest('button[data-tab]'); if(b) showTab(b.dataset.tab); });
$('streakBtn').addEventListener('click',cheatSheet);
$('planBtn').addEventListener('click',planSheet);
$('endA').addEventListener('click',function(){ if(!S.cur) return; startEdit(); });
function startEdit(){
  var cur=S.cur, now=Date.now();
  openSheet('<h3>'+L('When did you start?','你是什么时候开始的？')+'</h3><p class="lede">'+L('Forgot to press start? Set the real time.','忘了按开始？在这里改成真实时间。')+'</p><div class="group"><div class="field"><label for="stS">'+L('Started','开始')+'</label><input id="stS" type="datetime-local" value="'+toInput(cur.start)+'" max="'+toInput(now)+'"></div></div><div class="btns"><button class="btn" data-act="stsave">'+L('Save','保存')+'</button><button class="btn sec" data-act="close">'+L('Cancel','取消')+'</button></div>');
}
A.stsave=function(){ var s=new Date($('stS').value).getTime(), now=Date.now(); if(!isFinite(s)||s>now) return toast(L('The start can’t be in the future.','开始时间不能在未来。')); if(now-s>72*H) return toast(L('That’s more than 72 hours ago.','这超过了 72 小时。'));
  var clash=S.fasts.some(function(f){ return s<f.end&&now>f.start; }); if(clash) return toast(L('That overlaps another fast.','和另一次断食时间重叠了。'));
  S.cur.start=s; S.cur.reached=(now-s)/H>=S.cur.goalH; save(); closeSheet(); cache={}; shownP=-1; updateToday(); scheduleGoal(); };
/* the endA label doubles as a button */
(function(){ var a=$('endA'); a.setAttribute('role','button'); a.tabIndex=0; a.style.cssText='display:inline-flex;align-items:center;min-height:44px;cursor:pointer'; a.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(S.cur) startEdit(); } });
  $('endB').style.cssText='display:inline-flex;align-items:center;min-height:44px'; })();

/* ---------- boot ---------- */
(function stars(){ var o='', s=7; function r(){ s=(s*9301+49297)%233280; return s/233280; } for(var i=0;i<70;i++) o+='<circle cx="'+(r()*390).toFixed(0)+'" cy="'+(r()*400).toFixed(0)+'" r="'+(0.6+r()*1.1).toFixed(1)+'" opacity="'+(0.3+r()*0.6).toFixed(2)+'"/>'; $('stars').innerHTML=o; })();
var dsNow=1;
/* the disc gives way first: it shrinks until the streak card and the button both fit above the tab bar */
function fitDisc(){ var t=$('today'); if(curTab!=='today'||!t.clientHeight) return; var free=$('gap').offsetHeight-14, over=t.scrollHeight-t.clientHeight, d=(free>0?free:0)-(over>0?over:0);
  if(Math.abs(d)<2) return; var n=Math.max(.4,Math.min(1,dsNow+d/236)); if(Math.abs(n-dsNow)<.004) return; dsNow=n; $('discWrap').style.setProperty('--ds',n.toFixed(3)); }
window.addEventListener('resize',fitDisc);
applyTheme(); applyLang(); initCal(); initOrb(); fitDisc(); flexTick(); checkUnlocks();
var carried=CL&&CL.takeCarried&&CL.takeCarried(), returning=/access_token=|error=/.test(location.hash);
if(carried&&!S.onboarded){ applyRemote(carried); applyTheme(); applyLang(); }
/* coming back through a sign-in link: let the account restore first, so onboarding never flashes for someone who already did it */
if(!S.onboarded&&!(returning&&CL&&CL.ready())){ updateToday(); obStart(); } else if(S.onboarded){ showTab('today'); }
scheduleGoal();
if(CL&&CL.ready()){ window.addEventListener('storage',function(ev){ if(ev.key===CL.AK&&ev.newValue){ closeSheet(); renderMe(); toast(L('Signed in.','已登录。')); syncNow(true); } });
  CL.fromHash().then(function(a){ if(a){ closeSheet(); toast(L('Signed in.','已登录。')); if(S.onboarded) showTab('today'); } }).catch(function(x){ if(x&&x.linkError){ showTab('me'); toast(/expired|otp/i.test(x.linkError+x.message)?L('That link expired or was already used. Send a new one.','链接已过期或已用过，请重新发送。'):L('Couldn’t sign in with that link. Send a new one.','这个链接登录失败，请重新发送。')); } }).then(function(){ return cloudOn()?syncNow(true):null; }).then(function(){ if(!S.onboarded&&$('ob').hidden){ updateToday(); obStart(); } }); }
var lastT=performance.now(), lastSec=0, frame=0;
function loop(t){
  var dt=Math.min((t-lastT)/1000,.1); lastT=t; frame++;
  if(!document.hidden&&curTab==='today'&&$('ob').hidden){ if(t-lastSec>1000||holdOn&&false){ lastSec=t; updateToday(); } if(reduce?frame%6===0:(frame%2===0||boost>0||Math.abs(shownP-tgtP)>.001||Math.abs(tiltX)>.01||Math.abs(tiltY)>.01||tgtX||tgtY)) drawDisc(dt*(reduce?6:2)); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
document.addEventListener('visibilitychange',function(){ if(!document.hidden){ var dk=today(); if(cloudOn()&&Date.now()-sync.at>60000) syncNow(true); flexTick(); if(curTab==='today'){ cache={}; updateToday(); } scheduleGoal(); } });
if('serviceWorker' in navigator&&location.protocol!=='file:') navigator.serviceWorker.register('sw.js').catch(function(){});
window.__lightly={get state(){return S;},tick:updateToday,core:C};
})();
