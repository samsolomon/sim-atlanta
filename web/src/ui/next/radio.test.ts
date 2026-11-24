import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRadio, type RadioAudio } from './radio';
import type { StationsFile } from './radio-plan';

// ---- fakes: just enough Web Audio to watch the engine's decisions ---------------------------

class FakeParam {
  value = 0;
  calls: [string, ...unknown[]][] = [];
  cancelScheduledValues(t: number) { this.calls.push(['cancel', t]); }
  setValueAtTime(v: number, t: number) { this.calls.push(['set', v, t]); this.value = v; }
  linearRampToValueAtTime(v: number, t: number) { this.calls.push(['linear', v, t]); this.value = v; }
  setValueCurveAtTime(c: Float32Array, t: number, d: number) { this.calls.push(['curve', c[0], c[c.length - 1], t, d]); this.value = c[c.length - 1]; }
  last(kind: string) { return [...this.calls].reverse().find((c) => c[0] === kind); }
}
class FakeNode { gain = new FakeParam(); connect() {} }
class FakeContext {
  currentTime = 0;
  state = 'running';
  destination = {};
  gains: FakeNode[] = [];
  createGain() { const g = new FakeNode(); this.gains.push(g); return g; }
  createMediaElementSource() { return { connect() {} }; }
  resume() { this.state = 'running'; return Promise.resolve(); }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
}
class FakeElement {
  src = '';
  preload = '';
  crossOrigin = '';
  currentTime = 0;
  duration = NaN;
  paused = true;
  private handlers = new Map<string, (() => void)[]>();
  addEventListener(t: string, fn: () => void) { this.handlers.set(t, [...(this.handlers.get(t) ?? []), fn]); }
  emit(t: string) { (this.handlers.get(t) ?? []).forEach((fn) => fn()); }
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
  removeAttribute(a: string) { if (a === 'src') this.src = ''; }
  load() {}
}

const track = (id: string, durationS = 180) => ({
  id, artist: `Artist ${id}`, title: `Title ${id}`, src: `music/tracks/${id}.mp3`,
  cover: { small: `music/covers/${id}-128.webp`, large: `music/covers/${id}-512.webp` }, durationS, source: 'elevenlabs',
});
const FILE: StationsFile = {
  version: 1,
  stations: [
    { id: 'day', name: 'Day FM', description: '', defaultHours: [5, 17], tracks: [track('d1'), track('d2'), track('d3')] },
    { id: 'night', name: 'Night FM', description: '', defaultHours: [17, 5], tracks: [track('n1'), track('n2')] },
  ],
};

let ctx: FakeContext;
let els: FakeElement[];
const audio: RadioAudio = {
  context: () => (ctx = new FakeContext()) as unknown as AudioContext,
  element: () => { const e = new FakeElement(); els.push(e); return e as unknown as HTMLAudioElement; },
  source: (url) => { fetched.push(url); return Promise.resolve(url); },
  release: () => {},
};
let fetched: string[] = [];
/** Let the decks' fetched sources settle. */
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
function make(hour = 14, storage: Map<string, string> = new Map()) {
  const r = createRadio({
    load: () => Promise.resolve(FILE),
    sceneHour: () => hour,
    resolve: (p) => `/${p}`,
    storage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => void storage.set(k, v) },
    audio,
    random: () => 0.5,
  });
  return r;
}
/** The decks are the context's 2nd and 3rd gains (the first is the master). */
const deckGain = (i: number) => ctx.gains[i + 1].gain;
const master = () => ctx.gains[0].gain;
const mp3 = () => els.filter((e) => e.src.endsWith('.mp3'));

