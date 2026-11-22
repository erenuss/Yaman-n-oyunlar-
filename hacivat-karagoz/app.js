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

let W = 800, H = 450, DPR = 1, S = 1, footPad = 0;
const settings = { sound: true, voice: true, pip: true, strings: true };
const testHooks = (window.__hk = { frames: 0, hands: 0, lastLines: [] });

/* ------------------------------------------------------------------ ART */
import { ART, LEG, ARM, OUT, drawPuppet, drawBackdrop, makeLeather } from './art.js';
const leatherPat = makeLeather(octx), bgPat = makeLeather(bctx);

/* -------------------------------------------------------------- DIALOGUE */
import { SCRIPT, OUCH, HOP, voiceId } from './dialogue.js';
let scriptIdx = 0;
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
// Replikler önceden seslendirildi: açık kaynak Piper TTS + Türkçe erkek sesi (scripts/hk-voices.py).
// Web Audio ile çalınır; analizör, kuklanın çenesini sesin gerçek şiddetiyle oynatır.
const voiceBufs = new Map(); let voicesLoading = null, curVoice = null;
const allVoiceIds = () => [...SCRIPT.map(([c, t]) => voiceId(c, t)), ...['k', 'h'].flatMap(c => [...OUCH[c], ...HOP[c]].map(t => voiceId(c, t)))];
function loadVoices() {
  if (voicesLoading) return voicesLoading;
  const a = audio(); if (!a) return Promise.resolve();
  const one = id => fetch('voices/' + id + '.mp3').then(r => r.ok ? r.arrayBuffer() : null)
    .then(b => b && new Promise(res => a.decodeAudioData(b, res, () => res(null))))
    .then(buf => { if (buf) voiceBufs.set(id, buf); }).catch(() => { });
  const ids = allVoiceIds(), first = voiceId('h', SCRIPT[0][1]);
  voicesLoading = one(first).then(() => Promise.all(ids.filter(i => i !== first).map(one))).then(() => { testHooks.voices = voiceBufs.size; });
  return voicesLoading;
}
// yedek: ses dosyası yoksa tarayıcının Türkçe sesi (erkek ses tercih edilir)
let voiceTR = null;
function pickVoice() {
  if (!('speechSynthesis' in window)) return;
  const tr = speechSynthesis.getVoices().filter(v => /^tr/i.test(v.lang));
  voiceTR = tr.find(v => /ahmet|cem|tolga|emre|kerem|male|erkek/i.test(v.name)) || tr[0] || null;
}
if ('speechSynthesis' in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function stopVoice() {
  if (curVoice) { try { curVoice.src.stop(); } catch (e) { } curVoice.p.talkT = 0; curVoice.p.voiceAn = null; curVoice = null; }
  if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) { }
}
function say(p, text, opts = {}) {
  const o = p.other; if (o && o.bubble && !opts.short) { o.bubble.dur = Math.min(o.bubble.dur, o.bubble.t + .25); o.talkT = 0; }
  const buf = settings.voice ? voiceBufs.get(voiceId(p.code, text)) : null;
  const est = opts.short ? 1.3 : clamp(1.4 + text.length * .062, 1.8, 6);
  const dur = buf ? Math.max(buf.duration + .6, opts.short ? 1.2 : 1.8) : est;
  p.bubble = { text, t: 0, dur, short: !!opts.short };
  testHooks.lastLines.push(p.code + ':' + text);
  stopVoice();
  if (buf) {
    const a = audio(); const src = a.createBufferSource(); src.buffer = buf;
    const an = a.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = .2;
    src.connect(an); an.connect(a.destination);
    src.start(); curVoice = { src, p }; p.voiceAn = an; p.voiceArr = p.voiceArr || new Uint8Array(512); p.talkT = buf.duration + .05;
    testHooks.played = (testHooks.played || 0) + 1;
    src.onended = () => { if (p.voiceAn === an) { p.voiceAn = null; p.talkT = 0; } if (curVoice && curVoice.src === src) curVoice = null; };
    return;
  }
  p.talkT = dur - (opts.short ? .3 : .5);
  if (settings.voice && voiceTR) {
    try { const u = new SpeechSynthesisUtterance(text); u.voice = voiceTR; u.lang = voiceTR.lang; u.pitch = p.code === 'k' ? .8 : 1; u.rate = 1; speechSynthesis.speak(u); } catch (e) { }
  }
}
function voiceLevel(p) { // 0..1 anlık ses şiddeti
  const an = p.voiceAn; if (!an) return -1;
  an.getByteTimeDomainData(p.voiceArr); let e = 0;
  for (let i = 0; i < p.voiceArr.length; i++) { const v = (p.voiceArr[i] - 128) / 128; e += v * v; }
  return Math.sqrt(e / p.voiceArr.length);
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
    this.bA = ART[kind].backArm[0]; this.bAV = 0; this.bE = ART[kind].backArm[1]; this.bEV = 0; this.att = {}; this.strOn = false; this.hand = null;
    this.rot = 0; this.rotV = 0; this.depth = 0; this.depthV = 0;
    this.phase = 0; this.walk = 0; this.idle = 0; this.turnHold = 0;
    this.ctl = { bow: 0, arm: 0, tilt: 0, depth: 0 };
    this.src = 'none'; this.lostT = 9;
    this.talkT = 0; this.bubble = null; this.punchT = 0; this.flipT = -1; this.flipDir = 1; this.hitCd = 0; this.flipCd = 0;
    this.knockX = 0; this.knockV = 0; this.head0 = [0, 0];
  }
  get baseY() { return H - Math.max(H * .035, footPad) - 116 * S; }
  place() { this.x = W * this.xFrac; this.y = this.baseY; this.tx = this.x; this.ty = this.y; }
  spring(k, target, stiff, damp, dt) { const v = k + 'V'; this[v] += ((target - this[k]) * stiff - this[v] * damp) * dt; this[k] += this[v] * dt; }
  talk() { say(this, nextLine(this.code)); sfx('tik'); }
  punch() {
    if (this.hitCd > 0) return; this.hitCd = .45; this.punchT = .42;
    const o = this.other, dx = o.x - this.x;
    if (Math.sign(dx) === Math.sign(this.facing) && Math.abs(dx) < 230 * S && Math.abs(o.y - this.y) < 150 * S) {
      setTimeout(() => {
        o.knockV += Math.sign(dx) * 900 * S; o.rotV += Math.sign(dx) * 7; o.headV += Math.sign(dx) * 14;
        sfx('tef'); try { navigator.vibrate && navigator.vibrate(35); } catch (e) { } fx.push({ type: 'pat', x: (this.x + o.x) / 2, y: this.y - 85 * S, t: 0 });
        if (!o.bubble || o.bubble.t > .5) say(o, OUCH[o.code][Math.floor(Math.random() * 4)], { short: true });
        shake = .25;
      }, 120);
    } else sfx('whoosh');
  }
  flip() { if (this.flipT >= 0 || this.flipCd > 0) return; this.flipT = 0; this.flipDir = this.facing >= 0 ? 1 : -1; this.flipCd = 1; sfx('whoosh'); setTimeout(() => sfx('nareke'), 380); }
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
    // İp modu: parmak bükülünce ip çekilir, uzuv o noktaya doğru kalkar (2 kemikli IK)
    const sc = this.ctl.str, strOn = settings.strings && !!sc && this.src === 'hand' && this.lostT < .5;
    this.strOn = strOn;
    let ikF, ikB, ikLF, ikLB;
    if (strOn) {
      const A = this.A, L2 = A.fore + 14, Fl = this.facing;
      const fk = (t1, t2) => [-ARM.elbow * Math.sin(t1) - L2 * Math.sin(t1 + t2), ARM.elbow * Math.cos(t1) + L2 * Math.cos(t1 + t2)];
      const rf = fk(A.armRest[0], A.armRest[1]), rb = fk(A.backArm[0], A.backArm[1]);
      ikF = ik2(rf[0] + sc.latI * (1 - sc.cI) * Fl * 38 + sc.cI * 30, rf[1] - sc.cI * 135, ARM.elbow, L2, 1);
      ikB = ik2(rb[0] + sc.latT * (1 - sc.cT) * Fl * 30 + sc.cT * 12, rb[1] - sc.cT * 120, ARM.elbow, L2, 1);
      ikLF = ik2(sc.cR * 36, LEG.knee + LEG.ankle - 1 - sc.cR * 66, LEG.knee, LEG.ankle, -1);
      ikLB = ik2(sc.cP * 36, LEG.knee + LEG.ankle - 1 - sc.cP * 66, LEG.knee, LEG.ankle, -1);
    }
    const lag = clamp(axu * F * .00028, -.9, .9);
    const fl = this.flipT >= 0 ? Math.sin(this.flipT * Math.PI) : 0;
    if (strOn && fl === 0) { // bacaklar ipte; yürürken hafif sarkaç
      this.spring('hipF', ikLF[0] + .25 * a * sn + lag, 120, 8, dt);
      this.spring('hipB', ikLB[0] - .25 * a * sn + lag, 120, 8, dt);
      this.spring('kneeF', ikLF[1] + Math.max(0, lag) * .5, 140, 9, dt);
      this.spring('kneeB', ikLB[1] + Math.max(0, lag) * .5, 140, 9, dt);
    } else {
      this.spring('hipF', a * sn + lag - fl * .9, 140, 9, dt);
      this.spring('hipB', -a * sn + lag - fl * .7, 140, 9, dt);
      this.spring('kneeF', a * .9 * Math.max(0, -Math.cos(this.phase)) + Math.max(0, lag) * .6 + fl * 1.6, 160, 10, dt);
      this.spring('kneeB', a * .9 * Math.max(0, Math.cos(this.phase)) + Math.max(0, lag) * .6 + fl * 1.4, 160, 10, dt);
    }

    // gövde eğilmesi / selam
    const bowT = (strOn ? sc.cM * .85 - .05 : clamp(this.ctl.bow, -.45, .85)) + (this.punchT > 0 ? .25 : 0) + this.walk * .08;
    this.spring('bow', bowT - fl * .5, 110, 12, dt);
    // kol
    let arm = this.ctl.arm;
    if (this.punchT > 0) { const k = this.punchT / .42; arm = Math.max(arm, k > .6 ? 1.15 : k * 1.4); this.punchT -= dt; }
    const shT = this.A.armRest[0] - arm * 1.9 + lag * .5 - a * .35 * sn + fl * -2.2;
    const useIK = strOn && this.punchT <= 0 && fl === 0;
    this.spring('sh', useIK ? ikF[0] + lag * .5 : shT, 120, 8, dt);
    this.spring('el', useIK ? ikF[1] + lag * .2 : this.A.armRest[1] - arm * .35 + lag * .3, 130, 9, dt);
    this.spring('bA', useIK ? ikB[0] + lag * .4 : this.A.backArm[0], 110, 8, dt);
    this.spring('bE', useIK ? ikB[1] : this.A.backArm[1], 120, 9, dt);
    this.spring('shB', .2 + lag * .4 + a * .3 * sn, 90, 6, dt);
    // baş: hafif gecikmeli, konuşurken başını sallar
    const talking = this.talkT > 0;
    this.talkT -= dt;
    const nod = talking ? Math.sin(t * 9.5) * .06 + .04 : Math.sin(t * 1.3 + this.xFrac * 5) * .02;
    this.spring('head', -this.bow * .35 + nod + clamp(vyu * .0004, -.2, .2), 85, 7, dt);
    // çene
    const lvl = talking ? voiceLevel(this) : -1;
    const jawT = !talking ? 0 : lvl >= 0 ? clamp(lvl * 2.6, 0, .42) : .17 + .17 * Math.abs(Math.sin(t * 17 + Math.sin(t * 5.3) * 2));
    this.spring('jaw', jawT, 420, 24, dt);
    // tüm gövde eğimi
    let rotT = clamp(this.ctl.tilt * .15, -.2, .2) + clamp(vxu * .00012, -.12, .12);
    this.spring('rot', rotT, 90, 10, dt);
    this.spring('depth', this.ctl.depth, 40, 11, dt);
    if (this.flipT >= 0) { this.flipT += dt / .8; if (this.flipT >= 1) { this.flipT = -1; dust(this.x, this.baseY + 112 * S); if (!this.bubble || this.bubble.t > 1) say(this, HOP[this.code][Math.floor(Math.random() * 3)], { short: true }); } }
    if (this.bubble) { this.bubble.t += dt; if (this.bubble.t > this.bubble.dur) this.bubble = null; }

    // nefes
    this.breath = Math.sin(t * 2 + this.xFrac * 7) * 1.2;
    this.bob = Math.abs(sn) * a * 10;
  }

  draw(g, t) {
    const A = this.A, c = A.c, F = this.face, sc = S * (1 + this.depth * .16), pat = leatherPat;
    let rot = this.rot * Math.sign(this.facing), jump = 0;
    if (this.flipT >= 0) { const e = ease(this.flipT); rot += e * TAU * this.flipDir; jump = -Math.sin(this.flipT * Math.PI) * 110 * S; }
    g.save();
    g.translate(this.x + this.knockX, this.y - this.bob * S + this.breath * S * .3 + jump - 40 * S * this.depth);
    g.rotate(rot + clamp(this.knockV / S * .0002, -.3, .3));
    g.scale(sc * F, sc);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const cap = (key, x, y) => { const q = new DOMPoint(x, y).matrixTransform(g.getTransform()); this.att[key] = [q.x / DPR, q.y / DPR]; };
    drawPuppet(g, A, { hipB: this.hipB, kneeB: this.kneeB, hipF: this.hipF, kneeF: this.kneeF, bow: this.bow, head: this.head, jaw: this.jaw,
      sh: this.sh, el: this.el, bA: this.bA + this.shB * .25, bE: this.bE + (this.strOn ? 0 : this.jaw * .6) }, pat, cap, shade);
    if (this.att.neckScr) this.headScreen = this.att.neckScr;
    g.restore();
  }

  hitTest(px, py) { return Math.abs(px - this.x) < 85 * S && py > this.y - 250 * S && py < this.y + 125 * S; }
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
  bctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBackdrop(bctx, W, H, bgPat);
}

