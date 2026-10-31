/* End-to-end flows in a real browser. usage: NODE_PATH=$(npm root -g) node tests/flow.test.js */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
const srv=http.createServer((q,r)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(f.endsWith('/'))f+='index.html';fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});r.end(d);}});});
const H=3600000,D=24*H;
(async()=>{await new Promise(r=>srv.listen(0,r));const url='http://localhost:'+srv.address().port+'/';
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',geolocation:{latitude:31.23,longitude:121.47},permissions:['geolocation']});
 const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
 const S=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')||'null'));
 const ok=n=>console.log('ok -',n);
 // drive the in-app wheel pickers the way a finger does: open the row, scroll each column to its item
 const pick=async(pg,sel,v)=>{await pg.click(sel+' .pk-row');await pg.waitForTimeout(450);await pg.evaluate(([sel,v])=>{const pk=document.querySelector(sel),go=(k,i)=>{const c=pk.querySelector('[data-c='+k+']');if(c)c.scrollTo({top:i*36})},kind=pk.dataset.kind;
   if(kind==='sel'){go('s',JSON.parse(pk.dataset.opts).indexOf(v));return;}
   let d,hh,mm;if(kind==='dt'){d=new Date(v);const a=new Date(d);a.setHours(0,0,0,0);go('d',Math.round((a-new Date(+pk.dataset.d0))/864e5));hh=d.getHours();mm=d.getMinutes();}else{const a=v.split(':');hh=+a[0];mm=+a[1];}
   go('h',(hh%12||12)-1);go('m',mm);go('p',hh<12?0:1);},[sel,v]);await pg.waitForTimeout(500);};
 await p.goto(url);await p.waitForTimeout(500);
 // onboarding: first time + no safety flags -> Sunrise 13:11 suggested
 await p.click('[data-act=obnext]');await p.waitForTimeout(600);
 await p.click('[data-act=obopt][data-v=first]');await p.waitForTimeout(500);assert.strictEqual(await p.locator('.ob-step.on .rung.on').count(),1,'first time lights one rung');await p.click('[data-act=obnext]');await p.waitForTimeout(600);
 assert(await p.$('.ob-step.on .plan.sel[data-id="13"]'),'13:11 suggested for a first timer');
 await p.click('.ob-step.on [data-act=obnext]');await p.waitForTimeout(600);
 assert(!(await p.$('#obCity')),'no city list until asked');assert.match(await p.textContent('.ob-step.on [data-act=obgeo]'),/Use my location/);await p.click('.ob-step.on [data-act=obcityshow]');await p.waitForTimeout(500);await pick(p,'#obCity','london');await p.click('.ob-step.on [data-act=obnext]');await p.waitForTimeout(600);await p.evaluate(()=>{window.__an=[];document.getElementById('ob').addEventListener('animationstart',e=>window.__an.push(e.animationName),true);});await p.click('[data-act=obsafe][data-v=preg]');await p.waitForTimeout(700);await p.click('[data-act=obsafe][data-v=preg]');await p.waitForTimeout(700);assert(!(await p.evaluate(()=>window.__an)).includes('obin'),'picking or clearing a safety option must not replay the step entrance (screen flash)');await p.click('[data-act=obsafe][data-v=none]');await p.click('.ob-step.on [data-act=obnext]');await p.waitForTimeout(600);assert.match(await p.textContent('.ob-step.on'),/You’re set/);assert.match(await p.textContent('.ob-step.on'),/13:11/);await p.click('[data-act=obdone]');await p.waitForTimeout(800);
 let s=await S();assert.strictEqual(s.planId,'13');assert.strictEqual(s.place.key,'london');assert(s.onboarded);assert.strictEqual((await p.textContent('#planChip')).trim(),'13h','plan button shows hours, not a clock-like ratio');ok('onboarding sets plan, city and profile');
 // start, reload, still running
 await p.click('#act');await p.waitForTimeout(400);s=await S();assert(s.cur&&s.cur.goalH===13);
 await p.reload();await p.waitForTimeout(700);assert((await S()).cur,'fast survives reload');
 assert.match(await p.textContent('#actLbl'),/Hold to end/);ok('fast persists across reload');
 assert.match(await p.textContent('#skyTx'),/^(Sunrise|Sunset) in \d/,'while fasting the sky pill names the event and counts to it, not "left"');assert.doesNotMatch(await p.textContent('#skyTx'),/left/);assert.strictEqual(await p.$eval('#sub',e=>e.tagName),'BUTTON');
 await p.click('#sub');await p.waitForTimeout(450);assert.match(await p.textContent('#sheet h3'),/Moon and sun/);assert.match(await p.textContent('#sheet'),/Sunrise[\s\S]*Sunset/);assert(await p.evaluate(()=>document.getElementById('scrim').classList.contains('on')),'the sheet dims and blurs the screen like the others');await p.click('#sheet [data-act=close]');await p.waitForTimeout(450);ok('sky pill: names the event, opens the Moon and sun sheet');
 // long fasts locked and shown with progress
 await p.click('#planBtn');await p.click('[data-act=more]');
 assert(await p.$('.plan[data-id="24"][disabled]'),'24h locked');assert(await p.$('.plan[data-id="36"][disabled]'));ok('24 h and 36 h locked for a newcomer');
 await p.click('#sheet [data-act=close]');
 // edit start time to 3 hours ago
 await p.click('#endA');await pick(p,'#stS',Date.now()-3*3600000);assert.match(await p.textContent('#stS .pk-v'),/Today, \d+:\d\d [AP]M/,'the row shows the picked time');await p.click('[data-act=stsave]');await p.waitForTimeout(300);s=await S();assert(Math.abs((Date.now()-s.cur.start)/H-3)<.05);ok('start time editable');
 // hold to end: short press does nothing, long press saves and does not restart
 const box=await p.locator('#act').boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await p.mouse.down();await p.waitForTimeout(300);await p.mouse.up();assert((await S()).cur,'short press keeps fasting');
 await p.mouse.down();await p.waitForTimeout(2200);await p.mouse.up();await p.waitForTimeout(400);s=await S();
 assert(!s.cur&&s.fasts.length===1,'long press ends and saves');assert(await p.$('#sheet.open'),'saved sheet');ok('hold to end saves exactly one fast, no restart');
 await p.click('#sheet [data-act=close]');
 // eating window
 assert.match(await p.textContent('#readK'),/Eating window/);ok('eating window after a fast');
 // days: edit fast
 await p.click('#tabs [data-tab=days]');await p.click('.cal-g button.today');await p.click('[data-act=edit]');
 const e1=await p.evaluate(()=>document.getElementById('fsE').dataset.val);await p.fill('#fsG','3');await p.click('[data-act=fssave]');await p.waitForTimeout(300);
 s=await S();assert.strictEqual(s.fasts[0].goalH,3);ok('past fast editable');
 // delete it, add a missed one (overlaps are refused), delete again
 await p.click('#days [data-act=edit]');await p.click('[data-act=fsdel]');await p.waitForTimeout(200);assert.strictEqual((await S()).fasts.length,0);
 await p.click('#days .cal-g button.today');await p.waitForTimeout(450);await p.click('#dayFab');await p.click('[data-act=fssave]');await p.waitForTimeout(300);assert.strictEqual((await S()).fasts.length,1,'a missed fast can be added');
 await p.click('#days .cal-g button.today');await p.waitForTimeout(450);assert.strictEqual(await p.getAttribute('#dayFab','data-mode'),'edit','a day with a fast offers edit, not a second add');assert.strictEqual((await S()).fasts.length,1);
 await p.click('#days [data-act=edit]');await p.waitForTimeout(300);assert(await p.$('#sheet .sh-h .x'),'dismiss lives in the title row');assert(!(await p.$('#sheet .btn.sec')),'no Cancel pill in the sheet');assert.strictEqual((await p.$$('#sheet .btns .btn')).length,1,'one primary button');
 await p.click('[data-act=fsdel]');await p.waitForTimeout(300);assert.strictEqual((await S()).fasts.length,0);assert(await p.$('#toast [data-act=toastundo]'),'delete offers undo');await p.click('#toast [data-act=toastundo]');await p.waitForTimeout(300);assert.strictEqual((await S()).fasts.length,1,'undo brings the fast back');
 await p.click('#days .cal-g button.today');await p.waitForTimeout(450);await p.click('#days [data-act=edit]');await p.click('[data-act=fsdel]');await p.waitForTimeout(200);assert.strictEqual((await S()).fasts.length,0);ok('fasts can be added, deleted with undo; a filled day offers edit; sheets dismiss from the title row');
 // cheat day: use today, then it is spent
 await p.evaluate(()=>{document.getElementById('days').scrollTop=0});await p.waitForTimeout(700);
 await p.click('#tabs [data-tab=today]');assert(await p.$eval('#streakBtn',e=>e.hidden),'no streak card before the first fast');
 await p.click('#tabs [data-tab=days]');await p.click('#days .cal-g button.today');await p.waitForTimeout(450);await p.click('#dayFab');await p.click('[data-act=fssave]');await p.waitForTimeout(300);
 await p.evaluate(()=>{document.getElementById('days').scrollTop=0});await p.waitForTimeout(700);
 await p.click('#tabs [data-tab=today]');assert(!(await p.$eval('#streakBtn',e=>e.hidden)),'the streak card appears once a fast is saved');assert(!/cheat/i.test(await p.textContent('#streakBtn')),'cheat-day count lives in its sheet');await p.click('#tabs [data-tab=days]');await p.click('#days .cal-g button.today');await p.waitForTimeout(450);await p.click('#days [data-act=edit]');await p.click('[data-act=fsdel]');await p.waitForTimeout(200);await p.evaluate(()=>{document.getElementById('days').scrollTop=0});await p.waitForTimeout(700);
 // language
 await p.click('#tabs [data-tab=me]');await p.click('#me [data-act=choice][data-k=lang]');await p.click('#sheet [data-act=pick][data-v=zh]');await p.waitForTimeout(450);assert.match(await p.textContent('#me'),/断食/);assert(!(await p.$('#me .h-title')),'no big title');assert.strictEqual(await p.evaluate(()=>document.documentElement.lang),'zh-Hans');ok('language switch');
 // ramadan preview adds the plan
 await p.click('[data-act=sw][data-k=ram]');await p.evaluate(()=>{document.querySelector('#me').scrollTop=0});await p.waitForTimeout(500);await p.click('#tabs [data-tab=today]');await p.click('#planBtn');assert(await p.$('.plan[data-id="ramadan"]'));ok('Ramadan row appears only with season/preview');
 // time off: travel then end early; unwell break; rows removed
 await p.keyboard.press('Escape');await p.evaluate(()=>{document.querySelector('#scrim').click()});await p.waitForTimeout(500);await p.click('#tabs [data-tab=me]');assert(!(await p.$('#me [data-act=redo]'))&&!(await p.$('#me [data-act=plan]')),'redo and plan rows gone');
 await p.click('#me [data-act=timeoff]');await p.click('#sheet [data-act=offtravel]');await p.click('#sheet [data-act=offset][data-n="10"]');assert.match(await p.textContent('#sheet .sv b'),/^10$/);assert.strictEqual(await p.evaluate(()=>getComputedStyle(document.querySelector('#offChips .thumb')).getPropertyValue('--i')),'2','thumb moves to 10');for(let i=0;i<4;i++)await p.click('#sheet [data-d="1"]');assert((await p.$('#sheet [data-d="1"][disabled]')),'capped at 14');assert.match(await p.textContent('#sheet .sv b'),/^14$/);
 for(let i=0;i<12;i++)await p.click('#sheet [data-d="-1"]');await p.click('#sheet [data-act=offgo]');await p.waitForTimeout(300);s=await S();assert.strictEqual(s.off.length,1);assert.strictEqual(s.off[0].kind,'travel');assert.strictEqual(s.off[0].days,2);assert(!(await p.$('#me [data-act=cheat]')),'no cheat days row on Me during time off');
 await p.evaluate(()=>{document.querySelector('#me').scrollTop=0});await p.waitForTimeout(500);await p.click('#tabs [data-tab=today]');assert(await p.isVisible('#offBar'),'banner shows');assert(await p.$eval('#streakBtn',e=>e.disabled),'streak card does not open cheat days during time off');assert.strictEqual(await p.getAttribute('#act','aria-disabled'),'true','Start Fast looks off during a break');assert(!(await p.evaluate(()=>document.getElementById('act').disabled)),'but stays a real, focusable button');
 {const bx=await p.locator('#act').boundingBox();await p.mouse.click(bx.x+bx.width/2,bx.y+bx.height/2);}await p.waitForTimeout(250);assert.match(await p.textContent('#toast'),/End break|结束休息/,'tapping Start Fast during a break says to end the break first');assert(await p.evaluate(()=>document.getElementById('toast').classList.contains('on')),'the message is showing');assert(await p.evaluate(()=>document.getElementById('offBar').classList.contains('nudge')),'the End break pill lights up');assert.strictEqual((await S()).cur,null,'no fast starts during a break');assert(await p.evaluate(()=>document.getElementById('act').getAnimations().length>0),'the button shakes');
 await p.waitForTimeout(600);await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(150);{const bx=await p.locator('#act').boundingBox();await p.mouse.click(bx.x+bx.width/2,bx.y+bx.height/2);}await p.waitForTimeout(150);assert.strictEqual(await p.evaluate(()=>document.getElementById('act').getAnimations().length),0,'no shake under Reduce Motion');assert.match(await p.textContent('#toast'),/End break|结束休息/,'the words still show under Reduce Motion');await p.emulateMedia({reducedMotion:'no-preference'});assert.match(await p.textContent('#readBig'),/Break|休息/);await p.click('#offBar');await p.click('#sheet [data-act=offend]');await p.waitForTimeout(300);s=await S();assert(s.off[0].endedAt);assert(!(await p.isVisible('#offBar')));assert.strictEqual(await p.getAttribute('#act','aria-disabled'),'false','Start Fast back after the break');assert(!(await p.$eval('#streakBtn',e=>e.disabled)),'streak card opens cheat days again after the break');ok('time off: travel 1 to 14 days, banner, Start Fast looks off and nudges when tapped, end early');
 await p.click('#tabs [data-tab=me]');assert(await p.$('#me [data-act=cheat]'),'cheat days row is back on Me after the break');await p.click('#me [data-act=timeoff]');await p.click('#sheet [data-act=offunwell]');await p.click('#sheet [data-act=offgo]');await p.waitForTimeout(300);s=await S();assert.strictEqual(s.off[1].kind,'unwell');assert.strictEqual(s.off[1].days,14);assert(s.unwell);ok('time off: unwell starts a 2-week break at once');
 // ---- plan ladder, experienced setup, overtime, editing the end of a finished fast, email-only sign-in
 const seed=(o)=>Object.assign({v:1,lang:'en',theme:'auto',onboarded:true,profile:{fastedBefore:false,safety:false},planId:'13',customH:16,place:{key:'shanghai'},cur:null,fasts:[],flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,startedAt:Date.now()-30*D,mod:1,del:[]},o);
 {const f0=Date.now()-2*D;const q=await fresh(seed({fasts:[{id:'a1',start:f0,end:f0+16*H,goalH:16,plan:'16'}]}));await q.waitForTimeout(400);
  assert(!(await q.$eval('#streakBtn',e=>e.hidden)),'streak card shows once there is a fast');await q.click('#streakBtn');await q.click('#sheet [data-act=usecheat]',{timeout:400}).then(()=>assert.fail('a plain click must not use a cheat day'),()=>{});
  {const bx=await q.locator('#sheet [data-hold=usecheat]').boundingBox();await q.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2);await q.mouse.down();await q.waitForTimeout(300);await q.mouse.up();await q.waitForTimeout(200);
   assert.strictEqual((await q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).flex.used.length,0,'a short press does nothing');
   await q.mouse.down();await q.waitForTimeout(1500);await q.mouse.up();await q.waitForTimeout(300);}
  assert.strictEqual((await q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).flex.used.length,1);ok('streak card opens the cheat days sheet; a short press does nothing, holding uses one');}
 {const q=await fresh(seed({}));await q.click('#tabs [data-tab=days]');await q.waitForTimeout(700);
  assert(await q.$('#days .firstuse'),'first use shows one line and one action');assert(!(await q.$('#days .mile')),'no stats before the first fast');assert(!(await q.$('#days .legend')),'no legend before the first fast');
  await q.click('#days .firstuse [data-act=gotoday]');await q.waitForTimeout(500);assert.strictEqual(await q.getAttribute('#tabs [data-tab=today]','aria-current'),'page');ok('Days first use: one line, one action, no empty stats');}
 {const f0=Date.now()-3*D;const q=await fresh(seed({fasts:[{id:'a1',start:f0,end:f0+16*H,goalH:16,plan:'16'}]}));await q.click('#tabs [data-tab=days]');await q.waitForTimeout(700);
  const yk=await q.evaluate(()=>{const d=new Date(Date.now()-24*36e5);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')});
  const cell=await q.$('#days .cal-g button[data-k="'+yk+'"]');if(cell){await cell.click();await q.waitForTimeout(500);assert.match(await q.textContent('#days .nolog'),/Nothing logged/);assert(await q.$('#days [data-act=addday]'),'add a fast row');
   await q.click('#days [data-act=addday]');await q.waitForTimeout(500);assert(await q.$('#sheet #fsS'),'add sheet opens for that day');ok('Days empty day: Nothing logged with an add row');}else{ok('Days empty day (no cell hook, skipped)');}}
 async function fresh(state){const c=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai'});const q=await c.newPage();q.on('pageerror',e=>errs.push(e.message));if(state)await q.addInitScript(x=>{if(!sessionStorage.s){localStorage.setItem('lightly:v1',x);sessionStorage.s=1}},JSON.stringify(state));await q.goto(url);await q.waitForTimeout(600);return q;}
 const fz=(n,h)=>Array.from({length:n},(_,i)=>({id:'f'+i+'-'+h,start:Date.now()-(i+2)*D,end:Date.now()-(i+2)*D+h*H,goalH:h,plan:String(h)}));
 // Days: milestone header, swipe between months, month picker, no cheat row
 {const old=Date.now()-75*D;const fl=Array.from({length:6},(_,i)=>({id:'dd'+i,start:Date.now()-(i+1)*D-16*H,end:Date.now()-(i+1)*D,goalH:16,plan:'16'})).concat([{id:'dold',start:old-16*H,end:old,goalH:16,plan:'16'}]);
 const q=await fresh(seed({planId:'16',fasts:fl}));await q.click('#tabs [data-tab=days]');await q.waitForTimeout(900);
 assert.match(await q.textContent('#days .mile .mline'),/fasts? this month|No fasts yet this month/);assert(!(await q.$('#days .mrow')),'no tile row, one quiet line');assert(!(await q.$('#days [data-act=usecheat]')),'no cheat row on Days');
 const t0=await q.textContent('#days .cal-t');const g=await q.locator('#days .cal-g').boundingBox();
 const sw=async(dx)=>{await q.mouse.move(g.x+200,g.y+100);await q.mouse.down();for(let i=1;i<=8;i++)await q.mouse.move(g.x+200+dx*i/8,g.y+100);await q.mouse.up();await q.waitForTimeout(700);};
 await sw(-150);assert.strictEqual(await q.textContent('#days .cal-t'),t0,'no month after this one');
 await sw(150);const t1=await q.textContent('#days .cal-t');assert.notStrictEqual(t1,t0,'swipe right goes back');
 await sw(-150);assert.strictEqual(await q.textContent('#days .cal-t'),t0,'swipe left comes forward');
 assert(!(await q.$('#days .cal-g button.sel'))&&!(await q.$('#days .gh')),'nothing selected and no day description before a tap'); assert(!(await q.$('#days [data-act=add]')),'no add row under the calendar');assert(!(await q.evaluate(()=>document.getElementById('dayFab').classList.contains('on'))),'edit button hidden until a date is tapped');
 await q.click('#days .cal-g button.today');await q.waitForTimeout(700);assert(await q.evaluate(()=>document.getElementById('dayFab').classList.contains('on')&&document.getElementById('dayFab').dataset.mode==='add'),'plus button shows for an empty day');
 await q.click('#days .cal-g button.done');await q.waitForTimeout(700);assert(await q.evaluate(()=>document.getElementById('dayFab').classList.contains('on')&&document.getElementById('dayFab').dataset.mode==='edit'),'pencil shows for a day with a fast');assert(await q.$('#days .cal-g button.done.sel')&&await q.$('#days .gh'),'tapped date is highlighted and described');
 await q.click('#dayFab');await q.waitForTimeout(500);assert(await q.$('#sheet.open [data-act=fssave]'),'edit button opens the fast editor');await q.click('#sheet [data-act=close]');await q.waitForTimeout(400);
 await q.click('#days .cal-t');await q.waitForTimeout(600);assert(await q.$('#sheet.float.open'),'picker opens as floating card');assert(await q.evaluate(()=>getComputedStyle(document.getElementById('scrim')).backdropFilter!=='none'),'blur behind picker');
 const en=await q.evaluate(()=>[...document.querySelectorAll('#sheet .pm:not([disabled])')].length);assert(en>=3,'months with data are open');
 await q.click('#sheet .pm:not([disabled]):not(.on)');await q.waitForTimeout(600);assert.notStrictEqual(await q.textContent('#days .cal-t'),t0,'picker jumps to the month');
 const q2=await fresh(seed({planId:'16',fasts:fl.slice(0,3)}));await q2.click('#tabs [data-tab=days]');await q2.waitForTimeout(700);assert(!(await q2.$('#days .cal-t')),'no picker with one month of data');
 await q.context().close();await q2.context().close();ok('Days header, swipe, picker, no cheat row');}
 // appearance: the sheet stays open, the whole app switches, the sheet shows the new choice
 {const q=await fresh(seed({theme:'light'}));await q.click('#tabs [data-tab=me]');await q.click('#me [data-act=choice][data-k=theme]');await q.waitForTimeout(500);
 await q.evaluate(()=>{window.__pick=()=>[...document.querySelectorAll('#me .group,#me .row,#me .row *,#sheet,#sheet *,.tabs,.tabs *,.scrim,.btn')].map(e=>getComputedStyle(e).backgroundColor+'|'+getComputedStyle(e).color);});
 const blur=()=>q.evaluate(()=>getComputedStyle(document.getElementById('scrim')).backdropFilter);const b0=await blur();assert.match(b0,/blur\(4px\)/,'blur is on before the switch');
 await q.click('#sheet [data-act=pick][data-v=dark]');const early=await q.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(window.__pick())))));const seen=[];for(const t of [40,110,200,320]){await q.waitForTimeout(t===40?40:t-[40,110,200,320][[40,110,200,320].indexOf(t)-1]);seen.push(await blur());}
 await q.waitForTimeout(700);seen.push(await blur());
 const late=await q.evaluate(()=>window.__pick());assert.strictEqual(early.filter((v,i)=>v!==late[i]).length,0,'every element, text included, is in its final colours within two frames');
 assert(seen.every(v=>/blur\(4px\)/.test(v)),'blur stays at 4px through the whole colour switch: '+seen.join(' | '));
 assert.strictEqual(await q.evaluate(()=>document.documentElement.getAttribute('data-theme')),'dark');assert(await q.$('#sheet.open'),'sheet stays open after choosing');assert(await q.$('#sheet .plan.sel[data-v=dark]'),'sheet shows the new choice');
 assert.strictEqual(await q.evaluate(()=>getComputedStyle(document.body).getPropertyValue('color-scheme')||getComputedStyle(document.documentElement).colorScheme),'dark');
 await q.click('#sheet [data-act=pick][data-v=light]');await q.waitForTimeout(900);assert.strictEqual(await q.evaluate(()=>document.documentElement.getAttribute('data-theme')),'light');assert(await q.$('#sheet.open'),'still open');
 await q.click('#sheet [data-act=close]');await q.waitForTimeout(500);assert(!(await q.$('#sheet.open')),'closes only when asked');await q.context().close();ok('appearance switches in place and the sheet stays open');}
 // Today has the sky behind it, the other tabs a plain background: the swap is instant, not a slow fade
 {const q=await fresh(seed({}));await q.waitForTimeout(1200);const bg=()=>q.evaluate(()=>getComputedStyle(document.getElementById('ph')).backgroundColor);
 for(const [a,b2] of [['today','days'],['days','today'],['today','me']]){await q.click('#tabs [data-tab='+a+']');await q.waitForTimeout(1500);await q.click('#tabs [data-tab='+b2+']');await q.waitForTimeout(80);const e=await bg();await q.waitForTimeout(1400);assert.strictEqual(e,await bg(),'background is already final 80 ms after switching '+a+' to '+b2);}
 await q.context().close();ok('tab switches change the background colour at once');}
 // first timer: 16:8 locked with progress, opens after three completed 13 h fasts
 let q=await fresh(seed({fasts:fz(1,13)}));await q.click('#planBtn');
 assert(await q.$('.plan[data-id="16"][disabled]'),'16:8 locked');assert.match(await q.textContent('.plan[data-id="16"]'),/1 of 3 fasts of 13 h/);assert(await q.$('.plan[data-id="13"]:not([disabled])'));ok('first timer: only 13:11 open, 16:8 shows 1 of 3');
 q=await fresh(seed({fasts:fz(3,13)}));await q.click('#planBtn');assert(await q.$('.plan[data-id="16"]:not([disabled])'),'16:8 open after three');assert(await q.$('.plan[data-id="18"][disabled]'),'18:6 still locked');ok('three completed 13 h fasts open 16:8 only');
 // someone who has fasted before: everything everyday is open
 q=await fresh(seed({profile:{fastedBefore:true,safety:false},planId:'16'}));await q.click('#planBtn');assert(await q.$('.plan[data-id="20"]:not([disabled])'));ok('experienced: every everyday plan open');
 // a locked saved plan falls back on load
 q=await fresh(seed({planId:'20'}));assert.strictEqual((await q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).planId,'13');ok('a locked saved plan falls back to 13:11');
 // experienced onboarding has the extra step and keeps the start time
 q=await fresh(null);await q.click('[data-act=obnext]');await q.waitForTimeout(1000);await q.click('[data-act=obopt][data-v=before]');await q.click('[data-act=obnext]');await q.waitForTimeout(1000);
 assert(await q.$('.ob-step.on .plan[data-id="20"]:not([disabled])'),'all plans open');assert(await q.$('.ob-step.on .plan.sel[data-id="16"]'),'16:8 default');await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(1000);
 assert(await q.$('#obStart'),'customise step');await pick(q,'#obStart','21:30');await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);assert(await q.$('.ob-step.on #obImpFile'),'import step for people who fasted before');await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);await q.click('.ob-step.on [data-act=obcityshow]');await q.waitForTimeout(1000);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);await q.click('[data-act=obsafe][data-v=none]');await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);await q.click('[data-act=obdone]');await q.waitForTimeout(600);
 assert.strictEqual((await q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).prefs.usualStart,'21:30');ok('experienced onboarding: customise step saves the usual start');
 q=await fresh(null);await q.click('[data-act=obnext]');await q.waitForTimeout(1000);await q.click('[data-act=obopt][data-v=first]');await q.click('[data-act=obnext]');await q.waitForTimeout(1000);
 assert(await q.$('.ob-step.on .plan[data-id="16"][disabled]'),'16:8 locked in onboarding');await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(1000);assert(!(await q.$('#obStart')),'no customise step for first timers');ok('first-timer onboarding shows locks and skips the customise step');
 // a safety flag at the end lowers an experienced plan to 13:11
 q=await fresh(null);await q.click('[data-act=obnext]');await q.waitForTimeout(1000);await q.click('[data-act=obopt][data-v=before]');await q.click('[data-act=obnext]');await q.waitForTimeout(1000);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(1000);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);await q.click('.ob-step.on [data-act=obcityshow]');await q.waitForTimeout(1000);await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);await q.click('[data-act=obsafe][data-v=diab]');await q.click('.ob-step.on [data-act=obnext]');await q.waitForTimeout(600);assert.match(await q.textContent('.ob-step.on'),/stays at 13:11/);await q.click('[data-act=obdone]');await q.waitForTimeout(600);{const s2=await q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')));assert.strictEqual(s2.planId,'13');assert(s2.profile.safety);}ok('safety flag at the end lowers the plan to 13:11');
 // overtime: the disc stays full, the label says how far past the goal, one calm nudge, the timer keeps counting
 q=await fresh(seed({cur:{start:Date.now()-5*H,goalH:13,planId:'13',reached:false}}));await q.waitForTimeout(500);
 assert.match(await q.textContent('.kline'),/Time left\s*Elapsed 5:00:\d\d/,'the other value sits on the label line');
 assert(!(await q.$eval('#readTip',e=>e.classList.contains('quiet'))),'the hint shows when the app opens');await q.waitForTimeout(6600);
 assert(await q.$eval('#readTip',e=>e.classList.contains('quiet')),'the hint goes quiet after a few seconds');ok('readout: elapsed on the label line, hint at moments only');
 q=await fresh(seed({cur:{start:Date.now()-(13*H+80*60000),goalH:13,planId:'13',reached:true}}));
 assert.match(await q.textContent('#readK'),/1 h 20 m past your goal/);assert.match(await q.textContent('#readBig'),/14/);ok('overtime label and running timer');
 q=await fresh(seed({cur:{start:Date.now()-(16*H),goalH:13,planId:'13',reached:true}}));await q.waitForTimeout(400);assert.match(await q.textContent('#toast'),/past your goal/);assert((await q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).cur.nudged);ok('one calm nudge after two hours over');
 await q.click('#act',{timeout:500}).catch(()=>{});const bx=await q.locator('#act').boundingBox();await q.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2);await q.mouse.down();await q.waitForTimeout(2200);await q.mouse.up();await q.waitForTimeout(400);
 const sv=(await q.evaluate(()=>JSON.parse(localStorage.getItem('lightly:v1')))).fasts[0];assert(sv&&(sv.end-sv.start)/H>15.9&&sv.goalH===13,'full duration logged against the plan goal');ok('overtime fast logs its full duration as completed');
 // the end time of a finished fast can be edited from Today
 await q.click('#sheet [data-act=close]');await q.waitForTimeout(300);await q.click('#endA');assert.match(await q.textContent('#sheet h3'),/Edit fast/);ok('end time editable from the eating window');
 // signed out Me offers email only
 q=await fresh(seed({}));await q.click('#tabs [data-tab=me]');assert(await q.$('[data-act=emailsheet]'));assert(!(await q.$('#me [data-act=soon]')),'no placeholder sign-in buttons');ok('Me offers only email sign-in');
 // a shooting star crosses the night sky, then removes itself
 q=await fresh(seed({}));assert(await q.evaluate(()=>window.lightlyShoot(true)),'shooting star starts');await q.waitForTimeout(100);assert(await q.$('#stars line.shoot'),'streak drawn');await q.waitForFunction(()=>!document.querySelector('#stars line.shoot'),null,{timeout:5000}).catch(()=>{});assert(!(await q.$('#stars line.shoot')),'streak removed when done');ok('shooting star appears and cleans up');
 // the tab bar steps aside when scrolling down and returns when scrolling up
 q=await fresh(seed({}));await q.click('#tabs [data-tab=me]');await q.waitForTimeout(500);
 await q.evaluate(()=>{const e=document.getElementById('me');e.scrollTop=120;});await q.waitForTimeout(100);await q.evaluate(()=>{const e=document.getElementById('me');e.scrollTop=260;});await q.waitForTimeout(700);
 assert(await q.evaluate(()=>document.getElementById('ph').classList.contains('tabs-off')),'tabs hidden on scroll down');await q.waitForFunction(()=>getComputedStyle(document.getElementById('tabs')).visibility==='hidden',null,{timeout:4000});
 await q.evaluate(()=>{document.getElementById('me').scrollTop=200;});await q.waitForFunction(()=>!document.getElementById('ph').classList.contains('tabs-off'),null,{timeout:4000}).catch(()=>{});assert(!(await q.evaluate(()=>document.getElementById('ph').classList.contains('tabs-off'))),'tabs return on scroll up');ok('tab bar hides on scroll down and returns on scroll up');
 // finishing a fast that reached its goal plays the celebration; ending early does not
 {const q=await fresh(seed({cur:{start:Date.now()-14*H,goalH:13,planId:'13',reached:true}}));const bx=await q.locator('#act').boundingBox();await q.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2);await q.mouse.down();await q.waitForTimeout(2400);await q.mouse.up();await q.waitForTimeout(300);
  assert(await q.$('#cele'),'celebration plays');await q.waitForTimeout(3000);assert(!(await q.$('#cele')),'celebration cleans up');ok('goal reached plays the celebration and cleans up');}
 // export + erase
 if(await p.$('#sheet.open [data-act=close]'))await p.click('#sheet [data-act=close]');
 // import from another app: preview first, nothing added until confirmed, a second import adds nothing
 {const before=(await S()).fasts.length, t=Date.now()-40*D, row=(i)=>({FastID:'T'+i,StartDTM:new Date(t+i*D).toISOString(),EndDTM:new Date(t+i*D+16*H).toISOString(),GoalHours:16,IsEnded:true});
  const file={name:'biodata.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({fast_data:[1,2,3,4,5].map(row)}))};
  await p.click('[data-act=import]');await p.setInputFiles('#impFile',file);await p.waitForSelector('[data-act=impdo]');
  assert.strictEqual((await S()).fasts.length,before,'preview adds nothing');assert.match(await p.textContent('#sheet'),/Add 5 fasts|添加 5 次断食/);
  await p.click('[data-act=impdo]');await p.waitForTimeout(500);assert.strictEqual((await S()).fasts.length,before+5);
  await p.click('[data-act=import]');await p.setInputFiles('#impFile',file);await p.waitForSelector('[data-act=impdo]');
  assert(await p.$('[data-act=impdo][disabled]'),'second import has nothing to add');assert.strictEqual((await S()).fasts.length,before+5);
  await p.click('#sheet [data-act=close]');
  await p.click('[data-act=import]');await p.setInputFiles('#impFile',{name:'x.json',mimeType:'application/json',buffer:Buffer.from('{"a":1}')});await p.waitForSelector('.note.err');ok('import previews, skips duplicates and rejects unknown files');
  await p.click('#sheet [data-act=close]');}
 await p.evaluate(()=>{document.getElementById('me').scrollTop=0;});await p.click('[data-act=erase]');await p.click('[data-act=eraseok]');await p.waitForTimeout(800);assert.strictEqual(await p.evaluate(()=>(JSON.parse(localStorage.getItem('lightly:v1'))||{}).onboarded||false),false);ok('erase resets');
 assert.deepStrictEqual(errs,[]);console.log('all flows ok');await b.close();srv.close();})().catch(e=>{console.error(e);process.exit(1);});
