// Run with node --experimental-strip-types scripts/study-live-motion.mjs.
// All models receive the same six fixes. The clock and distances are synthetic.
import { appendFix, playback } from '../web/src/live/motion.ts';

const step = 0.25;
for (const trace of ['cruise', 'dwell', 'delayed']) {
  const distances = trace === 'dwell' ? [0, 300, 600, 600, 600, 900] : [0, 300, 600, 900, 1200, 1500];
  const arrivals = [0, 30, 60, trace === 'delayed' ? 110 : 90, 120, 150];
  const obs = distances.map((_, i) => i * 30 - 5);
  for (const delay of [8, 15, 30, 60]) {
    const history = [], samples = [];
    let from = 0, to = 0, received = 0, overshootM = 0;
    const legacy = t => from + (to - from) * Math.min(1, (t - received) / 8);
    for (let t = 0; t <= 240; t += step) {
      const i = arrivals.indexOf(t);
      if (i >= 0) {
        from = legacy(t);
        received = t;
        to = distances[i];
        appendFix(history, to, t * 1000, delay * 1000);
      }
      const position = delay === 8 ? legacy(t) : playback(history, t * 1000, delay * 1000);
      samples.push(position);
      overshootM = Math.max(overshootM, position - to, -position);
    }
    const at = t => samples[t / step];
    const speed = t => Number(((at(t + step) - at(t)) / step).toFixed(2));
    const endpointAge = arrivals.map((arrival, i) => {
      if (!i || distances[i] === distances[i - 1]) return null;
      let t = arrival;
      while (at(t) < distances[i] - 1e-6) t += step;
      return { upstream: arrival - obs[i], added: t - arrival, effective: t - obs[i] };
    });
    // Interior cruise cycle, true dwell, or delayed arrival. Exclude terminal hold.
    const start = 60, end = trace === 'dwell' ? 210 : arrivals[3];
    const pauses = [];
    for (let t = start; t < end; t += step) {
      if (at(t) !== at(t + step)) continue;
      const begin = t;
      while (t + step < end && at(t + step) === at(t + 2 * step)) t += step;
      pauses.push(t + step - begin);
    }
    const update = arrivals[3];
    console.log(JSON.stringify({ trace, delay, endpointAge, pauses, overshootM,
      speedEitherSideOfUpdate: [speed(update - step), speed(update)] }));
  }
}
