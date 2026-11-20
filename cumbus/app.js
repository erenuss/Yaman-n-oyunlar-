/* Cümbüş — parmakla, elle, yüzle ve sesle müzik yapılan ritim oyunu.
   El ve yüz takibi cihazda yapılır (MediaPipe), ses cihazda çözümlenir. Hiçbir şey dışarı gönderilmez. */
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const cv = $('#cv'), ctx = cv.getContext('2d'), vid = $('#vid');
const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
let W = innerWidth, H = innerHeight;
function resize() { const d = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = Math.round(W * d); cv.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0); }
addEventListener('resize', resize); resize();

/* ---------- kayıt ---------- */
const SKEY = 'cumbus1';
const SV = { stars: {}, best: {}, seen: {}, lc: 0, lm: 0, cam: true, vol: 0.9 };
try { Object.assign(SV, JSON.parse(localStorage.getItem(SKEY) || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem(SKEY, JSON.stringify(SV)); } catch (e) {} };

/* ---------- müzik ---------- */
const CH = { C: [60, 64, 67], Dm: [62, 65, 69], Em: [64, 67, 71], F: [65, 69, 72], G: [67, 71, 74], Am: [69, 72, 76] };
const PENTA = [67, 69, 72, 74, 76, 79, 81, 84];
const SOLF = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
const JAM_NOTES = [[60, 62, 64, 67], [69, 72, 74, 76]]; // sol el kalın, sağ el ince
const JAM_PROG = ['C', 'G', 'Am', 'F'];

/* ---------- şeritler ---------- */
const LANES = [
  { id: 'P', emoji: '👌', name: 'Parmak', color: '#ffd23f', key: 'D', teach: 'Başparmağını herhangi bir parmağının ucuna değdir. Her değişte bir nota!' },
  { id: 'A', emoji: '👏', name: 'Alkış', color: '#ff5d8f', key: 'F', teach: 'Ellerini kameranın önünde çırp. Tek elle de olur: elini yumruk yap.' },
  { id: 'M', emoji: '😮', name: 'Ağız', color: '#3ee6d0', key: 'J', teach: 'Ağzını kocaman aç, sonra kapat. Koro senin yerine “Aaa!” der.' },
  { id: 'B', emoji: '🎤', name: 'Ses', color: '#a98bff', key: 'K', teach: 'Kısa ve net bir “Bum!” de. Kulaklıkla daha iyi duyar.' },
];
const KEYS = { d: 0, f: 1, j: 2, k: 3 };

/* ---------- şarkılar ---------- */
const rep = (s, n) => Array(n).fill(s);
const LEVELS = [
  { name: 'İlk Tık', bpm: 80, seed: 11, prog: ['C', 'G', 'Am', 'F'], form: ['a', 'b', 'c', 'b', 'z'],
    pats: { a: rep('P.......P.......', 4), b: rep('P...P...P...P...', 4),
      c: ['P...P...P.P.P...', 'P...P...P.......', 'P...P...P.P.P...', 'P...P...P...P...'], z: ['P...............'] } },
  { name: 'Alkış Zamanı', bpm: 86, seed: 23, prog: ['C', 'Am', 'F', 'G'], form: ['a', 'b', 'c', 'b', 'z'],
    pats: { a: rep('P...P...A.......', 4), b: rep('P.P.P...A...A...', 4), c: rep('A...P.P.A...P.P.', 4), z: ['A...A...A.......'] } },
  { name: 'Aaa!', bpm: 90, seed: 37, prog: ['Am', 'F', 'C', 'G'], form: ['a', 'b', 'c', 'b', 'z'],
    pats: { a: rep('P...P...M.......', 4), b: rep('P...A...P...M...', 4),
      c: ['M.......A...A...', 'P.P.P...M.......', 'M.......A...A...', 'P.P.P.P.M.......'], z: ['M...............'] } },
  { name: 'Bum!', bpm: 92, seed: 41, prog: ['F', 'G', 'C', 'Am'], form: ['a', 'b', 'c', 'd', 'z'],
    pats: { a: rep('B.......P...P...', 4), b: rep('B...P...B...P.P.', 4), c: rep('B...A...B...A...', 4), d: rep('B.P.A...B.P.A...', 4), z: ['B...A...B.......'] } },
  { name: 'Tam Orkestra', bpm: 96, seed: 53, prog: ['C', 'G', 'Am', 'F'], form: ['a', 'b', 'c', 'd', 'b', 'z'],
    pats: { a: rep('B...P.P.A...M...', 4), b: rep('B...P...A...P.P.', 4), c: rep('M...P.P.B...A...', 4),
      d: ['B.P.A.P.M...A...', 'B.P.A.P.M.......', 'B.P.A.P.M...A...', 'M.......M.......'], z: ['B...............'] } },
  { name: 'Gece Treni', bpm: 106, seed: 67, prog: ['Am', 'F', 'C', 'G'], form: ['a', 'b', 'c', 'd', 'a', 'z'],
    pats: { a: rep('B.P.A.P.B.P.A.P.', 4), b: rep('B.P.M...B.P.A...', 4), c: rep('M...P.P.P.P.B.A.', 4), d: rep('B.P.A.P.M.P.A.B.', 4), z: ['M...B...A.......'] } },
  { name: 'Cümbüş', bpm: 118, seed: 79, prog: ['F', 'G', 'Em', 'Am'], form: ['a', 'b', 'c', 'd', 'b', 'c', 'e', 'z'],
    pats: { a: rep('B.P.A.P.B.P.A.P.', 4), b: rep('B.P.M.P.B.P.A.P.', 4), c: rep('M.P.P.A.B.P.P.A.', 4), d: rep('B.P.A.P.M.P.A.B.', 4),
      e: rep('M...B...A...B...', 4), z: ['M...............'] } },
];
function rng32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
/* Parmak notaları: güçlü vuruşta akorun sesi, arada pentatonikte küçük adımlar. Tekrarlanan bölüm aynı ezgiyi çalar. */
function melodyFor(pat, ch, rnd, st) {
  const pcs = ch.map(n => n % 12), out = [];
  for (let s = 0; s < 16; s++) {
    if (pat[s] !== 'P') continue;
    let i = st.i;
    if (s % 4 === 0) { let best = i, bd = 99; PENTA.forEach((n, j) => { if (pcs.includes(n % 12)) { const d = Math.abs(j - i) + rnd() * 1.6; if (d < bd) { bd = d; best = j; } } }); i = best; }
    else { const dir = i <= 1 ? 1 : i >= PENTA.length - 2 ? -1 : (rnd() < 0.5 ? -1 : 1); i = clamp(i + dir * (rnd() < 0.78 ? 1 : 2), 0, PENTA.length - 1); }
    st.i = i; out.push(PENTA[i]);
  }
  return out;
}
const GAP = [2, 4, 4, 2]; // aynı şeritte iki nota arası en az (16'lık)
function buildChart(L) {
  const rnd = rng32(L.seed), mel = {}, st = { i: 3 }, bars = [];
  for (const name of L.form) {
    const sec = L.pats[name];
    if (!mel[name]) mel[name] = sec.map((p, j) => melodyFor(p, CH[L.prog[j % L.prog.length]], rnd, st));
    sec.forEach((p, j) => bars.push({ p, m: mel[name][j], ch: L.prog[j % L.prog.length] }));
  }
  const notes = [], last = [-99, -99, -99, -99];
  bars.forEach((B, b) => {
    let mi = 0;
    for (let s = 0; s < 16; s++) {
      const lane = 'PAMB'.indexOf(B.p[s]); if (lane < 0) continue;
      const k = b * 16 + s, midi = lane === 0 ? B.m[mi++] : 0;
      if (k - last[lane] < GAP[lane]) continue;
      last[lane] = k; notes.push({ k, lane, midi, chord: B.ch, st: 0, t: 0, g: 0 });
    }
  });
  return { notes, chords: bars.map(b => b.ch), nBars: bars.length, lanes: [...new Set(notes.map(n => n.lane))].sort() };
}

/* ---------- ses motoru ---------- */
let AC = null, master = null, revIn = null, NB = null, SAT = null, paused = false;
function initAudio() {
  if (!AC) {
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    AC = new C({ latencyHint: 'interactive' });
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.16;
    master = AC.createGain(); master.gain.value = SV.vol; master.connect(comp); comp.connect(AC.destination);
    const conv = AC.createConvolver(); conv.buffer = makeIR(2.4);
    revIn = AC.createGain(); const ro = AC.createGain(); ro.gain.value = 0.32; revIn.connect(conv); conv.connect(ro); ro.connect(master);
    NB = AC.createBuffer(1, AC.sampleRate * 2.5, AC.sampleRate); const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    SAT = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; SAT[i] = Math.tanh(x * 2.2); }
    setInterval(tick, 25);
  }
  if (AC.state !== 'running' && !paused) AC.resume();
  try { const s = AC.createBufferSource(); s.buffer = AC.createBuffer(1, 1, 22050); s.connect(AC.destination); s.start(0); } catch (e) {}
  return AC;
}
function makeIR(sec) { const n = Math.floor(AC.sampleRate * sec), b = AC.createBuffer(2, n, AC.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); } return b; }
const outLat = () => AC ? clamp((AC.outputLatency || 0) + (AC.baseLatency || 0), 0, 0.25) : 0;
function env(t, peak, a, d, rev = 0) {
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  g.connect(master); if (rev) { const s = AC.createGain(); s.gain.value = rev; g.connect(s); s.connect(revIn); } return g;
}
function osc(type, f, t, dur, dest) { const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
function nz(t, dur, dest) { const s = AC.createBufferSource(); s.buffer = NB; s.connect(dest); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02); return s; }
function filt(type, f, q, dest) { const b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(dest); return b; }

