// Geleneksel Karagöz tasvirlerinin üslubunda özgün çizimler:
// deve derisi gibi ışık geçiren benekli doku, kalın siyah kontur, içte kesik "dikiş" çizgisi,
// eklem yerlerinde ışık delikleri, canlı kök boya renkleri (lal kırmızısı, turkuaz, hardal sarısı).

export const TAU = Math.PI * 2;
export const OUT = '#1c0d06';
const P = d => new Path2D(d);

/* ---------- deri dokusu (desen, parçayla birlikte hareket eder) ---------- */
export function makeLeather(ctx) {
  const c = document.createElement('canvas'); c.width = c.height = 192;
  const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 192, 192);
  let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { // lekeler
    const x = r() * 192, y = r() * 192, rad = 4 + r() * 22, v = 200 + r() * 55 | 0;
    for (const [dx, dy] of [[0, 0], [192, 0], [-192, 0], [0, 192], [0, -192]]) {
      const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
      gr.addColorStop(0, `rgba(${v},${v - 8},${v - 25},.55)`); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x + dx, y + dy, rad, 0, TAU); g.fill();
    }
  }
  g.strokeStyle = 'rgba(150,110,70,.18)'; g.lineWidth = .8; // lifler
  for (let i = 0; i < 70; i++) { const x = r() * 192, y = r() * 192, a = r() * TAU, l = 6 + r() * 16; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.5)'; // ışığın parladığı ince yerler
  for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(r() * 192, r() * 192, 1 + r() * 4, 0, TAU); g.fill(); }
  return ctx.createPattern(c, 'repeat');
}

/* ---------- tek bir deri parçası ---------- */
// fill -> iç dikiş çizgisi -> kenarda koyulaşan suluboya -> doku -> kontur
export function leather(g, path, fill, pat, o = {}) {
  g.fillStyle = fill; g.fill(path);
  if (o.dash !== false) {
    const w = o.inset || 4;
    g.save(); g.clip(path);
    g.setLineDash([3.6, 2.8]); g.lineCap = 'butt';
    g.lineWidth = w * 2 + 1.5; g.strokeStyle = o.dashColor || OUT; g.stroke(path);
    g.setLineDash([]); g.lineWidth = w * 2; g.strokeStyle = fill; g.stroke(path);
    g.restore(); g.lineCap = 'round';
  }
  if (o.rim !== false) { // boya kenarda birikir
    g.save(); g.clip(path); g.strokeStyle = 'rgba(70,15,0,.11)';
    g.lineWidth = 16; g.stroke(path); g.lineWidth = 7; g.stroke(path); g.restore();
  }
  if (pat && o.tex !== false) { g.save(); g.globalCompositeOperation = 'multiply'; g.globalAlpha = o.texA || .5; g.fillStyle = pat; g.fill(path); g.restore(); }
  if (o.stroke !== false) { g.lineWidth = o.lw || 2.6; g.strokeStyle = OUT; g.stroke(path); }
}
export function dots(g, pts, r = 1.5, col = 'rgba(255,248,226,.95)') {
  g.fillStyle = col; g.beginPath();
  for (const [x, y, rr] of pts) { const q = rr || r; g.moveTo(x + q, y); g.arc(x, y, q, 0, TAU); }
  g.fill();
}
export function joint(g, x, y, r = 3.3) { // eklem deliği: ışık sızar
  g.fillStyle = '#fffdf2'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
}
function strokeTwice(g, path, col, w) { g.lineCap = 'round'; g.lineWidth = w + 2.6; g.strokeStyle = OUT; g.stroke(path); g.lineWidth = w; g.strokeStyle = col; g.stroke(path); }

