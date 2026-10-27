/* Lightly cloud: email sign-in (one-time code or magic link) and backup, straight against Supabase's REST API. No SDK. */
(function(root){
'use strict';
var AK='lightly:auth';
function cfg(){ return root.LIGHTLY_CLOUD||{}; }
function ready(){ var c=cfg(); return !!(c.url&&c.key); }

/* ---------- merge two copies of the app state (pure, tested in Node) ----------
   Fasts are unioned by id; deleted ids (S.del) win; everything else comes from the copy changed most recently. */
function merge(a,b){
  var newer=(a.mod||0)>=(b.mod||0)?a:b, older=newer===a?b:a, out=JSON.parse(JSON.stringify(older)), k, n=JSON.parse(JSON.stringify(newer));
  for(k in n) out[k]=n[k];
  var del={}; (a.del||[]).concat(b.del||[]).forEach(function(id){del[id]=1;}); out.del=Object.keys(del);
  var byId={}; (older.fasts||[]).concat(newer.fasts||[]).forEach(function(f){ if(!del[f.id]) byId[f.id]=f; });
  out.fasts=Object.keys(byId).map(function(i){return byId[i];}).sort(function(x,y){return x.start-y.start;});
  var used={}; ((a.flex||{}).used||[]).concat((b.flex||{}).used||[]).forEach(function(d){used[d]=1;});
  out.flex=Object.assign({},n.flex||{}); out.flex.used=Object.keys(used).sort();
  var sa=[a.startedAt,b.startedAt].filter(Boolean); out.startedAt=sa.length?Math.min.apply(null,sa):null;
  out.unwell=Math.max(a.unwell||0,b.unwell||0)||null;
  var un={}; [a.unlocked||{},b.unlocked||{}].forEach(function(u){ for(var x in u) un[x]=un[x]?Math.min(un[x],u[x]):u[x]; }); out.unlocked=un;
  out.mod=Math.max(a.mod||0,b.mod||0);
  return out;
}

/* ---------- session ---------- */
function getAuth(){ try{ return JSON.parse(localStorage.getItem(AK)); }catch(e){ return null; } }
function setAuth(a){ try{ if(a) localStorage.setItem(AK,JSON.stringify(a)); else localStorage.removeItem(AK); }catch(e){} }
function toAuth(r){ return {access:r.access_token,refresh:r.refresh_token,exp:Math.floor(Date.now()/1000)+(r.expires_in||3600),email:(r.user&&r.user.email)||'',uid:(r.user&&r.user.id)||''}; }
function call(path,o){ o=o||{}; var c=cfg(), h={apikey:c.key,'Content-Type':'application/json'}; if(o.token) h.Authorization='Bearer '+o.token; else h.Authorization='Bearer '+c.key; for(var k in (o.headers||{})) h[k]=o.headers[k];
  return fetch(c.url.replace(/\/$/,'')+path,{method:o.method||'GET',headers:h,body:o.body?JSON.stringify(o.body):undefined}).then(function(r){ return r.text().then(function(t){ var j=null; try{ j=t?JSON.parse(t):null; }catch(e){} if(!r.ok){ var m=(j&&(j.msg||j.error_description||j.message||j.error))||('HTTP '+r.status); var e=new Error(m); e.status=r.status; throw e; } return j; }); }); }
function sendCode(email){ return call('/auth/v1/otp?redirect_to='+encodeURIComponent(location.origin+location.pathname),{method:'POST',body:{email:email,create_user:true}}); }
function verify(email,code){ return call('/auth/v1/verify',{method:'POST',body:{type:'email',email:email,token:String(code).replace(/\s/g,'')}}).then(function(r){ var a=toAuth(r); setAuth(a); return a; }); }
/* returning from a magic link: the tokens arrive in the URL hash */
function fromHash(){
  var h=location.hash.replace(/^#/,''); if(h.indexOf('access_token=')<0) return Promise.resolve(null);
  var p={}; h.split('&').forEach(function(x){ var i=x.indexOf('='); p[x.slice(0,i)]=decodeURIComponent(x.slice(i+1)); });
  try{ history.replaceState(null,'',location.pathname+location.search); }catch(e){}
  return call('/auth/v1/user',{token:p.access_token}).then(function(u){ var a=toAuth({access_token:p.access_token,refresh_token:p.refresh_token,expires_in:+p.expires_in||3600,user:u}); setAuth(a); return a; });
}
function token(){
  var a=getAuth(); if(!a) return Promise.reject(new Error('signed out'));
  if(a.exp-60>Date.now()/1000) return Promise.resolve(a.access);
  return call('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:a.refresh}}).then(function(r){ var n=toAuth(r); n.email=n.email||a.email; n.uid=n.uid||a.uid; setAuth(n); return n.access; }).catch(function(e){ if(e.status===400||e.status===401) setAuth(null); throw e; });
}
function signOut(){ var a=getAuth(); setAuth(null); if(a&&ready()) call('/auth/v1/logout',{method:'POST',token:a.access}).catch(function(){}); }

/* ---------- backup ---------- */
function pull(){ return token().then(function(t){ return call('/rest/v1/lightly_state?select=data,updated_at',{token:t}); }).then(function(rows){ return rows&&rows[0]||null; }); }
function push(data){ var a=getAuth(); return token().then(function(t){ return call('/rest/v1/lightly_state?on_conflict=user_id',{method:'POST',token:t,headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:{user_id:a.uid,data:data,updated_at:new Date().toISOString()}}); }); }

root.LightlyCloud={ready:ready,merge:merge,getAuth:getAuth,sendCode:sendCode,verify:verify,fromHash:fromHash,signOut:signOut,pull:pull,push:push};
if(typeof module!=='undefined'&&module.exports) module.exports=root.LightlyCloud;
})(typeof self!=='undefined'?self:this);
