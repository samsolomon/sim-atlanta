import {
  AdditiveBlending,
  Float32BufferAttribute,
  MeshBasicMaterial,
  PlaneGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  ShapeUtils,
  Vector2,
} from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { drawApartmentWall, type ApartmentPalette } from './apartment-facade';

const westId = '8759966e-3226-4802-be0f-28ccf249a4ff',
  eastId = 'fae8f47d-2852-45da-a09e-ae6246586874',
  linkId = '9af30d4c-b3ad-4d36-8dd0-fc7dd3aaaf69';
const deckHeight = 333.65,
  towerRoof = 363.15,
  westRoof = 341.25;
const warmWall = '#d5bda7',
  limestone = '#ddd7c5',
  bronze = '#957d5b';
const palette: ApartmentPalette = {
  wall: warmWall,
  roof: '#bdb9ae',
  accent: '#bc9b7a',
  shopFrame: '#655d54',
  recess: '#645a51',
  trim: '#d9cebc',
  glass: '#697d80',
};

function directed(ring: P2[], clockwise: boolean) {
  return ShapeUtils.isClockWise(ring.map(([x, z]) => new Vector2(x, z))) === clockwise ? ring : [...ring].reverse();
}

function cap(mesh: Builder, ring: P2[], holes: P2[][], y: number, color: string) {
  const vec = (r: P2[]) => r.map(([x, z]) => new Vector2(x, z));
  const points = ring.concat(...holes);
  const vertex = (i: number) => [points[i][0], y, points[i][1]];
  for (const [a, b, c] of ShapeUtils.triangulateShape(vec(ring), holes.map(vec)))
    mesh.tri(vertex(a), vertex(c), vertex(b), color);
}
function face(mesh: Builder, lights: Builder, a: P2, b: P2) {
  const width = Math.hypot(b[0] - a[0], b[1] - a[1]),
    dx = (b[0] - a[0]) / width,
    dz = (b[1] - a[1]) / width;
  const pt = (x: number, y: number, d: number) => [a[0] + dx * x + dz * d, y, a[1] + dz * x - dx * d];
  const panel = (l: number, r: number, lo: number, hi: number, d: number, color: string, lit = false) =>
    (lit ? lights : mesh).quad(pt(l, lo, d), pt(l, hi, d), pt(r, hi, d), pt(r, lo, d), color);
  return { width, pt, panel };
}
type Face = ReturnType<typeof face>;

