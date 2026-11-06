/* Unit tests for js/friends.js: the rules a phone follows for Friends (no network, no DOM). Run: node tests/friends.test.js */
const assert=require('assert');
const C=require('../js/core.js');
const F=require('../js/friends.js');
const H=3600000;
let n=0; function t(name,fn){ try{ fn(); n++; }catch(e){ console.error('FAIL: '+name); throw e; } }

t('the owner decisions default to the proposal',()=>{
  assert.strictEqual(F.DECISIONS.streak,false); assert.strictEqual(F.DECISIONS.moonAtNight,false);
  assert.strictEqual(F.DECISIONS.cheer,true); assert.strictEqual(F.DECISIONS.accountRequired,true);
});

t('limits',()=>{ assert.strictEqual(F.MAX_MEMBERS,10); assert.strictEqual(F.MAX_GROUPS,3); assert.strictEqual(F.POLL_MS,60000); });

t('the eight sky avatars are the open ones in js/avatars.js, and Eclipse is not shared',()=>{
  const A=require('../js/avatars.js'); const open=A.LIST.filter(a=>!a.unlock).map(a=>a.id).sort();
  assert.deepStrictEqual(F.AVATARS.slice().sort(),open); assert(F.AVATARS.indexOf('eclipse')<0);
});

t('Care mode: allowed, except for an eating-disorder answer',()=>{
  assert(F.available(null)); assert(F.available({care:[]})); assert(F.available({care:['preg']})); assert(F.available({care:['diab','earlier']}));
  assert(!F.available({care:['ed']})); assert(!F.available({care:['preg','ed']}));
});

t('the week is seven local days, today last',()=>{
  const w=F.weekDays('2026-11-06'); assert.strictEqual(w.length,7); assert.strictEqual(w[0],'2026-10-31'); assert.strictEqual(w[6],'2026-11-06');
  assert.deepStrictEqual(F.weekDays('2026-03-02').slice(0,2),['2026-02-24','2026-02-25']);
});

t('status words, English and Chinese',()=>{
  const en=['Fasting','Reached goal','Fasted','Resting','Not fasting'], zh=['断食中','达成目标','已断食','休息中','没有断食'];
  ['fasting','reached','fasted','resting','none'].forEach((s,i)=>{ assert.strictEqual(F.word(s,'en'),en[i]); assert.strictEqual(F.word(s,'zh'),zh[i]); });
  assert.strictEqual(F.word('whatever','en'),'Not fasting');
});

t('plan label for 13, 16, 18, 20, 23, 24, 36 and custom hours',()=>{
  [13,16,18,20,23,24,36,12,17].forEach(h=>{ assert.strictEqual(F.planLabel(h,'en'),h+'h'); assert.strictEqual(F.planLabel(h,'zh'),h+'小时'); });
  assert.strictEqual(F.planLabel(16.5,'en'),'16.5h'); assert.strictEqual(F.planLabel(null,'en'),''); assert.strictEqual(F.planLabel(0,'en'),'');
});

t('a row: the word, and the plan only where it means something',()=>{
  assert.strictEqual(F.rowText({status:'fasting',goal_hours:16},'en'),'Fasting · 16h');
  assert.strictEqual(F.rowText({status:'fasting',goal_hours:16},'zh'),'断食中 · 16小时');
  assert.strictEqual(F.rowText({status:'reached',goal_hours:18},'en'),'Reached goal · 18h');
  assert.strictEqual(F.rowText({status:'fasted',goal_hours:20},'en'),'Fasted · 20h');
  assert.strictEqual(F.rowText({status:'resting',goal_hours:16},'en'),'Resting');
  assert.strictEqual(F.rowText({status:'none',goal_hours:16},'en'),'Not fasting');
  assert.strictEqual(F.rowText({status:'fasting',goal_hours:null},'en'),'Fasting','a sacred fast shows no hours');
});

