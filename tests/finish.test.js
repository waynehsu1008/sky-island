import test from 'node:test';
import assert from 'node:assert/strict';
import { World, BLOCK } from '../src/world.js';
import { Player, respawnPlayer } from '../src/physics.js';
import { Drops } from '../src/drops.js';
import { Mining } from '../src/mining.js';
import { Inventory, collectDrops, placeBlock } from '../src/inventory.js';
import { DayCycle } from '../src/day-cycle.js';

function fixture() {
  const world = new World(), inventory = new Inventory(), drops = new Drops();
  for (let x = 0; x < 10; x++) for (let z = 0; z < 10; z++) world.set(x, 0, z, BLOCK.STONE);
  return { world, inventory, drops, player: new Player({ x: 5.5, y: 1, z: 5.5 }) };
}
function collect(state, seconds = 1) {
  for (let i = 0; i < seconds * 60; i++) {
    state.drops.update(state.world, 1 / 60);
    collectDrops(state.drops, state.player, state.inventory, 1 / 60);
  }
}

test('STEP 3：三格外不拾取，靠近後飛向角色並只加一次', () => {
  const s = fixture();
  s.drops.spawn({ x: 5, y: 1, z: 5, type: BLOCK.DIRT });
  s.player.position.x = 8.5;
  collect(s, 2);
  assert.equal(s.inventory.count(BLOCK.DIRT), 0);
  assert.equal(s.drops.items.length, 1);
  s.player.position.x = 6;
  collect(s, 0.3);
  assert.equal(s.drops.items[0].collecting, true);
  collect(s, 1);
  assert.equal(s.inventory.count(BLOCK.DIRT), 1);
  assert.equal(s.drops.items.length, 0);
  collect(s, 5);
  assert.equal(s.inventory.count(BLOCK.DIRT), 1);
});

test('STEP 3：同種類累加，不同種類分別計數', () => {
  const s = fixture();
  s.inventory.add(BLOCK.DIRT);
  for (const type of [BLOCK.DIRT, BLOCK.DIRT, BLOCK.STONE]) s.drops.spawn({ x: 5, y: 1, z: 5, type });
  collect(s);
  assert.equal(s.inventory.count(BLOCK.DIRT), 3);
  assert.equal(s.inventory.count(BLOCK.STONE), 1);
});

test('STEP 4：上面、側面成功放一格才扣一個，數量不會負數', () => {
  const s = fixture();
  s.inventory.select(BLOCK.DIRT);
  s.inventory.add(BLOCK.DIRT); s.inventory.add(BLOCK.DIRT);
  const top = { x: 2, y: 0, z: 2, normal: { x: 0, y: 1, z: 0 } };
  assert.deepEqual(placeBlock(s.world, s.player, s.inventory, top), { x: 2, y: 1, z: 2 });
  assert.equal(s.world.get(2, 1, 2), BLOCK.DIRT);
  assert.ok(placeBlock(s.world, s.player, s.inventory, { x: 2, y: 1, z: 2, normal: { x: 1, y: 0, z: 0 } }));
  assert.equal(s.inventory.count(BLOCK.DIRT), 0);
  assert.equal(placeBlock(s.world, s.player, s.inventory, top), null);
  assert.equal(s.inventory.count(BLOCK.DIRT), 0);
});

test('STEP 4：天空、占用、世界外與角色空間放置失敗不扣數量', () => {
  const s = fixture();
  s.inventory.select(BLOCK.DIRT); s.inventory.add(BLOCK.DIRT);
  for (const hit of [null,
    { x: 2, y: 0, z: 2, normal: { x: 1, y: 0, z: 0 } },
    { x: 0, y: 0, z: 0, normal: { x: -1, y: 0, z: 0 } },
    { x: 5, y: 0, z: 5, normal: { x: 0, y: 1, z: 0 } }]) {
    assert.equal(placeBlock(s.world, s.player, s.inventory, hit), null);
    assert.equal(s.inventory.count(BLOCK.DIRT), 1);
  }
});

test('STEP 4：整串挖、掉、撿、放後數量回原值且沒有殘留掉落物', () => {
  const s = fixture(), mining = new Mining();
  s.world.set(5, 1, 4, BLOCK.DIRT);
  s.inventory.select(BLOCK.DIRT);
  s.inventory.add(BLOCK.DIRT);
  s.drops.spawn(mining.update(s.world, { x: 5, y: 1, z: 4 }, true, 0.75));
  assert.equal(s.inventory.count(BLOCK.DIRT), 1);
  collect(s, 2);
  assert.equal(s.inventory.count(BLOCK.DIRT), 2);
  assert.ok(placeBlock(s.world, s.player, s.inventory, { x: 5, y: 0, z: 4, normal: { x: 0, y: 1, z: 0 } }));
  assert.equal(s.inventory.count(BLOCK.DIRT), 1);
  assert.equal(s.drops.items.length, 0);
});

test('STEP 4：重生保留已放方塊、庫存與挖掘變更', () => {
  const s = fixture();
  s.inventory.select(BLOCK.DIRT); s.inventory.add(BLOCK.DIRT); s.inventory.add(BLOCK.DIRT);
  placeBlock(s.world, s.player, s.inventory, { x: 2, y: 0, z: 2, normal: { x: 0, y: 1, z: 0 } });
  s.world.set(3, 0, 3, BLOCK.AIR);
  respawnPlayer(s.player);
  assert.equal(s.world.get(2, 1, 2), BLOCK.DIRT);
  assert.equal(s.world.get(3, 0, 3), BLOCK.AIR);
  assert.equal(s.inventory.count(BLOCK.DIRT), 1);
});

test('STEP 5：300 秒一整天，兩個循環持續運作，暫停不推進', () => {
  const cycle = new DayCycle(), noon = cycle.sample();
  cycle.update(150);
  assert.equal(cycle.sample().label, '夜晚');
  cycle.update(150);
  assert.deepEqual(cycle.sample(), noon);
  cycle.update(300);
  assert.deepEqual(cycle.sample(), noon);
  const elapsed = cycle.elapsed;
  cycle.update(20, false);
  assert.equal(cycle.elapsed, elapsed);
});

test('STEP 5：日夜亮度連續，最暗時仍有基本照明', () => {
  const cycle = new DayCycle();
  for (let t = 0; t < 600; t++) {
    const a = cycle.sample(t), b = cycle.sample(t + 0.01);
    assert.ok(a.ambient >= 0.9 && a.sun >= 0.15);
    assert.ok(Math.abs(a.ambient - b.ambient) < 0.001);
    assert.ok(a.sky.every((v, i) => Math.abs(v - b.sky[i]) < 0.001));
  }
});
