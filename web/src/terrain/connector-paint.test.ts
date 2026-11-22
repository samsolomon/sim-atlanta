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
  const { ctx, strokes, stops } = recording();
  paintConnector(ctx, city, texel);
  expect(strokes).toHaveLength(16);
  for (const [d, dir] of (['southbound', 'northbound'] as const).entries()) {
    const a = connectorLanes(dir, -76)!, b = connectorLanes(dir, 77)!;
    for (let i = 0; i < a.edges.length; i++) {
      const stroke = strokes[8*d + i];
      expect(stroke.points.slice(1, 3)).toEqual([a.edges[i], b.edges[i]]);
      expect(stroke.width).toBeGreaterThanOrEqual(texel * .65);
      expect(stroke.dash.length === 0).toBe(i === 0 || i === 7);
    }
  }
  for (const colors of stops) {
    expect(colors.map(([at]) => at)).toEqual([0, 60/273, 213/273, 1]);
    expect(colors[0][1].endsWith('00') && colors[3][1].endsWith('00')).toBe(true);
  }
});

it('joins the two NB feeder lanes onto their separate road at the south end of the blend', () => {
  const { ctx, fills } = recording();
  paintConnector(ctx, city, 1);
  const lower = connectorLanes('northbound', -76)!.edges;
  const main = fills.find(r => r[0][0] === connectorPoint(-136, -18.6)[0] && r[1][0] === lower[0][0]);
  expect(main).toContainEqual(connectorPoint(-136, -4.3));
  const feeder = fills.find(r => r[0][0] === connectorPoint(-136,-3.2)[0]);
  expect(feeder).toContainEqual(lower[5]);
  expect(feeder).toContainEqual(lower[7]);
  expect(feeder).toContainEqual(connectorPoint(-136, 3.4));
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
