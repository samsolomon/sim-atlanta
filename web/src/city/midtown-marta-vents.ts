import { CanvasTexture, DoubleSide, Group, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { Builder, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

type Ground = (x: number, z: number) => number | null;

export const ELECTRIC_SATURATION_ID = 'osm:way:269843688';
// OSM way 1430110648, the low striped ventilation shaft at the south-east corner.
const SHAFT: P2[] = [
  [478.9, -3141.8],
  [473.1, -3141.9],
  [473.0, -3136.4],
  [478.8, -3136.3],
];
// Colours estimated from the daytime photographs (Midtown Alliance, MARTA Artbound).
const PALETTE = [
  '#1e2240',
  '#2a5fd0',
  '#35b5e5',
  '#14a89a',
  '#2db34a',
  '#f2d21e',
  '#f5791f',
  '#e0262b',
  '#d42a8a',
  '#7a3fb0',
  '#f0eee6',
];
export const WALL_ABOVE_HIGH_GRADE = 5.6;

/**
 * Hard-edged motifs in the manner of the 2024 mural: concentric arcs, discs,
 * diagonal triangles, crescents and vertical bands. The arrangement is
 * illustrative; the palette and vocabulary follow the photographs.
 */
// The north end is mostly navy with blue arcs and one orange vertical stripe.
const NORTH = ['#1e2240', '#1e2240', '#2a5fd0', '#35b5e5', '#1e2240', '#2a5fd0'];

function paintMural(widthM: number, heightM: number, seed: number, north = false) {
  const ppm = 36;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(64, Math.round(widthM * ppm));
  canvas.height = Math.max(64, Math.round(heightM * ppm));
  const ctx = canvas.getContext('2d')!;
  const random = rng(seed);
  const colors = north ? NORTH : PALETTE;
  const pick = () => colors[Math.floor(random() * colors.length)];
  const H = canvas.height;
  let x = 0;
  while (x < canvas.width) {
    const w = Math.min(canvas.width - x, Math.round((2.2 + random() * 3.2) * ppm));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, 0, w, H);
    ctx.clip();
    ctx.fillStyle = pick();
    ctx.fillRect(x, 0, w, H);
    const kind = north ? Math.floor(random() * 2) : Math.floor(random() * 5);
    const cx = x + w / 2;
    if (kind === 0) {
      // Concentric rainbow arcs rising from the base or hanging from the parapet.
      const up = random() < 0.6,
        r0 = Math.max(w, H * 0.8);
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.fillStyle = colors[(i * 3 + Math.floor(random() * 2)) % colors.length];
        ctx.arc(cx, up ? H : 0, r0 * (1 - i / 6.5), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (kind === 1) {
      // Large half disc with a smaller disc ("dot and crescent").
      ctx.beginPath();
      ctx.fillStyle = pick();
      ctx.arc(x + (random() < 0.5 ? 0 : w), H * (0.3 + random() * 0.4), w * 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = pick();
      ctx.arc(cx, H * 0.3, Math.min(w, H) * 0.16, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 2) {
      // Diagonal triangles.
      for (let i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.fillStyle = pick();
        ctx.moveTo(x + (i ? w : 0), 0);
        ctx.lineTo(x + (i ? 0 : w), H * (0.5 + random() * 0.5));
        ctx.lineTo(x + (i ? w : 0), H);
        ctx.fill();
      }
    } else if (kind === 3) {
      // Stacked crescents.
      const n = 3 + Math.floor(random() * 2),
        r = Math.min(w / (n * 0.9), H * 0.35);
      for (let i = 0; i < n; i++) {
        const px = x + (i + 0.5) * (w / n);
        ctx.beginPath();
        ctx.fillStyle = pick();
        ctx.arc(px, H * 0.55, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle = PALETTE[0];
        ctx.arc(px + r * 0.35, H * 0.55, r * 0.85, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Vertical bands.
      const n = 4 + Math.floor(random() * 4);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = pick();
        ctx.fillRect(x + (i * w) / n, 0, w / n + 1, H);
      }
    }
    ctx.restore();
    x += w;
  }
  if (north) {
    ctx.fillStyle = '#f5791f';
    ctx.fillRect(Math.round(canvas.width * 0.62), 0, Math.round(0.5 * ppm), H);
  }
  // Board-formed concrete grain shows through the paint as faint vertical lines.
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let px = 0; px < canvas.width; px += Math.round(0.3 * ppm)) ctx.fillRect(px, 0, 1, H);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  return map;
}

/**
 * MARTA's concrete service building on Peachtree Walk, painted in 2024 by Jessie
 * Unterhalter and Katey Truhn as "Electric Saturation". The windowless box stands
 * over the North Line tunnel. Its low striped shaft sits at the south-east corner.
 */
export function createElectricSaturation(buildings: VBuilding[], site: VBuilding, ground: Ground) {
  if (site.id !== ELECTRIC_SATURATION_ID || site.rings.length !== 1) return null;
  const ring = site.rings[0];
  // Take the four corners from the ring's extremes so a small re-survey still matches.
  const extreme = (fx: number, fz: number) =>
    ring.reduce((best, p) => (p[0] * fx + p[1] * fz > best[0] * fx + best[1] * fz ? p : best));
  const sw = extreme(-1, 1),
    se = extreme(1, 1),
    ne = extreme(1, -1),
    nw = extreme(-1, -1);
  if (new Set([sw, se, ne, nw]).size !== 4) return null;
  const grades = [sw, se, ne, nw].map(([x, z]) => ground(x, z));
  if (!grades.every((g): g is number => g !== null)) return null;
  // The footings reach below the lowest corner; the parapet is level.
  const base = Math.min(...grades) - 0.4,
    top = Math.max(...grades) + WALL_ABOVE_HIGH_GRADE;
  const body = new Builder(),
    lights = new Builder();
  const concrete = '#8c8a84';
  // Walls and flat roof with a slight parapet lip.
  const plan = [sw, se, ne, nw];
  for (let i = 0; i < 4; i++) {
    const [x, z] = plan[i],
      [a, b] = plan[(i + 1) % 4];
    body.quad([x, base, z], [x, top, z], [a, top, b], [a, base, b], concrete);
  }
  body.tri([sw[0], top - 0.12, sw[1]], [ne[0], top - 0.12, ne[1]], [se[0], top - 0.12, se[1]], '#a7a397');
  body.tri([sw[0], top - 0.12, sw[1]], [nw[0], top - 0.12, nw[1]], [ne[0], top - 0.12, ne[1]], '#a7a397');
  const group = new Group();
  group.name = 'Electric Saturation';
  // Mural panels: south, east (Peachtree Walk) and north faces. The west face, beside
  // the garage, was not visible in any photograph and stays plain concrete.
  function panel(a: P2, b: P2, seed: number, north = false) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / len,
      dz = (b[1] - a[1]) / len;
    // Outward normal for a counter-clockwise walk in (x, z) seen from above with z south.
    const nx = dz,
      nz = -dx;
    const ga = ground(a[0], a[1])!,
      gb = ground(b[0], b[1])!;
    const lo = Math.min(ga, gb) - 0.2,
      h = top - 0.05 - lo;
    const material = new MeshLambertMaterial({
      map: paintMural(len, h, seed, north),
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });
    material.addEventListener('dispose', () => material.map?.dispose());
    const mesh = new Mesh(new PlaneGeometry(len, h), material);
    mesh.position.set((a[0] + b[0]) / 2 + nx * 0.06, lo + h / 2, (a[1] + b[1]) / 2 + nz * 0.06);
    mesh.rotation.y = Math.atan2(nx, nz); // Front face outward.
    mesh.name = 'Electric Saturation mural';
    mesh.receiveShadow = true;
    group.add(mesh);
    return { dx, dz, nx, nz, len };
  }
  const south = panel(se, sw, 11),
    east = panel(ne, se, 23);
  panel(nw, ne, 37, true);
  // High horizontal louvres on the south face (painted over, so slightly darker bands).
  const louvreY = top - 1.9;
  for (let i = 0; i < 6; i++) {
    const cx = se[0] + south.dx * south.len * 0.72,
      cz = se[1] + south.dz * south.len * 0.72;
    body.box(2.4, 0.08, 0.14, cx, louvreY + i * 0.22, cz + south.nz * 0.12, '#262a3a');
  }
  // Two roll-up doors on the east face (one painted orange), and wall packs at 3.5 m.
  for (const [along, color] of [
    [0.18, '#3b4a8c'],
    [0.55, '#e8752a'],
  ] as const) {
    const px = ne[0] + east.dx * east.len * along + east.nx * 0.1,
      pz = ne[1] + east.dz * east.len * along + east.nz * 0.1;
    const g = ground(px, pz);
    if (g === null) continue;
    body.box(0.12, 3.7, 3.2, px, g + 1.85, pz, color);
  }
  for (const along of [0.1, 0.4, 0.75]) {
    const px = ne[0] + east.dx * east.len * along + east.nx * 0.18,
      pz = ne[1] + east.dz * east.len * along + east.nz * 0.18;
    const g = ground(px, pz);
    if (g !== null) lights.box(0.2, 0.18, 0.3, px, g + 3.5, pz, '#fff4dc');
  }
  for (const along of [0.3, 0.65]) {
    const px = se[0] + south.dx * south.len * along + south.nx * 0.18,
      pz = se[1] + south.dz * south.len * along + south.nz * 0.18;
    const g = ground(px, pz);
    if (g !== null) lights.box(0.3, 0.18, 0.2, px, g + 3.5, pz, '#fff4dc');
  }
  // The shaft: a low box painted in vertical stripes of navy alternating with colour.
  const shaftGrades = SHAFT.map(([x, z]) => ground(x, z));
  if (shaftGrades.every((g): g is number => g !== null)) {
    const sBase = Math.min(...shaftGrades) - 0.3,
      sTop = Math.max(...shaftGrades) + 1.7;
    const stripes = ['#7a3fb0', '#2a5fd0', '#14a89a', '#2db34a', '#35b5e5'];
    let k = 0;
    for (let i = 0; i < 4; i++) {
      const [x, z] = SHAFT[i],
        [a, b] = SHAFT[(i + 1) % 4];
      const n = Math.max(2, Math.round(Math.hypot(a - x, b - z) / 0.45));
      for (let j = 0; j < n; j++) {
        const t0 = j / n,
          t1 = (j + 1) / n;
        const p0: P2 = [x + (a - x) * t0, z + (b - z) * t0],
          p1: P2 = [x + (a - x) * t1, z + (b - z) * t1];
        const color = k++ % 2 ? '#1e2240' : stripes[(k >> 1) % stripes.length];
        body.quad([p0[0], sBase, p0[1]], [p0[0], sTop, p0[1]], [p1[0], sTop, p1[1]], [p1[0], sBase, p1[1]], color);
      }
    }
    // Grated top (estimated; no photograph shows it).
    body.tri([SHAFT[0][0], sTop, SHAFT[0][1]], [SHAFT[2][0], sTop, SHAFT[2][1]], [SHAFT[1][0], sTop, SHAFT[1][1]], '#3a3c40');
    body.tri([SHAFT[0][0], sTop, SHAFT[0][1]], [SHAFT[3][0], sTop, SHAFT[3][1]], [SHAFT[2][0], sTop, SHAFT[2][1]], '#3a3c40');
  }
  // Black welded-mesh fence, about 1.2 m, enclosing the paved apron along the Walk.
  // The mapped Walk footway runs at x 476.1-476.6, so the fence stands on the apron's
  // outer edge just west of it and stops at the shaft.
  const fenceX = Math.max(ne[0], se[0]) + 2,
    z0 = ne[1] + 0.5,
    z1 = SHAFT[1][1] - 0.3;
  const posts = Math.max(1, Math.round((z1 - z0) / 2.4)),
    step = (z1 - z0) / posts;
  for (let i = 0; i <= posts; i++) {
    const z = z0 + i * step,
      g = ground(fenceX, z);
    if (g === null) continue;
    body.box(0.06, 1.2, 0.06, fenceX, g + 0.6, z, '#1c1d1f');
    if (i === posts) break;
    const gm = ground(fenceX, z + step / 2) ?? g;
    body.box(0.03, 0.05, step, fenceX, gm + 1.17, z + step / 2, '#1c1d1f');
    body.box(0.03, 0.05, step, fenceX, gm + 0.15, z + step / 2, '#1c1d1f');
  }
  const shell = new Mesh(body.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  shell.castShadow = shell.receiveShadow = true;
  const lamps = new Mesh(
    lights.geometry(),
    new MeshLambertMaterial({ vertexColors: true, emissive: '#fff1d4', emissiveIntensity: 0 }),
  );
  group.add(shell, lamps);
  return {
    group,
    buildings: buildings.filter((b) => b !== site),
    setNight(night: number) {
      lamps.material.emissiveIntensity = night * 0.9;
    },
  };
}

// Ventilation structures over the North Line known only from OSM outlines and
// aerial imagery; no ground-level photograph was found. Forms are inferred.
// OSM way 1035352568: one-storey MARTA fan house at 1075 Peachtree Walk.
const FAN_HOUSE: P2[] = [
  [455.4, -3378.9],
  [455.5, -3397.3],
  [471.0, -3397.2],
  [470.8, -3375.2],
  [459.2, -3375.3],
  [459.2, -3378.9],
];
// OSM way 1035352566: plaza grate on 5th Street at Cypress Street.
const FIFTH_GRATE: P2[] = [
  [494.5, -2470.2],
  [494.9, -2474.3],
  [505.3, -2473.6],
  [505.0, -2469.3],
];
export const PEACHTREE_PLACE_SHAFT_ID = 'osm:way:269843682';

function inside(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, ring: P2[]) {
  const x = ring.reduce((a, p) => a + p[0], 0) / ring.length,
    z = ring.reduce((a, p) => a + p[1], 0) / ring.length;
  return x >= bounds.minX && x < bounds.maxX && z >= bounds.minZ && z < bounds.maxZ;
}

function slab(body: Builder, ring: P2[], lo: number, hi: number, wall: string, roof: string) {
  for (let i = 0; i < ring.length; i++) {
    const [x, z] = ring[i],
      [a, b] = ring[(i + 1) % ring.length];
    body.quad([x, lo, z], [x, hi, z], [a, hi, b], [a, lo, b], wall);
  }
  for (let i = 1; i < ring.length - 1; i++)
    body.tri([ring[0][0], hi, ring[0][1]], [ring[i + 1][0], hi, ring[i + 1][1]], [ring[i][0], hi, ring[i][1]], roof);
}

function grade(ring: P2[], ground: Ground) {
  const g = ring.map(([x, z]) => ground(x, z));
  return g.every((v): v is number => v !== null) ? { lo: Math.min(...g), hi: Math.max(...g) } : null;
}

function fanHouse(body: Builder, lights: Builder, ground: Ground) {
  const g = grade(FAN_HOUSE, ground);
  if (!g) return false;
  const base = g.lo - 0.4,
    roof = g.hi + 5,
    annex = g.hi + 3.4;
  // Main block north of the step, the lighter annex strip along the south edge.
  slab(body, [FAN_HOUSE[0], FAN_HOUSE[1], FAN_HOUSE[2], [470.9, -3378.9]], base, roof, '#a39a8a', '#8a735a');
  slab(body, [[459.2, -3378.9], [470.9, -3378.9], FAN_HOUSE[3], FAN_HOUSE[4]], base, annex, '#b3ab9c', '#c4bcae');
  // Three round fan hoods in a darker recessed band along the north edge.
  body.box(15, 0.12, 4.6, 463.2, roof + 0.02, -3394.6, '#4f4a44');
  for (const x of [458.6, 463.2, 467.8]) {
    for (let k = 0; k < 12; k++) {
      const a0 = (k / 12) * Math.PI * 2,
        a1 = ((k + 1) / 12) * Math.PI * 2,
        r = 1.75;
      const p = (a: number, y: number) => [x + Math.cos(a) * r, y, -3394.6 + Math.sin(a) * r];
      body.quad(p(a0, roof), p(a0, roof + 0.9), p(a1, roof + 0.9), p(a1, roof), '#77736c');
      body.tri([x, roof + 0.88, -3394.6], p(a1, roof + 0.88), p(a0, roof + 0.88), '#2b2b2c');
    }
  }
  // A single door lamp on the annex, as on other MARTA service doors (inferred).
  lights.box(0.25, 0.2, 0.2, 465, g.hi + 2.6, -3375.0, '#fff1d4');
  return true;
}

function flushGrate(body: Builder, ring: P2[], ground: Ground, height: number) {
  const g = grade(ring, ground);
  if (!g) return false;
  slab(body, ring, g.lo - 0.2, g.hi + height, '#8f8d86', '#5f6062');
  return true;
}

/** Vent structures the row data does not carry as buildings. Each row adds its own. */
export function midtownVents(bounds: { minX: number; maxX: number; minZ: number; maxZ: number }, ground: Ground) {
  const body = new Builder(),
    lights = new Builder();
  let any = false;
  if (inside(bounds, FAN_HOUSE)) any = fanHouse(body, lights, ground) || any;
  if (inside(bounds, FIFTH_GRATE)) any = flushGrate(body, FIFTH_GRATE, ground, 0.15) || any;
  if (!any) return null;
  const group = new Group();
  group.name = 'Midtown MARTA vents';
  const shell = new Mesh(body.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  shell.castShadow = shell.receiveShadow = true;
  const lamps = new Mesh(lights.geometry(), new MeshLambertMaterial({ vertexColors: true, emissive: '#fff1d4', emissiveIntensity: 0 }));
  group.add(shell, lamps);
  return {
    group,
    buildings: [] as VBuilding[],
    setNight(night: number) {
      lamps.material.emissiveIntensity = night * 0.9;
    },
  };
}

/** The low grated shaft box against the Nine15 garage, mapped as a generic building. */
export function createPeachtreePlaceShaft(buildings: VBuilding[], site: VBuilding, ground: Ground) {
  if (site.id !== PEACHTREE_PLACE_SHAFT_ID || site.rings.length !== 1) return null;
  const body = new Builder();
  if (!flushGrate(body, site.rings[0] as P2[], ground, 1.1)) return null;
  const group = new Group();
  group.name = 'Peachtree Place vent shaft';
  const shell = new Mesh(body.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  return { group, buildings: buildings.filter((b) => b !== site), setNight() {} };
}
