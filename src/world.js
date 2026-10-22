export const BLOCK = Object.freeze({ AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, LOG: 4, LEAVES: 5, PLANKS: 6, SAND: 7, BRICK: 8 });

export class World {
  constructor() {
    this.size = 32;
    this.blocks = new Uint8Array(this.size ** 3);
    this.protectedBlocks = new Set();
  }
  contains(x, y, z) {
    return [x, y, z].every(n => Number.isInteger(n) && n >= 0 && n < this.size);
  }
  get(x, y, z) {
    return this.contains(x, y, z) ? this.blocks[x + this.size * (z + this.size * y)] : BLOCK.AIR;
  }
  set(x, y, z, type) {
    if (!this.contains(x, y, z)) return false;
    if (this.isProtected(x, y, z) && this.get(x, y, z) !== type) return false;
    this.blocks[x + this.size * (z + this.size * y)] = type;
    return true;
  }
  protect(x, y, z) {
    if (!this.contains(x, y, z) || !this.get(x, y, z)) return false;
    this.protectedBlocks.add(x + this.size * (z + this.size * y));
    return true;
  }
  isProtected(x, y, z) {
    return this.contains(x, y, z) && this.protectedBlocks.has(x + this.size * (z + this.size * y));
  }
}

export function createIsland() {
  const world = new World();
  for (let x = 3; x < 29; x++) for (let z = 3; z < 29; z++) {
    const distance = ((x - 15.5) / 11.5) ** 2 + ((z - 15.5) / 12) ** 2;
    if (distance > 1 + 0.045 * Math.sin(x * 2 + z)) continue;
    const top = 8 + (x < 14 && z < 19 ? 1 : 0);
    const bottom = Math.max(2, Math.floor(2 + distance * 4));
    for (let y = bottom; y <= top; y++) world.set(x, y, z, y === top ? BLOCK.GRASS : y >= top - 2 ? BLOCK.DIRT : BLOCK.STONE);
  }
  for (let x = 20; x <= 23; x++) for (let z = 13; z <= 16; z++) {
    const height = 9 + (x === 21 && z === 14 ? 2 : x < 23 && z < 16 ? 1 : 0);
    for (let y = 8; y <= height; y++) world.set(x, y, z, BLOCK.STONE);
  }
  for (let y = 10; y <= 14; y++) world.set(11, y, 14, BLOCK.LOG);
  for (let y = 13; y <= 16; y++) for (let x = 9; x <= 13; x++) for (let z = 12; z <= 16; z++) {
    const dx = Math.abs(x - 11), dz = Math.abs(z - 14);
    if (dx + dz <= (y === 16 ? 1 : 3) && world.get(x, y, z) === BLOCK.AIR) world.set(x, y, z, BLOCK.LEAVES);
  }
  const spawn = { x: 16.5, y: 9, z: 24.5 };
  world.protect(Math.floor(spawn.x), Math.floor(spawn.y) - 1, Math.floor(spawn.z));
  return { world, spawn };
}
