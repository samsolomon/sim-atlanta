import * as THREE from 'three';
import { makeProjector } from '../core/scene-data';
import type { TrainState } from '../model/types';
import { Builder, Line, segDist, type P2 } from '../vignette/geom';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import {
  consistLength,
  dimensions,
  formation,
  layout,
  passengerGeometry,
  passengerMaterial,
} from '../vignette/crescent-stock';
import survey from './fixtures/brookwood.json';
import { corridor, corridorGrade, corridorGrids } from './brookwood-corridor';
import { createNorcrossFreight } from './brookwood-freight';

const project = makeProjector({ lon: -84.3916, lat: 33.7539 });
const main = new Line(survey.main1 as P2[]);
const platform = survey.platform as P2[];
const bridge = new Line(survey.bridge as P2[]);
const depot = survey.depot as P2[];
export const brookwoodBounds = { minX: -575, maxX: 410, minZ: -5490, maxZ: -4550 };

// Open rail samples (City x, NAVD88 m). Bridge floors and rooftops are excluded.
// The corridor anchors continue the mapped mains at grade to the board edges.
const grade = [
  ...corridorGrade.west,
  [-575, 271.5],
  [-370.5, 267.9],
  [-244.8, 266.5],
  [-118.2, 264.8],
  [-44.2, 264.2],
  [9, 264],
  [65.2, 263.5],
  [236.5, 261.3],
  [410, 258.9],
  ...corridorGrade.east,
];
/** Interpolated track bed (NAVD88 m) along the Brookwood corridor. */
export function brookwoodBedNavd88M(x: number) {
  return elevation(x);
}
function elevation(x: number) {
  const i = grade.findIndex((p) => p[0] >= x);
  if (i < 0) return grade[grade.length - 1][1];
  if (!i) return grade[0][1];
  const [a, h] = grade[i - 1],
    [b, k] = grade[i];
  return h + ((k - h) * (x - a)) / (b - a);
}

// Cap the bare-earth surface at track grade in the rail corridor. The lidar raster
// climbs onto bridges at the depot and remains below the rail viaduct farther west.
export function brookwoodGrid(manifest: GroundManifest, bytes: ArrayBuffer) {
  const data = new DataView(bytes.slice(0));
  const { bounds, stepM, cols, rows, scaleM, offsetM, noData } = manifest;
  const tracks = [corridor.main1.pts, corridor.main2.pts, survey.steelLead as P2[], corridor.siding.pts];
  const segments = tracks.flatMap(line => line.slice(1).map((b, i) => {
    const a = line[i];
    return { a, b, minX: Math.min(a[0], b[0]) - 16, maxX: Math.max(a[0], b[0]) + 16,
      minZ: Math.min(a[1], b[1]) - 16, maxZ: Math.max(a[1], b[1]) + 16 };
  }));
  for (let row = 0; row < rows; row++) {
    const z = bounds.minZ + row * stepM;
    for (let col = 0; col < cols; col++) {
      const x = bounds.minX + col * stepM;
      const surveyed = x >= brookwoodBounds.minX && x <= brookwoodBounds.maxX &&
        z >= brookwoodBounds.minZ && z <= brookwoodBounds.maxZ;
      // Outside the survey box but within its x range the terrain is left as staged.
      if (!surveyed && x >= brookwoodBounds.minX && x <= brookwoodBounds.maxX) continue;
      const offset = 2 * (row * cols + col),
        sample = data.getInt16(offset, true);
      if (sample === noData) continue;
      const h = sample * scaleM + offsetM,
        bed = elevation(x) - 0.16;
      // Inside the survey, lower terrain beneath the railway bridge is retained. The
      // survey's open-track ends blend into the filled continuations.
      const fills = !surveyed || x < brookwoodBounds.minX + 20 || x > brookwoodBounds.maxX - 20;
      if (fills ? Math.abs(h - bed) < 0.01 : h <= bed) continue;
      let gap = Infinity;
      for (const g of segments) {
        if (x < g.minX || x > g.maxX || z < g.minZ || z > g.maxZ) continue;
        gap = Math.min(gap, segDist(x, z, g.a, g.b));
      }
      // Beyond the survey the mapped track is at grade: fill shallow dips under the
      // ballast as well as trimming high ground beside it. Stay within 6 m there so the
      // parallel MARTA North Line, 10.8 m away at its closest, keeps its staged ground.
      const reach = surveyed && !(fills && h < bed) ? 16 : 6;
      if (gap >= reach) continue;
      if (h < bed && !fills) continue;
      const f = Math.min(1, (reach - gap) / (reach === 16 ? 6 : 2));
      data.setInt16(offset, Math.round((h + f * (bed - h) - offsetM) / scaleM), true);
    }
  }
  const graded = new GroundGrid(manifest, data.buffer);
  corridorGrids.add(graded);
  return graded;
}