/* ---------- ortak parçalar (videodaki geleneksel kuklaların oranları) ---------- */
// bel (kuşak) = 0; boyun -100; kalça +6; diz +50; bilek +50; taban +60
export const LEG = {
  thigh: P('M-15,-6 C-22,6 -24,26 -19,40 C-16,47 -13,51 -11,54 L12,54 C16,48 20,40 21,28 C22,14 19,2 15,-6 C8,-11 -8,-11 -15,-6 Z'),
  puff: P('M-12,-6 C-18,2 -19,12 -15,19 C-13,22 -11,24 -9,26 L9,26 C12,23 15,18 15,10 C15,2 13,-3 12,-6 Z'),
  shin: P('M-8,18 C-9,30 -8,42 -7,51 L7,51 C8,42 9,30 8,18 Z'),
  shoe: P('M-9,47 L8,47 C15,49 22,50 28,48 C31,47 33,45 33,42 C37,45 36,52 31,55 C26,58 18,59 10,59 L-9,59 C-14,59 -15,51 -9,47 Z'),
  knee: 50, ankle: 50
};
export const ARM = {
  sleeve: P('M-11,-8 C-15,2 -14,12 -12,20 L12,20 C14,12 15,2 11,-8 C6,-12 -6,-12 -11,-8 Z'),
  band: P('M-12,12 C-4,15 4,15 12,12 L11,22 C4,24 -4,24 -11,22 Z'),
  upper: P('M-8,18 C-8.5,24 -8,30 -7.5,36 L7.5,36 C8,30 8.5,24 8,18 Z'),
  elbow: 33,
  fore: L => P(`M-7,-2 C-8,${L * .4} -7.5,${L * .75} -6.5,${L} L6.5,${L} C7.5,${L * .75} 8,${L * .4} 7,-2 Z`),
  hand: P('M-8,-2 C-12,5 -11,16 -6,22 L-5,32 C-4,35 -.5,35 0,32 L1,23 L4.5,33 C5.5,36.5 9.5,35.5 9,32 L7,22 L11.5,29 C13,32 16.5,30.5 15,27 L11.5,17 C13.5,11 13,4 9,-2 Z'),
  thumb: P('M8,2 C14,0 20,5 20,11 C15,12.5 11,11 8,9 Z'),
  fingers: P('M-1.5,22 L-1.5,30 M3.5,22 L4.8,30 M8.5,20 L11,26')
};

