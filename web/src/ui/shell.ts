/**
 * The app's shared chrome, the same over Map and City:
 *   - status card (top right): place · weather · date and time, tap for live data and truth tiers
 *   - menu (top left): Models, About, Key
 *   - view switch (bottom centre): Map · City
 *   - first-run hint, and keyboard movement (WASD / arrows, +/−, M / C)
 * Plain DOM; no framework. The host page supplies where the camera is looking and the live
 * feed state; the shell owns weather and neighbourhood lookups.
 */
import './tokens.css';
import './shell.css';
import { fetchLive, type Weather } from '../core/weather';
import { loadPlaces, placeAt } from '../core/places';

export type View = 'map' | 'city';

export interface LiveState {
  realTime: boolean; // the clock shows the real present (live data may apply)
  rail: 'live' | 'connecting' | 'down';
  trains: number;
  buses: number | null; // null: bus feed unavailable or not shown
}

export interface ShellOptions {
  view: View;
  onView(v: View): void;
  /** lon/lat at the centre of the current view. */
  center(): [number, number] | null;
  /** Move by a screen offset in CSS px (content moves opposite to the camera). */
  pan(dxPx: number, dyPx: number): void;
  zoom(dir: 1 | -1): void;
  rotate?(dir: 1 | -1): void;
  live(): LiveState;
  /** Optional note under the status card (e.g. "City view covers downtown for now"). */
}

const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}

const typing = (t: EventTarget | null) =>
  t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || (t instanceof HTMLElement && t.isContentEditable);