/* kalimba / çan */
function pluck(m, t, v = 1) { const f = mtof(m); for (const [r, a, d] of [[1, 1, 1.4], [2, 0.22, 0.5], [3.98, 0.08, 0.16], [5.43, 0.09, 0.06]]) osc('sine', f * r, t, d, env(t, 0.3 * v * a, 0.003, d, 0.32)); }
function kick(t, v = 1) { const o = osc('sine', 160, t, 0.38, env(t, 0.95 * v, 0.002, 0.34)); o.frequency.exponentialRampToValueAtTime(48, t + 0.11); nz(t, 0.03, filt('lowpass', 2800, 0.7, env(t, 0.22 * v, 0.001, 0.02))); }
function hat(t, v = 1, open = false) { nz(t, open ? 0.3 : 0.08, filt('highpass', 7500, 0.8, env(t, 0.2 * v, 0.001, open ? 0.22 : 0.045))); }
function shaker(t, v = 1) { nz(t, 0.06, filt('bandpass', 6000, 1.2, env(t, 0.12 * v, 0.01, 0.04))); }
function snare(t, v = 1) { nz(t, 0.22, filt('bandpass', 1900, 0.7, env(t, 0.45 * v, 0.001, 0.16, 0.15))); const o = osc('triangle', 200, t, 0.1, env(t, 0.3 * v, 0.001, 0.08)); o.frequency.exponentialRampToValueAtTime(140, t + 0.08); }
function clap(t, v = 1) { for (let i = 0; i < 3; i++) nz(t + i * 0.011, 0.03, filt('bandpass', 1250, 1.3, env(t + i * 0.011, 1.2 * v, 0.001, 0.018))); nz(t + 0.033, 0.3, filt('bandpass', 1150, 1.1, env(t + 0.033, 1.3 * v, 0.002, 0.24, 0.35))); }
function crash(t, v = 1) { nz(t, 2, filt('highpass', 4500, 0.5, env(t, 0.26 * v, 0.003, 1.8, 0.3))); }
function tom(m, t, v = 1) { const o = osc('sine', mtof(m) * 1.6, t, 0.4, env(t, 0.7 * v, 0.002, 0.35, 0.15)); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.08); }
function boom(root, t, v = 1) { // "Bum!": akorun kökünde 808
  const f = mtof(root), sh = AC.createWaveShaper(); sh.curve = SAT; sh.connect(env(t, 0.5 * v, 0.003, 0.9));
  const o = osc('sine', f * 3, t, 1, sh); o.frequency.exponentialRampToValueAtTime(f, t + 0.07); kick(t, 0.6 * v);
}
function bass(m, t, dur, v = 1) { const g = env(t, 0.3 * v, 0.005, dur), lp = filt('lowpass', 600, 4, g); lp.frequency.setValueAtTime(1500, t); lp.frequency.exponentialRampToValueAtTime(280, t + dur); osc('sawtooth', mtof(m), t, dur, lp); osc('sine', mtof(m), t, dur, g); }
function pad(ch, t, dur, E) {
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.045, t + 0.25); g.gain.setValueAtTime(0.045, t + dur - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
  g.connect(master); const s = AC.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(revIn);
  const lp = filt('lowpass', 700 + E * 380, 0.6, g);
  for (const m of ch) for (const dt of [-7, 7]) { const o = osc('sawtooth', mtof(m), t, dur + 0.35, lp); o.detune.value = dt; }
}
function vowelBank(dest) { // "a" ünlüsü: üç formant
  const inp = AC.createGain();
  for (const [f, a, q] of [[800, 1, 7], [1150, 0.6, 8], [2900, 0.28, 10]]) { const b = AC.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const g = AC.createGain(); g.gain.value = a * 0.8; inp.connect(b); b.connect(g); g.connect(dest); }
  return inp;
}
function vibrato(t, dur) { const l = AC.createOscillator(); l.frequency.value = 5.4; const g = AC.createGain(); g.gain.value = 7; l.connect(g); l.start(t); if (dur) l.stop(t + dur); return { l, g }; }
function choir(ch, t, dur = 0.75, v = 1) {
  const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5 * v, t + 0.05); g.gain.exponentialRampToValueAtTime(0.18 * v, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(master); const s = AC.createGain(); s.gain.value = 0.55; g.connect(s); s.connect(revIn);
  const vb = vowelBank(g), vi = vibrato(t, dur + 0.1);
  for (const m of ch) for (const dt of [-9, 9]) { const o = osc('sawtooth', mtof(m), t, dur, vb); o.detune.value = dt; vi.g.connect(o.detune); }
}
/* serbest çal: sürekli koro (ağız açıklığıyla) ve mırıltı synth'i */
let CHO = null, LEAD = null;
function choirOn() {
  if (CHO) return; const g = AC.createGain(); g.gain.value = 0; g.connect(master); const s = AC.createGain(); s.gain.value = 0.55; g.connect(s); s.connect(revIn);
  const vb = vowelBank(g), vi = vibrato(AC.currentTime), os = [];
  for (let i = 0; i < 3; i++) for (const dt of [-9, 9]) { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 262; o.detune.value = dt; vi.g.connect(o.detune); o.connect(vb); o.start(); os.push(o); }
  CHO = { g, os, vi, ch: null, lv: 0 };
}
function choirSet(lv, chName) {
  if (!CHO) return; const t = AC.currentTime;
  if (Math.abs(lv - CHO.lv) > 0.01) { CHO.g.gain.setTargetAtTime(lv * 0.45, t, 0.05); CHO.lv = lv; }
  if (chName !== CHO.ch) { CHO.ch = chName; CH[chName].forEach((m, i) => { CHO.os[i * 2].frequency.setTargetAtTime(mtof(m), t, 0.06); CHO.os[i * 2 + 1].frequency.setTargetAtTime(mtof(m), t, 0.06); }); }
}
function leadOn() {
  if (LEAD) return; const g = AC.createGain(); g.gain.value = 0; g.connect(master); const s = AC.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(revIn);
  const lp = filt('lowpass', 2400, 1, g), a = AC.createOscillator(), b = AC.createOscillator(); a.type = 'sawtooth'; b.type = 'square'; b.detune.value = 8; a.connect(lp); b.connect(lp); a.start(); b.start();
  LEAD = { g, a, b, lv: 0 };
}
function leadSet(m, lv) {
  if (!LEAD) return; const t = AC.currentTime;
  if (m) { LEAD.a.frequency.setTargetAtTime(mtof(m), t, 0.025); LEAD.b.frequency.setTargetAtTime(mtof(m), t, 0.025); }
  if (Math.abs(lv - LEAD.lv) > 0.005) { LEAD.g.gain.setTargetAtTime(lv * 0.16, t, lv > LEAD.lv ? 0.015 : 0.06); LEAD.lv = lv; }
}
function sustainOff() {
  const t = AC ? AC.currentTime : 0;
  for (const o of [CHO, LEAD]) if (o) { o.g.gain.setTargetAtTime(0, t, 0.05); setTimeout(() => { try { (o.os || [o.a, o.b]).forEach(x => x.stop()); o.vi && o.vi.l.stop(); o.g.disconnect(); } catch (e) {} }, 500); }
  CHO = LEAD = null;
}

/* ---------- sıralayıcı (ses saatine bağlı, önden planlar) ---------- */
const SCH = { on: false, t0: 0, sd: 0.15, step: 0, fn: null };
function schedStart(t0, sd, fn) { Object.assign(SCH, { on: true, t0, sd, step: 0, fn }); }
function tick() {
  if (!SCH.on || !AC || paused) return; const lim = AC.currentTime + 0.12; let n = 0;
  while (SCH.on && SCH.t0 + SCH.step * SCH.sd < lim && n++ < 64) { const t = SCH.t0 + SCH.step * SCH.sd; if (t >= AC.currentTime - 0.04) SCH.fn(SCH.step, t); SCH.step++; }
}
let beatPulse = 0, pulseAt = [];
function backing(s, t, ch, E, sd, o = {}) {
  if (s === 0) pad(ch, t, 16 * sd, E);
  if (s === 0 || s === 8) { kick(t, 0.5 + 0.07 * E); pulseAt.push(t); }
  if (E >= 3 && s === 10) kick(t, 0.35);
  if (E >= 1 && s % 2 === 0) hat(t, s % 4 === 2 ? 0.75 : 0.4, E >= 3 && (s === 6 || s === 14));
  if (E >= 2 && !o.noSnare && (s === 4 || s === 12)) snare(t, 0.4);
  if (E >= 2 && [0, 3, 6, 8, 11, 14].includes(s)) bass(ch[0] - 24 + (s === 6 || s === 14 ? 12 : 0), t, sd * 1.7, 0.55);
  if (E >= 3 && s % 2 === 1) pluck(ch[(s >> 1) % 3] + 12, t, 0.16);
  if (E >= 4 && s % 2 === 1) shaker(t, 0.8);
}

