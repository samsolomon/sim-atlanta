/**
 * The app's shared chrome, the same over Map and City, all in one glass (frosted blur with a
 * Liquid Glass-style lit edge):
 *   - status widget (top right): place, temperature + weather icon, condition, date and time;
 *     tap for live data and truth tiers
 *   - menu button (top left): Key, Models, About
 *   - view switch (bottom centre): Map · City
 *   - first-run hint, and keyboard movement (WASD / arrows, +/−, M / C)
 * Plain DOM; no framework. The host page supplies where the camera is looking and the live
 * feed state; the shell owns weather and neighbourhood lookups.
 */
import './tokens.css';
import './shell.css';
import type { AtmosphereOverride } from '../core/atmosphere';
import { fetchLive, type Weather } from '../core/weather';
import { loadPlaces, placeAt } from '../core/places';
import { sunPosition } from '../vignette/time';
import { ICON, weatherIcon } from './icons';
import { createKeyboard, typing } from './keyboard';
import { createKeyDialog } from './key';
import { liveDetails, type LiveState, type View } from './status';

export type { LiveState, View } from './status';

export interface ShellOptions {
  view: View;
  onView(v: View): void;
  /** lon/lat at the centre of the current view. */
  center(): [number, number] | null;
  /** Move by a screen offset in CSS px (content moves opposite to the camera). */
  pan(dxPx: number, dyPx: number): void;
  zoom(dir: 1 | -1): void;
  rotate?(degrees: number): void;
  live(): LiveState;
  /** Called when fresh weather arrives (or is lost). */
  onWeather?(w: Weather | null): void;
  onSceneConditions(settings: AtmosphereOverride): void;
  /** Camera bearing in degrees clockwise from north (A2c compass). */
  bearing?(): number;
  /** Turn the camera to face north (A2c compass and N). */
  north?(): void;
  /** Back to the real present at 1× (A2c "Now"). */
  onNow?(): void;
  /** The shell moved the shared clock (A2c Time & weather): refresh what depends on it. */
  onClock?(): void;
  /** Horizontal scale at the view centre, for "Metro Atlanta" past neighbourhood zoom. */
  metresPerPixel?(): number | null;
  /** The sky on screen (observed, typical or previewed), to name an illustrative condition. */
  sky?(): { cloud: number; rain: number; fog: number; snow: number } | null;
}

/** What the host page drives; both shells return it. */
export interface ShellApi {
  tick(now: Date): void;
  advanceMovement(t: number): void;
  weather(): Weather | null;
  /** Light or dark glass, following the sky (dark from about dusk). */
  setTheme(theme: 'light' | 'dark'): void;
  setView(v: View): void;
  /** One short status note (the area note); truth-tier words are never clipped. */
  setNote(text: string | null): void;
}

const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' });
const longDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'long', month: 'long', day: 'numeric' });

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}