export function createShell(o: ShellOptions) {
  let view = o.view;

  // ---- status card ----------------------------------------------------------------------
  const status = el('section', { class: 'status glass', 'aria-label': 'Atlanta right now' });
  const statusBtn = el('button', { type: 'button', class: 'status-main', 'aria-expanded': 'false', 'aria-controls': 'status-more' });
  const place = el('span', { class: 'status-place' }, 'Atlanta');
  const dot = el('span', { class: 'status-dot', 'aria-hidden': 'true' });
  const line = el('span', { class: 'status-line' });
  statusBtn.append(el('span', { class: 'status-top' }), line);
  statusBtn.firstElementChild!.append(place, dot);
  const more = el('div', { class: 'status-more', id: 'status-more', hidden: '' });
  const note = el('p', { class: 'status-note', hidden: '' });
  status.append(statusBtn, more, note);
  statusBtn.addEventListener('click', () => {
    const open = more.hidden;
    more.hidden = !open;
    statusBtn.setAttribute('aria-expanded', String(open));
    if (open) renderMore();
  });

  let weather: Weather | null = null;
  let weatherAt = 0;
  async function pollWeather() {
    const w = await fetchLive();
    weather = w; // null → the card simply omits weather; never a stale or guessed condition
    weatherAt = w ? Date.now() : 0;
  }
  void pollWeather();
  setInterval(() => void pollWeather(), 10 * 60_000);
  void loadPlaces();

  function renderMore() {
    const s = o.live();
    const rail = !s.realTime
      ? '<b>Trains</b> timetable (the clock isn’t set to now)'
      : s.rail === 'live'
        ? `<b>Trains</b> ${s.trains} MARTA trains, live positions`
        : s.rail === 'connecting'
          ? '<b>Trains</b> connecting to MARTA…'
          : '<b>Trains</b> MARTA live feed unavailable, showing the timetable';
    const bus = !s.realTime ? '<b>Buses</b> shown only at the present time' : s.buses == null ? '<b>Buses</b> live feed unavailable' : `<b>Buses</b> ${s.buses} MARTA buses, live positions`;
    const wx = weather
      ? `<b>Weather</b> Open-Meteo, ${Math.max(0, Math.round((Date.now() - weatherAt) / 60000))} min ago`
      : '<b>Weather</b> unavailable right now';
    more.innerHTML = `<ul><li>${rail}</li><li>${bus}</li><li><b>Freight</b> where trains run is reported; when is illustrative</li><li>${wx}</li></ul>`;
  }

  let lastTick = 0;
  function tick(now: Date) {
    const t = performance.now();
    if (t - lastTick < 500) return;
    lastTick = t;
    const c = o.center();
    const name = c ? placeAt(c[0], c[1]) : null;
    if (name) place.textContent = name;
    const s = o.live();
    const liveOn = s.realTime && s.rail === 'live';
    dot.className = `status-dot ${liveOn ? 'on' : ''}`;
    dot.title = liveOn ? 'Live' : s.realTime ? 'Timetable' : 'Timetable · not live';
    const parts: string[] = [];
    if (weather) parts.push(`${cap(weather.label)}${weather.tempF != null ? ` ${Math.round(weather.tempF)}°` : ''}`);
    parts.push(dateFmt.format(now), timeFmt.format(now));
    if (!s.realTime) parts.push('Timetable · not live');
    line.textContent = parts.join(' · ');
    if (!more.hidden) renderMore();
  }
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---- menu ------------------------------------------------------------------------------
  const menuBtn = el('button', { type: 'button', class: 'menu-btn glass', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'menu' }, '<span></span><span></span><span></span>');
  const menu = el('nav', { class: 'menu glass', id: 'menu', hidden: '', 'aria-label': 'Site' });
  menu.innerHTML = `
    <p class="menu-title">A little model of Atlanta</p>
    <button type="button" data-act="key">Key</button>
    <a href="/models">Models</a>
    <a href="/about">About &amp; credits</a>`;
  const setMenu = (open: boolean) => {
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) (menu.querySelector('button, a') as HTMLElement)?.focus();
  };
  menuBtn.addEventListener('click', () => setMenu(menu.hidden));
  menu.querySelector('[data-act=key]')!.addEventListener('click', () => {
    setMenu(false);
    key.showModal();
  });
  document.addEventListener('click', (e) => {
    if (!menu.hidden && !menu.contains(e.target as Node) && !menuBtn.contains(e.target as Node)) setMenu(false);
  });

  // ---- key (legend) ----------------------------------------------------------------------
  const key = el('dialog', { class: 'key glass', 'aria-label': 'Key' });
  key.innerHTML = `
    <form method="dialog"><button class="key-close" aria-label="Close">×</button></form>
    <h2>Key</h2>
    <p class="key-lede">Colour shows the kind of service, not the operator.</p>
    <ul class="legend">
      <li><span class="sw sw-city"></span><b>City rail</b> subway, light rail, streetcar</li>
      <li><span class="sw-bus"></span><b>Bus</b> live position</li>
      <li><span class="sw sw-inter"></span><b>Intercity</b> Amtrak</li>
      <li><span class="sw sw-rep"></span><b>Freight</b> thicker = more trains a day (reported)</li>
      <li><span class="sw sw-inf"></span><b>Inferred</b> traffic from nearby track</li>
      <li><span class="tr tr-live"></span><b>Live</b> train <span class="tr tr-sched"></span><b>Scheduled</b> (timetable)</li>
    </ul>
    <p class="key-foot">Live means MARTA reported it in the last few minutes. Scheduled is where the timetable says a train should be. Freight movements are illustrative.</p>`;
  key.addEventListener('click', (e) => e.target === key && key.close());

  // ---- view switch ------------------------------------------------------------------------
  const sw = el('div', { class: 'switch glass', role: 'group', 'aria-label': 'View' });
  const btns = (['map', 'city'] as View[]).map((v) => {
    const b = el('button', { type: 'button', 'data-view': v, title: v === 'map' ? 'Map (M)' : 'City (C)' }, v === 'map' ? 'Map' : 'City');
    b.addEventListener('click', () => setView(v, true));
    return b;
  });
  sw.append(...btns);
  function setView(v: View, fromUser = false) {
    btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    if (v === view && !fromUser) return;
    const changed = v !== view;
    view = v;
    if (changed) o.onView(v);
  }
  btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));

  // ---- first-run hint ---------------------------------------------------------------------
  let hint: HTMLElement | null = null;
  const seen = (() => {
    try {
      return localStorage.getItem('hint-seen') === '1';
    } catch {
      return false;
    }
  })();
  if (!seen) {
    hint = el('p', { class: 'hint glass', role: 'note' }, 'Drag to look around · WASD to move');
    const dismiss = () => {
      if (!hint) return;
      hint.classList.add('gone');
      const h = hint;
      hint = null;
      setTimeout(() => h.remove(), 600);
      try {
        localStorage.setItem('hint-seen', '1');
      } catch {
        /* private mode: the hint just shows again next time */
      }
    };
    for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, dismiss, { once: true, passive: true });
  }

  document.body.append(status, menuBtn, menu, key, sw, ...(hint ? [hint] : []));

  // ---- keyboard ---------------------------------------------------------------------------
  const held = new Set<string>();
  const MOVE: Record<string, [number, number]> = {
    w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1],
    a: [1, 0], arrowleft: [1, 0], d: [-1, 0], arrowright: [-1, 0],
  };
  let raf = 0;
  let lastT = 0;
  const step = (t: number) => {
    const dt = Math.min(50, Math.max(0, t - lastT));
    lastT = t;
    let dx = 0;
    let dy = 0;
    for (const k of held) {
      const m = MOVE[k];
      if (m) {
        dx += m[0];
        dy += m[1];
      }
    }
    if (dx || dy) {
      const v = 0.6 * dt; // ~600 px/s
      o.pan(dx * v, dy * v);
      raf = requestAnimationFrame(step);
    } else {
      raf = 0;
      lastT = 0;
    }
  };
  addEventListener('keydown', (e) => {
    if (typing(e.target) || e.metaKey || e.ctrlKey || e.altKey || key.open) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') return setMenu(false);
    if (MOVE[k]) {
      e.preventDefault();
      held.add(k);
      if (!raf) {
        lastT = performance.now() - 16; // the first frame moves too, so a tap always nudges
        raf = requestAnimationFrame(step);
      }
    } else if (k === '+' || k === '=') o.zoom(1);
    else if (k === '-' || k === '_') o.zoom(-1);
    else if (k === 'm') setView('map', true);
    else if (k === 'c') setView('city', true);
    else if ((k === 'q' || k === 'e') && o.rotate) o.rotate(k === 'q' ? -1 : 1);
  });
  addEventListener('keyup', (e) => held.delete(e.key.toLowerCase()));
  addEventListener('blur', () => held.clear());

  return {
    tick,
    setView: (v: View) => setView(v),
    /** A one-line note under the status card; null hides it. */
    setNote(text: string | null) {
      note.hidden = !text;
      note.textContent = text ?? '';
    },
  };
}
