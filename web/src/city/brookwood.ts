import * as THREE from 'three';
import { makeProjector } from '../core/scene-data';
import type { TrainState } from '../model/types';
import { Builder, Line, type P2 } from '../vignette/geom';
import survey from './fixtures/brookwood.json';

const project = makeProjector({ lon: -84.3916, lat: 33.7539 });
const main = new Line(survey.main1 as P2[]);
const platform = survey.platform as P2[];
const bridge = new Line(survey.bridge as P2[]);
const depot = survey.depot as P2[];
export const brookwoodBounds = { minX: -575, maxX: 410, minZ: -5490, maxZ: -4550 };

// Open rail samples (City x, NAVD88 m). Bridge floors and rooftops are excluded.
const grade = [
  [-575, 271.5],
  [-370.5, 267.9],
  [-244.8, 266.5],
  [-118.2, 264.8],
  [-44.2, 264.2],
  [9, 264],
  [65.2, 263.5],
  [236.5, 261.3],
  [410, 258.9],
];
function elevation(x: number) {
  const i = grade.findIndex((p) => p[0] >= x);
  if (i < 0) return grade[grade.length - 1][1];
  if (!i) return grade[0][1];
  const [a, h] = grade[i - 1],
    [b, k] = grade[i];
  return h + ((k - h) * (x - a)) / (b - a);
}

