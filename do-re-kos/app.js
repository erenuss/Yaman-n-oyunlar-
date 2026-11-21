'use strict';
/* Do Re Koş! — sesinle yönettiğin koşu oyunu.
   Ses yüksekliği → karakterin yüksekliği. Sessizlik → yere iner, koşar.
   Notalar bilinen ezgilerin şeklinde dizilir; melodiyi söyleyen engellerden kendiliğinden geçer. */

const $ = s => document.querySelector(s);
const cv = $('#game'), ctx = cv.getContext('2d');

/* ---------- Müzik sabitleri ---------- */
const NOTE_NAMES = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', "Do'"];
const SEMIS = [0, 2, 4, 5, 7, 9, 11, 12];
const COLORS = ['#ff4d6d', '#ff9f43', '#ffd93d', '#6bdb6b', '#3ed6d6', '#4d8bff', '#a66bff', '#ff6bd6'];
const ABS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const absName = m => ABS[((Math.round(m) % 12) + 12) % 12] + (Math.floor(Math.round(m) / 12) - 1);
const DEG = { Do: 0, Re: 1, Mi: 2, Fa: 3, Sol: 4, La: 5, Si: 6, "Do'": 7 };

/* Kamu malı ezgiler. "Nota:vuruş" (vuruş yoksa 1). */
const SONGS = {
  merdiven: { name: 'Merdiven', phrases: ['Do Re Mi Fa Sol:2', 'Sol Fa Mi Re Do:2'] },
  kuzu: { name: 'Mary’nin Kuzusu', phrases: ['Mi Re Do Re Mi Mi Mi:2', 'Re Re Re:2 Mi Sol Sol:2', 'Mi Re Do Re Mi Mi Mi Mi', 'Re Re Mi Re Do:3'] },
  neseye: { name: 'Neşeye Övgü', phrases: ['Mi Mi Fa Sol Sol Fa Mi Re', 'Do Do Re Mi Mi:1.5 Re:.5 Re:2', 'Mi Mi Fa Sol Sol Fa Mi Re', 'Do Do Re Mi Re:1.5 Do:.5 Do:2'] },
  jingle: { name: 'Jingle Bells', phrases: ['Mi Mi Mi:2 Mi Mi Mi:2', 'Mi Sol Do:1.5 Re:.5 Mi:3', 'Fa Fa Fa:1.5 Fa:.5 Fa Mi Mi Mi', 'Mi Re Re Mi Re:2 Sol:2'] },
  dahadun: { name: 'Daha Dün Annemizin', phrases: ['Do Do Sol Sol La La Sol:2', 'Fa Fa Mi Mi Re Re Do:2', 'Sol Sol Fa Fa Mi Mi Re:2', 'Sol Sol Fa Fa Mi Mi Re:2', 'Do Do Sol Sol La La Sol:2', 'Fa Fa Mi Mi Re Re Do:2'] },
  tembel: { name: 'Tembel Çocuk', phrases: ['Do Re Mi Do Do Re Mi Do', 'Mi Fa Sol:2 Mi Fa Sol:2', 'Sol:.5 La:.5 Sol:.5 Fa:.5 Mi Do Sol:.5 La:.5 Sol:.5 Fa:.5 Mi Do', 'Do Sol Do:2 Do Sol Do:2'] },
  saints: { name: 'Oh When the Saints', phrases: ['Do Mi Fa Sol:3', 'Do Mi Fa Sol:3', 'Do Mi Fa Sol:1.5 Mi:1.5 Do:1.5 Mi:1.5 Re:3', 'Mi Mi Re Do:1.5 Do Mi:1.5 Sol Sol Fa:3', 'Fa Mi Fa Sol:1.5 Mi:1.5 Do:1.5 Re:1.5 Do:3'] },
  ayisigi: { name: 'Ay Işığında', phrases: ['Do Do Do Re Mi:2 Re:2', 'Do Mi Re Re Do:3', 'Do Do Do Re Mi:2 Re:2', 'Do Mi Re Re Do:3'] },
  susanna: { name: 'Oh Susanna', phrases: ['Do Re Mi Sol Sol La:.5 Sol:.5 Mi Do', 'Re Mi Mi Re Do Re:3', 'Do Re Mi Sol Sol La:.5 Sol:.5 Mi Do', 'Re Mi Mi Re Re Do:3', 'Fa:2 Fa La:2 La:2 Sol Sol Mi Do Re:3', 'Do Re Mi Sol Sol La:.5 Sol:.5 Mi Do', 'Re Mi Mi Re Re Do:3'] },
  london: { name: 'London Bridge', phrases: ['Sol:1.5 La:.5 Sol Fa Mi Fa Sol:2', 'Re Mi Fa:2 Mi Fa Sol:2', 'Sol:1.5 La:.5 Sol Fa Mi Fa Sol:2', 'Re:2 Sol:2 Mi Do:3'] },
  macdonald: { name: 'Old MacDonald', phrases: ['Do Do Do Sol La La Sol:2', 'Mi Mi Re Re Do:3', 'Do Do Do Sol La La Sol:2', 'Mi Mi Re Re Do:3'] },
  row: { name: 'Row Row Row Your Boat', phrases: ['Do:1.5 Do:1.5 Do Re:.5 Mi:1.5', 'Mi Re:.5 Mi Fa:.5 Sol:3', "Do':.5 Do':.5 Sol:.5 Sol:.5 Mi:.5 Mi:.5 Do:.5 Do:.5", 'Sol Fa:.5 Mi Re:.5 Do:3'] },
  gam: { name: 'Gam Merdiveni', phrases: ["Do Re Mi Fa Sol La Si Do':2", "Do' Si La Sol Fa Mi Re Do:2"] },
};
const PLAYLISTS = [
  // kolaydan zora; ilerledikçe yeni şarkılar açılır
  ['merdiven', 'ayisigi', 'kuzu', 'neseye', 'saints', 'jingle'],
  ['gam', 'dahadun', 'neseye', 'macdonald', 'tembel', 'london', 'saints', 'susanna', 'jingle', 'row'],
];
const parsePhrase = p => p.split(/\s+/).map(t => { const [n, b] = t.split(':'); return [DEG[n], b ? parseFloat(b) : 1]; });

/* ---------- Ekran ---------- */
let W = 0, H = 0, S = 1, VW = 960, VHt = 540, groundY = 470, slot = 50, R = 20, PX = 200, DPR = 1;
function layout() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  S = Math.min(H / 540, W / (W < H ? 440 : 680));
  VW = W / S; VHt = H / S;
  groundY = Math.min(VHt - 64, VHt / 2 + 220);
  const N = G.nNotes;
  slot = (540 - 64 - 72) / (N + 1);
  R = Math.min(21, slot * 0.42);
  PX = Math.min(VW * 0.24, 210);
}
const yOf = d => groundY - R - (d + 1) * slot;
const degOfY = y => (groundY - R - y) / slot - 1;

/* ---------- Durum ---------- */
const G = {
  state: 'demo', diff: 0, nNotes: 5, useMic: false, baseMidi: 55, calMidi: 55,
  x: 0, speed: 170, t: 0, hearts: 3, slots: 3, shield: false, star: 0, score: 0, combo: 0, bestCombo: 0, notes: 0, perfect: 0, songsDone: 0,
  coins: [], pillars: [], hangs: [], gates: [], hoops: [], gaps: [], signs: [], songs: [], parts: [], passed: 0,
  cursor: 0, songIdx: 0, round: 0, phraseId: 0, curSong: null,
  shake: 0, flash: 0, muted: false,
};
const P = { d: -1, v: 0, ground: true, inv: 0, squash: 0, run: 0, mouth: 0 };
const BEAT = 120;
/* Zorluk: Kolay 5 nota, Usta 8 nota, Pro 8 nota + dar tolerans + ipucu sesi yok */
const DIFFS = [
  { notes: 5, tol: 40, gate: 70, guide: true, list: 0 },
  { notes: 8, tol: 30, gate: 55, guide: true, list: 1 },
  { notes: 8, tol: 20, gate: 40, guide: false, list: 1 },
];
const DF = () => DIFFS[G.diff];
let best = 0; try { best = +localStorage.getItem('doReKos_best') || 0; } catch (e) {}