t('the summary line counts people, never ranks or averages',()=>{
  const rows=[{status:'fasting'},{status:'fasting'},{status:'fasting'},{status:'reached'},{status:'resting'},{status:'none'}];
  assert.strictEqual(F.summary(rows,'Today','en'),'Today · 3 fasting · 1 reached goal · 1 resting');
  assert.strictEqual(F.summary(rows,'今天','zh'),'今天 · 3 人断食中 · 1 人达成目标 · 1 人休息');
  assert.strictEqual(F.summary([{status:'none'}],'Today','en'),'Today');
  assert.strictEqual(F.summary([{status:'fasted'},{status:'reached'}],'Fri','en'),'Fri · 1 reached goal · 1 fasted');
  assert(!/%|most|best|ahead|top/i.test(F.summary(rows,'Today','en')));
});

t('discs: a sun wedge of the person\'s own plan, full at the goal, never past it',()=>{
  assert.deepStrictEqual(F.disc({status:'fasting',progress:0.5}),{kind:'wedge',fill:0.5});
  assert.deepStrictEqual(F.disc({status:'fasting',progress:1.7}),{kind:'wedge',fill:1}); /* even a bad number stops at full */
  assert.deepStrictEqual(F.disc({status:'reached',progress:1}),{kind:'full',fill:1});
  assert.deepStrictEqual(F.disc({status:'fasted',progress:0.62}),{kind:'wedge',fill:0.62});
  assert.deepStrictEqual(F.disc({status:'resting'}),{kind:'rest',fill:0});
  assert.deepStrictEqual(F.disc({status:'none'}),{kind:'empty',fill:0});
  assert.deepStrictEqual(F.disc({status:'fasting',progress:null}),{kind:'wedge',fill:0});
});

t('invite codes: normalising and validating',()=>{
  assert.strictEqual(F.normalizeCode(' k7qm-4xd9 '),'K7QM4XD9'); assert.strictEqual(F.normalizeCode('K7QM 4XD9'),'K7QM4XD9'); assert.strictEqual(F.normalizeCode(null),'');
  assert(F.validCode('K7QM4XD9')); assert(F.validCode('k7qm 4xd9'));
  ['K7QM4XD','K7QM4XD99','K7QM4XD0','K7QM4XDO','K7QM4XD1','K7QM4XDI','K7QM4XDL','',null].forEach(c=>assert(!F.validCode(c),String(c)));
  assert.strictEqual(F.formatCode('k7qm4xd9'),'K7QM 4XD9');
});

t('invite links and the code surviving a sign-in',()=>{
  assert.strictEqual(F.joinLink('https://kingtbo.github.io/Lightly-Fasting-App-Project/','k7qm 4xd9'),'https://kingtbo.github.io/Lightly-Fasting-App-Project/?join=K7QM4XD9');
  assert.strictEqual(F.joinLink('https://x.test/app/?r=abc#h','K7QM4XD9'),'https://x.test/app/?join=K7QM4XD9');
  assert.strictEqual(F.codeFromSearch('?join=K7QM4XD9'),'K7QM4XD9'); assert.strictEqual(F.codeFromSearch('?r=abc&join=k7qm-4xd9'),'K7QM4XD9');
  assert.strictEqual(F.codeFromSearch('?join=%20k7qm%204xd9'),'K7QM4XD9');
  assert.strictEqual(F.codeFromSearch('?join=nope'),''); assert.strictEqual(F.codeFromSearch(''),''); assert.strictEqual(F.codeFromSearch('?x=1'),''); assert.strictEqual(F.codeFromSearch('?join=%E0%A4%A'),'');
  assert.strictEqual(F.withJoin('https://x.test/app/','k7qm4xd9'),'https://x.test/app/?join=K7QM4XD9');
  assert.strictEqual(F.withJoin('https://x.test/app/?r=abc','K7QM4XD9'),'https://x.test/app/?r=abc&join=K7QM4XD9');
  assert.strictEqual(F.withJoin('https://x.test/app/','bad'),'https://x.test/app/');
});

t('names',()=>{
  assert.strictEqual(F.cleanName('  Ana   Li  '),'Ana Li'); assert.strictEqual(F.cleanName('x'.repeat(40)).length,24); assert.strictEqual(F.cleanName('x'.repeat(40),32).length,32);
  assert(F.validName('Mei')); assert(F.validName('美琪')); assert(!F.validName('   ')); assert(!F.validName('x'.repeat(25))); assert(F.validName('x'.repeat(24)));
  assert(F.validName('晨光小组'.repeat(8),32)); assert(!F.validName('晨'.repeat(33),32));
});