function dobbsFront(mesh: Builder, lights: Builder, sw: P2, se: P2, base: number, grid: GroundGrid) {
  const f = face(mesh, lights, se, sw); // outward toward Dobbs
  const pitch = f.width / 5,
    rand = rng(112);
  for (let i = 0; i < 5; i++) {
    const l = pitch * i,
      r = pitch * (i + 1),
      mid = (l + r) / 2;
    const [x, , z] = f.pt(mid, 0, 0);
    const sill = grid.sample(x, z) ?? base + 0.25;
    const inset = -0.62,
      head = 318.62;
    f.panel(l, r, head, westRoof, 0, warmWall);
    f.panel(l, l + 0.34, base, head, 0, warmWall);
    f.panel(r - 0.34, r, base, head, 0, warmWall);
    f.panel(l + 0.34, r - 0.34, base, head, inset, '#4e5a5b', i === 1);
    for (const edge of [l + 0.34, r - 0.34])
      mesh.quad(f.pt(edge, base, 0), f.pt(edge, head, 0), f.pt(edge, head, inset), f.pt(edge, base, inset), '#ae9d83');
    mesh.quad(
      f.pt(l + 0.34, head, 0),
      f.pt(r - 0.34, head, 0),
      f.pt(r - 0.34, head, inset),
      f.pt(l + 0.34, head, inset),
      '#a89a84',
    );
    for (const t of [0.24, 0.5, 0.76]) {
      const mullion = l + t * pitch;
      f.panel(mullion - 0.045, mullion + 0.045, base, head, inset + 0.035, '#3e494a');
    }
    f.panel(l + 0.34, r - 0.34, head - 0.55, head - 0.48, inset + 0.035, '#535d59');
    if (i === 1) {
      const lo = Math.min(sill, head - 2.3),
        lintel = lo + 2.2;
      for (const side of [-0.87, 0, 0.87]) {
        f.panel(mid + side - 0.05, mid + side + 0.05, lo, lintel, inset + 0.065, '#9b9c8e');
      }
      f.panel(mid - 0.92, mid + 0.92, lintel - 0.07, lintel + 0.05, inset + 0.07, '#9b9c8e');
      for (const side of [-1, 1])
        f.panel(mid + side * 0.17 - 0.035, mid + side * 0.17 + 0.035, lo + 0.8, lo + 1.13, inset + 0.095, '#dfd9c7');
    }
    f.panel(l + 0.48, r - 0.48, 319.08, 321.02, 0.04, '#65777b');
    f.panel(mid - 0.05, mid + 0.05, 319.08, 321.02, 0.055, '#535d59');
    for (let j = 0; j < 6; j++) {
      const y = 322.6 + j * 2.96;
      for (const x of [l + pitch * 0.25, l + pitch * 0.75]) {
        f.panel(x - 1.25, x + 1.25, y, y + 1.47, 0.04, '#536b70', rand() < 0.17);
        f.panel(x - 0.045, x + 0.045, y, y + 1.47, 0.055, '#494e4e');
      }
    }
    // Five shallow angular hoods repeat at the entrance and the eaves.
    for (const [y, depth] of [
      [322.04, 1.85],
      [341.38, 1.04],
    ]) {
      const left = f.pt(l, y, 0.04),
        right = f.pt(r, y, 0.04),
        tip = f.pt(mid, y + 0.5, depth);
      mesh.tri(left, tip, right, '#b1a79a');
      mesh.tri(left, right, f.pt(mid, y + 0.32, depth), '#e0d5c6');
      mesh.quad(left, tip, f.pt(mid, y + 0.32, depth), f.pt(l, y - 0.16, 0.04), '#897e70');
      mesh.quad(tip, right, f.pt(r, y - 0.16, 0.04), f.pt(mid, y + 0.32, depth), '#897e70');
    }
  }
}

function renovatedWing(mesh: Builder, lights: Builder, west: VBuilding, base: number, grid: GroundGrid) {
  const outer = directed(west.rings[0], true),
    hole = directed(west.rings[1], false);
  for (const ring of [outer, hole]) {
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i],
        b = ring[(i + 1) % ring.length];
      if (ring === outer && a[1] > -371 && b[1] > -371) {
        dobbsFront(mesh, lights, a, b, base, grid);
        continue;
      }
      drawApartmentWall(
        mesh,
        lights,
        a,
        b,
        base,
        westRoof,
        8,
        palette,
        { groundUse: 'residential', balconyEvery: null },
        112,
      );
    }
  }
  cap(mesh, outer, [hole], westRoof, '#b8b6ae');
  // The historic courtyard continues down to grade, between the two long roof strips.
  cap(mesh, hole, [], 314.72, '#a19a84');
  for (const x of [578, 606])
    for (const z of [-408, -399, -382]) {
      mesh.box(2.15, 1.02, 2.7, x, westRoof + 0.51, z, '#989c98');
    }
}

function sign(f: Face) {
  const glyphs = ['111101101101111', '101111111111101', '111100110100111', '010110010010111', '111001111100111'];
  for (let i = 0; i < glyphs.length; i++) {
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 3; col++) {
        if (glyphs[i][row * 3 + col] !== '1') continue;
        const u = 1.32 + (4 - i) * 0.86 + (2 - col) * 0.2,
          y = 362.58 + (4 - row) * 0.19;
        f.panel(u, u + 0.21, y, y + 0.2, 0.105, i > 2 ? '#98534c' : '#39494b');
      }
  }
}

