/* ---------- 3D moon and sun: one small shader draws a lit sphere. No 3D engine, no models, no textures to download.
   Phase = where the light comes from, so the shadow edge really wraps around the ball. Flat SVG stays as the fallback. ---------- */
window.LightlySphere=(function(){
  var VS='attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var HEAD=['#ifdef GL_FRAGMENT_PRECISION_HIGH','precision highp float;','#else','precision mediump float;','#endif'].join('\n');
  /* shared noise */
  var NOISE=[
  'float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}',
  'float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);',
  ' return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),',
  '  mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}',
  'float fbm(vec3 p){float a=.5,s=0.;for(int i=0;i<4;i++){s+=a*n3(p);p=p*2.03+vec3(1.7,9.2,3.1);a*=.5;}return s;}'].join('\n');
  /* one-time bake of the moon surface: albedo in rgb, relief height in alpha. Real maria positions, a few named craters, small craters from cell noise. */
  var BAKE=HEAD+'\n'+NOISE+'\n'+[
  'uniform vec2 uSize;',
  'vec3 dirAt(float la,float lo){return vec3(cos(la)*sin(lo),sin(la),cos(la)*cos(lo));}',
  'float mare(vec3 d,float la,float lo,float r,float w){la=radians(la);lo=radians(lo);float a=degrees(acos(clamp(dot(d,dirAt(la,lo)),-1.,1.)));',
  ' a+=(fbm(d*4.+la*3.)-.5)*r*.8;return smoothstep(r,r*.42,a)*w;}',
  'vec2 cr(vec3 p){vec3 i=floor(p),f=fract(p);float hh=0.,br=0.;',
  ' for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec3 g=vec3(float(x),float(y),float(z));',
  '  vec3 c=g+vec3(h(i+g),h(i+g+11.3),h(i+g+27.1));float on=step(.58,h(i+g+3.3));float rad=.16+.3*h(i+g+5.7);float q=length(c-f)/rad;',
  '  float bowl=-(1.-q*q)*step(q,1.);float rim=smoothstep(.72,1.,q)*smoothstep(1.35,1.,q);',
  '  hh+=on*(bowl*.55+rim*.4)*rad;br+=on*smoothstep(1.9,1.,q)*.12*h(i+g+9.9);}',
  ' return vec2(hh,br);}',
  'float named(vec3 d,float la,float lo,float r,out float ej){vec3 c=dirAt(radians(la),radians(lo));float a=degrees(acos(clamp(dot(d,c),-1.,1.)));float q=a/r;',
  ' ej=smoothstep(2.6,1.,q);return -(1.-q*q)*step(q,1.)*.5+smoothstep(.8,1.,q)*smoothstep(1.3,1.,q)*.4;}',
  'void main(){vec2 uv=gl_FragCoord.xy/uSize;float lo=(uv.x-.5)*6.2831853,la=(uv.y-.5)*3.14159265;vec3 d=dirAt(la,lo);',
  ' float m=0.;',
  ' m=max(m,mare(d,35.,-16.,17.,.95));m=max(m,mare(d,28.,18.,11.,.95));m=max(m,mare(d,8.,31.,14.,.95));m=max(m,mare(d,17.,59.,8.,1.));',
  ' m=max(m,mare(d,-4.,52.,11.,.8));m=max(m,mare(d,-21.,-16.,11.,.85));m=max(m,mare(d,-24.,-39.,7.,.95));m=max(m,mare(d,15.,-57.,26.,.8));',
  ' m=max(m,mare(d,-15.,34.,6.,.7));m=max(m,mare(d,56.,0.,9.,.55));m=max(m,mare(d,2.,0.,7.,.55));',
  ' float hi=fbm(d*13.),lo2=fbm(d*3.7+4.);',
  ' vec3 high=vec3(.82,.81,.78)*(.93+.12*hi+.05*lo2);',
  ' vec3 sea=vec3(.42,.43,.46)*(.86+.28*fbm(d*7.+7.));',
  ' vec3 alb=mix(high,sea,smoothstep(0.,1.,m)*.92);',
  ' vec2 c1=cr(d*4.6),c2=cr(d*10.5+3.),c3=cr(d*23.+8.);',
  ' float ht=(c1.x*1.0+c2.x*.55+c3.x*.18)*(1.-.8*m)+.04*(fbm(d*6.)-.5);',
  ' alb+=(c1.y+c2.y*.5)*.35*(1.-m);',
  ' float e1,e2,e3,e4,e5;',
  ' ht+=named(d,-43.3,-11.4,3.1,e1)+named(d,9.7,-20.1,2.6,e2)+named(d,8.1,-38.,2.1,e3)+named(d,23.7,-47.4,1.7,e4)+named(d,-8.,-60.,3.,e5);',
  ' alb+=(e1*.28+e2*.18+e3*.18+e4*.3+e5*.15);',
  /* rays from Tycho */
  ' vec3 t=dirAt(radians(-43.3),radians(-11.4));float ta=degrees(acos(clamp(dot(d,t),-1.,1.)));',
  ' vec3 tt=normalize(d-t*dot(d,t));float ang=atan(tt.x*t.z-tt.z*t.x,tt.y+.0001*t.y);',
  ' alb+=.14*smoothstep(55.,4.,ta)*pow(abs(sin(ang*7.+fbm(d*6.)*4.)),6.)*(1.-m);',
  ' gl_FragColor=vec4(clamp(alb,0.,1.),clamp(.5+ht*3.2,0.,1.));}'].join('\n');
  var FS=HEAD+'\n'+NOISE+'\n'+[
  'uniform sampler2D uTex;uniform vec2 uRes,uTilt,uLib;uniform float uP,uW,uMoon,uTime,uNight,uAlpha,uGlow,uHalo,uSw;',
  'mat3 rY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s,0.,1.,0.,s,0.,c);}',
  'mat3 rX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,s,0.,-s,c);}',
  'void main(){vec2 uv=gl_FragCoord.xy/uRes*2.-1.;float R=84./118.;vec2 q=uv/R;float r=length(q);float px=2./(uRes.x*R);',
  ' float edge=1.-smoothstep(1.-px*1.5,1.,r);',
  /* soft bloom around the ball: warm for the sun, cool for the moon */
  ' float fall=exp(-max(r-1.,0.)*5.2)*smoothstep(1.43,1.02,r);',
  ' vec3 gc=mix(vec3(1.,.74,.30),vec3(.86,.90,1.),uMoon);float ga=mix(uGlow*.5,uHalo*.42,uMoon)*fall*(1.-edge);',
  ' if(edge<=0.){gl_FragColor=vec4(gc*ga,ga);return;}',
  ' float z=sqrt(max(1.-r*r,0.));vec3 n=vec3(q,z);',
  /* moon to sun as a clockwise sweep from 12 o'clock with a soft feathered edge; uSw 0 keeps a plain cross-fade, -1 sweeps the other way */
  ' float aa=fract(atan(q.x,q.y)/6.2831853+1.);if(uSw<0.)aa=1.-aa;float ws=clamp(((1.-uMoon)*1.22-aa)/.22,0.,1.);ws=ws*ws*(3.-2.*ws);float mm=uSw==0.?uMoon:1.-ws;',
  ' float ph=acos(clamp(2.*uP-1.,-1.,1.));vec3 L=vec3(sin(ph)*uW,0.,cos(ph));float lam=dot(n,L);',
  ' float lit=uP<.002?0.:smoothstep(-.012,.075,lam);',
  ' mat3 M=rX(uTilt.y)*rY(uTilt.x);vec3 o=M*n,Lo=M*L;',
  /* moon: sample the baked surface */
  ' float lon=atan(o.x,o.z)+uLib.x,lat=asin(clamp(o.y,-1.,1.))+uLib.y;vec2 tc=vec2(lon/6.2831853+.5,lat/3.14159265+.5);',
  ' vec4 c=texture2D(uTex,tc);float du=1./1024.,dv=1./512.;',
  ' float hE=texture2D(uTex,tc+vec2(du,0.)).a,hW=texture2D(uTex,tc-vec2(du,0.)).a,hN=texture2D(uTex,tc+vec2(0.,dv)).a,hS=texture2D(uTex,tc-vec2(0.,dv)).a;',
  ' float cl=max(cos(lat),.3);vec3 E=normalize(vec3(o.z,0.,-o.x)+vec3(0.,0.,.0001));vec3 N=cross(o,E);',
  ' vec2 g=vec2((hE-hW)/(2.*du*6.2831853*cl),(hN-hS)/(2.*dv*3.14159265));',
  ' vec3 np=normalize(o-.014*(g.x*E+g.y*N));',
  ' float l0=dot(o,Lo),lp=dot(np,Lo);',
  ' float base=mix(.42,1.,smoothstep(0.,.6,l0));',
  ' float shade=clamp(base+(lp-l0)*1.2,0.,1.15);',
  ' vec3 moon=c.rgb*shade*1.12*vec3(1.,.985,.955);',
  ' moon*=1.-.18*pow(1.-z,2.5);',
  /* sun: luminous, limb-darkened, almost smooth */
  ' float gr=fbm(o*4.+vec3(0.,0.,uTime*.04));',
  ' vec3 sun=mix(vec3(1.,.46,.05),vec3(1.,.95,.76),pow(z,.5));sun*=.975+.05*gr;sun=mix(sun,vec3(1.,.99,.9),.16*smoothstep(.55,1.,z));',
  ' vec3 ball=mix(sun,moon,mm);',
  /* the part not yet lit: a faint ghost of the same body, like earthshine */
  ' vec3 un=mix(mix(vec3(.30,.31,.33),c.rgb*vec3(.42,.5,.7),mm),mix(vec3(.9),c.rgb*vec3(.62,.72,1.),mm),uNight);',
  ' float ua=mix(.07,.11,uNight)*(.6+.4*mm)+pow(1.-z,3.)*mix(.2,.3,uNight);',
  ' vec3 col=mix(un,ball,lit);float a=mix(ua,1.,lit)*edge*uAlpha;',
  ' gl_FragColor=vec4(clamp(col,0.,1.)*a+gc*ga*(1.-a),a+ga*(1.-a));}'].join('\n');
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  return function(svg){
    var cv=document.createElement('canvas'), gl=null;
    try{ gl=cv.getContext('webgl',{premultipliedAlpha:true,antialias:false,alpha:true,powerPreference:'low-power'}); }catch(e){}
    if(!gl) return null;
    function sh(t,src){ var s=gl.createShader(t); gl.shaderSource(s,src); gl.compileShader(s); return gl.getShaderParameter(s,gl.COMPILE_STATUS)?s:null; }
    function prog(f){ var v=sh(gl.VERTEX_SHADER,VS), fs=sh(gl.FRAGMENT_SHADER,f); if(!v||!fs) return null; var p=gl.createProgram(); gl.attachShader(p,v); gl.attachShader(p,fs); gl.linkProgram(p); return gl.getProgramParameter(p,gl.LINK_STATUS)?p:null; }
    var pb=prog(BAKE), pd=prog(FS); if(!pb||!pd) return null;
    var b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    function attr(p){ var al=gl.getAttribLocation(p,'a'); gl.enableVertexAttribArray(al); gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0); }
    /* bake once into a 1024x512 texture */
    var tex=gl.createTexture(), fb=gl.createFramebuffer(), TW=1024, TH=512;
    gl.bindTexture(gl.TEXTURE_2D,tex); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,TW,TH,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,fb); gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tex,0);
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE) return null;
    gl.useProgram(pb); attr(pb); gl.viewport(0,0,TW,TH); gl.uniform2f(gl.getUniformLocation(pb,'uSize'),TW,TH); gl.disable(gl.BLEND); gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gl.useProgram(pd); attr(pd);
    var U={}; ['uRes','uP','uW','uMoon','uTime','uNight','uAlpha','uTilt','uLib','uGlow','uHalo','uSw','uTex'].forEach(function(k){ U[k]=gl.getUniformLocation(pd,k); });
    var wrap=svg.parentNode, dpr=Math.min(window.devicePixelRatio||1,2);
    cv.className='orb'; cv.setAttribute('aria-hidden','true'); cv.width=cv.height=Math.round(236*dpr); wrap.appendChild(cv);
    var seen=true, lost=false, on=true, night=0, last=performance.now(), t0=last, key='';
    if('IntersectionObserver' in window) new IntersectionObserver(function(es){ seen=es[0].isIntersecting; }).observe(cv);
    cv.addEventListener('webglcontextlost',function(e){ e.preventDefault(); lost=true; });
    var api={ ok:function(){ return on&&!lost; },
      set:function(v){ on=v; cv.style.display=v?'':'none'; },
      draw:function(o){ var now=performance.now(), dt=Math.min((now-last)/1000,.05); last=now; if(!api.ok()||!seen) return;
        night+=((o.night?1:0)-night)*Math.min(dt*3,1);
        var T=(now-t0)/1000, lx=reduce?0:Math.sin(T*.07)*.05, ly=reduce?0:Math.sin(T*.05+1)*.035; /* the real moon never spins; it only rocks a little (libration) */
        var k=[o.p.toFixed(4),o.wane,o.moon.toFixed(3),o.tx.toFixed(3),o.ty.toFixed(3),night.toFixed(3),(o.alpha==null?1:o.alpha).toFixed(3),(o.glow||0).toFixed(3),(o.halo||0).toFixed(3),(o.sw||0),lx.toFixed(3),ly.toFixed(3),reduce?0:(o.moon<.99?Math.floor(T*10):0)].join();
        cv.style.transform='translate('+(o.ox||0).toFixed(2)+'px,'+(o.oy||0).toFixed(2)+'px) scale('+(o.scale||1).toFixed(4)+')';
        if(k===key) return; key=k;
        gl.viewport(0,0,cv.width,cv.height); gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D,tex); gl.uniform1i(U.uTex,0);
        gl.uniform2f(U.uRes,cv.width,cv.height); gl.uniform1f(U.uP,Math.min(Math.max(o.p,0),1)); gl.uniform1f(U.uW,o.wane?-1:1);
        gl.uniform1f(U.uMoon,o.moon); gl.uniform1f(U.uTime,reduce?0:T); gl.uniform1f(U.uNight,night);
        gl.uniform1f(U.uSw,o.sw||0); gl.uniform1f(U.uAlpha,o.alpha==null?1:o.alpha); gl.uniform1f(U.uGlow,o.glow||0); gl.uniform1f(U.uHalo,o.halo||0);
        gl.uniform2f(U.uTilt,(o.tx||0)*Math.PI/180*1.6,(o.ty||0)*Math.PI/180*1.6); gl.uniform2f(U.uLib,lx,ly);
        gl.drawArrays(gl.TRIANGLES,0,3); } };
    return api; };
})();