/* ---------- Ses: mikrofon ve perde algılama (YIN) ---------- */
let actx = null, analyser = null, buf = null, micOn = false, noiseFloor = 0.004, echoGate = 0;
function audioCtx() {
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
async function startMic() {
  audioCtx();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } });
  const src = actx.createMediaStreamSource(stream);
  analyser = actx.createAnalyser(); analyser.fftSize = 2048;
  // Ses bandı: alttaki uğultu/klima ve üstteki tıslama perdeyi şaşırtmasın
  const hp = actx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70; hp.Q.value = 0.7;
  const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; lp.Q.value = 0.7;
  src.connect(hp).connect(lp).connect(analyser);
  buf = new Float32Array(analyser.fftSize);
  micOn = true;
}
/* PITCH-START — saf fonksiyonlar (DOM yok); test düzeneği de bu bloğu çalıştırır */
/* YIN perde algılama. Net bir çukur yoksa en derin çukuru “düşük güvenle” döndürür. */
let yinD = null;
function yin(b, sr) {
  const half = b.length >> 1;
  const minT = Math.max(2, Math.floor(sr / 1100)), maxT = Math.min(half - 2, Math.floor(sr / 65));
  if (!yinD || yinD.length < maxT + 2) yinD = new Float32Array(maxT + 2);
  const d = yinD; d[0] = 1; let run = 0;
  for (let t = 1; t <= maxT + 1; t++) {
    let s = 0;
    for (let i = 0; i < half; i++) { const x = b[i] - b[i + t]; s += x * x; }
    run += s; d[t] = run > 0 ? s * t / run : 1;
  }
  let tau = -1, bestT = -1;
  for (let t = minT; t <= maxT; t++) {
    if (d[t] < 0.2) { while (t + 1 <= maxT && d[t + 1] < d[t]) t++; tau = t; break; }
    if (bestT < 0 || d[t] < d[bestT]) bestT = t;
  }
  if (tau < 0) { if (bestT < 0 || d[bestT] > 0.4) return null; tau = bestT; }
  const x0 = d[tau - 1], x1 = d[tau], x2 = d[tau + 1], den = x0 + x2 - 2 * x1;
  const sh = den > 0 ? Math.max(-1, Math.min(1, (x0 - x2) / (2 * den))) : 0;
  return { f: sr / (tau + sh), c: 1 - x1 };
}
/* Ham perde dizisini kararlı bir “söylenen nota”ya çevirir:
   - tek karelik oktav/beşli sıçramalarını eler (3 kare sürerse kabul eder)
   - küçük titremeyi yumuşatır, gerçek nota değişimine anında uyar
   - hece aralarında kısa sessizlikte sesi tutar */
function makeTracker() { return { on: false, sm: 0, cand: 0, candN: 0, hang: 0, vel: 0 }; }
function trackPitch(T, r, dt) {
  // r: {m: midi, c: güven} ya da null
  if (r && T.on && r.c < 0.8 && Math.abs(r.m - T.sm) > 1.5) r = null; // zayıf ve tutarsız ölçümü at
  if (r && !T.on && r.c < 0.8) r = null;                                // zayıf ölçümle ses başlatma
  if (r) {
    if (!T.on) { T.sm = r.m; T.vel = 0; }
    else {
      const diff = r.m - T.sm;
      if (Math.abs(diff) > 9.5) {                       // büyük sıçrama: büyük ihtimalle oktav hatası
        if (T.candN && Math.abs(r.m - T.cand) < 1.2) T.candN++; else { T.cand = r.m; T.candN = 1; }
        if (T.candN < 3) { T.hang -= dt; return T; }
        T.sm = r.m; T.vel = 0;
      } else {
        const a = Math.min(1, 0.7 + Math.abs(diff) * 0.5);   // hafif yumuşatma, büyük fark → hemen geç
        const prev = T.sm; T.sm += diff * a;
        T.vel += ((T.sm - prev) / Math.max(dt, 1e-3) - T.vel) * Math.min(1, dt * 10);
      }
    }
    T.candN = 0; T.hang = 0.18; T.on = true;
  } else {
    T.hang -= dt;
    if (T.hang <= 0) { T.on = false; T.candN = 0; }
  }
  return T;
}
/* Göreli yarım ton → çizgi (derece). Notaya yakın sesler notaya “mıknatıs” gibi oturur;
   iki nota arasında geçiş hızlı ve süreklidir. Mi–Fa gibi yarım ton aralıklar da aynı his verir. */
function nearestNote(rel, N) {
  let n = 0; for (let i = 1; i < N; i++) if (Math.abs(rel - SEMIS[i]) < Math.abs(rel - SEMIS[n])) n = i;
  return n;
}
function relToDeg(rel, N, magnet = true) {
  const top = SEMIS[N - 1];
  if (rel <= 0 - 1) return Math.max(-0.6, -0.5 + (rel + 1) / 2);
  if (rel >= top + 1) return Math.min(N - 0.4, N - 0.5 + (rel - top - 1) / 2);
  const n = nearestNote(rel, N), err = rel - SEMIS[n];
  const gap = err >= 0 ? (n < N - 1 ? SEMIS[n + 1] - SEMIS[n] : 2) : (n > 0 ? SEMIS[n] - SEMIS[n - 1] : 2);
  const w = gap / 2, e = Math.min(1, Math.abs(err) / w);
  const shaped = magnet ? Math.sign(err) * Math.pow(e, 2.2) * 0.5 : Math.sign(err) * e * 0.5; // derece cinsinden
  return n + shaped;
}
/* PITCH-END */

/* V: o anki “ses” — mikrofon, dokunma, klavye ya da demo yapay zekâsı */
const V = { on: false, deg: 0, raw: 0, locked: false, lock: -1, midi: 0, rel: 0, cents: 0, centsAvg: 0, note: -1, level: 0, rms: 0 };
const TR = makeTracker();
const pointer = { down: false, y: 0 };
let keyDeg = null;

function foldRel(m) {
  const top = SEMIS[G.nNotes - 1];
  let rel = m - G.baseMidi;
  // Bir oktav kayan sesleri (çok ince/kalın söyleyiş) aralığa katla
  while (rel > top + 4) rel -= 12;
  while (rel < -5) rel += 12;
  return rel;
}
const degFromMidi = m => relToDeg(foldRel(m), G.nNotes);
function readMic() {
  if (!micOn) { V.rms = 0; return null; }
  analyser.getFloatTimeDomainData(buf);
  let s = 0; for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  const rms = Math.sqrt(s / buf.length);
  V.rms = rms;
  // asıl ayrımı YIN güveni yapar; ipucu sesi çalarken hoparlör yankısını ses sanma
  if (rms < Math.max(noiseFloor * 1.6, 0.004, GUIDE.on ? echoGate : 0)) return null;
  // Oyunda yalnızca gereken en kalın perdeye yetecek kadar yeni örneğe bak: pencere kısalır,
  // gecikme ve işlem yükü azalır (ör. Do=C3 için ~23 ms yerine 43 ms)
  let b = buf;
  if (G.state === 'play') {
    const minF = 440 * Math.pow(2, (G.baseMidi - 7 - 69) / 12);
    const N = Math.min(buf.length, 2 * Math.ceil(actx.sampleRate / minF) + 8) & ~1;
    b = buf.subarray(buf.length - N);
  }
  const r = yin(b, actx.sampleRate);
  if (!r || r.f < 65 || r.f > 1100) return null;
  return { m: 69 + 12 * Math.log2(r.f / 440), c: r.c };
}
function median(a) { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; }
function readVoice(dt) {
  const r = readMic();
  trackPitch(TR, r, dt);
  V.level += ((micOn ? Math.min(1, V.rms * 12) : (V.on ? 0.6 : 0)) - V.level) * Math.min(1, dt * 15);
  if (G.state === 'demo') return demoVoice();
  // Mikrofonla oynarken elle yönetme yok: karakter yalnızca sesle hareket eder
  if (!G.useMic && pointer.down) { const d = degOfY(pointer.y); V.on = d > -0.55; V.deg = V.raw = Math.min(G.nNotes - 0.4, Math.max(-0.4, d)); V.locked = V.on; V.cents = V.centsAvg = 0; return; }
  if (!G.useMic && keyDeg !== null) { V.on = true; V.deg = V.raw = keyDeg; V.locked = true; V.lock = keyDeg; V.cents = V.centsAvg = 0; return; }
  V.on = TR.on;
  if (!V.on) { V.locked = false; V.lock = -1; return; }
  V.midi = TR.sm; V.rel = foldRel(TR.sm);
  V.raw = relToDeg(V.rel, G.nNotes, false);              // sesin gerçek yeri (soldaki ok)
  const n = nearestNote(V.rel, G.nNotes), c = (V.rel - SEMIS[n]) * 100;
  // vibratoyu adil değerlendirmek için ~150 ms ortalama
  V.centsAvg = n === V.note ? V.centsAvg + (c - V.centsAvg) * Math.min(1, dt / 0.1) : c;
  V.note = n; V.cents = Math.round(c);
  /* Kuş sesini okla aynı yerde ve aynı anda izler. Nota tolerans içindeyse (vibratonun merkezine göre)
     kuş parlar ve nota toplar; değilse soluk kalır ve nota toplayamaz. */
  V.locked = Math.abs(V.centsAvg) <= DF().tol && V.raw >= -0.5 && V.raw <= G.nNotes - 0.5;
  V.lock = V.locked ? n : -1;
  V.deg = V.raw;   // kuş tam sesinin olduğu yerde (okla aynı); notayı tutturunca parlar
}
function demoVoice() {
  const c = G.coins.find(c => !c.taken && c.x > G.x - 12 && c.x < G.x + BEAT * 1.3);
  V.on = V.locked = !!c; if (c) V.deg = V.raw = c.d;
}

/* ---------- Efekt sesleri ---------- */
function tone(f, dur = 0.14, type = 'sine', vol = 0.05, slideTo = 0, when = 0) {
  if (G.muted || !actx) return;
  try {
    const t0 = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) {}
}
const noteHz = d => 440 * Math.pow(2, (G.baseMidi + SEMIS[d] - 69) / 12);

/* İpucu sesi: sıradaki notanın gerçek perdesi, notaya varmadan ~0.6 vuruş önce başlar ve
   nota boyunca sürekli çalar (cümle içinde legato). Pro modda kapalı. */
