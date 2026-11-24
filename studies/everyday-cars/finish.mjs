// Close-view finish prototypes. Face lists can be packed into one vertex-colour draw per body.
const bodyPaint='#9aabb0', dark='#20272a', tyre='#292a2b', rubber='#373a3a';
const steel='#a5aba9', bright='#c4c9c7', alloy='#939b9d', shadow='#465056';
const glass='#344855', wind='#465d69', red='#914143', lens='#d9d9c7';
function kit() {
  const faces=[];
  const panel=(points,color)=>faces.push({points,color});
  function skin(rings,color,closed=true){
    if(closed)panel(rings[0].slice().reverse(),color);
    for(let i=1;i<rings.length;i++)for(let j=0;j<rings[i].length;j++){
      const k=(j+1)%rings[i].length;
      panel([rings[i-1][j],rings[i-1][k],rings[i][k],rings[i][j]],color);
    }
    if(closed)panel(rings.at(-1),color);
  }
  function box(x,y,z,w,h,l,color){
    skin([-1,1].map(s=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[x+a*w/2,y+b*h/2,z+s*l/2])),color);
  }
  function round(x,y,z,axis,levels,color,n=12){
    skin(levels.map(([d,r])=>Array.from({length:n},(_,j)=>{
      const a=r*Math.cos(j*2*Math.PI/n),b=r*Math.sin(j*2*Math.PI/n);
      return axis==='x'?[x+d,y+a,z+b]:axis==='y'?[x+a,y+d,z+b]:[x+a,y+b,z+d];
    })),color);
  }
  function wheel(x,r,z,side,near,truck=false){
    const w=truck?.26:.215;
    if(!near){
      const disc=(d,radius)=>Array.from({length:8},(_,i)=>[x+side*d,r+radius*Math.cos(i*Math.PI/4),z+radius*Math.sin(i*Math.PI/4)]);
      const back=disc(-w/2,r),outer=disc(w/2,r);
      for(let i=0;i<8;i++){const j=(i+1)%8;panel([outer[i],outer[j],back[j],back[i]],tyre);}
      panel(outer,tyre);panel(disc(w/2+.012,r*.55),alloy);return;
    }
    round(x,r,z,'x',[[-w/2,r*.92],[-w*.36,r],[w*.36,r],[w/2,r*.92]],tyre,near?16:10);
    const end=x+side*w/2;
    round(end,r,z,'x',[[0,r*.68],[side*.012,r*.65]],alloy);
    round(end+side*.014,r,z,'x',[[0,r*.56],[side*.008,r*.52]],shadow);
    for(let j=0;j<(truck?8:5);j++){
      const a=j*2*Math.PI/(truck?8:5);
      if(truck)round(end+side*.026,r+Math.sin(a)*r*.35,z+Math.cos(a)*r*.35,'x',[[0,.036],[side*.013,.027]],bright,6);
      else{
        const point=(angle,rad)=>[end+side*.027,r+Math.cos(angle)*rad,z+Math.sin(angle)*rad];
        panel([point(a-.31,r*.21),point(a-.025,r*.61),point(a+.17,r*.60),point(a+.28,r*.21)],bright);
      }
    }
    round(end+side*.026,r,z,'x',[[0,r*.24],[side*.033,r*.19]],steel,10);
  }
  return {faces,panel,skin,box,round,wheel};
}

