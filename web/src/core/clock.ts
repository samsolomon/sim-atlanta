/**
 * The simulated clock shared by the 2D map and the 3D diorama.
 * ?t=2026-11-20T14:00:00-05:00 pins the start time; ?speed=30 plays faster.
 */
const params = new URLSearchParams(location.search);

export const clock = {
  baseSim: params.get('t') ? new Date(params.get('t')!).getTime() : Date.now(),
  baseReal: performance.now(),
  speed: params.has('northReplay') ? 0 : Number(params.get('speed') ?? 1),
  offsetMin: 0,
  pinned: params.has('t'),
  now() {
    return new Date(this.baseSim + (performance.now() - this.baseReal) * this.speed + this.offsetMin * 60_000);
  },
  rebase() {
    this.baseSim = this.now().getTime() - this.offsetMin * 60_000;
    this.baseReal = performance.now();
  },
  /** Back to the real present at 1×. */
  reset() {
    this.pinned = false;
    this.baseSim = Date.now();
    this.baseReal = performance.now();
    this.offsetMin = 0;
    this.speed = 1;
  },
  /** True when the clock shows the real present, the only time live data applies. */
  isRealTime() {
    return this.offsetMin === 0 && this.speed === 1 && !this.pinned;
  },
};
