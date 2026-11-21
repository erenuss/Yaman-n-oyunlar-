import { gps } from '../assets/exifr.mjs';

export function mediaKind(file) {
  const type = (file.type || '').toLowerCase();
  if (/^image\/(jpeg|png|webp|heic|heif|avif|tiff|gif|bmp)$/.test(type) || /\.(jpe?g|png|webp|heic|heif|avif|tiff?|gif|bmp)$/i.test(file.name)) return 'image';
  if (type.startsWith('audio/') || /\.(m4a|wav|mp3|flac|aac|ogg|oga)$/i.test(file.name)) return 'audio';
  if (type.startsWith('video/') || /\.(mp4|mov|m4v|webm|mkv|avi|3gp)$/i.test(file.name)) return 'video';
  return null;
}

export function point(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 &&
    (lat !== 0 || lon !== 0) ? { lat, lon } : null;
}

function isoPoint(value) {
  const match = value.trim().match(/^([+-]\d{2}(?:\.\d+)?)([+-]\d{3}(?:\.\d+)?)(?:[+-]\d+(?:\.\d+)?)?\/?\s*$/);
  return match ? point(Number(match[1]), Number(match[2])) : null;
}

const decoder = new TextDecoder();
function view(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
function atom(bytes, at, end) {
  if (at + 8 > bytes.length) return null;
  const dv = view(bytes);
  const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
  let size = dv.getUint32(at), header = 8;
  if (size === 1) {
    if (at + 16 > bytes.length) return null;
    size = dv.getUint32(at + 8) * 2 ** 32 + dv.getUint32(at + 12); header = 16;
  } else if (size === 0) size = end - at;
  if (!Number.isSafeInteger(size) || size < header || at + size > end) return null;
  return { type, start: at + header, end: at + size, id: dv.getUint32(at + 4) };
}
function children(bytes, start, end) {
  const list = [];
  while (start < end && list.length < 20000) {
    const item = atom(bytes, start, end);
    if (!item) break;
    list.push(item); start = item.end;
  }
  return list;
}
function readTags(bytes, out) {
  const dv = view(bytes);
  const str = (a, b) => decoder.decode(bytes.subarray(a, b)).replace(/\0+$/, '');
  function tags(start, end, depth) {
    if (depth > 4) return;
    const items = children(bytes, start, end);
    const keys = items.find(x => x.type === 'keys');
    const names = [''];
    if (keys && keys.start + 8 <= keys.end) {
      for (const row of children(bytes, keys.start + 8, keys.end)) names.push(str(row.start, row.end));
    }
    for (const item of items) {
      const a = item.start, b = item.end;
      if (item.type === 'udta') tags(a, b, depth + 1);
      if (item.type === 'meta') {
        // QuickTime has both the full-box and the older bare meta atom.
        tags(atom(bytes, a, b)?.type === 'hdlr' ? a : a + 4, b, depth + 1);
      }
      if (item.type === 'mvhd' && b - a >= (bytes[a] === 1 ? 12 : 8)) {
        const sec = bytes[a] === 1 ? dv.getUint32(a + 4) * 2 ** 32 + dv.getUint32(a + 8) : dv.getUint32(a + 4);
        const ms = (sec - 2082844800) * 1000;
        if (ms >= Date.UTC(1980, 0, 1) && ms <= Date.now() + 86400000) out.containerTime = new Date(ms).toISOString();
      }
      if (item.type === '©xyz' && a + 4 < b) out.gps ||= isoPoint(str(a + 4, b));
      if (item.type === 'loci' && a + 7 < b) {
        const nameEnd = bytes.subarray(a + 6, b).indexOf(0);
        const offset = a + 6 + nameEnd + 2;
        if (nameEnd >= 0 && offset + 8 <= b) out.gps ||= point(dv.getInt32(offset + 4) / 65536, dv.getInt32(offset) / 65536);
      }
      if (item.type !== 'ilst') continue;
      for (const entry of children(bytes, a, b)) {
        const data = children(bytes, entry.start, entry.end).find(x => x.type === 'data');
        if (!data || data.end - data.start < 8) continue;
        const value = str(data.start + 8, data.end);
        const name = names[entry.id] || entry.type;
        if (['com.apple.quicktime.location.ISO6709','location','location-eng','©xyz'].includes(name)) out.gps ||= isoPoint(value);
        if (['com.apple.quicktime.creationdate','creation_time'].includes(name) && /(?:Z|[+-]\d\d:?\d\d)$/i.test(value)) {
          const ms = Date.parse(value);
          if (Number.isFinite(ms) && ms >= Date.UTC(1980, 0, 1) && ms <= Date.now() + 86400000) out.captureTime = new Date(ms).toISOString();
        }
      }
    }
  }
  tags(0, bytes.length, 0);
}

async function movieTags(file) {
  const out = {};
  let pos = 0;
  for (let i = 0; i < 2048 && pos + 8 <= file.size; i++) {
    const head = new Uint8Array(await file.slice(pos, pos + 16).arrayBuffer());
    const top = atom(head, 0, file.size - pos);
    if (!top) break;
    if (top.type === 'moov') {
      // Seek over sample tables and media payloads; metadata may follow either.
      let childPos = pos + top.start;
      for (let k = 0; k < 2048 && childPos + 8 <= pos + top.end; k++) {
        const hdr = new Uint8Array(await file.slice(childPos, childPos + 16).arrayBuffer());
        const child = atom(hdr, 0, pos + top.end - childPos);
        if (!child) break;
        if (['udta','meta','mvhd'].includes(child.type) && child.end <= 8 * 1024 * 1024) {
          readTags(new Uint8Array(await file.slice(childPos, childPos + child.end).arrayBuffer()), out);
        }
        childPos += child.end;
      }
      break;
    }
    pos += top.end;
  }
  return out;
}

export async function readMetadata(file, kind) {
  if (kind === 'image') {
    const coords = await gps(file).catch(() => null);
    return { gps: point(coords?.latitude, coords?.longitude), source: 'EXIF GPS' };
  }
  const out = await movieTags(file);
  return { ...out, source: 'QuickTime / ISO 6709' };
}

function eventOnce(el, event, action, signal) {
  return new Promise((resolve, reject) => {
    function end(err) {
      clearTimeout(timer);
      el.removeEventListener(event, done); el.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
      if (err) reject(err); else resolve();
    }
    const done = () => end();
    const failed = () => end(new Error('Tarayıcı bu görüntü biçimini açamadı.'));
    const aborted = () => end(new DOMException('Dosya değişti.', 'AbortError'));
    const timer = setTimeout(failed, 14000);
    el.addEventListener(event, done, { once: true }); el.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted(); else action();
  });
}

function snapshot(media, w, h, time) {
  const scale = Math.min(1, 1536 / Math.max(w, h));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w * scale)); canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(media, 0, 0, canvas.width, canvas.height);
  const small = document.createElement('canvas'); small.width = 24; small.height = 16;
  const mini = small.getContext('2d'); mini.drawImage(canvas, 0, 0, 24, 16);
  const rgba = mini.getImageData(0, 0, 24, 16).data;
  const signature = Uint8Array.from({length: 24 * 16}, (_, i) => (rgba[i * 4] * 3 + rgba[i * 4 + 1] * 6 + rgba[i * 4 + 2]) / 10);
  const mean = signature.reduce((a, v) => a + v, 0) / signature.length;
  const variance = signature.reduce((a, v) => a + (v - mean) ** 2, 0) / signature.length;
  return { canvas, time, signature, flat: variance < 28 };
}
export async function getFrames(kind, url, signal, file) {
  if (kind === 'image') {
    const img = new Image();
    try { await eventOnce(img, 'load', () => { img.src = url; }, signal); }
    catch (error) {
      if (signal.aborted || !/hei[cf]/i.test(file?.type + ' ' + file?.name)) throw error;
      const { heicTo } = await import('https://cdn.jsdelivr.net/npm/heic-to@1.3.0/dist/heic-to.js');
      const blob = await heicTo({blob:file,type:'image/jpeg',quality:0.92});
      const converted = URL.createObjectURL(blob);
      try { await eventOnce(img, 'load', () => { img.src = converted; }, signal); }
      finally { URL.revokeObjectURL(converted); }
    }
    if (!img.naturalWidth) throw Error('Görüntü açılamadı.');
    return [snapshot(img, img.naturalWidth, img.naturalHeight, null)];
  }
  const el = document.createElement('video'); el.muted = true; el.playsInline = true; el.preload = 'auto';
  try {
    await eventOnce(el, 'loadeddata', () => { el.src = url; el.load(); }, signal);
    if (!el.videoWidth) throw Error('Video görüntü kanalı bulunamadı.');
    if (!Number.isFinite(el.duration) || el.duration <= 0.05) return [snapshot(el, el.videoWidth, el.videoHeight, 0)];
    const samples = el.duration < 2 ? [0.12,0.55,0.88] : [0.04,0.23,0.46,0.69,0.93];
    const frames = [];
    for (const fraction of samples) {
      const time = Math.min(el.duration - 0.025, el.duration * fraction);
      await eventOnce(el, 'seeked', () => { el.currentTime = time; }, signal);
      const f = snapshot(el, el.videoWidth, el.videoHeight, el.currentTime);
      const duplicate = frames.some(p => f.signature.reduce((n, v, i) => n + Math.abs(v - p.signature[i]), 0) / f.signature.length < 2.5);
      if (!duplicate) frames.push(f);
    }
    return frames;
  } finally { el.removeAttribute('src'); el.load(); }
}
