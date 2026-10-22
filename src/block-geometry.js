import * as THREE from 'three';
import { tileFor } from './terrain-geometry.js';

// 掉落物與手持方塊使用同一個六面圖集對應，草地底面、木頭端面各自取材質。
export function createBlockGeometry(type, size = 1) {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const uv = geometry.attributes.uv, normal = geometry.attributes.normal;
  for (let face = 0; face < 6; face++) {
    const first = face * 4;
    const tile = tileFor(type, [normal.getX(first), normal.getY(first), normal.getZ(first)]);
    const col = tile % 4, row = Math.floor(tile / 4);
    for (let vertex = first; vertex < first + 4; vertex++) {
      uv.setXY(vertex, (col * 16 + 0.5 + uv.getX(vertex) * 15) / 64,
        1 - (row * 16 + 15.5 - uv.getY(vertex) * 15) / 64);
    }
  }
  return geometry;
}
