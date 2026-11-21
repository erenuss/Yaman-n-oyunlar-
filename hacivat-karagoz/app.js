// Hayâl Perdesi — Karagöz ile Hacivat, el takibiyle oynanan gölge oyunu.
// Kuklalar özgün çizimdir; SVG yol verileriyle eklemli (boyun, bel, kalça, diz, omuz, dirsek, çene) kurulur.

const $ = s => document.querySelector(s);
const stage = $('#stage'), ctx = stage.getContext('2d');
const pip = $('#pip'), pctx = pip.getContext('2d');
const video = $('#cam');
const off = document.createElement('canvas'), octx = off.getContext('2d');
const backdrop = document.createElement('canvas'), bctx = backdrop.getContext('2d');

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const map01 = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const rnd = (a, b) => a + Math.random() * (b - a);

let W = 800, H = 450, DPR = 1, S = 1;
const settings = { sound: true, voice: true, pip: true };
const testHooks = (window.__hk = { frames: 0, hands: 0, lastLines: [] });

/* ------------------------------------------------------------------ ART */
const P = d => new Path2D(d);
const OUT = '#2a1206';

const LEG = {
  thigh: P('M-15,-4 C-21,18 -19,40 -11,60 L11,60 C19,40 21,18 15,-4 Z'),
  shin: P('M-9,-4 C-11,14 -10,30 -9,46 L10,46 C11,30 11,14 9,-4 Z'),
  shoe: P('M-12,42 L12,42 C22,46 32,50 43,45 C46,54 37,62 24,62 L-10,62 C-15,62 -16,50 -12,42 Z'),
  cuff: P('M-11,36 L11,36 L12,46 L-12,46 Z')
};
const ARM = {
  upper: P('M-10,-6 C-13,12 -11,28 -9,40 L9,40 C11,28 13,12 10,-6 C6,-10 -6,-10 -10,-6 Z'),
  fore: P('M-8,-3 C-9,10 -8,22 -7,32 L7,32 C8,22 9,10 8,-3 Z'),
  cuff: P('M-8,24 L8,24 L9,32 L-9,32 Z'),
  hand: P('M-7,30 C-10,38 -6,47 1,48 C8,48 12,42 10,36 C14,37 17,35 15,31 C10,29 2,28 -7,30 Z')
};

const ART = {
  karagoz: {
    neck: [2, -110], shoulder: [-4, -94], hips: [[-7, 2], [8, 2]], jawPivot: [-6, -11],
    c: { skin: '#eab07a', robe: '#e2a43a', vest: '#c0392b', trim: '#2c7d4a', belt: '#2c7d4a', belt2: '#f0c75a',
      shalvar: '#c23b2c', shin: '#f1dfb4', shoe: '#c2312a', beard: '#1d0f08', hat: '#c43a2d', hat2: '#1d120c', band: '#f2e2b8', sleeve: '#2c7d4a', sleeveB: '#226a3d' },
    robe: P('M2,-110 C16,-110 24,-102 26,-90 C30,-74 39,-54 39,-33 C39,-18 33,-10 26,-6 C30,14 34,30 35,46 L-33,46 C-31,28 -28,12 -24,-6 C-28,-40 -30,-74 -24,-96 C-18,-106 -8,-110 2,-110 Z'),
    vest: P('M-24,-96 C-18,-106 -6,-110 4,-108 C11,-80 11,-50 7,-18 L-24,-14 C-28,-40 -29,-74 -24,-96 Z'),
    vestF: P('M14,-106 C22,-98 28,-84 31,-70 C34,-58 36,-46 35,-36 L20,-30 C22,-58 20,-84 14,-106 Z'),
    hemTrim: P('M-33,46 C-31,38 -30,34 -29,30 C-10,34 14,34 34,30 C34,36 35,40 35,46 Z'),
    belt: P('M-25,-16 C-8,-11 12,-11 28,-17 L27,-3 C10,2 -8,2 -24,-2 Z'),
    face: P('M-16,2 C-24,-12 -26,-30 -20,-44 L18,-46 C22,-41 24,-38 26,-36 C35,-33 40,-26 36,-20 C32,-17 28,-18 25,-17 L25,-12 C20,-9 14,-5 10,2 Z'),
    ear: P('M-9,-30 C-15,-31 -16,-22 -11,-19 C-8,-18 -6,-22 -7,-26 Z'),
    jaw: P('M25,-14 C30,-3 28,10 17,16 C7,22 -8,20 -15,11 C-18,5 -14,-2 -7,-6 C4,-11 14,-12 25,-14 Z'),
    mous: P('M26,-18 C20,-17 14,-15 9,-10 C14,-11 20,-12 27,-14 Z'),
    hatBand: P('M-27,-37 C-31,-51 -23,-62 -6,-64 C10,-66 23,-60 25,-46 L21,-41 C6,-45 -12,-43 -27,-37 Z'),
    hat: P('M-24,-56 C-46,-68 -50,-100 -30,-111 C-10,-120 14,-108 16,-86 C17,-74 14,-64 10,-58 Z'),
    hatTop: P('M-38,-103 C-44,-112 -34,-120 -28,-111 C-31,-109 -35,-106 -38,-103 Z'),
    eye: [12, -33, 6.2], brow: P('M2,-41 Q12,-48 22,-41'),
    lines: [P('M27,-25 q4,1 6,-1'), P('M-2,-20 q3,4 7,4')],
    dotsIn: ['robe', 'shalvar'],
    lines2: [P('M8,-106 C14,-70 14,-40 12,-16')]
  },
  hacivat: {
    neck: [2, -112], shoulder: [-4, -96], hips: [[-7, 2], [8, 2]], jawPivot: [-4, -11],
    c: { skin: '#ecb582', robe: '#b2352d', vest: '#2f8a4e', trim: '#e6b440', belt: '#e6b440', belt2: '#7a2a1c',
      shalvar: '#2f8a4e', shin: '#efe0bb', shoe: '#d9a131', beard: '#3b1d0e', hat: '#2f8a4e', hat2: '#e6b440', band: '#f4e8cb', sleeve: '#b2352d', sleeveB: '#8e2a24' },
    robe: P('M2,-112 C14,-111 22,-104 24,-92 C27,-70 26,-36 22,-8 C28,12 32,30 34,48 L-34,48 C-31,30 -28,12 -22,-8 C-27,-40 -29,-72 -24,-96 C-18,-108 -8,-112 2,-112 Z'),
    vest: P('M-4,-110 C-18,-108 -28,-98 -30,-80 C-34,-50 -35,-10 -39,52 L-8,52 C-10,20 -8,-30 -4,-70 C-2,-90 0,-104 -4,-110 Z'),
    vestF: P('M10,-110 C18,-104 22,-96 23,-88 C25,-70 24,-50 22,-30 L13,-30 C15,-60 14,-90 10,-110 Z'),
    hemTrim: P('M-34,48 C-33,42 -32,38 -31,34 C-10,38 12,38 32,34 C33,38 34,42 34,48 Z'),
    belt: P('M-23,-16 C-8,-11 10,-11 24,-16 L23,-3 C8,1 -8,1 -22,-3 Z'),
    face: P('M-14,2 C-20,-10 -22,-26 -18,-40 L16,-44 C18,-39 20,-35 22,-33 C28,-30 33,-25 31,-21 C28,-19 25,-19 22,-18 C23,-15 24,-13 22,-11 L20,-8 C14,-6 10,-2 8,2 Z'),
    ear: P('M-8,-28 C-14,-29 -15,-20 -10,-18 C-7,-17 -5,-21 -6,-24 Z'),
    jaw: P('M21,-11 C25,-4 25,6 21,16 C18,24 14,32 9,44 C7,32 3,20 -3,11 C-7,6 -10,4 -13,2 C-4,-1 8,-5 21,-11 Z'),
    mous: P('M23,-17 C17,-16 11,-13 6,-8 C12,-10 18,-11 26,-13 Z'),
    hatBand: P('M-25,-37 C-27,-50 -21,-58 -6,-60 C8,-62 21,-58 23,-46 C23,-42 21,-40 19,-40 C4,-44 -10,-42 -25,-37 Z'),
    hat: P('M-17,-56 C-24,-80 -19,-104 -2,-113 C15,-104 19,-80 13,-58 Z'),
    hatTop: P('M-6,-112 C-6,-120 2,-120 2,-112 Z'),
    eye: [11, -32, 3.6], brow: P('M3,-38 Q11,-42 19,-37'),
    lines: [P('M24,-23 q3,1 4,-1'), P('M-1,-22 q3,3 6,3')],
    dotsIn: ['robe', 'shalvar'],
    lines2: [P('M12,-108 C16,-74 16,-40 14,-16')]
  }
};

