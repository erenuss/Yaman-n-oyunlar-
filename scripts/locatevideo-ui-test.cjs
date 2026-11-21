'use strict';
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'locatevideo-test-'));
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
};
const server = createServer((req, res) => {
  let file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
async function sign(page) {
  return Buffer.from(
    await page.evaluate(() => {
      const c = document.createElement('canvas');
      c.width = 1120;
      c.height = 450;
      const x = c.getContext('2d');
      x.fillStyle = 'white';
      x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = 'black';
      x.font = 'bold 76px sans-serif';
      x.fillText('İZMİR', 80, 130);
      x.fillText('BÜYÜKŞEHİR BELEDİYESİ', 78, 282);
      return c.toDataURL('image/png').split(',')[1];
    }),
    'base64',
  );
}
async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({
    executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
    ],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(75000);
    const errors = [],
      posts = [];
    page.on('requestfailed', (r) => {
      if (!['net::ERR_ABORTED', 'net::ERR_FAILED'].includes(r.failure()?.errorText))
        console.warn('Network:', r.url().split('?')[0], r.failure()?.errorText);
    });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
      if (r.method() === 'POST') posts.push(new URL(r.url()).pathname);
    });
    await page.addInitScript(() => {
      // Keep large downloads out of the core journey. Test the broad model separately below.
      Object.defineProperty(navigator, 'connection', {
        value: { saveData: true },
        configurable: true,
      });
    });
    await page.goto(base + '/locatevideo/');
    await page.waitForURL('**/doppler-locate/');
    assert(await page.locator('#report').isHidden());
    const png = await sign(page),
      source = path.join(tmp, 'sign.png');
    fs.writeFileSync(source, png);
    const tagged = path.join(tmp, 'recording.mp4'),
      clean = path.join(tmp, 'copy.mp4');
    execFileSync('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      '-loop',
      '1',
      '-i',
      source,
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=16000:cl=mono',
      '-t',
      '2',
      '-r',
      '4',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-movflags',
      'use_metadata_tags',
      '-metadata',
      'location=+41.0083+028.9800/',
      '-metadata',
      'creation_time=2025-06-05T07:08:09Z',
      tagged,
    ]);
    execFileSync('ffmpeg', [
      '-loglevel',
      'error',
      '-y',
      '-i',
      tagged,
      '-map',
      '0:v:0',
      '-map',
      '0:a?',
      '-map_metadata',
      '-1',
      '-map_metadata:s',
      '-1',
      '-map_chapters',
      '-1',
      '-c',
      'copy',
      clean,
    ]);
    await page.locator('#file').setInputFiles(tagged);
    await page.waitForFunction(() =>
      document.querySelector('#candidates').textContent.includes('41.008300, 28.980000'),
    );
    await page.locator('#file').setInputFiles(clean);
    await page.waitForFunction(() =>
      document.querySelector('#meta-status').textContent.includes('bulunamadı'),
    );
    await page.waitForFunction(
      () =>
        document.querySelector('#candidates').textContent.includes('İzmir') &&
        document.querySelector('#text-status').textContent.includes('adayı'),
      {},
      { timeout: 95000 },
    );
    assert(!/41\.008300/.test(await page.locator('#candidates').textContent()));
    assert(await page.locator('#flight-form').isHidden());
    assert.equal(posts.length, 0);
    console.log(
      'PASS: MP4 with GPS, stripped video located from real OCR, previous coordinates removed, no upload.',
    );
    await page
      .locator('#file')
      .setInputFiles({ name: 'unlabelled.png', mimeType: 'image/png', buffer: png });
    await page.waitForFunction(() =>
      document.querySelector('#candidates').textContent.includes('İzmir'),
    );
    assert(await page.locator('#flight-panel').isHidden());
    assert.equal(posts.length, 0);
    // Real Wikimedia image re-encoded in a canvas removes EXIF, its filename and its original container.
    const imageUrl =
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/960px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg';
    const photo = execFileSync(
      'curl',
      [
        '--fail',
        '--silent',
        '--show-error',
        '--location',
        '--retry',
        '2',
        '--max-time',
        '35',
        imageUrl,
      ],
      { maxBuffer: 8e6 },
    );
    const jpeg = await page.evaluate(async (b64) => {
      const i = new Image();
      i.src = 'data:image/jpeg;base64,' + b64;
      await i.decode();
      const c = document.createElement('canvas');
      c.width = 480;
      c.height = Math.round((480 * i.height) / i.width);
      c.getContext('2d').drawImage(i, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.78).split(',')[1];
    }, photo.toString('base64'));
    await page.locator('#file').setInputFiles({
      name: 'unknown.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from(jpeg, 'base64'),
    });
    await page.waitForFunction(
      () => document.querySelector('#candidates').textContent.includes('Eyfel Kulesi'),
      {},
      { timeout: 95000 },
    );
    assert((await page.locator('#meta-status').textContent()).includes('bulunamadı'));
    assert(await page.locator('#flight-form').isHidden());
    console.log(
      'PASS: metadata-free landmark photo recognized from pixels using the reference model.',
    );
    const wide = await page.evaluate(async () => {
      const { wideLandmarks } = await import('./lib/recognition.js');
      const c = document.createElement('canvas'),
        img = document.querySelector('#player img');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      let hits = [];
      const r = await wideLandmarks(
        [{ canvas: c, time: null }],
        [['europe', 'Avrupa']],
        new AbortController().signal,
        () => {},
        (h) => {
          hits = h;
        },
      );
      return { r, hits };
    });
    assert(
      wide.hits.some((h) => h.label === 'Eiffel Tower'),
      JSON.stringify(wide),
    );
    console.log('PASS: Google Landmarks TFLite classifier identified the image independently.');
    const aircraft = execFileSync(
      'curl',
      [
        '--fail',
        '--silent',
        '--show-error',
        '--location',
        '--retry',
        '2',
        '--max-time',
        '35',
        'https://raw.githubusercontent.com/karolpiczak/ESC-50/master/audio/1-11687-A-47.wav',
      ],
      { maxBuffer: 3e6 },
    );
    await page
      .locator('#file')
      .setInputFiles({ name: 'field-recording.wav', mimeType: 'audio/wav', buffer: aircraft });
    await page.waitForFunction(
      () => !document.querySelector('#sound-status').textContent.includes('inceleniyor'),
      {},
      { timeout: 60000 },
    );
    const audioStatus = await page.locator('#sound-status').textContent();
    if (!audioStatus.includes('benzeyen anlar')) {
      const diagnostic = await page.evaluate(async (b64) => {
        try {
          const { aircraftSound } = await import('./lib/recognition.js');
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          return await aircraftSound(
            new File([bytes], 'fixture.wav', { type: 'audio/wav' }),
            5,
            new AbortController().signal,
          );
        } catch (error) {
          return String(error.stack || error);
        }
      }, aircraft.toString('base64'));
      assert.fail(audioStatus + ' ' + JSON.stringify(diagnostic));
    }
    assert(await page.locator('#flight-form').isHidden());
    assert.equal(posts.length, 0);
    console.log(
      'PASS: local YAMNet detected aircraft sound in a real ESC-50 recording without uploading it.',
    );
    const noSignal = await page.evaluate(() => {
      let c = document.createElement('canvas');
      c.width = 320;
      c.height = 180;
      const x = c.getContext('2d');
      x.fillStyle = '#999';
      x.fillRect(0, 0, 320, 180);
      return c.toDataURL().split(',')[1];
    });
    await page.locator('#file').setInputFiles({
      name: 'istanbul.png',
      mimeType: 'image/png',
      buffer: Buffer.from(noSignal, 'base64'),
    });
    await page.waitForFunction(
      () => document.querySelector('#verdict').textContent === 'Konum belirlenemedi',
    );
    assert.equal(await page.locator('#candidates article').count(), 0);
    // An isolated archive fixture exercises consent, abstention and data selection without importing public flight data in CI.
    let searchBody,
      abstain = true;
    await page.route(base + '/health', (route) =>
      route.fulfill({ json: { status: 'ok', version: 'fixture' } }),
    );
    await page.route(base + '/api/**', (r) => {
      const p = new URL(r.request().url()).pathname;
      let json;
      if (p === '/api/recordings') json = { job_id: 'ingest' };
      else if (p === '/api/jobs/ingest')
        json = { status: 'succeeded', result: { recording_id: 'rec' } };
      else if (p.endsWith('/events/detect')) json = { job_id: 'detect' };
      else if (p === '/api/jobs/detect') json = { status: 'succeeded' };
      else if (p.endsWith('/events'))
        json = {
          events: [
            {
              id: 'pass',
              audio_start_s: 5,
              audio_end_s: 50,
              assessment: { label: 'plausible_doppler' },
            },
          ],
        };
      else if (p === '/api/flight-datasets/import')
        json = { outcome: 'exists', dataset_id: 'archive' };
      else if (p === '/api/searches') {
        searchBody = r.request().postDataJSON();
        json = { id: 'search' };
      } else if (p === '/api/jobs/search') json = { status: abstain ? 'abstained' : 'succeeded' };
      else if (p.endsWith('/candidates'))
        json = {
          status: abstain ? 'abstained' : 'succeeded',
          abstention: { abstained: abstain },
          candidates: [{ lat: 38.42, lon: 27.13 }],
        };
      else return r.abort();
      return r.fulfill({ json });
    });
    await page.locator('#file').setInputFiles(clean);
    await page.locator('#inspect-air').click();
    await page.locator('#flight-form').waitFor();
    assert.equal(await page.locator('#clock-type').inputValue(), 'known');
    assert.equal(await page.locator('#day').inputValue(), '');
    await page.locator('#day').fill('2025-06-05');
    await page.locator('#clock').fill('07:08:09');
    await page.locator('#region').fill('İzmir, Türkiye');
    await page.locator('#archive-consent').check();
    await page.locator('#locate').click();
    await page.waitForFunction(() =>
      document.querySelector('#flight-status').textContent.includes('desteklemedi'),
    );
    assert.deepEqual(searchBody.flight_dataset_ids, ['archive']);
    assert.equal(searchBody.start_utc, '2025-06-05T07:08:09Z');
    assert(!(await page.locator('#candidates').textContent()).includes('Tarihsel uçuş'));
    abstain = false;
    await page.locator('#locate').click();
    await page.waitForFunction(() =>
      document.querySelector('#candidates').textContent.includes('Tarihsel uçuş'),
    );
    assert(!/38\.42/.test(await page.locator('#candidates').textContent()));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(errors, []);
    console.log(
      'PASS: abstention on blank image, mobile layout, one-event follow-up, archive consent, abstention and regional result.',
    );
  } finally {
    await browser.close();
  }
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    server.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