const GUIDE = { on: false, osc: null, osc2: null, gain: null, note: -1 };
const GUIDE_VOL = 0.06;
function guideUpdate() {
  if (!actx) return;
  let target = -1;
  if (G.state === 'play' && DF().guide && !G.muted) {
    const lead = BEAT * 0.6;
    const c = G.coins.find(c => G.x >= c.x - lead && G.x < c.x - lead + c.len - 5);
    if (c) target = c.d;
  }
  if (!GUIDE.gain) {
    if (target < 0) return;
    const g = actx.createGain(); g.gain.value = 0;
    const o = actx.createOscillator(); o.type = 'sine';
    const o2 = actx.createOscillator(); o2.type = 'triangle';
    const g2 = actx.createGain(); g2.gain.value = 0.3;
    o.connect(g); o2.connect(g2).connect(g); g.connect(actx.destination); o.start(); o2.start();
    Object.assign(GUIDE, { osc: o, osc2: o2, gain: g });
  }
  const t = actx.currentTime;
  if (target >= 0) {
    const f = noteHz(target);
    if (target !== GUIDE.note) { GUIDE.osc.frequency.setTargetAtTime(f, t, 0.012); GUIDE.osc2.frequency.setTargetAtTime(f, t, 0.012); }
    GUIDE.gain.gain.setTargetAtTime(GUIDE_VOL, t, 0.03);
  } else GUIDE.gain.gain.setTargetAtTime(0, t, 0.04);
  GUIDE.on = target >= 0 || (GUIDE.note >= 0); // sönerken de bir kare daha yankıya dikkat
  GUIDE.note = target;
}

/* ---------- Seviye üretimi ---------- */
function resetWorld() {
  Object.assign(G, { x: 0, t: 0, speed: 170, hearts: 3, slots: 3, shield: false, star: 0, score: 0, combo: 0, bestCombo: 0, notes: 0, perfect: 0, songsDone: 0,
    coins: [], pillars: [], hangs: [], gates: [], hoops: [], gaps: [], signs: [], songs: [], parts: [], passed: 0, cursor: VW * 0.75, songIdx: 0, round: 0, curSong: null, shake: 0, flash: 0 });
  Object.assign(P, { d: -1, v: 0, ground: true, inv: 0, squash: 0 });
  buildSkyline();
}
function addSong() {
  const list = PLAYLISTS[DF().list];
  const key = list[G.songIdx % list.length];
  const round = Math.floor(G.songIdx / list.length);
  const n = G.songIdx; G.songIdx++;
  const song = SONGS[key];
  const level = n + round * 2;
  const speed = Math.min(320, 170 * (1 + 0.06 * n + 0.12 * round));
  const rec = { name: song.name + (round ? ' · ' + (round + 1) + '. tur' : ''), start: G.cursor, end: 0, total: 0, got: 0, perfect: 0, done: false, speed };
  G.signs.push({ x: G.cursor, text: rec.name });
  G.cursor += BEAT * 2.5;
  const obsP = Math.min(0.6, n === 0 && !round ? 0.12 : 0.22 + 0.06 * level);
  const gapP = Math.min(0.55, n === 0 && !round ? 0 : 0.15 + 0.07 * level);
  const gateP = Math.min(0.4, n === 0 && !round ? 0.15 : 0.18 + 0.05 * level);
  /* Kademeli zorluk (0 → 1): başta kapılar geniş, büyük sıçramalardan sonra kapı ve baca yok,
     kapı notanın gerisinde (yetişme payı). Şarkılar ilerledikçe normale döner. */
  const ramp = Math.min(1, level / 6);
  const gateCents = Math.round(DF().gate + 55 * (1 - ramp));
  const maxLeap = 1 + Math.round(3 * ramp);           // kapıdan önce izin verilen en büyük sıçrama (çizgi)
  for (const ph of song.phrases) {
    const notes = parsePhrase(ph), id = ++G.phraseId, list2 = [];
    for (const [d, b] of notes) {
      if (d !== undefined && d < G.nNotes) { const c = { x: G.cursor, len: b * BEAT, d, ph: id, song: rec, taken: false, missed: false }; G.coins.push(c); list2.push(c); rec.total++; }
      G.cursor += b * BEAT;
    }
    const gap = list2.length >= 4 && Math.random() < gapP;
    if (gap) G.gaps.push({ x0: list2[0].x + BEAT * 0.4, x1: list2[list2.length - 1].x - BEAT * 0.2 });
    for (let i = 0; i < list2.length - 1; i++) {
      const a = list2[i], b = list2[i + 1];
      if (b.x - a.x < BEAT * 0.95 || Math.random() > obsP) continue;
      if (Math.abs(a.d - b.d) >= 3 && ramp < 0.7) continue; // büyük sıçramanın etrafı başta boş
      const lo = Math.min(a.d, b.d), hi = Math.max(a.d, b.d), mx = (a.x + b.x) / 2;
      const canP = lo >= 1 && !gap, canH = hi <= G.nNotes - 2;
      if (canP && (!canH || Math.random() < 0.6)) G.pillars.push({ x: mx, w: 30, top: lo - 0.95 });
      else if (canH) G.hangs.push({ x: mx, w: 36, bot: hi + 0.95, sw: Math.random() * 6 });
    }
    /* Nota kapısı: yerden göğe duvar, yalnızca o notanın hizasında açıklık (notayı söylemeden geçilmez).
       Çember: uzun notalarda havada halka; içinden geçmek bonus. */
    let lastGate = -1e9;
    list2.forEach((c, i) => {
      const leap = i ? Math.abs(c.d - list2[i - 1].d) : 99;   // cümle başı da “sıçrama” sayılır
      if (c.len >= BEAT * 1.9 && Math.random() < 0.7) { G.hoops.push({ x: c.x + Math.min(c.len * 0.5, BEAT * 0.9), d: c.d, cents: gateCents + 15, done: false }); return; }
      const last = i === list2.length - 1;                    // cümle sonu: oyuncular sesi erken bırakır
      if (!last && c.len >= BEAT * 0.95 && leap <= maxLeap && c.x - lastGate > BEAT * 2.5 && Math.random() < gateP) {
        const x = c.x + Math.min(BEAT * (0.55 - 0.25 * ramp), c.len * 0.6);
        G.gates.push({ x, d: c.d, w: 26, cents: gateCents, done: false }); lastGate = c.x;
        G.pillars = G.pillars.filter(q => Math.abs(q.x - x) > 55); G.hangs = G.hangs.filter(q => Math.abs(q.x - x) > 55);
      }
    });
    G.cursor += BEAT * 1.5; // nefes payı
  }
  { const pool = G.coins.filter(c => c.song === rec && c.len >= BEAT * 0.95 && c.ph !== G.coins.find(q => q.song === rec).ph);
    if (pool.length && Math.random() < (round ? 0.6 : 0.85)) pool[Math.floor(Math.random() * pool.length)].heart = true; }
  rec.end = G.cursor - BEAT;
  G.songs.push(rec);
  G.cursor += BEAT * 1.5;
}
function ensureLevel() {
  while (G.cursor < G.x + VW * 2.2) addSong();
  const cut = G.x - PX - 200;
  if (G.coins.length && G.coins[0].x < cut) {
    G.coins = G.coins.filter(c => c.x > cut); G.pillars = G.pillars.filter(p => p.x > cut);
    G.hangs = G.hangs.filter(p => p.x > cut); G.gates = G.gates.filter(p => p.x > cut); G.hoops = G.hoops.filter(p => p.x > cut); G.gaps = G.gaps.filter(g => g.x1 > cut); G.signs = G.signs.filter(s => s.x > cut - 200);
  }
}

