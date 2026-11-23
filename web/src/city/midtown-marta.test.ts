import { readFileSync } from 'node:fs';
import { Mesh, Raycaster, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import type { VBuilding } from '../vignette/world';
import { createMidtownMarta } from './midtown-marta';

const directory = new URL('../../../pipeline/prototypes/square-board/midtown-upper/', import.meta.url);
const read = (name: string) => readFileSync(new URL(name, directory));
const grid = new GroundGrid(JSON.parse(read('ground.json').toString()), Uint8Array.from(read('ground.i16')).buffer);
const buildings: VBuilding[] = JSON.parse(read('context.json').toString()).buildings;
const site = buildings.find((b) => b.id === 'osm:way:269637886')!;

it.each(['low', 'high'] as const)(
  'clears the buried Arts Center roof at the audited east entrance on %s',
  (quality) => {
    const surface = new GroundSurface(grid, quality);
    const ground = (x: number, z: number) => surface.sampleScene(x, z);
    const station = createMidtownMarta(buildings, site, ground)!;
    try {
      expect(station.buildings).not.toContain(site);
      const ray = new Raycaster(new Vector3(451, 100, -3933), new Vector3(0, -1, 0));
      const hit = ray.intersectObject(station.group)[0];
      expect(hit.point.y - ground(451, -3933)!).toBeGreaterThan(3);
    } finally {
      surface.geometry.dispose();
      for (const child of station.group.children) {
        const mesh = child as Mesh;
        mesh.geometry.dispose();
        if (!Array.isArray(mesh.material)) mesh.material.dispose();
      }
    }
  },
);
