/**
 * The radio (A2c step 8): off until tapped, because browsers block autoplay. While it plays, the
 * app bar shows the track title. The music comes later (about 10 calm, SimCity-style original
 * tracks, ~30 minutes); until then the playlist is a stub. An entry without `src` plays silently
 * for its length, so the controls, titles and Media Session behave as they will with real audio.
 * Static files only: no per-visitor server work.
 */
export interface Track { title: string; durationS: number; src?: string }

/** Placeholder titles and lengths; add `src` (a static file under /audio/) as tracks arrive. */
export const PLAYLIST: Track[] = [
  { title: 'Peachtree Drift', durationS: 192 },
  { title: 'Five Points at Noon', durationS: 176 },
  { title: 'Gulch Lights', durationS: 205 },
  { title: 'Sweet Auburn Evening', durationS: 188 },
  { title: 'Connector Hum', durationS: 169 },
  { title: 'Castleberry Afternoon', durationS: 214 },
  { title: 'Midtown Window', durationS: 181 },
  { title: 'Underground Rain', durationS: 197 },
  { title: 'Piedmont Shade', durationS: 172 },
  { title: 'Last Train North', durationS: 210 },
];

export interface Radio {
  readonly playing: boolean;
  readonly track: Track;
  readonly index: number;
  readonly elapsedS: number;
  volume: number;
  previous(): void;
  toggle(): void;
  next(): void;
  onChange(fn: () => void): void;
}

export function createRadio(list: Track[] = PLAYLIST): Radio {
  let i = 0;
  let playing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let startedAt = 0;
  let elapsed = 0; // seconds into a silent stub track
  const audio = new Audio();
  audio.preload = 'none';
  const listeners: (() => void)[] = [];
  const changed = () => {
    listeners.forEach((fn) => fn());
    const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
    // The OS only hears about real audio; a silent stub never claims to be playing there.
    if (ms && typeof MediaMetadata !== 'undefined' && list[i].src) {
      ms.metadata = new MediaMetadata({ title: list[i].title, artist: 'Sim Atlanta radio' });
      ms.playbackState = playing ? 'playing' : 'paused';
    }
  };
  const step = (direction: number) => {
    clearTimeout(timer);
    audio.pause();
    i = (i + direction + list.length) % list.length;
    elapsed = 0;
    if (playing) start();
    else changed();
  };
  const advance = () => step(1);
  audio.addEventListener('ended', advance);
  function start() {
    const t = list[i];
    clearTimeout(timer);
    if (t.src) {
      if (!audio.src.endsWith(t.src)) audio.src = t.src;
      void audio.play().catch((e: unknown) => {
        // A pause or track change aborts the pending play: that's not a failure.
        if (e instanceof DOMException && e.name === 'AbortError') return;
        playing = false;
        changed();
      });
    } else {
      startedAt = performance.now();
      timer = setTimeout(advance, (t.durationS - elapsed) * 1000);
    }
    changed();
  }
  function stop() {
    clearTimeout(timer);
    if (!list[i].src) elapsed += (performance.now() - startedAt) / 1000;
    audio.pause();
    changed();
  }
  const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
  ms?.setActionHandler?.('play', () => radio.playing || radio.toggle());
  ms?.setActionHandler?.('pause', () => radio.playing && radio.toggle());
  ms?.setActionHandler?.('nexttrack', () => radio.next());
  const radio: Radio = {
    get playing() {
      return playing;
    },
    get track() {
      return list[i];
    },
    toggle() {
      playing = !playing;
      if (playing) start();
      else stop();
    },
    get index() { return i; },
    get elapsedS() {
      return list[i].src ? audio.currentTime : Math.min(list[i].durationS, elapsed + (playing ? (performance.now() - startedAt) / 1000 : 0));
    },
    get volume() { return audio.volume; },
    set volume(value: number) { audio.volume = Math.max(0, Math.min(1, value)); },
    next: advance,
    previous: () => step(-1),
    onChange(fn) {
      listeners.push(fn);
    },
  };
  return radio;
}
