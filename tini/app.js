const $=s=>document.querySelector(s);
const cv=$('#cv'),ctx=cv.getContext('2d'),vid=$('#vid');
let W=0,H=0,DPR=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);ctx.setTransform(DPR,0,0,DPR,0,0)}
addEventListener('resize',resize);resize();

/* ---------- müzik teorisi ---------- */
const NN=['Do','Do#','Re','Re#','Mi','Fa','Fa#','Sol','Sol#','La','La#','Si'];
const SCALES={
  major:{ad:'Majör',n:[0,2,4,5,7,9,11]},
  minor:{ad:'Minör',n:[0,2,3,5,7,8,10]},
  penta:{ad:'Pentatonik',n:[0,2,4,7,9],p:'major'},
  mpenta:{ad:'Minör pentatonik',n:[0,3,5,7,10],p:'minor'},
  blues:{ad:'Blues',n:[0,3,5,6,7,10],p:'minor'},
  hicaz:{ad:'Hicaz',n:[0,1,4,5,7,8,10],prog:[0,1,6,3]},
  dorian:{ad:'Dorian',n:[0,2,3,5,7,9,10]},
};
const INST={
  synth:{ad:'Synth',osc:[['sawtooth',-9,1,.45],['sawtooth',9,1,.45],['square',0,.5,.2]],cut:2400,q:4,a:.01,d:.3,s:.6,r:.35,fenv:2.2},
  piano:{ad:'Elektrik piyano',osc:[['sine',0,1,.8],['triangle',0,2,.22],['sine',4,4,.07]],cut:5000,q:.7,a:.004,d:1.1,s:0,r:.45,fenv:1},
  pluck:{ad:'Pluck',osc:[['triangle',0,1,.7],['sawtooth',6,1,.3]],cut:1300,q:6,a:.002,d:.4,s:0,r:.25,fenv:5},
  bell:{ad:'Marimba',osc:[['sine',0,1,.65],['sine',0,2.76,.22],['sine',0,5.4,.1]],cut:9000,q:.7,a:.002,d:1.3,s:0,r:.8,fenv:1},
  pad:{ad:'Pad',osc:[['sawtooth',-14,1,.32],['sawtooth',14,1,.32],['triangle',0,.5,.4]],cut:1500,q:1,a:.45,d:1,s:.8,r:1.3,fenv:1.4},
  bass:{osc:[['sawtooth',0,1,.5],['sine',0,1,.7]],cut:420,q:3,a:.01,d:.3,s:.75,r:.3,fenv:2.5,hide:1},
  theremin:{osc:[['sine',0,1,.85],['triangle',0,1,.22],['sine',0,2,.07]],cut:3200,q:1.2,a:.06,d:.2,s:1,r:.28,fenv:1,vib:1,hide:1},
};
const STYLES={
  pop:{ad:'Pop',k:'x.......x.x.....',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},
  house:{ad:'House',k:'x...x...x...x...',s:'....c.......c...',h:'..x...x...x...x.'},
  trap:{ad:'Trap',k:'x......x..x.....',s:'........x.......',h:'xxxxxxx.xxxxxx.x'},
  hiphop:{ad:'Hip-Hop',k:'x.....x...x..x..',s:'....x.......x...',h:'x.x.x.x.x.x.x.x.'},
  reggaeton:{ad:'Reggaeton',k:'x...x...x...x...',s:'...x..x....x..x.',h:'..x...x...x...x.'},
};
const S={mode:'strings',mic:false,songRec:false,songMic:false,song:'twinkle',strQuant:true,strTone:'elektro',key:0,scale:'major',inst:'synth',bpm:100,beat:false,style:'pop',arp:false,reverb:.35,quant:true,video:true,facing:'user',vol:.85};
try{Object.assign(S,JSON.parse(localStorage.getItem('havaOrkestrasi')||'{}'))}catch(e){}
S.beat=false;S.arp=false;
try{if(localStorage.getItem('havaV')!=='3'){S.mode='strings';localStorage.setItem('havaV','3')}}catch(e){}if(!SCALES[S.scale])S.scale='major';if(!['chord','strings','pads','theremin','song'].includes(S.mode))S.mode='strings';if(!INST[S.inst]||INST[S.inst].hide)S.inst='synth';if(!STYLES[S.style])S.style='pop';
function save(){try{const {beat,arp,...rest}=S;localStorage.setItem('havaOrkestrasi',JSON.stringify(rest))}catch(e){}}

const mtof=m=>440*Math.pow(2,(m-69)/12);
const nameOf=m=>NN[((Math.round(m)%12)+12)%12];
function chordScale(){const sc=SCALES[S.scale];return sc.p?SCALES[sc.p].n:sc.n}
function progression(){const sc=SCALES[S.scale];if(sc.prog)return sc.prog;return chordScale()[2]===4?[0,4,5,3]:[0,5,2,6]}
function triad(deg){const cs=chordScale(),n=cs.length;return[0,2,4].map(k=>{const d=deg+k;return cs[d%n]+12*Math.floor(d/n)})}
let CH=[];
function buildChords(){CH=progression().map(d=>{const t=triad(d);const base=48+S.key;const notes=t.map(x=>x+base);const th=t[1]-t[0],fi=t[2]-t[0];const q=th===4?(fi===8?'+':''):(fi===6?'°':'m');return{notes,root:notes[0],name:NN[(t[0]+S.key)%12]+q}})}
const Z=8;
function scaleNotes(count,base){const n=SCALES[S.scale].n;return Array.from({length:count},(_,i)=>base+n[i%n.length]+12*Math.floor(i/n.length))}
let ZN=[];
function rebuild(){buildChords();ZN=scaleNotes(Z+3,60+S.key)}
rebuild();

/* ---------- ses motoru ---------- */
let ac=null,elecIn,bus,comp,master,revSend,delayNode,drumBus,recDest=null,analyser,noiseBuf,waveData;
/* iPhone: sessiz mod düğmesi açıkken de çalsın + askıya alınan sesi uyandır */
const DEBUG=location.search.includes('debug'),plog=[];let unlockEl=null;const IOS=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
function silentWav(){const sr=8000,n=800,b=new ArrayBuffer(44+n*2),v=new DataView(b),w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+n*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,n*2,true);
  return URL.createObjectURL(new Blob([b],{type:'audio/wav'}))}
function unlockAudio(){
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}
  if(IOS)try{if(!unlockEl){unlockEl=document.createElement('audio');unlockEl.src=silentWav();unlockEl.loop=true;unlockEl.setAttribute('playsinline','');unlockEl.setAttribute('x-webkit-airplay','deny')}const pr=unlockEl.play();if(pr&&pr.catch)pr.catch(()=>{})}catch(e){}
  if(ac&&ac.state!=='running'){const pr=ac.resume();if(pr&&pr.catch)pr.catch(()=>{})}
  try{if(ac){const b=ac.createBuffer(1,1,ac.sampleRate),src=ac.createBufferSource();src.buffer=b;src.connect(ac.destination);src.start(0)}}catch(e){}
}
function audioOK(){const ok=!ac||ac.state==='running';$('#soundBtn').hidden=ok}
['pointerdown','touchend','keydown','click'].forEach(ev=>document.addEventListener(ev,()=>{if(ac&&ac.state!=='running')unlockAudio();setTimeout(audioOK,300)},{capture:true,passive:true}));
setInterval(()=>{if(ac&&ac.state!=='running'&&!document.hidden){const pr=ac.resume();if(pr&&pr.catch)pr.catch(()=>{})}audioOK()},1000);
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
  const conv=ac.createConvolver();conv.buffer=impulse(2.8);revSend=ac.createGain();revSend.gain.value=S.reverb;
  bus.connect(revSend);revSend.connect(conv);conv.connect(comp);
  delayNode=ac.createDelay(2);const fb=ac.createGain(),dg=ac.createGain();delayNode.delayTime.value=60/S.bpm*.75;fb.gain.value=.28;dg.gain.value=.16;
  bus.connect(delayNode);delayNode.connect(fb);fb.connect(delayNode);delayNode.connect(dg);dg.connect(comp);
  drumBus=ac.createGain();drumBus.gain.value=.9;drumBus.connect(comp);
  elecIn=ac.createWaveShaper();const cv2=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/511.5-1;cv2[i]=Math.tanh(2.6*x)/Math.tanh(2.6)}elecIn.curve=cv2;elecIn.oversample='2x';
  const eLP=ac.createBiquadFilter();eLP.type='lowpass';eLP.frequency.value=5200;const eG=ac.createGain();eG.gain.value=.75;elecIn.connect(eLP);eLP.connect(eG);eG.connect(bus);
  const dRev=ac.createGain();dRev.gain.value=.12;drumBus.connect(dRev);dRev.connect(conv);
  noiseBuf=ac.createBuffer(1,ac.sampleRate,ac.sampleRate);const nd=noiseBuf.getChannelData(0);for(let i=0;i<nd.length;i++)nd[i]=Math.random()*2-1;
  unlockAudio();
}
function hello(){if(!ac)return;const ns=[0,4,7,12].map(x=>48+S.key+x);autoPlay=true;ns.forEach((m,i)=>{try{ks(m,.55,ac.currentTime+.05+i*.07,null)}catch(e){}});autoPlay=false}
function impulse(sec){const len=Math.floor(ac.sampleRate*sec),b=ac.createBuffer(2,len,ac.sampleRate);for(let c=0;c<2;c++){const d=b.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}return b}

const voices=[];
function voice(midi,vel=.8,instName=S.inst,when=0,dur=0){
  if(!ac)return null;
  const I=INST[instName],t=Math.max(when,ac.currentTime),f=mtof(midi);
  const out=ac.createGain(),lv=ac.createGain(),fl=ac.createBiquadFilter();
  fl.type='lowpass';fl.Q.value=I.q;
  const cut=Math.min(15000,I.cut*(.55+vel*.6)*Math.pow(2,(midi-60)/36));
  fl.frequency.setValueAtTime(Math.min(18000,cut*I.fenv),t);fl.frequency.setTargetAtTime(cut,t+I.a,I.d/2+.02);
  const peak=.2*vel;
  out.gain.setValueAtTime(0,t);out.gain.linearRampToValueAtTime(peak,t+I.a);out.gain.setTargetAtTime(peak*I.s,t+I.a,I.d/3+.001);
  let lfo=null,lfoG=null;
  if(I.vib){lfo=ac.createOscillator();lfo.frequency.value=5.3;lfoG=ac.createGain();lfoG.gain.value=0;lfo.connect(lfoG);lfo.start(t)}
  const oscs=I.osc.map(([type,det,mult,g])=>{const o=ac.createOscillator(),og=ac.createGain();o.type=type;o.frequency.value=f*mult;o.detune.value=det;og.gain.value=g;o.connect(og);og.connect(fl);if(lfoG)lfoG.connect(o.detune);o.start(t);o.m=mult;return o});
  fl.connect(out);out.connect(lv);lv.connect(instName==='bass'?comp:bus);
  const v={midi,dead:false,
    stop(rel=I.r,at=0){if(this.dead)return;this.dead=true;const n=Math.max(at,ac.currentTime),g=out.gain;
      if(!at){if(g.cancelAndHoldAtTime)g.cancelAndHoldAtTime(n);else{g.cancelScheduledValues(n);g.setValueAtTime(g.value,n)}}
      g.setTargetAtTime(0,n,rel/4);const end=n+rel*1.8+.05;oscs.forEach(o=>o.stop(end));if(lfo)lfo.stop(end);
      const i=voices.indexOf(this);if(i>=0)voices.splice(i,1);
      setTimeout(()=>{try{lv.disconnect()}catch(e){}},(end-ac.currentTime+.3)*1000)},
    pitch(m,glide=.035){this.midi=m;const n=ac.currentTime;oscs.forEach(o=>o.frequency.setTargetAtTime(mtof(m)*o.m,n,glide))},
    cutoff(hz){fl.frequency.setTargetAtTime(hz,ac.currentTime,.06)},
    level(x){lv.gain.setTargetAtTime(x,ac.currentTime,.05)},
    vibrato(c){if(lfoG)lfoG.gain.setTargetAtTime(c,ac.currentTime,.1)}};
  voices.push(v);
  if(voices.length>40)voices[0].stop(.08);
  if(dur)v.stop(I.r,t+dur);
  else if(!I.s)setTimeout(()=>v.stop(.3),(t-ac.currentTime+I.a+I.d*3)*1000);
  return v;
}
function tap(midi,vel=.8,inst=S.inst,hold=.35,when=0){const d=inst==='pad'?.9:hold;counted();rec('tap',[midi,vel,inst,d],when||undefined);return voice(midi,vel,inst,when,d)}
/* gerçekçi tel sesi: Karplus-Strong (akustik / elektro) */
const ksCache=new Map();
function ksBuffer(midi,tone){const key=tone+midi;if(ksCache.has(key))return ksCache.get(key);const el=tone==='elektro',sr=ac.sampleRate,N=Math.max(2,Math.round(sr/mtof(midi))),len=Math.floor(sr*Math.max(1.4,Math.min(el?5:4,(el?2.4:1.5)+(72-midi)/16)));
  const buf=ac.createBuffer(1,len,sr),d=buf.getChannelData(0),ring=new Float32Array(N);let lp=0;for(let i=0;i<N;i++){lp=lp*(el?.25:.4)+(Math.random()*2-1)*(el?.75:.6);ring[i]=lp}
  const dec=el?.9993:.998;let idx=0;for(let i=0;i<len;i++){const nx=(idx+1)%N,v=ring[idx];d[i]=v;ring[idx]=dec*.5*(v+ring[nx]);idx=nx}
  const fade=Math.min(len,sr*.08|0);for(let i=0;i<fade;i++)d[len-1-i]*=i/fade;ksCache.set(key,buf);return buf}
