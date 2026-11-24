// One City metre per unit. Coordinates are lateral, vertical, longitudinal (+z forward).
export const profiles = {
  // Dimensions in metres; roof stations run from the rear glass to the windshield base.
  sedan: { label: 'Midsize sedan', length: 4.88, width: 1.84, roof: 1.45, base: 2.82, radius: .328, belt: .90, sill: .32,
    cabin: [[-1.74,.02],[-.93,.90],[-.71,1],[.22,.97],[1.04,0]] },
  compact: { label: 'Compact crossover', length: 4.59, width: 1.85, roof: 1.67, base: 2.66, radius: .36, belt: 1.04, sill: .39,
    cabin: [[-2.19,.04],[-1.61,.92],[-1.20,1],[.27,.96],[1.12,0]] },
  alternate: { label: 'Compact crossover · alternate', length: 4.60, width: 1.87, roof: 1.69, base: 2.69, radius: .36, belt: 1.09, sill: .44,
    cabin: [[-2.13,.025],[-1.80,.91],[-1.58,1],[.22,.97],[1.04,0]] },
  electric: { label: 'Rounded electric crossover', length: 4.75, width: 1.92, roof: 1.62, base: 2.89, radius: .36, belt: .95, sill: .34,
    cabin: [[-2.24,.04],[-1.52,.64],[-.83,.94],[-.30,1],[.29,.92],[.80,.69],[1.48,0]] },
  upright: { label: 'Upright midsize SUV', length: 4.72, width: 1.91, roof: 1.76, base: 2.94, radius: .40, belt: 1.13, sill: .46,
    cabin: [[-2.26,.02],[-2.12,.93],[-1.94,1],[.49,1],[1.03,0]] },
  pickup: { label: 'Crew-cab pickup', length: 5.89, width: 2.03, roof: 1.97, base: 3.69, radius: .41, belt: 1.24, sill: .49,
    cabin: [[-.99,.01],[-.93,.94],[-.81,1],[.68,1],[1.30,0]] },
  taxi: { label: 'Illustrative robotaxi concept', length: 4.68, width: 1.90, roof: 1.56, base: 2.99, radius: .37, belt: 1.00, sill: .38,
    cabin: [[-2.20,.04],[-1.56,.89],[-.92,1],[.36,.96],[1.54,0]] },
};