// "Zımba delikleri": ışığın geçtiği küçük delikler — bölge içinde ızgara ile otomatik dağıtılır.
const probe = document.createElement('canvas').getContext('2d');
function holesIn(path, step, inset, bx, rosette) {
  const pts = [];
  for (let y = bx[1], r = 0; y <= bx[3]; y += step, r++) {
    for (let x = bx[0] + (r % 2 ? step / 2 : 0); x <= bx[2]; x += step) {
      if (probe.isPointInPath(path, x, y) && probe.isPointInPath(path, x + inset, y) && probe.isPointInPath(path, x - inset, y) &&
        probe.isPointInPath(path, x, y + inset) && probe.isPointInPath(path, x, y - inset)) {
        pts.push([x, y, 1.6]);
        if (rosette) for (let k = 0; k < 6; k++) pts.push([x + Math.cos(k / 6 * TAU) * 4.2, y + Math.sin(k / 6 * TAU) * 4.2, 1.1]);
      }
    }
  }
  return pts;
}
function holesAlong(path, bx, n, inset) { // kenar boyunca dizi
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = lerp(bx[0], bx[2], i / (n - 1)), y = lerp(bx[1], bx[3], i / (n - 1));
    if (probe.isPointInPath(path, x, y)) pts.push([x, y, inset]);
  }
  return pts;
}
for (const a of Object.values(ART)) {
  a.hRobe = holesIn(a.robe, 17, 6, [-40, -100, 40, 26], true).filter(p => true);
  a.hThigh = holesIn(LEG.thigh, 9, 3, [-20, 40, 20, 60], false);
  a.hShin = holesIn(LEG.shin, 8, 3, [-10, 2, 10, 32], false);
  a.hHat = holesIn(a.hat, 8, 3, [-48, -116, 18, -62], false);
  a.hBelt = holesAlong(a.belt, [-20, -9, 22, -9], 9, 1.4);
  a.hHem = holesAlong(a.hemTrim, [-28, 40, 30, 40], 12, 1.4);
  a.hSleeve = holesIn(ARM.upper, 8, 3, [-10, 0, 10, 36], false);
}

/* -------------------------------------------------------------- DIALOGUE */
const SCRIPT = [
  ['h', 'Hay Hak! Yâr bana bir eğlence, medet!'],
  ['k', 'Eğlence mi istedin? Al sana eğlence, Hacivat!'],
  ['h', 'Aman Karagöz’üm, efendim, nereden çıktın böyle?'],
  ['k', 'Perdenin arkasından çıktım, nereden olacak!'],
  ['h', 'Biraz nezaket, biraz edep lütfen efendim.'],
  ['k', 'Nezaket mi? O hangi mahallede oturuyor?'],
  ['h', 'Nezaket mahalle değil, terbiyedir, terbiye!'],
  ['k', 'Terbiye mi? Ben turşu terbiyesini bilirim!'],
  ['h', 'Of of... Seninle konuşmak taşa su dökmek gibi.'],
  ['k', 'Taşa dökme o zaman, testiye dök şu suyu!'],
  ['h', 'Karagöz’üm, sana para kazandıracak bir iş buldum.'],
  ['k', 'Para mı dedin? Kulaklarım bayram etti!'],
  ['h', 'Bursa’dan İstanbul’a mektup taşıyacaksın.'],
  ['k', 'Yürüyerek mi? Bacaklarım tahta değil ya!'],
  ['h', 'Tahta değil, deridir efendim, deve derisi!'],
  ['k', 'İşte bak! Bunu da sen söyledin Hacivat!'],
  ['h', 'Şakayı bırak da sözümü dinle bir kere.'],
  ['k', 'Dinliyorum, iki kulağım da sende!'],
  ['h', 'Kulakları değil, aklını bana ver efendim.'],
  ['k', 'Aklımı verirsem ben ne ile düşüneceğim?'],
  ['h', 'Ah Karagöz, gene perdeyi birbirine kattın!'],
  ['k', 'Yıktın perdeyi, eyledin viran! Varayım sahibine haber vereyim!'],
  ['h', 'Sürç-i lisan ettikse affola!']
];
let scriptIdx = 0;
const OUCH = { k: ['Ah!', 'Ulan!', 'Aman başım!', 'Of kafam!'], h: ['Ah!', 'Aman efendim!', 'Of of!', 'Vay başım!'] };
const HOP = { k: ['Hoppala!', 'Hop!', 'Oley!'], h: ['Hop!', 'Maşallah!', 'Ya sabır!'] };
const HELLO = { k: 'Ulan Hacivat!', h: 'Hay Hak!' };
function nextLine(code) {
  for (let i = 0; i < SCRIPT.length; i++) {
    const j = (scriptIdx + i) % SCRIPT.length;
    if (SCRIPT[j][0] === code) { scriptIdx = (j + 1) % SCRIPT.length; return SCRIPT[j][1]; }
  }
  return '...';
}

/* ------------------------------------------------------------------ AUDIO */
let AC = null;
function audio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (AC.state === 'suspended') AC.resume();
  return AC;
}
function noiseBuf(a, dur) { const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }
function sfx(kind) {
  if (!settings.sound) return; const a = audio(); if (!a) return; const t = a.currentTime;
  const out = a.createGain(); out.gain.value = .5; out.connect(a.destination);
  if (kind === 'tef') { // def vuruşu + zil
    const n = a.createBufferSource(); n.buffer = noiseBuf(a, .4);
    const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 180; bp.Q.value = 1.2;
    const g = a.createGain(); g.gain.setValueAtTime(1.2, t); g.gain.exponentialRampToValueAtTime(.001, t + .18);
    n.connect(bp).connect(g).connect(out);
    const o = a.createOscillator(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(60, t + .15);
    const og = a.createGain(); og.gain.setValueAtTime(.8, t); og.gain.exponentialRampToValueAtTime(.001, t + .2); o.connect(og).connect(out); o.start(t); o.stop(t + .22);
    const z = a.createBufferSource(); z.buffer = noiseBuf(a, .4); const hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6500;
    const zg = a.createGain(); zg.gain.setValueAtTime(.35, t + .01); zg.gain.exponentialRampToValueAtTime(.001, t + .35);
    z.connect(hp).connect(zg).connect(out); n.start(t); z.start(t);
  } else if (kind === 'nareke') { // perdeci düdüğü
    const o = a.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(1100, t); o.frequency.linearRampToValueAtTime(1650, t + .12); o.frequency.linearRampToValueAtTime(1350, t + .32); o.frequency.linearRampToValueAtTime(1800, t + .5);
    const v = a.createOscillator(); v.frequency.value = 22; const vg = a.createGain(); vg.gain.value = 40; v.connect(vg).connect(o.frequency);
    const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.25, t + .03); g.gain.setValueAtTime(.25, t + .45); g.gain.exponentialRampToValueAtTime(.001, t + .62);
    o.connect(g).connect(out); o.start(t); v.start(t); o.stop(t + .65); v.stop(t + .65);
  } else if (kind === 'whoosh') {
    const n = a.createBufferSource(); n.buffer = noiseBuf(a, .6); const bp = a.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2500, t + .45);
    const g = a.createGain(); g.gain.setValueAtTime(.001, t); g.gain.exponentialRampToValueAtTime(.5, t + .2); g.gain.exponentialRampToValueAtTime(.001, t + .55);
    n.connect(bp).connect(g).connect(out); n.start(t);
  } else if (kind === 'tik') {
    const o = a.createOscillator(); o.type = 'square'; o.frequency.value = 900; const g = a.createGain();
    g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); o.connect(g).connect(out); o.start(t); o.stop(t + .06);
  }
}

