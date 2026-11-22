import { ShapeUtils, Vector2 } from 'three';
import { Builder, pointInRing, type P2 } from './geom';

export interface SteelDeck {
  levels: number;
  roof: 'split' | { landingFall: number; rampDrop: number };
  occupancy: number;
}

export const campusSteelDecks = new Map<string, SteelDeck>([
  ['bdaf3eb3-d438-414b-8fb3-4ca8fff3b752', { levels: 5, roof: 'split', occupancy: 0.012 }],
  ['1ac40424-9462-48ad-b897-d260ca57dd38', { levels: 7, roof: { landingFall: 1.27, rampDrop: 2.62 }, occupancy: 0.01 }],
  [
    '99b12a07-cc31-4357-bbd6-28e528f5e8a8',
    { levels: 7, roof: { landingFall: 1.33, rampDrop: 2.66 }, occupancy: 0.052 },
  ],
]);

// The S deck rises along one side and descends along the other. K and N meet
// at a central landing with lower ramps exposed through opposite roof panels.
export function upperSurface(profile: SteelDeck, positiveU: boolean, v: number) {
  if (profile.roof === 'split') return positiveU ? -1.23 - 0.022 * (28 + v) : -0.022 * (28 - v);
  return (-profile.roof.landingFall * Math.max(0, Math.min(30, Math.abs(v)) - 3)) / 27;
}

// Clip the actual footprint at each change of grade, retaining its stair returns.
function cut(ring: P2[], axis: 0 | 1, line: number, above: boolean) {
  const result: P2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i],
      b = ring[(i + 1) % ring.length];
    const inside = above ? a[axis] >= line : a[axis] <= line;
    if (inside) result.push(a);
    if ((a[axis] < line && b[axis] > line) || (a[axis] > line && b[axis] < line)) {
      const t = (line - a[axis]) / (b[axis] - a[axis]);
      const point: P2 = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      point[axis] = line;
      result.push(point);
    }
  }
  return result;
}

