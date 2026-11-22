import * as THREE from 'three';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import type { GroundGrid } from '../terrain/grid';

const CAMPUS_ID = '46ba7ea2-3735-47a8-b77d-997b486ea866';
// The imported footprint includes the A/B rail crossing and two open service courts.
type Rect = [number, number, number, number]; // west, east, north, south in City metres
type Edge = [P2, P2];
const v = ([x, z]: P2, y: number) => [x, y, z];
const sand = '#b5a28c', concrete = '#b4afa3', white = '#d6d6cf', membrane = '#8f908a';
const metal = '#c2c5c0', glass = '#59717a';

// Clip each source roof triangle to a height region. This preserves concave outlines and
// holes even when a region splits a hall into disconnected pieces.
function cut(points: P2[], axis: 0 | 1, limit: number, sign: number) {
  const result: P2[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = (a[axis] - limit) * sign, db = (b[axis] - limit) * sign;
    if (da >= 0) result.push(a);
    if (da * db < 0) {
      const t = da / (da - db);
      const p: P2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      p[axis] = limit;
      result.push(p);
    }
  }
  return result;
}
function volume(b: Builder, triangles: P2[][], [west, east, north, south]: Rect,
  bottom: number, top: number, roof: string, wall: string, soffit = false) {
  const boundary = new Map<string, Edge>();
  const key = ([x, z]: P2) => Math.round(x * 10000) + ',' + Math.round(z * 10000);
  for (const tri of triangles) {
    const poly = cut(cut(cut(cut(tri, 0, west, 1), 0, east, -1), 1, north, 1), 1, south, -1);
    if (poly.length < 3 || Math.abs(THREE.ShapeUtils.area(poly.map(([x, z]) => new THREE.Vector2(x, z)))) < 1e-8) continue;
    for (let i = 1; i < poly.length - 1; i++) {
      b.tri(v(poly[0], top), v(poly[i + 1], top), v(poly[i], top), roof);
      if (soffit) b.tri(v(poly[0], bottom), v(poly[i], bottom), v(poly[i + 1], bottom), concrete);
    }
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], c = poly[(i + 1) % poly.length], ka = key(a), kc = key(c);
      if (ka === kc) continue;
      const id = ka < kc ? ka + '/' + kc : kc + '/' + ka;
      if (!boundary.delete(id)) boundary.set(id, [a, c]);
    }
  }
  for (const [a, c] of boundary.values()) {
    // A clerestory ribbon follows the real stepped outline of the public concourses.
    if (wall === sand && top >= 30 && top - bottom >= 5) {
      b.quad(v(a, bottom), v(c, bottom), v(c, top - 4.6), v(a, top - 4.6), wall);
      b.quad(v(a, top - 4.6), v(c, top - 4.6), v(c, top - 1.9), v(a, top - 1.9), glass);
      b.quad(v(a, top - 1.9), v(c, top - 1.9), v(c, top - 0.65), v(a, top - 0.65), wall);
    } else b.quad(v(a, bottom), v(c, bottom), v(c, top - 0.65), v(a, top - 0.65), wall);
    b.quad(v(a, top - 0.65), v(c, top - 0.65), v(c, top), v(a, top), roof);
  }
}

// A and B share an elevated southern lobby across the railway. Both public entrances
// have a sloped glazed face and a projecting white truss, sized from the venue's photos.
function entrance(b: Builder, x: number, z: number, width: number, floor: number, top: number, bays: number, foundation: number) {
  const left = x - width / 2, right = x + width / 2;
  b.quad([left, floor, z], [right, floor, z], [right, top, z - 3], [left, top, z - 3], glass);
  for (let i = 0; i <= bays; i++) {
    const px = left + i * width / bays;
    b.box(0.65, top - floor, 0.8, px, (top + floor) / 2, z - 1, '#bcc2c0');
    const y = floor + 7;
    b.box(0.55, y - foundation, 0.55, px, (foundation + y) / 2, z + 9, '#d4d4ca');
    b.quad([px - 0.23, y, z + 9], [px + 0.23, y, z + 9], [px + 0.23, top - 1, z - 2], [px - 0.23, top - 1, z - 2], '#e0e1d9');
  }
  for (let i = 0; i < 3; i++) {
    const front = z + 9 - i * 3.3, y = floor + 7 + i * 1.05;
    b.box(width + 1, 0.32, 2.8, x, y, front - 1.4, '#bdc8c8');
    b.box(width + 1, 0.4, 0.35, x, y, front, '#e0e1d9');
  }
}

