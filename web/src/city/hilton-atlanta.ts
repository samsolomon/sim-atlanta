import { StaticLandmarkMaterial } from '../materials/landmark-batch';
import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
  ShapeUtils,
  SRGBColorSpace,
  Vector2,
} from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, rng, type P2 } from '../vignette/geom';
import { clipRing, type VBuilding } from '../vignette/world';

const towerId = '20ecbeda-7f1c-4009-b976-c005905f6e7a';
const northDeckId = 'f7303311-3c8f-4a65-8414-b96c4b6753f4';
const podiumId = 'c97061e3-9654-4b96-88de-06d74037fa35';
const wingsRoof = 395.6;
const stone = '#d6cdbb',
  reveal = '#aca18c';
const glazing = ['#48525a', '#626261', '#59616a', '#6e706d'];

function site(buildings: VBuilding[], grid: GroundGrid, id: string, anchors: P2[]) {
  const source = buildings.find((b) => b.id === id);
  if (!source || source.rings.length !== 1) return null;
  const ring = source.rings[0];
  if (!anchors.every(([x, z]) => ring.some(([a, b]) => Math.hypot(x - a, z - b) < 1))) return null;
  const ground = ring.map(([x, z]) => grid.sample(x, z));
  if (!ground.every((h): h is number => h !== null && Number.isFinite(h))) return null;
  return { source, ring, base: Math.min(...ground) - 0.4 };
}

function plate(shell: Builder, ring: P2[], bottom: number, top: number, wall: string, roof: string) {
  if (ring.length < 3) return;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i],
      [bx, bz] = ring[(i + 1) % ring.length];
    shell.quad([ax, bottom, az], [ax, top, az], [bx, top, bz], [bx, bottom, bz], wall);
  }
  for (const [a, b, c] of ShapeUtils.triangulateShape(
    ring.map(([x, z]) => new Vector2(x, z)),
    [],
  )) {
    shell.tri([ring[a][0], top, ring[a][1]], [ring[c][0], top, ring[c][1]], [ring[b][0], top, ring[b][1]], roof);
  }
}

function rooftopName(group: Group, x: number, z: number, angle: number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'white';
  ctx.fillText('Hilton', 128, 72);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  const material = new MeshBasicMaterial({ map, transparent: true, depthWrite: false });
  material.addEventListener('dispose', () => map.dispose());
  const sign = new Mesh(new PlaneGeometry(8, 3), material);
  sign.rotation.y = angle;
  sign.position.set(x, wingsRoof - 2.1, z);
  group.add(sign);
}

function hotel(shell: Builder, lit: Builder, wash: Builder, group: Group, ring: P2[], base: number) {
  const random = rng(255);
  const winding = Math.sign(ShapeUtils.area(ring.map(([x, z]) => new Vector2(x, z))));
  const roomBase = 320.8,
    roofBand = wingsRoof - 1.6;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i],
      [bx, bz] = ring[(i + 1) % ring.length];
    const len = Math.hypot(bx - ax, bz - az);
    if (!len) continue;
    const dx = (bx - ax) / len,
      dz = (bz - az) / len;
    const pt = (u: number, y: number, out = 0) => [
      ax + u * dx + dz * winding * out,
      y,
      az + u * dz - dx * winding * out,
    ];
    const panel = (batch: Builder, l: number, r: number, low: number, high: number, out: number, color: string) =>
      batch.quad(pt(l, low, out), pt(r, low, out), pt(r, high, out), pt(l, high, out), color);

    // The three exposed wing tips are blind. The indented faces between them are glazed.
    const end = len > 17 && ((az < -880 && bz < -880) || (az > -812 && bz > -812) || (ax > 800 && bx > 800));
    if (end) {
      panel(shell, 0, len, base, wingsRoof, 0, stone);
      const mid = len / 2;
      panel(shell, mid - 1.1, mid + 1.1, base, wingsRoof, 0.32, reveal);
      for (const u of [mid - 1.1, mid + 1.1]) {
        shell.quad(pt(u, base), pt(u, wingsRoof), pt(u, wingsRoof, 0.32), pt(u, base, 0.32), stone);
      }
      if (az > -812 && bz > -812) {
        const [x, , z] = pt(len * 0.74, wingsRoof, 0.36);
        rooftopName(group, x, z, Math.atan2(dz * winding, -dx * winding));
        // Light on the photographed Courtland end fades upwards from the street.
        wash.quad(
          pt(0, base, 0.09),
          pt(len, base, 0.09),
          pt(len, wingsRoof, 0.09),
          pt(0, wingsRoof, 0.09),
          'white',
        );
        const warm = new Color('#e0a268'),
          dim = new Color('#604932');
        wash.col.length -= 18;
        for (const tint of [warm, warm, dim, warm, dim, dim]) wash.col.push(tint.r, tint.g, tint.b);
      }
      continue;
    }
    // The shaft outline contains an intermediate vertex along the southwest wing.
    // Classify each elevation by its position beyond the surveyed central core.
    const midZ = (az + bz) / 2;
    const roomWall = midZ < -868 || midZ > -829 || (ax + bx) / 2 > 768;
    panel(shell, 0, len, base, wingsRoof, 0, roomWall ? stone : '#526374');
    if (!roomWall) continue;
    const bays = Math.max(1, Math.round(len / 3.9)),
      pitch = len / bays;
    // Lower convention floors have tall glazed openings under the guest-room grid.
    for (let bay = 0; bay < bays; bay++) {
      const l = bay * pitch,
        r = l + pitch;
      panel(shell, l + 0.32, r - 0.32, base + 0.7, roomBase - 0.5, 0.035, '#46535b');
      for (let f = 0; f < 25; f++) {
        const floor = (roofBand - roomBase) / 25,
          y = roomBase + f * floor;
        const tint = glazing[Math.floor(random() * glazing.length)];
        const batch = random() < 0.21 ? lit : shell;
        panel(batch, l + 0.36, r - 0.36, y + 0.48, y + floor - 0.15, 0.045, tint);
        panel(shell, l + pitch * 0.5, l + pitch * 0.5 + 0.075, y + 0.48, y + floor - 0.15, 0.07, '#878885');
      }
      // The paired vertical reveals give the pale grid depth when viewed along a wing.
      shell.quad(pt(l, roomBase), pt(l, roomBase, 0.43), pt(l, wingsRoof, 0.43), pt(l, wingsRoof), reveal);
      panel(shell, l, l + 0.3, roomBase, wingsRoof, 0.43, stone);
    }
  }
  plate(shell, ring, wingsRoof - 0.12, wingsRoof, stone, '#9b9183');
  const crown: P2[] = [
    [735, -863],
    [743, -867],
    [765, -854],
    [767, -844],
    [743, -830],
    [734, -837],
  ];
  plate(shell, crown, wingsRoof, 398.4, '#5b6366', '#e0dcd1');
  plate(shell, crown, 398.4, 399.1, stone, stone);
  plate(shell, crown, 399.1, 402.2, '#5b6366', stone);
  plate(shell, crown, 402.2, 402.9, stone, stone);
  plate(shell, crown, 402.9, 407.9, '#5b6366', stone);
  plate(shell, crown, 407.9, 408.8, stone, '#ded9cb');
  plate(
    shell,
    [
      [743, -853],
      [751, -865],
      [760, -859],
      [758, -838],
      [750, -834],
      [742, -846],
    ],
    408.8,
    411.8,
    '#b2aa9c',
    '#cdc7bc',
  );
}

