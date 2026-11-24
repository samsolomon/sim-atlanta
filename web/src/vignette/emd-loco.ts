/** EMD silhouettes from the dated references in docs/freight-variety.md.
 * +z is the short-hood end; y=0 is the wheel tread. No lettering or logos. */
import * as THREE from 'three';
import { Builder } from './geom';

export const EMD_DIMENSIONS = {
  sd70ace: { length: 22.63, trucks: 15.9, wheel: .533, axles: [-1.9, 0, 1.9] },
  gp382: { length: 18.03, trucks: 10.3632, wheel: .508, axles: [-1.3716, 1.3716] },
} as const;
export type EmdModel = keyof typeof EMD_DIMENSIONS;
const GEAR = '#716b61', GRILLE = '#24272a', GLASS = '#405563';

/** Cross-section extruded along z, ordered counterclockwise as seen from +z. */
function section(b: Builder, points: number[][], z0: number, z1: number, color: string) {
  for (let i = 1; i < points.length - 1; i++) {
    b.tri([...points[0], z1], [...points[i], z1], [...points[i + 1], z1], color);
    b.tri([...points[0], z0], [...points[i + 1], z0], [...points[i], z0], color);
  }
  for (let i = 0; i < points.length; i++) {
    const a = points[i], c = points[(i + 1) % points.length];
    b.quad([...a, z0], [...c, z0], [...c, z1], [...a, z1], color);
  }
}
function cylinder(b: Builder, radius: number, height: number, x: number, y: number, z: number, color: string, axis: 'x' | 'y' | 'z' = 'y') {
  const g = new THREE.CylinderGeometry(radius, radius, height, 12);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  g.translate(x, y, z); b.addGeometry(g, color); g.dispose();
}