function ks(midi,vel=.8,when=0,sid=null){if(!ac)return null;const t=Math.max(when,ac.currentTime),tone=S.strTone,base=Math.round(midi);const s=ac.createBufferSource();s.buffer=ksBuffer(base,tone);s.playbackRate.value=Math.pow(2,(midi-base)/12);
  const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=1400+vel*7000;const body=ac.createBiquadFilter();body.type='peaking';body.frequency.value=220;body.Q.value=1.2;body.gain.value=4;
  const g=ac.createGain();g.gain.value=(tone==='elektro'?.3:.34)*(.35+vel*.65);s.connect(f);f.connect(body);body.connect(g);g.connect(tone==='elektro'?elecIn:bus);s.start(t);s.onended=()=>{try{g.disconnect()}catch(e){}};rec('ks',[midi,vel,sid],t);counted();return{src:s,base}}

/* ---------- döngü kaydı (looper) ---------- */
const LOOP={state:'off',start:0,len:0,ev:[],schedT:0};let noRec=false;
function rec(type,args,t){if(noRec||!ac||(LOOP.state!=='rec'&&LOOP.state!=='dub'))return;t=t??ac.currentTime;const rel=t-LOOP.start,cyc=Math.floor(rel/LOOP.len);LOOP.ev.push({type,args,off:rel-cyc*LOOP.len,cyc});if(LOOP.ev.length>3000)LOOP.ev.shift()}
function held(list){return ac?{t0:ac.currentTime,list}:null}
function heldEnd(h){if(!h||!ac)return;const d=Math.max(.06,ac.currentTime-h.t0);h.list.forEach(([m,v,i])=>rec('tap',[m,v,i,d],h.t0))}
function playEv(e,t){noRec=true;try{if(e.type==='drum')drum(e.args[0],e.args[1],t);else if(e.type==='tap')voice(e.args[0],e.args[1],e.args[2],t,e.args[3]);else if(e.type==='ks'){ks(e.args[0],e.args[1],t);const id=e.args[2];if(id!=null)setTimeout(()=>{const s=strings.find(s=>s.id===id);if(s)s.amp=Math.max(s.amp,9)},Math.max(0,(t-ac.currentTime)*1000))}}finally{noRec=false}}
function loopSched(from,to){const k0=Math.max(0,Math.floor((from-LOOP.start)/LOOP.len)),k1=Math.floor((to-LOOP.start)/LOOP.len);for(let k=k0;k<=k1;k++)for(const e of LOOP.ev){if(k<=e.cyc)continue;const t=LOOP.start+k*LOOP.len+e.off;if(t>=from&&t<to)playEv(e,t)}}
function click(t,acc){const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=acc?1760:1100;g.gain.setValueAtTime(.18,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);o.connect(g);g.connect(comp);o.start(t);o.stop(t+.06)}
function loopUI(){const b=$('#loopBtn'),st=LOOP.state;if(st==='play')ach('loop');b.className='rb '+(st==='off'?'':st);b.querySelector('small').textContent={off:'Döngü',count:'Hazır',rec:'Kayıt',play:'Çalıyor',dub:'Ekleniyor'}[st];$('#loopClr').hidden=st==='off'}
function loopPress(){initAudio();const st=LOOP.state;
  if(st==='off'){const bar=4*60/S.bpm;LOOP.len=2*bar;const t0=ac.currentTime+.1;LOOP.start=t0+bar;LOOP.schedT=LOOP.start;LOOP.ev=[];LOOP.state='count';nextT=t0;step=0;status('Dört vuruştan sonra iki ölçü kaydedilir');setTimeout(()=>status(''),4000)}
  else if(st==='play')LOOP.state='dub';else if(st==='dub')LOOP.state='play';else if(st==='count')LOOP.state='off';
  loopUI()}
function loopClear(){LOOP.state='off';LOOP.ev=[];loopUI()}
function noise(t,dur,ftype,freq,amp,dest){const s=ac.createBufferSource();s.buffer=noiseBuf;const f=ac.createBiquadFilter();f.type=ftype;f.frequency.value=freq;const g=ac.createGain();g.gain.setValueAtTime(amp,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);s.connect(f);f.connect(g);g.connect(dest);s.start(t,Math.random()*.5);s.stop(t+dur+.05)}
function drum(type,vel=1,when=0){
  if(!ac)return;const t=Math.max(when,ac.currentTime);const g=ac.createGain();g.connect(drumBus);
  if(type==='kick'){const o=ac.createOscillator();o.type='sine';o.frequency.setValueAtTime(165,t);o.frequency.exponentialRampToValueAtTime(42,t+.12);g.gain.setValueAtTime(vel,t);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.connect(g);o.start(t);o.stop(t+.55);noise(t,.02,'highpass',3000,vel*.25,drumBus)}
  else if(type==='snare'){noise(t,.2,'highpass',1300,vel*.55,g);const o=ac.createOscillator(),og=ac.createGain();o.type='triangle';o.frequency.setValueAtTime(230,t);o.frequency.exponentialRampToValueAtTime(150,t+.1);og.gain.setValueAtTime(vel*.45,t);og.gain.exponentialRampToValueAtTime(.001,t+.13);o.connect(og);og.connect(g);o.start(t);o.stop(t+.16)}
  else if(type==='hat'){noise(t,.045,'highpass',7500,vel*.32,g)}
  else if(type==='ohat'){noise(t,.3,'highpass',7000,vel*.25,g)}
  else if(type==='clap'){[0,.011,.022].forEach((d,i)=>noise(t+d,i===2?.2:.025,'bandpass',1500,vel*.55,g))}
  else if(type==='tom'){const o=ac.createOscillator();o.type='sine';o.frequency.setValueAtTime(220,t);o.frequency.exponentialRampToValueAtTime(110,t+.25);g.gain.setValueAtTime(vel*.8,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);o.connect(g);o.start(t);o.stop(t+.4)}
  setTimeout(()=>{try{g.disconnect()}catch(e){}},(t-ac.currentTime)*1000+1200);
  rec('drum',[type,vel],t);counted();
}

/* ---------- sıralayıcı: ritim + arpej ---------- */
let step=0,nextT=0;const flashQ=[];let beatGlow=0,beatStep=-1;
const ARP=[0,1,2,3,2,1,0,1];
function playStep(i,t){
  if(LOOP.state==='count'&&i%4===0)click(t,i===0);
  if(LOOP.state==='rec'&&!S.beat&&i%4===0)click(t,i===0);
  noRec=true;
  try{if(S.beat){const st=STYLES[S.style];if(st.k[i]==='x'){drum('kick',1,t);flashQ.push({t,k:1})}const sn=st.s[i];if(sn==='x')drum('snare',.9,t);if(sn==='c')drum('clap',.9,t);if(st.h[i]==='x')drum('hat',i%4===2?.95:.55,t)}}finally{noRec=false}
  if(S.arp&&curChord){const ns=[...curChord.notes,curChord.notes[0]+12];const m=ns[ARP[i%8]]+12;autoPlay=true;try{tap(m,i%4===0?.75:.55,S.inst==='pad'?'pluck':S.inst,60/S.bpm/4*.85,t)}finally{autoPlay=false}}
  flashQ.push({t,s:i});
}
setInterval(()=>{if(!ac)return;const now=ac.currentTime;
  if(LOOP.state==='count'&&now>=LOOP.start){LOOP.state='rec';loopUI()}
  if(LOOP.state==='rec'&&now>=LOOP.start+LOOP.len){LOOP.state='play';loopUI()}
  if(LOOP.state!=='off'&&LOOP.state!=='count'){const to=now+.12;loopSched(Math.max(LOOP.schedT,now),to);LOOP.schedT=to}
  if(!(S.beat||S.arp||LOOP.state!=='off'))return;const spb=60/S.bpm/4;if(nextT<now-.05){nextT=now+.06;step=0}while(nextT<now+.12){playStep(step,nextT);nextT+=spb;step=(step+1)%16}},25);

/* ---------- çalma mantığı ---------- */
let curChord=null,chordIdx=-1,chordVoices=[];
const parts=[];
function burst(x,y,hue,n=18,pw=1,ring=true){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=(1+Math.random()*4)*pw;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,hue,size:2+Math.random()*4})}if(ring)parts.push({ring:1,x,y,life:1,hue,r:10})}
const HUE=()=>12;

function chordOn(i,x,y){
  if(chordIdx===i)return;chordOff();const c=CH[i];if(!c||!ac)return;chordIdx=i;curChord=c;counted();
  const list=[[c.root-12,.85,'bass']];
  if(!S.arp){const inst=S.inst==='synth'?'pad':S.inst;c.notes.forEach(n=>list.push([n,.5,inst]))}
  chordVoices=list.map(a=>voice(...a));chordHeld=held(list);
  if(x!=null)burst(x,y,HUE(c.root),24,1.2);
}
let chordHeld=null;
function chordOff(){chordVoices.forEach(v=>v&&v.stop());chordVoices=[];heldEnd(chordHeld);chordHeld=null;chordIdx=-1;curChord=null}
const mel={};
function melOn(src,zone,harm,x,y){melOff(src);if(!ac)return;counted();const m=ZN[zone];const list=[[m,.8,S.inst]];if(harm)list.push([ZN[zone+2],.6,S.inst]);mel[src]={vs:list.map(a=>voice(...a)),zone,harm,h:held(list)};if(x!=null)burst(x,y,HUE(m),16)}
function melMove(src,zone,x,y){const s=mel[src];if(!s||s.zone===zone)return;melOn(src,zone,s.harm,x,y)}
function melOff(src){const s=mel[src];if(!s)return;s.vs.forEach(v=>v&&v.stop());heldEnd(s.h);delete mel[src]}
function releaseAll(){chordOff();Object.keys(mel).forEach(melOff);thereminOff();for(const r of['L','R'])pinchSt[r].fill(false);padInside.clear();[...strPinch.keys()].forEach(holdEnd);slots=[]}

/* ---------- yerleşim ---------- */
const topY=()=>70, botY=()=>H-112;
function zoneOf(y){const t=topY(),b=botY();return Math.max(0,Math.min(Z-1,Math.floor((1-(y-t)/(b-t))*Z)))}
function chordRect(i){const t=topY()+6,b=botY()-6,h=(b-t)/4,w=Math.min(200,W*.42-20);return{x:14,y:t+i*h+4,w,h:h-8}}
function chordAt(y){const t=topY()+6,b=botY()-6;return Math.max(0,Math.min(3,Math.floor((y-t)/((b-t)/4))))}
function padRects(){const t=topY()+4,b=botY()-4,cols=4,rows=4,gap=Math.min(14,W*.02);const maxW=Math.min(W-28,(b-t)*1.35);const pw=(maxW-gap*(cols-1))/cols,ph=(b-t-gap*(rows-1))/rows;const ox=(W-maxW)/2;const out=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)out.push({x:ox+c*(pw+gap),y:t+r*(ph+gap),w:pw,h:ph});return out}
const DRUMS=[['kick','Bas davul'],['snare','Trampet'],['hat','Hi-hat'],['clap','Alkış']];
function padInfo(i){const r=Math.floor(i/4),c=i%4;if(r===0)return{type:'drum',d:DRUMS[c][0],label:DRUMS[c][1],hue:[0,30,190,280][c]};if(r===1)return{type:'chord',c,label:CH[c].name,hue:HUE(CH[c].root)};const zi=r===2?4+c:c;return{type:'note',m:ZN[zi],label:nameOf(ZN[zi]),hue:HUE(ZN[zi])}}
const padFlash=new Array(16).fill(0);
function padHit(i,vel){if(!ac)return;const p=padInfo(i),R=padRects()[i];padFlash[i]=1;burst(R.x+R.w/2,R.y+R.h/2,p.hue,20,1+vel);
  if(p.type==='drum')drum(p.d,.5+vel*.5);
  else if(p.type==='chord'){const c=CH[p.c];tap(c.root-12,.8,'bass',.5);c.notes.forEach(n=>tap(n,.45+vel*.3,S.inst,.5));if(S.arp){curChord=c;clearTimeout(padHit.t);padHit.t=setTimeout(()=>{if(S.mode==='pads')curChord=null},2400)}}
  else tap(p.m,.55+vel*.45)}
function padAt(x,y){const rs=padRects();return rs.findIndex(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)}

