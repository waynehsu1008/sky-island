const TYPES = {
  pig: { radius: 0.40, height: 1.05, speed: 0.48 },
  sheep: { radius: 0.42, height: 1.2, speed: 0.40 },
  chicken: { radius: 0.25, height: 0.8, speed: 0.62 },
};
const INITIAL = [
  ['sheep', 14.4, 20.4, -0.55], ['pig', 18.5, 20.7, 0.65],
  ['chicken', 16.5, 21.4, 0.3], ['chicken', 12.8, 22.1, -0.8],
  ['pig', 22.0, 20.0, 1.6],
];

// 以整個腳底範圍確認支撐，避免中心點仍在島上但身體已跨出懸崖。
export function canAnimalStand(world, x, y, z, radius, height) {
  const epsilon = 1e-5;
  if (!Number.isInteger(y) || y < 1 || y + height >= world.size) return false;
  for (let bx = Math.floor(x - radius); bx <= Math.floor(x + radius - epsilon); bx++)
    for (let bz = Math.floor(z - radius); bz <= Math.floor(z + radius - epsilon); bz++) {
      if (!world.contains(bx, y - 1, bz) || !world.get(bx, y - 1, bz)) return false;
      for (let by = y; by < Math.ceil(y + height); by++) if (world.get(bx, by, bz)) return false;
    }
  return true;
}

function safeHeight(world, x, z, animal, maximum = world.size - 2) {
  for (let y = Math.min(world.size - 2, Math.floor(maximum)); y > 0; y--)
    if (canAnimalStand(world, x, y, z, animal.radius, animal.height)) return y;
  return null;
}

function bodyBlocked(world, animal) {
  const { x, y, z, radius, height } = animal, epsilon = 1e-5;
  for (let bx = Math.floor(x - radius); bx <= Math.floor(x + radius - epsilon); bx++)
    for (let bz = Math.floor(z - radius); bz <= Math.floor(z + radius - epsilon); bz++)
      for (let by = Math.floor(y + epsilon); by < Math.ceil(y + height - epsilon); by++)
        if (world.get(bx, by, bz)) return true;
  return false;
}

export class Animals {
  constructor(world) {
    this.items = INITIAL.map(([type, x, z, yaw], id) => {
      const animal = { id, type, ...TYPES[type], x, z, y: 9, yaw, phase: id * 1.7,
        timer: 1.4 + id * 0.3, decisions: 0, moving: false, visible: true, velocityY: 0 };
      animal.y = safeHeight(world, x, z, animal) ?? 9;
      return animal;
    });
  }
  update(world, delta, active, playerPosition) {
    if (!active || !Number.isFinite(delta) || delta <= 0) return;
    const duration = Math.min(delta, 0.25), steps = Math.ceil(duration * 60), dt = duration / steps;
    for (let i = 0; i < steps; i++) for (const animal of this.items) this.step(world, animal, dt, playerPosition);
  }
  step(world, animal, dt, player) {
    if (!animal.visible) return;
    animal.phase += dt * 6;
    if (bodyBlocked(world, animal)) { this.rescue(world, animal); return; }
    // 地面被挖掉時落到下層；新放方塊堵住時找附近空地，避免穿模。
    const ground = safeHeight(world, animal.x, animal.z, animal, animal.y + 0.001);
    if (ground === null || ground < animal.y - 0.001) {
      animal.velocityY -= 14 * dt;
      animal.y += animal.velocityY * dt;
      animal.moving = false;
      if (ground !== null && animal.y <= ground) { animal.y = ground; animal.velocityY = 0; }
      if (animal.y < -4) this.rescue(world, animal);
      return;
    }
    if (!canAnimalStand(world, animal.x, Math.round(animal.y), animal.z, animal.radius, animal.height)) {
      this.rescue(world, animal);
      return;
    }
    animal.velocityY = 0;
    animal.timer -= dt;
    if (animal.timer <= 0) {
      animal.decisions++;
      animal.moving = animal.decisions % 3 !== 0;
      animal.yaw += Math.sin(animal.decisions * 2.37 + animal.id * 1.31) * 1.8;
      animal.timer = animal.moving ? 2.0 + (animal.id % 3) * 0.4 : 1.6;
    }
    if (!animal.moving) return;
    const x = animal.x + Math.sin(animal.yaw) * animal.speed * dt;
    const z = animal.z + Math.cos(animal.yaw) * animal.speed * dt;
    const nearPlayer = player && Math.hypot(x - player.x, z - player.z) < 0.8;
    const nearOther = this.items.some(other => other !== animal && other.visible &&
      Math.abs(other.y - animal.y) < 1 && Math.hypot(x - other.x, z - other.z) < animal.radius + other.radius + 0.12);
    if (!nearPlayer && !nearOther && canAnimalStand(world, x, Math.round(animal.y), z, animal.radius, animal.height)) {
      animal.x = x; animal.z = z;
    } else {
      animal.yaw += 1.3;
      animal.moving = false;
      animal.timer = 0.5;
    }
  }
  rescue(world, animal) {
    const origin = INITIAL[animal.id];
    for (let distance = 0; distance < world.size; distance++)
      for (let x = 1; x < world.size - 1; x++) for (let z = 1; z < world.size - 1; z++) {
        if (Math.floor(Math.hypot(x + 0.5 - origin[1], z + 0.5 - origin[2])) !== distance) continue;
        const y = safeHeight(world, x + 0.5, z + 0.5, animal);
        if (y === null) continue;
        Object.assign(animal, { x: x + 0.5, y, z: z + 0.5, velocityY: 0, visible: true });
        return;
      }
    animal.visible = false;
  }
  snapshot() {
    return this.items.map(({ id, type, x, y, z, yaw, moving, visible }) => ({ id, type, x, y, z, yaw, moving, visible }));
  }
}
