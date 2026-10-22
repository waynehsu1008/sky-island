import { BLOCK } from './world.js';

export const BLOCK_ORDER = [BLOCK.GRASS, BLOCK.DIRT, BLOCK.STONE, BLOCK.LOG, BLOCK.LEAVES, BLOCK.PLANKS, BLOCK.SAND, BLOCK.BRICK];
export const BLOCK_INFO = {
  [BLOCK.GRASS]: ['草地', 'grass'], [BLOCK.DIRT]: ['泥土', 'dirt'], [BLOCK.STONE]: ['石頭', 'stone'],
  [BLOCK.LOG]: ['木頭', 'log'], [BLOCK.LEAVES]: ['樹葉', 'leaves'], [BLOCK.PLANKS]: ['木板', 'planks'],
  [BLOCK.SAND]: ['沙子', 'sand'], [BLOCK.BRICK]: ['磚塊', 'brick'],
};
export class Inventory {
  constructor() { this.counts = Array(9).fill(0); this.selected = BLOCK.GRASS; this.revision = 0; }
  count(type) { return this.counts[type] ?? 0; }
  add(type) { if (BLOCK_INFO[type]) { this.counts[type]++; this.revision++; } }
  select(type) { if (BLOCK_INFO[type] && type !== this.selected) { this.selected = type; this.revision++; } }
}

export function collectDrops(drops, player, inventory, delta) {
  if (!Number.isFinite(delta) || delta <= 0) return;
  const dt = Math.min(delta, 0.25), completed = new Set();
  for (const item of drops.items) {
    if (!item.collecting) {
      const distance = Math.hypot(item.position.x - player.position.x,
        item.position.y - player.position.y - 0.3, item.position.z - player.position.z);
      if (item.age < 0.2 || distance > 1.5) continue;
      item.collecting = true;
      item.pickupStart = { ...item.position };
      item.pickupTime = 0;
    }
    item.pickupTime += dt;
    const t = Math.min(1, item.pickupTime / 0.35);
    const destination = { x: player.position.x, y: player.position.y + player.height * 0.55, z: player.position.z };
    for (const axis of ['x', 'y', 'z']) item.position[axis] = item.pickupStart[axis] + (destination[axis] - item.pickupStart[axis]) * t;
    if (t >= 1) { inventory.add(item.type); completed.add(item.id); }
  }
  if (completed.size) drops.items = drops.items.filter(item => !completed.has(item.id));
}

function overlaps(point, body) {
  const p = body.position, r = body.radius, eps = 1e-7;
  return point.x < p.x + r - eps && point.x + 1 > p.x - r + eps &&
    point.y < p.y + body.height - eps && point.y + 1 > p.y + eps &&
    point.z < p.z + r - eps && point.z + 1 > p.z - r + eps;
}
export function placeBlock(world, player, inventory, hit) {
  if (!hit || !world.get(hit.x, hit.y, hit.z) || inventory.count(inventory.selected) <= 0) return null;
  const n = hit.normal;
  if (!n || ![n.x, n.y, n.z].every(Number.isInteger) || Math.abs(n.x) + Math.abs(n.y) + Math.abs(n.z) !== 1) return null;
  const point = { x: hit.x + n.x, y: hit.y + n.y, z: hit.z + n.z };
  if (!world.contains(point.x, point.y, point.z) || world.get(point.x, point.y, point.z) || overlaps(point, player)) return null;
  // 出生點保留可站立空間，避免遠處蓋方塊後重生卡住；不重設世界。
  if (overlaps(point, { ...player, position: player.spawn })) return null;
  if (!world.set(point.x, point.y, point.z, inventory.selected)) return null;
  inventory.counts[inventory.selected]--;
  inventory.revision++;
  return point;
}
