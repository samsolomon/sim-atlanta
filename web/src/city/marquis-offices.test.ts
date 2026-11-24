import { describe, expect, it } from 'vitest';
import type { P2 } from '../vignette/geom';
import { vLines, wallRuns } from './marquis-offices';

// Marquis Two's mapped ring in its street frame; the north wall is split at the skybridge nodes.
const two: P2[] = [
  [27.23, -4.69], [27.23, -15.2], [4.37, -15.21], [1.19, -15.2], [-26.8, -15.21], [-26.79, -5.08],
  [-28.11, -5.06], [-28.11, 3.87], [-26.62, 3.86], [-26.62, 16.16], [-7.08, 16.16], [27.31, 16.16],
  [27.31, 4.17], [28.73, 4.17], [28.72, -4.7],
];

describe('wallRuns', () => {
  it('lays each long wall out as one run across mapping nodes', () => {
    const runs = wallRuns(two);
    expect(runs).toHaveLength(12);
    const long = runs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])).filter((l) => l > 40);
    expect(long.map(Math.round).sort()).toEqual([54, 54]);
  });
});

describe('vLines', () => {
  it('starts three Vs at single apexes and spreads them to meet at the crown', () => {
    expect([...vLines(35, 0)].sort((a, b) => a - b)).toEqual([6, 18, 29]);
    expect([...vLines(35, 12)].sort((a, b) => a - b)).toEqual([3, 9, 15, 21, 26, 32]);
    expect([...vLines(35, 25)].sort((a, b) => a - b)).toEqual([12, 23]);
  });

  it('never asks for overlapping double panes', () => {
    for (let floor = 0; floor < 26; floor++) {
      const lines = vLines(35, floor);
      for (const line of lines) expect(lines.has(line + 1)).toBe(false);
    }
  });
});
