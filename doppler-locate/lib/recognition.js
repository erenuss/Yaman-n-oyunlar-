const MP = 'https://cdn.jsdelivr.net/npm/@mediapipe';
const VISION = MP + '/tasks-vision@0.10.32';
const AUDIO = MP + '/tasks-audio@0.10.32';
const OCR = 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1';
const MEDIA_MODELS = 'https://storage.googleapis.com/mediapipe-models';
const MODEL_MIRROR = 'https://raw.githubusercontent.com/puzzleleaf/flutter_tflite_landmark_classifier/ed97ba40e61458e1f0309e8bc5c488866e5e68d0/assets/models/';
const regions = [
  ['europe','Avrupa'],['asia','Asya'],['north_america','Kuzey Amerika'],
  ['south_america','Güney Amerika'],['africa','Afrika'],['oceania_antarctica','Okyanusya ve Antarktika']
];
const groupCodes = {
  asia:'TR JP IN CN KR MY TH AE SG KH VN ID SA AM GE AZ IL JO IQ IR PK BD PH', africa:'EG ZA KE TZ MA NG DZ TN ET GH',
  north_america:'US CA MX CU DO JM CR PA GT',south_america:'BR PE CL AR BO CO UY EC PY VE',oceania_antarctica:'AU NZ FJ'
};
const nextFrame = () => new Promise(resolve=>setTimeout(resolve,0));
function aborted(signal) { if (signal.aborted) throw new DOMException('Analiz durdu.', 'AbortError'); }
function bounded(promise, milliseconds, onTimeout) {
  let timer;
  const timeout = new Promise((_,reject) => { timer=setTimeout(()=>{ onTimeout?.(); reject(Error('İndirme veya işlem zaman aşımına uğradı.')); },milliseconds); });
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}
async function fetchBytes(url, signal) {
  const ctrl = new AbortController();
  const stop = () => ctrl.abort(); signal.addEventListener('abort', stop, {once:true});
  const timer=setTimeout(stop,65000);
  try {
    aborted(signal);
    const r = await fetch(url,{signal:ctrl.signal,cache:'force-cache',referrerPolicy:'no-referrer'});
    if (!r.ok) throw Error('Model indirilemedi (HTTP '+r.status+').');
    const bytes = new Uint8Array(await r.arrayBuffer());
    if (String.fromCharCode(...bytes.subarray(4,8)) !== 'TFL3') throw Error('Geçersiz model dosyası.');
    return bytes;
  } finally { clearTimeout(timer); signal.removeEventListener('abort',stop); }
}
let visionEnv;
async function vision() {
  if (!visionEnv) visionEnv=(async()=>{
    const mod=await import(VISION+'/vision_bundle.mjs');
    return { mod, wasm:await mod.FilesetResolver.forVisionTasks(VISION+'/wasm') };
  })().catch(e=>{visionEnv=null;throw e;});
  return visionEnv;
}

export async function readText(frames, signal, progress) {
  const { default: Tesseract } = await bounded(import(OCR+'/dist/tesseract.esm.min.js'),22000);
  aborted(signal);
  let worker, disposed=false;
  const stop=()=>{disposed=true; if(worker) void worker.terminate();};
  signal.addEventListener('abort',stop,{once:true});
  try {
    const create = Tesseract.createWorker('tur+eng',1,{
      workerPath:OCR+'/dist/worker.min.js',
      corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',
      errorHandler:()=>{}
    }).then(w=>{if(disposed){void w.terminate(); throw Error('Yazı okuma durdu.');} worker=w; return w;});
    await bounded(create,50000,stop);
    await worker.setParameters({tessedit_pageseg_mode:'11'});
    const lines=[];
    for (const [n,frame] of frames.entries()) {
      aborted(signal);progress(n+1,frames.length);
      const {data}=await bounded(worker.recognize(frame.canvas,{}, {blocks:true,text:true}),35000,stop);
      for (const block of data.blocks||[]) for(const para of block.paragraphs||[]) for(const l of para.lines||[]) {
        const text=(l.text||'').trim();
        if(text && l.confidence>=50) lines.push({text:text.slice(0,220),confidence:l.confidence,time:frame.time});
      }
    }
    return lines;
  } finally { signal.removeEventListener('abort',stop); if(!disposed) stop(); }
}