/* ---------- kamera + takip modelleri ---------- */
const VER = '0.10.14', CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const HAND_M = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const FACE_M = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
let handL = null, faceL = null, modelErr = false, camOn = false, stream = null, lastVT = -1, frameN = 0, detMs = 25;
let modelP = null;
function loadModels() {
  if (modelP) return modelP;
  modelP = (async () => {
    try {
      const vision = await import(`${CDN}/vision_bundle.mjs`);
      const fs = await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
      const mk = async (Cls, opt) => { try { return await Cls.createFromOptions(fs, opt('GPU')); } catch (e) { return await Cls.createFromOptions(fs, opt('CPU')); } };
      const [h, f] = await Promise.allSettled([
        mk(vision.HandLandmarker, d => ({ baseOptions: { modelAssetPath: HAND_M, delegate: d }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: 0.5, minHandPresenceConfidence: 0.45, minTrackingConfidence: 0.4 })),
        mk(vision.FaceLandmarker, d => ({ baseOptions: { modelAssetPath: FACE_M, delegate: d }, runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5 })),
      ]);
      if (h.status === 'fulfilled') handL = h.value; if (f.status === 'fulfilled') faceL = f.value;
      if (!handL && !faceL) modelErr = true;
    } catch (e) { console.error(e); modelErr = true; }
  })();
  return modelP;
}
const VIDC = { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } };
const AUDC = { echoCancellation: true, noiseSuppression: false, autoGainControl: false };
async function openMedia() {
  if (!navigator.mediaDevices?.getUserMedia) { toast('Bu tarayıcı kamera/mikrofon desteklemiyor'); return; }
  let s = null;
  try { s = await navigator.mediaDevices.getUserMedia({ video: VIDC, audio: AUDC }); }
  catch (e) {
    try { s = await navigator.mediaDevices.getUserMedia({ video: VIDC }); } catch (e2) {}
    try { const a = await navigator.mediaDevices.getUserMedia({ audio: AUDC }); if (s) a.getAudioTracks().forEach(t => s.addTrack(t)); else s = a; } catch (e3) {}
  }
  if (!s) { toast('Kamera/mikrofon açılamadı — klavyeyle ya da dokunarak oyna', 3500); return; }
  stream = s;
  if (s.getVideoTracks().length) { vid.srcObject = new MediaStream(s.getVideoTracks()); try { await vid.play(); } catch (e) {} camOn = true; loadModels(); }
  else toast('Kamera açılamadı — sesle, klavyeyle ya da dokunarak oyna');
  if (s.getAudioTracks().length) startMic(new MediaStream(s.getAudioTracks()));
  else if (camOn) toast('Mikrofon açılamadı — 🎤 için K tuşu');
}
/* video → ekran (aynalı, ekranı dolduracak şekilde) */
const VM = { sc: 1, ox: 0, oy: 0, dw: 0, dh: 0 };
function vmap() { const vw = vid.videoWidth || 640, vh = vid.videoHeight || 480; VM.sc = Math.max(W / vw, H / vh); VM.dw = vw * VM.sc; VM.dh = vh * VM.sc; VM.ox = (W - VM.dw) / 2; VM.oy = (H - VM.dh) / 2; }
const toS = p => ({ x: W - (VM.ox + p.x * VM.dw), y: VM.oy + p.y * VM.dh });

/* ---------- el hareketleri ---------- */
const TIPS = [8, 12, 16, 20], MCP = [5, 9, 13, 17];
const HAND_LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];
const mkHand = () => ({ on: false, now: false, seen: 0, f: [0, 1, 2, 3].map(() => ({ on: false, min: 1, max: 0 })), d: [1, 1, 1, 1], pin: -1, pinT: 0, fistArm: true, pts: null, size: 0, palm: null, flash: 0 });
const HS = [mkHand(), mkHand()];
const CLAP = { arm: true, r: 9, vel: 0, t: 0, both: false, mid: null };
let handSeenAt = 0, faceSeenAt = 0;
/* Çimdik ölçüsü gerçek dünya 3B koordinatlarında (metre): elin açısından ve kameraya uzaklıktan bağımsız.
   Başparmak ve parmak için ikişer nokta (uç + parmak yastığı) alınır, en yakın çift sayılır. */
const P_ON = 0.03, P_NEAR = 0.042, P_SWING = 0.018, P_OFF = 0.01, P_REL = 0.016;
const lerp3 = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: (a.z || 0) + ((b.z || 0) - (a.z || 0)) * k });
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
function pinchDist(w, k) {
  const tip = w[TIPS[k]], pad = lerp3(w[TIPS[k] - 1], tip, 0.6), tt = w[4], tp = lerp3(w[3], tt, 0.6);
  return Math.min(d3(tt, tip), d3(tt, pad), d3(tp, tip), d3(tp, pad));
}
function processHands(lms, wls = []) {
  const t = performance.now(), vw = vid.videoWidth || 640, vh = vid.videoHeight || 480;
  const hs = lms.map((lm, j) => { const px = lm.map(p => ({ x: p.x * vw, y: p.y * vh })); return { lm, px, w: wls[j], sx: toS(lm[0]).x }; });
  const slot = [null, null];
  if (hs.length >= 2) { hs.sort((a, b) => a.sx - b.sx); slot[0] = hs[0]; slot[1] = hs[1]; }
  else if (hs.length === 1) {
    const h = hs[0], w = toS(h.lm[0]);
    const dd = HS.map(S => S.on && S.pts ? Math.hypot(S.pts[0].x - w.x, S.pts[0].y - w.y) : 1e9);
    slot[dd[0] < 1e9 || dd[1] < 1e9 ? (dd[0] <= dd[1] ? 0 : 1) : (w.x < W / 2 ? 0 : 1)] = h;
  }
  if (hs.length) handSeenAt = t;
  for (let i = 0; i < 2; i++) {
    const h = slot[i], S = HS[i];
    S.now = !!h;
    if (!h) { // takip bir iki kare kopabilir: durumu hemen silme
      if (S.on && t - S.seen > 250) { Object.assign(S, mkHand()); }
      continue;
    }
    const P = h.px, size = Math.hypot(P[0].x - P[9].x, P[0].y - P[9].y) || 1;
    const w = h.w && h.w.length === 21 ? h.w : P.map(p => ({ x: p.x / size * 0.095, y: p.y / size * 0.095, z: 0 })); // yedek: 2B
    const was = S.on && t - S.seen < 300; S.on = true; S.seen = t; S.size = size; S.pts = h.lm.map(toS);
    S.palm = [0, 5, 9, 13, 17].reduce((a, k) => ({ x: a.x + P[k].x / 5, y: a.y + P[k].y / 5 }), { x: 0, y: 0 });
    const curl = TIPS.map((tp, k) => d3(w[tp], w[0]) < d3(w[MCP[k]], w[0]) * 1.3), nCurl = curl.filter(Boolean).length;
    // yumruk
    if (nCurl === 4 && S.fistArm) { S.fistArm = false; if (was) emit('fist', { hand: i, pos: S.pts[9] }); }
    if (nCurl <= 1) S.fistArm = true;
    // çimdik: her parmak ayrı; bırakmak için en yakın andan ~1 cm (en az 1.6 cm aralık) açmak yeter (hızlı ardışık vuruşlar kaçmaz)
    const rising = [];
    for (let k = 0; k < 4; k++) {
      const dk = pinchDist(w, k), f = S.f[k]; S.d[k] = dk;
      if (f.on) { f.min = Math.min(f.min, dk); if (dk > Math.max(P_REL, f.min + P_OFF)) { f.on = false; f.max = dk; } }
      else { f.max = Math.max(f.max, dk); if (dk < P_ON || (dk < P_NEAR && f.max - dk > P_SWING)) { f.on = true; f.min = f.max = dk; rising.push(k); } }
    }
    let pin = -1; for (let k = 0; k < 4; k++) if (S.f[k].on && (pin < 0 || S.d[k] < S.d[pin])) pin = k;
    S.pin = pin;
    if (rising.length) {
      let c = rising[0]; for (const k of rising) if (S.d[k] < S.d[c]) c = k;
      const fisty = curl.filter((v, j) => v && j !== c).length >= 3;
      if (was && !fisty && t - S.pinT > 70) {
        S.pinT = t; S.flash = 1; const a = S.pts[4], b = S.pts[TIPS[c]];
        emit('pinch', { hand: i, finger: c, pos: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } });
      }
    }
  }
  // alkış: iki avuç birbirine hızla yaklaşınca
  if (HS[0].now && HS[1].now) {
    const a = HS[0].palm, b = HS[1].palm, r = Math.hypot(a.x - b.x, a.y - b.y) / ((HS[0].size + HS[1].size) / 2);
    const dt = Math.max(0.016, (t - CLAP.t) / 1000); CLAP.vel = CLAP.both ? (r - CLAP.r) / dt : 0;
    const p0 = HS[0].pts[9], p1 = HS[1].pts[9]; CLAP.mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
    if (CLAP.arm && r < 1.25) { CLAP.arm = false; emit('clap', { pos: CLAP.mid }); }
    if (r > 2) CLAP.arm = true;
    CLAP.r = r; CLAP.t = t; CLAP.both = true;
  } else if (CLAP.both) { // eller birleşince takip birini kaybedebilir
    if (CLAP.arm && CLAP.r < 2.3 && CLAP.vel < -4 && t - CLAP.t < 150) { CLAP.arm = false; emit('clap', { pos: CLAP.mid }); }
    CLAP.both = false;
  }
}

