/* Injected into the running app by export.js. Turns the live DOM inside #ph into one editable SVG string:
   boxes become rect/path, text becomes real <text> (one per line), inline <svg> icons are kept as vectors,
   and every group gets a readable layer name (id + data-name) that Figma shows in its layers panel. */
window.__toSVG = function (rootSel, meta) {
  var root = document.querySelector(rootSel), R = root.getBoundingClientRect(), used = {}, cc = {}, cv = document.createElement('canvas');
  cv.width = cv.height = 1; var cx = cv.getContext('2d', { willReadFrequently: true });
  var F = function (n) { return Math.round(n * 100) / 100; };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  /* any CSS colour (rgb, color(srgb ...), color-mix result) -> {c:'#rrggbb', a:0..1} */
  function col(s) {
    if (!s || s === 'transparent' || s === 'none') return null;
    if (cc[s]) return cc[s];
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = '#000'; cx.fillStyle = s; cx.fillRect(0, 0, 1, 1);
    var d = cx.getImageData(0, 0, 1, 1).data, a = d[3] / 255, o = null;
    if (a > 0) { /* un-premultiply */
      var h = function (v) { v = Math.round(Math.min(255, v / a)); return (v < 16 ? '0' : '') + v.toString(16); };
      o = { c: '#' + h(d[0]) + h(d[1]) + h(d[2]), a: Math.round(a * 1000) / 1000 };
    }
    return (cc[s] = o);
  }
  function fillAttr(s, prefix) { var k = col(s); return k ? ' ' + (prefix || 'fill') + '="' + k.c + '"' + (k.a < 1 ? ' ' + (prefix || 'fill') + '-opacity="' + k.a + '"' : '') : ' ' + (prefix || 'fill') + '="none"'; }

  function uid(name) {
    name = name.replace(/[\s"<>&']+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'Layer';
    used[name] = (used[name] || 0) + 1; return used[name] > 1 ? name + '-' + used[name] : name;
  }
  function label(el) {
    var t = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 28), c = (typeof el.className === 'string' ? el.className : '').split(/\s+/)[0] || '';
    var map = { group: 'Card', row: 'Row', btn: 'Button', chip: 'Chip', tabs: 'TabBar', sheet: 'Sheet', seg: 'SegmentedControl', sw: 'Switch', streak: 'StreakCard', act: 'Button/Primary-hold', plan: 'PlanOption', grab: 'Grabber', nav: 'NavBar', 'h-title': 'LargeTitle', lt: 'LargeTitle', read: 'TimerReadout', track: 'Timeline', scr: 'Screen', av: 'Avatar', scrim: 'Scrim', toast: 'Toast', pill: 'Badge', gh: 'SectionHeader', gf: 'SectionFooter', lede: 'Lede', note: 'Note', facts: 'Facts', field: 'Field', check: 'CheckRow', tl: 'TextLink', 'disc-wrap': 'MoonSun', stars: 'Stars', cal: 'Calendar', 'cal-g': 'CalendarGrid', ob: 'Onboarding', 'ob-step': 'OnboardingStep', 'ob-hero': 'Hero', 'ob-dots': 'PageDots', dot: 'Dot' };
    var base = map[c] || (el.tagName === 'BUTTON' ? 'Button' : c ? c : el.tagName.toLowerCase());
    if (el.id && !map[c]) base = el.id;
    return base + (t && el.children.length < 4 ? '/' + t : '');
  }

  function corners(cs, w, h) {
    var p = function (v, ref) { v = parseFloat(v) || 0; return String(v).indexOf('%') > -1 ? 0 : v; };
    var raw = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(function (k) {
      var v = cs[k].split(' ')[0]; return v.indexOf('%') > -1 ? parseFloat(v) / 100 * w : parseFloat(v) || 0;
    });
    var m = Math.min(w, h) / 2; return raw.map(function (r) { return Math.min(r, m); });
  }
  function rrPath(x, y, w, h, r) {
    var a = r[0], b = r[1], c = r[2], d = r[3];
    return 'M' + F(x + a) + ' ' + F(y) + 'H' + F(x + w - b) + 'A' + F(b) + ' ' + F(b) + ' 0 0 1 ' + F(x + w) + ' ' + F(y + b) + 'V' + F(y + h - c) +
      'A' + F(c) + ' ' + F(c) + ' 0 0 1 ' + F(x + w - c) + ' ' + F(y + h) + 'H' + F(x + d) + 'A' + F(d) + ' ' + F(d) + ' 0 0 1 ' + F(x) + ' ' + F(y + h - d) +
      'V' + F(y + a) + 'A' + F(a) + ' ' + F(a) + ' 0 0 1 ' + F(x + a) + ' ' + F(y) + 'Z';
  }
  function shapeEl(x, y, w, h, r, attrs) {
    if (r.every(function (v) { return v === 0; })) return '<rect x="' + F(x) + '" y="' + F(y) + '" width="' + F(w) + '" height="' + F(h) + '"' + attrs + '/>';
    if (r.every(function (v) { return v === r[0]; })) return '<rect x="' + F(x) + '" y="' + F(y) + '" width="' + F(w) + '" height="' + F(h) + '" rx="' + F(r[0]) + '"' + attrs + '/>';
    return '<path d="' + rrPath(x, y, w, h, r) + '"' + attrs + '/>';
  }
  function splitShadows(s) {
    var out = [], d = 0, cur = ''; for (var i = 0; i < s.length; i++) { var ch = s[i]; if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out;
  }
  var defs = '', nfilt = 0, nclip = 0, ngrad = 0;
  function shadowFilter(cs) {
    if (!cs.boxShadow || cs.boxShadow === 'none') return '';
    var fx = '';
    splitShadows(cs.boxShadow).forEach(function (sh) {
      if (/inset/.test(sh)) return;
      var m = sh.match(/(rgba?\([^)]*\)|color\([^)]*\))/); if (!m) return;
      var nums = sh.replace(m[1], '').trim().split(/\s+/).map(parseFloat); if (nums.length < 3) return;
      var k = col(m[1]); if (!k || (nums[2] === 0 && nums[3])) return; /* spread-only rings are skipped */
      fx += '<feDropShadow dx="' + nums[0] + '" dy="' + nums[1] + '" stdDeviation="' + F(nums[2] / 2) + '" flood-color="' + k.c + '" flood-opacity="' + k.a + '"/>';
    });
    if (!fx) return '';
    var id = 'shadow' + (++nfilt); defs += '<filter id="' + id + '" x="-30%" y="-30%" width="160%" height="180%" color-interpolation-filters="sRGB">' + fx + '</filter>'; return id;
  }
  function gradient(bg, w, h) { /* linear-gradient(angle, c1 p1, c2 p2...) -> SVG gradient */
    var rm = bg.match(/radial-gradient\((.*)\)$/);
    if (rm) { var rp = splitShadows(rm[1]), r0 = /circle|ellipse|closest|farthest|at /.test(rp[0]) ? 1 : 0, rid = 'grad' + (++ngrad), rs = '', rl = rp.slice(r0);
      rl.forEach(function (p, i) { var mm = p.trim().match(/^(.*?)(?:\s+(-?[\d.]+)%)?$/), k = col(mm[1].trim()); if (!k) return; rs += '<stop offset="' + (mm[2] ? mm[2] / 100 : i / Math.max(1, rl.length - 1)) + '" stop-color="' + k.c + '" stop-opacity="' + k.a + '"/>'; });
      defs += '<radialGradient id="' + rid + '" cx="0.5" cy="0.5" r="0.5">' + rs + '</radialGradient>'; return rid; }
    var m = bg.match(/linear-gradient\((.*)\)$/); if (!m) return null;
    var parts = splitShadows(m[1]), ang = 180, i0 = 0;
    if (/deg$/.test(parts[0].trim())) { ang = parseFloat(parts[0]); i0 = 1; }
    var id = 'grad' + (++ngrad), rad = (ang - 90) * Math.PI / 180, dx = Math.cos(rad) / 2, dy = Math.sin(rad) / 2, stops = '';
    var st = parts.slice(i0);
    st.forEach(function (p, i) {
      var mm = p.trim().match(/^(.*?)(?:\s+(-?[\d.]+)%)?$/), k = col(mm[1].trim()); if (!k) return;
      stops += '<stop offset="' + (mm[2] ? mm[2] / 100 : i / Math.max(1, st.length - 1)) + '" stop-color="' + k.c + '" stop-opacity="' + k.a + '"/>';
    });
    defs += '<linearGradient id="' + id + '" x1="' + F(.5 - dx) + '" y1="' + F(.5 - dy) + '" x2="' + F(.5 + dx) + '" y2="' + F(.5 + dy) + '">' + stops + '</linearGradient>';
    return id;
  }
  function clip(x, y, w, h, r) { var id = 'clip' + (++nclip); defs += '<clipPath id="' + id + '">' + shapeEl(x, y, w, h, r, '') + '</clipPath>'; return id; }

  /* one box: background, gradient, borders */
  function box(x, y, w, h, cs, name) {
    var r = corners(cs, w, h), out = '', bg = col(cs.backgroundColor), bi = cs.backgroundImage, flt = shadowFilter(cs);
    var g = bi && /(linear|radial)-gradient/.test(bi) ? gradient(bi, w, h) : null;
    if (bg && !g) out += shapeEl(x, y, w, h, r, fillAttr(cs.backgroundColor) + (flt ? ' filter="url(#' + flt + ')"' : '') + ' id="' + uid(name + '/Fill') + '"');
    if (g) out += shapeEl(x, y, w, h, r, ' fill="url(#' + g + ')"' + (flt ? ' filter="url(#' + flt + ')"' : '') + ' id="' + uid(name + '/Gradient') + '"');
    if (!bg && !g && flt) out += shapeEl(x, y, w, h, r, ' fill="#000" fill-opacity="0.001" filter="url(#' + flt + ')"');
    var bw = ['Top', 'Right', 'Bottom', 'Left'].map(function (s) { return cs['border' + s + 'Style'] === 'none' ? 0 : parseFloat(cs['border' + s + 'Width']) || 0; });
    var bc = ['Top', 'Right', 'Bottom', 'Left'].map(function (s) { return cs['border' + s + 'Color']; });
    if (bw[0] && bw[0] === bw[1] && bw[1] === bw[2] && bw[2] === bw[3]) {
      var k = col(bc[0]); if (k) out += shapeEl(x + bw[0] / 2, y + bw[0] / 2, w - bw[0], h - bw[0], r.map(function (v) { return Math.max(0, v - bw[0] / 2); }), ' fill="none"' + fillAttr(bc[0], 'stroke').replace(' stroke="none"', '') + ' stroke-width="' + bw[0] + '"' + (cs.borderTopStyle === 'dashed' ? ' stroke-dasharray="4 3"' : ''));
    } else {
      if (bw[0] && col(bc[0])) out += '<line x1="' + F(x) + '" y1="' + F(y + bw[0] / 2) + '" x2="' + F(x + w) + '" y2="' + F(y + bw[0] / 2) + '"' + fillAttr(bc[0], 'stroke') + ' stroke-width="' + bw[0] + '"/>';
      if (bw[2] && col(bc[2])) out += '<line x1="' + F(x) + '" y1="' + F(y + h - bw[2] / 2) + '" x2="' + F(x + w) + '" y2="' + F(y + h - bw[2] / 2) + '"' + fillAttr(bc[2], 'stroke') + ' stroke-width="' + bw[2] + '"/>';
    }
    return out;
  }

  /* text: one <text> per rendered line, positioned from the browser's own line boxes */
  var asc = {};
  function metrics(cs) {
    var key = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; if (asc[key]) return asc[key]; cx.font = key; var m = cx.measureText('Hg');
    return (asc[key] = { a: m.fontBoundingBoxAscent || parseFloat(cs.fontSize) * .95, d: m.fontBoundingBoxDescent || parseFloat(cs.fontSize) * .25 });
  }
  function textOut(node, cs, scale, name) {
    var txt = node.nodeValue; if (!/\S/.test(txt)) return '';
    var rg = document.createRange(), lines = [], i = 0, len = txt.length, cur = null;
    while (i < len) {
      var j = i; while (j < len && !/\s/.test(txt[j])) j++; /* a word */
      /* long CJK runs have no spaces: break per character so lines wrap where the browser wrapped them */
      var cjk = /[　-鿿＀-￯]/.test(txt.slice(i, j)), e = cjk ? Math.min(i + 1, len) : j; if (e === i) { i++; continue; }
      rg.setStart(node, i); rg.setEnd(node, e); var rs = rg.getClientRects();
      if (rs.length) { var r = rs[0], key = Math.round(r.top / 3);
        if (!cur || cur.key !== key) { cur = { key: key, t: '', l: r.left, r: r.right, top: r.top, h: r.height }; lines.push(cur); }
        var gap = cur.t && txt[i - 1] && /\s/.test(txt[i - 1]) ? ' ' : ''; cur.t += gap + txt.slice(i, e); cur.r = Math.max(cur.r, r.right); cur.l = Math.min(cur.l, r.left); }
      i = cjk ? e : j; while (i < len && /\s/.test(txt[i]) && !cjk) i++;
    }
    var m = metrics(cs), fs = parseFloat(cs.fontSize) * scale, tt = cs.textTransform, al = cs.textAlign, out = '', k = col(cs.color);
    var anchor = al === 'center' ? 'middle' : (al === 'right' || al === 'end') ? 'end' : 'start';
    lines.forEach(function (l) {
      var t = tt === 'uppercase' ? l.t.toUpperCase() : l.t, base = l.top + (l.h - (m.a + m.d) * scale) / 2 + m.a * scale, x = anchor === 'middle' ? (l.l + l.r) / 2 : anchor === 'end' ? l.r : l.l;
      out += '<text id="' + uid(name + '/Text') + '" x="' + F(x - R.left) + '" y="' + F(base - R.top) + '" font-family="' + esc(cs.fontFamily.replace(/"/g, "'")) + '" font-size="' + F(fs) + '" font-weight="' + cs.fontWeight + '"' +
        (cs.fontStyle !== 'normal' ? ' font-style="' + cs.fontStyle + '"' : '') + (cs.letterSpacing !== 'normal' && parseFloat(cs.letterSpacing) ? ' letter-spacing="' + F(parseFloat(cs.letterSpacing) * scale) + '"' : '') +
        (anchor !== 'start' ? ' text-anchor="' + anchor + '"' : '') + fillAttr(cs.color) + (cs.fontVariantNumeric.indexOf('tabular') > -1 ? ' font-variant-numeric="tabular-nums"' : '') + '>' + esc(t) + '</text>';
    });
    return out;
  }

  /* inline svg: keep as vectors, bake computed paint so it survives outside the page's CSS */
  var PAINT = ['stroke-width', 'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'opacity'];
  function paint(d, c, p) {
    var v = c.getPropertyValue(p), o = parseFloat(c.getPropertyValue(p + '-opacity'));
    if (/^url\(/.test(v)) { d.setAttribute(p, v.replace(/url\("?(#[^")]+)"?\)/, 'url($1)')); if (o < 1) d.setAttribute(p + '-opacity', o); return; }
    var k = col(v); if (!k) { d.setAttribute(p, 'none'); return; }
    d.setAttribute(p, k.c); var a = Math.round(k.a * o * 1000) / 1000; if (a < 1) d.setAttribute(p + '-opacity', a); else d.removeAttribute(p + '-opacity');
  }
  function svgOut(sv, name) {
    var r = sv.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return '';
    var clone = sv.cloneNode(true), src = sv.querySelectorAll('*'), dst = clone.querySelectorAll('*');
    for (var i = 0; i < src.length; i++) {
      var c = getComputedStyle(src[i]), d = dst[i]; if (!d.setAttribute || /^(defs|linearGradient|radialGradient|stop|clipPath|mask|filter|style|title|desc|feGaussianBlur)$/i.test(d.tagName) || d.closest('defs,mask,clipPath,filter,linearGradient,radialGradient')) continue;
      PAINT.forEach(function (p) { var v = c.getPropertyValue(p); if (v && v !== 'normal' && v !== 'none' && !(p === 'opacity' && v === '1') && !(p === 'stroke-width' && v === '0px') && !(p === 'stroke-linecap' && v === 'butt') && !(p === 'stroke-linejoin' && v === 'miter')) d.setAttribute(p, v.replace('px', '')); else d.removeAttribute(p); });
      paint(d, c, 'fill'); paint(d, c, 'stroke');
      d.removeAttribute('style'); d.removeAttribute('class');
      if (d.tagName.toLowerCase() === 'g' || d.id === '') { /* name only direct meaningful groups */ }
    }
    clone.removeAttribute('class'); clone.removeAttribute('style'); clone.removeAttribute('id');
    var vb = sv.viewBox && sv.viewBox.baseVal; if (!vb || !vb.width) clone.setAttribute('viewBox', '0 0 ' + sv.clientWidth + ' ' + sv.clientHeight);
    clone.setAttribute('x', F(r.left - R.left)); clone.setAttribute('y', F(r.top - R.top)); clone.setAttribute('width', F(r.width)); clone.setAttribute('height', F(r.height));
    clone.setAttribute('overflow', 'visible'); clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    /* ids inside icons must not clash across the file */
    var html = clone.outerHTML; var idm = html.match(/id="[^"]+"/g) || [], seen = {};
    idm.forEach(function (m) { var id = m.slice(4, -1); if (seen[id]) return; seen[id] = 1; var nid = 'i' + (++nclip) + '-' + id; html = html.split('id="' + id + '"').join('id="' + nid + '"').split('url(#' + id + ')').join('url(#' + nid + ')').split('href="#' + id + '"').join('href="#' + nid + '"'); });
    return '<g id="' + uid(name) + '" data-name="' + esc(name) + '">' + html.replace(/<svg /, '<svg id="' + uid(name + '/Vector') + '" ') + '</g>';
  }

  /* pseudo-elements that draw things (row hairlines, switch knobs, hold fill) */
  function pseudo(el, which, r, scale) {
    var cs = getComputedStyle(el, which); if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') return '';
    var w = parseFloat(cs.width), h = parseFloat(cs.height); if (!(w > 0) && !/border-top|border-bottom/.test('')) { }
    var ox, oy;
    if (cs.position === 'absolute') {
      var pcs = getComputedStyle(el), bl = parseFloat(pcs.borderLeftWidth) || 0, bt = parseFloat(pcs.borderTopWidth) || 0;
      ox = r.left + (parseFloat(cs.left) || 0) * scale + bl; oy = r.top + (parseFloat(cs.top) || 0) * scale + bt;
      if (isNaN(parseFloat(cs.left)) && !isNaN(parseFloat(cs.right))) ox = r.right - (parseFloat(cs.right) || 0) * scale - w * scale;
      if (isNaN(parseFloat(cs.top)) && !isNaN(parseFloat(cs.bottom))) oy = r.bottom - (parseFloat(cs.bottom) || 0) * scale - h * scale;
    } else return '';
    var tx = 0, ty = 0, sx = 1, sy = 1;
    if (cs.transform && cs.transform !== 'none') { var m = cs.transform.match(/matrix\(([^)]+)\)/); if (m) { var v = m[1].split(',').map(parseFloat); sx = v[0]; sy = v[3]; tx = v[4] * scale; ty = v[5] * scale; } }
    if (isNaN(w)) w = parseFloat(cs.width) || 0;
    var bw = parseFloat(cs.borderTopWidth) || 0;
    var hh = h; if (!(hh > 0) && bw) hh = bw;
    if (!(w > 0) || !(hh > 0)) return '';
    var X = ox - R.left + tx, Y = oy - R.top + ty, W = w * scale * sx, H = hh * scale * sy;
    var cs2 = cs; var o = box(X, Y, W, H, cs2, 'Detail');
    if (bw && cs.borderTopStyle !== 'none' && (!col(cs.backgroundColor))) { /* hairline drawn as a border-top on a zero-height box */
      var k = col(cs.borderTopColor); if (k) o = '<line x1="' + F(X) + '" y1="' + F(Y + bw / 2) + '" x2="' + F(X + W) + '" y2="' + F(Y + bw / 2) + '"' + fillAttr(cs.borderTopColor, 'stroke') + ' stroke-width="' + bw + '"/>';
    }
    var op = parseFloat(cs.opacity);
    return o ? '<g id="' + uid(label(el) + '/' + which.replace('::', '')) + '"' + (op < 1 ? ' opacity="' + op + '"' : '') + '>' + o + '</g>' : '';
  }

  function visible(el, cs, r) {
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    if (r.width < 0.5 && r.height < 0.5) return false;
    if (r.right <= R.left || r.left >= R.right || r.bottom <= R.top || r.top >= R.bottom) return false; /* off-screen: closed sheets, other tabs */
    return true;
  }

  function walk(el) {
    var cs = getComputedStyle(el), r = el.getBoundingClientRect(), tag = el.tagName.toLowerCase();
    if (el !== root && !visible(el, cs, r)) return '';
    if (tag === 'canvas') { try { return '<image id="' + uid('Canvas') + '" x="' + F(r.left - R.left) + '" y="' + F(r.top - R.top) + '" width="' + F(r.width) + '" height="' + F(r.height) + '" href="' + el.toDataURL('image/png') + '"/>'; } catch (e) { return ''; } }
    if (tag === 'svg') return svgOut(el, label(el.parentElement || el));
    if (/^(script|style|noscript|link|meta|template)$/.test(tag)) return '';
    var name = el === root ? meta.name : label(el), scale = el.offsetWidth ? r.width / el.offsetWidth : 1; if (!(scale > 0.05 && scale < 20)) scale = 1;
    var x = r.left - R.left, y = r.top - R.top, inner = box(x, y, r.width, r.height, cs, name);
    inner += pseudo(el, '::before', r, scale);
    var kids = '';
    if (tag === 'select') { var o = el.selectedOptions && el.selectedOptions[0]; if (o) { var tn = document.createTextNode(o.textContent); var sp = document.createElement('span'); /* measured text node */ kids += formText(o.textContent, el, cs, r, scale, name); } }
    else if (tag === 'input') { var v = el.value || el.placeholder; if (v && el.type !== 'checkbox' && el.type !== 'file' && el.type !== 'hidden') kids += formText(v, el, cs, r, scale, name); }
    else for (var n = el.firstChild; n; n = n.nextSibling) {
      if (n.nodeType === 3) kids += textOut(n, cs, scale, name);
      else if (n.nodeType === 1) kids += walk(n);
    }
    inner += kids + pseudo(el, '::after', r, scale);
    if (!inner) return '';
    var attrs = ' id="' + uid(name) + '" data-name="' + esc(name) + '"', op = parseFloat(cs.opacity);
    if (op < 1) attrs += ' opacity="' + F(op) + '"';
    var ov = cs.overflowX !== 'visible' || cs.overflowY !== 'visible';
    if (ov && el !== root) attrs += ' clip-path="url(#' + clip(x, y, r.width, r.height, corners(cs, r.width, r.height)) + ')"';
    if (el === root) { /* root keeps the rounded frame clip too */ attrs += ' clip-path="url(#' + clip(x, y, r.width, r.height, corners(cs, r.width, r.height)) + ')"'; }
    return '<g' + attrs + '>' + inner + '</g>';
  }
  function formText(s, el, cs, r, scale, name) {
    var m = metrics(cs), fs = parseFloat(cs.fontSize) * scale, al = cs.textAlign, k = col(cs.color), padL = parseFloat(cs.paddingLeft) || 0, padR = parseFloat(cs.paddingRight) || 0;
    var anchor = al === 'center' ? 'middle' : (al === 'right' || al === 'end') ? 'end' : 'start';
    var x = anchor === 'middle' ? (r.left + r.right) / 2 : anchor === 'end' ? r.right - padR : r.left + padL, y = (r.top + r.bottom) / 2 + (m.a - m.d) / 2 * scale;
    return '<text id="' + uid(name + '/Text') + '" x="' + F(x - R.left) + '" y="' + F(y - R.top) + '" font-family="' + esc(cs.fontFamily.replace(/"/g, "'")) + '" font-size="' + F(fs) + '" font-weight="' + cs.fontWeight + '"' + (anchor !== 'start' ? ' text-anchor="' + anchor + '"' : '') + fillAttr(cs.color) + '>' + esc(s) + '</text>';
  }

  var body = walk(root), W = F(R.width), H = F(R.height);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
    '<title>' + esc(meta.name) + '</title><desc>' + esc(meta.desc || '') + '</desc>' + (defs ? '<defs>' + defs + '</defs>' : '') + body + '</svg>';
};
