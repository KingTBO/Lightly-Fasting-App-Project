/* Regenerates the Figma handoff screens from the running app.
   usage (repo root):  NODE_PATH=$(npm root -g) node design-handoff/tools/export.js [only-state-name]
   Writes design-handoff/screens/<light|dark>/<en|zh>/<name>.svg (editable vectors) and
   design-handoff/reference-png/<light|dark>/<en|zh>/<name>.png (flat 2x pictures). Needs Playwright. */
const { chromium } = require('playwright'), fs = require('fs'), path = require('path'), http = require('http');
const root = path.join(__dirname, '..', '..'), out = path.join(__dirname, '..');
const only = process.argv[2];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let f = path.join(root, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); } else { r.writeHead(200, { 'Content-Type': mime[path.extname(f)] || 'application/octet-stream' }); r.end(d); } }); });
const H = 3600000, D = 24 * H, SHANGHAI = 8 * H;
/* fixed pretend "today" so every export is repeatable: 28 Oct 2026, local Shanghai clock */
const day0 = Date.UTC(2026, 9, 28) - SHANGHAI;               // local midnight
const at = (h, m = 0) => day0 + h * H + m * 60000;
const mk = (n, h, goal = 16, now) => { const e = new Date(now); e.setUTCDate(e.getUTCDate() - n); e.setUTCHours(4, 0, 0, 0); return { id: 'q' + n + '_' + h, start: e.getTime() - h * H, end: e.getTime(), goalH: goal, plan: '16' }; };
function seed(s0, lang, now) {
  const s = { v: 1, lang, theme: 'auto', onboarded: !s0.ob, profile: { fastedBefore: true, safety: false }, planId: s0.plan || '16', customH: 16, place: { key: 'shanghai' }, cur: null,
    fasts: [mk(1, 16.5, 16, now), mk(2, 16, 16, now), mk(3, 15, 16, now), mk(5, 17, 16, now), mk(6, 18, 16, now), mk(8, 20, 18, now), mk(9, 16, 16, now)], flex: { bank: 1, mon: null, used: [] }, unwell: null, unlocked: {},
    prefs: { sound: false, haptics: false, d3: false, notify: false }, ramadanPreview: !!s0.ram, startedAt: now - 9 * D };
  if (s0.elapsed) s.cur = { start: now - s0.elapsed * H, goalH: s0.goal || 16, planId: s0.plan || '16', reached: s0.elapsed >= (s0.goal || 16) };
  if (s0.eat) s.fasts.push({ id: 'z', start: now - 17 * H, end: now - 2 * H, goalH: 16, plan: '16' });
  if (s0.empty) { s.fasts = []; s.profile.fastedBefore = false; }
  return s;
}
const tab = async (p, t) => { await p.evaluate(() => ['today', 'days', 'me'].forEach(i => { document.getElementById(i).scrollTop = 0; })); await p.click('#tabs [data-tab=' + t + ']'); await p.waitForTimeout(500); };
const close = async p => { await p.click('#sheet [data-act=close]'); await p.waitForTimeout(500); };
const hold = async (p, ms = 2600) => { const b = await (await p.$('#act')).boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.waitForTimeout(ms); await p.mouse.up(); };

