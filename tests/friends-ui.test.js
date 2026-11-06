/* The Friends tab in the browser, against a mock Supabase: hidden unless the preview switch is on, signed-out and empty states, name and avatar,
   new group, invite sheet (QR, code, copy), the group list, Care mode, English and Chinese.   NODE_PATH=$(npm root -g) node tests/friends-ui.test.js [--shots=dir] */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..'); const H=3600000;
const shots=(process.argv.find(a=>a.startsWith('--shots='))||'').slice(8);
const calls=[]; let profile=null, groups=[], codeN=0, sharingOn=true; const cheered=new Set(), otps=[];
const mock=http.createServer((q,r)=>{ r.setHeader('Access-Control-Allow-Origin','*'); r.setHeader('Access-Control-Allow-Headers','*'); r.setHeader('Access-Control-Allow-Methods','*'); if(q.method==='OPTIONS'){ r.writeHead(204); return r.end(); }
  let body=''; q.on('data',d=>body+=d); q.on('end',()=>{ const j=body?JSON.parse(body):{}, u=q.url, out=(c,o)=>{ r.writeHead(c,{'Content-Type':'application/json'}); r.end(JSON.stringify(o)); };
    if(u.startsWith('/auth/v1/settings')) return out(200,{external:{google:true,email:true}});
    if(u.startsWith('/auth/v1/otp')){ otps.push(u); return out(200,{}); }
    if(u.startsWith('/auth/v1/user')) return out(200,{id:'uid-me',email:'me@example.com'});
    if(u.startsWith('/rest/v1/lightly_state')) return out(200,[]);
    if(u.startsWith('/rest/v1/profiles')) return out(200,profile?[profile]:[]);
    const m=/^\/rest\/v1\/rpc\/(\w+)/.exec(u); if(!m) return out(404,{});
    calls.push({fn:m[1],args:j});
    if(m[1]==='my_groups') return out(200,groups);
    if(m[1]==='upsert_profile'){ profile={display_name:j.p_name,avatar:j.p_avatar}; return out(200,null); }
    if(m[1]==='create_group'){ if(!profile) return out(400,{message:'no_profile'}); const id='g'+(++codeN); groups.push({group_id:id,name:j.p_name,role:'owner',member_count:1,fasting:0,reached:0,resting:0}); return out(200,[{group_id:id,code:'K7QM4XD9'}]); }
    if(m[1]==='current_invite') return out(200,[{code:'K7QM4XD9',expires_at:new Date(Date.now()+6*24*H).toISOString(),member_count:1,max_members:10}]);
    if(m[1]==='group_board'){ const d=j.p_day, today=j.p_today, late=d===today; const R=(uid,n,a,st,pr,g,me)=>({user_id:uid,display_name:n,avatar:a,is_me:!!me,status:st,progress:pr,goal_hours:g,cheered_by_me:cheered.has(uid+d),cheers_received:me?2:0});
      return out(200,late?[R('uid-me','Maya','lantern','fasting',.4,16,1),R('u-mei','Mei','crescent','fasting',.6,18),R('u-arj','Arjun','sunrise','reached',1,16),R('u-len','Lena','tea','resting',null,null),R('u-sam','Sam','star','none',null,null)]
        :[R('uid-me','Maya','lantern','reached',1,16,1),R('u-mei','Mei','crescent','fasted',.7,18),R('u-arj','Arjun','sunrise','reached',1,16),R('u-len','Lena','tea','resting',null,null),R('u-sam','Sam','star','none',null,null)]); }
    if(m[1]==='invite_preview'){ return out(200,j.p_code==='K7QM4XD9'?[{group_name:'Morning crew',inviter_name:'Mei',member_count:4,avatars:['crescent','sunrise','tea','star']}]:[]); }
    if(m[1]==='join_group'){ if(j.p_code==='FULLFULL') return out(200,[{status:'full',group_id:null}]); return out(200,[{status:'ok',group_id:'g9'}]); }
    if(m[1]==='group_roster') return out(200,[{user_id:'uid-me',display_name:'Maya',avatar:'lantern',role:'owner',is_me:true,sharing:sharingOn,joined_at:'2026-11-01T00:00:00Z'},{user_id:'u-mei',display_name:'Mei',avatar:'crescent',role:'member',is_me:false,sharing:null,joined_at:'2026-11-02T00:00:00Z'}]);
    if(m[1]==='send_cheer'){ if(j.p_to==='u-len') return out(400,{message:'not_cheerable'}); cheered.add(j.p_to+j.p_day); return out(200,null); }
    if(m[1]==='withdraw_cheer'){ cheered.delete(j.p_to+j.p_day); return out(200,null); }
    if(m[1]==='set_sharing'){ sharingOn=j.p_on; return out(200,null); }
    if(['publish_me','rename_group','remove_member','report_member','leave_group'].includes(m[1])) return out(200,null);
    out(404,{}); }); });
