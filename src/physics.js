const EPSILON = 1e-7;
const SPEED = 4.5;
const GRAVITY = 22;
const JUMP_SPEED = 8;

export class Player {
  constructor(spawn) {
    this.spawn = { ...spawn };
    this.position = { ...spawn };
    this.radius = 0.28;
    this.height = 1.75;
    this.eyeHeight = 1.6;
    this.velocityY = 0;
    this.yaw = 0;
    this.pitch = -0.08;
    this.grounded = false;
    this.jumpHeld = false;
    this.respawnCount = 0;
  }
  collides(world) {
    return overlappingBlocks(this, world).length > 0;
  }
}

function overlappingBlocks(player, world) {
  const { x, y, z } = player.position, r = player.radius;
  const blocks = [];
  for (let bx = Math.floor(x - r + EPSILON); bx <= Math.floor(x + r - EPSILON); bx++)
    for (let by = Math.floor(y + EPSILON); by <= Math.floor(y + player.height - EPSILON); by++)
      for (let bz = Math.floor(z - r + EPSILON); bz <= Math.floor(z + r - EPSILON); bz++)
        if (world.get(bx, by, bz)) blocks.push({ x: bx, y: by, z: bz });
  return blocks;
}

function moveAxis(player, world, axis, amount) {
  if (!amount) return;
  player.position[axis] += amount;
  const hit = overlappingBlocks(player, world);
  if (!hit.length) return;
  const positive = amount > 0;
  const extent = axis === 'y' ? positive ? player.height : 0 : player.radius;
  const boundaries = hit.map(block => positive ? block[axis] - extent : block[axis] + 1 + extent);
  player.position[axis] = positive ? Math.min(...boundaries) : Math.max(...boundaries);
  if (axis === 'y') {
    player.velocityY = 0;
    if (!positive) player.grounded = true;
  }
}

export function respawnPlayer(player) {
  Object.assign(player.position, player.spawn);
  player.velocityY = 0;
  player.grounded = false;
  player.jumpHeld = false;
  player.respawnCount++;
}

export function advancePlayer(player, world, input, delta) {
  if (!Number.isFinite(delta) || delta <= 0) return;
  if (input.jump && !player.jumpHeld && player.grounded) player.velocityY = JUMP_SPEED;
  player.jumpHeld = Boolean(input.jump);
  const duration = Math.min(delta, 0.25);
  const steps = Math.ceil(duration * 120);
  const dt = duration / steps;
  const length = Math.max(1, Math.hypot(input.forward, input.right));
  const forward = input.forward / length, right = input.right / length;
  const dx = (-Math.sin(player.yaw) * forward + Math.cos(player.yaw) * right) * SPEED;
  const dz = (-Math.cos(player.yaw) * forward - Math.sin(player.yaw) * right) * SPEED;
  for (let i = 0; i < steps; i++) {
    moveAxis(player, world, 'x', dx * dt);
    moveAxis(player, world, 'z', dz * dt);
    player.velocityY = Math.max(-40, player.velocityY - GRAVITY * dt);
    player.grounded = false;
    moveAxis(player, world, 'y', player.velocityY * dt);
    if (player.position.y < -8) {
      respawnPlayer(player);
      return;
    }
  }
}
