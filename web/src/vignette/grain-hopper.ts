import { Builder, loft } from './geom';

/** Three-compartment grain car. Envelope from Greenbrier's 5,400 ft³ car;
 * lower bays, roof walk and end-platform details estimated from the reference. */
export function grainHopperBody(b: Builder, low: boolean) {
  const paint = '#c7c4b9', sill = '#87837b', hardware = '#716e67';
  // Round the upper shoulders and recess the lower side sheets above the outlets.
  const section = [[-1.43,1.84],[1.43,1.84],[1.59,2.22],[1.625,3.68],[1.54,4.30],
    [.83,4.52],[-.83,4.52],[-1.54,4.30],[-1.625,3.68],[-1.59,2.22]];
  const ends = [-1,1].map(sign => section.map(([x,y]) => [x,y,sign * (y < 2.3 ? 6.98 : 8.13)]));
  loft(b, ends, section.map((_,i) => i === 0 ? sill : paint), true, true, paint);
  // Sloping faces converge on each of the three separate gravity outlets.
  for (const z of [-4.42,0,4.42]) {
    const ring = (width: number, halfLength: number, y: number) =>
      [[-width,y,z-halfLength],[width,y,z-halfLength],[width,y,z+halfLength],[-width,y,z+halfLength]];
    const bottom = ring(.60,.44,.59), top = ring(1.42,2.17,1.85);
    for (let i=0; i<4; i++) {
      const j=(i+1)%4;
      b.quad(bottom[i],top[i],top[j],bottom[j], i%2 ? '#aaa69a' : '#989385');
    }
    b.box(1.34,.13,.99,0,.56,z,hardware);
  }
  b.box(.88,.16,15.66,0,4.61,0,'#b5b0a4');
  b.box(.68,.05,15.48,0,4.70,0,'#d6d3c9');
  for (const side of [-1,1]) {
    b.box(.12,.17,15.78,side*1.49,1.89,0,sill);
    b.box(.28,.08,15.87,side*1.03,4.53,0,hardware);
    if (!low) for (let z=-7.3; z<7.5; z+=1.85) {
      // Vertical sheet seams and short oxide streaks below the roof walk.
      b.quad([side*1.627,3.68,z],[side*1.542,4.3,z],[side*1.542,4.3,z+.045],[side*1.627,3.68,z+.018], '#aaa291');
    }
  }
  for (const sign of [-1,1]) {
    const z = sign*8.20;
    b.box(2.72,.12,.62,0,1.35,z,sill);
    for (const x of [-1.30,-.74,1.30]) b.box(.055,2.98,.055,x,2.89,z+.11*sign,hardware);
    for (let y=1.63; y<4.18; y+=low?.58:.34) b.box(.59,.05,.05,-1.02,y,z+.14*sign,hardware);
    b.box(2.65,.06,.06,0,2.42,z+.15*sign,hardware);
  }
  if (!low) for (let z=-7.25; z<7.4; z+=1.8) b.box(.91,.06,.085,0,4.69,z,hardware);
}