/* ------------------------------------------------------------------ SPEECH */
let voiceTR = null, speakingPuppet = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const vs = speechSynthesis.getVoices();
  voiceTR = vs.find(v => /^tr/i.test(v.lang) && /google|yelda|enhanced|premium/i.test(v.name)) || vs.find(v => /^tr/i.test(v.lang)) || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(p, text, opts = {}) {
  const dur = opts.short ? 1.3 : clamp(1.4 + text.length * .062, 1.8, 6);
  const o = p.other; if (o && o.bubble && !opts.short) { o.bubble.dur = Math.min(o.bubble.dur, o.bubble.t + .25); o.talkT = 0; }
  p.bubble = { text, t: 0, dur, short: !!opts.short };
  p.talkT = dur - (opts.short ? .3 : .5);
  testHooks.lastLines.push(p.code + ':' + text);
  if (settings.voice && 'speechSynthesis' in window && voiceTR) {
    try {
      if (speakingPuppet && speakingPuppet !== p && speakingPuppet.bubble) speakingPuppet.talkT = 0;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voiceTR; u.lang = voiceTR.lang;
      u.pitch = p.code === 'k' ? .6 : 1.25; u.rate = p.code === 'k' ? 1.08 : 1.0;
      speakingPuppet = p; p.talkT = 30;
      const started = performance.now();
      u.onend = u.onerror = () => {
        if (speakingPuppet === p) speakingPuppet = null;
        p.talkT = 0; if (p.bubble && p.bubble.text === text) p.bubble.dur = Math.max(p.bubble.t + .7, Math.min(p.bubble.dur, (performance.now() - started) / 1000 + .9));
      };
      // TTS sessizse (bazı cihazlar) kuklalar yine de konuşsun
      setTimeout(() => { if (speakingPuppet === p && !speechSynthesis.speaking) { p.talkT = dur; speakingPuppet = null; } }, 1200);
      speechSynthesis.speak(u);
      p.bubble.dur = Math.max(dur, 2.2) + 2; // gerçek süre onend ile kısalır
    } catch (e) { }
  }
}

/* ------------------------------------------------------------------ PUPPET */
class Puppet {
  constructor(kind, xFrac, facing) {
    this.kind = kind; this.code = kind[0]; this.A = ART[kind];
    this.xFrac = xFrac; this.facing = facing; this.face = facing;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0; this.tx = null; this.ty = null;
    this.bow = 0; this.bowV = 0; this.head = 0; this.headV = 0; this.jaw = 0; this.jawV = 0;
    this.hipB = 0; this.hipBV = 0; this.hipF = 0; this.hipFV = 0; this.kneeB = 0; this.kneeBV = 0; this.kneeF = 0; this.kneeFV = 0;
    this.sh = .1; this.shV = 0; this.el = -.2; this.elV = 0; this.shB = .1; this.shBV = 0;
    this.rot = 0; this.rotV = 0; this.depth = 0; this.depthV = 0;
    this.phase = 0; this.walk = 0; this.idle = 0; this.turnHold = 0;
    this.ctl = { bow: 0, arm: 0, tilt: 0, depth: 0 };
    this.src = 'none'; this.lostT = 9;
    this.talkT = 0; this.bubble = null; this.punchT = 0; this.flipT = -1; this.flipDir = 1; this.hitCd = 0; this.flipCd = 0;
    this.knockX = 0; this.knockV = 0; this.head0 = [0, 0];
  }
  get baseY() { return H * .955 - 122 * S; }
  place() { this.x = W * this.xFrac; this.y = this.baseY; this.tx = this.x; this.ty = this.y; }
  spring(k, target, stiff, damp, dt) { const v = k + 'V'; this[v] += ((target - this[k]) * stiff - this[v] * damp) * dt; this[k] += this[v] * dt; }
  talk() { say(this, nextLine(this.code)); sfx('tik'); }
  punch() {
    if (this.hitCd > 0) return; this.hitCd = .45; this.punchT = .42;
    const o = this.other, dx = o.x - this.x;
    if (Math.sign(dx) === Math.sign(this.face) && Math.abs(dx) < 230 * S && Math.abs(o.y - this.y) < 150 * S) {
      setTimeout(() => {
        o.knockV += Math.sign(dx) * 900 * S; o.rotV += Math.sign(dx) * 7; o.headV += Math.sign(dx) * 14;
        sfx('tef'); fx.push({ type: 'pat', x: (this.x + o.x) / 2, y: this.y - 85 * S, t: 0 });
        if (!o.bubble || o.bubble.t > .5) say(o, OUCH[o.code][Math.floor(Math.random() * 4)], { short: true });
        shake = .25;
      }, 120);
    } else sfx('whoosh');
  }
  flip() { if (this.flipT >= 0 || this.flipCd > 0) return; this.flipT = 0; this.flipDir = this.face >= 0 ? 1 : -1; this.flipCd = 1; sfx('whoosh'); setTimeout(() => sfx('nareke'), 380); }
  turn() { this.facing = -this.facing; this.turnHold = 1.6; }