function towerFace(
  f: Face,
  base: number,
  bays: number,
  street: boolean,
  wrap: 'start' | 'end' | 'both' | 'none',
  seed: number,
) {
  const rand = rng(seed);
  const w = f.width,
    pitch = w / bays,
    start = street ? 319.9 : deckHeight;
  if (street) {
    for (let i = 0; i < bays; i++) {
      const l = i * pitch,
        r = l + pitch;
      f.panel(l, r, base, start, 0, limestone);
      f.panel(l + 0.3, r - 0.3, base + 0.55, 318.76, 0.055, '#586568', i % 5 === 2);
      f.panel(l + 0.29, r - 0.29, 316.35, 316.45, 0.08, '#424847');
    }
    f.panel(0, w, 318.96, 319.31, 0.2, '#aaa89b');
  }
  f.panel(0, w, start, 364.02, 0, limestone);
  // Vertical stacks of pale piers and recessed brown bays meet a ribbon-window corner.
  for (let i = 0; i < bays; i++) {
    const l = i * pitch,
      r = l + pitch,
      end = wrap === 'both' || (wrap === 'start' && i < 2) || (wrap === 'end' && i >= bays - 2);
    const brown = !end && i % 5 === 2;
    f.panel(l + 0.16, r - 0.16, start, 362.47, 0.025, brown ? bronze : end ? '#68787b' : '#b7b6aa');
    for (let j = 0; j < 14; j++) {
      const y = 320.65 + j * 2.98;
      if (y < start) continue;
      f.panel(l + 0.34, r - 0.34, y, y + 1.7, 0.055, '#526a73', rand() < 0.17);
      f.panel((l + r) / 2 - 0.045, (l + r) / 2 + 0.045, y, y + 1.7, 0.07, '#8c9087');
      if (end) f.panel(l, r, y - 0.31, y + 0.02, 0.085, '#dfdacb');
    }
  }
}

function dobbsGarage(mesh: Builder, f: Face, base: number) {
  const w = f.width,
    l = w * 0.16,
    r = w * 0.57,
    top = 317.25;
  f.panel(0, l, base, top, 0, limestone);
  f.panel(r, w, base, top, 0, limestone);
  f.panel(0, w, top, 321.15, 0, limestone);
  f.panel(l, r, base, top, -2.8, '#535851');
  for (const edge of [l, r])
    mesh.quad(f.pt(edge, base, 0), f.pt(edge, top, 0), f.pt(edge, top, -2.8), f.pt(edge, base, -2.8), limestone);
  mesh.quad(f.pt(l, top, 0), f.pt(r, top, 0), f.pt(r, top, -2.8), f.pt(l, top, -2.8), '#b4ab98');
  for (let i = 0; i < 4; i++) {
    const x = ((i + 0.22) * w) / 4,
      X = ((i + 0.79) * w) / 4;
    f.panel(x, X, 318.04, 320.04, 0.045, '#66787b');
  }
  f.panel(0, w, 320.99, 321.24, 0.24, '#e2dac7');
  f.panel(0, w, 321.21, deckHeight, 0, '#a78370');
  for (let j = 0; j < 4; j++)
    for (let i = 0; i < 4; i++) {
      const x = ((i + 0.14) * w) / 4,
        X = ((i + 0.84) * w) / 4,
        y = 321.95 + j * 2.81;
      f.panel(x, X, y, y + 1.65, 0.035, '#555c59');
      for (let k = 1; k < 5; k++) f.panel(x, X, y + k * 0.3, y + k * 0.3 + 0.055, 0.053, '#9b988a');
    }
}