// Long west-facing C lobby with the upper ribbon of glass above a column arcade.
function colonnade(b: Builder, foundation: number) {
  const line: P2[] = [[-963, -917], [-970, -868], [-978, -755], [-978, -674], [-976, -613]];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i], c = line[i + 1], count = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / 9);
    const east = ([x, z]: P2, dx: number): P2 => [x + dx, z];
    b.quad(v(east(a, 3), 26), v(east(c, 3), 26), v(east(c, 3), 32), v(east(a, 3), 32), glass);
    b.quad(v(a, 32.6), v(c, 32.6), v(east(c, 16), 33.4), v(east(a, 16), 33.4), white);
    b.quad(v(a, 32), v(c, 32), v(c, 32.6), v(a, 32.6), metal);
    b.quad(v(a, 25.4), v(c, 25.4), v(east(c, 3), 26), v(east(a, 3), 26), concrete);
    for (let j = 0; j < count; j++) {
      const x = a[0] + (c[0] - a[0]) * j / count, z = a[1] + (c[1] - a[1]) * j / count;
      b.box(1.2, 25.4 - foundation, 1.2, x + 0.9, (25.4 + foundation) / 2, z, '#d1cfc5');
      b.box(0.45, 6.4, 0.45, x + 2.8, 29, z, metal);
    }
  }
}

// The Marcus Auditorium and Murphy Ballroom rise above the southern lobby. Both
// plans have clipped corners; lower concourse roofs remain visible around them.
function octagon(b: Builder, x: number, z: number, w: number, d: number, cut: number, low: number, high: number) {
  const left = x - w / 2, right = x + w / 2, back = z - d / 2, front = z + d / 2;
  const ring: P2[] = [[left + cut, back], [right - cut, back], [right, back + cut], [right, front - cut],
  [right - cut, front], [left + cut, front], [left, front - cut], [left, back + cut]];
  for (let i = 0; i < 8; i++) {
    const a = ring[i], c = ring[(i + 1) % 8];
    b.quad(v(a, low), v(c, low), v(c, high), v(a, high), sand);
    b.tri(v(c, high), v(a, high), [x, high + 0.35, z], white);
  }
}

