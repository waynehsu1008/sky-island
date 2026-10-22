export const DROP_SIZE = 0.3;
const HALF = DROP_SIZE / 2;
const EPSILON = 1e-8;

export class Drops {
  constructor() { this.items = []; this.nextId = 1; }
  spawn(block) {
    if (!block?.type) return null;
    const item = { id: this.nextId++, type: block.type,
      position: { x: block.x + 0.5, y: block.y + 0.5, z: block.z + 0.5 },
      velocityY: 3.2, rotation: 0, grounded: false, age: 0 };
    this.items.push(item);
    return item;
  }
  update(world, delta) {
    if (!Number.isFinite(delta) || delta <= 0) return;
    const duration = Math.min(delta, 0.25), steps = Math.ceil(duration * 120), dt = duration / steps;
    for (const item of this.items) {
      if (item.collecting) continue;
      item.age += duration;
      item.rotation = (item.rotation + duration * 0.8) % (Math.PI * 2);
      const x = Math.floor(item.position.x), z = Math.floor(item.position.z);
      for (let i = 0; i < steps; i++) {
        item.velocityY = Math.max(-30, item.velocityY - 14 * dt);
        const oldY = item.position.y, newY = oldY + item.velocityY * dt;
        item.grounded = false;
        item.position.y = newY;
        if (item.velocityY <= 0) {
          for (let y = Math.floor(oldY - HALF + EPSILON); y >= Math.floor(newY - HALF); y--) {
            if (!world.get(x, y, z)) continue;
            item.position.y = y + 1 + HALF;
            item.velocityY = 0;
            item.grounded = true;
            break;
          }
        } else {
          for (let y = Math.floor(oldY + HALF - EPSILON); y <= Math.floor(newY + HALF); y++) {
            if (!world.get(x, y, z)) continue;
            item.position.y = y - HALF;
            item.velocityY = 0;
            break;
          }
        }
      }
    }
    this.items = this.items.filter(item => item.position.y >= -8);
  }
}
