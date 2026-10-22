import * as THREE from 'three';
import { pixelTexture } from './hand-textures.js';

export function createAnimalView(animals) {
  const map = pixelTexture([0xf4f4f4, 0xffffff, 0xe7e7e7], [
    '11111111', '11100111', '11100111', '01111111',
    '00111111', '11111122', '11111122', '11111111',
  ]);
  const material = new THREE.MeshLambertMaterial({ map });
  const models = [], parts = [];
  let owner;
  function box(parent, size, position, color) {
    const object = new THREE.Object3D();
    object.position.set(...position); object.scale.set(...size); parent.add(object);
    parts.push({ object, color: new THREE.Color(color), animal: owner });
    return object;
  }
  for (const animal of animals.items) {
    owner = animal;
    const root = new THREE.Group(), head = new THREE.Group(), legs = [];
    const chicken = animal.type === 'chicken', sheep = animal.type === 'sheep';
    const bodyColor = chicken ? '#f6f1e6' : sheep ? '#eee8da' : '#efa0a4';
    const headColor = sheep ? '#99836e' : bodyColor;
    const footColor = chicken ? '#d9a53c' : sheep ? '#5d5045' : '#bb7377';
    const bodyY = chicken ? 0.35 : sheep ? 0.79 : 0.62;
    box(root, chicken ? [0.35, 0.36, 0.44] : sheep ? [0.72, 0.66, 1.02] : [0.64, 0.48, 0.94], [0, bodyY, 0], bodyColor);
    head.position.set(0, chicken ? 0.57 : sheep ? 0.91 : 0.76, chicken ? 0.24 : 0.55);
    root.add(head);
    const headSize = chicken ? [0.28, 0.32, 0.29] : sheep ? [0.40, 0.43, 0.42] : [0.47, 0.42, 0.42];
    box(head, headSize, [0, 0, 0], headColor);
    const front = headSize[2] / 2;
    for (const side of [-1, 1]) {
      box(head, [0.10, 0.095, 0.018], [side * headSize[0] * 0.29, 0.035, front + 0.008], '#fffdf4');
      box(head, [0.043, 0.068, 0.022], [side * headSize[0] * 0.25, 0.027, front + 0.019], '#242326');
    }
    if (chicken) {
      box(head, [0.18, 0.09, 0.14], [0, -0.065, front + 0.055], '#e9b13f');
      box(head, [0.07, 0.13, 0.07], [0, -0.17, front], '#c94b42');
      box(head, [0.07, 0.07, 0.16], [0, 0.19, 0], '#d65948');
      for (const side of [-1, 1]) box(root, [0.07, 0.24, 0.32], [side * 0.21, 0.36, -0.01], '#e5dece');
      box(root, [0.20, 0.13, 0.12], [0, 0.42, -0.26], '#e7dfcf');
    } else if (sheep) {
      box(head, [0.43, 0.13, 0.37], [0, 0.22, -0.035], bodyColor);
      box(head, [0.23, 0.13, 0.07], [0, -0.10, front + 0.025], '#d5b9a9');
      for (const side of [-1, 1]) box(head, [0.13, 0.12, 0.14], [side * 0.24, 0.04, -0.02], '#a18b77');
    } else {
      box(head, [0.28, 0.17, 0.09], [0, -0.075, front + 0.035], '#e58c98');
      for (const side of [-1, 1]) {
        box(head, [0.05, 0.045, 0.014], [side * 0.075, -0.065, front + 0.087], '#a85366');
        box(head, [0.12, 0.10, 0.15], [side * 0.18, 0.23, -0.04], '#df8c94');
      }
      box(root, [0.09, 0.09, 0.19], [0, 0.69, -0.53], '#df8c94');
    }
    const legHeight = chicken ? 0.20 : sheep ? 0.47 : 0.39;
    for (const side of [-1, 1]) for (const end of chicken ? [0] : [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(side * (chicken ? 0.10 : 0.23), legHeight, end * 0.31); root.add(leg);
      const width = chicken ? 0.055 : 0.15;
      box(leg, [width, legHeight, width], [0, -legHeight / 2, 0], chicken ? footColor : headColor);
      box(leg, [chicken ? 0.12 : 0.16, 0.07, chicken ? 0.17 : 0.17], [0, -legHeight + 0.035, chicken ? 0.035 : 0], footColor);
      legs.push({ object: leg, sign: side * (end || 1) });
    }
    models.push({ root, head, legs, animal });
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, parts.length);
  mesh.name = '小島動物';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  parts.forEach((part, index) => mesh.setColorAt(index, part.color));
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  function sync() {
    for (const { root, head, legs, animal } of models) {
      root.position.set(animal.x, animal.y, animal.z);
      root.rotation.y = animal.yaw;
      const stride = animal.moving ? Math.sin(animal.phase) * 0.38 : 0;
      for (const leg of legs) leg.object.rotation.x = stride * leg.sign;
      head.rotation.x = animal.moving ? 0 : Math.max(0, Math.sin(animal.phase * 0.22)) * 0.28;
      root.updateMatrixWorld(true);
    }
    parts.forEach((part, index) => mesh.setMatrixAt(index, part.animal.visible ? part.object.matrixWorld : hidden));
    mesh.instanceMatrix.needsUpdate = true;
  }
  sync();
  mesh.sync = sync;
  return mesh;
}
