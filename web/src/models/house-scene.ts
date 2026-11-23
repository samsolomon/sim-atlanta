import * as THREE from 'three';
import { FAMILIES, residential, type HouseForce, type HouseStyle, type Siding } from '../city/residential';
import type { TerrainCity } from '../terrain/transport-data';
import type { P2 } from '../vignette/geom';
import { World, type VBuilding } from '../vignette/world';

export const HOUSE_KINDS = {
  houses: 'House styles by storey',
  materials: 'Siding swatches',
} as const;
export type HouseKind = keyof typeof HOUSE_KINDS;

export const HOUSE_NOTES: Record<HouseKind, string> = {
  houses: 'Rows, front to back: Colonial, Craftsman and Tudor revival. Columns, left to right: one, two and three storeys. Each faces the street in front of its row. Windows are composed per wall, and a trim belt marks each floor. ',
  materials: 'Rows, front to back: lap siding, brick, cedar shingle and stucco, each in every colour of its family, as two-storey Colonials. ',
};

const rect = (x: number, z: number, w: number, d: number): P2[] => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
const road = (z: number) => ({ cls: 'residential', name: 'Lab St', bridge: false, tunnel: false, pts: [[-60, z], [60, z]] as P2[] });

function layout(kind: HouseKind) {
  const buildings: VBuilding[] = [], force: Record<string, HouseForce> = {}, roads: ReturnType<typeof road>[] = [];
  const house = (id: string, ring: P2[], f: HouseForce) => {
    buildings.push({ id, cls: 'house', h: null, floors: null, rings: [ring] });
    force[id] = f;
  };
  if (kind === 'houses') {
    const styles: HouseStyle[] = ['colonial', 'craftsman', 'tudor'];
    styles.forEach((style, row) => {
      const z = 20 - row * 24;
      roads.push(road(z + 12));
      [1, 2, 3].forEach((storeys, col) => house(`lab-${style}-${storeys}`, rect(-20 + col * 15, z, 11, 9), { style, storeys }));
    });
  } else {
    const families: Siding[] = ['clapboard', 'brick', 'shingle', 'stucco'];
    families.forEach((siding, row) => {
      const z = 20 - row * 15, colours = [...new Set(FAMILIES[siding])];
      roads.push(road(z + 10));
      colours.forEach((wall, col) => house(`lab-${siding}-${col}`, rect(-40 + col * 10, z, 8, 7), { style: 'colonial', siding, wall, storeys: 2 }));
    });
  }
  return { buildings, force, roads };
}

/** A row of houses drawn exactly as City draws them (World plus the residential finish). */
export function createHouseScene(kind: HouseKind, quality: 'high' | 'low') {
  const { buildings, force, roads } = layout(kind);
  const city = { bounds: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 }, buildings, roads, rail: [] } as unknown as TerrainCity;
  const homes = residential(city, undefined, undefined, undefined, quality, force);
  const world = new World(homes.city, null, { terrain: 'flat', lightMapMax: 256 } as never);
  world.buildBuildings(() => 0, quality === 'low' ? 3 : 8, homes.finishFor);
  let triangles = 0, draws = 0;
  world.group.traverse(o => {
    if (o instanceof THREE.Mesh) {
      draws++;
      const g = o.geometry as THREE.BufferGeometry;
      triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
      o.castShadow = o.receiveShadow = true;
    }
  });
  return {
    group: world.group, draws, triangles, houses: homes.count,
    setNight: (n: number) => world.setNight(n),
    dispose: () => { world.group.removeFromParent(); world.dispose(); },
  };
}
