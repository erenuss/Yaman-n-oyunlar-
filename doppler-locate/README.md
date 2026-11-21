## LocateVideo'yu GitHub Pages üzerinden mevcut Codespace ile paylaşmak

**Ayrı sunucu kurmaya gerek yok.** Bu repodaki statik Pages ekranı mevcut `effective-garbanzo` Codespace'inin **7070** portuna bağlanacak şekilde hazırlandı:

- Paylaşım bağlantısı: https://erenuss.github.io/Yaman-n-oyunlar-/locatevideo/
- Mevcut analiz motoru: https://effective-garbanzo-xjv9wp7g6w9264vp-7070.app.github.dev/
- Motorun çalışması için Codespace açık olmalı.
- VS Code **Bağlantı Noktaları / Ports** sekmesinde **7070 → sağ tık → Port Visibility → Public** yapılmalı. **8000 Private kalmalı.**
- Mevcut Codespaces terminalinden bir kez `git pull && docker compose up -d --force-recreate web` çalıştırılmalı (Terminal halen `doppler-locate` klasöründeyse). Başka dizindeysen `cd doppler-locate && git pull && docker compose up -d --force-recreate web`.
- Pages ekranında üstte **Motor bağlı** görünüyorsa tarayıcıdan upload ve analiz API'si Codespaces'e bağlanıyor. Bu, gerçek bir Doppler konum tahmininin başarıyla tamamlandığı anlamına gelmez; ayrıca gerçek kayıt testleri gerekir.

**Sınırlar:** Bu geçici bir paylaşılabilir demo. Codespaces hareketsizlik süresi sonunda kapanır ve hizmet durur. Public port herhangi bir ziyaretçinin API'ye erişmesine yol açar. Nginx'te 256 MB video limiti ve temel yükleme/ithalat istek limitleri var, ancak kullanıcı bazında güvenli dosya izolasyonu ve kimlik doğrulama yok. Tanımadığın çok sayıda kişiyle paylaşılacak üretim sistemi olarak kullanılmamalı; Codespaces ücretsiz saat ve disk kotası tüketilir.

---

# LocateVideo

## Yeni kullanıcı akışı: Önce sadece videonu yükle