function poolCourt(mesh: Builder, lights: Builder) {
  // Lidar has a rectangular void in the amenity-deck returns where the architect's photo shows water.
  mesh.box(8.5, 0.16, 16.5, 624.5, deckHeight + 0.08, -385, '#d2c9ae');
  mesh.box(7.3, 0.07, 15.1, 624.5, deckHeight + 0.195, -385, '#56898c');
  for (const z of [-392, -388, -384, -380]) {
    mesh.box(1.25, 0.22, 1.95, 630.5, deckHeight + 0.3, z, '#d7cfb8');
    mesh.box(1.25, 0.48, 0.28, 630.5, deckHeight + 0.5, z - 0.88, '#b8ad96');
  }
  for (const x of [622, 630]) {
    mesh.box(2.05, 0.15, 1.15, x, deckHeight + 0.79, -400.7, '#ae9e80');
    for (const offset of [-0.7, 0.7]) {
      mesh.box(1.98, 0.14, 0.35, x, deckHeight + 0.44, -400.7 + offset, '#798e86');
      mesh.box(0.18, 0.75, 1.65, x + offset, deckHeight + 0.375, -400.7, '#76776b');
    }
  }
  for (const z of [-400, -389]) {
    for (const x of [619.7, 634]) {
      mesh.box(0.15, 3.2, 0.15, x, deckHeight + 1.6, z, '#69675c');
    }
    for (let i = 0; i < 8; i++) {
      const x = 619.7 + (i * 14.3) / 8,
        X = x + 14.3 / 8;
      const height = (u: number) => deckHeight + 3.2 - 0.4 * Math.sin((Math.PI * (u - 619.7)) / 14.3);
      const y = height(x),
        Y = height(X);
      mesh.quad([x, y, z], [X, Y, z], [X, Y + 0.045, z], [x, y + 0.045, z], '#777060');
      if (i > 0) lights.box(0.14, 0.19, 0.14, x, y - 0.11, z, '#ffe7b6');
    }
  }
}

// A vertex-colored patch gives the string lights a local pool of light on the paving.
function terraceLight() {
  const geometry = new PlaneGeometry(16, 24, 12, 18);
  geometry.rotateX(-Math.PI / 2);
  const vertices = geometry.getAttribute('position'),
    colors: number[] = [];
  for (let i = 0; i < vertices.count; i++) {
    const x = Math.abs(vertices.getX(i)),
      z = vertices.getZ(i);
    const fade =
      Math.max(0, 1 - (x / 8) ** 4) * Math.max(0, 1 - (Math.min(Math.abs(z - 5.5), Math.abs(z + 5.5)) / 6.5) ** 2);
    colors.push(0.47 * fade, 0.3 * fade, 0.14 * fade);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = new MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    opacity: 0,
  });
  const glow = new Mesh(geometry, material);
  glow.position.set(626.7, deckHeight + 0.025, -394.5);
  glow.visible = false;
  // A lighting overlay is neither a roof nor a walkable surface.
  glow.raycast = () => {};
  return glow;
}