/* ---------- Oyun akışı ---------- */
function show(id) { for (const s of ['menu', 'calib', 'pause', 'over']) $('#' + s).classList.toggle('hidden', s !== id); }
function startGame() {
  G.nNotes = DF().notes; layout(); resetWorld();
  G.state = 'play'; show(null); $('#hud').classList.remove('hidden');
  updateHearts(); updatePowers(); ensureLevel();
}
function toDemo() {
  G.state = 'demo'; $('#hud').classList.add('hidden'); G.nNotes = DF().notes; layout(); resetWorld(); ensureLevel();
  $('#bestLine').textContent = best ? '🏆 En iyi skorun: ' + best : '';
  show('menu');
}
function pauseGame() { if (G.state !== 'play') return; G.state = 'paused'; show('pause'); }
function resumeGame() { if (G.state !== 'paused') return; G.state = 'play'; show(null); }
function gameOver() {
  G.state = 'over'; $('#hud').classList.add('hidden');
  const isBest = G.score > best;
  if (isBest) { best = G.score; try { localStorage.setItem('doReKos_best', best); } catch (e) {} }
  $('#finalScore').textContent = G.score;
  $('#overTitle').textContent = G.songsDone >= 3 ? 'Muhteşem konser!' : G.songsDone ? 'Güzel konser!' : 'Konser bitti!';
  $('#newBest').textContent = isBest ? '🏆 Yeni rekor!' : 'En iyi: ' + best;
  $('#stNotes').textContent = G.notes;
  $('#stPerfect').textContent = (G.notes ? Math.round(G.perfect / G.notes * 100) : 0) + '%';
  $('#stSongs').textContent = G.songsDone;
  $('#stCombo').textContent = G.bestCombo;
  setTimeout(() => show('over'), 500);
  tone(392, 0.2, 'triangle', 0.06); tone(330, 0.2, 'triangle', 0.06, 0, 0.18); tone(262, 0.4, 'triangle', 0.06, 0, 0.36);
}
const MAX_HEARTS = 5;
function updateHearts(fx) {
  G.slots = Math.max(G.slots || 3, G.hearts);          // kaybedilen can boş kalp olarak görünür
  const slots = G.slots;
  $('#hearts').innerHTML = Array.from({ length: slots }, (_, i) =>
    i < G.hearts ? '<span class="h' + (fx === 'gain' && i === G.hearts - 1 ? ' gain' : '') + '">❤</span>'
                 : '<span class="off' + (fx === 'hit' && i === G.hearts ? ' lost' : '') + '">❤</span>').join('');
  if (fx === 'hit') { const h = $('#hearts'); h.classList.remove('shake'); void h.offsetWidth; h.classList.add('shake'); }
}
function updatePowers() {
  $('#powers').innerHTML = (G.shield ? '<span class="pw sh">🛡️ Kalkan</span>' : '') + (G.star > 0 ? '<span class="pw st">⭐ x2 · ' + Math.ceil(G.star) + ' sn</span>' : '');
}
/* Seri ödülleri: her 25 doğru notada 8 sn yıldız (puan x2); her 10 notada kalkan (yoksa) */
function streakReward() {
  if (G.combo % 25 === 0) { G.star = 8; banner('⭐ Yıldız!<small>' + G.combo + ' nota üst üste · 8 saniye puanlar x2</small>', 1600); }
  else if (G.combo % 10 === 0 && !G.shield) { G.shield = true; banner('🛡️ Kalkan!<small>' + G.combo + ' nota üst üste · bir çarpmayı karşılar</small>', 1600); }
  else return;
  [0, 2, 4, 7].forEach((d, i) => tone(noteHz(Math.min(d, G.nNotes - 1)) * 2, 0.15, 'triangle', 0.035, 0, i * 0.06));
  updatePowers();
}
let bannerT = null;
function banner(html, ms = 2200) {
  const b = $('#banner'); b.innerHTML = html; b.classList.add('show');
  clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), ms);
}
function hurt() {
  if (P.inv > 0 || G.state !== 'play') return;
  if (G.shield) {                                     // kalkan çarpmayı karşılar: can ve seri korunur
    G.shield = false; P.inv = 1.2; G.shake = 0.15; updatePowers();
    burst(G.x, yOf(P.d), '#7fe3ff', 22); floatText(G.x, yOf(P.d) - 34, 'Kalkan korudu!', '#7fe3ff');
    tone(660, 0.2, 'triangle', 0.04, 330); return;
  }
  G.hearts--; P.inv = 2; G.shake = 0.35; G.flash = 0.5; G.combo = 0; updateHearts('hit');
  tone(180, 0.25, 'square', 0.04, 70);
  if (navigator.vibrate) try { navigator.vibrate(80); } catch (e) {}
  if (G.hearts <= 0) gameOver();
}

/* ---------- Parçacıklar ---------- */
function burst(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 60 + Math.random() * 140; G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.6, max: 0.6, color, k: 'dot' }); }
}
function floatText(x, y, text, color) { G.parts.push({ x, y, vx: 0, vy: -50, life: 0.9, max: 0.9, color, k: 'text', text }); }

/* ---------- Güncelleme ---------- */
function overGap(x) { for (const g of G.gaps) if (x > g.x0 + R * 0.5 && x < g.x1 - R * 0.5) return true; return false; }
function circleRect(cx, cy, r, x0, y0, x1, y1) {
  const nx = Math.max(x0, Math.min(cx, x1)), ny = Math.max(y0, Math.min(cy, y1));
  return (cx - nx) ** 2 + (cy - ny) ** 2 < r * r;
}
function update(dt) {
  readVoice(dt);
  updateTuner();
  if (G.state !== 'play' && G.state !== 'demo') return;
  const demo = G.state === 'demo';
  G.t += dt;
  // şarkı hızı
  const cur = G.songs.find(s => G.x >= s.start - 40 && !s.done) || G.songs[G.songs.length - 1];
  if (cur && cur !== G.curSong) { G.curSong = cur; if (!demo) banner('♪ ' + cur.name + '<small>' + (G.songsDone ? 'hazır mısın?' : 'notaları takip et, söyle!') + '</small>', 1800); }
  if (cur) G.speed += (cur.speed - G.speed) * Math.min(1, dt * 0.8);
  G.x += G.speed * dt;
  P.inv = Math.max(0, P.inv - dt);
  if (G.star > 0) { const was = Math.ceil(G.star); G.star = Math.max(0, G.star - dt); if (!demo && Math.ceil(G.star) !== was) updatePowers(); } G.shake = Math.max(0, G.shake - dt); G.flash = Math.max(0, G.flash - dt);
  P.squash = Math.max(0, P.squash - dt * 4);

  // fizik
  const prev = P.d;
  const support = demo || P.inv > 0 || !overGap(G.x);
  if (V.on) {
    P.d = V.deg;                                           // okla birebir aynı anda, aynı yerde
    P.v = (P.d - prev) / Math.max(dt, 1e-3);
    if (P.d < -1 && support) P.d = -1;
    P.ground = false;
  } else {
    P.v -= 26 * dt; P.d += P.v * dt;
    if (support && P.d <= -1) { if (!P.ground && P.v < -3) { P.squash = 1; burst(G.x, groundY, '#ffffff88', 5); } P.d = -1; P.v = 0; P.ground = true; }
    else P.ground = false;
    if (!support && P.d < -2.8) { hurt(); P.d = 1.2; P.v = 2; if (G.state === 'play') floatText(G.x, yOf(1), 'Hop! Söyle!', '#fff'); }
  }
  if (P.ground) P.run += dt * G.speed / 14;
  const py = yOf(P.d);

  // engeller
  if (!demo && P.inv <= 0) {
    for (const p of G.pillars) if (Math.abs(p.x - G.x) < 60 && circleRect(G.x, py, R * 0.82, p.x - p.w / 2, yOf(p.top) - 6, p.x + p.w / 2, groundY + 50)) { hurt(); break; }
    for (const h of G.hangs) if (Math.abs(h.x - G.x) < 60 && circleRect(G.x, py, R * 0.82, h.x - h.w / 2, -2000, h.x + h.w / 2, yOf(h.bot))) { hurt(); break; }
    for (const g of G.gates) {
      if (Math.abs(g.x - G.x) > g.w / 2 + R * 0.4) continue;
      const o = openSpan(g.d, g.cents);
      if (py < o.top || py > o.bot) { hurt(); if (G.state === 'play') floatText(G.x, py - 30, NOTE_NAMES[g.d] + ' söyle!', COLORS[g.d]); break; }
    }
  }
  for (const h of G.hoops) {
    if (h.done || G.x < h.x) continue;
    h.done = true; if (demo) continue;
    const o = openSpan(h.d, h.cents);
    if (py >= o.top && py <= o.bot) {
      const pts = 50 * Math.min(4, 1 + Math.floor(G.combo / 8)) * (G.star > 0 ? 2 : 1); G.score += pts;
      burst(h.x, yOf(h.d), '#ffe066', 18); floatText(h.x, yOf(h.d) - 40, 'Çember! +' + pts, '#ffe066');
      tone(noteHz(h.d) * 2, 0.35, 'triangle', 0.03); tone(noteHz(h.d) * 3, 0.35, 'sine', 0.02, 0, 0.08);
    }
  }
  // notalar
  for (const c of G.coins) {
    if (c.taken || c.missed) continue;
    // nota ancak o nota tutturulmuşken (kuş parlarken) toplanır; “Tam” notanın üstünden geçerken
    // yakalanan en iyi perdeye göre verilir (notaya kayarak girmek cezalandırılmaz)
    const inWin = Math.abs(c.x - G.x) < R + 12;
    if (inWin && Math.abs(yOf(c.d) - py) < R + slot * 0.32 && (demo || (V.locked && V.lock === c.d)))
      c.best = Math.min(c.best ?? 999, demo ? 0 : Math.abs(V.centsAvg));
    if (c.best === undefined || (inWin && G.x < c.x - 2)) {
      if (c.x < G.x - R - 14) { c.missed = true; if (!demo) G.combo = 0; }
      continue;
    }
    {
      c.taken = true; if (demo) continue;
      const perfect = c.best <= DF().tol / 2;
      G.combo++; G.bestCombo = Math.max(G.bestCombo, G.combo); G.notes++; c.song.got++;
      const mult = Math.min(4, 1 + Math.floor(G.combo / 8)) * (G.star > 0 ? 2 : 1);
      const pts = (perfect ? 25 : 10) * mult; G.score += pts;
      streakReward();
      if (c.heart) {
        if (G.hearts < MAX_HEARTS) { G.hearts++; updateHearts('gain'); floatText(c.x, yOf(c.d) - 46, '+1 ❤', '#ff6b8b'); }
        else { G.score += 100; floatText(c.x, yOf(c.d) - 46, '❤ +100', '#ff6b8b'); }
        burst(c.x, yOf(c.d), '#ff6b8b', 16); tone(noteHz(c.d) * 2, 0.4, 'sine', 0.035); tone(noteHz(c.d) * 2.5, 0.4, 'sine', 0.02, 0, 0.1);
      }
      if (perfect) { G.perfect++; c.song.perfect++; }
      burst(c.x, yOf(c.d), COLORS[c.d], perfect ? 14 : 8);
      floatText(c.x, yOf(c.d) - 24, (perfect ? 'Tam! +' : '+') + pts, perfect ? '#fff' : COLORS[c.d]);
      tone(noteHz(c.d) * 2, 0.3, 'triangle', 0.035);
      if (perfect) tone(noteHz(c.d) * 3, 0.25, 'sine', 0.02, 0, 0.05);
    }
  }
  // şarkı sonu
  for (const s of G.songs) {
    if (s.done || G.x < s.end) continue;
    s.done = true; G.passed++; if (demo) continue;
    const acc = s.total ? s.got / s.total : 0;
    const stars = acc >= 0.95 ? 3 : acc >= 0.75 ? 2 : acc >= 0.5 ? 1 : 0;
    G.songsDone++;
    const bonus = stars * 150; G.score += bonus;
    let extra = '';
    if (stars >= 2 && G.hearts < MAX_HEARTS) { G.hearts++; updateHearts('gain'); extra = ' · +1 ❤'; }
    banner((stars ? '★'.repeat(stars) + '<span style="opacity:.3">' + '★'.repeat(3 - stars) + '</span>' : 'Devam!') + '<small>' + s.name + ' · %' + Math.round(acc * 100) + ' isabet · +' + bonus + extra + '</small>', 2600);
    if (stars) [0, 2, 4, 7].forEach((d, i) => tone(noteHz(Math.min(d, G.nNotes - 1)) * 2, 0.18, 'triangle', 0.04, 0, i * 0.09));
  }
  // nota izi
  if (V.on && Math.random() < dt * 14) G.parts.push({ x: G.x - R, y: py + (Math.random() - 0.5) * R, vx: -40 - Math.random() * 40, vy: -20 - Math.random() * 30, life: 0.8, max: 0.8, color: COLORS[Math.max(0, Math.min(G.nNotes - 1, Math.round(V.deg)))], k: 'note', text: Math.random() < 0.5 ? '♪' : '♫' });
  for (const p of G.parts) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'dot') p.vy += 300 * dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  ensureLevel();
  P.mouth += ((V.on ? 0.35 + V.level * 0.65 : 0) - P.mouth) * Math.min(1, dt * 18);

  // HUD
  if (!demo) {
    $('#score').textContent = G.score;
    $('#combo').textContent = G.combo >= 4 ? 'Seri ' + G.combo + (G.combo >= 8 ? ' · x' + Math.min(4, 1 + Math.floor(G.combo / 8)) : '') : '';
    if (cur) {
      $('#songName').textContent = '♪ ' + cur.name;
      $('#songBar').style.width = Math.max(0, Math.min(100, (G.x - cur.start) / (cur.end - cur.start) * 100)) + '%';
    }
  }
}
let tunerT = 0;
function updateTuner() {
  if (G.state !== 'play' || ++tunerT % 3) return;
  $('#micBar').style.width = Math.round(Math.min(1, V.level) * 100) + '%';
  if (!V.on) { $('#noteName').textContent = '—'; $('#noteName').style.color = '#fff'; $('#noteTune').textContent = 'sessiz'; return; }
  const n = G.useMic && V.note >= 0 ? V.note : Math.max(0, Math.min(G.nNotes - 1, Math.round(V.deg))), c = Math.round(V.centsAvg);
  $('#noteName').textContent = NOTE_NAMES[n]; $('#noteName').style.color = COLORS[n];
  $('#noteTune').textContent = Math.abs(c) <= DF().tol / 2 ? 'tam isabet ✓' : Math.abs(c) <= DF().tol ? (c > 0 ? 'tuttu, az tiz' : 'tuttu, az pes') : c > 0 ? 'tiz, alçalt ↓' : 'pes, yükselt ↑';
  if (!V.locked) $('#noteName').style.color = '#ffffff88';
}