/* ---------- theremin (iki el) ----------
   sağ el: yükseklik = nota, titreme = vibrato, sağa = parlak ses, yumruk = sus
   sol el: yükseklik = ses düzeyi, yumruk = sus (notaları ayırmak için) */
let thTarget=null,thV=null,thInfo=null,thSmooth=null,thLvl=0;const thTrail=[];const thFist={R:false,L:false};
const TH_RANGE=24,thLo=()=>48+S.key;
function thArea(){return{t:topY()+40,b:botY()-30}}
function thPitchAt(y){const{t,b}=thArea();return thLo()+(1-Math.max(0,Math.min(1,(y-t)/(b-t))))*TH_RANGE}
function thYOf(m){const{t,b}=thArea();return b-(m-thLo())/TH_RANGE*(b-t)}
function thereminUpdate(src,lvl,bright){
  if(!src){if(thV){thV.level(0);thLvl=0}if(thInfo)thInfo.lvl=0;return}
  const raw=thPitchAt(src.y);
  thSmooth=thSmooth==null?raw:thSmooth+(raw-thSmooth)*.2;
  const wig=Math.max(-.8,Math.min(.8,(raw-thSmooth)*1.1));   // elin hızlı titremesi = vibrato
  let center=thSmooth,target=center;
  if(S.quant){const all=scaleNotes(40,24+S.key),near=all.reduce((a,n)=>Math.abs(n-center)<Math.abs(a-center)?n:a,all[0]);if(thTarget==null||Math.abs(center-near)+.35<Math.abs(center-thTarget))thTarget=near;target=thTarget;center=target}
  const m=center+wig;
  if(!thV&&ac)thV=voice(m,.9,'theremin');
  if(thV){thV.pitch(m,.02);thV.cutoff(bright);thV.level(lvl);thV.vibrato(0)}
  thLvl=lvl;thInfo={m,target,raw,x:src.x,y:src.y,lvl,wig:Math.abs(wig)};
  thTrail.push({x:src.x,y:src.y,l:lvl,t:performance.now()});if(thTrail.length>90)thTrail.shift();
}
function thereminOff(){if(thV){thV.stop();thV=null}thInfo=null;thSmooth=null;thTarget=null;thTrail.length=0}
let thCountNote=-1;
function thereminFrame(){
  if(S.mode!=='theremin')return;
  const R=hands.find(h=>h.role==='R'),L=hands.find(h=>h.role==='L');
  let src=null,lvl=.85,bright=2600;
  if(R){thFist.R=thFist.R?R.open<1.3:R.open<1.08;if(!thFist.R){const p=R.pts[8];src={x:p.x,y:p.y};bright=500*Math.pow(2,Math.max(0,Math.min(1,p.x/W))*3.6)}}else thFist.R=false;
  if(L){thFist.L=thFist.L?L.open<1.3:L.open<1.08;const{t,b}=thArea();lvl=thFist.L?0:Math.max(.08,Math.min(1,1-(L.pts[9].y-t)/(b-t)))}else thFist.L=false;
  if(!src&&ptr.size){const p=[...ptr.values()][0];src={x:p.x,y:p.y};lvl=.85;bright=500*Math.pow(2,Math.max(0,Math.min(1,p.x/W))*3.6)}
  thereminUpdate(src,lvl,bright);
  if(thInfo&&thInfo.lvl>.05){const n=Math.round(thInfo.target);if(n!==thCountNote&&Math.abs(thInfo.m-thInfo.target)<.2){thCountNote=n;counted()}}
}

/* ---------- teller: çimdikle-ger-bırak, üzerinden geç = çal, üstüne bas = perde ---------- */
let strings=[],sidN=1;const strPinch=new Map();const MAXS=18,LMIN=50;
const lmax=()=>Math.max(320,Math.hypot(W,H)*.75);
function pitchRaw(L){const Lx=lmax(),x=Math.log(Lx/Math.max(LMIN*.4,Math.min(Lx,L)))/Math.log(Lx/LMIN);return 40+S.key+x*36}
function snap(m){const all=scaleNotes(52,24+S.key);return all.reduce((a,n)=>Math.abs(n-m)<Math.abs(a-m)?n:a,all[0])}
function strNote(L){const m=pitchRaw(L);return S.strQuant?snap(m):m}
function lenFor(m){const Lx=lmax();return Lx*Math.pow(Lx/LMIN,-(m-40-S.key)/36)}
function mkString(a,b){return{id:sidN++,a:{x:a.x,y:a.y},b:{x:b.x,y:b.y},midi:strNote(dist(a,b)),amp:0,v:.5,last:0,fret:null,fc:null,ring:null,hold:{a:null,b:null}}}
function retune(){strings.forEach(s=>{if(s.fixed==null)s.midi=strNote(dist(s.a,s.b))})}
function saveStrings(){if(S.mode==='song')return;try{localStorage.setItem('havaTeller',JSON.stringify(strings.filter(s=>dist(s.a,s.b)>=LMIN).map(s=>[s.a.x/W,s.a.y/H,s.b.x/W,s.b.y/H])))}catch(e){}}
function loadStrings(){try{strings=JSON.parse(localStorage.getItem('havaTeller')||'[]').map(a=>mkString({x:a[0]*W,y:a[1]*H},{x:a[2]*W,y:a[3]*H}))}catch(e){strings=[]}}
function proj(s,p){const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,L2=dx*dx+dy*dy||1,L=Math.sqrt(L2);return{u:((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/L2,d:((p.x-s.a.x)*dy-(p.y-s.a.y)*dx)/L}}
function segLen(s,v){const L=dist(s.a,s.b);if(!s.fret)return L;const u=s.fret.u;return v>u?(1-u)*L:u*L}
function pitchAt(s,v){return s.fixed!=null?s.fixed:strNote(segLen(s,v))}
function pluckString(s,v,vel,t){if(s.fixed!=null){songPluck(s,v,vel,t);return}buzz(8);if(DEBUG)plog.push([s.id,Math.round(performance.now())]);const m=pitchAt(s,v);const r=ks(m,vel,t,s.id);if(r)s.ring={src:r.src,base:r.base,v,m,m0:m,until:performance.now()+3000};s.v=Math.max(.12,Math.min(.88,v));s.amp=6+10*vel;
  if(s.fret)tutEvent('fret');tutEvent('pluck')}
function bendRings(){if(!ac)return;const now=performance.now();for(const s of strings){const r=s.ring;if(!r)continue;if(now>r.until){s.ring=null;continue}
  const m=pitchAt(s,r.v);if(Math.abs(m-r.m)>.01){r.m=m;try{r.src.playbackRate.setTargetAtTime(Math.pow(2,(m-r.base)/12),ac.currentTime,.012)}catch(e){}s.amp=Math.max(s.amp,4);
    const bent=Math.abs(m-r.m0);if(bent>=1)tutEvent('bend');if(bent>=4)ach('slide')}}}
function harpPreset(){const t=topY()+20+(tut<TUT.length?(W<640?75:45):0),b=botY()-20,avail=b-t;const lo=snap(pitchRaw(avail*.98));const all=scaleNotes(52,24+S.key);let i=all.findIndex(n=>n>=lo);const n=W<640?7:10;const notes=all.slice(i,i+n);
  strings=[];const x0=W*.14,x1=W*.86;notes.forEach((m,k)=>{const L=Math.min(avail,lenFor(m)),x=x0+(x1-x0)*k/(n-1),cy=(t+b)/2;strings.push(mkString({x,y:cy-L/2},{x,y:cy+L/2}))});retune();saveStrings();
  strings.forEach((s,k)=>setTimeout(()=>{if(ac){s.amp=8;autoPlay=true;ks(s.midi,.5,0,null);autoPlay=false}},k*55))}
function segHit(p1,p2,p3,p4){const d=(p2.x-p1.x)*(p4.y-p3.y)-(p2.y-p1.y)*(p4.x-p3.x);if(Math.abs(d)<1e-9)return null;const u=((p3.x-p1.x)*(p4.y-p3.y)-(p3.y-p1.y)*(p4.x-p3.x))/d,v=((p3.x-p1.x)*(p2.y-p1.y)-(p3.y-p1.y)*(p2.x-p1.x))/d;return u>=0&&u<=1&&v>=0&&v<=1?{u,v}:null}
function strum(p0,p1,vel,key){if(!ac||!strings.length)return;const hits=[];for(const s of strings){if(dist(s.a,s.b)<LMIN||(s.fret&&s.fret.k===key))continue;const h=segHit(p0,p1,s.a,s.b);if(h)hits.push([h,s])}hits.sort((a,b)=>a[0].u-b[0].u);const now=performance.now();let k=0;
  for(const[h,s]of hits){if(now-s.last<90)continue;s.last=now;const ve=Math.max(.3,Math.min(1,vel));pluckString(s,h.v,ve,ac.currentTime+k*.014);k++;burst(p0.x+(p1.x-p0.x)*h.u,p0.y+(p1.y-p0.y)*h.u,10+Math.random()*18,7,.55,false)}
  if(k){for(const[,s2]of hits)recentPl.push({t:now,id:s2.id});recentPl=recentPl.filter(r=>now-r.t<450);const n=new Set(recentPl.map(r=>r.id)).size;if(n>=3)tutEvent('strum3');if(n>=5)ach('strum5')}}
let recentPl=[];
function grabAt(p,r){let best=null,bd=r;for(const s of strings)for(const e of['a','b']){if(s.hold[e])continue;const d=dist(s[e],p);if(d<bd){bd=d;best={s,e}}}return best}
function nearString(p,r){let best=null,bd=r;for(const s of strings){if(dist(s.a,s.b)<LMIN)continue;const q=proj(s,p);if(q.u>.04&&q.u<.96&&Math.abs(q.d)<bd){bd=Math.abs(q.d);best={s,u:q.u}}}return best}
function holdStart(src,p,r){const g=r?grabAt(p,r):null;
  if(g){g.s.hold[g.e]=src;strPinch.set(src,{s:g.s,e:g.e,isNew:false})}
  else{const s=mkString(p,p);s.hold.b=src;strings.push(s);if(strings.length>MAXS){const i=strings.findIndex(x=>!x.hold.a&&!x.hold.b);if(i>=0)strings.splice(i,1)}strPinch.set(src,{s,e:'b',isNew:true})}}
function holdMove(src,p){const st=strPinch.get(src);if(!st)return;const s=st.s;s[st.e]={x:p.x,y:p.y};const L=dist(s.a,s.b);if(L<LMIN)return;const m=strNote(L);
  if(S.strQuant&&m!==s.midi&&!s.ring&&ac){autoPlay=true;ks(m,.22,0,null);autoPlay=false;s.amp=Math.max(s.amp,3)}s.midi=m}
function holdEnd(src){const st=strPinch.get(src);if(!st)return;strPinch.delete(src);const s=st.s;s.hold[st.e]=null;if(s.hold.a||s.hold.b)return;
  if(dist(s.a,s.b)<LMIN*.7){strings=strings.filter(x=>x!==s);if(!st.isNew){burst(s.a.x,s.a.y,0,20);status('Tel silindi');setTimeout(()=>status(''),1200)}}
  else{if(st.isNew){pluckString(s,.5,.7);burst((s.a.x+s.b.x)/2,(s.a.y+s.b.y)/2,HUE(Math.round(s.midi)),22);tutEvent('make')}saveStrings()}}
function updateFrets(tips){
  for(const s of strings){if(s.fixed!=null){s.fret=null;continue}if(s.fret&&s.fret.k[0]==='p')continue;if(dist(s.a,s.b)<LMIN){s.fret=null;continue}
    let best=null,bd=1e9;for(const t of tips){if(t.sp>.07)continue;const q=proj(s,t.p),r=Math.max(12,t.size*.16);if(q.u>.04&&q.u<.96&&Math.abs(q.d)<r&&Math.abs(q.d)<bd){bd=Math.abs(q.d);best={k:t.k,u:q.u}}}
    if(!best){s.fc=null;s.fret=null;continue}
    if(s.fc&&s.fc.k===best.k)s.fc.n++;else s.fc={k:best.k,n:1};
    if(s.fc.n>=3)s.fret=s.fret&&s.fret.k===best.k?{k:best.k,u:s.fret.u+(best.u-s.fret.u)*.6}:best}}
function stringHands(){
  if(S.mode!=='song')for(const role of['L','R']){const h=hands.find(h=>h.role===role),act=strPinch.has(role);
    let on=false;if(h){const mn=Math.min(...h.pr);on=act?h.pr[0]<.5:(h.pr[0]<.3&&h.pr[0]===mn&&h.ext[0]>EXT)}
    const p=h?{x:(h.pts[4].x+h.pts[8].x)/2,y:(h.pts[4].y+h.pts[8].y)/2}:null;
    if(on&&!act)holdStart(role,p,Math.max(30,h.size*.45));else if(on)holdMove(role,p);else if(act)holdEnd(role)}
  const tips=[],now=performance.now();
  for(const h of hands){if(strPinch.has(h.role))continue;for(const t of[8,12,7]){const k='s'+h.id+'_'+t,pp=tipPrev[k],p=h.pts[t];tipPrev[k]=p;tips.push({k,p,pp,size:h.size,sp:pp?dist(pp,p)/h.size:0,fretOk:t!==7,pick:t!==12})}}
  updateFrets(tips.filter(t=>t.fretOk));
  // parmak ucu telin bir yanından öbür yanına geçince çalar (hız fark etmez)
  const hits=[];
  for(const t of tips){if(!t.pick)continue;for(const s of strings){if(dist(s.a,s.b)<LMIN)continue;const q=proj(s,t.p),key=t.k+'|'+s.id,st=sideSt.get(key);
    if(q.u<-.05||q.u>1.05){sideSt.delete(key);continue}
    const dead=Math.max(4,t.size*.05);if(Math.abs(q.d)<=dead){if(st)st.t=now;continue}
    const ns=Math.sign(q.d);if(!st||!t.pp||now-st.t>2500){sideSt.set(key,{side:ns,t:now});continue}
    st.t=now;if(ns!==st.side){st.side=ns;if(s.fret&&s.fret.k===t.k.replace(/_7$/,'_8')){s.fret=null;s.fc=null}if(s.fret&&s.fret.k===t.k){s.fret=null;s.fc=null}
      hits.push({s,v:Math.max(.02,Math.min(.98,q.u)),vel:.4+t.sp*1.6,p:t.p,o:t.pp?((s.a.x+s.b.x)/2-t.pp.x)*(t.p.x-t.pp.x)+((s.a.y+s.b.y)/2-t.pp.y)*(t.p.y-t.pp.y):0})}}}
  if(hits.length){hits.sort((a,b)=>a.o-b.o);let k=0;for(const h of hits){if(now-h.s.last<70)continue;h.s.last=now;pluckString(h.s,h.v,Math.min(1,h.vel),ac?ac.currentTime+k*.014:0);burst(h.p.x,h.p.y,10+Math.random()*18,7,.55,false);recentPl.push({t:now,id:h.s.id});k++}
    recentPl=recentPl.filter(r=>now-r.t<450);const n=new Set(recentPl.map(r=>r.id)).size;if(n>=3)tutEvent('strum3');if(n>=5)ach('strum5')}
  if(Math.random()<.02)for(const[k,v]of sideSt)if(now-v.t>2000)sideSt.delete(k);
  for(const k of Object.keys(tipPrev))if(k[0]==='s'&&!tips.find(t=>t.k===k)){delete tipPrev[k];for(const sk of[...sideSt.keys()])if(sk.startsWith(k+'|'))sideSt.delete(sk)}
}
const sideSt=new Map();
const SG=['#ff5a36','#ff9a80','#ffe6de'];
function drawStrings(){
  const tt=performance.now()/1000;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  for(const s of strings){const L=dist(s.a,s.b);if(L<2)continue;const dx=(s.b.x-s.a.x)/L,dy=(s.b.y-s.a.y)/L,nx=-dy,ny=dx,on=L>=LMIN,held=s.hold.a||s.hold.b,hue=HUE(Math.round(s.midi));
    // perde çizgileri (cetvel gibi)
    if(on&&s.fixed==null){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=1;ctx.beginPath();const up=scaleNotes(52,24+S.key).filter(n=>n>s.midi+.01).slice(0,12);
      for(const n of up){const Lk=lenFor(n);if(Lk>=L*.97||Lk<LMIN*.45)continue;const u=1-Lk/L,x=s.a.x+dx*L*u,y=s.a.y+dy*L*u;ctx.moveTo(x,y);ctx.lineTo(x+nx*7,y+ny*7)}ctx.stroke()}
    const vib=s.amp,N=30,pts=[];
    for(let i=0;i<=N;i++){const f=i/N;let g=f,lo=0,hi=1;if(s.fret){if(s.v>s.fret.u){lo=s.fret.u}else{hi=s.fret.u}}let o=0;
      if(vib>.2&&f>=lo&&f<=hi){g=(f-lo)/(hi-lo||1);o=vib*(Math.sin(Math.PI*g)*Math.cos(tt*52+s.id)+.35*Math.sin(2*Math.PI*g)*Math.cos(tt*81+s.id)+.18*Math.sin(5*Math.PI*g+tt*30))}
      pts.push([s.a.x+dx*L*f+nx*o,s.a.y+dy*L*f+ny*o])}
    const path=()=>{ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1])};
    if(vib>.4){ctx.globalCompositeOperation='lighter';const gr=ctx.createLinearGradient(s.a.x,s.a.y,s.b.x,s.b.y);SG.forEach((c,i)=>gr.addColorStop(i/2,c));
      path();ctx.strokeStyle=`hsla(${hue},100%,60%,${Math.min(.3,vib/40)})`;ctx.lineWidth=12;ctx.stroke();path();ctx.strokeStyle=gr;ctx.globalAlpha=Math.min(1,.35+vib/14);ctx.lineWidth=4;ctx.stroke();ctx.globalAlpha=1;
      path();ctx.strokeStyle='#fff';ctx.lineWidth=1.6;ctx.stroke();ctx.globalCompositeOperation='source-over';
      if(Math.random()<vib/22){const f=Math.random(),x=s.a.x+dx*L*f,y=s.a.y+dy*L*f;parts.push({x,y,vx:(Math.random()-.5)*1.6,vy:-Math.random()*1.8,life:1,hue:10+Math.random()*18,size:1.2+Math.random()*1.8})}}
    else{path();ctx.strokeStyle=on?`hsla(${hue},90%,65%,.22)`:'rgba(255,255,255,.15)';ctx.lineWidth=7;ctx.stroke();ctx.setLineDash(on?[]:[5,6]);path();ctx.strokeStyle=on?'rgba(255,255,255,.92)':'rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.stroke();ctx.setLineDash([])}
    for(const e of['a','b']){const p=s[e];ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,s.hold[e]?6:4,0,7);ctx.fill();if(s.hold[e]){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,11+Math.sin(tt*8)*2,0,7);ctx.stroke()}}
    if(s.fret){const x=s.a.x+dx*L*s.fret.u,y=s.a.y+dy*L*s.fret.u;ctx.strokeStyle='#ff5a36';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,8,0,7);ctx.stroke();ctx.fillStyle='#ff5a3688';ctx.fill()}
    if(s.shake){const o=Math.sin(performance.now()/25)*s.shake*5;pts.forEach(p=>p[0]+=o*nx)}
    if(on&&s.fixed==null&&(held||vib>2)){const m=s.ring&&vib>1?s.ring.m:s.midi,hp=s.hold.b?s.b:s.hold.a?s.a:{x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2};ctx.fillStyle='#fff';ctx.font=`700 ${held?24:15}px system-ui`;ctx.textAlign='center';ctx.fillText(nameOf(m),hp.x+nx*26,hp.y+ny*26-(held?8:0))}
    s.amp*=.955;if(s.amp<.05)s.amp=0}
  ctx.restore();
  if(S.mode==='strings'&&!strings.length&&!strPinch.size&&tut>=TUT.length){ctx.save();ctx.textAlign='center';ctx.fillStyle='#ffffffcc';ctx.font=`600 ${Math.min(22,W*.05)}px system-ui`;ctx.fillText('Başparmağınla işaret parmağını birleştir ve çek',W/2,H/2-16);ctx.fillText('Bıraktığında tel oluşur',W/2,H/2+14);ctx.restore()}
}

