import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

// The downtown batcher probes each landmark's night switch, so it needs the landmark objects, not
// just their groups. A landmark City mounts but leaves off this list still draws, only unbatched.
it('lists every mounted downtown landmark for batching', () => {
  const src = readFileSync(new URL('./city.ts', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('const landmarksFrom'), src.indexOf('const landmarks = world.group.children'));
  const mounted = [...block.matchAll(/if \((\w+)\) world\.group\.add\(\1\.group\)/g)].map(m => m[1]);
  const start = src.indexOf('const listed = ([');
  const listed = src.slice(start, src.indexOf('] as (LandmarkEntry', start)).match(/\b\w+\b/g)!;
  expect(mounted.length).toBeGreaterThan(40);
  expect(mounted.filter(n => !listed.includes(n))).toEqual([]);
});