/* ---------- Çizim ---------- */
const SKIES = [
  ['#2b1b5a', '#8a3d8f', '#ff7a7a', '#ffc27a'],
  ['#1b1450', '#4b2f8a', '#c24f8f', '#ff9a76'],
  ['#070b2a', '#14215a', '#2f3f8f', '#6a5bb0'],
];
let skyline = [];
function buildSkyline() {
  skyline = [0.15, 0.4].map((f, li) => {
    const arr = []; let x = 0;
    while (x < 1800) { const w = 50 + Math.random() * 90, h = (li ? 90 : 140) + Math.random() * (li ? 150 : 170); arr.push({ x, w, h, win: Math.random() }); x += w + 4 + Math.random() * 14; }
    return { f, arr, period: x };
  });
}
function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
const sx = wx => wx - G.x + PX;
/* Kapı/çember açıklığı: notanın ±gate cent'i (kuşun merkezi bu aralıkta olmalı) */
function openSpan(d, cents = DF().gate) {
  const g = cents / 100;
  return { top: yOf(relToDeg(SEMIS[d] + g, G.nNotes, false)), bot: yOf(relToDeg(SEMIS[d] - g, G.nNotes, false)) };
}

function draw() {
  ctx.setTransform(DPR * S, 0, 0, DPR * S, 0, 0);
  let shx = 0, shy = 0;
  if (G.shake > 0) { shx = (Math.random() - 0.5) * 12 * G.shake / 0.35; shy = (Math.random() - 0.5) * 12 * G.shake / 0.35; }
  ctx.translate(shx, shy);
  // gökyüzü
  const si = Math.floor(G.passed / 2) % SKIES.length, sk = SKIES[si];
  const gr = ctx.createLinearGradient(0, 0, 0, groundY);
  gr.addColorStop(0, sk[0]); gr.addColorStop(0.45, sk[1]); gr.addColorStop(0.8, sk[2]); gr.addColorStop(1, sk[3]);
  ctx.fillStyle = gr; ctx.fillRect(-20, -20, VW + 40, VHt + 40);
  // yıldızlar
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) { const x = ((i * 137.5 - G.x * 0.03) % (VW + 20) + VW + 20) % (VW + 20), y = (i * 61) % (groundY * 0.55); ctx.globalAlpha = 0.25 + 0.35 * Math.sin(G.t * 2 + i); ctx.fillRect(x, y, 2, 2); }
  ctx.globalAlpha = 1;
  // güneş/ay
  ctx.fillStyle = si === 2 ? '#fff6d8' : '#ffe08a';
  ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(VW * 0.78, groundY * 0.42, 46, 0, 6.28); ctx.fill(); ctx.globalAlpha = 1;
  // silüet
  skyline.forEach((L, li) => {
    const off = (G.x * L.f) % L.period;
    ctx.fillStyle = li ? '#2a1a4ccc' : '#3e2a6a99';
    for (let k = 0; k < 3; k++) for (const b of L.arr) {
      const x = b.x - off + k * L.period; if (x > VW || x + b.w < 0) continue;
      ctx.fillRect(x, groundY - b.h, b.w, b.h);
      if (li) { ctx.fillStyle = '#ffd36b55'; for (let wy = groundY - b.h + 12; wy < groundY - 10; wy += 18) for (let wx = x + 8; wx < x + b.w - 8; wx += 14) if (((wx * 7 + wy * 3 + b.win * 100) | 0) % 5 === 0) ctx.fillRect(wx, wy, 6, 8); ctx.fillStyle = '#2a1a4ccc'; }
    }
  });
  // nota çizgileri (porte)
  const sung = V.on && V.locked ? V.lock : -9;
  for (let d = 0; d < G.nNotes; d++) {
    const y = yOf(d);
    ctx.strokeStyle = COLORS[d]; ctx.globalAlpha = d === sung ? 0.55 : 0.16; ctx.lineWidth = d === sung ? 2 : 1;
    ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(52, y); ctx.lineTo(VW, y); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = d === sung ? 1 : 0.75; ctx.fillStyle = COLORS[d]; rr(8, y - 11, 40, 22, 11); ctx.fill();
    ctx.fillStyle = '#1b0f35'; ctx.font = '600 12px Fredoka,system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(NOTE_NAMES[d], 28, y + 1);
  }
  ctx.globalAlpha = 1;
  // zemin (çatılar)
  const L = G.x - PX - 40, Rr = G.x - PX + VW + 40;
  let segs = [[L, Rr]];
  for (const g of G.gaps) { if (g.x1 < L || g.x0 > Rr) continue; const n = []; for (const [a, b] of segs) { if (g.x1 <= a || g.x0 >= b) n.push([a, b]); else { if (g.x0 > a) n.push([a, g.x0]); if (g.x1 < b) n.push([g.x1, b]); } } segs = n; }
  ctx.fillStyle = '#0c0620'; ctx.fillRect(-20, groundY, VW + 40, VHt - groundY + 40);
  for (const [a, b] of segs) {
    const x0 = sx(a), x1 = sx(b);
    ctx.fillStyle = '#24153f'; ctx.fillRect(x0, groundY, x1 - x0, VHt - groundY + 30);
    ctx.fillStyle = '#ff9f6b'; ctx.fillRect(x0, groundY, x1 - x0, 6);
    ctx.fillStyle = '#ffd3a8'; ctx.fillRect(x0, groundY, x1 - x0, 2);
    ctx.fillStyle = '#ffd36b40';
    const start = Math.ceil(a / 46) * 46;
    for (let wx = start; wx < b - 20; wx += 46) for (let row = 0; row < 3; row++) if (((wx / 46 + row * 3) | 0) % 4 !== 1) ctx.fillRect(sx(wx) + 10, groundY + 22 + row * 34, 14, 18);
  }
  // boşluk uyarısı
  for (const g of G.gaps) { const x0 = sx(g.x0), x1 = sx(g.x1); if (x1 < 0 || x0 > VW) continue; ctx.fillStyle = '#ff4d6d22'; ctx.fillRect(x0, groundY - 2, x1 - x0, 4); }
  // tabelalar
  ctx.textBaseline = 'middle';
  for (const s of G.signs) {
    const x = sx(s.x); if (x < -200 || x > VW + 200) continue;
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x - 3, groundY - 70, 6, 70);
    ctx.font = '600 15px Fredoka,system-ui'; const w = ctx.measureText(s.text).width + 28;
    ctx.fillStyle = '#ffcf3f'; rr(x - w / 2, groundY - 104, w, 36, 10); ctx.fill();
    ctx.fillStyle = '#3a1d00'; ctx.textAlign = 'center'; ctx.fillText('♪ ' + s.text, x, groundY - 85);
  }
  // bacalar
  for (const p of G.pillars) {
    const x = sx(p.x); if (x < -60 || x > VW + 60) continue;
    const top = yOf(p.top);
    ctx.fillStyle = '#b5523b'; ctx.fillRect(x - p.w / 2, top, p.w, groundY - top);
    ctx.fillStyle = '#8f3b2b'; for (let y = top + 10; y < groundY; y += 12) ctx.fillRect(x - p.w / 2, y, p.w, 2);
    ctx.fillStyle = '#3a2340'; rr(x - p.w / 2 - 5, top - 8, p.w + 10, 12, 3); ctx.fill();
    ctx.fillStyle = '#ffffff22'; for (let i = 0; i < 3; i++) { const t = (G.t * 0.7 + i / 3) % 1; ctx.beginPath(); ctx.arc(x + Math.sin(t * 6 + i) * 6, top - 12 - t * 50, 6 + t * 10, 0, 6.28); ctx.globalAlpha = 0.5 * (1 - t); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // asılı tabelalar
  for (const h of G.hangs) {
    const x = sx(h.x); if (x < -60 || x > VW + 60) continue;
    const bot = yOf(h.bot), sw = Math.sin(G.t * 2 + h.sw) * 2;
    ctx.strokeStyle = '#ffffff55'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, -10); ctx.lineTo(x - 10 + sw, bot - 30); ctx.moveTo(x + 10, -10); ctx.lineTo(x + 10 + sw, bot - 30); ctx.stroke();
    ctx.fillStyle = '#2d1a52'; rr(x - h.w / 2 + sw, bot - 34, h.w, 34, 8); ctx.fill();
    ctx.strokeStyle = '#ff4dd2'; ctx.lineWidth = 2.5; ctx.shadowColor = '#ff4dd2'; ctx.shadowBlur = 10; rr(x - h.w / 2 + 3 + sw, bot - 31, h.w - 6, 28, 6); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ff9fe8'; ctx.font = '700 15px Fredoka,system-ui'; ctx.textAlign = 'center'; ctx.fillText('✕', x + sw, bot - 16);
  }
  // nota kapıları
  for (const g of G.gates) {
    const x = sx(g.x); if (x < -60 || x > VW + 60) continue;
    const o = openSpan(g.d, g.cents), top = o.top - R, bot = o.bot + R, col = COLORS[g.d], w = g.w;
    const wall = (y0, y1) => { if (y1 <= y0) return; ctx.fillStyle = '#5a3fa6'; ctx.fillRect(x - w / 2, y0, w, y1 - y0);
      ctx.fillStyle = '#46308a'; for (let y = Math.ceil(y0 / 14) * 14; y < y1; y += 14) ctx.fillRect(x - w / 2, y, w, 3);
      ctx.globalAlpha = 0.6; ctx.fillStyle = col; ctx.fillRect(x - w / 2, y0, 3, y1 - y0); ctx.fillRect(x + w / 2 - 3, y0, 3, y1 - y0); ctx.globalAlpha = 1; };
    wall(-20, top); wall(bot, groundY);
    ctx.save(); ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fillStyle = col;
    rr(x - w / 2 - 4, top - 6, w + 8, 8, 4); ctx.fill(); rr(x - w / 2 - 4, bot - 2, w + 8, 8, 4); ctx.fill(); ctx.restore();
    ctx.globalAlpha = 0.85; ctx.fillStyle = col; ctx.font = '700 11px Fredoka,system-ui'; ctx.textAlign = 'center';
    ctx.fillText(NOTE_NAMES[g.d], x, top - 14); ctx.globalAlpha = 1;
  }
  const hoopDraw = front => { for (const h of G.hoops) {
    const x = sx(h.x); if (x < -40 || x > VW + 40) continue;
    const o = openSpan(h.d, h.cents), cy = (o.top + o.bot) / 2, ry = (o.bot - o.top) / 2 + R;
    ctx.save(); ctx.strokeStyle = h.done ? '#ffffff55' : '#ffd84d'; ctx.lineWidth = 6; ctx.shadowColor = '#ffd84d'; ctx.shadowBlur = h.done ? 0 : 12;
    ctx.beginPath(); ctx.ellipse(x, cy, 11, ry, 0, front ? Math.PI / 2 : -Math.PI / 2, front ? Math.PI * 1.5 : Math.PI / 2); ctx.stroke(); ctx.restore();
  } };
  hoopDraw(false);
  // melodi yolu
  ctx.lineWidth = 3; ctx.setLineDash([2, 7]); ctx.lineCap = 'round';
  for (let i = 0; i < G.coins.length - 1; i++) {
    const a = G.coins[i], b = G.coins[i + 1];
    if (a.ph !== b.ph || sx(b.x) < 0 || sx(a.x) > VW) continue;
    ctx.strokeStyle = '#ffffff40'; ctx.beginPath(); ctx.moveTo(sx(a.x), yOf(a.d)); ctx.lineTo(sx(b.x), yOf(b.d)); ctx.stroke();
  }
  ctx.setLineDash([]);
  // nota altınları
  const next = G.coins.find(c => !c.taken && !c.missed && c.x > G.x - 10);
  for (const c of G.coins) {
    if (c.taken) continue; const x = sx(c.x); if (x < -30 || x > VW + 30) continue;
    const y = yOf(c.d) + Math.sin(G.t * 4 + c.x * 0.02) * 2, r = Math.min(15, slot * 0.34);
    ctx.globalAlpha = c.missed ? 0.25 : 1;
    ctx.shadowColor = COLORS[c.d]; ctx.shadowBlur = c === next ? 22 : 10;
    ctx.fillStyle = COLORS[c.d]; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff66'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, 6.28); ctx.fill();
    if (c.heart) { // can notası: notanın rengi + kalp
      ctx.save(); ctx.shadowColor = '#ff6b8b'; ctx.shadowBlur = 16; ctx.strokeStyle = '#ff6b8b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r + 4 + Math.sin(G.t * 6) * 1.5, 0, 6.28); ctx.stroke(); ctx.restore();
      ctx.save(); ctx.shadowColor = '#ff2d6b'; ctx.shadowBlur = 6; ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(r * 1.3) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('❤', x, y + 2); ctx.restore();
    } else { ctx.fillStyle = '#1b0f35'; ctx.font = '700 ' + Math.round(r * 1.2) + 'px system-ui'; ctx.textAlign = 'center'; ctx.fillText('♪', x, y + 1); }
    if (c === next && G.state === 'play') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.t * 10); ctx.beginPath(); ctx.arc(x, y, r + 6, 0, 6.28); ctx.stroke(); }
    ctx.globalAlpha = c.missed ? 0.2 : 0.85; ctx.fillStyle = '#fff'; ctx.font = '600 10px Fredoka,system-ui'; ctx.fillText(NOTE_NAMES[c.d], x, y + r + 9);
    ctx.globalAlpha = 1;
  }
  // parçacıklar
  for (const p of G.parts) {
    const a = Math.max(0, p.life / p.max); ctx.globalAlpha = a; ctx.fillStyle = p.color;
    if (p.k === 'dot') { ctx.beginPath(); ctx.arc(sx(p.x), p.y, 3 * a + 1, 0, 6.28); ctx.fill(); }
    else if (p.k === 'note') { ctx.font = '700 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText(p.text, sx(p.x), p.y); }
    else { ctx.font = '700 16px Fredoka,system-ui'; ctx.textAlign = 'center'; ctx.strokeStyle = '#1b0f35'; ctx.lineWidth = 4; ctx.strokeText(p.text, sx(p.x), p.y); ctx.fillText(p.text, sx(p.x), p.y); }
  }
  ctx.globalAlpha = 1;
  drawHero(PX, yOf(P.d), next);
  hoopDraw(true);
  // sesin göstergesi (sol kenar)
  if (V.on && G.state === 'play') {
    const y = yOf(Math.max(-0.5, V.raw)), col = V.locked ? COLORS[Math.max(0, Math.min(G.nNotes - 1, V.lock))] : '#ffffffaa';
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(50, y - 8); ctx.lineTo(62, y); ctx.lineTo(50, y + 8); ctx.closePath(); ctx.fill();
  }
  if (G.flash > 0) { ctx.fillStyle = 'rgba(255,60,90,' + G.flash * 0.5 + ')'; ctx.fillRect(-20, -20, VW + 40, VHt + 40); }
}

