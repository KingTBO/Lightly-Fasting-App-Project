/* Lightly Friends: the pure rules (no DOM), tested in Node by tests/friends.test.js.
   What a phone publishes about the day, what the words and discs for a friend's row are, and how invite codes and links work.
   The screens live in js/app.js; the database and its privacy rules in supabase/friends.sql. See AGENTS.md for the guardrails:
   solo fasting stays the main experience, nothing about the body is ever shared, and nothing pushes past a person's own plan. */
(function(root){
'use strict';
var C=(typeof module!=='undefined'&&module.exports)?require('./core.js'):root.LightlyCore;
var H=3600000;

/* The owner's open decisions, each one switch (TEEBO has not ruled yet: these are the proposal's recommendations).
   Flip one here and the rest of the feature follows. */
var DECISIONS={
  streak:false,        /* friends do NOT see each other's streak (the database has no streak column at all, so turning this on also needs SQL) */
  moonAtNight:false,   /* every friend disc is a sun: a moon would hint at their time zone */
  cheer:true,          /* a silent Cheer, one per friend per day */
  fourTabs:true,       /* Today, Days, Friends, Me */
  accountRequired:true /* only Friends needs an account */
};
var MAX_MEMBERS=10, MAX_GROUPS=3, POLL_MS=60000, PUBLISH_MS=60000, NAME_MAX=24, GROUP_NAME_MAX=32, INVITE_DAYS=7;
/* the sky avatars friends can pick (ids match js/avatars.js; the Eclipse unlock, a Google photo and gallery photos are never shared) */
var AVATARS=['crescent','full','sunrise','star','stars','lantern','tea','drop'];
var CODE_RE=/^[2-9A-HJKMNP-Z]{8}$/;

/* ---------- who may use Friends ----------
   Care mode people can (there is no ranking and no streak here), except anyone who answered the eating-disorder question:
   for them the tab is not shown at all. */
function available(profile){ var care=(profile&&profile.care)||[]; return care.indexOf('ed')<0; }

/* ---------- the last seven days, oldest first, today last ---------- */
function weekDays(todayKey){ var out=[]; for(var i=6;i>=0;i--) out.push(C.addDays(todayKey,-i)); return out; }

/* ---------- words, plan hours, summary ---------- */
var WORDS={
  fasting:['Fasting','断食中'], reached:['Reached goal','达成目标'], fasted:['Fasted','已断食'], resting:['Resting','休息中'], none:['Not fasting','没有断食']
};
function word(status,lang){ var w=WORDS[status]||WORDS.none; return w[lang==='zh'?1:0]; }
function hoursText(h){ var n=Math.round(h*10)/10; return String(n%1===0?n|0:n); }
/* "16h" / "16小时"; nothing for resting, not fasting, or a sacred fast whose length stays private */
function planLabel(goalHours,lang){ if(goalHours==null||!(goalHours>0)) return ''; return hoursText(goalHours)+(lang==='zh'?'小时':'h'); }
/* the row's second line: "Fasting · 16h"; a status that carries no plan is just the word */
function rowText(row,lang){
  var w=word(row.status,lang), shows=row.status==='fasting'||row.status==='reached'||row.status==='fasted', p=shows?planLabel(row.goal_hours,lang):'';
  return p?w+' · '+p:w;
}
/* "Today · 3 fasting · 1 reached goal · 1 resting". Counts only, never a percentage, never "most" or a ranking word. */
function counts(rows){ var n={fasting:0,reached:0,fasted:0,resting:0,none:0}; (rows||[]).forEach(function(r){ if(n[r.status]!=null) n[r.status]++; }); return n; }
function summary(rows,label,lang){
  var n=counts(rows), zh=lang==='zh', parts=[label];
  if(n.fasting) parts.push(zh?n.fasting+' 人断食中':n.fasting+' fasting');
  if(n.reached) parts.push(zh?n.reached+' 人达成目标':n.reached+' reached goal');
  if(n.fasted) parts.push(zh?n.fasted+' 人已断食':n.fasted+' fasted');
  if(n.resting) parts.push(zh?n.resting+' 人休息':n.resting+' resting');
  return parts.join(' · ');
}
/* How a disc is drawn: kind 'wedge' (counter-clockwise from 12, fill 0..1), 'full', 'rest' (dashed ring) or 'empty'.
   Always measured against that person's own plan, always a sun, and it stops at full. */
function disc(row){
  var s=row&&row.status;
  if(s==='reached') return {kind:'full',fill:1};
  if(s==='fasting'||s==='fasted') return {kind:'wedge',fill:Math.max(0,Math.min(1,+row.progress||0))};
  if(s==='resting') return {kind:'rest',fill:0};
  return {kind:'empty',fill:0};
}

/* ---------- invite codes and links ---------- */
/* spaces, dashes and case are ignored: "k7qm-4xd9" is "K7QM4XD9" */
function normalizeCode(s){ return String(s==null?'':s).toUpperCase().replace(/[^A-Z0-9]/g,''); }
function validCode(s){ return CODE_RE.test(normalizeCode(s)); }
function formatCode(s){ var c=normalizeCode(s); return c.length===8?c.slice(0,4)+' '+c.slice(4):c; }
/* the app is static hosting, so the link is a query parameter on the app's own address; keep the base in one place for a future custom domain */
function joinLink(base,code){ return String(base).replace(/[?#].*$/,'')+'?join='+normalizeCode(code); }
function codeFromSearch(search){ var m=/[?&]join=([^&#]*)/.exec(search||''); if(!m) return ''; var c; try{ c=decodeURIComponent(m[1]); }catch(e){ c=m[1]; } c=normalizeCode(c); return validCode(c)?c:''; }
/* the sign-in link keeps the code, so it survives a magic link opened in another browser */
function withJoin(url,code){ var c=normalizeCode(code); if(!validCode(c)) return url; return url+(url.indexOf('?')<0?'?':'&')+'join='+c; }

/* ---------- names ---------- */
function cleanName(s,max){ return String(s==null?'':s).replace(/\s+/g,' ').trim().slice(0,max||NAME_MAX); }
function validName(s,max){ var n=cleanName(s,9999); return n.length>=1&&n.length<=(max||NAME_MAX); }

/* ---------- what this phone publishes ----------
   state: 'fasting' while a fast runs, 'resting' during Time off or on a used cheat day, otherwise 'idle'.
   days: the last seven local days, the day a fast ENDED (like the Days tab). A done fast is 'fast' with its progress; a cheat day or Time off is 'rest';
   a fast that fell short is 'fast' with the share it reached; nothing is 'none'.
   Hours elapsed, start and end times and the reason for resting never leave the phone: the database keeps a start time only to work out the disc,
   and the board never returns it. An "unwell" check-in is not shared. */
function liveState(S,now){
  now=now||Date.now(); var today=C.dayKey(now);
  if(C.offActive(S.off,now)) return {state:'resting',startedAt:null,goalH:null,sacred:false};
  if(S.cur) return {state:'fasting',startedAt:new Date(S.cur.start).toISOString(),goalH:S.cur.goalH,sacred:S.cur.planId==='ramadan'};
  if(((S.flex&&S.flex.used)||[]).indexOf(today)>=0) return {state:'resting',startedAt:null,goalH:null,sacred:false};
  return {state:'idle',startedAt:null,goalH:null,sacred:false};
}
function dayRows(S,now){
  now=now||Date.now(); var today=C.dayKey(now), fm=C.fastDays(S.fasts||[]), used=(S.flex&&S.flex.used)||[], off=C.offKeys(S.off||[]), out=[];
  weekDays(today).forEach(function(k){
    var list=fm[k]||[], best=null;
    list.forEach(function(f){ var p=Math.min(1,C.hours(f)/f.goalH); if(C.isDone(f)) p=1; if(!best||p>best.p) best={p:p,f:f}; });
    var done=list.some(C.isDone), r={day:k,outcome:'none',progress:0,goal_hours:null,sacred:false};
    if(done){ r.outcome='fast'; r.progress=1; r.goal_hours=best.f.goalH; r.sacred=best.f.plan==='ramadan'; }
    else if(used.indexOf(k)>=0||off.indexOf(k)>=0){ r.outcome='rest'; }
    else if(best){ r.outcome='fast'; r.progress=Math.round(best.p*1000)/1000; r.goal_hours=best.f.goalH; r.sacred=best.f.plan==='ramadan'; }
    out.push(r);
  });
  return out;
}
/* the arguments of the publish_me function, exactly */
function payload(S,now){
  var l=liveState(S,now);
  return {p_state:l.state,p_started_at:l.startedAt,p_goal_hours:l.goalH,p_days:dayRows(S,now),p_sacred:l.sacred};
}
/* two payloads that say the same thing (the heartbeat still sends, to keep "last heard from" fresh) */
function sameAs(a,b){ return !!a&&!!b&&JSON.stringify(a)===JSON.stringify(b); }

/* ---------- errors from the database ---------- */
var ERRORS={
  no_profile:['Choose a name first.','先起个名字。'],
  no_invite:['Ask the owner for a new invite.','请向群主要一个新的邀请。'],
  group_cap:['You’re in 3 groups already. Leave one to join another.','你已经在 3 个小组里了。退出一个才能加入新的。'],
  not_member:['You’re not in this group any more.','你已经不在这个小组里了。'],
  not_owner:['Only the owner can do that.','只有群主可以这样做。'],
  not_cheerable:['Cheer someone who is fasting.','给正在断食的人加油。'],
  invalid:['This invite isn’t valid any more. Ask for a new one.','这个邀请已失效，请向对方要一个新的。'],
  full:['This group is full.','这个小组已满员。'],
  cap:['You’re in 3 groups already. Leave one to join another.','你已经在 3 个小组里了。退出一个才能加入新的。'],
  too_many:['Too many tries. Try again in an hour.','尝试次数太多，请一小时后再试。'],
  offline:['Offline. Showing the last update.','已离线，显示的是上次更新。'],
  failed:['Couldn’t load. Try again in a moment.','加载失败，请稍后再试。']
};
/* a database error message is one of these keys; anything else is "failed" (and "offline" when there was no answer at all) */
function errorKey(e){ if(!e) return 'failed'; var m=String(e.message||e); if(ERRORS[m]) return m; if(e.status===undefined&&/fetch|network|load failed/i.test(m)) return 'offline'; return 'failed'; }
function errorText(key,lang){ var e=ERRORS[key]||ERRORS.failed; return e[lang==='zh'?1:0]; }

var api={DECISIONS:DECISIONS,MAX_MEMBERS:MAX_MEMBERS,MAX_GROUPS:MAX_GROUPS,POLL_MS:POLL_MS,PUBLISH_MS:PUBLISH_MS,NAME_MAX:NAME_MAX,GROUP_NAME_MAX:GROUP_NAME_MAX,INVITE_DAYS:INVITE_DAYS,AVATARS:AVATARS,
  available:available,weekDays:weekDays,word:word,planLabel:planLabel,rowText:rowText,counts:counts,summary:summary,disc:disc,
  normalizeCode:normalizeCode,validCode:validCode,formatCode:formatCode,joinLink:joinLink,codeFromSearch:codeFromSearch,withJoin:withJoin,
  cleanName:cleanName,validName:validName,liveState:liveState,dayRows:dayRows,payload:payload,sameAs:sameAs,errorKey:errorKey,errorText:errorText};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyFriends=api;
})(typeof self!=='undefined'?self:this);