export function createShell(o: ShellOptions): ShellApi {
  let view = o.view;

  // ---- status widget (top right), menu button (top left), view switch (bottom centre) -----
  const statusBtn = el('button', { type: 'button', class: 'widget glass', 'aria-expanded': 'false', 'aria-controls': 'status-more', 'aria-label': 'Atlanta right now' });
  const place = el('span', { class: 'w-place' }, 'Atlanta');
  const dot = el('span', { class: 'status-dot', 'aria-hidden': 'true' });
  const temp = el('span', { class: 'w-temp' });
  const wxIcon = el('span', { class: 'ic w-icon', 'aria-hidden': 'true' });
  const cond = el('span', { class: 'w-cond' });
  const time = el('span', { class: 'w-time' });
  const top = el('span', { class: 'w-top' });
  top.append(place, dot);
  const mid = el('span', { class: 'w-mid' });
  mid.append(temp, wxIcon);
  const low = el('span', { class: 'w-low' });
  low.append(cond, time);
  statusBtn.append(top, mid, low);

  const menuBtn = el('button', { type: 'button', class: 'menu-btn glass', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'menu' }, `<span class="ic">${ICON.list}</span>`);

  const sw = el('div', { class: 'switch glass', role: 'group', 'aria-label': 'View' });
  const btns = (['map', 'city'] as View[]).map((v) => {
    const b = el(
      'button',
      { type: 'button', 'data-view': v, title: v === 'map' ? 'Map (M)' : 'City (C)' },
      `<span class="ic">${v === 'map' ? ICON.mapTrifold : ICON.buildings}</span><span>${v === 'map' ? 'Map' : 'City'}</span>`,
    );
    b.addEventListener('click', () => setView(v, true));
    return b;
  });
  sw.append(...btns);
  const chrome = [statusBtn, menuBtn, sw];

  // ---- drop-downs ----------------------------------------------------------
  const menu = el('nav', { class: 'drop drop-l glass', id: 'menu', hidden: '', 'aria-label': 'Site' });
  menu.innerHTML = `
    <p class="drop-title">Sim Atlanta</p>
    <button type="button" data-act="key">Key</button>
    <a href="/models">Models</a>
    <a href="/about">About &amp; credits</a>`;
  const more = el('section', { class: 'drop drop-r glass', id: 'status-more', hidden: '', 'aria-label': 'Scene preview and live data' });
  const conditions = el('fieldset', { class: 'scene-conditions' });
  conditions.innerHTML = `
    <legend>Scene preview</legend>
    <label>Lighting<select name="lighting">
      <option>Follow clock</option><option>Daylight</option><option>Night</option>
    </select></label>
    <label>Weather<select name="weather">
      <option>Automatic</option><option>Clear</option><option>Overcast</option>
      <option>Rain</option><option>Fog</option><option>Snow</option>
    </select></label>`;
  const lighting = conditions.querySelector<HTMLSelectElement>('[name=lighting]')!;
  const sky = conditions.querySelector<HTMLSelectElement>('[name=weather]')!;
  const weatherSettings: Record<string, AtmosphereOverride> = {
    Clear: { cloud: 0, rain: 0, fog: 0, snow: 0 },
    Overcast: { cloud: 1, rain: 0, fog: 0, snow: 0 },
    Rain: { cloud: 1, rain: .75, fog: .25, snow: 0 },
    Fog: { cloud: .7, rain: 0, fog: .9, snow: 0 },
    Snow: { cloud: 1, rain: 0, fog: .35, snow: .8 },
  };
  conditions.addEventListener('change', () => {
    const settings = { ...weatherSettings[sky.value] };
    if (lighting.value === 'Daylight') settings.hour = 12;
    if (lighting.value === 'Night') settings.hour = 0;
    o.onSceneConditions(settings);
    lastTick = -Infinity;
    tick(now);
  });
  const details = el('div');
  more.append(conditions, details);
  const note = el('p', { class: 'bar-note glass', hidden: '' });
  function placeNote() {
    if (note.hidden) return;
    note.classList.remove('below');
    note.style.top = '';
    const left = menuBtn.getBoundingClientRect(), right = statusBtn.getBoundingClientRect();
    const room = Math.min(innerWidth / 2 - left.right, right.left - innerWidth / 2) - 10;
    if (note.getBoundingClientRect().width / 2 <= room) return;
    note.classList.add('below');
    note.style.top = `${Math.max(left.bottom, right.bottom) + 8}px`;
  }
  addEventListener('resize', placeNote);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(placeNote).observe(statusBtn);
  document.fonts?.ready.then(placeNote);

  const closeDrops = (except?: HTMLElement) => {
    if (except !== menu) {
      menu.hidden = true;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
    if (except !== more) {
      more.hidden = true;
      statusBtn.setAttribute('aria-expanded', 'false');
    }
  };
  menuBtn.addEventListener('click', () => {
    const open = menu.hidden;
    closeDrops(menu);
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
    if (open) (menu.querySelector('button, a') as HTMLElement)?.focus();
  });
  statusBtn.addEventListener('click', () => {
    const open = more.hidden;
    closeDrops(more);
    more.hidden = !open;
    statusBtn.setAttribute('aria-expanded', String(open));
    if (open) { renderMore(); lighting.focus(); }
  });
  menu.querySelector('[data-act=key]')!.addEventListener('click', () => {
    closeDrops();
    key.showModal();
  });
  document.addEventListener('click', (e) => {
    const t = e.target as Node;
    if (!chrome.some((c) => c.contains(t)) && !menu.contains(t) && !more.contains(t)) closeDrops();
  });

  let weather: Weather | null = null;
  let weatherAt = 0;
  async function pollWeather() {
    const w = await fetchLive();
    weather = w; // null → the bar simply omits weather; never a stale or guessed condition
    weatherAt = w ? Date.now() : 0;
    lastTick = 0;
    o.onWeather?.(w);
  }
  void pollWeather();
  setInterval(() => void pollWeather(), 10 * 60_000);
  void loadPlaces();

  let now = new Date();
  function renderMore() {
    details.innerHTML = `<p class="drop-title">${place.textContent} · ${longDate.format(now)}</p>${liveDetails(o.live(), view, weather, weatherAt)}`;
  }

  let lastTick = 0;
  function tick(t0: Date) {
    now = t0;
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
    // Weather is live data: show it only when the clock is the real present.
    const wxNow = s.realTime ? weather : null;
    const preview = [lighting.selectedIndex ? lighting.value : '', sky.selectedIndex ? sky.value : ''].filter(Boolean);
    if (wxNow && !preview.length) {
      const night = sunPosition(now).elevation < -2;
      const svg = weatherIcon(wxNow, night);
      if (wxIcon.dataset.svg !== svg) {
        wxIcon.innerHTML = svg;
        wxIcon.dataset.svg = svg;
      }
      wxIcon.hidden = false;
      temp.textContent = wxNow.tempF != null ? `${Math.round(wxNow.tempF)}°` : '';
      cond.textContent = cap(wxNow.label);
    } else {
      wxIcon.hidden = true;
      temp.textContent = '';
      cond.textContent = preview.length ? 'Preview · ' + preview.join(' · ') : '';
    }
    time.textContent = `${dateFmt.format(now)} · ${timeFmt.format(now)}${s.realTime ? '' : ' · timetable'}`;
    statusBtn.setAttribute('aria-label', `Scene preview and live data, ${cond.textContent}, ${place.textContent}, ${wxNow ? `${wxNow.label}, ` : ''}${dateFmt.format(now)} ${timeFmt.format(now)}${liveOn ? ', live' : ''}`);
    if (!more.hidden) renderMore();
  }
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

  // ---- key (legend) ----------------------------------------------------------------------
  const key = createKeyDialog();

  // ---- view switch state -----------------------------------------------------------------
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
    const touch = matchMedia('(pointer: coarse)').matches;
    hint = el('p', { class: 'hint glass', role: 'note' }, touch ? 'Drag to look around · pinch to zoom' : 'Drag to look around · WASD to move');
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

  document.body.append(...chrome, menu, more, note, key, ...(hint ? [hint] : []));

  // ---- keyboard ---------------------------------------------------------------------------
  const { advanceMovement } = createKeyboard({
    pan: o.pan, zoom: o.zoom, rotate: o.rotate,
    view: (v) => setView(v, true),
    escape() {
      if (!more.hidden) {
        closeDrops();
        statusBtn.focus();
        return true;
      }
      if (!typing(document.activeElement) && !key.open) closeDrops();
      return false;
    },
    blocked: () => key.open,
  });

  return {
    tick,
    advanceMovement,
    weather: () => weather,
    /** Light or dark glass, following the sky (dark from about dusk). */
    setTheme(theme: 'light' | 'dark') {
      if (document.documentElement.dataset.theme !== theme) document.documentElement.dataset.theme = theme;
    },
    setView: (v: View) => setView(v),
    /** The area note: centred on the top row when it fits between the menu button and the
     * status card, otherwise below them and wrapped. Truth-tier words are never clipped. */
    setNote(text: string | null) {
      note.hidden = !text;
      note.textContent = text ?? '';
      placeNote();
    },
  };
}