// The Crescent follows Main 1 joined to its mapped continuations. Chainage keeps the
// survey's origin: negative values run west of x −575, values past the survey's end run
// northeast. Signed extension past the board edges lets a consist leave one car at a time.
const route = new Line(corridor.main1.pts);
const westLength = route.cum[corridor.main1.west.length - 1];
export const corridorChainage = { min: -westLength, max: route.length - westLength };
function chainage(x: number, z: number) {
  let distance = Infinity,
    along = 0;
  for (let i = 0; i + 1 < route.pts.length; i++) {
    const [a, b] = route.pts[i],
      [c, d] = route.pts[i + 1];
    const length = route.cum[i + 1] - route.cum[i];
    const projection = ((x - a) * (c - a) + (z - b) * (d - b)) / length;
    const t = Math.min(i + 2 === route.pts.length ? Infinity : length, Math.max(i ? 0 : -Infinity, projection));
    const gap = Math.hypot(x - a - ((c - a) * t) / length, z - b - ((d - b) * t) / length);
    if (gap < distance) {
      along = route.cum[i] + t;
      distance = gap;
    }
  }
  return { along: along - westLength, distance };
}
/** Truck position at a Main 1 chainage. Beyond the board edges the baseline stays rigid. */
export function brookwoodTruckAt(s: number) {
  const u = s + westLength, clamped = THREE.MathUtils.clamp(u, 0, route.length);
  const p = route.at(clamped), beyond = u - clamped;
  return { x: p.x + beyond * p.dx, z: p.z + beyond * p.dz };
}


const atl = chainage(...project(-84.392477, 33.799445)).along;
const platformEnd = chainage(...platform[1]).along;
export function crescentPlacement(t: TrainState) {
  if (t.routeId !== 'amtrak:route:Crescent' || t.s.tier !== 'scheduled') return;
  const [x, z] = project(t.lon, t.lat);
  if (x < -1300 || x > 1000 || z < -5950 || z > -3950) return;
  const { along, distance } = chainage(x, z);
  // Past a board edge the timetable shape bends away from the extended tangent.
  const offBoard = along < corridorChainage.min || along > corridorChainage.max;
  if (distance > (offBoard ? 120 : 35)) return;
  const p = route.at(THREE.MathUtils.clamp(along + westLength, 0, route.length)),
    heading = (t.heading * Math.PI) / 180;
  const dir = Math.sin(heading) * p.dx - Math.cos(heading) * p.dz >= 0 ? 1 : -1;

  // Move the whole consist toward the usable island as it approaches the GTFS point.
  // Smooth over 500 m so that even a full-length model keeps moving in trip order.
  const f = Math.max(0, 1 - Math.abs(along - atl) / 500);
  const shift = (platformEnd - consistLength / 2 - atl) * f * f * (3 - 2 * f);
  return { center: along + shift, dir, units: formation.length };
}

function frame(x: number, y: number, z: number, dx: number, dz: number) {
  return new THREE.Matrix4().makeRotationY(Math.atan2(dx, dz)).setPosition(x, y, z);
}
function solid(b: Builder, ring: P2[], bottom: number, top: number, color: string) {
  const shape = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: top - bottom, bevelEnabled: false });
  g.rotateX(-Math.PI / 2).translate(0, bottom, 0);
  b.addGeometry(g, color);
  g.dispose();
}

