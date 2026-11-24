/**
 * The radio (docs/ui-controls-brief.md, Radio): four stations from web/public/music/stations.json,
 * off until tapped, because browsers block autoplay.
 *
 * Tracks roll into each other. Each plays through its own GainNode (iOS ignores
 * HTMLAudioElement.volume), so two "decks" crossfade with an equal-power curve: the next file is
 * fetched 20 s before the end, the next track starts 5 s before the end, and the title, art and
 * Media Session switch at the fade's midpoint. Next and a station switch fade over 1.2 s; pause
 * and resume ramp over 300 ms. All of it runs on audio time (AudioParam automation and the
 * elements' timeupdate events), never on the render loop.
 *
 * Nothing under music/ is requested until the radio is first opened, and only the current and
 * next file are ever fetched. They stay static assets that never run the worker script. Cloudflare's
 * static assets answer a Range request with the whole file (200, checked on production), and iOS
 * Safari won't play <audio> from a server without byte ranges. So each deck fetches its file with
 * one plain request and either streams it through MediaSource (Chrome, Android, Firefox) or, on
 * Safari, plays it from a blob URL once it has arrived (radio-source.ts).
 */
import {
  FADE_S, PAUSE_RAMP_S, SKIP_FADE_S, Shuffle, equalPowerCurve, gainAt, startStation, trackTimeline,
  type Station, type StationTrack, type StationsFile,
} from './radio-plan';
import { trackSource } from './radio-source';

export type { Station, StationTrack } from './radio-plan';

/** What the engine needs from Web Audio, so tests can supply fakes. */
export interface RadioAudio {
  context(): AudioContext;
  element(): HTMLAudioElement;
  /** Fetch a track and give back something an <audio> src can play. */
  source(url: string, signal: AbortSignal): Promise<string>;
  /** Let go of a source from `source`. */
  release(src: string): void;
}

export interface RadioOptions {
  load(): Promise<StationsFile>;
  /** The scene clock's hour in Atlanta (fractional), which picks the first station. */
  sceneHour(): number;
  /** Turn a stations.json path ("music/...") into a URL. */
  resolve(path: string): string;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  audio?: RadioAudio;
  random?: () => number;
  deferInitialPrefetch?: boolean;
}

export interface Radio {
  /** Resolves when stations.json has loaded; rejects if it can't. */
  readonly ready: Promise<void>;
  readonly loaded: boolean;
  readonly playing: boolean;
  readonly station: Station | null;
  /** The track the player shows: it switches at a crossfade's midpoint. */
  readonly track: StationTrack | null;
  readonly elapsedS: number;
  /** Playing, but the current file hasn't arrived yet (the button shows a spinner). */
  readonly buffering: boolean;
  /** Call from a click: the first call creates the AudioContext. */
  toggle(): void;
  next(): void;
  switchStation(dir: 1 | -1): void;
  selectStation(id: string): void;
  onChange(fn: () => void): void;
}

const STATION_KEY = 'a2-radio-station';
/** Starts each crossfade's curve just after the held value, so the two automation events never collide. */
const AFTER = 0.005;

type Role = 'idle' | 'primary' | 'preloaded' | 'incoming' | 'outgoing';
interface Deck {
  el: HTMLAudioElement;
  gain: GainNode;
  track: StationTrack | null;
  role: Role;
  /** Settles once the track's file is fetched and set as the element's src. */
  ready: Promise<boolean>;
  /** Has sounded since its file was assigned (a streamed src exists before any audio does). */
  heard: boolean;
  waitForEnd: boolean;
  abort: AbortController | null;
  blob: string | null;
  /** Our own record of the gain automation, so an interrupted fade can turn round smoothly. */
  rest: number;
  fade: { from: number; to: number; t0: number; dur: number } | null;
}

/** 0.05 s of silence (8 kHz, 8-bit mono WAV). Played once inside the first tap so iOS lets each
 * deck start later without one; it never touches the network. */
