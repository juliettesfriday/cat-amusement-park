import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { createFireworks } from './fireworks';
import { createBalloonRide, type BalloonPhase } from './balloon-ride';

export type RideId = 'wheel' | 'carousel' | 'cars' | 'teacups' | 'balloon';
export type ParkState = { active: RideId | null; visited: RideId[]; moving: boolean; balloonPhase: BalloonPhase };
export type ParkAPI = { visit: (id: RideId) => void; setNight: (night: boolean) => void; reset: () => void; dispose: () => void };
type Options = { onReady: () => void; onError: (message: string) => void; onState: (state: ParkState) => void };
type Obstacle = { x: number; z: number; r: number; halfX?: number; halfZ?: number };
type Ride = { id: RideId; group: THREE.Group; entrance: THREE.Vector3; bulbs: THREE.MeshStandardMaterial; light: THREE.PointLight; glow: THREE.Mesh; amount: number; radius: number; update: (t: number, dt: number, amount: number) => void };
const C = { cream: '#fff0ce', paper: '#fff9e9', sand: '#eacb97', peach: '#eeaa7e', pink: '#e68aa6', blush: '#f5c2ce', lightPink: '#ffdbdf', coral: '#df7e75', blue: '#6b9ace', cobalt: '#467db9', mint: '#97bfb0', leaf: '#b6c890', green: '#819e78', bark: '#b08069', gold: '#e5b966', ink: '#34303d', eyes: '#c5d99b', ground: '#becf98', path: '#f1d5a1', rim: '#9faf93' };
const TAU = Math.PI * 2;
const CAT_SCALE = .99, BASKET_FLOOR = .79, BALLOON_HEIGHT = 2.3;
const smooth = (t: number) => t * t * (3 - 2 * t);
const v = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);

