/* School logos for opponents. Source: the MHSAA member-school directory (mhsaa.ca/schools), Nov 2026.
   Images load from MHSAA's own image server and the service worker keeps a copy for offline use.
   Our own logo (barons-b.png) ships with the app.
   window.teamLogo(name, us) returns a small logo chip; unknown names get a chip with initials.
   To fix a name that doesn't match, add it to ALIAS below. */
(function () {
  'use strict';
  const BASE = 'https://www.mhsaa.ca/cache/schools/';
  // [MHSAA id, school name, team name, logo file]
  const S = [
    [122,'1972 Memorial High School','Thunder','c00b60864a50abbd97df622626858153_174x174_fit-s_250x250.webp'],
    [2171,'Abbalak Thunderswift Memorial School','','school_logo-s_250x241.webp'],
    [86,'Alonsa School','Aces','f5mv4rec97xfaqy4t4ze-s_249x250.webp'],
    [2169,'Andrew Mynarski V.C. School','Lancasters','Lancasters_logo_Black-s_210x250.webp'],
    [52,'Arborg Collegiate','','Arborg_Collegiate-s_250x188.webp'],
    [53,'Ashern Central School','Cobras','Ashern_Cobras_logo-s_250x180.webp'],
    [67,'Baldur School','Vikings','Baldur-s_202x250.webp'],
    [145,'Balmoral Hall School','Blazers','orig_news1325584_1391071-s_222x250.webp'],
    [115,'Birtle Collegiate','Falcons','unnamed-s_250x140.webp'],
    [102,'Boissevain School','Broncos','2q1qtintzulhoqykwze3-s_250x200.webp'],
    [146,'Calvin Christian Collegiate','Eagles','CCCeaglesLogo20-s_250x102.webp'],
    [78,'Carberry Collegiate','Cougars','Carberry-Cougars-Logo-2024-Transparent-Web-Resolution-s_246x250.webp'],
    [35,'Carman Collegiate','Cougars','kqorjdnw891mmf5569sd-s_167x250.webp'],
    [68,'Cartwright School','Cougars','qvfex0gofyfixkd4q00h-s_250x250.webp'],
    [12,'Centre scolaire Léo-Rémillard','Renards','Logo_SportsCSLR_FullColor_V-s_250x250.webp'],
    [208,'Chan Kagha Otina Dakota Wayawa Tipi School','','Birdtail_Eagles-s_250x250.webp'],
    [123,'Chemawawin School','Eagles','Chem_Eagles-s_250x250.webp'],
    [124,'Chief Sam Cook Mahmuwee Education Centre','','CSCMEC_LOGO-2-s_250x229.webp'],
    [1,'Children of the Earth High School','','Children_of_the_Earth-s_213x250.webp'],
    [13,'Collège Béliveau','Barracudas','College_Beliveau-s_250x181.webp'],
    [2,'Collège Churchill High School','Bulldogs','Churchill_High-s_250x229.webp'],
    [179,'Collège Garden City Collegiate','Gophers','Garden_City-s_250x207.webp'],
    [14,'Collège Jeanne-Sauvé','Olympiens','College_Jeanne-Sauve-s_211x250.webp'],
    [160,'Collège Lorette Collegiate','Scorpions','scorpions_yellow_flashbay_2015-s_250x145.webp'],
    [15,'Collège Louis-Riel','Voyageurs','Louis_Riel-2-s_250x228.webp'],
    [184,'Collège Miles Macdonell Collegiate','Buckeyes','dpofgl27asunxqljhqqd-s_250x180.webp'],
    [16,'Collège Pierre-Elliott-Trudeau','Canadiens','CPET_Logo-1--TMv_Photo_resized-s_250x186.webp'],
    [161,'Collège régional Gabrielle-Roy','Les Roys','College_regional_Gabrielle-Roy-s_250x117.webp'],
    [17,'Collège St. Norbert Collegiate','Celtics','Celtic-Decal-2-s_193x250.webp'],
    [64,'Collège Stonewall Collegiate','Rams','vgyg05d9tfs7lf4b3vg5-s_245x250.webp'],
    [25,'Collège Sturgeon Heights Collegiate','Huskies','Sturgeon_Heights-s_193x250.webp'],
    [190,'Crocus Plains Regional Secondary School','Plainsmen','wjb28tq9yrddj9bsi7cp-s_250x250.webp'],
    [18,'Dakota Collegiate','Lancers','Lancer_Logo_Black_Gold_No_Text-TMv_Photo_resized-s_250x119.webp'],
    [3,'Daniel McIntyre Collegiate Institute','Maroons','daniel-mcintyre-collegiate-insitute-logo-web.7d768d34879-s_250x250.webp'],
    [87,'Dauphin Regional Comprehensive Secondary School','Clippers','DRCSS_Logo_2021-s_159x250.webp'],
    [103,'Deloraine School','Colts','Deloraine-s_250x201.webp'],
    [37,'Dufferin Christian School','Stingers','Dufferine_Collegiate-s_250x202.webp'],
    [125,'Duke of Marlborough School','Storm','Storm_Logo-2-s_245x250.webp'],
    [88,'Ebb and Flow School','Thunderbirds','Ebb_and_Flow_School-s_250x192.webp'],
    [55,'École Communautaire Aurele-Lemoine','','16463459_368738680177051_661040093339213268_o_(2)-s_250x218.webp'],
    [2146,'École Communautaire Saint-Georges','','stgeorges-s_250x250.webp'],
    [70,'École Communtaire Gilbert-Rosset','','enteteECGR_web-s_250x185.webp'],
    [162,'École Communtaire Réal-Bérard','Jaguars','Ecole_communautaire_Real-Berard-s_250x170.webp'],
    [165,'École Edward Schreyer School','Barons','Barons_B_Green-s_198x250.webp'],
    [167,'École Héritage Immersion','Huskies','EHI_Huskies-s_250x250.webp'],
    [205,'École La Source','Lynx','Ecole_La_Source-s_236x250.webp'],
    [163,'École Pointe-des-Chênes','Cavaliers','Logo_officiel_Cavaliers_-s_245x250.webp'],
    [198,'École Powerview School','Wild','PVS_LOGO_-_Oxford-s_250x201.webp'],
    [69,'École régionale Notre-Dame','Coyotes','Ecole_regional_Notre_Dame-s_250x180.webp'],
    [36,'École régionale Saint-Jean-Baptiste','Saints','Logo_1_ERSJB_couleur-01-s_250x98.webp'],
    [7,'École Secondaire Kelvin High School','Clippers','km3yyrv4wrmac4wnq73s-s_250x250.webp'],
    [191,'École Secondaire Neelin High School','Spartans','Neelin_Spartan_Logo_2-s_223x250.webp'],
    [26,'École secondaire Oak Park High School','Raiders','op_logo_2024_blue-s_185x250.webp'],
    [9,'École Secondaire Sisler High School','Spartans','7rvt3x3aazaoljwsm33n-s_250x250.webp'],
    [164,'École St.-Joachim','Braves','ljld1kv9ofqx2ca1xkxs-s_250x250.webp'],
    [104,'Elkhorn School','Bulldogs','Elkhorn-s_250x250.webp'],
    [38,'Elm Creek School','Cobras','Cobra_Logo-s_250x215.webp'],
    [4,'Elmwood High School','Giants','Elmwood_Giants_logo-s_250x238.webp'],
    [79,'Elton Collegiate','Sabres','last2circle2-s_250x182.webp'],
    [80,'Erickson Collegiate Institute','Eagles','Erickson_Collegiate-s_250x186.webp'],
    [89,'Ethelbert School','','rew9qcr9bvdzubse7vvt-s_250x250.webp'],
    [147,'Faith Academy','Lightning','FA_LOGO_blue-2-s_250x213.webp'],
    [56,'Fisher Branch Collegiate','Cougars','Fisher_Branch-s_193x250.webp'],
    [54,'Fisher River High School','Hawks','1-s_250x92.webp'],
    [27,'Fort Richmond Collegiate','Centurions','lfw5jx1xx55c3v0emukf-s_209x250.webp'],
    [126,'Frontier Collegiate Campus','Raiders','5uq2gjntlg6cffz965n3-s_250x250.webp'],
    [127,'Frontier Mosakahiken School','Grizzlies','Frontier_Mosakahiken-s_250x211.webp'],
    [39,'Garden Valley Collegiate','Zodiacs','Garden_Valley-s_227x250.webp'],
    [2174,'General Wolfe School','Wolfpack','GENERALWOLFE-logomark-circle-2024-v1-large-s_250x250.webp'],
    [90,'Gilbert Plains Collegiate','Trojans','GPCI_TROJAN_HEAD-s_250x213.webp'],
    [128,'Gillam School','Timberwolves','timberwolves_logo-s_237x250.webp'],
    [57,'Gimli High School','Lakers','Gimli-s_250x250.webp'],
    [71,'Glenboro School','Panthers','Glenboro_School-s_250x248.webp'],
    [91,'Glenella School','Eagles','ko0zbycfe5bjg2wzq9f6-s_250x240.webp'],
    [19,'Glenlawn Collegiate','Lions','g5e9dhv46cwxiosrhlpn-s_250x250.webp'],
    [92,'Goose Lake High School','Raiders','https://www.mhsaa.ca/assets/schools/GLH_Logo_(002).jpg'],
    [5,'Gordon Bell High School','Panthers','drddrkxkf0u5h4q3ooji-s_250x159.webp'],
    [129,'Grand Rapids School','Wolverines','Grand_Rapids_Wolverine_logo-s_250x250.webp'],
    [93,'Grandview School','Spartans','Logo_Black-3-s_250x250.webp'],
    [6,'Grant Park High School','Pirates','eecb209f-f157-4b31-984e-c49701a603ec-s_250x129.webp'],
    [148,'Gray Academy of Jewish Education','Raiders','Grey_Academy-s_205x250.webp'],
    [166,'Green Valley School','Pirates','GVS-Pirates-Male-s_250x250.webp'],
    [117,'Hamiota Collegiate Institute','Huskies','bz3kjqijw4txyu1l0zgq-s_250x250.webp'],
    [130,'Hapnot Collegiate Institute','Kopper Kweens','0uzlsyfmtffecv2ef52f-s_243x250.webp'],
    [105,'Hartney School','Hornets','7m54wo32f31gw0pr8pzt-s_250x239.webp'],
    [249,'Helen Betty Osborne Ininiw Education Resource Centre','Huskies','LOGO_2-s_250x250.webp'],
    [2056,'Hugh John McDonald School','Falcons','Falcons2-2-s_250x193.webp'],
    [149,'Immanuel Christian School','Falcons','Immanuel_Christian-s_250x93.webp'],
    [33,'Institut collégial Vincent Massey Collegiate','Trojans','Vincent_Massey_(Wpg)-s_250x250.webp'],
    [2231,'Iqra Islamic School','','Screenshot_2026-10-27_at_9.55.27 AM-s_250x167.webp'],
    [99,'Isaac Beaulieu Memorial School','Badgers','Sandy_Bay_(Isaac_Beaulieu_Memorial)-s_244x250.webp'],
    [2149,'Isaac Newton School','Blazers','Isaac_Newton_On_White-s_247x250.webp'],
    [20,'J.H. Bruns Collegiate','Broncos','dvd19kghrtasdpkt3q9r-s_250x250.webp'],
    [28,'John Taylor Collegiate','Pipers','JT_Piper_-_2007_Invisible-s_173x250.webp'],
    [132,'Joseph H. Kerr School','Tigers','Tiger[345]-s_250x225.webp'],
    [180,'Kildonan-East Collegiate','Reivers','KE_Drop_Letters_Maroon-s_250x228.webp'],
    [106,'Killarney School','Raiders','9na34e6fg4n7k83zr98l-s_250x197.webp'],
    [150,"King's School (The)",'Knights','4yan6um6k39wpaul9m4b-s_250x230.webp'],
    [168,'Lac du Bonnet Senior School','Chargers','Lac_du_Bonnet-s_250x250.webp'],
    [1893,'Lake St. Martin School','Golden Eagles','Lake_St._Martin_School-s_250x250.webp'],
    [169,'Landmark Collegiate','96ers','Landmark-s_208x250.webp'],
    [151,'Laureate Academy (The)','','ln1gm4abo0hd2wu7cqmg-s_250x250.webp'],
    [133,'Leaf Rapids Education Center','',''],
    [152,'Linden Christian School','Wings','000-Wings_Logo_Edit_MAIN-page-001-s_250x193.webp'],
    [181,'Lord Selkirk Regional Comprehensive Secondary School','Royals','Lord_Selkirk-s_250x170.webp'],
    [59,'Lundar School','Kodiaks','2022.06_lundar_kodiaks_v3-2-s_193x250.webp'],
    [81,'MacGregor Collegiate Institute','Mustangs','MUSTANG_LOGO_(002)-s_249x250.webp'],
    [118,'Major Pratt School','Trojans','Logo_-_Major_Pratt_Trojans_updated_2023-s_193x250.webp'],
    [153,'Manitoba School for the Deaf','','MSD_crest_logo_2014-s_233x250.webp'],
    [2172,'Manto Sipi Cree Nation School','Moose','1000014986-s_250x233.webp'],
    [2046,'Mantou Sakahigan Kiskinamakewikamik','Wolverines','GLNFS_logo-s_250x249.webp'],
    [182,'Maples Collegiate','Maples','M_logo-s_250x250.webp'],
    [134,'Margaret Barbour Collegiate Institute','Spartans','Margaret_Barbour-s_250x250.webp'],
    [95,'McCreary School','Mavericks','McCreary-s_250x218.webp'],
    [135,'Mel Johnson School','Eagles','ep8zcldmk0n7z7ycyuws-s_250x250.webp'],
    [107,'Melita School','Marauders','uu78lmmd1y5qjvuzsttd-s_250x250.webp'],
    [183,'Mennonite Brethren Collegiate Institute','Hawks','Mennonite_Brethren-s_250x122.webp'],
    [41,'Miami School','Marlins','marlins_colour_crest_PRINT_border-s_250x212.webp'],
    [140,'Mikisew School','','Mikisew_Logo_2018-s_141x250.webp'],
    [96,'Minegoziibe Anishinabe School','Talons','nywsydx95ytkh63v6gyi-s_250x250.webp'],
    [82,'Minnedosa Collegiate','Chancellors','xoiacj8s4u847bf1m72n-s_234x250.webp'],
    [42,'Morden Collegiate Institute','Thunder','Morden-s_250x242.webp'],
    [43,'Morris School','Mavericks','Mavericks_Logo-s_250x250.webp'],
    [506,'Morweena Christian School','Raptors','3E5344E9-4607-4EDA-B4C5-B544F60C05E8-s_220x250.webp'],
    [185,'Murdoch MacKay Collegiate','','Murdoch_McKay-s_250x210.webp'],
    [83,'Neepawa Area Collegiate','Tigers','Tigers_logo-s_250x188.webp'],
    [136,'Neil Dennis Kematch Memorial School','Bisons','v4wh69jtwpx2rdyaxqeg-s_250x249.webp'],
    [72,'Nellie McClung Collegiate','Stingers','Nellie_McClung-s_250x250.webp'],
    [21,'Nelson McIntyre Collegiate','Torchbearers','Nelson_Mac-s_250x250.webp'],
    [137,'Nisichawayasihk Neyo Ohtinwak Collegiate','Warriors','warriors_version_2-s_250x213.webp'],
    [170,'Niverville High School','Panthers','Panthers_solidred-s_250x226.webp'],
    [195,'Northlands Parkway Collegiate','Nighthawks','Northlands_Parkway-s_250x165.webp'],
    [139,'Oscar Lathlin Collegiate','Wolverines','logo_color_words_(00000003)-2-s_250x250.webp'],
    [60,'Peguis Central School','Wolverines','Wolverines_logo-s_250x208.webp'],
    [2078,'Pembina Trails Collegiate','Trailhawks','PTC_Trailhawk_Logo-2-s_250x162.webp'],
    [108,'Pierson Collegiate','Panthers','Pierson_School-s_250x199.webp'],
    [73,'Pilot Mound Collegiate','Pilots','IMG_0548-s_250x167.webp'],
    [171,'Pinawa Secondary School','Panthers','Panthers_Logo-s_250x188.webp'],
    [61,'Pinaymootang School','Mustangs','Pinaymootang_School-s_250x188.webp'],
    [44,'Portage Collegiate Institute','Trojans','PCI_letter_logo-s_250x236.webp'],
    [154,'Prairie Central Adventist Academy','','image001-s_250x240.webp'],
    [194,'Prairie Mountain High School','Predators','Prairie_Mountain_High_School-s_250x145.webp'],
    [8,'R.B. Russell Vocational High School','','RB_Russell_Logo-2-s_250x163.webp'],
    [141,'R.D. Parker Collegiate','Trojans','R.D._Parker-s_250x207.webp'],
    [109,'Reston School','Tigers','tigers-s_250x242.webp'],
    [186,'River East Collegiate','Kodiaks','qwvoz3p4cp5c209mbd0m-3-s_250x243.webp'],
    [84,'Rivers Collegiate','Rams','Rivers_Collegiate-s_250x195.webp'],
    [62,'Riverton Collegiate','Ravens','RIVERTON_R_LOGO-s_250x235.webp'],
    [97,'Rorketon School','Rockets','Rorkton-s_250x145.webp'],
    [45,'Roseau Valley School','Raiders','n9o96db5hi6lyhlm5v4y-s_246x250.webp'],
    [46,'Rosenort School','Redhawks','Rosenort_School-s_250x205.webp'],
    [172,'Ross L Gray School','','z5gynk7zcy8uovqpupq0-s_250x249.webp'],
    [119,'Rossburn Collegiate','Raiders','Rossburn_Collegiate-s_182x250.webp'],
    [173,'Sagkeeng Anicinabe High School','Wolves','New_SAHS_Logo_Trans[606]-2-s_241x250.webp'],
    [47,'Sanford Collegiate','Sabres','Sanford_logo-s_250x179.webp'],
    [32,'Shaftesbury High School','Titans','Shaftesbury-s_250x230.webp'],
    [48,'Shevchenko School','Sabres','Shevchenko-s_250x227.webp'],
    [120,'Shoal Lake School','Sharks','xphk04x8owmu4thf2o9k-s_250x250.webp'],
    [110,'Sioux Valley High School','','sv_logo-s_188x250.webp'],
    [111,'Souris School','Sabres','Souris-s_208x250.webp'],
    [155,'Southeast Collegiate','Eagles','southeast_collegiate-s_250x250.webp'],
    [187,'Springfield Collegiate Institute','Sabres','Sabres_Logo_Feb_20-s_245x250.webp'],
    [156,'Springs Christian Academy','Eagles','SCAEAGLE-GreyShadow_1-s_250x127.webp'],
    [157,'St. Boniface Diocesan High School','Centurions','Logo_2024-s_250x180.webp'],
    [75,'St. Claude School Complex','Olympiens','dgdzobcys4pi3m5eqnhp-s_250x225.webp'],
    [29,'St. James Collegiate','Jimmies','St._James-s_250x248.webp'],
    [10,"St. John's High School",'Tigers','k5ya0yg92k06x7mk3fcg-s_250x250.webp'],
    [22,"St. John's-Ravenscourt School",'Eagles','St._Johns_Ravenscourt-s_230x250.webp'],
    [63,'St. Laurent School','Hawks','hawks@2x-s_250x213.webp'],
    [30,"St. Mary's Academy",'Flames','SMA_Flames_Log-s_234x250.webp'],
    [158,'St. Maurice High School','Patriots','49s0wpl2qkga48pnist0-s_250x250.webp'],
    [49,"St. Paul's Collegiate",'Barons','St._Pauls_Collegiate-s_250x204.webp'],
    [31,"St. Paul's High School",'Crusaders','White_P_Maroon_Circle-2-s_250x250.webp'],
    [142,'St. Theresa Point High School','Mukwa','326792487_503915224985273_9039119004047939958_n-s_250x241.webp'],
    [174,'Ste. Anne Collegiate','Lynx','Ste._Anne-s_250x186.webp'],
    [98,'Ste. Rose School','Celtics','Ste._Rose_School-s_250x193.webp'],
    [175,'Steinbach Christian School','Flames','3qx61988jihigzfg6t5r-s_250x227.webp'],
    [176,'Steinbach Regional Secondary School','Sabres','fD_zqRPZ_400x400-s_250x250.webp'],
    [121,'Strathclair School','Skyhawks','Strathclair-s_220x250.webp'],
    [100,'Swan Valley Regional Secondary School','Tigers','Swan_Valley_Regional-s_230x250.webp'],
    [11,'Tec Voc High School','Hornets','D8AEB076-6933-41AC-BDE2-8220B90544CC-s_250x187.webp'],
    [65,'Teulon Collegiate Institute','Saints','4ch747c2sf1n8fihby3a-s_250x220.webp'],
    [138,'Thunderbird School','',''],
    [188,'Transcona Collegiate','Titans','Transcona_Collegiate-s_202x250.webp'],
    [76,'Treherne Collegiate','Tigers','62ybb19yubyxmuu6lx9h-s_243x250.webp'],
    [159,'University of Winnipeg Collegiate','Wesmen','9nvgc1tik0pcujhii62a-s_250x123.webp'],
    [192,'Vincent Massey High School','Vikings','Vincent_Massey_High_School_Logo_two-s_250x248.webp'],
    [112,'Virden Collegiate Institute','Golden Bears','xx51hf6p2pks515m6q0i-s_250x225.webp'],
    [50,'W.C. Miller Collegiate','Aces','WCMC_Aces_-_Stroked_Green_with_Gold_(1)-s_250x225.webp'],
    [177,'Wanipigow School','Stingers','wanipigow_east_wall_layout-s_250x97.webp'],
    [66,'Warren Collegiate Institute','Wildcats','khqdimkc46vrp5jujn1h-s_250x250.webp'],
    [113,'Waskada School','Wolverines','Waskada-2-s_250x250.webp'],
    [114,'Wawanesa School','Warriors','mf9m8t9zd8b1srjjglde-s_250x250.webp'],
    [189,'West Kildonan Collegiate','Wolverines','aan51r5qfhrj7wyil0xx-s_250x250.webp'],
    [144,'West Lynn Heights School','Northstars','West_Lynn_Heights-2-s_250x101.webp'],
    [23,'Westgate Mennonite Collegiate','Wings','Westgate_Mennonite-s_250x200.webp'],
    [51,'Westpark School','Royals','Westpark-s_201x250.webp'],
    [34,'Westwood Collegiate','Warriors','mo9qjwkw744bnocyw6v9-s_250x218.webp'],
    [178,'Whitemouth School','Warriors','ktvs22lyn51nkgt9ztff-s_240x250.webp'],
    [85,'William Morton Collegiate Institute','Warriors','William_Morton-s_244x250.webp'],
    [24,'Windsor Park Collegiate','Royals','Windsor_Park-s_250x86.webp'],
    [101,'Winnipegosis Collegiate','Lakers','Winnipegosis_Collegiate-s_250x241.webp']
  ];
  // Short names coaches type (and names in the tourney draw) that don't match the MHSAA name on their own.
  const ALIAS = {
    'selkirk': 181, 'gladstone': 85, 'nelson house': 137, 'steinbach': 176, 'massey': 192, 'vincent massey': 192,
    'alonsa mccreary': 86, 'beausejour': 165, 'schreyer': 165, 'ees': 165, 'powerview sagkeeng': 198,
    'sjr': 22, 'oak bank': 187, 'mbci': 183, 'miles mac': 184, 'dmci': 3, 'kec': 180, 'sturgeon': 25, 'oakbank': 187
  };
  const STOP = new Set(['ecole', 'college', 'collegiate', 'collegial', 'institute', 'institut', 'school', 'high', 'secondary', 'secondaire',
    'regional', 'regionale', 'comprehensive', 'the', 'senior', 'area', 'centre', 'center', 'scolaire', 'communautaire', 'communtaire',
    'campus', 'complex', 'vocational', 'jv', 'varsity', 'sr', 'jr', 'boys', 'girls', 'gr', 'grade']);
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/&/g, ' and ').replace(/['’.]/g, '').replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9]+/g, ' ')
    .split(' ').filter(w => w && !STOP.has(w)).join(' ');
  const rows = S.map(([id, name, nick, file]) => ({ id, name, nick, key: norm(name), nk: norm(nick),
    url: !file ? '' : /^https?:/.test(file) ? file : BASE + encodeURIComponent(file).replace(/%2F/g, '/') }));
  const byId = Object.fromEntries(rows.map(r => [r.id, r]));
  const one = list => list.length === 1 ? list[0] : null;
  const cache = {};
  function find(name) {
    const n = norm(name);
    if (!n) return null;
    if (n in cache) return cache[n];
    const hit = (ALIAS[n] && byId[ALIAS[n]]) || one(rows.filter(r => r.key === n)) ||
      one(rows.filter(r => r.key.startsWith(n + ' '))) || one(rows.filter(r => n.startsWith(r.key + ' '))) ||
      one(rows.filter(r => r.nk && (r.nk === n || n.endsWith(' ' + r.nk)))) || null;
    return (cache[n] = hit);
  }
  const US = { name: 'École Edward Schreyer School', nick: 'Barons', url: './barons-b.png' };
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = s => String(s || '?').replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  // Logo chip. If the image can't load (offline before it was ever cached) it falls back to initials.
  function teamLogo(name, us) {
    const r = us ? US : find(name);
    const ini = esc(initials(us ? 'Barons' : name));
    if (!r || !r.url) return `<span class="tlogo mono" aria-hidden="true">${ini}</span>`;
    return `<span class="tlogo" aria-hidden="true" data-i="${ini}"><img src="${esc(r.url)}" alt="" decoding="async" onerror="var p=this.parentNode;p.classList.add('mono');p.textContent=p.dataset.i"></span>`;
  }
  // Fetch a set of logos once so the service worker has them for offline (tourney field, usual opponents).
  function warm(names) {
    const seen = new Set();
    names.forEach(nm => { const r = find(nm); if (r && r.url && !seen.has(r.url)) { seen.add(r.url); const i = new Image(); i.src = r.url; } });
  }
  window.VBLogos = { find, norm, warm, rows };
  // Tourney field: fetch every team's logo once after load so the weekend works with no gym wifi.
  window.addEventListener('load', () => setTimeout(() => { const T = window.VBTourney; if (T) warm(Object.values(T.pools).flatMap(p => p.teams)); }, 1500));
  window.teamLogo = teamLogo;
})();
