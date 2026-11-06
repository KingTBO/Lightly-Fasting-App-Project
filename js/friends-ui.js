/* Lightly Friends: the screens (the Friends tab and its sheets). The rules are in js/friends.js, the database in supabase/friends.sql.
   Solo fasting stays the main experience: nothing here shows unless "Friends (preview)" is on in Me, and nothing about Friends ever appears on Today, Days or Me
   except that one switch. js/app.js hands this file what it needs through init(h) (see the call at the bottom of app.js). */
(function(root){
'use strict';
var F=root.LightlyFriends, QR=root.LightlyQR, KEY='lightly:friends';

function init(h){
  var L=h.L, esc=h.esc, $=h.$, CL=h.CL, AV=h.AV, CHEV=h.CHEV, A=h.A;
  /* Friends keeps its own small copy on the phone, apart from the app state: it stays out of the backup, the sign-in link and the export file */
  var st={preview:false,groups:[],profile:null,at:0,err:'',joinCode:''}, loading=false, tmp={av:null};
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
  function setPreview(on){ st.preview=!!on; save(); sync(); }

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
    return '<button class="row" data-act="frgroup" data-id="'+esc(g.group_id)+'" data-n="'+esc(g.name)+'"><span class="stack"><span>'+esc(g.name)+'</span><small>'+esc(sub)+'</small></span>'+CHEV+'</button>'; }
  function render(){
    var el=$('friends'), x=''; if(!el) return; defs();
    if(!signedIn()){
      x=title()+hero()+'<h2 class="fr-h">'+L('Fast together, when you want company','想要人陪时，一起断食')+'</h2><p class="fr-p">'+L('Friends needs an account. Everything else works without one.','朋友功能需要账号，其他功能不需要。')+'</p><div class="fr-cta"><button class="btn" data-act="frsignin">'+L('Sign in','登录')+'</button></div>';
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
    return Promise.all([CL.rpc('my_groups',{p_today:h.today()}),CL.rest('profiles?select=display_name,avatar')]).then(function(r){
      st.groups=r[0]||[]; st.profile=(r[1]&&r[1][0])||null; st.at=Date.now(); st.err=''; save();
    }).catch(function(e){ st.err=F.errorKey(e); if(e&&e.status===401) st.err='failed'; }).then(function(){ loading=false; if(h.tab()==='friends') render(); });
  }
  function show(){ render(); refresh(); }

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
    CL.rpc('create_group',{p_name:n}).then(function(r){ var g=r&&r[0]; h.fx('success'); loading=false; refresh(); inviteSheet(g.group_id,n); }).catch(function(e){ b.disabled=false; if(F.errorKey(e)==='no_profile'){ st.profile=null; return nameSheet(newSheet); } fail(e); }); };
  A.frgroup=function(b){ inviteSheet(b.dataset.id,b.dataset.n); };
  A.frshare=function(){ var u=tmp.link; if(!u) return; var msg=L('Fast with me on Lightly: ','来轻伴和我一起断食：')+(tmp.name?'“'+tmp.name+'” ':'');
    if(navigator.share){ navigator.share({title:'Lightly 轻伴',text:msg,url:u}).catch(function(){}); } else A.frcopy(); };
  A.frcopy=function(){ var u=tmp.link; if(!u) return; copy(u).then(function(){ var b=$('frCopy'); if(b){ b.textContent=L('Copied','已复制'); setTimeout(function(){ if($('frCopy')) $('frCopy').textContent=L('Copy','复制'); },1600); } h.fx('light'); }).catch(function(){ h.toast(L('Couldn’t copy. Select the code instead.','复制失败，请直接记下邀请码。')); }); };

  /* the Me tab's switch */
  function meRow(mi){ return F.available(S().profile)?'<div class="group">'+h.sw('fr',L('Friends (preview)','朋友（预览）'),st.preview,0,mi('people','gold'))+'</div><div class="gf">'+L('Try Friends before it is released. It needs an account, and Today stays as it is.','在正式发布前试用朋友功能。需要账号，“今天”页面保持不变。')+'</div>':''; }

  sync();
  return {enabled:enabled,order:order,sync:sync,setPreview:setPreview,preview:function(){ return st.preview; },show:show,render:render,meRow:meRow,ICON:ICON_PEOPLE,state:function(){ return st; }};
}
root.LightlyFriendsUI={init:init};
})(typeof self!=='undefined'?self:this);