// Signed extension at the ends lets a long consist enter one car at a time.
function chainage(x: number, z: number) {
  let distance = Infinity,
    along = 0;
  for (let i = 0; i + 1 < main.pts.length; i++) {
    const [a, b] = main.pts[i],
      [c, d] = main.pts[i + 1];
    const length = main.cum[i + 1] - main.cum[i];
    const projection = ((x - a) * (c - a) + (z - b) * (d - b)) / length;
    const t = Math.min(i + 2 === main.pts.length ? Infinity : length, Math.max(i ? 0 : -Infinity, projection));
    const gap = Math.hypot(x - a - ((c - a) * t) / length, z - b - ((d - b) * t) / length);
    if (gap < distance) {
      along = main.cum[i] + t;
      distance = gap;
    }
  }
  return { along, distance };
}
const atl = chainage(...project(-84.392477, 33.799445)).along;
const platformEnd = chainage(...platform[1]).along;
export function crescentPlacement(t: TrainState) {
  if (t.routeId !== 'amtrak:route:Crescent' || t.s.tier !== 'scheduled') return;
  const [x, z] = project(t.lon, t.lat);
  if (x < -750 || x > 590 || z < -5650 || z > -4370) return;
  const { along, distance } = chainage(x, z);
  if (distance > 35) return;
  const p = main.at(along),
    heading = (t.heading * Math.PI) / 180;
  const dir = Math.sin(heading) * p.dx - Math.cos(heading) * p.dz >= 0 ? 1 : -1;
  const units = Math.max(1, Math.round(t.lengthM.value / 26));
  // Move the whole consist toward the usable island as it approaches the GTFS point.
  // Smooth over 500 m so that even a full-length model keeps moving in trip order.
  const f = Math.max(0, 1 - Math.abs(along - atl) / 500);
  const shift = (platformEnd - Math.min(units * 26, 368) / 2 - atl) * f * f * (3 - 2 * f);
  return { center: along + shift, dir, units };
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

function station(b: Builder, lamps: Builder, zero: number) {
  const floor = 273 - zero;
  const forecourt: P2[] = [
    [-115, -5073],
    [-60, -5101],
    [-31, -5051],
    [-88, -5039],
    [-110, -5049],
  ];
  solid(b, forecourt, floor - 1.1, floor - 0.18, '#aca79a');
  solid(b, depot, floor, floor + 6.65, '#9b6047');
  solid(b, depot, floor + 6.15, floor + 6.85, '#dbcca6');
  solid(b, depot, floor + 6.85, floor + 7.15, '#4d5549');
  solid(b, depot, floor + 7.15, floor + 7.3, '#bcb6a9');
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
  for (const s of [649, 708]) {
    const p = main.at(s),
      m = frame(p.x, 0, p.z, p.dx, p.dz);
    for (const offset of [-8, 14]) {
      const h = floor - bedAt(s);
      b.box(1.2, h, 2.2, offset, floor - h / 2, 0, '#918778', m);
    }
  }
  function bedAt(s: number) {
    return elevation(main.at(s).x) - zero;
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
  const facing = new Line([platform[1], platform[2]]);
  for (let s = 0; s < island.length; s += 5) {
    const end = Math.min(s + 5, island.length);
    const a = island.at(s),
      b1 = facing.at((s / island.length) * facing.length);
    const c = facing.at((end / island.length) * facing.length),
      d = island.at(end);
    b.quad([a.x, tread(s), a.z], [b1.x, tread(s), b1.z], [c.x, tread(end), c.z], [d.x, tread(end), d.z], '#bab7a5');
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
  for (let s = 3; s < 76; s += 8) {
    const p = island.at(s),
      m = frame(p.x + p.nx * 1.85, tread(s), p.z + p.nz * 1.85, p.dx, p.dz);
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
    if (d < 0)
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
      ctx.fillStyle = '#8ca69b';
      ctx.fillRect(cx + side * 0.54 - 0.42, cy + 0.5, 0.84, 1.55);
      ctx.fillStyle = '#61796c';
      ctx.fillRect(cx + side * 0.54 - 0.42, cy + 2.24, 0.84, 0.93);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshLambertMaterial({ map: texture });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(length, height), material);
  const p = face.at(length / 2);
  mesh.rotation.y = Math.atan2(p.dz, -p.dx);
  mesh.position.set(p.x + p.dz * 0.12, floor + height / 2, p.z - p.dx * 0.12);
  return mesh;
}

function carGeometry(cab: boolean) {
  const b = new Builder(),
    silver = '#adafa9',
    blue = '#434d72';
  b.box(2.65, 0.7, 22, 0, 0.78, 0, '#434644');
  for (const z of [-8.4, 8.4]) b.box(2.75, 0.86, 3.9, 0, 0.45, z, '#303234');
  b.box(3, 2.9, 24.7, 0, 2.45, 0, silver);
  b.box(2.8, 0.28, 24.6, 0, 4.03, 0, '#828681');
  for (const side of [-1, 1]) {
    b.box(0.08, 0.27, 24.6, side * 1.5, 2, 0, blue);
    if (!cab) for (let i = 0; i < 14; i++) b.box(0.07, 0.8, 1.13, side * 1.51, 2.98, i * 1.58 - 10.28, '#344753');
  }
  if (cab) {
    b.box(2.9, 1.5, 3.0, 0, 2.7, 11.5, blue);
    b.box(2.3, 0.8, 0.14, 0, 3.1, 13, '#384851');
    for (const x of [-0.65, 0.65]) b.box(0.3, 0.25, 0.18, x, 2.15, 13, '#fff1be');
    for (let i = 0; i < 6; i++) b.box(2.4, 0.27, 1, 0, 4.23, -8 + i * 2, '#535956');
  }
  return b.geometry();
}

/** Heights are NAVD88 minus sceneZero. The study datum keeps the model on the City studio table. */
export function createBrookwood(sceneZero = 264, study = false) {
  const b = new Builder(),
    lamps = new Builder();
  const bed = (x: number) => elevation(x) - sceneZero;
  if (study) {
    // A narrow sectional base keeps the road and rail approaches inspectable before the terrain tile arrives.
    b.ribbon(main, 85, (_, x) => bed(x) - 0.25, '#989982');
    for (const d of [-42.5, 42.5])
      b.wall(
        main,
        d,
        () => -14,
        (s) => bed(main.at(s).x) - 0.25,
        '#7d7162',
      );
  }
  for (const pts of [survey.main1, survey.main2, survey.steelLead, survey.siding]) {
    const line = new Line(pts as P2[]);
    b.ribbon(line, 3.6, (_, x) => bed(x) + 0.12, '#807a70');
    for (let s = 0.3; s < line.length; s += 0.72) {
      const p = line.at(s);
      b.ribbon(line, 2.5, () => bed(p.x) + 0.19, '#665c50', 1, s, Math.min(line.length, s + 0.22));
    }
    for (const off of [-0.7175, 0.7175]) b.ribbon(line.offset(off), 0.085, (_, x) => bed(x) + 0.32, '#b0ae9f');
  }
  station(b, lamps, sceneZero);
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
  group.add(structure, lights, cars, ...facades);
  const geometries = [carGeometry(false), carGeometry(true)];
  const stockMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, clippingPlanes: [] });
  function update(states: TrainState[], dark: number) {
    lightMaterial.emissiveIntensity = dark * 1.8;
    let count = 0;
    for (const train of states) {
      const run = crescentPlacement(train);
      if (!run) continue;
      for (let i = 0; i < run.units; i++) {
        const s = run.center + run.dir * ((run.units - 1) / 2 - i) * 26;
        if (s < 0 || s > main.length) continue;
        const p = main.at(s),
          g = geometries[i === 0 ? 1 : 0];
        let car = cars.children[count++] as THREE.Mesh | undefined;
        if (!car) {
          car = new THREE.Mesh(g, stockMaterial);
          car.receiveShadow = true;
          cars.add(car);
        }
        car.geometry = g;
        car.visible = true;
        car.userData.trainId = train.id;
        car.userData.lengthM = 26;
        car.position.set(p.x, bed(p.x) + 0.32, p.z);
        car.rotation.y = Math.atan2(p.dx * run.dir, p.dz * run.dir);
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
    bounds: brookwoodBounds,
    groundAt: (x: number) => bed(x),
    dispose() {
      group.removeFromParent();
      for (const mesh of facades) {
        mesh.geometry.dispose();
        mesh.material.map?.dispose();
        mesh.material.dispose();
      }
      for (const g of [structure.geometry, lights.geometry, ...geometries]) g.dispose();
      for (const m of [material, lightMaterial, stockMaterial]) m.dispose();
    },
  };
}