/* ---------- yüz hareketleri ---------- */
const F = { on: false, jaw: 0, brow: 0, mOpen: false, bUp: false, mouth: null, top: null, size: 0, idx: null };
function processFace(r) {
  const bs = r.faceBlendshapes && r.faceBlendshapes[0] && r.faceBlendshapes[0].categories, lm = r.faceLandmarks && r.faceLandmarks[0];
  if (!bs || !lm) { F.on = false; return; }
  if (!F.idx) { F.idx = {}; bs.forEach((c, i) => F.idx[c.categoryName] = i); }
  const g = n => F.idx[n] !== undefined && bs[F.idx[n]] ? bs[F.idx[n]].score : 0;
  F.jaw = g('jawOpen'); F.brow = (g('browInnerUp') + (g('browOuterUpLeft') + g('browOuterUpRight')) / 2) / 2;
  const u = toS(lm[13]), l = toS(lm[14]), e1 = toS(lm[33]), e2 = toS(lm[263]);
  F.mouth = { x: (u.x + l.x) / 2, y: (u.y + l.y) / 2 }; F.size = Math.hypot(e1.x - e2.x, e1.y - e2.y); F.top = toS(lm[10]);
  const was = F.on; F.on = true; faceSeenAt = performance.now();
  if (!F.mOpen && F.jaw > 0.36) { F.mOpen = true; if (was) emit('mouth', { pos: F.mouth }); } else if (F.mOpen && F.jaw < 0.18) F.mOpen = false;
  if (!F.bUp && F.brow > 0.55) { F.bUp = true; if (was) emit('brow', { pos: F.top }); } else if (F.bUp && F.brow < 0.3) F.bUp = false;
}
function detect() {
  if (!camOn || vid.readyState < 2 || vid.currentTime === lastVT) return;
  lastVT = vid.currentTime; frameN++; vmap();
  const now = performance.now();
  // yalnız gereken model çalışır: ilk şarkılarda yüz takibi el takibini yavaşlatmasın
  const lanes = G.chart ? G.chart.lanes : [];
  const needH = MODE === 'jam' || (MODE === 'play' && (lanes.includes(0) || lanes.includes(1))) || (MODE === 'teach' && T.lane <= 1);
  const needF = MODE === 'jam' || (MODE === 'play' && lanes.includes(2)) || (MODE === 'teach' && T.lane === 2);
  if (handL && needH) { try { const r = handL.detectForVideo(vid, now); processHands(r.landmarks || [], r.worldLandmarks || []); } catch (e) {} }
  else if (HS[0].on || HS[1].on) { HS[0] = mkHand(); HS[1] = mkHand(); }
  if (faceL && needF && (frameN % 2 === 0 || !needH || !handL)) { try { const r = faceL.detectForVideo(vid, now); processFace(r); } catch (e) {} }
  else if (!needF) F.on = false;
  detMs = detMs * 0.9 + (performance.now() - now) * 0.1;
}
const camLat = () => 0.05 + Math.min(0.08, detMs / 1000) + SV.lc;
const micLat = () => 0.03 + SV.lm;

/* ---------- mikrofon: vuruş (bum/pa/ts) ve mırıltı perdesi ---------- */
const MIC = { on: false, an: null, buf: null, fb: null, rms: 0, lvl: 0, floor: 0.004, peak: 0, arm: true, lastOn: 0, gate: 0, n: 0, pitch: 0, conf: 0 };
function startMic(s) {
  try {
    const src = AC.createMediaStreamSource(s), hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 60;
    MIC.an = AC.createAnalyser(); MIC.an.fftSize = 8192; MIC.an.smoothingTimeConstant = 0; // ~170 ms ses geçmişi
    src.connect(hp); hp.connect(MIC.an);
    MIC.buf = new Float32Array(8192); MIC.on = true;
    setInterval(micTick, 12);
  } catch (e) { console.error(e); }
}
function micTick() {
  if (!MIC.on || paused) return;
  const b = MIC.buf; MIC.an.getFloatTimeDomainData(b);
  // Son ölçümden bu yana gelen bütün sesi 256 örneklik pencerelerle, eskiden yeniye tara:
  // takip modeli ana iş parçacığını meşgul etse de kısa bir alkış/“bum” kaçmasın.
  const now = AC.currentTime, sr = AC.sampleRate, N = b.length, nNew = clamp(Math.round((now - (MIC.lastT || now - 0.012)) * sr), 256, N);
  MIC.lastT = now;
  for (let w = Math.ceil(nNew / 256); w >= 1; w--) {
    let s = 0; const a = N - w * 256; for (let i = a; i < a + 256; i++) s += b[i] * b[i];
    micStep(Math.sqrt(s / 256), now - (w - 1) * 256 / sr, a);
  }
  // mırıltı (yalnız serbest çalda)
  if (MODE === 'jam' && J.mic === 'hum' && ++MIC.n % 3 === 0) {
    const r = MIC.rms > Math.max(0.012, MIC.floor * 2.2) ? yin(b.subarray(b.length - 2048), AC.sampleRate) : null;
    if (r && r.c > 0.82 && r.f > 70 && r.f < 1000) { MIC.pitch = 69 + 12 * Math.log2(r.f / 440); MIC.conf = r.c; } else MIC.conf = 0;
  }
}
const MH = new Float32Array(8); let mhI = 0;
function micStep(rms, at, a) {
  let lo = 1; for (let i = 0; i < 8; i++) if (MH[i] < lo) lo = MH[i]; // son ~40 ms'nin en sessiz anı
  MH[mhI++ & 7] = rms;
  MIC.rms = rms; MIC.lvl = Math.max(Math.min(1, rms * 9), MIC.lvl * 0.95);
  if (rms < MIC.floor) MIC.floor = MIC.floor * 0.95 + rms * 0.05; else MIC.floor += (rms - MIC.floor) * 0.002;
  MIC.floor = clamp(MIC.floor, 0.001, 0.08);
  let th = Math.max(0.025, MIC.floor * 4); if (at < MIC.gate) th *= 2.6;
  if (MIC.arm && rms > th && rms > lo * 2.5 && at - MIC.lastOn > 0.16) { // yalnız yükselen ses: sönen kuyruk ikinci vuruş sayılmaz
    MIC.arm = false; MIC.peak = rms; MIC.lastOn = at;
    emit('voice', { ...voiceFeat(MIC.buf, a), rms, at });
  }
  if (!MIC.arm) { MIC.peak = Math.max(MIC.peak, rms); if (rms < MIC.peak * 0.4) MIC.arm = true; }
}
/* Vuruşun tınısı, vuruşun kendi örneklerinden: sıfır geçişinden parlaklık (Hz), 1 kHz altı enerji oranı.
   “Bum” kalın ve tonlu; alkış ve “ts” tiz ve gürültülü. */
function voiceFeat(b, a) {
  const e = Math.min(b.length, a + 1024), k = 1 - Math.exp(-2 * Math.PI * 1000 / AC.sampleRate); let zc = 0, tot = 0, low = 0, y = 0;
  for (let i = a; i < e; i++) { const x = b[i]; y += k * (x - y); tot += x * x; low += y * y; if (i > a && (x >= 0) !== (b[i - 1] >= 0)) zc++; }
  return { centroid: zc / Math.max(1, e - a - 1) * AC.sampleRate / 2, lowR: tot ? low / tot : 0 };
}
let yinD = null;
function yin(b, sr) { // perde (YIN)
  const half = b.length >> 1, minT = Math.max(2, Math.floor(sr / 1100)), maxT = Math.min(half - 2, Math.floor(sr / 65));
  if (!yinD || yinD.length < maxT + 2) yinD = new Float32Array(maxT + 2);
  const d = yinD; d[0] = 1; let run = 0;
  for (let t = 1; t <= maxT + 1; t++) { let s = 0; for (let i = 0; i < half; i++) { const x = b[i] - b[i + t]; s += x * x; } run += s; d[t] = run > 0 ? s * t / run : 1; }
  let tau = -1;
  for (let t = minT; t <= maxT; t++) if (d[t] < 0.15) { while (t + 1 <= maxT && d[t + 1] < d[t]) t++; tau = t; break; }
  if (tau < 0) return null;
  const x0 = d[tau - 1], x1 = d[tau], x2 = d[tau + 1], den = x0 + x2 - 2 * x1, sh = den > 0 ? clamp((x0 - x2) / (2 * den), -1, 1) : 0;
  return { f: sr / (tau + sh), c: 1 - x1 };
}
const snapPenta = m => { const r = Math.round(m); for (let k = 0; k < 3; k++) for (const x of [r - k, r + k]) if ([0, 2, 4, 7, 9].includes(((x % 12) + 12) % 12)) return x; return r; };

/* ---------- efektler ---------- */
const PARTS = [], POPS = [];
function burst(x, y, color, n = 12, sp = 1) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 220) * sp; PARTS.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, dec: 1.3 + Math.random(), r: 2 + Math.random() * 4, color }); }
  if (PARTS.length > 500) PARTS.splice(0, PARTS.length - 500);
}
function pop(x, y, text, color, big = 1) { POPS.push({ x, y, text, color, life: 1, big }); }
let toastT = 0;
function toast(t, ms = 2200) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), ms); }

/* ---------- hareket → ses / oyun ---------- */
let MODE = 'intro'; // intro | menu | teach | play | result | jam
const laneFx = [0, 0, 0, 0]; let lastClapEv = 0;
function emit(type, info = {}) {
  if (paused || !AC) return;
  const src = info.src || (type === 'voice' ? 'mic' : 'cam');
  if (MODE === 'jam') { jamGesture(type, info, src); return; }
  if (MODE !== 'play' && MODE !== 'teach') return;
  let lane = -1;
  if (type === 'pinch') lane = 0;
  else if (type === 'clap' || type === 'fist') lane = 1;
  else if (type === 'mouth') lane = 2;
  else if (type === 'voice') { if (src === 'mic' && info.lowR < 0.3 && info.centroid > 1700) return; lane = 3; } // alkış/tıslama sesi "Bum" sayılmaz
  if (lane < 0) return;
  if (MODE === 'play' ? !G.chart.lanes.includes(lane) : lane !== T.lane) return; // bu şarkıda olmayan sazlar susar
  if (lane === 1) { const n = performance.now(); if (n - lastClapEv < 220) return; lastClapEv = n; }
  laneFx[lane] = 1;
  if (info.pos) burst(info.pos.x, info.pos.y, LANES[lane].color, 14);
  if (MODE === 'play') judge(lane, src, info.at); else teachHit(lane);
}
function curChord() {
  if (MODE === 'jam') return JAM_PROG[Math.floor(Math.max(0, AC.currentTime - J.t0) / (J.sd * 16)) % 4];
  if (G.chart) { const b = Math.floor((AC.currentTime - G.t0) / (G.sd * 16)) - 1; return G.chart.chords[clamp(b, 0, G.chart.nBars - 1)]; }
  return 'C';
}
function playLane(lane, note, t, v = 1) {
  const chn = note ? note.chord : curChord(), ch = CH[chn];
  if (lane === 0) { let m = note && note.midi; if (!m) { const c = PENTA.filter(n => ch.some(x => x % 12 === n % 12)); m = c[Math.floor(Math.random() * c.length)]; } pluck(m, t, v); }
  else if (lane === 1) clap(t, v);
  else if (lane === 2) choir(ch, t, 0.75, v);
  else boom(ch[0] - 24, t, v);
  if (lane !== 3) MIC.gate = Math.max(MIC.gate, t + outLat() + 0.16); // oyunun kendi sesi mikrofonu tetiklemesin
}