  update(dt, t) {
    const o = this.other;
    if (this.tx === null) this.place();
    this.hitCd -= dt; this.flipCd -= dt; this.turnHold -= dt;
    // Kaynağı yitirince yerinde kal, nazikçe zemine dön
    this.lostT += dt;
    if (this.src === 'none' || this.lostT > .35) {
      this.ty = lerp(this.ty, this.baseY, 1 - Math.pow(.25, dt)); this.ctl.arm *= Math.pow(.05, dt); this.ctl.bow *= Math.pow(.1, dt); this.ctl.tilt *= Math.pow(.1, dt); this.ctl.depth *= Math.pow(.2, dt);
    }
    const tx = clamp(this.tx, 60 * S, W - 60 * S), ty = clamp(this.ty, this.baseY - H * .3, this.baseY + H * .03);
    const ox = this.x, oy = this.y;
    // konum yayı (yumuşatma + ikincil hareket)
    const stiff = 150, damp = 21;
    const ax = (tx - this.x) * stiff - this.vx * damp, ay = (ty - this.y) * stiff - this.vy * damp;
    this.vx += ax * dt; this.vy += ay * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    this.knockV += (-this.knockX * 90 - this.knockV * 11) * dt; this.knockX += this.knockV * dt;
    const vxu = (this.x - ox) / dt / S, vyu = (this.y - oy) / dt / S, axu = ax / S;

    // yön: harekete göre (eşik + gecikme), durunca karşısındakine bakar
    const sp = Math.abs(vxu);
    if (sp > 140) { this.turnHold = Math.max(this.turnHold, .9); if (Math.sign(vxu) !== this.facing) { this.turnAcc = (this.turnAcc || 0) + dt; if (this.turnAcc > .1) { this.facing = Math.sign(vxu); this.turnAcc = 0; } } else this.turnAcc = 0; }
    if (sp < 40) this.idle += dt; else this.idle = 0;
    if (this.idle > 1.1 && this.turnHold <= 0 && o) { const want = Math.sign(o.x - this.x) || this.facing; if (want !== this.facing) this.facing = want; }
    this.face += (this.facing - this.face) * Math.min(1, dt * 11);
    if (Math.abs(this.face) < .08) this.face = this.facing * .08; // hiçbir zaman tam sıfır olmasın

    const F = this.facing;
    // yürüme döngüsü
    const wantWalk = clamp((sp - 30) / 380, 0, 1);
    this.walk += (wantWalk - this.walk) * Math.min(1, dt * (wantWalk > this.walk ? 8 : 3));
    this.phase += dt * clamp(4 + sp * .022, 4, 15) * (this.walk > .02 ? 1 : 0);
    const a = this.walk * .55, sn = Math.sin(this.phase);
    const lag = clamp(axu * F * .00028, -.9, .9);
    const fl = this.flipT >= 0 ? Math.sin(this.flipT * Math.PI) : 0;
    this.spring('hipF', a * sn + lag - fl * .9, 140, 9, dt);
    this.spring('hipB', -a * sn + lag - fl * .7, 140, 9, dt);
    this.spring('kneeF', a * .9 * Math.max(0, -Math.cos(this.phase)) + Math.max(0, lag) * .6 + fl * 1.6, 160, 10, dt);
    this.spring('kneeB', a * .9 * Math.max(0, Math.cos(this.phase)) + Math.max(0, lag) * .6 + fl * 1.4, 160, 10, dt);

    // gövde eğilmesi / selam
    const bowT = clamp(this.ctl.bow, -.45, .85) + (this.punchT > 0 ? .25 : 0) + this.walk * .08;
    this.spring('bow', bowT - fl * .5, 110, 12, dt);
    // kol
    let arm = this.ctl.arm;
    if (this.punchT > 0) { const k = this.punchT / .42; arm = Math.max(arm, k > .6 ? 1.15 : k * 1.4); this.punchT -= dt; }
    const shT = .12 - arm * 2.25 + lag * .5 - a * .35 * sn + fl * -2.2;
    this.spring('sh', shT, 120, 8, dt);
    this.spring('el', -.25 - arm * .5 + lag * .3, 130, 9, dt);
    this.spring('shB', .2 + lag * .4 + a * .3 * sn, 90, 6, dt);
    // baş: hafif gecikmeli, konuşurken başını sallar
    const talking = this.talkT > 0;
    this.talkT -= dt;
    const nod = talking ? Math.sin(t * 9.5) * .06 + .04 : Math.sin(t * 1.3 + this.xFrac * 5) * .02;
    this.spring('head', -this.bow * .35 + nod + clamp(vyu * .0004, -.2, .2), 85, 7, dt);
    // çene
    const jawT = talking ? .17 + .17 * Math.abs(Math.sin(t * 17 + Math.sin(t * 5.3) * 2)) : 0;
    this.spring('jaw', jawT, 420, 24, dt);
    // tüm gövde eğimi
    let rotT = clamp(this.ctl.tilt * .15, -.2, .2) + clamp(vxu * .00012, -.12, .12);
    this.spring('rot', rotT, 90, 10, dt);
    this.spring('depth', this.ctl.depth, 40, 11, dt);
    if (this.flipT >= 0) { this.flipT += dt / .8; if (this.flipT >= 1) { this.flipT = -1; dust(this.x, this.baseY + 118 * S); if (!this.bubble || this.bubble.t > 1) say(this, HOP[this.code][Math.floor(Math.random() * 3)], { short: true }); } }
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }

    // nefes
    this.breath = Math.sin(t * 2 + this.xFrac * 7) * 1.2;
    this.bob = Math.abs(sn) * a * 10;
  }

  draw(g, t) {
    const A = this.A, c = A.c, F = this.face, sc = S * (1 + this.depth * .16);
    let rot = this.rot * Math.sign(this.facing), jump = 0;
    if (this.flipT >= 0) { const e = ease(this.flipT); rot += e * TAU * this.flipDir; jump = -Math.sin(this.flipT * Math.PI) * 110 * S; }
    g.save();
    g.translate(this.x + this.knockX, this.y - this.bob * S + this.breath * S * .3 + jump - 40 * S * this.depth);
    g.rotate(rot + clamp(this.knockV / S * .0002, -.3, .3));
    g.translate(0, -60 * sc * 0); // pivot bel
    g.scale(sc * F, sc);
    g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = 2.3;

    const leg = (hip, hipA, kneeA, back) => {
      g.save(); g.translate(hip[0], hip[1]); g.rotate(hipA);
      part(g, LEG.thigh, back ? shade(c.shalvar) : c.shalvar); holes(g, A.hThigh);
      g.translate(0, 56); g.rotate(kneeA);
      part(g, LEG.shin, c.shin); holes(g, A.hShin, .55);
      part(g, LEG.cuff, back ? shade(c.shalvar) : c.shalvar);
      part(g, LEG.shoe, back ? shade(c.shoe) : c.shoe);
      g.restore();
    };
    const arm = (sh, el, back) => {
      g.save(); g.translate(A.shoulder[0], A.shoulder[1]); g.rotate(sh);
      part(g, ARM.upper, back ? c.sleeveB : c.sleeve); if (!back) holes(g, A.hSleeve, .8);
      g.translate(0, 38); g.rotate(el);
      part(g, ARM.fore, back ? c.sleeveB : c.sleeve);
      part(g, ARM.cuff, c.trim);
      part(g, ARM.hand, back ? shade(c.skin) : c.skin);
      g.restore();
    };
    leg(A.hips[0], this.hipB, this.kneeB, true);
    leg(A.hips[1], this.hipF, this.kneeF, false);
    g.save(); g.rotate(this.bow);
    arm(this.shB, -.35, true);
    part(g, A.robe, c.robe); holes(g, A.hRobe);
    part(g, A.vest, c.vest); part(g, A.vestF, c.vest);
    for (const l of A.lines2) { g.save(); g.strokeStyle = c.trim; g.lineWidth = 3; g.stroke(l); g.restore(); }
    part(g, A.hemTrim, c.trim); holes(g, A.hHem);
    part(g, A.belt, c.belt); holes(g, A.hBelt);
    // baş
    g.save(); g.translate(A.neck[0], A.neck[1]); g.rotate(this.head); g.scale(1.24, 1.24); g.lineWidth = 2.3 / 1.24;
    part(g, A.face, c.skin); part(g, A.ear, shade(c.skin));
    g.save(); g.translate(A.jawPivot[0], A.jawPivot[1]); g.rotate(this.jaw); g.translate(-A.jawPivot[0], -A.jawPivot[1]);
    part(g, A.jaw, c.beard); g.restore();
    part(g, A.mous, c.beard);
    // göz
    const [ex, ey, er] = A.eye;
    g.fillStyle = '#fff8e6'; g.beginPath(); g.ellipse(ex, ey, er * 1.25, er, 0, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#140904'; g.beginPath(); g.arc(ex + er * .35, ey + .3, er * .55, 0, TAU); g.fill();
    g.save(); g.lineWidth = 3; g.stroke(A.brow); g.restore();
    for (const l of A.lines) g.stroke(l);
    // kavuk
    part(g, A.hat, c.hat);
    g.save(); g.clip(A.hat); g.strokeStyle = c.hat2; g.lineWidth = 5;
    for (let i = -6; i < 6; i++) { g.beginPath(); g.moveTo(-40 + i * 11, -50); g.lineTo(-10 + i * 11, -120); g.stroke(); }
    g.restore(); g.stroke(A.hat); holes(g, A.hHat, .7);
    part(g, A.hatTop, c.hat2);
    part(g, A.hatBand, c.band);
    g.save(); g.clip(A.hatBand); g.strokeStyle = shade(c.band, .78); g.lineWidth = 2;
    for (let i = -8; i < 8; i++) { g.beginPath(); g.moveTo(-30 + i * 7, -36); g.lineTo(-22 + i * 7, -66); g.stroke(); }
    g.restore(); g.stroke(A.hatBand);
    // baş konumu (balon için)
    const m = g.getTransform(); this.headScreen = [m.e / DPR, m.f / DPR];
    g.restore(); g.lineWidth = 2.3;
    arm(this.sh, this.el, false);
    g.restore();
    g.restore();
  }

  hitTest(px, py) { return Math.abs(px - this.x) < 75 * S && py > this.y - 240 * S && py < this.y + 125 * S; }
}
function part(g, path, fill) { g.fillStyle = fill; g.fill(path); g.stroke(path); }
function holes(g, pts, a = 1) {
  if (!pts || !pts.length) return;
  g.save(); g.fillStyle = `rgba(255,247,222,${.92 * a})`;
  g.beginPath(); for (const p of pts) { g.moveTo(p[0] + p[2], p[1]); g.arc(p[0], p[1], p[2], 0, TAU); } g.fill(); g.restore();
}
const shadeCache = {};
function shade(hex, f = .8) {
  const k = hex + f; if (shadeCache[k]) return shadeCache[k];
  const n = parseInt(hex.slice(1), 16), r = (n >> 16) * f | 0, gg = ((n >> 8) & 255) * f | 0, b = (n & 255) * f | 0;
  return (shadeCache[k] = `rgb(${r},${gg},${b})`);
}