1. [LocateVideo](https://erenuss.github.io/Yaman-n-oyunlar-/locatevideo/) adresinden video veya ses dosyasını seç ve analiz izni ver.
2. Dosya mevcut Codespaces motoruna yüklenir; ses ayrıştırma ve Doppler geçiş tespiti **çekim tarihi, saat veya bölge sorulmadan** otomatik yapılır.
3. Kullanılabilir uçak sesi bulunmazsa sistem bir konum uydurmaz.
4. Uçak geçişi varsa tarih (UTC) ve olası şehir/bölge sorulur. **Tek geçişte ayrıca çekim başlangıç saati** gerekir. En az iki bağımsız geçiş bulunursa saat olmadan arama denenebilir.
5. MP4/MOV başlığında oluşturulma zamanı bulunursa tarih ve saat önerilir, ancak bu her zaman gerçek çekim zamanı değildir; doğrulamak gerekir. GPS metadata'sı otomatik konum cevabı olarak kullanılmaz.
6. Kullanıcı beş hazır şehirden birini seçebilir veya serbest şekilde başka şehir/semt yazabilir. Coğrafi bölge adını OpenStreetMap Nominatim üzerinden çözümleme yalnızca konum araması başlatıldığında yapılır.
7. Uçuş arşivini indirme onayından sonra olası konumlar hesaplanır. Bunlar **doğrulanmış GPS adresleri veya kalibre edilmiş olasılıklar değildir**.

Bu sürüm dünya çapında kör arama yapamaz; uçuşları eşleştirebilmek için gerçek çekim günü ve olası bölge gerekir. 40 saniyeyi aşan, net uçak sesi bulunan videolar mevcut dedektör için daha uygundur. Sunucu Codespaces durursa analiz çevrimdışı kalır.

Video ve ses dosyalarındaki uçak Doppler eğrilerini tarihsel ADS-B uçuşlarıyla eşleştiren deneysel araştırma uygulaması. Arayüz GitHub Pages'te (önizleme), gerçek fizik hesabı AeroDoppler (MIT) motorunda çalışır.

## EN KOLAY: GitHub Codespaces ile bulutta tek tıkla başlat

**[☁ GitHub'da uygulamayı başlat](https://codespaces.new/erenuss/Yaman-n-oyunlar-?devcontainer_path=.devcontainer%2Fdoppler-locate%2Fdevcontainer.json&quickstart=1)**

1. GitHub hesabınla giriş yap ve **Create codespace** seç.
2. Depodaki `.devcontainer/doppler-locate/devcontainer.json` yapılandırması otomatik olarak Docker motorunu başlatmaya çalışır. Hazır olduğunda **DOPPLER / LOCATE — Uygulama** (port **7070**) bağlantısını **Ports** sekmesinden **Open in Browser** ile aç. Otomatik açılabilir.
3. Açılan uygulamada video yükle ve analiz izni ver. Uçak sesi otomatik aranır; daha sonra yalnızca gerekli tarih, saat ve bölge bilgileri sorulur.
4. Çekim saati bilinmiyorsa en az **iki farklı uçak geçişi** gerekir. Arama alanını dar tut. Günlük uçuş arşivi **yaklaşık 3,5 GB** indirebilir ve hesaplama uzun sürebilir.
5. İşin bitince GitHub'da Codespace'i **Stop** yap. Free kişisel GitHub hesaplarında belirli ücretsiz Codespaces kullanım hakkı vardır; kota aşılırsa ücretli kullanımı sen ayrıca açmadıkça her koşulda ücretsiz kalacağı garantisi yok.

**Bu, 7/24 herkese açık sunucu değildir.** Codespace kendi hesabında çalışır ve özel port bağlantısı üzerinden açılır. Üçüncü kişilere video analiz erişimi vermez. 2-core/8GB en düşük seçenekte uzun veya büyük uçuş aramalarında bellek/süre yetersizliği yaşanabilir. Kullanım, veri indirme ve doğruluk başarımı henüz canlı olarak test edilmedi.

### Codespaces açıldı ama 7070 başlamadıysa

VS Code terminalinde:

```bash
cat /tmp/doppler-locate.log
cd doppler-locate && docker compose ps
cd doppler-locate && docker compose up -d
```

Docker imajını GitHub'ın yayınlanmış resmî AeroDoppler **v0.2.10** sürümünden indirir. İlk çalıştırmada imaj ve sonra günlük uçuş arşivi indirmeleri zaman alabilir. `docker compose logs -f` ile sunucu loglarını görüntüleyebilirsin.

## Bilgisayarda ücretsiz çalıştırma

Docker Desktop kuruluysa:

```bash
cd doppler-locate
docker compose up -d
```

Web arayüzü: http://127.0.0.1:7070. Gelişmiş AeroDoppler arayüzü: http://127.0.0.1:8000.

## GitHub Pages

[Statik arayüzü aç](https://erenuss.github.io/Yaman-n-oyunlar-/doppler-locate/)

Pages tek başına Python motoru çalıştıramaz. Burada yalnızca video ve ses önizlemesi ile tarayıcı ses frekans grafiği vardır. Gerçek analiz için Codespaces veya Docker içinden sunulan **7070 uygulamasını** kullan.

### Kısıtlar / dürüstlük
- Fizik eşleştirmesi olası konum hipotezleri üretir, kesin adres veya olasılık yüzdesi vermez.
- Göreli skorlar kalibre olasılık değildir. Özellikle tek uçak geçişinde önemli konum belirsizliği olabilir.
- Video dosyasının kendisi Codespace içerisine yüklenir, Google/GitHub Pages sunucusuna gönderilmez (Codespaces uygulamasında).
- Sadece sana ait veya sahibinin açık izni bulunan videoları analiz et.
- GitHub Pages'te ayrı bir uzak API bağlamak HTTPS, CORS ve sunucu kimlik doğrulaması ister. Korumasız API'yi internete açma.

Kaynak: [AeroDoppler (MIT)](https://github.com/leo-aa88/aerodoppler), uçuş kayıtları [ADSB.lol](https://www.adsb.lol/docs/open-data/historical).
