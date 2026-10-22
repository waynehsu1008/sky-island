import { BLOCK } from './world.js';

export const INTERACTION_RANGE = 5;
export const MINING_SECONDS = Object.freeze({
  [BLOCK.GRASS]: 0.75, [BLOCK.DIRT]: 0.75, [BLOCK.STONE]: 2,
  [BLOCK.LOG]: 1.25, [BLOCK.LEAVES]: 0.3, [BLOCK.PLANKS]: 1,
  [BLOCK.SAND]: 0.75, [BLOCK.BRICK]: 2,
});

export class Mining {
  constructor() { this.reset(); }
  reset() { this.target = null; this.elapsed = 0; }
  get progress() { return this.target ? this.elapsed / MINING_SECONDS[this.target.type] : 0; }
  get stage() { return this.target ? Math.min(9, Math.floor(this.progress * 10)) : -1; }
  update(world, hit, held, delta) {
    const type = hit ? world.get(hit.x, hit.y, hit.z) : BLOCK.AIR;
    if (!held || !hit || !MINING_SECONDS[type] || world.isProtected(hit.x, hit.y, hit.z)) {
      this.reset();
      return null;
    }
    if (!this.target || this.target.x !== hit.x || this.target.y !== hit.y || this.target.z !== hit.z || this.target.type !== type) {
      this.target = { x: hit.x, y: hit.y, z: hit.z, type };
      this.elapsed = 0;
    }
    this.elapsed += Number.isFinite(delta) ? Math.max(0, delta) : 0;
    if (this.elapsed + 1e-9 < MINING_SECONDS[type]) return null;
    const broken = { ...this.target };
    const removed = world.set(hit.x, hit.y, hit.z, BLOCK.AIR);
    this.reset();
    return removed ? broken : null;
  }
}

// 逐格走過視線，直接讀取世界資料，避免選中前方實心格子背後的方塊。
export function pickBlock(world, origin, direction, maxDistance = INTERACTION_RANGE) {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (!Number.isFinite(length) || length === 0 || !Number.isFinite(maxDistance) || maxDistance < 0) return null;
  const axes = ['x', 'y', 'z'];
  const cell = {}, step = {}, stride = {}, next = {};
  for (const axis of axes) {
    if (!Number.isFinite(origin[axis])) return null;
    const d = direction[axis] / length;
    cell[axis] = Math.floor(origin[axis]);
    step[axis] = Math.sign(d);
    stride[axis] = d === 0 ? Infinity : Math.abs(1 / d);
    next[axis] = d > 0 ? (cell[axis] + 1 - origin[axis]) / d : d < 0 ? (cell[axis] - origin[axis]) / d : Infinity;
  }
  let distance = 0, normal = { x: 0, y: 0, z: 0 };
  while (distance <= maxDistance) {
    const type = world.get(cell.x, cell.y, cell.z);
    if (type) return { ...cell, type, distance, normal };
    const axis = next.x <= next.y && next.x <= next.z ? 'x' : next.y <= next.z ? 'y' : 'z';
    distance = Math.max(0, next[axis]);
    if (distance > maxDistance) break;
    cell[axis] += step[axis];
    next[axis] += stride[axis];
    normal = { x: 0, y: 0, z: 0 };
    normal[axis] = -step[axis];
  }
  return null;
}