export function emdLocomotive(b: Builder, lamps: Builder, model: EmdModel, frontLit: boolean, rearLit: boolean) {
  const small = model === 'gp382', d = EMD_DIMENSIONS[model], end = d.length / 2 - .35;
  const body = small ? '#343f50' : '#4d4e50', shade = small ? '#293442' : '#3f4143';
  const cabPaint = body;
  const accent = small ? '#ddb15e' : '#e4e1d6';
  const cabFront = small ? 5.9 : 8.0, cabBack = small ? 3.5 : 5.0;
  const nose = end - .6, hoodEnd = -end + .55, roof = small ? 4.46 : 4.65;
  b.box(3.05, .32, d.length - .8, 0, 1.35, 0, GEAR);
  for (const s of [-1, 1]) {
    b.box(.04, .12, d.length - .85, s * 1.53, 1.41, 0, accent);
    // Pilot, coupler and open stair treads.
    b.box(3.0, .55, .22, 0, .95, s * end, '#57534f');
    b.box(.34, .28, .55, 0, .84, s * (end + .02), '#343331');
    const m = new THREE.Matrix4().makeTranslation(0, .43, s * end).multiply(new THREE.Matrix4().makeRotationX(-s * .3));
    b.box(2.85, .65, .08, 0, 0, 0, '#666158', m);
    for (const x of [-1.25, 1.25]) for (let i = 0; i < 4; i++) b.box(.43, .06, .4, x, .43 + i * .28, s * (end - .12), '#8a8375');
    for (const x of [-1.35, 1.35]) {
      b.box(.05, 1.1, .05, x, 2.05, s * (end - .15), '#d7b354');
      b.box(.05, .05, .7, x, 2.6, s * (end - .45), '#d7b354');
    }
    b.box(2.7, .05, .05, 0, 2.6, s * (end - .15), '#d7b354');
  }
  for (const tz of [-d.trucks / 2, d.trucks / 2]) {
    for (const dz of d.axles) for (const s of [-1, 1]) {
      cylinder(b, d.wheel, .17, s * .72, d.wheel, tz + dz, '#817a6e', 'x');
      b.box(.25, .25, .3, s * 1.02, d.wheel, tz + dz, '#494843');
    }
    for (const s of [-1, 1]) {
      b.box(.18, .32, small ? 3.8 : 4.8, s * 1.02, .72, tz, GEAR);
      for (const dz of [-.65, .65]) b.box(.24, .42, .38, s * 1.05, .65, tz + dz, '#4b4a44');
      // HTCR steering links on the road engine; Blomberg dropped equalizer on the GP.
      b.box(.13, .12, small ? 2.8 : 3.8, s * 1.15, .42, tz, '#8a8275');
    }
    b.box(2, .28, small ? 2.3 : 3.4, 0, 1.0, tz, '#494945');
  }
  const tankLength = small ? 5.3 : 8.8;
  section(b, [[-1.05,.35],[1.05,.35],[1.25,.65],[1.25,1.17],[-1.25,1.17],[-1.25,.65]], -tankLength / 2, tankLength / 2, '#6e6961');
  for (const s of [-1, 1]) cylinder(b, .16, small ? 2.0 : 3.0, s * 1.22, 1.12, 1.6, '#464945', 'z');

  // The SD's broad clipped-corner safety nose versus the GP's narrow low short hood.
  const nw = small ? .91 : 1.43;
  section(b, [[-nw,1.52],[nw,1.52],[nw,small?3.0:3.48],[nw-(small?.24:.12),small?3.28:3.62],[-nw+(small?.24:.12),small?3.28:3.62],[-nw,small?3.0:3.48]], cabFront, nose, small ? accent : body);
  b.box(small ? .65 : .8, 1.35, .025, 0, 2.28, nose + .018, small ? '#c19a52' : shade);
  if (!small) for (const y of [1.9,2.14,2.38,2.62,2.86]) {
    b.box(2.82,.1,.025,0,y,nose+.035,accent);
    for (const s of [-1,1]) b.box(.025,.1,nose-cabFront,s*1.445,y,(nose+cabFront)/2,accent);
  }
  // Full-width cab, with bevelled roof and brow. GP's front is flat, SD's roof has a strong visor.
  section(b, [[-1.52,1.52],[1.52,1.52],[1.52,roof-.38],[1.13,roof],[-1.13,roof],[-1.52,roof-.38]], cabBack, cabFront, cabPaint);
  section(b, [[-1.61,roof-.38],[1.61,roof-.38],[1.17,roof+.08],[-1.17,roof+.08]], cabBack-.08,cabFront+.13,shade);
  if (!small) section(b, [[-1.55,roof-.3],[1.55,roof-.3],[1.17,roof+.04],[-1.17,roof+.04]], cabFront+.13,cabFront+.16,accent);
  for (const s of [-1,1]) {
    b.box(1.12,.67,.035,s*.69,3.75,cabFront+.025,GLASS);
    b.box(.03,.7,1.65,s*1.54,3.78,(cabFront+cabBack)/2,GLASS);
    for (const z of [cabBack+.3,cabBack+.85,cabFront-.25]) b.box(.05,.72,.045,s*1.56,3.78,z,cabPaint);
    b.box(.15,.055,1.9,s*1.59,4.2,(cabFront+cabBack)/2,shade);
    b.box(.035,1.45,.6,s*1.54,2.3,cabBack+.34,shade);
    b.box(.035,.3,.38,s*1.56,2.77,cabBack+.34,GLASS);
    b.box(.025,.52,.035,s*.65,3.73,cabFront+.05,'#171b1d');
  }
  const lamp = (x:number,y:number,z:number,on:boolean,w=.18,h=.18) => {
    b.box(w+.1,h+.1,.07,x,y,z,'#25282a');
    (on?lamps:b).box(w,h,.025,x,y,z+(z>0?.045:-.045),on?'#fff0ce':'#ddd4b9');
  };
  // Paired horizontal brow headlights on the SD; stacked cab-front lamps on the GP.
  if (small) { lamp(0,4.12,cabFront+.09,frontLit); lamp(0,4.34,cabFront+.09,frontLit); }
  else { lamp(-.14,4.46,cabFront+.15,frontLit); lamp(.14,4.46,cabFront+.15,frontLit); }
  for (const s of [-1,1]) {
    lamp(s*(small?.92:.87),roof-.07,cabFront+.15,frontLit,.52,.17);
    lamp(s*1.13,1.72,end-.23,frontLit);
  }
  // Long hood and separate cooling equipment: the SD has a flat-sided rear radiator,
  // the GP has a narrow hood with two circular roof fans and a dynamic-brake blister.
  const hw=small?.91:1.04, hoodTop=small?4.12:4.2;
  b.box(hw*2,hoodTop-1.52,cabBack-hoodEnd,0,(hoodTop+1.52)/2,(cabBack+hoodEnd)/2,body);
  b.box(hw*2+.04,.1,cabBack-hoodEnd,0,hoodTop+.05,(cabBack+hoodEnd)/2,shade);
  if (small) {
    b.box(2.22,.48,2.0,0,4.0,1.45,shade);
    cylinder(b,.59,.16,0,4.31,1.45,GRILLE);
    for (const z of [hoodEnd+1.0,hoodEnd+2.5]) cylinder(b,.62,.18,0,4.3,z,GRILLE);
    for (const z of [-.5,-2.0]) b.box(.3,.24,.33,0,4.3,z,'#393a37');
  } else {
    b.box(3.12,1.23,4.2,0,3.915,hoodEnd+2.1,shade);
    for (const z of [hoodEnd+.8,hoodEnd+2.1,hoodEnd+3.4]) cylinder(b,.65,.12,0,4.6,z,GRILLE);
    // Dynamic-brake box and fan immediately aft of the isolated cab.
    b.box(2.72,.65,2.6,0,4.15,cabBack-1.4,shade);
    cylinder(b,.68,.12,0,4.54,cabBack-1.4,GRILLE);
    b.box(.55,.35,.7,0,4.42,-.4,'#333431');
  }
  for(const s of [-1,1]) {
    const rz=hoodEnd+(small?1.7:2.1);
    b.box(.025,.62,small?3:3.8,s*(small?hw+.02:1.575),small?3.68:4.1,rz,GRILLE);
    for(let z=hoodEnd+.4;z<cabBack-.1;z+=.72) {
      b.box(.025,2.1,.025,s*(hw+.02),2.7,z,shade);
      b.box(.035,.12,.16,s*(hw+.04),2.55,z+.1,'#76766e');
    }
    b.box(.025,.65,1.45,s*(hw+.025),3.73,cabBack-.85,GRILLE);
    // Weathering below the doors is a muted band, with separate access panels.
    b.box(.025,.28,cabBack-hoodEnd,s*(hw+.02),1.72,(cabBack+hoodEnd)/2,'#625f55');
    b.box(.045,.045,cabBack-hoodEnd,s*1.46,2.55,(cabBack+hoodEnd)/2,body);
    for(let z=hoodEnd;z<cabBack;z+=1.35) b.box(.045,1.03,.045,s*1.46,2.04,z,cabPaint);
  }
  for(const y of [3.5,3.73]) lamp(0,y,hoodEnd-.06,rearLit);
  for(const s of [-1,1]) lamp(s*.65,4.0,hoodEnd-.06,rearLit,.45,.14);
}
