import { BLOCK } from './world.js';

export const CHUNK_SIZE = 8;
const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 1], [1, 0, 0], [1, 1, 1], [1, 1, 0]] },
  { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 1, 1]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [0, 1, 0], [1, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]] },
  { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]] },
  { n: [0, 0, -1], c: [[1, 0, 0], [0, 0, 0], [1, 1, 0], [0, 1, 0]] },
];
export function tileFor(type, normal) {
  if (type === BLOCK.GRASS) return normal[1] > 0 ? 0 : normal[1] < 0 ? 2 : 1;
  if (type === BLOCK.LOG) return normal[1] ? 5 : 4;
  return { [BLOCK.DIRT]: 2, [BLOCK.STONE]: 3, [BLOCK.LEAVES]: 6, [BLOCK.PLANKS]: 7, [BLOCK.SAND]: 8, [BLOCK.BRICK]: 9 }[type];
}

export function buildChunkGeometry(world, cx, cz) {
  const positions = [], normals = [], uvs = [], indices = [];
  for (let x = cx; x < cx + CHUNK_SIZE; x++) for (let z = cz; z < cz + CHUNK_SIZE; z++) for (let y = 0; y < world.size; y++) {
    const type = world.get(x, y, z);
    if (!type) continue;
    for (const { n, c } of FACES) {
      if (world.get(x + n[0], y + n[1], z + n[2])) continue;
      const tile = tileFor(type, n), col = tile % 4, row = Math.floor(tile / 4);
      const base = positions.length / 3;
      const u0 = (col * 16 + 0.5) / 64, u1 = (col * 16 + 15.5) / 64;
      const v0 = 1 - (row * 16 + 15.5) / 64, v1 = 1 - (row * 16 + 0.5) / 64;
      for (const corner of c) {
        positions.push(x + corner[0], y + corner[1], z + corner[2]);
        normals.push(...n);
      }
      uvs.push(u0, v0, u1, v0, u0, v1, u1, v1);
      indices.push(base, base + 1, base + 2, base + 2, base + 1, base + 3);
    }
  }
  return { positions, normals, uvs, indices };
}

export function affectedChunkOrigins(x, z) {
  const origins = new Map();
  for (const [bx, bz] of [[x, z], [x - 1, z], [x + 1, z], [x, z - 1], [x, z + 1]]) {
    if (bx < 0 || bz < 0 || bx >= 32 || bz >= 32) continue;
    const cx = Math.floor(bx / CHUNK_SIZE) * CHUNK_SIZE, cz = Math.floor(bz / CHUNK_SIZE) * CHUNK_SIZE;
    origins.set(`${cx},${cz}`, { x: cx, z: cz });
  }
  return [...origins.values()];
}
