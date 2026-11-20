// Tını — kamerayla havada tel ve theremin
const $=s=>document.querySelector(s);
const cv=$('#cv'),ctx=cv.getContext('2d'),vid=$('#vid');
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();
const DEBUG=location.search.includes('debug');
const FONT='Geist, system-ui, sans-serif',MONO='"Geist Mono", ui-monospace, monospace',ACC='#ff5a36';

/* ---------- ayarlar ---------- */
const NN=['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
const SCALES={
  major:{ad:'Majör',n:[0,2,4,5,7,9,11]},
  minor:{ad:'Minör',n:[0,2,3,5,7,8,10]},
  penta:{ad:'Pentatonik',n:[0,2,4,7,9]},
  mpenta:{ad:'Minör pentatonik',n:[0,3,5,7,10]},
  blues:{ad:'Blues',n:[0,3,5,6,7,10]},
  hicaz:{ad:'Hicaz',n:[0,1,4,5,7,8,10]},
  dorian:{ad:'Dorian',n:[0,2,3,5,7,9,10]},
};
const S={mode:'strings',bend:false,song:'twinkle',songEasy:false,songRec:false,songMic:false,key:0,scale:'major',strTone:'elektro',strQuant:true,quant:true,thTone:'klasik',drone:false,reverb:.35,vol:.85,mic:false,video:true,facing:'user'};
try{const old=JSON.parse(localStorage.getItem('havaOrkestrasi')||'{}');for(const k of['key','scale','strTone','strQuant','quant','reverb','vol','mic','video','facing'])if(k in old)S[k]=old[k]}catch(e){}
try{Object.assign(S,JSON.parse(localStorage.getItem('tini')||'{}'))}catch(e){}
if(!SCALES[S.scale])S.scale='major';if(!['sakin','ruya','epiano','synth70','yayli','theremin','vokal'].includes(S.thTone))S.thTone='sakin';if(!['strings','theremin'].includes(S.mode))S.mode='strings';S.drone=false;
function save(){try{localStorage.setItem('tini',JSON.stringify(S))}catch(e){}}
const mtof=m=>440*Math.pow(2,(m-69)/12);
const nameOf=m=>NN[((Math.round(m)%12)+12)%12];
function scaleNotes(count,base){const n=SCALES[S.scale].n;return Array.from({length:count},(_,i)=>base+n[i%n.length]+12*Math.floor(i/n.length))}
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

/* ---------- ses motoru ---------- */
let ac=null,elecIn,bus,comp,master,revSend,recDest=null,analyser,waveData;
let unlockEl=null;const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function silentWav(){const sr=8000,n=800,b=new ArrayBuffer(44+n*2),v=new DataView(b),w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}))}
// iPhone: sessiz mod düğmesi açıkken de çalsın, askıya alınan sesi uyandır
function unlockAudio(){
  try{if(navigator.audioSession&&!micNode)navigator.audioSession.type='playback'}catch(e){}
  if(IOS)try{if(!unlockEl){unlockEl=document.createElement('audio');unlockEl.src=silentWav();unlockEl.loop=true;unlockEl.setAttribute('playsinline','')}const pr=unlockEl.play();if(pr&&pr.catch)pr.catch(()=>{})}catch(e){}
  if(ac&&ac.state!=='running'){const pr=ac.resume();if(pr&&pr.catch)pr.catch(()=>{})}
  try{if(ac){const b=ac.createBuffer(1,1,ac.sampleRate),src=ac.createBufferSource();src.buffer=b;src.connect(ac.destination);src.start(0)}}catch(e){}
}
function audioOK(){$('#soundBtn').hidden=!ac||ac.state==='running'}
['pointerdown','touchend','keydown','click'].forEach(ev=>document.addEventListener(ev,()=>{if(ac&&ac.state!=='running')unlockAudio();setTimeout(audioOK,300)},{capture:true,passive:true}));
setInterval(()=>{if(ac&&ac.state!=='running'&&!document.hidden){const pr=ac.resume();if(pr&&pr.catch)pr.catch(()=>{})}audioOK()},1000);
function impulse(sec){const len=Math.floor(ac.sampleRate*sec),b=ac.createBuffer(2,len,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}return b}
function initAudio(){
  if(ac){if(ac.state!=='running')unlockAudio();return}
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
  const AC=window.AudioContext||window.webkitAudioContext;
  try{ac=new AC({latencyHint:'interactive'})}catch(e){ac=new AC()}
  ac.onstatechange=audioOK;
  comp=ac.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.2;
  master=ac.createGain();master.gain.value=S.vol;comp.connect(master);
  analyser=ac.createAnalyser();analyser.fftSize=1024;waveData=new Uint8Array(analyser.fftSize);
  master.connect(analyser);master.connect(ac.destination);
  if(ac.createMediaStreamDestination){recDest=ac.createMediaStreamDestination();master.connect(recDest)}
  bus=ac.createGain();bus.connect(comp);
  const conv=ac.createConvolver();conv.buffer=impulse(2.8);revSend=ac.createGain();revSend.gain.value=S.reverb;bus.connect(revSend);revSend.connect(conv);conv.connect(comp);
  const dl=ac.createDelay(1),fb=ac.createGain(),dg=ac.createGain();dl.delayTime.value=.36;fb.gain.value=.26;dg.gain.value=.14;bus.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(dg);dg.connect(comp);
  elecIn=ac.createWaveShaper();const cu=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;cu[i]=Math.tanh(2.6*x)/Math.tanh(2.6)}elecIn.curve=cu;elecIn.oversample='2x';
  const eLP=ac.createBiquadFilter();eLP.type='lowpass';eLP.frequency.value=5200;const eG=ac.createGain();eG.gain.value=.75;elecIn.connect(eLP);eLP.connect(eG);eG.connect(bus);
  unlockAudio();
}
function hello(){if(!ac)return;[0,4,7,12].forEach((x,i)=>ks(48+S.key+x,.5,ac.currentTime+.05+i*.07))}

/* gerçekçi tel sesi: Karplus-Strong */
const ksCache=new Map();
function ksBuffer(midi,tone){const key=tone+midi;if(ksCache.has(key))return ksCache.get(key);const el=tone==='elektro',sr=ac.sampleRate,N=Math.max(2,Math.round(sr/mtof(midi))),len=Math.floor(sr*Math.max(1.4,Math.min(el?5:4,(el?2.4:1.5)+(72-midi)/16)));
  const buf=ac.createBuffer(1,len,sr),d=buf.getChannelData(0),ring=new Float32Array(N);let lp=0;for(let i=0;i<N;i++){lp=lp*(el?.25:.4)+(Math.random()*2-1)*(el?.75:.6);ring[i]=lp}
  const dec=el?.9993:.998;let idx=0;for(let i=0;i<len;i++){const nx=(idx+1)%N,v=ring[idx];d[i]=v;ring[idx]=dec*.5*(v+ring[nx]);idx=nx}
  const fade=Math.min(len,sr*.08|0);for(let i=0;i<fade;i++)d[len-1-i]*=i/fade;ksCache.set(key,buf);return buf}
function ks(midi,vel=.8,when=0){if(!ac)return null;const t=Math.max(when,ac.currentTime),tone=S.strTone,base=Math.round(midi);const s=ac.createBufferSource();s.buffer=ksBuffer(base,tone);s.playbackRate.value=Math.pow(2,(midi-base)/12);
  const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=1400+vel*7000;const body=ac.createBiquadFilter();body.type='peaking';body.frequency.value=220;body.Q.value=1.2;body.gain.value=4;
  const g=ac.createGain();g.gain.value=(tone==='elektro'?.3:.34)*(.35+vel*.65);s.connect(f);f.connect(body);body.connect(g);g.connect(tone==='elektro'?elecIn:bus);s.start(t);s.onended=()=>{try{g.disconnect()}catch(e){}};return{src:s,base}}

