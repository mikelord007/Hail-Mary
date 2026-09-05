import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { upgradeMaterials, createPipeline, detailInterior, detailExterior, createWindowMaterial } from './graphics.js';

const $=id=>document.getElementById(id), clamp=THREE.MathUtils.clamp, lerp=THREE.MathUtils.lerp;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#040a12');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
$('viewport').appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.06,2400);camera.rotation.order='YXZ';
const interior=new THREE.Group(), cosmos=new THREE.Group(), exterior=new THREE.Group();scene.add(interior,cosmos,exterior);exterior.visible=false;
scene.add(new THREE.HemisphereLight(0xb1d2df,0x575143,.85));
const sun=new THREE.DirectionalLight(0xffdfac,3.1);sun.position.set(40,70,20);scene.add(sun);
const blueSun=new THREE.DirectionalLight(0x7db9dc,1.1);blueSun.position.set(-60,10,-30);scene.add(blueSun);
const mats={};
function mat(name,color,metal=.2,rough=.7){return mats[name]=new THREE.MeshStandardMaterial({color,metalness:metal,roughness:rough});}
mat('ivory','#b8bab0',.25);mat('panel','#85938f',.35);mat('dark','#1e3035',.45);mat('floor','#48595b',.5);mat('steel','#667b7e',.7,.35);mat('orange','#b67638',.4);mat('gold','#9d8258',.55);mat('black','#111d22',.25);mat('red','#a34330');mat('blue','#526e79');mat('fabric','#b5b7a0',0,.95);mat('green','#547954',0);mat('soil','#29251f',0);
mats.glow=new THREE.MeshBasicMaterial({color:0xffe2ac});mats.cyan=new THREE.MeshBasicMaterial({color:0x9cdcd6});mats.redGlow=new THREE.MeshBasicMaterial({color:0xeb6e42});
const boxGeo=new THREE.BoxGeometry(1,1,1), cylGeo=new THREE.CylinderGeometry(1,1,1,24), sphereGeo=new THREE.SphereGeometry(1,24,16), roundedCache=new Map();
function mesh(geo,m,x,y,z,sx=1,sy=1,sz=1,parent=interior){const o=new THREE.Mesh(geo,typeof m==='string'?mats[m]:m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
function box(m,x,y,z,w,h,d,p=interior){if(['ivory','dark','fabric','blue','orange'].includes(m)&&Math.min(w,h,d)>.09&&Math.max(w,h,d)<5){const key=[w,h,d].join('/');if(!roundedCache.has(key))roundedCache.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(.045,Math.min(w,h,d)*.2)));return mesh(roundedCache.get(key),m,x,y,z,1,1,1,p);}return mesh(boxGeo,m,x,y,z,w,h,d,p);}
function cyl(m,x,y,z,r,h,p=interior){return mesh(cylGeo,m,x,y,z,r,h,r,p);}
function ball(m,x,y,z,r,p=interior){return mesh(sphereGeo,m,x,y,z,r,r,r,p);}
function beam(a,b,r=.04,m='steel',p=interior){a=new THREE.Vector3(...a);b=new THREE.Vector3(...b);const o=cyl(m,0,0,0,r,a.distanceTo(b),p);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());return o;}
function ring(x,y,z,r,t=.08,m='steel',p=interior){return mesh(new THREE.TorusGeometry(r,t,8,48),m,x,y,z,1,1,1,p);}
function canvasMat(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide});}
const linerTexture=canvasMat(512,512,(c,W,H)=>{c.fillStyle='#c0c5b8';c.fillRect(0,0,W,H);for(let y=0;y<512;y+=128)for(let x=0;x<512;x+=128){const g=c.createLinearGradient(x,y,x+128,y+128);g.addColorStop(0,'#8d9990');g.addColorStop(.12,'#c2c7b9');g.addColorStop(.7,'#b4beb1');g.addColorStop(1,'#829187');c.fillStyle=g;c.fillRect(x+3,y+3,122,122);c.strokeStyle='#727e7544';c.lineWidth=1;c.strokeRect(x+8,y+8,112,112);c.fillStyle='#677970';for(const dx of [10,118])for(const dy of [10,118]){c.beginPath();c.arc(x+dx,y+dy,1.5,0,7);c.fill();}}}).map;
linerTexture.wrapS=linerTexture.wrapT=THREE.RepeatWrapping;linerTexture.repeat.set(3,1);mats.panel.map=linerTexture;mats.panel.bumpMap=linerTexture;mats.panel.bumpScale=.025;
const clothTexture=canvasMat(128,128,(c,W,H)=>{c.fillStyle='#b8b9a5';c.fillRect(0,0,W,H);c.strokeStyle='#747d7355';c.lineWidth=1;for(let i=-128;i<256;i+=16){c.beginPath();c.moveTo(i,0);c.lineTo(i+128,128);c.stroke();c.beginPath();c.moveTo(i,0);c.lineTo(i-128,128);c.stroke();}}).map;mats.fabric.map=clothTexture;
scene.environment=upgradeMaterials(mats,renderer);
const pipeline=createPipeline(scene,camera,renderer,interior,sun,blueSun);
function label(text,x,y,z,w=2,h=.35,color='#d6e1d5',bg='#21333a',rot=0,p=interior){const m=canvasMat(1024,Math.round(1024*h/w),(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=color;c.font=`600 ${Math.floor(H*.53)}px monospace`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2,W*.93);});const o=mesh(new THREE.PlaneGeometry(w,h),m,x,y,z,1,1,1,p);o.rotation.y=rot;return o;}
const screenMaterials=[];
function screen(title,kind=0){const m=canvasMat(1024,680,(c,W,H)=>{c.scale(2,2);W=512;H=340;c.fillStyle='#071820';c.fillRect(0,0,W,H);c.strokeStyle='#32535a';c.lineWidth=1;for(let x=25;x<W;x+=32){c.beginPath();c.moveTo(x,60);c.lineTo(x,H-25);c.stroke();}for(let y=60;y<H;y+=28){c.beginPath();c.moveTo(20,y);c.lineTo(W-20,y);c.stroke();}c.fillStyle='#b8cfbf';c.font='bold 20px monospace';c.fillText(title,24,36);c.fillStyle='#e2ba74';c.fillRect(24,47,100,3);if(kind===1){c.strokeStyle='#a9d3b7';for(let r=25;r<110;r+=25){c.beginPath();c.arc(250,195,r,0,Math.PI*2);c.stroke();}c.fillStyle='#f4b363';c.beginPath();c.arc(309,135,7,0,7);c.fill();c.font='15px monospace';c.fillText('TAU CETI   /   LOCKED',34,316);}else if(kind===2){c.fillStyle='#efc377';c.font='bold 66px monospace';c.fillText('1.00 g',85,162);c.font='16px monospace';c.fillStyle='#b0d4c4';c.fillText('TETHER SYSTEM / READY',55,209);c.fillText('DEPLOYMENT AUTHORIZED',55,244);}else{c.strokeStyle='#a4d6b6';c.lineWidth=3;c.beginPath();for(let x=24;x<490;x++){const y=190+Math.sin(x*.055)*35+Math.sin(x*.15)*9;c.lineTo(x,y);}c.stroke();c.font='17px monospace';c.fillStyle='#c6d9bc';c.fillText('SAMPLE A   96.4%   NOMINAL',24,297);}});screenMaterials.push(m);return m;}
const displays=[screen('ASTROPHAGE / SPECTRAL ANALYSIS'),screen('NAVIGATION / TAU CETI',1),screen('ARTIFICIAL GRAVITY',2),screen('LIFE SUPPORT / ENVIRONMENT')];
function monitor(x,y,z,w=1.6,index=0,rot=0){const p=new THREE.Group();p.position.set(x,y,z);p.rotation.y=rot;interior.add(p);box('black',0,0,0,w+.15,w*.68+.15,.15,p);mesh(new THREE.PlaneGeometry(w,w*.68),displays[index],0,0,.081,1,1,1,p);for(let i=0;i<5;i++)box(i===0?'cyan':'steel',-.4+i*.16,-w*.38,.09,.06,.035,.015,p);box('steel',0,0,-.09,w*.68,w*.37,.025,p);for(let j=0;j<8;j++)box('black',0,-w*.13+j*w*.036,-.108,w*.6,.013,.01,p);box('steel',0,-w*.38-.08,0,.17,.2,.1,p);box('black',0,-w*.38-.18,0,.45,.035,.25,p);return p;}
const floorMat=canvasMat(512,512,(c,W,H)=>{c.fillStyle='#576563';c.fillRect(0,0,W,H);c.fillStyle='#435250';for(let y=9;y<H;y+=18)for(let x=7;x<W;x+=22)c.fillRect(x,y,12,3);c.strokeStyle='#a4aca066';c.lineWidth=4;c.strokeRect(5,5,502,502);c.fillStyle='#273b3b';for(const x of [16,496])for(const y of [16,496]){c.beginPath();c.arc(x,y,3,0,7);c.fill();}});
const litFloorMat=new THREE.MeshStandardMaterial({map:floorMat.map,roughness:.72,metalness:.42,bumpMap:floorMat.map,bumpScale:.018});
// Connected walk volumes, with genuine lower/upper floors and solid equipment.
const rooms=[
 {id:'lab',name:'Science laboratory',sub:'International research module',x1:-6,x2:6,z1:-10,z2:8,y:0,doors:{n:true,s:true,e:true,w:true},accent:'orange'},
 {id:'flight',name:'Flight deck',sub:'Guidance, navigation & centrifuge control',x1:-5,x2:5,z1:-26,z2:-14,y:0,doors:{s:true},accent:'blue'},
 {id:'crew',name:'Crew quarters',sub:'Dormitory & medical recovery',x1:-5,x2:5,z1:12,z2:27,y:0,doors:{n:true},accent:'ivory'},
 {id:'engineering',name:'Engineering',sub:'Life support & power distribution',x1:-22,x2:-10,z1:-5,z2:5,y:0,doors:{e:true},accent:'gold'},
 {id:'garden',name:'Wellbeing room',sub:'A small reminder of Earth',x1:10,x2:22,z1:-5,z2:5,y:0,doors:{w:true},accent:'green'},
 {id:'observation',name:'Observation unit',sub:'Upper deck / optical instruments',x1:1,x2:7,z1:-10,z2:1,y:5.2,doors:{},accent:'blue'}
];
const halls=[{x1:-1.65,x2:1.65,z1:-14.1,z2:-9.9,y:0},{x1:-1.65,x2:1.65,z1:7.9,z2:12.1,y:0},{x1:5.9,x2:10.1,z1:-1.65,z2:1.65,y:0},{x1:-10.1,x2:-5.9,z1:-1.65,z2:1.65,y:0}];
const volumes=[...rooms,...halls],colliders=[],interactives=[],dynamic=[];
function collider(x,z,w,d,y=0,h=2){colliders.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2,y,h});}
function wall(m,x,y,z,w,h,d){box(m,x,y,z,w,h,d);}
function shell(r){const {x1,x2,z1,z2,y}=r,w=x2-x1,d=z2-z1,cx=(x1+x2)/2,cz=(z1+z2)/2,H=4.5;
 const patches=r.id==='observation'?[[x1,2.6,z1,z2],[5.8,x2,z1,z2],[2.6,5.8,z1,-7.4],[2.6,5.8,-4.1,z2]]:[[x1,x2,z1,z2]];
 for(const [a,b,c,dz]of patches){box('dark',(a+b)/2,y-.16,(c+dz)/2,b-a,.25,dz-c);for(let x=a;x<b-.01;x+=2)for(let z=c;z<dz-.01;z+=2){const tw=Math.min(2,b-x),td=Math.min(2,dz-z);const o=mesh(new THREE.PlaneGeometry(tw-.025,td-.025),litFloorMat,x+tw/2,y+.015,z+td/2);o.rotation.x=-Math.PI/2;}}
 if(r.id==='lab'){
  box('dark',-1.7,y+H+.12,cz,8.6,.2,d);box('dark',5.9,y+H+.12,cz,.2,.2,d);
  box('dark',4.2,y+H+.12,-8.7,3.2,.2,2.6);box('dark',4.2,y+H+.12,1.9,3.2,.2,12.2);
 }else box('dark',cx,y+H+.12,cz,w,.2,d);
 for(const side of ['n','s','w','e']){const horizontal=side==='n'||side==='s',len=horizontal?w:d,pos=horizontal?(side==='n'?z1:z2):(side==='w'?x1:x2),center=horizontal?cx:cz;const door=r.doors[side];
 const segments=door?[[center-len/2,center-1.65],[center+1.65,center+len/2]]:[[center-len/2,center+len/2]];
 for(const [a,b] of segments){if(horizontal)wall('panel',(a+b)/2,y+H/2,pos,b-a,H,.18);else wall('panel',pos,y+H/2,(a+b)/2,.18,H,b-a);}
 if(door){if(horizontal){box('dark',center,y+3.9,pos,3.3,1.2,.3);for(const xx of [-1.66,1.66])box(r.accent,center+xx,y+1.7,pos,.12,3.4,.32);label(side==='n'?'FLIGHT DECK  ↑':'CREW QUARTERS  ↓',center,y+3.68,pos+(side==='n'?.18:-.18),2.6,.23,'#d9daca','#243339',side==='n'?0:Math.PI);}else{box('dark',pos,y+3.9,center,.3,1.2,3.3);for(const zz of [-1.66,1.66])box(r.accent,pos,y+1.7,center+zz,.32,3.4,.12);}}
 }
 // Exposed frames, overhead conduits, warm task lights, low-level guidance strips.
 for(let z=z1+.35;z<z2;z+=2.7){for(const x of [x1+.16,x2-.16]){box('ivory',x,y+2.15,z,.18,4.3,.14);const b=box('ivory',x+(x<cx?.35:-.35),y+4.08,z,.95,.16,.2);b.rotation.z=x<cx?-.55:.55;}
 if(!(r.id==='lab'&&z>-7.4&&z<-4.1)){box('steel',cx,y+4.43,z,w-.25,.13,.18);box('glow',cx,y+4.31,z,Math.min(w*.53,4),.045,.2);}
 for(const x of [x1+.12,x2-.12])box('glow',x,y+.19,z,.04,.035,1.7);
 }
 for(let i=0;i<4;i++){const x=x1+.55+i*.16;beam([x,y+4.12,z1],[x,y+4.12,z2],.055,i===0?'orange':'dark');}
 for(const x of [x1+.45,x2-.45])box(r.accent,x,y+.025,cz,.045,.012,d-.4);
 const light=new THREE.PointLight(r.id==='garden'?0xe1dcaf:0xffdcaa,35,Math.max(w,d)*1.2,2);light.position.set(cx,y+3.8,cz);interior.add(light);
}
rooms.forEach(shell);
for(const h of halls){const horiz=h.x2-h.x1>h.z2-h.z1;const r={...h,doors:horiz?{e:true,w:true}:{n:true,s:true},accent:'orange'};shell(r);for(let i=0;i<5;i++){const v=(i-2)*.7;if(horiz){box('orange',(h.x1+h.x2)/2+v,1.6,-1.63,.08,3.2,.1);box('orange',(h.x1+h.x2)/2+v,1.6,1.63,.08,3.2,.1);}else{box('orange',-1.63,1.6,(h.z1+h.z2)/2+v,.1,3.2,.08);box('orange',1.63,1.6,(h.z1+h.z2)/2+v,.1,3.2,.08);}}}
// Movie-inspired equipment is built as individual, tactile objects.
function bench(x,z,w=3,d=1.2,rot=0){const p=new THREE.Group();p.position.set(x,0,z);p.rotation.y=rot;interior.add(p);box('ivory',0,.95,0,w,.14,d,p);box('dark',0,.42,0,w-.18,.92,d-.12,p);for(let i=0;i<3;i++){box('ivory',-w*.33+i*w*.33,.52,d/2+.005,w*.29,.59,.03,p);box('steel',-w*.33+i*w*.33,.7,d/2+.035,.45,.035,.04,p);}collider(x,z,Math.abs(Math.cos(rot))*w+Math.abs(Math.sin(rot))*d,Math.abs(Math.sin(rot))*w+Math.abs(Math.cos(rot))*d);return p;}
function rack(x,z,rot=0,type=0){const p=new THREE.Group();p.position.set(x,0,z);p.rotation.y=rot;interior.add(p);box('dark',0,1.55,0,1.5,3.1,.55,p);for(let j=0;j<7;j++){box(j%3===0?'ivory':'steel',0,.28+j*.41,.29,1.37,.33,.1,p);for(let i=0;i<5;i++){box(i===0?'cyan':'black',-.53+i*.22,.29+j*.41,.352,.08,.027,.012,p);}box('black',.43,.21+j*.41,.37,.18,.04,.02,p);}collider(x,z,Math.abs(Math.cos(rot))*1.55+Math.abs(Math.sin(rot))*.65,Math.abs(Math.sin(rot))*1.55+Math.abs(Math.cos(rot))*.65);return p;}
for(const z of [-7,-3,3,6]){rack(-5.55,z,Math.PI/2);if(z!==-7)bench(5,z,2.5,1.4,-Math.PI/2);}
bench(-2,-4,3.2,1.6);monitor(-2,1.64,-4.3,1.5,0);bench(2,3.7,3.2,1.55,Math.PI);monitor(2,1.65,4.1,1.4,3,Math.PI);
// Microscope and glowing sample carousel.
cyl('black',-1.3,1.11,-3.7,.32,.12);beam([-1.3,1.15,-3.85],[-1.3,1.8,-4],.09,'ivory');const scope=cyl('ivory',-1.3,1.8,-3.82,.08,.45);scope.rotation.x=-.5;
const sampleGroup=new THREE.Group();sampleGroup.position.set(-3.15,1.18,-3.8);interior.add(sampleGroup);cyl('steel',0,0,0,.35,.12,sampleGroup);for(let i=0;i<6;i++){const a=i/6*Math.PI*2;cyl('gold',Math.sin(a)*.25,.18,Math.cos(a)*.25,.055,.29,sampleGroup);ball('redGlow',Math.sin(a)*.25,.26,Math.cos(a)*.25,.047,sampleGroup);}dynamic.push(sampleGroup);
label('SCIENCE / 01',-5.83,3.2,-5,2.7,.42,'#d9e1c6','#233039',Math.PI/2);label('HAIL MARY',0,3.78,-9.86,3.4,.45,'#dec598');
for(let i=0;i<5;i++){cyl('ivory',4.85,1.22,2.2+i*.19,.05,.3);cyl('orange',4.85,1.4,2.2+i*.19,.06,.08);}
function interactive(id,name,x,y,z,action,range=2.7){interactives.push({id,name,pos:new THREE.Vector3(x,y,z),action,range});}
interactive('sample','Analyze astrophage sample',-2.6,1.5,-3.5,()=>{complete('sample');showText('SCIENCE LOG / 001','A star in a test tube.','The sample absorbs light at a very specific frequency. An impossibly small organism, carrying an impossibly large amount of energy. Astrophage powers this ship — and it is also why you are here.','SPECTRAL MATCH: 96.4% / SAMPLE LOGGED');});
// Flight deck: instruments, a generous viewport, harness chair, gravity panel.
bench(-2.8,-22.8,3.6,1.25);bench(2.2,-22.8,3.6,1.25);monitor(-2.8,1.8,-23.08,2,1);monitor(2.2,1.8,-23.08,2,2);
label('FLIGHT / GUIDANCE',0,3.6,-25.82,3.5,.3);interactive('gravity','Toggle centrifugal gravity',2.2,1.7,-22.15,toggleGravity,3.1);
for(const x of [-1.8,1.8]){box('blue',x,.65,-20.4,.7,.22,.8);box('blue',x,1.18,-20.12,.72,1.05,.18);box('black',x,.27,-20.4,.38,.48,.5);collider(x,-20.4,.8,.85);for(const dx of [-.42,.42])beam([x+dx,.5,-20.1],[x+dx,1,-20.75],.04);}
// Viewports show the same rotating celestial reference frame as the ship exterior.
const viewportMat=createWindowMaterial();
const windowViews=[];
function windowAt(x,y,z,r=1.35,rot=0,p=interior){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;p.add(g);const view=mesh(new THREE.CircleGeometry(r,48),viewportMat,0,0,-.015,1,1,1,g);windowViews.push(view);ring(0,0,0,r+.06,.14,'dark',g);ring(0,0,.04,r+.05,.055,'steel',g);for(let i=0;i<12;i++){const a=i/12*Math.PI*2;ball('gold',Math.sin(a)*(r+.08),Math.cos(a)*(r+.08),.13,.045,g);}return g;}
windowAt(0,2.3,-25.86,1.22);
for(const x of [-4.65,4.65]){rack(x,-17,x<0?Math.PI/2:-Math.PI/2);}
label('CENTRIFUGE CONTROL',2.2,2.85,-23.12,2.2,.23,'#edc88a');
// Three medical berths; soft quilted panels, service arms and personal lockers.
for(let i=0;i<3;i++){const z=16+i*3.65;box('ivory',-3.2,.6,z,2.5,.6,1.75);box('fabric',-3.05,.96,z,2.3,.2,1.5);box('ivory',-4,.99,z,.5,.27,1.35);box('blue',-2.6,1.09,z,1.4,.08,1.48);beam([-4.6,.8,z-.85],[-4.6,2.3,z-.85],.055);beam([-4.6,2.3,z-.85],[-3.9,2.3,z-.85],.055);monitor(-4.8,2.1,z+.5,.7,3,Math.PI/2);collider(-3.2,z,2.65,1.8);label(['GRACE / R.','YAO / L.','ILYUKHINA / O.'][i],-4.86,3,z,2.3,.24,'#bcd3cc','#253b3e',Math.PI/2);rack(4.55,z,-Math.PI/2);}
label('CREW / RECOVERY',0,3.2,26.86,3.2,.35,'#d2d9cb','#253237',Math.PI);windowAt(0,2.1,26.85,1.1,Math.PI);
interactive('crewlog','Read the crew manifest',-2,1.5,16,()=>showText('CREW MANIFEST','Three seats. One mission.','Ryland Grace · Science specialist<br>Yao Li-Jie · Commander<br>Olesya Ilyukhina · Flight engineer<br><br>The medical berths are quiet. Recovery systems remain online. Somewhere in these lockers are pieces of three lives left behind on Earth.','DORMITORY / RECOVERY SYSTEMS NOMINAL'));
// Engineering: dense tanks, heat exchangers, conduits and a service station.
for(let i=0;i<5;i++){const x=-12-i*2;const t=cyl(i%2?'ivory':'gold',x,1.5,-4, .58,2.7);ball(i%2?'ivory':'gold',x,2.83,-4,.56);for(const y of [.6,2.25]){const r=ring(x,y,-4,.6,.035,'dark');r.rotation.x=Math.PI/2;}beam([x,2.8,-4],[x,3.8,-4],.06,'orange');collider(x,-4,1.2,1.4);rack(x,4,Math.PI);}
bench(-20,0,3,1.1,Math.PI/2);monitor(-20.3,1.65,0,1.8,3,Math.PI/2);label('ENGINEERING / 04',-21.86,3.25,0,3,.35,'#e3c797','#302e26',Math.PI/2);
interactive('power','Inspect life-support systems',-19,1.6,0,()=>{complete('power');showText('ENGINEERING / SYSTEMS','Keep the ship breathing.','Oxygen regeneration: nominal<br>Carbon dioxide scrubbers: nominal<br>Astrophage containment: stable<br>Tether winches: operational<br><br>Four tensioned cables join the rotating habitat to the drive assembly. The habitat floor faces away from the rotation axis.','LIFE SUPPORT VERIFIED');});
// Wellbeing: amber panels, plants, a dining table, and a little Earth.
for(const z of [-4,4]){box('ivory',16,.45,z,9,.65,1.1);box('soil',16,.8,z,8.8,.08,.9);collider(16,z,9,1.1);for(let i=0;i<20;i++){const x=11.9+i*.43;const h=.35+(i%4)*.12;beam([x,.82,z],[x,1+h,z],.02,'green');}box('glow',16,2.1,z,9,.06,.16);beam([11.6,2.1,z],[20.4,2.1,z],.04,'steel');}
bench(18,0,2.2,1.1);box('orange',15,.65,0,1.3,.35,2.5);box('fabric',15,.92,0,1.28,.2,2.45);box('fabric',14.4,1.3,0,.2,.8,2.5);collider(15,0,1.45,2.6);cyl('ivory',18,1.22,0,.12,.3);label('A LITTLE BIT OF EARTH',21.86,3.4,0,3.5,.3,'#c8d2af','#294037',-Math.PI/2);windowAt(21.84,2.1,0,1.2,-Math.PI/2);
interactive('gardenlog','Take a moment',17,1.5,.8,()=>showText('WELLBEING / PERSONAL LOG','Remember the ordinary things.','Rain against a window. A classroom before the bell. The smell of soil after watering the plants.<br><br>Twelve light-years from home, even a small patch of green feels like an entire planet.','ENVIRONMENT / 22.0 °C · 48% RH'));
// The ladder connects both decks continuously. Upper guardrails leave a clear step-off.
const ladder={x:4.2,z:-6,y0:0,y1:5.2};for(const x of [3.68,4.72])beam([x,.15,-6.3],[x,6.25,-6.3],.058,'orange');for(let y=.3;y<5.9;y+=.32)beam([3.68,y,-6.3],[4.72,y,-6.3],.04,'steel');
label('02 ↑ OBSERVATION',4.3,3.1,-6.39,1.5,.23,'#ead8ae');
for(const x of [2.65,5.7]){beam([x,5.25,-7.3],[x,6.25,-7.3],.045,'orange');beam([x,6.25,-7.3],[x,6.25,-4.4],.045,'orange');}
interactive('ladder','Climb ladder to observation',4.2,1.7,-5.7,()=>startClimb(true),2.2);interactive('ladderdown','Climb down to laboratory',4.2,6.8,-4.4,()=>startClimb(false),2.4);
windowAt(4,7.5,-9.84,1.45);const obsBench=bench(4,-8.4,3,1.1);obsBench.position.y=5.2;colliders.pop();collider(4,-8.4,3,1.1,5.2);monitor(4,6.8,-8.6,1.4,1);label('OBSERVATION / 02',1.15,8.4,-3.5,3,.3,'#c1d4cc','#203138',Math.PI/2);
interactive('observationlog','Inspect the optical telescope',4,6.8,-7.7,()=>showText('OPTICAL ARRAY','A sun that still shines.','Tau Ceti is the one nearby star that has not dimmed. Your mission begins with a question: why?<br><br>The upper observation deck keeps the sky in view while the habitat turns beneath your feet.','TELESCOPE / TRACKING TAU CETI'),2.5);
// Merge static meshes by material to keep the intricate set economical to render.
// Utility boxes, safety markings and tied-down stores break up the clean shell.
const hazard=canvasMat(256,64,(c,W,H)=>{c.fillStyle='#b89b52';c.fillRect(0,0,W,H);c.fillStyle='#283536';for(let i=-64;i<320;i+=45){c.beginPath();c.moveTo(i,0);c.lineTo(i+22,0);c.lineTo(i-42,64);c.lineTo(i-64,64);c.fill();}});
for(const z of [-10,8,-14,12]){const strip=mesh(new THREE.PlaneGeometry(3.25,.24),hazard,0,.025,z);strip.rotation.x=-Math.PI/2;}
for(const x of [-6,6,-10,10]){const strip=mesh(new THREE.PlaneGeometry(.24,3.25),hazard,x,.025,0);strip.rotation.x=-Math.PI/2;}
for(const z of [-7.5,-.8,5.8]){box('ivory',5.86,2.7,z,.12,.72,.75);label('O₂ / 21%',5.775,2.8,z,.55,.15,'#c6ddc9','#203536',-Math.PI/2);box('cyan',5.76,2.55,z+.22,.025,.05,.06);beam([5.72,3.07,z],[5.72,3.8,z],.03,'orange');}
for(const z of [14.1,25.5])for(const x of [2.1,3.2]){box('fabric',x,.5,z,.9,.9,.75);box('dark',x,.5,z+.38,.065,.9,.035);box('dark',x,.5,z+.4,.9,.065,.035);collider(x,z,.9,.8);}
for(const x of [-4.5,4.5]){label('CAUTION / PRESSURIZED',x,3.7,-8.2,1.5,.18,'#cbb779','#2b3636',x<0?Math.PI/2:-Math.PI/2);}
const detailAPI={THREE,mats,interior,rooms,box,cyl,ball,beam,ring,label,mesh,monitor,collider};
detailInterior(detailAPI);
function batchStatic(root,skip=[]){root.updateMatrixWorld(true);const buckets=new Map(),remove=[];root.traverse(o=>{if(!o.isMesh||skip.some(s=>o===s||isChild(o,s)))return;if(!buckets.has(o.material))buckets.set(o.material,[]);let g=o.geometry.clone().applyMatrix4(o.matrixWorld);if(g.index){const indexed=g;g=indexed.toNonIndexed();indexed.dispose();}buckets.get(o.material).push(g);remove.push(o);});for(const o of remove)o.removeFromParent();for(const [m,gs]of buckets){const merged=mergeGeometries(gs,false);if(merged){const batch=new THREE.Mesh(merged,m);batch.castShadow=m.isMeshStandardMaterial&&!m.transparent;batch.receiveShadow=m.isMeshStandardMaterial;root.add(batch);}gs.forEach(g=>g.dispose());}}
function isChild(o,p){while(o.parent){if(o.parent===p)return true;o=o.parent;}return false;}
batchStatic(interior,[...dynamic,...windowViews]);
// Distant stars and an original procedural Tau Ceti planet.
let seed=7331;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const stars=new Float32Array(7500);for(let i=0;i<2500;i++){const a=random()*Math.PI*2,u=random()*2-1,r=700+random()*700;stars[i*3]=Math.cos(a)*Math.sqrt(1-u*u)*r;stars[i*3+1]=u*r;stars[i*3+2]=Math.sin(a)*Math.sqrt(1-u*u)*r;}
const starGeo=new THREE.BufferGeometry();starGeo.setAttribute('position',new THREE.BufferAttribute(stars,3));cosmos.add(new THREE.Points(starGeo,new THREE.PointsMaterial({color:0xb3cbd5,size:1.5,sizeAttenuation:true})));
const planetM=new THREE.MeshStandardMaterial({color:0x757d5c,roughness:1});const planet=mesh(new THREE.SphereGeometry(110,48,32),planetM,310,-40,-430,1,1,1,cosmos);planet.rotation.z=.2;
const atmos=mesh(new THREE.SphereGeometry(112,48,32),new THREE.MeshBasicMaterial({color:0x82aba0,transparent:true,opacity:.09,side:THREE.BackSide}),310,-40,-430,1,1,1,cosmos);
// Film-inspired asymmetrical modular habitat, triple tank drive, cable deployment.
const spinner=new THREE.Group();exterior.add(spinner);const habPivot=new THREE.Group(),drive=new THREE.Group();spinner.add(habPivot,drive);const habitat=new THREE.Group();habPivot.add(habitat);
function moduleHull(x,y,z,r,length,parent){const o=cyl('ivory',x,y,z,r,length,parent);o.rotation.z=Math.PI/2;for(const dx of [-length/2,length/2]){const cap=ball('ivory',x+dx,y,z,r,parent);cap.scale.x=.35*r;const rr=ring(x+dx,y,z,r,.10,'steel',parent);rr.rotation.y=Math.PI/2;}for(let dx=-length/2+.25;dx<length/2;dx+=.7){const rr=ring(x+dx,y,z,r+.015,.025,'panel',parent);rr.rotation.y=Math.PI/2;}return o;}
moduleHull(0,0,0,1.55,9,habitat);moduleHull(1.4,0,2.6,1.05,3.8,habitat);moduleHull(-1.5,0,-2.6,1.05,3.8,habitat);moduleHull(-2,2,0,.9,2.5,habitat);
for(let i=0;i<7;i++){box('dark',-3+i,1.55,0,.6,.05,1.2,habitat);box('gold',-3+i,-1.55,0,.7,.07,1.1,habitat);}
const port=ring(-4.68,0,0,.85,.18,'dark',habitat);port.rotation.y=Math.PI/2;const gl=mesh(new THREE.CircleGeometry(.78,24),new THREE.MeshBasicMaterial({color:0x70b8bf}),-4.71,0,0,1,1,1,habitat);gl.rotation.y=-Math.PI/2;
label('HAIL MARY',0,.5,1.57,3,.4,'#233c40','#b8bab0',0,habitat);
for(const z of [-2.4,2.4]){moduleHull(0,0,z,1.05,7.7,drive);for(let x=-3;x<4;x+=1){box('gold',x,1.01,z,.5,.05,.7,drive);}}
moduleHull(0,1.95,0,1.05,7.7,drive);moduleHull(0,0,0,.6,9,drive);
const exhausts=[];for(const [y,z] of [[0,-2.4],[0,2.4],[1.95,0]]){const nozzle=mesh(new THREE.CylinderGeometry(.6,.9,1,20,1,true),'dark',4.6,y,z,1,1,1,drive);nozzle.rotation.z=Math.PI/2;const flame=mesh(new THREE.ConeGeometry(.45,5,16),new THREE.MeshBasicMaterial({color:0xffc479,transparent:true,opacity:.65}),7.5,y,z,1,1,1,drive);flame.rotation.z=-Math.PI/2;exhausts.push(flame);}
for(const z of [-4.1,4.1]){box('black',.5,0,z,6,.1,2.4,drive);for(let x=-2.5;x<3.5;x+=.5){box('steel',x,.06,z,.025,.02,2.4,drive);}beam([-3,0,0],[-2.5,0,z],.09,'steel',drive);beam([3,0,0],[3,0,z],.09,'steel',drive);}
const cables=[];for(let i=0;i<4;i++)cables.push(beam([0,0,0],[1,0,0],.027,'steel',spinner));
const axisGuide=ring(0,0,0,20,.015,new THREE.MeshBasicMaterial({color:0x50636a,transparent:true,opacity:.45}),exterior);axisGuide.rotation.y=Math.PI/2;axisGuide.visible=false;
detailExterior({...detailAPI,habitat,drive});
batchStatic(habitat);batchStatic(drive,exhausts);
// State and persistence.
const defaultState={visited:['lab'],done:[],gravity:false,sensitivity:1,volume:.35,quality:'high'};let saved;try{saved=JSON.parse(localStorage.getItem('hail-mary-explorer-v1')||'null');}catch{}const state={...defaultState,...saved};state.visited=new Set(Array.isArray(state.visited)?state.visited:['lab']);state.done=new Set(Array.isArray(state.done)?state.done:[]);
pipeline.setQuality(state.quality);
function save(){try{localStorage.setItem('hail-mary-explorer-v1',JSON.stringify({...state,visited:[...state.visited],done:[...state.done]}));}catch{}}
const player={pos:new THREE.Vector3(0,1.68,5.6),yaw:0,pitch:0,vy:0,ground:0,climb:null};
let started=false,paused=true,externalMode=false,modalOpen=false,keys=new Set(),nearest=null,gravityTarget=state.gravity?1:0,deploy=gravityTarget,angle=0,rpm=gravityTarget?5.98:0,sequenceTime=0,sequenceAuto=false,orbitYaw=.74,orbitPitch=.25,orbitDistance=64,drag=false,lastTime=performance.now(),time=0,walkPhase=0,currentRoom='lab',toastTimer,ambient=null;
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function complete(id){if(state.done.has(id))return;state.done.add(id);save();updateObjectives();notify('MISSION LOG UPDATED');beep(660,.13);}
function updateObjectives(){const goals=[['sample','Analyze the sample in the laboratory.'],['ladder','Climb the laboratory ladder to observation.'],['gravity','Deploy the centrifuge. Press G or use flight controls.'],['tour','Explore all six habitat units.']];const count=goals.filter(([id])=>state.done.has(id)).length;$('progress').textContent=`${count} / 4`;$('progressBar').style.width=count*25+'%';$('objectiveText').textContent=goals.find(([id])=>!state.done.has(id))?.[1]||'Ship survey complete. Make yourself at home.';}
function audioStart(){if(ambient)return;try{const ctx=new AudioContext(),gain=ctx.createGain();gain.gain.value=state.volume*.045;gain.connect(ctx.destination);for(const f of [48,73,121]){const osc=ctx.createOscillator();osc.frequency.value=f;osc.type='sine';osc.connect(gain);osc.start();}ambient={ctx,gain};}catch{}}
function beep(f=440,d=.08){if(!ambient||!state.volume)return;const o=ambient.ctx.createOscillator(),g=ambient.ctx.createGain();o.frequency.value=f;o.connect(g);g.connect(ambient.ctx.destination);g.gain.setValueAtTime(state.volume*.13,ambient.ctx.currentTime);g.gain.exponentialRampToValueAtTime(.001,ambient.ctx.currentTime+d);o.start();o.stop(ambient.ctx.currentTime+d);}
function acquirePointer(){try{const p=renderer.domElement.requestPointerLock();p?.catch(()=>notify('Mouse capture unavailable. Hold left mouse to look; arrow keys also work.'));}catch{notify('Hold left mouse to look; arrow keys also work.');}}
function start(){started=true;paused=false;$('welcome').classList.add('hidden');$('hud').classList.remove('hidden');audioStart();acquirePointer();updateObjectives();notify('Welcome aboard. WASD to walk. E to interact. M for the ship map.');}
function openModal(html){modalOpen=true;paused=true;keys.clear();document.exitPointerLock?.();$('modalContent').innerHTML=html;$('modal').classList.remove('hidden');}
function closeModal(){modalOpen=false;$('modal').classList.add('hidden');if(started){paused=false;if(!externalMode)acquirePointer();}}
function showText(kicker,title,body,status){beep();openModal(`<div class="eyebrow">${kicker}</div><h2>${title}</h2><p>${body}</p><div class="eyebrow" style="margin-top:28px">${status}</div><button class="primary" id="logClose">RETURN TO EXPLORATION <span>↵</span></button>`);$('logClose').onclick=closeModal;}
function menu(){if(modalOpen)return closeModal();openModal(`<div class="eyebrow">HAIL MARY / FLIGHT MANUAL</div><h2>Take your time.</h2><p>Explore the ship, inspect instruments, and deploy the cable centrifuge. Progress is saved on this device.</p><div class="row"><span>Walk / run</span><span><kbd>W A S D</kbd> <kbd>SHIFT</kbd></span></div><div class="row"><span>Look</span><span>Mouse / drag / arrow keys</span></div><div class="row"><span>Interact / enter ladder</span><kbd>E</kbd></div><div class="row"><span>Climb ladder</span><kbd>W / S</kbd></div><div class="row"><span>Exterior / centrifuge / map</span><span><kbd>C</kbd><kbd>G</kbd><kbd>M</kbd></span></div><div class="row"><span>Jump</span><kbd>SPACE</kbd></div><div class="row"><span>Graphics quality</span><select id="quality" aria-label="Graphics quality"><option value="high" ${state.quality==='high'?'selected':''}>High · shadows & ambient occlusion</option><option value="balanced" ${state.quality==='balanced'?'selected':''}>Balanced · lighter GPU load</option></select></div><div class="row"><span>Mouse sensitivity</span><input id="sensitivity" aria-label="Mouse sensitivity" type="range" min="0.3" max="2" step=".1" value="${state.sensitivity}"></div><div class="row"><span>Ship ambience</span><input id="volume" aria-label="Ship ambience volume" type="range" min="0" max="1" step=".05" value="${state.volume}"></div><button class="primary" id="resume">${started?'RESUME EXPLORATION':'ENTER THE SHIP'} <span>↗</span></button><p style="font-size:10px">An original fan-made interpretation of the movie ship. Geometry and sounds are procedural. The room plan and transition timing are adapted for play.</p>`);$('resume').onclick=()=>{closeModal();if(!started)start();};$('quality').onchange=e=>{state.quality=e.target.value;pipeline.setQuality(state.quality);save();};$('sensitivity').oninput=e=>{state.sensitivity=Number(e.target.value);save();};$('volume').oninput=e=>{state.volume=Number(e.target.value);if(ambient)ambient.gain.gain.value=state.volume*.045;save();};}
function showMap(){if(modalOpen)return closeModal();openModal(`<div class="eyebrow">HABITAT / DECK GUIDE</div><h2>A little world of your own.</h2><p>The laboratory is the central hub. Walk through its open bulkheads to reach the other units. The orange ladder on its starboard side leads to the upper observation unit.</p><div class="units">${rooms.map(r=>`<div class="unit"><b>${state.visited.has(r.id)?'✓':'○'} ${r.name}</b>${r.id==='flight'?'Forward of the lab':r.id==='crew'?'Aft of the lab':r.id==='engineering'?'Port side / left of lab':r.id==='garden'?'Starboard / right of lab':r.id==='observation'?'Upper deck / orange ladder':'Main deck / central hub'}</div>`).join('')}</div><p><kbd>G</kbd> Deploy or retract the centrifuge from anywhere.<br><kbd>C</kbd> Inspect the ship with the exterior camera.</p><button class="primary" id="mapClose">BACK ABOARD <span>↵</span></button>`);$('mapClose').onclick=closeModal;}
function setExternal(value){externalMode=value;interior.visible=!value;exterior.visible=value;$('externalLabel').classList.toggle('hidden',!value);for(const id of ['location','smallMap','reticle','objective'])$(id).classList.toggle('hidden',value);$('interaction').classList.add('hidden');if(value){document.exitPointerLock?.();keys.clear();paused=false;}else{sequenceAuto=false;if(started&&!modalOpen){paused=false;acquirePointer();}}}
function toggleGravity(){if(!started||modalOpen)return;gravityTarget=gravityTarget?0:1;state.gravity=!!gravityTarget;save();sequenceTime=0;sequenceAuto=true;setExternal(true);beep(220,.35);notify(gravityTarget?'Centrifuge sequence initiated. Habitat release authorized.':'De-spinning habitat. Retracting tether assembly.');}
function startClimb(up){player.climb={up};player.pos.x=ladder.x;player.pos.z=-5.8;player.pos.y=up?1.68:6.88;player.yaw=0;player.pitch=up?.35:-.55;player.vy=0;$('ladderHint').classList.remove('hidden');beep();}
function floorAt(x,z){return player.ground>2?5.2:0;}
function canStand(x,z,ground){const r=.24;for(const [dx,dz]of [[r,r],[-r,r],[r,-r],[-r,-r]]){if(!volumes.some(v=>Math.abs(v.y-ground)<.3&&x+dx>=v.x1&&x+dx<=v.x2&&z+dz>=v.z1&&z+dz<=v.z2))return false;}for(const o of colliders){if(Math.abs(o.y-ground)>.3||player.pos.y-1.6>o.y+o.h)continue;if(x+r>o.x1&&x-r<o.x2&&z+r>o.z1&&z-r<o.z2)return false;}if(ground>2&&x>2.6&&x<5.8&&z>-7.4&&z<-4.1)return false;return true;}
function movePlayer(dt){if(player.climb){const move=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0);player.pos.y=clamp(player.pos.y+move*2.2*dt,1.68,6.88);if(move>0&&player.pos.y>=6.879){player.climb=null;player.ground=5.2;player.pitch=0;player.pos.z=-3.7;$('ladderHint').classList.add('hidden');complete('ladder');}else if(move<0&&player.pos.y<=1.681){player.climb=null;player.ground=0;player.pitch=0;player.pos.z=-5.2;$('ladderHint').classList.add('hidden');}return;}
 const turn=(keys.has('ArrowLeft')?1:0)-(keys.has('ArrowRight')?1:0);player.yaw+=turn*dt*1.45;player.pitch=clamp(player.pitch+((keys.has('ArrowUp')?1:0)-(keys.has('ArrowDown')?1:0))*dt,-1.45,1.45);
 let f=(keys.has('KeyW')?1:0)-(keys.has('KeyS')?1:0),s=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);const len=Math.hypot(f,s)||1;f/=len;s/=len;const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?4.3:2.55)*dt;
 const dx=(-Math.sin(player.yaw)*f+Math.cos(player.yaw)*s)*speed,dz=(-Math.cos(player.yaw)*f-Math.sin(player.yaw)*s)*speed;
 if(canStand(player.pos.x+dx,player.pos.z,player.ground))player.pos.x+=dx;if(canStand(player.pos.x,player.pos.z+dz,player.ground))player.pos.z+=dz;
 if(keys.has('Space')&&player.pos.y<=player.ground+1.69){player.vy=3.4;keys.delete('Space');beep(95,.045);}player.vy-=9.81*Math.max(.15,gravity())*dt;player.pos.y=Math.max(player.ground+1.68,player.pos.y+player.vy*dt);if(player.pos.y<=player.ground+1.68)player.vy=0;
 if(f||s){walkPhase+=dt*(speed/dt)*2.2;}
}
function gravity(){return lerp(1,Math.pow(rpm/5.98,2),deploy);}
function updateShip(dt){const rate=1/10;deploy=THREE.MathUtils.moveTowards?THREE.MathUtils.moveTowards(deploy,gravityTarget,dt*rate):deploy+clamp(gravityTarget-deploy,-dt*rate,dt*rate);const targetRPM=deploy>.97&&gravityTarget?5.98:0;rpm+=clamp(targetRPM-rpm,-dt*.9,dt*.7);angle+=rpm*Math.PI/30*dt;
 const easing=deploy*deploy*(3-2*deploy),distance=lerp(5.6,25,easing);habPivot.position.set(0,-distance,0);drive.position.set(0,distance*.7,0);habitat.rotation.z=lerp(Math.PI/2,0,Math.min(1,deploy*3));drive.rotation.z=Math.PI/2;
 spinner.rotation.x=angle;
 for(let i=0;i<4;i++){const x=i%2?2.9:-2.9,z=i<2?-1.1:1.1;const a=new THREE.Vector3(x,-distance+1.5,z),b=new THREE.Vector3(x*.6,distance*.7-2,z*1.3),diff=b.clone().sub(a);const o=cables[i];o.position.copy(a).add(b).multiplyScalar(.5);o.scale.set(.027,diff.length(),.027);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),diff.normalize());o.visible=deploy>.03;}
 exhausts.forEach(o=>o.visible=deploy<.1);axisGuide.visible=deploy>.85;axisGuide.scale.setScalar(distance/20);
 cosmos.rotation.x=externalMode?0:-angle;windowViews.forEach(o=>o.rotation.z=-angle);if(ambient)ambient.gain.gain.value=state.volume*(paused?.015:.045);
 $('gValue').textContent=gravity().toFixed(2);$('rpmValue').textContent=rpm.toFixed(2)+' RPM';$('tetherValue').textContent=deploy<.01?'STOWED':(deploy*40).toFixed(0)+' m';$('gravityMode').textContent=deploy<.01?'THRUST GRAVITY':rpm>=5.95?'CENTRIFUGAL GRAVITY':'TRANSITION / MAG BOOTS';$('gravityBtn').innerHTML=`G <span>${gravityTarget?'RETRACT CENTRIFUGE':'DEPLOY CENTRIFUGE'}</span> ↗`;$('miniSpin').setAttribute('transform',`rotate(${angle*180/Math.PI} 90 40)`);
 let step=deploy<.25?1:deploy<.98?2:rpm<5.95?3:4;
 $('sequenceTitle').textContent=!gravityTarget?(deploy>.01?'Returning to thrust mode':'Cruise configuration'):step===1?'Releasing the habitat':step===2?'Paying out the tethers':step===3?'Building artificial gravity':'A world in rotation';
 $('sequenceDetail').textContent=!gravityTarget?'Drive and habitat assemblies reunite along the thrust axis.':step===1?'Gimbal turns the crew module through 90°.':step===2?'Four cables extend. Habitat and drive separate.':step===3?'Reaction-control thrusters bring the ship into rotation.':'25 m habitat radius · 5.98 rpm · approximately 1 g';
 for(let i=1;i<=4;i++)$('s'+i).classList.toggle('active',i<=step&&!!gravityTarget);
 if(gravityTarget&&rpm>=5.95&&!state.done.has('gravity'))complete('gravity');
 if(sequenceAuto){sequenceTime+=dt;if((gravityTarget&&rpm>=5.952||!gravityTarget&&deploy<.001&&rpm<.01)&&sequenceTime>18){sequenceAuto=false;notify('Configuration stable. Press C to return aboard and explore.');}}
}
function updateRoom(){const r=rooms.find(r=>Math.abs(r.y-player.ground)<.2&&player.pos.x>r.x1&&player.pos.x<r.x2&&player.pos.z>r.z1&&player.pos.z<r.z2);if(r){if(currentRoom!==r.id){currentRoom=r.id;$('roomName').textContent=r.name;$('roomSub').textContent=r.sub;$('deck').textContent=r.y?'DECK 02 / OBSERVATION':'DECK 01 / HABITAT';}if(!state.visited.has(r.id)){state.visited.add(r.id);save();notify('UNIT DISCOVERED / '+r.name.toUpperCase());beep(530,.1);}if(state.visited.size===6)complete('tour');}
 $('visitedCount').textContent=`${state.visited.size} / 6 UNITS EXPLORED`;let mx=100+player.pos.x*3,my=101+player.pos.z*3.5;$('mapPlayer').setAttribute('cx',mx);$('mapPlayer').setAttribute('cy',my);$('mapHeading').setAttribute('transform',`translate(${mx} ${my}) rotate(${-player.yaw*180/Math.PI})`);
}
const direction=new THREE.Vector3();
function updateInteraction(){nearest=null;if(player.climb||externalMode||paused){$('interaction').classList.add('hidden');return;}camera.getWorldDirection(direction);let best=Infinity;for(const o of interactives){const v=o.pos.clone().sub(player.pos),d=v.length();if(d<o.range&&direction.dot(v.normalize())>.30&&d<best){best=d;nearest=o;}}$('interaction').classList.toggle('hidden',!nearest);if(nearest)$('interaction').lastElementChild.textContent=nearest.name;}
function render(now){requestAnimationFrame(render);const dt=Math.min((now-lastTime)/1000,.04);lastTime=now;time+=dt;
 if(!paused){updateShip(dt);if(!externalMode){movePlayer(dt);updateRoom();}}
 if(!started){camera.position.set(-.1,2.05,7.1);camera.rotation.set(-.02,-.2+Math.sin(time*.09)*.025,0,'YXZ');}
 else if(externalMode){const pitch=clamp(orbitPitch,-1.35,1.35);camera.position.set(Math.sin(orbitYaw)*Math.cos(pitch)*orbitDistance,Math.sin(pitch)*orbitDistance,Math.cos(orbitYaw)*Math.cos(pitch)*orbitDistance);camera.lookAt(0,0,0);}
 else{camera.position.copy(player.pos);if(!paused&&!player.climb&&(keys.has('KeyW')||keys.has('KeyS')||keys.has('KeyA')||keys.has('KeyD')))camera.position.y+=Math.sin(walkPhase*2)*.023;camera.rotation.set(player.pitch,player.yaw,0,'YXZ');}
 sampleGroup.rotation.y=time*.2;updateInteraction();pipeline.update(rooms.find(r=>r.id===currentRoom),externalMode);pipeline.render();
}
$('startBtn').onclick=start;$('menuBtn').onclick=menu;$('closeModal').onclick=closeModal;$('gravityBtn').onclick=toggleGravity;$('returnBtn').onclick=()=>setExternal(false);$('smallMap').onclick=showMap;
addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Escape'){if(modalOpen)closeModal();else if(started)menu();return;}if(!started)return;if(e.code==='KeyM'){showMap();return;}if(modalOpen)return;if(e.code==='KeyC'){setExternal(!externalMode);return;}if(e.code==='KeyG'){toggleGravity();return;}if(e.code==='KeyE'&&nearest){nearest.action();return;}keys.add(e.code);});
addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();if(started&&!modalOpen){paused=true;menu();}});
renderer.domElement.addEventListener('mousedown',e=>{if(e.button!==0||modalOpen)return;drag=true;if(started&&!externalMode&&!document.pointerLockElement)acquirePointer();});addEventListener('mouseup',()=>drag=false);
addEventListener('mousemove',e=>{if(!started||modalOpen)return;if(externalMode&&drag){orbitYaw-=e.movementX*.006;orbitPitch+=e.movementY*.005;}else if(!externalMode&&(document.pointerLockElement||drag)){player.yaw-=e.movementX*.0021*state.sensitivity;player.pitch=clamp(player.pitch-e.movementY*.0021*state.sensitivity,-1.45,1.45);}});
renderer.domElement.addEventListener('wheel',e=>{if(externalMode)orbitDistance=clamp(orbitDistance+e.deltaY*.035,28,150);},{passive:true});
document.addEventListener('pointerlockchange',()=>{if(!document.pointerLockElement){keys.clear();if(started&&!externalMode&&!modalOpen&&!paused)menu();}});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);pipeline.resize();});
addEventListener('error',e=>{console.error(e.error);});
updateObjectives();updateShip(0);requestAnimationFrame(render);
// Read-only diagnostics make the built game verifiable without a testing-only play mode.
window.hailMary={getState:()=>({started,paused,externalMode,position:player.pos.toArray(),yaw:player.yaw,pitch:player.pitch,ground:player.ground,climbing:!!player.climb,room:currentRoom,visited:[...state.visited],done:[...state.done],deploy,rpm,gravity:gravity(),interaction:nearest?.id,quality:pipeline.quality,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),layout:rooms.map(({id,x1,x2,z1,z2,y})=>({id,x1,x2,z1,z2,y})),canStand:(x,z,y)=>canStand(x,z,y)};
