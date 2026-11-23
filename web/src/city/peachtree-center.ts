import * as THREE from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, rng, segDist, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

interface Tower {
  id: string;
  name: string;
  origin: P2; // West end of the tallest slab, at its promenade-facing corner.
  slope: number; // South metres per east metre.
  outward: 1 | -1; // Away from the promenade.
  threeSlabs: boolean;
}

const towers: Tower[] = [
  {
    id: '2fcbd70e-1d1d-4690-9092-191ba41c54be',
    name: 'North',
    origin: [383.64, -727.28],
    slope: 0.0164,
    outward: -1,
    threeSlabs: false,
  },
  {
    id: 'c934a398-eff1-4ede-98ba-ffc5045f9949',
    name: 'South',
    origin: [383.39, -707.56],
    slope: 0.0132,
    outward: 1,
    threeSlabs: false,
  },
  {
    id: '1bc229b3-76a6-4e34-abf0-ff9cf0d5b6d3',
    name: 'Harris',
    origin: [446.64, -757.81],
    slope: 0.0165,
    outward: -1,
    threeSlabs: true,
  },
  {
    id: 'd1108a48-5c60-4872-b593-fb4444f84440',
    name: 'International',
    origin: [445.09, -674.9],
    slope: 0.0107,
    outward: 1,
    threeSlabs: true,
  },
];

// Surveyed outlines in local metres. Short collinear Overture segments can change between bakes.
const doublePlan: P2[] = [
  [0, 0],
  [67, 0],
  [67, 9.5],
  [66, 9.5],
  [66, 11.5],
  [73.5, 11.5],
  [73.5, 21],
  [6, 21],
  [6, 11.5],
  [7.3, 11.5],
  [7.3, 9.5],
  [0, 9.5],
];
const triplePlan: P2[] = [
  [0, 0],
  [14.2, 0],
  [14.2, -10.8],
  [55.4, -10.8],
  [55.4, 0],
  [57, 0],
  [57, 9.6],
  [54, 9.6],
  [54, 11],
  [55.3, 11],
  [55.3, 20.5],
  [2.2, 20.5],
  [2.2, 9.6],
  [0, 9.6],
];
const precast = '#d2c7b5',
  edge = '#c1b6a5',
  shadow = '#524e49';
const atlasBays = 32,
  atlasRows = 32;

