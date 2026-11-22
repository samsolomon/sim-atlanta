import * as THREE from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import type { GroundGrid } from '../terrain/grid';

const ID = 'fc0ebaec-e791-4f06-8a3d-b560d49032f2';
const screenWidth = 25 * .3048, screenHeight = 80 * .3048;
// Clockwise from true north. The panel is aimed into the Grady Curve.
const azimuth = 40 * Math.PI / 180;

/** Replace the stack's generic floor bands, centered on its mapped base. See docs/corey-tower.md. */
export function createCoreyTower(buildings: VBuilding[], grid: GroundGrid) {
  const tower = buildings.find(b => b.id === ID);
  if (!tower || tower.rings.length !== 1 || tower.rings[0].length < 3) return null;
  const ring = tower.rings[0];
  const range = (axis: 0 | 1) => {
    const values = ring.map(p => p[axis]);
    return [Math.min(...values), Math.max(...values)];
  };
  const [west, east] = range(0), [north, south] = range(1);
  const x = (east + west) / 2, z = (north + south) / 2;
  const baseRadius = (east - west + south - north) / 4;
  const level = grid.sample(x, z);
  const perimeter = ring.map(([x, z]) => grid.sample(x, z));
  if (level === null || perimeter.some(h => h === null) || Math.abs(baseRadius - 8) > 1) return null;
  const b = new Builder();
  function cylinder(bottomRadius: number, topRadius: number, low: number, high: number, color: string,
    u = 0, v = 0, sides = 32) {
    const part = new THREE.CylinderGeometry(topRadius, bottomRadius, high - low, sides);
    part.translate(u, (high + low) / 2, v);
    b.addGeometry(part, color);
    part.dispose();
  }
  const foundation = Math.min(level, ...perimeter as number[]) - level - .45;
  const height = 91.44; // Owner's 300 ft, also the OSM and baked height.
  cylinder(baseRadius, baseRadius, foundation, 2.5, '#383938');
  cylinder(baseRadius, 5.48, 2.5, 3.65, '#d1d0c9');
  cylinder(5.48, 3.87, 3.65, height - .48, '#edece5');
  cylinder(4.04, 4.04, height - .48, height, '#697176');
  cylinder(2.55, 2.55, height, height + .48, '#a5a7a3');
  for (const [u, v] of [[-.8, -.65], [.9, .65]]) cylinder(.43, .43, height + .48, height + 1.48, '#555b5c', u, v, 10);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    cylinder(.055, .055, height, height + .85, '#60696c', 3.65 * Math.cos(a), 3.65 * Math.sin(a), 4);
  }

  // Here local -z faces the traffic. In 2018 lidar the top of the sign frame is at
  // about 383 m NAVD88; the catalog gives the illuminated area in feet.
  const screenTop = 382.75 - level, bottom = screenTop - screenHeight;
  const mid = (bottom + screenTop) / 2;
  for (const y of [bottom + 2, mid, screenTop - 2])
    b.box(5.4, .48, 2.6, 0, y, -3.85, '#676d6d');
  b.box(screenWidth + .38, screenHeight + .38, .56, 0, mid, -5.03, '#4f5354');
  const shell = new THREE.Mesh(b.geometry(), new THREE.MeshLambertMaterial({vertexColors: true}));
  shell.castShadow = shell.receiveShadow = true;

  // A fixed, illustrative ATL card based on the owner's house creative. Only the
  // front emits light. The painted rear and the steel carriage take the scene lighting.
  const artwork = new Builder();
  const faceZ = -5.34;
  const quad = (poly: P2[], color: string) => {
    const v = poly.map(([u, y]) => [u, y, faceZ - .025]);
    artwork.quad(v[0], v[1], v[2], v[3], color);
  };
  artwork.quad([-screenWidth/2, bottom, faceZ], [-screenWidth/2, screenTop, faceZ],
    [screenWidth/2, screenTop, faceZ], [screenWidth/2, bottom, faceZ], '#b63531');
  const letter = '#fff3d8';
  // Local positive x appears on the viewer's left on the north face.
  function stroke(x0: number, y0: number, x1: number, y1: number, width: number) {
    const length = Math.hypot(x1 - x0, y1 - y0);
    const du = -(y1 - y0) * width / (2 * length), dy = (x1 - x0) * width / (2 * length);
    quad([[-x0-du,y0+dy],[-x1-du,y1+dy],[-x1+du,y1-dy],[-x0+du,y0-dy]],letter);
  }
  const a = bottom + 15.7, t = bottom + 9.3, l = bottom + 2.7;
  stroke(-2.0, a, 0, a + 4.9, .92);
  stroke(0, a + 4.9, 2.0, a, .92);
  stroke(-1.25, a + 1.65, 1.25, a + 1.65, .78);
  stroke(-2.25, t + 4.85, 2.25, t + 4.85, .98);
  stroke(0, t, 0, t + 4.9, .98);
  stroke(-1.45, l, -1.45, l + 4.85, .98);
  stroke(-1.9, l, 1.95, l, .98);
  const panel = new THREE.Mesh(artwork.geometry(), new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.DoubleSide}));
  // The opaque steel backing occludes the artwork from the reverse.
  const group = new THREE.Group();
  group.name = 'Corey Tower';
  group.position.set(x, level - grid.manifest.vertical.sceneZeroNavd88M, z);
  group.rotation.y = -azimuth;
  group.add(shell, panel);
  return {group, buildings: buildings.filter(b => b !== tower)};
}
