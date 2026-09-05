import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// All surface maps are authored here, deterministically, so the game stays offline.
let seed = 72913;
const rnd = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
function texture(size, draw, color = true) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 8;
  return map;
}

export function upgradeMaterials(m, renderer) {
  const brushed = texture(1024, (c, n) => {
    c.fillStyle = '#c4c9c7'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 13000; i++) {
      const value = 135 + Math.floor(rnd() * 100);
      c.strokeStyle = `rgba(${value},${value},${value},${.03 + rnd() * .13})`;
      const x = rnd() * n, y = rnd() * n;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 15 + rnd() * 160, y + .5); c.stroke();
    }
  });
  const roughness = texture(512, (c, n) => {
    c.fillStyle = '#aaa'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 7000; i++) { c.fillStyle = `rgba(220,220,220,${rnd() * .2})`; c.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 60, 1); }
  }, false);
  for (const id of ['ivory', 'steel', 'dark', 'orange', 'blue', 'gold', 'black']) {
    m[id].map = brushed; m[id].roughnessMap = roughness;
    m[id].bumpMap = roughness; m[id].bumpScale = .006;
  }
  m.ivory.color.set('#d2d3c7'); m.ivory.metalness = .3; m.ivory.roughness = .53;
  m.steel.color.set('#b1c2c4'); m.steel.metalness = .86; m.steel.roughness = .35;
  m.dark.color.set('#36494b'); m.dark.roughness = .56;
  m.orange.color.set('#c48946'); m.orange.roughness = .55;
  const quilt = texture(1024, (c, n) => {
    c.fillStyle = '#687267'; c.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 256) for (let x = 0; x < n; x += 256) {
      const grad = c.createRadialGradient(x + 115, y + 105, 15, x + 128, y + 128, 175);
      grad.addColorStop(0, '#c2c4b3'); grad.addColorStop(.6, '#a8b0a0'); grad.addColorStop(1, '#5d7169');
      c.fillStyle = grad; c.fillRect(x + 5, y + 5, 246, 246);
      c.strokeStyle = '#d0d1bf88'; c.setLineDash([3, 4]); c.strokeRect(x + 14, y + 14, 228, 228); c.setLineDash([]);
      for (let j = 0; j < 400; j++) { c.fillStyle = '#f0f1df0c'; c.fillRect(x + rnd() * 245, y + rnd() * 245, 1, 2); }
      for (const dx of [20, 236]) for (const dy of [20, 236]) { c.fillStyle = '#515d56'; c.beginPath(); c.arc(x + dx, y + dy, 3, 0, 7); c.fill(); }
    }
  });
  quilt.repeat.set(2, 1); m.panel.map = quilt; m.panel.bumpMap = quilt; m.panel.bumpScale = .045;
  m.panel.color.set('#c1c5b8'); m.panel.metalness = .05; m.panel.roughness = .95;
  const weave = texture(1024, (c, n) => {
    c.fillStyle = '#c1c2ae'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < n; i += 3) { c.fillStyle = i % 2 ? '#9a9e9255' : '#e1ddca55'; c.fillRect(i, 0, 1, n); c.fillRect(0, i, n, 1); }
    c.strokeStyle = '#676d6080'; c.setLineDash([4, 3]);
    for (let i = -n; i < n * 2; i += 128) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + n, n); c.stroke(); c.beginPath(); c.moveTo(i, 0); c.lineTo(i - n, n); c.stroke(); }
  });
  m.fabric.map = weave; m.fabric.bumpMap = weave; m.fabric.bumpScale = .025;
  m.foil = new THREE.MeshStandardMaterial({ color: '#b78d45', metalness: .8, roughness: .43,
    map: texture(1024, (c, n) => {
      c.fillStyle = '#bcb29b'; c.fillRect(0, 0, n, n);
      for (let i = 0; i < 4800; i++) {
        const x = rnd() * n, y = rnd() * n, s = 8 + rnd() * 65;
        c.fillStyle = `rgba(${rnd() > .5 ? '255,246,201' : '20,25,20'},${rnd() * .19})`;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + s, y + rnd() * s); c.lineTo(x - s * .3, y + s); c.fill();
      }
    }) });
  m.foil.bumpMap = m.foil.map; m.foil.bumpScale = .09;
  m.glass = new THREE.MeshPhysicalMaterial({ color: '#9ac7c5', metalness: .1, roughness: .13, transparent: true, opacity: .22, depthWrite: false, side: THREE.DoubleSide });
  m.copper = new THREE.MeshStandardMaterial({ color: '#aa6948', metalness: .8, roughness: .32, map: brushed });
  m.leaf = new THREE.MeshStandardMaterial({ color: '#567e3a', roughness: .9, side: THREE.DoubleSide });
  m.rubber = new THREE.MeshStandardMaterial({ color: '#192326', roughness: .97 });
  m.glow.color.set('#ffe0a5').multiplyScalar(3); m.cyan.color.multiplyScalar(1.7);
  const generator = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const environment = generator.fromScene(room, .04).texture; room.dispose(); generator.dispose();
  return environment;
}

