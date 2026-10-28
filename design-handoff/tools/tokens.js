/* Builds the token files from one source object that mirrors css/app.css.  node design-handoff/tools/tokens.js */
const fs = require('fs'), path = require('path'), out = path.join(__dirname, '..', 'tokens');
const light = { bg: '#F2F2F7', card: '#FFFFFF', label: '#000000', 'label-2': 'rgba(60,60,67,0.75)', 'label-3': 'rgba(60,60,67,0.30)', separator: 'rgba(60,60,67,0.29)', fill: 'rgba(120,120,128,0.12)', 'fill-2': 'rgba(120,120,128,0.20)', tint: '#FFCC00', 'on-tint': '#000000', green: '#34C759', red: '#C70012', blue: '#0062D9', orange: '#C93400' };
const dark = { bg: '#000000', card: '#1C1C1E', label: '#FFFFFF', 'label-2': 'rgba(235,235,245,0.60)', 'label-3': 'rgba(235,235,245,0.30)', separator: 'rgba(84,84,88,0.60)', fill: 'rgba(118,118,128,0.24)', 'fill-2': 'rgba(118,118,128,0.32)', tint: '#FFD60A', 'on-tint': '#000000', green: '#34C759', red: '#FF453A', blue: '#0A84FF', orange: '#FF9F0A' };
const celestial = { moon: '#F4EFE2', 'moon-edge': '#B9AF96', night: '#0E1430', 'moon-gradient-0': '#FFFFFF', 'moon-gradient-55': '#EEE8D9', 'moon-gradient-100': '#CFC7B2', 'sun-gradient-0': '#FFF6C2', 'sun-gradient-50': '#FFD21F', 'sun-gradient-100': '#F5A800' };
/* sky = the Today background; follows the real sunrise and sunset where the person is */
const sky = {
  night: { sky: '#0E1430', ink: '#FFFFFF', 'ink-2': 'rgba(235,235,245,0.70)', unlit: 'rgba(255,255,255,0.10)', rim: 'rgba(255,255,255,0.28)', glass: 'rgba(40,44,70,0.55)', stars: 1, 'tab-selected': '#5AAEFF' },
  'first-light': { sky: '#33406E', ink: '#FFFFFF', 'ink-2': 'rgba(235,235,245,0.72)', unlit: 'rgba(255,255,255,0.12)', rim: 'rgba(255,255,255,0.30)', glass: 'rgba(60,68,110,0.50)', stars: 0.45, 'tab-selected': '#5AAEFF' },
  dawn: { sky: '#F0B48C', ink: '#1C1C1E', 'ink-2': 'rgba(28,28,30,0.74)', unlit: 'rgba(28,28,30,0.10)', rim: 'rgba(28,28,30,0.26)', glass: 'rgba(255,255,255,0.45)', stars: 0 },
  morning: { sky: '#A8D5F0', ink: '#1C1C1E', 'ink-2': 'rgba(28,28,30,0.66)', unlit: 'rgba(28,28,30,0.09)', rim: 'rgba(28,28,30,0.24)', glass: 'rgba(255,255,255,0.50)', stars: 0 },
  day: { sky: '#CDE6F6', ink: '#1C1C1E', 'ink-2': 'rgba(28,28,30,0.66)', unlit: 'rgba(28,28,30,0.08)', rim: 'rgba(28,28,30,0.22)', glass: 'rgba(255,255,255,0.55)', stars: 0 },
  sunset: { sky: '#F3C58E', ink: '#1C1C1E', 'ink-2': 'rgba(28,28,30,0.74)', unlit: 'rgba(28,28,30,0.10)', rim: 'rgba(28,28,30,0.26)', glass: 'rgba(255,255,255,0.45)', stars: 0 },
  evening: { sky: '#2C3762', ink: '#FFFFFF', 'ink-2': 'rgba(235,235,245,0.72)', unlit: 'rgba(255,255,255,0.11)', rim: 'rgba(255,255,255,0.30)', glass: 'rgba(56,64,104,0.50)', stars: 0.7, 'tab-selected': '#5AAEFF' },
};
const fonts = { text: "SF Pro Text", display: 'SF Pro Display', rounded: 'SF Pro Rounded', fallbackLatin: 'Inter', cjk: 'PingFang SC', fallbackCjk: 'Noto Sans SC' };
/* size in px (the app uses rem; 1rem = 16px), weight, line-height multiple, letter-spacing in em (0 for Chinese) */
const type = {
  'large-title': { size: 34, weight: 700, lh: 1.2, ls: -0.02, family: 'display' }, 'sheet-title': { size: 22, weight: 700, lh: 1.2, ls: -0.02, family: 'display' },
  'timer-readout': { size: 56, weight: 600, lh: 1.05, ls: -0.02, family: 'rounded', note: 'tabular numbers; Today. Scales to 52 or 48 on small phones' }, 'sheet-big-number': { size: 48, weight: 600, lh: 1.05, ls: -0.02, family: 'rounded' },
  'title-3': { size: 20, weight: 600, lh: 1.2, ls: -0.022, family: 'display' }, body: { size: 17, weight: 400, lh: 1.47, ls: -0.022, family: 'text' }, 'body-semibold': { size: 17, weight: 600, lh: 1.3, ls: -0.022, family: 'text' },
  subhead: { size: 15, weight: 400, lh: 1.4, ls: -0.022, family: 'text' }, 'subhead-semibold': { size: 15, weight: 600, lh: 1.25, ls: -0.022, family: 'text' }, callout: { size: 14, weight: 500, lh: 1.2, ls: -0.022, family: 'text' },
  footnote: { size: 13, weight: 400, lh: 1.35, ls: 0.005, family: 'text' }, 'footnote-semibold': { size: 13, weight: 600, lh: 1.2, ls: 0.005, family: 'text' }, caption: { size: 12, weight: 400, lh: 1.3, ls: 0, family: 'text' }, 'tab-label': { size: 10, weight: 600, lh: 1.1, ls: 0.01, family: 'text' },
};
const space = { margin: 16, 'group-gap': 16, 'row-min-height': 48, 'tap-min': 44, 'button-height': 52, 'primary-button-height': 54, 'tab-bar-height': 64, 'tab-bar-bottom': 12, 'row-padding-x': 16, 'list-inset': 16, 'disc-size': 236, 'screen-width': 390, 'screen-height': 844 };
const radius = { card: 14, button: 999, chip: 999, 'tab-bar': 999, segmented: 9, 'segmented-item': 7, sheet: 34, 'phone-frame': 44, switch: 999, 'badge': 999, 'icon-tile': 17 };
const motion = { spring: 'cubic-bezier(0.16, 1, 0.3, 1)', 'spring-soft': 'cubic-bezier(0.2, 1, 0.3, 1)', 'press-ms': 100, 'sheet-open-ms': 500, 'sheet-close-ms': 320, 'sky-change-ms': 1200, 'colour-ms': 300, 'hold-to-end-ms': 1200, 'celebration-ms': 1900, 'press-scale': 0.97, note: 'Reduce Motion: fades and colour only, no transforms' };
const hex = c => c;
const tokensStudio = { global: { space: Object.fromEntries(Object.entries(space).map(([k, v]) => [k, { value: String(v), type: 'dimension' }])), radius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, { value: String(v), type: 'borderRadius' }])),
    typography: Object.fromEntries(Object.entries(type).map(([k, t]) => [k, { value: { fontFamily: fonts[t.family], fontWeight: String(t.weight), fontSize: String(t.size), lineHeight: String(Math.round(t.lh * 100)) + '%', letterSpacing: Math.round(t.ls * 1000) / 10 + '%' }, type: 'typography' }])),
    celestial: Object.fromEntries(Object.entries(celestial).map(([k, v]) => [k, { value: v, type: 'color' }])),
    motion: Object.fromEntries(Object.entries(motion).filter(([k]) => k !== 'note').map(([k, v]) => [k, { value: String(v), type: typeof v === 'number' ? 'duration' : 'other' }])) },
  light: { color: Object.fromEntries(Object.entries(light).map(([k, v]) => [k, { value: v, type: 'color' }])) }, dark: { color: Object.fromEntries(Object.entries(dark).map(([k, v]) => [k, { value: v, type: 'color' }])) },
  ...Object.fromEntries(Object.entries(sky).map(([k, o]) => ['sky-' + k, { sky: Object.fromEntries(Object.entries(o).filter(([n]) => n !== 'stars').map(([n, v]) => [n, { value: v, type: 'color' }])) }])),
  $themes: [{ id: 'light', name: 'Light', selectedTokenSets: { global: 'enabled', light: 'enabled' } }, { id: 'dark', name: 'Dark', selectedTokenSets: { global: 'enabled', dark: 'enabled' } }].concat(Object.keys(sky).map(k => ({ id: 'sky-' + k, name: 'Sky / ' + k, selectedTokenSets: { global: 'enabled', ['sky-' + k]: 'enabled' } }))),
  $metadata: { tokenSetOrder: ['global', 'light', 'dark'].concat(Object.keys(sky).map(k => 'sky-' + k)) } };
