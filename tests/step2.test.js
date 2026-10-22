import test from 'node:test';
import assert from 'node:assert/strict';
import { World, BLOCK } from '../src/world.js';
import { Mining } from '../src/mining.js';
import { Drops, DROP_SIZE } from '../src/drops.js';

function floor() {
  const world = new World();
  for (let x = 0; x < 12; x++) for (let z = 0; z < 12; z++) world.set(x, 0, z, BLOCK.STONE);
  return world;
}
function advance(drops, world, seconds, dt = 1 / 60) {
  for (let i = 0; i < Math.ceil(seconds / dt); i++) drops.update(world, dt);
}

test('STEP 2: 泥土、石頭、木頭各挖一次，各只掉一個同種類方塊', () => {
  const world = floor(), mining = new Mining(), drops = new Drops();
  for (const [x, type, duration] of [[3, BLOCK.DIRT, 0.75], [4, BLOCK.STONE, 2], [5, BLOCK.LOG, 1.25]]) {
    const p = { x, y: 3, z: 5 };
    world.set(x, 3, 5, type);
    const broken = mining.update(world, p, true, duration);
    drops.spawn(broken);
    assert.equal(mining.update(world, p, true, duration), null);
  }
  assert.deepEqual(drops.items.map(item => item.type), [BLOCK.DIRT, BLOCK.STONE, BLOCK.LOG]);
  assert.equal(new Set(drops.items.map(item => item.id)).size, 3);
});

test('STEP 2: 從原地彈起、旋轉，再因重力下落', () => {
  const world = floor(), drops = new Drops();
  const item = drops.spawn({ x: 5, y: 3, z: 5, type: BLOCK.DIRT });
  assert.deepEqual(item.position, { x: 5.5, y: 3.5, z: 5.5 });
  advance(drops, world, 0.1);
  assert.ok(item.position.y > 3.5);
  assert.ok(item.rotation > 0);
  advance(drops, world, 1);
  assert.ok(item.position.y < 3.5);
});

test('STEP 2: 落地後底面貼地，等待五秒仍不穿地且持續旋轉', () => {
  const world = floor(), drops = new Drops();
  const item = drops.spawn({ x: 5, y: 4, z: 5, type: BLOCK.STONE });
  advance(drops, world, 2);
  assert.ok(Math.abs(item.position.y - DROP_SIZE / 2 - 1) < 1e-8);
  assert.equal(item.grounded, true);
  const position = { ...item.position }, rotation = item.rotation;
  advance(drops, world, 5);
  assert.deepEqual(item.position, position);
  assert.notEqual(item.rotation, rotation);
  assert.equal(drops.items.length, 1);
});

test('STEP 2: 承接面挖掉後重新下落，停到下一層', () => {
  const world = floor(), drops = new Drops();
  world.set(5, 2, 5, BLOCK.DIRT);
  const item = drops.spawn({ x: 5, y: 4, z: 5, type: BLOCK.LOG });
  advance(drops, world, 2);
  assert.ok(Math.abs(item.position.y - DROP_SIZE / 2 - 3) < 1e-8);
  world.set(5, 2, 5, BLOCK.AIR);
  advance(drops, world, 2);
  assert.ok(Math.abs(item.position.y - DROP_SIZE / 2 - 1) < 1e-8);
});

test('STEP 2: 彈起時不穿過上方方塊', () => {
  const world = floor(), drops = new Drops();
  world.set(5, 4, 5, BLOCK.STONE);
  const item = drops.spawn({ x: 5, y: 3, z: 5, type: BLOCK.DIRT });
  for (let i = 0; i < 120; i++) {
    drops.update(world, 1 / 120);
    assert.ok(item.position.y + DROP_SIZE / 2 <= 4 + 1e-8);
  }
});

test('STEP 2: 低幀率或卡頓時仍不穿過一格厚地面', () => {
  for (const dt of [1 / 30, 0.2, 1]) {
    const world = floor(), drops = new Drops();
    const item = drops.spawn({ x: 5, y: 10, z: 5, type: BLOCK.DIRT });
    for (let i = 0; i < 100; i++) drops.update(world, dt);
    assert.ok(Math.abs(item.position.y - DROP_SIZE / 2 - 1) < 1e-8);
  }
});

test('STEP 2: 掉入虛空的掉落物會清除；零時間更新不改變狀態', () => {
  const world = new World(), drops = new Drops();
  const item = drops.spawn({ x: 5, y: 3, z: 5, type: BLOCK.DIRT });
  const before = JSON.stringify(item);
  drops.update(world, 0);
  assert.equal(JSON.stringify(item), before);
  advance(drops, world, 5);
  assert.equal(drops.items.length, 0);
});
