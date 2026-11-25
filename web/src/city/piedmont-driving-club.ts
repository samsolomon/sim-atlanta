import { ShapeUtils, Vector2 } from 'three';
import { surfaces } from '../materials';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { localLandmarkShell } from './landmark-shell';

export const piedmontDrivingClubId = 'osm:relation:3006786';
const origin: P2 = [1388, -3811];
const axis: P2 = [.84, .55];
const length = Math.hypot(...axis);
const c = axis[0] / length, s = axis[1] / length;
const local = ([x,z]: P2): P2 => [(x-origin[0])*c+(z-origin[1])*s, (z-origin[1])*c-(x-origin[0])*s];
const world = (u: number,v: number): P2 => [origin[0]+u*c-v*s, origin[1]+u*s+v*c];

const cream = '#dcd0aa', white = '#e2ded0', slate = '#575a52', paving = '#aaa593';
const stone = surfaces.limestone({ course: .55 });
const plaster = surfaces.stucco();
const shingles = surfaces.asphaltRoof({ strength: .58 });
const glass = ['#555f5d', '#626862', '#4e5a59'];

function ccw(ring: P2[]) {
  const area = ring.reduce((sum, [x,z], i) => {
    const [u,v] = ring[(i+1)%ring.length];
    return sum+x*v-z*u;
  }, 0);
  return area < 0 ? ring.slice().reverse() : ring;
}

export function createPiedmontDrivingClub(buildings: VBuilding[], site: VBuilding, foundation: number | null,
  groundAt: (x: number, z: number) => number | null) {
  const entry = groundAt(1318,-3784);
  if (entry === null || foundation === null || site.rings.length !== 2) return null;
  const shell = localLandmarkShell(buildings, site, 'Piedmont Driving Club clubhouse',
    origin, axis, [[-38, 30],[0,22]], foundation - entry - .25, entry);
  if (!shell) return null;
  const { body, facade, lights, paint, prism } = shell;
  const outer = ccw(shell.ring);
  const court = ccw(site.rings[1].map(local)).reverse();
  const eave = 6.85;

  // Both rings contribute walls. The shared cover is triangulated around the open court.
  for (const ring of [outer, court]) for (const [i,a] of ring.entries()) {
    const b = ring[(i+1)%ring.length];
    const surface = (low: number, high: number, colour: string) =>
      body.quad([a[0],low,a[1]],[a[0],high,a[1]],[b[0],high,b[1]],[b[0],low,b[1]],colour);
    paint(stone, () => surface(shell.base,.3,'#a6a397'));
    paint(plaster, () => surface(.3,eave-.36,cream));
    surface(eave-.36,eave,white);
    const metres = Math.hypot(a[0]-b[0],a[1]-b[1]);
    if (metres < 3) continue;
    if (ring === court && metres > 28)
      facade(a,b,.65,5.95,1,3.3,.74,.9,glass,.26);
    else
      facade(a,b,.7,eave-.45,2,3.1,.43,.69,glass,.11);
  }
  const points = [...outer,...court];
  const vertices = (ring: P2[]) => ring.map(([u,v]) => new Vector2(u,v));
  paint(shingles, () => {
    for (const [a,b,c] of ShapeUtils.triangulateShape(vertices(outer),[vertices(court)])) {
      const roofPoint = (i: number) => [points[i][0],eave,points[i][1]];
      body.tri(roofPoint(a),roofPoint(c),roofPoint(b),slate);
    }
  });

  const hip = (left: number, right: number, back: number, front: number, ridge: number) => paint(shingles, () => {
    const v = (back+front)/2, inset = Math.min(6,(right-left)/3);
    const a = [left+inset,ridge,v], b = [right-inset,ridge,v];
    body.quad([left,eave,back],[right,eave,back],b,a,slate);
    body.quad([right,eave,front],[left,eave,front],a,b,slate);
    body.tri([left,eave,front],[left,eave,back],a,slate);
    body.tri([right,eave,back],[right,eave,front],b,slate);
  });
  hip(-17,31.25,10.55,30.65,11.75);
  hip(-12,34,-29,-8.75,11.05);
  hip(-45,-26,-15,37,11.3);
  hip(27,52,-39,-26.1,9.6);

  // The rounded south projection and the compact stone street wing are distinct
  // from the long roofs. The arrival lane follows the southwest mapped notch.
  const rotunda = shell.ring.slice(12,27);
  prism(rotunda,eave,eave+.55,white,'#c9c7bc',{ wall:plaster });
  hip(-51.8,-41.8,55.3,63.15,11.5);
  paint(stone, () => body.box(1.04,4.8,1.15,-51.45,9.1,53.4,'#aaa497'));
  const canopy: P2[] = [[-52.1,61.4],[-41.5,60],[-40.6,64.5],[-51.5,66]];
  prism(canopy,4.05,4.65,white,slate,{ wall:plaster });
  for (const [u,v] of [[-51.55,65.55],[-47,65],[-41.2,64.12]]) {
    const foot = (groundAt(...world(u,v)) ?? entry)-entry-.1;
    body.box(.58,4.1-foot,.61,u,(4.1+foot)/2,v,white);
  }
  facade([-41.9,62.8],[-51.5,64.1],1.1,3.8,1,4.1,.43,.65,glass,.5);

  // White courtyard colonnade and the park-facing terrace. Keep the center of
  // the mapped court clear and model only the observed warm terrace luminaires.
  const veranda: P2[] = [[35,-10.7],[37.7,-10.7],[37.7,8.1],[35,8.1]];
  prism(veranda,1.1,1.35,paving,paving,{ wall:stone });
  prism(veranda,5.05,5.42,white,slate,{ wall:plaster });
  for (const v of [-10.45,-6.35,-2.25,1.85,5.95,7.85]) {
    body.box(.46,3.7,.46,37.4,3.19,v,white);
    lights.box(.38,.09,.42,36.5,5.015,v,'#bcb59c');
  }
  body.box(.12,.11,18.75,37.57,2.22,-1.3,'#4f5147');

  const gallery: P2[] = [[-14.6,8.6],[19.6,8.6],[19.6,10.45],[-14.6,10.45]];
  prism(gallery,4.9,5.32,white,'#c5bd9f',{ wall:plaster });
  for (let u=-14.3;u<20;u+=4.7) {
    const foot = (groundAt(...world(u,8.75)) ?? entry)-entry;
    body.box(.38,4.92-foot,.38,u,(4.92+foot)/2,8.75,white);
  }
  return shell.finish('#efd09f',.39);
}
