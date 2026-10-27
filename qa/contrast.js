/* colorize: WCAG AA on computed colours (4.5:1 text, 3:1 large text), composited over whatever sits behind.
   Evaluated in the page: window.__contrast(rootSelector) returns [['contrast<4.5', element, ratio], ...] */
window.__contrast=function(sel){const cv=document.createElement('canvas').getContext('2d',{willReadFrequently:true}),out=[],root=document.querySelector(sel)||document.body;

   const rgba=c=>{cv.clearRect(0,0,1,1);cv.fillStyle='#000';cv.fillStyle=c;cv.fillRect(0,0,1,1);const d=cv.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255];};
   const over=(f,b)=>[0,1,2].map(i=>f[i]*f[3]+b[i]*(1-f[3])).concat([1]);
   const lum=c=>{const a=c.slice(0,3).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);});return .2126*a[0]+.7152*a[1]+.0722*a[2];};
   const bgOf=e=>{const stack=[];for(let p=e;p;p=p.parentElement){const c=rgba(getComputedStyle(p).backgroundColor);if(c[3]>0)stack.push(c);if(c[3]>=.999)break;}
     let b=[22,34,59,1];for(let i=stack.length-1;i>=0;i--)b=over(stack[i],b);return b;};
   const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null);let n;
   while(n=w.nextNode()){const e=n.parentElement;if(!n.textContent.trim()||e.closest('svg,.stars,[hidden]'))continue;const r=e.getBoundingClientRect();if(r.width<2)continue;
     let o=1,vis=true;for(let p=e;p&&p.id!=='ph';p=p.parentElement){const cs=getComputedStyle(p);if(cs.display==='none'||cs.visibility==='hidden'){vis=false;break;}o*=+cs.opacity;}
     const cs=getComputedStyle(e);if(!vis||o<.6||e.closest('button:disabled'))continue;
     if(e.closest('.sheet:not(.open),.ob-step:not(.on),.scr:not(.on),[aria-hidden=true]'))continue;
     const bg=bgOf(e),fg=over(rgba(cs.color),bg),L1=lum(fg),L2=lum(bg),cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05),px=parseFloat(cs.fontSize),big=px>=24||(px>=18.66&&+cs.fontWeight>=700);
     if(cr<(big?3:4.5))out.push(['contrast<'+(big?3:4.5),(e.className||e.tagName)+' "'+n.textContent.trim().slice(0,22)+'"',cr.toFixed(2)]);}
   return out;};