export function sedanFinish(near=true){
  const {faces,panel,skin,box,wheel}=kit(), bumper=2.4425, end=bumper-.023;
  // AXVH70 G Leather Package profile, in longitudinal stations from rear bumper to nose.
  const rearAxle=-bumper+1.085, frontAxle=rearAxle+2.825;
  const r=.335, arch=.365;
  // z, half width at shoulder, deck/hood centre height, sill height.
  const body=[[-end,.65,.96,.36],[-2.32,.79,1.035,.255],[-2.13,.875,1.045,.22],
    [-1.81,.912,1.075,.205],[-1.28,.92,1.065,.20],[-.67,.90,1.005,.195],
    [.05,.898,.970,.195],[.93,.906,.951,.20],[1.13,.92,.947,.20],
    [1.66,.916,.920,.205],[2.00,.873,.86,.21],[2.24,.805,.802,.22],[end,.61,.73,.255]];
  function sample(stations,z){
    const i=stations.findIndex(row=>row[0]>=z);
    if(i<=0)return stations[i===0?0:stations.length-1];
    const a=stations[i-1],b=stations[i],t=(z-a[0])/(b[0]-a[0]);
    return a.map((v,j)=>v+t*(b[j]-v));
  }
  const axles=[rearAxle,frontAxle], segments=near?12:5;
  const zs=body.map(row=>row[0]);
  for(const axle of axles)for(let j=0;j<=segments;j++)zs.push(axle-arch*Math.cos(j*Math.PI/segments));
  const sections=zs.sort((a,b)=>a-b).map(z=>{
    const [,w,top,sill]=sample(body,z);
    let low=sill;
    for(const axle of axles)if(Math.abs(z-axle)<=arch+.000001)low=Math.max(low,r+Math.sqrt(Math.max(0,arch**2-(z-axle)**2)));
    const points=[[0,low], [w*.955,low],[w*.974,Math.max(low+.012,sill+.11)],
      [w,Math.max(low+.022,top-.19)], [w*.973,top-.115],[w*.81,top-.040],[w*.46,top+.005],[0,top]];
    return [...points,...points.slice(1,-1).reverse().map(([x,y])=>[-x,y])].map(([x,y])=>[x,y,z]);
  });
  skin(sections,bodyPaint);
  for(const axle of axles)for(const side of [-1,1]){
    for(let i=0;i<segments;i++){
      const at=(j,x)=>[side*x,r+arch*Math.sin(j*Math.PI/segments),axle-arch*Math.cos(j*Math.PI/segments)];
      panel([at(i,.88),at(i+1,.88),at(i+1,.64),at(i,.64)],dark);
    }
    wheel(side*(axle===frontAxle?.790:.7925),r,axle,side,near);
  }
  // Continuous roof crown across the car, with long rear glass narrowing onto the raised deck.
  // z, belt height, crown height, glass-base half width, roof-edge half width
  const canopy=[[-1.89,1.065,1.079,.67,.52],[-1.54,1.065,1.198,.82,.635],
    [-1.15,1.038,1.34,.855,.66],[-.92,1.017,1.402,.858,.68],
    [-.61,.993,1.437,.857,.698],[-.28,.974,1.445,.854,.71],
    [.03,.956,1.437,.852,.72],[.28,.947,1.414,.843,.73],
    [.47,.941,1.372,.837,.735],[.71,.938,1.283,.833,.750],[1.10,.941,1.067,.821,.775],[1.30,.942,.951,.80,.775]];
  function roofPoint(v,side,f){
    const [z,base,h,,w]=v;
    return [side*w*f,h-(h-base)*.112*f*f,z];
  }
  for(let i=1;i<canopy.length;i++){
    const a=canopy[i-1],b=canopy[i],paneColor=i<=3||i>=9?wind:bodyPaint;
    for(const side of [-1,1]){
      for(const [l,r] of [[0,.56],[.56,1]])panel([roofPoint(a,side,l),roofPoint(a,side,r),roofPoint(b,side,r),roofPoint(b,side,l)],paneColor);
      const point=(v,t)=>[side*(v[3]+(v[4]-v[3])*t),v[1]+(roofPoint(v,side,1)[1]-v[1])*t,v[0]];
      panel([point(a,0),point(a,1),point(b,1),point(b,0)],bodyPaint);
    }
  }
  // The side glass follows the roof without a mullion at every modelling station.
  for(const [lo,hi] of [[-1.29,-.915],[-.892,-.205],[-.105,1.04]]){
    const stops=[lo,...canopy.map(c=>c[0]).filter(z=>z>lo&&z<hi),hi];
    for(let i=1;i<stops.length;i++)for(const side of [-1,1]){
      const glassPoint=(z,t)=>{
        const v=sample(canopy,z), top=roofPoint(v,side,1)[1];
        const taper=Math.min(1,(z+1.34)/.36,(1.12-z)/.30);
        const f=.12+(t*.84)*taper;
        return [side*(v[3]+(v[4]-v[3])*f+.004),v[1]+(top-v[1])*f,z];
      };
      const a=stops[i-1],b=stops[i];
      panel([glassPoint(a,0),glassPoint(a,1),glassPoint(b,1),glassPoint(b,0)],glass);
    }
  }
  // Map the lens pockets and fascia onto the formed bumper corners. Ray/triangle
  // interpolation follows the same triangulation used to pack these faces for Three.
  const hull=faces.slice(0,2+(sections.length-1)*sections[0].length);
  function surfaceZ(x,y,dir){
    let furthest=-Infinity;
    for(const {points} of hull)for(let i=1;i<points.length-1;i++){
      const [a,b,c]=[points[0],points[i],points[i+1]];
      const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      if(Math.abs(den)<1e-9)continue;
      const u=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/den;
      const v=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/den;
      if(u>=-1e-6&&v>=-1e-6&&u+v<=1.000001)furthest=Math.max(furthest,dir*(u*a[2]+v*b[2]+(1-u-v)*c[2]));
    }
    if(!Number.isFinite(furthest))throw Error('Fascia outside shell');
    return dir*(furthest+.018);
  }
  for(const side of [-1,1]){
    // Each row gives a lateral station and the lower/upper edges in elevation.
    const band=(rows,dir,color,offset=0)=>{
      const point=(x,y)=>[side*x,y,surfaceZ(side*x,y,dir)+dir*offset];
      for(let i=1;i<rows.length;i++){
        const [a,b]=[rows[i-1],rows[i]];
        panel([point(a[0],a[1]),point(b[0],b[1]),point(b[0],b[2]),point(a[0],a[2])],color);
      }
    };
    band([[.27,.65,.674],[.42,.66,.72],[.56,.677,.735],[.66,.70,.754],[.755,.732,.777],[.812,.764,.802]],1,lens);
    band([[.23,.886,.936],[.42,.89,.965],[.58,.90,.976],[.71,.913,.987],[.78,.936,.99]],-1,red);
    band([[0,.31,.614],[.27,.313,.625],[.45,.32,.611],[.57,.337,.552],[.64,.35,.404]],1,dark);
    band([[0,.667,.822],[.23,.67,.824],[.38,.70,.847]],-1,shadow);
    if(!near)continue;
    for(const z of [-.98,-.21,.99]){
      const [,w,h,sill]=sample(body,z);
      const low=Math.abs(z)>.90?.62:sill+.065;
      panel([[w+.002,low,z],[w+.004,low,z+.009],[w*.978,h-.102,z+.032],[w*.978,h-.102,z+.022]].map(([x,y,z])=>[side*x,y,z]),shadow);
    }
    for(const z of [-.91,-.025]){
      const [,w,h]=sample(body,z);
      box(side*w,h-.125,z,.018,.025,.15,alloy);
    }
    box(side*.885,.982,.73,.15,.032,.047,dark);
    box(side*.971,1.012,.72,.15,.082,.167,bodyPaint);
    box(side*.966,1.014,.634,.112,.051,.008,steel);
    for(const y of [.365,.420,.475,.530]){
      band([[0,y,y+.011],[.25,y,y+.011],[.43,y+.005,y+.016],[.49,y+.01,y+.021]],1,alloy,.004);
    }
  }
  return faces;
}

