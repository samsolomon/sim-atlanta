import { describe, expect, it } from 'vitest';
import { treeProbe } from './rollout-city';

describe('rollout diagnostic isolation', () => {
  it.each(['mask-off', 'shadow-off', 'foliage-off', 'carpet-off'])('gates %s behind active perf and low quality', probe => {
    expect(treeProbe(`?perf=run&treeprobe=${probe}`, 'low')).toBe(probe);
    expect(treeProbe(`?treeprobe=${probe}`, 'low')).toBeNull();
    expect(treeProbe(`?perf=off&treeprobe=${probe}`, 'low')).toBeNull();
    expect(treeProbe(`?perf=0&treeprobe=${probe}`, 'low')).toBeNull();
    expect(treeProbe(`?perf=run&treeprobe=${probe}`, 'high')).toBeNull();
  });
  it('keeps control and unknown probe values unchanged', () => {
    expect(treeProbe('?perf=run', 'low')).toBeNull();
    expect(treeProbe('?perf=run&treeprobe=typo', 'low')).toBeNull();
  });
});
