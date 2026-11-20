# Do Re Koş!

Sesinle yönettiğin bir koşu oyunu. Tarayıcıda, telefonda ve bilgisayarda çalışır.

- **Söyle** → Mırıl sesinin inceliğine göre yükselir (kalın = alçak, ince = yüksek).
- **Sus** → yere iner ve çatılarda koşar.
- **Notaları topla** → notalar bilinen ezgilerin şeklinde dizilidir; melodiyi söylersen bacalar ve neon tabelalar arasından kendiliğinden geçersin.
- Notayı tam tutturursan **Tam!** bonusu, seri yaptıkça çarpan (x4'e kadar).
- Çatı boşluklarının üstünde susarsan düşersin. Şarkıyı iyi bitirirsen +1 can.

## Tasarım

1. **Ses ayarı (gerçek Do zorunlu):** Önce ortam gürültüsü ölçülür. Rahat bir “Aaaa” ile sana uygun oktav bulunur ve **gerçek Do (C)** çalınır. Oyuncu aynısını söylemeden geçemez: kalın↔ince göstergesi ve “2 yarım ton daha kalın ↓ / çok az yükselt ↑ / Tam Do! Tut…” yönlendirmesiyle Do'ya getirilir; ±30 cent içinde 1.2 saniye tutunca baz tam C olur. Uzun süre olmazsa Do kendiliğinden tekrar çalınır; Do çok kalın/ince gelirse bir oktav değiştirilebilir. Hazır ayar kısayolu yoktur.
2. **Zorluk:** Kolay 5 nota (Do–Sol), Usta tam oktav (8 nota).
3. **Şarkılar:** Merdiven, Mary'nin Kuzusu, Neşeye Övgü, Jingle Bells, Daha Dün Annemizin, Tembel Çocuk, Gam Merdiveni (kamu malı ezgiler). Liste bitince daha hızlı yeni tur başlar.
4. **Engeller** hep melodi yolunun dışında üretilir: notayı bir sonrakine kadar tutan bir şarkıcı hiç çarpmaz.

## Ses → hareket uyumu

- Mikrofon sesi önce 70–1200 Hz bandına süzülür (uğultu ve tıslama perdeyi şaşırtmasın), sonra cihazda **YIN** algoritmasıyla perdesi bulunur. Ses hiçbir yere gönderilmez.
- Tek karelik oktav hataları elenir, küçük titreme yumuşatılır, gerçek nota değişimine anında uyulur. Hece aralarındaki kısa sessizlikte karakter düşmez.
- Notalar gerçek perdelerdir (Do = C, Re = D …); oyun sırasında baz kaymaz, isabet gerçek notaya göre ölçülür.
- Notaya yakın ses, karakteri o notanın çizgisine “mıknatıs” gibi oturtur. Mi–Fa gibi yarım ton aralıklar da aynı kolaylıkta.
- “Tam isabet” cent cinsinden ölçülür (±30 cent, ~150 ms ortalama), yani vibrato yapan cezalandırılmaz.
Mikrofonla oynarken karakter **yalnızca sesle** hareket eder; dokunma ve tuşlar kapalıdır. Mikrofon yoksa “Mikrofonsuz dene” ile ekrana dokunup parmağını kaydırarak ya da 1–8 tuşlarıyla oynanabilir. P / Esc: duraklat.

Mikrofon için sayfanın https üzerinden açılması gerekir (ör. GitHub Pages: `/do-re-kos/`).
