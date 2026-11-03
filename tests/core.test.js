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
// long fast unlock
const prof={fastedBefore:true,safety:false};
const st={fasts:[mk(1),mk(2)],unwell:null,unlocked:{}};
assert.strictEqual(C.longStatus(24,prof,st,now).st,'locked');
st.fasts.push(mk(3));assert.strictEqual(C.longStatus(24,prof,st,now).st,'ok');
assert.strictEqual(C.longStatus(24,{fastedBefore:false,safety:false},st,now).st,'locked');
assert.strictEqual(C.longStatus(24,{fastedBefore:true,safety:true},st,now).st,'hidden');
assert.strictEqual(C.longStatus(36,prof,st,now).st,'locked');
st.unwell=now-D;assert.strictEqual(C.longStatus(24,prof,st,now).st,'paused');
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
// everyday plan ladder
{const f=(h,g)=>({id:String(Math.random()),start:0,end:h*H,goalH:g==null?h:g}),first={fastedBefore:false,safety:false},exp={fastedBefore:true,safety:false},st=(id,pr,fs)=>C.planStatus(id,pr,{fasts:fs});
assert.strictEqual(st('13',first,[]).st,'ok');assert.strictEqual(st('16',first,[]).st,'locked');assert.strictEqual(st('16',exp,[]).st,'ok');
assert.strictEqual(st('16',{fastedBefore:true,safety:true},[]).st,'locked','a safety flag keeps the ladder on');
assert.strictEqual(st('16',first,[f(13),f(13),f(13)]).st,'ok');assert.strictEqual(st('16',first,[f(13),f(13),f(13,16)]).n,2,'a fast short of its own goal is not counted');
assert.strictEqual(st('16',first,[f(13),f(13),f(10,13)]).st,'locked','a fast that missed its goal does not count');
assert.strictEqual(st('18',first,[f(13),f(13),f(13)]).st,'locked','18:6 needs three 16 h fasts');assert.strictEqual(st('18',first,[f(16),f(16),f(16)]).st,'ok');
assert.strictEqual(st('20',first,[f(18),f(18),f(18)]).st,'ok');assert.strictEqual(st('23',first,[f(20),f(20),f(20)]).st,'ok');
assert.strictEqual(st('16',first,[f(16)]).st,'ok','one completed 16 h fast opens 16:8');assert.strictEqual(st('ramadan',first,[]).st,'ok');
assert.strictEqual(C.planStatusLabel(st('16',first,[f(13)])),'1 of 3 fasts of 13 h or more');}
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
console.log('core ok',s);
