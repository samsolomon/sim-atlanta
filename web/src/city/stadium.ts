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
function facade(b: Builder, a: Vertex, c: Vertex, lowerA: Vertex, lowerC: Vertex, panel: 'left' | 'right' | 'glass') {
  const at = (u: number, v: number, offset = 0): Vertex => {
    const p = mix(mix(lowerA, lowerC, u), mix(a, c, u), v);
    const length = Math.hypot(p[0] - hub[0], p[2] - hub[1]);
    return [p[0] + offset * (p[0] - hub[0]) / length, p[1], p[2] + offset * (p[2] - hub[1]) / length];
  };
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
  const knee = mix(center, vertex(leaves[previous], 83), 0.18);
  const nextKnee = mix(center, vertex(leaves[i], 83), 0.18);
  const start = vertex(leaves[i], 83), end = vertex(leaves[j], 83);
  const a = lift(start, 2.6), k = lift(knee, 1.4);
  const tone = ['#ecece5', '#dcded8', '#e5e6df', '#d6d9d3'][i % 4];
  const before = petals.pos.length;
  // Each curved outer lip overlaps the fixed roof. The underside meets its curb.
  let last = a;
  for (let part = 1; part <= 4; part++) {
    const t = part / 4, p = mix(a, end, t);
    const bulge = 1 + 0.10 * Math.sin(Math.PI * t);
    const edge: Vertex = [hub[0] + (p[0] - hub[0]) * bulge, p[1], hub[1] + (p[2] - hub[1]) * bulge];
    petals.tri(k, last, edge, tone);
    petals.quad(last, edge, mix(start, end, t), mix(start, end, (part - 1) / 4), '#b0b5b4');
    last = edge;
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
    const eave = mix(a, c, 0.43), fold = vertex(folds[i], 64);
    const inner = vertex(leaves[i], 82), next = vertex(leaves[j], 77);
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
    b.quad(c, lift(c, 8), lift(next, 5), next, '#70797b');
    b.quad(inner, next, vertex(leaves[j], 83), vertex(leaves[i], 83), '#828b8c');
    const lowerA = foot(ridges[i]), lowerC = foot(ridges[j]), lowerEave = mix(lowerA, lowerC, 0.43);
    facade(b, a, eave, lowerA, lowerEave, i === 1 ? 'glass' : 'left');
    facade(b, eave, c, lowerEave, lowerC, i === 0 ? 'glass' : 'right');
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
        diffuseColor.rgb *= 1.0 - 0.16 * seam * (1.0 - smoothstep(0.2, 0.8, width));`);
  };
  fixed.name = 'Fixed roof and shell';
  membrane.name = 'Eight closed roof petals';
  for (const mesh of [fixed, membrane]) {
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { group, buildings: buildings.filter(b => b !== base) };
}