beforeEach(() => {
  els = [];
  fetched = [];
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('radio engine', () => {
  it('opens on the scene clock’s station and touches no audio until Play', async () => {
    const r = make(22);
    await r.ready;
    expect(r.station?.id).toBe('night');
    expect(r.track?.id).toMatch(/^n/);
    expect(els).toHaveLength(0);
    r.toggle();
    await flush();
    expect(r.playing).toBe(true);
    expect(fetched).toHaveLength(1);
    expect(mp3()).toHaveLength(1);
    expect(mp3()[0].src).toBe(`/music/tracks/${r.track!.id}.mp3`);
    expect(master().last('linear')).toEqual(['linear', 1, 0.3]);
  });

  it('fetches the next file 20 s out and crossfades 5 s out, switching the title at the midpoint', async () => {
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    const first = r.track!;
    const a = mp3()[0];
    a.duration = 180;
    a.currentTime = 150;
    a.emit('timeupdate');
    expect(mp3()).toHaveLength(1); // nothing preloaded yet
    a.currentTime = 160.2;
    a.emit('timeupdate');
    await flush();
    expect(mp3()).toHaveLength(2);
    expect(fetched).toHaveLength(2); // the current and the next file, nothing more
    const b = mp3().find((e) => e !== a)!;
    expect(b.paused).toBe(true);
    a.currentTime = 175.1;
    a.emit('timeupdate');
    await flush();
    expect(b.paused).toBe(false);
    ctx.currentTime = 10;
    b.emit('playing');
    const bi = els.indexOf(b), ai = els.indexOf(a);
    expect(deckGain(bi).last('curve')).toEqual(['curve', 0, 1, 10.005, 5]);
    expect(deckGain(ai).last('curve')).toEqual(['curve', 1, expect.closeTo(0, 6), 10.005, 5]);
    b.currentTime = 2.4;
    b.emit('timeupdate');
    expect(r.track).toBe(first);
    b.currentTime = 2.6;
    b.emit('timeupdate');
    expect(r.track).not.toBe(first);
    b.currentTime = 5.1;
    b.emit('timeupdate');
    expect(a.src).toBe(''); // the old deck lets its file go
  });

  it('fades Next over 1.2 s, and turns an interrupted fade round from its current level', async () => {
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    const a = mp3()[0];
    r.next();
    await flush();
    const b = els.find((e) => e !== a && e.src.endsWith('.mp3'))!;
    ctx.currentTime = 1;
    b.emit('playing');
    expect(deckGain(els.indexOf(b)).last('curve')).toEqual(['curve', 0, 1, 1.005, 1.2]);
    // Halfway through, Next again: the louder deck fades out from where it is.
    ctx.currentTime = 1.605;
    r.next();
    await flush();
    const c = els.find((e) => e.src.endsWith('.mp3') && e.src !== b.src && e !== b) ?? a;
    ctx.currentTime = 1.7;
    c.emit('playing');
    const outCurve = [deckGain(0), deckGain(1)].map((g) => g.last('curve')!).find((x) => (x[1] as number) > 0.5 && (x[2] as number) < 0.01)!;
    expect(outCurve[1]).toBeGreaterThan(0.6);
    expect(outCurve[1]).toBeLessThan(1);
  });

  it('ramps pause over 300 ms, then stops the elements and the audio clock together', async () => {
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    const a = mp3()[0];
    r.toggle();
    expect(master().last('linear')).toEqual(['linear', 0, 0.3]);
    expect(a.paused).toBe(false);
    vi.advanceTimersByTime(340);
    expect(a.paused).toBe(true);
    expect(ctx.state).toBe('suspended');
    r.toggle();
    await flush();
    expect(ctx.state).toBe('running');
    expect(a.paused).toBe(false);
  });

  it('remembers a station the visitor switched to, and that beats the clock next time', async () => {
    const store = new Map<string, string>();
    const r = make(14, store);
    await r.ready;
    expect(r.station?.id).toBe('day');
    r.switchStation(1);
    expect(r.station?.id).toBe('night');
    expect(r.track?.id).toMatch(/^n/);
    expect(store.get('a2-radio-station')).toBe('night');
    const again = make(14, store);
    await again.ready;
    expect(again.station?.id).toBe('night');
  });

  it('cuts straight to the next track if the fade never got going', async () => {
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    const first = r.track;
    mp3()[0].emit('ended');
    expect(r.track).not.toBe(first);
  });
});
