import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, outwardSign, ramp, shadedQuad, wound } from './skin-kit';

export const metropolisId = 'osm:way:234733557';
const origin: P2 = [731, -2916];

// Metropolis (943 Peachtree, 2002): two glass residential towers over a garage podium, with
// retail bases on 8th Street and Peachtree Place. Heights are the mapped (reported) parts.
const parts = {
  southWest: 'osm:way:796357410', south: 'osm:way:886036484', southStep: 'osm:way:796357409',
  northWest: 'osm:way:796357404', north: 'osm:way:886036482', northStep: 'osm:way:796357402',
  deck: 'osm:way:796357406', podium: 'osm:way:886036474',
  southBase: 'osm:way:886036490', northBase: 'osm:way:886036477',
};

const glassLow = '#465c67', glassHigh = '#94aab5';
const slab = '#c3c9cb';
const precast = '#c9c3b6', garageGap = '#3a3f42';
const storey = 3.6;

export function createMetropolis(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const part = (id: string) => {
    const p = site.parts?.find(q => q.id === id);
    return p && p.rings.length === 1 ? { ring: p.rings[0].map(([x, z]): P2 => [x - origin[0], z - origin[1]]), h: p.h } : null;
  };
  const got = Object.fromEntries(Object.entries(parts).map(([k, id]) => [k, part(id)]));
  if (Object.values(got).some(p => !p || p.ring.length < 3 || !(p.h > 0))) return null;
  const P = got as Record<keyof typeof parts, { ring: P2[]; h: number }>;
  const shell = landmarkShell(buildings, grid, site.id, 'Metropolis', origin, [1, 0], [[0, 0], [-25, 40], [20, -45]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const ground = ([x, z]: P2) => grid.sample(x + origin[0], z + origin[1]) ?? floor;
  for (const p of Object.values(P)) p.ring = wound(p.ring, 1);
  const out = outwardSign(P.podium.ring);
  const { body, lights } = shell;
  const random = rng(943);
  /** True when just outside the face is open air at this height (not another part). */
  const open = (ring: P2[], a: P2, b: P2, length: number, y: number) => {
    const m = along(a, b, length, length / 2, 1.2 * out);
    return !Object.values(P).some(p => p.ring !== ring && p.h + floor > y && pointInRing(m[0], m[1], p.ring));
  };
  const roof = (ring: P2[], y: number, color: string) => {
    for (const [a, b, c] of ShapeUtils.triangulateShape(ring.map(([x, z]) => new Vector2(x, z)), []))
      body.tri([ring[a][0], y, ring[a][1]], [ring[c][0], y, ring[c][1]], [ring[b][0], y, ring[b][1]], color);
  };

  // Retail bases: storefronts under a pale precast band, following the street's grade.
  // The towers' own street faces carry the same storefront line.
  for (const key of ['southBase', 'northBase', 'deck', 'podium', 'southWest', 'south', 'southStep', 'northWest', 'north', 'northStep'] as const) {
    const { ring, h } = P[key];
    if (key.endsWith('Base')) shell.prism(ring, footing, floor + h, precast, '#8e9294');
    faces(ring, (a, b, length) => {
      if (!open(ring, a, b, length, floor + 2)) return;
      const steps = Math.max(1, Math.ceil(length / 6));
      for (let k = 0; k < steps; k++) {
        const u0 = k * length / steps + 0.3, u1 = (k + 1) * length / steps - 0.3;
        const p = along(a, b, length, u0, 0.05 * out), q = along(a, b, length, u1, 0.05 * out);
        const g0 = Math.max(floor, ground(p)), g1 = Math.max(floor, ground(q));
        lights.quad([p[0], footing, p[1]], [p[0], g0 + 4.6, p[1]], [q[0], g1 + 4.6, q[1]], [q[0], footing, q[1]], '#33434a');
      }
    }, 0.6);
  }

  // The garage podium: precast with three dark bands of openings, and the amenity deck.
  for (const key of ['podium', 'deck'] as const) {
    const { ring, h } = P[key];
    shell.prism(ring, footing, floor + h, precast, key === 'deck' ? '#7b8a62' : '#a7aaa6');
    faces(ring, (a, b, length) => {
      if (length < 6 || !open(ring, a, b, length, floor + 12)) return;
      const p = along(a, b, length, 1, 0.05 * out), q = along(a, b, length, length - 1, 0.05 * out);
      for (const level of key === 'deck' ? [1, 2] : [1, 2, 3]) {
        const y = floor + 9.3 + (level - 1) * 4.1 + 1.2;
        body.quad([p[0], y, p[1]], [p[0], y + 1.6, p[1]], [q[0], y + 1.6, q[1]], [q[0], y, q[1]], garageGap);
      }
      // The deck's street frontage: a storey of amenity glazing under the deck, in mullioned panes.
      if (key === 'deck') {
        const panes = Math.max(1, Math.round((length - 2) / 4.5));
        for (let k = 0; k < panes; k++) {
          const u0 = 1 + k * (length - 2) / panes + 0.3, u1 = 1 + (k + 1) * (length - 2) / panes - 0.3;
          const s = along(a, b, length, u0, 0.05 * out), e = along(a, b, length, u1, 0.05 * out);
          (k % 3 === 1 ? body : lights).quad([s[0], floor + h - 5, s[1]], [s[0], floor + h - 1.2, s[1]],
            [e[0], floor + h - 1.2, e[1]], [e[0], floor + h - 5, e[1]], '#3b4b52');
        }
      }
    });
  }
  // The pool on the podium deck between the towers, set in from the alley.
  const pool: P2[] = [[18, 4], [26, 4], [26, -14], [18, -14]];
  if (pointInRing(22, -5, P.podium.ring)) roof(pool, floor + P.podium.h + 0.05, '#4f9fb4');

  // Towers: glass with silver slab edges every storey and stacked corner balconies.
  const towers = [['southWest', 'south', 'southStep'], ['northWest', 'north', 'northStep']] as const;
  const top = Math.max(...Object.values(P).map(p => p.h));
  const glassAt = ramp(glassLow, glassHigh, footing, floor + top);
  for (const tower of towers) {
    for (const key of tower) {
      const { ring, h } = P[key];
      const lo = footing, hi = floor + h;
      faces(ring, (a, b, length) => {
        shadedQuad(body, a, b, lo, hi, glassAt(lo), glassAt(hi));
        if (length < 8) return;
        const p = along(a, b, length, 0, 0.05 * out), q = along(a, b, length, length, 0.05 * out);
        for (let y = floor + 9.3; y < hi - 1; y += storey) {
          if (!open(ring, a, b, length, y + 1)) continue;
          body.quad([p[0], y, p[1]], [p[0], y + 0.55, p[1]], [q[0], y + 0.55, q[1]], [q[0], y, q[1]], slab);
        }
      });
      roof(ring, hi, '#8d9296');
    }
  }

  // Balcony stacks: a projecting slab and rail every storey at the Peachtree corners.
  for (const key of ['southWest', 'northWest'] as const) {
    const { ring, h } = P[key];
    // The longest face looking west onto Peachtree.
    let best = 0, score = -Infinity;
    faces(ring, (a, b, length, i) => {
      const n = along(a, b, length, length / 2, out), m = along(a, b, length, length / 2);
      const s = (m[0] - n[0]) * Math.min(length, 30);
      if (s > score) { score = s; best = i; }
    });
    const a = ring[best], b = ring[(best + 1) % ring.length], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (const [u0, u1] of [[0.6, 4.6], [length - 4.6, length - 0.6]]) {
      const p = along(a, b, length, u0, 0), q = along(a, b, length, u1, 0);
      const pf = along(a, b, length, u0, 1.6 * out), qf = along(a, b, length, u1, 1.6 * out);
      for (let y = floor + 9.3 + storey; y < floor + h - 2; y += storey) {
        // Slab soffit and edge, then a glass rail.
        body.quad([p[0], y, p[1]], [pf[0], y, pf[1]], [qf[0], y, qf[1]], [q[0], y, q[1]], '#9aa1a4');
        body.quad([pf[0], y, pf[1]], [pf[0], y + 0.35, pf[1]], [qf[0], y + 0.35, qf[1]], [qf[0], y, qf[1]], slab);
        body.quad([pf[0], y + 0.35, pf[1]], [pf[0], y + 1.1, pf[1]], [qf[0], y + 1.1, qf[1]], [qf[0], y + 0.35, qf[1]], '#7f979f');
      }
    }
  }

  // Night: residential floors noticeably lit, in whole two-bay runs with a stable pattern.
  for (const tower of towers) for (const key of tower) {
    const { ring, h } = P[key];
    faces(ring, (a, b, length) => {
      if (length < 5) return;
      const runs = Math.max(1, Math.round(length / 6.5));
      for (let y = floor + 9.3 + 0.55; y < floor + h - 3; y += storey) {
        if (!open(ring, a, b, length, y + 1)) continue;
        for (let r = 0; r < runs; r++) {
          if (random() > 0.3) continue;
          const u0 = (r + 0.08) * length / runs, u1 = (r + 0.92) * length / runs;
          const p = along(a, b, length, u0, 0.08 * out), q = along(a, b, length, u1, 0.08 * out);
          // By day the run keeps the glass tone at its height.
          shadedQuad(lights, p, q, y + 0.25, y + storey - 0.85, glassAt(y + 0.25), glassAt(y + storey - 0.85));
        }
      }
    });
  }
  // The crown parapet over the Peachtree slice of the north tower glows evenly at night.
  {
    const { ring, h } = P.northWest;
    faces(ring, (a, b, length) => {
      if (!open(ring, a, b, length, floor + h - 1)) return;
      const p = along(a, b, length, 0, 0.08 * out), q = along(a, b, length, length, 0.08 * out);
      lights.quad([p[0], floor + h - 1.6, p[1]], [p[0], floor + h - 0.2, p[1]], [q[0], floor + h - 0.2, q[1]], [q[0], floor + h - 1.6, q[1]], '#c3c9cb');
    });
  }
  const result = shell.finish('#f2d3a2', 0.62);
  // By day the lamp quads must darken with the shaded wall they sit on, or they show as panes.
  result.group.children.forEach(m => { m.receiveShadow = true; });
  return result;
}