/* ---------- oyun ---------- */
const G = { li: 0, L: null, chart: null, t0: 0, sd: 0.15, score: 0, combo: 0, maxCombo: 0, heat: 0, E: 0, perfect: 0, good: 0, miss: 0, diffs: { cam: [], mic: [] }, endT: 0 };
const PERF = 0.085, GOOD = 0.19, EARLY = 0.34, AHEAD = 1.6;
const wk = lane => lane === 1 || lane === 2 ? 1.35 : 1; // alkış ve ağız daha yavaş hareketler: pencere geniş
const srcLat = src => src === 'cam' ? camLat() : src === 'mic' ? micLat() : 0.01;
function startLevel(i) {
  initAudio(); G.li = i; G.L = LEVELS[i]; G.chart = buildChart(G.L);
  hideAll(); const need = G.chart.lanes.filter(l => !SV.seen[l]);
  if (need.length) teachStart(need, () => beginPlay()); else beginPlay();
}
function beginPlay() {
  const L = G.L; MODE = 'play'; paused = false; if (AC.state !== 'running') AC.resume();
  Object.assign(G, { score: 0, combo: 0, maxCombo: 0, heat: 0, E: 0, perfect: 0, good: 0, miss: 0, diffs: { cam: [], mic: [] } });
  G.sd = 60 / L.bpm / 4; G.t0 = AC.currentTime + 0.3;
  for (const n of G.chart.notes) { n.st = 0; n.g = 0; n.t = G.t0 + (16 + n.k) * G.sd; }
  G.endT = G.t0 + (16 + G.chart.nBars * 16 + 12) * G.sd;
  schedStart(G.t0, G.sd, gameStep);
  hideAll(); $('#hud').hidden = false; hudCache = {}; $('#combo').innerHTML = '';
}
function gameStep(step, t) {
  const bar = Math.floor(step / 16) - 1, s = step % 16;
  if (bar < 0) { if (s % 4 === 0) { pluck(s === 0 ? 84 : 79, t, 0.35); hat(t, 0.8); pulseAt.push(t); } return; }
  if (bar >= G.chart.nBars) { if (bar === G.chart.nBars && s === 0) { kick(t); crash(t, 0.8); pad(CH[G.chart.chords[0]], t, 1.6, G.E); } return; }
  backing(s, t, CH[G.chart.chords[bar]], G.E, G.sd, { noSnare: G.chart.lanes.includes(1) });
}
function judge(lane, src, at) {
  const now = AC.currentTime, te = (at || now) - srcLat(src) - outLat(), k = wk(lane);
  let best = null, bd = 9;
  for (const n of G.chart.notes) { if (n.lane !== lane || n.st) continue; const d = te - n.t; if (Math.abs(d) < Math.abs(bd)) { bd = d; best = n; } if (n.t > te + 1) break; }
  if (!best || Math.abs(bd) > EARLY * k || bd > GOOD * k) { playLane(lane, null, now, 0.45); return; }
  if (bd < -GOOD * k) { playLane(lane, null, now, 0.45); missNote(best, true); return; } // çok erken
  const perfect = Math.abs(bd) < PERF * k;
  best.st = 1; best.g = perfect ? 2 : 1;
  playLane(lane, best, Math.max(now, best.t), 1); // erken yapılan hareket notanın tam zamanında çalar
  if (src === 'cam' || src === 'mic') G.diffs[src].push(bd);
  G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
  if (perfect) G.perfect++; else G.good++;
  addHeat(perfect ? 1.25 : 0.8);
  G.score += (perfect ? 100 : 60) * (1 + G.E);
  const lg = laneGeom(), x = lg.cx[lg.lanes.indexOf(lane)];
  pop(x, lg.hitY - lg.r - 18, perfect ? 'HARİKA!' : 'İYİ', perfect ? '#fff' : LANES[lane].color, perfect ? 1.15 : 1);
  burst(x, lg.hitY, LANES[lane].color, perfect ? 22 : 12, perfect ? 1.3 : 1);
  comboBump();
}
function missNote(n, early) {
  n.st = 2; G.miss++; G.combo = 0; G.heat *= 0.45; addHeat(0);
  const lg = laneGeom(), x = lg.cx[lg.lanes.indexOf(n.lane)];
  pop(x, lg.hitY - lg.r - 18, early ? 'ERKEN' : 'KAÇTI', '#8d86a8', 0.85);
  $('#combo').innerHTML = '';
}
const E_NAMES = ['', 'Ziller girdi', 'Bas girdi', 'Arp girdi', 'Tam gaz!'];
function addHeat(x) {
  G.heat = clamp(G.heat + x, 0, 36);
  const lv = G.heat >= 28 ? 4 : G.heat >= 18 ? 3 : G.heat >= 10 ? 2 : G.heat >= 4 ? 1 : 0;
  if (lv > G.E) toast(`🔥 x${lv + 1} · ${E_NAMES[lv]}`, 1400);
  G.E = lv;
}
function comboBump() {
  const el = $('#combo'); if (G.combo < 3) { el.innerHTML = ''; return; }
  el.innerHTML = `<b>${G.combo}</b>seri`; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
}
function updatePlay() {
  const now = AC.currentTime;
  for (const n of G.chart.notes) {
    if (n.st) continue; if (n.t > now) break;
    const lat = (n.lane === 3 ? (MIC.on ? micLat() : 0.01) : (camOn ? camLat() : 0.01)) + outLat();
    if (now - lat - n.t > GOOD * wk(n.lane)) missNote(n, false);
  }
  if (now > G.endT) finish();
}
function finish() {
  SCH.on = false; MODE = 'result';
  const total = G.chart.notes.length, acc = (G.perfect + G.good * 0.6) / total;
  const stars = acc >= 0.9 ? 3 : acc >= 0.75 ? 2 : acc >= 0.55 ? 1 : 0;
  const i = G.li, prevBest = SV.best[i] || 0, newBest = G.score > prevBest;
  SV.stars[i] = Math.max(SV.stars[i] || 0, stars); if (newBest) SV.best[i] = G.score;
  // zamanlamayı kendiliğinden ayarla (ortanca sapmanın yarısı kadar)
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
  if (G.diffs.cam.length >= 6) SV.lc = clamp(SV.lc + clamp(med(G.diffs.cam) * 0.5, -0.04, 0.04), -0.15, 0.25);
  if (G.diffs.mic.length >= 4) SV.lm = clamp(SV.lm + clamp(med(G.diffs.mic) * 0.5, -0.04, 0.04), -0.1, 0.25);
  save();
  hideAll(); $('#result').hidden = false;
  $$('#rStars i').forEach((el, k) => { el.classList.remove('on'); if (k < stars) setTimeout(() => { el.classList.add('on'); pluck(76 + k * 3, AC.currentTime, 0.6); }, 350 + k * 320); });
  $('#rTitle').textContent = ['Bir daha!', 'Güzel!', 'Harika!', 'Efsane!'][stars];
  countUp($('#rScore'), G.score);
  const rb = $('#rBest'); rb.className = 'rbest' + (newBest && prevBest ? ' new' : ''); rb.textContent = newBest && prevBest ? '★ Yeni rekor!' : prevBest ? 'Rekor: ' + prevBest.toLocaleString('tr-TR') : '';
  $('#rStats').innerHTML = `<div><b>${G.perfect}</b>Harika</div><div><b>${G.good}</b>İyi</div><div><b>${G.miss}</b>Kaçan</div><div><b>${G.maxCombo}</b>En uzun seri</div>`;
  const pct = Math.round(acc * 100), nextAt = stars < 3 ? [55, 75, 90][stars] : 0;
  const canNext = i + 1 < LEVELS.length && (SV.stars[i] || 0) >= 1;
  $('#rNext').textContent = stars === 3 ? (i + 1 < LEVELS.length ? 'Kusursuz! Sıradaki şarkı seni bekliyor.' : 'Bütün şarkıları bitirdin! Şimdi Serbest Çal’da kendi şarkını kur.')
    : stars === 0 ? `İsabet %${pct}. Bir yıldız için %55 yeter — notalar halkaya gelince hareket et!`
    : `İsabet %${pct} · ${stars + 1}. yıldıza %${nextAt - pct} kaldı!`;
  const go = $('#rGo');
  go.textContent = canNext ? 'Sonraki ▶' : stars === 0 ? 'Tekrar dene' : 'Serbest Çal ▶';
  go.onclick = () => canNext ? startLevel(i + 1) : stars === 0 ? startLevel(i) : startJam();
  $('#rAgain').hidden = stars === 0;
}
function countUp(el, to) { const t0 = performance.now(); const f = () => { const k = Math.min(1, (performance.now() - t0) / 900); el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))).toLocaleString('tr-TR'); if (k < 1) requestAnimationFrame(f); }; f(); }