export function createOne12Courtland(buildings: VBuilding[], grid: GroundGrid) {
  const west = buildings.find((b) => b.id === westId),
    east = buildings.find((b) => b.id === eastId),
    link = buildings.find((b) => b.id === linkId);
  if (!west || !east || !link || west.rings.length !== 2 || east.rings.length !== 1 || link.rings.length !== 1)
    return null;
  const [outer, hole] = west.rings,
    ring = directed(east.rings[0], true);
  if (
    outer.length !== 6 ||
    ring.length !== 12 ||
    !pointInRing(590, -391, hole) ||
    !pointInRing(609, -380, outer) ||
    !pointInRing(625, -391, ring) ||
    !pointInRing(660, -416, ring) ||
    !pointInRing(615.4, -407, link.rings[0])
  )
    return null;
  const westGrades = outer.map(([x, z]) => grid.sample(x, z)),
    eastGrades = ring.map(([x, z]) => grid.sample(x, z));
  const valid = (a: (number | null)[]): a is number[] => a.every((h) => h !== null && Number.isFinite(h));
  if (!valid(westGrades) || !valid(eastGrades)) return null;
  const mesh = new Builder(),
    lights = new Builder();
  renovatedWing(mesh, lights, west, Math.min(...westGrades) - 0.25, grid);
  const base = Math.min(...eastGrades) - 0.35;
  // The open parking podium occupies the whole eastern record. Apartments cover its Courtland side.
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i],
      b = ring[(i + 1) % ring.length];
    const f = face(mesh, lights, b, a);
    if (Math.min(a[0], b[0]) > 633) continue; // The tower supplies these street walls down to grade.
    if (a[1] > -371 && b[1] > -371) {
      dobbsGarage(mesh, f, base);
      continue;
    }
    f.panel(0, f.width, base, deckHeight, 0, '#c4c2b4');
    const bays = Math.max(1, Math.round(f.width / 6));
    for (let j = 0; j < 5; j++)
      for (let k = 0; k < bays; k++) {
        const y = 315.1 + j * 3.53;
        f.panel(((k + 0.07) * f.width) / bays, ((k + 0.93) * f.width) / bays, y, y + 2.1, 0.035, '#596160');
      }
  }
  cap(mesh, ring, [], deckHeight, '#bcb6a4');
  poolCourt(mesh, lights);
  const wing: P2[] = [
    [634.46, -425.21],
    [666.93, -424.49],
    [666.02, -382.94],
    [663.73, -380.75],
    [663.66, -376.21],
    [665.27, -376.18],
    [665.17, -369.2],
    [633.43, -369.65],
    [634.12, -390.4],
    [647.13, -390.4],
    [647.36, -402.46],
    [634.63, -402.57],
  ];
  for (let i = 0; i < wing.length; i++) {
    const a = wing[i],
      b = wing[(i + 1) % wing.length],
      f = face(mesh, lights, a, b);
    const street = i <= 6;
    // Follow the ribbons across the Courtland jogs and back along the Dobbs corner.
    const wrap = i === 1 ? 'end' : i === 6 ? 'start' : i >= 2 && i <= 5 ? 'both' : 'none';
    towerFace(f, base, Math.max(1, Math.round(f.width / 3.7)), street, wrap, 125 + i);
    if (i === 1) sign(f);
  }
  cap(mesh, wing, [], towerRoof, '#bbbab1');
  for (let i = 0; i < wing.length; i++) {
    const a = wing[i],
      b = wing[(i + 1) % wing.length],
      f = face(mesh, lights, a, b);
    f.panel(0, f.width, towerRoof, 364.06, -0.3, '#c4c2b6');
    mesh.quad(
      f.pt(0, 364.06, -0.3),
      f.pt(f.width, 364.06, -0.3),
      f.pt(f.width, 364.06, 0),
      f.pt(0, 364.06, 0),
      limestone,
    );
  }
  for (const [x, z] of [
    [652, -412],
    [652, -384],
    [638, -422],
  ])
    mesh.box(3.5, 3.08, 4.2, x, towerRoof + 1.54, z, '#9b9e97');
  for (const x of [643, 657])
    for (const z of [-419, -413, -388, -378]) mesh.box(2.05, 0.96, 2.05, x, towerRoof + 0.48, z, '#9ca29f');
  // Elevated enclosed connection, with a clear passage underneath.
  const passage = directed(link.rings[0], false);
  cap(mesh, passage, [], 337.6, '#807e71');
  for (let i = 0; i < passage.length; i++) {
    const f = face(mesh, lights, passage[i], passage[(i + 1) % passage.length]);
    f.panel(0, f.width, 337.6, 344.55, 0, '#b1a599');
    f.panel(0.18, f.width - 0.18, 341.47, 343.49, 0.035, '#71838a');
  }
  cap(mesh, passage, [], 344.55, '#b8b4a6');
  const group = new Group();
  group.name = 'One12 Courtland';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  const shell = new Mesh(mesh.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  shell.castShadow = shell.receiveShadow = true;
  group.add(shell);
  const illuminated = new Mesh(
    lights.geometry(),
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#ffe1af', emissiveIntensity: 0 }),
  );
  const glow = terraceLight();
  group.add(illuminated, glow);
  return {
    group,
    buildings: buildings.filter((b) => b !== west && b !== east && b !== link),
    setNight(night: number) {
      illuminated.material.emissiveIntensity = night * 0.61;
      glow.visible = night > 0.001;
      glow.material.opacity = night * 0.31;
    },
  };
}