function station(b: Builder, lamps: Builder, litPlatform: Builder, zero: number) {
  const floor = 273 - zero;
  const forecourt: P2[] = [
    [-115, -5073],
    [-60, -5101],
    [-31, -5051],
    [-88, -5039],
    [-110, -5049],
  ];
  solid(b, forecourt, floor - 1.1, floor - 0.18, '#aca79a');
  solid(b, depot, floor - 0.19, floor + 6.15, '#9b6047');
  solid(b, depot, floor + 6.15, floor + 6.85, '#dbcca6');
  solid(b, depot, floor + 6.85, floor + 7.15, '#4d5549');
  solid(b, depot, floor + 7.15, floor + 7.3, '#bcb6a9');
  const entrance = new Line([depot[1], depot[2]]),
    middle = entrance.at(entrance.length / 2);
  const hall = frame(middle.x, floor, middle.z, middle.dx, middle.dz);
  // Low hipped roof above the rectangular waiting hall; the service wing has a flat roof.
  const roof = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(hall).toArray();
  const south = -entrance.length / 2 - 0.75,
    north = entrance.length / 2 + 0.75;
  const corners = [
    roof(0.75, 7.21, south),
    roof(0.75, 7.21, north),
    roof(-14.25, 7.21, north),
    roof(-14.25, 7.21, south),
  ];
  const ridges = [roof(-6.75, 8.78, south + 7), roof(-6.75, 8.78, north - 7)];
  b.quad(corners[0], corners[1], ridges[1], ridges[0], '#555c56');
  b.quad(corners[2], corners[3], ridges[0], ridges[1], '#515651');
  b.tri(corners[1], corners[2], ridges[1], '#5f655b');
  b.tri(corners[3], corners[0], ridges[0], '#62665c');
  for (const [from, to, count] of [
    [1, 2, 3],
    [0, 1, 1],
    [2, 3, 1],
  ] as const) {
    const face = new Line([depot[from], depot[to]]);
    for (let i = 0; i < count; i++) {
      const p = face.at(((i + 0.5) * face.length) / count),
        m = frame(p.x, floor, p.z, p.dx, p.dz);
      b.box(0.52, 0.2, 5, 0.12, 3.78, 0, '#ddcfb4', m);
      for (const side of [-1, 1]) {
        b.box(0.36, 3.55, 0.3, 0.24, 1.81, side * 2.08, '#d4c5a9', m);
        b.box(0.48, 0.19, 0.46, 0.24, 0.16, side * 2.08, '#dfd4bb', m);
      }
      if (from === 2) b.box(2.15, 0.2, 4.4, 1.05, 3, 0, '#5d7165', m);
    }
  }
  // Projecting eaves, dentils and cream pilasters give the pavilion a readable silhouette.
  for (let i = 1; i < depot.length; i++) {
    const face = new Line([depot[i - 1], depot[i]]);
    const p = face.at(face.length / 2);
    const m = frame(p.x, floor, p.z, p.dx, p.dz);
    b.box(1.4, 0.25, face.length + 0.65, 0, 7.08, 0, '#444e42', m);
    b.box(0.65, 0.2, face.length + 0.2, 0, 6.67, 0, '#e8d7b3', m);
    for (let z = -face.length / 2 + 0.4; z < face.length / 2; z += 0.78)
      b.box(0.87, 0.25, 0.18, 0, 6.85, z, '#7d8070', m);
  }
  // Brick and concrete supports sit on the outer sides of the train opening.
  for (const [x, z] of [
    [-92, -5069],
    [-103, -5064],
    [-54, -5070],
  ]) {
    const bed = elevation(x) - zero;
    b.box(1.3, floor - bed, 1.8, x, (floor + bed) / 2, z, '#918778');
  }
  // Parking stalls and lamps along the Peachtree entrance.
  const front = new Line([depot[1], depot[2]]);
  for (let s = 1; s < front.length; s += 2.8) {
    const p = front.at(s),
      m = frame(p.x, floor, p.z, p.dx, p.dz);
    b.box(4.4, 0.035, 0.1, 5.5, -0.14, 0, '#d1c9af', m);
  }
  for (const s of [4, front.length - 4]) {
    const p = front.at(s),
      m = frame(p.x, floor, p.z, p.dx, p.dz);
    b.box(0.18, 3.7, 0.18, 3, 1.8, 0, '#45564a', m);
    lamps.box(0.38, 0.48, 0.38, 3, 3.83, 0, '#eee8cf', m);
    b.box(0.48, 0.13, 0.48, 3, 4.13, 0, '#45564a', m);
  }
  const island = new Line([[...platform[0]], [...platform[3]]]);
  const tread = (s: number) => elevation(island.at(s).x) - zero + 0.53;
  // Follow the measured taper between the two polygon edges.
  const mappedEdge = new Line([platform[1], platform[2]]);
  // OSM's independently digitized lip comes within 1.2 m of Main 1 in the middle.
  // Shift the lip inward locally to clear the model's 1.5 m half-width.
  const edgePoints: P2[] = [];
  for (let s = 0; ; s = Math.min(s + 5, mappedEdge.length)) {
    const p = mappedEdge.at(s),
      rail = chainage(p.x, p.z),
      track = main.at(rail.along);
    const scale = Math.max(1, 1.65 / rail.distance);
    edgePoints.push([track.x + (p.x - track.x) * scale, track.z + (p.z - track.z) * scale]);
    if (s === mappedEdge.length) break;
  }
  const facing = new Line(edgePoints);
  for (let s = 0; s < island.length; s += 5) {
    const end = Math.min(s + 5, island.length);
    const a = island.at(s),
      b1 = facing.at((s / island.length) * facing.length);
    const c = facing.at((end / island.length) * facing.length),
      d = island.at(end);
    const slab = s >= 15 && end <= 95 ? litPlatform : b;
    slab.quad([a.x, tread(s), a.z], [b1.x, tread(s), b1.z], [c.x, tread(end), c.z], [d.x, tread(end), d.z], '#bab7a5');
  }
  for (const edge of [island, facing]) {
    b.wall(
      edge,
      0,
      (s) => elevation(edge.at(s).x) - zero,
      (s) => elevation(edge.at(s).x) - zero + 0.53,
      '#847e70',
    );
    b.ribbon(edge, 0.16, (_, x) => elevation(x) - zero + 0.55, '#d2af5d');
  }
  for (let s = 19; s < 92; s += 8) {
    const p = island.at(s),
      m = frame(p.x + p.nx * 1.85, tread(s), p.z + p.nz * 1.85, p.dx, p.dz);
    // The soffit fixtures illuminate the platform lip and the canopy fascia on both sides.
    lamps.box(3.5, 0.06, 0.46, 0, 3.38, 0, '#ffeed8', m);
    b.box(0.2, 3.6, 0.22, 0, 1.8, 0, '#64796c', m);
    b.box(4.1, 0.18, 0.18, 0, 3.45, 0, '#738478', m);
    b.box(4.25, 0.24, 8.02, 0, 3.7, 0, '#6b8073', m);
    lamps.box(0.25, 0.1, 1.5, 0.6, 3.53, 0, '#ffeece', m);
  }
  const p = island.at(0);
  const access = frame(p.x + p.nx * 1.9, floor, p.z + p.nz * 1.9, p.dx, p.dz);
  b.box(1.6, 8.4, 2.4, -0.85, -4.2, -0.7, '#857f71', access);
  for (let i = 0; i < 46; i++) {
    const top = (-(i + 1) * (floor - tread(14))) / 46;
    b.box(1.65, 0.24, 0.34, 0.83, top - 0.12, i * 0.32, '#bbb4a3', access);
  }
  // Bed-to-deck clearance is an estimate. NBI measures the highway underneath.
  b.ribbon(bridge, 34, () => floor, '#7f817c');
  // The DEM drops below street grade at both abutments. Join the deck to the first
  // on-street sample beyond each bank, following the mapped approach centreline.
  const approaches: { points: P2[]; bank: number }[] = [
    { points: [bridge.pts[0], [10.64, -4988.6], [32.25, -4966.97]], bank: 274.04 },
    { points: [bridge.pts.at(-1)!, [-69, -5105.52], [-72, -5110]], bank: 272.88 },
  ];
  for (const approach of approaches) {
    const line = new Line(approach.points),
      bank = approach.bank - zero;
    const height = (s: number) => floor + ((bank + 0.12 - floor) * s) / line.length;
    b.ribbon(line, 31, height, '#7f817c');
    for (const d of [-15, 15]) b.ribbon(line.offset(d), 3.1, (s) => height(s) + 0.12, '#c5bdac');
  }
  // Twenty minor ribs and two 30-foot gateway arches over the paired sidewalks.
  // The ribs lean across each walkway; the long outer bow ties their silhouette together.
  for (const side of [-1, 1]) {
    function arch(from: number, span: number, rise: number, lean: number, radius: number) {
      const curve: THREE.Vector3[] = [];
      for (let j = 0; j <= 16; j++) {
        const t = j / 16,
          bow = 4 * t * (1 - t),
          p = bridge.at(from + t * span);
        const offset = side * (16.3 - lean * bow);
        curve.push(new THREE.Vector3(p.x - p.nx * offset, floor + 0.55 + rise * bow, p.z - p.nz * offset));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curve), 24, radius, 6, false);
      b.addGeometry(tube, '#e1e1d7');
      tube.dispose();
    }
    arch(7, 86, 9.14, 1.1, 0.23);
    for (let i = 0; i < 10; i++) arch(7 + 7.8 * i, 15.6, 5, 0.9, 0.145);
  }
  // The bridge carries a sidewalk past the forecourt. Keep an opening for station access.
  for (const d of [-13, -4, 4, 13])
    b.wall(
      bridge,
      d,
      () => floor - 1.45,
      () => floor - 0.22,
      '#585e60',
    );
  for (const d of [-17, 17]) {
    b.wall(
      bridge,
      d,
      () => floor - 1.6,
      () => floor + 0.12,
      '#bab6a7',
    );
    if (d > 0)
      b.wall(
        bridge,
        d,
        () => floor,
        () => floor + 0.8,
        '#bab6a7',
      );
    else
      b.wall(
        bridge,
        d,
        () => floor,
        () => floor + 0.8,
        '#bab6a7',
        3,
        0,
        50,
      );
  }
  for (const d of [-15, 15]) b.ribbon(bridge.offset(d), 3.1, () => floor + 0.12, '#c5bdac');
  for (const d of [-7.5, -3.75, 0, 3.75, 7.5]) {
    const lane = bridge.offset(d);
    for (let s = 1; s < lane.length; s += 9)
      b.ribbon(lane, 0.15, () => floor + 0.03, d === 0 ? '#d7b770' : '#d3d0bf', 3, s, Math.min(s + 4, lane.length));
  }
}

