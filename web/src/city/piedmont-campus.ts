import { DoubleSide, Mesh, MeshLambertMaterial } from 'three';
import type { TransportRun } from '../terrain/transport-data';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';

const northDeck = 'osm:way:269196219';
const building105 = 'osm:way:289470493';
const core = 'osm:way:887724916';
const deckEnd: P2 = [-363.85, -6195.14];
const coreEnd: P2 = [-355.22, -6189.02];

export function piedmontCampusMassing(buildings: VBuilding[]): VBuilding[] {
  return buildings.map(building => {
    if (building.id === northDeck)
      return { ...building, cls: 'parking', h: building.h ?? 22.1 };
    if (building.id === building105)
      return { ...building, floors: building.floors ?? 5 };
    return building;
  });
}

const near = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.1;

export function piedmontNorthLink(buildings: VBuilding[], roads: TransportRun[],
  groundAt: (x: number, z: number) => number | null) {
  if (!buildings.some(b => b.id === northDeck) || !buildings.some(b => b.id === core)) return null;
  const run = roads.find(r => r.cls === 'footway' && r.kind === 'bridge' && r.pts.length === 2 &&
    ((near(r.pts[0], deckEnd) && near(r.pts[1], coreEnd)) || (near(r.pts[1], deckEnd) && near(r.pts[0], coreEnd))));
  if (!run) return null;
  const dx = coreEnd[0] - deckEnd[0], dz = coreEnd[1] - deckEnd[1], length = Math.hypot(dx, dz);
  const ux = dx / length, uz = dz / length;
  const grade = groundAt(deckEnd[0] + dx / 2, deckEnd[1] + dz / 2);
  if (grade === null) return null;
  const floor = grade + 5.8;
  const point = (s: number, side: number, h: number) =>
    [deckEnd[0] + ux * s - uz * side, floor + h, deckEnd[1] + uz * s + ux * side];
  const b = new Builder();
  const start = -0.65, end = length + 0.65, half = 1.7;
  for (const side of [-half, half]) {
    const panel = (a: number, c: number, lo: number, hi: number, colour: string) =>
      b.quad(point(a, side, lo), point(c, side, lo), point(c, side, hi), point(a, side, hi), colour);
    panel(start, end, -0.35, 0.78, '#888077');
    panel(start, end, 0.78, 2.95, '#536668');
    panel(start, end, 2.95, 3.35, '#a8a299');
    for (let u = 0.3; u < length; u += 1.55) panel(u, u + 0.1, 0.78, 2.95, '#b8b3a8');
  }
  b.quad(point(start, -half, 3.35), point(end, -half, 3.35), point(end, half, 3.35), point(start, half, 3.35), '#a4a49b');
  b.quad(point(start, half, -0.35), point(end, half, -0.35), point(end, -half, -0.35), point(start, -half, -0.35), '#77736c');
  const mesh = new Mesh(b.geometry(), new MeshLambertMaterial({ vertexColors: true, side: DoubleSide }));
  mesh.name = 'Piedmont North Parking enclosed link';
  mesh.castShadow = mesh.receiveShadow = true;
  return { mesh, run, dispose() { mesh.geometry.dispose(); mesh.material.dispose(); } };
}