/* ---------- yeni enstrüman öğretimi ---------- */
const T = { queue: [], lane: -1, n: 0, after: null, done: false };
function teachStart(q, after) { T.queue = q.slice(); T.after = after; MODE = 'teach'; schedStart(AC.currentTime + 0.1, 60 / 90 / 4, (s, t) => { if (s % 16 === 0) pad(CH[['C', 'Am', 'F', 'G'][(s >> 4) % 4]], t, 16 * 60 / 90 / 4, 0); }); nextTeach(); }
function nextTeach() {
  if (!T.queue.length) { $('#teach').hidden = true; SCH.on = false; T.after(); return; }
  T.lane = T.queue.shift(); T.n = 0; T.done = false; const L = LANES[T.lane];
  $('#teach').hidden = false; $('#teach').style.setProperty('--c', L.color);
  $('#tEmo').textContent = L.emoji; $('#tName').textContent = L.name; $('#tText').textContent = L.teach;
  $('#tKey').textContent = `Klavye: ${L.key}`;
  $$('#tDots i').forEach(i => i.classList.remove('on'));
}
function teachHit(lane) {
  playLane(lane, null, AC.currentTime, 0.9);
  if (lane !== T.lane || T.done) return;
  T.n++; $$('#tDots i').forEach((el, k) => el.classList.toggle('on', k < T.n));
  if (T.n >= 3) { T.done = true; SV.seen[lane] = 1; save(); toast('Süper! ' + LANES[lane].emoji, 900); setTimeout(nextTeach, 700); }
}
$('#tSkip').onclick = () => { SV.seen[T.lane] = 1; save(); nextTeach(); };
function teachSense() {
  const el = $('#tSense'), l = T.lane; let h = '';
  if (l === 3) h = MIC.on ? `🎤 <span class="meter"><i style="width:${Math.round(MIC.lvl * 100)}%"></i></span>` : 'Mikrofon kapalı — K tuşu';
  else if (!camOn) h = 'Kamera kapalı — klavye ya da dokunma';
  else if (!handL && !faceL) h = modelErr ? 'Takip yüklenemedi — bağlantını kontrol et' : 'Kamera takibi yükleniyor…';
  else if (l === 2) h = F.on ? `😮 <span class="meter"><i style="width:${Math.round(clamp(F.jaw / 0.36, 0, 1) * 100)}%"></i></span>` : 'Yüzünü kameraya göster 🙂';
  else { const n = HS[0].on + HS[1].on; h = n ? `<span class="ok">✋ ${n === 2 ? 'İki el' : 'El'} görünüyor</span>` : 'Elini kameraya göster ✋'; }
  if (el._h !== h) { el.innerHTML = h; el._h = h; } else if (l === 3 || l === 2) { const i = el.querySelector('.meter i'); if (i) i.style.width = Math.round((l === 3 ? MIC.lvl : clamp(F.jaw / 0.36, 0, 1)) * 100) + '%'; }
}

/* ---------- serbest çal ---------- */
const J = { bpm: 100, beat: true, quant: true, mic: 'beat', layers: [], rec: null, last: null, t0: 0, sd: 0.15 };
const LAYER_C = ['#ffd23f', '#ff5d8f', '#3ee6d0', '#a98bff', '#7ff0a8', '#ff9f43'];
function startJam() {
  initAudio(); hideAll(); MODE = 'jam'; paused = false; if (AC.state !== 'running') AC.resume();
  J.sd = 60 / J.bpm / 4; J.t0 = AC.currentTime + 0.1; J.rec = null; schedStart(J.t0, J.sd, jamStep);
  choirOn(); leadOn(); $('#jam').hidden = false; jamUI();
  if (!camOn) toast('Kamera yok: ekrana dokun ya da A S D F · H J K L', 3500);
  else if (!SV.seen.jam) { SV.seen.jam = 1; save(); toast('Sol el kalın, sağ el ince notalar 👌', 3200); }
}
function jamStep(step, t) {
  const bar = Math.floor(step / 16), s = step % 16;
  if (J.beat) backing(s, t, CH[JAM_PROG[bar % 4]], 2, J.sd); else if (s === 0) pad(CH[JAM_PROG[bar % 4]], t, 16 * J.sd, 1);
  if (!J.beat && s % 4 === 0) pulseAt.push(t);
  if (J.rec && step === J.rec.end) { // döngü tamam (katmanlar çalınmadan önce, ilk vuruş kaçmasın)
    const L = { ev: J.rec.ev, c: LAYER_C[J.layers.length % LAYER_C.length] };
    if (L.ev.length) { J.layers.push(L); J.last = { L, end: J.rec.end }; toast(`Katman ${J.layers.length} döngüde 🔁`, 1400); }
    else toast('Kayıtta ses yoktu', 1200);
    J.rec = null; jamUI();
  }
  for (const L of J.layers) for (const e of L.ev) if (e.s === step % 32) jamPlay(e, t);
}
function jamPlay(e, t, v = 1) {
  switch (e.k) {
    case 'n': pluck(e.m, t, v); break; case 'clap': clap(t, v); break; case 'tom': tom(e.m, t, v); break;
    case 'crash': crash(t, v); break; case 'kick': kick(t, v); boom(CH[JAM_PROG[0]][0] - 24, t, 0.3 * v); break;
    case 'snare': snare(t, v); break; case 'hat': hat(t, v * 1.4); break;
  }
}
const lgOn = {};
function jamGesture(type, info, src) {
  let e = null;
  if (type === 'pinch') e = { k: 'n', m: JAM_NOTES[info.hand][info.finger] };
  else if (type === 'clap') { const n = performance.now(); if (n - lastClapEv < 220) return; lastClapEv = n; e = { k: 'clap' }; }
  else if (type === 'fist') e = { k: 'tom', m: info.hand ? 52 : 45 };
  else if (type === 'brow') e = { k: 'crash' };
  else if (type === 'voice') {
    if (J.mic !== 'beat') return;
    e = { k: info.lowR > 0.55 || info.centroid < 900 ? 'kick' : info.centroid > 3200 && info.lowR < 0.12 ? 'hat' : 'snare' };
  } else if (type === 'key') e = info.e;
  else if (type === 'mouth') { if (info.pos) burst(info.pos.x, info.pos.y, LANES[2].color, 16); lgOn.mouth = 1; return; }
  if (!e) return;
  const now = AC.currentTime, te = (info.at || now) - srcLat(src) - outLat(), kq = Math.round((te - J.t0) / J.sd), tq = J.t0 + kq * J.sd;
  const when = J.quant ? Math.max(now, tq) : now;
  jamPlay(e, when, 1); if (e.k === 'n' || e.k === 'clap' || e.k === 'tom') MIC.gate = Math.max(MIC.gate, when + outLat() + 0.16);
  const g = type === 'key' ? info.g : type; lgOn[g] = 1;
  if (info.pos) burst(info.pos.x, info.pos.y, e.k === 'n' ? (info.hand ? '#ff9f43' : LANES[0].color) : e.k === 'clap' ? LANES[1].color : e.k === 'crash' ? '#fff' : LANES[3].color, 14);
  else burst(W / 2 + (Math.random() - 0.5) * W * 0.5, H * 0.45, LANES[0].color, 10);
  // kayıt
  const rec = J.rec && kq >= J.rec.start && kq < J.rec.end ? J.rec : J.last && J.last.end > kq && kq >= J.last.end - 32 && SCH.step <= J.last.end + 4 ? { ev: J.last.L.ev } : null;
  if (rec) rec.ev.push({ ...e, s: ((kq % 32) + 32) % 32 });
}
function jamFrame() {
  const ch = curChord();
  choirSet(F.on && F.jaw > 0.12 ? clamp((F.jaw - 0.12) / 0.55, 0, 1) : (keyHold.mouth ? 0.8 : 0), ch);
  if (F.on && F.jaw > 0.25) lgOn.mouth = 1;
  if (J.mic === 'hum' && MIC.on && MIC.conf > 0) { let m = snapPenta(MIC.pitch); while (m < 60) m += 12; while (m > 84) m -= 12; leadSet(m, clamp(MIC.rms * 14, 0.2, 1)); lgOn.voice = 1; J.humNote = m; }
  else { leadSet(0, 0); J.humNote = 0; }
  for (const li of $$('#legend li')) { const g = li.dataset.g; li.classList.toggle('on', (lgOn[g] || 0) > 0.3); }
  for (const k in lgOn) lgOn[k] = Math.max(0, lgOn[k] - 0.06);
  // kayıt halkası
  const cur = (AC.currentTime - J.t0) / J.sd, rb = $('#lRec'), bar = rb.querySelector('.bar');
  if (J.rec) {
    const p = clamp((cur - J.rec.start) / 32, 0, 1), waiting = cur < J.rec.start;
    rb.classList.toggle('wait', waiting); rb.classList.toggle('live', !waiting);
    bar.style.strokeDashoffset = (226.2 * (1 - p)).toFixed(1);
    const beatsLeft = Math.ceil((J.rec.start - cur) / 4);
    setText('#lTxt', waiting ? `Hazır… ${beatsLeft}` : `Kayıtta · ${Math.ceil((J.rec.end - cur) / 4)} vuruş`);
  } else { rb.classList.remove('wait', 'live'); bar.style.strokeDashoffset = 226.2; setText('#lTxt', J.layers.length ? `${J.layers.length} katman döngüde · üstüne kaydet` : 'Kaydet: 2 ölçü çal, döngü olsun'); }
}
function jamUI() {
  $('#jTempo').textContent = '♩ ' + J.bpm; $('#jBeat').classList.toggle('on', J.beat); $('#jQuant').classList.toggle('on', J.quant);
  $('#jMic').textContent = { beat: '🎤 Beatbox', hum: '🎶 Mırıltı', off: '🎤 Kapalı' }[J.mic]; $('#jMic').classList.toggle('on', J.mic !== 'off');
  $('#lgVoice').innerHTML = J.mic === 'hum' ? 'Mırıldan<small>synth seni izler</small>' : J.mic === 'beat' ? 'Ses<small>bum · pa · ts</small>' : 'Ses<small>kapalı</small>';
  $('#layers').innerHTML = J.layers.map(L => `<i style="--c:${L.c}"></i>`).join('');
}
$('#jTempo').onclick = () => { const ts = [80, 100, 120]; J.bpm = ts[(ts.indexOf(J.bpm) + 1) % 3]; J.sd = 60 / J.bpm / 4; J.t0 = AC.currentTime + 0.1; J.rec = null; J.last = null; schedStart(J.t0, J.sd, jamStep); jamUI(); };
$('#jBeat').onclick = () => { J.beat = !J.beat; jamUI(); };
$('#jQuant').onclick = () => { J.quant = !J.quant; jamUI(); };
$('#jMic').onclick = () => { J.mic = { beat: 'hum', hum: 'off', off: 'beat' }[J.mic]; jamUI(); if (J.mic === 'hum') toast('Mırıldan: sesin synth’e dönüşür 🎶'); if (!MIC.on && J.mic !== 'off') toast('Mikrofon kapalı'); };
$('#lRec').onclick = () => {
  if (J.rec) { J.rec = null; jamUI(); return; } // iptal
  if (J.layers.length >= 6) { toast('En fazla 6 katman'); return; }
  const cur = Math.floor((AC.currentTime - J.t0) / J.sd) + 1, start = Math.ceil(cur / 4) * 4; // bir sonraki vuruşta başla
  J.rec = { start, end: start + 32, ev: [] };
};
$('#lUndo').onclick = () => { if (J.layers.pop()) toast('Son katman silindi', 1000); J.last = null; jamUI(); };
$('#lClear').onclick = () => { J.layers = []; J.last = null; J.rec = null; jamUI(); toast('Döngüler temizlendi', 1000); };
$('#jamBack').onclick = () => showMenu();

