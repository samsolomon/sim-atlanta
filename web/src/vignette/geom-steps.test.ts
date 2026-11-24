import { expect, test } from 'vitest';
import { runEveryStep, runSync } from '../core/slice';
import { Builder } from './geom';

function sample() {
  const b = new Builder();
  let s = 7;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647 * 200 - 100;
  for (let i = 0; i < 6000; i++) b.tri([r(), r(), r()], [r(), r(), r()], [r(), r(), r()], i % 3 ? '#a05030' : 0x40a0c0);
  // A degenerate triangle: three's normalize leaves it 0, 0, 0.
  b.tri([1, 1, 1], [1, 1, 1], [1, 1, 1], '#fff');
  return b;
}

test('geometrySteps gives geometry() byte for byte, whether run at once or a step at a time', async () => {
  const want = sample().geometry();
  for (const g of [runSync(sample().geometrySteps()), await runEveryStep(sample().geometrySteps())]) {
    for (const k of ['position', 'color', 'normal']) expect(Array.from(g.getAttribute(k).array)).toEqual(Array.from(want.getAttribute(k).array));
  }
  let steps = 0;
  const it = sample().geometrySteps();
  while (!it.next().done) steps++;
  expect(steps).toBeGreaterThan(5);
});
