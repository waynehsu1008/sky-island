import test from 'node:test';
import assert from 'node:assert/strict';
import { DayCycle, DAY_SECONDS } from '../src/day-cycle.js';

test('計時：從第 1 天開始，滿 300 秒進入第 2 天，和晝夜循環一致', () => {
  const cycle = new DayCycle();
  assert.equal(DAY_SECONDS, 300);
  assert.deepEqual(cycle.clock(), { day: 1, totalSeconds: 0, daySeconds: 0, text: '00:00' });
  cycle.update(299.99);
  assert.deepEqual(cycle.clock(), { day: 1, totalSeconds: 299, daySeconds: 299, text: '04:59' });
  cycle.update(0.01);
  assert.deepEqual(cycle.clock(), { day: 2, totalSeconds: 300, daySeconds: 0, text: '05:00' });
  assert.equal(cycle.sample().phase, 0);
  cycle.update(300);
  assert.equal(cycle.clock().day, 3);
});

test('計時：暫停不累積，恢復接續，無效時間不改變結果', () => {
  const cycle = new DayCycle();
  cycle.update(59);
  const before = cycle.clock();
  cycle.update(400, false);
  for (const invalid of [NaN, Infinity, -1, 0]) cycle.update(invalid);
  assert.deepEqual(cycle.clock(), before);
  cycle.update(1, true);
  assert.equal(cycle.clock().text, '01:00');
});

test('計時：超過一小時顯示時分秒，天數繼續增加', () => {
  const cycle = new DayCycle();
  cycle.update(3661);
  assert.deepEqual(cycle.clock(), { day: 13, totalSeconds: 3661, daySeconds: 61, text: '01:01:01' });
});