function drawHero(x, y, next) {
  if (P.inv > 0 && G.state === 'play' && Math.floor(P.inv * 12) % 2) ctx.globalAlpha = 0.4;
  const off = G.state === 'play' && V.on && !V.locked;   // ses var ama nota tutmuyor
  ctx.save(); ctx.translate(x, y);
  if (G.state === 'play' && V.on && V.locked) {         // nota tuttu: notanın renginde hale
    ctx.save(); ctx.shadowColor = COLORS[V.lock]; ctx.shadowBlur = 18; ctx.strokeStyle = COLORS[V.lock]; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, R + 6 + Math.sin(G.t * 12) * 1.5, 0, 6.28); ctx.stroke(); ctx.restore();
  }
  if (G.shield && G.state === 'play') { // kalkan baloncuğu
    ctx.save(); ctx.globalAlpha *= 0.85; const rb = R + 11 + Math.sin(G.t * 5) * 1.5;
    const gb = ctx.createRadialGradient(-rb * 0.3, -rb * 0.3, rb * 0.2, 0, 0, rb); gb.addColorStop(0, '#ffffff10'); gb.addColorStop(0.85, '#7fe3ff33'); gb.addColorStop(1, '#7fe3ffcc');
    ctx.fillStyle = gb; ctx.beginPath(); ctx.arc(0, 0, rb, 0, 6.28); ctx.fill(); ctx.restore();
  }
  if (G.star > 0 && G.state === 'play') { ctx.save(); ctx.fillStyle = '#ffe066'; for (let i = 0; i < 5; i++) { const a = G.t * 4 + i * 1.2566; ctx.globalAlpha = 0.8; ctx.font = '12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✦', Math.cos(a) * (R + 14), Math.sin(a) * (R + 14) + 4); } ctx.restore(); }
  if (off) ctx.globalAlpha *= 0.55;
  // gölge
  ctx.save(); ctx.globalAlpha *= 0.3; ctx.fillStyle = '#000'; const gh = Math.max(0.3, 1 - (groundY - R - y) / 300);
  ctx.beginPath(); ctx.ellipse(0, groundY - y, R * gh, 4 * gh, 0, 0, 6.28); ctx.fill(); ctx.restore();
  const sq = P.squash * 0.25, tilt = Math.max(-0.35, Math.min(0.35, -P.v * 0.04));
  ctx.rotate(P.ground ? 0 : tilt);
  ctx.scale(1 + sq, 1 - sq);
  const r = R;
  // bacaklar / kanatlar
  if (P.ground) {
    ctx.strokeStyle = '#ff8a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const a = Math.sin(P.run) * 0.8;
    for (const s of [a, -a]) { ctx.beginPath(); ctx.moveTo(0, r * 0.7); ctx.lineTo(Math.sin(s) * r * 0.6, r + 2); ctx.stroke(); }
  } else {
    const f = Math.sin(G.t * (V.on ? 22 : 10)) * 0.6;
    ctx.fillStyle = '#ffe28a';
    for (const s of [-1, 1]) { ctx.save(); ctx.translate(-r * 0.55, s * r * 0.15); ctx.rotate(s * (0.6 + f)); ctx.beginPath(); ctx.ellipse(-r * 0.4, 0, r * 0.55, r * 0.22, 0, 0, 6.28); ctx.fill(); ctx.restore(); }
  }
  // gövde
  const bg = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r);
  bg.addColorStop(0, '#fff1a0'); bg.addColorStop(1, '#ffb52e');
  ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill();
  ctx.fillStyle = '#fff6d0'; ctx.beginPath(); ctx.ellipse(r * 0.1, r * 0.45, r * 0.55, r * 0.38, 0, 0, 6.28); ctx.fill();
  // kulaklık
  ctx.strokeStyle = '#ff4d8d'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -r * 0.05, r * 0.98, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  ctx.fillStyle = '#ff4d8d'; rr(-r * 1.1, -r * 0.35, r * 0.35, r * 0.6, 4); ctx.fill();
  // gözler (sonraki notaya bakar)
  const look = next ? Math.max(-1, Math.min(1, (yOf(next.d) - y) / 80)) : 0;
  for (const ex of [r * 0.1, r * 0.55]) {
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, -r * 0.2, r * 0.22, r * 0.27, 0, 0, 6.28); ctx.fill();
    ctx.fillStyle = '#1b0f35'; ctx.beginPath(); ctx.arc(ex + r * 0.07, -r * 0.2 + look * r * 0.1, r * 0.12, 0, 6.28); ctx.fill();
  }
  ctx.fillStyle = '#ff7a9a66'; ctx.beginPath(); ctx.arc(r * 0.75, r * 0.15, r * 0.14, 0, 6.28); ctx.fill();
  // ağız
  const m = P.mouth;
  if (m > 0.08) { ctx.fillStyle = '#c2185b'; ctx.beginPath(); ctx.ellipse(r * 0.38, r * 0.3, r * 0.18 + m * r * 0.05, r * 0.08 + m * r * 0.26, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = '#ff7aa8'; ctx.beginPath(); ctx.ellipse(r * 0.38, r * 0.3 + m * r * 0.14, r * 0.1, m * r * 0.09, 0, 0, 6.28); ctx.fill(); }
  else { ctx.strokeStyle = '#1b0f35'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r * 0.38, r * 0.15, r * 0.18, 0.3, Math.PI - 0.3); ctx.stroke(); }
  ctx.restore(); ctx.globalAlpha = 1;
}