export function createHiltonAtlanta(buildings: VBuilding[], grid: GroundGrid) {
  const tower = site(buildings, grid, towerId, [
    [713.26, -810.9],
    [715.33, -884.86],
    [802.81, -859],
    [759.38, -838.17],
  ]);
  const north = site(buildings, grid, northDeckId, [
    [804, -914.13],
    [753.01, -914.6],
    [734.06, -894.59],
    [802.81, -859],
  ]);
  const podium = site(buildings, grid, podiumId, [
    [752.31, -792.79],
    [855.47, -790.41],
    [829.03, -879.53],
    [804, -914.13],
    [759.38, -838.17],
  ]);
  if (!tower && !north && !podium) return null;
  const group = new Group();
  const shell = new Builder(),
    rooms = new Builder(),
    wash = new Builder();
  if (tower) hotel(shell, rooms, wash, group, tower.ring, tower.base);
  const bounds = grid.manifest.bounds;
  if (north) {
    plate(shell, north.ring, north.base, 315.7, '#b1a993', '#bcb7a8');
    plate(shell, clipRing(north.ring, { ...bounds, minX: 752.9 }), 315.7, 321.1, '#c2bba9', '#ab7965');
    // The elevated recreation deck appears between the northern pair of wings in the aerial.
    shell.box(21, 0.1, 10.5, 781, 321.15, -900, '#688d7e');
  }
  if (podium) {
    plate(shell, podium.ring, podium.base, 306.8, '#b6aea0', '#a6a195');
    const south = clipRing(podium.ring, { ...bounds, maxX: 811.5, minZ: -830 });
    plate(shell, south, 306.8, 322.1, '#c2b7a2', '#beb9ad');
    const link = clipRing(podium.ring, { ...bounds, minX: 803, maxX: 829, minZ: -852, maxZ: -843 });
    plate(shell, link, 306.8, 313.3, '#999384', '#bcb7aa');
  }
  group.name = 'Hilton Atlanta';
  group.position.y = -grid.manifest.vertical.sceneZeroNavd88M;
  const mass = new Mesh(shell.geometry(), new StaticLandmarkMaterial());
  mass.castShadow = mass.receiveShadow = true;
  group.add(mass);
  const night = tower
    ? new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#f6d3a1', emissiveIntensity: 0 })
    : null;
  if (night) group.add(new Mesh(rooms.geometry(), night));
  const flood = wash.pos.length
    ? new MeshBasicMaterial({
        vertexColors: true,
        side: DoubleSide,
        transparent: true,
        forceSinglePass: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
      })
    : null;
  if (flood) group.add(new Mesh(wash.geometry(), flood));
  return {
    group,
    buildings: buildings.filter((b) => b !== tower?.source && b !== north?.source && b !== podium?.source),
    setNight(value: number) {
      if (night) night.emissiveIntensity = value * 0.75;
      if (flood) flood.opacity = value * 0.58;
    },
  };
}
