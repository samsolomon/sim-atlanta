import {
  CanvasTexture,
  DoubleSide,
  Group,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  ShapeUtils,
  SRGBColorSpace,
  Vector2,
} from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const id = '53678626-003d-40da-86c2-cfe2fb7c63e7';
const deck = 306.8,
  lobby = 314.8,
  roof = 387.85;
const frame = '#e1dcd0',
  bronze = '#956052',
  shade = '#aaaba3';
const glass = ['#66888b', '#658185', '#6a9290', '#59787e'];

function roofLetters(group: Group, ne: P2, nw: P2, se: P2) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 60px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'white';
  ctx.fillText('A L T I T U D E', 256, 62, 480);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const material = new MeshLambertMaterial({
    color: '#394648',
    map,
    transparent: true,
    depthWrite: false,
    emissive: '#fff2e1',
    emissiveMap: map,
    emissiveIntensity: 0,
  });
  material.addEventListener('dispose', () => map.dispose());
  const shape = new PlaneGeometry(12.5, 1.65);
  for (const [a, b, offset] of [
    [ne, nw, 13],
    [se, ne, 54],
  ] as const) {
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const dx = (b[0] - a[0]) / len,
      dz = (b[1] - a[1]) / len;
    const sign = new Mesh(shape, material);
    sign.position.set(a[0] + dx * offset - dz * 0.16, roof - 0.9, a[1] + dz * offset + dx * 0.16);
    sign.rotation.y = Math.atan2(-dz, dx);
    group.add(sign);
  }
  return material;
}

export function createAltitudeApartments(buildings: VBuilding[], grid: GroundGrid) {
  const source = buildings.find((b) => b.id === id);
  if (!source || source.rings.length !== 1) return null;
  const ring = source.rings[0];
  const corner = (x: number, z: number) => ring.find(([a, b]) => Math.hypot(x - a, z - b) < 0.8);
  const nw = corner(829.03, -879.53),
    streetNE = corner(861.26, -879.36);
  const sw = corner(828.69, -814.88),
    streetSE = corner(860.9, -814.7);
  if (!nw || !streetNE || !sw || !streetSE) return null;
  const heights = ring.map(([x, z]) => grid.sample(x, z));
  if (!heights.every((h): h is number => h !== null && Number.isFinite(h))) return null;
  const base = Math.min(...heights) - 0.45;
  // The eastern 3.4 m of the mapped footprint is the lower Piedmont deck. The roof
  // returns on the slab stop around x=857.8, with points to the east down at deck height.
  const ne: P2 = [streetNE[0] - 3.4, streetNE[1]],
    se: P2 = [streetSE[0] - 3.4, streetSE[1]];
  const solid = new Builder(),
    lit = new Builder(),
    random = rng(250);
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i],
      [bx, bz] = ring[(i + 1) % ring.length];
    solid.quad([ax, base, az], [bx, base, bz], [bx, deck, bz], [ax, deck, az], '#bdb9a8');
    if (ax > 860 && bx > 860) {
      // The Piedmont approach shows dark openings under a continuous pale deck lip.
      const run = Math.hypot(bx - ax, bz - az);
      const openings = Math.max(1, Math.round(run / 7.4));
      const edge = (t: number, y: number) => [ax + (bx - ax) * t + 0.04, y, az + (bz - az) * t];
      for (let bay = 0; bay < openings; bay++) {
        const left = (bay + 0.08) / openings,
          right = (bay + 0.92) / openings;
        solid.quad(
          edge(left, deck - 3.2),
          edge(right, deck - 3.2),
          edge(right, deck - 0.75),
          edge(left, deck - 0.75),
          '#515a57',
        );
      }
    }
  }
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    ring.map(([x, z]) => new Vector2(x, z)),
    [],
  ))
    solid.tri(
      [ring[a][0], deck, ring[a][1]],
      [ring[c][0], deck, ring[c][1]],
      [ring[b][0], deck, ring[b][1]],
      '#c1bdae',
    );
  const walls = [nw, sw, se, ne]; // Clockwise in plan, starting on the west face.
  for (let face = 0; face < 4; face++) {
    const [ax, az] = walls[face],
      [bx, bz] = walls[(face + 1) % 4];
    const length = Math.hypot(bx - ax, bz - az),
      dx = (bx - ax) / length,
      dz = (bz - az) / length;
    const at = (u: number, y: number, out = 0) => [ax + dx * u - dz * out, y, az + dz * u + dx * out];
    const panel = (target: Builder, l: number, r: number, low: number, high: number, out: number, color: string) =>
      target.quad(at(l, low, out), at(r, low, out), at(r, high, out), at(l, high, out), color);
    const groups = face % 2 === 0 ? 7 : 3;
    const bay = length / groups,
      pitch = (roof - 1.85 - lobby) / 19;
    panel(solid, 0, length, deck, lobby, 0, '#637c79');
    panel(solid, 0, length, roof - 1.85, roof, 0.11, frame);
    for (let i = 0; i < groups; i++) {
      const l = i * bay,
        r = l + bay;
      const accent = (face === 3 && i === 1) || (face === 2 && i === 3);
      panel(solid, l, r, lobby, roof - 1.85, 0, accent ? bronze : frame);
      for (let row = 0; row < 19; row++) {
        const bottom = lobby + row * pitch + 0.88,
          top = lobby + (row + 1) * pitch - 0.12;
        for (let pane = 0; pane < 6; pane++) {
          const width = (bay - 0.7) / 6,
            x = l + 0.35 + pane * width;
          const occupied = random() < 0.17;
          panel(
            occupied ? lit : solid,
            x,
            x + width - 0.07,
            bottom,
            top,
            0.04,
            glass[Math.floor(random() * glass.length)],
          );
        }
      }
      // The piers stand proud of the continuous spandrels and continue through the glazed lobby.
      panel(solid, l, l + 0.44, deck, roof, 0.38, frame);
      solid.quad(
        at(l + 0.44, deck),
        at(l + 0.44, roof),
        at(l + 0.44, roof, 0.38),
        at(l + 0.44, deck, 0.38),
        shade,
      );
    }
  }
  const top = (p: P2) => [p[0], roof, p[1]];
  solid.quad(top(nw), top(ne), top(se), top(sw), '#b4b1a5');
  solid.box(9.5, 392.2 - roof, 19.1, 843.5, (392.2 + roof) / 2, -851.4, '#a8a69c');
  const group = new Group();
  group.name = 'Altitude Apartments';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  const mass = new Mesh(solid.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  mass.castShadow = mass.receiveShadow = true;
  const occupied = new MeshLambertMaterial({
    vertexColors: true,
    side: DoubleSide,
    emissive: '#f5d7b0',
    emissiveIntensity: 0,
  });
  group.add(mass, new Mesh(lit.geometry(), occupied));
  const lettering = roofLetters(group, ne, nw, se);
  return {
    group,
    buildings: buildings.filter((b) => b !== source),
    setNight(night: number) {
      lettering.emissiveIntensity = 0.95 * night;
      occupied.emissiveIntensity = 0.62 * night;
    },
  };
}
