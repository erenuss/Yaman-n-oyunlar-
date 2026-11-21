export function fold(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/ı/g, 'i')
    .replace(/ß/g, 'ss')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
const countryNames = new Intl.DisplayNames(['tr'], { type: 'region' });
const enNames = new Intl.DisplayNames(['en'], { type: 'region' });
export const country = (code) => countryNames.of(code) || code;
const stop = new Set(
  'the new star city north south east west central center park hotel metro station airport terminal market bank union bridge palace museum church university service police school international garden spring orange nice reading bath sale mobile van of man'.split(
    ' ',
  ),
);
const context =
  /\b(belediye\w*|buyuksehir|valiligi|kaymakamligi|istasyonu|havalimani|otogari|welcome to|bienvenue a|benvenuti a|gare de|estacion de|municipality|municipal|city of|station|railway|aeroport|airport|museum|muzesi|hauptbahnhof)\b/;
const directions =
  /(?:[←→↗↘↖↙]|\b\d+\s*(?:km|mi)\b|\b(?:flights? to|destination|next stop|yol ayrimi|yonu|istikameti)\b)/i;

export function buildIndex(rows) {
  const names = new Map(),
    countries = new Map();
  const add = (map, name, value) => {
    if (!map.has(name)) map.set(name, []);
    const entries = map.get(name);
    if (!entries.includes(value)) entries.push(value);
  };
  for (const row of rows) {
    for (const alias of [row[0], ...row[5].split('|')]) {
      const key = fold(alias);
      if (key.length >= 3) add(names, key, row);
    }
    if (!countries.has(row[1]))
      countries.set(row[1], [country(row[1]), enNames.of(row[1])].map(fold));
  }
  for (const [cc, alt] of Object.entries({
    TR: ['turkey', 'turkiye'],
    IT: ['italia'],
    FR: ['france'],
    DE: ['deutschland'],
    ES: ['espana'],
    GB: ['united kingdom', 'england'],
    US: ['united states', 'usa'],
    GR: ['hellas', 'ellada'],
  })) {
    countries.get(cc)?.push(...alt);
  }
  return { rows, names, countries };
}
let indexPromise;
export function getIndex() {
  if (!indexPromise)
    indexPromise = fetch(new URL('../assets/cities.json.gz', import.meta.url))
      .then(async (res) => {
        if (!res.ok) throw Error('Şehir dizini indirilemedi.');
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (bytes[0] !== 31 || bytes[1] !== 139) return JSON.parse(new TextDecoder().decode(bytes));
        if (typeof DecompressionStream !== 'undefined') {
          const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
          return new Response(stream).json();
        }
        const { gunzipSync, strFromU8 } = await import(
          'https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js'
        );
        return JSON.parse(strFromU8(gunzipSync(bytes)));
      })
      .then(buildIndex)
      .catch((e) => {
        indexPromise = null;
        throw e;
      });
  return indexPromise;
}
export function distance(a, b) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function nearest(p, index) {
  let best = null,
    km = Infinity;
  for (const [name, code, lat, lon] of index.rows) {
    if (Math.abs(lat - p.lat) > 2) continue;
    const d = distance(p, { lat, lon });
    if (d < km) {
      km = d;
      best = { name, code, lat, lon };
    }
  }
  return km <= 75 ? { ...best, km } : null;
}

export function readPlaceNames(lines, index) {
  // Country context applies to the same image or video frame as the place name.
  const frameText = new Map();
  for (const line of lines) {
    if (line.confidence >= 65 && !directions.test(line.text) && !directions.test(fold(line.text))) {
      frameText.set(line.time, (frameText.get(line.time) || ' ') + fold(line.text) + ' ');
    }
  }
  const countriesByFrame = new Map(
    [...frameText].map(([time, text]) => [
      time,
      new Set(
        [...index.countries]
          .filter(([, terms]) => terms.some((term) => text.includes(' ' + term + ' ')))
          .map(([code]) => code),
      ),
    ]),
  );
  const matches = new Map();
  const segments = lines.flatMap((line) => {
    if (directions.test(line.text) || directions.test(fold(line.text))) return [];
    const parts = line.text.split(/\s*[,/|·]\s*/).filter(Boolean);
    return parts.length > 1
      ? [line, ...parts.map((text) => ({ ...line, text, original: line.text }))]
      : [line];
  });
  for (const line of segments) {
    const countryCodes = countriesByFrame.get(line.time) || new Set();
    const clean = fold(line.text);
    if (
      line.confidence < 65 ||
      clean.length < 3 ||
      directions.test(line.text) ||
      directions.test(clean)
    )
      continue;
    const tokens = clean.split(' ').slice(0, 40);
    for (let i = 0; i < tokens.length; i++) {
      for (let n = Math.min(5, tokens.length - i); n >= 1; n--) {
        const phrase = tokens.slice(i, i + n).join(' ');
        const choices = index.names.get(phrase);
        if (!choices) continue;
        const exact = phrase === clean,
          hasContext = context.test(clean);
        const qualifying = choices.filter((row) => countryCodes.has(row[1]));
        if (
          (phrase.length < 4 || stop.has(phrase)) &&
          !(hasContext || (exact && qualifying.length))
        )
          continue;
        if (!exact && !hasContext && !qualifying.length) continue;
        if (!exact && n === 1 && !qualifying.length && choices.every((row) => row[4] < 35000))
          continue;
        const filtered = (qualifying.length ? qualifying : choices)
          .slice()
          .sort((a, b) => b[4] - a[4]);
        const ambiguous = filtered.length > 1;
        const key = phrase + ':' + (qualifying.length ? [...countryCodes].join(',') : '');
        const strength =
          (exact ? 2 : 0) + (hasContext ? 3 : 0) + (qualifying.length ? 4 : 0) + (n > 1 ? 1 : 0);
        const prior = matches.get(key);
        if (!prior || prior.strength < strength)
          matches.set(key, {
            name: filtered[0][0],
            code: filtered[0][1],
            lat: filtered[0][2],
            lon: filtered[0][3],
            alternatives: filtered.slice(0, 4).map(([name, code]) => name + ', ' + country(code)),
            ambiguous,
            line: line.original || line.text,
            time: line.time,
            strength,
          });
        i += n - 1;
        break;
      }
    }
  }
  return [...matches.values()].sort((a, b) => b.strength - a.strength).slice(0, 4);
}

