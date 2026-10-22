import * as THREE from 'three';

const crackUrls = import.meta.glob('../sky-island-assets/sky-island-assets/textures/16px/destroy_stage_*.png', {
  eager: true, query: '?url', import: 'default',
});

export async function createCracks() {
  const loader = new THREE.TextureLoader();
  const textures = await Promise.all(Array.from({ length: 10 }, (_, stage) =>
    loader.loadAsync(crackUrls[`../sky-island-assets/sky-island-assets/textures/16px/destroy_stage_${stage}.png`])));
  for (const texture of textures) {
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  const material = new THREE.MeshBasicMaterial({ map: textures[0], transparent: true, depthWrite: false, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), material);
  mesh.name = 'mining-cracks';
  mesh.visible = false;
  mesh.renderOrder = 1;
  mesh.show = (target, stage) => {
    mesh.visible = Boolean(target && stage >= 0);
    if (!mesh.visible) return;
    mesh.position.set(target.x + 0.5, target.y + 0.5, target.z + 0.5);
    material.map = textures[stage];
  };
  return mesh;
}
