/* The month's star sign for the Friends group screen: dates, names, slot layouts, the art files. Pure Node, no browser.   node tests/zodiac.test.js */
const assert=require('assert'),fs=require('fs'),path=require('path'),Z=require('../js/zodiac.js');
const ok=m=>console.log('ok  '+m);

// every day of a leap year falls in exactly the sign the usual tropical dates give, and the boundaries are the ones in the brief
const want=[['capricorn',[12,22],[1,19]],['aquarius',[1,20],[2,18]],['pisces',[2,19],[3,20]],['aries',[3,21],[4,19]],['taurus',[4,20],[5,20]],['gemini',[5,21],[6,20]],['cancer',[6,21],[7,22]],['leo',[7,23],[8,22]],['virgo',[8,23],[9,22]],['libra',[9,23],[10,22]],['scorpio',[10,23],[11,21]],['sagittarius',[11,22],[12,21]]];
const key=(m,d)=>'2024-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0');
want.forEach(([k,f,t])=>{ assert.strictEqual(Z.signAt(key(f[0],f[1])).k,k,k+' starts '+f); assert.strictEqual(Z.signAt(key(t[0],t[1])).k,k,k+' ends '+t); });
assert.strictEqual(Z.signAt('2026-11-08').k,'scorpio'); assert.strictEqual(Z.signAt('2026-11-21').k,'scorpio'); assert.strictEqual(Z.signAt('2026-11-22').k,'sagittarius'); assert.strictEqual(Z.signAt('2026-12-21').k,'sagittarius'); assert.strictEqual(Z.signAt('2026-12-22').k,'capricorn');
assert.strictEqual(Z.signAt('2027-01-01').k,'capricorn','Capricorn wraps the new year'); assert.strictEqual(Z.signAt('2026-12-31').k,'capricorn'); assert.strictEqual(Z.signAt('2027-01-19').k,'capricorn'); assert.strictEqual(Z.signAt('2027-01-20').k,'aquarius');
const seen={}; for(let m=1;m<=12;m++) for(let d=1;d<=new Date(2024,m,0).getDate();d++){ const s=Z.signAt(key(m,d)); assert(s,'a sign for '+key(m,d)); seen[s.k]=(seen[s.k]||0)+1; }
assert.strictEqual(Object.keys(seen).length,12,'all twelve signs are used'); assert.strictEqual(Object.values(seen).reduce((a,b)=>a+b,0),366);
assert.strictEqual(Z.signAt(new Date(2026,10,8)).k,'scorpio','a Date works too'); ok('the sign by date: 12 signs, exact boundaries, Capricorn across the new year');

// names, dates and element, in both languages
const sc=Z.signAt('2026-11-08'), sg=Z.signAt('2026-11-22');
assert.strictEqual(Z.name(sc,'en'),'Scorpio'); assert.strictEqual(Z.name(sc,'zh'),'天蝎座'); assert.strictEqual(Z.caption(sc,'en'),'Oct 23 – Nov 21 · Water'); assert.strictEqual(Z.caption(sc,'zh'),'10月23日 – 11月21日 · 水象');
assert.strictEqual(Z.name(sg,'zh'),'射手座'); assert.strictEqual(Z.caption(sg,'en'),'Nov 22 – Dec 21 · Fire'); assert.strictEqual(Z.caption(Z.signAt('2027-01-01'),'en'),'Dec 22 – Jan 19 · Earth');
const els={Fire:['aries','leo','sagittarius'],Earth:['taurus','virgo','capricorn'],Air:['gemini','libra','aquarius'],Water:['cancer','scorpio','pisces']}; Object.keys(els).forEach(e=>els[e].forEach(k=>assert.strictEqual(Z.SIGNS.find(s=>s.k===k).el[0],e,k+' is '+e)));
Z.SIGNS.forEach(s=>{ assert(/^[一-鿿]{3}$/.test(s.zh),s.k+' has a three-character Chinese name'); assert(!/horoscope|lucky|personality/i.test(JSON.stringify(s)),'no horoscope text'); }); ok('names, date ranges and elements in English and 中文');

// layouts: ten slots each, inside the 358 x 400 panel, never closer than a star's width
Z.SIGNS.forEach(s=>{ const L=Z.layout(s,0); assert.strictEqual(L.slots.length,10,s.k+' has ten slots'); L.slots.forEach(p=>{ assert(p[0]>=22&&p[0]<=336&&p[1]>=22&&p[1]<=378,s.k+' slot inside the panel: '+p); }); assert(Z.minGap(L.slots)>=44,s.k+' stars never overlap: '+Z.minGap(L.slots)); });
assert.deepStrictEqual(Z.layout(sc,0).slots.slice(0,6),[[72,56],[130,92],[116,160],[172,214],[150,282],[196,338]],'Scorpio people slots'); assert.deepStrictEqual(Z.layout(sc,0).slots.slice(6),[[262,350],[306,308],[300,244],[252,206]],'Scorpio open seats');
assert.deepStrictEqual(Z.layout(sg,0).slots.slice(0,6),[[61,195],[111,152],[159,103],[224,90],[258,152],[298,237]],'Sagittarius people slots'); assert.deepStrictEqual(Z.layout(sg,0).slots.slice(6),[[233,294],[159,310],[132,248],[185,186]],'Sagittarius open seats');
assert.deepStrictEqual(Z.layout(sc,24).slots[0],[72,32],'the shorter panel of a group that is just you lifts the pattern by 24'); ok('slot layouts: Scorpio and Sagittarius as designed, a plain ring for the others, all inside the panel');

// only Scorpio and Sagittarius have a figure for now; the files are bundled and precached
Z.SIGNS.forEach(s=>{ const L=Z.layout(s,0); assert.strictEqual(L.fig,s.k==='scorpio'||s.k==='sagittarius',s.k+' figure flag'); if(L.fig){ const f=path.join(__dirname,'..',L.art); assert(fs.existsSync(f),L.art+' exists'); assert(fs.statSync(f).size<260*1024,L.art+' is small'); assert(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8').includes("'"+L.art+"'"),L.art+' is precached'); } else assert.strictEqual(L.art,''); });
assert(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8').includes("'js/zodiac.js'")); assert(fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8').includes('js/zodiac.js'));
assert(/Urania/.test(fs.readFileSync(path.join(__dirname,'..','terms','index.html'),'utf8'))&&/乌拉尼亚/.test(fs.readFileSync(path.join(__dirname,'..','terms','index.html'),'utf8')),'the credit is in the terms in both languages'); ok('figures: two bundled, small, precached, credited in English and 中文');
console.log('zodiac tests passed');
