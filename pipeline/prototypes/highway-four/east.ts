import sections from './east-sections.json';
import { Line, type P2 } from '../../../web/src/vignette/geom';
import { PAL } from '../../../web/src/vignette/world';
import type { TerrainCity, TransportRun } from '../../../web/src/terrain/transport-data';

type Vertex = [number, number, number];
type Draw = NonNullable<TransportRun['drawTread']>;
type Profile = typeof sections[number];

// Clip the solved cross section. Clipping the axis first strands the outer wheels at the oblique cut.
function insideEastCut(polygon: Vertex[], east: number): Vertex[] {
  const result: Vertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[(i + polygon.length - 1) % polygon.length], b = polygon[i];
    if ((a[0] > east) !== (b[0] > east)) {
      const t = (east - a[0]) / (b[0] - a[0]);
      result.push([east, a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]);
    }
    if (b[0] <= east) result.push(b);
  }
  return result;
}

function carriageway(profile: Profile, east: number): Draw {
  const rows = profile.rows;
  const line = new Line(rows.map(([x,z]) => [x,z]));
  const landingFirst = rows[0][0] < east;
  const cache = new WeakMap<object, number[]>();
  return (builder, zero, ground) => {
    const previous = cache.get(builder);
    if (previous) return previous;
    const top: number[] = [];
    const stations = new Set(line.cum);
    for (let s = 0; s < line.length; s += 12) {
      stations.add(s);
      stations.add(Math.min(line.length, s + 3));
    }
    for (let i = 1; i <= 10; i++) stations.add(landingFirst ? i : line.length - i);
    const ordered = [...stations].sort((a,b) => a-b);
    function point(s: number, u: number, lift: number): Vertex {
      const p = line.at(s);
      const index = line.vertexAt(s), i = Math.min(Math.floor(index), rows.length - 2);
      const h = (column: number) => rows[i][column] + (index-i)*(rows[i+1][column]-rows[i][column]);
      const before = line.at(s-.25), after = line.at(s+.25);
      const dx = after.x-before.x, dz = after.z-before.z, length = Math.hypot(dx,dz);
      const x = p.x-u*dz/length, z = p.z+u*dx/length;
      let y = h(3) + Math.abs(u)/7*(h(u<0 ? 2 : 4)-h(3)) - zero;
      const distance = landingFirst ? s : line.length-s;
      if (distance < 10) {
        const base = ground(x,z);
        if (base !== null) y = base + (y-base)*distance/10;
      }
      return [x,y+lift,z];
    }
    function strip(s: number, t: number, left: number, right: number, color: string, running: boolean) {
      const lift = running ? 0 : .018;
      const a = point(s,left,lift), b = point(s,right,lift);
      const c = point(t,right,lift), d = point(t,left,lift);
      for (const face of [[a,b,c],[a,c,d]]) {
        const poly = insideEastCut(face,east);
        for (let j=1; j+1<poly.length; j++) {
          const [u,v,w] = [poly[0],poly[j],poly[j+1]];
          const normal = (v[2]-u[2])*(w[0]-u[0])-(v[0]-u[0])*(w[2]-u[2]);
          if (Math.abs(normal)<1e-8) continue;
          if (running) top.push(builder.pos.length/3);
          builder.tri(u,normal>0?v:w,normal>0?w:v,color);
        }
      }
    }
    const half = 5*3.55/2, edge = half+1.8;
    for (let i=1; i<ordered.length; i++) {
      const a=ordered[i-1], b=ordered[i];
      if (b-a<.0001) continue;
      const steps = (landingFirst ? a : line.length-b) < 10 ? 44 : 2;
      for (let band=0; band<steps; band++) {
        strip(a,b,-edge+2*edge*band/steps,-edge+2*edge*(band+1)/steps,PAL.asphaltHwy,true);
      }
      // Structural depth is illustrative. The measured returns constrain only the top.
      const mid = line.vertexAt((a+b)/2);
      if (rows[Math.round(mid)][5]) {
        const shell = (quad: Vertex[]) => {
          const poly = insideEastCut(quad,east);
          for (let j=1; j+1<poly.length; j++) builder.tri(poly[0],poly[j+1],poly[j],'#898780');
        };
        const depth = -.65;
        for (const [l,r] of [[-edge,0],[0,edge]]) {
          shell([point(a,l,depth),point(a,r,depth),point(b,r,depth),point(b,l,depth)]);
        }
        shell([point(a,-edge,0),point(a,-edge,depth),point(b,-edge,depth),point(b,-edge,0)]);
        shell([point(a,edge,depth),point(a,edge,0),point(b,edge,0),point(b,edge,depth)]);
      }
      for (let lane=0; lane<=5; lane++) {
        if (lane>0 && lane<5 && ((a+b)/2)%12>=3) continue;
        const u = lane*3.55-half;
        strip(a,b,u-.14,u+.14,lane===0?PAL.lineYellow:PAL.lineWhite,false);
      }
    }
    cache.set(builder,top);
    return top;
  };
}

export function eastHighwayApproaches(city: TerrainCity): TerrainCity {
  if (!city.terrainTransport) return city;
  const runs = [...city.terrainTransport.roads];
  for (const profile of sections) {
    const drawTread = carriageway(profile,city.bounds.maxX);
    for (const owner of profile.owners) {
      const road = city.roads.find(r => {
        const p = owner.fromEnd ? r.pts.at(-1) : r.pts[0];
        return r.cls==='motorway' && p && Math.hypot(p[0]-owner.tie[0],p[1]-owner.tie[1])<.02;
      });
      if (!road) continue;
      const existing = runs.find(run => run.pts===road.pts && run.kind==='bridge');
      if (existing) runs[runs.indexOf(existing)] = {...existing,sourceAxis:road.pts,drawTread};
      else {
        // Only the terminal approach belongs to this profile. Keep the remote Exit 86 run.
        const terminal = owner.fromEnd ? profile.rows.slice(0,6) : profile.rows.slice(-9);
        runs.push({kind:'bridge',cls:road.cls,name:road.name,sourceAxis:road.pts,
          pts:terminal.map(([x,z]): P2=>[x,z]),drawTread});
      }
    }
  }
  return {...city,terrainTransport:{...city.terrainTransport,roads:runs}};
}