/** Painted masonry and recessed joinery follow the three-bay Peachtree elevation. */
function facade(start: P2, end: P2, count: number, inscription: string, floor: number) {
  const face = new Line([start, end]),
    length = face.length,
    height = 6.8;
  const canvas = document.createElement('canvas');
  const px = 64;
  canvas.width = Math.ceil(length * px);
  canvas.height = Math.ceil(height * px);
  const windowMask = document.createElement('canvas');
  windowMask.width = canvas.width;
  windowMask.height = canvas.height;
  const glow = windowMask.getContext('2d')!;
  glow.scale(px, px);
  glow.fillStyle = '#000';
  glow.fillRect(0, 0, length, height);
  const ctx = canvas.getContext('2d')!;
  ctx.scale(px, px);
  ctx.fillStyle = '#b9a38a';
  ctx.fillRect(0, 0, length, height);
  const tones = ['#a0634c', '#9c5e47', '#ac6c52', '#955c48'];
  for (let row = 0; row < height / 0.12; row++)
    for (let j = -1; j < length / 0.33; j++) {
      ctx.fillStyle = tones[Math.abs((row * 31 + j * 17) ^ (j * row)) % tones.length];
      ctx.fillRect((j + (row % 2) * 0.5) * 0.33, row * 0.12, 0.317, 0.108);
    }
  ctx.fillStyle = '#e0d2b4';
  ctx.fillRect(0, 0, length, 0.81);
  ctx.fillRect(0, height - 0.24, length, 0.24);
  ctx.fillStyle = '#8c8674';
  ctx.textAlign = 'center';
  ctx.font = '.42px Georgia';
  ctx.fillText(inscription, length / 2, 0.56, length - 0.6);
  for (let i = 0; i < count; i++) {
    const cx = ((i + 0.5) * length) / count,
      cy = 3.03,
      r = 1.62;
    const arch = (rad: number, color: string) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, Math.PI, 2 * Math.PI);
      ctx.lineTo(cx + rad, height - 0.13);
      ctx.lineTo(cx - rad, height - 0.13);
      ctx.closePath();
      ctx.fill();
    };
    arch(r + 0.32, '#e4d8b9');
    arch(r, '#354d41');
    ctx.fillStyle = '#729182';
    ctx.beginPath();
    ctx.arc(cx, cy, r - 0.17, Math.PI, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#405548';
    ctx.lineWidth = 0.085;
    for (let a = Math.PI; a <= 2 * Math.PI; a += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      ctx.stroke();
    }
    ctx.fillStyle = '#e4d8b9';
    ctx.fillRect(cx - r - 0.55, cy - 0.05, r * 2 + 1.1, 0.17);
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#cfbf9d';
      ctx.fillRect(cx + side * (r + 0.36) - 0.14, cy + 0.14, 0.28, height - cy - 0.32);
      glow.fillStyle = '#baab90';
      glow.fillRect(cx + side * 0.54 - 0.42, cy + 0.5, 0.84, 1.55);
      ctx.fillStyle = '#8ca69b';
      ctx.fillRect(cx + side * 0.54 - 0.42, cy + 0.5, 0.84, 1.55);
      ctx.fillStyle = '#61796c';
      ctx.fillRect(cx + side * 0.54 - 0.42, cy + 2.24, 0.84, 0.93);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    emissiveMap: new THREE.CanvasTexture(windowMask),
    emissive: '#ffdbab',
    emissiveIntensity: 0,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(length, height), material);
  const p = face.at(length / 2);
  mesh.rotation.y = Math.atan2(p.dz, -p.dx);
  mesh.position.set(p.x + p.dz * 0.12, floor + height / 2, p.z - p.dx * 0.12);
  return mesh;
}

