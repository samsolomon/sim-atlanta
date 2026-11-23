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
    lineWidth: 0, save() {}, restore() {}, closePath() {},
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
  for (let edge = 0; edge <= 7; edge++) {
    const points = approach.rows.map(row => stripePoint(row, edge / 7));
    expect(strokes.some(stroke => stroke.points.length === points.length &&
      stroke.points.every(([x,z], i) => x === points[i][0] && z === points[i][1]))).toBe(true);
  }
});
