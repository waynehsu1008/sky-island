import * as THREE from 'three';
import { DROP_SIZE } from './drops.js';
import { createBlockGeometry } from './block-geometry.js';

export function createDropView(material) {
  const group = new THREE.Group(), pools = new Map(), matrix = new THREE.Matrix4();
  group.name = 'dropped-blocks';
  // 同種類共用圖集與幾何，以實例繪製降低大量掉落物的繪製次數。
  group.sync = items => {
    const batches = new Map();
    for (const item of items) {
      if (!batches.has(item.type)) batches.set(item.type, []);
      batches.get(item.type).push(item);
    }
    for (const [type, batch] of batches) {
      let pool = pools.get(type);
      if (!pool || batch.length > pool.capacity) {
        let capacity = pool?.capacity ?? 8;
        while (capacity < batch.length) capacity *= 2;
        const geometry = pool?.mesh.geometry ?? createBlockGeometry(type, DROP_SIZE);
        if (pool) { group.remove(pool.mesh); pool.mesh.dispose(); }
        const mesh = new THREE.InstancedMesh(geometry, material, capacity);
        mesh.name = `drops-type-${type}`;
        mesh.frustumCulled = false;
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        pool = { mesh, capacity };
        pools.set(type, pool);
        group.add(mesh);
      }
      pool.mesh.visible = true;
      pool.mesh.count = batch.length;
      batch.forEach((item, index) => {
        matrix.makeRotationY(item.rotation);
        matrix.setPosition(item.position.x, item.position.y, item.position.z);
        pool.mesh.setMatrixAt(index, matrix);
      });
      pool.mesh.instanceMatrix.needsUpdate = true;
    }
    for (const [type, pool] of pools) if (!batches.has(type)) {
      pool.mesh.count = 0;
      pool.mesh.visible = false;
    }
  };
  group.stats = () => [...pools].map(([type, pool]) => ({ type, count: pool.mesh.count }));
  return group;
}
