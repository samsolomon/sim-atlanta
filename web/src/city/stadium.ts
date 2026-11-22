import * as THREE from 'three';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import type { GroundGrid } from '../terrain/grid';

const ID = 'c102d61f-1027-4d71-8024-57c8eabc3a58';
const hub: P2 = [-857, -155.5];
const PLAZA = 2.2;
// Eight clockwise roof ridges, their outer folds and the ends of the moving leaves,
// traced in City metres from the north-up county aerial. Heights are illustrative.
const ridges: P2[] = [[-811.5, -296], [-731.5, -234.5], [-718, -129.5], [-784.5, -71],
[-897.5, -52], [-985.5, -113.5], [-993.5, -193.5], [-939, -277.5]];
const folds: P2[] = [[-794, -277], [-742, -202.5], [-745, -111], [-809, -69.5],
[-910, -65.5], [-965.5, -124.5], [-969.5, -206], [-885, -285]];
const leaves: P2[] = [[-840.5, -217.5], [-795, -193.5], [-783, -147], [-815.5, -104],
[-877, -93], [-921.5, -119], [-931.5, -164.5], [-900, -205]];

// Intermediate turns along the eaves, and the two outer shoulders of each closed
// petal. These follow the visible roof edge in the same north-up county frame.
const eaves: P2[] = [[-794, -278.5], [-728.5, -202], [-742, -110.5], [-808, -61.5], [-910, -63.5], [-992, -127], [-972, -227], [-885.5, -286.5]];
const shoulders: [P2, P2][] = [
  [[-821, -222], [-800, -212]],
  [[-781.5, -187], [-777.5, -159]],
  [[-780.5, -128], [-792.5, -114]],
  [[-825, -98.5], [-863.5, -94.5]],
  [[-889, -91.5], [-912.5, -101.5]],
  [[-936.5, -129], [-941, -151.5]],
  [[-932, -183.5], [-921.5, -198]],
  [[-882, -225.5], [-865, -227.5]]
];