const karagoz = new Puppet('karagoz', .3, 1), hacivat = new Puppet('hacivat', .7, -1);
karagoz.other = hacivat; hacivat.other = karagoz;
const puppets = [karagoz, hacivat];

/* ------------------------------------------------------------------ FX */
const fx = []; let shake = 0;
function dust(x, y) { for (let i = 0; i < 14; i++) fx.push({ type: 'dust', x, y, vx: rnd(-160, 160) * S, vy: rnd(-120, -20) * S, t: 0, r: rnd(4, 9) * S }); }
function drawFx(g, dt) {
  for (let i = fx.length - 1; i >= 0; i--) {
    const f = fx[i]; f.t += dt;
    if (f.type === 'dust') {
      f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 200 * S * dt;
      g.fillStyle = `rgba(110,70,30,${.35 * (1 - f.t / .8)})`; g.beginPath(); g.arc(f.x, f.y, f.r * (1 + f.t), 0, TAU); g.fill();
      if (f.t > .8) fx.splice(i, 1);
    } else if (f.type === 'pat') {
      const k = f.t / .7, s = (.55 + ease(Math.min(1, k * 2)) * .4) * S;
      g.save(); g.translate(f.x, f.y); g.rotate(-.15); g.scale(s, s); g.globalAlpha = 1 - Math.max(0, k - .6) / .4;
      g.fillStyle = '#ffde59'; g.strokeStyle = OUT; g.lineWidth = 3; g.beginPath();
      for (let j = 0; j < 20; j++) { const r = j % 2 ? 34 : 62, a = j / 20 * TAU; g.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r); }
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#b3241a'; g.font = '900 38px Lora,Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('PAT!', 0, 2);
      g.restore(); if (k > 1) fx.splice(i, 1);
    }
  }
}

/* ------------------------------------------------------------------ BACKDROP */
function buildBackdrop() {
  backdrop.width = stage.width; backdrop.height = stage.height;
  const g = bctx; g.setTransform(DPR, 0, 0, DPR, 0, 0);
  // perde: arkadan yanan kumaş
  const grd = g.createRadialGradient(W * .5, H * .42, 10, W * .5, H * .5, Math.max(W, H) * .75);
  grd.addColorStop(0, '#fff8e2'); grd.addColorStop(.45, '#f7e3b2'); grd.addColorStop(.8, '#e6c182'); grd.addColorStop(1, '#c69455');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  // dokuma
  g.globalAlpha = .045; g.fillStyle = '#5a3210';
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'multiply';
  const u = Math.min(H * .0019, W * .0017);
  drawTree(g, W * .02, H * .985, u);
  drawKosk(g, W * .985, H * .985, u);
  drawBunting(g, u);
  g.globalCompositeOperation = 'source-over';
  // alt kenar gölgesi + vinyet
  const v = g.createLinearGradient(0, H * .9, 0, H); v.addColorStop(0, 'rgba(60,30,8,0)'); v.addColorStop(1, 'rgba(60,30,8,.35)');
  g.fillStyle = v; g.fillRect(0, H * .9, W, H * .1);
}
function drawTree(g, x, y, u) { // göstermelik: selvi + çiçekli ağaç
  g.save(); g.translate(x, y); g.scale(u, u); g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 2.4;
  const p = (d, f) => { const pa = P(d); g.fillStyle = f; g.fill(pa); g.stroke(pa); return pa; };
  p('M30,0 C34,-60 26,-120 36,-170 L50,-170 C58,-120 52,-60 58,0 Z', '#7a4a24');
  p('M44,-150 C10,-180 0,-250 44,-330 C88,-250 78,-180 44,-150 Z', '#2f7d45');
  const leaves = [[-10, -190, 34, 22, '#3f9150'], [90, -200, 36, 24, '#3f9150'], [-20, -240, 28, 20, '#2a6e3c'], [100, -250, 30, 20, '#2a6e3c'], [60, -280, 26, 18, '#3f9150']];
  for (const [lx, ly, rx, ry, cc] of leaves) { g.fillStyle = cc; g.beginPath(); g.ellipse(lx + 10, ly, rx, ry, -.4, 0, TAU); g.fill(); g.stroke(); }
  g.globalCompositeOperation = 'source-over';
  for (const [fx_, fy] of [[-14, -200], [96, -212], [-24, -246], [110, -256], [64, -290], [40, -230], [20, -270]]) {
    g.fillStyle = '#c0392b'; g.beginPath(); for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.ellipse(fx_ + 10 + Math.cos(a) * 6, fy + Math.sin(a) * 6, 5, 4, a, 0, TAU); } g.fill(); g.stroke();
    g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(fx_ + 10, fy, 3.5, 0, TAU); g.fill();
  }
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(255,247,222,.9)';
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(44 + Math.sin(i) * 8, -180 - i * 16, 2, 0, TAU); g.fill(); }
  p('M0,0 C-4,-20 4,-34 18,-36 L72,-36 C86,-34 92,-20 88,0 Z', '#b5562d');
  g.fillStyle = 'rgba(255,247,222,.9)'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(12 + i * 11, -18, 2.2, 0, TAU); g.fill(); }
  g.restore();
}
function drawKosk(g, x, y, u) { // göstermelik: köşk
  g.save(); g.translate(x, y); g.scale(-u, u); g.lineJoin = 'round'; g.strokeStyle = OUT; g.lineWidth = 2.4;
  const p = (d, f) => { const pa = P(d); g.fillStyle = f; g.fill(pa); g.stroke(pa); return pa; };
  p('M0,0 L0,-210 L120,-210 L120,0 Z', '#d99a3a');
  p('M-14,-205 L134,-205 L120,-232 L0,-232 Z', '#9c3a22');
  p('M10,-232 C10,-280 110,-280 110,-232 Z', '#2f7d45');
  p('M57,-276 L63,-276 L62,-300 L58,-300 Z', '#e6b440');
  g.fillStyle = '#e6b440'; g.beginPath(); g.arc(60, -304, 5, 0, TAU); g.fill(); g.stroke();
  p('M128,0 L128,-300 L146,-300 L146,0 Z', '#e8d3a0');
  p('M124,-300 L150,-300 L137,-350 Z', '#9c3a22');
  p('M121,-230 L153,-230 L150,-220 L124,-220 Z', '#9c3a22');
  for (const [wx, wy] of [[16, -190], [68, -190], [16, -110], [68, -110]]) {
    const w = p(`M${wx},${wy + 60} L${wx},${wy + 18} C${wx},${wy} ${wx + 36},${wy} ${wx + 36},${wy + 18} L${wx + 36},${wy + 60} Z`, '#3b2412');
    g.save(); g.clip(w); g.strokeStyle = '#e6b440'; g.lineWidth = 2;
    for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(wx + i * 8, wy); g.lineTo(wx + i * 8 + 40, wy + 60); g.moveTo(wx + i * 8 + 40, wy); g.lineTo(wx + i * 8, wy + 60); g.stroke(); }
    g.restore();
  }
  p('M44,0 L44,-40 C44,-56 76,-56 76,-40 L76,0 Z', '#5a2e14');
  g.fillStyle = 'rgba(255,247,222,.9)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(8 + i * 9.5, -220, 1.8, 0, TAU); g.fill(); }
  for (let i = 0; i < 18; i++) { g.beginPath(); g.arc(137, -20 - i * 15, 1.8, 0, TAU); g.fill(); }
  g.restore();
}
function drawBunting(g, u) {
  g.save(); g.strokeStyle = OUT; g.lineWidth = 1.6 * u;
  const cols = ['#c0392b', '#2f7d45', '#e6b440', '#2a5d8f'];
  const y0 = H * .045, sag = H * .05, n = Math.max(8, Math.round(W / (52 * u)));
  g.beginPath(); g.moveTo(0, y0); g.quadraticCurveTo(W / 2, y0 + sag * 2, W, y0); g.stroke();
  for (let i = 0; i < n; i++) {
    const t = (i + .5) / n, x = t * W, y = y0 + sag * 4 * t * (1 - t) * .98 + 1, s = 15 * u;
    g.fillStyle = cols[i % 4]; g.beginPath(); g.moveTo(x - s, y); g.lineTo(x + s, y); g.lineTo(x, y + s * 1.7); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,247,222,.9)'; g.beginPath(); g.arc(x, y + s * .55, 2.2 * u, 0, TAU); g.fill();
  }
  g.restore();
}

