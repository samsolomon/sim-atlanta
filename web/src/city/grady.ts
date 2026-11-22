import * as THREE from 'three';
import { Builder, pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import type { GroundGrid } from '../terrain/grid';

// In this frame u runs from Jesse Hill toward Pratt and v along the wards toward Gilmer.
// Coordinates and roof elevations (NAVD88 metres) are traced in docs/grady.md.
const ID = 'b17dc236-2262-42f8-bb5b-f4d1ad993d9a';
const angle = 41 * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
const sand = '#c9ad92', limestone = '#ded0bc', glass = '#47646c', coping = '#c6bca9';
const rectangle = (left: number, right: number, back: number, front: number): P2[] =>
  [[left, back], [right, back], [right, front], [left, front]];

/** Only the main hospital is replaced. Correll Pavilion and the two decks have their own footprints. */
export function createGrady(buildings: VBuilding[], grid: GroundGrid) {
  const hospital = buildings.find(building => building.id === ID);
  if (!hospital || hospital.rings.length !== 1) return null;
  const ring = hospital.rings[0];
  const local: P2[] = ring.map(([x, z]) => [(x - 880) * c + (z - 240) * s, -(x - 880) * s + (z - 240) * c]);
  // Keep the ordinary extrusion if a future bake splits the hospital into parts.
  if (![[-55, -65], [31, -48], [10, 75]].every(([u, v]) => pointInRing(u, v, local))) return null;
  const floor = ring.map(([x, z]) => grid.sample(x, z));
  if (floor.some(h => h === null)) return null;
  const bottom = Math.min(...floor as number[]) - 0.6;
  const b = new Builder(), lit = new Builder();
  const group = new THREE.Group();
  group.name = 'Grady Memorial Hospital';
  group.rotation.y = -angle;
  group.position.set(880, -grid.manifest.vertical.sceneZeroNavd88M, 240);

  function volume(poly: P2[], base: number, roof: number, wall: string, membrane: string) {
    const tris = THREE.ShapeUtils.triangulateShape(poly.map(([u, v]) => new THREE.Vector2(u, v)), []);
    for (const [i, j, k] of tris) b.tri([poly[k][0], roof, poly[k][1]], [poly[j][0], roof, poly[j][1]], [poly[i][0], roof, poly[i][1]], membrane);
    for (let i = 0; i < poly.length; i++) {
      const [u, v] = poly[i], [x, z] = poly[(i + 1) % poly.length];
      b.quad([u, base, v], [x, base, z], [x, roof, z], [u, roof, v], wall);
    }
  }
  // Rows of windows stop at the solid end piers. A few individual rooms light up at dusk.
  function block(u0: number, u1: number, v0: number, v1: number, base: number, top: number,
    wall = sand, rows = true, roof = '#b7afa1') {
    volume(rectangle(u0, u1, v0, v1), base, top, wall, roof);
    if (!rows) return;
    const corners = rectangle(u0 - .04, u1 + .04, v0 - .04, v1 + .04);
    for (let i = 0; i < 4; i++) {
      const [u, v] = corners[i], [x, z] = corners[(i + 1) % 4];
      const length = Math.hypot(x - u, z - v), du = (x - u) / length, dv = (z - v) / length;
      const pier = Math.min(2.5, length * .18), count = Math.max(1, Math.round((length - 2 * pier) / 3.6));
      const pitch = (length - 2 * pier) / count;
      const pane = (builder: Builder, a: number, end: number, y: number, h: number, color: string, offset = 0) => {
        const p = (t: number, height: number) => [u + du * t + dv * offset, height, v + dv * t - du * offset];
        builder.quad(p(a, y), p(end, y), p(end, y + h), p(a, y + h), color);
      };
      for (let y = 308.2; y < top - 2.7; y += 4.05) {
        if (y < base + .5) continue;
        pane(b, pier, length - pier, y, 1.85, glass);
        for (let j = 0; j < count; j++) {
          const a = pier + pitch * j;
          pane(b, a, a + .24, y, 1.85, '#9b9182', .04);
          if (Math.abs(Math.round(y * 3 + u + v + j * 11)) % 7 < 2)
            pane(lit, a + .28, a + pitch - .12, y + .1, 1.6, '#ffc783', .08);
        }
      }
    }
  }
  volume(local, bottom, 313.5, limestone, '#aba69e');

  // Low infill roofs between the two bars, the south clinical block, and its raised return.
  block(-44, 38, -72, -49, 313.5, 322.8, limestone);
  block(-18, 18, -49, 19, 313.5, 322.8, limestone);
  block(-36.8, 62.4, 53.2, 80.8, 313.5, 347.5, limestone);
  block(-6.5, 31.8, 80.8, 92.8, 313.5, 340.5, limestone);
  block(-36, 35, 19, 37.5, 313.5, 343.5, limestone);
  block(-9, 34.8, 37.5, 53.2, 313.5, 346.5, limestone);

  // A/B on the entrance side, C/D on Pratt, E spanning the two. Lidar resolves a
  // second setback on the ward roofs and a still higher plant room over E.
  for (const [u0, u1] of [[-38.5, -24.5], [23.5, 37.8]]) {
    block(u0, u1, -60.6, 18.2, 313.5, 376.5);
    block(u0 + 3.4, u1 - 1.3, -40.4, -1.4, 376.5, 381.0);
  }
  block(-24.5, 23.5, -28.8, -13.6, 313.5, 382.4);
  block(-16.5, 16.4, -28.4, -17.2, 382.4, 387.1, coping, false);
  block(-11.6, 13.6, -26.4, -18.3, 387.1, 391.2, sand, false, '#8e8980');

  // The two fingers toward the Connector have broad blind ends and a lower outer tier.
  for (const v of [-55.7, .2]) {
    block(37.8, 50.1, v, v + 14, 313.5, 364.4);
    block(50.1, 56, v + .3, v + 13.7, 313.5, 360.5);
  }

  // Jesse Hill's street wall carries two marked roof pads, photographed from overhead.
  block(-62.2, -47.1, -75.3, 33, 313.5, 372.1, limestone, false);
  for (const v of [-56.6, 3]) block(-47.1, -38.5, v, v + 11, 313.5, 372.1, limestone);
  for (const [v, radius] of [[-64.5, 7.2], [24.7, 8.1]]) {
    const disk: P2[] = Array.from({length: 20}, (_, i) => [-54.5 + radius * Math.cos(i * Math.PI / 10), v + radius * Math.sin(i * Math.PI / 10)]);
    volume(disk, 372.1, 372.65, coping, '#a2a39d');
    b.box(6.3, .05, 2.1, -54.5, 372.7, v, '#f1ead7');
    b.box(2.1, .05, 6.3, -54.5, 372.72, v, '#f1ead7');
  }

  // The round glazed main lobby turns the corner at the Gilmer end of the Jesse Hill frontage.
  const arc: P2[] = Array.from({length: 9}, (_, i) => {
    const a = Math.PI - i * Math.PI / 16;
    return [-36 + 12.5 * Math.cos(a), 35.5 + 12.5 * Math.sin(a)];
  });
  volume([[-36, 35.5], ...arc], bottom, 323.2, '#577b83', '#9caaa9');
  for (let i = 1; i < arc.length; i++) {
    const [u, v] = arc[i], [x, z] = arc[i - 1];
    for (const y of [309.3, 313.8, 318.4, 322.6])
      b.quad([u - .12, y, v + .12], [x - .12, y, z + .12], [x - .12, y + .55, z + .12], [u - .12, y + .55, v + .12], '#49595d');
    b.box(.35, 19.2, .35, u, 313.6, v, '#697c80');
  }
  // The white Jesse Hill front has paired banks of horizontal glazing, relief
  // panels above them, and a narrow vertical bay with an oculus in the middle.
  const streetPanel = (v: number, width: number, y: number, h: number, color: string) =>
    b.box(.12, h, width, -62.31, y + h / 2, v, color);
  for (const start of [-73.8, -12.5]) {
    for (let bay = 0; bay < 5; bay++) {
      const v = start + bay * 8.7 + 4.2;
      streetPanel(v, 5.3, 365.1, 5.3, '#4b605d');
      b.tri([-62.41, 369.5, v - 2.25], [-62.41, 369.5, v + 2.25], [-62.41, 365.9, v], '#70807a');
      for (let y = 310.5; y < 362; y += 4.05) {
        streetPanel(v, 8.15, y, 2.05, glass);
        const pane = Math.round(y + v * 3) % 4;
        if (pane !== 0) {
          const near = v - 3.96 + Math.abs(pane % 3) * 2.7;
          lit.quad([-62.44, y + .1, near], [-62.44, y + .1, near + 2.42],
            [-62.44, y + 1.95, near + 2.42], [-62.44, y + 1.95, near], '#ffcc91');
        }
        for (const d of [-2.65, 0, 2.65]) b.box(.15, 2.05, .23, -62.41, y + 1.025, v + d, coping);
      }
    }
  }
  for (const v of [-28, -24.4, -20.8, -17.2])
    for (let y = 310.5; y < 366; y += 4.05) streetPanel(v, 2.3, y, 3.0, glass);
  const oculus = new THREE.CylinderGeometry(2.55, 2.55, .2, 18);
  oculus.rotateZ(Math.PI / 2).translate(-62.47, 364, -22.6);
  b.addGeometry(oculus, glass);
  oculus.dispose();
  for (const v of [-74.3, -30.8, -14.4, 31.6]) b.box(.95, 60.8, .85, -62.5, 339, v, limestone);
  // An elevated entrance canopy projects over the Jesse Hill sidewalk.
  block(-66.5, -62.2, 10, 31, 308.6, 309.3, limestone, false);
  for (const v of [11, 20, 30]) b.box(.45, 5.4, .45, -66, 306, v, coping);

  // Raised lettering on the plant-room crown and beside the Jesse Hill lobby.
  // Drawn once on each face as a small local decal. It follows the daylight on the masonry.
  const label = document.createElement('canvas');
  label.width = 320;
  label.height = 80;
  const ctx = label.getContext('2d')!;
  ctx.fillStyle = '#a63c39';
  ctx.fillRect(15, 30, 53, 17);
  ctx.fillRect(33, 12, 17, 53);
  ctx.fillStyle = '#363d3d';
  ctx.font = 'bold 62px Arial, sans-serif';
  ctx.fillText('Grady', 78, 59);
  const ink = new THREE.CanvasTexture(label);
  ink.colorSpace = THREE.SRGBColorSpace;
  const lettering = new THREE.MeshLambertMaterial({map: ink, transparent: true, alphaTest: .18});
  lettering.addEventListener('dispose', () => ink.dispose());
  function sign(width: number, u: number, y: number, v: number, rotation: number) {
    const face = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), lettering);
    face.rotation.y = rotation;
    face.position.set(u, y, v);
    group.add(face);
  }
  sign(16, 1, 389.2, -26.43, Math.PI);
  sign(15, 1, 389.2, -18.27, 0);
  sign(8, 13.64, 389.2, -22.4, Math.PI / 2);
  sign(8, -62.7, 313.3, 26, -Math.PI / 2);
  for (const v of [-38, -4]) for (const u of [-33, 30])
    b.box(3, 1.3, 4.5, u, 381.65, v, '#93958f');
  for (const u of [-18, -4, 14]) b.box(3.8, 1.1, 3.2, u, 348.05, 71, '#adaea6');

  const masonry = new THREE.Mesh(b.geometry(), new THREE.MeshLambertMaterial({vertexColors: true, side: THREE.DoubleSide}));
  masonry.castShadow = masonry.receiveShadow = true;
  const lamp = new THREE.MeshBasicMaterial({vertexColors: true, side: THREE.DoubleSide, transparent: true, depthWrite: false});
  const rooms = new THREE.Mesh(lit.geometry(), lamp);
  rooms.visible = false;
  group.add(masonry, rooms);
  return {group, buildings: buildings.filter(b => b !== hospital), setNight(dark: number) {
    rooms.visible = dark > .01;
    lamp.opacity = .77 * dark;
  }};
}
