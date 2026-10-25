# Penaltı Club — GitHub Pages paketi

Bu klasör doğrudan GitHub Pages'te yayımlanabilir. Derleme, Node.js kurulumu veya sunucu gerekmez.

## Yayımlama

1. GitHub'da yeni bir herkese açık depo oluştur veya kullanacağın depoyu aç.
2. ZIP dosyasını bilgisayarında çıkar. Bu klasördeki `index.html`, `style.css`, `data.js`, `engine.js`, `app.js` ve `.nojekyll` dosyalarını deponun köküne yükle. ZIP dosyasını tek başına yüklemek oyunu yayımlamaz.
3. **Settings → Pages → Build and deployment → Source** alanında **Deploy from a branch** seç.
4. **main** dalını ve **/(root)** klasörünü seçip **Save** düğmesine bas.
5. Yayın tamamlanınca Pages ekranındaki **Visit site** bağlantısını aç.

Mevcut bir oyun deposuna eklemek için dosyaları `penalti/` alt klasörüne koyabilirsin. Bu durumda adresin sonuna `/penalti/` eklenir; kökteki mevcut oyun korunur.

Resmî yardım:
https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Son sürümde

- Sol tıklama veya dokunma nişanı sabitler. Başka bir noktaya tekrar tıklayarak hedef değiştirilebilir.
- İsim ve cinsiyet seçimi; penaltılar, takım kadrosu, transferler, sanal bakiye, kariyer ve kayıt sistemi.
- Yaman adı büyük/küçük harften bağımsız tanınır: oyundaki en yüksek reytingli 11 oyuncu ve 55.555.555 başlangıç bakiyesi.
- Diğer isimlerde 500.000 başlangıç bakiyesi.
- Kayıtlar cihazdaki tarayıcıda tutulur. Başka bir site adresine geçince eski kayıt otomatik taşınmaz. Eski oyunda Veri bilgisi → Kaydımı indir, yeni oyunda Veri bilgisi → Kaydı geri yükle yolunu kullanabilirsin.
- Çevrim içi çok oyunculu mod veya sunucuda hesap sistemi yoktur.

## Verilerin kapsamı

25 Ekim 2026 tarihli kaynak görüntüsü: ESPN'de aktif listelenen 19.228 oyuncu, 583 kulüp, 34 lig. Tüm dünya kulüpleri ve hatasız güncel kadrolar iddia edilmez; veri canlı senkronize olmaz.

15 seçili FC Mobile kartının OVR ve altı temel puanı RenderZ kaynaklıdır. Diğer kartlar açıkça etiketlenmiş oyun değerleridir. Seçili kartların sürümü, rütbe ve antrenman bilgileri oyun içindeki kart ayrıntılarında yazılıdır. Fiyatlar ve bakiye tamamen kurgusal oyun parasıdır. Oyuncu görselleri temsili çizimlerdir.

Kaynaklar: https://www.espn.com/soccer/ ve https://renderz.app/players

Bağımsız bir oyundur; EA SPORTS ile bağlantılı değildir.
