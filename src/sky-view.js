import * as THREE from 'three';

export function createSkyView() {
  const clouds = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshLambertMaterial({ color: '#fffdf1' }), 12);
  clouds.name = '方塊雲';
  const transform = new THREE.Object3D();
  const patches = [[5, 22, 4], [23, 24, 0], [29, 21, 20], [0, 23, 24]];
  let index = 0;
  for (const [x, y, z] of patches) for (let piece = 0; piece < 3; piece++) {
    transform.position.set(x + piece * 2.5, y + (piece === 1 ? 0.3 : 0), z + (piece === 2 ? 1 : 0));
    transform.scale.set(piece === 1 ? 5 : 4, 0.65, piece === 1 ? 3 : 2.5);
    transform.updateMatrix();
    clouds.setMatrixAt(index++, transform.matrix);
  }
  return clouds;
}