/* ----- what a phone publishes ----- */
const at=(y,m,d,h,mi)=>new Date(y,m-1,d,h||0,mi||0).getTime();
const NOW=at(2026,11,6,12,0);
const fast=(sh,eh,goalH,plan)=>({id:'f'+sh+eh,start:sh,end:eh,goalH:goalH,plan:plan||'16'});
const base=()=>({cur:null,fasts:[],flex:{used:[]},off:[],unwell:null});

t('idle with nothing',()=>{
  const p=F.payload(base(),NOW); assert.strictEqual(p.p_state,'idle'); assert.strictEqual(p.p_started_at,null); assert.strictEqual(p.p_goal_hours,null);
  assert.strictEqual(p.p_days.length,7); assert(p.p_days.every(d=>d.outcome==='none')); assert.strictEqual(p.p_days[6].day,'2026-11-06'); assert.strictEqual(p.p_days[0].day,'2026-10-31');
});

t('a running fast publishes its start and goal and nothing else about time',()=>{
  const S=base(); S.cur={start:NOW-5*H,goalH:18,planId:'18',reached:false}; const p=F.payload(S,NOW);
  assert.strictEqual(p.p_state,'fasting'); assert.strictEqual(p.p_goal_hours,18); assert.strictEqual(new Date(p.p_started_at).getTime(),NOW-5*H); assert.strictEqual(p.p_sacred,false);
  assert.deepStrictEqual(Object.keys(p).sort(),['p_days','p_goal_hours','p_sacred','p_started_at','p_state']);
  p.p_days.forEach(d=>assert.deepStrictEqual(Object.keys(d).sort(),['day','goal_hours','outcome','progress','sacred']));
});

t('a plan changed mid-fast is published with the new goal',()=>{
  const S=base(); S.cur={start:NOW-5*H,goalH:20,planId:'20'}; assert.strictEqual(F.payload(S,NOW).p_goal_hours,20);
});

t('Time off, and a cheat day today, publish "resting" (the reason stays on the phone)',()=>{
  let S=base(); S.off=[{id:'o1',kind:'travel',start:NOW-H,days:3}]; assert.strictEqual(F.payload(S,NOW).p_state,'resting');
  S=base(); S.off=[{id:'o1',kind:'sick',start:NOW-H,days:3}]; S.cur={start:NOW-5*H,goalH:16,planId:'16'}; const p=F.payload(S,NOW);
  assert.strictEqual(p.p_state,'resting','Time off beats a running fast'); assert.strictEqual(p.p_started_at,null);
  S=base(); S.flex.used=['2026-11-06']; assert.strictEqual(F.payload(S,NOW).p_state,'resting');
  S=base(); S.flex.used=['2026-11-05']; assert.strictEqual(F.payload(S,NOW).p_state,'idle','yesterday\'s cheat day does not rest today');
  assert.deepStrictEqual(F.payload(S,NOW).p_days.map(d=>d.outcome)[5],'rest');
});

t('an "unwell" check-in is not shared',()=>{ const S=base(); S.unwell=NOW-H; assert.strictEqual(F.payload(S,NOW).p_state,'idle'); });

t('day outcomes: the day a fast ended, not the day it began (23:50 and 00:10)',()=>{
  const S=base();
  S.fasts=[fast(at(2026,11,4,16,0),at(2026,11,5,8,0),16)];          /* ends the 5th */
  S.fasts.push(fast(at(2026,11,3,23,50),at(2026,11,4,15,50),16));      /* ends the 4th at 15:50 (16 h) */
  S.fasts.push(fast(at(2026,10,31,16,10),at(2026,11,1,0,10),16));      /* 8 h of 16, ends 00:10 on the 1st */
  S.fasts.push(fast(at(2026,10,31,6,0),at(2026,10,31,23,50),16));      /* ends 23:50 on the 31st, 17h50 */
  const d=F.payload(S,NOW).p_days, by=k=>d.find(x=>x.day===k);
  assert.strictEqual(by('2026-10-31').outcome,'fast'); assert.strictEqual(by('2026-10-31').progress,1);
  assert.strictEqual(by('2026-11-01').outcome,'fast'); assert.strictEqual(by('2026-11-01').progress,0.5); assert.strictEqual(by('2026-11-01').goal_hours,16);
  assert.strictEqual(by('2026-11-04').progress,1); assert.strictEqual(by('2026-11-05').progress,1);
  assert.strictEqual(by('2026-11-02').outcome,'none'); assert.strictEqual(by('2026-11-03').outcome,'none'); assert.strictEqual(by('2026-11-06').outcome,'none');
});