const atlas = [
  ['Eiffel Tower', 'Eyfel Kulesi', 'Paris', 'FR', 48.85837, 2.29448],
  ['Colosseum', 'Kolezyum', 'Roma', 'IT', 41.89021, 12.49223],
  ['Hagia Sophia', 'Ayasofya', 'İstanbul', 'TR', 41.00858, 28.98018],
  [
    'Sultan Ahmed Mosque|Blue Mosque, Istanbul',
    'Sultanahmet Camii',
    'İstanbul',
    'TR',
    41.0054,
    28.9768,
  ],
  ['Galata Tower', 'Galata Kulesi', 'İstanbul', 'TR', 41.02565, 28.97416],
  ['Anıtkabir', 'Anıtkabir', 'Ankara', 'TR', 39.925, 32.83694],
  [
    'Statue of Liberty|Statue of Liberty National Monument',
    'Özgürlük Heykeli',
    'New York',
    'US',
    40.68925,
    -74.0445,
  ],
  ['Sydney Opera House', 'Sidney Opera Evi', 'Sidney', 'AU', -33.8572, 151.2153],
  ['Taj Mahal', 'Tac Mahal', 'Agra', 'IN', 27.175, 78.0422],
  ['Brandenburg Gate', 'Brandenburg Kapısı', 'Berlin', 'DE', 52.5163, 13.3777],
  ['Tower Bridge', 'Tower Bridge', 'Londra', 'GB', 51.5055, -0.0754],
  ['Big Ben|Elizabeth Tower', 'Big Ben', 'Londra', 'GB', 51.5007, -0.1246],
  ['Sagrada Família|Sagrada Familia', 'Sagrada Família', 'Barselona', 'ES', 41.4036, 2.1744],
  ['Trevi Fountain', 'Trevi Çeşmesi', 'Roma', 'IT', 41.9009, 12.4833],
  ['Parthenon', 'Partenon', 'Atina', 'GR', 37.9715, 23.7267],
  ['Golden Gate Bridge', 'Golden Gate Köprüsü', 'San Francisco', 'US', 37.8199, -122.4783],
  ['Burj Khalifa', 'Burç Halife', 'Dubai', 'AE', 25.1972, 55.2744],
  [
    'Christ the Redeemer (statue)|Christ the Redeemer, Rio de Janeiro',
    'Kurtarıcı İsa Heykeli',
    'Rio de Janeiro',
    'BR',
    -22.9519,
    -43.2105,
  ],
  ['Great Pyramid of Giza', 'Keops Piramidi', 'Gize', 'EG', 29.9792, 31.1342],
  ['Tokyo Tower', 'Tokyo Kulesi', 'Tokyo', 'JP', 35.6586, 139.7454],
];
export function knownLandmark(name) {
  const entry = atlas.find(([aliases]) => aliases.split('|').some((a) => fold(a) === fold(name)));
  return entry
    ? { name: entry[1], city: entry[2], code: entry[3], lat: entry[4], lon: entry[5] }
    : null;
}
export async function landmarkPlace(label, signal) {
  const local = knownLandmark(label);
  if (local) return local;
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    titles: label,
    redirects: '1',
    prop: 'coordinates|pageprops',
    ppprop: 'disambiguation',
    origin: '*',
  });
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const page = (await res.json()).query?.pages?.[0];
  if (!page || page.missing || Object.hasOwn(page.pageprops || {}, 'disambiguation')) return null;
  const coord = page.coordinates?.[0];
  return Number.isFinite(coord?.lat) && Number.isFinite(coord?.lon)
    ? { name: page.title, lat: coord.lat, lon: coord.lon }
    : null;
}