type Vertex = [number, number, number];
const vertex = ([x, z]: P2, y: number): Vertex => [x, y, z];
const mix = (a: Vertex, b: Vertex, t: number): Vertex =>
  [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lift = ([x, y, z]: Vertex, dy: number): Vertex => [x, y + dy, z];
const foot = ([x, z]: P2): Vertex => [hub[0] + (x - hub[0]) * 0.94, 7, hub[1] + (z - hub[1]) * 0.94];

/** Cut the surveyed perimeter at the western board face, including the two true intersections. */
function boardFootprint(ring: P2[], west: number) {
  const result: P2[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    if (a[0] >= west) result.push(a);
    if ((a[0] < west && b[0] > west) || (a[0] > west && b[0] < west)) {
      result.push([west, a[1] + (b[1] - a[1]) * (west - a[0]) / (b[0] - a[0])]);
    }
  }
  return result;
}

/** Sloped curtain wall with horizontal concourse beams, mullions, and an overlapping metal blade. */
function facade(b: Builder, a: Vertex, c: Vertex, lowerA: Vertex, lowerC: Vertex, panel: 'left' | 'right' | 'glass' | 'window-left' | 'window-right') {
  const at = (u: number, v: number, offset = 0): Vertex => {
    const p = mix(mix(lowerA, lowerC, u), mix(a, c, u), v);
    const length = Math.hypot(p[0] - hub[0], p[2] - hub[1]);
    return [p[0] + offset * (p[0] - hub[0]) / length, p[1], p[2] + offset * (p[2] - hub[1]) / length];
  };
  const window = panel === 'window-left' || panel === 'window-right';
  if (window) {
    // Set the glazing behind the projecting blades. The concourse floor edges
    // bridge that recess, and the entrance columns stand clear of the doors.
    const sill = (u: number, inset: number) => {
      const p = at(u, 0, inset);
      return vertex([p[0], p[2]], PLAZA);
    };
    b.quad(sill(0, -6), sill(1, -6), at(1, 0, -6), at(0, 0, -6), '#394852');
    b.quad(at(0, 0, -6), at(1, 0, -6), at(1, 0), at(0, 0), '#606770');
    b.quad(at(0, 0, -2.5), at(1, 0, -2.5), at(1, 1, -2.5), at(0, 1, -2.5), '#b5cbd4');
    for (const v of [0.18, 0.36, 0.54, 0.72]) {
      b.quad(at(0, v, -2.5), at(1, v, -2.5), at(1, v + 0.018, -1), at(0, v + 0.018, -1), '#dbe3e1');
    }
    for (let n = 0; n < 12; n++) {
      const u = n / 12, end = u + 0.009;
      b.quad(at(u, 0, -2.4), at(end, 0, -2.4), at(end, 1, -2.4), at(u, 1, -2.4), '#e1e6e3');
      if (n % 3 === 0) b.quad(sill(u, 0), sill(end + 0.018, 0), at(end + 0.018, 0), at(u, 0), '#ced4d1');
    }
    const outer = panel === 'window-left' ? 0 : 1, joint = 1 - outer;
    // Return the entrance and glazing to the adjoining facade at each end.
    b.quad(sill(outer, 0), sill(outer, -6), at(outer, 0, -6), at(outer, 0), '#626d73');
    b.quad(at(outer, 0), at(outer, 0, -2.5), at(outer, 1, -2.5), at(outer, 1), '#9ba6ab');
    b.tri(at(outer, 1, 1.8), at(0.7 * outer + 0.3 * joint, 1, 1.8), at(outer, 0.22, 1.8), '#c8cdd0');
    b.quad(at(outer, 1, 1.8), at(outer, 0.955, 1.8), at(joint, 0.04, 1.8), at(joint, 0.085, 1.8), '#e3e6e4');
    b.quad(at(0, 1, -2.5), at(1, 1, -2.5), at(1, 1, 1.8), at(0, 1, 1.8), '#b4bbbf');
    return;
  }
  // The public entrances sit in the shadow of the projecting envelope.
  const thresholdA: Vertex = [lowerA[0], PLAZA, lowerA[2]];
  const thresholdC: Vertex = [lowerC[0], PLAZA, lowerC[2]];
  b.quad(thresholdA, thresholdC, lowerC, lowerA, '#55646a');
  b.quad(lift(lowerA, -0.6), lift(lowerC, -0.6), lowerC, lowerA, '#adb3b5');
  b.quad(lowerA, lowerC, c, a, '#829dab');
  const bays = Math.ceil(Math.hypot(c[0] - a[0], c[2] - a[2]) / 5);
  for (let i = 0; i < bays; i++) {
    const u = i / bays, end = (i + 0.11) / bays;
    if (i % 2 === 0) {
      b.quad(mix(thresholdA, thresholdC, u), mix(thresholdA, thresholdC, end),
        mix(lowerA, lowerC, end), mix(lowerA, lowerC, u), '#c9c6bd');
    }
    b.quad(at(u, 0, 0.2), at(end, 0, 0.2), at(end, 1, 0.2), at(u, 1, 0.2), '#bfccd0');
  }
  for (let i = 1; i <= 6; i++) {
    const v = i / 7;
    b.quad(at(0, v, 0.28), at(1, v, 0.28), at(1, v + 0.014, 0.28), at(0, v + 0.014, 0.28), '#c7ced0');
  }
  const left = panel === 'left', u = left ? 0 : 1, opposite = 1 - u;
  if (panel !== 'glass') {
    b.tri(at(u, 1, 0.8), at(opposite, 1, 0.8), at(u, 0.06, 0.8), left ? '#bcc2c5' : '#d1d2cd');
  }
  b.quad(at(opposite, 1, 0.9), at(opposite, 0.974, 0.9), at(u, 0.04, 0.9), at(u, 0.066, 0.9), '#d9dddd');
}

/** Eight opaque ETFE leaves. Each lap has a raised leading edge and a narrow vertical return. */
function closedLeaf(petals: Builder, rib: number[], i: number) {
  const j = (i + 1) % 8, previous = (i + 7) % 8;
  const center = vertex(hub, 93);
  const knee = mix(center, mix(vertex(leaves[i], 83), vertex(leaves[previous], 83), 0.12), 0.24);
  const nextKnee = mix(center, mix(vertex(leaves[j], 83), vertex(leaves[i], 83), 0.12), 0.24);
  const start = vertex(leaves[i], 83), end = vertex(leaves[j], 83);
  const a = lift(start, 2.6), k = lift(knee, 1.4);
  const tone = ['#ecece5', '#dcded8', '#e5e6df', '#d6d9d3'][i % 4];
  const before = petals.pos.length;
  // Round the outer edge through a pair of shoulder-controlled arcs.
  const [p, q] = shoulders[i].map(point => vertex(point, 0));
  const mid = mix(p, q, 0.5);
  let last = a;
  let underside = start;
  for (let n = 1; n <= 8; n++) {
    const t = n / 8;
    const u = t <= 0.5 ? 2 * t : 2 * t - 1;
    const [from, control, to] = t <= 0.5 ? [a, p, mid] : [mid, q, end];
    const edge = mix(mix(from, control, u), mix(control, to, u), u);
    edge[1] = mix(a, end, t)[1];
    const curb = mix(start, end, t);
    petals.tri(k, last, edge, tone);
    petals.quad(last, edge, curb, underside, '#a6afaf');
    last = edge;
    underside = curb;
  }
  petals.tri(k, end, nextKnee, tone);
  petals.tri(k, nextKnee, center, tone);
  petals.quad(start, a, k, knee, '#909998');
  petals.tri(k, center, knee, '#909998');
  // Parallel pillow ribs change direction at each seam (see the overhead photograph).
  const dx = (a[0] + end[0]) / 2 - hub[0], dz = (a[2] + end[2]) / 2 - hub[1];
  const length = Math.hypot(dx, dz);
  for (let n = before; n < petals.pos.length; n += 3) {
    rib.push(((petals.pos[n] - hub[0]) * dz - (petals.pos[n + 2] - hub[1]) * dx) / (length * 4.4));
  }
}

function roofAndWalls(b: Builder, petals: Builder, rib: number[]) {
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8;
    const a = vertex(ridges[i], 66), c = vertex(ridges[j], 58);
    const eave = vertex(eaves[i], 61), fold = vertex(folds[i], 64);
    const innerOutline = leaves[j], nextOutline = leaves[(j + 1) % 8];
    const inner = vertex(innerOutline, 82.5), next = vertex(nextOutline, 79.5);
    b.tri(a, eave, fold, '#c6c8c4');
    b.tri(eave, c, fold, '#bcc0be');
    b.tri(a, fold, inner, '#c5c7c3');
    // A pair of narrow guideways on the fixed plane runs toward each retracting leaf.
    for (const offset of [0.17, 0.33]) {
      const outside = mix(a, fold, offset), inside = mix(outside, inner, 0.71);
      const edge = mix(a, fold, offset + 0.013);
      b.quad(lift(outside, 0.18), lift(edge, 0.18), lift(mix(edge, inner, 0.71), 0.18), lift(inside, 0.18), '#838d90');
    }
    b.quad(fold, c, next, inner, '#b9bdb9');
    b.quad(c, lift(c, 8), vertex(nextOutline, 82.5), next, '#70797b');
    b.quad(inner, next, vertex(nextOutline, 83), vertex(innerOutline, 83), '#828b8c');
    const lowerA = foot(ridges[i]), lowerC = foot(ridges[j]), lowerEave = foot(eaves[i]);
    facade(b, a, eave, lowerA, lowerEave, i === 1 ? 'window-left' : 'left');
    facade(b, eave, c, lowerEave, lowerC, i === 1 ? 'window-right' : i === 0 ? 'glass' : 'right');
    closedLeaf(petals, rib, i);
  }
}