export function createCongressCenter(buildings: VBuilding[], grid: GroundGrid) {
  const base = buildings.find(b => b.id === CAMPUS_ID);
  if (!base || base.rings.length < 3 || base.rings.some(r => r.length < 3)) return null;
  const [outline, ...holes] = base.rings;
  const inside = (x: number, z: number) => pointInRing(x, z, outline) && !holes.some(r => pointInRing(x, z, r));
  if (![[-485, -700], [-681, -920], [-886, -891], [-793, -911]].every(([x, z]) => inside(x, z)) ||
    !holes.some(h => pointInRing(-778, -750, h)) || inside(-570, -700)) return null;
  // Set a common level from the open loading yard. Sample all retained perimeter walls
  // so no facade floats at the lower west end or over a missing DEM tile.
  const datum = grid.sample(-778, -750);
  if (datum === null || !Number.isFinite(datum)) return null;
  let foot = datum;
  for (const ring of base.rings) for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) / grid.manifest.stepM));
    for (let j = 0; j < n; j++) {
      const h = grid.sample(a[0] + (c[0] - a[0]) * j / n, a[1] + (c[1] - a[1]) * j / n);
      if (h === null || !Number.isFinite(h)) return null;
      foot = Math.min(foot, h);
    }
  }
  const contour = (ring: P2[]) => ring.map(([x, z]) => new THREE.Vector2(x, z));
  const outer = contour(outline), inner = holes.map(contour);
  const indices = THREE.ShapeUtils.triangulateShape(outer, inner);
  const pts: P2[] = [...outer, ...inner.flat()].map(p => [p.x, p.y]);
  const triangles = indices.map(tri => tri.map(i => pts[i]));
  const b = new Builder();
  const region = (r: Rect, low: number, high: number, color: string, facade = concrete, soffit = false) =>
    volume(b, triangles, r, low, high, color, facade, soffit);
  const { minX, maxX, minZ, maxZ } = grid.manifest.bounds;
  const bottom = foot - datum - 0.8;
  // Low roofs around the halls follow the complete parent outline and both courtyards.
  region([minX, -961, minZ, maxZ], bottom, 7.5, '#c4bfb3', sand);
  region([-961, -580, minZ, maxZ], bottom, 21, '#b5b0a3', sand);
  region([-580, -554, minZ, -540], bottom, 21, '#c4bcab', sand);
  region([-580, -554, -540, maxZ], 18.6, 21, '#c8c7bd', sand, true);
  region([-554, maxX, minZ, maxZ], bottom, 21, '#c4bcab', sand);

  // C1–C4 share a long hall roof. BC closes only the north end of the dock court.
  region([-949, -819, -980, -694], 21, 28, membrane);
  region([-819, -795, -844, -694], 21, 28, membrane);
  region([-819, -762, -970, -831], 21, 26.2, '#d4d2c8');
  region([-910, -817, -672, -611], 21, 34, '#aba99e', sand);
  region([-961, -945, -927, -607], 21, 32, '#cdcec7');
  colonnade(b, bottom);

  // B1–B3 have a weathered membrane. B4–B5 continue north beneath a pale roof.
  region([-745, -614, -811, -561], 21, 31, membrane);
  region([-770, -610, minZ, -811], 21, 33.2, '#deded5');
  region([-614, -583, -809, -558], 21, 34.5, '#cfcdc1', sand);
  region([-659, -582, -558, -481], 21, 29.4, '#b6b3a7', sand);
  octagon(b, -621, -516.5, 60, 66, 13, 29.4, 38.8);
  // A1–A3, stepped meeting-room wing and the front auditorium.
  region([-555, -458, -808, -564], 21, 35, '#dadbd3', sand);
  region([-458, -429, -773, -553], 21, 38, '#c5c6bd', sand);
  region([-429, -391, -720, -549], 21, 30, '#d7d5c9', sand);
  region([-445, -392, -549, -483], 21, 30, '#bdbcb1', sand);
  octagon(b, -418, -518, 45, 58, 9, 30, 38);
  region([-554, -458, -560, -537], 21, 33, '#aaa9a0', sand);
  entrance(b, -503, -534, 80, 23, 33, 8, bottom);
  entrance(b, -689, -501, 45, 18, 30, 6, bottom);

  // Two observed rows across C and the long axes of A/B. Recessed grilles are drawn
  // on top of raised curbs so the mechanical plant remains legible from the tracks.
  function plant(x: number, z: number, y: number) {
    if (!inside(x, z)) return;
    b.box(4.5, 1.2, 6.0, x, y + 0.6, z, '#aeb2ac');
    b.box(3.4, 0.3, 4.5, x, y + 1.35, z, '#7f8886');
  }
  for (const x of [-914, -859]) for (let z = -938; z <= -704; z += 26) plant(x, z, 28);
  for (const x of [-702, -648]) for (let z = -1009; z <= -574; z += 43) plant(x, z, z < -811 ? 33.2 : 31);
  for (let z = -784; z <= -570; z += 37) plant(-485, z, 35);

  // Membrane seams cross the main roofs. Stop them short of the parapets.
  for (const [left, right, back, front, top] of [
    [-940, -823, -970, -703, 28], [-739, -620, -805, -569, 31],
    [-751, -620, -1016, -820, 33.2], [-550, -462, -755, -570, 35],
  ]) {
    for (let z = back + 12; z < front; z += 24) b.box(right - left, 0.10, 0.24, (right + left) / 2, top + 0.05, z, '#a9aaa4');
  }
  // Recesses opening onto the central loading yard, following its slightly skew walls.
  const yard = holes.find(h => pointInRing(-778, -750, h))!;
  for (let z = -787; z <= -635; z += 13) {
    for (let k = 0; k < yard.length; k++) {
      const a = yard[k], c = yard[(k + 1) % yard.length];
      if ((a[1] > z) === (c[1] > z)) continue;
      const x = a[0] + (c[0] - a[0]) * (z - a[1]) / (c[1] - a[1]);
      const level = grid.sample(x, z);
      if (level === null) continue;
      const inward = x < -770 ? 1 : -1;
      b.box(0.45, 4.1, 4.0, x + inward * 0.24, level - datum + 2.7, z, '#526067');
      b.box(0.9, 0.45, 5.5, x + inward * 0.46, level - datum + 5.0, z, '#a3a29a');
    }
  }
  const mesh = new THREE.Mesh(b.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.name = 'Georgia World Congress Center';
  mesh.position.y = datum - grid.manifest.vertical.sceneZeroNavd88M;
  mesh.castShadow = mesh.receiveShadow = true;
  return { group: mesh, buildings: buildings.filter(b => b !== base), apron: { kind: 'loading_apron', sub: null, name: null, rings: [yard] } };
}
