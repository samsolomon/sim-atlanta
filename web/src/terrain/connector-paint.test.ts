import { ribbons, stripePoint } from './connector-corridor';
import { expect, it } from 'vitest';
import type { P2 } from '../vignette/geom';
import { connectorLanes, connectorPoint } from './connector-lanes';
import { inConnectorLanes, paintConnector } from './connector-paint';

const city = { name: 'downtown', roads: [], buildings: [], rail: [],
  bounds: { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 } };

function recording() {
  const strokes: { points: P2[]; dash: number[]; width: number }[] = [];
  const fills: P2[][] = [], stops: [number, string][][] = [];
  let points: P2[] = [], dash: number[] = [];
  const ctx = {
    lineWidth: 0, save() {}, restore() {}, closePath() {}, clip() {},
    beginPath() { points = []; }, moveTo(x: number, z: number) { points.push([x,z]); },
    lineTo(x: number, z: number) { points.push([x,z]); },
    setLineDash(value: number[]) { dash = value; },
    stroke() { strokes.push({ points, dash, width: this.lineWidth }); }, fill() { fills.push(points); },
    createLinearGradient() {
      const colors: [number, string][] = [];
      stops.push(colors);
      return { addColorStop(at: number, color: string) { colors.push([at, color]); } };
    },
  };
  return { ctx: ctx as unknown as CanvasRenderingContext2D, strokes, fills, stops };
}

it.each([.48828125, .9765625])('paints every shared boundary at both sections at %s m per texel', texel => {
  const { ctx, strokes } = recording();
  paintConnector(ctx, city, texel);
  for (const dir of ['southbound', 'northbound'] as const) {
    const a = connectorLanes(dir, -76)!, b = connectorLanes(dir, 77)!;
    for (let i = 0; i < a.edges.length; i++) {
      const stroke = strokes.find(s => s.points.length === 2 &&
        s.points.every((p,k) => Math.hypot(p[0]-[a,b][k].edges[i][0],p[1]-[a,b][k].edges[i][1]) < 1e-8));
      expect(stroke).toBeDefined();
      expect(stroke!.width).toBeGreaterThanOrEqual(texel * .65);
      expect(stroke!.dash.length === 0).toBe(i === 0 || i === 7);
    }
  }
});

it('keeps the S1062 feeder and I-20 gore free of travel lanes', () => {
  expect(inConnectorLanes(497,690)).toBe(true);
  expect(inConnectorLanes(503.15,699.65)).toBe(false);
  expect(inConnectorLanes(475.5,657.55)).toBe(false);
  expect(inConnectorLanes(472.2,652.5)).toBe(true);
});

it('skips East Portal and legacy unnamed scenes before accessing the canvas', () => {
  const { ctx, strokes, fills, stops } = recording();
  for (const name of ['east-portal', undefined]) paintConnector(ctx, { ...city, name } as typeof city, 1);
  expect([strokes, fills, stops]).toEqual([[], [], []]);
});

it('clears the old shoulder posts from both carriageways and retains the median', () => {
  expect(inConnectorLanes(750.4, 555.9)).toBe(true);
  expect(inConnectorLanes(797, 501.3)).toBe(true);
  expect(inConnectorLanes(...connectorPoint(-76, -13.2))).toBe(false);
  expect(inConnectorLanes(...connectorPoint(0, -8))).toBe(false);
  expect(inConnectorLanes(...connectorPoint(0, -8), 1.8)).toBe(true);
  expect(inConnectorLanes(0, 0)).toBe(false);
});

it('paints all eight edges of the seven-lane Midtown approach from its stationed sections', () => {
  const approach = ribbons.find(r => r.id === 337901411)!;
  const tile = { ...city, name: 'midtown-south', bounds: { minX: -1000, maxX: 1800, minZ: -2500, maxZ: -1700 } };
  const { ctx, strokes } = recording();
  paintConnector(ctx, tile, 1);
  for (let edge = 1; edge < 7; edge++) {
    const points = approach.rows.map(row => stripePoint(row, edge / 7));
    expect(strokes.some(stroke => stroke.points.length === points.length &&
      stroke.points.every(([x,z], i) => x === points[i][0] && z === points[i][1]))).toBe(true);
  }
  // The two edges may be split where a merge or diverge shares them (one surface owner):
  // every row is still painted unless a sibling owns that edge there.
  for (const [edge, side] of [[0, 'inner'], [7, 'outer']] as const) {
    const painted = new Set(strokes.flatMap(stroke => stroke.points.map(([x, z]) => `${x},${z}`)));
    approach.rows.forEach((row, i) => {
      const own = row.joined?.[side] !== 'none' || approach.rows[i + 1]?.joined?.[side] !== 'none';
      if (own) expect(painted.has(stripePoint(row, edge / 7).join(','))).toBe(true);
    });
  }
});

it('draws a merge or diverge edge once: dashed by its owner, not by the other branch', () => {
  const { ctx, strokes } = recording();
  paintConnector(ctx, { ...city, name: 'midtown-south', bounds: { minX: -1000, maxX: 1800, minZ: -2500, maxZ: -1700 } } as typeof city, 1);
  const shared = ribbons.filter(r => r.rows.some(row => row.joined?.inner === 'dash' || row.joined?.outer === 'dash'));
  expect(shared.length).toBeGreaterThan(0);
  const dashed = strokes.filter(s => s.dash.length);
  for (const r of shared) for (const side of ['inner', 'outer'] as const) {
    const rows = r.rows.filter(row => row.joined?.[side] === 'dash' && row.inner[1] < -1700 && row.inner[1] > -2500);
    for (const row of rows) {
      const p = stripePoint(row, side === 'inner' ? 0 : 1);
      expect(dashed.some(s => s.points.some(q => q[0] === p[0] && q[1] === p[1]))).toBe(true);
    }
  }
});
