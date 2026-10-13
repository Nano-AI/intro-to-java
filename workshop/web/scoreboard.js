import * as THREE from 'three';

export function createScoreboard(width, material) {
  const group = new THREE.Group(); group.name = 'scoreboard';
  const height = width / 3;
  const display = new THREE.Group(); display.position.y = .85 + height / 2; group.add(display);
  const box = (w, h, d, color, x, y, z, parent = group) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh);
  };
  box(.14, display.position.y, .14, 0x344454, 0, display.position.y / 2, 0);
  box(width + .16, height + .16, .18, 0x243442, 0, 0, 0, display);
  box(width + .16, .055, .20, 0x64baab, 0, height / 2 + .09, 0, display);
  const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256;
  const ctx = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
  face.position.z = .096; display.add(face);
  let previous = '';
  const digit = (number, x, y) => {
    const segments = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'][number];
    const shapes = [[12, 0, 58, 10], [72, 12, 10, 57], [72, 82, 10, 57], [12, 141, 58, 10], [0, 82, 10, 57], [0, 12, 10, 57], [12, 71, 58, 10]];
    shapes.forEach(([dx, dy, w, h], i) => { ctx.fillStyle = segments.includes('abcdefg'[i]) ? '#baf5a6' : '#1a332e'; ctx.fillRect(x + dx, y + dy, w, h); });
  };
  return {
    group,
    placeBehind(camera, boardWidth, boardDepth) {
      const back = new THREE.Vector3(camera.position.x, 0, camera.position.z).normalize();
      const distance = Math.abs(back.x) * boardWidth / 2 + Math.abs(back.z) * boardDepth / 2 + height / 2 + .65;
      group.position.set(-back.x * distance, 0, -back.z * distance);
      display.quaternion.copy(camera.quaternion);
    },
    update(score) {
      const signature = JSON.stringify(score);
      if (signature === previous) return;
      previous = signature;
      ctx.fillStyle = '#0d201e'; ctx.fillRect(0, 0, 768, 256);
      ctx.fillStyle = '#d1e8e0'; ctx.font = '600 46px system-ui'; ctx.fillText(score.label, 30, 55);
      const value = String(score.value).padStart(2, '0');
      const scale = Math.min(1, 330 / (value.length * 94));
      ctx.save(); ctx.translate(30, 82); ctx.scale(scale, scale);
      [...value].forEach((n, i) => digit(Number(n), i * 94, 0)); ctx.restore();
      if (score.target != null) {
        ctx.fillStyle = '#8bac9f'; ctx.fillRect(406, 28, 2, 200);
        ctx.fillStyle = '#d1e8e0'; ctx.font = '600 46px system-ui'; ctx.fillText('Target', 446, 55);
        ctx.fillStyle = '#ffd487'; ctx.font = 'bold 126px monospace'; ctx.fillText(String(score.target).padStart(2, '0'), 446, 199, 292);
      }
      texture.needsUpdate = true;
    },
  };
}
