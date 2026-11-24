// One City metre per unit. Coordinates are lateral, vertical, longitudinal (+z forward).
export function body(crossover) {
  const faces = [];
  const paint = '#8099a6', glass = '#35454f', trim = '#33383c';
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
  const half = crossover ? .935 : .92;
  const end = crossover ? 2.30 : 2.44;
  const belt = crossover ? 1.09 : .90;
  const roof = crossover ? 1.69 : 1.45;
  const sill = crossover ? .44 : .32;
  loft([[-end,sill+.08,belt-.08,half*.88,belt-.18],
    [-end+.20,sill,belt+.02,half,belt-.12],[-1.38,sill,belt+.03,half,belt-.09],
    [1.12,sill,belt,half,belt-.10],[end-.20,sill+.02,belt-.11,half*.97,belt-.22],
    [end,sill+.12,belt-.18,half*.85,belt-.30]],paint);
  const rear = crossover ? -2.13 : -1.74;
  const topRear = crossover ? -1.80 : -.93;
  const sections = [[rear,belt+.025,half*.89],[topRear,roof-.055,half*.76],
    [topRear+.22,roof,half*.73],[.22,roof-.015,half*.74],[1.04,belt,half*.89]];
  for (let i=1;i<sections.length;i++) {
    const [za,ya,wa]=sections[i-1], [zb,yb,wb]=sections[i];
    face([[-wa,ya,za],[wa,ya,za],[wb,yb,zb],[-wb,yb,zb]],i===1||i===4?glass:paint);
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
  const base = crossover ? 2.69 : 2.82, radius = crossover ? .36 : .328;
  for(const z of [-base/2,base/2]) for(const side of [-1,1]) {
    const wheel=(x,r)=>Array.from({length:12},(_,i)=>[side*x,radius+r*Math.cos(i*Math.PI/6),z+r*Math.sin(i*Math.PI/6)]);
    const outer=wheel(half+.005,radius),inner=wheel(half-.18,radius);
    for(let j=0;j<12;j++)face([inner[j],outer[j],outer[(j+1)%12],inner[(j+1)%12]],trim);
    face(outer,trim);face(wheel(half+.008,radius*.57),'#adb5b8');
  }
  for (const s of [-1,1]) {
    face([[s*.42,belt-.22,end+.002],[s*.72,belt-.27,end+.002],[s*.72,belt-.34,end+.002],[s*.42,belt-.29,end+.002]],'#e6e7d8');
    face([[s*.39,belt-.15,-end-.002],[s*.73,belt-.13,-end-.002],[s*.73,belt-.24,-end-.002],[s*.39,belt-.24,-end-.002]],'#a34649');
  }
  face([[-.44,sill+.14,end+.003],[.44,sill+.14,end+.003],[.36,sill+.25,end+.003],[-.36,sill+.25,end+.003]],trim);
  return faces;
}
