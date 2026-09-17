import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createExplosion } from './explosion.js';

const environments = {
  workshop: { background: 0xdfe7d8, base: 0x8b9983, rim: 0xc6c9aa, floor: 0xe6dfc4, grid: 0xcac5ac, wall: 0x93a68b, sky: 0xffffed, ground: 0x687765, sun: 0xfff4d6, intensity: 3.1 },
  garden: { background: 0xd5e4d1, base: 0x72936b, rim: 0xabc39a, floor: 0xdce0b9, grid: 0xb8c494, wall: 0x7fa374, sky: 0xf4ffe6, ground: 0x537151, sun: 0xffedbf, intensity: 2.8 },
  moon: { background: 0x233448, base: 0x617080, rim: 0xa2b0bd, floor: 0xc4cdd1, grid: 0xa2afb7, wall: 0x7c94a7, sky: 0xe2f1ff, ground: 0x3c4c66, sun: 0xdcecff, intensity: 2.4 },
};

export function createWorld(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0xdfe7d8, 1);
  host.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Robot scene. Drag to orbit; scroll to zoom. Camera buttons are below.');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-8, 8, 5, -5, 0.1, 80);
  camera.position.set(8, 11, 12); camera.lookAt(0, 0, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minPolarAngle = .02;
  controls.maxPolarAngle = Math.PI * .46;
  controls.minZoom = .65; controls.maxZoom = 2.2;
  controls.enableDamping = false; // Render on interaction, not an idle animation loop.
  controls.update(); controls.saveState();
  const sky = new THREE.HemisphereLight(0xffffed, 0x687765, 2.6); scene.add(sky);
  const sun = new THREE.DirectionalLight(0xfff4d6, 3.1);
  sun.position.set(-4, 12, 5); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8 });
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.001;
  scene.add(sun);
  const mats = new Map();
  function material(color) {
    if (!mats.has(color)) mats.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    return mats.get(color);
  }
  function box(w, h, d, color, x, y, z, parent = scene) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cylinder(r, h, color, x, y, z, parent = scene, sides = 12) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, sides), material(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  // ponytail: procedural primitives keep assets offline and cheap; replace individual meshes if art needs grow.
  const base = box(9.9, .5, 8.9, 0x8b9983, 0, -.43, 0);
  const rim = box(9.6, .2, 8.6, 0xc6c9aa, 0, -.13, 0);
  const floor = box(8.4, .08, 7.2, 0xe6dfc4, 0, .01, 0), grid = [];
  for (let x = -4; x <= 4; x += .8) grid.push(box(.014, .008, 7.1, 0xcac5ac, x, .058, 0));
  for (let z = -3.2; z <= 3.2; z += .8) grid.push(box(8.3, .008, .014, 0xcac5ac, 0, .058, z));
  const walls = [box(8.6, .5, .18, 0x93a68b, 0, .25, -3.7), box(.18, .5, 7.5, 0x93a68b, -4.3, .25, 0)];
  box(.12, .12, 7.3, 0xf7e7b6, 4.25, .12, 0);
  box(8.5, .12, .12, 0xf7e7b6, 0, .12, 3.66);
  for (let z = -3.3; z < 3.5; z += .36) {
    box(.14, .02, .13, 0x716b48, 4.25, .185, z);
  }
  const pad = box(1.6, .04, 1.2, 0x9fbc8d, 0, .08, .4);
  const padRing = new THREE.Mesh(new THREE.RingGeometry(.35, .39, 32), material(0xeef5ca));
  padRing.rotation.x = -Math.PI / 2; padRing.position.set(0, .107, .4); scene.add(padRing);
  const dock = new THREE.Group(); scene.add(dock);
  box(1.6, .08, .85, 0x789b7c, 0, .1, -2.8, dock);
  box(1.05, 1.45, .55, 0x386d60, 0, .78, -3.7, dock);
  box(.85, .3, .08, 0x253f39, 0, .95, -3.39, dock);
  box(.7, .12, .4, 0xf1bc59, 0, .48, -3.3, dock);
  for (let i = 0; i < 3; i++) box(.12, .1, .04, 0xcceaa6, -.23 + i * .23, 1.25, -3.39, dock);
  box(1.15, .1, .68, 0xf0c36c, 0, 1.54, -3.7, dock);
  const crate = (x, z, size = .6) => {
    box(size, size, size, 0xbd8d50, x, size / 2, z);
    box(size + .02, .075, size + .02, 0xe5bc7f, x, size * .25, z);
    box(size + .02, .075, size + .02, 0xe5bc7f, x, size * .78, z);
    box(.08, size + .02, size + .02, 0xe5bc7f, x, size / 2, z);
  };
  // Decorations sit outside the playable walls, so every visible in-field obstacle is sensed.
  crate(-4.65, -2.2, .45); crate(-4.65, -1.55, .45);
  const bench = new THREE.Group(); scene.add(bench);
  box(1.6, .12, .65, 0xc99b66, 2.5, .8, -4.02, bench);
  for (const x of [1.9, 3.1]) box(.1, .8, .45, 0x4e6955, x, .4, -4.02, bench);
  box(.38, .32, .32, 0xe8b24c, 2.3, 1.02, -4.02, bench);
  cylinder(.14, .12, 0x5d7467, 2.9, .93, -4.02, bench);
  const lights = [];
  for (const x of [-3, 3]) {
    cylinder(.045, 1.65, 0x46654f, x, .8, -3.95);
    const bulb = box(.3, .22, .3, 0xffdf8a, x, 1.65, -3.95); lights.push(bulb);
    box(.4, .06, .4, 0x395d4c, x, 1.8, -3.95);
  }
  const beacon = new THREE.Group(); scene.add(beacon);
  cylinder(.18, .15, 0x41695a, 4.6, .1, 2.8, beacon);
  cylinder(.06, .65, 0x41695a, 4.6, .45, 2.8, beacon);
  box(.28, .28, .28, 0x9dded2, 4.6, .9, 2.8, beacon);
  const plants = new THREE.Group(); scene.add(plants);
  for (const [x,z] of [[-4.65,3.7],[4.6,-3.95]]) {
    cylinder(.22, .35, 0xc88c64, x, .08, z, plants);
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(.36, 0), material(0x729255));
    foliage.position.set(x, .52, z); plants.add(foliage);
  }
  const garden = new THREE.Group(); scene.add(garden);
  for (const x of [-3.7, -2.2]) {
    box(1.1, .3, .55, 0xb48457, x, .15, -4.02, garden);
    box(.95, .04, .44, 0x5b5340, x, .32, -4.02, garden);
    for (const dx of [-.32, 0, .32]) {
      const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(.18, 0), material(0x719555));
      leaf.position.set(x + dx, .53, -4.02); garden.add(leaf);
    }
  }
  const moon = new THREE.Group(); scene.add(moon);
  for (const [x, z, radius] of [[-4.65, 2.8, .35], [-4.6, -.4, .25], [4.65, -3.2, .3]]) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 0), material(0x8796a5));
    rock.position.set(x, .15, z); rock.scale.y = .7; rock.castShadow = true; moon.add(rock);
  }
  cylinder(.06, 1.2, 0x8194a5, -2.4, .6, -4.02, moon);
  const solar = box(1.3, .06, .7, 0x354d70, -2.4, 1.18, -4.02, moon); solar.rotation.x = .25;
  for (const dx of [-.4, 0, .4]) box(.015, .012, .6, 0xa6c5d8, -2.4 + dx, 1.24, -4.02, moon);
  const starsGeometry = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 65 }, (_, i) => new THREE.Vector3(Math.sin(i * 2.4) * (14 + i % 4), 3 + i % 9, Math.cos(i * 2.4) * (14 + i % 4))));
  const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xdbeaff, size: 1.5, sizeAttenuation: false })); moon.add(stars);
  const robot = new THREE.Group(); scene.add(robot);
  box(.62, .28, .65, 0xf0b348, 0, .35, 0, robot);
  box(.55, .17, .5, 0xffd579, 0, .55, -.02, robot);
  box(.46, .18, .045, 0x29483f, 0, .52, -.285, robot);
  for (const x of [-.13,.13]) box(.065, .065, .02, 0xc5f4dc, x, .53, -.315, robot);
  const wheels = [];
  for (const x of [-.37,.37]) {
    const wheel = cylinder(.21, .16, 0x354640, x, .23, .03, robot);
    wheel.rotation.z = Math.PI / 2; wheels.push(wheel);
    const hub = cylinder(.1, .17, 0x91a39a, x, .23, .03, robot); hub.rotation.z = Math.PI/2;
  }
  cylinder(.025, .25, 0x587363, .19, .77, .1, robot);
  const antenna = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), material(0xe68052));
  antenna.position.set(.19, .9, .1); robot.add(antenna);
  const part = box(.24, .22, .24, 0x86c7b2, 0, .79, .04, robot); part.visible = false;
  const loadedBall=new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),material(0xf28d3c));loadedBall.position.set(0,.78,0);loadedBall.visible=false;robot.add(loadedBall);
  const projectile=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),material(0xf28d3c));projectile.castShadow=true;projectile.visible=false;scene.add(projectile);
  const level=new THREE.Group();scene.add(level);
  function setLevel(spec) {
    level.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material?.map){object.material.map.dispose();object.material.dispose();}});level.clear();
    if(!spec){draw();return;}
    for(const obstacle of spec.obstacles||[]) {
      const x=obstacle.x/50,z=-obstacle.y/50,w=obstacle.width/50,d=obstacle.depth/50;
      box(w,.65,d,0x63756d,x,.35,z,level);
      for(let i=-w/2+.1;i<w/2;i+=.25)box(.12,.035,d+.03,0xefb348,x+i,.695,z,level);
    }
    for(const goal of spec.goals||[]) {
      const x=goal.x/50,z=-goal.y/50,color=['pickup','ball'].includes(goal.kind)?0xe9b349:0x4e9d79;
      box(1,.04,1,color,x,.09,z,level);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.36,.035,8,32),material(goal.kind==='hoop'?0xe98441:0xf7fae9));ring.rotation.x=Math.PI/2;ring.position.set(x,goal.kind==='hoop'?.6:.13,z);level.add(ring);
      if(goal.kind==='hoop') {box(.065,.95,.065,0x556a62,x+.48,.47,z-.42,level);box(.95,.55,.08,0xe8f0e8,x,.9,z-.42,level);}
      if(goal.kind==='pickup'){const cargo=box(.25,.25,.25,0xd89944,x,.25,z,level);cargo.userData.cargoPickup=true;}
      if(goal.kind==='delivery'){const cargo=box(.25,.25,.25,0xd89944,x,.25,z,level);cargo.userData.deliveredCargo=true;cargo.visible=false;}
      if(goal.kind==='ball'){const ball=new THREE.Mesh(new THREE.SphereGeometry(.14,12,8),material(0xf28d3c));ball.position.set(x,.28,z);level.add(ball);ball.userData.pickup=true;}
      const labelCanvas=document.createElement('canvas');labelCanvas.width=256;labelCanvas.height=80;const ctx=labelCanvas.getContext('2d');
      ctx.fillStyle='#fffdf7';ctx.fillRect(0,0,256,80);ctx.fillStyle='#263c36';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.fillText(goal.label,128,32);ctx.font='19px monospace';ctx.fillText(`(${goal.x}, ${goal.y}) cm`,128,61);
      const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(labelCanvas),depthTest:false}));label.position.set(x,goal.kind==='hoop'?1.65:.9,z);label.scale.set(1.65,.52,1);level.add(label);
    }
    draw();
  }
  const beamGeometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const beam = new THREE.Line(beamGeometry, new THREE.LineBasicMaterial({ color: 0x288c8b, transparent: true, opacity: .8 })); scene.add(beam);
  const trail = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xc6933c, transparent: true, opacity: .7 })); scene.add(trail);
  const marker = new THREE.Mesh(new THREE.RingGeometry(.12,.17,20), material(0x288c8b)); marker.rotation.x=-Math.PI/2;scene.add(marker);
  const explosion=createExplosion(scene,robot);
  let current = { x:0, y:-120, heading:0, distance:286, carrying:false }, mission = 0, restored = 0;
  function draw(frame = current, completed = restored, selected = mission) {
    current = frame; restored = completed; mission = selected;
    if (!frame.collision) robot.visible = true;
    robot.position.set(frame.x / 50, 0, -frame.y / 50); robot.rotation.y = -frame.heading * Math.PI / 180;
    part.visible = frame.carrying;
    loadedBall.visible=Boolean(frame.ballLoaded);
    projectile.visible=Boolean(frame.ball?.visible);
    if(frame.ball)projectile.position.set(frame.ball.x/50,Math.max(.13,frame.ball.z/50),-frame.ball.y/50);
    level.children.forEach(object=>{if(object.userData.pickup)object.visible=!frame.ballLoaded&&!frame.ball?.visible;if(object.userData.cargoPickup)object.visible=!frame.carrying&&!frame.delivered;if(object.userData.deliveredCargo)object.visible=Boolean(frame.delivered);});
    const a = frame.heading * Math.PI / 180;
    const start = new THREE.Vector3(frame.x/50 + Math.sin(a)*.28, .24, -frame.y/50 - Math.cos(a)*.28);
    const end = start.clone().add(new THREE.Vector3(Math.sin(a)*frame.distance/50, 0, -Math.cos(a)*frame.distance/50));
    beam.geometry.setFromPoints([start,end]); beam.visible = mission >= 3;
    marker.position.set(end.x,.1,end.z); marker.visible=beam.visible;
    pad.visible = mission < 6 && (mission === 1 || completed >= 2); padRing.visible=pad.visible;
    dock.visible = mission < 6 && (mission >= 3 || completed >= 4); bench.visible = completed >= 5;
    beacon.visible = completed >= 3;
    lights.forEach(light => light.material = material(completed ? 0xffdf8a : 0x8e9a83));
    renderer.render(scene,camera);
  }
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w,h);
    const halfWidth = Math.max(7.2, 4.9*w/h);
    camera.left=-halfWidth;camera.right=halfWidth;camera.top=halfWidth*h/w;camera.bottom=-halfWidth*h/w;
    camera.updateProjectionMatrix();draw();
  };
  controls.addEventListener('change', () => renderer.render(scene, camera));
  const observer = new ResizeObserver(resize); observer.observe(host);resize();
  const rotateCamera = radians => {
    const offset = camera.position.clone().sub(controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
    camera.position.copy(controls.target).add(offset); controls.update();
  };
  const zoomCamera = factor => { camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, controls.minZoom, controls.maxZoom); camera.updateProjectionMatrix(); controls.update(); };
  renderer.domElement.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', '+', '-', 'Home'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') controls.reset();
      else if (event.key === '+' || event.key === '-') zoomCamera(event.key === '+' ? 1.2 : 1 / 1.2);
      else rotateCamera(event.key === 'ArrowLeft' ? -Math.PI / 8 : Math.PI / 8);
    }
  });
  return { draw, rotateCamera, zoomCamera,setLevel,
    destroy() {
      observer.disconnect(); controls.dispose();
      const geometries = new Set(), materials = new Set();
      scene.traverse(object => { if (object.geometry) geometries.add(object.geometry); if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => materials.add(m)); });
      mats.forEach(m=>materials.add(m));
      geometries.forEach(g => g.dispose()); materials.forEach(m => {m.map?.dispose();m.dispose();}); renderer.dispose(); renderer.domElement.remove();
    },
    explode(frame) {
      explosion.start(frame);renderer.render(scene,camera);
    },
    clearExplosion() { explosion.clear();renderer.render(scene,camera); },
    updateEffects(time) {
      if(explosion.update(time))renderer.render(scene,camera);
    },
    resetCamera() { controls.reset(); },
    topCamera() { camera.position.copy(controls.target).add(new THREE.Vector3(0, 20, .01)); controls.update(); },
    setEnvironment(name) {
      const palette = environments[name] || environments.workshop;
      renderer.setClearColor(palette.background); host.parentElement.style.setProperty('--scene-background', `#${palette.background.toString(16).padStart(6, '0')}`);
      base.material = material(palette.base); rim.material = material(palette.rim); floor.material = material(palette.floor);
      grid.forEach(mesh => mesh.material = material(palette.grid)); walls.forEach(mesh => mesh.material = material(palette.wall));
      sky.color.setHex(palette.sky); sky.groundColor.setHex(palette.ground); sun.color.setHex(palette.sun); sun.intensity = palette.intensity;
      garden.visible = name === 'garden'; moon.visible = name === 'moon'; plants.visible = name !== 'moon';
      renderer.domElement.setAttribute('aria-label', `${name === 'moon' ? 'Moon station' : name === 'garden' ? 'Garden lab' : 'Workshop'} robot scene. Drag to orbit; scroll to zoom. Arrow keys rotate, plus/minus zoom, Home resets.`);
      draw();
    },
    trail(frames) {
    trail.geometry.dispose();
    trail.geometry = new THREE.BufferGeometry().setFromPoints(frames.map(f=>new THREE.Vector3(f.x/50,.09,-f.y/50)));
  }};
}
