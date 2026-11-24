// Independent study geometry. One metre per unit, +z forward, y=0 at the tyre contact.
import {body,profiles} from './body.mjs';
const steel='#aab1b3', glass='#34444e', rubber='#292d31', white='#eeeDE6', paint='#8099a6';
function kit() {
  const faces=[];
  const panel=(points,color)=>faces.push({points,color});
  function shell(stations,color){
    const rings=stations.map(([z,w,low,top])=>[[-w/2,low,z],[w/2,low,z],[w/2,top-.09,z],[w*.46,top,z],[-w*.46,top,z],[-w/2,top-.09,z]]);
    panel(rings[0],color);
    for(let i=1;i<rings.length;i++)for(let j=0;j<6;j++){const k=(j+1)%6;panel([rings[i-1][j],rings[i-1][k],rings[i][k],rings[i][j]],color);}
    panel(rings.at(-1),color);
  }
  function block(x,y,z,w,h,l,color){
    const a=faces.length;shell([[z-l/2,w,y-h/2,y+h/2],[z+l/2,w,y-h/2,y+h/2]],color);
    const points=new Set(faces.slice(a).flatMap(f=>f.points));for(const p of points)p[0]+=x;
  }
  function wheels(z,r,track){
    for(const side of [-1,1]){
      const ring=(x,radius)=>Array.from({length:12},(_,i)=>[side*x,r+radius*Math.cos(i*Math.PI/6),z+radius*Math.sin(i*Math.PI/6)]);
      const outer=ring(track/2+.13,r), inner=ring(track/2-.13,r);
      for(let i=0;i<12;i++){const j=(i+1)%12;panel([outer[i],outer[j],inner[j],inner[i]],rubber);}
      panel(outer,rubber);panel(ring(track/2+.135,r*.55),steel);
    }
  }
  function cab(back,topFront,baseFront,w,top,belt,color){
    shell([[back,w,belt-.5,top],[topFront,w,belt-.5,top],[baseFront,w,belt-.5,belt+.02]],color);
    panel([[-w*.43,top-.07,topFront+.06],[w*.43,top-.07,topFront+.06],[w*.44,belt+.10,baseFront-.02],[-w*.44,belt+.10,baseFront-.02]],glass);
    for(const s of [-1,1])panel([[s*(w/2+.002),belt+.09,back+.13],[s*(w/2+.002),top-.15,back+.13],[s*(w/2+.002),top-.15,topFront],[s*(w/2+.002),belt+.09,baseFront-.13]],glass);
  }
  return {faces,panel,shell,block,wheels,cab};
}

export function commercial(style,{trailer=false}={}) {
  if(style==='pixel'){
    const key='pixel';
    profiles[key]={label:'Pixel-lamp EV hatch',length:4.635,width:1.890,roof:1.605,base:3.000,radius:.365,belt:.94,sill:.34,
      cabin:[[-2.18,.04],[-1.54,.97],[-1.23,1],[.16,1],[1.15,0]]};
    const faces=body(key).filter(f=>!['#e6e7d8','#a34649'].includes(f.color));delete profiles[key];
    const {faces:lights,panel}=kit();
    for(const end of [-1,1]){
      const z=end*2.319,y=end===1?.67:.78;
      panel([[-.78,y-.08,z],[.78,y-.08,z],[.78,y+.08,z],[-.78,y+.08,z]],rubber);
      for(const s of [-1,1])for(let i=0;i<(end===1?3:6);i++)for(let j=0;j<2;j++){
        const x=s*(.72-i*.062),h=y-.052+j*.059;
        panel([[x-.023,h,z+end*.002],[x+.023,h,z+end*.002],[x+.023,h+.046,z+end*.002],[x-.023,h+.046,z+end*.002]],end===1?'#faf4db':'#bc514b');
      }
    }
    return faces.concat(lights);
  }
  const {faces,shell,block,cab,wheels,panel}=kit();
  if(style==='transit'){
    shell([[-2.98,1.99,.44,2.66],[-2.85,2.03,.41,2.76],[1.35,2.03,.41,2.76],[2.04,1.99,.42,2.32],[2.63,1.96,.43,1.39],[2.99,1.80,.47,1.17]],white);
    panel([[-.85,2.34,2.05],[.85,2.34,2.05],[.88,1.51,2.59],[-.88,1.51,2.59]],glass);
    for(const s of [-1,1]){
      panel([[s*1.018,1.42,.84],[s*1.018,2.33,.84],[s*1.018,2.32,1.97],[s*1.018,1.50,2.48]],glass);
      block(s*1.01,.78,-.1,.034,.15,5.55,rubber);
      block(s*.90,1.55,-2.985,.12,.66,.035,'#a34649');
      block(s*.64,1.02,2.997,.32,.14,.035,'#f5edcf');
    }
    block(0,1.63,-2.994,.024,1.98,.03,rubber);block(0,.86,2.998,.93,.31,.03,rubber);
    wheels(-1.87,.36,1.81);wheels(1.89,.36,1.81);
  } else if(style==='box'){
    block(0,.64,0,.95,.22,7.24,rubber);
    shell([[.71,2.00,.53,1.46],[2.85,2.02,.53,1.49],[3.76,1.95,.56,1.29]],paint);
    cab(.72,1.85,2.60,1.97,2.04,1.38,paint);wheels(-1.47,.43,1.91);wheels(2.83,.43,1.76);
    block(0,2.34,-1.79,2.44,2.32,4.88,white);block(0,1.06,-1.79,2.46,.14,4.9,steel);
    block(0,2.32,-4.237,2.17,2.11,.03,'#ced2cf');block(0,.77,-4.23,2.36,.20,.30,rubber);
    block(0,1.03,3.77,1.44,.36,.04,steel);
    for(const s of [-1,1])block(s*.81,1.14,3.77,.30,.21,.05,'#ece4cb');
  } else{
    const classic=style==='classic', front=3.95;
    block(0,.76,0,.99,.24,7.70,rubber);
    shell([[-.19,1.90,.91,2.08],[1.90,1.75,.94,classic?2.15:2.09],[front,classic?1.40:1.52,1.00,classic?2.10:1.83]],paint);
    cab(.61,1.24,1.76,2.10,3.04,2.09,paint);
    shell([[-1.36,2.22,.91,classic?3.44:3.64],[-.42,2.22,.91,classic?3.44:3.59],[.62,2.13,.91,3.05]],paint);
    block(0,1.49,front+.02,classic?1.27:1.39,classic?1.16:.93,.065,steel);
    block(0,1.49,front+.062,classic?1.08:1.20,classic?.98:.75,.025,rubber);
    block(0,.80,front+.04,2.42,.30,.14,steel);
    for(const s of [-1,1]){
      block(s*1.06,1.29,2.96,.43,.24,classic?1.04:1.57,paint);
      block(s*1.02,1.24,classic?3.48:3.75,.32,.16,.04,'#ece4cf');
      block(s*1.09,2.53,.46,.14,2.20,.14,steel);
      block(s*1.05,.74,-.06,.43,.44,1.38,steel);
    }
    for(const z of [2.95,-2.0,-3.28])wheels(z,.53,2.12);
    if(trailer){
      block(0,2.70,-8.53,2.54,2.78,13.72,white);
      block(0,1.24,-8.53,2.54,.14,13.72,steel);
      for(const z of [-12.73,-14.00])wheels(z,.51,2.15);
    }
  }
  return faces;
}
