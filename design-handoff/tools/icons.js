/* Writes the icon SVGs and the moon/sun phase set.  node design-handoff/tools/icons.js */
const fs = require('fs'), path = require('path'), dir = path.join(__dirname, '..', 'icons'), mdir = path.join(__dirname, '..', 'moon-sun');
fs.mkdirSync(dir, { recursive: true }); fs.mkdirSync(mdir, { recursive: true });
const stroke = (name, w, h, body, sw = 1.7) => fs.writeFileSync(path.join(dir, name + '.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" stroke="#000000" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"><title>${name}</title><g id="${name}">${body}</g></svg>\n`);
stroke('tab-today', 24, 24, '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>');
stroke('tab-days', 24, 24, '<rect x="3.5" y="4.5" width="17" height="16" rx="3.5"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4"/>');
stroke('tab-me', 24, 24, '<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="10" r="3.2"/><path d="M6.2 18.6a6.5 6.5 0 0 1 11.6 0"/>');
stroke('tab-today-selected', 24, 24, '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>', 2.1);
stroke('chevron-right', 8, 14, '<path d="M1 1l6 6-6 6"/>', 2);
stroke('chevron-down', 12, 8, '<path d="M1.5 1.5L6 6l4.5-4.5"/>', 1.8);
stroke('avatar', 34, 34, '<circle cx="17" cy="14" r="5.5"/><path d="M6 29a11.5 11.5 0 0 1 22 0"/>', 1.6);
stroke('check', 24, 24, '<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.4);
/* moon and sun: unlit ring + lit wedge. Lit area = progress. Gradients match css/app.css and index.html */
const R = 84, grads = `<radialGradient id="gMoon" cx=".38" cy=".34" r=".78"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#EEE8D9"/><stop offset="1" stop-color="#CFC7B2"/></radialGradient><radialGradient id="gSun" cx=".4" cy=".36" r=".78"><stop offset="0" stop-color="#FFF6C2"/><stop offset=".5" stop-color="#FFD21F"/><stop offset="1" stop-color="#F5A800"/></radialGradient>`;
function wedge(p, r, wane) { p = Math.min(Math.max(p, 0), 1); if (p <= .001) return ''; if (p >= .999) return `M0 ${-r} A${r} ${r} 0 1 0 0 ${r} A${r} ${r} 0 1 0 0 ${-r}Z`; const f = wane ? 1 - p : 0, t = wane ? 1 : p, a0 = f * 2 * Math.PI, a1 = t * 2 * Math.PI, sx = -r * Math.sin(a0), sy = -r * Math.cos(a0), ex = -r * Math.sin(a1), ey = -r * Math.cos(a1); return `M0 0 L${sx.toFixed(2)} ${sy.toFixed(2)} A${r} ${r} 0 ${(a1 - a0) > Math.PI ? 1 : 0} 0 ${ex.toFixed(2)} ${ey.toFixed(2)}Z`; }
for (const kind of ['moon', 'sun']) for (const [label, p, wane] of [['0-new', 0, false], ['25', .25, false], ['50', .5, false], ['75', .75, false], ['100-full-goal', 1, false], ['eating-window-50', .5, true]]) {
  const w = wedge(p, R, wane), fill = kind === 'moon' ? 'url(#gMoon)' : 'url(#gSun)';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="236" height="236" viewBox="-118 -118 236 236"><title>${kind}-${label}</title><defs>${grads}${w ? `<clipPath id="lit"><path d="${w}"/></clipPath>` : ''}</defs><g id="${kind}-${label}"><circle id="Unlit" r="${R}" fill="#1C1C1E" fill-opacity="0.08" stroke="#1C1C1E" stroke-opacity="0.22" stroke-width="1.5"/>${w ? `<circle id="Lit" r="${R}" fill="${fill}" clip-path="url(#lit)"/>` : ''}</g></svg>\n`;
  fs.writeFileSync(path.join(mdir, `${kind}-${label}.svg`), svg);
}
console.log('icons written');
