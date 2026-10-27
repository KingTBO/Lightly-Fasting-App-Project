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
console.log('core ok',s);