/* ses renkleri: her nota için bir ses (zarf + osilatörler + filtre) */
const TONES={
  sakin:{ad:'Sakin pad',d:'Yumuşak ve yatıştırıcı',lv:.6,env:[.45,1,.85,1.4],osc:[['sawtooth',1,-8,.3],['sawtooth',1,8,.3],['triangle',.5,0,.3],['sine',2,0,.06]],lp:[850,.7],lfoCut:[.18,160]},
  ruya:{ad:'Rüya',d:'Cam gibi, uzayıp giden',lv:.48,env:[.12,2.5,.45,1.8],osc:[['sine',1,0,.6],['sine',2,3,.18],['sine',3,-2,.06]],lp:[5000,.5],trem:[4,.14]},
  epiano:{ad:'Elektrik piyano',d:'70\'lerin sıcak piyanosu',lv:1,env:[.004,1.4,0,.4],fm:[1,2.2,.3],osc:[['sine',1,0,.8],['sine',14,0,.03]],lp:[6000,.5],trem:[4.6,.08]},
  synth70:{ad:'70\'ler synth',d:'Analog, parlak bir ses',lv:.56,env:[.01,.35,.75,.25],osc:[['sawtooth',1,-6,.4],['sawtooth',1,6,.4],['square',.5,0,.22]],lp:[1400,8],fenv:[3200,.25]},
  yayli:{ad:'Yaylılar',d:'Keman topluluğu',lv:.62,env:[.28,.6,.9,.7],osc:[['sawtooth',1,-12,.25],['sawtooth',1,0,.25],['sawtooth',1,12,.25]],lp:[2600,.5],peak:[1200,4],vib:[5.6,14,.3]},
  theremin:{ad:'Theremin',d:'Klasik, şarkı söyler gibi',lv:.32,env:[.06,.2,1,.3],osc:[['sine',1,0,.85],['triangle',1,0,.2],['sine',2,0,.06]],lp:[3000,1],vib:[5.5,16,.15]},
  vokal:{ad:'Vokal',d:'İnsan sesi gibi',lv:2,env:[.08,.3,1,.35],osc:[['sawtooth',1,0,.5],['sawtooth',1.003,0,.35]],formant:[[730,9,1.1],[1090,11,.7],[2440,13,.35]],vib:[5,10,.2]},
};
function toneVoice(name,m){
  const T=TONES[name]||TONES.sakin,n=ac.currentTime,f=mtof(m),[a,d,su,r]=T.env;
  const amp=ac.createGain(),lv=ac.createGain();amp.gain.value=0;lv.gain.value=T.lv;amp.connect(lv);lv.connect(bus);
  let head=amp,lp=null;const nodes=[],oscs=[];
  if(T.formant){const sum=ac.createGain();for(const[fq,q,g]of T.formant){const bp=ac.createBiquadFilter();bp.type='bandpass';bp.frequency.value=fq;bp.Q.value=q;const gg=ac.createGain();gg.gain.value=g;sum.connect(bp);bp.connect(gg);gg.connect(amp)}head=sum}
  if(T.peak){const pk=ac.createBiquadFilter();pk.type='peaking';pk.frequency.value=T.peak[0];pk.gain.value=T.peak[1];pk.Q.value=1;pk.connect(head);head=pk}
  if(T.lp){lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=T.lp[0];lp.Q.value=T.lp[1];lp.connect(head);head=lp}
  if(T.fenv&&lp){lp.frequency.setValueAtTime(300,n);lp.frequency.linearRampToValueAtTime(T.fenv[0],n+.02);lp.frequency.setTargetAtTime(T.lp[0],n+.02,T.fenv[1])}
  if(T.lfoCut&&lp){const l=ac.createOscillator(),g=ac.createGain();l.frequency.value=T.lfoCut[0];g.gain.value=T.lfoCut[1];l.connect(g);g.connect(lp.frequency);l.start(n);nodes.push(l)}
  let vibG=null;if(T.vib){const l=ac.createOscillator();vibG=ac.createGain();l.frequency.value=T.vib[0];vibG.gain.setValueAtTime(0,n);vibG.gain.linearRampToValueAtTime(T.vib[1],n+T.vib[2]+.4);l.connect(vibG);l.start(n);nodes.push(l)}
  if(T.trem){const l=ac.createOscillator(),g=ac.createGain();l.frequency.value=T.trem[0];g.gain.value=T.trem[1]*T.lv;l.connect(g);g.connect(lv.gain);l.start(n);nodes.push(l)}
  for(const[type,ratio,det,g]of T.osc){const o=ac.createOscillator(),og=ac.createGain();o.type=type;o.frequency.value=f*ratio;o.detune.value=det;og.gain.value=g;o.connect(og);og.connect(head);if(vibG)vibG.connect(o.detune);o.r=ratio;o.start(n);oscs.push(o)}
  if(T.fm){const car=oscs[0],mod=ac.createOscillator(),mg=ac.createGain();mod.frequency.value=f*T.fm[0];mg.gain.setValueAtTime(f*T.fm[1],n);mg.gain.setTargetAtTime(f*T.fm[2],n,.35);mod.connect(mg);mg.connect(car.frequency);mod.r=T.fm[0];mod.start(n);oscs.push(mod);car._mg=mg}
  amp.gain.setValueAtTime(0,n);amp.gain.linearRampToValueAtTime(1,n+a);amp.gain.setTargetAtTime(su,n+a,Math.max(.01,d/3));
  return{
    pitch(mm,glide=.03){const ff=mtof(mm),t=ac.currentTime;for(const o of oscs)o.frequency.setTargetAtTime(ff*o.r,t,glide)},
    stop(){const t=ac.currentTime,g=amp.gain;if(g.cancelAndHoldAtTime)g.cancelAndHoldAtTime(t);else{g.cancelScheduledValues(t);g.setValueAtTime(g.value,t)}g.setTargetAtTime(0,t,r/4);
      const end=t+r*2+.1;for(const o of[...oscs,...nodes])try{o.stop(end)}catch(e){}setTimeout(()=>{try{lv.disconnect()}catch(e){}},(r*2+.4)*1000)}};
}
function tonePreview(name){if(!ac)return;const vs=[0,4,7].map((x,i)=>({m:60+S.key+x,t:i*.16}));vs.forEach(({m,t})=>setTimeout(()=>{const v=toneVoice(name,m);setTimeout(()=>v.stop(),420)},t*1000))}
/* dem: kök ses ve beşlisi, arkada yumuşakça */
let droneNodes=null;
function droneSet(on){if(!ac)return;if(droneNodes){const n=ac.currentTime;droneNodes.g.gain.setTargetAtTime(0,n,.4);const d=droneNodes;setTimeout(()=>{d.o.forEach(o=>o.stop())},2500);droneNodes=null}
  if(!on)return;const g=ac.createGain();g.gain.value=0;const lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=900;lp.connect(g);g.connect(bus);
  const o=[[36,.5,'sawtooth'],[43,.3,'sawtooth'],[48,.25,'triangle']].map(([m,a,t],i)=>{const x=ac.createOscillator(),xg=ac.createGain();x.type=t;x.frequency.value=mtof(m+S.key);x.detune.value=(i-1)*4;xg.gain.value=a;x.connect(xg);xg.connect(lp);x.start();return x});
  const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=.12;lg.gain.value=250;l.connect(lg);lg.connect(lp.frequency);l.start();o.push(l);
  g.gain.setTargetAtTime(.26,ac.currentTime,.8);droneNodes={g,o}}

/* ---------- parçacıklar ---------- */
const parts=[];
function burst(x,y,n=10,pw=.6){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(1+Math.random()*3)*pw;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-.6,life:1,hue:8+Math.random()*22,size:1.2+Math.random()*2.2})}}
function drawParticles(){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=.022;if(p.life<=0){parts.splice(i,1);continue}
  p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.vx*=.98;ctx.fillStyle=`hsla(${p.hue},100%,65%,${p.life})`;ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,7);ctx.fill()}
  if(parts.length>500)parts.splice(0,parts.length-500);ctx.restore()}
function buzz(p){try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}}
const topY=()=>70,botY=()=>H-112;

