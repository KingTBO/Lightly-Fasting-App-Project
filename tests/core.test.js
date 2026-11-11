const C=require('../js/core.js');const assert=require('assert');
const H=C.H,D=C.D;
// sun times: Shanghai late Oct, sunrise ~6:10, sunset ~16:55
const pi=C.placeInfo({key:'shanghai'},Date.UTC(2026,9,27,4));const s=C.sunTimes(pi,Date.UTC(2026,9,27,4));
assert(s.rise>5.8&&s.rise<6.6,'rise '+s.rise);assert(s.set>16.6&&s.set<17.4,'set '+s.set);
assert(C.moonAmt(2,s)===1&&C.moonAmt(12,s)===0);
// fajr before sunrise
assert(C.fajrHour(pi,Date.UTC(2026,9,27,4))<s.rise);
// streak with flex
const now=new Date(2026,9,27,10).getTime();
const mk=(daysAgo,h=16)=>{const e=new Date(2026,9,27-daysAgo,12).getTime();return{id:'x'+daysAgo,start:e-h*H,end:e,goalH:16}};
const fasts=[mk(1),mk(2),mk(4),mk(5)];
assert.strictEqual(C.streak(fasts,[],now),2);
assert.strictEqual(C.streak(fasts,[C.dayKey(new Date(2026,9,24).getTime())],now),4);
assert.strictEqual(C.dayStatus(C.dayKey(fasts[0].end),fasts,[]),'done');
// time off: break days keep the streak, ended early stops before the end day
const o1={id:'o',kind:'travel',start:new Date(2026,9,24,9).getTime(),days:1};
assert.deepStrictEqual(C.offKeys([o1]),['2026-10-24']);
assert.strictEqual(C.streak(fasts,C.offKeys([o1]),now),4);
assert.strictEqual(C.dayStatus('2026-10-24',fasts,[],C.offKeys([o1])),'off');
const o2={id:'p',kind:'unwell',start:new Date(2026,9,20,9).getTime(),days:14,endedAt:new Date(2026,9,23,9).getTime()};
assert.deepStrictEqual(C.offKeys([o2]),['2026-10-20','2026-10-21','2026-10-22']);
assert.strictEqual(C.offActive([o2],now),null);
const o3={id:'q',kind:'unwell',start:new Date(2026,9,25,9).getTime(),days:14};
assert.strictEqual(C.offActive([o3],now).id,'q');assert.strictEqual(C.offDayNo(o3,now),3);
// long fast unlock: people who have fasted before get 24 h and 36 h at once, with advice instead of waits
const prof={fastedBefore:true,safety:false};
const st={fasts:[],unwell:null,unlocked:{}};
let r=C.longStatus(24,prof,st,now);
assert.strictEqual(r.st,'ok');assert.strictEqual(r.exp,true);assert.strictEqual(r.note,null);
assert.strictEqual(C.longStatus(36,prof,st,now).st,'ok','36 h too, with no 24 h fast on record');
assert.strictEqual(C.longStatus(24,{fastedBefore:true,safety:true},st,now).st,'hidden','Care mode hides both');
assert.strictEqual(C.longStatus(36,{fastedBefore:true,safety:true},st,now).st,'hidden');
// the advice: a rest after any long fast, a second 24 h within a week, a third 36 h in 30 days, a recent unwell check-in. Never a block.
const lg=(daysAgo,h)=>{const e=new Date(2026,9,27,6).getTime()-daysAgo*D;return{id:'l'+daysAgo+'_'+h,start:e-h*H,end:e,goalH:h}};
r=C.longStatus(24,prof,{fasts:[lg(2,24)],unwell:null,unlocked:{}},now);assert.strictEqual(r.st,'ok');assert.strictEqual(r.note.k,'gap');
assert.strictEqual(C.longStatus(36,prof,{fasts:[lg(2,24)],unwell:null,unlocked:{}},now).note.k,'gap','any long fast counts for the rest');
r=C.longStatus(24,prof,{fasts:[lg(5,24)],unwell:null,unlocked:{}},now);assert.strictEqual(r.st,'ok');assert.strictEqual(r.note.k,'week');
assert(r.note.until>now&&r.note.until-now<=2*D+H,'a week after that fast');
assert.strictEqual(C.longStatus(24,prof,{fasts:[lg(8,24)],unwell:null,unlocked:{}},now).note,null,'a week later it is fine');
assert.strictEqual(C.longStatus(24,prof,{fasts:[lg(5,36)],unwell:null,unlocked:{}},now).note,null,'a 36 h fast does not count against the weekly 24 h');
assert.strictEqual(C.longStatus(36,prof,{fasts:[lg(5,36)],unwell:null,unlocked:{}},now).note,null,'one 36 h fast this month is fine');
r=C.longStatus(36,prof,{fasts:[lg(5,36),lg(12,36)],unwell:null,unlocked:{}},now);assert.strictEqual(r.st,'ok');assert.strictEqual(r.note.k,'month');
assert.strictEqual(C.longStatus(36,prof,{fasts:[lg(5,36),lg(40,36)],unwell:null,unlocked:{}},now).note,null);
r=C.longStatus(24,prof,{fasts:[],unwell:now-D,unlocked:{}},now);assert.strictEqual(r.st,'ok','feeling unwell is a note, not a block');assert.strictEqual(r.note.k,'unwell');
assert.strictEqual(C.longStatus(24,prof,{fasts:[],unwell:now-15*D,unlocked:{}},now).note,null);
// first-timers: 24 h after 6 fasts of 16 h or more over 2 weeks (was 12 and 4); 36 h two weeks after a first 24 h (was 4)
const ft={fastedBefore:false,safety:false};
const mkw=(daysAgo,h=16)=>{const e=new Date(2026,9,27,6).getTime()-daysAgo*D;return{id:'w'+daysAgo,start:e-h*H,end:e,goalH:16}};
const six=[1,2,3,4,5,6].map(d=>mkw(d));
r=C.longStatus(24,ft,{fasts:six,unwell:null,unlocked:{}},now);assert.strictEqual(r.st,'locked','six fasts but only six days in');assert(/6 of 6 fasts of 16 h or more, week 0 of 2/.test(r.label),r.label);
const six2=[1,3,5,8,11,15].map(d=>mkw(d));
assert.strictEqual(C.longStatus(24,ft,{fasts:six2,unwell:null,unlocked:{}},now).st,'ok','six fasts over two weeks');
assert.strictEqual(C.longStatus(24,ft,{fasts:six2.slice(1),unwell:null,unlocked:{}},now).st,'locked','five fasts is not enough');
assert.strictEqual(C.longStatus(24,ft,{fasts:six2,unwell:now-3*D,unlocked:{}},now).st,'locked','a recent unwell check-in holds first-timers back');
assert.strictEqual(C.longStatus(36,ft,{fasts:six2,unwell:null,unlocked:{}},now).st,'locked');
const f24=lg(15,24);
assert.strictEqual(C.longStatus(36,ft,{fasts:six2.concat([lg(10,24)]),unwell:null,unlocked:{}},now).st,'locked','a 24 h fast 10 days ago: not yet two weeks');
r=C.longStatus(36,ft,{fasts:six2.concat([f24]),unwell:null,unlocked:{24:now-20*D}},now);assert.strictEqual(r.st,'wait','unlocked, but first-timers still rest after their first long fast (61-day monthly rule)');
// flex refill & block
const fx={bank:1,mon:C.mondayOf(new Date(2026,9,5).getTime())};C.flexRefill(fx,new Date(2026,9,5).getTime(),now);
assert.strictEqual(fx.bank,2);
const state={fasts:[],flex:{bank:2,used:[]}};
assert.strictEqual(C.flexBlock(C.dayKey(now),state,now),'');
assert.strictEqual(C.flexBlock(C.dayKey(now-3*D),state,now),'window');
state.flex.used=[C.dayKey(now-D),C.dayKey(now-2*D)];assert.strictEqual(C.flexBlock(C.dayKey(now),state,now),'week');
// time off: no cheat day during a break, or on a break day
{const offs=[{id:'a',kind:'travel',start:now-D,days:3}],bs={fasts:[],flex:{bank:2,used:[]},off:offs};
assert.strictEqual(C.flexBlock(C.dayKey(now),bs,now),'break');assert.strictEqual(C.flexBlock(C.dayKey(now-D),bs,now),'break');
bs.off=[{id:'a',kind:'travel',start:now-D,days:3,endedAt:now}];assert.strictEqual(C.flexBlock(C.dayKey(now),bs,now),'');}
// a running fast means today is not a day off; yesterday and the future are not affected
{const cs={fasts:[],flex:{bank:2,used:[]},cur:{start:now-3600000}};assert.strictEqual(C.flexBlock(C.dayKey(now),cs,now),'fasting');assert.strictEqual(C.flexBlock(C.dayKey(now+D),cs,now),'window','no cheat day for a future date');cs.cur=null;assert.strictEqual(C.flexBlock(C.dayKey(now),cs,now),'');}
assert.strictEqual(C.guessCity('Asia/Shanghai'),'shanghai');
// weight comparison: only the percent change, bucketed to day 30, 60 and 90
{const D=864e5,t0=Date.UTC(2026,9,12),b={kg:72,at:t0,checks:[{key:'2026-10',kg:71,at:t0+24*D},{key:'2026-11',kg:70.2,at:t0+53*D},{key:'2026-12',kg:69,at:t0+83*D}]};
const pts=C.trendPoints(b);assert.deepStrictEqual(pts.map(p=>p.day),[24,53,83]);assert.strictEqual(pts[0].pct,-1.4);assert.strictEqual(pts[2].pct,-4.2);
assert.deepStrictEqual(C.trendBuckets(pts),[{day:30,pct:-1.4},{day:60,pct:-2.5},{day:90,pct:-4.2}],'monthly check-ins fall into 30, 60 and 90');
assert.deepStrictEqual(C.trendBuckets([{day:5,pct:-.5}]),[],'day 5 is not near 30');assert.deepStrictEqual(C.trendBuckets([{day:25,pct:-1},{day:33,pct:-2}]),[{day:30,pct:-2}],'the nearest day wins');
assert.deepStrictEqual(C.trendPoints({kg:72,at:t0,checks:[{kg:40,at:t0+30*D}]}),[],'a change of more than 30 percent is never sent');assert.deepStrictEqual(C.trendPoints(null),[]);
assert.ok(!JSON.stringify(C.trendBuckets(pts)).match(/kg|72|age|sex/),'no weight in what is sent');}
// the city list has the big classic cities, each with a real zone and a sunrise that is not the same everywhere
{const ks=Object.keys(C.CITIES);['berlin','london','paris','jakarta','tokyo','mumbai','cairo','lagos','saopaulo','mexicocity','toronto','melbourne','auckland','seoul','istanbul','moscow'].forEach(k=>assert.ok(C.CITIES[k],'missing '+k));
ks.forEach(k=>{const c=C.CITIES[k];assert.ok(c.en&&c.zh&&isFinite(c.lat)&&isFinite(c.lon)&&c.zone,k+' is complete');assert.ok(isFinite(C.zoneOffset(c.zone,Date.UTC(2026,10,6))),k+' has a usable time zone');});
/* the places many Ramadan users pick from (audit S5): all there, in both languages, with believable sunrise and sunset on a November day and in Ramadan 2027 (8 Feb to 9 Mar) */
{const want={mecca:[21.4,39.9],medina:[24.5,39.6],jeddah:[21.5,39.2],doha:[25.3,51.5],kuwaitcity:[29.4,48],baghdad:[33.3,44.4],tehran:[35.7,51.4],casablanca:[33.6,-7.6],algiers:[36.8,3.1],tunis:[36.8,10.2],khartoum:[15.5,32.6],kabul:[34.5,69.2],tashkent:[41.3,69.2]};
 Object.keys(want).forEach(k=>{const c=C.CITIES[k];assert.ok(c,k+' is in the list');assert.ok(Math.abs(c.lat-want[k][0])<.2&&Math.abs(c.lon-want[k][1])<.2,k+' sits where it should');assert.ok(/[\u4e00-\u9fff]/.test(c.zh)&&/^[A-Za-z ]+$/.test(c.en),k+' has English and Chinese names');
  if(k!=='casablanca'){[Date.UTC(2026,10,10,9),Date.UTC(2027,1,20,9)].forEach(at=>{const p=C.placeInfo({key:k},at),t=C.sunTimes(p,at);assert.ok(t.rise>4&&t.rise<8&&t.set>16&&t.set<19.5&&t.set-t.rise>9.5&&t.set-t.rise<12.5,k+' sun times are believable: '+t.rise+' to '+t.set);});}});
 assert.strictEqual(C.guessCity('Asia/Tehran'),'tehran');assert.strictEqual(C.guessCity('Asia/Qatar'),'doha');assert.strictEqual(C.guessCity('Asia/Riyadh'),'riyadh','a shared zone still maps to the first city');
 const m=C.placeInfo({key:'mecca'},Date.UTC(2027,1,20,9)),t=C.sunTimes(m,Date.UTC(2027,1,20,9));assert.ok(t.rise>6&&t.rise<7&&t.set>18&&t.set<18.7,'Mecca in February: sunrise about 6:45, sunset about 18:20 local (got '+t.rise+' / '+t.set+')');}
assert.strictEqual(C.guessCity('Europe/Paris'),'paris');assert.strictEqual(C.guessCity('Europe/Berlin'),'berlin');assert.strictEqual(C.guessCity('Asia/Jakarta'),'jakarta');assert.strictEqual(C.guessCity('America/Toronto'),'toronto');}
// everyday plan ladder
{const f=(h,g)=>({id:String(Math.random()),start:0,end:h*H,goalH:g==null?h:g}),first={fastedBefore:false,safety:false},exp={fastedBefore:true,safety:false},st=(id,pr,fs)=>C.planStatus(id,pr,{fasts:fs});
assert.strictEqual(st('13',first,[]).st,'ok');assert.strictEqual(st('16',first,[]).st,'ok','16:8 is open for first-timers');assert.strictEqual(st('16',exp,[]).st,'ok');
assert.strictEqual(st('18',first,[]).st,'soft','18:6 can be picked with a warning');assert.strictEqual(st('20',first,[]).st,'soft','20:4 can be picked with a warning');assert.strictEqual(st('23',first,[]).st,'locked','23:1 stays locked for first-timers');assert.strictEqual(st('custom',first,[]).st,'locked','custom stays locked for first-timers');assert.strictEqual(st('18',exp,[]).st,'ok');
assert.strictEqual(st('16',{fastedBefore:true,safety:true},[]).st,'locked','a safety flag keeps the ladder on');assert.strictEqual(st('18',{fastedBefore:false,safety:true},[]).st,'hidden','Care mode never gets the soft 18:6');
assert.strictEqual(st('16',first,[f(13),f(13),f(13)]).st,'ok');assert.strictEqual(st('16',first,[f(13),f(13),f(13,16)]).n,2,'a fast short of its own goal is not counted');
assert.strictEqual(st('16',first,[f(13),f(13),f(10,13)]).n,2,'a fast that missed its goal does not count');
assert.strictEqual(st('18',first,[f(13),f(13),f(13)]).st,'soft','18:6 still carries the warning until three 16 h fasts');assert.strictEqual(st('18',first,[f(13),f(13),f(13)]).n,0);assert.strictEqual(st('18',first,[f(16),f(16),f(16)]).st,'ok');
assert.strictEqual(st('20',first,[f(18),f(18),f(18)]).st,'ok');assert.strictEqual(st('23',first,[f(20),f(20),f(20)]).st,'ok');
assert.strictEqual(st('16',first,[f(16)]).st,'ok','one completed 16 h fast opens 16:8');assert.strictEqual(st('ramadan',first,[]).st,'ok');
assert.strictEqual(C.planStatusLabel(st('16',first,[f(13)])),'1 of 3 fasts of 13 h or more');}
// Care mode: plans stop at 16:8, custom at 16 h, long fasts never open, and the way back depends on the answer
{const care={fastedBefore:true,safety:true},f=(h)=>({id:String(Math.random()),start:0,end:h*H,goalH:h}),st=(id,pr,fs)=>C.planStatus(id,pr,{fasts:fs});
assert.strictEqual(st('18',care,[f(16),f(16),f(16)]).st,'hidden');assert.strictEqual(st('20',care,[f(18),f(18),f(18)]).st,'hidden');assert.strictEqual(st('23',care,[f(20),f(20),f(20)]).st,'hidden');
assert.strictEqual(st('16',care,[f(13),f(13),f(13)]).st,'ok','16:8 still opens by the ladder');assert.strictEqual(st('13',care,[]).st,'ok');
assert.strictEqual(C.longStatus(24,care,{fasts:[f(16),f(16),f(16),f(24)],unwell:null,unlocked:{24:1}},now).st,'hidden','even with a 24 h fast on record');assert.strictEqual(C.longStatus(36,care,{fasts:[],unwell:null,unlocked:{}},now).st,'hidden');
assert.strictEqual(C.customMax(care),16);assert.strictEqual(C.customMax({safety:false}),23);assert.strictEqual(C.careOn({safety:true}),true);assert.strictEqual(C.careOn({safety:false}),false);assert.strictEqual(C.careOn(null),false);
assert.strictEqual(C.careEase('preg'),'now');assert.strictEqual(C.careEase('diab'),'wait');assert.strictEqual(C.careEase('earlier'),'wait');assert.strictEqual(C.careEase('ed'),'never');assert.strictEqual(C.CARE_WAIT,14*D);}
// who keeps a weight: adults with numbers that can be right; there is no BMI cut-off (BMI is too biased)
{const wf=C.weightFit,base={age:35,kg:82,cm:170};
assert.strictEqual(wf(base),true);assert.strictEqual(wf(Object.assign({},base,{age:18})),true);assert.strictEqual(wf(Object.assign({},base,{age:17})),false,'under 18');
assert.strictEqual(wf(Object.assign({},base,{kg:50})),true,'a low BMI is saved like any other');assert.strictEqual(wf(Object.assign({},base,{kg:45})),true);assert.strictEqual(wf(Object.assign({},base,{kg:150})),true,'and so is a high one');
assert.strictEqual(wf(Object.assign({},base,{kg:20})),false);assert.strictEqual(wf(Object.assign({},base,{cm:100})),false);assert.strictEqual(wf({}),false);}
// Days totals and chart averages
{const at=(y,m,d,h)=>{const e=new Date(y,m,d,12).getTime();return{id:'t'+e,start:e-h*H,end:e,goalH:16};};
const fs=[at(2026,8,10,15),at(2026,9,2,16),at(2026,9,6,17),at(2026,9,7,18),at(2026,9,30,16),{id:'open',start:Date.now(),end:null,goalH:16},at(2026,9,20,10)];
const t=C.totals(fs);assert.strictEqual(t.n,6,'an open fast is not counted');assert.strictEqual(Math.round(t.hours*10)/10,92,'an ended-early fast still adds its hours');assert(Math.abs(t.avg-92/6)<1e-9);assert.strictEqual(C.totals([]).n,0);assert.strictEqual(C.totals([]).avg,0);
const w=C.weekAvgs(fs,2026,9);assert.strictEqual(w.length,5,'October 2026 spans five Monday-first weeks');assert.strictEqual(w[0].s,'2026-10-01','first week starts on the 1st');assert.strictEqual(w[0].e,'2026-10-04');assert.strictEqual(w[4].e,'2026-10-31','last week stops at month end');
assert.strictEqual(w[1].n,2);assert.strictEqual(w[1].h,17.5);assert.strictEqual(w[2].n,0);assert.strictEqual(w[2].h,0);assert.strictEqual(w[3].n,1);assert.strictEqual(w[3].h,10);assert.strictEqual(w.reduce((a,x)=>a+x.n,0),5,'every fast of the month lands in exactly one week');
const mo=C.monthAvgs(fs,2026,10,6);assert.deepStrictEqual(mo.map(x=>[x.m,x.n]),[[8,1],[9,5],[10,0]],'months start at the first fast and end at the viewed month');assert(Math.abs(mo[1].h-15.4)<1e-9,'October average');
assert.strictEqual(C.monthAvgs(fs,2026,9,1).length,1);assert.strictEqual(C.monthAvgs([],2026,9,6).length,1,'no fasts: just the viewed month');}
// monthly recap
{const at=(d,h,g)=>{const e=new Date(2026,9,d,12).getTime();return{id:'r'+d,start:e-h*H,end:e,goalH:g||16};};
const fs=[at(2,16),at(6,17),at(7,18),at(8,10),at(20,16)],r=C.monthRecap(fs,2026,9,['2026-10-10'],[]);
assert.strictEqual(r.n,5);assert.strictEqual(r.hours,77);assert.strictEqual(r.reached,4,'the 10 h fast ended short of its goal');assert.strictEqual(r.days.length,31);
assert.strictEqual(r.days[1],'done');assert.strictEqual(r.days[7],'early');assert.strictEqual(r.days[9],'flex');assert.strictEqual(r.days[0],'none');
assert.strictEqual(r.busy.s,'2026-10-05','week of the 5th has three fasts');assert.strictEqual(r.busy.n,3);
assert.strictEqual(C.monthRecap([at(2,16)],2026,9).busy,null,'one fast in a week is not a busy week');assert.strictEqual(C.monthRecap([],2026,9).n,0);}
// full recap report
{const at=(d,h,g)=>{const e=new Date(2026,9,d,12).getTime();return{id:'q'+d,start:e-h*H,end:e,goalH:g||16};};
const fs=[at(9,16),at(11,16),at(12,16),at(14,16),at(15,10)],r=C.monthReport(fs,2026,9,['2026-10-10'],[],{key:'shanghai'});
assert.strictEqual(r.dim,31);assert.strictEqual(r.run,3,'a cheat day holds the run: 9, cheat 10, 11, 12; the 13th breaks it');assert.strictEqual(r.daysWith,5);assert.strictEqual(r.flex,1);assert.strictEqual(r.weeks.length,5);
assert.ok(Math.abs(r.moonH+r.sunH-r.hours)<1e-6,'sky split adds up to the hours');
const sh=[{id:'s1',start:Date.UTC(2026,9,12,12,0),end:Date.UTC(2026,9,13,4,0),goalH:16}],k=C.skySplit(sh,{key:'shanghai'});
assert.ok(k.moon>9.3&&k.moon<10.7,'20:00 to 12:00 in Shanghai is about 10 h under the moon, got '+k.moon);assert.ok(Math.abs(k.moon+k.sun-16)<1e-6);
const mid=[{id:'m1',start:new Date(2026,9,3,22,0).getTime(),end:new Date(2026,9,4,14,0).getTime(),goalH:16},{id:'m2',start:new Date(2026,9,4,23,0).getTime(),end:new Date(2026,9,5,15,0).getTime(),goalH:16},{id:'m3',start:new Date(2026,9,5,21,0).getTime(),end:new Date(2026,9,6,13,0).getTime(),goalH:16}];
const mr=C.monthReport(mid,2026,9,[],[],{key:'shanghai'});assert.ok(Math.abs(mr.start-22)<1e-6,'usual start across midnight, got '+mr.start);assert.ok(Math.abs(mr.finish-14)<1e-6);
const wrap=C.monthReport([{id:'w1',start:new Date(2026,9,3,23,30).getTime(),end:new Date(2026,9,4,15,30).getTime(),goalH:16},{id:'w2',start:new Date(2026,9,5,0,30).getTime(),end:new Date(2026,9,5,16,30).getTime(),goalH:16},{id:'w3',start:new Date(2026,9,6,0,0).getTime(),end:new Date(2026,9,6,16,0).getTime(),goalH:16}],2026,9,[],[],{key:'shanghai'});
assert.ok(Math.abs(wrap.start-0)<.01||Math.abs(wrap.start-24)<.01,'23:30, 00:30 and 00:00 average near midnight, got '+wrap.start);}
/* what is happening now: the stage by hours fasted, and the stages a fast lists (never beyond its plan until it gets there) */
assert.deepStrictEqual([0,3.99,4,7.9,8,12,17.9,18,23.9,24,60].map(C.bodyStage),[0,0,1,1,2,3,3,4,4,5,5]);assert.strictEqual(C.bodyStage(-1),0);
assert.deepStrictEqual(C.BODY.map(b=>b.id),['digest','settle','sugar','switch','fat','long']);C.BODY.forEach((b,i)=>{if(i)assert.strictEqual(b.from,C.BODY[i-1].to);});
assert.strictEqual(C.bodyShown(1,13),4);assert.strictEqual(C.bodyShown(1,16),4);assert.strictEqual(C.bodyShown(1,18),4);assert.strictEqual(C.bodyShown(1,20),5);assert.strictEqual(C.bodyShown(1,24),5);assert.strictEqual(C.bodyShown(1,36),6);
assert.strictEqual(C.bodyShown(19,16),5,'a fast that runs past its goal lists the stage it has reached');assert.strictEqual(C.bodyShown(25,24),6);assert.strictEqual(C.bodyShown(0,12),3);
/* how did it feel: only the three answers count, and the month report counts them */
assert.deepStrictEqual(C.FEELS,['easy','ok','hard']);assert.strictEqual(C.feelOf({feel:'easy'}),'easy');assert.strictEqual(C.feelOf({feel:'great'}),null);assert.strictEqual(C.feelOf({}),null);assert.strictEqual(C.feelOf(null),null);
assert.deepStrictEqual(C.feelCount([{feel:'easy'},{feel:'easy'},{feel:'hard'},{},{feel:'x'}]),{easy:2,ok:0,hard:1,n:3});assert.deepStrictEqual(C.feelCount([]),{easy:0,ok:0,hard:0,n:0});
{const T=(d,h)=>new Date(2026,9,d,h).getTime(),fs=[{id:'a',start:T(3,20),end:T(4,12),goalH:16,feel:'ok'},{id:'b',start:T(5,20),end:T(6,12),goalH:16,feel:'hard'},{id:'c',start:T(7,20),end:T(8,12),goalH:16},{id:'d',start:new Date(2026,10,2,20).getTime(),end:new Date(2026,10,3,12).getTime(),goalH:16,feel:'easy'}];
 const r=C.monthReport(fs,2026,9,[],[]);assert.deepStrictEqual(r.feel,{easy:0,ok:1,hard:1,n:2},'the month counts only its own marked fasts');
 const st=C.streak(fs.map(f=>Object.assign({},f,{feel:undefined})),[],new Date(2026,10,3,13).getTime()),st2=C.streak(fs,[],new Date(2026,10,3,13).getTime());assert.deepStrictEqual(st,st2,'how a fast felt never changes a streak');}
