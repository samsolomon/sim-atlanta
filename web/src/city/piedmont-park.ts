import * as THREE from 'three';
import details from '../../../pipeline/prototypes/piedmont-edge/details.json';
import { Builder, segDist, type P2 } from '../vignette/geom';
import { FURNITURE, type FurnitureKind } from '../landscape/furniture';
import { landscapeMesh, type Ground } from '../landscape/primitives';
import { roadWidth, type TerrainCity } from '../terrain/transport-data';
import { gateFrame, piedmontGates } from './piedmont-gates';

/**
 * Piedmont Park's small details, board by board:
 *  - the 10th Street entrance at Charles Allen Drive (granite piers and walls), on both tiers like the other gates;
 *  - park furniture at the 57 mapped OSM points (benches, drinking fountains, grills, bins, a picnic site), high tier only;
 *  - a map kiosk inside each main entrance (10th, 12th and 14th Streets), high tier only.
 * Furniture positions are reported; the models, the kiosk positions and every dimension are illustrative.
 */
const ENTRANCES = ['10th Street', '12th Street', '14th Street'];
type Bounds = TerrainCity['bounds'];
const inside = (b: Bounds, [x, z]: P2) => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;

/** The nearest paved way to a point: its distance, its half width and the unit direction toward it. */
function nearestWay(city: TerrainCity, [x, z]: P2) {
  let best = { d: Infinity, half: 0, to: [1, 0] as P2 };
  for (const r of city.roads) {
    if (r.bridge || r.tunnel) continue;
    for (let i = 1; i < r.pts.length; i++) {
      const a = r.pts[i - 1], c = r.pts[i];
      if (Math.min(a[0], c[0]) > x + 20 || Math.max(a[0], c[0]) < x - 20 || Math.min(a[1], c[1]) > z + 20 || Math.max(a[1], c[1]) < z - 20) continue;
      const d = segDist(x, z, a, c);
      if (d >= best.d) continue;
      const ex = c[0] - a[0], ez = c[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * ex + (z - a[1]) * ez) / (ex * ex + ez * ez || 1)));
      const px = a[0] + ex * t - x, pz = a[1] + ez * t - z, l = Math.hypot(px, pz) || 1;
      best = { d, half: roadWidth(r) / 2, to: [px / l, pz / l] };
    }
  }
  return best;
}

/** Stands a piece beside the nearest way: clear of its paving by `gap`, facing it. */
export function placeBeside(city: TerrainCity, at: P2, gap = .6): { at: P2; facing: number } {
  const w = nearestWay(city, at);
  if (!Number.isFinite(w.d) || w.d > 15) return { at, facing: 0 };
  const push = Math.max(0, w.half + gap - w.d);
  const p: P2 = [at[0] - w.to[0] * push, at[1] - w.to[1] * push];
  return { at: p, facing: Math.atan2(w.to[1], w.to[0]) };
}

export function piedmontPark(city: TerrainCity, ground: Ground, quality: 'high' | 'low') {
  const b = city.bounds;
  const group = new THREE.Group();
  group.name = 'Piedmont Park details';
  const gates = ENTRANCES.filter(n => n === '10th Street' && inside(b, gateFrame(n).at));
  const gate = gates.length ? piedmontGates(ground, gates) : null;
  if (gate) group.add(gate.group);
  let furniture: ReturnType<typeof landscapeMesh> | null = null, pieces = 0;
  if (quality === 'high') {
    const f = new Builder();
    for (const p of details.furniture) {
      if (!inside(b, p.at as P2)) continue;
      const spot = placeBeside(city, p.at as P2);
      FURNITURE[p.kind as FurnitureKind](f, spot.at, ground, spot.facing);
      pieces++;
    }
    for (const name of ENTRANCES) {
      const g = gateFrame(name), along: P2 = [-g.inward[1], g.inward[0]];
      const at: P2 = [g.at[0] + g.inward[0] * 6 + along[0] * (g.opening / 2 + 2.5), g.at[1] + g.inward[1] * 6 + along[1] * (g.opening / 2 + 2.5)];
      if (!inside(b, at)) continue;
      // The map faces people walking in through the gate.
      const spot = placeBeside(city, at, .8);
      FURNITURE.kiosk(f, spot.at, ground, Math.atan2(-g.inward[1], -g.inward[0]));
      pieces++;
    }
    if (f.pos.length) {
      furniture = landscapeMesh(f);
      furniture.mesh.name = 'piedmont-furniture';
      group.add(furniture.mesh);
    }
  }
  if (!group.children.length) return null;
  let triangles = 0;
  group.traverse(o => { if (o instanceof THREE.Mesh) triangles += (o.geometry.getAttribute('position')?.count ?? 0) / 3; });
  return {
    group, pieces, triangles,
    setNight(n: number) { gate?.setNight(n); },
    dispose() {
      group.traverse(o => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); } });
      furniture?.dispose();
    },
  };
}