/* ---------- karakterler ---------- */
const COL = { red: '#c0283a', teal: '#21988a', yel: '#e2a945', skin: '#f3caa2', black: '#1b0f0b', shoe: '#b82a2e' };
export const ART = {
  karagoz: {
    name: 'Karagöz', neck: [3, -100], shoulder: [-4, -86], hips: [[-8, 6], [8, 6]], jawPivot: [-6, -20], fore: 46, hunch: .06,
    armRest: [-.32, -1.0], backArm: [.36, -2.26], backWrist: -.98, // uzun kolu öne uzanmış, öbür eli sakalında
    c: { skin: COL.skin, jacket: COL.red, trim: COL.teal, sash: COL.yel, skirt: COL.red, shalvar: COL.teal, shoe: COL.shoe, beard: COL.black, sleeve: COL.red, band: COL.teal },
    jacket: P('M2,-102 C16,-101 26,-95 29,-84 C32,-68 32,-42 29,-12 L-27,-10 C-31,-40 -33,-70 -30,-87 C-25,-98 -11,-103 2,-102 Z'),
    collar: P('M-11,-100 C-2,-93 10,-93 19,-100 L21,-91 C11,-84 -4,-84 -13,-91 Z'),
    bands: [P('M-32,-62 C-10,-58 10,-58 32,-62 L32,-53 C10,-49 -10,-49 -32,-53 Z')],
    skirt: P('M-26,0 C-10,5 12,5 28,0 C32,14 36,28 40,40 L31,36 L23,43 L11,38 L-1,44 L-13,38 L-25,43 L-36,38 C-33,26 -29,12 -26,0 Z'),
    sash: P('M-27,-14 C-10,-8 12,-8 29,-14 L30,3 C12,9 -10,9 -28,3 Z'),
    sashEnd: P('M17,1 C21,13 19,24 23,34 L31,31 C27,22 29,10 27,-1 Z'),
    deco: P('M-6,10 C8,4 20,14 15,25 C11,33 -2,33 -6,25 C-9,18 -4,12 3,14 C8,16 8,22 4,24'),
    face: P('M-14,2 C-23,-8 -29,-24 -29,-40 C-29,-56 -17,-67 0,-67 C12,-67 20,-61 22,-52 C23,-48 24,-45 25,-42 C28,-38 33,-33 36,-30 C38,-27 36,-25 32,-24 C30,-24 28,-24 27,-23 L26,-14 C20,-6 12,0 6,3 Z'),
    ear: P('M-6,-40 C-14,-42 -18,-30 -13,-24 C-9,-21 -4,-26 -5,-32 Z'), earIn: P('M-8,-36 C-12,-35 -13,-29 -10,-27'),
    eye: P('M6,-41 C10,-46 18,-47 23,-42 C18,-38 11,-37 6,-41 Z'), iris: [17, -42, 2.9],
    lid: P('M5,-42 C10,-48 19,-49 24,-43'), brow: P('M4,-50 C10,-55 19,-55 25,-50'),
    cheek: [10, -31, 6.5, 4], lines: [P('M30,-28 q-3,2 -5,0')],
    jaw: P('M29,-24 C35,-18 36,-8 32,0 C28,8 18,12 8,12 C-2,12 -8,6 -9,-2 C-10,-10 -6,-18 -2,-22 C2,-18 8,-16 14,-17 C20,-19 24,-22 29,-24 Z'),
    mous: P('M13,-21 C19,-26 28,-27 35,-23 C33,-19 27,-18 21,-19 C17,-19.5 15,-20 13,-21 Z'),
    rosette: [9, -93, 8.5]
  },
  hacivat: {
    name: 'Hacivat', neck: [3, -100], shoulder: [-4, -86], hips: [[-8, 6], [8, 6]], jawPivot: [-4, -18], fore: 36, hunch: 0,
    armRest: [.08, -1.55], backArm: [.08, -2.2], backWrist: -.76, // bir eli karnında, öbürü sakalında
    c: { skin: COL.skin, jacket: COL.red, trim: COL.teal, sash: COL.yel, skirt: COL.red, shalvar: COL.teal, shoe: COL.shoe, beard: COL.black, sleeve: COL.teal, band: COL.yel },
    jacket: P('M2,-102 C15,-101 24,-95 27,-84 C30,-68 30,-42 28,-12 L-26,-10 C-30,-40 -31,-70 -29,-87 C-24,-98 -11,-103 2,-102 Z'),
    collar: P('M-11,-100 C-2,-93 10,-93 18,-100 L20,-91 C10,-84 -4,-84 -13,-91 Z'),
    bands: [P('M-24,-90 L-14,-96 L26,-36 L26,-24 Z'), P('M-26,-50 C-10,-46 10,-46 26,-50 L26,-42 C10,-38 -10,-38 -26,-42 Z')],
    skirt: P('M-25,0 C-10,5 12,5 27,0 C31,14 34,30 38,44 L29,40 L21,47 L9,42 L-3,48 L-15,42 L-26,47 L-35,42 C-31,28 -28,12 -25,0 Z'),
    sash: P('M-26,-14 C-10,-8 11,-8 28,-14 L29,3 C11,9 -10,9 -27,3 Z'),
    sashEnd: P('M5,2 L15,2 C16,16 17,30 19,44 L9,46 C8,32 6,16 5,2 Z'),
    deco: null,
    face: P('M-12,2 C-21,-10 -25,-26 -23,-44 L-21,-56 L20,-58 C22,-52 23,-48 24,-44 C27,-40 32,-34 37,-28 C39,-25 37,-23 33,-23 C30,-23 28,-22 27,-21 L26,-12 C20,-5 13,0 6,3 Z'),
    ear: P('M-6,-38 C-13,-40 -17,-29 -12,-23 C-8,-20 -4,-25 -5,-31 Z'), earIn: P('M-8,-34 C-11,-33 -12,-28 -9,-26'),
    eye: P('M7,-41 C10,-45 17,-46 21,-42 C17,-38 11,-38 7,-41 Z'), iris: [15.5, -42, 2.5],
    lid: P('M6,-42 C10,-47 18,-48 22,-43'), brow: P('M5,-49 C11,-53 18,-53 23,-48'),
    cheek: [10, -31, 6, 3.6], lines: [P('M31,-27 q-2,2 -4,0')],
    jaw: P('M27,-20 C31,-12 31,-4 29,4 C31,10 37,12 44,8 C41,17 31,21 23,17 C14,13 6,10 -2,6 C-8,2 -10,-6 -8,-14 C0,-12 8,-15 14,-19 C19,-21 24,-21 27,-20 Z'),
    mous: P('M15,-22 C22,-26 30,-24 34,-19 C38,-14 44,-15 46,-21 C45,-11 35,-9 28,-14 C23,-17 19,-19 15,-22 Z'),
    rosette: [3, -101, 7.5]
  }
};

