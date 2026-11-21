import { mediaKind, readMetadata, getFrames } from './lib/media.js';
import {
  getIndex,
  readPlaceNames,
  nearest,
  distance,
  country,
  landmarkPlace,
  fold,
} from './lib/places.js';
import {
  readText,
  matchGallery,
  wideLandmarks,
  regionOrder,
  aircraftSound,
} from './lib/recognition.js';
import { initFlight, resetFlight, updateFlightHints } from './lib/flights.js';

const $ = (id) => document.getElementById(id);
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};
let current = null;
function timeLabel(seconds) {
  if (seconds == null) return 'Fotoğraf';
  const s = Math.floor(seconds);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
function set(s, id, text) {
  if (current === s) $(id).textContent = text;
}
function link(label, url) {
  const a = el('a', label);
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}
function showMap(p, zoom) {
  const dy = zoom >= 15 ? 0.007 : zoom >= 11 ? 0.11 : 0.18,
    dx = dy / Math.max(0.15, Math.cos((p.lat * Math.PI) / 180));
  const bbox = [
    p.west ?? Math.max(-180, p.lon - dx),
    p.south ?? Math.max(-85, p.lat - dy),
    p.east ?? Math.min(180, p.lon + dx),
    p.north ?? Math.min(85, p.lat + dy),
  ];
  const params = new URLSearchParams({ bbox: bbox.join(','), layer: 'mapnik' });
  if (!('west' in p)) params.set('marker', p.lat + ',' + p.lon);
  $('map').src = 'https://www.openstreetmap.org/export/embed.html?' + params;
  $('map-wrap').hidden = false;
}
function card(name, kind, message, p, zoom = 14) {
  const article = el('article', null, 'candidate');
  article.append(el('p', kind, 'evidence'), el('h3', name), el('p', message));
  if (Number.isFinite(p?.lat) && Number.isFinite(p?.lon)) {
    const button = el('button', 'Haritayı göster', 'text-btn');
    button.type = 'button';
    button.onclick = () => showMap(p, zoom);
    const url =
      'https://www.openstreetmap.org/' +
      ('west' in p ? '' : '?mlat=' + p.lat + '&mlon=' + p.lon) +
      '#map=' +
      zoom +
      '/' +
      p.lat +
      '/' +
      p.lon;
    article.append(button, link('Haritada aç', url));
  }
  return article;
}
function appendLandmarks(s, matches) {
  for (const candidate of matches) {
    const existing = s.landmarks.find((x) => fold(x.name) === fold(candidate.name));
    if (existing) {
      if (!existing.times.includes(candidate.time)) existing.times.push(candidate.time);
      continue;
    }
    s.landmarks.push({ ...candidate, times: [candidate.time] });
  }
}
function render(s) {
  if (current !== s) return;
  const gps = s.meta?.gps,
    marks = s.landmarks,
    places = s.places,
    areas = s.flightAreas,
    items = [];
  let title = 'Kayıt inceleniyor',
    summary = 'Bir ipucu bulunduğunda burada görünecek.';
  if (gps) {
    const name = s.near ? s.near.name + ', ' + country(s.near.code) : 'Dosyadaki GPS koordinatı';
    title = 'Dosyada çekim koordinatı var';
    summary =
      'Bu nokta medyanın konum etiketinden okundu. Etiket, dosya düzenlenirken değişmiş olabilir.';
    items.push(
      card(
        name,
        s.meta.source,
        gps.lat.toFixed(6) +
          ', ' +
          gps.lon.toFixed(6) +
          (s.near
            ? ' · Dizindeki en yakın yerleşim merkezine ' + s.near.km.toFixed(1) + ' km.'
            : ''),
        gps,
        16,
      ),
    );
  } else if (marks.length) {
    title = marks.length === 1 ? marks[0].name : 'Görüntüde birden fazla yer tanındı';
    summary = 'Harita tanınan yapının yerini gösterir. Çekim noktası yapıdan uzakta olabilir.';
  } else if (places.length) {
    title =
      places.length === 1 && !places[0].ambiguous
        ? 'Olası şehir: ' + places[0].name
        : 'Görüntüde yer adı bulundu';
    summary =
      'Adaylar görüntüde okunan yazılara dayanıyor. Tabela başka bir yeri de işaret edebilir.';
  } else if (areas.length) {
    title = 'Uçuş kayıtlarıyla uyumlu bölge bulundu';
    summary = 'Sonuç, seçilen tarih ve arama bölgesi için bir tahmindir.';
  } else if (s.done) {
    title = 'Konum belirlenemedi';
    summary =
      s.kind === 'audio'
        ? 'Tek başına ses kaydından çekim yeri çıkarılamadı. Aşağıda uçuş arşiviyle karşılaştırmayı deneyebilirsin.'
        : 'İncelenen ipuçları bir yer önermek için yetersiz. Her yöntemin sonucu aşağıda.';
  }
  for (const m of marks) {
    const where = [m.name, m.city].filter(Boolean).join(' · ');
    const article = card(
      where,
      m.method,
      m.times.map(timeLabel).join(', ') +
        ' · Görüntüdeki yapı.' +
        (m.lat == null ? ' Harita konumu doğrulanamadı.' : ''),
      m,
      15,
    );
    if (m.photo)
      article.append(
        link(
          'Referans fotoğraf',
          'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(m.photo),
        ),
      );
    items.push(article);
  }
  for (const place of places) {
    const name = place.ambiguous ? place.name : place.name + ', ' + country(place.code);
    const detail =
      timeLabel(place.time) +
      ' · “' +
      place.line +
      '”' +
      (place.ambiguous
        ? ' · Aynı adlı yerler var: ' + [...new Set(place.alternatives)].join(' / ') + '.'
        : ' · Harita şehir merkezini gösterir.');
    items.push(card(name, 'Okunan yer adı', detail, place.ambiguous ? null : place, 11));
  }
  for (const a of areas)
    items.push(
      card(
        a.name,
        'Tarihsel uçuş eşleşmesi',
        'Arama bölgesinde sesle uyumlu yaklaşık alan.',
        a,
        10,
      ),
    );
  const supported = marks.find(
    (m) => Number.isFinite(m.lat) && places.some((p) => !p.ambiguous && distance(m, p) <= 25),
  );
  if (!gps && supported) summary += ' Görüntüde okunan yer adı da bu bölgeyle uyumlu.';
  $('export').hidden = !(
    gps ||
    marks.some((m) => Number.isFinite(m.lat)) ||
    places.some((p) => !p.ambiguous) ||
    areas.length
  );
  $('verdict').textContent = title;
  $('verdict-note').textContent = summary;
  $('candidates').replaceChildren(...items);
  const disagree = (a, b, limit) =>
    Number.isFinite(a?.lat) && Number.isFinite(b?.lat) && distance(a, b) > limit;
  const conflict =
    marks.some(
      (m) => disagree(m, gps, 35) || places.some((p) => !p.ambiguous && disagree(m, p, 75)),
    ) || places.some((p) => !p.ambiguous && disagree(p, gps, 75));
  $('conflict').hidden = !conflict;
  if (conflict)
    $('conflict').textContent =
      'İpuçları farklı yerleri gösteriyor. Kayıt etiketi, görünen yapı ve tabeladaki yer ayrı ayrı gösterildi.';
  updateFlightHints(s);
}
async function metadata(s) {
  try {
    s.meta = await readMetadata(s.file, s.kind);
    if (current !== s) return;
    if (s.meta.gps) {
      set(s, 'meta-status', s.meta.source + ' etiketi bulundu.');
      render(s);
      const index = await getIndex().catch(() => null);
      if (index) s.near = nearest(s.meta.gps, index);
    } else set(s, 'meta-status', 'Desteklenen çekim konumu etiketi bulunamadı.');
  } catch {
    set(s, 'meta-status', 'Konum etiketi okunamadı.');
  }
  render(s);
}

async function ocr(s, frames) {
  try {
    const [lines, idx] = await Promise.all([
      readText(frames, s.signal, (n, total) =>
        set(s, 'text-status', 'Yazılar okunuyor · ' + n + '/' + total),
      ),
      getIndex(),
    ]);
    if (current !== s) return;
    s.places = readPlaceNames(lines, idx);
    set(
      s,
      'text-status',
      s.places.length
        ? s.places.length + ' yer adı adayı bulundu.'
        : lines.length
          ? 'Yazılar okundu. Dizinde yeterli bir yer adı eşleşmedi.'
          : 'Okunabilir yazı bulunamadı.',
    );
    const seen = new Set(),
      list = [];
    for (const l of lines) {
      const key = fold(l.text);
      if (!seen.has(key)) {
        seen.add(key);
        list.push(el('li', timeLabel(l.time) + ' · ' + l.text));
      }
    }
    $('ocr-lines').replaceChildren(...list.slice(0, 25));
    $('ocr-detail').hidden = list.length === 0;
    render(s);
  } catch {
    set(
      s,
      'text-status',
      'Yazı okuma tamamlanamadı. Model bağlantısını ve tarayıcı desteğini kontrol et.',
    );
  }
}
async function visual(s, frames) {
  set(s, 'vision-status', 'Referans fotoğraflarla karşılaştırılıyor…');
  try {
    const matches = await matchGallery(frames, s.signal);
    if (current !== s) return;
    appendLandmarks(s, matches);
    s.galleryStatus = matches.length
      ? 'Referans fotoğrafla görsel eşleşme bulundu.'
      : 'Referans fotoğraflarda güçlü eşleşme bulunamadı.';
  } catch {
    s.galleryStatus = 'Referans modeli bu cihazda çalıştırılamadı.';
  }
  set(s, 'vision-status', s.galleryStatus);
  render(s);
}
async function sound(s) {
  try {
    const media = $('player').querySelector('audio,video');
    const data = await aircraftSound(s.file, media?.duration, s.signal);
    if (current !== s) return;
    if (data.skipped)
      set(
        s,
        'sound-status',
        'Dosya cihazda ses taraması için büyük. İstersen uçuş motorunu kullanabilirsin.',
      );
    else if (data.unsupported)
      set(
        s,
        'sound-status',
        'Tarayıcı ses kanalını açamadı. Uçuş motoru kaydı ayrıca inceleyebilir.',
      );
    else if (data.silent) set(s, 'sound-status', 'Örneklenen ses aralıkları sessiz.');
    else if (data.hits.length)
      set(
        s,
        'sound-status',
        'Uçak sesine benzeyen anlar: ' +
          data.hits.slice(0, 5).map(timeLabel).join(', ') +
          '. Bu ses tek başına bir yer belirtmez.',
      );
    else set(s, 'sound-status', 'Örneklenen aralıklarda belirgin uçak sesi tanınmadı.');
  } catch {
    set(
      s,
      'sound-status',
      'Cihazdaki ses analizi tamamlanamadı. Uçuş motoru ayrıca kullanılabilir.',
    );
  }
}
async function runWide(s) {
  if (current !== s || s.wideCtrl || !s.frames?.length) return;
  $('wide').hidden = true;
  $('stop-wide').hidden = false;
  $('wide-note').hidden = false;
  $('wide-note').textContent =
    'Bölgesel yapı modelleri sırayla indirilir. Altı model ilk kullanımda toplam yaklaşık 260 MB kullanabilir.';
  const ctrl = new AbortController();
  s.wideCtrl = ctrl;
  const abort = () => ctrl.abort();
  s.signal.addEventListener('abort', abort, { once: true });
  try {
    const order = regionOrder(s.near?.code || s.places.find((p) => !p.ambiguous)?.code);
    const outcome = await wideLandmarks(
      s.frames,
      order,
      ctrl.signal,
      (name) => set(s, 'vision-status', 'Geniş yapı taraması · ' + name),
      async (hits) => {
        for (const label of new Set(hits.map((h) => h.label))) {
          const t = new AbortController(),
            timer = setTimeout(() => t.abort(), 6000);
          const stop = () => t.abort();
          ctrl.signal.addEventListener('abort', stop, { once: true });
          let place;
          try {
            place = await landmarkPlace(label, t.signal);
          } catch {
          } finally {
            clearTimeout(timer);
            ctrl.signal.removeEventListener('abort', stop);
          }
          if (ctrl.signal.aborted || current !== s) return;
          appendLandmarks(
            s,
            hits
              .filter((h) => h.label === label)
              .map((h) => ({ name: label, ...place, time: h.time, method: 'Görsel yapı modeli' })),
          );
        }
      },
    );
    if (current !== s) return;
    set(
      s,
      'vision-status',
      outcome.matched
        ? 'Görsel model bir yapı tanıdı.'
        : outcome.completed +
            ' kıta grubu incelendi. Güçlü bir yapı eşleşmesi bulunamadı.' +
            (outcome.failed ? ' Bazı modeller çalıştırılamadı.' : ''),
    );
    $('wide').hidden = !outcome.failed;
  } catch {
    if (current !== s) return;
    set(
      s,
      'vision-status',
      ctrl.signal.aborted
        ? 'Geniş tarama durduruldu. ' + s.galleryStatus
        : 'Geniş tarama bu cihazda tamamlanamadı.',
    );
    $('wide').hidden = false;
  } finally {
    s.signal.removeEventListener('abort', abort);
    s.wideCtrl = null;
    if (current === s) {
      $('stop-wide').hidden = true;
      $('wide-note').hidden = $('wide').hidden;
      s.done = true;
      render(s);
    }
  }
}
async function analyze(s) {
  const meta = metadata(s);
  if (s.kind !== 'image') void sound(s);
  if (s.kind === 'audio') {
    await meta;
    s.done = true;
    render(s);
    return;
  }
  try {
    const frames = await getFrames(s.kind, s.url, s.signal, s.file);
    if (current !== s) return;
    s.frames = frames.filter((f) => !f.flat);
    if (s.kind === 'image' && !$('player').querySelector('img')?.naturalWidth && frames[0]) {
      const image = el('img');
      image.alt = 'Seçilen fotoğraf';
      image.src = frames[0].canvas.toDataURL('image/jpeg', 0.8);
      $('player').replaceChildren(image);
    }
    set(
      s,
      'file-info',
      s.sizeLabel + (s.kind === 'video' ? ' · ' + frames.length + ' farklı kare örneklendi.' : ''),
    );
    if (!s.frames.length) {
      set(s, 'text-status', 'Örneklenen görüntü düz renkli veya karanlık.');
      set(s, 'vision-status', 'Ayırt edilebilir görüntü ayrıntısı yok.');
    } else {
      await Promise.allSettled([ocr(s, s.frames), visual(s, s.frames), meta]);
      if (current !== s) return;
      const connection = navigator.connection;
      const metered =
        connection?.saveData ||
        connection?.type === 'cellular' ||
        ['2g', 'slow-2g', '3g'].includes(connection?.effectiveType);
      if (!s.landmarks.length) {
        $('wide').hidden = false;
        $('wide-note').hidden = false;
        $('wide-note').textContent =
          'Geniş yapı taraması ilk kullanımda en fazla yaklaşık 260 MB model indirebilir.';
        if (!metered && !s.meta?.gps && !s.places.some((p) => !p.ambiguous)) {
          await runWide(s);
        }
      }
    }
  } catch {
    set(s, 'vision-status', 'Tarayıcı bu dosyanın görüntüsünü açamadı.');
    set(s, 'text-status', 'Görüntü açılamadığı için yazılar okunamadı.');
  }
  await meta;
  s.done = true;
  render(s);
}
function useFile(file) {
  if (!file) return;
  const kind = mediaKind(file);
  if (!kind || !file.size) {
    $('file-error').hidden = false;
    $('file-error').textContent = !file.size
      ? 'Dosya boş. Başka bir kayıt seç.'
      : 'Bir fotoğraf, video veya ses dosyası seç.';
    return;
  }
  $('file-error').hidden = true;
  if (current) {
    current.ctrl.abort();
    URL.revokeObjectURL(current.url);
  }
  const ctrl = new AbortController();
  const s = {
    file,
    kind,
    ctrl,
    signal: ctrl.signal,
    meta: null,
    places: [],
    landmarks: [],
    flightAreas: [],
    done: false,
    url: URL.createObjectURL(file),
    sizeLabel: (file.size / 1048576).toLocaleString('tr', { maximumFractionDigits: 1 }) + ' MB',
  };
  current = s;
  s.changed = () => render(s);
  $('workbench').classList.add('active');
  $('preview').hidden = false;
  $('report').hidden = false;
  $('pick-title').textContent = 'Başka bir kayıt incele';
  $('pick-button').textContent = 'Dosyayı değiştir';
  $('pick-hint').textContent = '';
  $('file-name').textContent = file.name;
  $('file-info').textContent = s.sizeLabel;
  const media = el(kind === 'image' ? 'img' : kind);
  media.src = s.url;
  if (kind === 'image') media.alt = 'Seçilen fotoğraf';
  else {
    media.controls = true;
    media.preload = 'metadata';
    media.playsInline = true;
  }
  $('player').replaceChildren(media);
  $('map-wrap').hidden = true;
  $('map').removeAttribute('src');
  for (const k of ['wide', 'stop-wide', 'wide-note', 'ocr-detail', 'conflict']) $(k).hidden = true;
  for (const k of ['text-row', 'vision-row']) $(k).hidden = kind === 'audio';
  $('sound-row').hidden = kind === 'image';
  $('meta-status').textContent = 'Dosya okunuyor…';
  $('text-status').textContent = 'Görüntü hazırlanıyor…';
  $('vision-status').textContent = 'Görüntü hazırlanıyor…';
  $('sound-status').textContent = 'Ses kanalı inceleniyor…';
  resetFlight(s);
  render(s);
  void analyze(s);
}
initFlight();
$('file').addEventListener('change', (e) => {
  useFile(e.target.files?.[0]);
  e.target.value = '';
});
const drop = $('drop-zone');
for (const event of ['dragover', 'drop']) drop.addEventListener(event, (e) => e.preventDefault());
drop.addEventListener('dragover', () => drop.classList.add('drag'));
drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
drop.addEventListener('drop', (e) => {
  drop.classList.remove('drag');
  useFile(e.dataTransfer.files?.[0]);
});
$('wide').addEventListener('click', () => runWide(current));
$('stop-wide').addEventListener('click', () => current?.wideCtrl?.abort());

$('export').addEventListener('click', () => {
  const s = current;
  if (!s) return;
  const features = [];
  function point(p, kind, name, source) {
    if (Number.isFinite(p?.lat) && Number.isFinite(p?.lon))
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
        properties: { kind, name, source },
      });
  }
  point(s.meta?.gps, 'embedded_gps', 'Dosyadaki çekim etiketi', s.meta?.source);
  for (const m of s.landmarks) point(m, 'landmark', m.name, m.method);
  for (const p of s.places) if (!p.ambiguous) point(p, 'city_center', p.name, 'OCR');
  for (const a of s.flightAreas)
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [a.west, a.south],
            [a.east, a.south],
            [a.east, a.north],
            [a.west, a.north],
            [a.west, a.south],
          ],
        ],
      },
      properties: { kind: 'acoustic_area', name: a.name, source: 'AeroDoppler' },
    });
  const url = URL.createObjectURL(
    new Blob([JSON.stringify({ type: 'FeatureCollection', features }, null, 2)], {
      type: 'application/geo+json',
    }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = 'locatevideo-sonuclar.geojson';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