/* ---------- teller: çimdikle, çek, bırak = tel · üzerinden geç = çal · üstünde tut = perde ---------- */
let strings=[],sidN=1;const strPinch=new Map(),sideSt=new Map(),tipPrev={};const MAXS=18,LMIN=50;let recentPl=[];
const lmax=()=>Math.max(320,Math.hypot(W,H)*.75);
function pitchRaw(L){const Lx=lmax(),x=Math.log(Lx/Math.max(LMIN*.4,Math.min(Lx,L)))/Math.log(Lx/LMIN);return 40+S.key+x*36}
function snap(m){const all=scaleNotes(52,24+S.key);return all.reduce((a,n)=>Math.abs(n-m)<Math.abs(a-m)?n:a,all[0])}
function strNote(L){const m=pitchRaw(L);return S.strQuant?snap(m):m}
function lenFor(m){const Lx=lmax();return Lx*Math.pow(Lx/LMIN,-(m-40-S.key)/36)}
function mkString(a,b){return{id:sidN++,a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},midi:strNote(dist(a,b)),amp:0,v:.5,last:0,fret:null,fc:null,ring:null,hold:{a:null,b:null}}}
function retune(){strings.forEach(s=>s.midi=strNote(dist(s.a,s.b)))}
function saveStrings(){try{localStorage.setItem('havaTeller',JSON.stringify(strings.filter(s=>dist(s.a,s.b)>=LMIN).map(s=>[s.a.x/W,s.a.y/H,s.b.x/W,s.b.y/H])))}catch(e){}}
function loadStrings(){try{strings=JSON.parse(localStorage.getItem('havaTeller')||'[]').map(a=>mkString({x:a[0]*W,y:a[1]*H},{x:a[2]*W,y:a[3]*H}))}catch(e){strings=[]}}
function proj(s,p){const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,L2=dx*dx+dy*dy||1,L=Math.sqrt(L2);return{u:((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/L2,d:((p.x-s.a.x)*dy-(p.y-s.a.y)*dx)/L}}
function segLen(s,v){const L=dist(s.a,s.b);if(!s.fret)return L;const u=s.fret.u;return v>u?(1-u)*L:u*L}
function pitchAt(s,v){return strNote(segLen(s,v))}
const plog=[];
function pluckString(s,v,vel,t){buzz(8);if(DEBUG)plog.push([s.id,Math.round(performance.now())]);const m=pitchAt(s,v);const r=ks(m,vel,t);if(r)s.ring={src:r.src,base:r.base,v,m,m0:m,until:performance.now()+3000};s.v=Math.max(.12,Math.min(.88,v));s.amp=6+10*vel;energy=Math.min(1,energy+.08);
  if(s.fret)tutEvent('fret');tutEvent('pluck')}
function bendRings(){if(!ac)return;const now=performance.now();for(const s of strings){const r=s.ring;if(!r)continue;if(now>r.until){s.ring=null;continue}
  const m=pitchAt(s,r.v);if(Math.abs(m-r.m)>.01){r.m=m;try{r.src.playbackRate.setTargetAtTime(Math.pow(2,(m-r.base)/12),ac.currentTime,.012)}catch(e){}s.amp=Math.max(s.amp,4);if(Math.abs(m-r.m0)>=1)tutEvent('bend')}}}
function harpPreset(){const t=topY()+20+(tut<TUT.length?(W<640?75:45):0),b=botY()-20,avail=b-t;const lo=snap(pitchRaw(avail*.98));const all=scaleNotes(52,24+S.key);const i=all.findIndex(n=>n>=lo);const n=W<640?7:10;const notes=all.slice(i,i+n);
  strings=[];const x0=W*.14,x1=W*.86;notes.forEach((m,k)=>{const L=Math.min(avail,lenFor(m)),x=x0+(x1-x0)*k/(n-1),cy=(t+b)/2;strings.push(mkString({x,y:cy-L/2},{x,y:cy+L/2}))});retune();saveStrings();
  strings.forEach((s,k)=>setTimeout(()=>{if(ac){s.amp=8;ks(s.midi,.5)}},k*55))}
function segHit(p1,p2,p3,p4){const d=(p2.x-p1.x)*(p4.y-p3.y)-(p2.y-p1.y)*(p4.x-p3.x);if(Math.abs(d)<1e-9)return null;const u=((p3.x-p1.x)*(p4.y-p3.y)-(p3.y-p1.y)*(p4.x-p3.x))/d,v=((p3.x-p1.x)*(p2.y-p1.y)-(p3.y-p1.y)*(p2.x-p1.x))/d;return u>=0&&u<=1&&v>=0&&v<=1?{u,v}:null}
function strumCount(ids){const now=performance.now();for(const id of ids)recentPl.push({t:now,id});recentPl=recentPl.filter(r=>now-r.t<450);if(new Set(recentPl.map(r=>r.id)).size>=3)tutEvent('strum3')}
// dokunmatik tarama (parmak izi doğru parçası)
function strum(p0,p1,vel,key){if(!ac||!strings.length)return;const hits=[];for(const s of strings){if(dist(s.a,s.b)<LMIN||(s.fret&&s.fret.k===key))continue;const h=segHit(p0,p1,s.a,s.b);if(h)hits.push([h,s])}hits.sort((a,b)=>a[0].u-b[0].u);const now=performance.now();let k=0;const ids=[];
  for(const[h,s]of hits){if(now-s.last<90)continue;s.last=now;pluckString(s,h.v,Math.max(.3,Math.min(1,vel)),ac.currentTime+k*.014);k++;ids.push(s.id);burst(p0.x+(p1.x-p0.x)*h.u,p0.y+(p1.y-p0.y)*h.u,7)}
  if(k)strumCount(ids)}
function grabAt(p,r){let best=null,bd=r;for(const s of strings)for(const e of['a','b']){if(s.hold[e])continue;const d=dist(s[e],p);if(d<bd){bd=d;best={s,e}}}return best}
function nearString(p,r){let best=null,bd=r;for(const s of strings){if(dist(s.a,s.b)<LMIN)continue;const q=proj(s,p);if(q.u>.04&&q.u<.96&&Math.abs(q.d)<bd){bd=Math.abs(q.d);best={s,u:q.u}}}return best}
function holdStart(src,p,r){const g=r?grabAt(p,r):null;
  if(g){g.s.hold[g.e]=src;strPinch.set(src,{s:g.s,e:g.e,isNew:false})}
  else{const s=mkString(p,p);s.hold.b=src;strings.push(s);if(strings.length>MAXS){const i=strings.findIndex(x=>!x.hold.a&&!x.hold.b);if(i>=0)strings.splice(i,1)}strPinch.set(src,{s,e:'b',isNew:true})}}
function holdMove(src,p){const st=strPinch.get(src);if(!st)return;const s=st.s;s[st.e]={x:p.x,y:p.y};const L=dist(s.a,s.b);if(L<LMIN)return;const m=strNote(L);
  if(S.strQuant&&m!==s.midi&&!s.ring&&ac){ks(m,.22);s.amp=Math.max(s.amp,3)}s.midi=m}
function holdEnd(src){const st=strPinch.get(src);if(!st)return;strPinch.delete(src);const s=st.s;s.hold[st.e]=null;if(s.hold.a||s.hold.b)return;
  if(dist(s.a,s.b)<LMIN*.7){strings=strings.filter(x=>x!==s);if(!st.isNew){burst(s.a.x,s.a.y,14);status('Tel silindi');setTimeout(()=>status(''),1200)}}
  else{if(st.isNew){pluckString(s,.5,.7);burst((s.a.x+s.b.x)/2,(s.a.y+s.b.y)/2,18);tutEvent('make')}saveStrings()}}
function updateFrets(tips){
  for(const s of strings){if(s.fret&&s.fret.k[0]==='p')continue;if(dist(s.a,s.b)<LMIN){s.fret=null;continue}
    let best=null,bd=1e9;for(const t of tips){if(t.sp>.07)continue;const q=proj(s,t.p),r=Math.max(12,t.size*.16);if(q.u>.04&&q.u<.96&&Math.abs(q.d)<r&&Math.abs(q.d)<bd){bd=Math.abs(q.d);best={k:t.k,u:q.u}}}
    if(!best){s.fc=null;s.fret=null;continue}
    if(s.fc&&s.fc.k===best.k)s.fc.n++;else s.fc={k:best.k,n:1};
    if(s.fc.n>=3)s.fret=s.fret&&s.fret.k===best.k?{k:best.k,u:s.fret.u+(best.u-s.fret.u)*.6}:best}}
function stringHands(){
  for(const role of['L','R']){const h=hands.find(h=>h.role===role),act=strPinch.has(role);
    let on=false;if(h){const mn=Math.min(...h.pr);on=act?h.pr[0]<.5:(h.pr[0]<.3&&h.pr[0]===mn&&h.ext[0]>EXT)}
    const p=h?{x:(h.pts[4].x+h.pts[8].x)/2,y:(h.pts[4].y+h.pts[8].y)/2}:null;
    if(on&&!act)holdStart(role,p,Math.max(30,h.size*.45));else if(on)holdMove(role,p);else if(act)holdEnd(role)}
  const tips=[],now=performance.now();
  for(const h of hands){if(strPinch.has(h.role))continue;for(const t of[8,12,7]){const k='s'+h.id+'_'+t,pp=tipPrev[k],p=h.pts[t];tipPrev[k]=p;tips.push({k,p,pp,size:h.size,sp:pp?dist(pp,p)/h.size:0,fretOk:t!==7,pick:t!==12})}}
  updateFrets(tips.filter(t=>t.fretOk));
  // işaret parmağının ucu telin bir yanından öbür yanına geçince tel çalar (hız fark etmez)
  const hits=[];
  for(const t of tips){if(!t.pick)continue;for(const s of strings){if(dist(s.a,s.b)<LMIN)continue;const q=proj(s,t.p),key=t.k+'|'+s.id,st=sideSt.get(key);
    if(q.u<-.05||q.u>1.05){sideSt.delete(key);continue}
    const dead=Math.max(4,t.size*.05);if(Math.abs(q.d)<=dead){if(st)st.t=now;continue}
    const ns=Math.sign(q.d);if(!st||!t.pp||now-st.t>2500){sideSt.set(key,{side:ns,t:now});continue}
    st.t=now;if(ns!==st.side){st.side=ns;if(s.fret&&(s.fret.k===t.k||s.fret.k===t.k.replace(/_7$/,'_8'))){s.fret=null;s.fc=null}
      hits.push({s,v:Math.max(.02,Math.min(.98,q.u)),vel:.4+t.sp*1.6,p:t.p,o:t.pp?((s.a.x+s.b.x)/2-t.pp.x)*(t.p.x-t.pp.x)+((s.a.y+s.b.y)/2-t.pp.y)*(t.p.y-t.pp.y):0})}}}
  if(hits.length){hits.sort((a,b)=>a.o-b.o);let k=0;const ids=[];for(const h of hits){if(now-h.s.last<70)continue;h.s.last=now;pluckString(h.s,h.v,Math.min(1,h.vel),ac?ac.currentTime+k*.014:0);burst(h.p.x,h.p.y,7);ids.push(h.s.id);k++}if(k)strumCount(ids)}
  if(Math.random()<.02)for(const[k,v]of sideSt)if(now-v.t>2000)sideSt.delete(k);
  for(const k of Object.keys(tipPrev))if(k[0]==='s'&&!tips.find(t=>t.k===k)){delete tipPrev[k];for(const sk of[...sideSt.keys()])if(sk.startsWith(k+'|'))sideSt.delete(sk)}
}
const SG=['#ff5a36','#ff9a80','#ffe6de'];
function drawStrings(){
  const tt=performance.now()/1000;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(const s of strings){const L=dist(s.a,s.b);if(L<2)continue;const dx=(s.b.x-s.a.x)/L,dy=(s.b.y-s.a.y)/L,nx=-dy,ny=dx,on=L>=LMIN,held=s.hold.a||s.hold.b;
    if(on){ctx.strokeStyle='rgba(255,255,255,.4)';ctx.lineWidth=1;ctx.beginPath();const up=scaleNotes(52,24+S.key).filter(n=>n>s.midi+.01).slice(0,12);
      for(const n of up){const Lk=lenFor(n);if(Lk>=L*.97||Lk<LMIN*.45)continue;const u=1-Lk/L,x=s.a.x+dx*L*u,y=s.a.y+dy*L*u;ctx.moveTo(x,y);ctx.lineTo(x+nx*6,y+ny*6)}ctx.stroke()}
    const vib=s.amp,N=30,pts=[];
    for(let i=0;i<=N;i++){const f=i/N;let lo=0,hi=1;if(s.fret){if(s.v>s.fret.u)lo=s.fret.u;else hi=s.fret.u}let o=0;
      if(vib>.2&&f>=lo&&f<=hi){const g=(f-lo)/(hi-lo||1);o=vib*(Math.sin(Math.PI*g)*Math.cos(tt*52+s.id)+.35*Math.sin(2*Math.PI*g)*Math.cos(tt*81+s.id)+.18*Math.sin(5*Math.PI*g+tt*30))}
      pts.push([s.a.x+dx*L*f+nx*o,s.a.y+dy*L*f+ny*o])}
    const path=()=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1])};
    if(vib>.4){ctx.globalCompositeOperation='lighter';const gr=ctx.createLinearGradient(s.a.x,s.a.y,s.b.x,s.b.y);SG.forEach((c,i)=>gr.addColorStop(i/2,c));
      path();ctx.strokeStyle=`rgba(255,90,54,${Math.min(.3,vib/40)})`;ctx.lineWidth=12;ctx.stroke();path();ctx.strokeStyle=gr;ctx.globalAlpha=Math.min(1,.35+vib/14);ctx.lineWidth=4;ctx.stroke();ctx.globalAlpha=1;
      path();ctx.strokeStyle='#fff';ctx.lineWidth=1.6;ctx.stroke();ctx.globalCompositeOperation='source-over';
      if(Math.random()<vib/22){const f=Math.random();parts.push({x:s.a.x+dx*L*f,y:s.a.y+dy*L*f,vx:(Math.random()-.5)*1.6,vy:-Math.random()*1.8,life:1,hue:10+Math.random()*18,size:1.2+Math.random()*1.8})}}
    else{path();ctx.strokeStyle=on?'rgba(255,90,54,.16)':'rgba(255,255,255,.12)';ctx.lineWidth=7;ctx.stroke();ctx.setLineDash(on?[]:[5,6]);path();ctx.strokeStyle=on?'rgba(255,255,255,.92)':'rgba(255,255,255,.55)';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([])}
    for(const e of['a','b']){const p=s[e];ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,s.hold[e]?6:4,0,7);ctx.fill();if(s.hold[e]){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,11+Math.sin(tt*8)*2,0,7);ctx.stroke()}}
    if(s.fret){const x=s.a.x+dx*L*s.fret.u,y=s.a.y+dy*L*s.fret.u;ctx.strokeStyle=ACC;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,8,0,7);ctx.stroke();ctx.fillStyle='#ff5a3688';ctx.fill()}
    if(on&&(held||vib>2)){const m=s.ring&&vib>1?s.ring.m:s.midi,hp=s.hold.b?s.b:s.hold.a?s.a:{x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2};ctx.fillStyle='#fff';ctx.font=`600 ${held?22:14}px ${FONT}`;ctx.textAlign='center';ctx.fillText(nameOf(m),hp.x+nx*26,hp.y+ny*26-(held?8:0))}
    s.amp*=.955;if(s.amp<.05)s.amp=0}
  ctx.restore();
  if(!strings.length&&!strPinch.size&&tut>=TUT.length)hint(['Başparmağınla işaret parmağını birleştir ve çek','Bıraktığında tel oluşur']);
}
function hint(lines){ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';lines.forEach((l,i)=>{ctx.fillStyle=i?'#8f8f8f':'#dcdcdc';ctx.font=`${i?400:500} ${i?14:16}px ${FONT}`;ctx.fillText(l,W/2,H/2-(lines.length-1)*12+i*26)});ctx.restore()}

/* ---------- theremin: parmaklarla çal ----------
   Başparmağını bir parmağın ucuna değdir = naturel nota, orta boğumuna değdir = diyez (yarım ses yukarısı).
   Sol el serçeden işarete Do Re Mi Fa, sağ el işaretten serçeye Sol La Si Do. Değdikçe sürer, ayırınca biter.
   Dokunma, elin 3 boyutlu noktalarıyla ölçülür: başparmak ucunun parmağın uç-boğum çizgisine uzaklığı.
   Dokunmatik ve klavye: alttaki tuşlar (A S D F J K L Ş, diyezler W E R U I). */
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const FING=[8,12,16,20],FN=['işaret','orta','yüzük','serçe'],KEYMAP={L:[3,2,1,0],R:[4,5,6,7]},KB='asdfjklş',KBB={w:0,e:1,r:3,u:4,i:5};
const held=new Map(),fingSt={},keyGlow=new Map();
function keyNotes(){return SONG.on?SONG.keys:scaleNotes(8,60+S.key)}
function keyFinger(i){return i<4?['L',KEYMAP.L.indexOf(i)]:['R',KEYMAP.R.indexOf(i)]}
function whiteRect(i){const sm=W<640,gap=sm?4:8,mid=sm?14:32,kh=sm?50:58,w=Math.min(96,(W-24-mid-gap*6)/8),tw=w*8+gap*6+mid,x0=(W-tw)/2;return{x:x0+i*(w+gap)+(i>=4?mid:0),y:botY()-kh-4,w,h:kh}}
// diyez tuşları: iki naturel arasında yarım ses boşluk varsa, üst sırada
function keyItems(){const ks=keyNotes(),out=[];for(let i=0;i<8;i++)out.push({m:ks[i],r:whiteRect(i),i,black:false});
  for(let i=0;i<8;i++){const m=ks[i]+1;if(ks.includes(m))continue;const a=whiteRect(i),b=i<7?whiteRect(i+1):null,bw=a.w*.62,bh=W<640?30:34,cx=b?(a.x+a.w+b.x)/2:a.x+a.w+bw*.4;out.push({m,r:{x:cx-bw/2,y:a.y-bh-6,w:bw,h:bh},i,black:true})}
  return out}
function keyAt(x,y){for(const k of keyItems().sort((a,b)=>b.black-a.black)){const r=k.r;if(x>=r.x-2&&x<=r.x+r.w+2&&y>=r.y-6&&y<=r.y+r.h+4)return k.m}return null}
function keyRectOf(m){const k=keyItems().find(k=>k.m===m);return k?k.r:null}
function noteOn(src,m,ref){if(!ac||m==null)return;noteOff(src);const p=songPress(m),v=toneVoice(S.thTone,p.m);held.set(src,{m:p.m,v,ref,bend:0});keyGlow.set(p.m,1);energy=Math.min(1,energy+.05);const r=keyRectOf(p.m);if(r)burst(r.x+r.w/2,r.y,8,.7)}
function noteOff(src){const n=held.get(src);if(!n)return;n.v.stop();held.delete(src)}
function thStopAll(){for(const s of[...held.keys()])noteOff(s)}
function thereminOff(){thStopAll();for(const k of Object.keys(fingSt))delete fingSt[k]}
// başparmak ucunun, parmağın uç→orta boğum çizgisine uzaklığı ve çizgideki yeri (0 uç, 1 boğum)
function segParam(p,a,b){const ax=b.x-a.x,ay=b.y-a.y,az=(b.z||0)-(a.z||0),px=p.x-a.x,py=p.y-a.y,pz=(p.z||0)-(a.z||0),L2=ax*ax+ay*ay+az*az||1e-9,t=clamp((px*ax+py*ay+pz*az)/L2,0,1),dx=px-ax*t,dy=py-ay*t,dz=pz-az*t;return{d:Math.sqrt(dx*dx+dy*dy+dz*dz),t}}
const d3=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
function contacts(h){const P=h.w||h.pts,scale=d3(P[0],P[9])||1,ON=h.w?.24:.3;
  return FING.map((t,f)=>{const s=segParam(P[4],P[t],P[t-2]),curl=d3(P[0],P[t])/(d3(P[0],P[t-2])||1);return{d:s.d/scale,t:s.t,ok:curl>.85,on:ON,off:ON*1.5}})}
function thereminFrame(){
  if(S.mode!=='theremin')return;const now=performance.now(),live=new Set(),ks=keyNotes();
  for(const h of hands){const id=String(h.id),st=fingSt[id]||(fingSt[id]={f:[null,null,null,null],n:[0,0,0,0],sm:null});live.add(id);
    const palm=[0,5,9,13,17].reduce((a,i)=>({x:a.x+h.pts[i].x/5,y:a.y+h.pts[i].y/5}),{x:0,y:0});
    st.sm=st.sm==null?palm.y:st.sm+(palm.y-st.sm)*.25;const wig=S.bend?clamp(-(palm.y-st.sm)/h.size*3,-.25,.25):0;
    const C=contacts(h);h.contacts=C;let best=-1,mn=9;C.forEach((c,f)=>{if(c.ok&&c.d<mn){mn=c.d;best=f}});
    for(let f=0;f<4;f++){const c=C[f],src='h'+id+'_'+f,cur=st.f[f];
      // iki kare üst üste görülünce aç/kapa (titremeye karşı)
      const want=cur?c.d<c.off:(f===best&&c.ok&&c.d<c.on);
      if(want!==!!cur){st.n[f]++;if(st.n[f]>=2){st.n[f]=0;if(want){const zone=c.t<.5?'tip':'joint',base=ks[KEYMAP[h.role][f]];st.f[f]=zone;noteOn(src,zone==='tip'?base:base+1,{y0:palm.y,size:h.size})}else{st.f[f]=null;noteOff(src)}}}else st.n[f]=0;
      const n=held.get(src);if(n&&n.ref){if(S.bend){const dy=(n.ref.y0-palm.y)/h.size;n.bend=Math.sign(dy)*clamp((Math.abs(dy)-.6)/1.4,0,1)*2}else n.bend=0;n.v.pitch(n.m+n.bend+wig,.03)}}}
  for(const id of Object.keys(fingSt))if(!live.has(id)){for(let f=0;f<4;f++)noteOff('h'+id+'_'+f);delete fingSt[id]}
  for(const[k,v]of keyGlow){if(v<.02)keyGlow.delete(k);else keyGlow.set(k,v*.93)}
  songTick(now);
}

/* ---------- Ezgi: şarkıyı parmaklarınla çal ----------
   Notalar yukarıdan tuşlara iner; çalman gereken parmak elinde parlar. Şarkı seni bekler, hızına uyar,
   doğru notada eşlik çalar, söylenecek heceler ilerler. Kolay modda hangi parmağı değdirsen sıradaki
   nota çalar. Hepsi kamu malı ezgiler; her biri 8 tuşa sığar. */
const SONGS=[
  {id:'twinkle',ad:'Küçük Yıldız',by:'Geleneksel',lv:1,bpm:88,
   n:'60::C 60 67 67 69::F 69 67:2:C / 65::F 65 64::C 64 62::G 62 60:2:C / 67::C 67 65::F 65 64::C 64 62:2:G / 67::C 67 65::F 65 64::C 64 62:2:G / 60::C 60 67 67 69::F 69 67:2:C / 65::F 65 64::C 64 62::G 62 60:2:C'},
  {id:'mary',ad:'Mary\'nin Kuzusu',by:'Geleneksel',lv:1,bpm:92,
   n:'64::C 62 60 62 64 64 64:2 / 62::G 62 62:2 64::C 67 67:2 / 64::C 62 60 62 64 64 64 64 / 62::G 62 64 62 60:4:C'},
  {id:'moon',ad:'Ay Işığında',by:'Geleneksel',lv:1,bpm:92,
   n:'60::C 60 60 62::G 64:2:C 62:2:G / 60::C 64 62::G 62 60:4:C / 60::C 60 60 62::G 64:2:C 62:2:G / 60::C 64 62::G 62 60:4:C / 62::Dm 62 62 62 57:2 57:2 / 62::G 60 59 57 55:4 / 60::C 60 60 62::G 64:2:C 62:2:G / 60::C 64 62::G 62 60:4:C'},
  {id:'london',ad:'Londra Köprüsü',by:'Geleneksel',lv:1,bpm:96,
   n:'67:1.5:C 69:.5 67 65 64 65 67:2 / 62::G 64 65:2 64::C 65 67:2 / 67:1.5:C 69:.5 67 65 64 65 67:2 / 62:2:G 67:2 64::C 60:2'},
  {id:'macdonald',ad:'Yaşlı MacDonald',by:'Geleneksel',lv:1,bpm:104,
   n:'72::C 72 72 67 69::F 69 67:2:C / 76::C 76 74::G 74 72:3:C 67 / 72::C 72 72 67 69::F 69 67:2:C / 76::C 76 74::G 74 72:4:C'},
  {id:'jacques',ad:'Frère Jacques',by:'Geleneksel',lv:1,bpm:96,
   n:'60::C 62 64 60 60 62 64 60 / 64::C 65 67:2 64 65 67:2 / 67:.5:C 69:.5 67:.5 65:.5 64 60 67:.5 69:.5 67:.5 65:.5 64 60 / 60::C 67::G 60:2:C 60 67::G 60:2:C'},
  {id:'ode',ad:'Neşeye Övgü',by:'Beethoven',lv:2,bpm:96,
   n:'64::C 64 65 67 67::G 65 64 62 / 60::C 60 62 64 64:1.5:G 62:.5 62:2 / 64::C 64 65 67 67::G 65 64 62 / 60::C 60 62 64 62:1.5:G 60:.5 60:2:C'},
  {id:'lullaby',ad:'Ninni',by:'Brahms',lv:2,bpm:84,
   n:'64:.5:C 64:.5 67:1.5 64:.5 64 67:2 / 64:.5 67:.5 72 71:1.5 69:.5 69 67 / 62:.5:G 64:.5 65 62 62:.5 64:.5 65:2 / 62:.5 65:.5 71:.5 69:.5 67 71 72:3:C'},
  {id:'row',ad:'Kürek Çek',by:'Geleneksel',lv:2,bpm:84,
   n:'60:1.5:C 60:1.5 60 62:.5 64:1.5 / 64 62:.5 64 65:.5 67:3 / 72:.5:C 72:.5 72:.5 67:.5 67:.5 67:.5 64:.5 64:.5 64:.5 60:.5 60:.5 60:.5 / 67::G 65:.5 64 62:.5 60:3:C'},
  {id:'birthday',ad:'Mutlu Yıllar',by:'Geleneksel',lv:2,bpm:100,
   lyr:'Mut lu yıl lar sa na / Mut lu yıl lar sa na / Mut lu yıl lar sev gi li / Mut lu yıl lar sa na',
   n:'67:.75 67:.25 69::C 67 72 71:2:G / 67:.75 67:.25 69::G 67 74 72:2:C / 67:.75 67:.25 79::C 76 72 71::F 69:2 / 77:.75 77:.25 76::C 72 74::G 72:3:C'},
  {id:'saints',ad:'When the Saints',by:'Geleneksel',lv:2,bpm:120,
   n:'60::C 64 65 67:4 / 60 64 65 67:4 / 60 64 65 67:2 64:2 60:2 64:2 62:4:G / 64::G 64 62 60:3:C 60 64:2 67:2 67::F 65:3 / 64::C 65 67:2 64:2 60:2 62:2:G 60:4:C'},
  {id:'jingle',ad:'Jingle Bells',by:'J. Pierpont',lv:3,bpm:116,
   n:'64::C 64 64:2 64 64 64:2 / 64 67 60:1.5 62:.5 64:4 / 65::F 65 65:1.5 65:.5 65 64::C 64 64:.5 64:.5 / 64::D 62 62 64 62:2:G 67:2 / 64::C 64 64:2 64 64 64:2 / 64 67 60:1.5 62:.5 64:4 / 65::F 65 65:1.5 65:.5 65 64::C 64 64:.5 64:.5 / 67::G 67 65 62 60:4:C'},
];
const CHORD_ROOT={C:0,D:2,E:4,F:5,G:7,A:9,B:11},MAJ=[0,2,4,5,7,9,11];
const SONG={on:false,sg:null,notes:[],keys:[],i:0,pos:0,rate:1,wait:0,hits:0,miss:0,run:0,best:0,t0:0,last:0,flash:[]};
function parseSong(sg){const lyr=sg.lyr?sg.lyr.split('/').map(l=>l.trim().split(/\s+/)):null,out=[];let b=0;
  sg.n.split('/').forEach((ln,li)=>ln.trim().split(/\s+/).forEach((tok,ti)=>{const[m,d,c]=tok.split(':');const beats=d?+d:1;out.push({m:+m+S.key,b,d:beats,c:c||null,line:li,w:lyr?lyr[li][ti]:null,hit:false});b+=beats}));return out}
function padChord(c){if(!ac||!c)return;const r=CHORD_ROOT[c[0]]+S.key,mi=c[1]==='m',n=ac.currentTime,g=ac.createGain(),lp=ac.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1300;lp.connect(g);g.connect(bus);
  g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(.11,n+.06);g.gain.setTargetAtTime(0,n+1.1,.45);
  [[36+r,.8,'sine'],[48+r,.35,'triangle'],[52+r-(mi?1:0),.3,'triangle'],[55+r,.3,'triangle']].forEach(([m,a,t])=>{const o=ac.createOscillator(),og=ac.createGain();o.type=t;o.frequency.value=mtof(m);og.gain.value=a;o.connect(og);og.connect(lp);o.start(n);o.stop(n+3.2)});
  setTimeout(()=>{try{g.disconnect()}catch(e){}},3500)}
// basılan sese göre çalınacak sesi ve puanı belirler
function songPress(m){if(!SONG.on)return{m};const want=SONG.notes[SONG.i];if(!want||SONG.pos<want.b-1.5)return{m};
  if(S.songEasy||m===want.m){if(SONG.wait>.4)SONG.rate=Math.max(.55,SONG.rate*.9);else if(SONG.wait<.1)SONG.rate=Math.min(1,SONG.rate+.06);
    SONG.wait=0;SONG.pos=Math.max(SONG.pos,want.b);want.hit=true;SONG.hits++;SONG.run++;SONG.best=Math.max(SONG.best,SONG.run);if(want.c)padChord(want.c);SONG.i++;if(SONG.i>=SONG.notes.length)songFinish();return{m:want.m}}
  SONG.miss++;SONG.run=0;SONG.flash.push({m,t:performance.now()});return{m}}
async function songStart(id){initAudio();const sg=SONGS.find(x=>x.id===id)||SONGS[0];S.song=sg.id;save();
  const notes=parseSong(sg),scale=[];for(let m=36;m<96;m++)if(MAJ.includes(((m-S.key)%12+12)%12))scale.push(m);
  let lo=Math.min(...notes.map(n=>n.m));while(!scale.includes(lo))lo--;const keys=scale.slice(scale.indexOf(lo),scale.indexOf(lo)+8);
  thStopAll();Object.assign(SONG,{on:true,sg,notes,keys,i:0,pos:notes[0].b-4,rate:1,wait:0,hits:0,miss:0,run:0,best:0,t0:performance.now(),last:performance.now(),flash:[]});
  $('#songBtn small').textContent='Bitir';$('#result').hidden=true;
  if(S.songRec&&!(mrec&&mrec.state==='recording'))await startRec(S.songMic)}
function songStop(){if(!SONG.on)return;SONG.on=false;thStopAll();$('#songBtn small').textContent='Şarkı';if(mrec&&mrec.state==='recording')stopRec()}
function songTick(now){if(!SONG.on)return;const dt=Math.min(.1,(now-SONG.last)/1000);SONG.last=now;const want=SONG.notes[SONG.i],adv=dt*SONG.sg.bpm/60*SONG.rate;
  if(want){if(SONG.pos+adv>=want.b){SONG.pos=want.b;SONG.wait+=dt}else SONG.pos+=adv}else SONG.pos+=adv}
function songFinish(){const sg=SONG.sg,acc=Math.round(100*SONG.hits/Math.max(1,SONG.hits+SONG.miss)),sec=Math.round((performance.now()-SONG.t0)/1000),best=SONG.best;
  let rec={};try{rec=JSON.parse(localStorage.getItem('tiniBest')||'{}')}catch(e){}if(!S.songEasy&&!(rec[sg.id]>=acc)){rec[sg.id]=acc;try{localStorage.setItem('tiniBest',JSON.stringify(rec))}catch(e){}}
  setTimeout(()=>{songStop();burst(W/2,H*.4,30,1.2);const stars=acc>=95?3:acc>=80?2:1;
    $('#resSong').textContent=sg.ad+(S.songEasy?' · kolay':'');$('#resTitle').textContent=['','Güzel','Çok iyi','Kusursuz'][stars];$('#resStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);
    $('#resAcc').textContent=acc+'%';$('#resCombo').textContent=best;$('#resTime').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;$('#result').hidden=false},1300)}
function songOpen(){const list=$('#songList');list.innerHTML='';let best={};try{best=JSON.parse(localStorage.getItem('tiniBest')||'{}')}catch(e){}
  for(const sg of SONGS){const li=document.createElement('li'),bt=document.createElement('button');
    bt.innerHTML=`<span class="t"><b></b><span></span></span><span class="lv">${'●'.repeat(sg.lv)}${'○'.repeat(3-sg.lv)}</span><span class="best">${best[sg.id]!=null?best[sg.id]+'%':''}</span><span class="pl"><svg><use href="#i-play"/></svg></span>`;
    bt.querySelector('b').textContent=sg.ad;bt.querySelector('.t span').textContent=sg.by;bt.onclick=()=>{$('#songs').hidden=true;songStart(sg.id)};li.append(bt);list.append(li)}
  $('#songs').hidden=false}

/* ---------- theremin çizimi ---------- */
function drawTheremin(){
  const items=keyItems(),ks=keyNotes(),now=performance.now(),heldM=new Set([...held.values()].map(n=>n.m)),want=SONG.on?SONG.notes[SONG.i]:null,tgt=want&&!S.songEasy?want.m:null;
  ctx.save();
  // ışık sütunları
  for(const k of items){const g=heldM.has(k.m)?1:keyGlow.get(k.m)||0;if(g<.02)continue;const r=k.r,hh=H*.42*g,gr=ctx.createLinearGradient(0,r.y,0,r.y-hh);gr.addColorStop(0,`rgba(255,90,54,${.3*g})`);gr.addColorStop(1,'rgba(255,90,54,0)');ctx.fillStyle=gr;ctx.fillRect(r.x,r.y-hh,r.w,hh)}
  if(SONG.on)drawHighway(items,now,tgt);
  SONG.flash=SONG.flash.filter(f=>now-f.t<300);
  // tuşlar
  for(const k of items){const r=k.r,on=heldM.has(k.m),tg=k.m===tgt,fl=SONG.flash.some(f=>f.m===k.m),pulse=tg&&SONG.pos>=want.b?.5+.5*Math.sin(now/110):0;
    rr(r.x,r.y,r.w,r.h,k.black?8:12);ctx.fillStyle=on?'#ededed':fl?'rgba(255,255,255,.25)':tg?`rgba(255,90,54,${.25+pulse*.25})`:k.black?'rgba(255,255,255,.1)':'rgba(255,255,255,.06)';ctx.fill();
    ctx.strokeStyle=tg?ACC:'rgba(255,255,255,.12)';ctx.lineWidth=tg?2:1;ctx.stroke();ctx.textAlign='center';ctx.textBaseline='middle';
    if(k.black){ctx.fillStyle=on?'#0a0a0b':tg?'#fff':'#b5b5b5';ctx.font=`600 ${W<640?10:11}px ${MONO}`;ctx.fillText(nameOf(k.m),r.x+r.w/2,r.y+r.h/2)}
    else{ctx.fillStyle=on?'#0a0a0b':tg?'#fff':'#dcdcdc';ctx.font=`600 ${W<640?14:16}px ${MONO}`;ctx.fillText(nameOf(k.m),r.x+r.w/2,r.y+r.h*.42);
      const[hd,f]=keyFinger(k.i);ctx.font=`500 ${W<640?9:10}px ${FONT}`;ctx.fillStyle=on?'#333':'#7a7a7a';ctx.fillText(W<640?FN[f].slice(0,3):(hd==='L'?'sol ':'sağ ')+FN[f],r.x+r.w/2,r.y+r.h*.74)}}
  // parmak etiketleri: uçta naturel, orta boğumda diyez
  for(const h of hands){const st=fingSt[String(h.id)];for(let f=0;f<4;f++){const base=ks[KEYMAP[h.role][f]],z=st&&st.f[f];
    pill(h.pts[FING[f]],nameOf(base),z==='tip',base===tgt,0);pill(h.pts[FING[f]-2],nameOf(base+1),z==='joint',base+1===tgt,1)}}
  if(!SONG.on){const names=[...held.values()].map(n=>nameOf(n.m));if(names.length){ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#ededed';ctx.font=`600 30px ${MONO}`;ctx.fillText(names.join('  ·  '),W/2,topY()+34)}
    else if(!hands.length)drawThHint()}
  ctx.restore();
}
function pill(p,txt,on,tg,small){const now=performance.now();ctx.font=`600 ${small?9:11}px ${MONO}`;const tw=ctx.measureText(txt).width+(small?8:12),hh=small?14:18,x=p.x+(small?12:-tw/2),y=small?p.y-hh/2:p.y-30;
  if(tg){const pulse=.5+.5*Math.sin(now/110);ctx.fillStyle=`rgba(255,90,54,${.25+pulse*.3})`;ctx.beginPath();ctx.arc(p.x,p.y,(small?10:14)+pulse*6,0,7);ctx.fill()}
  if(small&&!on&&!tg){ctx.globalAlpha=.55}rr(x,y,tw,hh,hh/2);ctx.fillStyle=on?ACC:tg?'#fff':'rgba(10,10,11,.75)';ctx.fill();ctx.fillStyle=on?'#fff':tg?'#0a0a0b':'#dcdcdc';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(txt,x+tw/2,y+hh/2+.5);ctx.globalAlpha=1}
function drawHighway(items,now,tgt){const whites=items.filter(k=>!k.black),hitW=whites[0].r.y-6,top=topY()+92,pp=clamp((hitW-top)/5.5,44,110);
  for(const k of whites){ctx.fillStyle=k.m===tgt?'rgba(255,90,54,.05)':k.i%2?'rgba(255,255,255,.02)':'rgba(255,255,255,.01)';ctx.fillRect(k.r.x,top,k.r.w,hitW-top)}
  ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(whites[0].r.x,hitW);ctx.lineTo(whites[7].r.x+whites[7].r.w,hitW);ctx.stroke();
  ctx.save();ctx.beginPath();ctx.rect(0,top,W,hitW-top+2);ctx.clip();
  for(let k=Math.max(0,SONG.i-3);k<Math.min(SONG.notes.length,SONG.i+16);k++){const n=SONG.notes[k],it=items.find(x=>x.m===n.m);if(!it)continue;const r=it.r,hy=it.black?r.y-4:hitW,yb=hy-(n.b-SONG.pos)*pp,hgt=Math.max(16,n.d*pp-6),yt=yb-hgt;if(yb<top)break;
    const cur=k===SONG.i;rr(r.x+(it.black?1:4),yt,r.w-(it.black?2:8),hgt,8);ctx.fillStyle=n.hit?`rgba(255,90,54,${clamp(1-(SONG.pos-n.b)/3,0,.85)})`:cur?'#ffffff':it.black?'rgba(255,200,180,.35)':'rgba(255,255,255,.28)';ctx.fill();
    if(cur&&SONG.pos>=n.b){const pulse=.5+.5*Math.sin(now/110);ctx.strokeStyle=`rgba(255,90,54,${.5+pulse*.5})`;ctx.lineWidth=2+pulse*2;rr(r.x+1,yt-3,r.w-2,hgt+6,10);ctx.stroke()}
    if(hgt>18){ctx.fillStyle=cur?'#0a0a0b':n.hit?'#fff':'#cfcfcf';ctx.textAlign='center';ctx.textBaseline='bottom';ctx.font=`600 11px ${FONT}`;ctx.fillText(n.w||nameOf(n.m),r.x+r.w/2,yb-4)}}
  ctx.restore();
  const pr=SONG.i/SONG.notes.length;ctx.textAlign='left';ctx.textBaseline='middle';ctx.font=`500 13px ${FONT}`;ctx.fillStyle='#bdbdbd';ctx.fillText(SONG.sg.ad+(S.songEasy?' · kolay':''),14,topY()+18);
  ctx.fillStyle='rgba(255,255,255,.1)';ctx.fillRect(14,topY()+32,120,2);ctx.fillStyle='#ededed';ctx.fillRect(14,topY()+32,120*pr,2);
  if(SONG.rate<.98){ctx.fillStyle='#7a7a7a';ctx.font=`500 11px ${MONO}`;ctx.fillText(`hız %${Math.round(SONG.rate*100)}`,14,topY()+46)}
  if(SONG.run>=3){ctx.textAlign='right';ctx.font=`600 26px ${MONO}`;ctx.fillStyle=SONG.run>=10?ACC:'#ededed';ctx.fillText(SONG.run,W-16,topY()+22);ctx.font=`500 11px ${FONT}`;ctx.fillStyle='#8f8f8f';ctx.fillText('seri',W-16,topY()+42)}
  const cur=SONG.notes[Math.min(SONG.i,SONG.notes.length-1)],line=SONG.notes.filter(n=>n.line===cur.line),ly=topY()+70;
  ctx.font=`500 17px ${FONT}`;const words=line.map(n=>n.w||nameOf(n.m)),gap=10,ws=words.map(w=>ctx.measureText(w).width),tot=ws.reduce((a,c)=>a+c,0)+gap*(words.length-1),sc=Math.min(1,(W-28)/tot);
  ctx.save();ctx.translate(W/2-tot*sc/2,ly);ctx.scale(sc,sc);let x=0;line.forEach((n,k)=>{const idx=SONG.notes.indexOf(n);ctx.fillStyle=idx<SONG.i?'#ededed':idx===SONG.i?ACC:'#5a5a5a';ctx.textAlign='left';ctx.fillText(words[k],x,0);x+=ws[k]+gap});ctx.restore();
  if(SONG.i===0&&SONG.pos<SONG.notes[0].b){ctx.textAlign='center';ctx.font=`500 14px ${FONT}`;ctx.fillStyle='#bdbdbd';ctx.fillText(S.songEasy?'Herhangi bir parmağını başparmağına değdir':camOn?'Parlayan parmağını başparmağına değdir':'Parlayan tuşa dokun',W/2,(top+hitW)/2)}}
function drawThHint(){const rows=camOn?[['İki elini kaldır, avuçların kameraya baksın',''],['Başparmağını bir parmağının ucuna değdir','Nota çalar'],['Orta boğumuna değdir','Diyezi çalar'],['Sol el: Do Re Mi Fa','serçeden işarete'],['Sağ el: Sol La Si Do','işaretten serçeye']]
    :[['Alttaki tuşlara dokun','Basılı tuttukça çalar'],['Klavyede','A S D F J K L Ş · diyez W E R U I']];
  const narrow=W<560,bw=Math.min(W-24,460),rh=narrow?44:34,bh=rows.length*rh+28,x0=W/2-bw/2,y0=(topY()+whiteRect(0).y-50)/2-bh/2;
  ctx.fillStyle='rgba(10,10,11,.86)';rr(x0,y0,bw,bh,16);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1;ctx.stroke();
  rows.forEach(([a,b2],i)=>{const y=y0+14+rh*i+rh/2;ctx.textAlign='left';ctx.textBaseline='middle';
    if(narrow){ctx.fillStyle='#e6e6e6';ctx.font=`500 14px ${FONT}`;ctx.fillText(a,x0+18,b2?y-8:y);ctx.fillStyle='#8a8a8a';ctx.font=`400 13px ${FONT}`;ctx.fillText(b2,x0+18,y+10)}
    else{ctx.fillStyle='#e6e6e6';ctx.font=`500 14px ${FONT}`;ctx.fillText(a,x0+20,y);ctx.fillStyle='#8a8a8a';ctx.font=`400 13px ${FONT}`;ctx.textAlign='right';ctx.fillText(b2,x0+bw-20,y)}})}

/* ---------- öğretici (teller) ---------- */
const TUT=[
  {id:'make',hand:'Başparmağınla işaret parmağını birleştir, çek ve bırak. Bir tel oluşur.',touch:'Ekrana basılı tut, titreşince parmağını çek. Bir tel oluşur.'},
  {id:'pluck',hand:'Diğer elinin işaret parmağını telin üzerinden geçir.',touch:'Parmağını telin üzerinden kaydır.'},
  {id:'strum3',hand:'İki tel daha ger, sonra üçünü tek hareketle çal.',touch:'İki tel daha ger, sonra üçünü tek kaydırmayla çal.'},
  {id:'fret',hand:'Bir parmağını telin üstünde tut, diğer elinle çal. Ses incelir.',touch:'Bir parmağınla telin üstüne bas, diğeriyle çal.'},
  {id:'bend',hand:'Tel çalarken bastığın parmağı tel boyunca kaydır. Ses kayar.',touch:'Tel çalarken bastığın parmağı tel boyunca kaydır.'},
];
let tut=0;try{tut=+(localStorage.getItem('havaTut')||0)}catch(e){}
function renderTut(){const el=$('#tut');if(S.mode!=='strings'||tut>=TUT.length||!$('#intro').hidden){el.hidden=true;return}el.hidden=false;
  $('#tutTxt').textContent=camOn?TUT[tut].hand:TUT[tut].touch;$('#tutStep').textContent=`${tut+1}/${TUT.length}`}
function tutEvent(id){if(tut>=TUT.length||TUT[tut].id!==id)return;tut++;try{localStorage.setItem('havaTut',tut)}catch(e){}burst(W/2,H*.35,20,1);
  toast(tut>=TUT.length?'Hazırsın':`Adım ${tut}/${TUT.length}`,tut>=TUT.length?'Artık serbestçe çal.':'Tamam');renderTut()}
let toastT;function toast(title,sub=''){const el=$('#toast');el.innerHTML='';const b=document.createElement('b');b.textContent=title;el.append(b);if(sub){const sm=document.createElement('small');sm.textContent=sub;el.append(sm)}
  el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2400)}

/* ---------- el takibi ---------- */
const EXT=.9,TIPS=[8,12,16,20];
const CON=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
let hands=[],slots=[],handIdN=0,mirror=true;
function toScreen(p){const vw=vid.videoWidth||640,vh=vid.videoHeight||480;const s=Math.max(W/vw,H/vh),dw=vw*s,dh=vh*s;return{x:(mirror?1-p.x:p.x)*dw+(W-dw)/2,y:p.y*dh+(H-dh)/2}}
function processHands(lms,wl=[]){
  // eller hareket etse ya da çaprazlansa bile her eli önceki karedeki eşiyle eşleştir
  const raw=lms.slice(0,2).map((lm,i)=>{const pts=lm.map(toScreen),w=wl[i]&&wl[i].length===21?wl[i].map(p=>({x:mirror?-p.x:p.x,y:p.y,z:p.z})):null;return{pts,w,cx:pts[9].x}});
  const free=[...slots],next=[];
  if(raw.length===2&&free.length===2&&dist(raw[0].pts[9],free[1].pts[9])+dist(raw[1].pts[9],free[0].pts[9])<dist(raw[0].pts[9],free[0].pts[9])+dist(raw[1].pts[9],free[1].pts[9]))free.reverse();
  const pair=raw.length===2&&free.length===2;
  raw.forEach((r,ri)=>{let s=null;if(pair){if(dist(free[ri].pts[9],r.pts[9])<W*.3)s=free[ri]}else{let bd=W*.3;for(const f of free){const d=dist(f.pts[9],r.pts[9]);if(d<bd){bd=d;s=f}}}
    if(s){if(!pair)free.splice(free.indexOf(s),1);r.pts=r.pts.map((p,i)=>({x:s.pts[i].x+(p.x-s.pts[i].x)*.78,y:s.pts[i].y+(p.y-s.pts[i].y)*.78}));r.role=s.role;r.id=s.id}next.push(r)});
  const used=new Set(next.filter(r=>r.role).map(r=>r.role)),fresh=next.filter(r=>!r.role).sort((a,b)=>a.cx-b.cx);
  for(const r of fresh){if(!used.size&&fresh.length===1)r.role=r.cx<W/2?'L':'R';else r.role=used.has('L')?'R':'L';used.add(r.role)}
  if(next.length===1){const r=next[0],fs=r.id&&fingSt[String(r.id)];if(!strPinch.has(r.role)&&!(fs&&fs.f.some(Boolean))){if(r.role==='R'&&r.cx<W*.4)r.role='L';else if(r.role==='L'&&r.cx>W*.6)r.role='R'}}
  for(const r of next)if(!r.id)r.id=++handIdN;slots=next.map(r=>({pts:r.pts,role:r.role,id:r.id}));
  for(const h of next){h.size=dist(h.pts[0],h.pts[9])||1;h.pr=TIPS.map(t=>dist(h.pts[4],h.pts[t])/h.size);h.ext=TIPS.map(t=>dist(h.pts[0],h.pts[t])/h.size);h.open=TIPS.reduce((a,t)=>a+dist(h.pts[0],h.pts[t]),0)/4/h.size}
  hands=next;
  if(S.mode==='strings')stringHands();
}

/* ---------- dokunma / fare ---------- */
const ptr=new Map();
cv.addEventListener('pointerdown',e=>{initAudio();cv.setPointerCapture(e.pointerId);const p={x:e.clientX,y:e.clientY};ptr.set(e.pointerId,p);
  if(S.mode==='theremin'){p.key=keyAt(p.x,p.y);if(p.key!=null)noteOn('p'+e.pointerId,p.key,null);return}
  if(S.mode!=='strings')return;const id='p'+e.pointerId;p.sx=p.x;p.sy=p.y;p.px=p.x;p.py=p.y;p.t0=performance.now();let ns;
  if(grabAt(p,28)){p.kind='grab';holdStart(id,p,28)}else if(ns=nearString(p,22)){p.kind='fret';p.fs=ns.s;ns.s.fret={k:id,u:ns.u}}else p.kind='pend'});
cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
  if(S.mode==='theremin'){const k=keyAt(p.x,p.y);if(k!==p.key){p.key=k;if(k!=null)noteOn('p'+e.pointerId,k,null);else noteOff('p'+e.pointerId)}return}
  if(S.mode!=='strings')return;
  const id='p'+e.pointerId;if(p.kind==='pend'&&Math.hypot(p.x-p.sx,p.y-p.sy)>12){p.kind='strum';p.px=p.sx;p.py=p.sy}
  if(p.kind==='fret'){const q=proj(p.fs,p);if(Math.abs(q.d)>30||q.u<0||q.u>1||!strings.includes(p.fs)){if(p.fs.fret&&p.fs.fret.k===id)p.fs.fret=null;p.kind='strum'}else p.fs.fret={k:id,u:Math.max(.04,Math.min(.96,q.u))}}
  if(p.kind==='strum'){const d=Math.hypot(p.x-p.px,p.y-p.py);strum({x:p.px,y:p.py},p,.35+d/45,id)}else if(p.kind==='make'||p.kind==='grab')holdMove(id,p);p.px=p.x;p.py=p.y});
