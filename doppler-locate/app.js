'use strict';
const $=id=>document.getElementById(id);
const DEFAULT_CODESPACE_API='https://effective-garbanzo-xjv9wp7g6w9264vp-7070.app.github.dev';
const REGIONS={istanbul:[28.70,40.78,29.48,41.28],ankara:[32.55,39.70,33.18,40.17],izmir:[26.77,38.18,27.48,38.67],manisa:[27.15,38.35,28.75,39.05],antalya:[30.40,36.71,31.20,37.19]};
const TERMINAL=new Set(['succeeded','abstained','failed','cancelled','interrupted']);
let file=null,mediaUrl=null,apiRoot='',apiReady=false,busy=false,ctx=null,analyser=null,source=null,visualLoop=null,results=null,map=null;
let recordingId=null,foundEvents=[],inspectionComplete=false;
function status(t,bad=false){$('status').textContent=t;$('status').classList.toggle('error',bad)}
function setEngine(text,ready){apiReady=ready;$('engine-status').textContent=text;$('engine-status').className='pill '+(ready?'online':'offline');readyButton()}
function readyButton(){$('locate').disabled=busy||!apiReady||!file||!inspectionComplete||!recordingId||!foundEvents.length||!$('region').value||($('region').value==='custom'&&!$('place-query').value.trim()&&!['west','south','east','north'].every(id=>$(id).value.trim()))||!$('utc-date').value||!$('permission').checked||!$('download-consent').checked||(foundEvents.length===1&&$('clock').value!=='known')||($('clock').value==='known'&&!$('utc-time').value);}
function base(){return $('api-url').value.trim().replace(/\/$/,'')}
function errorText(e){return e?.detail?.message||e?.detail||e?.error?.message||e?.message||String(e)}
async function req(path,opts={}){let r;try{r=await fetch(apiRoot+path,{cache:'no-store',...opts})}catch(e){throw Error('Analiz motoruna erişilemiyor. Sunucu çevrimiçi, HTTPS ve CORS ayarları uygun olmalı.')}
let data;try{data=await r.json()}catch(e){data=await r.text().catch(()=>null)}if(!r.ok)throw Error(String(errorText(data))+' (HTTP '+r.status+')');return data}
async function post(path,obj){return req(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(obj)})}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function job(raw,label){const id=raw?.job_id||raw?.job?.job_id||raw?.id;if(!id){if(raw?.outcome==='exists')return raw;throw Error(label+': iş kimliği alınamadı')}for(;;){const j=await req('/api/jobs/'+encodeURIComponent(id));status(label+' · '+(j.stage||j.status)+'\n'+(j.progress?.message||'Uçuş arşivi ve hesaplama işlemi uzun sürebilir.'));if(TERMINAL.has(j.status)){if(j.status==='succeeded'||j.status==='abstained')return j;throw Error(label+' · '+errorText(j.error))}await sleep(3500)}}
function stage(n){for(const d of document.querySelectorAll('.step')){const i=+d.dataset.i;d.classList.toggle('active',i===n);d.classList.toggle('done',i<n);d.querySelector('i').textContent=i<n?'✓':i===n?'◌':'○'}}
function box(){const a=$('region').value==='custom'?['west','south','east','north'].map(id=>+$ (id).value):REGIONS[$('region').value];if(!a||a.some(x=>!Number.isFinite(x))||a[0]>=a[2]||a[1]>=a[3]||a[0]<-180||a[2]>180||a[1]<-90||a[3]>90)throw Error('Bölge koordinatları geçersiz');return {west:a[0],south:a[1],east:a[2],north:a[3]}}
async function resolveBox(){
 if($('region').value!=='custom')return box();
 const q=$('place-query').value.trim();
 if(!q)return box();
 status('Belirttiğin şehir/bölgenin sınırları bulunuyor…');
 let list;
 try{
   const url='https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=tr&q='+encodeURIComponent(q);
   const response=await fetch(url,{headers:{'Accept':'application/json'}});
   if(!response.ok)throw Error('HTTP '+response.status);
   list=await response.json();
 }catch(e){throw Error('Bölge aranamadı ('+errorText(e)+'). Şehir adını kontrol et veya gelişmiş koordinat gir.');}
 if(!Array.isArray(list)||!list.length)throw Error('“'+q+'” bulunamadı. Şehir, ilçe ve ülkeyi birlikte yazmayı dene.');
 const b=list[0].boundingbox;
 if(!Array.isArray(b)||b.length!==4)throw Error('Bölge koordinatları alınamadı.');
 let [south,north,west,east]=b.map(Number);
 if([south,north,west,east].some(x=>!Number.isFinite(x)))throw Error('Bölge sınırları geçersiz.');
 // Çok küçük yerleşimler için ses eşleştirmesine yeterli arama alanı bırak.
 const lat=(south+north)/2,lon=(west+east)/2;
 if(north-south<0.10){south=lat-0.05;north=lat+0.05;}
 if(east-west<0.10){west=lon-0.05;east=lon+0.05;}
 south=Math.max(-90,south);north=Math.min(90,north);west=Math.max(-180,west);east=Math.min(180,east);
 if(south>=north||west>=east)throw Error('Arama koordinatları geçersiz.');
 return {south,north,west,east};
}
async function connect(){const v=base();if(v&&!/^https:\/\//i.test(v)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(v)){setEngine('Güvensiz sunucu adresi',false);$('connection-detail').textContent='Uzak motor bağlantısı HTTPS olmalıdır.';return}
apiRoot=v;try{const h=await req('/health');setEngine('Motor bağlı · '+(h.version||'API'),true);$('connection-detail').textContent='Bağlantı başarılı. Analiz için dosya yüklenebilir.';if(v)localStorage.setItem('locatevideo-api-url',v)}catch(e){setEngine('Codespaces bağlantısı yok',false);$('connection-detail').textContent=errorText(e);if(location.hostname.endsWith('github.io'))$('connection-detail').textContent='Codespaces motoruna ulaşılamıyor. GitHub Codespaces açık olmalı, 7070 portunu Public yapmalısın. Codespace uyuduysa tekrar başlat.'}}

function useFile(f){
 if(!f||busy)return;
 if(f.size>256*1024*1024){status('Maksimum video boyutu 256 MB. Daha küçük bir dosya seç.',true);return;}
 file=f;recordingId=null;foundEvents=[];inspectionComplete=false;results=null;
 $('file-name').textContent=f.name;
 $('media-info').textContent=(f.size/1024/1024).toFixed(1)+' MB · Video hazır';
 if(mediaUrl)URL.revokeObjectURL(mediaUrl);
 mediaUrl=URL.createObjectURL(f);
 const isVideo=f.type.startsWith('video/')||/\.(mp4|mov|webm)$/i.test(f.name);
 const media=$(isVideo?'video':'audio');
 $('video').hidden=!isVideo;$('audio').hidden=isVideo;media.src=mediaUrl;
 $('media-wrap').hidden=false;$('analysis-panel').hidden=false;
 $('followup').hidden=true;$('results').hidden=true;$('events').hidden=true;
 $('utc-date').value='';$('utc-time').value='';$('region').value='';
 $('clock').value='unknown';$('time-fields').hidden=true;$('place-query').value='';$('date-hint').textContent='Dosyadan tarih bulunamazsa gerçek çekim tarihini yaz.';stage(0);readyButton();
 if(!apiReady){status('Dosya seçildi ama analiz motoru çevrimdışı. Bağlanınca analiz başlatılabilir.',true);return;}
 if(!$('permission').checked){status('Videonun analizine izin verdiğini onayla. Ardından uçak sesi otomatik aranacak.');return;}
 inspect();
}

async function videoContainerDate(f){
 // MP4/MOV: mvhd atom timestamp (not reliable proof of actual capture time).
 if(!/\.(mp4|mov|m4v)$/i.test(f.name))return null;
 const str=(bytes,i,n)=>String.fromCharCode(...bytes.slice(i,i+n));
 let pos=0;
 for(let k=0;k<100&&pos+8<=f.size;k++){
   const head=new Uint8Array(await f.slice(pos,pos+16).arrayBuffer());
   const h=new DataView(head.buffer);
   let len=h.getUint32(0),type=str(head,4,4),offset=8;
   if(len===1){if(head.length<16)return null;len=h.getUint32(8)*4294967296+h.getUint32(12);offset=16;}
   else if(len===0)len=f.size-pos;
   if(!Number.isSafeInteger(len)||len<offset||pos+len>f.size)return null;
   if(type==='moov'){
     const part=new Uint8Array(await f.slice(pos+offset,Math.min(pos+len,pos+offset+512*1024)).arrayBuffer());
     let n=0;
     while(n+32<=part.length){
       const size=new DataView(part.buffer,part.byteOffset+n).getUint32(0);
       if(size<8||n+size>part.length)break;
       if(str(part,n+4,4)==='mvhd'){
         const version=part[n+8],dv=new DataView(part.buffer,part.byteOffset+n+12);
         const seconds=version===1?dv.getUint32(0)*4294967296+dv.getUint32(4):dv.getUint32(0);
         const date=new Date((seconds-2082844800)*1000);
         return Number.isFinite(date.getTime())&&date.getTime()>Date.UTC(1990,0,1)&&date.getTime()<Date.now()+86400000?date:null;
       }
       n+=size;
     }
     return null;
   }
   pos+=len;
 }
 return null;
}
async function inspect(){
 if(busy||!file||!apiReady||!$('permission').checked)return;
 busy=true;$('file').disabled=true;readyButton();
 try{
   stage(1);status('Video inceleniyor, varsa kayıt tarihi okunuyor…');
   const embedded=await videoContainerDate(file).catch(()=>null);
   if(embedded){
     $('utc-date').value=embedded.toISOString().slice(0,10);
     $('utc-time').value=embedded.toISOString().slice(0,19);
     $('date-hint').textContent='Dosyanın MP4/MOV oluşturulma tarihinden önerildi. Yeniden kaydedildiyse yanlış olabilir; gerçek çekim tarihini doğrula.';
   }
   status('Video yükleniyor ve ses ayrıştırılıyor…');
   const form=new FormData();
   form.append('file',file,file.name);
   form.append('owner_permission_confirmed','true');
   // Tarih/konum ilk ses tespitinde gerekli değildir.
   const upl=await req('/api/recordings',{method:'POST',body:form});
   let rid=upl.recording?.id||upl.recording_id;
   if(!rid){const j=await job(upl,'Ses ayrıştırma');rid=j.result?.recording_id||j.recording_id;}
   if(!rid)throw Error('Video kayıt kimliği alınamadı.');
   recordingId=rid;stage(2);
   status('Şimdi uçak sesi ve Doppler frekans değişimi aranıyor…');
   const det=await post('/api/recordings/'+encodeURIComponent(rid)+'/events/detect',{threshold_z:2.5,min_duration_s:40,save:true});
   if(det.job_id||det.id)await job(det,'Uçak sesi tespiti');
   const got=await req('/api/recordings/'+encodeURIComponent(rid)+'/events');
   const evs=(got.events||[]).filter(e=>['plausible_doppler','weak_doppler'].includes(e.assessment?.label))
     .sort((a,b)=>(b.detection_quality||0)-(a.detection_quality||0));
   const unique=[];
   for(const e of evs){
      const mid=(e.audio_start_s+e.audio_end_s)/2;
      if(!unique.some(x=>Math.abs(mid-(x.audio_start_s+x.audio_end_s)/2)<45))unique.push(e);
   }
   foundEvents=unique.slice(0,8);
   $('events').hidden=false;
   $('events').textContent=foundEvents.length+' bağımsız uçak Doppler izi bulundu.';
   if(!foundEvents.length){
     status('Videoda güvenilir bir uçak Doppler izi bulunamadı. Daha uzun ve uçak sesinin belirgin olduğu bir video deneyebilirsin. Konum üretilmedi.',true);
     return;
   }
   inspectionComplete=true;
   $('followup').hidden=false;
   if(foundEvents.length===1){
     $('clock').value='known';$('time-fields').hidden=false;
     status('1 uçak sesi bulundu. Çekim tarihi, UTC saati ve olası şehir/bölge gerekiyor. Video içinden önerilen tarih/saat varsa doğruluğunu kontrol et.');
   }else{
     status(foundEvents.length+' uçak sesi bulundu. Çekim saati olmadan arama denenebilir. Yalnızca çekim tarihi ve olası şehir/bölge gerekiyor.');
   }
   $('followup').scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(e){status('Video analizi: '+errorText(e),true);}
 finally{busy=false;$('file').disabled=false;readyButton();}
}

function liveGraph(){if(!analyser)return;const canvas=$('spectrum'),g=canvas.getContext('2d'),W=canvas.width,H=canvas.height;const d=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(d);g.fillStyle='#0a2029';g.fillRect(0,0,W,H);g.strokeStyle='#244852';g.lineWidth=1;for(let y=25;y<H;y+=40){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke()}const lo=80,hi=1600,nyq=ctx.sampleRate/2;let peak=0,peakHz=0;g.beginPath();for(let i=0;i<W;i++){const hz=lo+(hi-lo)*i/(W-1);const idx=Math.min(d.length-1,Math.max(0,Math.round(hz/nyq*d.length)));const v=d[idx];const y=H-12-v/255*(H-25);if(i===0)g.moveTo(i,y);else g.lineTo(i,y);if(v>peak){peak=v;peakHz=Math.round(hz)}}g.lineWidth=2;g.strokeStyle='#8fe8d7';g.stroke();$('peak').textContent=peak>22?'En güçlü bant ≈ '+peakHz+' Hz':'Ses bekleniyor';visualLoop=requestAnimationFrame(liveGraph)}
async function listen(){const m=$('video').hidden?$('audio'):$('video');if(!ctx){ctx=new(window.AudioContext||window.webkitAudioContext)();analyser=ctx.createAnalyser();analyser.fftSize=8192;analyser.smoothingTimeConstant=.8;source=ctx.createMediaElementSource(m);source.connect(analyser);analyser.connect(ctx.destination)}if(source.mediaElement!==m){source.disconnect();source=ctx.createMediaElementSource(m);source.connect(analyser)}await ctx.resume();await m.play();if(visualLoop)cancelAnimationFrame(visualLoop);liveGraph()}

async function analyze(){
 if(busy||!apiReady||!inspectionComplete||!recordingId||!foundEvents.length)return;
 busy=true;readyButton();$('results').hidden=true;
 try{
   const b=await resolveBox(),known=$('clock').value==='known',day=$('utc-date').value;
   if(!day)throw Error('Gerçek UTC çekim tarihi gerekli.');
   if(!$('region').value)throw Error('Bu motorun uçuş arşivini sorgulaması için şehir/bölge gerekli.');
   if(foundEvents.length===1&&!known)throw Error('Tek uçak sesiyle çalışabilmek için çekim saati (UTC) de gerekiyor.');
   const start=known?($('utc-time').value.length===16?$('utc-time').value+':00Z':$('utc-time').value+'Z'):null;
   const error=+$('time-error').value;
   if(known&&(!Number.isFinite(error)||error<0||error>86400))throw Error('Saat hata payı geçersiz.');
   if(known&&start.slice(0,10)!==day)throw Error('UTC günü ve saati uyuşmuyor.');
   const km2=(b.east-b.west)*(b.north-b.south)*111.195**2*Math.cos((b.north+b.south)*Math.PI/360);
   if(km2>40000&&!confirm('Seçilen arama alanı çok geniş. Devam edilsin mi?'))return;
   stage(3);status('Çekim tarihine ait uçuş kayıtları alınıyor ve Doppler iziyle karşılaştırılıyor…');
   const imp=await post('/api/flight-datasets/import',{provider:'adsblol',date_utc:day,bbox:b,margin_km:15,confirm_download:true,exclude_jets:false});
   if(imp.outcome!=='exists')await job(imp,'Uçuş kayıtlarını indirme');
   stage(4);
   const q={mode:known?'known-time':'unknown-time',recording_id:recordingId,
     event_ids:foundEvents.map(x=>x.id),bbox:b,national_scale_confirmed:km2>40000,max_cpu_hours:4};
   if(known){q.start_utc=start;q.start_uncertainty_s=error}else q.date_utc=day;
   const search=await post('/api/searches',q);
   const sid=search.id||search.job_id;
   if(!sid)throw Error('Arama iş kimliği alınamadı.');
   await job({job_id:sid},'Konum eşleştirmesi');
   results=await req('/api/searches/'+encodeURIComponent(sid)+'/candidates');
   renderResults(results,b);stage(5);
   status('Olası çekim konumları gösteriliyor. Bunlar doğrulanmış GPS konumu değildir.');
 }catch(e){status('Konum araması: '+errorText(e),true);}
 finally{busy=false;readyButton();}
}

function renderResults(data,b){$('results').hidden=false;const grade=String(data.confidence_grade||'low');$('verdict').textContent=(data.abstention?.abstained?'Yeterli kanıt yok. ':'')+'Kanıt düzeyi: '+grade+'. Göreli skorlar gerçek olasılık yüzdesi değildir; kesin konum doğrulanmamıştır.';$('candidates').replaceChildren();const list=(data.candidates||[]).slice(0,5);if(!map&&window.L){map=L.map('map');L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map)}if(map){map.eachLayer(l=>{if(l instanceof L.CircleMarker)map.removeLayer(l)});map.fitBounds([[b.south,b.west],[b.north,b.east]])}const pins=[];for(const c of list){const a=document.createElement('article');a.className='candidate';const title=document.createElement('strong');title.textContent='Aday #'+c.rank+' · '+Number(c.lat).toFixed(5)+', '+Number(c.lon).toFixed(5);const p=document.createElement('p');p.textContent='Göreli uyum skoru: '+Number(c.score_total).toFixed(3);const link=document.createElement('a');link.textContent='Haritada aç ↗';link.href='https://www.openstreetmap.org/?mlat='+c.lat+'&mlon='+c.lon+'#map=15/'+c.lat+'/'+c.lon;link.target='_blank';link.rel='noopener noreferrer';a.append(title,p,link);$('candidates').append(a);if(map){const mk=L.circleMarker([c.lat,c.lon],{radius:8,color:'#8ef6d4'}).addTo(map);mk.bindPopup(title.textContent);pins.push(mk)}}if(!list.length){$('candidates').textContent='Bu kayıt ve tarihte yeterli eşleşme bulunamadı.'}if(map&&pins.length)map.fitBounds(L.featureGroup(pins).getBounds().pad(.5),{maxZoom:14});if(map)setTimeout(()=>map.invalidateSize(),100);$('results').scrollIntoView({behavior:'smooth'})}
function exportGeo(){if(!results?.candidates)return;const fc={type:'FeatureCollection',features:results.candidates.filter(c=>Number.isFinite(c.lat)&&Number.isFinite(c.lon)).map(c=>({type:'Feature',geometry:{type:'Point',coordinates:[c.lon,c.lat]},properties:{rank:c.rank,relative_score:c.score_total}})),metadata:{note:'Koordinatlar doğrulanmış konum değildir.'}};const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(fc,null,2)],{type:'application/geo+json'}));a.href=u;a.download='doppler-konum-adaylari.geojson';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function drawPlaceholder(){const canvas=$('spectrum'),g=canvas.getContext('2d');g.fillStyle='#0a2029';g.fillRect(0,0,canvas.width,canvas.height);g.strokeStyle='#284d55';for(let i=0;i<10;i++){const x=i*80;g.beginPath();g.moveTo(x,0);g.lineTo(x,canvas.height);g.stroke()}g.strokeStyle='#6dcfbc';g.lineWidth=2;g.beginPath();for(let i=0;i<canvas.width;i++){const y=155+Math.sin(i*.07)*13+Math.sin(i*.15)*7; i?g.lineTo(i,y):g.moveTo(i,y)}g.stroke();g.fillStyle='#a0bec2';g.font='13px system-ui';g.fillText('Örnek gösterim · video oynatınca canlı spektrum görünür',18,28)}
window.addEventListener('DOMContentLoaded',async()=>{drawPlaceholder();const hosted=location.hostname.endsWith('github.io');$('pages-warning').hidden=!hosted;
$('file').addEventListener('change',e=>useFile(e.target.files?.[0]));$('permission').addEventListener('change',()=>{if(file&&$('permission').checked&&apiReady&&!inspectionComplete&&!recordingId&&!busy)inspect();readyButton()});const drop=$('drop-zone');for(const evt of ['dragover','drop'])drop.addEventListener(evt,e=>e.preventDefault());drop.addEventListener('dragover',()=>drop.classList.add('drag'));drop.addEventListener('dragleave',()=>drop.classList.remove('drag'));drop.addEventListener('drop',e=>{drop.classList.remove('drag');useFile(e.dataTransfer?.files?.[0])});
$('listen').addEventListener('click',()=>listen().catch(e=>status('Ses oynatma: '+errorText(e),true)));
$('clock').addEventListener('change',()=>{$('time-fields').hidden=$('clock').value!=='known';readyButton()});$('region').addEventListener('change',()=>{$('bounds').hidden=$('region').value!=='custom';readyButton()});$('place-query').addEventListener('input',readyButton);for(const id of ['west','south','east','north'])$(id).addEventListener('input',readyButton);for(const id of ['utc-date','utc-time','download-consent'])$(id).addEventListener('change',readyButton);
$('locate').addEventListener('click',analyze);$('export').addEventListener('click',exportGeo);$('connect').addEventListener('click',connect);
if(hosted){$('api-url').value=localStorage.getItem('locatevideo-api-url')||DEFAULT_CODESPACE_API;}
await connect();if(apiReady&&file&&$('permission').checked&&!inspectionComplete)inspect()});