const srv=http.createServer((q,r)=>{ let p=path.join(root,decodeURIComponent(q.url.split('?')[0])); if(p.endsWith('/')) p+='index.html'; fs.readFile(p,(e,d)=>{ if(e){ r.writeHead(404); r.end(); } else{ r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html'}); r.end(d); } }); });
function ok(n){ console.log('ok -',n); }
(async()=>{ await new Promise(r=>mock.listen(0,r)); await new Promise(r=>srv.listen(0,r));
  const murl='http://localhost:'+mock.address().port, url='http://localhost:'+srv.address().port+'/'; const b=await chromium.launch(); const now=Date.now();
  const base=(extra)=>Object.assign({v:1,lang:'en',theme:'light',onboarded:true,profile:{fastedBefore:true,safety:false,care:[],careOff:null},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},off:[],unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:now-9*24*H,mod:now-1000,del:[]},extra||{});
  async function device(state,signed,w){ const ctx=await b.newContext({viewport:{width:w||390,height:844},timezoneId:'Asia/Shanghai',permissions:['clipboard-read','clipboard-write'],deviceScaleFactor:shots?2:1});
    await ctx.route('**/js/config.js',rt=>rt.fulfill({contentType:'text/javascript',body:`window.LIGHTLY_CLOUD={url:'${murl}',key:'anon'};`}));
    const p=await ctx.newPage(), errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.addInitScript(([s,a])=>{ if(!sessionStorage.s){ localStorage.setItem('lightly:v1',s); if(a) localStorage.setItem('lightly:auth',a); sessionStorage.s=1; } },[JSON.stringify(state),signed?JSON.stringify({access:'tok-1',refresh:'r',exp:Math.floor(Date.now()/1000)+3600,email:'me@example.com',uid:'uid-me',photo:'',name:''}):'']);
    await p.goto(url); await p.waitForTimeout(500); return {ctx,p,errs}; }
  const shot=async(p,n)=>{ if(shots){ fs.mkdirSync(shots,{recursive:true}); await p.screenshot({path:path.join(shots,n+'.png')}); } };
  const tabsVisible=p=>p.$$eval('#tabs button',bs=>bs.filter(x=>x.offsetParent!==null).map(x=>x.dataset.tab));

  // 1. off by default: three tabs, nothing about Friends but one switch in Me
  const d=await device(base(),false); const p=d.p;
  assert.deepStrictEqual(await tabsVisible(p),['today','days','me']); assert(!await p.evaluate(()=>/friend/i.test(document.getElementById('today').textContent+document.getElementById('days').textContent)),'no Friends text on Today or Days');
  await p.click('#tabs [data-tab=me]'); assert(await p.isVisible('#me [data-k=fr]'),'the preview switch is in Me'); assert.match(await p.textContent('#me'),/Friends \(preview\)/);
  const w3=await p.evaluate(()=>[document.getElementById('tabInd').getBoundingClientRect().width,document.getElementById('tabs').getBoundingClientRect().width]); assert(Math.abs(w3[0]-(w3[1]-12)/3)<1.5,'pill is a third: '+w3);
  ok('Friends is invisible until the preview switch is on');
  // 2. switch on: four tabs, the pill is a quarter wide
  await p.click('#me [data-k=fr]'); await p.evaluate(()=>document.getElementById('me').scrollTo(0,0)); await p.waitForTimeout(300); assert.deepStrictEqual(await tabsVisible(p),['today','days','friends','me']);
  const w4=await p.evaluate(()=>[document.getElementById('tabInd').getBoundingClientRect().width,document.getElementById('tabs').getBoundingClientRect().width]); assert(Math.abs(w4[0]-(w4[1]-12)/4)<1.5,'pill is a quarter: '+w4);
  await p.click('#tabs [data-tab=friends]'); await p.waitForTimeout(400);
  assert.match(await p.textContent('#friends'),/Friends needs an account\. Everything else works without one\./); assert(await p.isVisible('#friends [data-act=frsignin]')); await shot(p,'signed-out-en');
  await p.click('#friends [data-act=frsignin]'); await p.waitForSelector('#sheet.open'); assert(await p.isVisible('#sheet [data-act=google]')&&await p.isVisible('#sheet [data-act=emailsheet]')); await shot(p,'signin-sheet'); await p.click('#sheet .x');
  ok('four tabs, indicator width, signed-out state and sign-in sheet');
  // the switch stays on after a reload, and Today is unchanged
  await p.reload(); await p.waitForTimeout(500); assert.deepStrictEqual(await tabsVisible(p),['today','days','friends','me']); ok('the preview survives a reload');
  assert.deepStrictEqual(d.errs,[]);

  // 3. signed in: empty state, name and avatar, new group, invite
  const e=await device(base(),true), q=e.p; await q.evaluate(()=>localStorage.setItem('lightly:friends',JSON.stringify({preview:true}))); await q.reload(); await q.waitForTimeout(500);
  await q.click('#tabs [data-tab=friends]'); await q.waitForSelector('#friends [data-act=frnew]'); assert.match(await q.textContent('#friends'),/Start a group and send one link\./); await shot(q,'empty-en');
  assert(!/Enter an invite code/.test(await q.textContent('#friends')),'the code link arrives with the join flow');
  await q.click('#friends [data-act=frnew]'); await q.waitForSelector('#frName'); assert.strictEqual(await q.inputValue('#frName'),'','never prefilled from the email'); assert.strictEqual((await q.$$('#frAvs .avt')).length,8); await shot(q,'name-sheet');
  await q.click('[data-act=frnamego]'); assert.match(await q.textContent('body'),/Add a name first/); // blank is refused
  await q.fill('#frName','  Maya  '); await q.click('#frAvs [data-id=lantern]'); assert.strictEqual(await q.getAttribute('#frAvs [data-id=lantern]','aria-pressed'),'true'); await q.click('[data-act=frnamego]');
  await q.waitForSelector('#frGn'); assert.deepStrictEqual(calls.find(c=>c.fn==='upsert_profile').args,{p_name:'Maya',p_avatar:'lantern'}); await shot(q,'new-group');
  await q.fill('#frGn','Morning crew'); await q.click('[data-act=frcreate]'); await q.waitForSelector('.fr-code b');
  assert.strictEqual((await q.textContent('.fr-code b')).trim(),'K7QM 4XD9'); assert(await q.isVisible('.fr-qr svg')); assert.deepStrictEqual(calls.find(c=>c.fn==='create_group').args,{p_name:'Morning crew'}); await shot(q,'invite-sheet');
  await q.click('#frCopy'); const clip=await q.evaluate(()=>navigator.clipboard.readText()); assert.match(clip,/\?join=K7QM4XD9$/); assert.strictEqual((await q.textContent('#frCopy')).trim(),'Copied');
  ok('empty state, name and avatar, new group, invite sheet with QR, code and copy');
  await q.click('#sheet .x'); await q.waitForSelector('#friends .fr-name'); assert.strictEqual((await q.textContent('#friends .fr-name')).trim(),'Morning crew','creating a group opens it');
  await q.click('#friends [data-act=frback]'); await q.waitForSelector('#friends .row[data-act=frgroup]'); assert.match(await q.textContent('#friends'),/Morning crew/); assert.match(await q.textContent('#friends'),/1 person/); assert(await q.isVisible('#friends [data-act=frnew]')); await shot(q,'list-en'); ok('the group list');
  // 3b. the group screen: seven days, one row per person, Cheer, a person's week, settings, leaving; and what this phone publishes
  const b0=calls.filter(c=>c.fn==='group_board').length; await q.click('#friends .row[data-act=frgroup]'); await q.waitForSelector('#friends .fr-card .fr-row'); await q.waitForTimeout(300);
  assert.strictEqual(await q.$$eval('#friends .fr-days button',b=>b.length),7); assert.strictEqual(await q.getAttribute('#friends .fr-days button:last-child','aria-pressed'),'true','today is selected');
  assert.deepStrictEqual(await q.$$eval('#friends .fr-row .fr-nm b',b=>b.map(x=>x.textContent.replace(/\s+/g,' ').trim())),['MayaYou','Mei','Arjun','Lena','Sam'],'you first, then in the order people joined');
  const subs=await q.$$eval('#friends .fr-row .fr-nm small',b=>b.map(x=>x.textContent)); assert.deepStrictEqual(subs,['Fasting · 16h · 2 cheers','Fasting · 18h','Reached goal · 16h','Resting','Not fasting']);
  assert.match(await q.textContent('#friends .fr-sum'),/^Today · 2 fasting · 1 reached goal · 1 resting/); assert(!/%|most|rank|streak/i.test(await q.textContent('#friends')),'no percentages, ranking words or streaks');
  assert.deepStrictEqual(await q.$$eval('#friends .fr-ch',b=>b.length),2,'Cheer only on someone fasting or at their goal, never on yourself'); await shot(q,'group-en');
  const bc=calls.filter(c=>c.fn==='group_board').slice(b0); assert.strictEqual(bc.length,7,'all seven days load once when the group opens'); assert(bc.every(c=>/^\d{4}-\d\d-\d\d$/.test(c.args.p_today)&&c.args.p_day<=c.args.p_today));
  // a Cheer: silent, once, with Undo
  await q.click('#friends .fr-ch[data-u=u-mei]'); await q.waitForSelector('#toast.on .tundo'); assert.strictEqual(await q.getAttribute('#friends .fr-ch[data-u=u-mei]','aria-pressed'),'true'); assert.deepStrictEqual(calls.filter(c=>c.fn==='send_cheer').pop().args.p_to,'u-mei');
  await q.click('#toast .tundo'); await q.waitForTimeout(200); assert.strictEqual(await q.getAttribute('#friends .fr-ch[data-u=u-mei]','aria-pressed'),'false'); assert(calls.some(c=>c.fn==='withdraw_cheer'),'undo withdraws it'); ok('group screen: you first, words not percentages, Cheer and Undo');
  // another day: a past day has no Cheer, and nothing is reloaded that is already here
  const n0=calls.filter(c=>c.fn==='group_board').length; await q.click('#friends .fr-days button:nth-child(5)'); await q.waitForTimeout(200);
  assert.strictEqual(await q.$$eval('#friends .fr-ch',b=>b.length),0,'no Cheer for a past day'); assert.match(await q.textContent('#friends .fr-sum'),/Reached goal|reached goal/); assert.strictEqual(calls.filter(c=>c.fn==='group_board').length,n0,'a day already loaded is not fetched again'); await q.click('#friends .fr-days button:nth-child(7)');
  // a person's week
  await q.click('#friends .fr-tap[data-u=u-mei]'); await q.waitForSelector('#frWho'); assert.strictEqual(await q.$$eval('#frWho .fr-wk .frd',b=>b.length),7); assert.match(await q.textContent('#sheet'),/Last 7 days/); assert(await q.isVisible('#sheet [data-act=frcheer]')); assert(await q.isVisible('#sheet [data-act=frreport]')); assert(await q.isVisible('#sheet [data-act=frremove]'),'the owner can remove'); await shot(q,'person-en');
  await q.click('#sheet [data-act=frcheer]'); await q.waitForTimeout(250); assert.strictEqual((await q.textContent('#sheet [data-act=frcheer]')).trim(),'Cheered'); await q.click('#toast .tundo');
  await q.click('#sheet [data-act=frreport]'); await q.click('#sheet [data-act=frreportok]'); await q.waitForTimeout(250); assert.deepStrictEqual(calls.filter(c=>c.fn==='report_member').pop().args,{p_gid:'g1',p_uid:'u-mei'}); ok('a person sheet: week of discs, Cheer, report');
  await q.click('#friends .fr-tap[data-u=u-len]'); await q.waitForSelector('#frWho'); assert(!await q.isVisible('#sheet [data-act=frcheer]'),'no Cheer for someone resting'); await q.click('#sheet .x');
  // settings: members, sharing switch, rename, leave
  await q.click('#friends [data-act=frset]'); await q.waitForSelector('#sheet .fr-mem'); assert.strictEqual(await q.$$eval('#sheet .fr-mem',b=>b.length),2); assert.match(await q.textContent('#sheet'),/Share my status/); assert.match(await q.textContent('#sheet'),/sees you as resting/);
  await q.click('#sheet [data-act=frsharing]'); await q.waitForTimeout(250); assert.deepStrictEqual(calls.filter(c=>c.fn==='set_sharing').pop().args,{p_gid:'g1',p_on:false}); await shot(q,'settings-en');
  await q.click('#sheet [data-act=frrename]'); await q.fill('#frRn','Dawn crew'); await q.click('#sheet [data-act=frrenamego]'); await q.waitForTimeout(300); assert.strictEqual((await q.textContent('#friends .fr-name')).trim(),'Dawn crew'); assert.deepStrictEqual(calls.filter(c=>c.fn==='rename_group').pop().args,{p_gid:'g1',p_name:'Dawn crew'});
  ok('group settings: members, sharing switch, rename');
  // what this phone publishes: exactly the payload, nothing else
  const f=await device(base({cur:{start:now-5*H,goalH:16,planId:'16'}}),true); await f.p.evaluate(()=>localStorage.setItem('lightly:friends',JSON.stringify({preview:true}))); await f.p.reload(); await f.p.waitForTimeout(500); calls.length=0; await f.p.click('#tabs [data-tab=friends]'); await f.p.waitForTimeout(1200);
  const pub=calls.filter(c=>c.fn==='publish_me'); assert(pub.length>=1,'the phone publishes when it is in a group'); const pa=pub[pub.length-1].args;
  assert.deepStrictEqual(Object.keys(pa).sort(),['p_days','p_goal_hours','p_sacred','p_started_at','p_state']); assert.strictEqual(pa.p_state,'fasting'); assert.strictEqual(pa.p_goal_hours,16); assert.strictEqual(pa.p_days.length,7);
  assert(!/weight|height|age|email|place|shanghai|streak/i.test(JSON.stringify(pa)),'no body, place or streak data in what goes out'); ok('publish_me carries only the state, the plan and seven day rows');
  await q.click('#friends [data-act=frset]'); await q.waitForSelector('#sheet [data-act=frleave]'); await q.click('#sheet [data-act=frleave]'); await q.waitForSelector('#sheet [data-act=frleaveok]'); assert.match(await q.textContent('#sheet'),/Someone else becomes the owner|join again/);
  await q.click('#sheet [data-act=frleaveok]'); await q.waitForTimeout(400); assert.deepStrictEqual(calls.filter(c=>c.fn==='leave_group').pop().args,{p_gid:'g1'}); ok('leaving a group asks first');
  // the data stays in its own key and never in the app state or the backup copy
  const keys=await q.evaluate(()=>({s:localStorage.getItem('lightly:v1')||'',f:localStorage.getItem('lightly:friends')||''})); assert(!/Morning crew|Maya/.test(keys.s),'Friends data is not in the app state'); assert(/Morning crew/.test(keys.f)); ok('Friends data lives in its own key');
  // Chinese, narrow phone
  await q.click('#tabs [data-tab=me]'); await q.click('[data-act=choice][data-k=lang]'); await q.click('[data-act=pick][data-k=lang][data-v=zh]'); await q.waitForTimeout(300); await q.click('#tabs [data-tab=friends]'); await q.waitForTimeout(400); assert.match(await q.textContent('#tabF'),/朋友/); assert.match(await q.textContent('#friends'),/个人|人/); await shot(q,'list-zh');
  assert.deepStrictEqual(e.errs,[]); ok('Chinese');
  // 3c. joining: a code typed in, an invite link, the same link signed out
  const j1=await device(base(),true), jp=j1.p; await jp.evaluate(()=>localStorage.setItem('lightly:friends',JSON.stringify({preview:true}))); profile={display_name:'Maya',avatar:'lantern'}; groups=[]; await jp.reload(); await jp.waitForTimeout(500);
  await jp.click('#tabs [data-tab=friends]'); await jp.waitForSelector('#friends [data-act=frcode]'); assert.match(await jp.textContent('#friends'),/I have an invite code/); await jp.click('#friends [data-act=frcode]'); await jp.waitForSelector('#frCode');
  await jp.fill('#frCode','zzzz-zzzz'); await jp.click('#sheet [data-act=frcodego]'); await jp.waitForSelector('#sheet .note.err'); assert.match(await jp.textContent('#sheet'),/isn’t valid any more/); await shot(jp,'code-invalid');
  await jp.fill('#frCode','k7qm-4xd9'); await jp.click('#sheet [data-act=frcodego]'); await jp.waitForSelector('#sheet [data-act=frjoinok]');
  const cs=await jp.textContent('#sheet'); assert.match(cs,/Join “Morning crew”\?/); assert.match(cs,/Invited by Mei · 4 of 10 people/); assert.match(cs,/The group sees/); assert.match(cs,/Hours fasted, times, where you are, your weight, or a streak\./); await shot(jp,'consent-en');
  await jp.click('#sheet [data-act=frjoinok]'); await jp.waitForTimeout(500); assert.deepStrictEqual(calls.filter(c=>c.fn==='join_group').pop().args,{p_code:'K7QM4XD9'}); ok('enter a code: invalid, then the consent sheet, then join');
  // the link: opens straight onto the consent sheet, takes the code out of the address bar, and asks for a name first if there is none
  profile=null; groups=[]; const j2=await device(base(),true), lp=j2.p; await lp.goto(url+'?join=k7qm4xd9'); await lp.waitForSelector('#sheet [data-act=frjoinok]',{timeout:8000});
  assert.strictEqual(await lp.evaluate(()=>location.search),'','the code leaves the address bar'); assert.deepStrictEqual(await tabsVisible(lp),['today','days','friends','me'],'the link turns the preview on');
  await lp.click('#sheet [data-act=frjoinok]'); await lp.waitForSelector('#frName'); await lp.fill('#frName','Sam'); await lp.click('[data-act=frnamego]'); await lp.waitForSelector('#sheet [data-act=frjoinok]'); assert.match(await lp.textContent('#sheet'),/Join “Morning crew”\?/,'back to the invite after choosing a name');
  await lp.click('#sheet [data-act=frjoinok]'); await lp.waitForTimeout(500); assert(calls.filter(c=>c.fn==='join_group').length>=2); ok('an invite link opens the consent sheet and survives choosing a name');
  // a full or bad link says so and is dropped
  const j3=await device(base(),true), fp=j3.p; await fp.goto(url+'?join=ZZZZZZZZ'); await fp.waitForTimeout(900); assert.match(await fp.textContent('#toast'),/isn’t valid any more/); assert.strictEqual(JSON.parse(await fp.evaluate(()=>localStorage.getItem('lightly:friends'))).joinCode,'','a dead code is forgotten'); ok('a dead invite link says so');
  // signed out: the group is named, and the sign-in link carries the code
  const j4=await device(base(),false), sp=j4.p; await sp.goto(url+'?join=K7QM4XD9'); await sp.waitForSelector('#friends .fr-h',{timeout:8000}); await sp.waitForFunction(()=>/Morning crew/.test(document.getElementById('friends').textContent),null,{timeout:8000});
  assert.match(await sp.textContent('#friends'),/You’re invited to “Morning crew”/); assert.match(await sp.textContent('#friends'),/Sign in to join/); await shot(sp,'invited-signed-out');
  await sp.click('#friends [data-act=frsignin]'); await sp.click('#sheet [data-act=emailsheet]'); await sp.fill('#emIn','me@example.com'); await sp.click('#sheet [data-act=emsend]'); await sp.waitForTimeout(500);
  assert(otps.length&&/join%3DK7QM4XD9|join=K7QM4XD9/.test(decodeURIComponent(otps[otps.length-1])),'the sign-in link keeps the invite code'); ok('signed out: the invite is named, and the sign-in link keeps its code');
  assert.deepStrictEqual(j1.errs.concat(j2.errs,j3.errs,j4.errs),[]);
  // 4. Care mode: an eating-disorder answer hides Friends completely; other Care answers keep it
  const c=await device(base({profile:{fastedBefore:true,safety:true,care:['ed'],careOff:null}}),true); await c.p.evaluate(()=>localStorage.setItem('lightly:friends',JSON.stringify({preview:true}))); await c.p.reload(); await c.p.waitForTimeout(500);
  assert.deepStrictEqual(await tabsVisible(c.p),['today','days','me']); await c.p.click('#tabs [data-tab=me]'); assert(!await c.p.isVisible('#me [data-k=fr]'),'no switch either'); ok('eating-disorder answer: no Friends at all');
  const ed=await device(base({profile:{fastedBefore:true,safety:true,care:['ed'],careOff:null}}),true); await ed.p.goto(url+'?join=K7QM4XD9'); await ed.p.waitForTimeout(900); assert.deepStrictEqual(await tabsVisible(ed.p),['today','days','me']); assert(!await ed.p.isVisible('#sheet.open'),'no invite sheet'); assert.strictEqual(JSON.parse(await ed.p.evaluate(()=>localStorage.getItem('lightly:friends'))).joinCode,'','the code is dropped'); ok('an invite link does nothing for the eating-disorder answer');
  const g=await device(base({profile:{fastedBefore:true,safety:true,care:['preg'],careOff:null}}),true); await g.p.evaluate(()=>localStorage.setItem('lightly:friends',JSON.stringify({preview:true}))); await g.p.reload(); await g.p.waitForTimeout(500);
  assert.deepStrictEqual(await tabsVisible(g.p),['today','days','friends','me']); ok('other Care answers keep Friends');
  // 5. four tabs fit at 375 and 320 wide
  for(const w of [375,320]){ const n=await device(base(),true,w); await n.p.evaluate(()=>localStorage.setItem('lightly:friends',JSON.stringify({preview:true}))); await n.p.reload(); await n.p.waitForTimeout(500);
    const r=await n.p.$$eval('#tabs button',bs=>bs.filter(x=>x.offsetParent!==null).map(x=>{ const r=x.getBoundingClientRect(),s=x.querySelector('span').getBoundingClientRect(); return {w:r.width,text:s.width,l:s.left-r.left,rr:r.right-s.right}; })); assert.strictEqual(r.length,4); r.forEach(x=>assert(x.l>=0&&x.rr>=0,'a tab label is wider than its tab at '+w+': '+JSON.stringify(x))); await shot(n.p,'tabs-'+w); }
  ok('four tabs fit at 375 and 320');
  assert.deepStrictEqual(c.errs.concat(g.errs),[]); console.log('friends ui ok'); await b.close(); mock.close(); srv.close();
})().catch(e=>{ console.error(e); process.exit(1); });