function pointerFrame(){if(S.mode!=='strings')return;const now=performance.now();for(const[id,p]of ptr)if(p.kind==='pend'&&now-p.t0>260){p.kind='make';holdStart('p'+id,{x:p.sx,y:p.sy},0);holdMove('p'+id,p);buzz(15)}}
function pUp(e){const p=ptr.get(e.pointerId);if(!p)return;ptr.delete(e.pointerId);const id='p'+e.pointerId;noteOff(id);if(p.kind==='make'||p.kind==='grab')holdEnd(id);if(p.kind==='fret'&&p.fs.fret&&p.fs.fret.k===id)p.fs.fret=null}
cv.addEventListener('pointerup',pUp);cv.addEventListener('pointercancel',pUp);
function releaseAll(){thereminOff();[...strPinch.keys()].forEach(holdEnd);slots=[];hands=[]}

/* ---------- çizim ---------- */
let energy=0;
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)}
function draw(){
  ctx.fillStyle='#0a0a0b';ctx.fillRect(0,0,W,H);
  if(S.video&&vid.readyState>=2&&vid.videoWidth){const vw=vid.videoWidth,vh=vid.videoHeight,s=Math.max(W/vw,H/vh),dw=vw*s,dh=vh*s;ctx.save();ctx.globalAlpha=.45;if(mirror){ctx.translate(W,0);ctx.scale(-1,1)}ctx.drawImage(vid,(W-dw)/2,(H-dh)/2,dw,dh);ctx.restore()}
  const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'#0a0a0b00');g.addColorStop(1,'#0a0a0bdd');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(energy>.02){const eg=ctx.createRadialGradient(W/2,H*.6,0,W/2,H*.6,Math.max(W,H)*.7);eg.addColorStop(0,`rgba(255,90,54,${energy*.1})`);eg.addColorStop(1,'rgba(255,90,54,0)');ctx.fillStyle=eg;ctx.fillRect(0,0,W,H)}
  energy*=.985;
  if(!$('#intro').hidden){drawDemo();drawParticles();return}
  if(S.mode==='strings')drawStrings();else drawTheremin();
  drawHands();drawParticles();
  if(mrec&&mrec.state==='recording'){ctx.save();ctx.font=`600 14px ${FONT}`;ctx.textAlign='right';ctx.fillStyle='#ffffffaa';ctx.fillText('Tını',W-14,H-14);ctx.restore()}
}
function drawHands(){
  for(const h of hands){const P=h.pts;ctx.save();ctx.lineCap='round';const lw=Math.max(1.5,h.size*.027);ctx.beginPath();for(const[a,b]of CON){ctx.moveTo(P[a].x,P[a].y);ctx.lineTo(P[b].x,P[b].y)}
    const thm=S.mode==='theremin';ctx.strokeStyle=thm?'rgba(255,255,255,.16)':'rgba(255,255,255,.28)';ctx.lineWidth=lw;ctx.stroke();
    const tipList=thm?[]:[8,12];ctx.globalCompositeOperation='lighter';
    for(const t of tipList){if(strPinch.has(h.role)&&t===12)continue;const p=P[t],r=Math.max(9,h.size*.13),gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.2);gr.addColorStop(0,t===8?'rgba(255,90,54,.85)':'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,r*2.2,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,r*.38,0,7);ctx.fill()}
    ctx.globalCompositeOperation='source-over';
    if(thm){ctx.fillStyle='rgba(255,255,255,.55)';for(const q of P){ctx.beginPath();ctx.arc(q.x,q.y,2.2,0,7);ctx.fill()}const st=fingSt[String(h.id)];if(st)st.f.forEach((z,f)=>{if(!z)return;const q=P[z==='tip'?FING[f]:FING[f]-2];ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(P[4].x,P[4].y);ctx.lineTo(q.x,q.y);ctx.stroke()})}
    if(S.mode==='strings'&&h.pr[0]<.9){const on=strPinch.has(h.role);ctx.strokeStyle=on?'#fff':'#ffffff44';ctx.lineWidth=on?4:1.5;ctx.beginPath();ctx.moveTo(P[4].x,P[4].y);ctx.lineTo(P[8].x,P[8].y);ctx.stroke()}
    ctx.restore()}
}
let demoAmp=[],demoPrev=-1;
function drawDemo(){const tt=performance.now()/1000,n=W<640?6:9,x0=W*.12,x1=W*.88,cy=H*.5,sw=(tt*.42)%1.5,fx=x0-30+(x1-x0+60)*Math.min(1,sw),fy=cy+Math.sin(tt*2.3)*H*.08;
  ctx.save();ctx.lineCap='round';
  for(let k=0;k<n;k++){const x=x0+(x1-x0)*k/(n-1),L=H*(.62-.3*k/(n-1));demoAmp[k]=(demoAmp[k]||0)*.95;
    if(sw<1&&demoPrev<x&&fx>=x){demoAmp[k]=12;burst(x,fy,6)}
    const a=demoAmp[k],N=24;ctx.beginPath();for(let i=0;i<=N;i++){const f=i/N,o=a*Math.sin(Math.PI*f)*Math.cos(tt*50+k),y=cy-L/2+L*f;i?ctx.lineTo(x+o,y):ctx.moveTo(x+o,y)}
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,90,54,${.18+a/40})`;ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle=a>1?'#fff':'rgba(255,255,255,.75)';ctx.lineWidth=2;ctx.stroke()}
  demoPrev=sw<1?fx:-1;if(sw<1){const gr=ctx.createRadialGradient(fx,fy,0,fx,fy,26);gr.addColorStop(0,'rgba(255,90,54,.9)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(fx,fy,26,0,7);ctx.fill()}
  ctx.restore()}

/* ---------- kamera + el takibi modeli ---------- */
const VER='0.10.14',CDN=`https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VER}`;
const MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
let detMs=0,detN=0,landmarker=null,lastVT=-1,stream=null,camOn=false;
const status=t=>{$('#status').textContent=t};
const modelP=(async()=>{try{const vision=await import(`${CDN}/vision_bundle.mjs`);const fs=await vision.FilesetResolver.forVisionTasks(`${CDN}/wasm`);
  const o=d=>({baseOptions:{modelAssetPath:MODEL,delegate:d},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.5,minTrackingConfidence:.5});
  try{landmarker=await vision.HandLandmarker.createFromOptions(fs,o('GPU'))}catch(e){landmarker=await vision.HandLandmarker.createFromOptions(fs,o('CPU'))}
  return true}catch(e){console.error(e);return false}})();
async function startCam(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Bu tarayıcı kamerayı desteklemiyor');
  stream?.getTracks().forEach(t=>t.stop());
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:S.facing,width:{ideal:W<700?640:960},height:{ideal:W<700?480:720}},audio:false});
  vid.srcObject=stream;await vid.play().catch(()=>{});mirror=S.facing==='user';camOn=true;lastVT=-1;
}
async function start(withCam){
  initAudio();hello();keepAwake();$('#intro').hidden=true;document.body.classList.remove('intro');renderTut();
  if(withCam){status('Kamera açılıyor…');try{await startCam()}catch(e){camOn=false;status('Kamera açılamadı. Ekrana dokunarak çalabilirsin.');setTimeout(()=>status(''),5000);showHelp();return}
    if(!landmarker){status('El takibi yükleniyor…');const ok=await modelP;if(!ok){status('El takibi yüklenemedi. Bağlantını kontrol et.');return}}
    unlockAudio();renderTut();status('Ellerini kameraya göster');setTimeout(()=>{if($('#status').textContent.startsWith('Ellerini'))status('')},4000)}
  showHelp();
}
function loop(){
  requestAnimationFrame(loop);
  if(camOn&&landmarker&&vid.readyState>=2&&vid.currentTime!==lastVT){lastVT=vid.currentTime;try{const t0=performance.now(),r=landmarker.detectForVideo(vid,t0);detMs=detMs*.9+(performance.now()-t0)*.1;detN++;processHands(r.landmarks||[],r.worldLandmarks||r.worldlandmarks||[])}catch(e){}}
  thereminFrame();pointerFrame();if(S.mode==='strings')bendRings();draw();
}
requestAnimationFrame(loop);

/* ---------- arayüz ---------- */
const HELP={
  strings:['Teller',`<p>Havada tel ger, üzerinden geçerek çal.</p><dl>
    <dt>Tel germek</dt><dd>Başparmağınla işaret parmağını birleştir, çek ve bırak. Tutarken de çalabilirsin; gerdikçe ses incelir.</dd>
    <dt>Çalmak</dt><dd>İşaret parmağını telin üzerinden geçir. Bir hareketle birden çok tel çalabilirsin.</dd>
    <dt>Perde</dt><dd>Bir parmağını telin üstünde tut, diğer elinle çal. Parmağını kaydırırsan ses kayar.</dd>
    <dt>Ses</dt><dd>Uzun tel kalın, kısa tel ince ses verir.</dd>
    <dt>Silmek</dt><dd>Telin bir ucunu tutup diğer ucuna götür.</dd></dl>
    <p>Dokunmatik: basılı tutup çek, tel oluşur. Kaydırınca çalar.</p>`],
  theremin:['Theremin',`<p>İki elini piyanonun üstündeymiş gibi tut. Avuçların kameraya baksın.</p><dl>
    <dt>Çal</dt><dd>Başparmağını bir parmağının ucuna değdir; o parmağın notası çalar. Değdikçe sürer, ayırınca biter.</dd>
    <dt>Diyez</dt><dd>Başparmağını aynı parmağın orta boğumuna değdirirsen yarım ses yukarısı çalar (Do#, Fa# gibi).</dd>
    <dt>Sol el</dt><dd>Serçeden işarete: Do, Re, Mi, Fa.</dd>
    <dt>Sağ el</dt><dd>İşaretten serçeye: Sol, La, Si, Do. Her parmağın notası ucunda, diyezi boğumunda yazar.</dd>
    <dt>Ses</dt><dd>Sakin pad, Rüya, Elektrik piyano, 70'ler synth, Yaylılar, Theremin ve Vokal arasından seç.</dd>
    <dt>Tuşlar</dt><dd>Alttaki tuşlara dokunarak ya da klavyede A S D F J K L Ş, diyezler için W E R U I ile de çalabilirsin.</dd></dl>
    <p><b>Şarkı</b> ile bir ezgi seç: notalar tuşlara iner, sıradaki parmağın elinde parlar. Şarkı seni bekler.</p>`],
};
function showHelp(){const[t,b]=HELP[S.mode];$('#helpTitle').textContent=t;$('#helpBody').innerHTML=b;$('#help').hidden=false}
function setMode(m){songStop();releaseAll();document.body.dataset.mode=m;if(m!=='theremin'&&S.drone){S.drone=false;droneSet(false);$('#droneBtn').classList.remove('on')}S.mode=m;save();
  document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  document.querySelectorAll('[data-for]').forEach(el=>el.hidden=el.dataset.for!==m);renderTut()}
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{initAudio();const m=b.dataset.mode;if(m===S.mode)return;setMode(m);
  if(!localStorage.getItem('seen_'+m)){try{localStorage.setItem('seen_'+m,1)}catch(e){}showHelp()}});
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{$('#'+b.dataset.close).hidden=true;if(b.dataset.close==='saved')$('#prev').pause()});
$('#helpBtn').onclick=showHelp;$('#setBtn').onclick=()=>{$('#settings').hidden=false};
$('#soundBtn').onclick=()=>{initAudio();unlockAudio();setTimeout(()=>{audioOK();hello()},200)};
$('#startBtn').onclick=()=>start(true);$('#noCamBtn').onclick=()=>start(false);
$('#tHarp').onclick=()=>{initAudio();harpPreset()};
$('#tClear').onclick=()=>{strings=[];saveStrings()};
const toneBtn=$('#thTone');toneBtn.querySelector('small').textContent=TONES[S.thTone].ad.split(' ')[0];
function toneList(){const ul=$('#toneList');ul.innerHTML='';for(const[k,t]of Object.entries(TONES)){const li=document.createElement('li'),bt=document.createElement('button');bt.className=k===S.thTone?'on':'';bt.innerHTML='<span class="t"><b></b><span></span></span><span class="chk"></span>';bt.querySelector('b').textContent=t.ad;bt.querySelector('.t span').textContent=t.d;
  bt.onclick=()=>{initAudio();S.thTone=k;save();toneBtn.querySelector('small').textContent=t.ad.split(' ')[0];tonePreview(k);toneList()};li.append(bt);ul.append(li)}}
toneBtn.onclick=()=>{initAudio();toneList();$('#tones').hidden=false};
$('#songBtn').onclick=()=>{initAudio();if(SONG.on)songStop();else songOpen()};
$('#resAgain').onclick=()=>{$('#result').hidden=true;songStart(S.song)};$('#resList').onclick=()=>{$('#result').hidden=true;songOpen()};$('#resFree').onclick=()=>{$('#result').hidden=true};
$('#droneBtn').onclick=e=>{initAudio();S.drone=!S.drone;e.currentTarget.classList.toggle('on',S.drone);droneSet(S.drone)};
$('#flipBtn').onclick=async()=>{S.facing=S.facing==='user'?'environment':'user';save();if(camOn){try{await startCam()}catch(e){status('Diğer kamera açılamadı');S.facing=S.facing==='user'?'environment':'user';try{await startCam()}catch(_){}}}};
$('#keySel').innerHTML=NN.map((n,i)=>`<option value="${i}">${n}</option>`).join('');$('#keySel').value=S.key;
$('#scaleSel').innerHTML=Object.entries(SCALES).map(([k,v])=>`<option value="${k}">${v.ad}</option>`).join('');$('#scaleSel').value=S.scale;
$('#keySel').onchange=e=>{S.key=+e.target.value;retune();save();if(S.drone){droneSet(false);droneSet(true)}};
$('#scaleSel').onchange=e=>{S.scale=e.target.value;retune();save()};
$('#toneSel').value=S.strTone;$('#toneSel').onchange=e=>{S.strTone=e.target.value;save();initAudio();ks(55+S.key,.8)};
const rev=$('#rev');rev.value=S.reverb;rev.oninput=()=>{S.reverb=+rev.value;if(revSend)revSend.gain.value=S.reverb;save()};
const vol=$('#vol');vol.value=S.vol;vol.oninput=()=>{S.vol=+vol.value;if(master)master.gain.value=S.vol;save()};
const tog=(el,k,fn)=>{el.classList.toggle('on',!!S[k]);el.onclick=()=>{S[k]=!S[k];el.classList.toggle('on',S[k]);save();fn&&fn()}};
tog($('#strQuantTog'),'strQuant',retune);tog($('#songRecTog'),'songRec');tog($('#bendTog'),'bend');tog($('#songEasyTog'),'songEasy');tog($('#songMicTog'),'songMic');tog($('#micTog'),'mic');tog($('#videoTog'),'video');
$('#tutSkip').onclick=()=>{tut=TUT.length;try{localStorage.setItem('havaTut',tut)}catch(e){}renderTut()};
loadStrings();
let lastW=W,lastH=H;addEventListener('resize',()=>{const fx=W/lastW,fy=H/lastH;if(fx!==1||fy!==1){strings.forEach(s=>{s.a={x:s.a.x*fx,y:s.a.y*fy};s.b={x:s.b.x*fx,y:s.b.y*fy}});retune();lastW=W;lastH=H}});
function kbNote(e){const c=e.key.toLocaleLowerCase('tr'),ks=keyNotes();let i=KB.indexOf(c);if(e.key===';')i=7;if(i>=0)return ks[i];if(c in KBB){const b=ks[KBB[c]]+1;return b}return null}
addEventListener('keydown',e=>{if(e.repeat||S.mode!=='theremin'||e.target.tagName==='SELECT'||e.metaKey||e.ctrlKey)return;const m=kbNote(e);if(m!=null){initAudio();noteOn('k'+e.code,m,null)}});
addEventListener('keyup',e=>{noteOff('k'+e.code)});
let wake=null;async function keepAwake(){try{if(navigator.wakeLock&&!document.hidden)wake=await navigator.wakeLock.request('screen')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll();else if(camOn)keepAwake()});
setMode(S.mode);
if(DEBUG)window.__ho={get strings(){return strings},get hands(){return hands},get tut(){return tut},get notes(){return plog.length},get det(){return[detN,detMs.toFixed(1)]},level(){if(!analyser)return -1;analyser.getByteTimeDomainData(waveData);let m=0;for(const v of waveData)m=Math.max(m,Math.abs(v-128));return m},get ac(){return ac&&ac.state},plog,SONG,get held(){return [...held.values()].map(n=>({m:n.m,bend:+n.bend.toFixed(2)}))},get cont(){return hands.map(h=>h.contacts&&h.contacts.map(c=>c.d.toFixed(2)+'/'+c.t.toFixed(2)))},keyRect:m=>keyRectOf(m),SONGS};

/* ---------- kayıt (video + istenirse mikrofon) ---------- */
let mrec=null,chunks=[],recStart=0,recTimer,micStream=null,micNode=null;
async function micOn(){if(micNode)return true;if(!ac||!recDest||!navigator.mediaDevices?.getUserMedia)return false;
  try{micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    micNode=ac.createMediaStreamSource(micStream);const g=ac.createGain();g.gain.value=1.4;micNode.connect(g);g.connect(recDest);micNode._g=g;return true}
  catch(e){status('Mikrofon açılamadı');setTimeout(()=>status(''),2500);return false}}
function micOff(){if(micNode){try{micNode._g.disconnect();micNode.disconnect()}catch(e){}micNode=null}if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null}unlockAudio()}
async function startRec(withMic=S.mic){initAudio();
  if(!window.MediaRecorder||!cv.captureStream){status('Bu tarayıcı kayıt yapamıyor');setTimeout(()=>status(''),3000);return}
  if(withMic)await micOn();
  const tracks=[...cv.captureStream(30).getVideoTracks(),...(recDest?recDest.stream.getAudioTracks():[])];
  const types=['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  const type=types.find(t=>MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t))||'';
  try{mrec=new MediaRecorder(new MediaStream(tracks),type?{mimeType:type,videoBitsPerSecond:6e6}:{})}catch(e){status('Kayıt başlatılamadı');micOff();return}
  chunks=[];mrec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
  mrec.onstop=()=>{clearInterval(recTimer);$('#rec').classList.remove('live');status('');micOff();
    const blob=new Blob(chunks,{type:mrec.mimeType||type||'video/webm'});const url=URL.createObjectURL(blob);const ext=blob.type.includes('mp4')?'mp4':'webm';const name=`tini-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.${ext}`;
    $('#prev').src=url;const dl=$('#dl');dl.href=url;dl.download=name;
    const file=new File([blob],name,{type:blob.type});const sb=$('#shareBtn');sb.hidden=!(navigator.canShare&&navigator.canShare({files:[file]}));sb.onclick=()=>navigator.share({files:[file],title:'Tını'}).catch(()=>{});
    $('#saved').hidden=false};
  mrec.start(500);recStart=Date.now();$('#rec').classList.add('live');
  const upd=()=>{const s=Math.floor((Date.now()-recStart)/1000);status(`${micNode?'Kayıt · mikrofon açık':'Kayıt'}  ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`)};upd();recTimer=setInterval(upd,500)}
function stopRec(){if(mrec&&mrec.state==='recording')mrec.stop()}
$('#rec').onclick=()=>{if(mrec&&mrec.state==='recording')stopRec();else startRec(S.mic)};
