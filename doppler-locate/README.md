# DOPPLER / LOCATE (GitHub Pages + yerel analiz motoru)

Bu dizindeki `index.html`, `style.css` ve `app.js` GitHub Pages'te çalışır. Tarayıcıda dosya önizlemesi ve canlı frekans spektrumu kullanılabilir. **GitHub Pages, Python / FFmpeg / 3,5 GB günlük ADS-B arşivi çalıştıramaz.** Doğrulanmış bir kamuya açık sunucu bağlı değildir. Konum adayları ancak AeroDoppler sunucusu ayrı çalıştırıldığında üretilebilir.

## Tam uygulamayı bilgisayarda çalıştır

Docker Desktop kurulu olmalı. Reponun bu `doppler-locate` klasörüne gir:

```bash
docker compose up --build -d
```

Ardından **http://127.0.0.1:7070** adresini aç. Web arayüzü ve API burada aynı alan adında çalışır; CORS ayarı gerektirmez. AeroDoppler gelişmiş arayüzü http://127.0.0.1:8000.

## Akış

1. Kendi videonu yükle ve doğru **UTC çekim gününü** belirt.
2. Saat kesin biliniyorsa UTC başlangıcını gir; saat bilinmiyorsa **iki bağımsız uçak geçişi** gerekir.
3. Arama alanını seç ve ~3,5 GB'lık tarihsel ADS-B günlük arşiv indirmesini onayla.
4. Sistem otomatik frekans eğrisi tespiti, uçuş yolu eşleştirmesi ve aday koordinat haritası gösterir.

Kaynaklar: [AeroDoppler](https://github.com/leo-aa88/aerodoppler) (MIT), ADSB.lol (uçuş verisi). Sonuçlar bilimsel hipotezlerdir; yüzde olasılık veya doğrulanmış GPS koordinatları değildir. Yalnızca kendinize ait veya açık izin verilmiş kayıtları analiz edin.

## Güvenlik
Sunucu **yalnızca 127.0.0.1**'de dinler. Arayüzü İnternete açmak için kullanıcı kimlik doğrulaması, HTTPS, dosya sınırları, CORS güvenlik kuralları ve kaynak sınırları gerekir. Üçüncü kişilerin kayıtlarını izinsiz konumlandırmak için kullanmayın.

GitHub Pages sayfası: https://erenuss.github.io/Yaman-n-oyunlar-/doppler-locate/ (Pages ayarları açıksa yayına girer).
