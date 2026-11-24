import { expect, it } from 'vitest';
import { MovingQueue } from './traffic-queues';
import { signalPhase } from './traffic-signals';

const trips=[{start:0,length:4},{start:2,length:4},{start:4,length:6}];
const blocks=(t:number)=>[{rear:t<20?50:50+(t-20)*4,front:t<20?74:74+(t-20)*4}];
const make=()=>new MovingQueue([],300,10,blocks);
it('queues bumper-to-bumper behind a dwell and follows the departure without moving backward',()=>{
  const queue=make();
  expect(queue.at(trips,19)).toEqual([46,40,33]);
  let previous=[0,0,0];
  for(let t=5;t<=50;t+=.25){
    const positions=queue.at(trips,t) as number[];
    for(let i=0;i<positions.length;i++){
      expect(positions[i]).toBeGreaterThanOrEqual(previous[i]);
      if(t>5)expect(positions[i]-previous[i]).toBeLessThanOrEqual(2.5+1e-7);
      if(i)expect(positions[i-1]-positions[i]).toBeGreaterThanOrEqual(trips[i-1].length/2+trips[i].length/2+2-1e-7);
    }
    previous=positions;
  }
});
it('matches fresh loads after fractional frames, forward and backward seeks',()=>{
  const q=make();
  for(const t of [19.2,19.4,19.49,25.1,14.9,45.7,4.1,30.3]) expect(q.at(trips,t)).toEqual(make().at(trips,t));
});
it('resumes cached grid steps without replaying the whole trip',()=>{
  const q=make();q.at(trips,30);const before=q.steps;q.at(trips,30.25);expect(q.steps-before).toBe(2);
});
it('does not pull an already-ahead car behind a newly arriving streetcar',()=>{
  const q=new MovingQueue([],300,10,t=>t<10?[]:[{rear:20,front:44}]);
  expect(q.at([{start:0,length:4}],12)).toEqual([120]);
});
it('rechecks the signal after a streetcar delay makes a car miss green',()=>{
  const sig={key:'junction',axis:0 as const,s:90};
  const q=new MovingQueue([sig],300,10,blocks);
  let last=0;
  for(let t=0;t<100;t+=.5){
    const p=q.at([trips[0]],t)[0];if(p===null)continue;
    if(last<=88 && p>88)expect(signalPhase(sig.key,sig.axis,t)).toBe('green');
    last=p;
  }
});
it('free-flows without blockers and leaves completed trips offstage',()=>{
  const q=new MovingQueue([],100,10,()=>[]);
  expect(q.at([{start:1.25,length:4}],5.5)).toEqual([42.5]);
  expect(q.at([{start:1.25,length:4}],20)).toEqual([null]);
});
it('does not reverse between fractional frames when a streetcar enters the lane',()=>{
  const q=new MovingQueue([],300,10,t=>t<5.3?[]:[{rear:50+(t-5.3)*2,front:74+(t-5.3)*2}]);
  const trip=[{start:0,length:4}];
  let before=0;
  for(let t=5;t<6;t+=.05){const p=q.at(trip,t)[0]!;expect(p).toBeGreaterThanOrEqual(before-1e-7);before=p;}
});
it('samples blockers only on the fixed grid, even across thousands of fractional frames',()=>{
  const samples=new Set<number>();
  const q=new MovingQueue([],300,10,t=>{expect(t*2).toBe(Math.round(t*2));samples.add(t);return blocks(t);});
  for(let frame=0;frame<3600;frame++)q.at(trips,frame/60);
  expect(samples.size).toBeLessThanOrEqual(121);
});

it('bounds each warm rollover frame and catches up to the exact cold-seek positions', () => {
  const makeQueue = () => new MovingQueue([], 16000, 10, blocks);
  const queue = makeQueue();
  const old = [{start: 0, length: 4}, {start: 24, length: 6}, {start: 40, length: 4}];
  const rolled = [{start: 1200.1, length: 4}, old[1], old[2]];
  const previous = queue.at(old, 1200);
  let actual;
  for (let frame = 0; frame < 45; frame++) {
    const before = queue.steps;
    actual = queue.at(rolled, 1200.25 + frame / 30);
    expect(queue.steps - before).toBeLessThanOrEqual(66);
    if (frame === 0) expect(actual).toEqual([null, previous[1], previous[2]]);
  }
  expect(actual).toEqual(makeQueue().at(rolled, 1200.25 + 44 / 30));
  expect(queue.at(old, 600)).toEqual(makeQueue().at(old, 600));
});
