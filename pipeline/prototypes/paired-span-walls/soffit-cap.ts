import { Builder } from '../../../web/src/vignette/geom';
type V = [number, number, number];
export type Underside = readonly (readonly V[])[];
const cross = (a: V,b: V,p: V) => (b[0]-a[0])*(p[2]-a[2])-(b[2]-a[2])*(p[0]-a[0]);
const bounds = (p: readonly V[]) => [Math.min(...p.map(v=>v[0])), Math.max(...p.map(v=>v[0])),
  Math.min(...p.map(v=>v[2])), Math.max(...p.map(v=>v[2]))];
const overlaps = (a:number[],b:number[]) => a[0]<=b[1] && b[0]<=a[1] && a[2]<=b[3] && b[2]<=a[3];

function split(polygon: V[], a: V, b: V): V[][] {
  const signs = polygon.map(p => cross(a,b,p));
  if (Math.min(...signs) >= -1e-10 || Math.max(...signs) <= 1e-10) return [polygon];
  const left: V[] = [], right: V[] = [];
  polygon.forEach((p,i) => {
    const j=(i+1)%polygon.length, q=polygon[j], d=signs[i], e=signs[j];
    if (d>=0) left.push(p);
    if (d<=0) right.push(p);
    if (d*e<0) {
      const cut=p.map((x,k)=>x+(q[k]-x)*d/(d-e)) as V;
      left.push(cut); right.push(cut);
    }
  });
  return [left,right];
}

export function clippedWallCap(underside: Underside) {
  const facets = underside.filter(t => Math.abs(cross(t[0],t[1],t[2]))>1e-8).map(t=>{
    const [a,b,c]=t, det=cross(a,b,c);
    const contains=(p:V)=>[cross(a,b,p),cross(b,c,p),cross(c,a,p)].every(v=>v/det>=-1e-8);
    const y=(p:V)=>a[1]+(b[1]-a[1])*cross(c,a,p)/det+(c[1]-a[1])*cross(a,b,p)/det;
    return {t,contains,y,box:bounds(t)};
  });
  // The exposed 0.56 m² lies across one straight overhang edge. Continue its
  // adjacent plane from this interior witness to the end of the inferred face.
  const exterior=facets.find(f=>f.contains([437.30,0,-5402.68]));
  if (!exterior) throw Error('Missing Brookwood outer overhang facet');
  return (body:Builder, outline:V[], sideColors:(string|null)[]) => {
    const box=bounds(outline), nearby=facets.filter(f=>overlaps(box,f.box));
    let pieces=[outline];
    for (const {t} of nearby) for (let j=0;j<3;j++) {
      pieces=pieces.flatMap(poly=>split(poly,t[j],t[(j+1)%3]));
    }
    for (const poly of pieces) {
      const centre=poly.reduce<V>((c,p)=>[c[0]+p[0]/poly.length,0,c[2]+p[2]/poly.length],[0,0,0]);
      const roof=nearby.find(f=>f.contains(centre)) ?? exterior;
      const top=poly.map<V>(p=>[p[0],roof.y(p),p[2]]);
      for(let j=2;j<top.length;j++) body.tri(top[0],top[j-1],top[j],'#c4beb1');
      // The same intersections subdivide exterior walls and end closures.
      for(let j=0;j<poly.length;j++) {
        const k=(j+1)%poly.length;
        for(let e=0;e<outline.length;e++) {
          const color=sideColors[e];
          if (!color) continue;
          const a=outline[e], b=outline[(e+1)%outline.length];
          if (Math.abs(cross(a,b,poly[j]))<1e-9 && Math.abs(cross(a,b,poly[k]))<1e-9)
            body.quad(poly[j],poly[k],top[k],top[j],color);
        }
      }
    }
  };
}
