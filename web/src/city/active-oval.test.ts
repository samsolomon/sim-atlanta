import { expect, test } from 'vitest';
import details from '../../../pipeline/prototypes/piedmont-edge/details.json';
import type { P2 } from '../vignette/geom';
import { activeOval, diamond, paintActiveOval, rectangle } from './active-oval';

const board = { minX: -1000, maxX: 1800, minZ: -4100, maxZ: -3300 };
const flat = () => 290;

test('reads each softball field from its mapped outline: square foul lines meeting by the hub', () => {
  const hub = details.oval.hub.at as P2;
  for (const f of details.oval.softball) {
    const { home, first, third, mid } = diamond(f.ring as P2[]);
    // Foul lines are 90° apart within a few degrees, and the fair side points away from the hub.
    expect(Math.abs(first[0] * third[0] + first[1] * third[1])).toBeLessThan(.08);
    expect(Math.hypot(home[0] - hub[0], home[1] - hub[1])).toBeLessThan(25);
    expect(mid[0] * (home[0] - hub[0]) + mid[1] * (home[1] - hub[1])).toBeGreaterThan(0);
  }
});

test('reads the soccer pitches as full-size rectangles', () => {
  for (const f of details.oval.soccer) {
    const { hl, hw } = rectangle(f.ring as P2[]);
    expect(hl * 2).toBeGreaterThan(100); expect(hl * 2).toBeLessThan(112);
    expect(hw * 2).toBeGreaterThan(60); expect(hw * 2).toBeLessThan(70);
  }
});

test('stands hardware on the high tier only, within budget, and only on its own board', () => {
  expect(activeOval(board, flat, 'low')).toBeNull();
  expect(activeOval({ ...board, minZ: -3300, maxZ: -2500 }, flat, 'high')).toBeNull();
  const oval = activeOval(board, flat, 'high')!;
  // Two domed backstops, four goals, two nets and two retaining walls: two draws.
  expect(oval.group.children).toHaveLength(2);
  expect(oval.triangles).toBeGreaterThan(400);
  expect(oval.triangles).toBeLessThan(3000);
  oval.dispose();
});

test('paints nothing on a board without the oval', () => {
  const calls: string[] = [];
  const ctx = new Proxy({}, { get: (_, k) => typeof k === 'string' && k !== 'then' ? (...a: unknown[]) => { calls.push(k); return a; } : undefined });
  paintActiveOval(ctx as unknown as CanvasRenderingContext2D, { ...board, minZ: -3300, maxZ: -2500 });
  expect(calls).toHaveLength(0);
  paintActiveOval(ctx as unknown as CanvasRenderingContext2D, board);
  expect(calls).toContain('arc');
});
