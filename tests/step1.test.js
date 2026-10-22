import test from 'node:test';
import assert from 'node:assert/strict';
import { World, BLOCK } from '../src/world.js';
import { Player, advancePlayer } from '../src/physics.js';
import { Mining, pickBlock } from '../src/mining.js';
import { buildChunkGeometry, affectedChunkOrigins } from '../src/terrain-geometry.js';

const A = { x: 5, y: 3, z: 5 }, B = { x: 6, y: 3, z: 5 };
function setup(type = BLOCK.DIRT) {
  const world = new World();
  world.set(A.x, A.y, A.z, type);
  world.set(B.x, B.y, B.z, BLOCK.DIRT);
  return { world, mining: new Mining() };
}
const block = (world, p) => world.get(p.x, p.y, p.z);

test('STEP 1: 泥土裂痕至少兩個階段，0.75 秒才移除一格', () => {
  const { world, mining } = setup();
  mining.update(world, A, true, 0.1);
  const earlyStage = mining.stage;
  assert.ok(earlyStage >= 0);
  mining.update(world, A, true, 0.3);
  assert.ok(mining.stage > earlyStage);
  assert.equal(block(world, A), BLOCK.DIRT);
  mining.update(world, A, true, 0.34);
  assert.equal(block(world, A), BLOCK.DIRT);
  const broken = mining.update(world, A, true, 0.01);
  assert.deepEqual(broken, { ...A, type: BLOCK.DIRT });
  assert.equal(block(world, A), BLOCK.AIR);
  assert.equal(block(world, B), BLOCK.DIRT);
  assert.equal(mining.stage, -1);
});

test('STEP 1: 單擊左鍵不會挖掉方塊，放開後裂痕立即消失', () => {
  const { world, mining } = setup();
  mining.update(world, A, true, 0.05);
  mining.update(world, A, false, 0);
  assert.equal(block(world, A), BLOCK.DIRT);
  assert.equal(mining.target, null);
  assert.equal(mining.stage, -1);
});

test('STEP 1: 挖到一半放開，再挖必須重新計時', () => {
  const { world, mining } = setup();
  mining.update(world, A, true, 0.4);
  mining.update(world, A, false, 0);
  mining.update(world, A, true, 0.4);
  assert.equal(block(world, A), BLOCK.DIRT);
  assert.ok(mining.progress < 0.6);
  mining.update(world, A, true, 0.35);
  assert.equal(block(world, A), BLOCK.AIR);
});

test('STEP 1: 石頭 1.99 秒仍在，2 秒才挖掉，確實比泥土慢', () => {
  const { world, mining } = setup(BLOCK.STONE);
  mining.update(world, A, true, 1);
  assert.equal(block(world, A), BLOCK.STONE);
  mining.update(world, A, true, 0.99);
  assert.equal(block(world, A), BLOCK.STONE);
  assert.equal(mining.stage, 9);
  mining.update(world, A, true, 0.01);
  assert.equal(block(world, A), BLOCK.AIR);
});

test('STEP 1: 按住時切換 A、B，再回 A，兩者都不得沿用舊進度', () => {
  const { world, mining } = setup();
  mining.update(world, A, true, 0.4);
  mining.update(world, B, true, 0.4);
  assert.deepEqual(mining.target, { ...B, type: BLOCK.DIRT });
  assert.equal(block(world, A), BLOCK.DIRT);
  assert.equal(block(world, B), BLOCK.DIRT);
  mining.update(world, A, true, 0.4);
  assert.ok(mining.progress < 0.6);
  assert.equal(block(world, A), BLOCK.DIRT);
});

test('STEP 1: 指向天空清除裂痕；回原格須重挖，挖天空不改變世界', () => {
  const { world, mining } = setup();
  mining.update(world, A, true, 0.4);
  const beforeSky = world.blocks.slice();
  mining.update(world, null, true, 10);
  assert.equal(mining.target, null);
  assert.equal(mining.stage, -1);
  assert.deepEqual(world.blocks, beforeSky);
  mining.update(world, A, true, 0.4);
  assert.equal(block(world, A), BLOCK.DIRT);
});

test('STEP 1: 暫停、失焦或重生時取消進度，下一次不會自動挖掘', () => {
  const { world, mining } = setup();
  mining.update(world, A, true, 0.7);
  mining.reset();
  mining.update(world, A, false, 5);
  assert.equal(mining.stage, -1);
  assert.equal(block(world, A), BLOCK.DIRT);
  mining.update(world, A, true, 0.1);
  assert.ok(mining.progress < 0.2);
});

