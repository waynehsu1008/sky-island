import test from 'node:test';
import assert from 'node:assert/strict';
import { Animals, canAnimalStand } from '../src/animals.js';
import { createIsland, BLOCK } from '../src/world.js';

test('動物：五隻豬、羊、雞出生在完整支撐且沒有障礙的島上', () => {
  const { world } = createIsland(), animals = new Animals(world);
  assert.deepEqual(animals.items.map(a => a.type).sort(), ['chicken', 'chicken', 'pig', 'pig', 'sheep']);
  for (const a of animals.items) assert.ok(canAnimalStand(world, a.x, a.y, a.z, a.radius, a.height));
});

test('動物：暫停不移動，恢復後會漫遊，長時間不走出懸崖或穿入地形', () => {
  const { world } = createIsland(), animals = new Animals(world), before = animals.snapshot();
  animals.update(world, 20, false);
  assert.deepEqual(animals.snapshot(), before);
  let movement = 0;
  for (let frame = 0; frame < 3600; frame++) {
    animals.update(world, 1 / 60, true);
    for (const a of animals.items) {
      assert.ok(canAnimalStand(world, a.x, a.y, a.z, a.radius, a.height));
      movement += Math.hypot(a.x - before[a.id].x, a.z - before[a.id].z);
    }
  }
  assert.ok(movement > 100);
});

test('動物：腳下被挖空會下落到下一層，不懸浮', () => {
  const { world } = createIsland(), animals = new Animals(world), a = animals.items[0], y = a.y;
  for (let x = Math.floor(a.x - a.radius); x <= Math.floor(a.x + a.radius); x++)
    for (let z = Math.floor(a.z - a.radius); z <= Math.floor(a.z + a.radius); z++) world.set(x, y - 1, z, BLOCK.AIR);
  animals.update(world, 0.1, true);
  assert.ok(a.y < y);
  for (let i = 0; i < 60; i++) animals.update(world, 1 / 60, true);
  assert.equal(a.y, y - 1);
  assert.ok(canAnimalStand(world, a.x, a.y, a.z, a.radius, a.height));
});

test('動物：原地被方塊堵住或底下全部挖空，能回到安全空地', () => {
  const { world } = createIsland(), animals = new Animals(world), a = animals.items[0];
  world.set(Math.floor(a.x), a.y, Math.floor(a.z), BLOCK.STONE);
  animals.update(world, 0.1, true);
  assert.ok(canAnimalStand(world, a.x, a.y, a.z, a.radius, a.height));
  a.x = 0.5; a.z = 0.5;
  for (let i = 0; i < 180; i++) animals.update(world, 1 / 60, true);
  assert.ok(canAnimalStand(world, a.x, a.y, a.z, a.radius, a.height));
});

test('動物：長時間卡頓後位置仍有限，不改變方塊世界', () => {
  const { world } = createIsland(), animals = new Animals(world), blocks = world.blocks.slice();
  animals.update(world, 100, true);
  for (const a of animals.items) assert.ok([a.x, a.y, a.z, a.yaw].every(Number.isFinite));
  assert.deepEqual(world.blocks, blocks);
});
