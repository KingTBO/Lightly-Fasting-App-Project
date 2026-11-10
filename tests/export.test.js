/* Me > Export my fasts (audit S4): a sheet with a spreadsheet (CSV) and a backup file (JSON), each saying what it holds;
   the import sheet says what a Lightly backup brings back; the erase sheet still exports straight away.
   NODE_PATH=$(npm root -g) node tests/export.test.js */
const assert=require('assert'),http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright'); const root=path.join(__dirname,'..');
const srv=http.createServer((q,r)=>{let p=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(p.endsWith('/'))p+='index.html';fs.readFile(p,(e,d)=>{if(e){r.writeHead(404);r.end();}else{r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.webp')?'image/webp':'text/html; charset=utf-8'});r.end(d);}});});
const ok=m=>console.log('ok  '+m); const H=3600000,D=86400000;
(async()=>{ await new Promise(r=>srv.listen(0,r)); const port=srv.address().port; const b=await chromium.launch();
 const now=new Date('2026-11-10T12:00:00+08:00').getTime();
 const seed=(lang,fasts)=>({v:1,lang,theme:'auto',onboarded:true,profile:{fastedBefore:true,safety:false},planId:'16',customH:16,place:{key:'shanghai'},cur:null,fasts,flex:{bank:1,mon:null,used:[]},unwell:null,unlocked:{},prefs:{sound:false,haptics:false,d3:false,notify:false},ramadanPreview:false,body:{age:30,kg:70,cm:170,unit:'metric',at:now},startedAt:now-9*D});
 const fasts=[1,2,3].map(i=>({id:'f'+i,start:now-i*D-17*H,end:now-i*D,goalH:16,plan:'16'}));
 const open=async(lang,f)=>{ const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Shanghai',acceptDownloads:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(s=>localStorage.setItem('lightly:v1',JSON.stringify(s)),seed(lang,f)); await p.clock.setFixedTime(new Date(now)); await p.goto('http://localhost:'+port+'/'); await p.waitForTimeout(700); await p.click('#tabs button[data-tab=me]'); await p.waitForTimeout(300); return {ctx,p,errs}; };
 const read=async d=>fs.readFileSync(await d.path(),'utf8');
 /* English */
 {const {ctx,p,errs}=await open('en',fasts);
  await p.click('#me [data-act=exportsheet]'); await p.waitForSelector('#sheet.open [data-act=exportcsv]');
  let t=await p.textContent('#sheet'); assert(/Spreadsheet \(CSV\)/.test(t)&&/Backup file \(JSON\)/.test(t),'both choices are named'); assert(/start, end and goal/.test(t)&&/not restored/.test(t),'says what a restore brings back'); assert(/health answers and weight/.test(t),'says the backup holds health answers and weight');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('#sheet [data-act=exportcsv]')]); assert(/^lightly-fasts-\d{4}-\d\d-\d\d\.csv$/.test(dl.suggestedFilename()),'CSV file name: '+dl.suggestedFilename());
  const csv=await read(dl); const lines=csv.replace('﻿','').trim().split('\r\n'); assert.strictEqual(lines[0],'start,end,duration_hours,goal_hours,reached_goal,plan_name'); assert.strictEqual(lines.length,4,'a line for each of the three fasts'); assert(/,17\.00,16,yes,16$/.test(lines[1]),'a line: '+lines[1]); assert(!/weight|"kg"|age/i.test(csv),'no weight or health data in the spreadsheet');
  await p.waitForTimeout(500); assert(!(await p.$('#sheet.open')),'the sheet closes after saving');
  await p.click('#me [data-act=exportsheet]'); await p.waitForSelector('#sheet.open [data-act=exportbk]');
  const [dj]=await Promise.all([p.waitForEvent('download'),p.click('#sheet [data-act=exportbk]')]); assert(/\.json$/.test(dj.suggestedFilename())); const j=JSON.parse(await read(dj)); assert.strictEqual(j.fasts.length,3,'the backup holds the fasts'); assert(j.body,'and the saved body info, as the sheet warns');
  await p.waitForTimeout(500);
  /* import sheet says what a Lightly backup restores */
  await p.click('#me [data-act=import]'); await p.waitForSelector('#sheet.open'); t=await p.textContent('#sheet'); assert(/Lightly backup/.test(t)&&/not restored/.test(t),'the import sheet explains a backup restore'); await p.click('#sheet [data-act=close]'); await p.waitForTimeout(400);
  /* erase sheet: still exports straight away and stays open */
  await p.click('#me [data-act=erase]'); await p.waitForSelector('#sheet.open [data-act=export]'); const [de]=await Promise.all([p.waitForEvent('download'),p.click('#sheet [data-act=export]')]); assert(/\.json$/.test(de.suggestedFilename())); await p.waitForTimeout(600); assert(await p.$('#sheet.open'),'the erase sheet stays open after "Export my fasts first"');
  assert.deepStrictEqual(errs,[]); await ctx.close(); ok('EN: sheet with CSV and backup, restore note on import, erase sheet unchanged'); }
 /* nothing to export yet */
 {const {ctx,p}=await open('en',[]); await p.click('#me [data-act=exportsheet]'); await p.waitForSelector('#sheet.open'); assert(await p.$('#sheet [data-act=exportcsv][disabled]'),'no finished fasts: the spreadsheet button is off'); assert(/no finished fasts/.test(await p.textContent('#sheet'))); await ctx.close(); ok('EN: empty history says so'); }
 /* 中文 */
 {const {ctx,p}=await open('zh',fasts); await p.click('#me [data-act=exportsheet]'); await p.waitForSelector('#sheet.open [data-act=exportcsv]'); const t=await p.textContent('#sheet'); assert(/表格（CSV）/.test(t)&&/备份文件/.test(t)&&/不会恢复/.test(t)); await ctx.close(); ok('中文: the sheet reads'); }
 await b.close(); srv.close(); console.log('export tests passed'); process.exit(0);
})().catch(e=>{console.error(e);process.exit(1);});
