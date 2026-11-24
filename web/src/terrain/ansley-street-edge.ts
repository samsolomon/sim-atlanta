import type { Builder, P2 } from '../vignette/geom';
import { inAnsleyStreets, type TerrainCity } from './transport-data';

type Road = { cls: string; sub?: string | null; pts: P2[] };

export const ansleyStreet = (r: Road) => r.pts.length > 1 && r.pts.every(([x,z]) => inAnsleyStreets(x,z));
export const ansleyCrossing = (r: Road) => r.cls === 'footway' && r.sub === 'crossing' && ansleyStreet(r);

// Sampled interior edges of the Prado's mapped round and triangular loops, inset from
// their centre lines by 6.1 m (half the inferred carriageway plus 10 cm).
const islands: P2[][] = [
  [[1152.48,-4532.47],[1159.05,-4534.47],[1163.7,-4539.99],[1164.66,-4543.71],[1163.17,-4550.96],
   [1158.05,-4555.96],[1154.09,-4557.24],[1149.98,-4557.18],[1142.9,-4553.18],[1139.86,-4546.39],
   [1140.46,-4540.76],[1145.22,-4534.63],[1148.66,-4532.99]],
  [[1385.58,-4173.68],[1386.15,-4172],[1387.18,-4167.57],[1391.16,-4172.09],[1389.17,-4172.48]],
];

export function paintPradoIslands(ctx: CanvasRenderingContext2D, bounds: TerrainCity['bounds']) {
  for (const ring of islands) {
    const [x,z] = ring[0];
    if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) continue;
    ctx.beginPath();
    ctx.moveTo(x,z);
    for (const [px,pz] of ring.slice(1)) ctx.lineTo(px,pz);
    ctx.closePath();
    ctx.fillStyle = '#9aae80';
    ctx.fill();
    ctx.strokeStyle = '#b6b2a5';
    ctx.lineWidth = .45;
    ctx.stroke();
  }
}

// A small repeating Canvas2D stamp goes into the existing board texture at bake time.
export function paverSurface(high: boolean): CanvasPattern | string {
  const base = '#c7c1b2';
  if (!high) return base;
  const tile = document.createElement('canvas');
  tile.width = 48; tile.height = 28;
  const ctx = tile.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0,0,48,28);
  ctx.strokeStyle = '#a6a298';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let col=-1; col<=2; col++) for (let row=-1; row<=1; row++) {
    const x = col*24, y = row*28 + (col%2)*14;
    ctx.moveTo(x-8,y-14); ctx.lineTo(x+8,y-14); ctx.lineTo(x+16,y); ctx.lineTo(x+8,y+14);
  }
  ctx.stroke();
  const pattern = ctx.createPattern(tile,'repeat');
  pattern?.setTransform?.({a:.032,d:.032});
  return pattern ?? base;
}

// Clip mapped crossing paint to carriageways; some ways continue across a verge between legs.
export function clipCarriageways(ctx: CanvasRenderingContext2D, roads: { pts: P2[]; width: number }[]) {
  ctx.beginPath();
  for (const {pts,width} of roads) for (let i=1; i<pts.length; i++) {
    const [x,z]=pts[i-1], [ex,ez]=pts[i];
    const dx=ex-x, dz=ez-z, len=Math.hypot(dx,dz);
    if (!len) continue;
    const nx=-dz*width/(2*len), nz=dx*width/(2*len);
    ctx.moveTo(x+nx,z+nz); ctx.lineTo(ex+nx,ez+nz);
    ctx.lineTo(ex-nx,ez-nz); ctx.lineTo(x-nx,z-nz); ctx.closePath();
  }
  ctx.clip();
}

// Authored positions are inferred from the approaching centreline and its right kerb.
// Facing vectors point towards the arriving driver. No traffic-control data is inferred for routes.
const signs = [
  [1172.7,-4527.3,.24,.97], [1125.1,-4539.8,-.94,-.34], [1160,-4569.5,.77,-.64],
  [1376.5,-4192.9,-.74,-.67],
];
export function pradoYieldSigns(b: Builder, bounds: TerrainCity['bounds'], ground: (x:number,z:number)=>number|null) {
  for (const [x,z,fx,fz] of signs) {
    if (x<bounds.minX || x>bounds.maxX || z<bounds.minZ || z>bounds.maxZ) continue;
    const y=ground(x,z);
    if (y===null) continue;
    b.box(.09,1.95,.09,x,y+.975,z,'#8a8c85');
    const face = (s:number,h:number,offset:number) => [x+s*fz+offset*fx,y+h,z-s*fx+offset*fz];
    b.tri(face(-.52,2.42,0),face(.52,2.42,0),face(0,1.52,0),'#af493c');
    b.tri(face(-.36,2.33,.012),face(.36,2.33,.012),face(0,1.70,.012),'#e7e4d6');
    b.tri(face(-.52,2.42,-.015),face(0,1.52,-.015),face(.52,2.42,-.015),'#9a9b91');
  }
}
