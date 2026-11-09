/* Lightly Friends: the screens (the Friends tab and its sheets). The rules are in js/friends.js, the database in supabase/friends.sql.
   Solo fasting stays the main experience: nothing about Friends ever appears on Today, Days or Me, and the tab is hidden for anyone who answered the eating-disorder question. js/app.js hands this file what it needs through init(h) (see the call at the bottom of app.js). */
(function(root){
'use strict';
var F=root.LightlyFriends, QR=root.LightlyQR, Z=root.LightlyZodiac, KEY='lightly:friends';

function init(h){
  var L=h.L, esc=h.esc, $=h.$, CL=h.CL, AV=h.AV, CHEV=h.CHEV, A=h.A;
  /* Friends keeps its own small copy on the phone, apart from the app state: it stays out of the backup, the sign-in link and the export file */
  var st={groups:[],profile:null,at:0,err:'',joinCode:'',uid:'',stack:{}}, loading=false, tmp={av:null}, view=null, pub={last:null,at:0,busy:false,t:0};
  try{ var raw=JSON.parse(localStorage.getItem(KEY)||'null'); if(raw&&typeof raw==='object') Object.keys(st).forEach(function(k){ if(raw[k]!==undefined) st[k]=raw[k]; }); }catch(e){}
  function save(){ try{ localStorage.setItem(KEY,JSON.stringify(st)); }catch(e){} }
  /* an invite link (?join=CODE): keep the code (it survives a sign-in in this browser, and the sign-in link carries it to another one) and take it out of the address bar */
  (function(){ var c=F.codeFromSearch(location.search); if(!c) return; st.joinCode=c; save();
    try{ var q=location.search.replace(/^\?/,'').split('&').filter(function(x){ return x&&!/^join=/.test(x); }).join('&'); history.replaceState(null,'',location.pathname+(q?'?'+q:'')+location.hash); }catch(e){} })();
  function S(){ return h.S(); }
  function lang(){ return S().lang; }
  function signedIn(){ return !!(CL&&CL.ready()&&CL.getAuth()); }
  /* the tab exists for everyone the person may use Friends for (see F.available) */
  function enabled(){ return F.available(S().profile)&&F.DECISIONS.fourTabs; }
  function order(){ return enabled()?['today','days','friends','me']:['today','days','me']; }
  /* show or hide the tab and size the tab bar's selection pill for three or four tabs */
  function sync(){ var on=enabled(), b=document.querySelector('#tabs [data-tab=friends]'); if(b) b.hidden=!on; h.ph.style.setProperty('--nt',on?4:3); h.ph.style.setProperty('--ti',Math.max(0,order().indexOf(h.tab())));
    if(!on&&h.tab()==='friends') h.showTab('today',true); }

  /* ---------- drawings ---------- */
  function defs(){ if($('frDefs')) return; var d=document.createElement('div'); d.id='frDefs'; d.setAttribute('aria-hidden','true'); d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML='<svg width="0" height="0"><defs><radialGradient id="frSun" cx=".4" cy=".36" r=".78"><stop offset="0" stop-color="#FFF4C8"/><stop offset=".5" stop-color="#FFC93C"/><stop offset="1" stop-color="#FF9F1C"/></radialGradient><linearGradient id="frRing" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFD84D"/><stop offset="1" stop-color="#FF9F1C"/></linearGradient></defs></svg>'; h.ph.appendChild(d); }
  /* a friend's disc: always a sun, counter-clockwise from 12 o'clock, measured against that person's own plan (see F.disc) */
  function disc(d,size){ var r=16, s='<svg class="frd" viewBox="-18 -18 36 36" width="'+size+'" height="'+size+'" aria-hidden="true">';
    if(d.kind==='empty') s+='<circle r="'+r+'" fill="none" stroke="var(--label-3)" stroke-width="1.6"/>';
    else if(d.kind==='rest') s+='<circle r="'+r+'" fill="none" stroke="var(--label-3)" stroke-width="1.6" stroke-dasharray="3 3.2"/>';
    else if(d.kind==='full') s+='<circle r="'+r+'" fill="url(#frSun)"/>';
    else{ var a=d.fill*Math.PI*2, x=-r*Math.sin(a), y=-r*Math.cos(a); s+='<circle r="'+r+'" fill="var(--fill-2)"/>'+(d.fill>0?'<path d="M0 0L0 '+(-r)+'A'+r+' '+r+' 0 '+(d.fill>.5?1:0)+' 0 '+x.toFixed(2)+' '+y.toFixed(2)+'Z" fill="url(#frSun)"/>':''); }
    return s+'</svg>'; }
  function hero(){ return '<div class="fr-hero" aria-hidden="true">'+disc({kind:'empty'},44)+disc({kind:'wedge',fill:.55},44)+disc({kind:'full'},44)+'</div>'; }
  var ICON_CLOCK='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>', ICON_CHEER='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z"/></svg>';
  var ICON_PEOPLE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8.5" r="3.4"/><path d="M2.8 19.5a6.2 6.2 0 0 1 12.4 0"/><path d="M15.6 5.4a3.2 3.2 0 0 1 0 6.2M17.5 14.2a6 6 0 0 1 3.7 5.3"/></svg>';

  /* ---------- the tab ---------- */
  /* the sky is drawn on a 358 px wide board; on a narrower phone the whole board scales down together */
  function fitSky(){ var k=document.querySelector('#friends .fr-sky'); if(k) k.style.setProperty('--ks',Math.min(1,k.clientWidth/358).toFixed(4)); }
  window.addEventListener('resize',fitSky);
  /* The figure is a CSS mask. Until its image has loaded some browsers paint the whole panel unmasked, which shows as a flash of blue when the screen is rebuilt
     (switching light and dark, coming back to the tab). So a new figure stays hidden until its image is decoded and a frame or two have passed. */
  /* The fade runs on its own clock: it starts again from the Stars look whenever the tab is shown or a group opens, and keeps going through every other re-render
     (the figure's element is kept, see render), so coming back to the tab or switching light and dark never makes it pop in or flash. */
  var skyT0=Date.now();
  function skyPhase(){ return (-(((Date.now()-skyT0)/1000)%14)).toFixed(2)+'s'; }
  var artDecoded={};
  function decodeArt(u){ if(artDecoded[u]) return artDecoded[u]; var i=new Image(); i.src=u; return artDecoded[u]=(i.decode?i.decode():new Promise(function(ok){ i.onload=ok; i.onerror=ok; })).catch(function(){}); }
  function revealArt(){ [].forEach.call(document.querySelectorAll('#friends .fr-art:not(.rd)'),function(el){ decodeArt(el.getAttribute('data-art')).then(function(){ requestAnimationFrame(function(){ requestAnimationFrame(function(){ if(el.isConnected) el.classList.add('rd'); }); }); }); }); }
  if(Z){ try{ var a0=Z.layout(Z.signAt(h.today()),0).art; if(a0) decodeArt(a0); }catch(e){} }
  function reduceMotion(){ return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function personCount(n){ return L(n+(n===1?' person':' people'),n+' 人'); }
  /* a group card: the app's card colour, the name, one line, and a stack of the people (read from today's board, kept on the phone) */
  function groupCard(g){ var n=g.member_count, sub=personCount(n)+' · '+(g.fasting?L(g.fasting+' fasting now',g.fasting+' 人断食中'):L('Quiet today','今天安静')),
      stk=(st.stack[g.group_id]||[]).map(function(x){ return '<span class="fr-gav">'+(AV.html(x[1])||AV.html(AV.defaultIcon(x[0]||'')))+'</span>'; }).join('');
    return '<button type="button" class="fr-gc" data-act="frgroup" data-id="'+esc(g.group_id)+'" aria-label="'+esc(g.name+', '+sub)+'"><span class="fr-gt"><b>'+esc(g.name)+'</b><small>'+esc(sub)+'</small></span><span class="fr-gs" aria-hidden="true">'+stk+'</span></button>'; }
  function render(){
    var el=$('friends'), x=''; if(!el) return; defs();
    if(!signedIn()){ view=null; var iv=st.joinCode&&tmp.prev&&tmp.prev.code===st.joinCode?tmp.prev.row:null;
      x=hero()+(iv?'<h2 class="fr-h">'+L('You’re invited to “','你受邀加入“')+esc(iv.group_name)+L('”','”')+'</h2><p class="fr-p">'+L('Sign in to join. Only Friends needs an account.','登录后即可加入。只有朋友功能需要账号。')+'</p>'
        :'<h2 class="fr-h">'+L('Fast with friends','和朋友一起断食')+'</h2><p class="fr-p fr-s">'+L('Make a private group and see who is fasting today.','建一个私密小组，看看今天谁在断食。')+'</p>'+
          '<div class="fr-pts">'+[[L('Private, by invite only','私密，仅限邀请'),ICON_PEOPLE],[L('See each other’s progress','看到彼此的进度'),ICON_CLOCK],[L('Cheer each other on','互相加油'),ICON_CHEER]].map(function(r){ return '<div><span class="fr-pi" aria-hidden="true">'+r[1]+'</span><span>'+r[0]+'</span></div>'; }).join('')+'</div><p class="fr-p fr-fine">'+L('Friends is the only part of Lightly that needs an account.','轻伴里只有朋友功能需要账号。')+'</p>')+'<div class="fr-cta"><button class="btn" data-act="frsignin">'+L(iv?'Sign in to join':'Sign in',iv?'登录并加入':'登录')+'</button></div>';
    }else if(view){ x=groupHtml();
    }else if(!st.groups.length){
      x=hero()+'<h2 class="fr-h">'+L('Fast together, when you want company','想要人陪时，一起断食')+'</h2>'+(st.at||st.err?'<p class="fr-p">'+L('Start a group and send one link.','建一个小组，发一个链接。')+'</p><div class="fr-cta"><button class="btn" data-act="frnew">'+L('Start a group','建一个小组')+'</button><button class="btn quiet" data-act="frcode">'+L('I have an invite code','我有邀请码')+'</button></div>':'')+
        (st.err&&!st.at?'<p class="fr-p fr-err" role="status">'+esc(F.errorText(st.err,lang()))+'</p>':'');
    }else{
      x='<div class="gh">'+L('Your groups','你的小组')+'</div><div class="fr-gcs">'+st.groups.map(groupCard).join('')+'</div>'+(st.groups.length<F.MAX_GROUPS?'<div class="group"><button class="row" data-act="frnew"><span class="mi gold" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span>'+L('New group','新建小组')+'</span></button><button class="row" data-act="frcode"><span class="mi gold" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/></svg></span><span>'+L('Join with a code','用邀请码加入')+'</span></button></div>':'')+
        (st.err?'<div class="gf" role="status">'+esc(F.errorText(st.err,lang()))+'</div>':'');
    }
    var keep=el.querySelector('.fr-art'), keepOp=keep?parseFloat(getComputedStyle(keep).opacity)||0:0;   /* the figure already on screen is put back after the rebuild, at the right moment of the cycle */
    el.innerHTML=x; fitSky();
    var na=el.querySelector('.fr-art');
    if(keep&&na&&keep.getAttribute('data-art')===na.getAttribute('data-art')&&keep.getAttribute('data-up')===na.getAttribute('data-up')){ keep.style.animationDelay=skyPhase(); na.replaceWith(keep); }
    else if(keep&&na&&keepOp>.02&&view&&h.tab()==='friends'){   /* a new sign (the date changed): the old figure fades out while the new one starts from the Stars look */
      var host=na.parentNode; keep.removeAttribute('data-art'); keep.classList.add('out'); keep.style.animation='none'; keep.style.opacity=keepOp; keep.style.transition='opacity .7s ease'; host.insertBefore(keep,na);
      requestAnimationFrame(function(){ requestAnimationFrame(function(){ keep.style.opacity='0'; }); }); setTimeout(function(){ if(keep.parentNode) keep.parentNode.removeChild(keep); },900); }
    revealArt();
  }
  /* read the groups (and whether this person already has a name for groups). The last good answer stays on screen if it fails. */
  function refresh(){
    if(!signedIn()||loading){ render(); return Promise.resolve(); } loading=true;
    var uid=(CL.getAuth()||{}).uid||''; if(st.uid!==uid){ st.uid=uid; st.groups=[]; st.profile=null; st.at=0; view=null; }
    return Promise.all([CL.rpc('my_groups',{p_today:h.today()}),CL.rest('profiles?select=display_name,avatar')]).then(function(r){
      st.groups=r[0]||[]; st.profile=(r[1]&&r[1][0])||null; st.at=Date.now(); st.err=''; save();
      if(view&&!st.groups.some(function(g){ return g.group_id===view.id; })) view=null; /* removed or left on another phone */
      return stacks();
    }).catch(function(e){ st.err=F.errorKey(e); if(e&&e.status===401) st.err='failed'; }).then(function(){ loading=false; if(h.tab()==='friends') render(); publish(false); });
  }
  /* the first few people of each group, for the avatar stack on its card (at most MAX_GROUPS small reads); a failed read leaves the old stack */
  function stacks(){ var keep={};
    return Promise.all(st.groups.map(function(g){ return CL.rpc('group_roster',{p_gid:g.group_id}).then(function(rows){ rows=(rows||[]).slice().sort(function(x,y){ return (y.is_me?1:0)-(x.is_me?1:0); }); keep[g.group_id]=rows.slice(0,5).map(function(x){ return [x.user_id,x.avatar]; }); }).catch(function(){ if(st.stack[g.group_id]) keep[g.group_id]=st.stack[g.group_id]; }); }))
      .then(function(){ st.stack=keep; save(); }); }
  function show(){ skyT0=Date.now(); render(); if(view) loadBoard(false); refresh().then(function(){ if(st.joinCode&&signedIn()&&!view) startJoin(st.joinCode); }); if(st.joinCode&&!signedIn()) previewFor(st.joinCode); }

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
  /* ---------- the month's sky: the people are its stars, in the order they joined ---------- */
  var TW=[[30,26,5],[208,24,7],[318,64,6],[260,120,8],[36,210,6.5],[78,350,5.5],[330,170,9],[224,300,7.5]];
  function ringSvg(d,on){
    var s='<svg class="fr-ring" width="44" height="44" viewBox="-22 -22 44 44" aria-hidden="true">'+(on?'<circle r="21" fill="none" stroke="var(--tint)" stroke-width="2"/>':'')+'<circle r="17" fill="var(--fseat)"/>';
    if(d.kind==='full') s+='<circle r="17.5" fill="none" stroke="url(#frRing)" stroke-width="3.8"/>';
    else if(d.kind==='rest') s+='<circle r="17.5" fill="none" stroke="var(--fdash)" stroke-width="2.4" stroke-dasharray="3.4 3.6"/>';
    else if(d.kind==='wedge') s+='<circle r="17.5" fill="none" stroke="var(--ftrk)" stroke-width="3"/>'+(d.fill>0?'<circle r="17.5" fill="none" stroke="url(#frRing)" stroke-width="3.6" stroke-linecap="round" pathLength="100" stroke-dasharray="'+Math.round(d.fill*100)+' 100" transform="scale(-1,1) rotate(-90)"/>':'');
    else s+='<circle r="17.5" fill="none" stroke="var(--ftrk)" stroke-width="2"/>';
    return s+'</svg>'; }
  var FLARE='<svg class="fr-flare" width="60" height="60" viewBox="-30 -30 60 60" aria-hidden="true"><path d="M0 -28C2 -9 9 -2 28 0C9 2 2 9 0 28C-2 9 -9 2 -28 0C-9 -2 -2 -9 0 -28Z" fill="#FFC93C"/></svg>';
  function starHtml(x,pt){
    var d=F.disc(x), on=view.sel===x.user_id, dim=d.kind==='rest'||d.kind==='empty';
    return '<button type="button" class="fr-st'+(on?' on':'')+'" data-act="frstar" data-u="'+esc(x.user_id)+'" style="left:'+(pt[0]-22)+'px;top:'+(pt[1]-22)+'px" aria-pressed="'+on+'" aria-label="'+esc(x.display_name+', '+F.rowText(x,lang()))+'">'+
      (d.kind==='full'?FLARE:'')+ringSvg(d,on)+'<span class="fr-sav'+(dim?' dim':'')+'">'+(AV.html(x.avatar)||AV.html(AV.defaultIcon(x.user_id||'')))+'</span><span class="fr-sl">'+esc(x.display_name)+'</span></button>'; }
  function seatHtml(pt){ return '<button type="button" class="fr-seat" data-act="frinvite" style="left:'+(pt[0]-22)+'px;top:'+(pt[1]-22)+'px" aria-label="'+L('Invite a friend','邀请朋友')+'"><i><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></i></button>'; }
  /* the people in the order they joined: you first, then by when they came (the order the server sends), kept steady from day to day */
  function ordered(rows){
    var seen={}, out=[]; (view.order||[]).forEach(function(u){ seen[u]=1; });
    rows.forEach(function(r){ if(!seen[r.user_id]){ seen[r.user_id]=1; (view.order=view.order||[]).push(r.user_id); } });
    var by={}; rows.forEach(function(r){ by[r.user_id]=r; });
    (view.order||[]).forEach(function(u){ if(by[u]) out.push(by[u]); }); return out; }
  function skyHtml(rows,created){
    var sg=Z.signAt(h.today()), lay=Z.layout(sg,created?24:0); view.sign=sg.k; var  people=ordered(rows), N=people.length, H=created?360:400, pts=lay.slots, seats=pts.slice(N,10);
    var pl=pts.slice(0,N).map(function(p){ return p[0]+','+p[1]; }).join(' '), ds=(N?[pts[N-1]]:[]).concat(seats).map(function(p){ return p[0]+','+p[1]; }).join(' ');
    var off=skyPhase(), look=view.look||'auto';
    var lbl=L(sg.en+' sky. '+N+(N===1?' person is':' people are')+' a star in the pattern'+(seats.length?', '+seats.length+(seats.length===1?' place is':' places are')+' open.':'.'),sg.zh+'星空。'+N+' 人是图案里的星星'+(seats.length?'，还有 '+seats.length+' 个空位。':'。'));
    return '<div class="fr-sky'+(lay.fig?' fig':'')+'" data-look="'+look+'" role="group" aria-label="'+esc(lbl)+'" style="aspect-ratio:358/'+H+'"><div class="fr-skyi" style="height:'+H+'px">'+
      '<div class="fr-tw" aria-hidden="true">'+TW.map(function(t){ return '<i style="left:'+t[0]+'px;top:'+(t[1]-(created?24:0))+'px;animation-duration:'+t[2]+'s"></i>'; }).join('')+'</div>'+
      (lay.fig?'<div class="fr-art" aria-hidden="true" data-art="'+lay.art+'" data-up="'+(created?24:0)+'" style="-webkit-mask-image:url('+lay.art+');mask-image:url('+lay.art+');animation-delay:'+off+(created?';-webkit-mask-size:auto 100%;mask-size:auto 100%;-webkit-mask-position:center;mask-position:center':'')+'"></div>':'')+
      '<svg class="fr-ln" width="358" height="'+H+'" viewBox="0 0 358 '+H+'" aria-hidden="true" style="animation-delay:'+off+'">'+(N>1?'<polyline points="'+pl+'" fill="none" stroke="var(--fcl)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>':'')+(seats.length?'<polyline points="'+ds+'" fill="none" stroke="var(--fcl)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 6"/>':'')+'</svg>'+
      (lay.fig?'<button type="button" class="fr-look" data-act="frlook" aria-label="'+L('Switch between the stars and the figure','在星星和星座图之间切换')+'"></button>':'')+
      people.map(function(x,i){ return starHtml(x,pts[i]); }).join('')+seats.map(seatHtml).join('')+
      '<div class="fr-cap"><b>'+esc(Z.name(sg,lang()))+'</b><span>'+esc(Z.caption(sg,lang()))+'</span></div></div></div>'; }
  /* the star you tapped: name, status, Cheer (the rest of the week is one tap on the name) */
  function selCard(rows){
    var x=rows.filter(function(r){ return r.user_id===view.sel; })[0]; if(!x) return '';
    var ch=cheerable(x)?'<button type="button" class="fr-chb'+(x.cheered_by_me?' done':'')+'" data-act="frcheer" data-u="'+esc(x.user_id)+'" aria-pressed="'+!!x.cheered_by_me+'"'+(x.cheered_by_me?' disabled':'')+'>'+(x.cheered_by_me?L('Cheered','已加油'):L('Cheer','加油'))+'</button>':'';
    return '<div class="fr-sc"><button type="button" class="fr-sct" data-act="frwho" data-u="'+esc(x.user_id)+'">'+av(x.avatar,x.user_id)+'<span class="fr-nm"><b>'+esc(x.display_name)+(x.is_me?'<i>'+L('You','我')+'</i>':'')+'</b><small>'+esc(F.rowText(x,lang()))+'</small></span></button>'+ch+'</div>'; }
  /* a group that is just you: the invite is right there, no need to open a sheet */
  function inviteInline(){
    var inv=view.inv; if(!inv) return '<div class="fr-inv2"><small>'+L('Invite code','邀请码')+'</small><b dir="ltr">…</b></div>';
    return '<div class="fr-inv2"><small>'+L('Invite code','邀请码')+'</small><b dir="ltr">'+F.formatCode(inv.code)+'</b><div class="fr-two"><button class="btn" data-act="frshare">'+L('Share link','分享链接')+'</button><button class="btn sec" id="frCopyPage" data-act="frcopy">'+L('Copy','复制')+'</button></div><p class="note fr-note">'+L('Valid for 7 days. Share it only with people you know.','7 天内有效，请只发给你认识的人。')+'</p></div>'; }
  function groupHtml(){
    var w=view.wk, b=w.b[w.day], n=b?b.length:view.n, body='', created=!!b&&b.length===1;
    var strip=w.days.map(function(k,i){ return '<button type="button" data-act="frday" data-i="'+i+'" aria-pressed="'+(i===w.day)+'" aria-label="'+esc(dayLong(i))+'"><span>'+dow(k)+'</span><b>'+(+k.slice(8,10))+'</b></button>'; }).join('');
    if(b&&created) body=skyHtml(b,true)+inviteInline();
    else if(b) body=skyHtml(b,false)+selCard(b)+'<p class="fr-sum">'+esc(F.summary(b,dayLong(w.day),lang()))+'</p>'+(w.err?'<p class="fr-sum" role="status">'+esc(F.errorText(w.err,lang()))+'</p>':'')+'<div class="fr-card">'+b.map(personRow).join('')+'</div>';
    else if(w.err) body='<p class="fr-wait" role="status">'+esc(F.errorText(w.err,lang()))+'</p><div class="fr-cta"><button class="btn sec" data-act="frretry">'+L('Try again','重试')+'</button></div>';
    else body='<p class="fr-wait" role="status">'+L('Loading…','加载中…')+'</p>';
    var sub=created?L('Just you for now','现在只有你'):personCount(n), fasting=b?F.counts(b).fasting+F.counts(b).reached:0;
    return '<div class="fr-top"><button type="button" class="fr-back" data-act="frback">'+BACK+'<span>'+L('Friends','朋友')+'</span></button></div>'+
      '<div class="fr-t"><div><h1 class="lt fr-name">'+esc(view.name)+'</h1><div class="fr-sub">'+sub+(!created&&b&&w.day===6?' · '+(fasting?L(fasting+' fasting now',fasting+' 人断食中'):L('Quiet today','今天安静')):'')+'</div></div><div class="fr-tools">'+(created?'':'<button type="button" class="fr-inv" data-act="frinvite">'+L('Invite','邀请')+'</button>')+'<button type="button" class="fr-more" data-act="frset" aria-label="'+L('Group settings','小组设置')+'">'+MORE+'</button></div></div>'+
      (created?'':'<div class="fr-days" role="group" aria-label="'+L('Days','日子')+'">'+strip+'</div>')+body;
  }
  /* a group that is just you shows its invite on the page: read it once */
  function ensureInvite(){
    var v=view, b=v&&v.wk.b[v.wk.day]; if(!v||v.inv||v.invBusy||!b||b.length!==1) return; v.invBusy=true;
    CL.rpc('current_invite',{p_gid:v.id}).then(function(r){ var inv=r&&r[0]; v.invBusy=false; if(!inv) return; v.inv=inv; tmp.link=link(inv.code); tmp.name=v.name; if(view===v&&h.tab()==='friends') render(); }).catch(function(){ v.invBusy=false; });
  }
  function openGroup(id){
    var g=st.groups.filter(function(x){ return x.group_id===id; })[0]; if(!g) return;
    var t=h.today(); view={id:id,name:g.name,role:g.role,n:g.member_count,wk:{days:F.weekDays(t),today:t,b:[],day:6,err:'',at:0},busy:false,sel:null,look:'auto',order:[],inv:null};
    skyT0=Date.now(); render(); var el=$('friends'); if(el) el.scrollTop=0; loadBoard(true);
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
      ensureInvite();
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
  /* the sky follows the date: when the day rolls over into another sign (midnight, or coming back to the app the next day), the whole sky changes at once */
  function checkSign(){ if(Z&&view&&view.sign&&h.tab()==='friends'&&Z.signAt(h.today()).k!==view.sign){ skyT0=Date.now(); render(); } }
  function tick(){
    if(document.hidden||!enabled()||!signedIn()) return; checkSign(); publish(false);
    if(h.tab()==='friends'&&!document.querySelector('#sheet.open')){ if(view) loadBoard(false); else refresh(); }
  }
  setInterval(tick,F.POLL_MS);
  document.addEventListener('visibilitychange',function(){ if(!document.hidden) tick(); });
  window.addEventListener('focus',tick); window.addEventListener('pageshow',tick);
  /* and exactly at the next local midnight, when the app is open */
  function toMidnight(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()+1,0,0,1,0)-d; }
  (function midnight(){ setTimeout(function(){ tick(); midnight(); },toMidnight()+300); })();

  /* ---------- sheets ---------- */
  function fail(e){ h.toast(F.errorText(F.errorKey(e),lang())); }
  function signInSheet(){
    h.openSheet('<h3>'+L('Sign in','登录')+'</h3><p class="lede">'+L('Only Friends needs an account.','只有朋友功能需要账号。')+'</p><div class="btns"><button class="btn gbtn" data-act="google">'+h.GICON+'<span>'+L('Continue with Google','用 Google 继续')+'</span></button><button class="btn sec" data-act="emailsheet">'+L('Continue with email','用邮箱继续')+'</button></div>');
  }
  /* your name in groups: never taken from the email address, and the only free text friends ever see */
  function nameSheet(next){
    tmp.next=next; tmp.av=(st.profile&&st.profile.avatar)||tmp.av||AV.defaultIcon((CL.getAuth()||{}).uid||''); if(F.AVATARS.indexOf(tmp.av)<0) tmp.av=F.AVATARS[0];
    var nm=(st.profile&&st.profile.display_name)||S().name||'', g='';
    F.AVATARS.forEach(function(id){ var a=AV.find(id); g+='<button type="button" class="avt'+(id===tmp.av?' sel':'')+'" data-act="frav" data-id="'+id+'" aria-pressed="'+(id===tmp.av)+'" aria-label="'+esc(a?L(a.en,a.zh):id)+'">'+AV.html(id)+'</button>'; });
    h.openSheet('<h3 class="fr-sh">'+L('Your name in groups','你在小组里的名字')+'</h3><div class="group"><div class="field"><label for="frName">'+L('Name','名字')+'</label><input id="frName" type="text" maxlength="'+F.NAME_MAX+'" autocomplete="off" autocapitalize="words" spellcheck="false" value="'+esc(nm)+'" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div>'+
      '<div class="av-grid fr4" id="frAvs" role="group" aria-label="'+L('Sky picture','天空头像')+'">'+g+'</div><div class="btns"><button class="btn" data-act="frnamego">'+L('Continue','继续')+'</button></div>');
    var i=$('frName'); if(i&&!nm) setTimeout(function(){ try{ i.focus(); }catch(e){} },350);
  }
  function newSheet(){
    if(!st.profile) return nameSheet(newSheet);
    h.openSheet('<h3 class="fr-sh">'+L('New group','新建小组')+'</h3><div class="group"><div class="field"><label for="frGn">'+L('Group name','小组名称')+'</label><input id="frGn" type="text" maxlength="'+F.GROUP_NAME_MAX+'" autocomplete="off" spellcheck="false" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div>'+
      '<p class="note">'+L('Up to 10 people.','最多 10 人。')+'</p><div class="btns"><button class="btn" data-act="frcreate">'+L('Create and invite','创建并邀请')+'</button></div>');
    var i=$('frGn'); if(i) setTimeout(function(){ try{ i.focus(); }catch(e){} },350);
  }
  function link(code){ return F.joinLink(location.origin+location.pathname,code); }
  /* the invite: link, code or QR (the code and QR cover people in the same room, or a chat app that blocks links) */
  function inviteSheet(gid,name){
    h.openSheet('<h3>'+L('Invite friends','邀请朋友')+'</h3><p class="note" id="frInv">…</p>');
    CL.rpc('current_invite',{p_gid:gid}).then(function(r){ var inv=r&&r[0]; if(!inv){ h.closeSheet(); return h.toast(F.errorText('no_invite',lang())); }
      var u=link(inv.code); tmp.link=u; tmp.name=name;
      h.openSheet('<h3 class="fr-sh">'+L('Invite friends','邀请朋友')+'</h3><div class="fr-qr" role="img" aria-label="'+L('QR code for the invite','邀请二维码')+'">'+QR.svg(u,0)+'</div><div class="fr-code"><small>'+L('Invite code','邀请码')+'</small><b dir="ltr">'+F.formatCode(inv.code)+'</b></div>'+
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
  A.frcopy=function(btn){ var u=tmp.link; if(!u) return; copy(u).then(function(){ var b=btn&&btn.isConnected?btn:$('frCopy'); if(b){ b.textContent=L('Copied','已复制'); setTimeout(function(){ if(b.isConnected) b.textContent=L('Copy','复制'); },1600); } h.fx('light'); }).catch(function(){ h.toast(L('Couldn’t copy. Select the code instead.','复制失败，请直接记下邀请码。')); }); };


  /* ---------- one person, group settings, leaving ---------- */
  function whoSheet(uid){
    var w=view.wk, x=rowOf(uid,w.day)||rowOf(uid,6); if(!x) return;
    var strip=''; for(var i=0;i<7;i++){ var y=rowOf(uid,i); strip+='<div>'+disc(y?F.disc(y):{kind:'empty',fill:0},28)+'<span>'+dow(w.days[i])+'</span></div>'; }
    var ch='', links='';
    if(cheerable(x)) ch='<div class="btns"><button class="btn'+(x.cheered_by_me?' sec':'')+'" data-act="frcheer" data-u="'+esc(uid)+'" aria-pressed="'+!!x.cheered_by_me+'"'+(x.cheered_by_me?' disabled':'')+'>'+(x.cheered_by_me?L('Cheered','已加油'):L('Cheer ','给')+esc(x.display_name)+L('','加油'))+'</button></div>';
    if(!x.is_me){ links='<div class="fr-sheet-links"><div class="group"><button class="row" data-act="frreport" data-u="'+esc(uid)+'">'+mi(ICON_FLAG,'grey')+'<span>'+L('Report','举报')+'</span></button>'+(view.role==='owner'?'<button class="row red" data-act="frremove" data-u="'+esc(uid)+'">'+mi(ICON_EXIT,'red')+'<span>'+L('Remove from group','移出小组')+'</span></button>':'')+'</div></div>'; }
    h.openSheet('<h3>'+esc(x.display_name)+'</h3><div id="frWho" data-u="'+esc(uid)+'"><div class="fr-who">'+av(x.avatar,uid)+'<span class="fr-nm"><small>'+esc(dayLong(w.day)+' · '+F.rowText(x,lang()))+'</small></span>'+disc(F.disc(x),44)+'</div>'+
      '<p class="fr-lbl">'+L('Last 7 days','过去 7 天')+'</p><div class="fr-wk">'+strip+'</div>'+ch+links+'</div>');
  }
  function confirmSheet(titleT,lede,go,goLabel){
    h.openSheet('<!--keep--><h3 class="ctr">'+titleT+'</h3><p class="lede ctr">'+lede+'</p><div class="btns"><button class="btn dark" data-act="close">'+L('Cancel','取消')+'</button><button class="btn red solid" data-act="'+go+'">'+goLabel+'</button></div>');
  }
  function mi(d,tone){ return '<span class="mi '+tone+'" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="'+d+'"/></svg></span>'; }
  var ICON_PLUS='M12 5v14M5 12h14', ICON_PEN='M4 20h4L19 9l-4-4L4 16zM13 7l4 4', ICON_FLAG='M5 21V4M5 4h11l-2 4 2 4H5', ICON_EXIT='M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10';
  function memRow(m){ var tag=[m.is_me?L('You','我'):'',m.role==='owner'?L('Owner','群主'):''].filter(Boolean).join(' · ');
    return '<div class="fr-mem">'+av(m.avatar,m.user_id)+'<span class="fr-nm"><b>'+esc(m.display_name)+'</b></span><em>'+esc(tag)+'</em></div>'; }
  function settingsSheet(){
    var v=view; h.openSheet('<h3>'+esc(v.name)+'</h3><p class="note">…</p>');
    CL.rpc('group_roster',{p_gid:v.id}).then(function(r){ r=r||[]; var me=r.filter(function(m){ return m.is_me; })[0]; tmp.sharing=!me||me.sharing!==false; v.n=r.length;
      h.openSheet('<h3 class="fr-sh">'+esc(v.name)+'</h3><div class="group">'+r.map(memRow).join('')+'</div>'+
        '<div class="group"><div class="row"><span>'+L('Share my status','分享我的状态')+'</span><button class="sw" role="switch" aria-checked="'+tmp.sharing+'" aria-label="'+L('Share my status','分享我的状态')+'" data-act="frsharing"></button></div></div><div class="gf">'+L('When it’s off, this group sees you as resting.','关闭后，这个小组会看到你在休息。')+'</div>'+
        '<div class="group"><button class="row" data-act="frinvite">'+mi(ICON_PLUS,'gold')+'<span>'+L('Invite friends','邀请朋友')+'</span>'+CHEV+'</button>'+(v.role==='owner'?'<button class="row" data-act="frrename">'+mi(ICON_PEN,'grey')+'<span>'+L('Rename group','重命名小组')+'</span>'+CHEV+'</button>':'')+'</div>'+
        '<div class="group"><button class="row red" data-act="frleave">'+mi(ICON_EXIT,'red')+'<span>'+L('Leave group','退出小组')+'</span></button></div>');
    }).catch(function(e){ h.closeSheet(); fail(e); });
  }
  function afterChange(){ loading=false; refresh(); return loadBoard(true); }

  A.frgroup=function(b){ h.fx('light'); openGroup(b.dataset.id); };
  A.frback=function(){ view=null; h.fx('light'); render(); refresh(); };
  A.frretry=function(){ view.wk.err=''; render(); loadBoard(true); };
  A.frday=function(b){ var i=+b.dataset.i; if(!(i>=0&&i<=6)) return; view.wk.day=i; h.fx('select'); render(); var on=document.querySelector('#friends .fr-days [aria-pressed="true"]'); if(on) on.focus({preventScroll:true}); if(!view.wk.b[i]) loadBoard(false); };
  A.frstar=function(b){ var u=b.dataset.u; view.sel=view.sel===u?null:u; h.fx('select'); render(); var on=document.querySelector('#friends .fr-st.on'); if(on) on.focus({preventScroll:true}); };
  A.frlook=function(){ var sky=document.querySelector('#friends .fr-sky'), cur=view.look==='auto'?(reduceMotion()?'lines':'auto'):view.look; view.look=cur==='art'?'lines':'art'; h.fx('light'); if(sky) sky.setAttribute('data-look',view.look); };
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
  A.frrename=function(){ h.openSheet('<h3 class="fr-sh">'+L('Rename group','重命名小组')+'</h3><div class="group"><div class="field"><label for="frRn">'+L('Group name','小组名称')+'</label><input id="frRn" type="text" maxlength="'+F.GROUP_NAME_MAX+'" autocomplete="off" spellcheck="false" value="'+esc(view.name)+'" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem"></div></div><div class="btns"><button class="btn" data-act="frrenamego">'+L('Save','保存')+'</button></div>'); };
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


  /* ---------- joining: a code typed in, or a link opened ----------
     Look first (invite_preview works without an account, so a friend sees which group before signing in), then a sheet that says plainly what the group will see, then join. */
  function previewFor(code){
    if(tmp.prev&&tmp.prev.code===code) return Promise.resolve(tmp.prev.row);
    return CL.rpcAnon('invite_preview',{p_code:code}).then(function(r){ var row=r&&r[0]||null; tmp.prev={code:code,row:row}; if(!row&&st.joinCode===code){ st.joinCode=''; save(); h.toast(F.errorText('invalid',lang())); } if(h.tab()==='friends') render(); return row; })
      .catch(function(e){ if(F.errorKey(e)==='offline'&&h.tab()==='friends') h.toast(F.errorText('offline',lang())); return null; });
  }
  function startJoin(code){
    st.joinCode=code; save(); h.closeSheet();
    previewFor(code).then(function(row){
      if(!row){ if(!st.joinCode) return; st.joinCode=''; save(); return h.toast(F.errorText('invalid',lang())); }
      consentSheet(code,row);
    });
  }
  function consentSheet(code,g){
    tmp.joinCode=code; var n=g.member_count, dots=(g.avatars||[]).map(function(a,i){ return '<span class="fr-av" style="margin-left:'+(i?'-8px':'0')+'">'+(AV.html(a)||AV.html(F.AVATARS[0]))+'</span>'; }).join('');
    h.openSheet('<!--keep--><h3 class="ctr">'+L('Join “','加入“')+esc(g.group_name)+L('”?','”？')+'</h3><div class="fr-faces" aria-hidden="true">'+dots+'</div>'+
      '<p class="lede ctr">'+(g.inviter_name?L('Invited by ','邀请人 ')+esc(g.inviter_name)+' · ':'')+L(n+' of '+F.MAX_MEMBERS+' people',n+' / '+F.MAX_MEMBERS+' 人')+'</p>'+
      '<div class="group fr-sees"><div class="fr-see"><b>'+L('The group sees','小组能看到')+'</b><span>'+L('Your name and sky picture, whether you are fasting, resting or not, and your plan in hours.','你的名字和头像、你是否在断食或休息，以及你的计划小时数。')+'</span></div>'+
      '<div class="fr-see"><b>'+L('The group never sees','小组看不到')+'</b><span>'+L('Hours fasted, times, where you are, your weight, or a streak.','已断食的时长、时间、你的位置、体重或连续天数。')+'</span></div></div>'+
      '<p class="note ctr">'+L('You can stop sharing or leave any time.','你可以随时停止分享或退出。')+'</p>'+
      '<div class="btns"><button class="btn" data-act="frjoinok">'+L('Join group','加入小组')+'</button><button class="btn quiet" data-act="frjoinno">'+L('Not now','暂不加入')+'</button></div>');
  }
  function codeSheet(err){
    h.openSheet('<h3>'+L('Invite code','邀请码')+'</h3><p class="lede">'+L('Type the 8 characters a friend sent you.','输入朋友发给你的 8 位邀请码。')+'</p><div class="group"><div class="field"><label for="frCode">'+L('Code','邀请码')+'</label><input id="frCode" type="text" inputmode="text" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="K7QM 4XD9" dir="ltr" style="flex:2;min-width:0;border:0;background:var(--fill);border-radius:8px;min-height:36px;padding:0 10px;text-align:right;color:var(--label);font:inherit;font-size:1rem;letter-spacing:.08em;text-transform:uppercase"></div></div>'+
      (err?'<p class="note err" role="alert" style="color:var(--red)">'+esc(err)+'</p>':'')+'<div class="btns"><button class="btn" data-act="frcodego">'+L('Continue','继续')+'</button>'+(canScan()?'<button class="btn sec" data-act="frscan">'+L('Scan QR code','扫描二维码')+'</button>':'')+'</div>');
    var i=$('frCode'); if(i) setTimeout(function(){ try{ i.focus(); }catch(e){} },350);
  }
  /* ---------- scanning a QR code ----------
     The camera starts only when "Scan QR code" is tapped (the browser or phone asks first). Each picture is looked at on the phone and thrown away: nothing is recorded, saved or sent.
     The decoder (js/vendor/jsQR.js, Apache-2.0) loads only now, so people who never scan never download it. */
  var scanId=0, decoder=null;
  function canScan(){ return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia); }
  function loadDecoder(){
    if(root.jsQR) return Promise.resolve(root.jsQR);
    if(decoder) return decoder;
    decoder=new Promise(function(ok,no){ var sc=document.createElement('script'); sc.src='js/vendor/jsQR.js'; sc.onload=function(){ root.jsQR?ok(root.jsQR):no(new Error('no decoder')); }; sc.onerror=function(){ decoder=null; no(new Error('no decoder')); }; document.head.appendChild(sc); });
    return decoder;
  }
  /* an invite link or a bare code, whatever the QR holds */
  function codeFromScan(text){ text=String(text||'').trim(); var i=text.indexOf('?'); var c=i>=0?F.codeFromSearch(text.slice(i)):''; if(c) return c; return F.validCode(text)?F.normalizeCode(text):''; }
  function scanNote(t,bad){ var n=$('frScanNote'); if(n){ n.textContent=t; n.classList.toggle('err',!!bad); } }
  function stopStream(v){ try{ var st=v&&v.srcObject; if(st) st.getTracks().forEach(function(t){ t.stop(); }); if(v) v.srcObject=null; }catch(e){} }
  function scanSheet(){
    h.openSheet('<h3>'+L('Scan QR code','扫描二维码')+'</h3><div class="fr-scan"><video id="frScan" playsinline muted autoplay aria-label="'+L('Camera view','相机画面')+'"></video><i class="fr-sq" aria-hidden="true"></i></div><p class="note ctr" id="frScanNote" role="status">'+L('Point the camera at the QR code on your friend’s phone. Nothing is recorded or saved.','把相机对准朋友手机上的二维码。不会录像，也不会保存任何内容。')+'</p>'+
      '<div class="btns"><button class="btn quiet" data-act="frcode">'+L('Type the code instead','改为输入邀请码')+'</button></div>');
    var id=++scanId, v=$('frScan'), cv=document.createElement('canvas'), cx=cv.getContext('2d',{willReadFrequently:true}), bad=0;
    function alive(){ return id===scanId&&$('frScan')===v&&!!document.querySelector('#sheet.open'); }
    function fail(msg){ scanNote(msg,true); }
    Promise.all([loadDecoder(),navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})]).then(function(r){
      var read=r[0], stream=r[1]; if(!alive()){ stream.getTracks().forEach(function(t){ t.stop(); }); return; }
      v.srcObject=stream; var pl=v.play(); if(pl&&pl.catch) pl.catch(function(){});
      (function look(){
        if(!alive()){ stopStream(v); return; }
        if(v.readyState>=2&&v.videoWidth){ var k=Math.min(1,480/v.videoWidth), w=Math.round(v.videoWidth*k), hh=Math.round(v.videoHeight*k); cv.width=w; cv.height=hh; cx.drawImage(v,0,0,w,hh);
          var q=read(cx.getImageData(0,0,w,hh).data,w,hh,{inversionAttempts:'dontInvert'}), c=q&&codeFromScan(q.data);
          if(c){ stopStream(v); scanId++; h.fx('success'); return previewFor(c).then(function(row){ if(row) consentSheet(c,row); else{ st.joinCode=''; save(); codeSheet(F.errorText('invalid',lang())); } }); }
          if(q&&q.data&&!bad){ bad=1; scanNote(L('That isn’t a Lightly invite.','这不是轻伴的邀请。'),true); setTimeout(function(){ bad=0; scanNote(L('Point the camera at the QR code on your friend’s phone. Nothing is recorded or saved.','把相机对准朋友手机上的二维码。不会录像，也不会保存任何内容。'),false); },2200); }
        }
        setTimeout(look,140);
      })();
    }).catch(function(e){ stopStream(v); var denied=e&&/NotAllowed|Permission|Security/i.test(e.name+' '+e.message);
      fail(denied?L('Camera access is off. You can allow it in your browser settings, or type the code instead.','相机权限已关闭。可以在浏览器设置里允许，或改为输入邀请码。'):L('Couldn’t start the camera. Type the code instead.','无法启动相机，请改为输入邀请码。')); });
  }
  A.frscan=function(){ h.fx('light'); scanSheet(); };
  A.frcode=function(){ if(st.groups.length>=F.MAX_GROUPS) return h.toast(F.errorText('group_cap',lang())); h.fx('light'); codeSheet(); };
  A.frcodego=function(b){ var c=F.normalizeCode(($('frCode')||{}).value); if(!F.validCode(c)) return codeSheet(F.errorText('invalid',lang())); if(b.disabled) return; b.disabled=true;
    previewFor(c).then(function(row){ b.disabled=false; if(!row){ st.joinCode=''; return codeSheet(F.errorText('invalid',lang())); } consentSheet(c,row); }); };
  A.frjoinno=function(){ st.joinCode=''; save(); h.closeSheet(); if(h.tab()==='friends') render(); };
  A.frjoinok=function(b){ var code=tmp.joinCode; if(!code||b.disabled) return; if(!st.profile) return nameSheet(function(){ previewFor(code).then(function(row){ if(row) consentSheet(code,row); }); });
    b.disabled=true;
    CL.rpc('join_group',{p_code:code}).then(function(r){ var x=r&&r[0]||{status:'invalid'}; b.disabled=false;
      if(x.status==='ok'||x.status==='already'){ st.joinCode=''; tmp.prev=null; save(); h.closeSheet(); h.fx('success'); if(h.tab()!=='friends') h.showTab('friends'); loading=false; return refresh().then(function(){ openGroup(x.group_id); publish(true); }); }
      if(x.status==='no_profile'){ st.profile=null; return nameSheet(function(){ previewFor(code).then(function(row){ if(row) consentSheet(code,row); }); }); }
      if(x.status!=='too_many'&&x.status!=='cap'){ st.joinCode=''; tmp.prev=null; save(); }
      h.closeSheet(); h.toast(F.errorText(x.status,lang())); if(h.tab()==='friends') render();
    }).catch(function(e){ b.disabled=false; fail(e); }); };
  /* the app calls this once it has started (and after a sign-in lands): a waiting invite opens Friends, or, right after setup, just says it is waiting */
  function pending(quiet){
    if(!st.joinCode) return false;
    if(!F.available(S().profile)){ st.joinCode=''; save(); return false; }
    sync();
    if(quiet){ h.toast(L('Your invite is waiting in Friends.','你的邀请在“朋友”里等你。')); return true; }
    h.showTab('friends',true); return true;
  }

  sync();
  return {pending:pending,joinCode:function(){ return st.joinCode||''; },enabled:enabled,order:order,sync:sync,changed:changed,publish:publish,show:show,render:render,ICON:ICON_PEOPLE,state:function(){ return st; }};
}
root.LightlyFriendsUI={init:init};
})(typeof self!=='undefined'?self:this);