// sakal benekleri
const probe = document.createElement('canvas').getContext('2d');
export function holesIn(path, step, inset, bx) {
  const pts = [];
  for (let y = bx[1], r = 0; y <= bx[3]; y += step, r++) for (let x = bx[0] + (r % 2 ? step / 2 : 0); x <= bx[2]; x += step)
    if ([[0, 0], [inset, 0], [-inset, 0], [0, inset], [0, -inset]].every(([a, b]) => probe.isPointInPath(path, x + a, y + b))) pts.push([x, y, 1.25]);
  return pts;
}
for (const a of Object.values(ART)) a.hBeard = holesIn(a.jaw, 6, 2.6, [-12, -26, 46, 22]);

/* ---------- sarıklar ---------- */
const K_CROWN = P('M-33,-54 C-38,-74 -26,-91 -6,-93 C12,-95 23,-83 22,-66 C21,-62 20,-59 18,-57 Z');
const K_BRIM = P('M-41,-51 C-46,-59 -37,-66 -24,-68 C-6,-72 14,-71 26,-63 C32,-59 31,-52 25,-51 C12,-59 -10,-57 -26,-49 C-32,-45 -38,-45 -41,-51 Z');
const K_LEAF = P('M13,-92 C15,-104 25,-112 32,-110 C30,-99 22,-91 16,-87 Z');
const H_CAP = P('M-22,-60 C-27,-79 -16,-96 1,-98 C17,-100 27,-87 22,-60 Z');
const H_BAND = P('M-27,-52 C-27,-61 -18,-65 -3,-66 C11,-67 23,-62 25,-54 C25,-50 23,-48 21,-48 C7,-54 -10,-52 -24,-46 C-26,-47 -27,-50 -27,-52 Z');
const H_PEAK = P('M14,-63 C27,-64 37,-59 42,-50 C35,-53 26,-53 17,-50 Z');
const H_TASSEL = P('M-23,-56 C-31,-48 -33,-34 -29,-20 L-21,-22 C-24,-34 -22,-46 -16,-54 Z');
function rosette(g, [x, y, r], petal, mid) {
  g.lineWidth = 1.5; g.strokeStyle = OUT;
  for (let k = 0; k < 7; k++) { const a = k / 7 * TAU - .3; g.fillStyle = petal; g.beginPath(); g.ellipse(x + Math.cos(a) * r * .6, y + Math.sin(a) * r * .6, r * .48, r * .3, a, 0, TAU); g.fill(); g.stroke(); }
  g.fillStyle = mid; g.beginPath(); g.arc(x, y, r * .34, 0, TAU); g.fill(); g.stroke();
}
export function drawTurbanBack(g, A, pat) { if (A.name === 'Hacivat') leather(g, H_TASSEL, COL.teal, pat, { inset: 2.5 }); }
export function drawTurban(g, A, pat) {
  if (A.name === 'Karagöz') {
    // arkaya yatık, geniş kıvrık kenarlı kavuk; dilimli taç
    leather(g, K_LEAF, COL.teal, pat, { inset: 2.4 });
    g.save(); g.lineCap = 'round'; strokeTwice(g, P('M15,-88 C18,-95 22,-100 26,-104'), '#e08a3a', 2.6); g.restore();
    leather(g, K_CROWN, COL.red, pat, { dash: false, stroke: false });
    g.save(); g.clip(K_CROWN);
    for (const x of [-26, -6, 14]) { const sl = P(`M${x},-50 C${x - 7},-66 ${x - 4},-84 ${x + 4},-96 L${x + 13},-96 C${x + 6},-82 ${x + 4},-66 ${x + 9},-50 Z`); leather(g, sl, COL.teal, pat, { inset: 2.2, rim: false }); }
    g.restore();
    g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke(K_CROWN);
    leather(g, K_BRIM, COL.red, pat, { dash: false });
    g.save(); g.clip(K_BRIM); g.strokeStyle = '#fff6e4'; g.lineWidth = 1.6;
    for (const o of [-1.5, 3]) { g.beginPath(); g.moveTo(-41, -53 + o); g.bezierCurveTo(-38, -63 + o, -6, -70 + o, 28, -60 + o * .4); g.stroke(); }
    g.restore();
    rosette(g, A.rosette, '#e9a63c', COL.red);
  } else {
    // sarı bant, öne sarkan sivri uç, tepede turkuaz şişkin katlar
    leather(g, H_CAP, COL.red, pat, { inset: 3 });
    for (const [x, y, r] of [[-12, -78, 8.5], [2, -86, 8.5], [14, -76, 7.5], [-1, -70, 7.5]]) {
      const b = new Path2D(); b.ellipse(x, y, r, r * .85, -.3, 0, TAU); leather(g, b, COL.teal, pat, { inset: 2, rim: false });
    }
    leather(g, H_BAND, COL.yel, pat, { inset: 2.6 });
    leather(g, H_PEAK, COL.red, pat, { inset: 2.2 });
    rosette(g, A.rosette, '#d9455a', COL.yel);
  }
}

