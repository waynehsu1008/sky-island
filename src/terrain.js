import * as THREE from 'three';
import atlasUrl from '../sky-island-assets/sky-island-assets/atlas.png';
import { CHUNK_SIZE, buildChunkGeometry, affectedChunkOrigins } from './terrain-geometry.js';

export async function createTerrain(world) {
  const texture = await new THREE.TextureLoader().loadAsync(atlasUrl);
  texture.magFilter = texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshLambertMaterial({ map: texture });
  const terrain = new THREE.Group();
  terrain.blockMaterial = material;
  const chunks = new Map();
  function rebuild(cx, cz) {
    const key = `${cx},${cz}`, previous = chunks.get(key);
    const data = buildChunkGeometry(world, cx, cz);
    if (!data.positions.length) {
      if (previous) { terrain.remove(previous); previous.geometry.dispose(); chunks.delete(key); }
      return;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
    geometry.setIndex(data.indices);
    geometry.computeBoundingSphere();
    if (previous) {
      previous.geometry.dispose();
      previous.geometry = geometry;
    } else {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `terrain-${cx}-${cz}`;
      terrain.add(mesh);
      chunks.set(key, mesh);
    }
  }
  for (let cx = 0; cx < world.size; cx += CHUNK_SIZE) for (let cz = 0; cz < world.size; cz += CHUNK_SIZE) rebuild(cx, cz);
  terrain.rebuildAt = (x, z) => {
    for (const origin of affectedChunkOrigins(x, z)) rebuild(origin.x, origin.z);
  };
  return terrain;
}