export function createPipeline(scene, camera, renderer, interior, sun, blueSun) {
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  const key = new THREE.SpotLight('#ffdfb0', 85, 30, 1.19, .7, 1.8);
  key.position.set(0, 4.15, -1); key.target.position.set(0, 0, -1);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0004; key.shadow.normalBias = .035;
  key.shadow.camera.near = .2; key.shadow.camera.far = 32; scene.add(key, key.target);
  const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const ao = new SSAOPass(scene, camera, innerWidth, innerHeight, 16);
  ao.kernelRadius = 12; ao.minDistance = .00015; ao.maxDistance = .008;
  const resizeAO = ao.setSize.bind(ao); ao.setSize = (w, h) => resizeAO(Math.round(w * .65), Math.round(h * .65));
  composer.addPass(ao);
  const bloom = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2(1 / innerWidth, 1 / innerHeight) } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv; gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; varying vec2 vUv;
      vec3 highlight(vec2 delta){vec3 c=texture2D(tDiffuse,vUv+delta*texel).rgb;return clamp(c-vec3(1.15),vec3(0.0),vec3(4.0));}
      void main(){vec3 c=texture2D(tDiffuse,vUv).rgb; vec3 glow=highlight(vec2(3.,0.))+highlight(vec2(-3.,0.))+highlight(vec2(0.,3.))+highlight(vec2(0.,-3.));
      glow+=highlight(vec2(5.,5.))+highlight(vec2(-5.,5.))+highlight(vec2(5.,-5.))+highlight(vec2(-5.,-5.)); gl_FragColor=vec4(c+glow*.018,1.);}`,
    depthTest: false, depthWrite: false
  });
  composer.addPass(bloom); composer.addPass(new OutputPass());
  let quality = 'high', outside = false, litRoom = null;
  function setQuality(value) {
    quality = ['high', 'balanced'].includes(value) ? value : 'high';
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.7 : 1.1));
    composer.setPixelRatio(renderer.getPixelRatio());
    key.castShadow = quality === 'high'; ao.enabled = quality === 'high' && !outside;
    renderer.shadowMap.needsUpdate = true;
  }
  return {
    setQuality,
    update(room, external) {
      outside = external; key.visible = !external; ao.enabled = quality === 'high' && !external;
      sun.intensity = external ? 3.1 : .38; blueSun.intensity = external ? 1.1 : .24;
      scene.environmentIntensity = external ? .45 : .28;
      if (room) { const x = (room.x1 + room.x2) / 2, z = (room.z1 + room.z2) / 2;
        key.position.set(x, room.y + 4.1, z); key.target.position.set(x, room.y, z);
        if (litRoom !== room.id) { litRoom = room.id; renderer.shadowMap.needsUpdate = true; }
      }
    },
    resize() { composer.setSize(innerWidth, innerHeight); bloom.uniforms.texel.value.set(1 / innerWidth, 1 / innerHeight); },
    render() { renderer.info.autoReset = false; renderer.info.reset(); composer.render(); },
    get quality() { return quality; }
  };
}

export function detailInterior(a) {
  const { THREE: T, mats: m, interior, rooms, box, cyl, ball, beam, ring, label, mesh, monitor } = a;
  const tube = (points, radius = .025, material = 'rubber', parent = interior) => {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    return mesh(new T.TubeGeometry(curve, 28, radius, 8, false), material, 0, 0, 0, 1, 1, 1, parent);
  };
  function vent(x, y, z, w = .7, h = .3, rot = 0, p = interior) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rot; p.add(g);
    box('black', 0, 0, 0, w, h, .035, g);
    for (let yy = -h / 2 + .025; yy < h / 2; yy += .055) box('steel', 0, yy, .025, w - .04, .014, .025, g);
    for (const xx of [-w / 2 + .045, w / 2 - .045]) for (const yy of [-h / 2 + .04, h / 2 - .04]) ball('steel', xx, yy, .04, .018, g);
  }
  function gauge(x, y, z, r = .16, rot = 0, parent = interior) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rot; parent.add(g);
    ring(0, 0, 0, r, .024, 'steel', g);
    mesh(new T.CircleGeometry(r, 32), 'ivory', 0, 0, -.003, 1, 1, 1, g);
    for (let i = 0; i < 11; i++) { const ang = -2.2 + i * .44; beam([Math.sin(ang) * r * .72, Math.cos(ang) * r * .72, .01], [Math.sin(ang) * r * .88, Math.cos(ang) * r * .88, .01], .006, 'black', g); }
    beam([0, 0, .025], [r * .6, r * .37, .025], .01, 'red', g); ball('black', 0, 0, .028, .021, g);
  }
  function controls(x, y, z, rot = 0, width = 1.05) {
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rot; interior.add(g);
    box('dark', 0, 0, 0, width, .045, .42, g);
    for (let row = 0; row < 4; row++) for (let col = 0; col < 12; col++) {
      box(row === 0 && col > 8 ? 'orange' : 'ivory', -.46 * width + col * width * .077, .037, -.13 + row * .075, width * .06, .023, .05, g);
    }
    return g;
  }
  // Architecture: cable trays, ventilation, fastened service panels and grab rails.
  for (const r of rooms) {
    const cx = (r.x1 + r.x2) / 2, cz = (r.z1 + r.z2) / 2;
    for (const side of [-1, 1]) {
      const x = side < 0 ? r.x1 + .32 : r.x2 - .32;
      for (let z = r.z1 + 1.2; z < r.z2 - .4; z += 2.7) {
        if ((r.doors.e || r.doors.w) && Math.abs(z - cz) < 1.9) continue;
        vent(x, r.y + 3.5, z, .92, .34, side < 0 ? Math.PI / 2 : -Math.PI / 2);
        beam([x, r.y + 1.25, z - .32], [x, r.y + 1.85, z - .32], .034, 'orange');
        for (const y of [1.25, 1.85]) beam([x, r.y + y, z - .32], [x + side * .13, r.y + y, z - .32], .029, 'steel');
        for (const yy of [.2, 3.9]) ball('steel', x, r.y + yy, z, .032);
      }
      for (let i = 0; i < 3; i++) beam([x - side * (.08 + i * .11), r.y + 3.87, r.z1 + .3], [x - side * (.08 + i * .11), r.y + 3.87, r.z2 - .3], .025, i === 0 ? 'copper' : 'rubber');
    }
    for (let z = r.z1 + .6; z < r.z2 - .5; z += 2.7) {
      if (r.id === 'lab' && z > -7.4 && z < -4.1) continue;
      const length = Math.min((r.x2 - r.x1) * .53, 4);
      box('black', cx, r.y + 4.24, z, length + .12, .13, .35);
      box('glow', cx, r.y + 4.165, z, length, .015, .21);
      for (const dx of [-length / 2, length / 2]) box('steel', cx + dx, r.y + 4.17, z, .045, .09, .34);
    }
  }
  // Laboratory: enclosed sample chamber, microscope focus wheels and instrument leads.
  controls(-2.5, 1.05, -3.62, 0, .92); controls(2.6, 1.06, 3.42, Math.PI, .85);
  const chamber = new T.Group(); chamber.position.set(5, 1.1, -3); interior.add(chamber);
  cyl('steel', 0, .02, 0, .36, .12, chamber); cyl('glass', 0, .46, 0, .31, .82, chamber); cyl('steel', 0, .91, 0, .36, .12, chamber);
  for (let i = 0; i < 4; i++) { const ang = i * Math.PI / 2; beam([Math.sin(ang) * .33, .1, Math.cos(ang) * .33], [Math.sin(ang) * .33, .85, Math.cos(ang) * .33], .018, 'steel', chamber); }
  ball('redGlow', 0, .47, 0, .105, chamber); ring(0, .47, 0, .19, .016, 'copper', chamber);
  label('ASTROPHAGE / CONTAINMENT', 4.18, 1.37, -3, 1.15, .14, '#e7bf7d', '#192b30', -Math.PI / 2);
  for (const x of [-1.44, -1.16]) { const dial = cyl('black', x, 1.5, -3.91, .09, .06); dial.rotation.z = Math.PI / 2; }
  tube([[-2, 1.35, -4.45], [-2.2, .9, -4.75], [-3.2, .3, -4.72], [-3.4, .2, -4.6]], .026);
  for (let i = 0; i < 7; i++) { const z = 5.5 + i * .12; cyl('glass', 4.9, 1.23, z, .037, .28); cyl('cyan', 4.9, 1.15, z, .025, .09); }
  for (const x of [-3.5, -.5]) gauge(x, 1.3, -3.15, .075);
  // Flight deck: throttle quadrants, readable gauges, keypads, seat restraints.
  for (const x of [-2.8, 2.2]) {
    controls(x, 1.055, -22.5, 0, 1.3);
    box('dark', x, 3.14, -23.19, 1.65, .46, .075);
    for (const dx of [-.74, .74]) beam([x + dx, 3.35, -23.19], [x + dx, 4.15, -23.19], .028, 'steel');
    for (let i = 0; i < 3; i++) gauge(x - .5 + i * .5, 3.14, -23.14, .17);
    for (let i = 0; i < 2; i++) { beam([x + .6 + i * .12, 1.03, -22.5], [x + .6 + i * .12, 1.37, -22.65], .025, 'steel'); ball('black', x + .6 + i * .12, 1.37, -22.65, .065); }
  }
  for (const x of [-1.8, 1.8]) {
    box('fabric', x, 1.68, -20.12, .54, .32, .24);
    for (const dx of [-.22, .22]) { const strap = box('rubber', x + dx, 1.12, -20.005, .07, .76, .03); strap.rotation.z = dx < 0 ? -.14 : .14; }
    box('steel', x, .77, -19.99, .15, .11, .04);
    for (const dx of [-.4, .4]) box('black', x + dx, .98, -20.35, .14, .09, .72);
  }
  label('ATTITUDE  /  RCS  /  NAV', 0, 3.27, -25.75, 2.3, .15);
  // Medical quarters: IV bags, sensors, privacy rails and articulated care arms.
  for (let i = 0; i < 3; i++) {
    const z = 16 + i * 3.65;
    box('glass', -4.3, 1.96, z - .65, .24, .38, .12);
    tube([[-4.3, 1.8, z - .65], [-4.1, 1.35, z - .64], [-3.9, 1.05, z - .1]], .011, 'ivory');
    for (const zz of [-.84, .84]) beam([-4.36, 1.12, z + zz], [-2.1, 1.12, z + zz], .035, 'steel');
    const g = new T.Group(); g.position.set(-4.5, 2.6, z); interior.add(g);
    ball('steel', 0, 0, 0, .14, g); beam([0, 0, 0], [.5, .15, 0], .065, 'ivory', g); ball('dark', .5, .15, 0, .105, g);
    beam([.5, .15, 0], [.9, -.17, 0], .054, 'ivory', g); box('dark', .96, -.24, 0, .22, .17, .3, g); box('cyan', 1, -.335, 0, .16, .018, .21, g);
    label(`RECOVERY ${String(i + 1).padStart(2, '0')} / VITALS NOMINAL`, -3.1, .68, z + .89, 1.7, .14, '#c5d6cc');
    box('blue', -3.55, 1.11, z, .12, .035, 1.5); box('blue', -2.15, 1.11, z, .12, .035, 1.5);
  }
  // Engineering: real pipe elbows, flanges, pressure dials and valve handwheels.
  for (let i = 0; i < 5; i++) {
    const x = -12 - i * 2;
    tube([[x, 2.85, -4], [x, 3.35, -4], [x + .3, 3.55, -3.85], [x + .62, 3.55, -3.75]], .075, 'copper');
    gauge(x, 1.96, -3.37, .18);
    const valve = ring(x, 1.4, -3.28, .21, .028, i % 2 ? 'red' : 'orange');
    beam([x - .18, 1.4, -3.28], [x + .18, 1.4, -3.28], .018, 'steel');
    beam([x, 1.22, -3.28], [x, 1.58, -3.28], .018, 'steel');
    beam([x, 1.4, -3.28], [x, 1.4, -3.65], .05, 'steel');
    for (const y of [.6, 2.25]) for (let j = 0; j < 8; j++) { const ang = j * Math.PI / 4; ball('steel', x + Math.sin(ang) * .61, y, -4 + Math.cos(ang) * .61, .031); }
    label(['OXYGEN', 'NITROGEN', 'CO₂ LOOP', 'COOLANT', 'RESERVE'][i], x, .94, -3.39, .72, .16, '#e2c78d');
  }
  controls(-19.7, 1.05, 0, Math.PI / 2);
  // Garden: individual leaves with veins, irrigation, dining details, Earth photograph.
  const leafShape = new T.Shape(); leafShape.moveTo(0, 0); leafShape.bezierCurveTo(-.14, .12, -.15, .38, 0, .57); leafShape.bezierCurveTo(.15, .38, .14, .12, 0, 0);
  const leafGeo = new T.ShapeGeometry(leafShape, 8);
  for (const z of [-4, 4]) {
    beam([11.6, .86, z - .25], [20.5, .86, z - .25], .022, 'rubber');
    for (let i = 0; i < 26; i++) {
      const x = 11.9 + i * .33, height = .5 + rnd() * .45;
      beam([x, .86, z], [x, .9 + height, z], .01, 'green');
      for (let j = 0; j < 5; j++) {
        const plant = new T.Group(); plant.position.set(x, .95 + j * .12, z); plant.rotation.set(rnd() * .8, rnd() * Math.PI * 2, (j % 2 ? 1 : -1) * (.55 + rnd() * .6)); interior.add(plant);
        mesh(leafGeo, 'leaf', 0, 0, 0, .7, .8, .7, plant); beam([0, 0, .006], [0, .4, .006], .004, 'green', plant);
      }
    }
  }
  box('fabric', 15.2, 1.19, -.75, .62, .36, .65).rotation.z = -.16;
  box('fabric', 15.2, 1.19, .75, .62, .36, .65).rotation.z = .16;
  for (const z of [-.28, .28]) { const plate = cyl('ivory', 18, 1.05, z, .22, .018); ring(18, 1.061, z, .2, .008, 'steel').rotation.x = -Math.PI / 2; }
  box('orange', 18.6, 1.08, .12, .34, .035, .48); label('EARTH / FIELD NOTES', 18.6, 1.102, .12, .29, .07).rotation.x = -Math.PI / 2;
  // Upper deck: telescope cradle and a high-resolution optical console.
  controls(4, 6.26, -8.13, 0, 1.1);
  const telescope = new T.Group(); telescope.position.set(6.35, 7.25, -8.2); telescope.rotation.x = Math.PI / 2; interior.add(telescope);
  cyl('ivory', 0, 0, 0, .23, 1.1, telescope); cyl('black', 0, .56, 0, .24, .13, telescope); cyl('glass', 0, .64, 0, .19, .01, telescope);
  beam([6.35, 5.25, -8.2], [6.35, 7.25, -8.2], .065, 'steel');
  a.collider(6.35, -8.2, .6, 1.2, 5.2, 2.3);
  label('OPTICAL ARRAY / TC-01', 6.6, 6.45, -8.1, .95, .14, '#cbd9cb', '#1d3036', -Math.PI / 2);
  return { tube, vent, gauge };
}

export function detailExterior(a) {
  const { THREE: T, mats: m, habitat, drive, interior, box, cyl, ball, beam, ring, mesh, label } = a;
  for (const p of [habitat, drive]) {
    // External truss spines and cross braces connect the pressure vessels.
    for (const z of [-1.5, 1.5]) {
      beam([-4.4, -1.35, z], [4.4, -1.35, z], .065, 'steel', p);
      for (let x = -4; x < 4; x += .8) {
        beam([x, -1.35, z], [x + .8, -.9, z], .035, 'steel', p);
        beam([x, -.9, z], [x + .8, -1.35, z], .035, 'steel', p);
      }
    }
    for (let x = -3.8; x < 4; x += .8) {
      box('ivory', x, 1.54, 0, .71, .12, .9, p);
      for (const dz of [-.32, .32]) ball('steel', x + .24, 1.62, dz, .025, p);
      box('foil', x, -1.49, 0, .74, .11, .95, p);
    }
    for (const x of [-3, 3]) {
      const reel = cyl('dark', x, -1.7, 0, .46, .38, p); reel.rotation.x = Math.PI / 2;
      for (const z of [-.22, .22]) { const rim = ring(x, -1.7, z, .48, .065, 'steel', p); }
      for (let i = 0; i < 9; i++) ring(x, -1.7, -.17 + i * .04, .37, .018, 'gold', p);
      beam([x - .6, -1.4, -.3], [x - .6, -1.98, .3], .075, 'steel', p);
    }
  }
  // Better insulated hab modules, paired antennae and RCS clusters.
  for (const z of [-2.6, 2.6]) for (let x = -2; x < 2; x += .6) {
    box('foil', x, .75, z, .54, .1, .95, habitat);
    box('ivory', x, .91, z, .38, .06, .7, habitat);
  }
  for (const x of [-3.7, 3.7]) for (const z of [-1.2, 1.2]) {
    box('steel', x, .8, z, .4, .4, .4, habitat);
    for (const dx of [-.12, .12]) { const n = mesh(new T.CylinderGeometry(.09, .15, .22, 24, 1, true), 'black', x + dx, 1.08, z, 1, 1, 1, habitat); }
  }
  beam([1.2, 1.7, 0], [1.2, 3.4, 0], .025, 'steel', habitat);
  beam([1.2, 3.25, -.6], [1.2, 3.25, .6], .025, 'steel', habitat);
  const dish = mesh(new T.SphereGeometry(.6, 32, 16, 0, Math.PI * 2, 0, .6), 'ivory', -1.2, 2.8, 0, 1, 1, 1, habitat);
  dish.rotation.x = Math.PI / 2; beam([-1.2, 1.6, 0], [-1.2, 2.8, 0], .04, 'steel', habitat);
  label('IEV / HM-01', 2.3, .3, 1.58, 1.3, .23, '#263b42', '#c7cabc', 0, habitat);
  // Ribbed thrust bells and cooling loops, separate from the animated exhaust.
  for (const [y, z] of [[0, -2.4], [0, 2.4], [1.95, 0]]) {
    const profile = [[.25, 0], [.24, .18], [.31, .45], [.48, .7], [.72, .95]].map(([r, h]) => new T.Vector2(r, h));
    const bell = mesh(new T.LatheGeometry(profile, 48), m.rubber, 4.2, y, z, 1, 1, 1, drive); bell.rotation.z = -Math.PI / 2;
    for (let i = 0; i < 16; i++) { const ang = i * Math.PI / 8; beam([4.3, y + Math.cos(ang) * .3, z + Math.sin(ang) * .3], [5.06, y + Math.cos(ang) * .72, z + Math.sin(ang) * .72], .018, 'copper', drive); }
    const rim = ring(5.15, y, z, .73, .035, 'steel', drive); rim.rotation.y = Math.PI / 2;
  }
  for (const z of [-4.1, 4.1]) {
    for (let x = -2.35; x < 3.5; x += .49) for (let zz = z - 1.05; zz < z + 1.1; zz += .35) {
      box('blue', x, .075, zz, .43, .015, .29, drive);
      box('steel', x, .084, zz, .008, .004, .29, drive);
    }
  }
}

export function createWindowMaterial() {
  const map = texture(2048, (c, n) => {
    c.fillStyle = '#030a16'; c.fillRect(0, 0, n, n);
    for (let i = 0; i < 1900; i++) {
      const x = rnd() * n, y = rnd() * n, r = .35 + rnd() * 1.55;
      c.fillStyle = i % 4 ? '#d1dedc' : '#94afb9'; c.globalAlpha = .3 + rnd() * .6;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
    const radius = 450, size = radius * 2, disk = c.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x - radius) / radius, ny = (y - radius) / radius, r2 = nx * nx + ny * ny;
      if (r2 >= 1) continue;
      const nz = Math.sqrt(1 - r2), light = Math.max(.018, -nx * .7 - ny * .42 + nz * .34);
      const warp = Math.sin(nx * 12 + ny * 8) * .7 + Math.sin(nx * 31 - ny * 17) * .18;
      const cloud = Math.pow(Math.max(0, Math.sin(ny * 45 + warp * 3 + Math.sin(nx * 18) * .5)), 4);
      const bands = .5 + Math.sin(ny * 19 + warp) * .16 + Math.sin(ny * 73 + warp * 2) * .07;
      const haze = Math.pow(1 - nz, 6) * 48;
      const i = (y * size + x) * 4;
      disk.data[i] = (89 + bands * 85 + cloud * 55) * light + haze * .45;
      disk.data[i + 1] = (103 + bands * 73 + cloud * 50) * light + haze * .8;
      disk.data[i + 2] = (88 + bands * 59 + cloud * 52) * light + haze;
      disk.data[i + 3] = 255;
    }
    const planetCanvas = document.createElement('canvas'); planetCanvas.width = planetCanvas.height = size;
    planetCanvas.getContext('2d').putImageData(disk, 0, 0);
    const glow = c.createRadialGradient(1210, 940, 445, 1210, 940, 478);
    glow.addColorStop(0, '#8dabbb88'); glow.addColorStop(.4, '#4b83952c'); glow.addColorStop(1, '#12253600');
    c.fillStyle = glow; c.beginPath(); c.arc(1210, 940, 478, 0, 7); c.fill();
    c.drawImage(planetCanvas, 1210 - radius, 940 - radius);
  });
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
  return new THREE.MeshBasicMaterial({ map });
}
