import type { Builder, P2 } from '../vignette/geom';
import type { BuildingFinish } from '../vignette/world';

export const wheatStreetId = 'osm:way:270493846';

// Class-6 roof median 343.05 m NAVD88. City's minimum-perimeter foundation on
// both baked surfaces is 301.80 m NAVD88. The architect records fourteen floors.
const height = 41.25;
const concrete = '#d0d1c9', frame = '#515957', glass = '#849693';

function roofBlock(batch: Builder, corners: P2[], bottom: number, top: number) {
  const p = (i: number, y: number) => [corners[i][0],y,corners[i][1]];
  for (let i=0; i<4; i++) {
    const j=(i+1)%4;
    batch.quad(p(i,bottom),p(j,bottom),p(j,top),p(i,top),'#a3a39b');
  }
  batch.quad(p(0,top),p(1,top),p(2,top),p(3,top),'#c9c9bf');
}

export const wheatStreetTower: BuildingFinish = {
  wall: concrete, roof: '#d4d3c9', fallbackHeight: height,
  drawRing(batch, ring, _hole, base, parapetTop, lit) {
    const roof = parapetTop - 1.1; // World supplies the top of its tall-building parapet.
    const pitch = 2.70, first = roof - 13*pitch;
    for (let i=0; i<ring.length; i++) {
      const a=ring[i], b=ring[(i+1)%ring.length];
      const length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const dx=(b[0]-a[0])/length, dz=(b[1]-a[1])/length;
      const p = (s: number,y: number,out: number) => [a[0]+s*dx-out*dz,y,a[1]+s*dz+out*dx];
      const panel = (target: Builder,l: number,r: number,lo: number,hi: number,out: number,color: string) =>
        target.quad(p(l,lo,out),p(r,lo,out),p(r,hi,out),p(l,hi,out),color);
      panel(batch,0,length,base-.6,roof+.24,0,concrete);
      // The north and west end walls are broad concrete panels. The narrow
      // returns at a change in plan also stay solid.
      const streetEnd = Math.max(a[1],b[1]) < -167;
      if (streetEnd || Math.max(a[0],b[0]) < 1492 || length < 2.5) {
        for (let y=first; y<roof; y+=pitch) panel(batch,0,length,y,y+.038,.016,'#aeb2aa');
        // One narrow stack of paired windows divides the pale Auburn end.
        if (streetEnd && Math.min(a[0],b[0]) < 1524 && Math.max(a[0],b[0]) > 1524) {
          const mid=(1524-a[0])/dx;
          panel(batch,mid-.95,mid+.95,base+.8,roof+.2,.035,frame);
          for (let floor=0; floor<13; floor++) {
            const y=first+floor*pitch;
            for (const l of [mid-.83,mid+.05]) panel(lit,l,l+.78,y+.48,y+pitch-.22,.055,glass);
          }
        }
        continue;
      }
      const insideCorner = a[1]<-139 && b[1]>-136 && dx<-.5 && dz>.5;
      const eastMiddle = Math.min(a[0],b[0]) > 1530 && length > 20;
      const bays=Math.max(1,Math.round(length / (insideCorner ? 2.6 : 3.05)));
      const span=length/bays;
      panel(batch,0,length,base+.4,first,.025,frame);
      for (let j=0; j<bays; j++) {
        const l=j*span, r=l+span;
        panel(lit,l+.18,r-.18,base+1.05,first-.20,.045,'#647777');
        for (let floor=0; floor<13; floor++) {
          const y=first+floor*pitch;
          // Glazing sits behind the projecting pale spandrels. Narrow grey
          // piers run continuously between apartment bays.
          panel(batch,l+.11,r-.11,y+.60,y+pitch-.09,.025,frame);
          const mid=l+span*.56;
          const windows=(floor+2*j+i)%4 === 0 ? lit : batch;
          panel(windows,l+.20,mid-.04,y+.82,y+pitch-.20,.044,glass);
          panel(windows,mid+.04,r-.20,y+.82,y+pitch-.20,.044,'#788b89');
          const flush = insideCorner || (eastMiddle && j>=2 && j<=4);
          const lip = flush ? .055 : .20;
          panel(batch,l+.08,r-.08,y+.12,y+.74,lip,flush ? '#9da4a1' : '#ddddcf');
          batch.quad(p(l+.08,y+.74,.025),p(r-.08,y+.74,.025),p(r-.08,y+.74,lip),p(l+.08,y+.74,lip),'#a8ada5');
        }
        panel(batch,l,l+.12,first,roof,.23,'#757e78');
      }
      if (insideCorner) {
        // The contractor's entrance photos place a projecting canopy across
        // the diagonal glazed lobby wall inside the elbow of the L.
        const canopy=first-.05, reach=2.5;
        batch.quad(p(0,canopy,0),p(length,canopy,0),p(length,canopy,reach),p(0,canopy,reach),frame);
        panel(batch,0,length,canopy-.5,canopy,reach,'#707778');
        for (const s of [0,length]) batch.quad(p(s,canopy,0),p(s,canopy,reach),p(s,canopy-.5,reach),p(s,canopy-.5,0),frame);
      }
    }
  },
  dressRoof(batch,_outer,roof) {
    // Rectangles approximate the two contiguous upper returns at the elbow.
    roofBlock(batch,[[1514,-123],[1507,-129],[1516,-139],[1523,-133]],roof,roof+3.07);
    roofBlock(batch,[[1523,-124],[1518.6,-128.6],[1522.5,-132.5],[1527.1,-127.9]],roof,roof+5.69);
  },
};
