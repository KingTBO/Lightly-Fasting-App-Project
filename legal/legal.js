/* Language switch for the privacy and terms pages: ?lang=en|zh, else the browser language. No cookies, nothing stored. */
(function(){
'use strict';
var lang=/^zh/i.test(navigator.language||'')?'zh':'en';
try{ var q=new URLSearchParams(location.search).get('lang'); if(q==='zh'||q==='en') lang=q; }catch(e){}
function apply(){
  document.documentElement.lang=lang==='zh'?'zh-Hans':'en';
  [].forEach.call(document.querySelectorAll('.lang button'),function(b){ b.setAttribute('aria-pressed',b.dataset.l===lang); });
  [].forEach.call(document.querySelectorAll('a[data-keep]'),function(a){ a.href=a.getAttribute('data-keep')+'?lang='+lang; });
  var t=document.querySelector('title'); if(t&&t.dataset.zh) t.textContent=lang==='zh'?t.dataset.zh:t.dataset.en;
}
var sw=document.querySelector('.lang'); if(sw) sw.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return; lang=b.dataset.l; try{ history.replaceState(null,'',location.pathname+'?lang='+lang); }catch(x){} apply(); });
apply();
})();