test('STEP 1: 完成只回報一次移除事件，不增加庫存或連帶移除鄰格', () => {
  const { world, mining } = setup();
  const inventory = { dirt: 0 };
  const first = mining.update(world, A, true, 0.75);
  const again = mining.update(world, A, true, 2);
  assert.deepEqual(first, { ...A, type: BLOCK.DIRT });
  assert.equal(again, null);
  assert.equal(block(world, B), BLOCK.DIRT);
  assert.deepEqual(inventory, { dirt: 0 });
});

test('STEP 1: 不同幀率下，挖掘時間相同，仍在一秒內挖完泥土', () => {
  for (const fps of [30, 60, 144]) {
    const { world, mining } = setup();
    let elapsed = 0, broken = null;
    while (!broken && elapsed < 1) {
      broken = mining.update(world, A, true, 1 / fps);
      elapsed += 1 / fps;
    }
    assert.ok(broken);
    assert.ok(elapsed >= 0.75 - 1e-8 && elapsed <= 0.75 + 1 / fps + 1e-8);
  }
});

test('STEP 1: 準心只命中最前方實心方塊，不穿透到後面', () => {
  const world = new World();
  world.set(5, 3, 5, BLOCK.DIRT);
  world.set(5, 3, 3, BLOCK.STONE);
  const origin = { x: 5.5, y: 3.5, z: 8.5 }, direction = { x: 0, y: 0, z: -1 };
  const front = pickBlock(world, origin, direction, 5);
  assert.equal(front.z, 5);
  assert.equal(front.type, BLOCK.DIRT);
  assert.ok(Math.abs(front.distance - 2.5) < 1e-8);
  assert.deepEqual(front.normal, { x: 0, y: 0, z: 1 });
  world.set(5, 3, 5, BLOCK.AIR);
  assert.equal(pickBlock(world, origin, direction, 5).type, BLOCK.STONE);
});

test('STEP 1: 天空與範圍外沒有挖掘目標；貼著格線向下仍命中地面', () => {
  const world = new World();
  world.set(5, 2, 5, BLOCK.GRASS);
  const origin = { x: 5.5, y: 3, z: 5.5 };
  assert.equal(pickBlock(world, origin, { x: 0, y: 1, z: 0 }, 5), null);
  assert.equal(pickBlock(world, { ...origin, y: 12 }, { x: 0, y: -1, z: 0 }, 5), null);
  assert.equal(pickBlock(world, origin, { x: 0, y: 0, z: 0 }, 5), null);
  const below = pickBlock(world, origin, { x: 0, y: -1, z: 0 }, 5);
  assert.equal(below.y, 2);
  assert.equal(below.distance, 0);
});

test('STEP 1: 挖掉腳下與前方格子後，碰撞立即採用變更後的世界', () => {
  const world = new World(), mining = new Mining();
  world.set(5, 2, 5, BLOCK.DIRT);
  world.set(5, 0, 5, BLOCK.STONE);
  const player = new Player({ x: 5.5, y: 3, z: 5.5 });
  mining.update(world, { x: 5, y: 2, z: 5 }, true, 0.75);
  for (let i = 0; i < 120; i++) advancePlayer(player, world, { forward: 0, right: 0, jump: false }, 1 / 60);
  assert.equal(player.position.y, 1);
  assert.equal(player.grounded, true);
  assert.equal(player.collides(world), false);
  world.set(6, 1, 5, BLOCK.DIRT);
  mining.update(world, { x: 6, y: 1, z: 5 }, true, 0.75);
  for (let i = 0; i < 10; i++) advancePlayer(player, world, { forward: 0, right: 1, jump: false }, 1 / 60);
  assert.ok(player.position.x > 6);
});

test('STEP 1: 分區交界挖掉方塊後，另一側新露出的面也會重建', () => {
  const world = new World(), mining = new Mining();
  world.set(7, 3, 5, BLOCK.DIRT);
  world.set(8, 3, 5, BLOCK.STONE);
  const faces = data => data.indices.length / 6;
  assert.equal(faces(buildChunkGeometry(world, 0, 0)), 5);
  assert.equal(faces(buildChunkGeometry(world, 8, 0)), 5);
  mining.update(world, { x: 7, y: 3, z: 5 }, true, 0.75);
  assert.equal(faces(buildChunkGeometry(world, 0, 0)), 0);
  assert.equal(faces(buildChunkGeometry(world, 8, 0)), 6);
  const affected = affectedChunkOrigins(7, 5).map(({ x, z }) => `${x},${z}`);
  assert.ok(affected.includes('0,0') && affected.includes('8,0'));
  assert.ok(affected.every(key => !key.startsWith('-')));
});
