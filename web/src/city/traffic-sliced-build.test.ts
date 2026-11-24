import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { runEveryStep, runSync } from '../core/slice';
import { connectorTrafficRouteSteps, connectorTrafficRoutes } from './connector-traffic-routes';
import { ConnectorTraffic, connectorTrafficSteps } from './connector-traffic';
import { MidtownArterialTraffic, midtownArterialSteps } from './midtown-arterial-traffic';
import type { RoadTraffic } from './road-traffic';
import type { TerrainCity } from '../terrain/transport-data';

const scene = resolve(__dirname, '../../public/data/scene/downtown');
const rows = resolve(__dirname, '../../../pipeline/prototypes/square-board');
const staged = existsSync(resolve(scene, 'vignette.json')) && existsSync(resolve(scene, 'traffic.json'));
const J = (f: string) => JSON.parse(readFileSync(f, 'utf8'));
const midtownRows = ['midtown-south', 'midtown-central', 'midtown-upper', 'brookwood-south', 'brookwood-station'];

/** Every drawn car, rounded, in a stable order, plus each signal head's colour. */
function snapshot(layer: RoadTraffic) {
  const out: string[] = [];
  layer.group.traverse(o => {
    if (!(o instanceof THREE.InstancedMesh)) return;
    for (let i = 0; i < o.count; i++) {
      const m = [...o.instanceMatrix.array.slice(i * 16, i * 16 + 16)].map(v => v.toFixed(4)).join(',');
      const c = o.instanceColor ? [...o.instanceColor.array.slice(i * 3, i * 3 + 3)].map(v => v.toFixed(4)).join(',') : '';
      out.push(`${o.name}|${m}|${c}`);
    }
  });
  return out.sort();
}

describe.skipIf(!staged)('traffic layers built in steps', { timeout: 60_000 }, () => {
  const vd: TerrainCity = staged ? J(resolve(scene, 'vignette.json')) : null!;
  const hourly = staged ? J(resolve(scene, 'traffic.json')).hourly : null!;
  const boards = midtownRows.filter(r => existsSync(resolve(rows, r, 'context.json'))).map(row => ({
    row, city: J(resolve(rows, row, 'context.json')) as TerrainCity, roadHeight: (x: number, z: number) => .01 * x - .02 * z }));
  const neighbors = boards.map(b => ({ city: b.city, roadHeight: b.roadHeight }));
  const options = { city: vd, hourly, quality: 'high' as const, roadHeight: (x: number, z: number) => .01 * x - .02 * z };
  const clock = Date.parse('2026-11-20T17:05:00-05:00');

  it('gives the same Connector routes run step by step as run at once, over several mounted sets', async () => {
    for (let n = 0; n <= neighbors.length; n++) {
      const cities = neighbors.slice(0, n).map(b => b.city);
      const stepped = await runEveryStep(connectorTrafficRouteSteps(vd, cities));
      expect(stepped.map(l => [l.line.pts, l.share, l.lane, l.direction])).toEqual(connectorTrafficRoutes(vd, cities).map(l => [l.line.pts, l.share, l.lane, l.direction]));
    }
  });

  it('builds identical Connector and Midtown layers whether stepped or synchronous', async () => {
    for (const make of [
      () => [runSync(connectorTrafficSteps({ ...options, neighbors })), new ConnectorTraffic({ ...options, neighbors })],
      () => [runSync(midtownArterialSteps({ hourly, quality: 'high' }, boards)), new MidtownArterialTraffic({ hourly, quality: 'high' }, boards)],
    ]) {
      const [a, b] = make() as RoadTraffic[];
      const stepped = await runEveryStep(a instanceof ConnectorTraffic ? connectorTrafficSteps({ ...options, neighbors }) : midtownArterialSteps({ hourly, quality: 'high' }, boards));
      for (const layer of [a, b, stepped]) layer.update(clock, .2);
      expect(snapshot(a).length).toBeGreaterThan(5);
      expect(snapshot(stepped)).toEqual(snapshot(b));
      expect(snapshot(a)).toEqual(snapshot(b));
      for (const layer of [a, b, stepped]) layer.dispose();
    }
  });

  it('allocates nothing for the GPU when a build is abandoned before its final step, 20 times over', () => {
    const clone = vi.spyOn(THREE.BufferGeometry.prototype, 'clone');
    const dispose = vi.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    let steps = 0;
    for (let cycle = 0; cycle < 20; cycle++) {
      for (const build of [connectorTrafficSteps({ ...options, neighbors }), midtownArterialSteps({ hourly, quality: 'high' }, boards)]) {
        // Run all but the final step, then abandon.
        let k = 0;
        while (k < 1 + (cycle % 3) && !build.next().done) k++;
        steps += k;
        build.return(undefined as never);
      }
    }
    expect(steps).toBeGreaterThan(40);
    expect(clone).not.toHaveBeenCalled();
    expect(dispose).not.toHaveBeenCalled();
    clone.mockRestore(); dispose.mockRestore();
  });

  it('keeps each step short', () => {
    let worst = 0, label = '';
    for (const build of [connectorTrafficSteps({ ...options, neighbors }), midtownArterialSteps({ hourly, quality: 'high' }, boards)]) {
      for (;;) {
        const t = performance.now();
        const r = build.next();
        const ms = performance.now() - t;
        if (ms > worst) { worst = ms; label = String(r.done ? 'final' : r.value); }
        if (r.done) { (r.value as RoadTraffic).dispose(); break; }
      }
    }
    console.log(`TRAFFIC_STEP worst ${worst.toFixed(1)} ms at ${label}`);
    expect(worst).toBeLessThan(200); // a loose bound for a loaded machine; the report gives the number
  });
});
