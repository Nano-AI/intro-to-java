import * as THREE from 'three';

export function cargoStackHeight(count) {
  return .414 + (Math.floor(count / 12) * 3 + Math.min(count % 12, 3)) * .30;
}

// Shared by the tile games and continuous robot lessons; front is negative Z.
export function createPipRobot(material) {
  const group = new THREE.Group();
  group.name = 'Pip';
  const mesh = (geometry, color, x, y, z, parent = group) => {
    const object = new THREE.Mesh(geometry, material(color));
    object.position.set(x, y, z);
    object.castShadow = true; object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const cylinder = (radius, height, color, x, y, z) => mesh(new THREE.CylinderGeometry(radius, radius, height, 48), color, x, y, z);
  const box = (w, h, d, color, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), color, x, y, z, parent);

  // Tucked wheels, a rubber bumper and a beveled circular lid.
  for (const x of [-.31, .31]) {
    const wheel = cylinder(.095, .10, 0x202a36, x, .17, .015);
    wheel.rotation.z = Math.PI / 2;
  }
  cylinder(.37, .10, 0x303b49, 0, .16, 0);
  cylinder(.435, .13, 0x303b49, 0, .235, 0);
  cylinder(.40, .09, 0x1f64de, 0, .31, 0);
  mesh(new THREE.CylinderGeometry(.375, .40, .045, 48), 0x317bec, 0, .3775, 0);
  cylinder(.25, .014, 0x1f64de, 0, .407, .05);
  mesh(new THREE.CylinderGeometry(.439, .439, .065, 32, 1, true, Math.PI - .64, 1.28), 0x142539, 0, .235, 0);
  mesh(new THREE.CylinderGeometry(.442, .442, .028, 24, 1, true, Math.PI - .40, .80), 0xa5f0ff, 0, .25, 0);
  cylinder(.047, .014, 0xf2f9ff, 0, .405, -.28);

  const cargo = new THREE.Group(); cargo.name = 'carried-boxes'; group.add(cargo);
  const ball = mesh(new THREE.SphereGeometry(.14, 20, 14), 0xf38f35, 0, .54, -.24);
  ball.visible = false;
  let carried = 0;
  return {
    group,
    setBall(loaded) { ball.visible = loaded; },
    setCargo(count) {
      if (count !== carried) {
        // Keep meshes for replay scrubbing instead of allocating on each frame.
        while (cargo.children.length < count) {
          const index = cargo.children.length, crate = new THREE.Group();
          // Fill four three-box stacks before growing taller in large collection games.
          const column = Math.floor(index / 3) % 4;
          const layer = Math.floor(index / 12) * 3 + index % 3;
          crate.position.set(column % 2 ? .15 : -.15, .56 + layer * .30, column < 2 ? .15 : -.15);
          box(.28, .28, .28, 0xd99843, 0, 0, 0, crate);
          box(.286, .042, .286, 0xffd58b, 0, 0, 0, crate);
          box(.044, .286, .286, 0xffd58b, 0, 0, 0, crate);
          cargo.add(crate);
        }
        cargo.children.forEach((crate, index) => { crate.visible = index < count; });
        carried = count;
      }
      return cargoStackHeight(count);
    },
  };
}
