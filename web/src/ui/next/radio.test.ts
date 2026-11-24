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
  playError: Error | null = null;
  play() { if (this.playError) return Promise.reject(this.playError); this.paused = false; return Promise.resolve(); }
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
  source: (url) => { fetched.push(url); live.add(url); return hold ? hold.then(() => url) : Promise.resolve(url); },
  release: (src) => { released.push(src); live.delete(src); },
};
let fetched: string[] = [];
let released: string[] = [];
const live = new Set<string>();
let hold: Promise<void> | null = null;
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
  released = [];
  live.clear();
  hold = null;
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('radio engine', () => {
  it('opens on the scene clock’s station, prefetches only that track, and starts no audio until Play', async () => {
    const r = make(22);
    await r.ready;
    expect(r.station?.id).toBe('night');
    expect(r.track?.id).toMatch(/^n/);
    expect(fetched).toEqual([`/music/tracks/${r.track!.id}.mp3`]); // prefetched on open
    expect(els).toHaveLength(0);
    r.toggle();
    await flush();
    expect(r.playing).toBe(true);
    expect(fetched).toHaveLength(1); // Play reuses the prefetched file
    expect(mp3()).toHaveLength(1);
    expect(mp3()[0].src).toBe(`/music/tracks/${r.track!.id}.mp3`);
    expect(master().last('linear')).toBeUndefined(); // the ramp waits for sound
    mp3()[0].emit('playing');
    expect(master().last('linear')).toEqual(['linear', 1, 0.3]);
  });

  it('shows buffering until a slow first file arrives, then ramps in', async () => {
    let release!: () => void;
    hold = new Promise((r) => (release = r));
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    expect(r.buffering).toBe(true);
    release();
    await flush();
    expect(r.buffering).toBe(true); // the src is set, but nothing has sounded yet
    mp3()[0].emit('playing');
    expect(r.buffering).toBe(false);
    expect(master().last('linear')).toEqual(['linear', 1, 0.3]);
  });

  it('re-prefetches when the station changes before Play, and lets the old file go', async () => {
    const r = make(14);
    await r.ready;
    const first = fetched[0];
    r.switchStation(1);
    await flush();
    expect(fetched).toHaveLength(2);
    expect(released).toContain(first);
    expect(live.size).toBe(1);
  });

  it('never holds more than two files across an hour of crossfades', async () => {
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    for (let i = 0; i < 25; i++) {
      const cur = els.find((e) => e.src.endsWith('.mp3') && !e.paused)!;
      cur.duration = 180;
      cur.currentTime = 160.5;
      cur.emit('timeupdate');
      await flush();
      cur.currentTime = 175.5;
      cur.emit('timeupdate');
      await flush();
      const inc = els.find((e) => e !== cur && e.src.endsWith('.mp3'))!;
      inc.emit('playing');
      inc.currentTime = 5.1;
      inc.emit('timeupdate');
      await flush();
      expect(live.size).toBeLessThanOrEqual(2);
    }
    expect(fetched.length).toBe(26);
    expect(released.length).toBe(25);
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

  it('ignores the silent unlock clip’s events while the first file is still loading', async () => {
    let release!: () => void;
    hold = new Promise((r) => (release = r));
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    const first = r.track;
    const deck = els[0];
    deck.duration = 0.05;
    deck.currentTime = 0.05;
    deck.emit('timeupdate');
    deck.emit('ended');
    await flush();
    expect(r.track).toBe(first);
    expect(fetched).toHaveLength(1); // no preload, no skip
    release();
    await flush();
    expect(deck.src).toBe(`/music/tracks/${first!.id}.mp3`);
  });

  it('stays on the outgoing track if the incoming one won’t play', async () => {
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    const first = r.track;
    const a = mp3()[0];
    els.forEach((e) => { if (e !== a) e.playError = new DOMException('bad file', 'NotSupportedError'); });
    a.duration = 180;
    a.currentTime = 175.1;
    a.emit('timeupdate');
    await flush();
    expect(r.playing).toBe(true);
    expect(r.track).toBe(first);
    expect(a.paused).toBe(false);
    expect(deckGain(els.indexOf(a)).last('set')?.[1]).toBe(1); // back at (or held at) full level
    expect(els.find((e) => e !== a)!.src).toBe(''); // the failed deck lets its file go
  });

  it('reverses a pause or resume ramp from the level it has reached, without a jump', async () => {
    const r = make();
    await r.ready;
    r.toggle();
    await flush();
    mp3()[0].emit('playing'); // resume ramp 0 → 1 over 0.3 s, starting at t = 0
    ctx.currentTime = 0.1;
    r.toggle(); // pause a third of the way up
    const held = [...master().calls].reverse().find((c) => c[0] === 'set')!;
    expect(held[1]).toBeCloseTo(1 / 3, 5);
    expect(master().last('linear')).toEqual(['linear', 0, 0.4]);
  });

  it('takes a Play tap before the station list has loaded and starts once it arrives', async () => {
    let loadList!: (f: StationsFile) => void;
    const r = createRadio({
      load: () => new Promise((res) => (loadList = res)),
      sceneHour: () => 14,
      resolve: (p) => `/${p}`,
      audio,
      random: () => 0.5,
    });
    r.toggle();
    expect(r.playing).toBe(true);
    expect(r.buffering).toBe(true);
    expect(fetched).toHaveLength(0);
    loadList(FILE);
    await r.ready;
    await flush();
    expect(fetched).toHaveLength(1);
    expect(mp3()).toHaveLength(1);
    mp3()[0].emit('playing');
    expect(r.buffering).toBe(false);
    expect(master().last('linear')).toEqual(['linear', 1, 0.3]);
  });
});