/* ---------- öğretici + rozetler ---------- */
const TUT=[
  {id:'make',hand:'Başparmağınla işaret parmağını birleştir, çek ve bırak. Bir tel oluşur.',touch:'Ekrana basılı tut, titreşince parmağını çek. Bir tel oluşur.'},
  {id:'pluck',hand:'Diğer elinin işaret parmağını telin üzerinden geçir.',touch:'Parmağını telin üzerinden kaydır.'},
  {id:'strum3',hand:'İki tel daha ger, sonra üçünü tek hareketle çal.',touch:'İki tel daha ger, sonra üçünü tek kaydırmayla çal.'},
  {id:'fret',hand:'Bir parmağını telin üstünde tut, diğer elinle çal. Ses incelir.',touch:'Bir parmağınla telin üstüne bas, diğeriyle çal.'},
  {id:'bend',hand:'Tel çalarken bastığın parmağı tel boyunca kaydır. Ses kayar.',touch:'Tel çalarken bastığın parmağı tel boyunca kaydır.'},
];
let tut=0;try{tut=+(localStorage.getItem('havaTut')||0)}catch(e){}
function renderTut(){const el=$('#tut');if(S.mode!=='strings'||tut>=TUT.length||!$('#intro').hidden){el.hidden=true;return}el.hidden=false;
  $('#tutTxt').textContent=(camOn?TUT[tut].hand:TUT[tut].touch);$('#tutStep').textContent=`${tut+1}/${TUT.length}`}
function tutEvent(id){if(tut>=TUT.length||TUT[tut].id!==id)return;tut++;try{localStorage.setItem('havaTut',tut)}catch(e){}confetti();
  if(tut>=TUT.length)toast('Hazırsın','Döngü ile kendi parçanı kaydedebilirsin.');else toast(`Adım ${tut}/${TUT.length}`,'Tamam');renderTut()}
const ACH={strum5:['Tarama','Beş teli tek hareketle çaldın.'],slide:['Kaydırma','Sesi dört nota kaydırdın.'],notes100:['100 nota','Devam.'],loop:['İlk döngü','Üstüne yeni katman ekleyebilirsin.'],video:['İlk video','Paylaşmaya hazır.'],explorer:['Tüm modlar','Hepsini denedin.'],notes500:['500 nota','Epey yol aldın.'],song:['İlk şarkı','Bir sonrakini dene.']};
let achDone={};try{achDone=JSON.parse(localStorage.getItem('havaRozet')||'{}')}catch(e){}
function ach(k){if(achDone[k]||!ACH[k])return;achDone[k]=1;try{localStorage.setItem('havaRozet',JSON.stringify(achDone))}catch(e){}const[b,c]=ACH[k];toast(b,c)}
let autoPlay=false,noteCount=0;function counted(){if(noRec||autoPlay)return;noteCount++;hit();if(noteCount===100)ach('notes100');if(noteCount===500)ach('notes500')}
function buzz(p){try{if(navigator.vibrate)navigator.vibrate(p)}catch(e){}}
let combo=0,lastHit=0,comboPop=0,milestone=null,energy=0,xp=0,lvl=1,xpSaveT=0;
try{const o=JSON.parse(localStorage.getItem('havaXP')||'{}');xp=o.xp||0;lvl=o.lvl||1}catch(e){}
const need=l=>Math.round(40*Math.pow(l,1.35));
const MILE={10:1,25:1,50:1,100:1,200:1,400:1};
function hit(){const now=performance.now();combo=now-lastHit<1500?combo+1:1;lastHit=now;comboPop=1;energy=Math.min(1,energy+.12);
  xp+=1+Math.floor(combo/10);while(xp>=need(lvl)){xp-=need(lvl);lvl++;setTimeout(()=>{toast(`Seviye ${lvl}`,'');buzz([25,40,25])},300)}
  if(now-xpSaveT>2000){xpSaveT=now;try{localStorage.setItem('havaXP',JSON.stringify({xp,lvl}))}catch(e){}}
  if(MILE[combo]){milestone={txt:combo+' seri',t:now};buzz(35)}}
function drawHUD(){const now=performance.now();
  const f=Math.min(1,xp/need(lvl));ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(0,0,W,2);ctx.fillStyle='#ff5a36';ctx.fillRect(0,0,W*f,2);
  ctx.save();ctx.font='600 12px "Geist Mono", ui-monospace, monospace';ctx.textBaseline='middle';const lt='Sv '+lvl,lw=ctx.measureText(lt).width+18;ctx.fillStyle='rgba(10,10,11,.72)';rr(10,16,lw,26,13);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.1)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#ededed';ctx.fillText(lt,19,29.5);ctx.restore();
  const age=now-lastHit;if(combo>=3&&age<1500){const k=1-age/1500,sc=1+comboPop*.25;comboPop*=.85;const te=$('#tut'),y=(te.hidden?topY():te.getBoundingClientRect().bottom+12)+34;
    ctx.save();ctx.translate(W-18,y);ctx.scale(sc,sc);ctx.textAlign='right';ctx.textBaseline='alphabetic';ctx.font='600 34px "Geist Mono", ui-monospace, monospace';ctx.fillStyle=combo>=10?'#ff5a36':'#ededed';ctx.fillText(combo,0,0);
    ctx.font='500 11px Geist, system-ui, sans-serif';ctx.fillStyle='#8f8f8f';ctx.fillText('seri',0,15);ctx.fillStyle='rgba(255,90,54,.8)';ctx.fillRect(-48*k,21,48*k,2);ctx.restore()}
  if(milestone){const a=(now-milestone.t)/1100;if(a>1)milestone=null;else{ctx.save();ctx.translate(W/2,H*.42);const sc=a<.15?.85+a/.15*.15:1;ctx.scale(sc,sc);ctx.globalAlpha=a<.65?1:1-(a-.65)/.35;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`600 ${Math.min(44,W*.1)}px "Geist Mono", ui-monospace, monospace`;ctx.fillStyle='#ededed';ctx.fillText(milestone.txt,0,0);ctx.fillStyle='#ff5a36';ctx.fillRect(-30,30,60,3);ctx.restore()}}
  energy*=.985}