export function createStadium(buildings: VBuilding[], grid: GroundGrid) {
  const base = buildings.find(b => b.id === ID), ring = base?.rings[0];
  if (!ring || !leaves.every(p => pointInRing(...p, ring))) return null;
  const { bounds, stepM, vertical } = grid.manifest;
  const perimeter = boardFootprint(ring, bounds.minX);
  // The fixed model must fit this board. Only the mapped western apron is cut.
  if (perimeter.length < 3 || ridges.some(([x, z]) => x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ)) return null;
  const datum = grid.sample(...hub);
  if (datum === null || !Number.isFinite(datum)) return null;
  let bottom = datum;
  for (let i = 0; i < perimeter.length; i++) {
    const a = perimeter[i], c = perimeter[(i + 1) % perimeter.length];
    const n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / (stepM / 2)));
    for (let j = 0; j < n; j++) {
      const h = grid.sample(a[0] + (c[0] - a[0]) * j / n, a[1] + (c[1] - a[1]) * j / n);
      if (h === null || !Number.isFinite(h)) return null;
      bottom = Math.min(bottom, h);
    }
  }
  const shell = new Builder(), petals = new Builder();
  for (let i = 0; i < perimeter.length; i++) {
    const a = perimeter[i], c = perimeter[(i + 1) % perimeter.length];
    shell.quad(vertex(a, bottom - datum - 0.65), vertex(c, bottom - datum - 0.65), vertex(c, PLAZA), vertex(a, PLAZA), '#aea99c');
    shell.tri(vertex(a, PLAZA), vertex(c, PLAZA), vertex(hub, PLAZA), '#bdb9ad');
  }
  const rib: number[] = [];
  roofAndWalls(shell, petals, rib);
  const group = new THREE.Group();
  group.name = 'Mercedes-Benz Stadium';
  group.position.y = datum - vertical.sceneZeroNavd88M;
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const fixed = new THREE.Mesh(shell.geometry(), material);
  const membrane = new THREE.Mesh(petals.geometry(), material.clone());
  membrane.geometry.setAttribute('pillowRib', new THREE.Float32BufferAttribute(rib, 1));
  membrane.material.onBeforeCompile = shader => {
    shader.vertexShader = 'attribute float pillowRib; varying float vRib;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vRib = pillowRib;');
    shader.fragmentShader = 'varying float vRib;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float width = max(fwidth(vRib), 0.001);
        float seam = 1.0 - smoothstep(0.035, 0.035 + width, abs(fract(vRib + 0.5) - 0.5));
        diffuseColor.rgb *= 1.0 - 0.075 * seam * (1.0 - smoothstep(0.2, 0.8, width));`);
  };
  fixed.name = 'Fixed roof and shell';
  membrane.name = 'Eight closed roof petals';
  for (const mesh of [fixed, membrane]) {
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { group, buildings: buildings.filter(b => b !== base) };
}
