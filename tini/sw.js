// Tını önbelleği: ilk açılıştan sonra uygulama, el takibi modeli ve yazı tipleri cihazda saklanır.
const C='tini-v1';
const CORE=['./','index.html','style.css','app.js'];
const HEAVY=/(^|\.)cdn\.jsdelivr\.net$|(^|\.)storage\.googleapis\.com$|(^|\.)fonts\.googleapis\.com$|(^|\.)fonts\.gstatic\.com$/;
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('tini-')&&k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const req=e.request;if(req.method!=='GET')return;const u=new URL(req.url);
  // büyük dosyalar (model, kütüphane, yazı tipi): önce önbellek
  if(HEAVY.test(u.hostname)){e.respondWith(caches.open(C).then(async c=>{const hit=await c.match(req);if(hit)return hit;const r=await fetch(req);if(r.ok||r.type==='opaque')c.put(req,r.clone());return r}));return}
  // uygulamanın kendi dosyaları: önce ağ (güncel kalsın), yavaşsa 2.5 sn sonra önbellek
  if(u.origin===location.origin){e.respondWith(caches.open(C).then(async c=>{const hit=await c.match(req);
    const net=fetch(req).then(r=>{if(r.ok)c.put(req,r.clone());return r}).catch(()=>hit||Response.error());
    if(!hit)return net;return Promise.race([net,new Promise(res=>setTimeout(()=>res(hit),2500))])}))}
});
