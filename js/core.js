/* Lightly core: sun maths, plans, unlock rules, streaks and cheat days. No DOM here, so it can be tested in Node. */
(function(root){
'use strict';
var H=3600000, D=86400000;

/* ---------- places ---------- */
var CITIES={
  shanghai:{en:'Shanghai',zh:'上海',lat:31.23,lon:121.47,zone:'Asia/Shanghai'},
  beijing:{en:'Beijing',zh:'北京',lat:39.9,lon:116.4,zone:'Asia/Shanghai'},
  guangzhou:{en:'Guangzhou',zh:'广州',lat:23.13,lon:113.26,zone:'Asia/Shanghai'},
  shenzhen:{en:'Shenzhen',zh:'深圳',lat:22.54,lon:114.06,zone:'Asia/Shanghai'},
  chengdu:{en:'Chengdu',zh:'成都',lat:30.57,lon:104.07,zone:'Asia/Shanghai'},
  hongkong:{en:'Hong Kong',zh:'香港',lat:22.32,lon:114.17,zone:'Asia/Hong_Kong'},
  taipei:{en:'Taipei',zh:'台北',lat:25.03,lon:121.57,zone:'Asia/Taipei'},
  tokyo:{en:'Tokyo',zh:'东京',lat:35.68,lon:139.69,zone:'Asia/Tokyo'},
  osaka:{en:'Osaka',zh:'大阪',lat:34.69,lon:135.5,zone:'Asia/Tokyo'},
  seoul:{en:'Seoul',zh:'首尔',lat:37.57,lon:126.98,zone:'Asia/Seoul'},
  singapore:{en:'Singapore',zh:'新加坡',lat:1.35,lon:103.82,zone:'Asia/Singapore'},
  kualalumpur:{en:'Kuala Lumpur',zh:'吉隆坡',lat:3.14,lon:101.69,zone:'Asia/Kuala_Lumpur'},
  jakarta:{en:'Jakarta',zh:'雅加达',lat:-6.21,lon:106.85,zone:'Asia/Jakarta'},
  bangkok:{en:'Bangkok',zh:'曼谷',lat:13.76,lon:100.5,zone:'Asia/Bangkok'},
  hochiminh:{en:'Ho Chi Minh City',zh:'胡志明市',lat:10.82,lon:106.63,zone:'Asia/Ho_Chi_Minh'},
  manila:{en:'Manila',zh:'马尼拉',lat:14.6,lon:120.98,zone:'Asia/Manila'},
  mumbai:{en:'Mumbai',zh:'孟买',lat:19.08,lon:72.88,zone:'Asia/Kolkata'},
  delhi:{en:'Delhi',zh:'德里',lat:28.61,lon:77.21,zone:'Asia/Kolkata'},
  dhaka:{en:'Dhaka',zh:'达卡',lat:23.81,lon:90.41,zone:'Asia/Dhaka'},
  karachi:{en:'Karachi',zh:'卡拉奇',lat:24.86,lon:67.01,zone:'Asia/Karachi'},
  dubai:{en:'Dubai',zh:'迪拜',lat:25.2,lon:55.27,zone:'Asia/Dubai'},
  riyadh:{en:'Riyadh',zh:'利雅得',lat:24.71,lon:46.68,zone:'Asia/Riyadh'},
  istanbul:{en:'Istanbul',zh:'伊斯坦布尔',lat:41.01,lon:28.98,zone:'Europe/Istanbul'},
  cairo:{en:'Cairo',zh:'开罗',lat:30.04,lon:31.24,zone:'Africa/Cairo'},
  mecca:{en:'Mecca',zh:'麦加',lat:21.39,lon:39.86,zone:'Asia/Riyadh'},
  medina:{en:'Medina',zh:'麦地那',lat:24.47,lon:39.61,zone:'Asia/Riyadh'},
  jeddah:{en:'Jeddah',zh:'吉达',lat:21.54,lon:39.17,zone:'Asia/Riyadh'},
  doha:{en:'Doha',zh:'多哈',lat:25.29,lon:51.53,zone:'Asia/Qatar'},
  kuwaitcity:{en:'Kuwait City',zh:'科威特城',lat:29.38,lon:47.99,zone:'Asia/Kuwait'},
  baghdad:{en:'Baghdad',zh:'巴格达',lat:33.31,lon:44.37,zone:'Asia/Baghdad'},
  tehran:{en:'Tehran',zh:'德黑兰',lat:35.69,lon:51.39,zone:'Asia/Tehran'},
  kabul:{en:'Kabul',zh:'喀布尔',lat:34.53,lon:69.17,zone:'Asia/Kabul'},
  tashkent:{en:'Tashkent',zh:'塔什干',lat:41.3,lon:69.24,zone:'Asia/Tashkent'},
  casablanca:{en:'Casablanca',zh:'卡萨布兰卡',lat:33.57,lon:-7.59,zone:'Africa/Casablanca'},
  algiers:{en:'Algiers',zh:'阿尔及尔',lat:36.75,lon:3.06,zone:'Africa/Algiers'},
  tunis:{en:'Tunis',zh:'突尼斯',lat:36.81,lon:10.18,zone:'Africa/Tunis'},
  khartoum:{en:'Khartoum',zh:'喀土穆',lat:15.5,lon:32.56,zone:'Africa/Khartoum'},
  london:{en:'London',zh:'伦敦',lat:51.51,lon:-0.13,zone:'Europe/London'},
  dublin:{en:'Dublin',zh:'都柏林',lat:53.35,lon:-6.26,zone:'Europe/Dublin'},
  paris:{en:'Paris',zh:'巴黎',lat:48.86,lon:2.35,zone:'Europe/Paris'},
  amsterdam:{en:'Amsterdam',zh:'阿姆斯特丹',lat:52.37,lon:4.9,zone:'Europe/Amsterdam'},
  berlin:{en:'Berlin',zh:'柏林',lat:52.52,lon:13.4,zone:'Europe/Berlin'},
  madrid:{en:'Madrid',zh:'马德里',lat:40.42,lon:-3.7,zone:'Europe/Madrid'},
  rome:{en:'Rome',zh:'罗马',lat:41.9,lon:12.5,zone:'Europe/Rome'},
  stockholm:{en:'Stockholm',zh:'斯德哥尔摩',lat:59.33,lon:18.07,zone:'Europe/Stockholm'},
  moscow:{en:'Moscow',zh:'莫斯科',lat:55.76,lon:37.62,zone:'Europe/Moscow'},
  lagos:{en:'Lagos',zh:'拉各斯',lat:6.52,lon:3.38,zone:'Africa/Lagos'},
  nairobi:{en:'Nairobi',zh:'内罗毕',lat:-1.29,lon:36.82,zone:'Africa/Nairobi'},
  mogadishu:{en:'Mogadishu',zh:'摩加迪沙',lat:2.05,lon:45.32,zone:'Africa/Mogadishu'},
  johannesburg:{en:'Johannesburg',zh:'约翰内斯堡',lat:-26.2,lon:28.05,zone:'Africa/Johannesburg'},
  newyork:{en:'New York',zh:'纽约',lat:40.71,lon:-74.01,zone:'America/New_York'},
  toronto:{en:'Toronto',zh:'多伦多',lat:43.65,lon:-79.38,zone:'America/Toronto'},
  chicago:{en:'Chicago',zh:'芝加哥',lat:41.88,lon:-87.63,zone:'America/Chicago'},
  denver:{en:'Denver',zh:'丹佛',lat:39.74,lon:-104.99,zone:'America/Denver'},
  losangeles:{en:'Los Angeles',zh:'洛杉矶',lat:34.05,lon:-118.24,zone:'America/Los_Angeles'},
  vancouver:{en:'Vancouver',zh:'温哥华',lat:49.28,lon:-123.12,zone:'America/Vancouver'},
  mexicocity:{en:'Mexico City',zh:'墨西哥城',lat:19.43,lon:-99.13,zone:'America/Mexico_City'},
  bogota:{en:'Bogotá',zh:'波哥大',lat:4.71,lon:-74.07,zone:'America/Bogota'},
  saopaulo:{en:'São Paulo',zh:'圣保罗',lat:-23.55,lon:-46.63,zone:'America/Sao_Paulo'},
  buenosaires:{en:'Buenos Aires',zh:'布宜诺斯艾利斯',lat:-34.6,lon:-58.38,zone:'America/Argentina/Buenos_Aires'},
  sydney:{en:'Sydney',zh:'悉尼',lat:-33.87,lon:151.21,zone:'Australia/Sydney'},
  melbourne:{en:'Melbourne',zh:'墨尔本',lat:-37.81,lon:144.96,zone:'Australia/Melbourne'},
  auckland:{en:'Auckland',zh:'奥克兰',lat:-36.85,lon:174.76,zone:'Pacific/Auckland'}
};
/* Every time zone's own main city (the tz database's zone.tab, to 0.1 degree), plus the older names some phones still report.
   Used when no location is shared: a phone set to Oslo time gets Oslo's sky, never the nearest city in the short list (it used to be London). */
var ZT='Africa:Abidjan,5.3,-4;Accra,5.5,-0.2;Addis_Ababa,9,38.7;Algiers,36.8,3;Asmara,15.3,38.9;Bamako,12.7,-8;Bangui,4.4,18.6;Banjul,13.5,-16.6;Bissau,11.8,-15.6;Blantyre,-15.8,35;Brazzaville,-4.3,15.3;Bujumbura,-3.4,29.4;Cairo,30.1,31.2;Casablanca,33.6,-7.6;Ceuta,35.9,-5.3;Conakry,9.5,-13.7;Dakar,14.7,-17.4;Dar_es_Salaam,-6.8,39.3;Djibouti,11.6,43.1;Douala,4,9.7;El_Aaiun,27.1,-13.2;Freetown,8.5,-13.2;Gaborone,-24.6,25.9;Harare,-17.8,31.1;Johannesburg,-26.2,28;Juba,4.8,31.6;Kampala,0.3,32.4;Khartoum,15.6,32.5;Kigali,-1.9,30.1;Kinshasa,-4.3,15.3;Lagos,6.5,3.4;Libreville,0.4,9.4;Lome,6.1,1.2;Luanda,-8.8,13.2;Lubumbashi,-11.7,27.5;Lusaka,-15.4,28.3;Malabo,3.8,8.8;Maputo,-26,32.6;Maseru,-29.5,27.5;Mbabane,-26.3,31.1;Mogadishu,2.1,45.4;Monrovia,6.3,-10.8;Nairobi,-1.3,36.8;Ndjamena,12.1,15.1;Niamey,13.5,2.1;Nouakchott,18.1,-15.9;Ouagadougou,12.4,-1.5;Porto-Novo,6.5,2.6;Sao_Tome,0.3,6.7;Tripoli,32.9,13.2;Tunis,36.8,10.2;Windhoek,-22.6,17.1|America:Adak,51.9,-176.7;Anchorage,61.2,-149.9;Anguilla,18.2,-63.1;Antigua,17.1,-61.8;Araguaina,-7.2,-48.2;Argentina/Buenos_Aires,-34.6,-58.5;Argentina/Catamarca,-28.5,-65.8;Argentina/Cordoba,-31.4,-64.2;Argentina/Jujuy,-24.2,-65.3;Argentina/La_Rioja,-29.4,-66.8;Argentina/Mendoza,-32.9,-68.8;Argentina/Rio_Gallegos,-51.6,-69.2;Argentina/Salta,-24.8,-65.4;Argentina/San_Juan,-31.5,-68.5;Argentina/San_Luis,-33.3,-66.3;Argentina/Tucuman,-26.8,-65.2;Argentina/Ushuaia,-54.8,-68.3;Aruba,12.5,-70;Asuncion,-25.3,-57.7;Atikokan,48.8,-91.6;Bahia,-13,-38.5;Bahia_Banderas,20.8,-105.2;Barbados,13.1,-59.6;Belem,-1.4,-48.5;Belize,17.5,-88.2;Blanc-Sablon,51.4,-57.1;Boa_Vista,2.8,-60.7;Bogota,4.6,-74.1;Boise,43.6,-116.2;Cambridge_Bay,69.1,-105.1;Campo_Grande,-20.4,-54.6;Cancun,21.1,-86.8;Caracas,10.5,-66.9;Cayenne,4.9,-52.3;Cayman,19.3,-81.4;Chicago,41.9,-87.7;Chihuahua,28.6,-106.1;Ciudad_Juarez,31.7,-106.5;Costa_Rica,9.9,-84.1;Coyhaique,-45.6,-72.1;Creston,49.1,-116.5;Cuiaba,-15.6,-56.1;Curacao,12.2,-69;Danmarkshavn,76.8,-18.7;Dawson,64.1,-139.4;Dawson_Creek,55.8,-120.2;Denver,39.7,-105;Detroit,42.3,-83;Dominica,15.3,-61.4;Edmonton,53.5,-113.5;Eirunepe,-6.7,-69.9;El_Salvador,13.7,-89.2;Fort_Nelson,58.8,-122.7;Fortaleza,-3.7,-38.5;Glace_Bay,46.2,-60;Goose_Bay,53.3,-60.4;Grand_Turk,21.5,-71.1;Grenada,12.1,-61.8;Guadeloupe,16.2,-61.5;Guatemala,14.6,-90.5;Guayaquil,-2.2,-79.8;Guyana,6.8,-58.2;Halifax,44.6,-63.6;Havana,23.1,-82.4;Hermosillo,29.1,-111;Indiana/Indianapolis,39.8,-86.2;Indiana/Knox,41.3,-86.6;Indiana/Marengo,38.4,-86.3;Indiana/Petersburg,38.5,-87.3;Indiana/Tell_City,38,-86.8;Indiana/Vevay,38.7,-85.1;Indiana/Vincennes,38.7,-87.5;Indiana/Winamac,41.1,-86.6;Inuvik,68.3,-133.7;Iqaluit,63.7,-68.5;Jamaica,18,-76.8;Juneau,58.3,-134.4;Kentucky/Louisville,38.3,-85.8;Kentucky/Monticello,36.8,-84.8;Kralendijk,12.2,-68.3;La_Paz,-16.5,-68.2;Lima,-12.1,-77;Los_Angeles,34.1,-118.2;Lower_Princes,18.1,-63;Maceio,-9.7,-35.7;Managua,12.2,-86.3;Manaus,-3.1,-60;Marigot,18.1,-63.1;Martinique,14.6,-61.1;Matamoros,25.8,-97.5;Mazatlan,23.2,-106.4;Menominee,45.1,-87.6;Merida,21,-89.6;Metlakatla,55.1,-131.6;Mexico_City,19.4,-99.2;Miquelon,47,-56.3;Moncton,46.1,-64.8;Monterrey,25.7,-100.3;Montevideo,-34.9,-56.2;Montserrat,16.7,-62.2;Nassau,25.1,-77.3;New_York,40.7,-74;Nome,64.5,-165.4;Noronha,-3.9,-32.4;North_Dakota/Beulah,47.3,-101.8;North_Dakota/Center,47.1,-101.3;North_Dakota/New_Salem,46.8,-101.4;Nuuk,64.2,-51.7;Ojinaga,29.6,-104.4;Panama,9,-79.5;Paramaribo,5.8,-55.2;Phoenix,33.4,-112.1;Port-au-Prince,18.5,-72.3;Port_of_Spain,10.7,-61.5;Porto_Velho,-8.8,-63.9;Puerto_Rico,18.5,-66.1;Punta_Arenas,-53.1,-70.9;Rankin_Inlet,62.8,-92.1;Recife,-8.1,-34.9;Regina,50.4,-104.7;Resolute,74.7,-94.8;Rio_Branco,-10,-67.8;Santarem,-2.4,-54.9;Santiago,-33.5,-70.7;Santo_Domingo,18.5,-69.9;Sao_Paulo,-23.5,-46.6;Scoresbysund,70.5,-22;Sitka,57.2,-135.3;St_Barthelemy,17.9,-62.9;St_Johns,47.6,-52.7;St_Kitts,17.3,-62.7;St_Lucia,14,-61;St_Thomas,18.4,-64.9;St_Vincent,13.2,-61.2;Swift_Current,50.3,-107.8;Tegucigalpa,14.1,-87.2;Thule,76.6,-68.8;Tijuana,32.5,-117;Toronto,43.6,-79.4;Tortola,18.4,-64.6;Vancouver,49.3,-123.1;Whitehorse,60.7,-135.1;Winnipeg,49.9,-97.2;Yakutat,59.5,-139.7|Antarctica:Casey,-66.3,110.5;Davis,-68.6,78;DumontDUrville,-66.7,140;Macquarie,-54.5,158.9;Mawson,-67.6,62.9;McMurdo,-77.8,166.6;Palmer,-64.8,-64.1;Rothera,-67.6,-68.1;Syowa,-69,39.6;Troll,-72,2.5;Vostok,-78.4,106.9|Arctic:Longyearbyen,78,16|Asia:Aden,12.8,45.2;Almaty,43.2,77;Amman,31.9,35.9;Anadyr,64.8,177.5;Aqtau,44.5,50.3;Aqtobe,50.3,57.2;Ashgabat,38,58.4;Atyrau,47.1,51.9;Baghdad,33.4,44.4;Bahrain,26.4,50.6;Baku,40.4,49.9;Bangkok,13.8,100.5;Barnaul,53.4,83.8;Beirut,33.9,35.5;Bishkek,42.9,74.6;Brunei,4.9,114.9;Chita,52,113.5;Colombo,6.9,79.8;Damascus,33.5,36.3;Dhaka,23.7,90.4;Dili,-8.6,125.6;Dubai,25.3,55.3;Dushanbe,38.6,68.8;Famagusta,35.1,34;Gaza,31.5,34.5;Hebron,31.5,35.1;Ho_Chi_Minh,10.8,106.7;Hong_Kong,22.3,114.2;Hovd,48,91.7;Irkutsk,52.3,104.3;Jakarta,-6.2,106.8;Jayapura,-2.5,140.7;Jerusalem,31.8,35.2;Kabul,34.5,69.2;Kamchatka,53,158.7;Karachi,24.9,67;Kathmandu,27.7,85.3;Khandyga,62.7,135.6;Kolkata,22.5,88.4;Krasnoyarsk,56,92.8;Kuala_Lumpur,3.2,101.7;Kuching,1.6,110.3;Kuwait,29.3,48;Macau,22.2,113.5;Magadan,59.6,150.8;Makassar,-5.1,119.4;Manila,14.6,121;Muscat,23.6,58.6;Nicosia,35.2,33.4;Novokuznetsk,53.8,87.1;Novosibirsk,55,82.9;Omsk,55,73.4;Oral,51.2,51.4;Phnom_Penh,11.6,104.9;Pontianak,-0,109.3;Pyongyang,39,125.8;Qatar,25.3,51.5;Qostanay,53.2,63.6;Qyzylorda,44.8,65.5;Riyadh,24.6,46.7;Sakhalin,47,142.7;Samarkand,39.7,66.8;Seoul,37.5,127;Shanghai,31.2,121.5;Singapore,1.3,103.8;Srednekolymsk,67.5,153.7;Taipei,25.1,121.5;Tashkent,41.3,69.3;Tbilisi,41.7,44.8;Tehran,35.7,51.4;Thimphu,27.5,89.7;Tokyo,35.7,139.7;Tomsk,56.5,85;Ulaanbaatar,47.9,106.9;Urumqi,43.8,87.6;Ust-Nera,64.6,143.2;Vientiane,18,102.6;Vladivostok,43.2,131.9;Yakutsk,62,129.7;Yangon,16.8,96.2;Yekaterinburg,56.9,60.6;Yerevan,40.2,44.5|Atlantic:Azores,37.7,-25.7;Bermuda,32.3,-64.8;Canary,28.1,-15.4;Cape_Verde,14.9,-23.5;Faroe,62,-6.8;Madeira,32.6,-16.9;Reykjavik,64.2,-21.9;South_Georgia,-54.3,-36.5;St_Helena,-15.9,-5.7;Stanley,-51.7,-57.9|Australia:Adelaide,-34.9,138.6;Brisbane,-27.5,153;Broken_Hill,-31.9,141.4;Darwin,-12.5,130.8;Eucla,-31.7,128.9;Hobart,-42.9,147.3;Lindeman,-20.3,149;Lord_Howe,-31.6,159.1;Melbourne,-37.8,145;Perth,-31.9,115.8;Sydney,-33.9,151.2|Europe:Amsterdam,52.4,4.9;Andorra,42.5,1.5;Astrakhan,46.4,48;Athens,38,23.7;Belgrade,44.8,20.5;Berlin,52.5,13.4;Bratislava,48.1,17.1;Brussels,50.8,4.3;Bucharest,44.4,26.1;Budapest,47.5,19.1;Busingen,47.7,8.7;Chisinau,47,28.8;Copenhagen,55.7,12.6;Dublin,53.3,-6.2;Gibraltar,36.1,-5.3;Guernsey,49.5,-2.5;Helsinki,60.2,25;Isle_of_Man,54.1,-4.5;Istanbul,41,29;Jersey,49.2,-2.1;Kaliningrad,54.7,20.5;Kirov,58.6,49.6;Kyiv,50.4,30.5;Lisbon,38.7,-9.1;Ljubljana,46,14.5;London,51.5,-0.1;Luxembourg,49.6,6.2;Madrid,40.4,-3.7;Malta,35.9,14.5;Mariehamn,60.1,19.9;Minsk,53.9,27.6;Monaco,43.7,7.4;Moscow,55.8,37.6;Oslo,59.9,10.8;Paris,48.9,2.3;Podgorica,42.4,19.3;Prague,50.1,14.4;Riga,57,24.1;Rome,41.9,12.5;Samara,53.2,50.1;San_Marino,43.9,12.5;Sarajevo,43.9,18.4;Saratov,51.6,46;Simferopol,45,34.1;Skopje,42,21.4;Sofia,42.7,23.3;Stockholm,59.3,18.1;Tallinn,59.4,24.8;Tirane,41.3,19.8;Ulyanovsk,54.3,48.4;Vaduz,47.1,9.5;Vatican,41.9,12.5;Vienna,48.2,16.3;Vilnius,54.7,25.3;Volgograd,48.7,44.4;Warsaw,52.2,21;Zagreb,45.8,16;Zurich,47.4,8.5|Indian:Antananarivo,-18.9,47.5;Chagos,-7.3,72.4;Christmas,-10.4,105.7;Cocos,-12.2,96.9;Comoro,-11.7,43.3;Kerguelen,-49.4,70.2;Mahe,-4.7,55.5;Maldives,4.2,73.5;Mauritius,-20.2,57.5;Mayotte,-12.8,45.2;Reunion,-20.9,55.5|Pacific:Apia,-13.8,-171.7;Auckland,-36.9,174.8;Bougainville,-6.2,155.6;Chatham,-44,-176.6;Chuuk,7.4,151.8;Easter,-27.1,-109.4;Efate,-17.7,168.4;Fakaofo,-9.4,-171.2;Fiji,-18.1,178.4;Funafuti,-8.5,179.2;Galapagos,-0.9,-89.6;Gambier,-23.1,-134.9;Guadalcanal,-9.5,160.2;Guam,13.5,144.8;Honolulu,21.3,-157.9;Kanton,-2.8,-171.7;Kiritimati,1.9,-157.3;Kosrae,5.3,163;Kwajalein,9.1,167.3;Majuro,7.2,171.2;Marquesas,-9,-139.5;Midway,28.2,-177.4;Nauru,-0.5,166.9;Niue,-19,-169.9;Norfolk,-29.1,168;Noumea,-22.3,166.4;Pago_Pago,-14.3,-170.7;Palau,7.3,134.5;Pitcairn,-25.1,-130.1;Pohnpei,7,158.2;Port_Moresby,-9.5,147.2;Rarotonga,-21.2,-159.8;Saipan,15.2,145.8;Tahiti,-17.5,-149.6;Tarawa,1.4,173;Tongatapu,-21.1,-175.2;Wake,19.3,166.6;Wallis,-13.3,-176.2';
var ZA='Africa/Asmera=Africa/Asmara;Africa/Timbuktu=Africa/Bamako;America/Argentina/ComodRivadavia=America/Argentina/Catamarca;America/Atka=America/Adak;America/Buenos_Aires=America/Argentina/Buenos_Aires;America/Catamarca=America/Argentina/Catamarca;America/Coral_Harbour=America/Atikokan;America/Cordoba=America/Argentina/Cordoba;America/Ensenada=America/Tijuana;America/Fort_Wayne=America/Indiana/Indianapolis;America/Godthab=America/Nuuk;America/Indianapolis=America/Indiana/Indianapolis;America/Jujuy=America/Argentina/Jujuy;America/Knox_IN=America/Indiana/Knox;America/Louisville=America/Kentucky/Louisville;America/Mendoza=America/Argentina/Mendoza;America/Montreal=America/Toronto;America/Nipigon=America/Toronto;America/Pangnirtung=America/Iqaluit;America/Porto_Acre=America/Rio_Branco;America/Rainy_River=America/Winnipeg;America/Rosario=America/Argentina/Cordoba;America/Santa_Isabel=America/Tijuana;America/Shiprock=America/Denver;America/Thunder_Bay=America/Toronto;America/Virgin=America/St_Thomas;America/Yellowknife=America/Edmonton;Antarctica/South_Pole=Antarctica/McMurdo;Asia/Ashkhabad=Asia/Ashgabat;Asia/Calcutta=Asia/Kolkata;Asia/Choibalsan=Asia/Ulaanbaatar;Asia/Chongqing=Asia/Shanghai;Asia/Chungking=Asia/Shanghai;Asia/Dacca=Asia/Dhaka;Asia/Harbin=Asia/Shanghai;Asia/Istanbul=Europe/Istanbul;Asia/Kashgar=Asia/Urumqi;Asia/Katmandu=Asia/Kathmandu;Asia/Macao=Asia/Macau;Asia/Rangoon=Asia/Yangon;Asia/Saigon=Asia/Ho_Chi_Minh;Asia/Tel_Aviv=Asia/Jerusalem;Asia/Thimbu=Asia/Thimphu;Asia/Ujung_Pandang=Asia/Makassar;Asia/Ulan_Bator=Asia/Ulaanbaatar;Atlantic/Faeroe=Atlantic/Faroe;Atlantic/Jan_Mayen=Europe/Oslo;Australia/ACT=Australia/Sydney;Australia/Canberra=Australia/Sydney;Australia/Currie=Australia/Hobart;Australia/LHI=Australia/Lord_Howe;Australia/NSW=Australia/Sydney;Australia/North=Australia/Darwin;Australia/Queensland=Australia/Brisbane;Australia/South=Australia/Adelaide;Australia/Tasmania=Australia/Hobart;Australia/Victoria=Australia/Melbourne;Australia/West=Australia/Perth;Australia/Yancowinna=Australia/Broken_Hill;Brazil/Acre=America/Rio_Branco;Brazil/DeNoronha=America/Noronha;Brazil/East=America/Sao_Paulo;Brazil/West=America/Manaus;Canada/Atlantic=America/Halifax;Canada/Central=America/Winnipeg;Canada/Eastern=America/Toronto;Canada/Mountain=America/Edmonton;Canada/Newfoundland=America/St_Johns;Canada/Pacific=America/Vancouver;Canada/Saskatchewan=America/Regina;Canada/Yukon=America/Whitehorse;Chile/Continental=America/Santiago;Chile/EasterIsland=Pacific/Easter;Europe/Belfast=Europe/London;Europe/Kiev=Europe/Kyiv;Europe/Nicosia=Asia/Nicosia;Europe/Tiraspol=Europe/Chisinau;Europe/Uzhgorod=Europe/Kyiv;Europe/Zaporozhye=Europe/Kyiv;Mexico/BajaNorte=America/Tijuana;Mexico/BajaSur=America/Mazatlan;Mexico/General=America/Mexico_City;Pacific/Enderbury=Pacific/Kanton;Pacific/Johnston=Pacific/Honolulu;Pacific/Ponape=Pacific/Pohnpei;Pacific/Samoa=Pacific/Pago_Pago;Pacific/Truk=Pacific/Chuuk;Pacific/Yap=Pacific/Chuuk;US/Alaska=America/Anchorage;US/Aleutian=America/Adak;US/Arizona=America/Phoenix;US/Central=America/Chicago;US/East-Indiana=America/Indiana/Indianapolis;US/Eastern=America/New_York;US/Hawaii=Pacific/Honolulu;US/Indiana-Starke=America/Indiana/Knox;US/Michigan=America/Detroit;US/Mountain=America/Denver;US/Pacific=America/Los_Angeles;US/Samoa=Pacific/Pago_Pago';
var ZONES=null;
function zoneSpot(zone){
  if(!zone) return null;
  if(!ZONES){ ZONES={}; ZT.split('|').forEach(function(g){ var i=g.indexOf(':'), r=g.slice(0,i); g.slice(i+1).split(';').forEach(function(e){ var x=e.split(','); ZONES[r+'/'+x[0]]=[+x[1],+x[2]]; }); });
    ZA.split(';').forEach(function(e){ var x=e.split('='); if(ZONES[x[1]]) ZONES[x[0]]=ZONES[x[1]]; }); }
  var z=ZONES[zone]; return z?{lat:z[0],lon:z[1]}:null;
}
function deviceZone(){ try{ return Intl.DateTimeFormat().resolvedOptions().timeZone||''; }catch(e){ return ''; } }
/* the phone's time zone in words: "Oslo" in English (the city the zone is named after), "挪威" in Chinese (what the phone itself calls it) */
function zoneName(zone,lang){
  zone=zone||deviceZone(); var en=String(zone.split('/').pop()||'').replace(/_/g,' ');
  if(lang==='zh'){ for(var k in CITIES) if(CITIES[k].zone===zone&&CITIES[k].en===en) return CITIES[k].zh;
    try{ var n=new Intl.DateTimeFormat('zh-CN',{timeZone:zone,timeZoneName:'shortGeneric'}).formatToParts(0).filter(function(x){ return x.type==='timeZoneName'; })[0].value.replace(/时间$/,''); if(n&&!/GMT|UTC|[+\-]\d/.test(n)) return n; }catch(e){} }
  return en;
}
/* the start for someone who has not shared a location: a listed city in the phone's own time zone, else the time zone itself ({key:'zone'}, which follows the phone), else a listed city on the same clock */
function guessCity(zone){
  if(!zone) return 'shanghai';
  for(var k in CITIES) if(CITIES[k].zone===zone) return k;
  if(zoneSpot(zone)) return 'zone';
  var off=zoneOffset(zone); for(k in CITIES) if(zoneOffset(CITIES[k].zone)===off) return k;
  return 'shanghai';
}
/* what versions before 0.113.1 picked, so a guess that was never the person's own choice can be put right once */
function oldGuess(zone){
  if(!zone) return 'shanghai';
  for(var k in CITIES) if(CITIES[k].zone===zone) return k;
  var map={'Asia/Chongqing':'shanghai','Asia/Macau':'hongkong','Asia/Taipei':'hongkong','Asia/Kuala_Lumpur':'singapore','Asia/Seoul':'tokyo','Australia/Melbourne':'sydney','America/Toronto':'newyork','America/Denver':'chicago','America/Phoenix':'losangeles','Europe/Paris':'london','Europe/Berlin':'london','Europe/Dublin':'london','Africa/Nairobi':'mogadishu'};
  return map[zone]||(/^Asia\//.test(zone)?'shanghai':/^America\//.test(zone)?'newyork':/^Europe\//.test(zone)?'london':'shanghai');
}
function placeFix(place,zone){
  if(!place||!CITIES[place.key]||place.key!==oldGuess(zone)||CITIES[place.key].zone===zone) return place;
  return guessCity(zone)==='zone'?{key:'zone'}:place;
}
function zoneOffset(zone,at){
  try{ var d=new Date(at||Date.now()), a=new Date(d.toLocaleString('en-US',{timeZone:zone})), u=new Date(d.toLocaleString('en-US',{timeZone:'UTC'})); return Math.round((a-u)/60000)/60; }
  catch(e){ return -new Date(at||Date.now()).getTimezoneOffset()/60; }
}
/* place = {key:'shanghai'}, {key:'here',lat,lon} or {key:'zone'} (the phone's own time zone). Returns {lat,lon,off} */
function placeInfo(place,at){
  if(place&&place.key==='here'&&isFinite(place.lat)) return {lat:place.lat,lon:place.lon,off:-new Date(at||Date.now()).getTimezoneOffset()/60};
  var z=place&&place.key==='zone'&&zoneSpot(deviceZone()); if(z) return {lat:z.lat,lon:z.lon,off:-new Date(at||Date.now()).getTimezoneOffset()/60};
  var c=CITIES[(place&&place.key)]||CITIES.shanghai;
  return {lat:c.lat,lon:c.lon,off:zoneOffset(c.zone,at)};
}
/* hours since midnight in the place's own clock */
function placeHour(pi,at){ var t=(at==null?Date.now():at)/H+pi.off; return ((t%24)+24)%24; }

/* ---------- NOAA solar equations. zenith 90.833 = sunrise/sunset, 108 = Fajr at 18 degrees below the horizon ---------- */
function solar(pi,at,zenith){
  var d=new Date((at==null?Date.now():at)+pi.off*H), y0=Date.UTC(d.getUTCFullYear(),0,0), N=Math.floor((d.getTime()-y0)/D), g=2*Math.PI/365*(N-1);
  var eq=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
  var dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
  var la=pi.lat*Math.PI/180, c=Math.cos((zenith||90.833)*Math.PI/180)/(Math.cos(la)*Math.cos(dec))-Math.tan(la)*Math.tan(dec);
  var polar=c>1?'night':c<-1?'day':null;
  var ha=Math.acos(Math.min(Math.max(c,-1),1))*180/Math.PI;
  return {rise:((720-4*(pi.lon+ha)-eq)/60+pi.off+48)%24, set:((720-4*(pi.lon-ha)-eq)/60+pi.off+48)%24, polar:polar};
}
function sunTimes(pi,at){ var s=solar(pi,at,90.833); if(s.polar==='night'){s.rise=12;s.set=12;} if(s.polar==='day'){s.rise=0;s.set=24;} return s; }
function fajrHour(pi,at){ var s=solar(pi,at,108); return s.polar?null:s.rise; }

function smooth(x){ x=Math.min(Math.max(x,0),1); return x*x*(3-2*x); }
var FADE=1/3;
function dist(a,b){ var d=a-b; if(d>12)d-=24; if(d<-12)d+=24; return d; }
/* 1 = moon, 0 = sun, with a 40 minute cross-fade centred on sunrise and sunset */
function moonAmt(hDay,sun){
  hDay=((hDay%24)+24)%24;
  var up=smooth((dist(hDay,sun.rise)+FADE)/(2*FADE)), down=smooth((dist(hDay,sun.set)+FADE)/(2*FADE));
  var day=dist(hDay,sun.rise)>=-FADE&&dist(hDay,sun.set)<=FADE;
  return day?1-up*(1-down):1;
}
var SKY=[[0,'night','Night','深夜'],[1,'first','First light','破晓'],[2,'dawn','Dawn','黎明'],[3,'morning','Morning','清晨'],[4,'day','Day','白天'],[5,'sunset','Sunset','日落'],[6,'evening','Evening','傍晚']];
function skyAt(hDay,sun){
  hDay=((hDay%24)+24)%24; var r=sun.rise, st=sun.set, k;
  if(hDay>=r-1.2&&hDay<r-.3) k=1; else if(hDay>=r-.3&&hDay<r+.9) k=2; else if(hDay>=r+.9&&hDay<r+3.5) k=3; else if(hDay>=r+3.5&&hDay<st-1.4) k=4; else if(hDay>=st-1.4&&hDay<st+.35) k=5; else if(hDay>=st+.35&&hDay<st+1.6) k=6; else k=0;
  return SKY[k];
}
/* next sunrise or sunset after hDay, within 24 hours: {k:'rise'|'set', in: hours} */
function nextTurn(hDay,sun){
  var a=((sun.rise-hDay)%24+24)%24, b=((sun.set-hDay)%24+24)%24;
  return a<b?{k:'rise',inH:a,at:sun.rise}:{k:'set',inH:b,at:sun.set};
}
/* phase of the disc: 0 new to 1 full, waning during the eating window */
function discFill(elapsedH,goalH){ return Math.min(Math.max(elapsedH/goalH,0),1); }
/* What is happening in the body, by hours since the fast began. A rough guide, not a measurement: the hours are the usual textbook stretches
   (fed, post-absorptive, liver glycogen, the switch to fat and ketones, which comes somewhere between 12 and 36 hours: Anton and others, Obesity, 2018).
   Autophagy is left out on purpose: its timing has not been measured in people. */
var BODY=[{id:'digest',from:0,to:4},{id:'settle',from:4,to:8},{id:'sugar',from:8,to:12},{id:'switch',from:12,to:18},{id:'fat',from:18,to:24},{id:'long',from:24,to:null}];
function bodyStage(elapsedH){ var i=0; for(var k=0;k<BODY.length;k++) if(elapsedH>=BODY[k].from) i=k; return i; }
/* the stages a fast shows: the ones it has reached, and the ones that begin before its goal. Nothing beyond the plan is put on show, so the list never invites a longer fast */
function bodyShown(elapsedH,goalH){ var now=bodyStage(Math.max(elapsedH,0)), n=0; BODY.forEach(function(b,i){ if(b.from<goalH||i<=now) n=i+1; }); return n; }

/* ---------- plans ---------- */
var PLANS=[
  {id:'13',name:'Sunrise',zh:'日出',fast:13,eat:11,top:true},
  {id:'16',name:'Classic',zh:'经典',fast:16,eat:8,top:true,def:true},
  {id:'18',name:'Steady',zh:'稳健',fast:18,eat:6,top:true},
  {id:'20',name:'Warrior',zh:'勇士',fast:20,eat:4,top:true},
  {id:'23',name:'One meal',zh:'一餐',fast:23,eat:1},
  {id:'24',name:'24 hours',zh:'24 小时',fast:24,eat:0,long:true},
  {id:'36',name:'36 hours',zh:'36 小时',fast:36,eat:0,long:true},
  {id:'custom',name:'Custom',zh:'自定义',fast:16,eat:8,custom:true}
];
var CUSTOM_MIN=10;   /* Custom goes down to 10 hours for everyone, so a beginner can start gentler than 13:11 */
function planById(id,custom){
  for(var i=0;i<PLANS.length;i++) if(PLANS[i].id===id){
    var p=PLANS[i]; if(p.custom){ var f=Math.min(Math.max(Math.round(custom||16),CUSTOM_MIN),23); return {id:'custom',name:p.name,zh:p.zh,fast:f,eat:24-f,custom:true}; } return p; }
  return PLANS[1];
}
function planLabel(p){ return p.long?p.fast+'h':p.fast+':'+p.eat; }

/* Ramadan: opt-in, shown only in season (expected 2027-02-08 for 30 days, 2028-01-28 for 30 days) */
var RAMADAN=[[Date.UTC(2027,1,8),30],[Date.UTC(2028,0,28),30]];
function ramadanDay(at){ at=at==null?Date.now():at; for(var i=0;i<RAMADAN.length;i++){ var n=Math.floor((at-RAMADAN[i][0])/D); if(n>=0&&n<RAMADAN[i][1]) return n+1; } return 0; }

/* ---------- dates ---------- */
function pad(n){ return (n<10?'0':'')+n; }
function dayKey(ms){ var d=new Date(ms); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function keyToDate(k){ var p=k.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
function addDays(k,n){ var d=keyToDate(k); d.setDate(d.getDate()+n); return dayKey(d.getTime()); }
function mondayOf(ms){ var d=new Date(ms); d.setHours(0,0,0,0); d.setDate(d.getDate()-((d.getDay()+6)%7)); return dayKey(d.getTime()); }

/* ---------- fasts ----------
   fast = {id,start,end,goalH,plan}   done = lasted at least its goal */
function hours(f){ return (f.end-f.start)/H; }
function isDone(f){ return hours(f)+1e-6>=f.goalH-0.0167; } /* one minute of grace */
/* how a fast felt: one optional tap at its end (fast.feel = easy, ok or hard). It only describes. No streak, unlock or reward ever reads it, and it is never shared. */
var FEELS=['easy','ok','hard'];
function feelOf(f){ return f&&FEELS.indexOf(f.feel)>=0?f.feel:null; }
function feelCount(list){ var o={easy:0,ok:0,hard:0,n:0}; (list||[]).forEach(function(f){ var k=feelOf(f); if(k){ o[k]++; o.n++; } }); return o; }

/* ---------- Care mode ----------
   Ticking any of the three health answers (pregnant or breastfeeding, diabetes medication, eating disorder) turns Care mode on, and profile.safety is true while it is on.
   Care mode: no 24 h or 36 h fast (never offered, nothing to unlock), plans stop at 16:8 and custom at 16 h, and no streaks, cheat days or Ramadan mode.
   Tightening is instant. Easing: pregnancy or breastfeeding ending is one tap, diabetes medication (and an answer given before Care mode existed, 'earlier')
   needs a health professional's OK and a 14 day wait you can cancel, and an eating-disorder history cannot be eased in the app. */
var CARE_KEYS=['preg','diab','ed'], CARE_WAIT=14*D, CARE_UNDO=D; /* a newly added health answer can be undone for 24 hours */
function careOn(profile){ return !!(profile&&profile.safety); }
/* Custom is open to everyone from 10 hours. How long it can go:
   people who have fasted before 23 h; first-timers 16 h until 3 fasts of 13 h or more, then 23 h;
   Care mode 13 h until 3 fasts of 13 h or more, then 16 h (the same step as 16:8 in Care mode). */
function customMax(profile,state){
  var care=careOn(profile);
  if(!care&&profile&&profile.fastedBefore) return 23;
  var done=((state&&state.fasts)||[]).filter(function(f){return f.end&&isDone(f);}),
      earned=done.filter(function(f){return f.goalH>=13&&hours(f)>=13-0.02;}).length>=3;
  return care?(earned?16:13):(earned?23:16);
}
function careEase(key){ return key==='preg'?'now':key==='ed'?'never':'wait'; }

/* weight units: kg, lb, and 斤 (jin, half a kilo) */
var WUNIT={kg:1,lb:2.20462,jin:2};
function kgTo(kg,u){ return kg*(WUNIT[u]||1); }
function toKg(v,u){ return v/(WUNIT[u]||1); }
/* ---------- who the optional weight is for ----------
   in: {age, kg, cm}. true for adults (18+) with numbers that can be right; false means nothing is saved. There is no BMI cut-off on
   purpose (Tengbo, 2026-11-06: BMI is too biased to decide anything). Care mode never gets here (the app skips the step). */
function weightFit(o){
  var kg=+o.kg, cm=+o.cm, age=+o.age;
  return kg>=30&&kg<=250&&cm>=120&&cm<=220&&age>=18;
}

/* ---------- unlock rules for long fasts (24 h, 36 h) ----------
   profile = {fastedBefore:boolean, safety:boolean}
   state   = {fasts, unwell:ms|null, unlocked:{24:ms,36:ms}}   returns {st, label, pct, until}
   st: hidden (safety flag) | locked | paused | wait | ok
   People who have fasted before (and gave no safety flag) get both long fasts from the start, with no waiting (v0.98.0): st is 'ok' with exp:true, and the app
   asks "have you done this before?" before it lets them choose one. How often is advice, not a rule: note says why the app would ask for a longer rest
   (kind 'unwell' within 14 days, 'gap' under 3 days after any long fast, 'week' for a second 24 h within 7 days, 'month' for a third 36 h in 30 days) and until when.
   First-timers keep the progress rules below (24 h: 6 fasts of 16 h or more over at least 2 weeks and no unwell check-in in 14 days; 36 h: one 24 h fast and 2 more weeks;
   was 12 fasts and 4 weeks before v0.98.0), and their waits between long fasts stay hard. */
function longNote(kind,done,fasts,state,now){
  if(state.unwell&&now-state.unwell<14*D) return {k:'unwell',until:state.unwell+14*D};
  var longs=done.filter(function(f){return f.goalH>=24;}).concat(fasts.filter(function(f){return f.goalH>=24&&!isDone(f);}));
  var last=longs.length?Math.max.apply(null,longs.map(function(f){return f.end;})):0;
  if(last&&now-last<3*D) return {k:'gap',until:last+3*D};
  var same=longs.filter(function(f){return kind===24?f.goalH===24:f.goalH===36;});
  if(kind===24){ var w7=same.filter(function(f){return now-f.end<7*D;}); if(w7.length) return {k:'week',until:Math.max.apply(null,w7.map(function(f){return f.end;}))+7*D}; }
  else{ var c36=same.filter(function(f){return now-f.end<30*D;}); if(c36.length>=2) return {k:'month',until:Math.min.apply(null,c36.map(function(f){return f.end;}))+30*D}; }
  return null;
}
function longStatus(kind,profile,state,now){
  now=now||Date.now();
  if(profile.safety) return {st:'hidden'};
  var fasts=state.fasts.filter(function(f){return f.end;}), done=fasts.filter(isDone);
  var first=fasts.length?Math.min.apply(null,fasts.map(function(f){return f.start;})):null;
  var n16=done.filter(function(f){return f.goalH>=16&&hours(f)>=15.98;});
  var l24=done.filter(function(f){return f.goalH>=24;}).sort(function(a,b){return a.end-b.end;});
  var unwellRecent=state.unwell&&now-state.unwell<14*D;
  if(profile.fastedBefore) return {st:'ok',exp:true,unlockedAt:state.unlocked&&state.unlocked[kind]||now,note:longNote(kind,done,fasts,state,now)};
  var ok=false,label='',pct=0;
  if(kind===24){
    if(profile.fastedBefore){ ok=n16.length>=3; label=Math.min(n16.length,3)+' of 3 fasts of 16 h or more'; pct=Math.min(n16.length/3,1); }
    else{
      var weeks=first?Math.floor((now-first)/(7*D)):0;
      ok=weeks>=2&&n16.length>=6&&!unwellRecent;
      var a=Math.min(n16.length,6),w=Math.min(weeks,2);
      label=a+' of 6 fasts of 16 h or more, week '+w+' of 2';
      pct=(a/6+w/2)/2;
    }
  }else{
    var f24=l24[0];
    if(profile.fastedBefore){ ok=!!f24; label=(f24?1:0)+' of 1 fast of 24 h'; pct=f24?1:0; }
    else{ var wk=f24?Math.floor((now-f24.end)/(7*D)):0; ok=!!f24&&wk>=2; label=(f24?'24 h done, ':'First finish a 24 h fast, ')+'week '+Math.min(wk,2)+' of 2'; pct=(f24?.5:0)+Math.min(wk,2)/4; }
  }
  if(!ok) return {st:'locked',label:label,pct:pct};
  var u=state.unlocked&&state.unlocked[kind]||now;
  if(state.unwell&&now-state.unwell<14*D) return {st:'paused',until:state.unwell+14*D,unlockedAt:u};
  var longs=done.filter(function(f){return f.goalH>=24;}).concat(fasts.filter(function(f){return f.goalH>=24&&!isDone(f);}));
  var last=longs.length?Math.max.apply(null,longs.map(function(f){return f.end;})):0;
  if(last&&now-last<3*D) return {st:'wait',until:last+3*D,unlockedAt:u};
  var early=now-u<61*D, same=longs.filter(function(f){return (kind===24?f.goalH===24:f.goalH===36);});
  if(early){ var m=longs.filter(function(f){return now-f.end<30*D;}); if(m.length) return {st:'wait',until:Math.max.apply(null,m.map(function(f){return f.end;}))+30*D,unlockedAt:u,monthly:true}; }
  else if(kind===24){ var w7=same.filter(function(f){return now-f.end<7*D;}); if(w7.length) return {st:'wait',until:Math.max.apply(null,w7.map(function(f){return f.end;}))+7*D,unlockedAt:u}; }
  else{ var m36=same.filter(function(f){return now-f.end<7*D;}), c36=same.filter(function(f){return now-f.end<30*D;}); if(m36.length||c36.length>=2) return {st:'wait',until:(m36.length?Math.max.apply(null,m36.map(function(f){return f.end;}))+7*D:Math.min.apply(null,c36.map(function(f){return f.end;}))+30*D),unlockedAt:u}; }
  return {st:'ok',unlockedAt:u};
}

/* ---------- unlock ladder for the everyday plans ----------
   People who have fasted before (and gave no safety flag) can use every everyday plan.
   Everyone else starts at 13:11 and climbs one rung after 3 completed fasts at the rung below:
   16:8 after 3 fasts of 13 h or more, 18:6 after 3 of 16 h, 20:4 after 3 of 18 h, 23:1 after 3 of 20 h.
   Custom is open to everyone (Care mode too), from 10 hours; customMax says how long it can go.
   One completed fast at a plan's length or longer also opens it, so nobody loses a plan they have already done.
   First-timers (no safety flag) also start with 16:8 open, and 18:6 and 20:4 can be picked with a gentle warning ('soft'): they are never blocked, the app only says to start lower and step up.
   Care mode (a safety flag) keeps the ladder and hides 18:6, 20:4 and 23:1. 23:1 stays locked for first-timers.
   returns {st:'ok'|'soft'|'locked'|'hidden', n, need, from, pct} */
var LADDER={'13':0,'16':13,'18':16,'20':18,'23':20,'custom':0};
function planStatus(id,profile,state){
  if(id==='ramadan'||id==='24'||id==='36'||id==='24L'||id==='36L') return {st:'ok'};
  var from=LADDER[id]; if(from==null||from===0) return {st:'ok'};
  if(careOn(profile)&&(id==='18'||id==='20'||id==='23')) return {st:'hidden'}; /* Care mode stops at 16:8 */
  if(profile&&profile.fastedBefore&&!profile.safety) return {st:'ok'};
  var done=(state.fasts||[]).filter(function(f){return f.end&&isDone(f);}), need=3;
  var n=done.filter(function(f){return f.goalH>=from&&hours(f)>=from-0.02;}).length;
  var plan=planById(id,16), own=id==='custom'?16:plan.fast;
  if(id!=='custom'&&done.some(function(f){return hours(f)>=own-0.02&&f.goalH>=own;})) return {st:'ok',n:n,need:need,from:from,pct:1};
  if(n>=need) return {st:'ok',n:n,need:need,from:from,pct:1};
  if(!careOn(profile)){ if(id==='16') return {st:'ok',n:n,need:need,from:from,pct:n/need}; if(id==='18'||id==='20') return {st:'soft',n:n,need:need,from:from,pct:n/need}; }
  return {st:'locked',n:n,need:need,from:from,pct:n/need};
}
function planStatusLabel(st){ return Math.min(st.n,st.need)+' of '+st.need+' fasts of '+st.from+' h or more'; }

/* ---------- time off: a break for travel (1 to 14 days) or for feeling unwell (14 days, can be ended early) ----------
   off = {id, kind:'travel'|'unwell', start:ms, days, endedAt?:ms}. Break days keep the streak but do not grow it, like cheat days.
   A break covers days from its start day; if ended early it stops before the day it was ended. */
var OFF_MAX=14;
function offLastKey(o){ var last=addDays(dayKey(o.start),o.days-1); if(o.endedAt){ var e=addDays(dayKey(o.endedAt),-1); if(e<last) last=e; } return last; }
function offKeys(offs){ var out=[]; (offs||[]).forEach(function(o){ var k=dayKey(o.start), last=offLastKey(o), g=0; while(k<=last&&g++<40){ if(out.indexOf(k)<0) out.push(k); k=addDays(k,1); } }); return out; }
function offActive(offs,now){ now=now||Date.now(); var t=dayKey(now), r=null; (offs||[]).forEach(function(o){ if(!o.endedAt&&dayKey(o.start)<=t&&t<=addDays(dayKey(o.start),o.days-1)) r=o; }); return r; }
function offDayNo(o,now){ now=now||Date.now(); var a=keyToDate(dayKey(now)), b=keyToDate(dayKey(o.start)); return Math.round((a-b)/D)+1; }

/* ---------- days, streaks, cheat days (弹性日) ----------
   One new cheat day each Monday once the first full week is over, bank of 2, at most 2 used in any 7 days.
   A cheat day keeps the streak but does not grow it. */
function fastDays(fasts){ var m={}; fasts.forEach(function(f){ if(!f.end) return; var k=dayKey(f.end); (m[k]=m[k]||[]).push(f); }); return m; }
function dayStatus(k,fasts,flexUsed,offKeys){
  var fm=fastDays(fasts), list=fm[k]||[];
  if(list.some(isDone)) return 'done';
  if(flexUsed.indexOf(k)>=0) return 'flex';
  if(offKeys&&offKeys.indexOf(k)>=0) return 'off';
  if(list.length) return 'early';
  return 'none';
}
function streak(fasts,flexUsed,now){ /* flexUsed may also carry break days */
  now=now||Date.now(); var today=dayKey(now), k=today, n=0, fm=fastDays(fasts);
  function st(x){ return fm[x]&&fm[x].some(isDone)?'done':flexUsed.indexOf(x)>=0?'flex':'none'; }
  if(st(k)==='none') k=addDays(k,-1);
  var guard=0;
  while(st(k)!=='none'&&guard++<4000){ if(st(k)==='done') n++; k=addDays(k,-1); }
  return n;
}
function flexRefill(flex,startMs,now){
  now=now||Date.now(); var mon=mondayOf(now); flex.bank=flex.bank==null?1:flex.bank; flex.mon=flex.mon||mondayOf(startMs||now);
  var guard=0;
  while(flex.mon<mon&&guard++<600){ flex.mon=addDays(flex.mon,7); if(keyToDate(flex.mon).getTime()>=(startMs||now)+7*D) flex.bank=Math.min(2,flex.bank+1); }
  return flex;
}
/* can a cheat day be used for day k (today, or yesterday before noon)? returns reason code or ''. Pass state.off to also block cheat days while a time-off break is on */
function flexBlock(k,state,now){
  now=now||Date.now(); var today=dayKey(now), y=addDays(today,-1), hr=new Date(now).getHours();
  if(k!==today&&!(k===y&&hr<12)) return 'window';
  if(state.flex.used.indexOf(k)>=0) return 'used';
  if(state.off&&(offActive(state.off,now)||offKeys(state.off).indexOf(k)>=0)) return 'break'; /* time off already holds the streak, so a cheat day is never spent during a break */
  if(dayStatus(k,state.fasts,[])==='done') return 'fasted';
  if(state.cur&&k===today) return 'fasting'; /* a fast is running now, so today is not a day off */
  if(state.flex.bank<1) return 'bank';
  var recent=state.flex.used.filter(function(x){ var d=(keyToDate(k)-keyToDate(x))/D; return d>-7&&d<7; });
  if(recent.length>=2) return 'week';
  return '';
}


/* ---------- Days totals and averages ----------
   Every finished fast counts (also one ended early and one imported), so the totals are your whole history and only ever go up.
   A fast belongs to the day it ended on, the same as the calendar. */
function finished(fasts){ return fasts.filter(function(f){ return f.end&&f.end>f.start; }); }
function totals(fasts){ var l=finished(fasts), h=0, since=0; l.forEach(function(f){ h+=hours(f); if(!since||f.start<since) since=f.start; }); return {hours:h,n:l.length,avg:l.length?h/l.length:0,since:since}; }
function avgOf(l){ var h=0; l.forEach(function(f){ h+=hours(f); }); return l.length?h/l.length:0; }
/* weeks of month m (0-based), Monday first, like the calendar; a week that crosses into the next month only counts its days inside the month.
   Returns [{s:'YYYY-MM-DD', e:'YYYY-MM-DD', n:fasts, h:average hours per fast}] */
function weekAvgs(fasts,y,m){
  var first=dayKey(new Date(y,m,1).getTime()), last=dayKey(new Date(y,m+1,0).getTime()), fm=fastDays(finished(fasts)), out=[];
  for(var wk=mondayOf(keyToDate(first).getTime()); wk<=last; wk=addDays(wk,7)){
    var s=wk<first?first:wk, e=addDays(wk,6); if(e>last) e=last;
    var l=[]; for(var k=s; k<=e; k=addDays(k,1)) if(fm[k]) l=l.concat(fm[k]);
    out.push({s:s,e:e,n:l.length,h:avgOf(l)}); }
  return out; }
/* up to `count` months ending at (y,m): [{y,m,n,h}]. Months before the first fast are left out, so a new user sees one bar, not a row of blanks. */
function monthAvgs(fasts,y,m,count){
  var l=finished(fasts), by={}, firstIdx=1e9; l.forEach(function(f){ var d=new Date(f.end), i=d.getFullYear()*12+d.getMonth(); (by[i]=by[i]||[]).push(f); firstIdx=Math.min(firstIdx,i); });
  var end=y*12+m, start=Math.max(end-(count||6)+1,Math.min(firstIdx,end)), out=[];
  for(var i=start;i<=end;i++){ var a=by[i]||[]; out.push({y:Math.floor(i/12),m:i%12,n:a.length,h:avgOf(a)}); }
  return out; }

/* the month in review, shown at the start of the next month: totals, how many reached the goal, the week with the most fasts, and one status per day.
   The "busy" week is about showing up, not about fasting longer, and needs at least two fasts. */
function monthRecap(fasts,y,m,flexUsed,offKeys){
  var first=dayKey(new Date(y,m,1).getTime()), dim=new Date(y,m+1,0).getDate(), last=dayKey(new Date(y,m,dim).getTime());
  var l=finished(fasts).filter(function(f){ var k=dayKey(f.end); return k>=first&&k<=last; }), h=0, days=[], busy=null;
  l.forEach(function(f){ h+=hours(f); });
  for(var d=0;d<dim;d++) days.push(dayStatus(addDays(first,d),fasts,flexUsed||[],offKeys||[]));
  weekAvgs(fasts,y,m).forEach(function(w){ if(w.n>=2&&(!busy||w.n>busy.n)) busy=w; });
  return {n:l.length,hours:h,avg:l.length?h/l.length:0,reached:l.filter(isDone).length,days:days,busy:busy};
}
/* the full recap report: everything in monthRecap plus the longest run, where the hours fell (moon or sun, by the real sunrise and sunset of the place),
   and the usual start and finish. Nothing here rewards a longer fast: the run counts days that reached the goal, the sky split is only a description. */
function circMean(hs){ var x=0,y=0; hs.forEach(function(h){ var a=h/24*2*Math.PI; x+=Math.cos(a); y+=Math.sin(a); }); if(!hs.length) return null; var a=Math.atan2(y,x); if(a<0) a+=2*Math.PI; return Math.round(a/(2*Math.PI)*24*12)/12%24; }
function clockHour(ms){ var d=new Date(ms); return d.getHours()+d.getMinutes()/60; }
function skySplit(list,place){
  var moon=0, sun=0, step=10*60000, cache={};
  list.forEach(function(f){ var pi=placeInfo(place,f.start);
    for(var t=f.start; t<f.end; t+=step){ var seg=Math.min(step,f.end-t), dk=Math.floor((t/H+pi.off)/24), su=cache[dk]||(cache[dk]=sunTimes(pi,t));
      if(moonAmt(placeHour(pi,t+seg/2),su)>=.5) moon+=seg/H; else sun+=seg/H; } });
  return {moon:moon,sun:sun};
}
function monthReport(fasts,y,m,flexUsed,offKeys,place){
  var r=monthRecap(fasts,y,m,flexUsed,offKeys), first=dayKey(new Date(y,m,1).getTime()), dim=r.days.length, last=dayKey(new Date(y,m,dim).getTime());
  var l=finished(fasts).filter(function(f){ var k=dayKey(f.end); return k>=first&&k<=last; }), run=0, best=0, withFast=0;
  r.days.forEach(function(s){ if(s==='done'||s==='early') withFast++; if(s==='done'){ run++; if(run>best) best=run; } else if(s!=='flex'&&s!=='off') run=0; });
  var sp=skySplit(l,place);
  r.dim=dim; r.daysWith=withFast; r.run=best; r.moonH=sp.moon; r.sunH=sp.sun;
  r.start=circMean(l.map(function(f){ return clockHour(f.start); })); r.finish=circMean(l.map(function(f){ return clockHour(f.end); }));
  r.flex=r.days.filter(function(s){ return s==='flex'; }).length; r.weeks=weekAvgs(fasts,y,m); r.feel=feelCount(l);
  return r;
}
/* ---------- weight comparison ----------
   Only the CHANGE in the person's own weight ever leaves the phone, as a percent of their starting weight, at about day 30, 60 and 90.
   Day 0 is the day the weight was given in setup. A check-in counts for the nearest of 30, 60 and 90 within 15 days (monthly check-ins fall around days 20, 51 and 82). */
function trendPoints(body){
  if(!body||!(body.kg>0)||!body.at) return [];
  return (body.checks||[]).map(function(c){ return {day:Math.round((c.at-body.at)/D),pct:Math.round((c.kg-body.kg)/body.kg*1000)/10}; })
    .filter(function(p){ return p.day>=1&&p.day<=400&&p.pct>=-30&&p.pct<=30; }).sort(function(a,b){ return a.day-b.day; });
}
function trendBuckets(points){
  var out=[]; [30,60,90].forEach(function(t){ var best=null;
    (points||[]).forEach(function(p){ var d=Math.abs(p.day-t); if(d<=15&&(!best||d<best.d||(d===best.d&&p.day>best.p.day))) best={d:d,p:p}; });
    if(best) out.push({day:t,pct:best.p.pct}); });
  return out;
}
var api={H:H,D:D,CITIES:CITIES,guessCity:guessCity,zoneSpot:zoneSpot,zoneName:zoneName,deviceZone:deviceZone,placeFix:placeFix,zoneOffset:zoneOffset,placeInfo:placeInfo,placeHour:placeHour,solar:solar,sunTimes:sunTimes,fajrHour:fajrHour,moonAmt:moonAmt,skyAt:skyAt,nextTurn:nextTurn,discFill:discFill,BODY:BODY,bodyStage:bodyStage,bodyShown:bodyShown,
  PLANS:PLANS,planById:planById,planLabel:planLabel,ramadanDay:ramadanDay,dayKey:dayKey,keyToDate:keyToDate,addDays:addDays,mondayOf:mondayOf,hours:hours,isDone:isDone,longStatus:longStatus,longNote:longNote,planStatus:planStatus,CARE_KEYS:CARE_KEYS,CARE_WAIT:CARE_WAIT,CARE_UNDO:CARE_UNDO,careOn:careOn,customMax:customMax,CUSTOM_MIN:CUSTOM_MIN,careEase:careEase,weightFit:weightFit,trendPoints:trendPoints,trendBuckets:trendBuckets,kgTo:kgTo,toKg:toKg,WUNIT:WUNIT,planStatusLabel:planStatusLabel,
  OFF_MAX:OFF_MAX,offKeys:offKeys,offActive:offActive,offDayNo:offDayNo,fastDays:fastDays,dayStatus:dayStatus,streak:streak,flexRefill:flexRefill,flexBlock:flexBlock,finished:finished,totals:totals,weekAvgs:weekAvgs,monthAvgs:monthAvgs,monthRecap:monthRecap,monthReport:monthReport,skySplit:skySplit,FEELS:FEELS,feelOf:feelOf,feelCount:feelCount};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.LightlyCore=api;
})(typeof self!=='undefined'?self:this);
