'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..','doppler-locate');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'app.js'),'utf8');
const dom=new JSDOM(html,{url:'https://erenuss.github.io/Yaman-n-oyunlar-/doppler-locate/',runScripts:'outside-only'});
const w=dom.window;
const doc=w.document;
const ids=[...doc.querySelectorAll('[id]')].map(el=>el.id);
assert.equal(new Set(ids).size,ids.length,'Duplicate element IDs');
for(const match of script.matchAll(/\$\('([^']+)'\)/g))assert.ok(doc.getElementById(match[1]),'Missing HTML element #'+match[1]);
assert.ok(doc.getElementById('followup').hidden,'Extra questions must be initially hidden');
assert.ok(doc.getElementById('analysis-panel').hidden,'Analyzer must be hidden initially');
const fakeCtx={fillRect(){},strokeRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fillText(){},clearRect(){},getImageData(){return {data:new Uint8ClampedArray(4)}}};
w.HTMLCanvasElement.prototype.getContext=()=>fakeCtx;
w.URL.createObjectURL=()=> 'blob:demo';
w.URL.revokeObjectURL=()=>{};
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.confirm=()=>true;
let calls=[];
w.fetch=async(url,options={})=>{
 const u=String(url);
 calls.push({url:u,method:options.method||'GET'});
 let data;
 if(u.endsWith('/health'))data={status:'ok',version:'0.2.10'};
 else if(u.endsWith('/api/recordings'))data={recording_id:'rec_test'};
 else if(u.endsWith('/api/recordings/rec_test/events/detect'))data={outcome:'exists'};
 else if(u.endsWith('/api/recordings/rec_test/events'))data={events:[{id:'evt_test',audio_start_s:2,audio_end_s:52,detection_quality:.9,assessment:{label:'plausible_doppler'}}]};
 else if(u.endsWith('/api/flight-datasets/import'))data={outcome:'exists'};
 else if(u.endsWith('/api/searches'))data={id:'srch_test'};
 else if(u.endsWith('/api/jobs/srch_test'))data={status:'succeeded',stage:'done'};
 else if(u.endsWith('/api/searches/srch_test/candidates'))data={candidates:[],confidence_grade:'low'};
 else throw Error('Unexpected API request '+u);
 return {ok:true,status:200,json:async()=>data, text:async()=>JSON.stringify(data)};
};
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitFor(check,label){
 for(let i=0;i<150;i++){
  if(check())return;
  await delay(20);
 }
 throw Error('Timed out waiting for '+label+'; status='+doc.getElementById('status').textContent);
}
(async()=>{
 await delay(20);
 w.eval(script);
 doc.dispatchEvent(new w.Event('DOMContentLoaded'));
 await waitFor(()=>doc.getElementById('engine-status').textContent.includes('Motor bağlı'),'API connect');
 assert.ok(doc.getElementById('followup').hidden,'Should not show date before file');

 // The user chooses a video first; no uploads until permission is confirmed.
 const file=new w.File([new Uint8Array(1024)],'airplane.wav',{type:'audio/wav'});
 w.useFile(file);
 assert.ok(doc.getElementById('followup').hidden,'Questions should still be hidden before audio detection');
 assert.ok(!calls.some(x=>x.url.endsWith('/api/recordings')),'Must not upload before user permission');
 doc.getElementById('permission').checked=true;
 doc.getElementById('permission').dispatchEvent(new w.Event('change'));
 await waitFor(()=>!doc.getElementById('followup').hidden,'Doppler event analysis and follow-up');
 assert.ok(calls.some(x=>x.url.endsWith('/api/recordings/rec_test/events/detect')),'Must detect Doppler before asking questions');
 assert.equal(doc.getElementById('clock').value,'known','One acoustic event requires an exact-ish timestamp');
 assert.ok(doc.getElementById('locate').disabled,'Submit should be disabled while date/region missing');
 assert.equal(doc.getElementById('region').value,'','Must not guess the city');
 assert.equal(doc.getElementById('utc-date').value,'','Must not guess the date');

 doc.getElementById('utc-date').value='2026-05-12';
 doc.getElementById('utc-time').value='2026-05-12T20:22:20';
 doc.getElementById('region').value='istanbul';
 doc.getElementById('download-consent').checked=true;
 for(const id of ['utc-date','utc-time','region','download-consent'])doc.getElementById(id).dispatchEvent(new w.Event('change'));
 assert.ok(!doc.getElementById('locate').disabled,'Search should be enabled when necessary values are present');
 await w.analyze();
 assert.ok(calls.some(x=>x.url.endsWith('/api/flight-datasets/import')),'Must query historical flights');
 assert.ok(!doc.getElementById('results').hidden,'Must show search results');
 console.log('PASS: Frontend opens upload-only, respects consent, detects audio first, asks missing fields, searches flights.');
 w.close();
})().catch(e=>{console.error(e);process.exitCode=1;w.close()});
