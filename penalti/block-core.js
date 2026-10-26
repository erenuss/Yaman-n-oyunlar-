(function(root){
'use strict';
const W=48,H=28,D=48,COUNT=W*H*D;
const names=['Hava','Çimen','Toprak','Taş','Tahta','Yaprak','Kum','Tuğla','Altın'];
const colors=['','#71aa3b','#986337','#818b94','#a77643','#3e873e','#e7cc82','#b85f43','#e9bb35'];
const idx=(x,y,z)=>x+W*(z+D*y);
const inside=(x,y,z)=>x>=0&&x<W&&y>=0&&y<H&&z>=0&&z<D;
function get(a,x,y,z){return inside(x,y,z)?a[idx(x,y,z)]:0;}
function put(a,x,y,z,v){if(inside(x,y,z))a[idx(x,y,z)]=v;}
function box(a,x1,y1,z1,x2,y2,z2,v){for(let y=y1;y<=y2;y++)for(let z=z1;z<=z2;z++)for(let x=x1;x<=x2;x++)put(a,x,y,z,v);}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function height(x,z){if(x>=17&&x<=31&&z>=17&&z<=35)return 4;return Math.max(2,Math.floor(4+1.8*Math.sin(x*.18)*Math.cos(z*.14)+Math.sin((x+z)*.11)));}
function ground(a,x,z){for(let y=H-1;y>=0;y--)if(get(a,x,y,z))return y;return 0;}
function generate(mode='valley'){
 const a=new Uint8Array(COUNT),random=rng(mode==='trench'?47019:32104);
 for(let x=0;x<W;x++)for(let z=0;z<D;z++){const top=mode==='trench'?4:height(x,z);for(let y=0;y<=top;y++)put(a,x,y,z,y===top?1:y<top-2?3:2);}
 if(mode==='trench'){
  box(a,2,4,2,45,4,45,2);
  for(const x of [13,34]){
   box(a,x-1,3,5,x+1,4,42,0);box(a,x-1,2,5,x+1,2,42,4);
   for(const z of [8,20,32,40]){put(a,x,3,z,4);put(a,x-1,4,z,4);}
   for(const z of [12,24,36])box(a,x-2,4,z-1,x+2,4,z+1,4);
  }
  for(const x of [5,38]){box(a,x,5,20,x+5,8,28,7);box(a,x+1,5,21,x+4,7,27,0);box(a,x,5,23,x+5,6,25,0);box(a,x,8,20,x+5,8,28,4);}
  for(const [x,z] of [[11,12],[24,24],[37,12]]){box(a,x-2,4,z-2,x+2,4,z+2,6);box(a,x,5,z,x,9,z,4);box(a,x+1,8,z,x+2,9,z,8);}
  for(let n=0;n<28;n++){const x=17+Math.floor(random()*14),z=3+Math.floor(random()*40);if(Math.abs(x-24)<4&&Math.abs(z-24)<4)continue;box(a,x,5,z,x+1,5+Math.floor(random()*2),z+1,n%2?3:7);}
 }else{
  // A small original cabin, garden path and workbench.
  box(a,21,5,20,28,8,26,4);box(a,22,5,21,27,7,25,0);box(a,24,5,26,25,6,26,0);
  box(a,23,6,20,26,7,20,0);box(a,21,6,22,21,7,24,0);box(a,28,6,22,28,7,24,0);
  box(a,20,9,19,29,9,27,7);box(a,22,10,19,27,10,27,7);
  box(a,24,4,27,25,4,36,6);put(a,27,5,29,4);
  for(let i=0;i<29;i++){
   const x=3+Math.floor(random()*42),z=3+Math.floor(random()*42);
   if(x>=16&&x<=33&&z>=16&&z<=38)continue;
   const g=height(x,z),trunk=3+Math.floor(random()*2);
   for(let dy=trunk-1;dy<=trunk+1;dy++)for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)if(Math.abs(dx)+Math.abs(dz)<4)put(a,x+dx,g+dy,z+dz,5);
   for(let y=g+1;y<=g+trunk;y++)put(a,x,y,z,4);
   put(a,x,g+trunk+2,z,5);
  }
  for(const [x,z] of [[8,10],[39,10],[38,39]])put(a,x,height(x,z)+1,z,8);
 }
 return a;
}
const defaults={valley:{x:24.5,y:5,z:32,yaw:.35,pitch:-.08,vy:0,grounded:false},trench:{x:7.5,y:5,z:32,yaw:1.0,pitch:-.08,vy:0,grounded:false}};
function spawn(mode){return {...defaults[mode]||defaults.valley};}
function overlaps(p,x,y,z){return p.x+.28>x&&p.x-.28<x+1&&p.y+1.75>y&&p.y<y+1&&p.z+.28>z&&p.z-.28<z+1;}
function collides(a,p){
 if(p.x<.3||p.z<.3||p.x>W-.3||p.z>D-.3||p.y<1||p.y+1.75>=H)return true;
 for(let x=Math.floor(p.x-.28);x<=Math.floor(p.x+.28);x++)for(let z=Math.floor(p.z-.28);z<=Math.floor(p.z+.28);z++)for(let y=Math.floor(p.y+.001);y<=Math.floor(p.y+1.75-.001);y++)if(get(a,x,y,z))return true;
 return false;
}
function safeSpawn(a,mode){
 let p=spawn(mode);if(!collides(a,p))return p;
 for(let r=0;r<18;r++)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
  let x=Math.floor(p.x)+dx,z=Math.floor(p.z)+dz;if(x<1||z<1||x>=W-1||z>=D-1)continue;
  let q={...p,x:x+.5,z:z+.5,y:ground(a,x,z)+1};if(!collides(a,q))return q;
 }
 return {...p,y:H-2};
}
function direction(p){const c=Math.cos(p.pitch);return [Math.sin(p.yaw)*c,Math.sin(p.pitch),-Math.cos(p.yaw)*c];}
function ray(a,origin,dir,reach=8){
 let x=Math.floor(origin[0]),y=Math.floor(origin[1]),z=Math.floor(origin[2]),distance=0,normal=[0,0,0];
 const step=dir.map(v=>v>=0?1:-1),delta=dir.map(v=>v===0?Infinity:Math.abs(1/v));
 const max=dir.map((v,i)=>v===0?Infinity:((step[i]>0?Math.floor(origin[i])+1-origin[i]:origin[i]-Math.floor(origin[i]))*delta[i]));
 for(let n=0;n<256&&distance<=reach;n++){
  const type=get(a,x,y,z);if(type)return {x,y,z,type,normal,distance};
  if(max[0]<=max[1]&&max[0]<=max[2]){distance=max[0];max[0]+=delta[0];x+=step[0];normal=[-step[0],0,0];}
  else if(max[1]<=max[2]){distance=max[1];max[1]+=delta[1];y+=step[1];normal=[0,-step[1],0];}
  else{distance=max[2];max[2]+=delta[2];z+=step[2];normal=[0,0,-step[2]];}
 }
 return null;
}
function canPlace(a,p,x,y,z){return inside(x,y,z)&&y>0&&!get(a,x,y,z)&&!overlaps(p,x,y,z);}
function moveAxis(a,p,axis,amount){
 const steps=Math.max(1,Math.ceil(Math.abs(amount)/.16)),delta=amount/steps;
 for(let i=0;i<steps;i++){p[axis]+=delta;if(collides(a,p)){p[axis]-=delta;if(axis==='y'){if(delta<0)p.grounded=true;p.vy=0;}return false;}}
 return true;
}
function physics(a,p,controls,dt){
 dt=Math.max(0,Math.min(.05,dt));let f=controls.forward||0,s=controls.strafe||0,n=Math.hypot(f,s);if(n>1){f/=n;s/=n;}
 const speed=controls.sprint?6.8:4.1;
 const dx=(Math.sin(p.yaw)*f+Math.cos(p.yaw)*s)*speed*dt,dz=(-Math.cos(p.yaw)*f+Math.sin(p.yaw)*s)*speed*dt;
 moveAxis(a,p,'x',dx);moveAxis(a,p,'z',dz);
 if(controls.jump&&p.grounded){p.vy=7.1;p.grounded=false;}
 p.vy=Math.max(-24,p.vy-19*dt);p.grounded=false;moveAxis(a,p,'y',p.vy*dt);
 return p;
}
function applyEdits(a,edits){
 const clean={};if(!edits||typeof edits!=='object'||Array.isArray(edits))return clean;
 let n=0;for(const [key,v] of Object.entries(edits)){const i=Number(key);if(n>=12000)break;if(!/^\d+$/.test(key)||!Number.isInteger(i)||i<W*D||i>=COUNT||!Number.isInteger(v)||v<0||v>8)continue;a[i]=v;clean[i]=v;n++;}
 return clean;
}
const api={W,H,D,COUNT,names,colors,idx,inside,get,put,generate,spawn,safeSpawn,overlaps,collides,direction,ray,canPlace,physics,applyEdits};
if(typeof module!=='undefined'&&module.exports)module.exports=api;root.BlockCore=api;
})(typeof window!=='undefined'?window:globalThis);