let toastT;function toast(title,sub=''){const el=$('#toast');el.innerHTML='';const b=document.createElement('b');b.textContent=title;el.append(b);if(sub){const sm=document.createElement('small');sm.textContent=sub;el.append(sm)}el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>el.classList.remove('show'),2800)}
function confetti(x=W/2,y=H*.35){for(let i=0;i<26;i++){const a=Math.random()*Math.PI*2,s=2+Math.random()*5;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,life:1.1,hue:8+Math.random()*22,size:1.5+Math.random()*2.5})}}

/* ---------- şarkı modu ----------
   nota biçimi: "midi[:vuruş[:akor]]", "/" satır sonu. Sözler yoksa nota adları söylenir.
   Hepsi kamu malı (telifsiz) ezgiler. */
const SONGS=[
  {id:'twinkle',ad:'Küçük Yıldız',by:'Geleneksel',lv:1,bpm:92,
   n:'60::C 60 67::C 67 69::F 69 67:2:C / 65::F 65 64::C 64 62::G 62 60:2:C / 67::C 67 65::F 65 64::C 64 62:2:G / 67::C 67 65::F 65 64::C 64 62:2:G / 60::C 60 67::C 67 69::F 69 67:2:C / 65::F 65 64::C 64 62::G 62 60:2:C'},
  {id:'mary',ad:'Mary\'nin Kuzusu',by:'Geleneksel',lv:1,bpm:96,
   n:'64::C 62 60 62 64::C 64 64:2 / 62::G 62 62:2 64::C 67 67:2 / 64::C 62 60 62 64::C 64 64 64 / 62::G 62 64 62 60:4:C'},
  {id:'jacques',ad:'Frère Jacques',by:'Geleneksel',lv:1,bpm:100,
   n:'60::C 62 64 60 60 62 64 60 / 64::C 65 67:2 64 65 67:2 / 67:.5:C 69:.5 67:.5 65:.5 64 60 67:.5 69:.5 67:.5 65:.5 64 60 / 60::C 55::G 60:2:C 60 55::G 60:2:C'},
  {id:'ode',ad:'Neşeye Övgü',by:'Beethoven',lv:2,bpm:100,
   n:'64::C 64 65 67 67::G 65 64 62 / 60::C 60 62 64 64:1.5:G 62:.5 62:2 / 64::C 64 65 67 67::G 65 64 62 / 60::C 60 62 64 62:1.5:G 60:.5 60:2:C'},
  {id:'birthday',ad:'Mutlu Yıllar',by:'Geleneksel',lv:2,bpm:104,
   lyr:'Mut lu yıl lar sa na / Mut lu yıl lar sa na / Mut lu yıl lar sev gi li / Mut lu yıl lar sa na',
   n:'67:.75 67:.25 69::C 67 72 71:2:G / 67:.75 67:.25 69::G 67 74 72:2:C / 67:.75 67:.25 79::C 76 72 71::F 69:2 / 77:.75 77:.25 76::C 72 74::G 72:3:C'},
  {id:'jingle',ad:'Jingle Bells',by:'J. Pierpont',lv:3,bpm:120,
   n:'64::C 64 64:2 64 64 64:2 / 64 67 60:1.5 62:.5 64:4 / 65::F 65 65:1.5 65:.5 65 64::C 64 64:.5 64:.5 / 64::D 62 62 64 62:2:G 67:2 / 64::C 64 64:2 64 64 64:2 / 64 67 60:1.5 62:.5 64:4 / 65::F 65 65:1.5 65:.5 65 64::C 64 64:.5 64:.5 / 67::G 67 65 62 60:4:C'},
];
const CHORD_ROOT={C:0,D:2,E:4,F:5,G:7,A:9,B:11};
function parseSong(sg){const lines=sg.n.split('/'),lyr=sg.lyr?sg.lyr.split('/').map(l=>l.trim().split(/\s+/)):null,out=[];let b=0;
  lines.forEach((ln,li)=>ln.trim().split(/\s+/).forEach((tok,ti)=>{const[m,d,c]=tok.split(':');const beats=d?+d:1;out.push({m:+m+S.key*0,b,d:beats,c:c||null,line:li,w:lyr?lyr[li][ti]:null});b+=beats}));
  return out}
const SONG={on:false,sg:null,notes:[],i:0,pos:0,rate:1,wait:0,hits:0,miss:0,best:0,run:0,t0:0,end:0};
let userStrings=null;
function songStrings(){const ms=[...new Set(SONG.notes.map(n=>n.m))].sort((a,b)=>a-b);const t=topY()+50,b=botY()-112,x0=W*(W<640?.1:.16),x1=W*(W<640?.86:.84),n=ms.length;
  strings=ms.map((m,k)=>{const x=n>1?x0+(x1-x0)*k/(n-1):W/2;const s=mkString({x,y:t},{x,y:b});s.fixed=m;s.midi=m;return s})}
function songHitY(){const t=topY()+50,b=botY()-112;return t+(b-t)*.8}
function songOpen(){$('#songList').innerHTML='';let best={};try{best=JSON.parse(localStorage.getItem('tiniBest')||'{}')}catch(e){}
  for(const sg of SONGS){const li=document.createElement('li'),bt=document.createElement('button');bt.innerHTML=`<span class="t"><b></b><span></span></span><span class="lv">${'●'.repeat(sg.lv)}${'○'.repeat(3-sg.lv)}</span><span class="best">${best[sg.id]!=null?best[sg.id]+'%':''}</span><span class="pl"><svg><use href="#i-play"/></svg></span>`;
    bt.querySelector('b').textContent=sg.ad;bt.querySelector('.t span').textContent=sg.by;bt.onclick=()=>{$('#songs').hidden=true;songStart(sg.id)};li.append(bt);$('#songList').append(li)}
  $('#songs').hidden=false}
async function songStart(id){initAudio();const sg=SONGS.find(x=>x.id===id)||SONGS[0];S.song=sg.id;save();
  Object.assign(SONG,{on:true,sg,notes:parseSong(sg),i:0,rate:1,wait:0,hits:0,miss:0,best:0,run:0,t0:performance.now(),end:0,lastChord:null});
  SONG.pos=SONG.notes[0].b-4;songStrings();sideSt.clear();$('#result').hidden=true;
  if(S.songRec&&!(mrec&&mrec.state==='recording'))await startRec(S.songMic)}
function songChord(c,t){if(!c||!ac)return;const r=CHORD_ROOT[c[0]]+(c.includes('#')?1:0),minor=/m(?!aj)/.test(c.slice(1)),base=48+r;noRec=true;autoPlay=true;
  try{voice(base-12,.7,'bass',t,.9);[0,minor?3:4,7].forEach(x=>voice(base+x,.28,'pad',t,1.1))}finally{noRec=false;autoPlay=false}}
function songPluck(s,v,vel,t){const want=SONG.notes[SONG.i];ks(s.fixed,vel,t,s.id);s.v=Math.max(.12,Math.min(.88,v));s.amp=6+10*vel;buzz(8);
  if(!SONG.on||!want)return;
  if(s.fixed===want.m&&SONG.pos>=want.b-1.5){
    if(SONG.wait>.35)SONG.rate=Math.max(.55,SONG.rate*.9);else if(SONG.wait<.08)SONG.rate=Math.min(1,SONG.rate+.06);
    SONG.wait=0;SONG.pos=Math.max(SONG.pos,want.b);SONG.hits++;SONG.run++;SONG.best=Math.max(SONG.best,SONG.run);
    if(want.c&&want.c!==SONG.lastChord){SONG.lastChord=want.c;songChord(want.c,t)}else if(want.c)songChord(want.c,t);
    const y=songHitY();burst(s.a.x,y,12,14,.9,false);SONG.i++;
    if(SONG.i>=SONG.notes.length)songFinish()}
  else{SONG.miss++;SONG.run=0;combo=0;lastHit=0;s.shake=1}}
function songTick(dt){if(!SONG.on||S.mode!=='song')return;const want=SONG.notes[SONG.i];const adv=dt*SONG.sg.bpm/60*SONG.rate;
  if(want){if(SONG.pos+adv>=want.b){SONG.pos=want.b;SONG.wait+=dt}else SONG.pos+=adv}else SONG.pos+=adv}
function songFinish(){const sg=SONG.sg,acc=Math.round(100*SONG.hits/Math.max(1,SONG.hits+SONG.miss)),sec=Math.round((performance.now()-SONG.t0)/1000);SONG.on=false;SONG.end=performance.now();
  let best={};try{best=JSON.parse(localStorage.getItem('tiniBest')||'{}')}catch(e){}if(!(best[sg.id]>=acc)){best[sg.id]=acc;try{localStorage.setItem('tiniBest',JSON.stringify(best))}catch(e){}}
  ach('song');setTimeout(()=>{$('#resSong').textContent=sg.ad;$('#resTitle').textContent=acc>=95?'Kusursuz':acc>=80?'Çok iyi':'Bitti';$('#resAcc').textContent=acc+'%';$('#resCombo').textContent=SONG.best;$('#resTime').textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;$('#result').hidden=false;
    if(mrec&&mrec.state==='recording')stopRec()},900);confetti(W/2,songHitY())}
function drawSong(){
  if(!SONG.notes.length){ctx.save();ctx.textAlign='center';ctx.fillStyle='#bdbdbd';ctx.font='500 15px Geist, system-ui, sans-serif';ctx.fillText('Bir şarkı seç',W/2,H/2);ctx.restore();return}
  const hy=songHitY(),t=topY()+50,ppb=Math.max(46,Math.min(90,(hy-t)/5)),want=SONG.notes[SONG.i];
  ctx.save();
  // çizgi
  ctx.strokeStyle='rgba(255,255,255,.18)';ctx.lineWidth=1;ctx.setLineDash([3,6]);ctx.beginPath();ctx.moveTo(W*.05,hy);ctx.lineTo(W*.95,hy);ctx.stroke();ctx.setLineDash([]);
  // hedef tel
  if(want){const s=strings.find(x=>x.fixed===want.m);if(s){const pulse=SONG.pos>=want.b?.5+.5*Math.sin(performance.now()/120):.3;const g=ctx.createLinearGradient(s.a.x-20,0,s.a.x+20,0);g.addColorStop(0,'rgba(255,90,54,0)');g.addColorStop(.5,`rgba(255,90,54,${.12+pulse*.18})`);g.addColorStop(1,'rgba(255,90,54,0)');ctx.fillStyle=g;ctx.fillRect(s.a.x-20,s.a.y,40,s.b.y-s.a.y)}}
  // tel altındaki nota adları
  ctx.textAlign='center';ctx.textBaseline='top';ctx.font='500 12px "Geist Mono", ui-monospace, monospace';
  for(const s of strings){ctx.fillStyle=want&&s.fixed===want.m?'#ff5a36':'#7a7a7a';ctx.fillText(nameOf(s.fixed),s.b.x,s.b.y+10)}
  // süzülen notalar
  for(let k=SONG.i;k<Math.min(SONG.notes.length,SONG.i+10);k++){const n=SONG.notes[k],s=strings.find(x=>x.fixed===n.m);if(!s)continue;const y=hy-(n.b-SONG.pos)*ppb;if(y<t-20)break;
    const first=k===SONG.i,r=first?13:9,len=Math.max(0,n.d*ppb-14);
    ctx.fillStyle=first?'rgba(255,90,54,.22)':'rgba(255,255,255,.06)';rr(s.a.x-4,y-len,8,len,4);ctx.fill();
    ctx.fillStyle=first?'#ff5a36':'#2a2a2c';ctx.strokeStyle=first?'#ff5a36':'rgba(255,255,255,.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(s.a.x,y,r,0,7);ctx.fill();ctx.stroke();
    ctx.fillStyle=first?'#fff':'#bdbdbd';ctx.textBaseline='middle';ctx.font=`600 ${first?11:9}px Geist, system-ui, sans-serif`;ctx.fillText(nameOf(n.m).slice(0,3),s.a.x,y+.5)}
  // sözler (karaoke)
  const cur=want||SONG.notes[SONG.notes.length-1],line=SONG.notes.filter(n=>n.line===cur.line),ly=botY()-64;
  ctx.font='500 17px Geist, system-ui, sans-serif';ctx.textBaseline='middle';const words=line.map(n=>n.w||nameOf(n.m)),gap=10,widths=words.map(w=>ctx.measureText(w).width),tot=widths.reduce((a,b)=>a+b,0)+gap*(words.length-1),sc=Math.min(1,(W-32)/tot);
  ctx.save();ctx.translate(W/2-tot*sc/2,ly);ctx.scale(sc,sc);let x=0;line.forEach((n,k)=>{const idx=SONG.notes.indexOf(n);ctx.fillStyle=idx<SONG.i?'#ededed':idx===SONG.i?'#ff5a36':'#5f5f5f';ctx.textAlign='left';ctx.fillText(words[k],x,0);x+=widths[k]+gap});ctx.restore();
  // ilerleme ve hız
  const pr=SONG.i/SONG.notes.length;ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(W*.2,ly+18,W*.6,2);ctx.fillStyle='#ededed';ctx.fillRect(W*.2,ly+18,W*.6*pr,2);
  ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='500 11px "Geist Mono", ui-monospace, monospace';ctx.fillStyle='#7a7a7a';ctx.fillText(SONG.sg.ad+(SONG.rate<.98?`  ·  hız %${Math.round(SONG.rate*100)}`:''),12,topY()+18);
  ctx.restore();
  for(const s of strings)if(s.shake){s.shake*=.85;if(s.shake<.05)s.shake=0}
}