/* ------------------------------------------------------------------ BUBBLE */
function wrap(g, text, maxW) {
  const words = text.split(' '), lines = []; let cur = '';
  for (const w of words) { const tt = cur ? cur + ' ' + w : w; if (g.measureText(tt).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tt; }
  if (cur) lines.push(cur); return lines;
}
function drawBubble(g, p) {
  const b = p.bubble; if (!b || !p.headScreen) return;
  const a = Math.min(1, b.t / .15, (b.dur - b.t) / .3); if (a <= 0) return;
  const fs = clamp(Math.min(H, W * .62) * .04, 13, 26); g.font = `600 ${fs}px Lora,Georgia,serif`;
  const maxW = Math.min(W * .36, 340 * S + 60);
  const lines = wrap(g, b.text, maxW); const lh = fs * 1.25;
  const tw = Math.max(...lines.map(l => g.measureText(l).width)), bw = tw + fs * 1.4, bh = lines.length * lh + fs * .9;
  const [hx, hy] = p.headScreen;
  const away = p.other ? Math.sign(p.x - p.other.x) || 1 : 1;
  let bx = hx - bw / 2 + away * bw * .22, by = hy - 150 * S - bh;
  if (p.other && p.other.bubble && p.other._bb) { const q = p.other._bb; if (bx < q[0] + q[2] && bx + bw > q[0] && by < q[1] + q[3] && by + bh > q[1]) by = q[1] - bh - 10; }
  bx = clamp(bx, 8, W - bw - 8); by = clamp(by, 8, H - bh - 8); p._bb = [bx, by, bw, bh];
  g.save(); g.globalAlpha = a; const pop = 1 + (1 - Math.min(1, b.t / .15)) * .15;
  g.translate(bx + bw / 2, by + bh / 2); g.scale(pop, pop); g.translate(-bx - bw / 2, -by - bh / 2);
  g.fillStyle = '#fffaf0'; g.strokeStyle = p.code === 'k' ? '#a83324' : '#2a6e3c'; g.lineWidth = 2.5;
  g.shadowColor = 'rgba(60,30,8,.35)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.beginPath(); rr(g, bx, by, bw, bh, fs * .6);
  const tailX = clamp(hx + p.facing * 20 * S, bx + 20, bx + bw - 20);
  g.moveTo(tailX - 10, by + bh); g.lineTo(clamp(hx + p.facing * 34 * S, 4, W - 4), Math.min(hy - 100 * S, H - 4)); g.lineTo(tailX + 10, by + bh);
  g.fill(); g.shadowColor = 'transparent'; g.stroke();
  g.fillStyle = '#fffaf0'; g.fillRect(tailX - 8.5, by + bh - 2.5, 17, 4);
  g.fillStyle = '#2a1206'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, bx + bw / 2, by + fs * .45 + lh * (i + .5)));
  g.restore();
}
function rr(g, x, y, w, h, r) { g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

/* ------------------------------------------------------------------ RESIZE */
function resize() {
  const r = stage.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const oldW = W, oldH = H;
  DPR = Math.min(window.devicePixelRatio || 1, 2); W = r.width; H = r.height;
  stage.width = Math.round(W * DPR); stage.height = Math.round(H * DPR);
  off.width = stage.width; off.height = stage.height;
  S = Math.min(H * .0017, W * .0017);
  buildBackdrop();
  for (const p of puppets) {
    if (p.tx === null) continue;
    const fx_ = p.x / oldW; p.x = p.tx = fx_ * W; p.y = p.ty = p.baseY;
  }
}
new ResizeObserver(resize).observe(stage);

/* ------------------------------------------------------------------ INPUT: pointer */
const drags = new Map(); let lastTap = { t: 0, p: null };
stage.addEventListener('pointerdown', e => {
  const r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
  audio();
  let best = null, bd = 1e9;
  for (const p of puppets) { const d = Math.abs(p.x - x) + (p.hitTest(x, y) ? 0 : 1000); if (d < bd) { bd = d; best = p; } }
  if (!best || bd > 1000) best = Math.abs(karagoz.x - x) < Math.abs(hacivat.x - x) ? karagoz : hacivat;
  const now = performance.now();
  if (lastTap.p === best && now - lastTap.t < 320) best.flip();
  lastTap = { t: now, p: best };
  stage.setPointerCapture(e.pointerId);
  drags.set(e.pointerId, { p: best, dx: best.x - x, dy: best.y - y });
  best.src = 'pointer'; best.lostT = 0;
});
stage.addEventListener('pointermove', e => {
  const d = drags.get(e.pointerId); if (!d) return;
  const r = stage.getBoundingClientRect();
  d.p.tx = e.clientX - r.left + d.dx; d.p.ty = e.clientY - r.top + d.dy; d.p.src = 'pointer'; d.p.lostT = 0;
});
const endDrag = e => { const d = drags.get(e.pointerId); if (d) { d.p.lostT = 0; drags.delete(e.pointerId); } };
stage.addEventListener('pointerup', endDrag); stage.addEventListener('pointercancel', endDrag);

function act(p, a) { audio(); if (a === 'talk') p.talk(); else if (a === 'hit') p.punch(); else if (a === 'flip') p.flip(); else if (a === 'turn') p.turn(); }
document.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => act(puppets[+b.dataset.p], b.dataset.a)));
const KEYS = { q: [0, 'talk'], w: [0, 'hit'], e: [0, 'flip'], r: [0, 'turn'], u: [1, 'talk'], i: [1, 'hit'], o: [1, 'flip'], p: [1, 'turn'] };
addEventListener('keydown', e => {
  if (e.repeat || e.metaKey || e.ctrlKey) return; const k = KEYS[e.key.toLowerCase()];
  if (k) { act(puppets[k[0]], k[1]); return; }
  const mv = { a: [0, -1], d: [0, 1], arrowleft: [1, -1], arrowright: [1, 1] }[e.key.toLowerCase()];
  if (mv) { const p = puppets[mv[0]]; p.tx = clamp(p.tx + mv[1] * W * .12, 0, W); p.src = 'key'; p.lostT = 0; e.preventDefault(); }
});