/* ---------- Döngü ---------- */
let last = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
  if (G.state === 'calib') calibStep(dt); else update(dt);
  guideUpdate();
  draw();
  requestAnimationFrame(frame);
}

/* ---------- Ses ayarı: gerçek Do (C) notası ----------
   1) sessizlik → gürültü tabanı  2) rahat “Aaa” → hangi oktavdaki Do sana uygun
   3) oyun Do'yu çalar, sen aynısını söylersin; ±30 cent içinde 1.2 sn tutunca baz = tam C
   4) notaları dene */
const CAL = { phase: 0, t: 0, run: 0, rms: [], midis: [], echo: [], hold: 0, quiet: 0, refC: 48, tries: 0, sinceRef: 0 };
const nearestC = m => 12 * Math.round(m / 12);
const clampC = c => Math.max(36, Math.min(72, c));
function buildScalePreview() {
  $('#scalePreview').innerHTML = NOTE_NAMES.slice(0, G.nNotes).map((n, i) => '<span data-i="' + i + '">' + n + '</span>').join('');
}
function startCalib() {
  G.nNotes = DF().notes; layout(); buildScalePreview();
  Object.assign(CAL, { phase: 0, t: 0, run: 0, rms: [], midis: [], hold: 0, quiet: 0, tries: 0 });
  G.state = 'calib'; show('calib');
  $('#calibGo').disabled = true; for (const id of ['#refPlay', '#octSwap', '#tuneMeter', '#tuneTxt']) $(id).classList.add('hidden');
  $('#calibMsg').textContent = 'Mikrofon hazırlanıyor, bir saniye sessiz kal…';
  $('#calibHint').innerHTML = 'Birazdan gerçek <b>Do</b> çalacak; aynısını söyleyeceksin.';
  $('#ringFill').style.strokeDashoffset = 327; $('#calibNote').textContent = '🤫';
}
function playRef() {
  audioCtx();
  const f = 440 * Math.pow(2, (CAL.refC - 69) / 12);
  const was = G.muted; G.muted = false;               // referans Do her zaman duyulsun
  tone(f, 1.4, 'triangle', 0.12); tone(f * 2, 1.4, 'sine', 0.03);
  G.muted = was;
  CAL.quiet = 1.6; CAL.hold = 0; CAL.sinceRef = 0; CAL.echo = []; TR.on = false;        // çalarken mikrofonu dinleme (kendi sesini Do sanmasın)
  $('#calibNote').innerHTML = '🔊<small class="cn">Do · ' + absName(CAL.refC) + '</small>';
}
function toMatch(c) {
  CAL.refC = clampC(c); CAL.phase = 2; CAL.t = 0; CAL.hold = 0;
  $('#calibMsg').innerHTML = 'Dinle: bu <b>Do</b> (' + absName(CAL.refC) + ')';
  $('#calibHint').innerHTML = 'Şimdi aynı notayı “Aaaa” diye söyle ve tut. Halka dolunca baz tam Do olur.';
  for (const id of ['#refPlay', '#octSwap', '#tuneMeter', '#tuneTxt']) $(id).classList.remove('hidden');
  $('#tuneTxt').textContent = 'Dinle, sonra aynısını söyle';
  playRef();
}
function setBase(m, msg) {
  G.baseMidi = G.calMidi = m; CAL.phase = 3;
  $('#calibGo').disabled = false; for (const id of ['#refPlay', '#octSwap', '#tuneMeter', '#tuneTxt']) $(id).classList.add('hidden');
  $('#calibMsg').innerHTML = msg || ('Do = <b>' + absName(G.baseMidi) + '</b> · tam oturdu 🎉');
  $('#calibHint').innerHTML = 'Şimdi aşağı yukarı söyleyerek notaları dene. Hazırsan koş!';
  $('#ringFill').style.strokeDashoffset = 0;
  tone(noteHz(0), 0.25, 'triangle', 0.05); tone(noteHz(2), 0.25, 'triangle', 0.05, 0, 0.12); tone(noteHz(4), 0.35, 'triangle', 0.05, 0, 0.24);
}
function calibStep(dt) {
  CAL.t += dt;
  const wasOn = TR.on;
  const r = readMic();
  V.level = Math.min(1, V.rms * 12);
  if (CAL.phase === 0) {
    CAL.rms.push(V.rms);
    $('#ringFill').style.strokeDashoffset = 327 * (1 - Math.min(1, CAL.t / 0.8));
    if (CAL.t > 0.8) { noiseFloor = Math.min(0.03, median(CAL.rms)); $('#ringFill').style.strokeDashoffset = 327; toMatch(48); }
    return;
  }
  if (CAL.quiet > 0) {
    // Do çalarken hoparlörün mikrofona ne kadar sızdığını ölç (oyundaki ipucu sesi için)
    CAL.quiet -= dt; if (CAL.quiet < 1.3 && CAL.quiet > 0.3) CAL.echo.push(V.rms);
    if (CAL.quiet <= 0 && CAL.echo.length) echoGate = Math.min(0.03, median(CAL.echo) * (GUIDE_VOL * 1.3 / 0.15) * 2.5);
    return;
  }
  trackPitch(TR, r, dt);
  V.on = TR.on; V.midi = TR.sm;
  CAL.run = V.on ? (wasOn ? CAL.run + dt : 0) : 0;
  const steady = V.on && CAL.run > 0.25;               // notanın başındaki kaymayı atla
  if (CAL.phase === 1) {
    $('#calibNote').textContent = V.on ? absName(V.midi) : '…';
    if (steady) { CAL.midis.push(V.midi); $('#ringFill').style.strokeDashoffset = 327 * (1 - Math.min(1, CAL.midis.length / 30)); }
    // rahat sesinin hemen altındaki Do: kalın seste C3, ince seste C4 gibi
    if (CAL.midis.length >= 30) toMatch(12 * Math.floor((median(CAL.midis) + 3) / 12));
  } else if (CAL.phase === 2) {
    // Do'ya ulaşmadan geçilmez: gösterge + sözlü yönlendirme, ±30 cent'te 1.2 sn tutmak gerekir
    CAL.sinceRef += dt;
    const nd = $('#needle'), tt = $('#tuneTxt');
    if (!V.on) {
      nd.classList.remove('on', 'ok');
      $('#calibNote').innerHTML = '…<small class="cn">Do · ' + absName(CAL.refC) + '</small>';
      if (CAL.hold > 0) tt.textContent = 'Sesi kesme, tut!';
      CAL.hold = Math.max(0, CAL.hold - dt * 0.5);
    } else {
      // Hedef Do'ya göre fark (oktavdan bağımsız, −6…+6 yarım ton)
      let off = V.midi - CAL.refC; off -= 12 * Math.round(off / 12);
      const cents = Math.round(off * 100), ok = Math.abs(cents) <= 30;
      const pos = 50 + Math.sign(off) * Math.sqrt(Math.min(6, Math.abs(off)) / 6) * 48;
      nd.style.left = pos + '%'; nd.classList.add('on'); nd.classList.toggle('ok', ok);
      const semi = Math.round(Math.abs(off));
      let txt;
      if (ok) txt = CAL.hold > 0.4 ? 'Tam Do! Tut… ✓' : 'Tam Do ✓';
      else if (semi >= 2) txt = (off > 0 ? 'Daha kalın söyle ↓' : 'Daha ince söyle ↑') + ' (' + semi + ' yarım ton)';
      else if (Math.abs(cents) > 60) txt = off > 0 ? 'Biraz daha kalın ↓' : 'Biraz daha ince ↑';
      else txt = off > 0 ? 'Çok az alçalt ↓ (+' + cents + ' cent)' : 'Çok az yükselt ↑ (' + cents + ' cent)';
      tt.textContent = txt; tt.style.color = ok ? '#6bdb6b' : '';
      $('#calibNote').innerHTML = (Math.abs(off) <= 0.5 ? 'Do' : absName(V.midi)) + '<small class="cn">' + (cents > 0 ? '+' : '') + cents + ' cent</small>';
      if (steady && ok) {
        CAL.hold += dt;
        if (CAL.hold >= 1.2) { setBase(clampC(nearestC(V.midi))); return; } // söylediği oktavın tam Do'su
      } else CAL.hold = Math.max(0, CAL.hold - dt * 0.6);
      if (CAL.hold > 0.05) CAL.sinceRef = 0;
    }
    $('#ringFill').style.strokeDashoffset = 327 * (1 - Math.min(1, CAL.hold / 1.2));
    // uzun süre olmuyorsa Do'yu kendiliğinden tekrar çal
    if (CAL.sinceRef > 9 && !V.on) { CAL.tries++; playRef(); $('#calibHint').innerHTML = 'Do\'yu bir kez daha dinle ve aynı yükseklikte söyle.' + (CAL.tries >= 2 ? ' Çok kalın ya da ince geliyorsa <b>Do\'yu bir oktav değiştir</b>.' : ''); }
  } else {
    const rel = foldRel(V.midi), d = V.on ? nearestNote(rel, G.nNotes) : -1;
    const cents = Math.round((rel - SEMIS[Math.max(0, d)]) * 100);
    $('#calibNote').innerHTML = V.on ? NOTE_NAMES[d] + '<small class="cn">' + (Math.abs(cents) <= 30 ? 'tam ✓' : (cents > 0 ? '+' : '') + cents + ' cent') + '</small>' : '…';
    document.querySelectorAll('#scalePreview span').forEach((s, i) => { const hit = i === d; s.classList.toggle('hit', hit); s.style.background = hit ? COLORS[i] : ''; });
  }
}

