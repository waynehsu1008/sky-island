import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOCK, createIsland } from '../src/world.js';
import { Mining } from '../src/mining.js';
import { Player, advancePlayer, respawnPlayer } from '../src/physics.js';

function setup() {
  const { world, spawn } = createIsland();
  const floor = { x: Math.floor(spawn.x), y: Math.floor(spawn.y) - 1, z: Math.floor(spawn.z) };
  return { world, spawn, floor, mining: new Mining() };
}

test('出生點保護：只有正下方一格受保護，長按也沒有裂痕或挖除事件', () => {
  const { world, floor, mining } = setup();
  const before = world.get(floor.x, floor.y, floor.z);
  assert.equal(world.isProtected(floor.x, floor.y, floor.z), true);
  assert.equal(mining.update(world, floor, true, 10), null);
  assert.equal(world.get(floor.x, floor.y, floor.z), before);
  assert.equal(mining.stage, -1);
  assert.equal(mining.target, null);
  assert.equal(world.isProtected(floor.x + 1, floor.y, floor.z), false);
});

test('出生點保護：世界寫入也不允許刪除或替換受保護方塊', () => {
  const { world, floor } = setup();
  const before = world.get(floor.x, floor.y, floor.z);
  assert.equal(world.set(floor.x, floor.y, floor.z, BLOCK.AIR), false);
  assert.equal(world.set(floor.x, floor.y, floor.z, BLOCK.STONE), false);
  assert.equal(world.get(floor.x, floor.y, floor.z), before);
});

test('出生點保護：旁邊與下層仍能正常挖掘，沒有擴大保護範圍', () => {
  const { world, floor, mining } = setup();
  for (const target of [{ ...floor, x: floor.x + 1 }, { ...floor, y: floor.y - 1 }]) {
    assert.ok(world.get(target.x, target.y, target.z));
    assert.ok(mining.update(world, target, true, 0.75));
    assert.equal(world.get(target.x, target.y, target.z), BLOCK.AIR);
  }
});

test('出生點保護：周圍與下層被挖後，回出生點仍能站立並保留世界變更', () => {
  const { world, spawn, floor, mining } = setup();
  const next = { ...floor, x: floor.x + 1 };
  mining.update(world, next, true, 0.75);
  mining.update(world, { ...floor, y: floor.y - 1 }, true, 0.75);
  const player = new Player(spawn);
  player.position.y = -20;
  respawnPlayer(player);
  for (let i = 0; i < 300; i++) advancePlayer(player, world, { forward: 0, right: 0, jump: false }, 1 / 60);
  assert.equal(player.position.y, spawn.y);
  assert.equal(player.grounded, true);
  assert.equal(player.respawnCount, 1);
  assert.equal(world.get(next.x, next.y, next.z), BLOCK.AIR);
});