const rgba = s => { const m = s.match(/rgba?\(([^)]+)\)/); if (m) { const v = m[1].split(',').map(parseFloat); return { r: v[0] / 255, g: v[1] / 255, b: v[2] / 255, a: v[3] == null ? 1 : v[3] }; } const h = s.replace('#', ''); return { r: parseInt(h.slice(0, 2), 16) / 255, g: parseInt(h.slice(2, 4), 16) / 255, b: parseInt(h.slice(4, 6), 16) / 255, a: 1 }; };
/* Figma-native shape (the same structure as Figma's REST variables: collections, modes, variables), for import plugins or scripts. */
const colorNames = Object.keys(light), vars = [];
colorNames.forEach(n => vars.push({ name: 'color/' + n, type: 'COLOR', valuesByMode: { Light: rgba(light[n]), Dark: rgba(dark[n]) } }));
Object.keys(celestial).forEach(n => vars.push({ name: 'celestial/' + n, type: 'COLOR', valuesByMode: { Light: rgba(celestial[n]), Dark: rgba(celestial[n]) } }));
const skyKeys = ['sky', 'ink', 'ink-2', 'unlit', 'rim', 'glass'];
skyKeys.forEach(n => vars.push({ name: 'sky/' + n, type: 'COLOR', valuesByMode: Object.fromEntries(Object.entries(sky).map(([k, o]) => [k, rgba(o[n])])) }));
vars.push({ name: 'sky/stars-opacity', type: 'FLOAT', valuesByMode: Object.fromEntries(Object.entries(sky).map(([k, o]) => [k, o.stars])) });
const floats = (prefix, obj) => Object.entries(obj).forEach(([n, v]) => vars.push({ name: prefix + '/' + n, type: 'FLOAT', valuesByMode: { Value: v } }));
floats('space', space); floats('radius', radius); Object.entries(motion).filter(([, v]) => typeof v === 'number').forEach(([n, v]) => vars.push({ name: 'motion/' + n, type: 'FLOAT', valuesByMode: { Value: v } }));
const figma = { note: 'Collections and modes as Figma variables. Import with a variables-import plugin, or recreate from the table in README. Text styles are in tokens.json, Figma variables cannot hold full text styles.',
  collections: [
    { name: 'Color (appearance)', modes: ['Light', 'Dark'], variables: vars.filter(v => /^(color|celestial)\//.test(v.name)) },
    { name: 'Sky (Today background)', modes: Object.keys(sky), variables: vars.filter(v => /^sky\//.test(v.name)) },
    { name: 'Layout', modes: ['Value'], variables: vars.filter(v => /^(space|radius|motion)\//.test(v.name)) }] };
const flat = { meta: { name: 'Lightly design tokens', source: 'css/app.css', units: 'px unless noted', fontNote: 'Real fonts are SF Pro (iPhone) with Inter fallback on Android and PingFang SC / Noto Sans SC for Chinese. The app draws every screen with Apple look on both platforms.' },
  color: { light, dark }, celestial, sky, font: fonts, type, space, radius, motion,
  skyByStage: { 'Evening / 傍晚': 'evening (before sunset to night)', 'Night / 深夜': 'night', 'First light / 破晓': 'first-light', 'Dawn / 黎明': 'dawn', 'Morning / 清晨': 'morning', 'Day': 'day', 'Sunset': 'sunset' } };
fs.writeFileSync(path.join(out, 'tokens.json'), JSON.stringify(flat, null, 2));
fs.writeFileSync(path.join(out, 'tokens-studio.json'), JSON.stringify(tokensStudio, null, 2));
fs.writeFileSync(path.join(out, 'figma-variables.json'), JSON.stringify(figma, null, 2));
const css = (o, ind) => Object.entries(o).map(([k, v]) => ind + '--' + k + ': ' + v + ';').join('\n');
fs.writeFileSync(path.join(out, 'tokens.css'), ':root {\n' + css(light, '  ') + '\n}\n:root[data-theme="dark"] {\n' + css(dark, '  ') + '\n}\n' + Object.entries(sky).map(([k, o]) => '[data-sky="' + k + '"] {\n' + css(o, '  ') + '\n}').join('\n') + '\n');
console.log('tokens written');
