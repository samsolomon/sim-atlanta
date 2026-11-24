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
  const axles=[-bumper+1.085,bumper-.975], r=.33, arch=.383;
  // Cut the arch into the metal skirt. Each arch has an inset, open, dark lining.
  const zs=[-end,-2.30,-1.96,-.70,.52,1.05,1.97,2.23,end];
  const archSegments=near?10:4;
  for(const z of axles)for(let i=0;i<=archSegments;i++)zs.push(z-arch*Math.cos(i*Math.PI/archSegments));
  zs.sort((a,b)=>a-b);
  function section(z){
    const ratio=Math.abs(z)/end, w=.92-.10*Math.max(0,(ratio-.78)/.22);
    const shoulder=.925-.13*Math.pow(ratio,3);
    let low=.285;
    for(const a of axles)if(Math.abs(z-a)<=arch+.000001)low=Math.max(low,r+Math.sqrt(Math.max(0,arch**2-(z-a)**2)));
    return [[-w*.95,low,z],[w*.95,low,z],[w,Math.max(low+.03,shoulder-.135),z],
      [w*.92,shoulder,z],[w*.71,shoulder+.043,z],[-w*.71,shoulder+.043,z],[-w*.92,shoulder,z],[-w,Math.max(low+.03,shoulder-.135),z]];
  }
  skin(zs.map(section),bodyPaint);
  for(const z of axles)for(const s of [-1,1]){
    for(let i=0;i<archSegments;i++){
      const p=(j,x)=>[s*x,r+arch*Math.sin(j*Math.PI/archSegments),z-arch*Math.cos(j*Math.PI/archSegments)];
      panel([p(i,.87),p(i+1,.87),p(i+1,.60),p(i,.60)],dark);
    }
    wheel(s*.76,r,z,s,near);
  }
  const rings=[[-1.74,.928,.80],[-1.03,1.37,.715],[-.74,1.439,.69],[-.26,1.445,.69],[.27,1.405,.69],[1.055,.946,.81]];
  for(let i=1;i<rings.length;i++){
    const [a,b]=[rings[i-1],rings[i]];
    const top=(v,s)=>[s*v[2],v[1],v[0]];
    panel([top(a,-1),top(a,1),top(b,1),top(b,-1)],i===1||i===5?wind:bodyPaint);
    for(const s of [-1,1]){
      const point=(t,h)=>{const z=a[0]+t*(b[0]-a[0]), y=a[1]+t*(b[1]-a[1]),w=a[2]+t*(b[2]-a[2]);return [s*(.849+h*(w-.849)),.929+h*(y-.929),z];};
      panel([point(0,0),point(0,1),point(1,1),point(1,0)],bodyPaint);
      const pane=(t,h)=>{const v=point(t,h);v[0]+=s*.003;return v;};
      panel([pane(.035,.07),pane(.035,.91),pane(.966,.91),pane(.966,.07)],glass);
    }
  }
  // Recessed lower intake, bumper shoulders, lamp pockets and boot-lid break.
  for(const [z,y,w,h,c] of [[end+.002,.492,1.24,.225,dark],[-bumper+.013,.588,1.11,.18,shadow],[-bumper+.0075,.588,.50,.105,'#c3c2b9']])box(0,y,z,w,h,.015,c);
  for(const s of [-1,1]){
    const tip=(x,y,z)=>[s*x,y,z];
    panel([tip(.32,.764,end+.015),tip(.77,.787,end+.015),tip(.81,.696,end+.015),tip(.44,.675,end+.015)],lens);
    panel([tip(.38,.734,-end-.015),tip(.77,.770,-end-.015),tip(.78,.648,-end-.015),tip(.44,.641,-end-.015)],red);
    if(!near)continue;
    box(s*.895,.34,0,.035,.055,1.98,rubber);
    for(const z of [-.93,.02,.98]){
      const top=.79, low=Math.abs(z)>.90?.60:.36;
      panel([[s*.922,low,z],[s*.922,low,z+.012],[s*.922,top,z+.05],[s*.922,top,z+.037]],shadow);
    }
    for(const z of [-.78,.16])box(s*.918,.784,z,.022,.032,.16,alloy);
    box(s*.894,.976,.73,.18,.038,.055,dark);
    box(s*.998,1.015,.74,.156,.095,.18,bodyPaint);
    box(s*.995,1.019,.645,.12,.066,.012,steel);
  }
  if(near)for(const y of [.434,.476,.518])box(0,y,bumper-.009,1.06,.013,.018,alloy);
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
    for(const z of [tandem-.67,tandem+.67])wheel(s*1.032,.51,z,s,near,true);
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