/* ------------------------------------------------------------------ STRINGS */
function ik2(tx, ty, L1, L2, s) { // s=1: dirsek geriye (kol), s=-1: diz öne (bacak)
  const d = clamp(Math.hypot(tx, ty), Math.abs(L1 - L2) + 1, L1 + L2 - .5);
  const th = Math.atan2(-tx, ty);
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const b = Math.acos(clamp((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1));
  return [th + s * a, -s * (Math.PI - b)];
}
const STR = [[4, 'hb', 'cT'], [8, 'hf', 'cI'], [12, 'head', 'cM'], [16, 'lf', 'cR'], [20, 'lb', 'cP']];
const HAND_CONN = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
// Kontrol eli: oyuncunun eli kuklanın üstünde, parmaklar aşağı; her parmak ucundan bir uzva ip iner
function drawStrings(g, p) {
  if (!p.strOn || !p.hand || !p.att.head) return;
  const h = p.hand, k = 88 * S;
  let wy = 0; for (const q of h.pts) wy = Math.max(wy, (q.y - h.cy) * h.flip / h.size); // bilek tarafı (ekranda üstte kalır)
  const palmY = Math.max(p.y - 395 * S, wy * k + 10);
  const G = q => [p.x + p.knockX + (q.x - h.cx) / h.size * k, palmY - (q.y - h.cy) * h.flip / h.size * k];
  const P2 = h.pts.map(G);
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash([]);
  // ipler
  for (const [tip, key, ck] of STR) {
    const a = P2[tip], b = p.att[key]; if (!b) continue;
    const t = p.ctl.str[ck] || 0;
    g.strokeStyle = `rgba(${150 + t * 80 | 0},${40 + t * 30 | 0},25,${.55 + t * .35})`; g.lineWidth = 1.6 + t * 1.4;
    g.beginPath(); g.moveTo(a[0], a[1]);
    const sag = (1 - t) * 6 * S; // gevşek ip hafifçe sarkar
    g.quadraticCurveTo((a[0] + b[0]) / 2 + sag, (a[1] + b[1]) / 2, b[0], b[1]); g.stroke();
    g.fillStyle = 'rgba(120,30,20,.8)'; g.beginPath(); g.arc(b[0], b[1], 2.2, 0, TAU); g.fill();
  }
  // el iskeleti
  const bones = () => { g.beginPath(); for (const [i, j] of HAND_CONN) { g.moveTo(P2[i][0], P2[i][1]); g.lineTo(P2[j][0], P2[j][1]); } };
  g.strokeStyle = 'rgba(255,250,235,.75)'; g.lineWidth = Math.max(4, 6.5 * S); bones(); g.stroke(); // ışık hâlesi
  g.strokeStyle = 'rgba(14,140,122,.95)'; g.lineWidth = Math.max(1.8, 2.8 * S); bones(); g.stroke();
  g.fillStyle = '#fffaf0';
  for (let i = 0; i < 21; i++) { g.beginPath(); g.arc(P2[i][0], P2[i][1], Math.max(1.6, 2.2 * S), 0, TAU); g.fill(); }
  for (const [tip, , ck] of STR) { const t = p.ctl.str[ck] || 0, q = P2[tip]; g.fillStyle = t > .35 ? '#ffd65a' : '#ffffff'; g.strokeStyle = 'rgba(18,150,130,.95)'; g.lineWidth = 1.5; g.beginPath(); g.arc(q[0], q[1], Math.max(3, 4.5 * S) * (1 + t * .4), 0, TAU); g.fill(); g.stroke(); }
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
  S = Math.min(H * .00215, W * (W < H ? .0024 : .002));
  const tb = document.querySelector('.tbar'); footPad = tb && getComputedStyle(tb).display !== 'none' ? 60 : 0;
  if (footPad) S = Math.min(S, (H - footPad) * .0023);
  buildBackdrop();
  for (const p of puppets) {
    if (p.tx === null) continue;
    const fx_ = p.x / oldW; p.x = p.tx = fx_ * W; p.y = p.ty = p.baseY;
  }
}
new ResizeObserver(resize).observe(stage);

/* ------------------------------------------------------------------ INPUT: pointer / touch */
// sürükle: yürür · dokun: konuşur · çift dokun ya da yukarı fırlat: takla · yana hızlı fırlat: vurur
const drags = new Map(); let lastTap = { t: 0, p: null }, tapTimer = null;
const local = e => { const r = stage.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
stage.addEventListener('pointerdown', e => {
  e.preventDefault(); audio();
  const [x, y] = local(e);
  let best = puppets.find(p => p.hitTest(x, y) && ![...drags.values()].some(d => d.p === p));
  const hit = !!best;
  if (!best) { const free = puppets.filter(p => ![...drags.values()].some(d => d.p === p)); if (!free.length) return; best = free.reduce((a, b) => Math.abs(a.x - x) < Math.abs(b.x - x) ? a : b); }
  try { stage.setPointerCapture(e.pointerId); } catch (_) { }
  const now = e.timeStamp || performance.now();
  drags.set(e.pointerId, { p: best, hit, dx: hit ? best.x - x : 0, dy: best.y - y, x0: x, y0: y, t0: now, moved: false, sm: [[now, x, y]] });
  if (!hit) { best.tx = x; } best.src = 'pointer'; best.lostT = 0;
});
stage.addEventListener('pointermove', e => {
  const d = drags.get(e.pointerId); if (!d) return;
  const [x, y] = local(e), now = e.timeStamp || performance.now();
  if (Math.hypot(x - d.x0, y - d.y0) > 12) d.moved = true;
  d.sm.push([now, x, y]); if (d.sm.length > 8) d.sm.shift();
  d.p.tx = x + d.dx; d.p.ty = y + d.dy; d.p.src = 'pointer'; d.p.lostT = 0;
});
const endDrag = e => {
  const d = drags.get(e.pointerId); if (!d) return; drags.delete(e.pointerId);
  const now = e.timeStamp || performance.now(), p = d.p; p.lostT = 0;
  if (e.type === 'pointercancel') return;
  const l = d.sm[d.sm.length - 1];
  let f = d.sm[0]; for (const q of d.sm) if (l[0] - q[0] <= 110) { f = q; break; }
  if (f === l && d.sm.length > 1 && l[0] - d.sm[d.sm.length - 2][0] < 260) f = d.sm[d.sm.length - 2]; // seyrek olay gelen yavaş cihazlar
  const still = now - l[0] > 200; // parmak durduktan sonra kalktıysa fırlatma sayılmaz
  const dt = Math.max(16, l[0] - f[0]) / 1000, vx = still ? 0 : (l[1] - f[1]) / dt, vy = still ? 0 : (l[2] - f[2]) / dt;
  testHooks.lastFlick = { vx: Math.round(vx), vy: Math.round(vy), gap: Math.round(now - l[0]), span: Math.round(l[0] - f[0]), dy: Math.round(l[2] - f[2]), n: d.sm.length };
  if (!d.moved && now - d.t0 < 350) {
    if (!d.hit) return;
    if (lastTap.p === p && now - lastTap.t < 330) { clearTimeout(tapTimer); lastTap = { t: 0, p: null }; p.flip(); }
    else { lastTap = { t: now, p }; tapTimer = setTimeout(() => p.talk(), 290); }
  } else if (vy < -700 && -vy > Math.abs(vx) * 1.2) p.flip();
  else if (Math.abs(vx) > 1000 && Math.abs(vx) > Math.abs(vy)) { p.facing = Math.sign(vx); p.turnHold = 1.2; p.punch(); }
};
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
  if (coarse) enterFs();
  $('#intro').classList.add('hidden'); pip.classList.toggle('on', settings.pip);
  openingLines();
}
function startTouch() { audio(); unlockVoice(); if (coarse) enterFs(); $('#intro').classList.add('hidden'); openingLines(); flash(coarse ? 'Sürükle: yürür · dokun: konuşur · yukarı fırlat: takla · yana fırlat: vurur' : 'Sürükle: yürür · tıkla: konuşur · çift tıkla: takla · yana fırlat: vurur', 5); }
function unlockVoice() { loadVoices(); if (settings.voice && 'speechSynthesis' in window) { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (e) { } } }
let opened = false;
function openingLines() {
  if (opened) return; opened = true; sfx('nareke');
  const go = () => { if (!go.done) { go.done = true; say(hacivat, nextLine('h')); } };
  Promise.race([loadVoices(), new Promise(r => setTimeout(r, 2500))]).then(() => setTimeout(go, 500));
}

const OPEN_REF = { 4: 1.05, 8: .85, 12: .9, 16: .85, 20: .7 }, openRef = { ...OPEN_REF };
function features(lm) {
  // aynalanmış koordinatlar (selfie görünümü); geometri için en-boy oranı düzeltilir
  const asp = (video.videoWidth && video.videoHeight) ? video.videoWidth / video.videoHeight : 4 / 3;
  const P_ = i => ({ x: (1 - lm[i].x) * asp, y: lm[i].y, z: lm[i].z });
  const pts = lm.map((_, i) => P_(i));
  const w = pts[0], m = pts[9], idx = pts[8], th = pts[4];
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const size = d(w, m) || .001;
  let cx = 0, cy = 0; for (const i of [0, 5, 9, 13, 17]) { cx += pts[i].x; cy += pts[i].y; } cx /= 5; cy /= 5;
  const up = m.y < w.y; // parmaklar yukarı mı (aşağı tutan da olur: gerçek kukla kontrolü gibi)
  let tilt = Math.atan2(m.x - w.x, -(m.y - w.y)); // 0 = dik, + sağa
  if (!up) tilt = Math.atan2(-(m.x - w.x), m.y - w.y); // aşağı bakan elde eğimi aşağıya göre ölç
  let curl = 0; for (const [tip, pip_] of [[8, 6], [12, 10], [16, 14], [20, 18]]) { curl += d(pts[tip], w) / Math.max(1e-3, d(pts[pip_], w)); }
  curl /= 4; // açık ≈ 1.25+, yumruk ≈ < .95
  const fist = map01(1.18 - curl, 0, .32);
  const pinch = d(th, idx) / size;
  // parmak başına bükülme (0 düz, 1 tam bükük) — kişinin eline göre kendini ayarlar
  const ext = { 4: d(pts[4], pts[17]) / size, 8: d(pts[8], pts[5]) / size, 12: d(pts[12], pts[9]) / size, 16: d(pts[16], pts[13]) / size, 20: d(pts[20], pts[17]) / size };
  const c = {};
  for (const k in ext) {
    openRef[k] = clamp(Math.max(openRef[k] * .9997, ext[k]), OPEN_REF[k] * .7, OPEN_REF[k] * 1.35);
    c[k] = map01((openRef[k] - ext[k]) / openRef[k], .08, k === '4' ? .6 : .55);
  }
  const ax = { x: m.x - w.x, y: m.y - w.y };
  const ang = (a, b) => { const v = { x: pts[b].x - pts[a].x, y: pts[b].y - pts[a].y }; return Math.atan2(ax.x * v.y - ax.y * v.x, ax.x * v.x + ax.y * v.y); };
  return { x: 1 - (lm[0].x + lm[5].x + lm[9].x + lm[13].x + lm[17].x) / 5, y: cy, size, tilt, fist, pinch, pts, pcx: cx, pcy: cy, up, c, angI: ang(5, 8), angT: ang(2, 4) };
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
    p.ctl.bow = settings.strings ? 0 : clamp(p.ctl.tilt * Math.sign(p.facing) * 1.1, -.45, .85);
    p.ctl.depth = lerp(p.ctl.depth, map01(f.size / ((video.videoWidth && video.videoHeight) ? video.videoWidth / video.videoHeight : 1.333), .13, .26), .2);
    // ip modu kontrolleri
    const bI = prev.bI ?? f.angI, bT = prev.bT ?? f.angT; // yan açılma için yavaş taban çizgisi
    const nbI = f.c[8] < .3 ? lerp(bI, f.angI, .02) : bI, nbT = f.c[4] < .3 ? lerp(bT, f.angT, .02) : bT;
    const o = p.ctl.str || { cT: 0, cI: 0, cM: 0, cR: 0, cP: 0, latI: 0, latT: 0 }, sm = .55;
    p.ctl.str = { cT: lerp(o.cT, f.c[4], sm), cI: lerp(o.cI, f.c[8], sm), cM: lerp(o.cM, f.c[12], sm), cR: lerp(o.cR, f.c[16], sm), cP: lerp(o.cP, f.c[20], sm),
      latI: lerp(o.latI, clamp((f.angI - nbI) * 2, -1, 1), sm), latT: lerp(o.latT, clamp((f.angT - nbT) * 1.6, -1, 1), sm) };
    p.hand = { pts: f.pts, cx: f.pcx, cy: f.pcy, size: f.size, flip: f.up ? 1 : -1 };
    // konuşma: parmak ucu birleşince
    const closed = prev.pinchClosed ? f.pinch < .55 : f.pinch < .32;
    if (closed && !prev.pinchClosed && f.fist < .5 && (!p.bubble || p.bubble.t > .6 || p.bubble.short)) p.talk();
    // yumruk: hızlı kapanış -> vuruş
    const df = (f.fist - prev.fist) / hdt;
    if (f.fist > .7 && prev.fist <= .7 && df > 2.2) p.punch();
    // bilek çevirme -> takla
    const dTilt = (f.tilt - prev.tilt) / hdt;
    if (Math.abs(f.tilt) > .7 && Math.abs(dTilt) > 4.5) p.flip();
    handState.set(p, { pinchClosed: closed, fist: f.fist, tilt: f.tilt, t: now, bI: nbI, bT: nbT });
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
toggle($('#bStr'), 'strings', () => flash(settings.strings ? '🪢 İpli kukla: parmaklarını bük, uzuvlar kalksın' : 'Serbest mod: yumrukla kol kaldır, eğerek selam ver', 3));
toggle($('#bVoice'), 'voice', () => { if (!settings.voice) stopVoice(); else loadVoices(); });
toggle($('#bPip'), 'pip', () => pip.classList.toggle('on', settings.pip && camOn));
// Tam ekran: destekleyen tarayıcıda gerçek, iPhone Safari'de sayfayı kaplayan sahne
const coarse = matchMedia('(pointer: coarse)').matches;
let realFs = false;
function enterFs() {
  document.body.classList.add('fs'); window.scrollTo(0, 0);
  const f = $('#frame');
  try { const pr = f.requestFullscreen ? f.requestFullscreen({ navigationUI: 'hide' }) : (f.webkitRequestFullscreen && f.webkitRequestFullscreen()); if (pr && pr.then) pr.then(() => { realFs = true; }).catch(() => { }); } catch (e) { }
}
function exitFs() {
  document.body.classList.remove('fs');
  if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
  realFs = false;
}
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && realFs) { realFs = false; document.body.classList.remove('fs'); } });
$('#bFull').addEventListener('click', () => document.body.classList.contains('fs') ? exitFs() : enterFs());
$('#bExit').addEventListener('click', exitFs);
$('#bShot').addEventListener('click', () => {
  stage.toBlob(b => { if (!b) return; const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'hayal-perdesi.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); });
  sfx('tik'); flash('Fotoğraf kaydedildi 📸', 2);
});
$('#bCam').addEventListener('click', startCamera);
$('#bTouch').addEventListener('click', startTouch);
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { $('#loadMsg').textContent = 'Bu tarayıcı kamerayı desteklemiyor; dokunarak oynayabilirsin.'; $('#bCam').disabled = true; }
document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice(); });

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
  const dx = hacivat.x - karagoz.x, minD = 92 * S;
  if (Math.abs(dx) < minD && Math.abs(hacivat.y - karagoz.y) < 160 * S) { // gövdeler iç içe geçmesin
    const push = (minD - Math.abs(dx)) * .5 * (Math.sign(dx) || (hacivat.xFrac > karagoz.xFrac ? 1 : -1));
    hacivat.x += push; karagoz.x -= push;
    const lo = 60 * S, hi = W - 60 * S; // kenara sıkışan itilemez; diğeri tümünü alır
    for (const [p, q] of [[hacivat, karagoz], [karagoz, hacivat]]) { const c = clamp(p.x, lo, hi); q.x -= c - p.x; p.x = c; } if (Math.sign(hacivat.vx - karagoz.vx) !== Math.sign(push)) { hacivat.vx *= .5; karagoz.vx *= .5; } }
  render(dt);
  drawPip();
  testHooks.frames++;
  testHooks.state = puppets.map(p => ({ x: Math.round(p.x), y: Math.round(p.y), face: p.facing, src: p.src, arm: +p.ctl.arm.toFixed(2), talk: p.talkT > 0, flip: p.flipT >= 0, jaw: +p.jaw.toFixed(2) }));
}
function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  let sx = 0, sy = 0; if (shake > 0) { shake -= dt; sx = rnd(-4, 4) * shake * 4; sy = rnd(-3, 3) * shake * 4; }
  ctx.drawImage(backdrop, 0, 0);
  ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
  // kandil titremesi
  const fl = .03 + Math.sin(T * 7.3) * .01 + Math.sin(T * 13.1) * .008 + Math.sin(T * 2.1) * .01;
  ctx.fillStyle = `rgba(150,80,10,${fl})`; ctx.globalCompositeOperation = 'multiply'; ctx.fillRect(-10, -10, W + 20, H + 20); ctx.globalCompositeOperation = 'source-over';
  // kuklalar: önce ayrı katmana çiz, sonra perdeye "ışık geçiren deri" gibi bas
  octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, off.width, off.height);
  octx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const order = [...puppets].sort((a, b) => a.depth - b.depth);
  for (const p of order) p.draw(octx, T);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, sx * DPR, sy * DPR);
  const dep = Math.max(karagoz.depth, hacivat.depth);
  ctx.globalAlpha = .95; // ince deriden ışık hafifçe geçer
  ctx.shadowColor = 'rgba(70,30,5,.4)'; ctx.shadowBlur = (6 + dep * 22) * DPR * S; ctx.shadowOffsetY = (2 + dep * 10) * DPR * S;
  ctx.drawImage(off, 0, 0);
  ctx.restore();
  ctx.setTransform(DPR, 0, 0, DPR, sx * DPR, sy * DPR);
  for (const p of puppets) drawStrings(ctx, p);
  drawFx(ctx, dt);
  for (const p of puppets) p._bb = null;
  for (const p of puppets) drawBubble(ctx, p);
}
testHooks.joints = () => { const p = karagoz, r = v => +v.toFixed(2); return { str: p.strOn, sh: r(p.sh), el: r(p.el), bA: r(p.bA), bE: r(p.bE), bow: r(p.bow), hipF: r(p.hipF), kneeF: r(p.kneeF), hipB: r(p.hipB), kneeB: r(p.kneeB), c: p.ctl.str && Object.fromEntries(Object.entries(p.ctl.str).map(([k, v]) => [k, r(v)])) }; };
testHooks.inject = lms => processHands({ landmarks: lms }, .016);
testHooks.start = () => startTouch();
resize();
requestAnimationFrame(frame);
