# LocateVideo

Video ve ses dosyalarındaki uçak Doppler eğrilerini tarihsel ADS-B uçuşlarıyla eşleştiren deneysel araştırma uygulaması. Arayüz GitHub Pages'te (önizleme), gerçek fizik hesabı AeroDoppler (MIT) motorunda çalışır.

## EN KOLAY: GitHub Codespaces ile bulutta tek tıkla başlat

**[☁ GitHub'da uygulamayı başlat](https://codespaces.new/erenuss/Yaman-n-oyunlar-?devcontainer_path=.devcontainer%2Fdoppler-locate%2Fdevcontainer.json&quickstart=1)**

1. GitHub hesabınla giriş yap ve **Create codespace** seç.
2. Depodaki `.devcontainer/doppler-locate/devcontainer.json` yapılandırması otomatik olarak Docker motorunu başlatmaya çalışır. Hazır olduğunda **DOPPLER / LOCATE — Uygulama** (port **7070**) bağlantısını **Ports** sekmesinden **Open in Browser** ile aç. Otomatik açılabilir.
3. Açılan uygulamada video yükle, gerçek **UTC çekim tarihini** seç, onayları ver ve **Konum eşleştirmesini başlat** seç.
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
