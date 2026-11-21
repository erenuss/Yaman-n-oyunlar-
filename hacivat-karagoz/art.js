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
// fill -> iç dikiş çizgisi -> doku -> kontur
export function leather(g, path, fill, pat, o = {}) {
  g.fillStyle = fill; g.fill(path);
  if (o.dash !== false) {
    const w = o.inset || 4;
    g.save(); g.clip(path);
    g.setLineDash(o.dots ? [0.1, 3.4] : [3.6, 2.8]); g.lineCap = o.dots ? 'round' : 'butt';
    g.lineWidth = w * 2 + (o.dots ? 2.4 : 1.5); g.strokeStyle = o.dashColor || OUT; g.stroke(path);
    g.setLineDash([]); g.lineWidth = w * 2; g.strokeStyle = fill; g.stroke(path);
    g.restore(); g.lineCap = 'round';
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
  g.fillStyle = '#fffbea'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.lineWidth = 1.2; g.strokeStyle = OUT; g.stroke();
}

/* ---------- ortak parçalar ---------- */
export const LEG = {
  thigh: P('M-16,-4 C-24,16 -22,40 -13,58 L13,58 C22,40 24,16 16,-4 C8,-9 -8,-9 -16,-4 Z'),
  shin: P('M-12,-4 C-15,12 -13,28 -9,40 L9,40 C13,28 15,12 12,-4 Z'),
  cuff: P('M-10,31 L10,31 L11,41 L-11,41 Z'),
  shoe: P('M-11,38 L11,38 C20,42 31,45 44,38 C48,49 40,58 25,58 L-10,58 C-15,58 -16,46 -11,38 Z'),
  knee: 53
};
export const ARM = {
  sleeve: P('M-12,-7 C-15,10 -13,26 -10,36 L10,36 C13,24 15,8 12,-7 C7,-12 -7,-12 -12,-7 Z'),
  cuff: P('M-11,27 C-4,30 4,30 11,27 L10,38 C4,40 -4,40 -10,38 Z'),
  elbow: 34,
  fore: L => P(`M-7,-2 C-8.5,${L * .4} -7.5,${L * .75} -6,${L} L6,${L} C7.5,${L * .75} 8.5,${L * .4} 7,-2 Z`),
  hand: P('M-7,-2 C-11,4 -10,14 -5,19 L-4,28 C-3,31 0,31 0.3,28 L1,20 L4,29 C5,32 8.5,31 8,28 L6.5,19 L10.5,25 C12,27.5 15,26 13.5,23 L10.5,15 C12.5,10 12,4 8,-2 Z'),
  thumb: P('M7,2 C13,1 18.5,5 18.5,10.5 C14,11.5 10,10 7,8 Z'),
  fingers: P('M-1,19 L-1,26 M3.5,19 L4.5,26 M8,17 L10,22')
};

/* ---------- karakterler ---------- */
export const ART = {
  karagoz: {
    name: 'Karagöz', neck: [4, -106], shoulder: [-6, -92], hips: [[-8, 4], [9, 4]], jawPivot: [-6, -20], fore: 46, hunch: .1, armRest: [-.5, -.55],
    backArm: [-.55, -2.25], // eli sakalında
    c: { skin: '#f6cfa6', jacket: '#c8243a', trim: '#14a08a', sash: '#ecb33f', sash2: '#14a08a', skirt: '#c8243a', hem: '#14a08a', shalvar: '#14a08a', shoe: '#c22a28',
      beard: '#1b0f0b', turban: '#c8243a', turban2: '#14a08a', turban3: '#f4e6c4', rosette: '#e3a83a', plume: '#14a08a' },
    jacket: P('M4,-108 C16,-106 25,-98 27,-86 C31,-66 33,-40 29,-14 L-27,-10 C-33,-36 -37,-70 -29,-92 C-23,-104 -10,-110 4,-108 Z'),
    collar: P('M-8,-106 C0,-98 12,-98 20,-104 C22,-100 21,-96 18,-93 C9,-88 -2,-90 -10,-98 Z'),
    front: P('M17,-100 C24,-78 29,-48 27,-16 L19,-15 C21,-46 17,-76 11,-97 Z'),
    hem: P('M-28,-23 C-9,-18 12,-18 30,-25 L29,-12 C10,-8 -10,-8 -27,-10 Z'),
    skirt: P('M-27,-4 C-10,1 12,1 29,-4 C33,14 37,30 40,46 C20,51 -15,51 -36,46 C-32,30 -29,14 -27,-4 Z'),
    skirtHem: P('M-36,46 C-35,41 -34,37 -33,33 C-12,38 16,38 37,33 C38,37 39,42 40,46 C20,51 -15,51 -36,46 Z'),
    sash: P('M-29,-16 C-10,-10 12,-10 31,-16 L31,1 C12,7 -10,7 -29,1 Z'),
    sashEnd: P('M13,0 C18,12 15,26 19,40 L31,37 C27,25 29,10 27,-2 Z'),
    face: P('M-14,2 C-22,-12 -26,-34 -24,-58 L22,-62 C24,-56 25,-50 27,-46 C30,-42 32,-40 34,-38 C43,-36 47,-28 41,-22 C38,-19 34,-19 31,-19 L30,-6 C24,0 16,3 8,4 Z'),
    ear: P('M-8,-36 C-16,-38 -18,-25 -11,-21 C-7,-20 -5,-25 -6,-30 Z'),
    jaw: P('M34,-21 C41,-14 41,-2 35,8 C29,18 17,24 4,22 C-6,20 -13,12 -13,2 C-13,-8 -9,-16 -3,-20 C6,-17 12,-23 20,-23 C26,-24 30,-22 34,-21 Z'),
    mous: P('M17,-24 C24,-28 34,-26 40,-20 C34,-16 26,-17 17,-24 Z'),
    eye: P('M9,-43 C13,-49 23,-50 28,-44 C23,-39 14,-38 9,-43 Z'), iris: [20, -44, 3.6],
    lid: P('M8,-44 C13,-51 23,-52 29,-45'), brow: P('M6,-51 C13,-57 23,-57 29,-51'),
    lines: [P('M7,-30 q5,5 12,3'), P('M33,-28 q3,2 6,0')],
    turban: P('M-34,-61 C-45,-84 -35,-113 -6,-117 C20,-121 39,-105 37,-82 C36,-72 33,-64 29,-58 C10,-64 -16,-64 -34,-61 Z'),
    band: P('M-36,-60 C-20,-70 14,-72 32,-60 C34,-56 32,-51 28,-51 C10,-60 -16,-58 -33,-50 C-37,-52 -38,-57 -36,-60 Z'),
    horn: null,
    plume: P('M-26,-109 C-40,-118 -46,-134 -36,-142 C-31,-131 -24,-121 -20,-111 Z'),
    rosette: [12, -115, 10]
  },
  hacivat: {
    name: 'Hacivat', neck: [4, -108], shoulder: [-6, -94], hips: [[-8, 4], [9, 4]], jawPivot: [-4, -18], fore: 36, hunch: 0, armRest: [-.12, -.4],
    backArm: [-.25, -1.95], // eli göğsünde
    c: { skin: '#f6cfa6', jacket: '#c8243a', trim: '#ecb33f', sash: '#ecb33f', sash2: '#c8243a', skirt: '#c8243a', hem: '#14a08a', shalvar: '#14a08a', shoe: '#ecb33f',
      beard: '#1b0f0b', turban: '#c8243a', turban2: '#ecb33f', turban3: '#14a08a', rosette: '#c8243a', plume: '#14a08a' },
    jacket: P('M4,-110 C15,-109 23,-101 25,-89 C28,-66 28,-40 26,-14 L-24,-10 C-29,-38 -31,-72 -26,-94 C-20,-106 -8,-111 4,-110 Z'),
    collar: P('M-8,-108 C0,-100 12,-100 19,-106 C21,-102 20,-98 17,-95 C8,-90 -2,-92 -10,-100 Z'),
    front: P('M-25,-80 C-10,-74 10,-74 26,-80 L26,-70 C10,-64 -10,-64 -26,-70 Z'),
    hem: P('M-25,-23 C-8,-18 10,-18 27,-25 L26,-12 C9,-8 -9,-8 -24,-10 Z'),
    skirt: P('M-25,-4 C-10,1 12,1 27,-4 C31,16 34,34 37,54 C18,58 -14,58 -34,54 C-30,34 -27,16 -25,-4 Z'),
    skirtHem: P('M-34,54 C-33,49 -32,45 -31,41 C-12,46 14,46 35,41 C36,45 36,50 37,54 C18,58 -14,58 -34,54 Z'),
    sash: P('M-26,-16 C-9,-10 11,-10 28,-16 L28,1 C11,7 -9,7 -26,1 Z'),
    sashEnd: P('M10,0 C15,14 12,30 16,46 L27,44 C23,30 26,12 24,-2 Z'),
    face: P('M-12,2 C-20,-14 -22,-36 -20,-58 L20,-62 C22,-56 23,-50 25,-46 C28,-42 31,-38 35,-33 C39,-29 39,-25 34,-23 C31,-22 28,-22 26,-21 L26,-10 C20,-4 14,0 8,4 Z'),
    ear: P('M-7,-35 C-14,-37 -16,-25 -10,-21 C-6,-20 -4,-25 -5,-30 Z'),
    jaw: P('M27,-19 C30,-11 30,-3 28,5 C30,11 35,14 42,13 C38,20 29,23 22,19 C14,15 6,11 -2,7 C-8,3 -10,-5 -8,-13 C0,-11 8,-15 14,-19 C18,-21 24,-21 27,-19 Z'),
    mous: P('M17,-23 C24,-26 31,-24 35,-19 C38,-15 43,-16 45,-21 C44,-12 35,-10 29,-14 C24,-17 20,-19 17,-23 Z'),
    eye: P('M10,-43 C14,-47 21,-48 25,-44 C21,-40 14,-40 10,-43 Z'), iris: [19, -44, 2.8],
    lid: P('M9,-44 C14,-49 21,-50 26,-45'), brow: P('M7,-50 C14,-54 21,-54 27,-49'),
    lines: [P('M8,-30 q4,4 10,3'), P('M30,-30 q2,2 5,1')],
    turban: P('M-28,-58 C-35,-80 -26,-105 -4,-111 C16,-115 32,-103 32,-84 C32,-74 30,-66 26,-60 C10,-64 -12,-64 -28,-58 Z'),
    band: P('M-30,-57 C-16,-67 14,-69 30,-58 C32,-54 30,-49 26,-49 C10,-57 -14,-55 -28,-47 C-32,-49 -32,-54 -30,-57 Z'),
    horn: P('M18,-63 C33,-63 46,-71 55,-86 C53,-67 43,-54 26,-51 Z'),
    plume: null,
    rosette: [0, -113, 9]
  }
};

// otomatik ışık delikleri
const probe = document.createElement('canvas').getContext('2d');
export function holesIn(path, step, inset, bx, flower) {
  const pts = [];
  for (let y = bx[1], r = 0; y <= bx[3]; y += step, r++) for (let x = bx[0] + (r % 2 ? step / 2 : 0); x <= bx[2]; x += step) {
    if ([[0, 0], [inset, 0], [-inset, 0], [0, inset], [0, -inset]].every(([a, b]) => probe.isPointInPath(path, x + a, y + b))) {
      pts.push([x, y, flower ? 1.7 : 1.4]);
      if (flower) for (let k = 0; k < 5; k++) pts.push([x + Math.cos(k / 5 * TAU) * 4, y + Math.sin(k / 5 * TAU) * 4, 1.1]);
    }
  }
  return pts;
}
for (const a of Object.values(ART)) {
  a.hBeard = holesIn(a.jaw, 6.5, 2.6, [-14, -24, 44, 24], false);
  a.hSkirt = holesIn(a.skirt, 15, 7, [-34, 6, 38, 34], true);
  a.hSash = holesIn(a.sash, 6, 2.5, [-30, -12, 32, -2], false);
  a.hShalvar = holesIn(LEG.thigh, 10, 4, [-18, 4, 18, 50], false);
}

/* ---------- sarık çizimi ---------- */
export function drawTurban(g, A, pat) {
  const c = A.c;
  if (A.plume) leather(g, A.plume, c.plume, pat, { inset: 2.5 });
  if (A.horn) leather(g, A.horn, c.turban, pat, { inset: 3 });
  leather(g, A.turban, c.turban, pat, { stroke: false, dash: false });
  g.save(); g.clip(A.turban);
  // sarık katları: çapraz bantlar
  g.lineWidth = 9; g.strokeStyle = c.turban2;
  for (let i = -4; i < 5; i++) { g.beginPath(); g.moveTo(-50 + i * 20, -60); g.quadraticCurveTo(-20 + i * 20, -92, -2 + i * 20, -124); g.stroke(); }
  g.lineWidth = 1.6; g.strokeStyle = OUT;
  for (let i = -4; i < 5; i++) for (const o of [-4.5, 4.5]) { g.beginPath(); g.moveTo(-50 + i * 20 + o, -60); g.quadraticCurveTo(-20 + i * 20 + o, -92, -2 + i * 20 + o, -124); g.stroke(); }
  // beyaz zikzak
  g.strokeStyle = c.turban3; g.lineWidth = 2.2; g.beginPath();
  for (let i = 0; i <= 16; i++) { const x = -40 + i * 5, y = -78 - (i % 2 ? 5 : 0) - Math.sin(i / 16 * Math.PI) * 10; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke();
  if (pat) { g.globalCompositeOperation = 'multiply'; g.fillStyle = pat; g.globalAlpha = .5; g.fill(A.turban); }
  g.restore();
  g.save(); g.setLineDash([3.6, 2.8]); g.lineWidth = 1.4; g.strokeStyle = OUT;
  g.translate(0, 0); g.restore();
  g.lineWidth = 2.6; g.strokeStyle = OUT; g.stroke(A.turban);
  leather(g, A.band, c.turban3 === '#f4e6c4' ? c.turban : c.turban2, pat, { inset: 2.6 });
  g.save(); g.clip(A.band); g.strokeStyle = c.turban3; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < 20; i++) { const x = -38 + i * 4, y = -56 - (i % 2 ? 4 : 0) - Math.sin((i / 19) * Math.PI) * 6; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.stroke(); g.restore();
  // rozet (çiçek)
  const [rx, ry, rr] = A.rosette;
  g.lineWidth = 1.6; g.strokeStyle = OUT;
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * TAU; g.fillStyle = c.rosette; g.beginPath(); g.ellipse(rx + Math.cos(a) * rr * .62, ry + Math.sin(a) * rr * .62, rr * .5, rr * .34, a, 0, TAU); g.fill(); g.stroke();
  }
  g.fillStyle = c.turban2 === '#14a08a' ? '#14a08a' : '#ecb33f'; g.beginPath(); g.arc(rx, ry, rr * .36, 0, TAU); g.fill(); g.stroke();
  dots(g, [[rx, ry, 1.6]]);
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
    leather(g, P('M-18,-20 L0,-34 L18,-20 Z'), '#c8243a', pat, { inset: 2 });
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
    leather(g, P(`M${cx - 7},-40 C${cx - 10},-90 ${cx - 4},-140 ${cx - 6},-200 L${cx + 6},-200 C${cx + 4},-140 ${cx + 10},-90 ${cx + 7},-40 Z`), '#ecb33f', pat, { inset: 2.5 });
    leather(g, P(`M${cx - 10},-130 C${cx - 14},-140 ${cx + 14},-140 ${cx + 10},-130 C${cx + 14},-120 ${cx - 14},-120 ${cx - 10},-130 Z`), '#c8243a', pat, { dash: false });
  }
  leather(g, P('M-6,-196 L126,-196 L126,-226 L-6,-226 Z'), '#c8243a', pat, { inset: 3 });
  dots(g, Array.from({ length: 13 }, (_, i) => [4 + i * 9.5, -211, 2]));
  leather(g, P('M-14,-224 L134,-224 L110,-262 L10,-262 Z'), '#b9652d', pat, { inset: 3 });
  leather(g, P('M30,-262 C30,-300 90,-300 90,-262 Z'), '#14a08a', pat, { inset: 3 });
  leather(g, P('M57,-296 L63,-296 L62,-318 L58,-318 Z'), '#ecb33f', pat, { dash: false });
  g.save(); g.clip(P('M0,-6 L0,-36 L120,-36 L120,-6 Z')); g.strokeStyle = '#f4e6c4'; g.lineWidth = 2; g.beginPath();
  for (let i = 0; i < 40; i++) { const xx = i * 4, yy = -20 + (i % 2 ? 6 : -6); i ? g.lineTo(xx, yy) : g.moveTo(xx, yy); } g.stroke(); g.restore();
  g.restore();
}
function drawKosk(g, x, H, u, pat) { // sağ: kubbeli köşk + minare
  g.save(); g.translate(x, H * .985); g.scale(-u, u); g.lineJoin = 'round';
  leather(g, P('M0,0 L0,-200 L120,-200 L120,0 Z'), '#d99a3a', pat, { inset: 3.5 });
  leather(g, P('M-14,-196 L134,-196 L120,-224 L0,-224 Z'), '#c8243a', pat, { inset: 3 });
  leather(g, P('M10,-224 C10,-272 110,-272 110,-224 Z'), '#14a08a', pat, { inset: 3.5 });
  leather(g, P('M57,-268 L63,-268 L62,-292 L58,-292 Z'), '#ecb33f', pat, { dash: false });
  g.fillStyle = '#ecb33f'; g.beginPath(); g.arc(60, -296, 5, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = OUT; g.stroke();
  leather(g, P('M128,0 L128,-290 L146,-290 L146,0 Z'), '#ead6a6', pat, { inset: 3 });
  leather(g, P('M124,-290 L150,-290 L137,-342 Z'), '#c8243a', pat, { inset: 2.5 });
  leather(g, P('M121,-222 L153,-222 L150,-210 L124,-210 Z'), '#c8243a', pat, { dash: false });
  for (const [wx, wy] of [[16, -182], [68, -182], [16, -104], [68, -104]]) {
    const w = P(`M${wx},${wy + 60} L${wx},${wy + 18} C${wx},${wy} ${wx + 36},${wy} ${wx + 36},${wy + 18} L${wx + 36},${wy + 60} Z`);
    leather(g, w, '#3b2412', null, { dash: false });
    g.save(); g.clip(w); g.strokeStyle = '#ecb33f'; g.lineWidth = 2;
    for (let i = -4; i < 8; i++) { g.beginPath(); g.moveTo(wx + i * 8, wy); g.lineTo(wx + i * 8 + 40, wy + 60); g.moveTo(wx + i * 8 + 40, wy); g.lineTo(wx + i * 8, wy + 60); g.stroke(); }
    g.restore();
  }
  leather(g, P('M44,0 L44,-40 C44,-56 76,-56 76,-40 L76,0 Z'), '#5a2e14', pat, { dash: false });
  dots(g, Array.from({ length: 18 }, (_, i) => [137, -20 - i * 15, 1.9]));
  g.restore();
}
