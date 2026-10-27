// runs in page: returns issues
window.__audit=function(scope){
  const out=[], root=scope?document.querySelector(scope):document.body;
  const vis=e=>{const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return false; const cs=getComputedStyle(e); if(cs.visibility==='hidden'||+cs.opacity===0) return false; let p=e; while(p&&p!==document.body){const c=getComputedStyle(p); if(+c.opacity===0||c.display==='none'||p.getAttribute('aria-hidden')==='true'&&p.classList.contains('rlayer')) return false; p=p.parentElement;} return true;};
  const name=e=>{let s=e.tagName.toLowerCase(); if(e.id) s+='#'+e.id; else if(e.className&&typeof e.className==='string') s+='.'+e.className.trim().split(/\s+/).join('.'); const t=(e.textContent||'').trim().slice(0,24); let p=e.closest('[id]'); return s+(t?' "'+t+'"':'')+(p&&p!==e?' in #'+p.id:'');};
  const textBox=e=>{ // bbox of text nodes directly or deeply inside, excluding svg
    const rg=document.createRange(); let R=null; const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent.trim()&&!n.parentElement.closest('svg')&&vis(n.parentElement)?1:2});
    let n; while(n=w.nextNode()){ rg.selectNodeContents(n); for(const r of rg.getClientRects()){ if(!R) R={t:r.top,b:r.bottom,l:r.left,r:r.right}; else {R.t=Math.min(R.t,r.top);R.b=Math.max(R.b,r.bottom);R.l=Math.min(R.l,r.left);R.r=Math.max(R.r,r.right);} } } return R; };
  // 1. icon and text side by side should share a vertical centre (single-line text only)
  root.querySelectorAll('button,a,li,.row2,.mock .r,.me-list div,.loc,.step,.rtoast,.chip,.tabs>span').forEach(c=>{ if(!vis(c)) return;
    const svgs=[...c.querySelectorAll(':scope > svg, :scope > span > svg, :scope > .av')].filter(vis); const tb=textBox(c); if(!svgs.length||!tb) return;
    const cs=getComputedStyle(c); if(cs.flexDirection==='column') return;
    svgs.forEach(s=>{ const r=s.getBoundingClientRect(); if(r.width>60) return; if(r.bottom<tb.t||r.top>tb.b){} 
      const lines=(tb.b-tb.t)/parseFloat(getComputedStyle(c).fontSize||16); if(lines>1.8) return;
      const d=(r.top+r.bottom)/2-(tb.t+tb.b)/2; if(Math.abs(d)>1.5) out.push(['icon-text-centre',name(c),d.toFixed(1)+'px']); }); });
  // 2. content inside circles must be centred
  root.querySelectorAll('*').forEach(e=>{ if(!vis(e)||e.closest('svg')) return; const cs=getComputedStyle(e); if(!(cs.borderRadius.includes('50%')||parseFloat(cs.borderRadius)>=e.getBoundingClientRect().height/2-0.5)) return;
    const r=e.getBoundingClientRect(); if(r.width>80||Math.abs(r.width-r.height)>1) return;
    const kids=[...e.children].filter(k=>vis(k)&&k.tagName!=='INPUT'); const tb=!kids.length?textBox(e):null;
    const boxes=kids.length?kids.map(k=>k.getBoundingClientRect()):tb?[{left:tb.l,right:tb.r,top:tb.t,bottom:tb.b}]:[];
    boxes.forEach(b=>{ if(b.width>=r.width-1&&b.height>=r.height-1) return; const dx=(b.left+b.right)/2-(r.left+r.right)/2, dy=(b.top+b.bottom)/2-(r.top+r.bottom)/2; if(Math.abs(dx)>1||Math.abs(dy)>1) out.push(['circle-centre',name(e),dx.toFixed(1)+','+dy.toFixed(1)]); }); });
  // 3. button labels centred in their button (single-child label buttons)
  root.querySelectorAll('button,.me-btn,.act,.play,.done').forEach(b=>{ if(!vis(b)) return; const cs=getComputedStyle(b); if(cs.textAlign==='left'||cs.justifyContent==='flex-start'||cs.justifyContent==='space-between'||b.closest('.moments,.ob-list,.plan-grid,.more,#rWhy')) return;
    if(b.classList.contains('sw')||b.getAttribute('role')==='switch') return;
    const r=b.getBoundingClientRect(), tb=textBox(b); if(!tb) return; const kids=[...b.querySelectorAll('svg')].filter(vis);
    let L=tb.l,R=tb.r,T=tb.t,B=tb.b; kids.forEach(s=>{const q=s.getBoundingClientRect(); if(q.width<40){L=Math.min(L,q.left);R=Math.max(R,q.right);}});
    const pl=parseFloat(cs.paddingLeft),pr=parseFloat(cs.paddingRight); const dx=((L+R)/2-(r.left+pl+r.right-pr)/2), dy=((T+B)/2-(r.top+r.bottom)/2);
    if(b.closest('.seg')||b.classList.contains('ob-back')||b.closest('.loc')||b.classList.contains('morelink')) { if(Math.abs(dy)>1.5) out.push(['label-vcentre',name(b),dy.toFixed(1)]); return; }
    if(Math.abs(dx)>1.5||Math.abs(dy)>1.5) out.push(['label-centre',name(b),dx.toFixed(1)+','+dy.toFixed(1)]); });
  // 4. clipped text
  root.querySelectorAll('*').forEach(e=>{ if(!vis(e)||e.closest('svg')) return; const cs=getComputedStyle(e); if(e.scrollWidth>e.clientWidth+1&&cs.overflowX!=='visible'&&cs.overflowX!=='auto'&&e.tagName!=='SELECT'&&!e.classList.contains('tw')) out.push(['clipped-x',name(e),e.scrollWidth+'>'+e.clientWidth]); });
  // 5. tap targets inside the phone mocks (HIG 44pt) and on the page (allow 32 for segmented/HIG small controls)
  root.querySelectorAll('button,a,select,[role=tab],[role=switch]').forEach(e=>{ if(!vis(e)) return; if(e.getAttribute('role')==='switch'||e.closest('p.src,p,li')&&e.tagName==='A') return; const r=e.getBoundingClientRect(); const inPh=!!e.closest('.ph'); const min=inPh?44:(e.closest('.seg')||e.tagName==='SELECT'||e.closest('.loc')||e.closest('.step')||e.tagName==='A'?28:44);
    if(e.closest('.tabs')||e.closest('.me-pick')) return; if(Math.min(r.height,Math.max(r.width,44))<min) out.push(['tap-size',name(e),r.width.toFixed(0)+'x'+r.height.toFixed(0)]); });
  // 6. overlaps between siblings-level blocks inside phones
  document.querySelectorAll('.ph').forEach(ph=>{ if(scope&&!root.contains(ph)&&ph!==root) return; const P=ph.getBoundingClientRect();
    const els=[...ph.querySelectorAll('.act,.tabs,.track,.rcount,.read .tip,.read .big,.read .k,.disc-wrap,.nav,.sb,.rtoast.show,.me-card,.me-btns,.ob-cta')].filter(vis);
    for(let i=0;i<els.length;i++) for(let j=i+1;j<els.length;j++){ const a=els[i].getBoundingClientRect(), b=els[j].getBoundingClientRect(); if(els[i].contains(els[j])||els[j].contains(els[i])) continue;
      if(els[i].classList.contains('rtoast')||els[j].classList.contains('rtoast')) continue; if(!!els[i].closest('.me')!==!!els[j].closest('.me')) continue;
      const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left), oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top); if(ox>1&&oy>1) out.push(['overlap',name(els[i])+' × '+name(els[j]),oy.toFixed(1)+'px']); }
    ph.querySelectorAll('*').forEach(e=>{ if(!vis(e)||e.closest('svg')||e.closest('.stars')||e.closest('.sheet')||e.closest('.me')&&!e.closest('.me.open')) return; const r=e.getBoundingClientRect(); if(r.left<P.left-1||r.right>P.right+1) out.push(['outside-phone',name(e),(r.left-P.left).toFixed(0)+'/'+(P.right-r.right).toFixed(0)]); }); });
  document.querySelectorAll('.ph').forEach(ph=>{ if(ph.scrollWidth>ph.clientWidth+1){ const P=ph.getBoundingClientRect(); ph.querySelectorAll('*').forEach(e=>{ const r=e.getBoundingClientRect(); if(r.right>P.right+1&&r.width>0) out.push(['wider-than-phone',name(e),(r.right-P.right).toFixed(0)+'px']); }); } });
  // 7. left edges in phone screens: titles and first content block share the same inset
  return out; };
