// 2024 ADNKS il nüfusları. İl plaka kodu sırası; ilçe merkezi nüfusu değildir.
const POPULATIONS=[2280484,611037,750193,499801,342378,5864049,2722103,169280,1165943,1276096,228495,283276,359808,326409,275826,3238618,568966,199981,521335,1061371,1833684,421247,603941,241239,745005,921630,2193363,455922,142617,282191,1562185,446409,1954279,15701602,4493242,272300,381991,1452458,379031,244546,2130006,2330024,571078,750491,1475353,1134105,895911,1081867,392301,317952,372708,770711,346977,1110735,1382376,336453,226957,637007,1187162,612674,822270,86612,2237745,375310,1118087,413161,586802,439474,83676,262791,283053,654528,570826,206715,91354,206857,307882,250478,156739,561061,412344];
// Her satır: plaka | kısa şehir tanımı | görülecek yer | yöresel lezzet / ürün
const CITY_DETAILS=`1|Çukurova'nın sıcacık kalbi|Taşköprü|Adana kebabı
2|Güneşin heykellerle buluştuğu yer|Nemrut Dağı|Besni üzümü
3|Termal sular ve köklü lezzetler|Afyonkarahisar Kalesi|Kaymaklı ekmek kadayıfı
4|Zirvelere uzanan bir hikâye|İshak Paşa Sarayı|Abdigör köftesi
5|Yeşilırmak'ın kıyısında bir masal|Kral Kaya Mezarları|Amasya elması
6|Cumhuriyetin kalbi|Anıtkabir|Ankara tavası
7|Akdeniz'in maviye açılan kapısı|Kaleiçi|Antalya piyazı
8|Yeşilin binbir tonu|Karagöl, Borçka|Kuymak
9|Ege'nin incir kokan toprakları|Aphrodisias Antik Kenti|Aydın inciri
10|İki denizin kucaklaştığı şehir|Kaz Dağları|Höşmerim
11|Tarihin kök saldığı topraklar|Şeyh Edebali Türbesi|Bilecik pazaryeri helvası
12|Dağların ve göllerin sessizliği|Yüzen Adalar|Sorina pel
13|Taş evlerden göl kıyılarına|Ahlat Selçuklu Mezarlığı|Büryan kebabı
14|Ormanların içindeki huzur|Abant Gölü|Mengen pilavı
15|Göller yöresinde bir durak|Salda Gölü|Burdur şişi
16|Yeşilin ve tarihin şehri|Ulu Cami|İskender kebabı
17|Destanların ve antik çağın izleri|Troya Antik Kenti|Peynir helvası
18|Tuz mağarasından yaylalara|Çankırı Tuz Mağarası|Yaren güveci
19|Hititlerin kadim başkenti|Hattuşa|Çorum leblebisi
20|Beyaz bir doğa harikası|Pamukkale Travertenleri|Denizli kebabı
21|Surların anlattığı binlerce yıl|Diyarbakır Surları|Kaburga dolması
22|Mimarinin zarafetle buluşması|Selimiye Camii|Edirne tava ciğeri
23|Harput'tan bugüne uzanan izler|Harput Kalesi|Harput köftesi
24|Fırat'ın kıyısında bir güzellik|Girlevik Şelalesi|Erzincan tulum peyniri
25|Doğu'nun yükseklerden bakan şehri|Çifte Minareli Medrese|Cağ kebabı
26|Porsuk'un renkli kıyıları|Odunpazarı Evleri|Çibörek
27|Lezzetin ustalıkla buluştuğu şehir|Zeugma Mozaik Müzesi|Antep baklavası
28|Fındık bahçelerinden denize|Giresun Adası|Giresun fındığı
29|Dağların arasındaki saklı tarih|Karaca Mağarası|Köme
30|Zirvelerin ve yaylaların yurdu|Cilo Dağları|Doleme
31|Medeniyetlerin sofrası|Hatay Arkeoloji Müzesi|Künefe
32|Gül kokulu bir yolculuk|Eğirdir Gölü|Isparta gülü
33|Narenciye bahçelerinden Akdeniz'e|Kızkalesi|Tantuni
34|İki kıta, binlerce hikâye|Sultanahmet Camii|Balık ekmek
35|Ege'nin özgür ruhu|İzmir Saat Kulesi|Boyoz
36|Taşın, karın ve tarihin şehri|Ani Ören Yeri|Kars kaşarı
37|Konaklardan kanyonlara|Valla Kanyonu|Etli ekmek
38|Erciyes'in eteklerinde bir durak|Erciyes Dağı|Kayseri mantısı
39|Trakya'nın yeşile açılan yüzü|İğneada Longoz Ormanları|Hardaliye
40|Bozkırın müzikle atan kalbi|Cacabey Medresesi|Çullama
41|Körfezin yeşil kıyıları|Ormanya|Pişmaniye
42|Hoşgörünün ve bozkırın şehri|Mevlânâ Müzesi|Konya etliekmeği
43|Çininin renkli dünyası|Aizanoi Antik Kenti|Cimcik
44|Kayısı bahçelerinin şehri|Arslantepe Höyüğü|Malatya kayısısı
45|Spil'in gölgesindeki tarih|Sardes Antik Kenti|Mesir macunu
46|Dondurmanın usta elleri|Germanicia Mozaikleri|Maraş dondurması
47|Mezopotamya'ya bakan taş evler|Deyrulzafaran Manastırı|Kaburga dolması
48|Mavinin her tonuna bir yol|Ölüdeniz|Çökertme kebabı
49|Lalelerin renklendirdiği ova|Murat Köprüsü|Muş köftesi
50|Peribacalarının büyülü dünyası|Göreme Açık Hava Müzesi|Testi kebabı
51|Dağlardan tarihin derinliklerine|Gümüşler Manastırı|Niğde gazozu
52|Yeşil tepeler, mavi ufuklar|Boztepe|Ordu fındığı
53|Çay bahçeleri arasında bir nefes|Ayder Yaylası|Rize çayı
54|Gölün ve ormanın buluşması|Sapanca Gölü|Islama köfte
55|Karadeniz'in geniş ufukları|Bandırma Vapuru Müzesi|Samsun pidesi
56|Kadim yolların buluştuğu şehir|Tillo|Siirt büryanı
57|Karadeniz'in sakin limanı|Hamsilos Koyu|Sinop mantısı
58|Bozkırın köklü mirası|Divriği Ulu Camii ve Darüşşifası|Sivas köftesi
59|Marmara'ya bakan bağlar|Uçmakdere|Tekirdağ köftesi
60|Yeşil vadilerin tarih durağı|Ballıca Mağarası|Tokat kebabı
61|Bulutlara uzanan yeşil|Sümela Manastırı|Akçaabat köftesi
62|Munzur'un çağlayan suları|Munzur Vadisi|Şavak tulum peyniri
63|İnsanlığın ilk hikâyeleri|Göbeklitepe|Urfa kebabı
64|Dokumanın ve kanyonların şehri|Ulubey Kanyonu|Uşak tarhanası
65|Mavi gölün kıyısında bir sabah|Akdamar Adası|Van otlu peyniri
66|Bozkırın çam kokulu nefesi|Yozgat Çamlığı|Testi kebabı
67|Emeğin ve kıyıların şehri|Gökgöl Mağarası|Devrek simidi
68|Vadilerde saklanan bir dünya|Ihlara Vadisi|Aksaray tahinlisi
69|Çoruh'un kıyısındaki tarih|Baksı Müzesi|Lor dolması
70|Türkçenin kadim duraklarından|Binbir Kilise|Batırık
71|Kızılırmak'ın izinde|Çeşnigir Köprüsü|Keskin tava
72|Dicle kıyısında zaman yolculuğu|Hasankeyf|Şam böreği
73|Dağların eteklerinde kadim yollar|Cizre Ulu Camii|Kutlık
74|Ahşap evler, mavi kıyılar|Amasra|Amasra salatası
75|Yüksek yaylaların sessiz güzelliği|Çıldır Gölü|Ardahan balı
76|Ağrı Dağı'nın bereketli ovası|Tuzluca Tuz Mağaraları|Bozbaş
77|Yeşile açılan kısa bir kaçamak|Yürüyen Köşk|Yalova sütlüsü
78|Safran kokulu sokaklar|Safranbolu Evleri|Safranbolu lokumu
79|Sınırların ötesine uzanan lezzet|Ravanda Kalesi|Kilis tava
80|Çukurova'nın yeşil etekleri|Karatepe-Aslantaş Açık Hava Müzesi|Osmaniye yer fıstığı
81|Şelalelerin ve ormanların şehri|Güzeldere Şelalesi|Düzce köftesi`.split('\n').map(row=>row.split('|'));
const REGION_COLORS={'Marmara':'#bcba8f','Ege':'#d3bf82','Akdeniz':'#d6a97f','İç Anadolu':'#d6cc9b','Karadeniz':'#a4bb99','Doğu Anadolu':'#c4b291','Güneydoğu Anadolu':'#cd9478'};