export function appendSteelDeck(
  b: Builder,
  profile: SteelDeck,
  local: P2[],
  world: (u: number, v: number) => P2,
  foot: number,
  base: number,
  roof: number
) {
  const split = profile.roof === 'split';
  const rampGrade = profile.roof === 'split' ? 0 : profile.roof.rampDrop / 27;
  const at = ([u, v]: P2, y: number) => {
    const [x, z] = world(u, v);
    return [x, y, z];
  };
  const exclusions: P2[][] = [];
  const uCuts = split ? [-Infinity, 0, Infinity] : [-Infinity, -15, 0, 15, Infinity];
  const vCuts = split ? [-Infinity, Infinity] : [-Infinity, -30, -3, 3, 30, Infinity];
  for (let j = 1; j < uCuts.length; j++) {
    const strip = cut(cut(local, 0, uCuts[j - 1], true), 0, uCuts[j], false);
    const positive = uCuts[j - 1] >= 0;
    for (let k = 1; k < vCuts.length; k++) {
      const patch = cut(cut(strip, 1, vCuts[k - 1], true), 1, vCuts[k], false);
      if (patch.length < 3) continue;
      const ramp = !split && ((j === 2 && k === 2) || (j === 3 && k === 4));
      const surface = (v: number) => roof + upperSurface(profile, positive, v);
      const pavement = patch.map((p) => at(p, surface(p[1]) - (ramp ? rampGrade * (30 - Math.abs(p[1])) : 0)));
      for (const [i, n, m] of ShapeUtils.triangulateShape(
        patch.map(([u, v]) => new Vector2(u, v)),
        []
      ))
        b.tri(pavement[i], pavement[m], pavement[n], ramp ? '#aaa9a5' : '#b0afab');
      if (ramp) {
        exclusions.push(patch);
        // An outer row of empty bays follows the descending pavement in the aerial.
        for (let offset = 5; offset < 29; offset += 2.7) {
          const line = (u: number, v: number) => at([u, v], surface(v) - rampGrade * (30 - Math.abs(v)) + 0.035);
          const v = positive ? offset : -offset;
          const inner = positive ? 9.2 : -9.2,
            outer = positive ? 14.3 : -14.3;
          b.quad(line(inner, v), line(outer, v), line(outer, v + 0.14), line(inner, v + 0.14), '#dfdccc');
        }
      }
      for (let i = 0; i < patch.length; i++) {
        const n = (i + 1) % patch.length;
        const a = patch[i],
          d = patch[n];
        if (ramp) b.quad(pavement[i], pavement[n], at(d, surface(d[1])), at(a, surface(a[1])), '#72736f');
        if (split && positive && a[0] === 0 && d[0] === 0) {
          b.quad(
            pavement[i],
            pavement[n],
            at(d, roof + upperSurface(profile, false, d[1])),
            at(a, roof + upperSurface(profile, false, a[1])),
            '#888a85'
          );
        }
      }
    }
  }
  const stairs = split
    ? [[11, -21]]
    : [
        [12, -35],
        [-12, 35],
      ];
  for (const [u, v] of stairs) {
    const core = cut(cut(local, 0, u, u > 0), 1, v, v > 0);
    if (core.length < 3) continue;
    exclusions.push(core);
    const head = roof + upperSurface(profile, u > 0, v) + 1.9;
    const cap = core.map((p) => at(p, head));
    for (const [a, d, e] of ShapeUtils.triangulateShape(
      core.map(([x, z]) => new Vector2(x, z)),
      []
    ))
      b.tri(cap[a], cap[e], cap[d], '#c7c8be');
    for (let i = 0; i < core.length; i++) {
      const a = core[i],
        j = (i + 1) % core.length,
        d = core[j];
      const inner = (a[0] === u && d[0] === u) || (a[1] === v && d[1] === v);
      b.quad(
        at(a, inner ? roof + upperSurface(profile, u > 0, a[1]) : head - 0.2),
        at(d, inner ? roof + upperSurface(profile, u > 0, d[1]) : head - 0.2),
        cap[j],
        cap[i],
        inner ? '#879798' : '#c0c1b7'
      );
    }
  }
  const inward = Math.sign(ShapeUtils.area(local.map(([u, v]) => new Vector2(u, v))));
  for (let i = 0; i < local.length; i++) {
    const [u, v] = local[i],
      end = local[(i + 1) % local.length];
    const length = Math.hypot(end[0] - u, end[1] - v);
    if (length < 0.01) continue;
    const du = (end[0] - u) / length,
      dv = (end[1] - v) / length;
    const bays = Math.max(1, Math.round(length / 6.5));
    const bayEdges = Array.from({ length: bays + 1 }, (_, j) => (j * length) / bays);
    const breaks = split ? [-u / du] : [-30, -3, 3, 30].map((value) => (value - v) / dv);
    for (const [su, sv] of stairs) breaks.push((su - u) / du, (sv - v) / dv);
    const changes = breaks.filter((t) => t > 0.01 && t < length - 0.01);
    // Slab noses and cables span multiple structural bays. Split them only at
    // a change of grade or material, so the distant City draw stays small.
    for (const structure of [false, true]) {
      const stops = [...(structure ? bayEdges : [0, length]), ...changes].sort((a, d) => a - d);
      for (let j = 1; j < stops.length; j++) {
        const a = stops[j - 1],
          d = stops[j],
          mid = (a + d) / 2;
        if (d - a < 0.001) continue;
        const um = u + du * mid,
          vm = v + dv * mid;
        const stair = split ? um > 11 && vm < -21 : (um < -12 && vm > 35) || (um > 12 && vm < -35);
        const top = (t: number) => roof + upperSurface(profile, um >= 0, v + dv * t);
        const p = (t: number, y: number, inset: number) => {
          const edge: P2 = [u + du * t, v + dv * t];
          const back: P2 = [edge[0] - inward * dv * inset, edge[1] + inward * du * inset];
          return at(inset && pointInRing(...back, local) ? back : edge, y);
        };
        const band = (lowA: number, lowD: number, highA: number, highD: number, colour: string, inset = 0) =>
          b.quad(p(a, lowA, inset), p(d, lowD, inset), p(d, highD, inset), p(a, highA, inset), colour);
        const cap = stair ? 1.9 : 1.05;
        if (!structure) band(foot, foot, base + 0.12, base + 0.12, '#a5a7a1');
        // A continuous dark interior sits behind the separately drawn steel frame.
        if (!structure) band(base, base, top(a), top(d), stair ? '#637c87' : '#535852', stair ? 0.16 : 0.8);
        const col = Math.min(d, a + 0.25);
        // Only structural bays have uprights. Grade changes divide the ribbon alone.
        if (structure && Math.abs((a * bays) / length - Math.round((a * bays) / length)) < 1e-5) {
          b.quad(p(a, base, 0), p(col, base, 0), p(col, top(col) + cap, 0), p(a, top(a) + cap, 0), '#bfc3be');
          b.quad(
            p(col, base, 0),
            p(col, base, 0.36),
            p(col, top(col) + cap, 0.36),
            p(col, top(col) + cap, 0),
            '#969e9b'
          );
        }
        for (let level = 0; level < profile.levels; level++) {
          const f = level / (profile.levels - 1);
          const la = base + f * (top(a) - base),
            ld = base + f * (top(d) - base);
          if (!structure) {
            if (level)
              b.quad(p(a, la - 0.25, 0), p(d, ld - 0.25, 0), p(d, ld - 0.25, 0.8), p(a, la - 0.25, 0.8), '#a8aaa3');
            band(la - (level ? 0.25 : 0), ld - (level ? 0.25 : 0), la + 0.12, ld + 0.12, '#c1c4bd', 0.025);
            band(la + 0.51, ld + 0.51, la + 0.58, ld + 0.58, '#a6aaa5', 0.06);
            band(la + 0.98, ld + 0.98, la + 1.05, ld + 1.05, '#ccd0c8', 0.06);
            continue;
          }
          const braced = length > 45 && Math.floor((mid * bays) / length) % 3 === 1;
          if (level + 1 < profile.levels && (stair || braced)) {
            const nextA = la + (top(a) - base) / (profile.levels - 1) - 0.26;
            const nextD = ld + (top(d) - base) / (profile.levels - 1) - 0.26;
            // Continue each diagonal across any intermediate change in the roof grade.
            const bay = Math.floor((mid * bays) / length);
            const phaseA = (a * bays) / length - bay,
              phaseD = (d * bays) / length - bay;
            const diagonal = (fa: number, fd: number) => {
              const ya = la + (nextA - la) * fa,
                yd = ld + (nextD - ld) * fd;
              band(ya, yd, ya + (stair ? 0.28 : 0.16), yd + (stair ? 0.28 : 0.16), '#acb4b0', 0.09);
            };
            diagonal(phaseA, phaseD);
            if (!stair) diagonal(1 - phaseA, 1 - phaseD);
          }
        }
        if (!structure && stair) band(top(a), top(d), top(a) + cap, top(d) + cap, '#8a9a9f', 0.12);
      }
    }
  }
  return exclusions;
}