/* name, seed, local clock, then steps; each step list ends with the shot(s) to take: S('name') */
const STATES = [
  { n: '01-onboarding-welcome', s: { ob: 1 }, h: 10, run: async (p, S) => { await S('01-onboarding-welcome');
      for (let i = 1; i <= 4; i++) { const o = await p.$('#ob .ob-step.on [data-act=obopt],#ob .ob-step.on [data-act=obsafe]:last-child'); if (o) { await o.click(); await p.waitForTimeout(200); }
        const nx = await p.$('#ob .ob-step.on [data-act=obnext]:not([disabled])'); if (nx) { await nx.click(); await p.waitForTimeout(700); await S('0' + (i + 1) + '-onboarding-step' + i); } } } },
  { n: '10-today-idle', s: {}, h: 10, run: async (p, S) => { await S('10-today-idle'); } },
  { n: '11-today-just-started', s: {}, h: 10, run: async (p, S) => { await p.click('#act'); await p.waitForTimeout(900); await S('11-today-just-started'); } },
  { n: '12-today-evening-moon', s: { elapsed: 3 }, h: 20, run: async (p, S) => { await S('12-today-evening-moon'); } },
  { n: '13-today-night-moon', s: { elapsed: 6 }, h: 23, run: async (p, S) => { await S('13-today-night-moon'); await p.click('#endA'); await p.waitForTimeout(600); await S('14-sheet-edit-start-time'); } },
  { n: '15-today-first-light', s: { elapsed: 12 }, h: 5.5, run: async (p, S) => { await S('15-today-first-light'); } },
  { n: '16-today-sunrise-turn', s: { elapsed: 13.5 }, h: 6.3, run: async (p, S) => { await S('16-today-sunrise-turn'); } },
  { n: '17-today-goal-reached', s: { elapsed: 17 }, h: 10, run: async (p, S) => { await S('17-today-goal-reached'); } },
  { n: '18-celebration', s: { elapsed: 17 }, h: 10, run: async (p, S) => { const b = await (await p.$('#act')).boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await p.mouse.down(); await p.waitForTimeout(1330); await p.mouse.up(); await p.waitForTimeout(420); await S('18-celebration-bloom'); await p.waitForTimeout(1500); await S('19-sheet-fast-saved'); } },
  { n: '20-today-eating-window', s: { eat: 1 }, h: 12, run: async (p, S) => { await S('20-today-eating-window'); } },
  { n: '21-sheet-plans', s: {}, h: 10, run: async (p, S) => { await p.click('#planBtn'); await p.waitForTimeout(700); await S('21-sheet-plans'); await p.click('[data-act=more]'); await p.waitForTimeout(500); await S('22-sheet-plans-more', true); } },
  { n: '23-ramadan', s: { ram: 1 }, h: 10, run: async (p, S) => { await p.click('#planBtn'); await p.waitForTimeout(700); await S('23-sheet-plans-ramadan', true);
      const r = await p.$('[data-act=pickplan][data-id=ramadan]'); if (r) { await r.click(); await p.waitForTimeout(900); await S('24-today-ramadan'); } } },
  { n: '25-sheet-cheat-days', s: {}, h: 10, run: async (p, S) => { await p.click('#streakBtn'); await p.waitForTimeout(700); await S('25-sheet-cheat-days'); } },
  { n: '30-days', s: {}, h: 10, run: async (p, S) => { await tab(p, 'days'); await S('30-days', true); await p.click('.cal-g button.done'); await p.waitForTimeout(300); await S('31-days-day-selected');
      await p.click('[data-act=edit]'); await p.waitForTimeout(600); await S('32-sheet-edit-fast'); await close(p); await p.click('[data-act=add]'); await p.waitForTimeout(600); await S('33-sheet-add-fast'); } },
  { n: '34-days-empty', s: { empty: 1 }, h: 10, run: async (p, S) => { await tab(p, 'days'); await S('34-days-empty'); } },
  { n: '35-import', s: {}, h: 10, run: async (p, S) => { await tab(p, 'me'); await p.click('[data-act=import]'); await p.waitForTimeout(600); await S('35-sheet-import');
      const csv = 'start,end\n2026-10-01 20:00,2026-10-02 12:00\n2026-10-03 20:00,2026-10-04 12:30\n2026-10-05 20:00,2026-10-06 13:00\n';
      const f = path.join(require('os').tmpdir(), 'lightly-import.csv'); fs.writeFileSync(f, csv); await p.setInputFiles('#impFile', f); await p.waitForTimeout(900); await S('36-sheet-import-preview'); } },
  { n: '40-me', s: {}, h: 10, run: async (p, S) => { await tab(p, 'me'); await S('40-me-signed-out', true);
      for (const [a, n] of [['emailsheet', '41-sheet-email-signin'], ['place', '42-sheet-location'], ['unwell', '43-sheet-unwell'], ['erase', '44-sheet-erase']]) {
        const el = await p.$('[data-act=' + a + ']'); if (!el) { console.log('  missing', a); continue; } await el.scrollIntoViewIfNeeded().catch(() => {}); await el.click(); await p.waitForTimeout(650); await S(n); await close(p); } } },
];

(async () => {
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const walker = fs.readFileSync(path.join(__dirname, 'dom2svg.js'), 'utf8'); let made = 0; const fails = [];
  for (const scheme of (process.env.SCHEME ? [process.env.SCHEME] : ['light', 'dark'])) for (const lang of (process.env.LANG_ONLY ? [process.env.LANG_ONLY] : ['en', 'zh'])) for (const st of STATES) {
    if (only && !st.n.startsWith(only)) continue;
    const now = at(st.h);
    const open = async tall => {
      const ctx = await b.newContext({ viewport: { width: 390, height: tall ? 1700 : 844 }, deviceScaleFactor: 2, colorScheme: scheme, timezoneId: 'Asia/Shanghai', locale: lang === 'zh' ? 'zh-CN' : 'en-US', geolocation: { latitude: 31.23, longitude: 121.47 }, permissions: ['geolocation'], reducedMotion: 'no-preference' });
      const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
      await p.clock.install({ time: now });
      await p.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, ['lightly:v1', JSON.stringify(seed(st.s, lang, now))]);
      await p.goto('http://localhost:' + port + '/'); await p.waitForTimeout(500); await p.clock.resume().catch(() => {}); await p.waitForTimeout(800);
      return { ctx, p, errs };
    };
    const go = async tall => {
      const { ctx, p, errs } = await open(tall);
      const S = async (name, wantTall) => {
        if (tall && !wantTall) return;
        await p.waitForTimeout(tall ? 400 : 2000);
        const nm = tall ? name + '-full-scroll' : name;
        const svg = await p.evaluate(([w, m]) => { eval(w); return window.__toSVG('#ph', m); }, [walker, { name: 'Lightly/' + nm + '/' + scheme + '/' + lang, desc: 'Lightly ' + nm + ', ' + scheme + ', ' + (lang === 'zh' ? 'Chinese' : 'English') + '. 390 pt wide. Generated from the app.' }]);
        const dir = (k) => path.join(out, k, scheme, lang); fs.mkdirSync(dir('screens'), { recursive: true }); fs.mkdirSync(dir('reference-png'), { recursive: true });
        fs.writeFileSync(path.join(dir('screens'), nm + '.svg'), svg);
        await p.screenshot({ path: path.join(dir('reference-png'), nm + '.png') }); made++;
      };
      try { await st.run(p, S); } catch (e) { fails.push(st.n + ' ' + scheme + '/' + lang + ': ' + e.message.split('\n')[0]); }
      if (errs.length) console.log('page errors', st.n, errs.slice(0, 2));
      await ctx.close();
    };
    await go(false);
    if (st.run.toString().includes(', true)')) await go(true).catch(e => fails.push(st.n + ' tall ' + e.message.split('\n')[0]));
    console.log('done', scheme, lang, st.n);
  }
  console.log('files', made, 'fails', fails); await b.close(); srv.close();
})();