// One mipmapped sheet for the narrow recessed lights and the tapered aggregate panel returns.
function windowMaterial() {
  const cell = 8,
    size = cell * atlasBays;
  const day = new Uint8Array(size * size * 4),
    night = new Uint8Array(day.length);
  const random = rng(235);
  for (let row = 0; row < atlasRows; row++)
    for (let bay = 0; bay < atlasBays; bay++) {
      const gray = Math.round(49 + random() * 27);
      const lit = random() < 0.12 ? 0.55 + 0.45 * random() : 0;
      for (let y = 0; y < cell; y++)
        for (let x = 0; x < cell; x++) {
          const idx = 4 * ((row * cell + y) * size + bay * cell + x);
          const pane = x >= 2 && x <= 5 && y > 0 && y < 7;
          const rgb = pane ? [gray, gray + 7, gray + 10] : x === 1 && y > 0 ? [157, 146, 131] : [210, 199, 181];
          day.set([...rgb, 255], idx);
          const glow = pane ? lit : 0;
          night.set([255 * glow, 217 * glow, 168 * glow, 255], idx);
        }
    }
  function texture(bytes: Uint8Array<ArrayBuffer>) {
    const t = new THREE.DataTexture(bytes, size, size);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
  const map = texture(day),
    emissiveMap = texture(night);
  const material = new THREE.MeshLambertMaterial({ map, emissiveMap, emissive: 0xffffff, emissiveIntensity: 0 });
  material.addEventListener('dispose', () => {
    map.dispose();
    emissiveMap.dispose();
  });
  return material;
}

function fits(tower: Tower, building: VBuilding) {
  if (building.rings.length !== 1 || building.rings[0].length < 4) return false;
  const c = 1 / Math.hypot(1, tower.slope),
    s = tower.slope * c;
  const ring: P2[] = building.rings[0].map(([x, z]) => {
    const dx = x - tower.origin[0],
      dz = z - tower.origin[1];
    return [dx * c + dz * s, tower.outward * (dz * c - dx * s)];
  });
  const plan = tower.threeSlabs ? triplePlan : doublePlan;
  const near = (a: P2[], b: P2[]) =>
    a.every(([x, z]) => b.some((p, i) => segDist(x, z, p, b[(i + 1) % b.length]) < 1.5));
  const area = (r: P2[]) => Math.abs(THREE.ShapeUtils.area(r.map(([x, z]) => new THREE.Vector2(x, z))));
  return near(ring, plan) && near(plan, ring) && Math.abs(area(ring) / area(plan) - 1) < 0.035;
}

// u follows the long east-west facades. v points out from the courtyard for each mirror.
function model(tower: Tower, base: number, zero: number, finish: THREE.Material, glazing: THREE.Material) {
  const shell = new Builder(),
    glass = new Builder(),
    uv: number[] = [];
  const three = tower.threeSlabs;
  const highDeck = three ? 426.1 : 413.8,
    wingDeck = three ? 419.2 : 405.5;
  const parapet = three ? 431.5 : 417.7,
    wingRim = three ? 421.1 : 407.3;
  const lobbyTop = three ? 326.8 : 325.6;
  const officeRows = three ? 27 : 24;
  const pitch = (highDeck - lobbyTop) / officeRows;
  const box = (l: number, r: number, v: number, w: number, b: number, h: number, color: string) =>
    shell.box(r - l, h - b, w - v, (l + r) / 2, (b + h) / 2, (v + w) / 2, color);

  // A slab has its own deck and parapet. Its end walls expose the offset in the plan.
  // Window rows line up across the steps and continue into the taller spine.
  let faceIndex = towers.indexOf(tower) * 7;
  function slab(l: number, r: number, v: number, w: number, deck: number, rim: number, spine: boolean) {
    const corners: P2[] = [
      [l, w],
      [r, w],
      [r, v],
      [l, v],
    ];

    box(l, r, v, w, lobbyTop - 0.65, lobbyTop, shadow);
    for (let face = 0; face < 4; face++) {
      const [x, z] = corners[face],
        [ex, ez] = corners[(face + 1) % 4];
      const len = Math.hypot(ex - x, ez - z);
      const bays = Math.max(1, Math.round(len / 1.46));
      const ux = (ex - x) / len,
        uz = (ez - z) / len;
      const pt = (q: number, h: number, out: number) => [x + ux * q - uz * out, h, z + uz * q + ux * out];
      // Set the two contacting long walls just inside their own slab.
      const inset = -0.035;
      glass.quad(
        pt(0, lobbyTop, inset),
        pt(len, lobbyTop, inset),
        pt(len, deck, inset),
        pt(0, deck, inset),
        'white',
      );
      const u0 = (faceIndex++ * 7) / atlasBays,
        u1 = u0 + bays / atlasBays;
      const t0 = (faceIndex % 13) / atlasRows,
        t1 = t0 + (deck - lobbyTop) / (pitch * atlasRows);
      uv.push(u0, t0, u1, t0, u1, t1, u0, t0, u1, t1, u0, t1);
      // Broader panes behind the white lobby piers. Use one unbroken part of a glass
      // cell vertically so the office spandrel does not appear halfway up the lobby.
      glass.quad(
        pt(0.32, base, -0.32),
        pt(len - 0.32, base, -0.32),
        pt(len - 0.32, lobbyTop, -0.32),
        pt(0.32, lobbyTop, -0.32),
        'white',
      );
      const lobbyEnd = u0 + Math.max(1, Math.round(len / 3.1)) / atlasBays;
      const lobbySill = t0 + 0.2 / atlasRows,
        lobbyHead = t0 + 0.8 / atlasRows;
      uv.push(
        u0,
        lobbySill,
        lobbyEnd,
        lobbySill,
        lobbyEnd,
        lobbyHead,
        u0,
        lobbySill,
        lobbyEnd,
        lobbyHead,
        u0,
        lobbyHead,
      );
      // Folded fins give the panel groups a projecting edge in raking light.
      for (let j = 0; j < bays; j += 4) {
        const q = (j * len) / bays + 0.08;
        shell.quad(
          pt(q, lobbyTop, inset),
          pt(q + 0.14, lobbyTop, 0.18),
          pt(q + 0.14, deck, 0.18),
          pt(q, deck, inset),
          precast,
        );
        shell.quad(
          pt(q + 0.14, lobbyTop, 0.18),
          pt(q + 0.27, lobbyTop, inset),
          pt(q + 0.27, deck, inset),
          pt(q + 0.14, deck, 0.18),
          edge,
        );
      }
      for (let j = 0; j <= Math.floor(len / 6.6); j++) {
        const q = 0.35 + (j * (len - 0.7)) / Math.max(1, Math.floor(len / 6.6));
        shell.quad(
          pt(q - 0.3, base, 0),
          pt(q + 0.3, base, 0),
          pt(q + 0.3, lobbyTop, 0),
          pt(q - 0.3, lobbyTop, 0),
          '#e2dcd0',
        );
      }
    }
    box(l, r, v, w, deck - 0.15, deck, '#9e9e97');
    // The screened crown encloses a lower well. Leave real gaps in the wing's outer parapet.
    const wall = 0.3;
    box(l, l + wall, v, w, deck, rim, precast);
    box(r - wall, r, v, w, deck, rim, precast);
    for (const side of [v, w - wall]) {
      if (spine) {
        box(l + wall, r - wall, side, side + wall, deck, rim, precast);
        for (let q = l + 1; q < r - 0.45; q += 1.46)
          box(q, q + 0.16, side - 0.06, side + wall + 0.06, deck + 0.25, rim - 0.25, edge);
      } else {
        box(l + wall, r - wall, side, side + wall, rim - 0.32, rim, precast);
        if (!three && side === w - wall) {
          // The outward screen of North/South has two groups of eight and three openings.
          let solidFrom = l + wall;
          for (const [start, count] of [
            [l + 5, 8],
            [r - 14, 3],
          ]) {
            for (let i = 0; i < count; i++) {
              const opening = start + 2.3 * i;
              box(solidFrom, opening, side, side + wall, deck, rim - 0.32, precast);
              solidFrom = opening + 1.65;
            }
          }
          box(solidFrom, r - wall, side, side + wall, deck, rim - 0.32, precast);
        } else {
          for (let q = l + 0.3; q < r - 0.35; q += 2.3)
            box(q, Math.min(q + 0.48, r - 0.3), side, side + wall, deck, rim - 0.32, precast);
        }
      }
    }
    if (spine) {
      // Low plant enclosures along the raised spine, separated by lower roof fields.
      const plant = three
        ? [
            [0.02, 0.1],
            [0.21, 0.58],
            [0.62, 0.77],
            [0.86, 0.98],
          ]
        : [
            [0.04, 0.11],
            [0.23, 0.39],
            [0.48, 0.65],
            [0.8, 0.94],
          ];
      for (const [a, b] of plant) {
        box(l + (r - l) * a, l + (r - l) * b, v + 0.8, w - 1.0, deck, three ? 430.2 : 416.6, '#b3b2a8');
      }
    }
  }
  function balcony(u: number, len: number, wall: number, dir: number, lo: number, stories: number) {
    const front = wall + dir * 1.8,
      a = Math.min(wall, front),
      b = Math.max(wall, front);
    for (let floor = 0; floor <= stories; floor++)
      box(u, u + len, a, b, lo + floor * pitch, lo + floor * pitch + 0.35, precast);
    for (const x of [u, u + len - 0.35]) box(x, x + 0.35, a, b, lo, lo + stories * pitch + 0.35, edge);
  }
  if (three) {
    slab(0, 57, 0, 9.6, highDeck, parapet, true);
    box(3, 54, 9.55, 9.75, base, wingDeck, shadow);
    box(15, 54, -0.15, 0.05, base, wingDeck, shadow);
    slab(2.2, 55.4, 9.7, 20.5, wingDeck, wingRim, false);
    slab(14.2, 55.4, -10.8, -0.1, wingDeck, wingRim, false);
    balcony(3, 5.6, 20.5, 1, wingDeck - 4 * pitch, 4);
    balcony(15, 5.6, -10.8, -1, lobbyTop + 4 * pitch, 4);
  } else {
    slab(0, 67, 0, 9.5, highDeck, parapet, true);
    box(7.3, 66, 9.45, 11.55, base, wingDeck, shadow);
    slab(6, 73.5, 11.5, 21, wingDeck, wingRim, false);
    balcony(0.3, 4.9, 9.5, 1, highDeck - 2 * pitch, 2);
    box(2, 65, -1.4, 0, lobbyTop + pitch, lobbyTop + pitch + 0.65, edge);
  }
  const group = new THREE.Group();
  group.name = 'Peachtree Center ' + tower.name + ' Tower';
  group.position.set(tower.origin[0], -zero, tower.origin[1]);
  group.rotation.y = -Math.atan(tower.slope);
  group.scale.z = tower.outward;
  const facade = glass.geometry();
  facade.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  group.add(new THREE.Mesh(shell.geometry(), finish), new THREE.Mesh(facade, glazing));
  for (const m of group.children) m.castShadow = m.receiveShadow = true;
  return group;
}

export function createPeachtreeCenter(buildings: VBuilding[], grid: GroundGrid) {
  const group = new THREE.Group(),
    replaced = new Set<VBuilding>();
  let glazing: ReturnType<typeof windowMaterial> | undefined;
  let finish: THREE.MeshLambertMaterial | undefined;
  for (const tower of towers) {
    const source = buildings.find((b) => b.id === tower.id);
    if (!source || !fits(tower, source)) continue;
    const grades = source.rings[0].map(([x, z]) => grid.sample(x, z));
    if (!grades.every((g): g is number => g !== null && Number.isFinite(g))) continue;
    glazing ??= windowMaterial();
    finish ??= new THREE.MeshLambertMaterial({ vertexColors: true });
    group.add(model(tower, Math.min(...grades) - 0.35, grid.manifest.vertical.sceneZeroNavd88M, finish, glazing));
    replaced.add(source);
  }
  if (!glazing) return null;
  const occupied = glazing;
  return {
    group,
    buildings: buildings.filter((b) => !replaced.has(b)),
    setNight(night: number) {
      occupied.emissiveIntensity = 1.15 * night;
    },
  };
}