/* ---------- kuklanın tamamı ---------- */
const handM = {};
export function drawPuppet(g, A, q, pat, cap, shade) {
  const c = A.c, foreP = A.foreP || (A.foreP = ARM.fore(A.fore));
  const leg = (hip, hipA, kneeA, back) => {
    const sh = back ? shade(c.shalvar) : c.shalvar, skin = back ? shade(c.skin, .9) : c.skin;
    g.save(); g.translate(hip[0], hip[1]); g.rotate(hipA);
    g.save(); g.translate(0, LEG.knee); g.rotate(kneeA); cap(back ? 'lb' : 'lf', 0, LEG.ankle);
    leather(g, LEG.shin, skin, pat, { inset: 2.4 });
    leather(g, LEG.shoe, back ? shade(c.shoe) : c.shoe, pat, { inset: 2.6 });
    leather(g, LEG.puff, sh, pat, { inset: 3 });
    g.restore();
    leather(g, LEG.thigh, sh, pat, { inset: 3.4 });
    joint(g, 0, LEG.knee - 1, 3.2);
    g.restore();
  };
  const arm = (sh, el, back) => {
    const skin = back ? shade(c.skin, .9) : c.skin;
    g.save(); g.translate(A.shoulder[0], A.shoulder[1]); g.rotate(sh);
    leather(g, ARM.upper, skin, pat, { inset: 2.2 });
    g.save(); g.translate(0, ARM.elbow); g.rotate(el);
    leather(g, foreP, skin, pat, { inset: 2.4 });
    g.translate(0, A.fore - 3); cap(back ? 'hb' : 'hf', 2, 12);
    if (back) { g.rotate(A.backWrist || 0); handM.m = g.getTransform(); }
    drawHand(g, skin, pat, back ? .95 : 1.12);
    g.restore();
    leather(g, ARM.sleeve, back ? shade(c.sleeve) : c.sleeve, pat, { inset: 3 });
    leather(g, ARM.band, c.band, pat, { inset: 2, rim: false });
    if (!back) joint(g, 0, -1, 3.4);
    g.restore();
  };
  leg(A.hips[0], q.hipB, q.kneeB, true);
  leg(A.hips[1], q.hipF, q.kneeF, false);
  g.save(); g.rotate(q.bow + A.hunch);
  arm(q.bA, q.bE, true);
  leather(g, A.skirt, c.skirt, pat);
  if (A.deco) { g.save(); strokeTwice(g, A.deco, c.trim, 4.6); g.restore(); }
  leather(g, A.sashEnd, A.name === 'Karagöz' ? c.sash : c.trim, pat, { inset: 2.2 });
  leather(g, A.jacket, c.jacket, pat);
  for (const b of A.bands) leather(g, b, c.trim, pat, { inset: 2.2, rim: false });
  leather(g, A.collar, c.trim, pat, { inset: 2.2 });
  leather(g, A.sash, c.sash, pat, { inset: 2.6 });
  g.save(); g.strokeStyle = 'rgba(28,13,6,.55)'; g.lineWidth = 1.3; // kuşak kıvrımları
  g.beginPath(); g.moveTo(-20, -6); g.quadraticCurveTo(0, -1, 22, -6); g.moveTo(-18, 0); g.quadraticCurveTo(2, 4, 24, -1); g.stroke(); g.restore();
  // baş
  g.save(); g.translate(A.neck[0], A.neck[1]); g.rotate(q.head); cap('neckScr', 0, 0);
  drawTurbanBack(g, A, pat);
  leather(g, A.face, c.skin, pat, { inset: 3 });
  const [cx, cy, crx, cry] = A.cheek; g.fillStyle = 'rgba(225,95,95,.32)'; g.beginPath(); g.ellipse(cx, cy, crx, cry, 0, 0, TAU); g.fill();
  leather(g, A.ear, shade(c.skin, .9), pat, { dash: false, lw: 2 }); g.lineWidth = 1.3; g.strokeStyle = OUT; g.stroke(A.earIn);
  leather(g, A.eye, '#fffaf0', null, { dash: false, rim: false, lw: 1.6 });
  const [ix, iy, ir] = A.iris; g.fillStyle = '#3a2214'; g.beginPath(); g.arc(ix, iy, ir, 0, TAU); g.fill();
  g.fillStyle = '#0c0603'; g.beginPath(); g.arc(ix, iy, ir * .5, 0, TAU); g.fill(); dots(g, [[ix + ir * .4, iy - ir * .4, ir * .25]]);
  g.strokeStyle = OUT; g.lineWidth = 2.6; g.stroke(A.lid); g.lineWidth = 3.4; g.stroke(A.brow);
  g.lineWidth = 1.5; for (const l of A.lines) g.stroke(l);
  g.save(); g.translate(A.jawPivot[0], A.jawPivot[1]); g.rotate(q.jaw); g.translate(-A.jawPivot[0], -A.jawPivot[1]);
  leather(g, A.jaw, c.beard, null, { dashColor: '#5d8a94', inset: 2.6, rim: false }); dots(g, A.hBeard, 1.2, 'rgba(120,170,200,.9)');
  g.restore();
  leather(g, A.mous, c.beard, null, { dash: false, rim: false, lw: 2 });
  drawTurban(g, A, pat); cap('head', A.rosette[0], A.rosette[1]);
  g.restore();
  // uzak el sakalın / göğsün önünde görünür (deri kuklalarda olduğu gibi)
  if (handM.m) { g.save(); g.setTransform(handM.m); drawHand(g, shade(c.skin, .95), pat, .95); g.restore(); handM.m = null; }
  arm(q.sh, q.el, false);
  g.restore();
}
function drawHand(g, skin, pat, k = 1.12) {
  g.save(); g.scale(k, k);
  leather(g, ARM.thumb, skin, pat, { dash: false, rim: false, lw: 1.9 });
  leather(g, ARM.hand, skin, pat, { dash: false, rim: false, lw: 2.1 });
  g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke(ARM.fingers);
  g.restore();
}