/* ---------- Girdiler ---------- */
document.querySelectorAll('.seg button').forEach(b => b.onclick = () => {
  G.diff = +b.dataset.diff;
  document.querySelectorAll('.seg button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); });
  if (G.state === 'demo') { G.nNotes = DF().notes; layout(); resetWorld(); ensureLevel(); }
});
$('#micStart').onclick = async () => {
  try {
    if (!micOn) { $('#micStart').textContent = 'Mikrofon açılıyor…'; await startMic(); }
    G.useMic = true; startCalib();
  } catch (e) {
    $('#micStart').textContent = '🎤 Mikrofonla başla';
    $('#bestLine').textContent = 'Mikrofona izin verilmedi. Tarayıcı ayarlarından izin ver ya da mikrofonsuz dene.';
  }
};
$('#touchStart').onclick = () => { audioCtx(); G.useMic = false; G.baseMidi = G.calMidi = 60; startGame(); banner('Ekrana dokun ve parmağını<br>yukarı-aşağı kaydır<small>ya da 1–' + G.nNotes + ' tuşlarını basılı tut</small>', 3200); };
$('#calibGo').onclick = startGame;
$('#calibRedo').onclick = startCalib;
$('#refPlay').onclick = playRef;
$('#octSwap').onclick = () => { // kalın/ince sese göre diğer oktavdaki Do
  CAL.refC = CAL.refC >= 60 ? CAL.refC - 12 : CAL.refC + 12;
  $('#calibMsg').innerHTML = 'Dinle: bu <b>Do</b> (' + absName(CAL.refC) + ')'; playRef();
};
$('#pauseBtn').onclick = pauseGame;
$('#resume').onclick = resumeGame;
$('#toMenu').onclick = toDemo;
$('#again').onclick = () => G.useMic ? startGame() : $('#touchStart').onclick();
$('#overMenu').onclick = toDemo;
$('#muteBtn').onclick = () => { G.muted = !G.muted; $('#muteBtn').textContent = G.muted ? '🔇' : '🔊'; };

cv.addEventListener('pointerdown', e => { if (G.state !== 'play' || G.useMic) return; pointer.down = true; pointer.y = e.clientY / S; cv.setPointerCapture(e.pointerId); });
cv.addEventListener('pointermove', e => { if (pointer.down) pointer.y = e.clientY / S; });
const up = () => { pointer.down = false; };
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
addEventListener('keydown', e => {
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') { G.state === 'play' ? pauseGame() : resumeGame(); return; }
  const n = parseInt(e.key, 10);
  if (!G.useMic && n >= 1 && n <= G.nNotes) keyDeg = n - 1;
});
addEventListener('keyup', e => { const n = parseInt(e.key, 10); if (n >= 1 && n - 1 === keyDeg) keyDeg = null; });
addEventListener('resize', layout);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
addEventListener('blur', () => { keyDeg = null; pointer.down = false; });

/* ---------- Başlat ---------- */
toDemo();
requestAnimationFrame(frame);