// your sky: the days in a span that hold a finished fast. Any length counts, a day counts once, an unfinished fast and a day outside the span do not
{const T=(m,d,h)=>new Date(2026,m,d,h).getTime(),fs=[{id:'a',start:T(9,22,18),end:T(9,23,10),goalH:16},{id:'b',start:T(9,23,12),end:T(9,23,17),goalH:16},{id:'c',start:T(10,1,20),end:T(10,2,0,30),goalH:16},
  {id:'d',start:T(10,5,20),end:T(10,5,20),goalH:16},{id:'e',start:T(10,6,20),goalH:16},{id:'f',start:T(9,21,18),end:T(9,22,10),goalH:16},{id:'g',start:T(10,21,2),end:T(10,21,23),goalH:13},{id:'h',start:T(10,21,20),end:T(10,22,12),goalH:16}];
 assert.deepStrictEqual(C.starDays(fs,'2026-10-23','2026-11-21'),['2026-10-23','2026-11-02','2026-11-21'],'oldest first, once a day, both ends of the span included');
 assert.deepStrictEqual(C.starDays(fs,'2026-09-23','2026-10-22'),['2026-10-22']);assert.deepStrictEqual(C.starDays([],'2026-10-23','2026-11-21'),[]);
 const long=fs.map(f=>f.end>f.start?Object.assign({},f,{start:f.start-20*H}):f);assert.deepStrictEqual(C.starDays(long,'2026-10-23','2026-11-21'),C.starDays(fs,'2026-10-23','2026-11-21'),'a longer fast lights the same stars, no more');}
console.log('core ok',s);
