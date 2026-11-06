/* Lightly Friends: the screens (the Friends tab and its sheets). The rules are in js/friends.js, the database in supabase/friends.sql.
   Solo fasting stays the main experience: nothing here shows unless "Friends (preview)" is on in Me, and nothing about Friends ever appears on Today, Days or Me
   except that one switch. js/app.js hands this file what it needs through init(h) (see the call at the bottom of app.js). */
(function(root){
'use strict';
var F=root.LightlyFriends, QR=root.LightlyQR, KEY='lightly:friends';

function init(h){
  var L=h.L, esc=h.esc, $=h.$, CL=h.CL, AV=h.AV, CHEV=h.CHEV, A=h.A;
  /* Friends keeps its own small copy on the phone, apart from the app state: it stays out of the backup, the sign-in link and the export file */
  var st={preview:false,groups:[],profile:null,at:0,err:'',joinCode:'',uid:''}, loading=false, tmp={av:null}, view=null, pub={last:null,at:0,busy:false,t:0};
  try{ var raw=JSON.parse(localStorage.getItem(KEY)||'null'); if(raw&&typeof raw==='object') Object.keys(st).forEach(function(k){ if(raw[k]!==undefined) st[k]=raw[k]; }); }catch(e){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(st)); }catch(e){} }
  function S(){ return h.S(); }
  function lang(){ return S().lang; }
  function signedIn(){ return !!(CL&&CL.ready()&&CL.getAuth()); }
  /* the tab exists only while the preview switch is on and the person may use Friends (see F.available) */
  function enabled(){ return !!st.preview&&F.available(S().profile)&&F.DECISIONS.fourTabs; }
  function order(){ return enabled()?['today','days','friends','me']:['today','days','me']; }
  /* show or hide the tab and size the tab bar's selection pill for three or four tabs */
  function sync(){ var on=enabled(), b=document.querySelector('#tabs [data-tab=friends]'); if(b) b.hidden=!on; h.ph.style.setProperty('--nt',on?4:3); h.ph.style.setProperty('--ti',Math.max(0,order().indexOf(h.tab())));
    if(!on&&h.tab()==='friends') h.showTab('today',true); }
  function setPreview(on){ st.preview=!!on; if(!on) view=null; save(); sync(); }

  /* ---------- drawings ---------- */
  function defs(){ if($('frDefs')) return; var d=document.createElement('div'); d.id='frDefs'; d.setAttribute('aria-hidden','true'); d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML='<svg width="0" height="0"><defs><radialGradient id="frSun" cx=".4" cy=".36" r=".78"><stop offset="0" stop-color="#FFF4C8"/><stop offset=".5" stop-color="#FFC93C"/><stop offset="1" stop-color="#FF9F1C"/></radialGradient></defs></svg>'; h.ph.appendChild(d); }
  /* a friend's disc: always a sun, counter-clockwise from 12 o'clock, measured against that person's own plan (see F.disc) */
  function disc(d,size){ var r=16, s='<svg class="frd" viewBox="-18 -18 36 36" width="'+size+'" height="'+size+'" aria-hidden="true">';
    if(d.kind==='empty') s+='<circle r="'+r+'" fill="none" stroke="var(--label-3)" stroke-width="1.6"/>';
    else if(d.kind==='rest') s+='<circle r="'+r+'" fill="none" stroke="var(--label-3)" stroke-width="1.6" stroke-dasharray="3 3.2"/>';
    else if(d.kind==='full') s+='<circle r="'+r+'" fill="url(#frSun)"/>';
    else{ var a=d.fill*Math.PI*2, x=-r*Math.sin(a), y=-r*Math.cos(a); s+='<circle r="'+r+'" fill="var(--fill-2)"/>'+(d.fill>0?'<path d="M0 0L0 '+(-r)+'A'+r+' '+r+' 0 '+(d.fill>.5?1:0)+' 0 '+x.toFixed(2)+' '+y.toFixed(2)+'Z" fill="url(#frSun)"/>':''); }
    return s+'</svg>'; }
  function hero(){ return '<div class="fr-hero" aria-hidden="true">'+disc({kind:'empty'},44)+disc({kind:'wedge',fill:.55},44)+disc({kind:'full'},44)+'</div>'; }
  var ICON_PEOPLE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.4"/><path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0"/><path d="M15.6 5.4a3.2 3.2 0 0 1 0 6.2M17.5 14.2a6 6 0 0 1 3.7 5.3"/></svg>';

  /* ---------- the tab ---------- */
  function title(){ return '<h1 class="lt fr-title">'+L('Friends','朋友')+'</h1>'; }
  function personCount(n){ return L(n+(n===1?' person':' people'),n+' 人'); }
  function groupRow(g){ var sub=personCount(g.member_count)+(g.fasting?' · '+L(g.fasting+' fasting',g.fasting+' 人断食中'):'');
    return '<button class="row" data-act="frgroup" data-id="'+esc(g.group_id)+'"><span class="stack"><span>'+esc(g.name)+'</span><small>'+esc(sub)+'</small></span>'+CHEV+'</button>'; }
  function render(){
    var el=$('friends'), x=''; if(!el) return; defs();
    if(!signedIn()){ view=null;
      x=title()+hero()+'<h2 class="fr-h">'+L('Fast together, when you want company','想要人陪时，一起断食')+'</h2><p class="fr-p">'+L('Friends needs an account. Everything else works without one.','朋友功能需要账号，其他功能不需要。')+'</p><div class="fr-cta"><button class="btn" data-act="frsignin">'+L('Sign in','登录')+'</button></div>';
    }else if(view){ x=groupHtml();
    }else if(!st.groups.length){
      x=title()+hero()+'<h2 class="fr-h">'+L('Fast together, when you want company','想要人陪时，一起断食')+'</h2>'+(st.at||st.err?'<p class="fr-p">'+L('Start a group and send one link.','建一个小组，发一个链接。')+'</p><div class="fr-cta"><button class="btn" data-act="frnew">'+L('Start a group','建一个小组')+'</button></div>':'')+
        (st.err&&!st.at?'<p class="fr-p fr-err" role="status">'+esc(F.errorText(st.err,lang()))+'</p>':'');
    }else{
      x=title()+'<div class="group">'+st.groups.map(groupRow).join('')+'</div>'+(st.groups.length<F.MAX_GROUPS?'<div class="group"><button class="row" data-act="frnew"><span class="mi gold" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span>'+L('New group','新建小组')+'</span></button></div>':'')+
        (st.err?'<div class="gf" role="status">'+esc(F.errorText(st.err,lang()))+'</div>':'');
    }
    el.innerHTML=x;
  }
  /* read the groups (and whether this person already has a name for groups). The last good answer stays on screen if it fails. */
  function refresh(){
    if(!signedIn()||loading){ render(); return Promise.resolve(); } loading=true;
    var uid=(CL.getAuth()||{}).uid||''; if(st.uid!==uid){ st.uid=uid; st.groups=[]; st.profile=null; st.at=0; view=null; }
    return Promise.all([CL.rpc('my_groups',{p_today:h.today()}),CL.rest('profiles?select=display_name,avatar')]).then(function(r){
      st.groups=r[0]||[]; st.profile=(r[1]&&r[1][0])||null; st.at=Date.now(); st.err=''; save();
      if(view&&!st.groups.some(function(g){ return g.group_id===view.id; })) view=null; /* removed or left on another phone */
    }).catch(function(e){ st.err=F.errorKey(e); if(e&&e.status===401) st.err='failed'; }).then(function(){ loading=false; if(h.tab()==='friends') render(); publish(false); });
  }
  function show(){ render(); if(view) loadBoard(false); refresh(); }

  /* ---------- a group: the day strip, one row per person ---------- */
  var DOW=[['S','日'],['M','一'],['T','二'],['W','三'],['T','四'],['F','五'],['S','六']], MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function dt(k){ return new Date(+k.slice(0,4),+k.slice(5,7)-1,+k.slice(8,10),12); }
  function dow(k){ return DOW[dt(k).getDay()][lang()==='zh'?1:0]; }
  function dayLong(i){ if(i===6) return L('Today','今天'); var d=dt(view.wk.days[i]); return L(MON[d.getMonth()]+' '+d.getDate(),(d.getMonth()+1)+' 月 '+d.getDate()+' 日'); }
  function av(a,uid){ return '<span class="fr-av">'+(AV.html(a)||AV.html(AV.defaultIcon(uid||'')))+'</span>'; }
  function rowOf(uid,i){ var b=view&&view.wk.b[i]; if(!b) return null; for(var k=0;k<b.length;k++) if(b[k].user_id===uid) return b[k]; return null; }
  function cheerable(x){ return F.DECISIONS.cheer&&view.wk.day===6&&!x.is_me&&(x.status==='fasting'||x.status==='reached'); }
  var BACK='<svg viewBox="0 0 10 17" aria-hidden="true"><path d="M8.5 1.5 1.5 8.5l7 7"/></svg>', MORE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>';
  function personRow(x){
    var w=view.wk, sub=F.rowText(x,lang()), ch='';
    if(x.is_me&&x.cheers_received>0) sub+=' · '+L(x.cheers_received+(x.cheers_received===1?' cheer':' cheers'),x.cheers_received+' 次加油');
    if(cheerable(x)) ch='<button type="button" class="fr-ch" data-act="frcheer" data-u="'+esc(x.user_id)+'" aria-pressed="'+!!x.cheered_by_me+'" aria-label="'+esc(x.cheered_by_me?L('Cheered ','已给')+x.display_name+L('','加油'):L('Cheer ','给')+x.display_name+L('','加油'))+'"><span>'+(x.cheered_by_me?L('Cheered','已加油'):L('Cheer','加油'))+'</span></button>';
    return '<div class="fr-row"><button type="button" class="fr-tap" data-act="frwho" data-u="'+esc(x.user_id)+'" aria-label="'+esc(x.display_name+', '+F.rowText(x,lang()))+'">'+av(x.avatar,x.user_id)+'<span class="fr-nm"><b>'+esc(x.display_name)+(x.is_me?'<i>'+L('You','我')+'</i>':'')+'</b><small>'+esc(sub)+'</small></span></button>'+ch+disc(F.disc(x),30)+'</div>';
  }
  function groupHtml(){
    var w=view.wk, b=w.b[w.day], n=b?b.length:view.n, body='';
    var strip=w.days.map(function(k,i){ return '<button type="button" data-act="frday" data-i="'+i+'" aria-pressed="'+(i===w.day)+'" aria-label="'+esc(dayLong(i))+'"><span>'+dow(k)+'</span><b>'+(+k.slice(8,10))+'</b></button>'; }).join('');
    if(b) body='<p class="fr-sum">'+esc(F.summary(b,dayLong(w.day),lang()))+'</p>'+(w.err?'<p class="fr-sum" role="status">'+esc(F.errorText(w.err,lang()))+'</p>':'')+'<div class="fr-card">'+b.map(personRow).join('')+'</div>';
    else if(w.err) body='<p class="fr-wait" role="status">'+esc(F.errorText(w.err,lang()))+'</p><div class="fr-cta"><button class="btn sec" data-act="frretry">'+L('Try again','重试')+'</button></div>';
    else body='<p class="fr-wait" role="status">'+L('Loading…','加载中…')+'</p>';
    return '<div class="fr-top"><button type="button" class="fr-back" data-act="frback">'+BACK+'<span>'+L('Friends','朋友')+'</span></button></div>'+
      '<div class="fr-t"><div><h1 class="lt fr-name">'+esc(view.name)+'</h1><div class="fr-sub">'+personCount(n)+'</div></div><div class="fr-tools"><button type="button" class="fr-inv" data-act="frinvite">'+L('Invite','邀请')+'</button><button type="button" class="fr-more" data-act="frset" aria-label="'+L('Group settings','小组设置')+'">'+MORE+'</button></div></div>'+
      '<div class="fr-days" role="group" aria-label="'+L('Days','日子')+'">'+strip+'</div>'+body;
  }
  function openGroup(id){
    var g=st.groups.filter(function(x){ return x.group_id===id; })[0]; if(!g) return;
    var t=h.today(); view={id:id,name:g.name,role:g.role,n:g.member_count,wk:{days:F.weekDays(t),today:t,b:[],day:6,err:'',at:0},busy:false};
    render(); var el=$('friends'); if(el) el.scrollTop=0; loadBoard(true);
  }
  /* the group's boards: all seven days when it opens (so a person's week is ready), then just today every minute */
  function loadBoard(all){
    var v=view; if(!v||!signedIn()||v.busy) return Promise.resolve();
    var w=v.wk, t=h.today(); if(w.today!==t){ w.days=F.weekDays(t); w.today=t; w.b=[]; all=true; }
    var idx=[]; for(var i=0;i<7;i++) if(all||i===6||(i===w.day&&!w.b[i])) idx.push(i);
    var before=JSON.stringify([w.b,w.err]); v.busy=true;
    return Promise.all(idx.map(function(i){ return CL.rpc('group_board',{p_gid:v.id,p_today:t,p_day:w.days[i]}).then(function(r){ return [i,r||[]]; }); })).then(function(rs){
      rs.forEach(function(x){ w.b[x[0]]=x[1]; }); w.err=''; w.at=Date.now();
    }).catch(function(e){ w.err=F.errorKey(e); }).then(function(){
      v.busy=false; if(view!==v) return;
      if(w.err==='not_member'){ view=null; loading=false; refresh(); h.toast(F.errorText('not_member',lang())); return; }
      if(h.tab()==='friends'&&before!==JSON.stringify([w.b,w.err])) render();
    });
  }

  /* ---------- sharing my own day ----------
     What goes out is exactly F.payload (a state, a plan in hours and seven small day rows). It goes when it changes, and now and then as a heartbeat. */
  function wantsPublish(){ return enabled()&&signedIn()&&!!st.profile&&st.groups.length>0; }
  function publish(force){
    if(!wantsPublish()||pub.busy) return Promise.resolve();
    var p=F.payload(S(),Date.now()); if(!force&&F.sameAs(p,pub.last)&&Date.now()-pub.at<600000) return Promise.resolve();
    pub.busy=true;
    return CL.rpc('publish_me',p).then(function(){ pub.last=p; pub.at=Date.now(); }).catch(function(e){ if(F.errorKey(e)==='no_profile') st.profile=null; }).then(function(){ pub.busy=false; });
  }
  function changed(){ if(!wantsPublish()) return; clearTimeout(pub.t); pub.t=setTimeout(function(){ publish(false); },1500); }
  function tick(){
    if(document.hidden||!enabled()||!signedIn()) return; publish(false);
    if(h.tab()==='friends'&&!document.querySelector('#sheet.open')){ if(view) loadBoard(false); else refresh(); }
  }
  setInterval(tick,F.POLL_MS);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) tick(); });

  /* ---------- sheets ---------- */
  function fail(e){ h.toast(F.errorText(F.errorKey(e),lang())); }
  function signInSheet(){
    h.openSheet('<h3>'+L('Sign in','登录')+'</h3><p class="lede">'+L('Friends needs an account. Everything else works without one.','朋友功能需要账号，其他功能不需要。')+'</p><div class="btns"><button class="btn gbtn" data-act="google">'+h.GICON+'<span>'+L('Continue with Google','用 Google 继续')+'</span></button><button class="btn sec" data-act="emailsheet">'+L('Continue with email','用邮箱继续')+'</button></div>');
  }
  /* your name in groups: never taken from the email address, and the only free text friends ever see */
  function nameSheet(next){
    tmp.next=next; tmp.av=(st.profile&&st.profile.avatar)||tmp.av||AV.defaultIcon((CL.getAuth()||{}).uid||''); if(F.AVATARS.indexOf(tmp.av)<0) tmp.av=F.AVATARS[0];
    var nm=(st.profile&&st.profile.display_name)||S().name||'', g='';
    F.AVATARS.forEach(function(id){ var a=AV.find(id); g+='<button type="button" class="avt'+(id===tmp.av?' sel':'')+'" data-act="frav" data-id="'+id+'" aria-pressed="'+(id===tmp.av)+'" aria-label="'+esc(a?L(a.en,a.zh):id)+'">'+AV.html(id)+'</button>'; });
    h.openSheet('<h3>'+L('Your name in groups','你在小组里的名字')+'</h3><div class="group"><div class="field"><label for="frName">'+L('Name','名字')+'</label><input id="frName" type="text" maxlength="'+F.NAME_MAX+'" autocomplete="off" autocapitalize="words" spellcheck="false" value="'+esc(nm)+'" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div>'+
      '<div class="av-grid fr4" id="frAvs" role="group" aria-label="'+L('Sky picture','天空头像')+'">'+g+'</div><div class="btns"><button class="btn" data-act="frnamego">'+L('Continue','继续')+'</button></div>');
    var i=$('frName'); if(i&&!nm) setTimeout(function(){ try{ i.focus(); }catch(e){} },350);
  }
  function newSheet(){
    if(!st.profile) return nameSheet(newSheet);
    h.openSheet('<h3>'+L('New group','新建小组')+'</h3><div class="group"><div class="field"><label for="frGn">'+L('Group name','小组名称')+'</label><input id="frGn" type="text" maxlength="'+F.GROUP_NAME_MAX+'" autocomplete="off" spellcheck="false" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div>'+
      '<p class="note">'+L('Up to 10 people.','最多 10 人。')+'</p><div class="btns"><button class="btn" data-act="frcreate">'+L('Create and invite','创建并邀请')+'</button></div>');
    var i=$('frGn'); if(i) setTimeout(function(){ try{ i.focus(); }catch(e){} },350);
  }
  function link(code){ return F.joinLink(location.origin+location.pathname,code); }
  /* the invite: link, code or QR (the code and QR cover people in the same room, or a chat app that blocks links) */
  function inviteSheet(gid,name){
    h.openSheet('<h3>'+L('Invite friends','邀请朋友')+'</h3><p class="note" id="frInv">…</p>');
    CL.rpc('current_invite',{p_gid:gid}).then(function(r){ var inv=r&&r[0]; if(!inv){ h.closeSheet(); return h.toast(F.errorText('no_invite',lang())); }
      var u=link(inv.code); tmp.link=u; tmp.name=name;
      h.openSheet('<h3>'+L('Invite friends','邀请朋友')+'</h3><div class="fr-qr" role="img" aria-label="'+L('QR code for the invite','邀请二维码')+'">'+QR.svg(u,0)+'</div><div class="fr-code"><small>'+L('Invite code','邀请码')+'</small><b dir="ltr">'+F.formatCode(inv.code)+'</b></div>'+
        '<div class="fr-two"><button class="btn" data-act="frshare">'+L('Share link','分享链接')+'</button><button class="btn sec" id="frCopy" data-act="frcopy">'+L('Copy','复制')+'</button></div>'+
        '<p class="note fr-note">'+L('Valid for 7 days. Share it only with people you know.','7 天内有效，请只发给你认识的人。')+'</p>');
    }).catch(function(e){ h.closeSheet(); fail(e); });
  }
  function copy(text){ if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(text); return new Promise(function(ok,no){ try{ var t=document.createElement('textarea'); t.value=text; t.style.cssText='position:fixed;opacity:0'; document.body.appendChild(t); t.select(); var r=document.execCommand('copy'); document.body.removeChild(t); r?ok():no(); }catch(e){ no(e); } }); }

  /* ---------- actions ---------- */
  A.frsignin=signInSheet;
  A.frnew=function(){ if(st.groups.length>=F.MAX_GROUPS) return h.toast(F.errorText('group_cap',lang())); h.fx('light'); newSheet(); };
  A.frav=function(b){ tmp.av=b.dataset.id; h.fx('select'); [].forEach.call(document.querySelectorAll('#frAvs .avt'),function(x){ var on=x===b; x.classList.toggle('sel',on); x.setAttribute('aria-pressed',on); }); };
  A.frnamego=function(b){ var n=F.cleanName(($('frName')||{}).value,F.NAME_MAX); if(!F.validName(n)) return h.toast(L('Add a name first.','先起个名字。')); if(b.disabled) return; b.disabled=true;
    CL.rpc('upsert_profile',{p_name:n,p_avatar:tmp.av}).then(function(){ st.profile={display_name:n,avatar:tmp.av}; save(); var next=tmp.next; tmp.next=null; if(next) next(); else h.closeSheet(); }).catch(function(e){ b.disabled=false; fail(e); }); };
  A.frcreate=function(b){ var n=F.cleanName(($('frGn')||{}).value,F.GROUP_NAME_MAX); if(!F.validName(n,F.GROUP_NAME_MAX)) return h.toast(L('Add a group name first.','先给小组起个名字。')); if(b.disabled) return; b.disabled=true;
    CL.rpc('create_group',{p_name:n}).then(function(r){ var g=r&&r[0]; h.fx('success'); loading=false; refresh().then(function(){ openGroup(g.group_id); }); inviteSheet(g.group_id,n); }).catch(function(e){ b.disabled=false; if(F.errorKey(e)==='no_profile'){ st.profile=null; return nameSheet(newSheet); } fail(e); }); };
  A.frshare=function(){ var u=tmp.link; if(!u) return; var msg=L('Fast with me on Lightly: ','来轻伴和我一起断食：')+(tmp.name?'“'+tmp.name+'” ':'');
    if(navigator.share){ navigator.share({title:'Lightly 轻伴',text:msg,url:u}).catch(function(){}); } else A.frcopy(); };
  A.frcopy=function(){ var u=tmp.link; if(!u) return; copy(u).then(function(){ var b=$('frCopy'); if(b){ b.textContent=L('Copied','已复制'); setTimeout(function(){ if($('frCopy')) $('frCopy').textContent=L('Copy','复制'); },1600); } h.fx('light'); }).catch(function(){ h.toast(L('Couldn’t copy. Select the code instead.','复制失败，请直接记下邀请码。')); }); };


  /* ---------- one person, group settings, leaving ---------- */
  function whoSheet(uid){
    var w=view.wk, x=rowOf(uid,w.day)||rowOf(uid,6); if(!x) return;
    var strip=''; for(var i=0;i<7;i++){ var y=rowOf(uid,i); strip+='<div>'+disc(y?F.disc(y):{kind:'empty',fill:0},28)+'<span>'+dow(w.days[i])+'</span></div>'; }
    var ch='', links='';
    if(cheerable(x)) ch='<div class="btns"><button class="btn'+(x.cheered_by_me?' sec':'')+'" data-act="frcheer" data-u="'+esc(uid)+'" aria-pressed="'+!!x.cheered_by_me+'"'+(x.cheered_by_me?' disabled':'')+'>'+(x.cheered_by_me?L('Cheered','已加油'):L('Cheer ','给')+esc(x.display_name)+L('','加油'))+'</button></div>';
    if(!x.is_me){ links='<div class="fr-sheet-links"><button class="btn quiet" data-act="frreport" data-u="'+esc(uid)+'">'+L('Report','举报')+'</button>'+(view.role==='owner'?'<button class="btn red" data-act="frremove" data-u="'+esc(uid)+'">'+L('Remove from group','移出小组')+'</button>':'')+'</div>'; }
    h.openSheet('<h3>'+esc(x.display_name)+'</h3><div id="frWho" data-u="'+esc(uid)+'"><div class="fr-who">'+av(x.avatar,uid)+'<span class="fr-nm"><small>'+esc(dayLong(w.day)+' · '+F.rowText(x,lang()))+'</small></span>'+disc(F.disc(x),44)+'</div>'+
      '<p class="fr-lbl">'+L('Last 7 days','过去 7 天')+'</p><div class="fr-wk">'+strip+'</div>'+ch+links+'</div>');
  }
  function confirmSheet(titleT,lede,go,goLabel){
    h.openSheet('<!--keep--><h3 class="ctr">'+titleT+'</h3><p class="lede ctr">'+lede+'</p><div class="btns"><button class="btn dark" data-act="close">'+L('Cancel','取消')+'</button><button class="btn red solid" data-act="'+go+'">'+goLabel+'</button></div>');
  }
  function memRow(m){ var tag=[m.is_me?L('You','我'):'',m.role==='owner'?L('Owner','群主'):''].filter(Boolean).join(' · ');
    return '<div class="fr-mem">'+av(m.avatar,m.user_id)+'<span class="fr-nm"><b>'+esc(m.display_name)+'</b></span><em>'+esc(tag)+'</em></div>'; }
  function settingsSheet(){
    var v=view; h.openSheet('<h3>'+esc(v.name)+'</h3><p class="note">…</p>');
    CL.rpc('group_roster',{p_gid:v.id}).then(function(r){ r=r||[]; var me=r.filter(function(m){ return m.is_me; })[0]; tmp.sharing=!me||me.sharing!==false; v.n=r.length;
      h.openSheet('<h3>'+esc(v.name)+'</h3><div class="group">'+r.map(memRow).join('')+'</div>'+
        '<div class="group"><div class="row"><span>'+L('Share my status','分享我的状态')+'</span><button class="sw" role="switch" aria-checked="'+tmp.sharing+'" aria-label="'+L('Share my status','分享我的状态')+'" data-act="frsharing"></button></div></div><div class="gf">'+L('When it’s off, this group sees you as resting.','关闭后，这个小组会看到你在休息。')+'</div>'+
        '<div class="btns"><button class="btn" data-act="frinvite">'+L('Invite friends','邀请朋友')+'</button>'+(v.role==='owner'?'<button class="btn sec" data-act="frrename">'+L('Rename group','重命名小组')+'</button>':'')+'<button class="btn red" data-act="frleave">'+L('Leave group','退出小组')+'</button></div>');
    }).catch(function(e){ h.closeSheet(); fail(e); });
  }
  function afterChange(){ loading=false; refresh(); return loadBoard(true); }

  A.frgroup=function(b){ h.fx('light'); openGroup(b.dataset.id); };
  A.frback=function(){ view=null; h.fx('light'); render(); refresh(); };
  A.frretry=function(){ view.wk.err=''; render(); loadBoard(true); };
  A.frday=function(b){ var i=+b.dataset.i; if(!(i>=0&&i<=6)) return; view.wk.day=i; h.fx('select'); render(); var on=document.querySelector('#friends .fr-days [aria-pressed="true"]'); if(on) on.focus({preventScroll:true}); if(!view.wk.b[i]) loadBoard(false); };
  A.frinvite=function(){ if(view) inviteSheet(view.id,view.name); };
  A.frwho=function(b){ whoSheet(b.dataset.u); };
  A.frset=function(){ if(view) settingsSheet(); };
  A.frcheer=function(b){
    var uid=b.dataset.u, x=rowOf(uid,6), v=view; if(!x||x.cheered_by_me||b.disabled) return; x.cheered_by_me=true; h.fx('light'); render();
    var who=$('frWho'); if(who&&who.dataset.u===uid) whoSheet(uid);
    CL.rpc('send_cheer',{p_gid:v.id,p_to:uid,p_day:v.wk.days[6]}).then(function(){
      h.toast(L('Cheered ','已给')+x.display_name+L('','加油'),function(){ x.cheered_by_me=false; if(view===v) render(); CL.rpc('withdraw_cheer',{p_gid:v.id,p_to:uid,p_day:v.wk.days[6]}).catch(function(){}); });
    }).catch(function(e){ x.cheered_by_me=false; if(view===v) render(); var o=$('frWho'); if(o&&o.dataset.u===uid) whoSheet(uid); fail(e); });
  };
  A.frsharing=function(b){ var on=b.getAttribute('aria-checked')!=='true'; b.setAttribute('aria-checked',on); h.fx('light');
    CL.rpc('set_sharing',{p_gid:view.id,p_on:on}).then(function(){ tmp.sharing=on; loadBoard(false); }).catch(function(e){ b.setAttribute('aria-checked',!on); fail(e); }); };
  A.frrename=function(){ h.openSheet('<h3>'+L('Rename group','重命名小组')+'</h3><div class="group"><div class="field"><label for="frRn">'+L('Group name','小组名称')+'</label><input id="frRn" type="text" maxlength="'+F.GROUP_NAME_MAX+'" autocomplete="off" spellcheck="false" value="'+esc(view.name)+'" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div><div class="btns"><button class="btn" data-act="frrenamego">'+L('Save','保存')+'</button></div>'); };
  A.frrenamego=function(b){ var n=F.cleanName(($('frRn')||{}).value,F.GROUP_NAME_MAX), v=view; if(!F.validName(n,F.GROUP_NAME_MAX)) return h.toast(L('Add a group name first.','先给小组起个名字。')); if(b.disabled) return; b.disabled=true;
    CL.rpc('rename_group',{p_gid:v.id,p_name:n}).then(function(){ v.name=n; st.groups.forEach(function(g){ if(g.group_id===v.id) g.name=n; }); save(); h.closeSheet(); if(view===v) render(); }).catch(function(e){ b.disabled=false; fail(e); }); };
  A.frleave=function(){ var many=view.role==='owner'&&view.n>1;
    confirmSheet(L('Leave “','退出“')+esc(view.name)+L('”?','”？'),many?L('Someone else becomes the owner. You can join again with a new invite.','小组会交给另一位成员。你可以用新的邀请再次加入。'):L('You can join again with a new invite.','你可以用新的邀请再次加入。'),'frleaveok',L('Leave group','退出小组')); };
  A.frleaveok=function(b){ var v=view; if(b.disabled) return; b.disabled=true;
    CL.rpc('leave_group',{p_gid:v.id}).then(function(){ h.closeSheet(); view=null; st.groups=st.groups.filter(function(g){ return g.group_id!==v.id; }); save(); render(); loading=false; refresh(); h.toast(L('You left “','你已退出“')+v.name+L('”','”')); }).catch(function(e){ b.disabled=false; fail(e); }); };
  A.frremove=function(b){ var x=rowOf(b.dataset.u,6)||rowOf(b.dataset.u,view.wk.day); if(!x) return; tmp.who=x;
    confirmSheet(L('Remove ','移出')+esc(x.display_name)+L('?','？'),L('They leave this group. They can join again only with a new invite from you.','对方会离开这个小组，只有你再发新的邀请才能重新加入。'),'frremoveok',L('Remove','移出')); };
  A.frremoveok=function(b){ var x=tmp.who, v=view; if(!x||b.disabled) return; b.disabled=true;
    CL.rpc('remove_member',{p_gid:v.id,p_uid:x.user_id}).then(function(){ h.closeSheet(); v.n=Math.max(1,v.n-1); afterChange(); h.toast(L('Removed ','已移出')+x.display_name); }).catch(function(e){ b.disabled=false; fail(e); }); };
  A.frreport=function(b){ var x=rowOf(b.dataset.u,6)||rowOf(b.dataset.u,view.wk.day); if(!x) return; tmp.who=x;
    confirmSheet(L('Report ','举报')+esc(x.display_name)+L('?','？'),L('We’ll take a look. They won’t be told who reported.','我们会查看，对方不会知道是谁举报的。'),'frreportok',L('Report','举报')); };
  A.frreportok=function(b){ var x=tmp.who, v=view; if(!x||b.disabled) return; b.disabled=true;
    CL.rpc('report_member',{p_gid:v.id,p_uid:x.user_id}).then(function(){ h.closeSheet(); h.toast(L('Thanks. We’ll take a look.','谢谢，我们会查看。')); }).catch(function(e){ b.disabled=false; fail(e); }); };

  /* the Me tab's switch */
  function meRow(mi){ return F.available(S().profile)?'<div class="group">'+h.sw('fr',L('Friends (preview)','朋友（预览）'),st.preview,0,mi('people','gold'))+'</div><div class="gf">'+L('Try Friends before it is released. It needs an account, and Today stays as it is.','在正式发布前试用朋友功能。需要账号，“今天”页面保持不变。')+'</div>':''; }

  sync();
  return {enabled:enabled,order:order,sync:sync,setPreview:setPreview,changed:changed,publish:publish,preview:function(){ return st.preview; },show:show,render:render,meRow:meRow,ICON:ICON_PEOPLE,state:function(){ return st; }};
}
root.LightlyFriendsUI={init:init};
})(typeof self!=='undefined'?self:this);