/* ------------------------------------------------------------------ INPUT: hands */
let lastDet = 0, detGap = 0, detMs = 10;
let landmarker = null, camOn = false, lastVT = -1, handsSeen = 0, lastHands = [], noHandT = 0;
const owner = [null, null]; // her el yuvası için hangi kukla
const handState = new Map(); // kukla -> önceki el ölçümleri

async function startCamera() {
  const btn = $('#bCam'), msg = $('#loadMsg');
  btn.disabled = true; msg.textContent = 'Kamera açılıyor…';
  audio(); unlockVoice();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
    video.srcObject = stream; await video.play().catch(() => { });
  } catch (e) {
    msg.textContent = 'Kameraya erişilemedi (' + (e.name || 'hata') + '). Dokunarak oynayabilirsin.'; btn.disabled = false; return;
  }
  msg.textContent = 'El takibi yükleniyor… (ilk seferde ~15 MB)';
  try {
    const vision = await import('./vendor/vision_bundle.mjs');
    const fileset = await vision.FilesetResolver.forVisionTasks(new URL('./vendor/wasm', location.href).href);
    const opts = d => ({ baseOptions: { modelAssetPath: new URL('./vendor/hand_landmarker.task', location.href).href, delegate: d }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .5, minHandPresenceConfidence: .5, minTrackingConfidence: .5 });
    try { landmarker = await vision.HandLandmarker.createFromOptions(fileset, opts('GPU')); }
    catch (e) { console.warn('GPU yok, CPU', e); landmarker = await vision.HandLandmarker.createFromOptions(fileset, opts('CPU')); }
  } catch (e) {
    console.error(e); msg.textContent = 'El takibi yüklenemedi. Dokunarak oynayabilirsin.'; btn.disabled = false; return;
  }
  camOn = true; testHooks.camReady = true;
  $('#intro').classList.add('hidden'); pip.classList.toggle('on', settings.pip);
  openingLines();
}
function startTouch() { audio(); unlockVoice(); $('#intro').classList.add('hidden'); openingLines(); flash('Kuklaları sürükle · çift dokun: takla · düğmelerle konuştur'); }
function unlockVoice() { if (settings.voice && 'speechSynthesis' in window) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { } } }
let opened = false;
function openingLines() { if (opened) return; opened = true; sfx('nareke'); setTimeout(() => say(hacivat, nextLine('h')), 700); }

function features(lm) {
  // aynalanmış koordinatlar (selfie görünümü)
  const P_ = i => ({ x: 1 - lm[i].x, y: lm[i].y, z: lm[i].z });
  const w = P_(0), m = P_(9), idx = P_(8), th = P_(4);
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const size = d(w, m) || .001;
  let cx = 0, cy = 0; for (const i of [0, 5, 9, 13, 17]) { const q = P_(i); cx += q.x; cy += q.y; } cx /= 5; cy /= 5;
  const tilt = Math.atan2(m.x - w.x, -(m.y - w.y)); // 0 = dik, + sağa
  let curl = 0; for (const [tip, pip_] of [[8, 6], [12, 10], [16, 14], [20, 18]]) { curl += d(P_(tip), w) / Math.max(1e-3, d(P_(pip_), w)); }
  curl /= 4; // açık ≈ 1.25+, yumruk ≈ < .95
  const fist = map01(1.18 - curl, 0, .32);
  const pinch = d(th, idx) / size;
  return { x: cx, y: cy, size, tilt, fist, pinch };
}

function processHands(res, dt) {
  const hands = (res.landmarks || []).map(lm => ({ lm, f: features(lm) }));
  handsSeen = hands.length; testHooks.hands = hands.length; lastHands = hands;
  const tgt = h => ({ x: W * (.05 + .9 * map01(h.f.x, .1, .9)), y: karagoz.baseY + (h.f.y - .55) * H * .7 });
  // eller -> kuklalar eşleşmesi (en yakın, yapışkan)
  let assign = [];
  if (hands.length === 2) {
    const a = hands.map(tgt);
    const c1 = Math.abs(a[0].x - karagoz.x) + Math.abs(a[1].x - hacivat.x), c2 = Math.abs(a[0].x - hacivat.x) + Math.abs(a[1].x - karagoz.x);
    // varsayılan: ekranın solundaki el Karagöz
    const leftFirst = a[0].x <= a[1].x;
    let pick = c1 < c2 ? [karagoz, hacivat] : [hacivat, karagoz];
    if (Math.abs(c1 - c2) < W * .15) pick = leftFirst ? [karagoz, hacivat] : [hacivat, karagoz];
    assign = [[hands[0], pick[0]], [hands[1], pick[1]]];
  } else if (hands.length === 1) {
    const a = tgt(hands[0]);
    let p = Math.abs(a.x - karagoz.x) < Math.abs(a.x - hacivat.x) ? karagoz : hacivat;
    const prev = handState.get('single');
    if (prev && prev.p && Math.abs(a.x - prev.p.x) < W * .3 && performance.now() - prev.t < 600) p = prev.p;
    handState.set('single', { p, t: performance.now() });
    assign = [[hands[0], p]];
  }
  for (const [h, p] of assign) {
    if (p.src === 'pointer' && p.lostT < .5 && [...drags.values()].some(d => d.p === p)) continue;
    const a = tgt(h), f = h.f;
    p.tx = a.x; p.ty = a.y; p.src = 'hand'; p.lostT = 0; h.p = p;
    const prev = handState.get(p) || { pinchClosed: false, fist: 0, tilt: f.tilt, t: performance.now() };
    const now = performance.now(), hdt = Math.max(.016, (now - prev.t) / 1000);
    p.ctl.arm = lerp(p.ctl.arm, f.fist, .5);
    p.ctl.tilt = lerp(p.ctl.tilt, clamp(f.tilt, -1.2, 1.2), .4);
    p.ctl.bow = clamp(p.ctl.tilt * Math.sign(p.facing) * 1.1, -.45, .85);
    p.ctl.depth = lerp(p.ctl.depth, map01(f.size, .13, .26), .2);
    // konuşma: parmak ucu birleşince
    const closed = prev.pinchClosed ? f.pinch < .55 : f.pinch < .32;
    if (closed && !prev.pinchClosed && f.fist < .5 && (!p.bubble || p.bubble.t > .6 || p.bubble.short)) p.talk();
    // yumruk: hızlı kapanış -> vuruş
    const df = (f.fist - prev.fist) / hdt;
    if (f.fist > .7 && prev.fist <= .7 && df > 2.2) p.punch();
    // bilek çevirme -> takla
    const dTilt = (f.tilt - prev.tilt) / hdt;
    if (Math.abs(f.tilt) > .7 && Math.abs(dTilt) > 4.5) p.flip();
    handState.set(p, { pinchClosed: closed, fist: f.fist, tilt: f.tilt, t: now });
  }
}

