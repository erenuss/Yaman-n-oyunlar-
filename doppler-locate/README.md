# LocateVideo

[Fotoğraf veya video seçerek başla](https://erenuss.github.io/Yaman-n-oyunlar-/locatevideo/). Aynı arayüz GitHub Pages ve mevcut Docker kurulumunda çalışır.

| İpucu | Nasıl okunur | Haritada ne gösterilir? |
| --- | --- | --- |
| Dosyada kayıtlı GPS | Fotoğraf EXIF GPS, MP4/MOV konum atomları ve QuickTime ISO 6709 | Dosyaya yazılmış koordinat. Düzenlenmiş dosyalarda değişmiş olabilir. |
| Tabela ve yer adı | Tesseract Türkçe ve İngilizce metni okur. 31.826 yerleşimlik yerel GeoNames dizininde karşılık aranır. | Yerleşim merkezi. Aynı adlı birden çok yer varsa tek nokta işaretlenmez. |
| Tanınabilir yapı | MobileNet V3 görsel benzerliği ile 46 halka açık yerin 65 referans fotoğrafı karşılaştırılır. Daha geniş arama Google Landmarks V1 kıta modellerini kullanır. | Yapının konumu. Kameranın tam olarak durduğu yer farklı olabilir. |
| Uçak sesi | YAMNet cihazda kısa ses aralıklarını sınıflandırır. Kullanıcı isterse mevcut AeroDoppler sunucusunda geçiş tespiti ve tarihsel uçuş araması başlatılır. | Yalnızca kullanılabilir bir arşiv eşleşmesinde yaklaşık bölge. |

Video taraması dosyaya dağılmış en fazla beş kare seçer, birbirine çok benzeyen kareleri eler ve her görsel ipucunun videodaki zamanını gösterir. Dosya adını, dosya sisteminin tarihini, ziyaretçinin IP adresini veya konumunu tahmine katmaz. GPS ve görsel ipuçları farklı yerlere işaret ettiğinde arayüz ikisini de gösterir. GeoJSON dışa aktarımında her geometri kendi kanıt türünü taşır.

## Kullanım ve kapsam

- Fotoğraf, video veya ses seçilince analiz başlar. EXIF okunabilen HEIC görselleri desteklenir. Tarayıcı görüntüyü doğal olarak açamazsa HEIC dönüştürücü indirilir. Video oynatma ve sesi yerelde çözebilme, cihazın codec desteğine bağlıdır.
- Görüntüler, kareler ve OCR metni cihazda işlenir. JS, WASM ve yapay zekâ modelleri ihtiyaç oldukça indirilir. Harita kullanıcı açtığında OpenStreetMap'e istek yapar. Yerel listede bulunmayan tanınmış yapıların adları, harita koordinatı için Wikipedia'da aranabilir.
- Hızlı analiz bir yer bulamazsa geniş yapı taraması normal bağlantıda başlar. Veri tasarrufu bildiren bağlantılarda düğmeyle başlatılabilir. İlk tam tarama altı bölgesel model için toplam yaklaşık 260 MB indirebilir. İlk güçlü eşleşmede durur; kullanıcı da istediği zaman durdurabilir. Referans benzerliği ve model skorları konum olasılığı olarak sunulmaz.
- Uçak sesi sınıflandırması sesin duyulduğu yeri vermez. Yerel tarama belleği korumak için en fazla 55 MB dosyada, bilinen süre 10 dakikayı aşmıyorsa, kayda yayılmış en fazla 28 kısa aralığı inceler. Daha büyük dosya, 256 MB sunucu sınırı içinde motorla incelenebilir.
- Dosya yalnızca **İzin ver ve geçişleri ara** seçildiğinde seçili motor adresine yüklenir. Yeterli Doppler izi bulunursa UTC günü ve olası bölge gerekir. Tek geçiş ayrıca saat gerektirir. Zaman dilimi içeren çekim etiketi UTC'ye çevrilir. MP4 kapsayıcısının oluşturulma zamanı yalnızca bir öneridir. Arşiv indirme ayrı onay gerektirir ve sunucuda yaklaşık 3,5 GB kullanabilir. Sonuç yetersizse uygulama bir alan üretmez.
- Motorun genel portu paylaşımlı bir demodur. Kullanıcı hesabı, dosya izolasyonu veya otomatik silme garantisi yoktur. GPS, OCR ve yapı analizi Codespaces kapalıyken de çalışır; ilk model indirmeleri internet gerektirir.

## Motoru çalıştırma

[Mevcut Codespaces yapılandırmasıyla aç](https://codespaces.new/erenuss/Yaman-n-oyunlar-?devcontainer_path=.devcontainer%2Fdoppler-locate%2Fdevcontainer.json&quickstart=1). Pages, varsayılan olarak mevcut effective-garbanzo Codespace'inin 7070 portunu kullanır. Kendi kurulumun için **Nasıl çalışır? → Uçuş motoru bağlantısı** bölümünden adresi değiştirebilirsin. 7070 paylaşımda Public, gelişmiş motor portu 8000 Private kalmalıdır. Codespace durduğunda tarihsel uçuş eşleştirmesi durur.

```sh
cd doppler-locate
git pull --ff-only
docker compose up -d
```

Yerel arayüz http://127.0.0.1:7070 adresinde, mevcut gelişmiş motor http://127.0.0.1:8000 adresindedir. GitHub Pages arayüzünü kullanmak için kendi bilgisayarında kurulum gerekmez.

## Kaynaklar

- [GeoNames cities15000](https://download.geonames.org/export/dump/), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Yerleşim adları, ülke, yuvarlanmış merkez koordinatları ve nüfus kullanılır. Bazı semt sınıfları çıkarılmış ve bazı alternatif adlar eklenmiştir.
- Hızlı görsel dizinindeki her referansın özgün Wikimedia dosya adı ve yapı adı [landmarks.json](./assets/landmarks.json) dosyasındadır. Fotoğraflar yeniden dağıtılmaz. Dizin fotoğraflardan çıkarılmış nicemlenmiş MobileNet V3 vektörlerini ve referans yerlerini içerir. Eşleşen sonuç özgün fotoğraf sayfasına bağlantı verir.
- [MediaPipe Image Embedder](https://ai.google.dev/edge/mediapipe/solutions/vision/image_embedder), [Google Landmarks V1 modelleri](https://www.kaggle.com/models/google/landmarks), [YAMNet](https://github.com/tensorflow/models/tree/master/research/audioset/yamnet), [Tesseract.js](https://github.com/naptha/tesseract.js), [exifr](https://github.com/MikeKovarik/exifr) ve [heic-to](https://github.com/hoppergee/heic-to). Bölgesel modellerin sabit sürüm kopyası [buradadır](https://github.com/puzzleleaf/flutter_tflite_landmark_classifier/tree/ed97ba40e61458e1f0309e8bc5c488866e5e68d0/assets/models).
- [AeroDoppler](https://github.com/leo-aa88/aerodoppler), [ADSB.lol arşivi](https://www.adsb.lol/docs/open-data/historical/), [OpenStreetMap](https://www.openstreetmap.org/copyright).