function silentWav(): string {
  const n = 400;
  const b = new Uint8Array(44 + n);
  const v = new DataView(b.buffer);
  const s = (o: number, t: string) => [...t].forEach((c, i) => (b[o + i] = c.charCodeAt(0)));
  s(0, 'RIFF'); v.setUint32(4, 36 + n, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
  v.setUint16(32, 1, true); v.setUint16(34, 8, true); s(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  let bin = '';
  b.forEach((x) => (bin += String.fromCharCode(x)));
  return `data:audio/wav;base64,${btoa(bin)}`;
}

const browserAudio: RadioAudio = {
  context: () => new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(),
  element: () => new Audio(),
  source: (url, signal) => trackSource(url, signal, {
    fetch: (...a) => fetch(...a),
    MediaSource: typeof MediaSource === 'undefined' ? undefined : MediaSource,
    createObjectURL: (o) => URL.createObjectURL(o),
    userAgent: navigator.userAgent,
  }),
  release: (src) => URL.revokeObjectURL(src),
};

export function createRadio(o: RadioOptions): Radio {
  const audio = o.audio ?? browserAudio;
  const random = o.random ?? Math.random;
  const listeners: (() => void)[] = [];
  let stations: Station[] = [];
  let station: Station | null = null;
  const shuffles = new Map<string, Shuffle>();
  let loaded = false;
  let unavailable = false;
  let playing = false;
  let shown: StationTrack | null = null;
  /** The track that plays next: chosen as soon as one starts, so the preloaded file is the one used. */
  let upcoming: StationTrack | null = null;
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let decks: Deck[] = [];
  let fading: { inc: Deck; out: Deck; dur: number; midDone: boolean; scheduled: boolean } | null = null;
  let pauseTimer: ReturnType<typeof setTimeout> | undefined;
  let masterLevel = 0;
  /** The shown track's file, fetched as soon as the panel opens so Play has little to wait for. */
  let prefetch: { track: StationTrack; ac: AbortController; src: Promise<string | null> } | null = null;
  /** Hold the resume ramp until the first file actually sounds. */
  let rampOnSound = false;
  let masterRamp = { from: 0, t0: 0, dur: 0 };

  const changed = () => {
    listeners.forEach((fn) => fn());
    mediaSession();
  };

  const pick = (s: Station): StationTrack => {
    let sh = shuffles.get(s.id);
    if (!sh) shuffles.set(s.id, (sh = new Shuffle(s.tracks.length, random)));
    return s.tracks[sh.next()];
  };

  const ready = o.load().then((file) => {
    stations = file.stations;
    let remembered: string | null = null;
    try {
      remembered = o.storage?.getItem(STATION_KEY) ?? null;
    } catch {
      /* private mode */
    }
    station = startStation(stations, o.sceneHour(), remembered);
    shown = upcoming = pick(station);
    loaded = true;
    if (!o.deferInitialPrefetch) prefetchUpcoming();
    if (playing && ctx && !primary() && upcoming) crossfade(0, upcoming);
    changed();
  }).catch((error: unknown) => {
    unavailable = true;
    playing = false;
    if (ctx) pause();
    throw error;
  });

  /** Before the first Play, keep the file for the track on show fetched (and only that one). */
  function prefetchUpcoming() {
    if (ctx && primary()) return;
    if (prefetch && prefetch.track === upcoming) return;
    dropPrefetch();
    if (!upcoming) return;
    const ac = new AbortController();
    const t = upcoming;
    prefetch = { track: t, ac, src: audio.source(o.resolve(t.src), ac.signal).catch(() => null) };
  }
  function dropPrefetch() {
    if (!prefetch) return;
    const p = prefetch;
    prefetch = null;
    p.ac.abort();
    void p.src.then((src) => src && audio.release(src));
  }

  function levelOf(d: Deck): number {
    if (!d.fade || !ctx) return d.rest;
    return gainAt(d.fade.from, d.fade.to, (ctx.currentTime - d.fade.t0) / d.fade.dur);
  }

  /** Move a deck's gain to `to` along the equal-power curve, from wherever it is now. */
  function ramp(d: Deck, to: number, dur: number) {
    const now = ctx!.currentTime;
    const from = levelOf(d);
    const g = d.gain.gain;
    g.cancelScheduledValues(0);
    g.setValueAtTime(from, now);
    d.rest = to;
    if (dur <= 0 || Math.abs(to - from) < 1e-4) {
      g.setValueAtTime(to, now + AFTER);
      d.fade = null;
      return;
    }
    g.setValueCurveAtTime(equalPowerCurve(from, to), now + AFTER, dur);
    d.fade = { from, to, t0: now + AFTER, dur };
  }

  /** Pause and resume ramp the master linearly; a reversal starts from where the last ramp is now. */
  function rampMaster(to: number, dur: number) {
    const now = ctx!.currentTime;
    const p = masterRamp.dur > 0 ? Math.min(1, Math.max(0, (now - masterRamp.t0) / masterRamp.dur)) : 1;
    const from = masterRamp.from + (masterLevel - masterRamp.from) * p;
    const g = master!.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(from, now);
    g.linearRampToValueAtTime(to, now + dur);
    masterRamp = { from, t0: now, dur };
    masterLevel = to;
  }

  function unload(d: Deck) {
    d.abort?.abort();
    d.abort = null;
    if (d.blob) audio.release(d.blob);
    d.blob = null;
  }

  function assign(d: Deck, t: StationTrack, role: Role) {
    if (d.track !== t || d.role === 'idle') {
      unload(d);
      // A reused deck may still be sounding its old file: silence it before the new one arrives.
      d.el.pause();
      d.el.removeAttribute('src');
      d.el.load();
      d.gain.gain.cancelScheduledValues(0);
      d.gain.gain.value = 0;
      d.rest = 0;
      d.fade = null;
      d.track = t;
      d.heard = false;
      d.waitForEnd = false;
      let ac: AbortController;
      let src: Promise<string>;
      if (prefetch && prefetch.track === t) {
        // Hand the prefetched file to the deck; the deck now owns (and releases) it.
        ac = d.abort = prefetch.ac;
        const p = prefetch.src;
        prefetch = null;
        src = p.then((x) => x ?? audio.source(o.resolve(t.src), ac.signal));
      } else {
        ac = d.abort = new AbortController();
        src = audio.source(o.resolve(t.src), ac.signal);
      }
      d.ready = src.then(
        (src) => {
          if (ac.signal.aborted || d.track !== t) {
            audio.release(src);
            return false;
          }
          d.blob = src;
          d.el.preload = 'auto';
          d.el.src = src;
          changed();
          return true;
        },
        () => false,
      );
    }
    d.role = role;
  }

  function retire(d: Deck) {
    unload(d);
    d.ready = Promise.resolve(false);
    d.el.pause();
    d.el.removeAttribute('src');
    d.el.load(); // drops the buffered file
    d.track = null;
    d.role = 'idle';
    d.fade = null;
    d.rest = 0;
    d.gain.gain.cancelScheduledValues(0);
    d.gain.gain.value = 0;
  }

  const durationOf = (d: Deck) => (Number.isFinite(d.el.duration) && d.el.duration > 0 ? d.el.duration : d.track?.durationS ?? 0);
  const primary = () => decks.find((d) => d.role === 'primary' || d.role === 'incoming') ?? null;
  const other = (d: Deck) => decks[decks[0] === d ? 1 : 0];

  /** Failures in a row; reset whenever a track sounds. Two in a row (say, offline) stop the radio
   * rather than racing through the station. */
  let strikes = 0;
  function play(d: Deck) {
    const t = d.track;
    void d.ready.then((ok) => {
      if (!playing || d.track !== t || d.role === 'idle' || d.role === 'preloaded') return;
      if (!ok) {
        // The file didn't load: skip to the next track rather than sit silent, but count it, so
        // a dead network stops the radio instead of fetching its way through the station.
        if (d.role !== 'primary' && d.role !== 'incoming') return;
        if (fading?.inc === d || ++strikes >= 2) return failed(d);
        crossfade(0);
        return;
      }
      return d.el.play().catch((e: unknown) => {
        // A pause or track change aborts the pending play: that's not a failure.
        if (e instanceof DOMException && e.name === 'AbortError') return;
        failed(d);
      });
    });
  }

  /** True once the deck's own track is the element's source: until then its events come from the
   * silent unlock clip and must not move the playlist. */
  const sounding = (d: Deck) => !!d.blob && d.el.src === d.blob;

  /** A track that fetched but won't play (an undecodable file, a blocked start). */
  function failed(d: Deck) {
    if (fading && d === fading.inc) {
      // Mid-crossfade: stay on the outgoing track, back at full level.
      const out = fading.out;
      fading = null;
      if (out.role !== 'outgoing' || out.el.paused || out.el.ended) {
        retire(out);
        retire(d);
        shown = upcoming;
        playing = false;
        strikes = 0;
        pause();
        return;
      }
      retire(d);
      strikes = 0;
      out.waitForEnd = out.el.currentTime >= trackTimeline(durationOf(out)).fadeAt;
      out.role = 'primary';
      ramp(out, 1, PAUSE_RAMP_S);
      shown = out.track;
      changed();
      return;
    }
    if (d.role === 'primary' || d.role === 'incoming') {
      // Nothing else is sounding: stop cleanly, so the button and the speakers agree.
      playing = false;
      pause();
    }
  }

  /** A media error after the file was assigned (a stream cut off mid-track, a bad file). */
  function onError(d: Deck) {
    if (!sounding(d) || !playing) return;
    if (d.role === 'outgoing') return retire(d);
    if (++strikes >= 2) return failed(d);
    if (fading && d === fading.inc) return failed(d);
    if (d.role === 'primary') crossfade(0);
  }

  function onTime(d: Deck) {
    if (!playing || !d.track || !sounding(d)) return;
    const t = d.el.currentTime;
    if (fading && d === fading.inc) {
      if (!fading.midDone && t >= fading.dur / 2) {
        fading.midDone = true;
        shown = d.track;
        changed();
      }
      if (t >= fading.dur) finishFade();
      return;
    }
    if (d.role !== 'primary' || fading || d.waitForEnd) return;
    const { preloadAt, fadeAt } = trackTimeline(durationOf(d));
    if (t >= preloadAt && upcoming) {
      const o2 = other(d);
      if (o2.role === 'idle' || o2.track !== upcoming) assign(o2, upcoming, 'preloaded');
    }
    if (t >= fadeAt) crossfade(FADE_S);
  }

  function onPlaying(d: Deck) {
    if (!sounding(d)) return;
    strikes = 0;
    if (!d.heard) {
      d.heard = true;
      changed();
    }
    if (rampOnSound && playing && (d.role === 'primary' || d.role === 'incoming')) {
      rampOnSound = false;
      rampMaster(1, PAUSE_RAMP_S);
      changed();
    }
    // Schedule a crossfade's ramps only once the incoming track is actually sounding, so a slow
    // fetch never leaves a gap: until then the outgoing track keeps playing at full level.
    if (fading && d === fading.inc && !fading.scheduled) {
      fading.scheduled = true;
      ramp(fading.inc, 1, fading.dur);
      ramp(fading.out, 0, fading.dur);
    }
  }

  function onEnded(d: Deck) {
    if (!sounding(d)) return;
    if (fading && d === fading.out) {
      d.el.pause();
      return;
    }
    // The fade never started (the next file wasn't ready): cut straight to it.
    if (d.role === 'primary' && playing) crossfade(0);
  }

  function finishFade() {
    if (!fading) return;
    const { out, inc } = fading;
    fading = null;
    retire(out);
    inc.role = 'primary';
    if (shown !== inc.track) {
      shown = inc.track;
      changed();
    }
  }

  /** Roll from the playing deck into `track` over `dur` seconds (0 = cut). */
  function crossfade(dur: number, track: StationTrack | null = upcoming) {
    if (!track || !ctx) return;
    let out = primary();
    let inc: Deck;
    if (fading) {
      // Interrupted mid-fade: the louder deck fades out, the quieter one takes the new track.
      const [a, b] = decks;
      out = levelOf(a) >= levelOf(b) ? a : b;
      ramp(out, levelOf(out), 0);
      inc = other(out);
      fading = null;
    } else inc = out ? other(out) : decks[0];
    for (const d of decks) if (d !== out && d !== inc) retire(d);
    if (inc.track !== track) assign(inc, track, 'incoming');
    else inc.role = 'incoming';
    inc.el.currentTime = 0;
    if (out) out.role = 'outgoing';
    upcoming = station ? pick(station) : null;
    if (!out || dur <= 0) {
      if (out) retire(out);
      inc.role = 'primary';
      ramp(inc, 1, 0);
      shown = track;
      if (playing) play(inc);
      changed();
      return;
    }
    fading = { inc, out, dur, midDone: false, scheduled: false };
    if (playing) play(inc);
    changed();
  }

  /** Inside the first tap: build the graph and unlock both decks for later starts. */
  function setup() {
    // iOS: play like media, so the ring/silent switch doesn't mute Web Audio (Safari 17+).
    const session = (typeof navigator !== 'undefined' ? (navigator as Navigator & { audioSession?: { type: string } }).audioSession : undefined);
    if (session) {
      try {
        session.type = 'playback';
      } catch {
        /* not settable here */
      }
    }
    ctx = audio.context();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const silence = silentWav();
    decks = [0, 1].map(() => {
      const el = audio.element();
      el.preload = 'none';
      el.crossOrigin = 'anonymous';
      const gain = ctx!.createGain();
      gain.gain.value = 0;
      ctx!.createMediaElementSource(el).connect(gain);
      gain.connect(master!);
      const d: Deck = { el, gain, track: null, role: 'idle', rest: 0, fade: null, ready: Promise.resolve(false), abort: null, blob: null, heard: false, waitForEnd: false };
      el.addEventListener('timeupdate', () => onTime(d));
      el.addEventListener('playing', () => onPlaying(d));
      el.addEventListener('ended', () => onEnded(d));
      el.addEventListener('error', () => onError(d));
      el.src = silence;
      void el.play().then(() => { if (d.role === 'idle') el.pause(); }, () => undefined);
      return d;
    });
  }

  if (import.meta.env.DEV) Object.assign(globalThis, { __radioDecks: () => decks.map((d) => ({ el: d.el, role: d.role, track: d.track?.id, gain: d.gain.gain.value })) });

  function resume() {
    clearTimeout(pauseTimer);
    void ctx!.resume();
    const p = primary();
    if (!p) {
      // First play: the track already chosen and shown.
      if (upcoming) crossfade(0, upcoming);
    } else {
      play(p);
      if (fading) play(fading.out);
    }
    // The ramp starts when sound does: right away if the file is here, else once it arrives.
    const cur = primary();
    if (cur && cur.heard) rampMaster(1, PAUSE_RAMP_S);
    else rampOnSound = true;
    changed();
  }

  function pause() {
    rampOnSound = false;
    rampMaster(0, PAUSE_RAMP_S);
    clearTimeout(pauseTimer);
    // Then stop the elements and the clock together, so a crossfade in flight freezes with them.
    pauseTimer = setTimeout(() => {
      if (playing) return;
      decks.forEach((d) => d.el.pause());
      void ctx?.suspend();
    }, PAUSE_RAMP_S * 1000 + 30);
    changed();
  }

  function mediaSession() {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
    if (!ms || !shown || !ctx) return;
    if (typeof MediaMetadata !== 'undefined' && ms.metadata?.title !== shown.title)
      ms.metadata = new MediaMetadata({
        title: shown.title,
        artist: shown.artist,
        album: station?.name ?? '',
        artwork: [{ src: o.resolve(shown.cover.large), sizes: '512x512', type: 'image/webp' }],
      });
    const state = playing ? 'playing' : 'paused';
    if (ms.playbackState !== state) ms.playbackState = state;
  }

  const radio: Radio = {
    ready,
    get loaded() { return loaded; },
    get playing() { return playing; },
    get station() { return station; },
    get track() { return shown; },
    get buffering() {
      if (!playing) return false;
      const p = primary();
      return !p || !p.heard;
    },
    get elapsedS() {
      const d = decks.find((x) => x.track && x.track === shown && x.role !== 'idle');
      return d ? d.el.currentTime : 0;
    },
    toggle() {
      if (unavailable) return;
      // Play works before stations.json arrives: the tap still creates the AudioContext (it must
      // happen inside the gesture), the button shows the spinner, and the first track starts
      // as soon as the list loads.
      if (!ctx) {
        setup();
        const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined;
        ms?.setActionHandler?.('play', () => radio.playing || radio.toggle());
        ms?.setActionHandler?.('pause', () => radio.playing && radio.toggle());
        ms?.setActionHandler?.('nexttrack', () => radio.next());
      }
      playing = !playing;
      if (playing) resume();
      else pause();
    },
    next() {
      if (!loaded || !station) return;
      if (!ctx) {
        shown = upcoming = pick(station);
        prefetchUpcoming();
        changed();
        return;
      }
      crossfade(playing ? SKIP_FADE_S : 0);
    },
    switchStation(dir) {
      if (!loaded || !station) return;
      const i = stations.indexOf(station);
      radio.selectStation(stations[(i + dir + stations.length) % stations.length].id);
    },
    selectStation(id) {
      const selected = stations.find((item) => item.id === id);
      if (!loaded || !selected || selected === station) return;
      station = selected;
      try {
        o.storage?.setItem(STATION_KEY, station.id);
      } catch {
        /* private mode: this visit only */
      }
      const first = pick(station); // a random track, and the shuffle knows it played
      if (!ctx) {
        shown = upcoming = first;
        prefetchUpcoming();
        changed();
        return;
      }
      crossfade(playing ? SKIP_FADE_S : 0, first);
    },
    onChange(fn) {
      listeners.push(fn);
    },
  };
  return radio;
}
