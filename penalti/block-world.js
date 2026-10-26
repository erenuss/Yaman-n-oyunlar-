(()=>{
'use strict';
const C=window.BlockCore,$=id=>document.getElementById(id),canvas=$('bw-canvas'),stage=$('bw-stage'),STORE='yaman-block-world-v1';
if(!C||!canvas)return;
let active=false,ready=false,gl,program,lineProgram,buffer,lineBuffer,texture,vertexCount=0,world,player,mode='valley',selected=1,keys=new Set(),drag=null,frameId=0,last=0,elapsed=0,dirty=false,noticeUntil=0,currentHit=null;
let saved={version:1,mode:'valley',worlds:{valley:{edits:{},stats:{broken:0,placed:0,camps:[]}},trench:{edits:{},stats:{broken:0,placed:0,camps:[]}}}};
try{const raw=localStorage.getItem(STORE);if(raw&&raw.length<1200000){const s=JSON.parse(raw);if(s.version===1&&s.worlds&&typeof s.worlds==='object'){for(const m of ['valley','trench']){const src=s.worlds[m];if(!src||typeof src!=='object')continue;const st=src.stats||{};saved.worlds[m]={edits:src.edits||{},player:src.player,stats:{broken:Number.isSafeInteger(st.broken)&&st.broken>=0?st.broken:0,placed:Number.isSafeInteger(st.placed)&&st.placed>=0?st.placed:0,camps:Array.isArray(st.camps)?[...new Set(st.camps.filter(n=>Number.isInteger(n)&&n>=0&&n<3))]:[]}};}if(['valley','trench'].includes(s.mode))saved.mode=s.mode;}}}catch{}
const FACE=[
 {n:[1,0,0],p:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],s:.80},
 {n:[-1,0,0],p:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],s:.68},
 {n:[0,1,0],p:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],s:1},
 {n:[0,-1,0],p:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],s:.46},
 {n:[0,0,1],p:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],s:.90},
 {n:[0,0,-1],p:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],s:.74}
];
function message(text){$('bw-message').textContent=text;noticeUntil=performance.now()+2600;}
function compile(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
function makeProgram(v,f){const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,v));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
function atlas(){
 const a=document.createElement('canvas');a.width=256;a.height=16;const t=a.getContext('2d'),base=['#79b943','#93673d','#97643a','#8d959c','#9e7040','#b48b53','#458c40','#e6ce8d','#ad5842','#e0b335','#f3f8fc'];
 let seed=19417;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 base.forEach((color,i)=>{t.fillStyle=color;t.fillRect(i*16,0,16,16);for(let y=0;y<16;y+=2)for(let x=0;x<16;x+=2){t.fillStyle=random()>.5?'rgba(255,255,255,.12)':'rgba(0,0,0,.11)';t.fillRect(i*16+x,y,2,2);}if(i===1){t.fillStyle='#70a73a';t.fillRect(i*16,0,16,4);for(let x=0;x<16;x+=3)t.fillRect(i*16+x,4,2,2);}if(i===4){t.fillStyle='#644725';for(let x=2;x<16;x+=5)t.fillRect(i*16+x,0,2,16);}if(i===5){t.strokeStyle='#79582f';t.lineWidth=1;for(let n=2;n<=6;n+=2)t.strokeRect(i*16+n,n,16-n*2,16-n*2);}if(i===8){t.fillStyle='#dac3a1';t.fillRect(i*16,7,16,1);t.fillRect(i*16,15,16,1);t.fillRect(i*16+7,0,1,8);t.fillRect(i*16+3,8,1,8);}if(i===9){t.fillStyle='#fff1a5';t.fillRect(i*16+3,3,3,3);t.fillRect(i*16+10,8,3,4);}});
 texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,a);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
}
function initialize(){
 gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'high-performance'});
 if(!gl)throw Error('WebGL kullanılamıyor');
 program=makeProgram('attribute vec3 a_pos;attribute vec2 a_uv;attribute float a_light;uniform mat4 u_matrix;uniform vec3 u_eye;varying vec2 v_uv;varying float v_light;varying float v_dist;void main(){gl_Position=u_matrix*vec4(a_pos,1.0);v_uv=a_uv;v_light=a_light;v_dist=distance(a_pos,u_eye);}',
 'precision mediump float;uniform sampler2D u_tex;varying vec2 v_uv;varying float v_light;varying float v_dist;void main(){vec3 c=texture2D(u_tex,v_uv).rgb*v_light;float fog=smoothstep(24.0,58.0,v_dist);gl_FragColor=vec4(mix(c,vec3(.57,.78,.89),fog),1.0);}');
 lineProgram=makeProgram('attribute vec3 a_pos;uniform mat4 u_matrix;void main(){gl_Position=u_matrix*vec4(a_pos,1.0);}','precision mediump float;void main(){gl_FragColor=vec4(.12,.19,.12,1.0);}');
 buffer=gl.createBuffer();lineBuffer=gl.createBuffer();atlas();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.57,.78,.89,1);
 loadWorld(saved.mode);ready=true;$('bw-error').hidden=true;
}
function addFace(out,x,y,z,f,tile,sx=1,sy=1,sz=1){
 const uv=[[0,1],[0,0],[1,0],[1,1]];
 for(const i of [0,1,2,0,2,3]){const p=f.p[i];out.push(x+p[0]*sx,y+p[1]*sy,z+p[2]*sz,(tile*16+.1+uv[i][0]*15.8)/256,(.1+uv[i][1]*15.8)/16,f.s);}
}
function mesh(){
 const vertices=[],tiles=[0,1,2,3,4,6,7,8,9];
 for(let y=0;y<C.H;y++)for(let z=0;z<C.D;z++)for(let x=0;x<C.W;x++){
  const v=C.get(world,x,y,z);if(!v)continue;
  for(const f of FACE){if(y===0&&f.n[1]===-1)continue;if(!C.get(world,x+f.n[0],y+f.n[1],z+f.n[2])){let tile=tiles[v];if(v===1&&f.n[1]===1)tile=0;if(v===1&&f.n[1]===-1)tile=2;if(v===4&&f.n[1]!==0)tile=5;addFace(vertices,x,y,z,f,tile);}}
 }
 for(const [x,y,z,sx,sz] of [[5,22,6,9,4],[27,24,13,12,5],[29,22,36,8,3]])for(const f of FACE)addFace(vertices,x,y,z,f,10,sx,.7,sz);
 vertexCount=vertices.length/6;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.STATIC_DRAW);
}
function loadWorld(next){
 mode=next==='trench'?'trench':'valley';saved.mode=mode;const entry=saved.worlds[mode];world=C.generate(mode);entry.edits=C.applyEdits(world,entry.edits);player=C.safeSpawn(world,mode);
 const p=entry.player;if(p&&['x','y','z','yaw','pitch'].every(k=>Number.isFinite(p[k]))&&Math.abs(p.yaw)<1e6&&Math.abs(p.pitch)<=1.4){const candidate={...player,...p,vy:0,grounded:false};if(!C.collides(world,candidate))player=candidate;}
 $('bw-world').value=mode;keys.clear();drag=null;mesh();updateHud();dirty=true;save();message(mode==='trench'?'Siper alanı açıldı. Üç kampı keşfet!':'Dünyan hazır! WASD ile yürü, sürükleyerek etrafına bak.');
}
function updateHud(){
 const s=saved.worlds[mode].stats;$('bw-stats').textContent=s.broken+' kırılan · '+s.placed+' yerleştirilen';
 $('bw-quest').textContent=mode==='trench'?'Keşfedilen kamp: '+s.camps.length+' / 3':'Yaratıcı mod · Sınırsız blok';
 $('bw-selected').textContent=C.names[selected];document.querySelectorAll('[data-block]').forEach(b=>{const on=Number(b.dataset.block)===selected;b.classList.toggle('chosen',on);b.setAttribute('aria-pressed',String(on));});
}
function save(){
 if(!world||!player)return;
 saved.worlds[mode].player={x:player.x,y:player.y,z:player.z,yaw:player.yaw%(Math.PI*2),pitch:player.pitch};
 try{localStorage.setItem(STORE,JSON.stringify(saved));$('bw-save').textContent='Bu tarayıcıda kaydedildi';dirty=false;}catch{$('bw-save').textContent='Kayıt kullanılamıyor';}
}
function eye(){return [player.x,player.y+1.62,player.z];}
function edit(place){
 if(!active||!ready||$('modal')?.open)return;
 const h=C.ray(world,eye(),C.direction(player));if(!h){message('Biraz yaklaş ve nişangâhı bir bloğa getir.');return;}
 let x=h.x,y=h.y,z=h.z,v=0;
 if(place){[x,y,z]=[h.x+h.normal[0],h.y+h.normal[1],h.z+h.normal[2]];if(!C.canPlace(world,player,x,y,z)){message('Buraya blok koyamazsın; bir adım geri çekil.');return;}v=selected;}
 else if(y===0){message('Dünyanın temel bloğu kırılmaz.');return;}
 const i=C.idx(x,y,z),entry=saved.worlds[mode];if(!(i in entry.edits)&&Object.keys(entry.edits).length>=12000){message('Bu dünyadaki kayıt sınırına ulaştın. Diğer haritada devam edebilirsin.');return;}
 C.put(world,x,y,z,v);entry.edits[i]=v;entry.stats[place?'placed':'broken']++;mesh();updateHud();dirty=true;save();message(C.names[place?selected:h.type]+(place?' yerleştirildi.':' kırıldı.'));
}
function matrix(){
 const aspect=canvas.width/canvas.height,f=1/Math.tan(72*Math.PI/360),near=.06,far=100;
 const p=new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
 const e=eye(),d=C.direction(player),r=[Math.cos(player.yaw),0,Math.sin(player.yaw)],u=[-Math.sin(player.yaw)*Math.sin(player.pitch),Math.cos(player.pitch),Math.cos(player.yaw)*Math.sin(player.pitch)];
 const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 const v=[r[0],u[0],-d[0],0,r[1],u[1],-d[1],0,r[2],u[2],-d[2],0,-dot(r,e),-dot(u,e),dot(d,e),1],m=new Float32Array(16);
 for(let c=0;c<4;c++)for(let row=0;row<4;row++)for(let k=0;k<4;k++)m[c*4+row]+=p[k*4+row]*v[c*4+k];
 return m;
}
function resize(){const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;const scale=Math.min(devicePixelRatio||1,1.5,Math.sqrt(1400000/(r.width*r.height)));const w=Math.max(1,Math.floor(r.width*scale)),h=Math.max(1,Math.floor(r.height*scale));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}}
function render(){
 resize();gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const m=matrix();gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
 const attributes=[['a_pos',3,0],['a_uv',2,12],['a_light',1,20]];
 for(const [name,size,offset] of attributes){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,24,offset);}
 gl.uniformMatrix4fv(gl.getUniformLocation(program,'u_matrix'),false,m);gl.uniform3fv(gl.getUniformLocation(program,'u_eye'),eye());gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(gl.getUniformLocation(program,'u_tex'),0);gl.drawArrays(gl.TRIANGLES,0,vertexCount);
 currentHit=C.ray(world,eye(),C.direction(player));
 if(currentHit){
  const h=currentHit,b=[h.x-.005,h.y-.005,h.z-.005],pts=[[0,0,0],[1,0,0],[1,0,1],[0,0,1],[0,1,0],[1,1,0],[1,1,1],[0,1,1]],data=[];
  for(const [a,c] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]])for(const i of [a,c])data.push(...pts[i].map((v,k)=>b[k]+v*1.01));
  gl.useProgram(lineProgram);gl.bindBuffer(gl.ARRAY_BUFFER,lineBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.DYNAMIC_DRAW);
  // Disable unused mesh attributes before drawing the shorter outline buffer.
  for(const [name] of attributes)gl.disableVertexAttribArray(gl.getAttribLocation(program,name));
  const a=gl.getAttribLocation(lineProgram,'a_pos');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,12,0);gl.uniformMatrix4fv(gl.getUniformLocation(lineProgram,'u_matrix'),false,m);gl.drawArrays(gl.LINES,0,24);
 }
}
function frame(time){
 if(!active)return;frameId=requestAnimationFrame(frame);const dt=Math.min((time-last)/1000,.05);last=time;if(document.hidden||$('modal')?.open){keys.clear();return;}
 if(keys.has('arrowleft'))player.yaw-=dt*1.7;if(keys.has('arrowright'))player.yaw+=dt*1.7;if(keys.has('arrowup'))player.pitch=Math.min(1.35,player.pitch+dt*1.2);if(keys.has('arrowdown'))player.pitch=Math.max(-1.35,player.pitch-dt*1.2);
 C.physics(world,player,{forward:Number(keys.has('w'))-Number(keys.has('s')),strafe:Number(keys.has('d'))-Number(keys.has('a')),jump:keys.has(' '),sprint:keys.has('shift')},dt);
 elapsed+=dt;if(elapsed>.25){elapsed=0;$('bw-position').textContent='X '+player.x.toFixed(1)+' · Y '+player.y.toFixed(1)+' · Z '+player.z.toFixed(1);
 if(mode==='trench'){const camps=saved.worlds[mode].stats.camps;[[11,12],[24,24],[37,12]].forEach(([x,z],i)=>{if(!camps.includes(i)&&Math.hypot(player.x-x,player.z-z)<3.3){camps.push(i);dirty=true;message(camps.length===3?'Üç kampı da keşfettin! Şimdi kendi üssünü kur.':'Kamp keşfedildi! '+camps.length+' / 3');updateHud();}});}
 if(time>noticeUntil)$('bw-message').textContent=currentHit?'Hedef: '+C.names[currentHit.type]+' · Sol tık / Q: kır · Sağ tık / E: koy':'WASD: yürü · Fareyi sürükle: bak · Boşluk: zıpla';
 }
 if(Math.floor(time/3000)!==Math.floor((time-dt*1000)/3000))save();
 render();
}
function setActive(on){
 if(active===on)return;active=on;
 if(!on){cancelAnimationFrame(frameId);keys.clear();drag=null;if(document.pointerLockElement===canvas)document.exitPointerLock();if(ready)save();return;}
 try{if(!ready)initialize();last=performance.now();frameId=requestAnimationFrame(frame);canvas.focus({preventScroll:true});}
 catch(e){active=false;$('bw-error').hidden=false;$('bw-error').textContent='3D görüntü açılamadı. Tarayıcıda donanım hızlandırmayı açıp sayfayı yenile.';console.error('Blok dünyası:',e);}
}
function look(dx,dy){player.yaw+=dx*.004;player.pitch=Math.max(-1.35,Math.min(1.35,player.pitch-dy*.004));}
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{if(!active)return;e.preventDefault();canvas.focus({preventScroll:true});if(e.button===2){edit(true);return;}if(document.pointerLockElement===canvas){if(e.button===0)edit(false);return;}drag={id:e.pointerId,x:e.clientX,y:e.clientY,moved:0,touch:e.pointerType==='touch'};try{canvas.setPointerCapture(e.pointerId);}catch{}});
canvas.addEventListener('pointermove',e=>{if(!active||!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.moved+=Math.abs(dx)+Math.abs(dy);look(dx,dy);drag.x=e.clientX;drag.y=e.clientY;});
canvas.addEventListener('pointerup',e=>{if(drag&&drag.id===e.pointerId){if(drag.moved<5&&!drag.touch&&e.button===0)edit(false);drag=null;}});
canvas.addEventListener('pointercancel',()=>drag=null);
document.addEventListener('mousemove',e=>{if(active&&document.pointerLockElement===canvas)look(e.movementX*.6,e.movementY*.6);});
document.addEventListener('pointerlockchange',()=>{$('bw-mouse').textContent=document.pointerLockElement===canvas?'Fareyi bırak (Esc)':'Fareyi kilitle';drag=null;keys.clear();});
canvas.addEventListener('wheel',e=>{if(!active)return;e.preventDefault();selected=(selected-1+(e.deltaY>0?1:7))%8+1;updateHud();},{passive:false});
document.addEventListener('keydown',e=>{
 if(!active||$('modal')?.open||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
 const k=e.key.toLowerCase();if(['w','a','s','d',' ','shift','arrowleft','arrowright','arrowup','arrowdown','q','e'].includes(k)){e.preventDefault();keys.add(k);}
 if(!e.repeat&&k==='q')edit(false);if(!e.repeat&&k==='e')edit(true);
 if(/^[1-8]$/.test(k)){selected=Number(k);updateHud();}
});
document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();drag=null;if(ready)save();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();drag=null;if(ready)save();}});
window.addEventListener('pagehide',()=>{if(ready)save();});
$('bw-hotbar').innerHTML=C.names.slice(1).map((n,i)=>'<button type="button" data-block="'+(i+1)+'" aria-label="'+(i+1)+': '+n+'" aria-pressed="'+(i===0)+'"><small>'+(i+1)+'</small><i class="bw-block-chip" style="--block:'+C.colors[i+1]+'"></i><span>'+n+'</span></button>').join('');
$('bw-hotbar').addEventListener('click',e=>{const b=e.target.closest('[data-block]');if(b){selected=Number(b.dataset.block);updateHud();canvas.focus({preventScroll:true});}});
$('bw-break').onclick=()=>edit(false);$('bw-place').onclick=()=>edit(true);
$('bw-home').onclick=()=>{if(!ready)return;player=C.safeSpawn(world,mode);save();message('Başlangıç noktasına döndün. Yaptığın yapılar duruyor.');canvas.focus({preventScroll:true});};
$('bw-world').onchange=e=>{if(!ready)return;save();loadWorld(e.target.value);canvas.focus({preventScroll:true});};
$('bw-mouse').onclick=()=>{if(document.pointerLockElement===canvas){document.exitPointerLock();return;}try{const p=canvas.requestPointerLock();p?.catch(()=>message('Fareyi basılı tutup sürükleyerek de bakabilirsin.'));}catch{message('Fareyi basılı tutup sürükleyerek bakabilirsin.');}};
$('bw-fullscreen').onclick=()=>{const p=document.fullscreenElement?document.exitFullscreen():stage.requestFullscreen?.();p?.catch(()=>message('Tam ekran bu tarayıcıda açılamadı.'));};
document.querySelectorAll('[data-bw-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(b.dataset.bwKey);b.setPointerCapture(e.pointerId);});const release=()=>keys.delete(b.dataset.bwKey);b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);});
window.BlockWorld={setActive};
if($('minecraft-view').classList.contains('active'))setActive(true);
})();