export function tractorFinish(near=true){
  const {faces,skin,panel,box,round,wheel}=kit(), bumper=4.12, nose=bumper-.07, steer=bumper-.7874;
  const tandem=steer-7.112, cabBack=bumper-3.325, tail=tandem-1.51;
  function shell(stations,color){skin(stations.map(([z,w,low,top])=>[[-w*.5,low,z],[w*.5,low,z],[w*.5,top-.09,z],[w*.44,top,z],[-w*.44,top,z],[-w*.5,top-.09,z]]),color);}
  for(const s of [-1,1])box(s*.43,.78,(nose+tail)/2,.13,.27,nose-tail,dark);
  shell([[1.96,1.43,1.06,2.15],[2.27,1.40,1.04,2.18],[nose-.15,1.30,1.06,2.11],[nose-.10,1.24,1.06,2.085]],bodyPaint);
  shell([[cabBack,2.08,1.20,3.01],[1.61,2.04,1.20,3.01],[2.04,2.02,1.18,2.18]],bodyPaint);
  panel([[-.87,2.88,1.70],[.87,2.88,1.70],[.92,2.22,2.036],[-.92,2.22,2.036]],wind);
  const sleeperRear=cabBack-1.83;
  shell([[sleeperRear,2.22,1.05,3.35],[sleeperRear+.10,2.24,1.04,3.45],[cabBack-.30,2.22,1.04,3.45],[cabBack+.04,2.14,1.09,3.17]],bodyPaint);
  box(0,1.59,nose-.055,1.32,1.15,.12,bright);
  box(0,1.60,nose+.012,1.15,1.00,.025,shadow);
  box(0,.728,nose,2.47,.345,.14,steel);
  for(const s of [-1,1]){
    panel([[s*1.043,2.13,.94],[s*1.043,2.82,.94],[s*1.043,2.84,1.62],[s*1.043,2.18,1.91]],glass);
    wheel(s*.995,.51,steer,s,near,true);
    for(const z of [tandem-.67,tandem+.67]){
      wheel(s*1.032,.51,z,s,near,true);
      // Add the inner casing inboard. Both 260 mm tyres retain 62 mm of sidewall clearance.
      round(s*.710,.51,z,'x',[[-.130,.468],[-.10,.51],[.10,.51],[.130,.468]],tyre,near?16:8);
    }
    // Swept bicycle fenders cover the crown but leave the tyre sidewall exposed.
    for(let i=0;i<12;i++){
      const p=(j,x,r)=>[s*x,.51+r*Math.sin(j*Math.PI/12),steer+r*Math.cos(j*Math.PI/12)];
      panel([p(i,.77,.66),p(i,1.24,.66),p(i+1,1.24,.66),p(i+1,.77,.66)],bodyPaint);
      panel([p(i,1.24,.66),p(i,1.24,.595),p(i+1,1.24,.595),p(i+1,1.24,.66)],bodyPaint);
    }
    box(s*.992,1.23,steer+.46,.43,.21,.34,alloy);
    box(s*.992,1.23,steer+.64,.34,.135,.018,lens);
    round(s*.88,.735,-.19,'z',[[-.78,.30],[-.72,.345],[.67,.345],[.74,.30]],steel);
    if(near)for(const z of [-.71,.39])round(s*.88,.735,z,'z',[[-.037,.35],[.037,.35]],shadow);
    box(s*.92,.89,1.35,.55,.48,.93,steel);
    for(let i=0;i<3;i++)box(s*(1.15-i*.065),.59+i*.18,1.36,.20,.055,.96,bright);
    round(s*1.056,0,.74,'y',[[1.05,.105],[3.64,.105],[3.71,.096]],steel);
    if(!near)continue;
    round(s*1.03,0,2.06,'y',[[1.35,.14],[1.42,.18],[2.13,.18],[2.20,.14]],bright);
    box(s*1.121,2.03,-.49,.025,1.37,.55,shadow);
    box(s*1.140,2.03,-.49,.025,1.32,.50,bodyPaint);
    box(s*1.157,2.43,-.49,.016,.365,.405,glass);
    box(s*1.155,1.67,-.64,.018,.108,.065,dark);
    box(s*1.09,2.08,.94,.032,.46,.032,bright);
    box(s*1.16,2.61,1.74,.25,.032,.035,alloy);
    box(s*1.272,2.57,1.74,.055,.35,.14,bright);
    box(s*1.05,.62,tail+.25,.49,.60,.05,rubber);
  }
  // Slotted fifth wheel on slide rails; open rear throat admits the trailer kingpin.
  const pin=tandem+.23;
  for(const s of [-1,1]){
    box(s*.34,.985,pin,.14,.15,1.44,steel);
    panel([[s*.04,1.12,pin+.45],[s*.42,1.12,pin+.41],[s*.53,1.12,pin+.13],[s*.49,1.12,pin-.43],[s*.34,1.12,pin-.52],[s*.075,1.12,pin+.04]],dark);
  }
  box(0,.999,-1.66,.99,.08,.94,alloy);
  if(near){
    for(let i=-5;i<=5;i++)box(i*.091,1.046,-1.66,.019,.014,.88,shadow);
    for(let i=-5;i<=5;i++)box(i*.098,1.59,nose+.031,.021,.89,.018,alloy);
    for(const y of [1.33,1.59,1.85])box(0,y,nose+.044,1.115,.024,.022,bright);
    for(const x of [-.74,-.36,0,.36,.74])box(x,3.018,1.52,.073,.048,.12,'#c88c4b');
  }
  return faces;
}
