/* The public pages say what is true and keep internal notes off the product page (audit S7 and the privacy host).
   node tests/public-copy.test.js */
const assert=require('assert'),fs=require('fs'),path=require('path'); const r=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const concept=r('concept/index.html'), notes=r('concept/notes/index.html'), privacy=r('privacy/index.html'), widgets=r('concept/widgets/index.html');
/* the concept page */
assert(!/Four questions/i.test(concept)&&!/四个问题/.test(concept),'the setup is longer than four questions, so the page does not count them');
assert(/A few quick questions, about a minute/.test(concept)&&/几个简单的问题，大约一分钟/.test(concept),'it says a few quick questions, in both languages');
assert(!/Zero's best-loved|Zero 在 iOS 上最受好评/.test(concept),'no competitor praise on the product page');
assert(!/Huawei|Xiaomi|华为|小米/.test(concept),'no China-launch plan on the product page');
assert(/id="meVib"/.test(concept)&&/data-zh="振动">Vibration/.test(concept)&&/v\('meVib'/.test(concept),'the Me phone has the Vibration row, like the app');
/* the moved notes are on the build-notes page, in both languages */
assert(/Mainland China/.test(notes)&&/Huawei, Xiaomi/.test(notes)&&/中国大陆没有 Google Play/.test(notes),'the China note lives on the build notes');
assert(/Zero's best-loved feature on iOS/.test(notes)&&/Zero 在 iOS 上最受好评/.test(notes),'the widget note lives on the build notes');
/* privacy: the app is hosted by Cloudflare, not GitHub */
assert(/<b>Cloudflare<\/b> hosts the Lightly web app/.test(privacy)&&/<b>Cloudflare<\/b> 托管轻伴网页应用/.test(privacy),'the privacy page names the real host');
assert(!/<b>GitHub<\/b> hosts|<b>GitHub<\/b> 托管/.test(privacy),'and no longer says GitHub hosts the app');
/* widgets page: its build-notes link points at the live repository file */
assert(/href="https:\/\/github\.com\/KingTBO\/Lightly-Fasting-App-Project\/blob\/main\/docs\/widgets\.md"/.test(widgets)&&fs.existsSync(path.join(__dirname,'..','docs/widgets.md')),'the widgets page build-notes link points at a file that exists');
console.log('public copy tests passed');
