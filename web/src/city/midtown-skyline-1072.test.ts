import { expect, it } from 'vitest';
import { westPeachtree1072 } from './midtown-skyline-1072';

it('keeps the back of every balcony slot a dark recess with rail lines, with no glazing or lit panes', () => {
  const quads: { lit: boolean; points: number[][]; color: string }[] = [];
  const record = (lit: boolean) => ({ quad: (a: number[], b: number[], c: number[], d: number[], color: string) => quads.push({ lit, points: [a, b, c, d], color }) });
  westPeachtree1072({ base: 0, body: record(false), lights: record(true), prism() {}, finish: () => null } as unknown as Parameters<typeof westPeachtree1072>[0]);
  // The east face's slot: its back wall is 1.5 m in from x = 23.8, between z = -15.5 and -11.
  const onBack = quads.filter(q => q.points.every(([x, y, z]) => Math.abs(x - 22.3) < .2 && z > -15.6 && z < -10.9 && y >= 72));
  expect(onBack.length).toBeGreaterThan(30); // the recess and a rail at each floor
  expect(onBack.filter(q => q.lit)).toHaveLength(0);
  expect([...new Set(onBack.map(q => q.color))].sort()).toEqual(['#2c3640', '#d6e0e7']);
});
