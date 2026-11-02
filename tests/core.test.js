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
console.log('core ok',s);