/* ---------- el takibi ---------- */
const EXT=.9,TIPS=[8,12,16,20],FCOL=['#ff5a36','#ededed','#b0b0b0','#7a7a7a'],FNAME=['İşaret','Orta','Yüzük','Serçe'];
const CON=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
let hands=[];const pinchSt={L:[false,false,false,false],R:[false,false,false,false]};const thOpen={R:false};
const padInside=new Map();const tipPrev={};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let mirror=true;
function toScreen(p){const vw=vid.videoWidth||640,vh=vid.videoHeight||480;const s=Math.max(W/vw,H/vh),dw=vw*s,dh=vh*s;return{x:(mirror?1-p.x:p.x)*dw+(W-dw)/2,y:p.y*dh+(H-dh)/2}}
let slots=[],handIdN=0;
function processHands(lms){
  // eller çaprazlansa bile rolleri (sol/sağ) korumak için önceki karelerle eşleştir
  const raw=lms.slice(0,2).map(lm=>{const pts=lm.map(toScreen);return{pts,cx:pts[9].x}});
  const next=[],free=[...slots];
  if(raw.length===2&&free.length===2&&dist(raw[0].pts[9],free[1].pts[9])+dist(raw[1].pts[9],free[0].pts[9])<dist(raw[0].pts[9],free[0].pts[9])+dist(raw[1].pts[9],free[1].pts[9]))free.reverse();
  for(const r of raw){if(free.length===2&&raw.length===2&&r===raw[0]){const s=free[0];if(dist(s.pts[9],r.pts[9])<W*.3){free.shift();r.pts=r.pts.map((p,i)=>({x:s.pts[i].x+(p.x-s.pts[i].x)*.78,y:s.pts[i].y+(p.y-s.pts[i].y)*.78}));r.role=s.role;r.id=s.id;next.push(r);continue}}let bi=-1,bd=W*.3;free.forEach((s,i)=>{const d=dist(s.pts[9],r.pts[9]);if(d<bd){bd=d;bi=i}});
    if(bi>=0){const s=free.splice(bi,1)[0];r.pts=r.pts.map((p,i)=>({x:s.pts[i].x+(p.x-s.pts[i].x)*.78,y:s.pts[i].y+(p.y-s.pts[i].y)*.78}));r.role=s.role;r.id=s.id}next.push(r)}
  const used=new Set(next.filter(r=>r.role).map(r=>r.role)),fresh=next.filter(r=>!r.role).sort((a,b)=>a.cx-b.cx);
  for(const r of fresh){if(!used.size&&fresh.length===1)r.role=S.mode==='theremin'?'R':(r.cx<W/2?'L':'R');else r.role=used.has('L')?'R':'L';used.add(r.role)}
  if(next.length===1&&S.mode!=='theremin'){const r=next[0];const busy=pinchSt[r.role].some(Boolean)||strPinch.has(r.role);if(!busy){if(r.role==='R'&&r.cx<W*.4)r.role='L';else if(r.role==='L'&&r.cx>W*.6)r.role='R'}}
  for(const r of next)if(!r.id)r.id=++handIdN;slots=next.map(r=>({pts:r.pts,role:r.role,id:r.id}));
  for(const h of next){h.size=dist(h.pts[0],h.pts[9])||1;h.pr=TIPS.map(t=>dist(h.pts[4],h.pts[t])/h.size);h.ext=TIPS.map(t=>dist(h.pts[0],h.pts[t])/h.size);h.open=TIPS.reduce((a,t)=>a+dist(h.pts[0],h.pts[t]),0)/4/h.size}
  hands=next;
  // parmak birleştirme
  for(const role of['L','R']){const h=hands.find(h=>h.role===role),st=pinchSt[role];let best=-1;
    if(h){let mn=9;h.pr.forEach((r,f)=>{if(r<mn){mn=r;best=f}})}
    for(let f=0;f<4;f++){const on=!!h&&S.mode==='chord'&&(st[f]?h.pr[f]<.52:(f===best&&h.pr[f]<.33&&h.ext[f]>EXT));
      if(on!==st[f]){st[f]=on;const p=h?{x:(h.pts[4].x+h.pts[TIPS[f]].x)/2,y:(h.pts[4].y+h.pts[TIPS[f]].y)/2}:null;on?pinchDown(role,f,p):pinchUp(role,f)}}
    if(h&&S.mode==='chord'&&role==='R')for(const f of[0,1])if(st[f]){const p={x:(h.pts[4].x+h.pts[TIPS[f]].x)/2,y:(h.pts[4].y+h.pts[TIPS[f]].y)/2};melMove('R'+f,zoneOf(p.y),p.x,p.y)}}
  // pad'ler: parmak uçları pad'e girince çalar
  if(S.mode==='pads'){const seen=new Set();hands.forEach(h=>[8,12].forEach(t=>{const k='d'+h.id+'_'+t,p=h.pts[t];seen.add(k);const i=padAt(p.x,p.y),was=padInside.get(k);const pp=tipPrev[k];const sp=pp?dist(pp,p)/h.size:0;tipPrev[k]=p;
    if(i>=0&&i!==was&&(was!==undefined||sp>.04))padHit(i,Math.max(0,Math.min(1,sp*2.5)));padInside.set(k,i)}));
    for(const k of[...padInside.keys()])if(!seen.has(k)&&!String(k).startsWith('p')){padInside.delete(k);delete tipPrev[k]}}
  if(S.mode==='strings'||S.mode==='song')stringHands();
}
function pinchDown(role,f,p){if(!ac)return;
  if(role==='L')chordOn(f,p.x,p.y);
  else{if(f===0)melOn('R0',zoneOf(p.y),false,p.x,p.y);else if(f===1)melOn('R1',zoneOf(p.y),true,p.x,p.y);else if(f===2){drum('snare',.9);burst(p.x,p.y,30,14)}else{drum('kick',1);burst(p.x,p.y,0,14);beatGlow=1}}}
function pinchUp(role,f){if(role==='L'){if(chordIdx===f)chordOff()}else if(f<2)melOff('R'+f)}

/* ---------- dokunma / fare ---------- */
const ptr=new Map();
cv.addEventListener('pointerdown',e=>{initAudio();cv.setPointerCapture(e.pointerId);const p={x:e.clientX,y:e.clientY};ptr.set(e.pointerId,p);
  if(S.mode==='pads'){const i=padAt(p.x,p.y);if(i>=0)padHit(i,.7);padInside.set('p'+e.pointerId,i)}
  else if(S.mode==='chord'){if(p.x<W/2){p.chord=chordAt(p.y);chordOn(p.chord,p.x,p.y)}else melOn('p'+e.pointerId,zoneOf(p.y),false,p.x,p.y)}
  else if(S.mode==='song'){p.px=p.x;p.py=p.y;p.kind='strum'}
  else if(S.mode==='strings'){const id='p'+e.pointerId;p.sx=p.x;p.sy=p.y;p.px=p.x;p.py=p.y;p.t0=performance.now();let ns;
    if(grabAt(p,28)){p.kind='grab';holdStart(id,p,28)}else if(ns=nearString(p,22)){p.kind='fret';p.fs=ns.s;ns.s.fret={k:id,u:ns.u}}else p.kind='pend'}});
cv.addEventListener('pointermove',e=>{const p=ptr.get(e.pointerId);if(!p)return;p.x=e.clientX;p.y=e.clientY;
  if(S.mode==='pads'){const i=padAt(p.x,p.y),was=padInside.get('p'+e.pointerId);if(i>=0&&i!==was)padHit(i,.6);padInside.set('p'+e.pointerId,i)}
  else if(S.mode==='chord'){if(p.chord!=null){const c=chordAt(p.y);if(c!==p.chord){p.chord=c;chordOn(c,p.x,p.y)}}else melMove('p'+e.pointerId,zoneOf(p.y),p.x,p.y)}
  else if(S.mode==='song'){const d=Math.hypot(p.x-p.px,p.y-p.py);strum({x:p.px,y:p.py},p,.4+d/45,'p'+e.pointerId);p.px=p.x;p.py=p.y}
  else if(S.mode==='strings'){const id='p'+e.pointerId;if(p.kind==='pend'&&Math.hypot(p.x-p.sx,p.y-p.sy)>12){p.kind='strum';p.px=p.sx;p.py=p.sy}
    if(p.kind==='fret'){const q=proj(p.fs,p);if(Math.abs(q.d)>30||q.u<0||q.u>1||!strings.includes(p.fs)){if(p.fs.fret&&p.fs.fret.k===id)p.fs.fret=null;p.kind='strum'}else p.fs.fret={k:id,u:Math.max(.04,Math.min(.96,q.u))}}
    if(p.kind==='strum'){const d=Math.hypot(p.x-p.px,p.y-p.py);strum({x:p.px,y:p.py},p,.35+d/45,id)}else if(p.kind==='make'||p.kind==='grab')holdMove(id,p);p.px=p.x;p.py=p.y}});
function pointerFrame(){if(S.mode!=='strings')return;const now=performance.now();for(const[id,p]of ptr)if(p.kind==='pend'&&now-p.t0>260){p.kind='make';holdStart('p'+id,{x:p.sx,y:p.sy},0);holdMove('p'+id,p);if(navigator.vibrate)navigator.vibrate(15)}}
function pUp(e){const p=ptr.get(e.pointerId);if(!p)return;ptr.delete(e.pointerId);padInside.delete('p'+e.pointerId);if(p.kind==='make'||p.kind==='grab')holdEnd('p'+e.pointerId);if(p.kind==='fret'&&p.fs.fret&&p.fs.fret.k==='p'+e.pointerId)p.fs.fret=null;if(S.mode==='chord'){if(p.chord!=null){if(chordIdx===p.chord)chordOff()}else melOff('p'+e.pointerId)}}
cv.addEventListener('pointerup',pUp);cv.addEventListener('pointercancel',pUp);

/* klavye: masaüstünde ekstra */
const KEYS={a:0,s:1,d:2,f:3},MK='hjkluıoü';
addEventListener('keydown',e=>{if(e.repeat||e.target.tagName==='SELECT')return;initAudio();const k=e.key.toLocaleLowerCase('tr');
  if(k in KEYS&&S.mode==='chord')chordOn(KEYS[k]);else if(MK.includes(k)&&S.mode==='chord')melOn('k'+k,MK.indexOf(k));else if(k===' '){e.preventDefault();drum('kick')}else if(k==='b')drum('snare')});
addEventListener('keyup',e=>{const k=e.key.toLocaleLowerCase('tr');if(k in KEYS){if(chordIdx===KEYS[k])chordOff()}else if(MK.includes(k))melOff('k'+k)});