const CONN = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
function drawPip() {
  if (!settings.pip || !camOn) return;
  const w = pip.width, h = pip.height, vw = video.videoWidth || 640, vh = video.videoHeight || 480;
  const s = Math.max(w / vw, h / vh), dw = vw * s, dh = vh * s;
  pctx.save(); pctx.translate(w, 0); pctx.scale(-1, 1); pctx.drawImage(video, (w - dw) / 2, (h - dh) / 2, dw, dh); pctx.restore();
  const ox = (w - dw) / 2, oy = (h - dh) / 2;
  for (const hnd of lastHands) {
    const col = hnd.p === hacivat ? '#5fe07a' : '#ff6b55';
    pctx.strokeStyle = col; pctx.lineWidth = 2; pctx.beginPath();
    for (const [a, b] of CONN) { const A = hnd.lm[a], B = hnd.lm[b]; pctx.moveTo(ox + (1 - A.x) * dw, oy + A.y * dh); pctx.lineTo(ox + (1 - B.x) * dw, oy + B.y * dh); }
    pctx.stroke(); pctx.fillStyle = '#fff';
    for (const q of hnd.lm) { pctx.beginPath(); pctx.arc(ox + (1 - q.x) * dw, oy + q.y * dh, 1.6, 0, TAU); pctx.fill(); }
  }
}

/* ------------------------------------------------------------------ UI */
let flashT = 0;
function flash(text, secs = 3.5) { const s = $('#status'); s.textContent = text; s.classList.add('on'); flashT = secs; }
function toggle(btn, key, after) { btn.addEventListener('click', () => { settings[key] = !settings[key]; btn.setAttribute('aria-pressed', settings[key]); after && after(); }); }
toggle($('#bSound'), 'sound');
toggle($('#bVoice'), 'voice', () => { if (!settings.voice && 'speechSynthesis' in window) speechSynthesis.cancel(); });
toggle($('#bPip'), 'pip', () => pip.classList.toggle('on', settings.pip && camOn));
$('#bFull').addEventListener('click', () => {
  const f = $('#frame');
  if (document.fullscreenElement) document.exitFullscreen(); else if (f.requestFullscreen) f.requestFullscreen().then(() => { try { screen.orientation.lock('landscape'); } catch (e) { } }).catch(() => { });
  else if (f.webkitRequestFullscreen) f.webkitRequestFullscreen();
});
$('#bShot').addEventListener('click', () => {
  stage.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'hayal-perdesi.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  sfx('tik'); flash('Fotoğraf kaydedildi 📸', 2);
});
$('#bCam').addEventListener('click', startCamera);
$('#bTouch').addEventListener('click', startTouch);
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#loadMsg').textContent = 'Bu tarayıcı kamerayı desteklemiyor; dokunarak oynayabilirsin.'; $('#bCam').disabled = true; }
document.addEventListener('visibilitychange', () => { if (document.hidden && 'speechSynthesis' in window) speechSynthesis.cancel(); });

/* ------------------------------------------------------------------ LOOP */
let last = performance.now(), T = 0;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(.05, (now - last) / 1000 || .016); last = now; T += dt;
  // uyarlanır algılama: yavaş cihazda her karede değil, animasyon akıcı kalsın
  if (camOn && landmarker && video.readyState >= 2 && video.currentTime !== lastVT && now - lastDet >= detGap) {
    lastVT = video.currentTime; lastDet = now;
    const t0 = performance.now();
    try { processHands(landmarker.detectForVideo(video, now), dt); } catch (e) { console.warn(e); }
    detMs = detMs * .9 + (performance.now() - t0) * .1; detGap = detMs > 22 ? Math.min(220, detMs * 1.4) : 0; testHooks.detMs = Math.round(detMs);
    if (handsSeen === 0) { noHandT += dt; } else noHandT = 0;
  }
  if (camOn) {
    if (handsSeen === 0 && noHandT > 1.5 && flashT <= 0) flash('✋ Ellerini kameraya göster', .6);
    else if (handsSeen > 0 && flashT <= 0) { const s = $('#status'); s.textContent = handsSeen === 2 ? '✋✋ İki el de görünüyor' : '✋ Bir el görünüyor'; s.classList.add('on'); }
  }
  if (flashT > 0) { flashT -= dt; if (flashT <= 0 && !camOn) $('#status').classList.remove('on'); }
  const steps = 2;
  for (let i = 0; i < steps; i++) for (const p of puppets) p.update(dt / steps, T);
  // gövdeler çarpışırsa birbirini it
  const dx = hacivat.x - karagoz.x, minD = 70 * S;
  if (Math.abs(dx) < minD && Math.abs(hacivat.y - karagoz.y) < 120 * S) { const push = (minD - Math.abs(dx)) * .5 * (Math.sign(dx) || 1); hacivat.knockX += push * .3; karagoz.knockX -= push * .3; }
  render(dt);
  drawPip();
  testHooks.frames++;
  testHooks.state = puppets.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), face: p.facing, src: p.src, arm: +p.ctl.arm.toFixed(2), talk: p.talkT > 0, flip: p.flipT >= 0 }));
}
function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let sx = 0, sy = 0; if (shake > 0) { shake -= dt; sx = rnd(-4, 4) * shake * 4; sy = rnd(-3, 3) * shake * 4; }
  ctx.drawImage(backdrop, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
  // kandil titremesi
  const fl = .045 + Math.sin(T * 7.3) * .012 + Math.sin(T * 13.1) * .008 + Math.sin(T * 2.1) * .01;
  ctx.fillStyle = `rgba(150,80,10,${fl})`; ctx.globalCompositeOperation = 'multiply'; ctx.fillRect(-10, -10, W + 20, H + 20); ctx.globalCompositeOperation = 'source-over';
  // kuklalar: önce ayrı katmana çiz, sonra perdeye "ışık geçiren deri" gibi bas
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, off.width, off.height);
  octx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const order = [...puppets].sort((a, b) => a.depth - b.depth);
  for (const p of order) p.draw(octx, T);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, sx * DPR, sy * DPR);
  const dep = Math.max(karagoz.depth, hacivat.depth);
  ctx.globalCompositeOperation = 'multiply';
  ctx.shadowColor = 'rgba(70,30,5,.45)'; ctx.shadowBlur = (6 + dep * 22) * DPR * S; ctx.shadowOffsetY = (2 + dep * 10) * DPR * S;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
  drawFx(ctx, dt);
  for (const p of puppets) p._bb = null;
  for (const p of puppets) drawBubble(ctx, p);
}
testHooks.inject = lms => processHands({ landmarks: lms }, .016);
testHooks.start = () => startTouch();
resize();
requestAnimationFrame(frame);
