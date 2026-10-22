import test from 'node:test';
import assert from 'node:assert/strict';
import { World, BLOCK, createIsland } from '../src/world.js';
import { Player, advancePlayer, respawnPlayer } from '../src/physics.js';

const idle = { forward: 0, right: 0, jump: false };
function frames(player, world, input, count, dt = 1 / 60) {
  for (let i = 0; i < count; i++) advancePlayer(player, world, input, dt);
}
function platform() {
  const world = new World();
  for (let x = 0; x < 12; x++) for (let z = 0; z < 12; z++) world.set(x, 2, z, BLOCK.GRASS);
  return world;
}

test('STEP 0: 島有安全出生點，以及泥土、石頭與其他素材包方塊', () => {
  const { world, spawn } = createIsland();
  assert.equal(world.size, 32);
  assert.ok(world.get(Math.floor(spawn.x), Math.floor(spawn.y) - 1, Math.floor(spawn.z)));
  const player = new Player(spawn);
  assert.equal(player.collides(world), false);
  for (const type of [BLOCK.DIRT, BLOCK.STONE, BLOCK.GRASS, BLOCK.LOG]) assert.ok(world.blocks.includes(type));
  frames(player, world, idle, 300);
  assert.ok(Math.abs(player.position.y - spawn.y) < 0.001);
  assert.equal(player.grounded, true);
});

test('STEP 0: 世界不超過 32 格，範圍外寫入失敗且不影響其他格', () => {
  const world = new World();
  for (const xyz of [[-1, 0, 0], [32, 0, 0], [0, -1, 0], [0, 32, 0], [0, 0, -1], [0, 0, 32]]) {
    assert.equal(world.set(...xyz, BLOCK.STONE), false);
    assert.equal(world.get(...xyz), BLOCK.AIR);
  }
  assert.equal(world.set(31, 31, 31, BLOCK.STONE), true);
  assert.equal(world.get(31, 31, 31), BLOCK.STONE);
  assert.equal(world.blocks.filter(Boolean).length, 1);
});

test('STEP 0: 前後左右能移動，斜走速度不比直走快', () => {
  const world = platform();
  const start = { x: 5.5, y: 3, z: 5.5 };
  const distance = (p) => Math.hypot(p.position.x - start.x, p.position.z - start.z);
  const straight = new Player(start), diagonal = new Player(start);
  frames(straight, world, { ...idle, forward: 1 }, 30);
  frames(diagonal, world, { ...idle, forward: 1, right: 1 }, 30);
  assert.ok(distance(straight) > 1);
  assert.ok(Math.abs(distance(straight) - distance(diagonal)) < 0.001);
  for (const input of [{ forward: -1 }, { right: -1 }, { right: 1 }]) {
    const p = new Player(start);
    frames(p, world, { ...idle, ...input }, 15);
    assert.ok(distance(p) > 0.5);
  }
});

test('STEP 0: 走向實心牆會被擋住，不穿入方塊', () => {
  const world = platform();
  for (let y = 3; y < 6; y++) for (let z = 0; z < 12; z++) world.set(7, y, z, BLOCK.STONE);
  const p = new Player({ x: 5.5, y: 3, z: 5.5 });
  frames(p, world, { ...idle, right: 1 }, 180);
  assert.ok(p.position.x <= 7 - p.radius + 0.001);
  assert.equal(p.collides(world), false);
});

test('STEP 0: 連續跳三次，每次離地、落地且不穿地', () => {
  const world = platform(), p = new Player({ x: 5.5, y: 3, z: 5.5 });
  frames(p, world, idle, 2);
  for (let jump = 0; jump < 3; jump++) {
    frames(p, world, { ...idle, jump: true }, 1);
    frames(p, world, idle, 10);
    assert.ok(p.position.y > 3.4);
    frames(p, world, idle, 90);
    assert.ok(Math.abs(p.position.y - 3) < 0.001);
    assert.equal(p.grounded, true);
    assert.equal(p.collides(world), false);
  }
});

test('STEP 0: 頭頂碰到方塊時不穿過天花板', () => {
  const world = platform(), p = new Player({ x: 5.5, y: 3, z: 5.5 });
  world.set(5, 5, 5, BLOCK.STONE);
  frames(p, world, idle, 2);
  frames(p, world, { ...idle, jump: true }, 1);
  for (let i = 0; i < 90; i++) {
    frames(p, world, idle, 1);
    assert.ok(p.position.y + p.height <= 5.001);
    assert.equal(p.collides(world), false);
  }
});

test('STEP 0: 低幀率與一秒卡頓之後，仍不穿過一格厚的地面', () => {
  for (const dt of [1 / 30, 0.2, 1]) {
    const world = platform(), p = new Player({ x: 5.5, y: 9, z: 5.5 });
    frames(p, world, idle, 180, dt);
    assert.ok(Math.abs(p.position.y - 3) < 0.001);
    assert.equal(p.grounded, true);
  }
});

test('STEP 0: 從島邊走出跌落會回出生點，清除下落速度', () => {
  const world = platform(), p = new Player({ x: 5.5, y: 3, z: 5.5 });
  let returned = false;
  for (let i = 0; i < 600; i++) {
    advancePlayer(p, world, { ...idle, right: 1 }, 1 / 60);
    if (p.respawnCount > 0) { returned = true; break; }
  }
  assert.equal(returned, true);
  assert.deepEqual(p.position, p.spawn);
  assert.equal(p.velocityY, 0);
  frames(p, world, idle, 30);
  assert.equal(p.grounded, true);
});

test('STEP 0: 重生保留世界修改與方塊欄資料，不重建遊戲狀態', () => {
  const { world, spawn } = createIsland(), p = new Player(spawn);
  const inventory = { dirt: 7, stone: 2 };
  const state = { world, player: p, inventory };
  world.set(0, 20, 0, BLOCK.BRICK);
  world.set(16, 8, 16, BLOCK.AIR);
  const snapshot = world.blocks.slice();
  p.position.y = -20;
  p.velocityY = -30;
  respawnPlayer(p);
  assert.equal(state.world, world);
  assert.deepEqual(world.blocks, snapshot);
  assert.deepEqual(state.inventory, { dirt: 7, stone: 2 });
  assert.deepEqual(p.position, spawn);
  assert.equal(p.velocityY, 0);
});