/* ---------- klavye / dokunma ---------- */
const keyHold = { mouth: false };
const JAM_KEYS = { a: [0, 0], s: [0, 1], d: [0, 2], f: [0, 3], h: [1, 0], j: [1, 1], k: [1, 2], l: [1, 3] };
addEventListener('keydown', e => {
  if (e.repeat) { return; }
  const k = e.key.toLowerCase();
  if ((k === 'escape' || k === 'p') && MODE === 'play') { togglePause(); return; }
  if (MODE === 'play' || MODE === 'teach') { if (k in KEYS) { initAudio(); emitLane(KEYS[k]); e.preventDefault(); } return; }
  if (MODE === 'jam') {
    if (JAM_KEYS[k]) { const [h, f] = JAM_KEYS[k]; jamGesture('key', { e: { k: 'n', m: JAM_NOTES[h][f] }, g: 'pinch', hand: h }, 'key'); }
    else if (k === ' ') { e.preventDefault(); jamGesture('key', { e: { k: 'clap' }, g: 'clap' }, 'key'); }
    else if (k === 'z') jamGesture('key', { e: { k: 'kick' }, g: 'voice' }, 'key');
    else if (k === 'x') jamGesture('key', { e: { k: 'snare' }, g: 'voice' }, 'key');
    else if (k === 'c') jamGesture('key', { e: { k: 'crash' }, g: 'brow' }, 'key');
    else if (k === 'v') keyHold.mouth = true;
  }
});
addEventListener('keyup', e => { if (e.key.toLowerCase() === 'v') keyHold.mouth = false; });
function emitLane(lane) { const type = ['pinch', 'clap', 'mouth', 'voice'][lane]; emit(type, { src: 'key' }); }
cv.addEventListener('pointerdown', e => {
  initAudio();
  if (MODE === 'play') { const lg = laneGeom(); const i = Math.floor((e.clientX - lg.x0) / lg.lw); if (i >= 0 && i < lg.lanes.length && e.clientY > H * 0.35) emitLane(lg.lanes[i]); }
  else if (MODE === 'teach') emitLane(T.lane);
  else if (MODE === 'jam') { const z = clamp(Math.floor(e.clientX / W * 8), 0, 7), h = z >> 2, f = z & 3; jamGesture('key', { e: { k: 'n', m: JAM_NOTES[h][f] }, g: 'pinch', hand: h }, 'key'); burst(e.clientX, e.clientY, h ? '#ff9f43' : LANES[0].color, 12); }
});

/* ---------- çizim ---------- */
function laneGeom() {
  const lanes = G.chart ? G.chart.lanes : [0], n = lanes.length, lw = Math.min(112, (W - 24) / n), x0 = (W - lw * n) / 2;
  const hitY = H - Math.max(118, H * 0.16), topY = Math.max(96, H * 0.13), r = Math.min(lw * 0.36, 36);
  return { lanes, n, lw, x0, hitY, topY, r, cx: lanes.map((_, i) => x0 + lw * (i + 0.5)) };
}
function drawVideo(dim) {
  if (camOn && SV.cam && vid.readyState >= 2) { vmap(); ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1); ctx.drawImage(vid, VM.ox, VM.oy, VM.dw, VM.dh); ctx.restore(); ctx.fillStyle = `rgba(12,10,20,${dim})`; ctx.fillRect(0, 0, W, H); }
}
function drawBody(jam) {
  ctx.save(); ctx.lineCap = 'round';
  HS.forEach((S, hi) => {
    if (!S.on || !S.pts) return; const P = S.pts;
    ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.beginPath();
    for (const [a, b] of HAND_LINKS) { ctx.moveTo(P[a].x, P[a].y); ctx.lineTo(P[b].x, P[b].y); } ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const p = P[TIPS[k]], on = S.pin === k, col = jam ? (hi ? '#ff9f43' : LANES[0].color) : LANES[0].color;
      ctx.fillStyle = on ? col : 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, on ? 9 : 5, 0, 7); ctx.fill();
      if (jam) { const m = JAM_NOTES[hi][k]; ctx.font = '600 12px Rubik,system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = on ? col : 'rgba(255,255,255,.7)'; ctx.fillText(SOLF[m % 12], p.x, p.y - 13); }
    }
    // yakınlık çizgisi: başparmak en yakın parmağa yaklaştıkça parlar
    let c = 0; for (let k = 1; k < 4; k++) if (S.d[k] < S.d[c]) c = k;
    const near = clamp((0.075 - S.d[c]) / (0.075 - P_ON), 0, 1);
    if (near > 0) { const q = P[TIPS[c]]; ctx.strokeStyle = S.pin >= 0 ? LANES[0].color : `rgba(255,210,63,${near * 0.8})`; ctx.lineWidth = 2 + near * 3; ctx.beginPath(); ctx.moveTo(P[4].x, P[4].y); ctx.lineTo(q.x, q.y); ctx.stroke(); }
    ctx.fillStyle = S.pin >= 0 ? LANES[0].color : '#fff'; ctx.beginPath(); ctx.arc(P[4].x, P[4].y, 6, 0, 7); ctx.fill();
    if (S.flash > 0) { const a = P[4]; ctx.strokeStyle = `rgba(255,210,63,${S.flash})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(a.x, a.y, 10 + (1 - S.flash) * 30, 0, 7); ctx.stroke(); S.flash = Math.max(0, S.flash - 0.08); }
  });
  if (F.on && F.mouth) {
    const r = F.size * (0.28 + F.jaw * 0.5), a = 0.25 + clamp(F.jaw * 1.6, 0, 0.75);
    ctx.strokeStyle = `rgba(62,230,208,${a})`; ctx.lineWidth = 3 + F.jaw * 6; ctx.beginPath(); ctx.ellipse(F.mouth.x, F.mouth.y, r, r * (0.55 + F.jaw * 0.6), 0, 0, 7); ctx.stroke();
  }
  ctx.restore();
}
function drawLanes(vt) {
  const lg = laneGeom(), span = lg.hitY - lg.topY;
  ctx.save();
  lg.lanes.forEach((lane, i) => {
    const L = LANES[lane], x = lg.cx[i], fx = laneFx[lane];
    const gr = ctx.createLinearGradient(0, lg.topY - 40, 0, lg.hitY + lg.r);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, hexA(L.color, 0.13 + fx * 0.25));
    ctx.fillStyle = gr; ctx.fillRect(x - lg.lw / 2 + 4, lg.topY - 40, lg.lw - 8, span + 40 + lg.r);
    ctx.strokeStyle = hexA(L.color, 0.75 + fx * 0.25); ctx.lineWidth = 3 + fx * 4;
    ctx.beginPath(); ctx.arc(x, lg.hitY, lg.r * (1 + fx * 0.18), 0, 7); ctx.stroke();
    ctx.fillStyle = hexA(L.color, 0.12 + fx * 0.4); ctx.fill();
    ctx.font = `${Math.round(lg.r * 0.95)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.globalAlpha = 0.55 + fx * 0.45;
    ctx.fillText(L.emoji, x, lg.hitY + 1); ctx.globalAlpha = 1;
    ctx.font = '700 12px Rubik,system-ui'; ctx.fillStyle = hexA(L.color, 0.95); ctx.fillText(L.name.toUpperCase(), x, lg.hitY + lg.r + 16);
    // algılayıcı göstergesi
    const lv = lane === 3 ? (MIC.on ? MIC.lvl : -1) : lane === 2 ? (F.on ? clamp(F.jaw / 0.36, 0, 1) : -1) : (HS[0].on || HS[1].on ? (lane === 1 ? (HS[0].on && HS[1].on ? clamp(2.2 - CLAP.r, 0, 1) : 0.15) : 1) : -1);
    const bw = lg.lw * 0.5, by = lg.hitY + lg.r + 28;
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(x - bw / 2, by, bw, 4);
    if (lv >= 0) { ctx.fillStyle = L.color; ctx.fillRect(x - bw / 2, by, bw * lv, 4); }
    laneFx[lane] = Math.max(0, fx - 0.07);
  });
  // notalar
  for (const n of G.chart.notes) {
    const dt = n.t - vt; if (dt > AHEAD + 0.1) break; if (dt < -0.6) continue;
    const i = lg.lanes.indexOf(n.lane), x = lg.cx[i], y = lg.hitY - dt / AHEAD * span, L = LANES[n.lane];
    if (n.st === 1) continue;
    const miss = n.st === 2, near = !miss && Math.abs(dt) < 0.14;
    const r = lg.r * (miss ? 0.75 : 0.82 + (near ? 0.12 : 0)), a = miss ? clamp(0.45 + dt, 0, 0.45) : clamp((AHEAD + 0.1 - dt) * 3, 0, 1);
    ctx.globalAlpha = a;
    if (near) { ctx.fillStyle = hexA(L.color, 0.35); ctx.beginPath(); ctx.arc(x, y, r * 1.5, 0, 7); ctx.fill(); }
    ctx.fillStyle = miss ? '#4a4463' : L.color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = `${Math.round(r * 1.05)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(L.emoji, x, y + 1);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // geri sayım
  const cin = (vt - G.t0) / (G.sd * 4);
  if (cin < 4) {
    const k = Math.floor(cin), f = cin - k;
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (k >= 0) { ctx.globalAlpha = 1 - f * 0.7; ctx.font = `900 ${Math.round(90 + f * 40)}px Rubik,system-ui`; ctx.fillStyle = '#fff'; ctx.fillText(String(4 - k), W / 2, H * 0.38); }
    ctx.globalAlpha = 1; ctx.font = '700 18px Rubik,system-ui'; ctx.fillStyle = '#e8e2ff';
    ctx.fillText(G.li === 0 ? 'Nota halkaya gelince 👌 yap' : G.L.name, W / 2, H * 0.38 + 80); ctx.restore();
  }
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${clamp(a, 0, 1)})`; }
function drawFx(dt) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = PARTS.length - 1; i >= 0; i--) { const p = PARTS[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.95; p.vy = p.vy * 0.95 + 160 * dt; p.life -= p.dec * dt; if (p.life <= 0) { PARTS.splice(i, 1); continue; } ctx.globalAlpha = p.life; ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, 7); ctx.fill(); }
  ctx.restore(); ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = POPS.length - 1; i >= 0; i--) { const p = POPS[i]; p.life -= dt * 1.6; p.y -= 40 * dt; if (p.life <= 0) { POPS.splice(i, 1); continue; } ctx.globalAlpha = clamp(p.life * 1.5, 0, 1); ctx.font = `900 ${Math.round(17 * p.big * (1 + (1 - p.life) * 0.2))}px Rubik,system-ui`; ctx.fillStyle = p.color; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8; ctx.fillText(p.text, p.x, p.y); }
  ctx.restore();
}
function drawPulse() {
  if (!AC) return; const now = AC.currentTime - outLat();
  while (pulseAt.length && pulseAt[0] <= now) { pulseAt.shift(); beatPulse = 1; }
  if (beatPulse > 0.01) {
    const c = MODE === 'play' ? ['#a98bff', '#ffd23f', '#ff5d8f', '#3ee6d0', '#ffffff'][G.E] : '#a98bff', g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, hexA(c, beatPulse * (MODE === 'play' ? 0.1 + G.E * 0.05 : 0.12)));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); beatPulse *= 0.88;
  }
}
let hudCache = {};
function setText(sel, v) { if (hudCache[sel] !== v) { hudCache[sel] = v; $(sel).textContent = v; } }
function updateHud(vt) {
  setText('#score', G.score.toLocaleString('tr-TR'));
  setText('#mult', 'x' + (1 + G.E)); $('#mult').classList.toggle('hot', G.E >= 2);
  if (hudCache.E !== G.E) { hudCache.E = G.E; $$('#pips i').forEach((p, k) => p.classList.toggle('on', k < G.E)); }
  const p = clamp((vt - G.t0 - 16 * G.sd) / (G.chart.nBars * 16 * G.sd), 0, 1); $('#prog i').style.width = (p * 100).toFixed(1) + '%';
  // ipucu
  const lanes = G.chart.lanes, t = performance.now(); let h = '';
  if (camOn && !handL && !faceL) h = modelErr ? 'Takip yüklenemedi · klavye: D F J K' : 'Kamera takibi yükleniyor…';
  else if (camOn && (lanes.includes(0) || lanes.includes(1)) && handL && t - handSeenAt > 1500) h = '✋ Ellerini kameraya göster';
  else if (camOn && lanes.includes(2) && faceL && t - faceSeenAt > 1500) h = '🙂 Yüzünü kameraya göster';
  else if (!camOn && vt < G.t0 + 16 * G.sd) h = 'Klavye: D F J K · ya da şeride dokun';
  setText('#hint', h);
}

