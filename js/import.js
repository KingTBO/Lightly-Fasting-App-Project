/* Lightly import: reads fasting history exported from other apps. Pure functions, no DOM; everything runs on the device. */
(function(root){
'use strict';
var H=3600000, MAXH=72;

function ts(v){ if(typeof v==='number') return v>1e12?v:v>1e9?v*1000:NaN; if(typeof v!=='string') return NaN; var s=v.trim(); if(!s) return NaN;
  if(/^\d{10,13}$/.test(s)) return ts(+s);
  s=s.replace(/^(\d{4}-\d\d-\d\d) (\d)/,'$1T$2').replace(/(\.\d{3})\d+/,'$1');
  if(/^\d{4}-\d\d-\d\dT\d\d:\d\d(:\d\d(\.\d+)?)?$/.test(s)) return new Date(s).getTime(); /* no zone: device local time */
  var t=Date.parse(s); return isFinite(t)?t:NaN; }

function arr(a){ return Array.isArray(a)?a:[]; }

/* Zero: the export has firestore.json (fasts[].data) and biodata.json (fast_data[]); both list the same fasts. */
function fromZero(j){
  var items=[], open=0;
  if(j&&Array.isArray(j.fasts)&&j.fasts.length&&j.fasts[0]&&j.fasts[0].data){
    j.fasts.forEach(function(r){ var d=r.data||{}, s=ts(d.start), e=ts(d.endWithSeconds||d.end);
      if(d.isEnded===false||!isFinite(e)){ open++; return; }
      items.push({id:'zero:'+(d.id||r.id),start:s,end:e,goalH:d.goal&&d.goal.hours}); });
    return {source:'Zero',items:items,open:open};
  }
  if(j&&Array.isArray(j.fast_data)){
    j.fast_data.forEach(function(r){ var s=ts(r.StartDTM), e=ts(r.EndDTM);
      if(r.IsEnded===false){ open++; return; }
      items.push({id:'zero:'+r.FastID,start:s,end:e,goalH:r.GoalHours}); });
    return {source:'Zero',items:items,open:open};
  }
  return null;
}

/* Lightly's own export, so a backup file can be restored on another phone. */
function fromLightly(j){
  if(!j||!Array.isArray(j.fasts)||!j.fasts.length||typeof j.fasts[0].start!=='number') return null;
  return {source:'Lightly',items:j.fasts.map(function(f){ return {id:f.id,start:f.start,end:f.end,goalH:f.goalH}; }),open:0};
}

/* Any other app: a JSON list or CSV with start and end columns. */
var KS=/^(start|started|startedat|starttime|startdate|starttimestamp|begin|from|faststart|startdtm)$/, KE=/^(end|ended|endedat|endtime|enddate|endtimestamp|stop|stopped|finish|finished|to|fastend|enddtm)$/, KG=/^(goal|goalhours|goalh|target|targethours|hours|plan|durationgoal)$/, KID=/^(id|fastid|uuid)$/;
function norm(k){ return String(k).toLowerCase().replace(/[^a-z0-9]/g,''); }
function pick(o,re){ for(var k in o) if(re.test(norm(k))) return o[k]; }
function fromRows(rows,source){
  var items=[], open=0, seen=0;
  rows.forEach(function(o){ if(!o||typeof o!=='object') return; var sv=pick(o,KS), ev=pick(o,KE); if(sv==null) return; seen++;
    var s=ts(sv), e=ts(ev); if(!isFinite(e)){ open++; return; }
    var g=pick(o,KG); g=typeof g==='string'?parseFloat(g):g; var id=pick(o,KID);
    items.push({id:id!=null&&id!==''?String(source)+':'+id:null,start:s,end:e,goalH:g}); });
  return seen?{source:source,items:items,open:open}:null;
}
function csv(text){
  var rows=[], row=[], f='', q=false, i=0, c;
  if(text.charCodeAt(0)===0xFEFF) text=text.slice(1);
  var first=text.split(/\r?\n/,1)[0], d=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':((first.match(/\t/g)||[]).length>(first.match(/,/g)||[]).length?'\t':',');
  for(;i<text.length;i++){ c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
    else if(c==='"') q=true;
    else if(c===d){ row.push(f); f=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); f=''; if(row.length>1||row[0]!=='') rows.push(row); row=[]; }
    else f+=c; }
  if(f!==''||row.length){ row.push(f); rows.push(row); }
  if(rows.length<2) return [];
  var head=rows[0];
  return rows.slice(1).map(function(r){ var o={}; head.forEach(function(h,k){ o[h]=r[k]; }); return o; });
}

/* text -> {source, items:[{id,start,end,goalH}], open} or {error} */
function parse(text){
  var t=String(text||'').trim(), j=null, r=null;
  if(!t) return {error:'empty'};
  if(t[0]==='{'||t[0]==='['){
    try{ j=JSON.parse(t); }catch(e){ return {error:'json'}; }
    r=fromZero(j)||fromLightly(j);
    if(!r){ var list=Array.isArray(j)?j:(j&&(j.fasts||j.fast_data||j.data||j.records||j.items)); r=fromRows(arr(list),'import'); }
  }else r=fromRows(csv(t),'import');
  return r||{error:'format'};
}

/* Decide what goes in. `have` is the state's fasts, `cur` an open fast, `gone` ids the user deleted. */
function plan(res,have,cur,gone,now){
  var out={source:res.source,add:[],dup:0,overlap:0,bad:0,open:res.open||0,future:0,first:null,last:null};
  var ids={}, del={}; arr(have).forEach(function(f){ ids[f.id]=1; }); arr(gone).forEach(function(g){ del[g]=1; });
  var taken=arr(have).map(function(f){ return [f.start,f.end]; });
  if(cur) taken.push([cur.start,Infinity]);
  res.items.slice().sort(function(a,b){ return a.start-b.start; }).forEach(function(it){
    var s=it.start, e=it.end;
    if(!isFinite(s)||!isFinite(e)||e-s<10*60000||(e-s)/H>MAXH){ out.bad++; return; }
    if(e>now+60000){ out.future++; return; }
    if((it.id&&(ids[it.id]||del[it.id]))){ out.dup++; return; }
    for(var i=0;i<taken.length;i++){ if(s<taken[i][1]&&e>taken[i][0]){ /* same fast already logged by hand or by an earlier import: starts within 30 min counts as the same fast */
      if(Math.abs(s-taken[i][0])<30*60000) out.dup++; else out.overlap++; return; } }
    taken.push([s,e]);
    var g=Math.round(+it.goalH); if(!(g>=1&&g<=36)) g=Math.max(1,Math.min(36,Math.round((e-s)/H)));
    out.add.push({id:it.id||('imp:'+s),start:s,end:e,goalH:g,plan:g>=24?String(g):g===16?'16':'custom'});
    if(out.first==null||s<out.first) out.first=s; if(out.last==null||e>out.last) out.last=e;
  });
  return out;
}

var api={parse:parse,plan:plan,ts:ts,csv:csv};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyImport=api;
})(typeof self!=='undefined'?self:this);
