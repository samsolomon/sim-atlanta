import { StaticLandmarkMaterial } from '../materials/landmark-batch';
import * as THREE from 'three';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const arenaId = '274e7277-5fe9-4a57-9e5c-01a6e6458c8a';
const limestone = '#bba995',
  steel = '#dfe0da',
  glass = '#63828a',
  frame = '#a9b3ae';
const mix = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const xyz = ([x, z]: P2, y: number) => [x, y, z];

export function createStateFarmArena(
  buildings: VBuilding[],
  groundAt: (x: number, z: number) => number | null,
) {
  const arena = buildings.find((candidate) => candidate.id === arenaId);
  if (!arena || arena.rings.length !== 1) return null;
  const ring = arena.rings[0];
  // Fixed roof corners and curtain walls belong to this outline in the downtown bake.
  const anchors: P2[] = [
    [-512, -372],
    [-436, -439],
    [-374, -378],
    [-465, -297],
    [-444, -286],
  ];
  if (!anchors.every(([x, z]) => pointInRing(x, z, ring))) return null;
  const foot = groundAt(-515, -323);
  if (foot === null || !Number.isFinite(foot)) return null;
  const grades = ring.map(([x, z]) => groundAt(x, z));
  if (grades.some((y) => y === null || !Number.isFinite(y))) return null;
  const bottom = Math.min(...(grades as number[])) - foot - 1;
  const b = new Builder(),
    lobby = new Builder();
  function wall(a: P2, c: P2, low: number, high: number, color: string) {
    b.quad(xyz(a, low), xyz(c, low), xyz(c, high), xyz(a, high), color);
  }
  // Perimeter masonry with deep rectangular windows and the small triangular attic lights.
  function windowBays(a: P2, c: P2, bays: number) {
    const dx = c[0] - a[0],
      dz = c[1] - a[1],
      length = Math.hypot(dx, dz);
    const mid = mix(a, c, 0.5);
    const side = pointInRing(mid[0] + (dz / length) * 0.2, mid[1] - (dx / length) * 0.2, ring) ? -1 : 1;
    const at = (t: number, offset = 0.09): P2 => {
      const [x, z] = mix(a, c, t);
      return [x + ((side * dz) / length) * offset, z - ((side * dx) / length) * offset];
    };
    for (let i = 0; i < bays; i++) {
      const t = (i + 0.5) / bays,
        span = 0.34 / bays;
      const left = at(t - span),
        right = at(t + span);
      lobby.quad(xyz(left, 11.5), xyz(right, 11.5), xyz(right, 24.5), xyz(left, 24.5), glass);
      for (let j = 1; j < 5; j++) {
        const u = t - span + j * span * 0.4;
        wall(at(u - 0.0012, 0.15), at(u + 0.0012, 0.15), 11.5, 24.5, frame);
      }
      for (const y of [15, 19, 23]) wall(at(t - span, 0.16), at(t + span, 0.16), y, y + 0.22, frame);
      b.tri(xyz(at(t - 0.07 / bays), 26.2), xyz(at(t + 0.07 / bays), 26.2), xyz(at(t), 27.9), glass);
    }
  }
  const podium = 29;
  // Recess the wall behind the structural lettering. The low plinth retains the
  // mapped edge along the elevated street; the glass and roof sit behind that line.
  const body: P2[] = ring.map(([x, z]) => {
    const inset = Math.max(0, (x + 446) * 0.391 + (z + 284) * 0.92 + 5);
    return [x - 0.391 * inset, z - 0.92 * inset];
  });
  const verts = body.map(([x, z]) => new THREE.Vector2(x, z));
  for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(verts, []))
    b.tri(xyz(body[k], podium), xyz(body[j], podium), xyz(body[i], podium), '#d7d5cb');
  for (let i = 0; i < ring.length; i++) {
    const next = (i + 1) % ring.length;
    const a = body[i],
      c = body[next];
    const south = Math.min(a[1], c[1]) > -326;
    wall(ring[i], ring[next], bottom, 10.5, '#9e9588');
    b.quad(xyz(ring[i], 10.5), xyz(ring[next], 10.5), xyz(c, 10.5), xyz(a, 10.5), '#bdb7ac');
    wall(a, c, 10.5, podium - 0.55, south ? glass : limestone);
    wall(a, c, podium - 0.55, podium, steel);
    const length = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (!south && length > 24) windowBays(a, c, Math.max(1, Math.round(length / 19)));
  }

  // The aerial shows a diagonal span above three lower corner roofs. Its broad,
  // shallow arch ends in projecting sheet-metal blades on the station side.
  const west: P2 = [-514, -371],
    north: P2 = [-436, -443],
    east: P2 = [-374, -377],
    south: P2 = [-465, -294];
  const roof = (u: number, v: number): P2 => mix(mix(west, south, u), mix(north, east, u), v);
  const high = (u: number) => 39.5 + 8.1 * Math.sin(Math.PI * u) - 1.2 * u;
  for (let i = 0; i < 16; i++) {
    const u = i / 16,
      v = (i + 1) / 16;
    const a = roof(u, 0),
      c = roof(v, 0),
      d = roof(v, 1),
      e = roof(u, 1);
    b.quad(
      xyz(a, high(u)),
      xyz(c, high(v)),
      xyz(d, high(v)),
      xyz(e, high(u)),
      i % 4 === 0 ? '#c8c9c4' : '#d0d0ca',
    );
    for (const end of [0, 1]) {
      const p = roof(u, end),
        q = roof(v, end),
        inner = end === 0 ? 0.035 : 0.965;
      b.quad(xyz(p, high(u)), xyz(q, high(v)), xyz(q, high(v) - 0.8), xyz(p, high(u) - 0.8), steel);
      b.quad(
        xyz(p, high(u) - 0.8),
        xyz(q, high(v) - 0.8),
        xyz(roof(v, inner), high(v) - 0.8),
        xyz(roof(u, inner), high(u) - 0.8),
        '#a7aaa4',
      );
      b.quad(
        xyz(roof(u, inner), podium),
        xyz(roof(v, inner), podium),
        xyz(roof(v, inner), high(v) - 0.8),
        xyz(roof(u, inner), high(u) - 0.8),
        glass,
      );
    }
  }
  for (const u of [0, 1]) wall(roof(u, 0), roof(u, 1), podium, high(u), '#a5a8a2');

  // The dark ARENA lettering on the silver membrane follows the diagonal span.
  // Paint the strokes on the same faceted surface to avoid a floating sign.
  const glyphs: Record<string, number[][]> = {
    A: [
      [0, 0, 0.45, 1],
      [0.45, 1, 0.9, 0],
      [0.2, 0.4, 0.7, 0.4],
    ],
    R: [
      [0, 0, 0, 1],
      [0, 1, 0.7, 1],
      [0.7, 1, 0.9, 0.78],
      [0.9, 0.78, 0.7, 0.54],
      [0.7, 0.54, 0, 0.54],
      [0.44, 0.54, 0.94, 0],
    ],
    E: [
      [0, 0, 0, 1],
      [0, 1, 0.9, 1],
      [0, 0.52, 0.68, 0.52],
      [0, 0, 0.9, 0],
    ],
    N: [
      [0, 0, 0, 1],
      [0, 1, 0.9, 0],
      [0.9, 0, 0.9, 1],
    ],
  };
  function painted(u: number, v: number) {
    const strip = Math.floor(u * 16),
      f = u * 16 - strip;
    return xyz(roof(u, v), high(strip / 16) * (1 - f) + high((strip + 1) / 16) * f + 0.09);
  }
  for (const [index, letter] of Array.from('ARENA').entries()) {
    for (const [x, y, ex, ey] of glyphs[letter]) {
      const u = 0.32 + index * 0.059 + x * 0.051,
        v = 0.435 + y * 0.061;
      const du = (ex - x) * 0.051,
        dv = (ey - y) * 0.061;
      const length = Math.hypot(du * 89, dv * 115);
      const wu = ((-(dv * 115) / length) * 0.53) / 89,
        wv = (((du * 89) / length) * 0.53) / 115;
      b.quad(
        painted(u - wu, v - wv),
        painted(u + wu, v + wv),
        painted(u + du + wu, v + dv + wv),
        painted(u + du - wu, v + dv - wv),
        '#505551',
      );
    }
  }

  // Centennial's curved glazed lobby and its structural ATLANTA letters. The line
  // stays inside the jagged outer sidewalk edge. Dimensions are photographic estimates.
  const face = (t: number): P2 => mix([-446, -284], [-366, -318], t);
  const roofline = (t: number) => 37.5 - 8 * t + 2.2 * Math.sin(t * Math.PI);
  const front = (t: number, y: number, setback: number) => {
    const [x, z] = face(t);
    return [x - 0.39 * setback, y, z - 0.92 * setback];
  };
  for (let i = 0; i < 28; i++) {
    const t = i / 28,
      u = (i + 1) / 28;
    for (const [low, top] of [
      [10.5, 15],
      [15, 19],
      [19, 23],
      [23, 27],
    ]) {
      const pane = (i + Math.floor(low)) % 6 === 0 ? b : lobby;
      pane.quad(front(t, low, 1), front(u, low, 1), front(u, top, 1), front(t, top, 1), glass);
    }
    b.quad(front(t, 27, 1), front(u, 27, 1), front(u, roofline(u), 1), front(t, roofline(t), 1), glass);
    b.quad(
      front(t, 10.5, 0.85),
      front(t + 0.003, 10.5, 0.85),
      front(t + 0.003, roofline(t), 0.85),
      front(t, roofline(t), 0.85),
      frame,
    );
    for (const y of [15, 19, 23, 27])
      b.quad(front(t, y, 0.9), front(u, y, 0.9), front(u, y + 0.2, 0.9), front(t, y + 0.2, 0.9), frame);
    b.quad(
      front(t, roofline(t), 0),
      front(u, roofline(u), 0),
      front(u, roofline(u) + 0.8, 0),
      front(t, roofline(t) + 0.8, 0),
      steel,
    );
    b.quad(
      front(t, roofline(t) + 0.8, 0),
      front(u, roofline(u) + 0.8, 0),
      front(u, roofline(u) + 2, 18),
      front(t, roofline(t) + 2, 18),
      '#c3c5be',
    );
    b.quad(
      front(t, roofline(t) + 2, 18),
      front(u, roofline(u) + 2, 18),
      front(u, podium, 18),
      front(t, podium, 18),
      glass,
    );
  }
  for (const t of [0, 1]) {
    b.quad(
      front(t, 10.5, 1),
      front(t, roofline(t), 1),
      front(t, roofline(t) + 2, 18),
      front(t, 10.5, 18),
      glass,
    );
  }
  // Lift the structural strokes off the darker glazing. Each stroke is a rectangular member.
  function stroke(t0: number, y0: number, t1: number, y1: number) {
    const a = new THREE.Vector3(...front(t0, y0, -0.4)),
      c = new THREE.Vector3(...front(t1, y1, -0.4));
    const dir = c.clone().sub(a);
    const pose = new THREE.Matrix4().compose(
      a.clone().lerp(c, 0.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize()),
      new THREE.Vector3(1, 1, 1),
    );
    b.box(1.35, dir.length(), 1.35, 0, 0, 0, steel, pose);
  }
  for (const [i, letter] of Array.from('ATLANTA').entries()) {
    const start = 0.025 + i * 0.137,
      t = (x: number) => start + 0.117 * x;
    const low = 10.6,
      top = Math.min(low + 19.8, roofline(t(0.5)) - 1.2);
    if (letter === 'A') {
      stroke(t(0), low, t(0.5), top);
      stroke(t(0.5), top, t(1), low);
      stroke(t(0.24), (low + top) / 2, t(0.76), (low + top) / 2);
    } else if (letter === 'T') {
      stroke(t(0), top, t(1), top);
      stroke(t(0.5), low, t(0.5), top);
    } else if (letter === 'L') {
      stroke(t(0.1), top, t(0.1), low);
      stroke(t(0.1), low, t(1), low);
    } else {
      stroke(t(0), low, t(0), top);
      stroke(t(0), top, t(1), low);
      stroke(t(1), low, t(1), top);
    }
  }
  const mesh = new THREE.Mesh(
    b.geometry(),
    new StaticLandmarkMaterial(),
  );
  mesh.castShadow = mesh.receiveShadow = true;
  const group = new THREE.Group();
  group.name = 'State Farm Arena';
  group.position.y = foot;
  const glazing = new THREE.MeshLambertMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    emissive: '#f0c49b',
    emissiveIntensity: 0,
  });
  const windows = new THREE.Mesh(lobby.geometry(), glazing);
  windows.receiveShadow = true;
  group.add(mesh, windows);
  return {
    group,
    buildings: buildings.filter((candidate) => candidate !== arena),
    setNight(dark: number) {
      glazing.emissiveIntensity = 0.46 * dark;
    },
  };
}
