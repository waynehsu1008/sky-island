import test from 'node:test';
import assert from 'node:assert/strict';
import { HandMotion } from '../src/hand-motion.js';

test('手部：挖掘時循環揮動，放開後回到自然姿勢', () => {
  const hand = new HandMotion();
  const first = hand.update(0.05, { active: true, mining: true });
  const second = hand.update(0.05, { active: true, mining: true });
  assert.equal(second.visible, true);
  assert.equal(second.action, 'mining');
  assert.notEqual(first.rx, second.rx);
  const idle = hand.update(0.05, { active: true });
  assert.equal(idle.action, 'idle');
  assert.equal(idle.rx, 0);
});

test('手部：放置短暫伸出，完成後恢復；暫停隱藏並清除動作', () => {
  const hand = new HandMotion();
  hand.place();
  assert.equal(hand.update(0.05, { active: true }).action, 'placing');
  for (let i = 0; i < 10; i++) hand.update(0.05, { active: true });
  assert.equal(hand.update(0.05, { active: true }).action, 'idle');
  hand.place();
  assert.equal(hand.update(0.05, { active: false }).visible, false);
  assert.equal(hand.update(0.05, { active: true }).action, 'idle');
});

test('手部：走路時輕微擺動，動作不受長時間卡頓影響而失控', () => {
  const hand = new HandMotion();
  for (let i = 0; i < 100; i++) {
    const pose = hand.update(1, { active: true, mining: true, walking: true });
    assert.ok(Object.values(pose).filter(v => typeof v === 'number').every(Number.isFinite));
    assert.ok(Math.abs(pose.x) < 0.2 && Math.abs(pose.y) < 0.15 && Math.abs(pose.rx) <= 0.9);
  }
});