export function body(style, paint = '#8099a6') {
  const {length, width, roof, belt, sill, radius, base, cabin} = profiles[style];
  const faces = [];
  const glass = '#35454f', trim = '#33383c';
  function face(points, color) { faces.push({ points, color }); }
  function loft(stations, color) {
    const rings = stations.map(([z, lower, upper, half, shoulder]) => [
      [-half*.95,lower,z], [half*.95,lower,z], [half,shoulder,z],
      [half*.92,upper,z], [-half*.92,upper,z], [-half,shoulder,z]
    ]);
    face(rings[0], color);
    for (let i=1;i<rings.length;i++) for (let j=0;j<6;j++) {
      const k=(j+1)%6;
      face([rings[i-1][j],rings[i-1][k],rings[i][k],rings[i][j]],color);
    }
    face(rings.at(-1),color);
  }
  const half = width / 2, end = length / 2;
  loft([[-end,sill+.08,belt-.08,half*.88,belt-.18],
    [-end+.20,sill,belt+.02,half,belt-.12],[-1.38,sill,belt+.03,half,belt-.09],
    [1.12,sill,belt,half,belt-.10],[end-.20,sill+.02,belt-.11,half*.97,belt-.22],
    [end,sill+.12,belt-.18,half*.85,belt-.30]],paint);
  if (style === 'pickup') {
    // An open bed lined in charcoal, with body-colour rails on three sides.
    face([[-.83,belt+.04,-end+.23],[.83,belt+.04,-end+.23],[.83,belt+.04,-1.04],[-.83,belt+.04,-1.04]],trim);
    for (const side of [-1,1]) {
      const x = side*.88;
      face([[x,belt+.04,-end+.22],[x,belt+.14,-end+.22],[x,belt+.14,-1.01],[x,belt+.04,-1.01]],paint);
    }
  }
  const sections = cabin.map(([z,h])=>[z,belt+h*(roof-belt),half*(.90-.17*h)]);
  for (let i=1;i<sections.length;i++) {
    const [za,ya,wa]=sections[i-1], [zb,yb,wb]=sections[i];
    face([[-wa,ya,za],[wa,ya,za],[wb,yb,zb],[-wb,yb,zb]],i===1||i===sections.length-1||style==='electric'?glass:paint);
    for (const side of [-1,1]) {
      const at=(z,y,w)=>[side*w,y,z];
      face([at(za,belt-.015,half*.92),at(za,ya,wa),at(zb,yb,wb),at(zb,belt-.015,half*.92)],paint);
      const z1=za+.035,z2=zb-.035;
      if (z2<=z1) continue;
      const windowPoint=(z,t)=>{
        const f=(z-za)/(zb-za), h=ya+(yb-ya)*f, w=wa+(wb-wa)*f;
        return at(z,belt-.015+(h-belt+.015)*t,(half*.92)*(1-t)+w*t+.004);
      };
      const panel=(a,b)=>face([windowPoint(a,.09),windowPoint(a,.91),windowPoint(b,.91),windowPoint(b,.09)],glass);
      if(z1<-.27 && z2>-.18) {panel(z1,-.27);panel(-.18,z2);} else panel(z1,z2);
    }
  }
  if (style === 'taxi') {
    // Separate load-bearing plinth, dark sensor band and pale crown.
    const rings = [[roof-.01,.51],[roof+.08,.48],[roof+.10,.31],[roof+.29,.30],[roof+.36,.21],[roof+.38,.09]]
      .map(([y,r])=>Array.from({length:16},(_,i)=>[r*Math.cos(i*Math.PI/8),y,-.30+r*Math.sin(i*Math.PI/8)]));
    for(let i=1;i<rings.length;i++) for(let j=0;j<16;j++) {
      const k=(j+1)%16;
      face([rings[i-1][j],rings[i-1][k],rings[i][k],rings[i][j]],i===3?'#242c33':'#dfe3e2');
    }
    face(rings.at(-1),'#e7eae9');
  }
  for(const z of [-base/2,base/2]) for(const side of [-1,1]) {
    const wheel=(x,r)=>Array.from({length:12},(_,i)=>[side*x,radius+r*Math.cos(i*Math.PI/6),z+r*Math.sin(i*Math.PI/6)]);
    const outer=wheel(half+.005,radius),inner=wheel(half-.18,radius);
    for(let j=0;j<12;j++)face([inner[j],outer[j],outer[(j+1)%12],inner[(j+1)%12]],trim);
    face(outer,trim);face(wheel(half+.008,radius*.57),'#adb5b8');
  }
  if (style === 'compact') {
    // High rear-quarter lamps climb the sloping hatch pillars.
    for (const side of [-1,1]) {
      face([[side*half*.916,belt+.02,-2.15],[side*half*.87,belt+.19,-2.05],
        [side*half*.78,roof-.10,-1.62],[side*half*.81,roof-.12,-1.50],
        [side*half*.89,belt+.16,-1.94],[side*half*.923,belt+.03,-2.00]],'#973f43');
    }
  }
  if (style === 'upright' || style === 'pickup') {
    const top = belt-.18, bottom = sill+.12;
    face([[-.69,bottom,end+.003],[.69,bottom,end+.003],[.69,top,end+.003],[-.69,top,end+.003]],
      style==='pickup'?trim:paint);
    for (const side of [-1,1]) {
      const lamp = style==='pickup'?.24:.12;
      face([[side*.76,top,end+.006],[side*(.76-lamp),top,end+.006],
        [side*(.76-lamp),bottom+.10,end+.006],[side*.76,bottom+.10,end+.006]],'#e6e7d8');
      face([[side*.76,belt-.12,-end-.006],[side*.58,belt-.12,-end-.006],
        [side*.58,belt-.39,-end-.006],[side*.76,belt-.39,-end-.006]],'#a34649');
    }
  }
  for (const s of [-1,1]) {
    face([[s*.42,belt-.22,end+.002],[s*.72,belt-.27,end+.002],[s*.72,belt-.34,end+.002],[s*.42,belt-.29,end+.002]],'#e6e7d8');
    face([[s*.39,belt-.15,-end-.002],[s*.73,belt-.13,-end-.002],[s*.73,belt-.24,-end-.002],[s*.39,belt-.24,-end-.002]],'#a34649');
  }
  if(style!=='electric') face([[-.44,sill+.14,end+.003],[.44,sill+.14,end+.003],[.36,sill+.25,end+.003],[-.36,sill+.25,end+.003]],trim);
  return faces;
}