/* ---------- çizim ---------- */
function rr(x,y,w,h,r){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h)}
function draw(now){
  ctx.fillStyle='#0a0a0b';ctx.fillRect(0,0,W,H);
  if(S.video&&vid.readyState>=2&&vid.videoWidth){const vw=vid.videoWidth,vh=vid.videoHeight,s=Math.max(W/vw,H/vh),dw=vw*s,dh=vh*s;ctx.save();ctx.globalAlpha=.5;if(mirror){ctx.translate(W,0);ctx.scale(-1,1)}ctx.drawImage(vid,(W-dw)/2,(H-dh)/2,dw,dh);ctx.restore()}
  const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.2,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'#0a0a0b00');g.addColorStop(1,'#0a0a0bdd');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(energy>.02){const eg=ctx.createRadialGradient(W/2,H*.6,0,W/2,H*.6,Math.max(W,H)*.7);eg.addColorStop(0,`rgba(255,90,54,${energy*.1})`);eg.addColorStop(1,'rgba(255,90,54,0)');ctx.fillStyle=eg;ctx.fillRect(0,0,W,H)}
  if(!$('#intro').hidden){drawDemo();drawParticles();return}
  // ritim ışığı
  while(flashQ.length&&ac&&flashQ[0].t<=ac.currentTime){const q=flashQ.shift();if(q.k)beatGlow=1;if(q.s!=null)beatStep=q.s}
  if(beatGlow>0){ctx.save();ctx.strokeStyle=`rgba(255,90,54,${beatGlow*.45})`;ctx.lineWidth=6*beatGlow;ctx.strokeRect(0,0,W,H);ctx.restore();beatGlow*=.88;if(beatGlow<.02)beatGlow=0}
  if(S.mode==='chord')drawChordMode();else if(S.mode==='pads')drawPads();else if(S.mode==='strings')drawStrings();else if(S.mode==='song'){drawStrings();drawSong()}else drawTheremin();
  drawHands();drawParticles();drawHUD();
  if(mrec&&mrec.state==='recording'){ctx.save();ctx.font='600 14px Geist, system-ui, sans-serif';ctx.textAlign='right';ctx.fillStyle='#ffffffaa';ctx.fillText('Tını',W-14,H-14);ctx.restore()}
  if(LOOP.state!=='off'&&ac){const now=ac.currentTime;let f,col;if(LOOP.state==='count'){f=1-(LOOP.start-now)/(LOOP.len/2);col='#ff5a36'}else{f=((now-LOOP.start)%LOOP.len)/LOOP.len;col={rec:'#ff5a36',play:'#3ecf8e',dub:'#f5a524'}[LOOP.state]}
    ctx.fillStyle=col;ctx.fillRect(0,3,W*Math.max(0,Math.min(1,f)),4);if(LOOP.state==='count'){const n=Math.ceil((LOOP.start-now)/(LOOP.len/8));if(n>0&&n<=4){ctx.save();ctx.fillStyle='#ffffffdd';ctx.font='700 90px Geist, system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n,W/2,H/2);ctx.restore()}}}
  if((S.beat||S.arp)&&beatStep>=0){const n=16,w=Math.min(240,W*.6),x0=(W-w)/2,y=botY()-2;for(let i=0;i<n;i++){ctx.fillStyle=i===beatStep?'#ff5a36':(i%4===0?'#ffffff55':'#ffffff22');ctx.fillRect(x0+i*w/n+1,y,w/n-2,3)}}
}
function drawChordMode(){
  const t=topY(),b=botY();
  ctx.save();ctx.strokeStyle='#ffffff18';ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(W/2,t);ctx.lineTo(W/2,b);ctx.stroke();ctx.restore();
  // sol: akorlar
  for(let i=0;i<4;i++){const r=chordRect(i),on=chordIdx===i;ctx.save();rr(r.x,r.y,r.w,r.h,16);ctx.fillStyle=on?FCOL[i]+'55':'#ffffff0c';ctx.fill();ctx.strokeStyle=on?FCOL[i]:'#ffffff22';ctx.lineWidth=on?2.5:1;ctx.stroke();
    if(on){ctx.shadowColor=FCOL[i];ctx.shadowBlur=25;ctx.stroke()}ctx.shadowBlur=0;
    const fs=Math.min(30,r.h*.38);ctx.fillStyle='#fff';ctx.font=`600 ${fs}px system-ui`;ctx.textBaseline='middle';ctx.fillText(CH[i].name,r.x+14,r.y+r.h*.42);
    ctx.font=`600 ${Math.min(12,r.h*.18)}px system-ui`;ctx.fillStyle=FCOL[i];ctx.fillText(FNAME[i]+' parmak',r.x+14,r.y+r.h*.42+fs*.8);ctx.restore()}
  // sağ: melodi bölgeleri
  const zh=(b-t)/Z,x0=W/2+10,active=new Set(Object.values(mel).map(m=>m.zone));
  for(let z=0;z<Z;z++){const y=b-(z+1)*zh,on=active.has(z),m=ZN[z];ctx.fillStyle=on?`hsla(${HUE(m)},100%,60%,.32)`:(z%2?'#ffffff07':'#ffffff03');ctx.fillRect(x0,y+1,W-x0-12,zh-2);
    ctx.fillStyle=on?'#fff':'#ffffff88';ctx.font=`${on?800:600} ${Math.min(16,zh*.42)}px system-ui`;ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(nameOf(m),W-22,y+zh/2);ctx.textAlign='left'}
  ctx.fillStyle='#ffffff55';ctx.font='600 11px Geist, system-ui, sans-serif';ctx.fillText('Melodi: elini yukarı aşağı götür',x0+4,t-6>60?t-8:t+12);
}
function drawPads(){const rs=padRects();rs.forEach((r,i)=>{const p=padInfo(i),f=padFlash[i];ctx.save();rr(r.x,r.y,r.w,r.h,18);ctx.fillStyle=`hsla(${p.hue},90%,${55+f*15}%,${.1+f*.55})`;ctx.fill();ctx.strokeStyle=`hsla(${p.hue},100%,70%,${.35+f*.6})`;ctx.lineWidth=1.5+f*2;if(f>.05){ctx.shadowColor=`hsl(${p.hue},100%,60%)`;ctx.shadowBlur=30*f}ctx.stroke();ctx.shadowBlur=0;
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${Math.min(22,r.w*.16,r.h*.25)}px system-ui`;ctx.fillText(p.label,r.x+r.w/2,r.y+r.h/2);ctx.restore();padFlash[i]*=.9})}
function drawTheremin(){
  const{t,b}=thArea(),lo=thLo(),cur=thInfo&&thInfo.lvl>.02?thInfo:null;
  const notes=scaleNotes(40,24+S.key).filter(n=>n>=lo-.01&&n<=lo+TH_RANGE+.01);
  ctx.save();ctx.textBaseline='middle';
  for(const n of notes){const y=thYOf(n),hot=cur&&Math.round(cur.target)===n,root=((n-S.key)%12+12)%12===0;
    ctx.strokeStyle=hot?'rgba(255,90,54,.55)':root?'rgba(255,255,255,.16)':'rgba(255,255,255,.07)';ctx.lineWidth=hot?1.5:1;ctx.beginPath();ctx.moveTo(52,y);ctx.lineTo(W-10,y);ctx.stroke();
    ctx.font=`${hot?600:500} 12px "Geist Mono", ui-monospace, monospace`;ctx.fillStyle=hot?'#ff5a36':root?'#bdbdbd':'#6f6f6f';ctx.textAlign='right';ctx.fillText(nameOf(n),44,y)}
  // ses düzeyi (sol el)
  const vh=b-t,lv=thLvl;ctx.fillStyle='rgba(255,255,255,.06)';rr(W-18,t,4,vh,2);ctx.fill();ctx.fillStyle='#ededed';rr(W-18,t+vh*(1-lv),4,vh*lv,2);ctx.fill();
  // iz
  const now=performance.now();
  for(let i=1;i<thTrail.length;i++){const a=thTrail[i-1],c=thTrail[i],age=(now-c.t)/1400;if(age>1)continue;const al=(1-age)*Math.min(1,c.l*1.4);if(al<.02)continue;
    ctx.strokeStyle=`rgba(255,90,54,${al*.5})`;ctx.lineWidth=2+c.l*14*(1-age);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke()}
  for(let i=1;i<thTrail.length;i++){const a=thTrail[i-1],c=thTrail[i],age=(now-c.t)/1400;if(age>1)continue;ctx.strokeStyle=`rgba(255,255,255,${(1-age)*.7*Math.min(1,c.l*1.4)})`;ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(c.x,c.y);ctx.stroke()}
  if(cur){const r=10+cur.lvl*18+cur.wig*8;const g=ctx.createRadialGradient(cur.x,cur.y,0,cur.x,cur.y,r*2.4);g.addColorStop(0,`rgba(255,90,54,${.35+cur.lvl*.4})`);g.addColorStop(1,'rgba(255,90,54,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(cur.x,cur.y,r*2.4,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(cur.x,cur.y,4,0,7);ctx.fill();
    // akort göstergesi
    const cx=W/2,cy=topY()+24,dev=Math.max(-1,Math.min(1,(cur.m-cur.target)*2));ctx.textAlign='center';ctx.fillStyle='#ededed';ctx.font='600 30px "Geist Mono", ui-monospace, monospace';ctx.fillText(nameOf(cur.target),cx,cy);
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(cx-60,cy+22,120,2);ctx.fillStyle='rgba(255,255,255,.4)';ctx.fillRect(cx-1,cy+18,2,10);ctx.fillStyle=Math.abs(dev)<.2?'#3ecf8e':'#ff5a36';ctx.beginPath();ctx.arc(cx+dev*60,cy+23,4,0,7);ctx.fill()}
  else if(!hands.length&&!ptr.size){ctx.textAlign='center';ctx.fillStyle='#bdbdbd';ctx.font='500 15px Geist, system-ui, sans-serif';ctx.fillText('Sağ elini aç ve yukarı aşağı gezdir',W/2,H/2-10);ctx.fillStyle='#7a7a7a';ctx.font='400 13px Geist, system-ui, sans-serif';ctx.fillText('Sol elin ses düzeyini ayarlar, yumruk yapınca susar',W/2,H/2+14)}
  ctx.restore();
}
function drawHands(){
  for(const h of hands){const P=h.pts;ctx.save();ctx.lineCap='round';const hc=h.role==='L'?'237,237,237':'255,90,54',lw=Math.max(2,h.size*.045),soft=S.mode==='strings'||S.mode==='song'||S.mode==='theremin';ctx.beginPath();for(const[a,b]of CON){ctx.moveTo(P[a].x,P[a].y);ctx.lineTo(P[b].x,P[b].y)}
    if(soft){ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=Math.max(1.5,lw*.6);ctx.stroke();
      ctx.globalCompositeOperation='lighter';for(const t of[8,12]){if(strPinch.has(h.role)&&t===12)continue;const p=P[t],r=Math.max(9,h.size*.13),gr=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.2);gr.addColorStop(0,t===8?'rgba(255,90,54,.85)':'rgba(255,255,255,.45)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(p.x,p.y,r*2.2,0,7);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,r*.38,0,7);ctx.fill()}
      ctx.globalCompositeOperation='source-over';if(h.pr[0]<.9){const on=strPinch.has(h.role);ctx.strokeStyle=on?'#fff':'#ffffff44';ctx.lineWidth=on?4:1.5;ctx.beginPath();ctx.moveTo(P[4].x,P[4].y);ctx.lineTo(P[8].x,P[8].y);ctx.stroke()}ctx.restore();continue}
    ctx.strokeStyle=`rgba(${hc},.22)`;ctx.lineWidth=lw*3.2;ctx.stroke();ctx.strokeStyle=`rgba(${hc},.9)`;ctx.lineWidth=lw;ctx.stroke();P.forEach((p,i)=>{ctx.fillStyle=TIPS.includes(i)?FCOL[TIPS.indexOf(i)]:i===4?'#fff':'#ffffffaa';ctx.beginPath();ctx.arc(p.x,p.y,TIPS.includes(i)||i===4?Math.max(4,h.size*.08):2.5,0,7);ctx.fill()});
    if(S.mode==='strings'&&h.pr[0]<.9){const on=strPinch.has(h.role);ctx.strokeStyle=on?'#fff':'#ffffff44';ctx.lineWidth=on?4:1.5;ctx.beginPath();ctx.moveTo(P[4].x,P[4].y);ctx.lineTo(P[8].x,P[8].y);ctx.stroke()}
    if(S.mode==='chord'){const st=pinchSt[h.role];TIPS.forEach((t,f)=>{const r=h.pr[f];if(r<.9){ctx.strokeStyle=st[f]?FCOL[f]:FCOL[f]+'44';ctx.lineWidth=st[f]?5:1.5;ctx.beginPath();ctx.moveTo(P[4].x,P[4].y);ctx.lineTo(P[t].x,P[t].y);ctx.stroke()}});
      ctx.fillStyle='#ffffffcc';ctx.font='600 12px Geist, system-ui, sans-serif';ctx.textAlign='center';ctx.fillText(h.role==='L'?'Akor':'Melodi',P[0].x,P[0].y+22)}
    ctx.restore()}
}
let demoAmp=[],demoPrev=-1;
function drawDemo(){const tt=performance.now()/1000,n=W<640?6:9,x0=W*.12,x1=W*.88,cy=H*.5,sw=(tt*.42)%1.5,fx=x0-30+(x1-x0+60)*Math.min(1,sw),fy=cy+Math.sin(tt*2.3)*H*.08;
  ctx.save();ctx.lineCap='round';
  for(let k=0;k<n;k++){const x=x0+(x1-x0)*k/(n-1),L=H*(.62-.3*k/(n-1)),hue=12;demoAmp[k]=(demoAmp[k]||0)*.95;
    if(sw<1&&demoPrev<x&&fx>=x){demoAmp[k]=12;for(let i=0;i<6;i++)parts.push({x,y:fy,vx:(Math.random()-.5)*2,vy:-Math.random()*2,life:1,hue:16,size:1.5+Math.random()*2})}
    const a=demoAmp[k],N=24;ctx.beginPath();for(let i=0;i<=N;i++){const f=i/N,o=a*Math.sin(Math.PI*f)*Math.cos(tt*50+k),y=cy-L/2+L*f;i?ctx.lineTo(x+o,y):ctx.moveTo(x+o,y)}
    ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`hsla(${hue},100%,62%,${.18+a/40})`;ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle=a>1?'#fff':'rgba(255,255,255,.75)';ctx.lineWidth=2;ctx.stroke()}
  demoPrev=sw<1?fx:-1;if(sw<1){const gr=ctx.createRadialGradient(fx,fy,0,fx,fy,26);gr.addColorStop(0,'rgba(255,90,54,.9)');gr.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gr;ctx.beginPath();ctx.arc(fx,fy,26,0,7);ctx.fill()}
  ctx.restore()}
function drawParticles(){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=p.ring?.03:.022;if(p.life<=0){parts.splice(i,1);continue}
  if(p.ring){p.r+=5;ctx.strokeStyle=`hsla(${p.hue},100%,65%,${p.life})`;ctx.lineWidth=3*p.life;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,7);ctx.stroke()}
  else{p.x+=p.vx;p.y+=p.vy;p.vy+=.05;p.vx*=.98;ctx.fillStyle=`hsla(${p.hue},100%,65%,${p.life})`;ctx.beginPath();ctx.arc(p.x,p.y,p.size*p.life,0,7);ctx.fill()}}
  if(parts.length>600)parts.splice(0,parts.length-600);ctx.restore()}
function drawWave(){if(!analyser)return;analyser.getByteTimeDomainData(waveData);const y0=botY()+(H-botY())*.18,amp=20;ctx.save();ctx.strokeStyle='#ffffff40';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<waveData.length;i+=4){const x=i/waveData.length*W,y=y0+(waveData[i]-128)/128*amp;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}ctx.stroke();ctx.restore()}

/* ---------- kamera + model ---------- */
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
  initAudio();hello();keepAwake();$('#intro').hidden=true;document.body.classList.remove('intro');renderTut();if(S.mode==='song')songOpen();
  if(withCam){status('Kamera açılıyor…');try{await startCam()}catch(e){camOn=false;status('Kamera açılamadı. Ekrana dokunarak çalabilirsin.');setTimeout(()=>status(''),5000);showHelp();return}
    if(!landmarker){status('El takibi yükleniyor…');const ok=await modelP;if(!ok){status('El takibi yüklenemedi. Bağlantını kontrol et.');return}}
    unlockAudio();renderTut();if(S.mode!=='song')status('Ellerini kameraya göster');setTimeout(()=>{if($('#status').textContent.startsWith('Ellerini'))status('')},4000)}
  if(S.mode!=='song')showHelp();
}
function loop(){
  requestAnimationFrame(loop);
  if(camOn&&landmarker&&vid.readyState>=2&&vid.currentTime!==lastVT){lastVT=vid.currentTime;try{const t0=performance.now(),r=landmarker.detectForVideo(vid,t0);detMs=detMs*.9+(performance.now()-t0)*.1;detN++;processHands(r.landmarks||[])}catch(e){}}
  const nowT=performance.now(),dt=Math.min(.1,(nowT-(loop.t||nowT))/1000);loop.t=nowT;
  thereminFrame();pointerFrame();if(S.mode==='strings')bendRings();songTick(dt);draw();
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
  song:['Şarkı',`<p>Bir şarkı seç. Notalar tellerin üzerinden süzülür; çizgiye geldiğinde o teli çal.</p><dl>
    <dt>Akış</dt><dd>Şarkı seni bekler. Geç kalırsan yavaşlar, rahatladıkça hızlanır.</dd>
    <dt>Söyle</dt><dd>Alttaki heceleri takip ederek birlikte söyleyebilirsin.</dd>
    <dt>Kayıt</dt><dd>Şarkı listesinden videoya kaydı ve mikrofonu açabilirsin.</dd></dl>`],
  theremin:['Theremin',`<p>Hiçbir şeye dokunmadan, havada çalınan bir enstrüman.</p><dl>
    <dt>Sağ el</dt><dd>Yükseklik notayı belirler. Elini hafifçe titretirsen ses titrer (vibrato). Sağa götürdükçe ses parlaklaşır.</dd>
    <dt>Sol el</dt><dd>Yükseklik ses düzeyini belirler. Yumruk yaparsan ses kesilir; notaları böyle ayırabilirsin.</dd>
    <dt>Tek el</dt><dd>Sadece sağ elinle de çalabilirsin. Yumruk yapınca susar.</dd></dl>
    <p>Ayarlardan gama oturtmayı kapatırsan sesler arasında serbestçe kayarsın.</p>`],
  chord:['Akor',`<dl>
    <dt>Sol el</dt><dd>Başparmağını işaret, orta, yüzük ya da serçe parmağına değdir. Her biri bir akor çalar.</dd>
    <dt>Sağ el</dt><dd>Elinin yüksekliği notayı seçer. İşaret parmağı nota, orta parmak iki sesli nota çalar. Yüzük trampet, serçe bas davul.</dd></dl>
    <p>Arpej açıkken akorlar ritimle çözülür. Klavyede A S D F akor, H J K L U I O Ü melodi çalar.</p>`],
  pads:['Pad',`<p>Parmak ucunu bir pad'in içine sok. Hızlı vurursan daha güçlü çalar.</p><dl>
    <dt>Üst sıra</dt><dd>Davul sesleri</dd><dt>İkinci sıra</dt><dd>Akorlar</dd><dt>Alt sıralar</dt><dd>Notalar</dd></dl>`],
};
function showHelp(){const[t,b]=HELP[S.mode];$('#helpTitle').textContent=t;$('#helpBody').innerHTML=b;$('#help').hidden=false}
function setMode(m){const prev=S.mode;releaseAll();
  if(prev==='song'&&m!=='song'){SONG.on=false;SONG.notes=[];loadStrings()}
  S.mode=m;save();document.querySelectorAll('#modes button').forEach(b=>b.classList.toggle('on',b.dataset.mode===m));
  $('#arpBtn').hidden=m!=='chord'&&m!=='pads';$('#tools').hidden=m!=='strings';$('#songsBtn').hidden=m!=='song';$('#beatBtn').hidden=m==='song';$('#loopBtn').hidden=m==='song';if(m==='song')$('#loopClr').hidden=true;else loopUI();
  if(m==='song'&&prev!=='song'){strings=[];SONG.notes=[];if(!$('#intro').hidden)songStart(S.song)}
  visited.add(m);if(visited.size>=5)ach('explorer');renderTut()}
const visited=new Set();
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{initAudio();const m=b.dataset.mode;if(m===S.mode&&m!=='song')return;setMode(m);
  if(m==='song'){songOpen();return}if(!localStorage.getItem('seen_'+m)){try{localStorage.setItem('seen_'+m,1)}catch(e){}showHelp()}});
$('#songsBtn').onclick=()=>songOpen();$('#resAgain').onclick=()=>{$('#result').hidden=true;songStart(S.song)};$('#resList').onclick=()=>{$('#result').hidden=true;songOpen()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{$('#'+b.dataset.close).hidden=true;if(b.dataset.close==='saved'){const v=$('#prev');v.pause()}});
$('#helpBtn').onclick=showHelp;$('#soundBtn').onclick=()=>{initAudio();unlockAudio();setTimeout(()=>{audioOK();hello()},200)};$('#setBtn').onclick=()=>{$('#settings').hidden=false};
$('#startBtn').onclick=()=>start(true);$('#noCamBtn').onclick=()=>start(false);
$('#beatBtn').onclick=e=>{initAudio();S.beat=!S.beat;e.currentTarget.classList.toggle('on',S.beat);if(!S.beat)beatStep=-1};
$('#arpBtn').onclick=e=>{initAudio();S.arp=!S.arp;e.currentTarget.classList.toggle('on',S.arp);if(chordIdx>=0){const i=chordIdx;chordOff();chordOn(i)}};
$('#flipBtn').onclick=async()=>{S.facing=S.facing==='user'?'environment':'user';save();if(camOn){try{await startCam()}catch(e){status('Diğer kamera açılamadı');S.facing=S.facing==='user'?'environment':'user';try{await startCam()}catch(_){}}}};
const opt=(sel,obj,val)=>{sel.innerHTML=Object.entries(obj).filter(([,v])=>!v.hide).map(([k,v])=>`<option value="${k}">${v.ad}</option>`).join('');sel.value=val};
$('#keySel').innerHTML=NN.map((n,i)=>`<option value="${i}">${n}</option>`).join('');$('#keySel').value=S.key;
opt($('#scaleSel'),SCALES,S.scale);opt($('#instSel'),INST,S.inst);opt($('#styleSel'),STYLES,S.style);
$('#keySel').onchange=e=>{releaseAll();S.key=+e.target.value;rebuild();retune();save()};
$('#scaleSel').onchange=e=>{releaseAll();S.scale=e.target.value;rebuild();retune();save()};
$('#instSel').onchange=e=>{releaseAll();S.inst=e.target.value;save();initAudio();tap(60+S.key,.8)};
$('#styleSel').onchange=e=>{S.style=e.target.value;save()};
const bpm=$('#bpm');bpm.value=S.bpm;$('#bpmVal').textContent=S.bpm+' BPM';bpm.oninput=()=>{S.bpm=+bpm.value;if(LOOP.state!=='off'){loopClear();status('Tempo değişti, döngü silindi');setTimeout(()=>status(''),2000)}$('#bpmVal').textContent=S.bpm+' BPM';if(delayNode)delayNode.delayTime.setTargetAtTime(60/S.bpm*.75,ac.currentTime,.1);save()};
const rev=$('#rev');rev.value=S.reverb;rev.oninput=()=>{S.reverb=+rev.value;if(revSend)revSend.gain.value=S.reverb;save()};
const vol=$('#vol');vol.value=S.vol;vol.oninput=()=>{S.vol=+vol.value;if(master)master.gain.value=S.vol;save()};
const tog=(el,k)=>{el.classList.toggle('on',S[k]);el.onclick=()=>{S[k]=!S[k];el.classList.toggle('on',S[k]);save()}};tog($('#quantTog'),'quant');tog($('#micTog'),'mic');tog($('#songRecTog'),'songRec');tog($('#songMicTog'),'songMic');tog($('#strQuantTog'),'strQuant');$('#strQuantTog').addEventListener('click',()=>retune());
$('#toneSel').value=S.strTone;$('#toneSel').onchange=e=>{S.strTone=e.target.value;save();initAudio();ks(55+S.key,.8)};
$('#tutSkip').onclick=()=>{tut=TUT.length;try{localStorage.setItem('havaTut',tut)}catch(e){}renderTut()};tog($('#videoTog'),'video');
loadStrings();
let lastW=W,lastH=H;addEventListener('resize',()=>{const fx=W/lastW,fy=H/lastH;if(fx!==1||fy!==1){strings.forEach(s=>{s.a={x:s.a.x*fx,y:s.a.y*fy};s.b={x:s.b.x*fx,y:s.b.y*fy}});retune();lastW=W;lastH=H}});
$('#tUndo').onclick=()=>{initAudio();const s=strings.pop();if(s)burst((s.a.x+s.b.x)/2,(s.a.y+s.b.y)/2,0,14);saveStrings()};
$('#tClear').onclick=()=>{strings=[];saveStrings()};
$('#tHarp').onclick=()=>{initAudio();harpPreset()};
$('#loopBtn').onclick=loopPress;$('#loopClr').onclick=loopClear;
let wake=null;async function keepAwake(){try{if(navigator.wakeLock&&!document.hidden)wake=await navigator.wakeLock.request('screen')}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&camOn)keepAwake()});
setMode(S.mode);
if(location.search.includes('debug'))window.__ho={get strings(){return strings},LOOP,get hands(){return hands},get tut(){return tut},get notes(){return noteCount},get det(){return[detN,detMs.toFixed(1)]},level(){if(!analyser)return -1;analyser.getByteTimeDomainData(waveData);let m=0;for(const v of waveData)m=Math.max(m,Math.abs(v-128));return m},get ac(){return ac&&ac.state},plog,SONG,get th(){return thInfo}};

/* ---------- kayıt (video + istenirse mikrofon) ---------- */
let mrec=null,chunks=[],recStart=0,recTimer,micStream=null,micNode=null;
async function micOn(){if(micNode)return true;if(!ac||!recDest||!navigator.mediaDevices?.getUserMedia)return false;
  try{micStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    micNode=ac.createMediaStreamSource(micStream);const g=ac.createGain();g.gain.value=1.4;micNode.connect(g);g.connect(recDest);micNode._g=g;return true}
  catch(e){status('Mikrofon açılamadı');setTimeout(()=>status(''),2500);return false}}
function micOff(){if(micNode){try{micNode._g.disconnect();micNode.disconnect()}catch(e){}micNode=null}if(micStream){micStream.getTracks().forEach(t=>t.stop());micStream=null}
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(e){}unlockAudio()}
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
    $('#saved').hidden=false;ach('video')};
  mrec.start(500);recStart=Date.now();$('#rec').classList.add('live');
  const upd=()=>{const s=Math.floor((Date.now()-recStart)/1000);status(`${micNode?'Kayıt · mikrofon açık':'Kayıt'}  ${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`)};upd();recTimer=setInterval(upd,500)}
function stopRec(){if(mrec&&mrec.state==='recording')mrec.stop()}
$('#rec').onclick=()=>{if(mrec&&mrec.state==='recording')stopRec();else startRec()};

document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseAll()});
