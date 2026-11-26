import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { northConnectorTransport } from '../square-board/connector-ground';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import { Builder } from '../vignette/geom';
import { drawStreetBridges } from './street-bridges';
import { GroundGrid } from './grid';
import { createSurfaceTransport } from './transport';
import type { TerrainCity, TransportRun } from './transport-data';

const root = new URL('../../../pipeline/prototypes/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const loadGrid = (path: string) =>
  new GroundGrid(
    JSON.parse(read(path + '/ground.json').toString()),
    Uint8Array.from(read(path + '/ground.i16')).buffer,
  );
const grid = loadGrid('downtown-ground'),
  zero = grid.manifest.vertical.sceneZeroNavd88M;
const ground = (x: number, z: number) => {
  const h = grid.sample(x, z);
  return h === null ? null : h - zero;
};
const decatur: TransportRun = {
  cls: 'secondary',
  kind: 'bridge',
  pts: [
    [803.92, 449.42],
    [817.68, 452.25],
    [833.03, 453.64],
    [857.01, 454],
    [920.09, 454.95],
  ],
};
const north: TransportRun = {
  cls: 'footway',
  sub: 'sidewalk',
  kind: 'bridge',
  pts: [
    [921.92, 446.53],
    [878.91, 444.3],
    [837.59, 443.31],
    [809.96, 440.02],
    [802.52, 437.55],
  ],
};
const south: TransportRun = {
  cls: 'footway',
  sub: 'sidewalk',
  kind: 'bridge',
  pts: [
    [801.87, 457.66],
    [815.7, 460.5],
    [843.92, 462.35],
    [900.08, 461.96],
    [917.54, 461.97],
  ],
};
const city = (roads: TransportRun[], bounds = grid.manifest.bounds): TerrainCity => ({
  bounds,
  roads: [],
  rail: [],
  buildings: [],
  terrainTransport: { version: 1, roads, rail: [] },
});

describe('Decatur Street beam deck', () => {
  it('carries both curbs and every interval between them above the freeway', () => {
    const deck = createSurfaceTransport(city([decatur, north, south]), grid, ground);
    try {
      deck.group.updateMatrixWorld(true);
      for (let z = 442.5; z <= 462; z += 0.25) {
        const x = 856,
          ray = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(deck.group, true)[0];
        expect(hit?.point.y, 'open slot at z=' + z).toBeGreaterThan(ground(x, z)! + 7);
      }
      for (const [z, owner] of [
        [443.8, north],
        [454, decatur],
        [462, south],
      ] as const) {
        const y = deck.deckAt(856, z, owner);
        expect(y).not.toBeNull();
        expect(y! + zero).toBeCloseTo(310.9, 0);
      }
      expect(deck.deckAt(856, 454, north)).toBeNull();
      expect(deck.deckAt(856, 443.8, decatur)).toBeNull();
      expect(deck.deckAt(856, 437, north)).toBeNull();
    } finally {
      deck.dispose();
    }
  });

  it('keeps an independent pedestrian span on its own grade', () => {
    const separate: TransportRun = {
      cls: 'footway',
      kind: 'bridge',
      pts: [
        [598.95, 490.2],
        [636.76, 446.54],
      ],
    };
    const deck = createSurfaceTransport(city([decatur, north, south, separate]), grid, ground);
    try {
      expect(deck.deckAt(617.855, 468.37, separate)).not.toBeNull();
      expect(deck.deckAt(617.855, 468.37, decatur)).toBeNull();
      expect(deck.deckAt(854, 450, separate)).toBeNull();
    } finally {
      deck.dispose();
    }
  });
});

it('shares the Peachtree grade across the downtown and north-band cut', () => {
  const peer = loadGrid('square-board/north-band');
  const mount = (g: GroundGrid, pts: TransportRun['pts']) => {
    const road: TransportRun = { cls: 'secondary', kind: 'bridge', pts };
    const groundAt = (x: number, z: number) => {
      const h = g.sample(x, z);
      return h === null ? null : h - zero;
    };
    return { road, deck: createSurfaceTransport(city([road], g.manifest.bounds), g, groundAt) };
  };
  const a = mount(grid, [
    [557.97, -1234.74],
    [559.66, -1241.96],
    [562.2, -1254.51],
    [564.42, -1267.12],
    [566.08, -1278.79],
    [567.47, -1300],
  ]);
  const b = mount(peer, [
    [567.47, -1300],
    [567.83, -1305.47],
    [567.99, -1321.2],
  ]);
  try {
    for (const x of [560, 564, 570, 574]) {
      const ay = a.deck.deckAt(x, -1300, a.road),
        by = b.deck.deckAt(x, -1300, b.road);
      expect(ay).not.toBeNull();
      expect(by).toBeCloseTo(ay!, 4);
    }
  } finally {
    a.deck.dispose();
    b.deck.dispose();
  }
});

const stagedDowntown = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
it.skipIf(!existsSync(stagedDowntown))('mounts the staged streets and both sidewalks on every covered board', () => {
  const downtown: TerrainCity = JSON.parse(readFileSync(stagedDowntown, 'utf8'));
  const band = (name: string) => JSON.parse(read('square-board/' + name + '/context.json').toString());
  const boards = [
    [downtown, 4, 6], // Decatur, the two MLK ways, and the downtown half of Peachtree
    [northConnectorTransport(band('north-band')), 2, 4], // Peachtree and Ted Turner
    [southConnectorTransport(band('south-band')), 1, 2], // Capitol
  ] as const;
  for (const [board, streets, walks] of boards) {
    const replaced = [...drawStreetBridges(board, zero, () => null, new Builder(), new Map())];
    expect(replaced.filter(r => r.cls === 'footway')).toHaveLength(walks);
    expect(replaced.filter(r => r.cls !== 'footway')).toHaveLength(streets);
  }
});

it('samples the Ted Turner banks without pulling its first interior section down to the freeway', () => {
  const context = JSON.parse(read('square-board/north-band/context.json').toString());
  const board = northConnectorTransport(context);
  const grid = loadGrid('square-board/north-band');
  const road = board.terrainTransport!.roads.find(r => r.name === 'Ted Turner Drive Northwest' && r.kind === 'bridge')!;
  // First interior cross-section of the survey, 5.7 m from the skew abutment.
  const x = 308.76, z = -1416.89;
  const deck = createSurfaceTransport(board, grid, (px, pz) =>
    Math.hypot(px - x, pz - z) < 12 && pz < -1415 && px > 299 ? 285 - zero : 303.2 - zero);
  try {
    expect(deck.deckAt(x, z, road)! + zero).toBeCloseTo(303.7, 0);
  } finally {
    deck.dispose();
  }
});

// Jackson Street NE over Freedom Parkway (NBI 000000012104290): one 18.9 m deck
// with a 13.4 m roadway and 2.4 m raised sidewalks behind ~0.35 m parapets. It was
// drawn as a 9 m roadway and two 1.95 m walk strips standing off it over open gaps.
it('draws Jackson Street as one deck with its sidewalks on the slab', async () => {
  const { auburnTransport } = await import('../city/sweet-auburn-transport');
  const context = JSON.parse(read('square-board/north-corner/context.json').toString());
  const city = auburnTransport(context);
  const corner = loadGrid('square-board/north-corner'), z0 = corner.manifest.vertical.sceneZeroNavd88M;
  const builder = new Builder(), treads = new Map<TransportRun, number[]>();
  const replaced = drawStreetBridges(city, z0, (x, z) => (corner.sample(x, z) ?? z0) - z0, builder, treads);
  const runs = [...replaced];
  expect(runs.filter(r => r.cls === 'tertiary' && r.pts.some(([x, z]) => Math.hypot(x - 1598.4, z + 697) < 35))).toHaveLength(1);
  expect(runs.filter(r => r.cls === 'footway' && r.pts.some(([x, z]) => Math.abs(x - 1590.6) < 1.5 || Math.abs(x - 1606.5) < 1.5))).toHaveLength(2);
  const survey = JSON.parse(readFileSync(new URL('connector-footprint/street-bridges.json', root), 'utf8'));
  const jackson = survey.find((d: { outline: number }) => d.outline === 1451196894);
  for (const r of jackson.rows) {
    const width = Math.hypot(r[3] - r[0], r[4] - r[1]);
    expect(width).toBeGreaterThan(18.6);
    expect(width).toBeLessThan(19.8);
    expect((r[8] - r[6]) * width).toBeCloseTo(13.4, 0);
  }
});
