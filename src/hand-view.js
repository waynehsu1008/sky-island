import * as THREE from 'three';
import { HandMotion } from './hand-motion.js';
import { createHandTextures } from './hand-textures.js';
import { createBlockGeometry } from './block-geometry.js';
import { BLOCK_ORDER } from './inventory.js';

export async function createHandView(blockMaterial) {
  const textures = createHandTextures();
  const root = new THREE.Group();
  // 兩段同寬、相接的長方體形成 4:12 手臂；末端平整，不建立手掌或手指。
  const skin = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.50, 0.24),
    new THREE.MeshLambertMaterial({ map: textures.skin }));
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.24),
    new THREE.MeshLambertMaterial({ map: textures.sleeve }));
  skin.position.y = 0.11;
  sleeve.position.y = -0.25;
  root.add(skin, sleeve);
  const geometries = new Map();
  function geometryFor(type) {
    if (!geometries.has(type)) geometries.set(type, createBlockGeometry(type, 0.38));
    return geometries.get(type);
  }
  const heldBlock = new THREE.Mesh(geometryFor(BLOCK_ORDER[0]), blockMaterial);
  heldBlock.position.set(0, 0.44, -0.03);
  heldBlock.rotation.set(0.10, 0.45, 0.08);
  heldBlock.visible = false;
  root.add(heldBlock);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, 1, 0.01, 5);
  const fill = new THREE.HemisphereLight(0xe9f3ff, 0x80624a, 2);
  const key = new THREE.DirectionalLight(0xffeedc, 1);
  key.position.set(-2, 3, 3);
  scene.add(root, fill, key);
  const motion = new HandMotion();
  let pose = motion.update(0), aspect = 1, heldType = null;
  return {
    place: () => motion.place(),
    resize(value) { aspect = value; camera.aspect = value; camera.updateProjectionMatrix(); },
    update(delta, state) {
      pose = motion.update(delta, state);
      root.visible = pose.visible;
      heldType = BLOCK_ORDER.includes(state.heldType) ? state.heldType : null;
      heldBlock.visible = heldType !== null;
      if (heldType !== null) heldBlock.geometry = geometryFor(heldType);
      const scale = aspect < 0.9 ? 0.51 : 0.85;
      const halfWidth = Math.tan(THREE.MathUtils.degToRad(25)) * 1.2 * aspect;
      root.scale.setScalar(scale);
      root.position.set(halfWidth - 0.30 * scale + pose.x * scale,
        (aspect < 0.9 ? -0.43 : -0.38) + pose.y * scale, -1.2 + pose.z * scale);
      root.rotation.set(-0.65 + pose.rx, -0.26, 0.35 + pose.rz);
    },
    render(renderer, light) {
      if (!root.visible) return;
      fill.intensity = Math.max(1.2, light.ambient);
      key.intensity = Math.max(0.35, light.sun * 0.65);
      renderer.autoClear = false;
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.autoClear = true;
    },
    snapshot: () => ({ ...pose, shape: 'cuboid', fingers: 0, parts: 2,
      heldBlock: { type: heldType, visible: pose.visible && heldType !== null },
      drawCalls: pose.visible ? 2 + Number(heldType !== null) : 0 }),
  };
}