export function createPark(mount: HTMLDivElement, options: Options): ParkAPI {
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch { options.onError('这个浏览器暂时无法显示 3D 场景，请使用支持 WebGL 的浏览器重新打开。'); return { visit(){}, setNight(){}, reset(){}, dispose(){} }; }
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-20,20,14,-14,.1,150);
  camera.position.set(15,25,37); camera.lookAt(0,1.3,0);
  scene.add(camera);
  const fireworks = createFireworks(camera);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.26;
  renderer.setClearColor(0,0); mount.appendChild(renderer.domElement);
  const canvas = renderer.domElement;
  const hemi = new THREE.HemisphereLight('#fff2dd','#a4aac3',2.7); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffedcf',3.5); sun.position.set(-12,23,14); sun.castShadow = true;
  sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-20;sun.shadow.camera.right=20;sun.shadow.camera.top=20;sun.shadow.camera.bottom=-20;sun.shadow.normalBias=.055;sun.shadow.bias=-.0002;sun.shadow.radius=4;scene.add(sun);
  const fill = new THREE.DirectionalLight('#b1c6ec',1.25); fill.position.set(15,10,-10);scene.add(fill);
  const materials = new Map<string,THREE.MeshStandardMaterial>();
  const geometries = new Set<THREE.BufferGeometry>();
  const extras: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const g = <T extends THREE.BufferGeometry>(geometry:T):T => { geometries.add(geometry); return geometry; };
  function mat(color:string) { if(!materials.has(color)){
    const material = new THREE.MeshStandardMaterial({color,roughness:.92,metalness:0});
    // A small object-space pigment variation keeps the toy surfaces tactile.
    material.onBeforeCompile = shader => {
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vPigment;').replace('#include <begin_vertex>','#include <begin_vertex>\nvPigment = position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vPigment;').replace('#include <color_fragment>','#include <color_fragment>\nfloat pigment = fract(sin(dot(floor(vPigment * 140.0), vec3(12.9898,78.233,37.719))) * 43758.5453);\ndiffuseColor.rgb *= 0.97 + pigment * 0.065;');
    };
    materials.set(color,material);
  } return materials.get(color)!; }
  function mesh(parent:THREE.Object3D,geometry:THREE.BufferGeometry,material:string|THREE.Material,x=0,y=0,z=0){ const m=new THREE.Mesh(geometry,typeof material==='string'?mat(material):material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m; }
  const sphereGeo = g(new THREE.SphereGeometry(1,16,10));
  function ball(parent:THREE.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string|THREE.Material){const m=mesh(parent,sphereGeo,color,x,y,z);m.scale.set(sx,sy,sz);return m;}
  function box(parent:THREE.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,color:string,r=.09){return mesh(parent,g(new RoundedBoxGeometry(w,h,d,2,r)),color,x,y,z);}
  function cylinder(parent:THREE.Object3D,x:number,y:number,z:number,rt:number,rb:number,h:number,color:string|THREE.Material,segments=32){return mesh(parent,g(new THREE.CylinderGeometry(rt,rb,h,segments)),color,x,y,z);}
  function rod(parent:THREE.Object3D,a:THREE.Vector3,b:THREE.Vector3,r:number,color:string|THREE.Material){const d=b.clone().sub(a);const m=mesh(parent,g(new THREE.CylinderGeometry(r,r,d.length(),8)),color);m.position.copy(a).add(b).multiplyScalar(.5);m.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return m;}
  function curve(parent:THREE.Object3D,points:THREE.Vector3[],r:number,color:string|THREE.Material){return mesh(parent,g(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,r,7,false)),color);}
  function ring(parent:THREE.Object3D,x:number,y:number,z:number,r:number,tube:number,color:string|THREE.Material){return mesh(parent,g(new THREE.TorusGeometry(r,tube,8,72)),color,x,y,z);}
  const root=new THREE.Group();scene.add(root);
  // The island is a low, rounded miniature with a painted green top.
  const island=cylinder(root,0,-.52,0,17.15,16.85,1,C.rim,96);island.scale.z=.78;
  const lip=cylinder(root,0,-.09,0,17.3,17.15,.35,C.ground,96);lip.scale.z=.78;
  const soil=cylinder(root,0,-.71,0,16.87,16.3,.45,C.sand,96);soil.scale.z=.78;
  const shadowMat=new THREE.ShadowMaterial({opacity:.17,depthWrite:false});extras.push(shadowMat);
  const shadow=mesh(scene,g(new THREE.PlaneGeometry(100,100)),shadowMat,0,-1.01,0);shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;
  // Wide walking ribbons join the entrances, with slightly wobbly storybook edges.
  function path(points:THREE.Vector3[],width:number){const crv=new THREE.CatmullRomCurve3(points),verts:number[]=[],indices:number[]=[];for(let i=0;i<=100;i++){const t=i/100,p=crv.getPoint(t),d=crv.getTangent(t),side=v(-d.z,0,d.x).normalize().multiplyScalar(width/2*(1+Math.sin(t*37)*.025));verts.push(p.x+side.x,.105,p.z+side.z,p.x-side.x,.105,p.z-side.z);if(i<100){const j=i*2;indices.push(j,j+2,j+1,j+1,j+2,j+3);}}const geo=g(new THREE.BufferGeometry());geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setIndex(indices);geo.computeVertexNormals();const m=mesh(root,geo,C.path);m.castShadow=false;}
  path([v(-3,0,12.2),v(-2.4,0,8.7),v(-1,0,4.6),v(-2.5,0,1),v(-6.1,0,-1.25)],2.15);
  path([v(-1,0,4),v(1.5,0,1.8),v(2.5,0,-.5),v(2.7,0,-1.6)],1.95);
  path([v(-1,0,5.4),v(1.8,0,6.1),v(5.9,0,7.7),v(9.5,0,7.4)],1.95);
  path([v(-6.1,0,-1.25),v(-9.3,0,.3),v(-10.6,0,2),v(-10.9,0,5)],1.65);
  path([v(-1,0,5.4),v(-3.4,0,4.5),v(-4.8,0,4.6)],1.9);
  path([v(1.5,0,1.8),v(5,0,.5),v(7.4,0,-1),v(8.3,0,-2.9)],1.8);
  path([v(-7,0,-5),v(-4,0,-8),v(0,0,-8.7),v(6,0,-8.7),v(10,0,-8)],1.4);
  const rides:Ride[]=[];
  const obstacles:Obstacle[]=[];
  function glowTexture(){const c=document.createElement('canvas');c.width=c.height=128;const cx=c.getContext('2d')!;const gr=cx.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,207,88,.8)');gr.addColorStop(.4,'rgba(255,189,65,.3)');gr.addColorStop(1,'rgba(255,190,55,0)');cx.fillStyle=gr;cx.fillRect(0,0,128,128);const t=new THREE.CanvasTexture(c);textures.push(t);return t;}
  const glowMap=glowTexture();
  function makeRide(id:RideId,x:number,z:number,radius:number,entrance:THREE.Vector3):Ride{
    const group=new THREE.Group();group.position.set(x,0,z);root.add(group);
    const bulbs=new THREE.MeshStandardMaterial({color:'#fff3c5',emissive:'#ffc456',emissiveIntensity:.12,roughness:.35});extras.push(bulbs);
    const light=new THREE.PointLight('#ffd890',0,10,1.5);light.position.set(x,2.4,z);root.add(light);
    const gm=new THREE.MeshBasicMaterial({map:glowMap,transparent:true,opacity:0,depthWrite:false});extras.push(gm);
    const glow=mesh(root,g(new THREE.PlaneGeometry(radius*3.4,radius*3.4)),gm,x,.135,z);glow.rotation.x=-Math.PI/2;glow.castShadow=false;glow.receiveShadow=false;
    const ride={id,group,bulbs,light,glow,amount:0,radius,entrance,update:()=>{}};rides.push(ride);obstacles.push({x,z,r:radius});return ride;
  }
  // Ferris wheel: two airy rims, suspended upright gondolas and tiny bulbs.
  const wheel=makeRide('wheel',-6.5,-4.6,2.3,v(-6.1,.1,-1.35));const wg=wheel.group;
  cylinder(wg,0,.2,0,2.6,2.7,.23,C.peach);cylinder(wg,0,.35,0,2.5,2.5,.15,C.cream);
  const axleY=4.6,wr=3.6;
  for(const z of [-.52,.52]){rod(wg,v(-1.9,.4,z*2),v(0,axleY,z),.14,C.coral);rod(wg,v(1.9,.4,z*2),v(0,axleY,z),.14,C.coral);rod(wg,v(-1.5,1.15,z*2),v(1.5,1.15,z*2),.08,C.peach);}
  rod(wg,v(0,axleY,-.8),v(0,axleY,.8),.21,C.gold);
  const rotor=new THREE.Group();rotor.position.y=axleY;wg.add(rotor);
  for(const z of [-.38,.38]){ring(rotor,0,0,z,wr,.095,C.paper);ring(rotor,0,0,z,wr-.24,.045,C.peach);for(let i=0;i<12;i++){const a=i/12*TAU;rod(rotor,v(0,0,z),v(Math.cos(a)*wr,Math.sin(a)*wr,z),.045,C.cream);}}
  const gondolas:THREE.Group[]=[];
  for(let i=0;i<10;i++){
    const a=i/10*TAU,carrier=new THREE.Group();carrier.position.set(Math.cos(a)*wr,Math.sin(a)*wr,0);rotor.add(carrier);gondolas.push(carrier);
    rod(carrier,v(0,0,0),v(0,-.42,0),.035,C.gold);
    const color=[C.blue,C.pink,C.peach,C.mint,C.cream][i%5];
    box(carrier,0,-.95,0,.79,.58,.7,color,.15);box(carrier,0,-.67,0,.68,.19,.62,C.paper,.08);
    for(const x of [-.31,.31])for(const z of [-.26,.26])rod(carrier,v(x,-.4,z),v(x,-.87,z),.025,C.paper);
    const roof=cylinder(carrier,0,-.4,0,.06,.57,.3,color,8);roof.scale.z=.78;
    ball(carrier,0,-.27,0,.06,.08,.06,C.gold);
    for(const x of [-.22,.22])ball(carrier,x,-.9,.36,.07,.07,.028,wheel.bulbs);
  }
  for(let i=0;i<60;i++){const a=i/60*TAU;ball(rotor,Math.cos(a)*wr,Math.sin(a)*wr,.46,.068,.068,.068,wheel.bulbs);}
  ball(wg,0,axleY,.64,.39,.39,.13,C.peach);ball(wg,0,axleY,.79,.23,.23,.08,wheel.bulbs);
  let wheelAngle=0;wheel.update=(_t,dt,a)=>{wheelAngle+=dt*(.023+a*.13);rotor.rotation.z=wheelAngle;gondolas.forEach((b,i)=>b.rotation.z=-wheelAngle+Math.sin(_t*.8+i)*.015);};
  // Carousel: scalloped strawberry and cream canopy, three sculpted little ponies.
  const carousel=makeRide('carousel',3,-4.8,2.65,v(2.7,.1,-1.55));const cg=carousel.group;
  cylinder(cg,0,.24,0,2.75,2.88,.35,C.peach,64);cylinder(cg,0,.46,0,2.65,2.72,.15,C.cream,64);
  cylinder(cg,0,2.15,0,.2,.26,3.5,C.gold);cylinder(cg,0,1.65,0,.65,.65,2.55,C.paper);
  for(let i=0;i<8;i++){const a=i/8*TAU;const panel=box(cg,Math.cos(a)*.64,1.8,Math.sin(a)*.64,.23,1.7,.04,i%2?C.pink:C.blue,.06);panel.rotation.y=-a+Math.PI/2;}
  const platform=new THREE.Group();cg.add(platform);const horses:THREE.Group[]=[];
  function pony(parent:THREE.Group,a:number,color:string){const h=new THREE.Group();h.position.set(Math.cos(a)*1.83,1.25,Math.sin(a)*1.83);h.rotation.y=-a;parent.add(h);horses.push(h);
    ball(h,0,0,0,.54,.28,.24,color);ball(h,.33,.31,0,.19,.48,.19,color);ball(h,.48,.64,0,.3,.2,.2,color);ball(h,.65,.59,0,.19,.15,.17,color);
    const ear=mesh(h,g(new THREE.ConeGeometry(.1,.26,8)),color,.37,.89,0);ear.rotation.z=-.2;
    for(const x of [-.33,.28])for(const z of [-.15,.15]){const leg=rod(h,v(x,-.08,z),v(x+.07,-.56,z),.07,color);leg.rotation.z=x>0?-.18:.2;ball(h,x+.08,-.56,z,.115,.08,.095,C.gold);}
    ball(h,-.03,.26,0,.25,.05,.26,C.coral);curve(h,[v(-.5,.1,0),v(-.68,.02,0),v(-.75,-.32,.02)],.09,C.peach);
    curve(h,[v(.25,.8,0),v(.13,.61,0),v(.1,.3,0)],.1,C.peach);ball(h,.53,.69,.178,.028,.035,.02,C.ink);
    rod(platform,v(Math.cos(a)*1.83,.5,Math.sin(a)*1.83),v(Math.cos(a)*1.83,3.55,Math.sin(a)*1.83),.036,C.gold);
  }
  for(let i=0;i<5;i++)pony(platform,i/5*TAU,i%2?C.lightPink:C.paper);
  for(let i=0;i<16;i++){
    const a=i/16*TAU;const geo=g(new THREE.ConeGeometry(2.96,1.28,1,1,false,a,TAU/16));const cap=mesh(cg,geo,i%2?C.paper:C.pink,0,4.16,0);cap.receiveShadow=true;
    ball(cg,Math.sin(a+TAU/32)*2.8,3.54,Math.cos(a+TAU/32)*2.8,.3,.22,.3,i%2?C.paper:C.pink);
  }
  const trim=ring(cg,0,3.49,0,2.77,.08,C.gold);trim.rotation.x=Math.PI/2;
  for(let i=0;i<36;i++){const a=i/36*TAU;ball(cg,Math.sin(a)*2.79,3.44,Math.cos(a)*2.79,.055,.055,.055,carousel.bulbs);}
  cylinder(cg,0,4.98,0,.055,.065,.6,C.gold);const flag=mesh(cg,g(new THREE.PlaneGeometry(.65,.34)),C.coral,.31,5.14,0);flag.material=mat(C.coral);(flag.material as THREE.MeshStandardMaterial).side=THREE.DoubleSide;
  ball(cg,0,4.83,0,.16,.15,.16,C.gold);
  let horsePhase=0;
  carousel.update=(_t,dt,a)=>{platform.rotation.y+=dt*(.022+a*.25);horsePhase+=dt*(.4+a*1.6);horses.forEach((h,i)=>h.position.y=1.24+Math.sin(horsePhase+i*1.4)*(.04+a*.19));};
  // Open-air bumper cars, with an unobstructed view of all three cars.
  const cars=makeRide('cars',8.3,4.4,2.72,v(6.1,.1,7.45));const bg=cars.group;
  const carObstacle=obstacles[obstacles.length-1];carObstacle.halfX=2.95;carObstacle.halfZ=2.225;
  box(bg,0,.23,0,5.9,.35,4.45,C.blue,.4);box(bg,0,.44,0,5.58,.16,4.13,C.cream,.32);
  box(bg,0,.55,0,5.19,.08,3.76,C.mint,.3);
  for(const z of [-1.95,1.95]){box(bg,0,.72,z,5.6,.28,.17,C.coral,.07);for(let i=0;i<16;i++)ball(bg,-2.6+i*.345,.79,z,.055,.055,.055,cars.bulbs);}
  for(const x of [-2.69,2.69])box(bg,x,.72,0,.17,.28,4,C.coral,.07);
  for(const x of [-2.65,2.65]){rod(bg,v(x,.5,-1.9),v(x,3.2,-1.9),.075,C.cobalt);ball(bg,x,3.24,-1.9,.15,.15,.15,C.gold);}
  curve(bg,[v(-2.65,3.15,-1.9),v(0,2.8,-1.9),v(2.65,3.15,-1.9)],.028,C.cream);
  for(let i=0;i<12;i++){const x=-2.5+i/11*5,y=2.83+.3*Math.pow(x/2.5,2);ball(bg,x,y-.1,-1.9,.085,.085,.085,cars.bulbs);}
  const vehicles:THREE.Group[]=[];
  for(let i=0;i<3;i++){
    const car=new THREE.Group();bg.add(car);vehicles.push(car);const color=[C.pink,C.peach,C.blue][i];
    const bumper=ring(car,0,.7,0,.54,.13,C.ink);bumper.rotation.x=Math.PI/2;bumper.scale.set(1.1,1.32,1);
    ball(car,0,.85,0,.57,.29,.72,color);box(car,0,1.05,.07,.56,.12,.66,C.paper,.14);box(car,0,1.22,.24,.52,.39,.16,color,.12);
    const sw=ring(car,0,1.24,-.18,.13,.025,C.ink);sw.rotation.x=-.65;
    rod(car,v(0,1,-.23),v(0,1.23,-.17),.022,C.gold);
    for(const x of [-.27,.27])ball(car,x,.94,-.59,.09,.075,.048,cars.bulbs);
    rod(car,v(0,1,.42),v(0,2.02,.42),.023,C.cobalt);ball(car,0,2.05,.42,.055,.07,.055,C.coral);
  }
  let carsAngle=0;
  cars.update=(_t,dt,a)=>{carsAngle+=dt*(.055+a*.44);vehicles.forEach((car,i)=>{const angle=carsAngle+i*TAU/3;car.position.set(Math.cos(angle)*1.54,0,Math.sin(angle)*.82);car.rotation.y=-angle-Math.PI/2;});};
  // Candy teacups: a turning platter with three independently spinning cups.
  const teacups=makeRide('teacups',-7.9,4.6,2.45,v(-4.7,.1,4.6));const tg=teacups.group;
  cylinder(tg,0,.2,0,2.5,2.65,.32,C.coral,64);cylinder(tg,0,.4,0,2.45,2.5,.16,C.cream,64);
  const teaPlatter=new THREE.Group();teaPlatter.position.y=.5;tg.add(teaPlatter);
  cylinder(teaPlatter,0,0,0,2.29,2.29,.1,C.blush,64);
  for(let i=0;i<36;i++){const a=i/36*TAU;ball(tg,Math.cos(a)*2.5,.34,Math.sin(a)*2.5,.067,.067,.067,teacups.bulbs);}
  const teaCups:THREE.Group[]=[];
  const cupProfile=[new THREE.Vector2(0,0),new THREE.Vector2(.43,0),new THREE.Vector2(.52,.14),new THREE.Vector2(.64,.55),new THREE.Vector2(.67,.71),new THREE.Vector2(.61,.72),new THREE.Vector2(.58,.56),new THREE.Vector2(.46,.19),new THREE.Vector2(0,.19)];
  const cupGeometry=g(new THREE.LatheGeometry(cupProfile,32));
  for(let i=0;i<3;i++){
    const a=i/3*TAU,cup=new THREE.Group();cup.position.set(Math.cos(a)*1.35,.08,Math.sin(a)*1.35);teaPlatter.add(cup);teaCups.push(cup);
    const color=[C.blue,C.peach,C.mint][i];
    cylinder(cup,0,.035,0,.85,.79,.08,C.paper,32);mesh(cup,cupGeometry,color,0,.12,0);
    const rim=ring(cup,0,.835,0,.642,.035,C.cream);rim.rotation.x=Math.PI/2;
    ring(cup,.77,.56,0,.28,.066,color);
    const stripe=ring(cup,0,.39,0,.554,.025,C.paper);stripe.rotation.x=Math.PI/2;
    const steering=ring(cup,0,.65,0,.18,.025,C.gold);steering.rotation.x=Math.PI/2;
    rod(cup,v(0,.31,0),v(0,.65,0),.027,C.gold);
    for(let j=0;j<3;j++){const t=j/3*TAU;rod(cup,v(0,.65,0),v(Math.cos(t)*.18,.65,Math.sin(t)*.18),.013,C.gold);}
  }
  ball(teaPlatter,0,.42,0,.46,.38,.46,C.paper);cylinder(teaPlatter,0,.76,0,.26,.34,.1,C.peach,24);ball(teaPlatter,0,.86,0,.085,.09,.085,C.gold);
  curve(teaPlatter,[v(.32,.43,0),v(.57,.51,0),v(.73,.76,0)],.09,C.paper);ring(teaPlatter,-.47,.5,0,.26,.055,C.peach);
  teacups.update=(_t,dt,a)=>{teaPlatter.rotation.y+=dt*(.035+a*.33);teaCups.forEach((cup,i)=>cup.rotation.y+=dt*(.045+a*.75)*(i%2?-1:1));};

  // A tethered pastel balloon rises gently over a cloud-colored platform.
  const balloon=makeRide('balloon',10,-5.3,2.1,v(8.3,.1,-2.9));const ag=balloon.group;
  cylinder(ag,0,.18,0,2.23,2.36,.28,C.blue,64);cylinder(ag,0,.36,0,2.19,2.23,.12,C.cream,64);
  for(let i=0;i<32;i++){const a=i/32*TAU;ball(ag,Math.cos(a)*2.22,.28,Math.sin(a)*2.22,.067,.067,.067,balloon.bulbs);}
  const balloonLift=new THREE.Group();ag.add(balloonLift);
  const balloonRide=createBalloonRide();
  for(let i=0;i<10;i++){
    const sector=g(new THREE.SphereGeometry(1,4,20,i/10*TAU,TAU/10,0,Math.PI));
    const panel=mesh(balloonLift,sector,i%2?C.paper:[C.pink,C.peach,C.blue,C.mint,C.blush][Math.floor(i/2)],0,5.2,0);panel.scale.set(1.45,1.78,1.45);
  }
  cylinder(balloonLift,0,3.49,0,.29,.22,.4,C.coral,24);
  // A genuinely open basket: thick walls and a separate floor, with no top cap.
  const basketProfile=[new THREE.Vector2(.92,.62),new THREE.Vector2(1.04,1.49),new THREE.Vector2(.94,1.51),new THREE.Vector2(.84,.77),new THREE.Vector2(.84,.67),new THREE.Vector2(.92,.62)];
  mesh(balloonLift,g(new THREE.LatheGeometry(basketProfile,40)),C.sand);
  cylinder(balloonLift,0,.75,0,.855,.855,.08,C.peach,40);
  for(const y of [.67,.91,1.17,1.48]){const band=ring(balloonLift,0,y,0,.925+(y-.62)*.13,.03,C.peach);band.rotation.x=Math.PI/2;}
  const basketRim=ring(balloonLift,0,1.50,0,.99,.055,C.cream);basketRim.rotation.x=Math.PI/2;
  for(let i=0;i<24;i++){const a=i/24*TAU;rod(balloonLift,v(Math.cos(a)*.926,.65,Math.sin(a)*.926),v(Math.cos(a)*1.042,1.47,Math.sin(a)*1.042),.012,C.cream);}
  for(const x of [-.7,.7])for(const z of [-.7,.7])rod(balloonLift,v(x,1.5,z),v(x*.46,3.55,z*.46),.03,C.gold);
  cylinder(balloonLift,0,3.14,0,.12,.16,.16,C.gold,12);ball(balloonLift,0,3.32,0,.085,.16,.085,balloon.bulbs);
  // Flexible mooring lines are reshaped as the basket floats upward.
  const moorings:THREE.Line[]=[];
  for(let i=0;i<3;i++){
    const a=i/3*TAU;const anchor=v(Math.cos(a)*1.65,.5,Math.sin(a)*1.65);
    cylinder(ag,anchor.x,.65,anchor.z,.045,.065,.48,C.peach,10);
    const geometry=g(new THREE.BufferGeometry().setFromPoints([anchor,v(Math.cos(a)*.9,.65,Math.sin(a)*.9)]));
    const material=new THREE.LineBasicMaterial({color:C.paper,transparent:true,opacity:.8});extras.push(material);const rope=new THREE.Line(geometry,material);ag.add(rope);moorings.push(rope);
  }
  for(let i=0;i<5;i++)ball(ag,-1.3+i*.62,.55,-.9,.46,.19,.34,C.paper);
  balloon.update=(t)=>{
    const phase=balloonRide.phase,p=smooth(balloonRide.progress);
    const lift=phase==='ascending'?p:phase==='floating'?1:phase==='descending'?1-p:0;
    balloonLift.position.y=lift*BALLOON_HEIGHT+(phase==='floating'&&!motion.matches?Math.sin(t*.8)*.055:0);
    balloonLift.rotation.y=phase==='ground'||phase==='boarding'||phase==='disembarking'?0:Math.sin(t*.25)*.035*lift;
    moorings.forEach((rope,i)=>{const angle=i/3*TAU+balloonLift.rotation.y;const positions=rope.geometry.attributes.position;positions.setXYZ(1,Math.cos(angle)*.9,.65+balloonLift.position.y,Math.sin(angle)*.9);positions.needsUpdate=true;});
  };

  // Tag the actual ride geometry for cursor-to-entrance navigation.
  rides.forEach(ride=>ride.group.traverse(object=>{object.userData.ride=ride.id;}));
  let seed=7943;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  const foliageData:{position:THREE.Vector3;scale:THREE.Vector3;color:string}[]=[];
  function cherry(x:number,z:number,size:number){
    const tree=new THREE.Group();tree.position.set(x,.1,z);tree.scale.setScalar(size);root.add(tree);obstacles.push({x,z,r:.47*size});
    rod(tree,v(0,0,0),v(.04,2.6,0),.16,C.bark);
    for(let i=0;i<4;i++){const a=i/4*TAU+.3;rod(tree,v(0,1.2+i*.16,0),v(Math.sin(a)*.85,2.7,Math.cos(a)*.8),.075,C.bark);}
    for(let i=0;i<17;i++){const a=random()*TAU,r=Math.sqrt(random())*1.2;foliageData.push({position:v(x+Math.cos(a)*r*size,(2.7+random()*.95)*size,z+Math.sin(a)*r*size),scale:v(.62+random()*.25,.6+random()*.32,.67+random()*.2).multiplyScalar(size),color:[C.pink,C.blush,C.lightPink][i%3]});}
  }
  [[-14,-6.5,1.08],[-14,0,.95],[-13,7,1.12],[-9,10,.8],[-4,-10.5,.83],[0,-11,.92],[7,-10,1.0],[12.3,-8.7,1.13],[14.6,-1.8,.84],[14,5.7,.82],[9.5,10,.72],[2.3,11.8,.78]].forEach(([x,z,s])=>cherry(x,z,s));
  const dummy=new THREE.Object3D();
  function instances(geo:THREE.BufferGeometry,data:{position:THREE.Vector3;scale:THREE.Vector3;color:string;rotation?:THREE.Euler}[],material:THREE.Material=mat(C.paper)){
    const im=new THREE.InstancedMesh(geo,material,data.length);data.forEach((d,i)=>{dummy.position.copy(d.position);dummy.scale.copy(d.scale);dummy.rotation.copy(d.rotation||new THREE.Euler());dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix);im.setColorAt(i,new THREE.Color(d.color));});im.castShadow=true;im.receiveShadow=true;root.add(im);return im;
  }
  instances(sphereGeo,foliageData);
  // Tiny daisies and pastel leaves planted along the island's edge.
  const petalsData:typeof foliageData=[],centersData:typeof foliageData=[],leavesData:typeof foliageData=[];
  for(let i=0;i<175;i++){
    const a=random()*TAU,r=.83+random()*.13,x=Math.cos(a)*16.65*r,z=Math.sin(a)*12.7*r;
    if(Math.abs(x+3)<1.2&&z>10)continue;
    const color=[C.paper,C.lightPink,C.peach,C.blue][i%4],y=.25+random()*.2;
    centersData.push({position:v(x,y,z),scale:v(.055,.04,.055),color:C.gold});
    for(let j=0;j<5;j++){const angle=j/5*TAU;petalsData.push({position:v(x+Math.cos(angle)*.105,y,z+Math.sin(angle)*.105),scale:v(.105,.035,.075),color});}
    leavesData.push({position:v(x,.16,z),scale:v(.08,y,.07),color:C.green});
  }
  instances(sphereGeo,petalsData);instances(sphereGeo,centersData);instances(sphereGeo,leavesData);
  const grass:typeof foliageData=[];
  for(let i=0;i<330;i++){const a=random()*TAU,r=.8+random()*.18;grass.push({position:v(Math.cos(a)*16.6*r,.18,Math.sin(a)*12.65*r),scale:v(.035,.1+random()*.12,.028),color:i%3?C.green:C.cream});}instances(sphereGeo,grass);
  // A low painted fence frames the rear without enclosing the view.
  for(let i=0;i<35;i++){const a=Math.PI+(i/34)*Math.PI,x=Math.cos(a)*16.25,z=Math.sin(a)*12.4;
    box(root,x,.48,z,.12,.75,.14,C.paper,.045);ball(root,x,.9,z,.1,.11,.1,C.peach);
    if(i<34){const b=Math.PI+((i+1)/34)*Math.PI;for(const y of [.37,.68])rod(root,v(x,y,z),v(Math.cos(b)*16.25,y,Math.sin(b)*12.4),.045,C.paper);}
  }
  // Entrance arch, benches, little lamps and a striped ice-cream cart.
  const gate=new THREE.Group();gate.position.set(-3.0,.1,10.9);root.add(gate);
  for(const x of [-1.35,1.35]){cylinder(gate,x,.75,0,.095,.13,1.5,C.peach);ball(gate,x,1.53,0,.18,.18,.18,C.cream);}
  curve(gate,[v(-1.35,1.5,0),v(-.85,2.04,0),v(0,2.22,0),v(.85,2.04,0),v(1.35,1.5,0)],.1,C.peach);
  function bench(x:number,z:number,angle:number){const b=new THREE.Group();b.position.set(x,.1,z);b.rotation.y=angle;root.add(b);box(b,0,.48,0,1.55,.13,.6,C.peach);for(const xx of [-.58,.58]){rod(b,v(xx,0,0),v(xx,.52,0),.055,C.cobalt);rod(b,v(xx,.32,-.2),v(xx,1,-.2),.05,C.cobalt);}box(b,0,.85,-.24,1.58,.34,.1,C.peach);obstacles.push({x,z,r:.75});}
  bench(-4.3,7.5,-.4);bench(-1,-8,.1);bench(3.6,9.3,-.3);
  const lanterns:THREE.MeshStandardMaterial[]=[];
  for(const [x,z] of [[-10.8,.5],[-4.8,9.2],[1.2,.3],[3,7.3],[10.8,.2],[-4.6,2.7],[6.3,-1.4]]){
    cylinder(root,x,1.05,z,.044,.062,1.9,C.cobalt,10);const lm=new THREE.MeshStandardMaterial({color:C.cream,emissive:'#ffdb96',emissiveIntensity:.3});extras.push(lm);lanterns.push(lm);ball(root,x,2.05,z,.22,.27,.22,lm);cylinder(root,x,2.28,z,.05,.26,.18,C.cobalt,12);cylinder(root,x,.19,z,.14,.2,.23,C.peach,12);}
  const cart=new THREE.Group();cart.position.set(-12,.1,1.9);cart.rotation.y=.33;root.add(cart);obstacles.push({x:-12,z:1.9,r:.88});
  box(cart,0,.66,0,1.45,.87,.9,C.peach,.1);box(cart,0,1.14,0,1.62,.14,1.08,C.cream,.07);
  for(const x of [-.62,.62]){const tire=cylinder(cart,x,.32,.4,.25,.25,.1,C.cobalt,16);tire.rotation.x=Math.PI/2;ball(cart,x,.32,.46,.13,.13,.04,C.paper);}
  for(const x of [-.68,.68])rod(cart,v(x,1,0),v(x,2.15,0),.04,C.gold);
  for(let i=0;i<7;i++){const canopy=box(cart,-.72+i*.24,2.05,0,.245,.12,1.4,i%2?C.paper:C.pink,.03);canopy.rotation.x=.08;ball(cart,-.72+i*.24,1.97,.69,.12,.13,.04,i%2?C.paper:C.pink);}
  for(let i=0;i<3;i++){const xx=(i-1)*.35;cylinder(cart,xx,1.33,0,.115,.04,.29,C.sand,12);ball(cart,xx,1.54,0,.16,.17,.16,[C.paper,C.pink,C.mint][i]);}
  const balloons:THREE.Group[]=[];
  for(const [x,z] of [[-13,3.7],[-1.5,-9.6],[13.1,7.7]]){const b=new THREE.Group();b.position.set(x,0,z);root.add(b);balloons.push(b);for(let i=0;i<3;i++){const xx=(i-1)*.27,yy=2.9+(i%2)*.35;curve(b,[v(0,.2,0),v(xx*.6,1.5,.08),v(xx,yy-.3,0)],.008,C.paper);ball(b,xx,yy,0,.26,.33,.24,[C.pink,C.blue,C.peach][i]);}}
  // Rounded black cat. Each paw has a pivot, so walking is a real gait.
  const cat=new THREE.Group();cat.position.set(-1.55,.16,6.3);root.add(cat);cat.scale.setScalar(CAT_SCALE);
  const body=new THREE.Group();cat.add(body);
  ball(body,0,.67,-.1,.36,.42,.51,C.ink);ball(body,0,.56,-.35,.37,.33,.37,C.ink);
  const head=new THREE.Group();head.position.set(0,1.13,.26);body.add(head);
  ball(head,0,0,0,.46,.38,.38,C.ink);
  for(const x of [-.29,.29]){
    const ear=mesh(head,g(new THREE.ConeGeometry(.23,.45,3)),C.ink,x,.31,-.04);ear.rotation.z=x<0?.2:-.2;ear.rotation.y=x<0?-.2:.2;
    const inner=mesh(head,g(new THREE.ConeGeometry(.12,.23,3)),C.coral,x,.33,.082);inner.rotation.z=x<0?.2:-.2;inner.rotation.y=ear.rotation.y;
  }
  const eyes:THREE.Mesh[]=[];
  for(const x of [-.19,.19]){const eye=ball(head,x,.035,.333,.12,.13,.054,C.eyes);eye.name=x<0?'left-eye':'right-eye';eyes.push(eye);ball(head,x+.009,.04,.382,.037,.087,.014,C.ink);ball(head,x-.023,.08,.393,.024,.026,.012,C.paper);}
  ball(head,0,-.095,.392,.055,.035,.029,C.coral);
  for(const side of [-1,1])for(let i=0;i<2;i++)rod(head,v(side*.28,-.13,.34),v(side*.57,-.11-i*.09,.34),.007,C.cream);
  const scarf=ring(body,0,.94,.2,.295,.075,C.peach);scarf.rotation.x=Math.PI/2;scarf.scale.y=.95;
  const scarfEnd=box(body,.25,.75,.36,.16,.4,.09,C.peach,.03);scarfEnd.rotation.z=.2;
  const legs:THREE.Group[]=[];
  for(const x of [-.24,.24])for(const z of [-.37,.25]){const leg=new THREE.Group();leg.position.set(x,.45,z);body.add(leg);legs.push(leg);ball(leg,0,-.15,0,.12,.24,.12,C.ink);ball(leg,0,-.32,.06,.13,.08,.18,C.ink);}
  const tail=new THREE.Group();tail.position.set(0,.62,-.52);body.add(tail);curve(tail,[v(0,0,0),v(.06,.16,-.3),v(.08,.57,-.52),v(-.02,.87,-.48),v(-.18,.98,-.35)],.085,C.ink);ball(tail,-.18,.98,-.35,.087,.087,.087,C.ink);
  // Separate seated anatomy: folded haunches, vertical forelegs, flat paws and a curled tail.
  const seated=new THREE.Group();cat.add(seated);seated.visible=false;
  ball(seated,0,.32,-.15,.38,.32,.35,C.ink);
  ball(seated,0,.71,.015,.3,.47,.28,C.ink);
  for(const side of [-1,1]){
    ball(seated,side*.25,.25,-.12,.22,.25,.29,C.ink);
    ball(seated,side*.27,.075,.12,.15,.075,.21,C.ink);
    ball(seated,side*.16,.355,.26,.095,.285,.095,C.ink);
    ball(seated,side*.16,.075,.35,.115,.075,.15,C.ink);
  }
  const seatedHead=head.clone(true);seatedHead.position.set(0,1.09,.13);seated.add(seatedHead);
  const seatedEyes=[seatedHead.getObjectByName('left-eye'),seatedHead.getObjectByName('right-eye')] as THREE.Mesh[];
  const seatedScarf=ring(seated,0,.91,.105,.255,.065,C.peach);seatedScarf.rotation.x=Math.PI/2;
  const seatedScarfEnd=box(seated,.2,.72,.32,.14,.32,.07,C.peach,.03);seatedScarfEnd.rotation.z=.22;
  curve(seated,[v(0,.22,-.42),v(.29,.13,-.44),v(.47,.075,-.24),v(.44,.075,.08),v(.25,.075,.31)],.066,C.ink);
  ball(seated,.25,.075,.31,.067,.067,.067,C.ink);
  cat.rotation.y=.05;
  const cursorMat=new THREE.MeshBasicMaterial({color:C.peach,transparent:true,opacity:.65,depthWrite:false});extras.push(cursorMat);
  const cursor=mesh(root,g(new THREE.RingGeometry(.2,.25,40)),cursorMat,0,.15,0);cursor.rotation.x=-Math.PI/2;cursor.visible=false;cursor.castShadow=false;
  const cursorDot=ball(root,0,.15,0,.045,.012,.045,C.peach);cursorDot.visible=false;
  // Petals share one draw call and drift in a slow, deterministic breeze.
  const fallingCount=44,petalGeo=g(new THREE.SphereGeometry(1,5,3));
  const falling=new THREE.InstancedMesh(petalGeo,mat(C.lightPink),fallingCount);root.add(falling);
  const fallingSeeds=Array.from({length:fallingCount},()=>({x:(random()-.5)*32,z:(random()-.5)*24,y:random()*9,s:random()*TAU}));
  // Ground navigation uses a small A* grid to avoid solid attractions and trees.
  const step=.52,nx=65,nz=51,minX=-16.64,minZ=-13;
  const groundPoint=(index:number)=>v(minX+(index%nx)*step,.16,minZ+Math.floor(index/nx)*step);
  function free(x:number,z:number){if((x/16.55)**2+(z/12.8)**2>.99)return false;return !obstacles.some(o=>o.halfX!==undefined&&o.halfZ!==undefined ? Math.abs(x-o.x)<o.halfX+.36 && Math.abs(z-o.z)<o.halfZ+.36 : Math.hypot(x-o.x,z-o.z)<o.r+.36);}
  const nodes=Array.from({length:nx*nz},(_,i)=>{const p=groundPoint(i);return free(p.x,p.z);});
  function nearest(p:THREE.Vector3){let best=-1,dist=Infinity;for(let i=0;i<nodes.length;i++){if(!nodes[i])continue;const q=groundPoint(i),d=(q.x-p.x)**2+(q.z-p.z)**2;if(d<dist){dist=d;best=i;}}return best;}
  function routeTo(target:THREE.Vector3){const start=nearest(cat.position),end=nearest(target);if(start<0||end<0)return[];const scores=new Float32Array(nodes.length).fill(Infinity),previous=new Int32Array(nodes.length).fill(-1),closed=new Uint8Array(nodes.length);scores[start]=0;const open=new Set([start]);const ep=groundPoint(end);let found=false;
    while(open.size){let current=-1,best=Infinity;for(const i of open){const p=groundPoint(i),score=scores[i]+Math.hypot(p.x-ep.x,p.z-ep.z);if(score<best){current=i;best=score;}}if(current===end){found=true;break;}open.delete(current);closed[current]=1;const cx=current%nx,cz=Math.floor(current/nx);
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const xx=cx+dx,zz=cz+dz;if(xx<0||zz<0||xx>=nx||zz>=nz)continue;const next=zz*nx+xx;if(!nodes[next]||closed[next])continue;if(dx&&dz&&(!nodes[cz*nx+xx]||!nodes[zz*nx+cx]))continue;const cost=scores[current]+Math.hypot(dx,dz)*step;if(cost<scores[next]){scores[next]=cost;previous[next]=current;open.add(next);}}
    }
    if(!found)return[];const route:THREE.Vector3[]=[];for(let i=end;i!==start&&i>=0;i=previous[i])route.push(groundPoint(i));route.reverse();return route;
  }
  let waypoints:THREE.Vector3[]=[],lastRouteAt=0;const lastTarget=v(999,0,999);
  let active:RideId|null=null,visited:RideId[]=[],moving=false,lastState='',nightTarget=0,nightAmount=0,disposed=false,frame=0,last=performance.now(),time=0,walkTime=0;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  function publishState(){const key=`${active}|${visited.join(',')}|${moving}|${balloonRide.phase}`;if(key!==lastState){lastState=key;options.onState({active,visited:[...visited],moving,balloonPhase:balloonRide.phase});}}
  function go(target:THREE.Vector3,force=false){if(balloonRide.locked)return;if(!force&&target.distanceTo(lastTarget)<.48)return;lastTarget.copy(target);waypoints=routeTo(target);const destination=waypoints.at(-1);if(destination){cursor.position.copy(destination);cursor.position.y=.15;cursorDot.position.set(destination.x,.16,destination.z);cursor.visible=true;cursorDot.visible=true;}}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(v(0,1,0),-.15),intersect=v();
  function pointTo(event:PointerEvent){if(disposed||balloonRide.locked||event.target!==canvas)return;if(event.pointerType==='touch'&&event.type==='pointermove')return;const now=performance.now();if(now-lastRouteAt<100&&event.type==='pointermove')return;lastRouteAt=now;const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
    const hits=raycaster.intersectObjects(rides.map(r=>r.group),true);const id=hits[0]?.object.userData.ride as RideId|undefined;
    if(id){const ride=rides.find(r=>r.id===id)!;go(ride.entrance);return;}
    if(raycaster.ray.intersectPlane(plane,intersect)&&(intersect.x/17.5)**2+(intersect.z/13.7)**2<1.15)go(intersect);
  }
  const keys=new Set<string>();const handled=['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'];
  function keydown(e:KeyboardEvent){if(handled.includes(e.key)){e.preventDefault();if(balloonRide.locked)return;keys.add(e.key);waypoints=[];lastTarget.set(999,0,999);cursor.visible=false;cursorDot.visible=false;}}
  function keyup(e:KeyboardEvent){keys.delete(e.key);}function blur(){keys.clear();}
  canvas.addEventListener('pointermove',pointTo);canvas.addEventListener('pointerdown',pointTo);mount.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  function resize(){const w=mount.clientWidth,h=mount.clientHeight;renderer.setSize(w,h,false);const aspect=w/h;
    // Portrait devices keep the whole island in view, with room for the controls.
    const span=aspect<.9?37:aspect<1.25?42:47;camera.left=-span/2;camera.right=span/2;camera.top=span/aspect/2;camera.bottom=-span/aspect/2;camera.updateProjectionMatrix();
    camera.position.set(12,24,37);camera.lookAt(0,1.2,0);
  }
  const observer=new ResizeObserver(resize);observer.observe(mount);resize();
  const boardStart=v(),exitStart=v(),exitTarget=v();
  let mustLeaveBalloon=false,boardingPause=0,boardHeading=0;
  function showSeated(value:boolean){body.visible=!value;seated.visible=value;body.scale.y=1;seated.scale.y=1;}
  function restoreGround(position:THREE.Vector3){
    root.add(cat);cat.position.copy(position);cat.scale.setScalar(CAT_SCALE);cat.rotation.set(0,.3,0);
    showSeated(false);body.position.y=0;tail.rotation.x=0;legs.forEach(leg=>leg.rotation.x=0);keys.clear();waypoints=[];lastTarget.set(999,0,999);
  }
  function startBalloonRide(){
    if(!balloonRide.start(motion.matches))return;
    boardStart.copy(cat.position);exitTarget.copy(groundPoint(nearest(balloon.entrance)));boardHeading=cat.rotation.y;
    mustLeaveBalloon=true;boardingPause=0;keys.clear();waypoints=[];moving=false;cursor.visible=false;cursorDot.visible=false;
  }
  function advanceBalloonRide(dt:number){
    if(!balloonRide.update(dt,motion.matches))return;
    if(balloonRide.phase==='settling'){
      balloonLift.add(cat);cat.position.set(0,BASKET_FLOOR,0);cat.rotation.set(0,.3,0);showSeated(true);
    }else if(balloonRide.phase==='disembarking'){
      balloonLift.position.y=0;balloonLift.rotation.y=0;balloonLift.updateWorldMatrix(true,true);
      root.attach(cat);exitStart.copy(cat.position);cat.rotation.set(0,Math.atan2(exitTarget.x-exitStart.x,exitTarget.z-exitStart.z),0);
    }else if(balloonRide.phase==='ground')restoreGround(exitTarget);
  }
  function animatePassenger(){
    const phase=balloonRide.phase,p=balloonRide.progress,eased=smooth(p);
    if(phase==='boarding'){
      const landing=v(ag.position.x,BASKET_FLOOR,ag.position.z);
      cat.position.lerpVectors(boardStart,landing,eased);cat.position.y+=Math.sin(Math.PI*p)*1.15;
      cat.rotation.y=boardHeading+Math.atan2(Math.sin(.3-boardHeading),Math.cos(.3-boardHeading))*eased;
      showSeated(p>.55);
      if(p<=.55){body.scale.y=1-Math.sin(Math.PI*p)*.13;legs.forEach((leg,i)=>leg.rotation.x=(i%2?-.6:.75)*Math.sin(Math.PI*p));tail.rotation.x=-.35*Math.sin(Math.PI*p);}
      else seated.scale.y=1-Math.sin(Math.PI*p)*.1;
    }else if(phase==='disembarking'){
      cat.position.lerpVectors(exitStart,exitTarget,eased);cat.position.y+=Math.sin(Math.PI*p)*1.15;
      showSeated(p<.6);if(p>=.6)legs.forEach((leg,i)=>leg.rotation.x=(i%2?-.5:.65)*Math.sin(Math.PI*p));
    }else if(balloonRide.locked){
      cat.position.set(0,BASKET_FLOOR,0);showSeated(true);
      if(phase==='settling')seated.scale.y=.96+.04*eased;
      seatedHead.rotation.y=motion.matches?0:Math.sin(time*.6)*.07;
      seatedHead.rotation.z=motion.matches?0:Math.sin(time*.5)*.025;
    }
  }
  const direction=v(),velocity=v();
  function tick(now:number){if(disposed)return;frame=requestAnimationFrame(tick);const dt=Math.min((now-last)/1000,.05);last=now;if(document.hidden)return;time+=dt;nightAmount=THREE.MathUtils.damp(nightAmount,nightTarget,2,dt);
    hemi.intensity=1.9-nightAmount*1.05;sun.intensity=2.65-nightAmount*2.05;fill.intensity=.85-nightAmount*.1;renderer.toneMappingExposure=1.08-nightAmount*.03;hemi.color.setRGB(1-nightAmount*.35,.94-nightAmount*.32,.87+nightAmount*.12);sun.color.set(nightAmount>.5?'#b8c9ff':'#ffedcf');lanterns.forEach(m=>m.emissiveIntensity=.3+nightAmount*2);
    advanceBalloonRide(dt);
    velocity.set(0,0,0);
    if(!balloonRide.locked&&keys.size){const sx=(keys.has('ArrowRight')||keys.has('d')?1:0)-(keys.has('ArrowLeft')||keys.has('a')?1:0),sz=(keys.has('ArrowDown')||keys.has('s')?1:0)-(keys.has('ArrowUp')||keys.has('w')?1:0);velocity.set(sx,0,sz).applyAxisAngle(v(0,1,0),.313).normalize().multiplyScalar(2.7*dt);if(!free(cat.position.x+velocity.x,cat.position.z+velocity.z))velocity.set(0,0,0);}
    else if(!balloonRide.locked&&waypoints.length){direction.copy(waypoints[0]).sub(cat.position);direction.y=0;const distance=direction.length();if(distance<.07){waypoints.shift();}else velocity.copy(direction).normalize().multiplyScalar(Math.min(distance,2.6*dt));}
    moving=velocity.lengthSq()>.000001;
    if(moving){cat.position.add(velocity);const angle=Math.atan2(velocity.x,velocity.z);cat.rotation.y+=Math.atan2(Math.sin(angle-cat.rotation.y),Math.cos(angle-cat.rotation.y))*Math.min(dt*10,1);walkTime+=dt*11;body.position.y=Math.sin(walkTime*2)*.025;legs.forEach((leg,i)=>leg.rotation.x=Math.sin(walkTime+(i===0||i===3?0:Math.PI))*.48);}
    else{body.position.y=Math.sin(time*2)*.015;legs.forEach(leg=>leg.rotation.x=THREE.MathUtils.damp(leg.rotation.x,0,12,dt));}
    tail.rotation.z=motion.matches?0:Math.sin(time*2.1)*.15;tail.rotation.y=motion.matches?0:Math.sin(time*1.3)*.12;head.rotation.z=moving||motion.matches?0:Math.sin(time*.65)*.04;
    const blink=Math.sin(time*.7)> .998 ? .12 : 1;[...eyes,...seatedEyes].forEach(e=>e.scale.y=.13*blink);
    active=balloonRide.locked?'balloon':null;let nearestRide=Infinity;if(!balloonRide.locked)for(const ride of rides){const dx=Math.abs(cat.position.x-ride.group.position.x),dz=Math.abs(cat.position.z-ride.group.position.z);const distance=ride.id==='cars'?Math.hypot(Math.max(0,dx-2.95),Math.max(0,dz-2.225)):Math.hypot(dx,dz)-ride.radius;if(distance<1.35&&distance<nearestRide){active=ride.id;nearestRide=distance;}}
    if(!balloonRide.locked){
      if(cat.position.distanceTo(balloon.entrance)>1.9)mustLeaveBalloon=false;
      if(active==='balloon'&&!mustLeaveBalloon&&!moving&&!waypoints.length){
        if(cat.position.distanceTo(balloon.entrance)>.72)go(balloon.entrance,true);
        else {boardingPause+=dt;if(boardingPause>.3)startBalloonRide();}
      }else boardingPause=0;
    }
    if(balloonRide.locked)active='balloon';
    if(active&&!visited.includes(active))visited.push(active);
    rides.forEach(ride=>{ride.amount=THREE.MathUtils.damp(ride.amount,active===ride.id?1:0,3.8,dt);ride.bulbs.emissiveIntensity=.08+ride.amount*3.7;ride.light.intensity=ride.amount*(nightAmount*12+8);(ride.glow.material as THREE.MeshBasicMaterial).opacity=ride.amount*(.48+nightAmount*.33);ride.update(motion.matches?0:time,motion.matches?0:dt,ride.amount);});
    animatePassenger();
    cursorMat.opacity=moving?.35+Math.sin(time*4)*.12:.2;cursor.scale.setScalar(motion.matches?1:1+Math.sin(time*4)*.1);
    if(!moving&&!waypoints.length){cursor.visible=false;cursorDot.visible=false;}
    balloons.forEach((b,i)=>b.rotation.z=motion.matches?0:Math.sin(time*.6+i)*.035);
    falling.visible=!motion.matches;
    if(!motion.matches)fallingSeeds.forEach((s,i)=>{dummy.position.set(s.x+Math.sin(time*.3+s.s)*.85,((s.y-time*.27)%9+9)%9,s.z+Math.sin(time*.2+s.s)*.3);dummy.scale.set(.075,.018,.043);dummy.rotation.set(time*.4+s.s,time*.2+s.s,time*.7);dummy.updateMatrix();falling.setMatrixAt(i,dummy.matrix);});falling.instanceMatrix.needsUpdate=true;
    fireworks.update(dt,nightTarget===1,nightAmount,motion.matches,mount.clientWidth,mount.clientHeight,renderer.getPixelRatio());
    publishState();renderer.render(scene,camera);
  }
  frame=requestAnimationFrame(tick);options.onReady();publishState();
  function contextLost(event:Event){event.preventDefault();options.onError('画面暂时休息了，请重新打开乐园。');}canvas.addEventListener('webglcontextlost',contextLost);
  return {
    visit(id){if(balloonRide.locked)return;if(id==='balloon')mustLeaveBalloon=false;const ride=rides.find(r=>r.id===id);if(ride)go(ride.entrance,true);},
    setNight(value){nightTarget=value?1:0;},
    reset(){balloonRide.reset();restoreGround(v(-1.55,.16,6.3));cat.rotation.y=.05;balloonLift.position.y=0;balloonLift.rotation.y=0;mustLeaveBalloon=false;boardingPause=0;visited=[];active=null;moving=false;tail.rotation.x=0;cursor.visible=false;cursorDot.visible=false;publishState();},
    dispose(){disposed=true;cancelAnimationFrame(frame);fireworks.dispose();observer.disconnect();canvas.removeEventListener('pointermove',pointTo);canvas.removeEventListener('pointerdown',pointTo);canvas.removeEventListener('webglcontextlost',contextLost);mount.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());extras.forEach(material=>material.dispose());textures.forEach(texture=>texture.dispose());scene.traverse(object=>{if(object instanceof THREE.InstancedMesh)object.dispose();});renderer.dispose();canvas.remove();},
  };
}