/** Attach to the City mosaic at its existing vertical datum. */
export function createBrookwood(sceneZero: number) {
  const b = new Builder(),
    lamps = new Builder();
  const bed = (x: number) => elevation(x) - sceneZero;
  // The island and the mains cross the freeway on a common railway deck.
  const deck = main.offset(-4);
  b.ribbon(deck, 13, (_, x) => bed(x) - 0.04, '#939089', 2, 287, 410);
  for (const d of [-6.5, 6.5])
    b.wall(
      deck,
      d,
      (s) => bed(deck.at(s).x) - 1.45,
      (s) => bed(deck.at(s).x),
      '#706f68',
      2,
      287,
      410,
    );
  for (const pts of [corridor.main1.pts, corridor.main2.pts, survey.steelLead as P2[], corridor.siding.pts]) {
    const line = new Line(pts);
    b.ribbon(line, 3.6, (_, x) => bed(x) + 0.12, '#807a70');
    for (let s = 0.3; s < line.length; s += 0.72) {
      const p = line.at(s);
      b.ribbon(line, 2.5, () => bed(p.x) + 0.19, '#665c50', 1, s, Math.min(line.length, s + 0.22));
    }
    for (const off of [-0.7175, 0.7175]) b.ribbon(line.offset(off), 0.085, (_, x) => bed(x) + 0.32, '#b0ae9f');
  }
  const litPlatform = new Builder();
  station(b, lamps, litPlatform, sceneZero);
  const group = new THREE.Group(),
    cars = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const structure = new THREE.Mesh(b.geometry(), material);
  structure.receiveShadow = structure.castShadow = true;
  const lightMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#fff1c8' });
  const lights = new THREE.Mesh(lamps.geometry(), lightMaterial);
  const facades = [
    facade(depot[1], depot[2], 3, 'P E A C H T R E E     S O U T H E R N   R Y     S T A T I O N', 273 - sceneZero),
    facade(depot[0], depot[1], 1, 'P E A C H T R E E', 273 - sceneZero),
    facade(depot[2], depot[3], 1, '', 273 - sceneZero),
  ];
  const litSlab = new THREE.Mesh(
    litPlatform.geometry(),
    new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      emissive: '#f8ddab',
      emissiveIntensity: 0,
    }),
  );
  litSlab.receiveShadow = true;
  group.add(structure, lights, litSlab, cars, ...facades);
  const night = { value: 0 };
  const stockMaterial = passengerMaterial(night);
  const shapes = new Map<string, THREE.BufferGeometry>();
  const consist = layout(formation).map(({ unit, offset, length }, i) => {
    let geometry = shapes.get(unit);
    if (!geometry) {
      geometry = passengerGeometry(unit, i === 0, i === formation.length - 1);
      shapes.set(unit, geometry);
    }
    return { geometry, offset, length, trucks: dimensions(unit).trucks };
  });
  const northEdge = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  // The mapped mains meet the west board edge on a diagonal. Square off the ballast there.
  const westEdge = new THREE.Plane(new THREE.Vector3(1, 0, 0), 1000);
  for (const m of [material, lightMaterial, litSlab.material, stockMaterial, ...facades.map((f) => f.material)]) {
    m.clippingPlanes = [northEdge, westEdge];
    m.clipShadows = true;
  }
  const freight = createNorcrossFreight(corridor.main2.pts, (x) => bed(x) + 0.32, [northEdge, westEdge]);
  group.add(freight.group);
  let crescentOnCorridor = false;
  function update(states: TrainState[], dark: number) {
    lightMaterial.emissiveIntensity = dark * 1.8;
    litSlab.material.emissiveIntensity = dark * 0.35;
    for (const mesh of facades) mesh.material.emissiveIntensity = dark * 0.45;
    night.value = dark;
    let count = 0;
    crescentOnCorridor = false;
    for (const train of states) {
      const run = crescentPlacement(train);
      if (!run) continue;
      crescentOnCorridor = true;
      for (const { geometry, offset, length, trucks } of consist) {
        const s = run.center + run.dir * offset;
        // Cars straddling a board edge are cut by the west and north clip planes.
        if (s < corridorChainage.min - length || s > corridorChainage.max + length) continue;
        const fore = brookwoodTruckAt(s + (run.dir * trucks) / 2),
          aft = brookwoodTruckAt(s - (run.dir * trucks) / 2);
        let car = cars.children[count++] as THREE.Mesh | undefined;
        if (!car) {
          car = new THREE.Mesh(geometry, stockMaterial);
          car.receiveShadow = true;
          car.rotation.order = 'YXZ';
          cars.add(car);
        }
        car.geometry = geometry;
        car.visible = true;
        car.userData.trainId = train.id;
        car.userData.lengthM = length;
        car.position.set((fore.x + aft.x) / 2, (bed(fore.x) + bed(aft.x)) / 2 + 0.32, (fore.z + aft.z) / 2);
        car.rotation.y = Math.atan2(fore.x - aft.x, fore.z - aft.z);
        car.rotation.x = -Math.atan2(bed(fore.x) - bed(aft.x), Math.hypot(fore.x - aft.x, fore.z - aft.z));
      }
    }
    for (let j = count; j < cars.children.length; j++) cars.children[j].visible = false;
    return count;
  }
  return {
    group,
    cars,
    structure,
    update,
    /** Advance the illustrative Main 2 freight after `update` has placed any Crescent. */
    updateFreight: (clockMs: number) => freight.update(clockMs, crescentOnCorridor),
    freight: freight.group,
    get freightCars() { return freight.visibleCars; },
    bounds: brookwoodBounds,
    setNorthEdge(z: number) {
      northEdge.constant = -z;
    },

    dispose() {
      group.removeFromParent();
      litSlab.material.dispose();
      litSlab.geometry.dispose();
      for (const mesh of facades) {
        mesh.geometry.dispose();
        mesh.material.map?.dispose();
        mesh.material.emissiveMap?.dispose();
        mesh.material.dispose();
      }
      for (const g of [structure.geometry, lights.geometry, ...shapes.values()]) g.dispose();
      for (const m of [material, lightMaterial, stockMaterial]) m.dispose();
      freight.dispose();
    },
  };
}
