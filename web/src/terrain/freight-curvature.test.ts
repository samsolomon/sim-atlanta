import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// With generated data (pnpm data): the drawn freight centreline is smoothed by
// pipeline/scripts/terrain_transport.py so long cars don't swing off the rails at source vertices.
const file = resolve(__dirname, '../../public/data/scene/downtown/vignette.json');
type Run = { cls: string; kind: string; pts: number[][]; freightS?: [number, number] };

describe.skipIf(!existsSync(file))('downtown freight centreline curvature', () => {
  it('keeps a 140 m radius over 12 m chords away from junctions and board edges', () => {
    const rail = (JSON.parse(readFileSync(file, 'utf8')) as { terrainTransport: { rail: Run[] } }).terrainTransport.rail;
    const key = (p: number[]) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
    let checked = 0;
    for (const [i, run] of rail.entries()) {
      if (!run.freightS) continue;
      // Pinned: every run's ends, and any vertex another run shares (a switch or junction).
      const others = new Set(rail.flatMap((r, j) => (j === i ? [] : r.pts.map(key))));
      const pins = run.pts.filter((p, k) => k === 0 || k === run.pts.length - 1 || others.has(key(p)));
      const p = run.pts, s = [0];
      for (let k = 1; k < p.length; k++) s.push(s[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]));
      const at = (x: number) => {
        let k = 0;
        while (k < s.length - 2 && s[k + 1] < x) k++;
        const f = s[k + 1] > s[k] ? (x - s[k]) / (s[k + 1] - s[k]) : 0;
        return [p[k][0] + (p[k + 1][0] - p[k][0]) * f, p[k][1] + (p[k + 1][1] - p[k][1]) * f];
      };
      for (let x = 6; x < s.at(-1)! - 6; x += 1) {
        const [a, b, c] = [at(x - 6), at(x), at(x + 6)];
        if (pins.some(q => Math.hypot(q[0] - b[0], q[1] - b[1]) < 12)) continue;
        const turn = Math.abs(((Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(b[1] - a[1], b[0] - a[0]) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
        if (turn > 1e-6) expect(6 / turn, `run ${i} at ${b.map(v => v.toFixed(0))}`).toBeGreaterThanOrEqual(140);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(1000);
  });
});