let galleryPromise;
async function gallery() {
  if (!galleryPromise) galleryPromise=fetch(new URL('../assets/landmarks.json',import.meta.url))
    .then(res=>{if(!res.ok) throw Error(); return res.json();}).then(rows=>rows.map(row=>({
      ...row, vectors:row.refs.map(([photo,b64])=>{
        const bytes=Int8Array.from(atob(b64),c=>c.charCodeAt(0)); const norm=Math.sqrt(bytes.reduce((s,v)=>s+v*v,0));
        return {photo,values:Float32Array.from(bytes,v=>v/norm)};
      })
    }))).catch(e=>{galleryPromise=null;throw e;});
  return galleryPromise;
}
export async function matchGallery(frames, signal) {
  const [{mod,wasm},rows,bytes]=await Promise.all([vision(),gallery(),fetchBytes(MEDIA_MODELS+'/image_embedder/mobilenet_v3_small/float32/1/mobilenet_v3_small.tflite',signal)]);
  aborted(signal);
  const model=await mod.ImageEmbedder.createFromOptions(wasm,{baseOptions:{modelAssetBuffer:bytes,delegate:'CPU'},l2Normalize:true});
  try {
    const hits=[];
    for(const f of frames) {
      aborted(signal);await nextFrame();
      const {floatEmbedding:v}=model.embed(f.canvas).embeddings[0];
      const ranked=rows.map(row=>{
        let best=-1,photo;
        for(const ref of row.vectors) {
          let dot=0; for(let k=0;k<v.length;k++) dot+=v[k]*ref.values[k];
          if(dot>best){best=dot;photo=ref.photo;}
        }
        return {row,score:best,photo};
      }).sort((a,b)=>b.score-a.score);
      const [first,other]=ranked;
      if(first && first.score>=0.90 && first.score-(other?.score??0)>=0.045) {
        const {name,city,lat,lon}=first.row;
        hits.push({name,city,lat,lon,time:f.time,method:'Görsel referans',photo:first.photo});
      }
    }
    return hits;
  } finally { model.close(); }
}

export function regionOrder(code) {
  const group = Object.entries(groupCodes).find(([,s])=>s.split(' ').includes(code))?.[0];
  return group ? [...regions.filter(r=>r[0]===group),...regions.filter(r=>r[0]!==group)] : regions.slice();
}
export async function wideLandmarks(frames, order, signal, progress, onMatch) {
  const {mod, wasm}=await vision();
  let completed=0,failed=0;
  for (const [id,name] of order) {
    aborted(signal);progress(name,completed,order.length);
    let classifier;
    try {
      const bytes=await fetchBytes(MODEL_MIRROR+'landmarks_classifier_'+id+'.tflite',signal);
      aborted(signal);
      classifier=await mod.ImageClassifier.createFromOptions(wasm,{baseOptions:{modelAssetBuffer:bytes,delegate:'CPU'},displayNamesLocale:'en',maxResults:15});
      const hits=[];
      for(const f of frames) {
        aborted(signal); await nextFrame();
        const choices=classifier.classify(f.canvas).classifications[0].categories;
        const best=choices[0], second=choices.find(c=>c.displayName!==best?.displayName);
        if(best?.displayName && best.score>=0.91 && best.score-(second?.score??0)>=0.035) hits.push({label:best.displayName,time:f.time});
      }
      completed++;
      if(hits.length) { await onMatch(hits); return {completed,failed,matched:true}; }
    } catch(e) { if(signal.aborted) throw e; failed++; }
    finally { classifier?.close(); }
    // A device without the required image runtime should not download all six models.
    if(failed>=2 && !completed) break;
  }
  return {completed,failed,matched:false};
}

export async function aircraftSound(file, duration, signal) {
  if(file.size>55*1024*1024 || duration>600) return {skipped:true};
  const Offline=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  if(!Offline) return {unsupported:true};
  let decoded;
  try { decoded=await new Offline(1,1,16000).decodeAudioData(await file.arrayBuffer()); }
  catch { return {unsupported:true}; }
  aborted(signal);
  if(!decoded.length) return {unsupported:true};
  const mono=new Float32Array(decoded.length);
  for(let ch=0;ch<decoded.numberOfChannels;ch++) {
    const x=decoded.getChannelData(ch); for(let i=0;i<x.length;i++) mono[i]+=x[i]/decoded.numberOfChannels;
  }
  const rate=decoded.sampleRate; decoded=null;
  const win=Math.ceil(rate*1.95), chunks=Math.min(28,Math.max(1,Math.ceil(mono.length/win)));
  let windows=[];
  for(let i=0;i<chunks;i++) {
    const start=chunks===1?0:Math.round(i*Math.max(0,mono.length-win)/(chunks-1));
    const audio=mono.subarray(start,Math.min(mono.length,start+win));
    let power=0;for(let n=0;n<audio.length;n+=8) power+=audio[n]*audio[n];
    if(power/Math.ceil(audio.length/8)>1e-7) windows.push({start,audio});
  }
  if(!windows.length) return {hits:[],silent:true};
  const [mod,bytes]=await Promise.all([import(AUDIO+'/audio_bundle.mjs'),fetchBytes(MEDIA_MODELS+'/audio_classifier/yamnet/float32/1/yamnet.tflite',signal)]);
  aborted(signal);
  const wasm=await mod.FilesetResolver.forAudioTasks(AUDIO+'/wasm');
  const model=await mod.AudioClassifier.createFromOptions(wasm,{baseOptions:{modelAssetBuffer:bytes},maxResults:8});
  const hits=[];
  try {
    for(const {start,audio} of windows) {
      aborted(signal); await nextFrame();
      const padded=audio.length<rate ? new Float32Array(rate) : audio;
      if(padded!==audio) padded.set(audio);
      const results=model.classify(padded,rate);
      for(const result of results) {
        const hit=result.classifications[0]?.categories.find(c=>/aircraft|airplane|jet engine|propeller, airscrew/i.test(c.categoryName+' '+c.displayName) && c.score>=0.30);
        if(hit) {hits.push(start/rate+(result.timestampMs||0)/1000);break;}
      }
    }
    return {hits,sampled:chunks};
  } finally { model.close(); }
}