/* ---------- sahne süsleri (göstermelik) ---------- */
export function drawBackdrop(g, W, H, pat) {
  const grd = g.createRadialGradient(W * .5, H * .45, 10, W * .5, H * .5, Math.max(W, H) * .78);
  grd.addColorStop(0, '#fffaea'); grd.addColorStop(.45, '#f8e8c3'); grd.addColorStop(.8, '#ebcd94'); grd.addColorStop(1, '#cfa063');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  g.globalAlpha = .04; g.fillStyle = '#5a3210';
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
  for (let x = 0; x < W; x += 3) g.fillRect(x, 0, 1, H);
  g.globalAlpha = 1;
  const u = Math.min(H * .0019, W * .0017);
  g.globalCompositeOperation = 'multiply';
  drawMountains(g, W, H, u, pat);
  drawPavilion(g, W * .005, H, u, pat, 1);
  drawKosk(g, W * .995, H, u, pat);
  g.globalCompositeOperation = 'source-over';
  const v = g.createLinearGradient(0, H * .88, 0, H); v.addColorStop(0, 'rgba(60,30,8,0)'); v.addColorStop(1, 'rgba(60,30,8,.3)');
  g.fillStyle = v; g.fillRect(0, H * .88, W, H * .12);
}
function drawMountains(g, W, H, u, pat) { // asılı dağ-köy göstermeliği
  const cx = W / 2, top = H * .02;
  const sc = Math.min(u * 1.15, W / 720);
  g.save(); g.translate(cx, top + 70 * sc); g.scale(sc, sc); g.lineJoin = 'round';
  g.strokeStyle = 'rgba(40,20,8,.75)'; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(-170, -6); g.lineTo(-60, -70); g.lineTo(60, -70); g.lineTo(150, -10); g.stroke(); // ip
  leather(g, P('M-250,40 C-230,10 -205,0 -180,10 C-160,-14 -130,-22 -100,-6 C-80,-30 -55,-46 -20,-28 C0,-50 30,-58 60,-30 C90,-44 120,-36 140,-14 C170,-20 200,-8 230,12 C250,22 262,34 270,46 C140,54 -100,58 -250,40 Z'), '#d4864a', pat, { inset: 3 });
  leather(g, P('M-245,42 C-200,24 -150,22 -110,30 C-60,14 -10,20 30,28 C80,16 140,20 200,30 C230,34 255,40 268,46 C140,54 -100,58 -245,42 Z'), '#6fb04f', pat, { inset: 3 });
  for (const [x, y, s, c] of [[-150, 26, 1, '#d99a3a'], [-120, 30, .8, '#e7d3a0'], [110, 26, 1.1, '#d99a3a'], [150, 32, .85, '#e7d3a0']]) {
    g.save(); g.translate(x, y); g.scale(s, s);
    leather(g, P('M-14,0 L-14,-22 L14,-22 L14,0 Z'), c, pat, { inset: 2 });
    leather(g, P('M-18,-20 L0,-34 L18,-20 Z'), '#c0283a', pat, { inset: 2 });
    g.fillStyle = OUT; g.fillRect(-6, -16, 5, 7); g.fillRect(4, -16, 5, 7);
    g.restore();
  }
  for (const [x, y, s] of [[-200, 30, 1], [-60, 24, .8], [40, 26, .9], [210, 34, 1]]) {
    g.save(); g.translate(x, y); g.scale(s, s);
    leather(g, P('M0,0 C-8,-12 -8,-30 0,-46 C8,-30 8,-12 0,0 Z'), '#1f6e46', pat, { inset: 2 });
    g.restore();
  }
  g.restore();
}
function drawPavilion(g, x, H, u, pat) { // sol: süslü köşk direkleri
  g.save(); g.translate(x, H * .985); g.scale(u, u); g.lineJoin = 'round';
  leather(g, P('M0,0 L0,-40 L120,-40 L120,0 Z'), '#1e7d5e', pat, { inset: 3 });
  for (const cx of [14, 60, 106]) {
    leather(g, P(`M${cx - 7},-40 C${cx - 10},-90 ${cx - 4},-140 ${cx - 6},-200 L${cx + 6},-200 C${cx + 4},-140 ${cx + 10},-90 ${cx + 7},-40 Z`), '#e2a945', pat, { inset: 2.5 });
    leather(g, P(`M${cx - 10},-130 C${cx - 14},-140 ${cx + 14},-140 ${cx + 10},-130 C${cx + 14},-120 ${cx - 14},-120 ${cx - 10},-130 Z`), '#c0283a', pat, { dash: false });
  }
  leather(g, P('M-6,-196 L126,-196 L126,-226 L-6,-226 Z'), '#c0283a', pat, { inset: 3 });
  dots(g, Array.from({ length: 13 }, (_, i) => [4 + i * 9.5, -211, 2]));
  leather(g, P('M-14,-224 L134,-224 L110,-262 L10,-262 Z'), '#b9652d', pat, { inset: 3 });
  leather(g, P('M30,-262 C30,-300 90,-300 90,-262 Z'), '#21988a', pat, { inset: 3 });
  leather(g, P('M57,-296 L63,-296 L62,-318 L58,-318 Z'), '#e2a945', pat, { dash: false });
  g.save(); g.clip(P('M0,-6 L0,-36 L120,-36 L120,-6 Z')); g.strokeStyle = '#f4e6c4'; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < 40; i++) { const xx = i * 4, yy = -20 + (i % 2 ? 6 : -6); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); g.restore();
  g.restore();
}
function drawKosk(g, x, H, u, pat) { // sağ: kubbeli köşk + minare
  g.save(); g.translate(x, H * .985); g.scale(-u, u); g.lineJoin = 'round';
  leather(g, P('M0,0 L0,-200 L120,-200 L120,0 Z'), '#d99a3a', pat, { inset: 3.5 });
  leather(g, P('M-14,-196 L134,-196 L120,-224 L0,-224 Z'), '#c0283a', pat, { inset: 3 });
  leather(g, P('M10,-224 C10,-272 110,-272 110,-224 Z'), '#21988a', pat, { inset: 3.5 });
  leather(g, P('M57,-268 L63,-268 L62,-292 L58,-292 Z'), '#e2a945', pat, { dash: false });
  g.fillStyle = '#e2a945'; g.beginPath(); g.arc(60, -296, 5, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  leather(g, P('M128,0 L128,-290 L146,-290 L146,0 Z'), '#ead6a6', pat, { inset: 3 });
  leather(g, P('M124,-290 L150,-290 L137,-342 Z'), '#c0283a', pat, { inset: 2.5 });
  leather(g, P('M121,-222 L153,-222 L150,-210 L124,-210 Z'), '#c0283a', pat, { dash: false });
  for (const [wx, wy] of [[16, -182], [68, -182], [16, -104], [68, -104]]) {
    const w = P(`M${wx},${wy + 60} L${wx},${wy + 18} C${wx},${wy} ${wx + 36},${wy} ${wx + 36},${wy + 18} L${wx + 36},${wy + 60} Z`);
    leather(g, w, '#3b2412', null, { dash: false });
    g.save(); g.clip(w); g.strokeStyle = '#e2a945'; g.lineWidth = 2;
    for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(wx + i * 8, wy); g.lineTo(wx + i * 8 + 40, wy + 60); g.moveTo(wx + i * 8 + 40, wy); g.lineTo(wx + i * 8, wy + 60); g.stroke(); }
    g.restore();
  }
  leather(g, P('M44,0 L44,-40 C44,-56 76,-56 76,-40 L76,0 Z'), '#5a2e14', pat, { dash: false });
  dots(g, Array.from({ length: 18 }, (_, i) => [137, -20 - i * 15, 1.9]));
  g.restore();
}
