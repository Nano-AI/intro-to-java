import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { cargoStackHeight, createPipRobot } from './pip-model.js';
import { boardScore, depotApproaches } from '../src/game-board.js';
import { createScoreboard } from './scoreboard.js';
import { hurdleLayout } from './tile-replay.js';

const PAINT = { blue: 0x3988de, yellow: 0xf1c64b, red: 0xd95a54, green: 0x409663, white: 0xffffff };

// Same offline Three.js renderer as the robot lessons, sized to the actual game grid.
export function createTileWorld(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x91a4ba);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', '3D game board. Drag to rotate; scroll to zoom. Use Map for exact coordinates.');
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-5, 5, 5, -5, .1, 200);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false; controls.enableDamping = false;
  controls.minPolarAngle = .08; controls.maxPolarAngle = Math.PI * .44;
  controls.minZoom = .65; controls.maxZoom = 3;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x91a4bc, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.8);
  sun.position.set(-7, 16, 9); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -.001;
  scene.add(sun);
  const level = new THREE.Group(), dynamic = new THREE.Group();
  const materials = new Map(), tiles = new Map();
  let world, current, scoreboard, stateSignature = '', width = 8, depth = 6, cargoHeadroom = 1.4;
  function mat(color) {
    if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: .74 }));
    return materials.get(color);
  }
  function mesh(geometry, color, x, y, z, parent = level) {
    const object = new THREE.Mesh(geometry, mat(color));
    object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  }
  const box = (w, h, d, color, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent);
  const cylinder = (r, h, color, x, y, z, parent) => mesh(new THREE.CylinderGeometry(r, r, h, 16), color, x, y, z, parent);
  const sphere = (r, color, x, y, z, parent) => mesh(new THREE.SphereGeometry(r, 16, 12), color, x, y, z, parent);
  function label(text, x, y, z, size = 1.15, parent = level, color = '#263a56') {
    const coordinate = /^\d+$/.test(text);
    const canvas = document.createElement('canvas'); canvas.width = coordinate ? 72 : Math.max(256, text.length * 24); canvas.height = 72;
    const context = canvas.getContext('2d');
    if (!coordinate) { context.fillStyle = '#f8fbff'; context.beginPath(); context.roundRect(3, 3, canvas.width - 6, 66, 12); context.fill(); }
    context.fillStyle = color; context.font = `600 ${coordinate ? 48 : 36}px system-ui`; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text, canvas.width / 2, 37);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const object = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true, depthWrite: false, alphaTest: .1, toneMapped: false }));
    object.position.set(x, y, z); object.userData.labelPixels = coordinate ? 14 : Math.min(132, Math.max(52, text.length * 6 + 16)); object.userData.labelAspect = 72 / canvas.width; object.scale.set(size, size * 72 / canvas.width, 1); parent.add(object); return object;
  }
  function clear(group) {
    group.traverse(object => {
      object.geometry?.dispose();
      if (object.material?.map) { object.material.map.dispose(); object.material.dispose(); }
    });
    group.clear();
  }
  const position = point => ({ x: point.x - (width - 1) / 2, z: point.y - (depth - 1) / 2 });
  function crate(x, z, parent = dynamic, y = .29, size = .46) {
    const cargo = new THREE.Group(); cargo.position.set(x, y, z); parent.add(cargo);
    box(size, size, size, 0xe8a548, 0, 0, 0, cargo);
    box(size + .012, .085, size + .012, 0xffd58b, 0, 0, 0, cargo);
    box(.08, size + .014, size + .014, 0xffd58b, 0, 0, 0, cargo);
    return cargo;
  }
  function ring(x, z, color, y = .105, radius = .34, parent = level) {
    const object = mesh(new THREE.TorusGeometry(radius, .035, 8, 32), color, x, y, z, parent);
    object.rotation.x = Math.PI / 2; return object;
  }
  const pip = createPipRobot(mat), robot = pip.group;
  scene.add(level, dynamic, robot);
  const projectile = sphere(.13, 0xf38f35, 0, .3, 0, scene); projectile.visible = false;
  function draw(frame = current) {
    if (frame) {
      current = frame;
      robot.position.set(frame.x / 50, frame.lift || 0, -frame.y / 50);
      robot.rotation.y = -frame.heading * Math.PI / 180;
      projectile.visible = Boolean(frame.shot);
      if (frame.shot) projectile.position.set(frame.shot.x, frame.shot.height, frame.shot.z);
    }
    const unitsPerPixel = (camera.top - camera.bottom) / Math.max(1, host.clientHeight) / camera.zoom;
    level.children.forEach(object => { if (object.userData.labelPixels) { const size = unitsPerPixel * object.userData.labelPixels; object.scale.set(size, size * object.userData.labelAspect, 1); } });
    renderer.render(scene, camera);
  }
  function fitCamera() {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h);
    camera.updateMatrixWorld();
    const bounds = new THREE.Box3();
    for (const x of [-width / 2 - .7, width / 2 + .7]) for (const z of [-depth / 2 - .7, depth / 2 + .7]) for (const y of [-.25, cargoHeadroom]) {
      bounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
    }
    if (scoreboard) {
      const sign = new THREE.Box3().setFromObject(scoreboard.group);
      for (const x of [sign.min.x, sign.max.x]) for (const y of [sign.min.y, sign.max.y]) for (const z of [sign.min.z, sign.max.z]) {
        bounds.expandByPoint(new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse));
      }
    }
    const halfHeight = Math.max(bounds.max.y - bounds.min.y, (bounds.max.x - bounds.min.x) * h / w) * .53;
    const center = bounds.getCenter(new THREE.Vector3());
    camera.left = center.x - halfHeight * w / h; camera.right = center.x + halfHeight * w / h;
    camera.top = center.y + halfHeight; camera.bottom = center.y - halfHeight;
    camera.updateProjectionMatrix(); draw();
  }
  function resetCamera() {
    const distance = Math.max(width, depth) * 1.7;
    camera.position.set(distance * .36, distance * .85, distance * .82);
    camera.zoom = 1; controls.target.set(0, .2, 0); controls.update(); fitCamera();
  }
  function setLevel(spec) {
    world = spec.grid; width = world.width; depth = world.height;
    pip.setCargo(0); pip.setBall(false);
    // Reserve space for the full load so pickups don't repeatedly zoom the board.
    cargoHeadroom = Math.max(1.4, cargoStackHeight((world.items || []).filter(item => item.kind !== 'ball').length));
    clear(level); clear(dynamic); tiles.clear(); stateSignature = '';
    box(width + .22, .26, depth + .22, 0x38516b, 0, -.15, 0);
    for (let y = 0; y < depth; y++) for (let x = 0; x < width; x++) {
      const point = position({ x, y });
      tiles.set(`${x},${y}`, box(.94, .10, .94, (x + y) % 2 ? 0xbdccda : 0xf2f4f3, point.x, .025, point.z));
    }
    for (let x = 0; x < width; x++) label(String(x), x - (width - 1) / 2, .08, -depth / 2 - .33, .40);
    for (let y = 0; y < depth; y++) label(String(y), -width / 2 - .35, .08, y - (depth - 1) / 2, .40);
    for (const [x, y] of world.walls || []) {
      const point = position({ x, y }); box(.92, .52, .92, 0x7790b0, point.x, .31, point.z);
      box(.94, .07, .94, 0x9fb4cf, point.x, .60, point.z);
    }
    for (const [x, y] of world.hurdles || []) {
      const point = hurdleLayout(world, { x, y }, spec.events);
      const hurdle = new THREE.Group();
      hurdle.position.set(point.x, 0, point.z); hurdle.rotation.y = point.rotation; level.add(hurdle);
      box(.86, .16, .10, 0xeea548, 0, .34, 0, hurdle);
      for (const dx of [-.34, .34]) box(.08, .4, .18, 0x6e86a4, dx, .24, 0, hurdle);
    }
    for (const target of world.targets || []) {
      const point = position(target), color = PAINT[target.color || 'blue'];
      for (const dx of [-.4, .4]) box(.035, .022, .83, color, point.x + dx, .087, point.z);
      for (const dz of [-.4, .4]) box(.83, .022, .035, color, point.x, .087, point.z + dz);
    }
    for (const character of world.characters || []) {
      const point = position(character), shop = character.kind === 'shop', depot = character.kind === 'customer';
      if (shop || depot) {
        if (depot) for (const tile of depotApproaches(world, character)) {
          const at = position(tile), marker = new THREE.Group();
          marker.position.set(at.x, .10, at.z); marker.rotation.y = Math.atan2(tile.dx, tile.dy); level.add(marker);
          for (const dx of [-.39, .39]) for (const dz of [-.39, .39]) {
            box(.18, .014, .04, 0xc98112, dx - Math.sign(dx) * .07, 0, dz, marker);
            box(.04, .014, .18, 0xc98112, dx, 0, dz - Math.sign(dz) * .07, marker);
          }
          for (const dx of [-.07, .07]) { const arrow = box(.20, .014, .045, 0xc98112, dx, 0, .24, marker); arrow.rotation.y = Math.sign(dx) * Math.PI / 4; }
        }
        box(.90, .028, .90, shop ? 0x227b91 : 0xd89a29, point.x, .095, point.z);
        box(.76, .66, .64, shop ? 0x277d90 : 0xb16a20, point.x, .4, point.z);
        box(.55, .36, .028, 0x243952, point.x, .38, point.z + .335);
        box(.84, .13, .76, shop ? 0x78cbd0 : 0xffce69, point.x, .8, point.z);
        if (depot) { cylinder(.085, .12, 0x65400d, point.x + .26, .91, point.z); sphere(.075, 0xffd780, point.x + .26, 1.0, point.z); }
        if (shop) for (const dx of [-.28, 0, .28]) box(.14, .025, .83, 0xfff2cb, point.x + dx, .88, point.z);
        label(shop ? 'Shop' : 'Depot', point.x, 1.22, point.z, 1.0, level, depot ? '#774500' : '#155c6a');
      } else {
        cylinder(.18, .42, 0x8a75bf, point.x, .34, point.z);
        sphere(.20, 0xf0c091, point.x, .72, point.z);
        label(character.kind, point.x, 1.08, point.z, 1.05);
      }
    }
    for (const hoop of world.hoops || []) {
      const point = position(hoop);
      cylinder(.035, 1.15, 0x607a98, point.x, .64, point.z - .36);
      box(.76, .50, .045, 0xffffff, point.x, 1.15, point.z - .36);
      box(.25, .17, .015, 0xf29947, point.x, 1.10, point.z - .329);
      ring(point.x, point.z, 0xf08b39, .93, .26);
      for (let i = 0; i < 6; i++) cylinder(.008, .21, 0xc5d6e8, point.x + Math.cos(i * Math.PI / 3) * .23, .81, point.z + Math.sin(i * Math.PI / 3) * .23);
    }
    if (world.finish) {
      const point = position(world.finish);
      const home = world.robot.x === world.finish.x && world.robot.y === world.finish.y;
      box(.90, .026, .90, 0x278661, point.x, .093, point.z);
      ring(point.x, point.z, 0xc3f1c5, .13, .36);
      if (home) {
        for (const dx of [-.11, .11]) box(.06, .018, .30, 0xecfff0, point.x + dx, .117, point.z);
        box(.24, .018, .06, 0xecfff0, point.x, .117, point.z);
      } else for (const [dx, dz] of [[-.07, -.07], [.07, .07]]) box(.14, .018, .14, 0xecfff0, point.x + dx, .117, point.z + dz);
      cylinder(.035, .58, 0x205d49, point.x + .34, .40, point.z - .34);
      sphere(.075, 0x9ff0b5, point.x + .34, .74, point.z - .34);
      label(home ? 'Home' : 'Finish', point.x, .99, point.z, 1.0, level, '#145539');
    }
    for (const sign of world.signs || []) {
      if (/^(Home|Finish|Start) →$|^Delivery tile$|^Score \d+$/.test(sign.text)) continue;
      const point = position(sign); label(sign.text, point.x, .62, point.z, 1.3);
    }
    const score = boardScore(world, { scored: 0, delivered: 0, painted: [] });
    scoreboard = score ? createScoreboard(Math.max(3.8, width * .62), mat) : null;
    if (scoreboard) {
      level.add(scoreboard.group); scoreboard.update(score);
    }
    const extent = Math.max(width, depth);
    Object.assign(sun.shadow.camera, { left: -extent, right: extent, top: extent, bottom: -extent });
    sun.shadow.camera.updateProjectionMatrix(); resetCamera();
    // Anchor the sign once. Moving the camera must not move world objects.
    scoreboard?.placeBehind(camera, width, depth);
    fitCamera();
  }
  function setBoardState(state) {
    const signature = JSON.stringify([state.items, state.painted, state.delivered]);
    if (signature !== stateSignature) {
      clear(dynamic); stateSignature = signature;
      for (const item of state.items) {
        const point = position(item);
        if (item.kind === 'ball') sphere(.20, 0xf38f35, point.x, .29, point.z, dynamic);
        else crate(point.x, point.z);
      }
      for (const [key, tile] of tiles) {
        const [x, y] = key.split(',').map(Number), painted = state.painted.find(point => point.x === x && point.y === y);
        tile.material = mat(painted ? PAINT[painted.color] || PAINT.blue : (x + y) % 2 ? 0xbdccda : 0xf2f4f3);
      }
      if (state.delivered) {
        const depot = world.characters?.find(character => character.kind === 'customer');
        if (depot) { const point = position(depot); crate(point.x + .26, point.z + .24, dynamic, .22, .22); }
      }
    }
    pip.setBall((state.held.ball || 0) > 0);
    scoreboard?.update(boardScore(world, state));
    const cargoHeight = pip.setCargo(Object.entries(state.held).reduce((sum, [kind, amount]) => sum + (kind === 'ball' ? 0 : amount), 0));
    if (cargoHeight > cargoHeadroom) { cargoHeadroom = cargoHeight; fitCamera(); }
    draw();
  }
  const observer = new ResizeObserver(fitCamera); observer.observe(host);
  // Keep framing steady during orbit/zoom; resize and view presets can refit.
  controls.addEventListener('change', () => draw());
  function rotateCamera(radians) {
    const offset = camera.position.clone().sub(controls.target).applyAxisAngle(new THREE.Vector3(0, 1, 0), radians);
    camera.position.copy(controls.target).add(offset); controls.update();
  }
  renderer.domElement.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', '+', '-', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') resetCamera();
    else if (event.key === '+' || event.key === '-') { camera.zoom = THREE.MathUtils.clamp(camera.zoom * (event.key === '+' ? 1.2 : 1 / 1.2), .65, 3); camera.updateProjectionMatrix(); draw(); }
    else rotateCamera(event.key === 'ArrowLeft' ? -Math.PI / 8 : Math.PI / 8);
  });
  resetCamera();
  return {
    draw, setLevel, setBoardState, rotateCamera, resetCamera,
    topCamera() { camera.position.set(0, Math.max(width, depth) * 2, .01); controls.update(); fitCamera(); },
    setEnvironment() {}, updateEffects() {}, clearExplosion() {}, explode() {},
    destroy() {
      observer.disconnect(); controls.dispose();
      clear(level); clear(dynamic); clear(robot);
      projectile.geometry.dispose(); materials.forEach(material => material.dispose());
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