t('two fasts on one day: the one that got furthest',()=>{
  const S=base(); S.fasts=[fast(at(2026,11,5,1,0),at(2026,11,5,5,0),16),fast(at(2026,11,5,6,0),at(2026,11,5,18,0),16,'16')];
  const d=F.payload(S,NOW).p_days.find(x=>x.day==='2026-11-05'); assert.strictEqual(d.outcome,'fast'); assert.strictEqual(d.progress,0.75);
});

t('a cheat day and Time off days are "rest"; a done fast wins over them; an early fast on a cheat day is "rest"',()=>{
  const S=base(); S.flex.used=['2026-11-03']; S.off=[{id:'o',kind:'travel',start:at(2026,11,1,9,0),days:2,endedAt:null}];
  S.fasts=[fast(at(2026,11,4,16,0),at(2026,11,5,8,0),16),fast(at(2026,11,2,9,0),at(2026,11,2,13,0),16)];
  const d=F.payload(S,NOW).p_days, by=k=>d.find(x=>x.day===k);
  assert.strictEqual(by('2026-11-01').outcome,'rest'); assert.strictEqual(by('2026-11-02').outcome,'rest','an early fast on a Time off day shows as resting, like the Days tab');
  assert.strictEqual(by('2026-11-03').outcome,'rest'); assert.strictEqual(by('2026-11-05').outcome,'fast');
  assert(by('2026-11-01').goal_hours===null&&by('2026-11-01').progress===0,'no hours for a rest day');
});

t('a sacred (Ramadan) fast publishes no length to friends',()=>{
  const S=base(); S.cur={start:NOW-3*H,goalH:14.2,planId:'ramadan'}; S.fasts=[fast(at(2026,11,4,5,0),at(2026,11,4,19,0),14,'ramadan')];
  const p=F.payload(S,NOW); assert.strictEqual(p.p_sacred,true); assert.strictEqual(p.p_days.find(d=>d.day==='2026-11-04').sacred,true);
});

t('same payload detection',()=>{ const a=F.payload(base(),NOW); assert(F.sameAs(a,F.payload(base(),NOW))); const S=base(); S.flex.used=['2026-11-06']; assert(!F.sameAs(a,F.payload(S,NOW))); assert(!F.sameAs(null,a)); });

t('errors map to calm copy in both languages',()=>{
  assert.strictEqual(F.errorKey(new Error('not_member')),'not_member'); assert.strictEqual(F.errorKey(new Error('group_cap')),'group_cap');
  assert.strictEqual(F.errorKey(Object.assign(new Error('Something odd'),{status:500})),'failed'); assert.strictEqual(F.errorKey(new TypeError('Failed to fetch')),'offline'); assert.strictEqual(F.errorKey(null),'failed');
  assert.strictEqual(F.errorText('invalid','en'),'This invite isn’t valid any more. Ask for a new one.'); assert.strictEqual(F.errorText('full','zh'),'这个小组已满员。');
  assert.strictEqual(F.errorText('nope','en'),F.errorText('failed','en'));
});

t('nothing in what is published or shown carries weight, a streak or a place',()=>{
  const S=base(); S.body={kg:70,cm:170,age:30}; S.place={key:'here',lat:31.2,lon:121.4}; S.cur={start:NOW-2*H,goalH:16,planId:'16'};
  const s=JSON.stringify(F.payload(S,NOW)); assert(!/70|170|31\.2|121\.4|body|place|streak|lat|lon|weight/i.test(s.replace(/2026-1\d-\d\d/g,'').replace(/\d{2}:\d{2}/g,'')),s);
});

console.log('friends tests: '+n+' passed');
