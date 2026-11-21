import { country, fold, nearest, getIndex } from './places.js';

const $ = (id) => document.getElementById(id);
const defaultEngine = 'https://effective-garbanzo-xjv9wp7g6w9264vp-7070.app.github.dev';
const cities = {
  istanbul: [28.7, 40.78, 29.48, 41.28],
  ankara: [32.55, 39.7, 33.18, 40.17],
  izmir: [26.77, 38.18, 27.48, 38.67],
  manisa: [27.15, 38.35, 28.75, 39.05],
  antalya: [30.4, 36.71, 31.2, 37.19],
};
let current = null;
function engine() {
  const value = $('api-url').value.trim();
  const url = new URL(value || location.origin);
  if (
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error('Geçerli bir HTTPS motor adresi gir.');
  return url.href.replace(/\/$/, '');
}
function reason(value) {
  const text = value?.detail?.message || value?.error?.message || value?.detail || value?.message;
  return typeof text === 'string' ? text : 'Motor isteği tamamlayamadı.';
}
async function request(root, path, signal, options = {}) {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timer = setTimeout(abort, options.body instanceof FormData ? 240000 : 25000);
  try {
    const response = await fetch(root + path, {
      ...options,
      credentials: 'omit',
      cache: 'no-store',
      signal: ctrl.signal,
    });
    const data = await response.json().catch(() => null);
    if (path === '/health' && (!response.ok || data?.status !== 'ok')) {
      throw Error(
        'Uçuş motoruna ulaşılamadı. Mevcut Codespace açık ve 7070 portu erişilebilir olunca tekrar deneyebilirsin.',
      );
    }
    if (!response.ok || !data) throw Error(reason(data) + ' (HTTP ' + response.status + ').');
    return data;
  } catch (e) {
    if (signal?.aborted) throw e;
    if (e instanceof TypeError || e.name === 'AbortError')
      throw Error('Uçuş motoruna ulaşılamadı. Codespace açıkken tekrar deneyebilirsin.');
    throw e;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
function post(s, path, body) {
  return request(s.flightRoot, path, s.signal, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function say(s, message) {
  if (current === s) $('flight-status').textContent = message;
}
async function waitJob(s, data, label) {
  const id = data.job_id || data.job?.job_id || data.id;
  if (!id) return data;
  const deadline = Date.now() + 5 * 3600000;
  while (!s.signal.aborted && Date.now() < deadline) {
    const job = await request(s.flightRoot, '/api/jobs/' + encodeURIComponent(id), s.signal);
    if (['succeeded', 'abstained'].includes(job.status)) return job;
    if (['failed', 'cancelled', 'interrupted'].includes(job.status)) throw Error(reason(job));
    say(s, label + ' · ' + (job.progress?.message || job.stage || 'İşleniyor…'));
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
  throw Error('İş takibi sona erdi.');
}
function setClock() {
  const known = $('clock-type').value === 'known';
  $('clock-fields').hidden = !known;
  $('clock').required = known;
}
export function updateFlightHints(s) {
  if (current !== s || $('flight-form').hidden) return;
  const time = s.meta?.captureTime || s.meta?.containerTime;
  if (time && !s.editedTime && !$('day').value) {
    $('day').value = time.slice(0, 10);
    $('clock').value = time.slice(11, 19);
    if (s.meta.captureTime) $('clock-type').value = 'known';
    $('time-hint').textContent = s.meta.captureTime
      ? 'Saat dilimi içeren çekim etiketi UTC’ye çevrildi.'
      : 'Dosyanın oluşturulma zamanı önerildi. Düzenlenmiş kayıtta çekimden farklı olabilir.';
    setClock();
  }
  const suggestion =
    s.near?.name ||
    s.landmarks?.find((x) => x.city)?.city ||
    s.places?.find((x) => !x.ambiguous)?.name;
  if (suggestion && !s.editedRegion && !$('region').value) {
    $('region').value = suggestion;
    $('region-hint').textContent =
      'Kayıttaki ipucundan önerildi. Uçuş aramasını sınırlayan bu bölgeyi kontrol et.';
  }
}
export function resetFlight(s) {
  current = s;
  $('flight-panel').hidden = s.kind === 'image';
  $('flight-form').reset();
  $('flight-form').hidden = true;
  $('flight-results').hidden = true;
  $('flight-results').replaceChildren();
  $('flight-status').textContent = '';
  $('clock-type').disabled = false;
  setClock();
  $('time-hint').textContent = 'Saat biliniyorsa UTC olarak gir.';
  $('region-hint').textContent =
    'Biliyorsan yaz. Motor bu bölgenin geçmiş uçuş kayıtlarında arama yapar.';
  $('inspect-air').disabled = false;
  $('inspect-air').hidden = false;
  $('locate').disabled = false;
  if (s.file.size > 256 * 1024 * 1024) {
    $('inspect-air').disabled = true;
    say(s, 'Uçuş motoru en fazla 256 MB kabul ediyor.');
  }
}
async function inspect() {
  const s = current;
  if (!s || s.kind === 'image') return;
  $('inspect-air').disabled = true;
  try {
    const root = engine();
    if (s.flightRoot && s.flightRoot !== root) s.recording = null;
    s.flightRoot = root;
    say(s, 'Uçuş motoruna bağlanılıyor…');
    const h = await request(s.flightRoot, '/health', s.signal);
    if (h.status !== 'ok') throw Error('Uçuş motoru hazır değil.');
    const form = new FormData();
    form.append('file', s.file, s.file.name);
    form.append('owner_permission_confirmed', 'true');
    if (!s.recording) {
      say(s, 'Kayıt gönderiliyor ve ses kanalı ayrılıyor…');
      const job = await request(s.flightRoot, '/api/recordings', s.signal, {
        method: 'POST',
        body: form,
      });
      const done = job.recording || (await waitJob(s, job, 'Ses kanalı ayrılıyor'));
      s.recording =
        job.recording?.id || job.recording_id || done.result?.recording_id || done.recording_id;
      if (!s.recording) throw Error('Ses kaydı işlenemedi.');
    }
    const rec = '/api/recordings/' + encodeURIComponent(s.recording);
    say(s, 'Kayıtta Doppler izi aranıyor…');
    await waitJob(s, await post(s, rec + '/events/detect', { save: true }), 'Geçişler inceleniyor');
    const data = await request(s.flightRoot, rec + '/events', s.signal);
    if (current !== s) return;
    const plausible = (data.events || []).filter((e) =>
      ['plausible_doppler', 'weak_doppler'].includes(e.assessment?.label),
    );
    const events = [];
    for (const e of plausible.sort(
      (a, b) => (b.detection_quality || 0) - (a.detection_quality || 0),
    )) {
      const mid = (e.audio_start_s + e.audio_end_s) / 2;
      if (!events.some((x) => Math.abs(mid - (x.audio_start_s + x.audio_end_s) / 2) < 45))
        events.push(e);
    }
    s.events = events.slice(0, 8);
    $('inspect-air').hidden = true;
    if (!s.events.length) {
      say(s, 'Bu kayıtta uçuşlarla karşılaştırılabilecek bir Doppler izi bulunamadı.');
      return;
    }
    $('flight-form').hidden = false;
    if (s.events.length === 1) {
      $('clock-type').value = 'known';
      $('clock-type').disabled = true;
    }
    setClock();
    updateFlightHints(s);
    say(s, s.events.length + ' olası geçiş bulundu.');
    $('flight-why').textContent =
      s.events.length === 1
        ? 'Tek geçişi karşılaştırmak için gerçek gün, yaklaşık UTC saati ve bölge gerekiyor.'
        : 'Birden fazla geçiş var. UTC günü ve bölgeyle karşılaştırma yapılabilir.';
  } catch (e) {
    say(s, e.message);
  } finally {
    if (current === s) $('inspect-air').disabled = false;
  }
}
async function searchBox(name, signal) {
  const [first, cc] = name.split(',').map(fold);
  const known = (!cc || ['tr', 'turkiye', 'turkey'].includes(cc)) && cities[first];
  let values = known;
  if (!values) {
    const idx = await getIndex().catch(() => null);
    const rows = (idx?.names.get(first) || []).filter(
      (r) =>
        !cc || [r[1], country(r[1]), ...(idx.countries.get(r[1]) || [])].map(fold).includes(cc),
    );
    if (rows.length === 1) {
      const [, , lat, lon] = rows[0];
      const dx = Math.min(5, 0.24 / Math.max(0.05, Math.cos((lat * Math.PI) / 180)));
      values = [
        Math.max(-180, lon - dx),
        Math.max(-90, lat - 0.24),
        Math.min(180, lon + dx),
        Math.min(90, lat + 0.24),
      ];
    } else {
      if (rows.length > 1 && !cc)
        throw Error('Aynı adlı birden çok şehir var. Şehri ülkeyle birlikte yaz.');
      const url =
        'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=2&accept-language=tr&q=' +
        encodeURIComponent(name);
      const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
      if (!res.ok) throw Error('Bölge sınırları alınamadı.');
      const places = await res.json();
      if (!places.length) throw Error('Bölge bulunamadı. Şehir ve ülke adını birlikte yaz.');
      if (places.length > 1 && (!cc || rows.length > 1))
        throw Error('Birden fazla bölge bulundu. Şehir ve ülke adını birlikte yaz.');
      const [south, north, west, east] = places[0].boundingbox.map(Number);
      values = [west, south, east, north];
    }
  }
  const [west, south, east, north] = values;
  if (!values.every(Number.isFinite) || west >= east || south >= north)
    throw Error('Bu bölgenin sınırları alınamadı.');
  return { west, south, east, north };
}
export function regionalCandidates(result) {
  if (result.synthetic || result.status === 'abstained' || result.abstention?.abstained) return [];
  const cells = new Map();
  for (const c of result.candidates || []) {
    if (
      !Number.isFinite(c.lat) ||
      !Number.isFinite(c.lon) ||
      Math.abs(c.lat) > 90 ||
      Math.abs(c.lon) > 180
    )
      continue;
    const south = Math.min(89.8, Math.floor(c.lat * 5) / 5),
      west = Math.min(179.8, Math.floor(c.lon * 5) / 5);
    const key = south + ',' + west;
    if (!cells.has(key))
      cells.set(key, {
        lat: south + 0.1,
        lon: west + 0.1,
        south,
        west,
        north: south + 0.2,
        east: west + 0.2,
      });
  }
  return [...cells.values()].slice(0, 3);
}
async function locate(event) {
  event.preventDefault();
  const s = current;
  if (!s?.recording || !s.events?.length || !$('archive-consent').checked) return;
  $('locate').disabled = true;
  s.flightAreas = [];
  s.changed();
  try {
    const day = $('day').value,
      known = $('clock-type').value === 'known';
    say(s, 'Arama bölgesi hazırlanıyor…');
    const bbox = await searchBox($('region').value.trim(), s.signal);
    const area =
      (bbox.east - bbox.west) *
      (bbox.north - bbox.south) *
      111.195 ** 2 *
      Math.cos(((bbox.south + bbox.north) * Math.PI) / 360);
    if (area > 40000) throw Error('Arşiv araması için daha küçük bir şehir veya bölge seç.');
    const imp = await post(s, '/api/flight-datasets/import', {
      provider: 'adsblol',
      date_utc: day,
      bbox,
      margin_km: 15,
      confirm_download: true,
      exclude_jets: false,
    });
    const imported =
      imp.outcome === 'exists' ? imp : await waitJob(s, imp, 'Günlük uçuş arşivi hazırlanıyor');
    const dataset = imp.dataset_id || imported.result?.dataset_id || imported.dataset_id;
    if (!dataset) throw Error('Günlük uçuş verisi doğrulanamadı.');
    const query = {
      mode: known ? 'known-time' : 'unknown-time',
      recording_id: s.recording,
      event_ids: s.events.map((e) => e.id),
      bbox,
      flight_dataset_ids: [dataset],
      max_cpu_hours: 4,
    };
    if (known) {
      let clock = $('clock').value;
      if (clock.length === 5) clock += ':00';
      query.start_utc = day + 'T' + clock + 'Z';
      query.start_uncertainty_s = Number($('tolerance').value);
    } else query.date_utc = day;
    const search = await post(s, '/api/searches', query);
    await waitJob(s, search, 'Uçuş kayıtları karşılaştırılıyor');
    const data = await request(
      s.flightRoot,
      '/api/searches/' + encodeURIComponent(search.id || search.job_id) + '/candidates',
      s.signal,
    );
    if (current !== s) return;
    s.flightAreas = regionalCandidates(data);
    const idx = await getIndex().catch(() => null);
    for (const a of s.flightAreas) {
      const near = idx && nearest(a, idx);
      a.name = near ? near.name + ' çevresi' : 'Olası bölge';
    }
    if (current !== s) return;
    say(
      s,
      s.flightAreas.length
        ? 'Arşivle uyumlu bölgeler sonuçlara eklendi.'
        : 'Bu ses ve uçuş arşivi bir konum önerisini desteklemedi.',
    );
    s.changed();
  } catch (e) {
    say(s, e.message);
  } finally {
    if (current === s) $('locate').disabled = false;
  }
}
export function initFlight() {
  try {
    $('api-url').value =
      localStorage.getItem('locatevideo-api-url') ||
      (location.hostname.endsWith('github.io') ? defaultEngine : location.origin);
  } catch {
    $('api-url').value = location.hostname.endsWith('github.io') ? defaultEngine : location.origin;
  }
  $('inspect-air').addEventListener('click', inspect);
  $('flight-form').addEventListener('submit', locate);
  $('clock-type').addEventListener('change', setClock);
  $('region').addEventListener('input', () => {
    if (current) current.editedRegion = true;
  });
  for (const id of ['day', 'clock', 'clock-type'])
    $(id).addEventListener('input', () => {
      if (current) current.editedTime = true;
    });
  $('connect').addEventListener('click', async () => {
    try {
      const root = engine();
      const h = await request(root, '/health');
      if (h.status !== 'ok') throw Error('Motor hazır değil.');
      $('connection-detail').textContent = 'Motor bağlı · ' + (h.version || '');
      try {
        localStorage.setItem('locatevideo-api-url', root);
      } catch {}
    } catch (e) {
      $('connection-detail').textContent = e.message;
    }
  });
}