/* ---------- ana döngü ---------- */
let lastF = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const nowP = performance.now(), dt = Math.min(0.05, (nowP - lastF) / 1000); lastF = nowP;
  if (!paused) detect();
  if (AC && !paused) tick();
  ctx.fillStyle = '#0c0a14'; ctx.fillRect(0, 0, W, H);
  if (MODE === 'intro' || MODE === 'menu' || MODE === 'result') { drawVideo(0.6); drawPulse(); drawFx(dt); return; }
  drawVideo(MODE === 'play' ? 0.6 : 0.42); drawPulse();
  drawBody(MODE === 'jam');
  if (MODE === 'play' && !paused) { const vt = AC.currentTime - outLat(); updatePlay(); if (MODE === 'play') { drawLanes(vt); updateHud(vt); } }
  else if (MODE === 'play' && paused) drawLanes(AC.currentTime - outLat());
  else if (MODE === 'teach') teachSense();
  else if (MODE === 'jam') jamFrame();
  drawFx(dt);
}
requestAnimationFrame(loop);

/* ---------- ekranlar ---------- */
function hideAll() { for (const id of ['intro', 'menu', 'teach', 'result', 'pause', 'settings', 'hud', 'jam']) $('#' + id).hidden = true; }
function showMenu() {
  SCH.on = false; sustainOff(); paused = false; if (AC && AC.state !== 'running') AC.resume();
  hideAll(); MODE = 'menu'; $('#menu').hidden = false;
  let tot = 0; const list = $('#lvlList'); list.innerHTML = '';
  const firstOpen = LEVELS.findIndex((_, i) => !(SV.stars[i] > 0));
  LEVELS.forEach((L, i) => {
    const st = SV.stars[i] || 0; tot += st; const locked = i > 0 && !(SV.stars[i - 1] > 0);
    const lanes = buildChart(L).lanes.map(l => LANES[l].emoji).join(' ');
    const b = document.createElement('button'); b.className = 'lvl' + (locked ? ' locked' : '') + (i === firstOpen ? ' next' : '');
    b.innerHTML = `<div class="n">${locked ? '🔒' : i + 1}</div><div class="t"><b>${L.name}</b><small>${lanes} · ${L.bpm} BPM</small></div><div class="s">${[0, 1, 2].map(k => `<i class="${k < st ? 'on' : ''}">★</i>`).join('')}${SV.best[i] ? `<em>${SV.best[i].toLocaleString('tr-TR')}</em>` : ''}</div>`;
    b.onclick = () => { if (locked) { toast('Önce önceki şarkıdan 1 ★ al'); return; } startLevel(i); };
    list.appendChild(b);
  });
  $('#totStars').textContent = `★ ${tot}/${LEVELS.length * 3}`;
}
function togglePause() {
  if (MODE !== 'play') return;
  paused = !paused;
  if (paused) { AC.suspend(); $('#pause').hidden = false; } else { AC.resume(); $('#pause').hidden = true; }
}
$('#pauseBtn').onclick = togglePause;
$('#pResume').onclick = togglePause;
$('#pRestart').onclick = () => { paused = false; $('#pause').hidden = true; AC.resume().then(() => startLevel(G.li)); };
$('#pMenu').onclick = () => { paused = false; $('#pause').hidden = true; showMenu(); };
$('#rMenu').onclick = showMenu;
$('#rAgain').onclick = () => startLevel(G.li);
$('#jamBtn').onclick = startJam;
document.addEventListener('visibilitychange', () => { if (document.hidden && MODE === 'play' && !paused) togglePause(); });

/* ayarlar */
$('#setBtn').onclick = () => { $('#settings').hidden = false; $('#sVol').value = SV.vol; $('#sCam').checked = SV.cam; $('#sLat').value = Math.round(SV.lc * 1000); $('#sLatV').textContent = Math.round(SV.lc * 1000) + ' ms'; };
$('#sVol').oninput = e => { SV.vol = +e.target.value; if (master) master.gain.value = SV.vol; save(); };
$('#sCam').onchange = e => { SV.cam = e.target.checked; save(); };
$('#sLat').oninput = e => { SV.lc = +e.target.value / 1000; $('#sLatV').textContent = e.target.value + ' ms'; save(); };
$('#sClose').onclick = () => { $('#settings').hidden = true; };
$('#sReset').onclick = () => { if (!confirm('Bütün yıldızlar ve rekorlar silinsin mi?')) return; SV.stars = {}; SV.best = {}; SV.seen = {}; save(); $('#settings').hidden = true; showMenu(); };

/* giriş */
let wake = null;
async function keepAwake() { try { if (navigator.wakeLock && !document.hidden) wake = await navigator.wakeLock.request('screen'); } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (!document.hidden && camOn) keepAwake(); });
function go() { keepAwake(); if (!Object.keys(SV.stars).length) startLevel(0); else showMenu(); }
$('#startBtn').onclick = async () => {
  initAudio(); const b = $('#startBtn'); b.disabled = true; b.textContent = 'İzin bekleniyor…';
  loadModels(); await openMedia(); b.disabled = false; b.textContent = 'Başla'; go();
};
$('#noCamBtn').onclick = () => { initAudio(); go(); };
if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) $('#introNote').textContent = 'Kamera için sayfa https üzerinden açılmalı (ör. GitHub Pages).';
