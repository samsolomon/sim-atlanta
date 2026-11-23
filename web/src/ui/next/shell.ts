/**
 * The A2c shell (behind ?ui=next until it replaces ui/shell.ts). Four fixed glass places,
 * 8 px from the edges, the same in every view:
 *   - top-left: the subject card (place, time and weather, confidence line), notices under it
 *   - bottom-left: the app bar (menu, Map · City · Models)
 *   - right: the detail panel (#card, positioned by next.css)
 *   - bottom-right: the camera column (compass, zoom); on phones it moves top-right
 * Plus the fading OpenStreetMap credit line and a first-visit hint. See docs/ui-controls-brief.md.
 */
import './next.css';
import type { AtmosphereOverride } from '../../core/atmosphere';
import { fetchLive, type Weather } from '../../core/weather';
import { loadPlaces, placeAt } from '../../core/places';
import { sunPosition } from '../../vignette/time';
import { ICON, weatherIcon } from '../icons';
import { createKeyboard } from '../keyboard';
import { createKeyDialog } from '../key';
import { confidence, confidenceWords, hintText, liveDetails, type View } from '../status';
import type { ShellApi, ShellOptions } from '../shell';

const TZ = 'America/New_York';
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const dayTimeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'short', day: 'numeric' });
const longDate = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'long', day: 'numeric' });
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

const SVG = (body: string, box = 24) =>
  `<svg viewBox="0 0 ${box} ${box}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const CARET = SVG('<path d="M6 9l6 6 6-6"/>');
const COMPASS = `<svg viewBox="0 0 32 32" aria-hidden="true" class="a2-needle"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="1.2"/><g><path d="M16 5l3.2 11h-6.4z" class="a2-north"/><path d="M16 27l3.2-11h-6.4z" fill="currentColor" opacity=".55"/></g></svg>`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}

export function createShellNext(o: ShellOptions): ShellApi {
  let view = o.view;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');

  // ---- subject card (top-left) ------------------------------------------------------------
  const subject = el('section', { class: 'a2-subject a2-g', 'aria-label': 'Place and time' });
  const open = el('button', { type: 'button', class: 'a2-subject-open', 'aria-expanded': 'false', 'aria-controls': 'a2-status' });
  const place = el('span', { class: 'a2-place' }, 'Atlanta');
  const line = el('span', { class: 'a2-line' });
  const time = el('span', { class: 'a2-time' });
  const timeText = el('span');
  time.append(timeText, el('span', { class: 'a2-caret', 'aria-hidden': 'true' }, CARET));
  const wx = el('span', { class: 'a2-wx' });
  const wxIcon = el('span', { class: 'a2-wx-icon', 'aria-hidden': 'true' });
  const wxText = el('span');
  wx.append(wxIcon, wxText);
  line.append(time, wx);
  open.append(place, line);
  const tier = el('span', { class: 'a2-tier' });
  const tierDot = el('span', { class: 'a2-dot', 'aria-hidden': 'true' });
  const tierText = el('span');
  const tierDate = el('span', { class: 'a2-tier-date' });
  const nowBtn = el('button', { type: 'button', class: 'a2-link' }, 'Now');
  nowBtn.setAttribute('aria-label', 'Back to now');
  tier.append(tierDot, tierText, tierDate, nowBtn);
  subject.append(open, tier);

  // Scene preview and per-feed tiers, under the card (Time & weather replaces it in step 3).
  const status = el('section', { class: 'a2-status a2-g a2-long', id: 'a2-status', hidden: '', 'aria-label': 'Scene preview and live data' });
  const conditions = el('fieldset', { class: 'a2-conditions' });
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
  const details = el('div', { class: 'a2-details' });
  status.append(conditions, details);

  // One notice at a time, 8 px under the subject card. Tier words wrap; they never truncate.
  const notice = el('p', { class: 'a2-notice a2-g', hidden: '', role: 'status' });
  const subjectBottom = () => document.documentElement.style.setProperty('--a2-subject-bottom', `${Math.round(subject.getBoundingClientRect().bottom)}px`);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(subjectBottom).observe(subject);
  addEventListener('resize', subjectBottom);

  // ---- app bar (bottom-left) and menu -----------------------------------------------------
  const bar = el('nav', { class: 'a2-appbar a2-g', 'aria-label': 'App' });
  const menuBtn = el('button', { type: 'button', class: 'a2-ib', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'a2-menu' }, `<span class="a2-ic">${ICON.list}</span>`);
  const seg = el('div', { class: 'a2-seg', role: 'group', 'aria-label': 'View' });
  const viewBtns = (['map', 'city'] as View[]).map((v) => {
    const b = el('button', { type: 'button', class: 'a2-vs', 'data-view': v, title: v === 'map' ? 'Map (M)' : 'City (C)' }, v === 'map' ? 'Map' : 'City');
    b.addEventListener('click', () => setView(v, true));
    return b;
  });
  // The Model lab joins as the third view in step 7; until then this opens its page.
  const models = el('a', { class: 'a2-vs', href: '/models' }, 'Models');
  seg.append(...viewBtns, models);
  bar.append(menuBtn, el('span', { class: 'a2-vsep', 'aria-hidden': 'true' }), seg);

  const menu = el('section', { class: 'a2-menu a2-g a2-long', id: 'a2-menu', hidden: '', 'aria-label': 'Menu' });
  menu.innerHTML = `
    <button type="button" class="a2-row" data-act="key"><span><b>Key</b><small>What the colours and labels mean</small></span><span class="a2-chev" aria-hidden="true">›</span></button>
    <button type="button" class="a2-row" data-act="city-info"><span><b>About this City view</b><small>What is illustrative in the miniature</small></span><span class="a2-chev" aria-hidden="true">›</span></button>
    <a class="a2-row" href="/about"><span><b>About &amp; credits</b><small>How it works and where the data comes from</small></span><span class="a2-chev" aria-hidden="true">›</span></a>
    <p class="a2-fine">Unofficial. Rail data: MARTA, Amtrak GTFS; FRA; BTS NARN. Map © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · OpenMapTiles · OpenFreeMap.</p>`;
  const cityInfoRow = menu.querySelector<HTMLButtonElement>('[data-act=city-info]')!;

  // ---- camera column (bottom-right) -------------------------------------------------------
  const cam = el('div', { class: 'a2-camera a2-g', role: 'group', 'aria-label': 'Camera' });
  const compass = el('button', { type: 'button', class: 'a2-ib a2-compass', 'aria-label': 'Face north', title: 'Face north (N)' }, COMPASS);
  const zoomIn = el('button', { type: 'button', class: 'a2-ib a2-zoom', 'aria-label': 'Zoom in', title: 'Zoom in (+)' }, `<span class="a2-ic">${ICON.plus}</span>`);
  const zoomOut = el('button', { type: 'button', class: 'a2-ib a2-zoom', 'aria-label': 'Zoom out', title: 'Zoom out (−)' }, `<span class="a2-ic">${ICON.minus}</span>`);
  const camSep = el('div', { class: 'a2-sep a2-compass-sep', 'aria-hidden': 'true' });
  cam.append(compass, camSep, zoomIn, zoomOut);
  compass.addEventListener('click', () => o.north?.());
  zoomIn.addEventListener('click', () => o.zoom(1));
  zoomOut.addEventListener('click', () => o.zoom(-1));
  const needle = compass.querySelector<SVGGElement>('g')!;
  let shownBearing = NaN;
  const watchBearing = () => {
    const b = o.bearing?.() ?? 0;
    const rotated = Math.abs(((b + 540) % 360) - 180) > 0.5;
    // On Map the compass appears only once the map is rotated; City always shows it.
    const show = view === 'city' || rotated;
    if (compass.hidden === show) {
      compass.hidden = !show;
      camSep.hidden = !show;
      cam.classList.toggle('a2-no-compass', !show);
    }
    if (Math.abs(b - shownBearing) > 0.1) {
      shownBearing = b;
      needle.setAttribute('transform', `rotate(${(-b).toFixed(1)} 16 16)`);
      compass.setAttribute('aria-label', `Face north (now facing ${Math.round(((b % 360) + 360) % 360)}°)`);
    }
    requestAnimationFrame(watchBearing);
  };
  requestAnimationFrame(watchBearing);

  // ---- credit line (OSMF attribution guidelines) ------------------------------------------
  // Shown on load; fades on the first pan or zoom, or after 5 s. Then it lives in the menu.
  const credit = el('p', { class: 'a2-credit' }, '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · OpenMapTiles');
  const fadeCredit = () => {
    if (credit.classList.contains('a2-gone')) return;
    credit.classList.add('a2-gone');
    setTimeout(() => credit.remove(), reducedMotion.matches ? 0 : 700);
  };
  // The 5 s count starts once the scene is on screen, not while City's loading plate shows.
  const armCredit = () => setTimeout(() => (document.getElementById('city-loading')?.hidden === false ? armCredit() : fadeCredit()), 5000);
  armCredit();
  const scene = () => [document.getElementById('map'), document.getElementById('view3d-canvas')];
  for (const ev of ['pointerdown', 'wheel'] as const)
    addEventListener(ev, (e) => scene().some((s) => s?.contains(e.target as Node)) && fadeCredit(), { passive: true });

  // ---- first-visit hint ---------------------------------------------------------------------
  let hint: HTMLElement | null = null;
  const seen = (() => {
    try {
      return localStorage.getItem('hint-seen') === '1';
    } catch {
      return false;
    }
  })();
  if (!seen) {
    hint = el('p', { class: 'a2-hint a2-g', role: 'note' }, hintText(view, coarse.matches));
    const dismiss = () => {
      if (!hint) return;
      hint.classList.add('a2-gone');
      const h = hint;
      hint = null;
      setTimeout(() => h.remove(), reducedMotion.matches ? 0 : 600);
      try {
        localStorage.setItem('hint-seen', '1');
      } catch {
        /* private mode: the hint just shows again next time */
      }
    };
    for (const ev of ['pointerdown', 'keydown', 'wheel']) addEventListener(ev, dismiss, { once: true, passive: true });
  }

  const key = createKeyDialog();
  key.classList.add('a2-key');
  document.body.append(subject, status, notice, bar, menu, cam, credit, key, ...(hint ? [hint] : []));
  subjectBottom();

  // ---- pop-overs ---------------------------------------------------------------------------
  const pops: [HTMLElement, HTMLButtonElement][] = [[menu, menuBtn], [status, open]];
  const closePops = (except?: HTMLElement) => {
    for (const [p, b] of pops)
      if (p !== except && !p.hidden) {
        p.hidden = true;
        b.setAttribute('aria-expanded', 'false');
      }
  };
  const toggle = (p: HTMLElement, b: HTMLButtonElement, focus: () => void) => {
    const show = p.hidden;
    closePops(p);
    p.hidden = !show;
    b.setAttribute('aria-expanded', String(show));
    if (show) focus();
  };
  menuBtn.addEventListener('click', () => toggle(menu, menuBtn, () => menu.querySelector<HTMLElement>('.a2-row')?.focus()));
  open.addEventListener('click', () => toggle(status, open, () => { renderStatus(); lighting.focus(); }));
  menu.querySelector('[data-act=key]')!.addEventListener('click', () => {
    closePops();
    key.showModal();
  });
  cityInfoRow.addEventListener('click', () => {
    closePops();
    document.getElementById('city-info')?.showPopover?.();
  });
  document.addEventListener('click', (e) => {
    const t = e.target as Node;
    if (![subject, status, bar, menu].some((c) => c.contains(t))) closePops();
  });
  nowBtn.addEventListener('click', () => {
    o.onNow?.();
    lastTick = -Infinity;
    tick(new Date());
  });

  // ---- weather and place --------------------------------------------------------------------
  let weather: Weather | null = null;
  let weatherAt = 0;
  async function pollWeather() {
    const w = await fetchLive();
    weather = w; // null → the card omits weather; never a stale or guessed condition
    weatherAt = w ? Date.now() : 0;
    lastTick = -Infinity;
    o.onWeather?.(w);
  }
  void pollWeather();
  setInterval(() => void pollWeather(), 10 * 60_000);
  void loadPlaces();

  let now = new Date();
  function renderStatus() {
    details.innerHTML = `<p class="a2-title">${place.textContent} · ${longDate.format(now)}</p>${liveDetails(o.live(), view, weather, weatherAt)}`;
  }

  let lastTick = 0;
  let areaNote: string | null = null;
  function tick(t0: Date) {
    now = t0;
    const t = performance.now();
    if (t - lastTick < 500) return;
    lastTick = t;
    const c = o.center();
    const name = c ? placeAt(c[0], c[1]) : null;
    if (name && place.textContent !== name) place.textContent = name;
    const s = o.live();
    const preview = [lighting.selectedIndex ? lighting.value : '', sky.selectedIndex ? sky.value : ''].filter(Boolean);
    // Weather is live data: show it only when the clock is the real present.
    const wxNow = s.realTime ? weather : null;
    const conf = confidence(s, !!wxNow, preview.length > 0);
    if (wxNow && !preview.length) {
      const svg = weatherIcon(wxNow, sunPosition(now).elevation < -2);
      if (wxIcon.dataset.svg !== svg) {
        wxIcon.innerHTML = svg;
        wxIcon.dataset.svg = svg;
      }
      wxText.textContent = `${wxNow.tempF != null ? `${Math.round(wxNow.tempF)}° ` : ''}${cap(wxNow.label)}`;
      wx.hidden = false;
    } else if (preview.length) {
      wxIcon.innerHTML = '';
      delete wxIcon.dataset.svg;
      wxText.textContent = `Preview · ${preview.join(' · ')}`;
      wx.hidden = false;
    } else wx.hidden = true;
    timeText.textContent = (conf.shifted ? dayTimeFmt : timeFmt).format(now);
    tierDot.className = `a2-dot a2-dot-${conf.tier}`;
    tierText.textContent = confidenceWords(conf).join(' · ');
    tierDate.textContent = conf.shifted ? '' : dateFmt.format(now);
    tierDate.hidden = conf.shifted;
    nowBtn.hidden = !conf.shifted;
    open.setAttribute('aria-label', `${place.textContent}, ${timeText.textContent}${wx.hidden ? '' : `, ${wxText.textContent}`}, ${tierText.textContent}. Scene preview and live data`);
    // Feed status is a notice too, but the host's area note wins the single slot.
    const feedNote = s.realTime && s.rail === 'down' ? 'Live feed unavailable · showing the timetable' : null;
    showNotice(areaNote ?? feedNote);
    if (!status.hidden) renderStatus();
  }
  function showNotice(text: string | null) {
    if (notice.textContent !== (text ?? '')) notice.textContent = text ?? '';
    notice.hidden = !text;
  }

  // ---- views --------------------------------------------------------------------------------
  function setView(v: View, fromUser = false) {
    viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
    cityInfoRow.hidden = v !== 'city';
    if (hint) hint.textContent = hintText(v, coarse.matches);
    if (v === view && !fromUser) return;
    const changed = v !== view;
    view = v;
    if (changed) o.onView(v);
  }
  viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  cityInfoRow.hidden = view !== 'city';

  // ---- keyboard -----------------------------------------------------------------------------
  const { advanceMovement } = createKeyboard({
    pan: o.pan, zoom: o.zoom, rotate: o.rotate, north: o.north,
    view: (v) => setView(v, true),
    escape() {
      for (const [p, b] of pops)
        if (!p.hidden) {
          closePops();
          b.focus();
          return true;
        }
      return false;
    },
    blocked: () => key.open,
  });

  return {
    tick,
    advanceMovement,
    weather: () => weather,
    setTheme(theme) {
      if (document.documentElement.dataset.theme !== theme) document.documentElement.dataset.theme = theme;
    },
    setView: (v) => setView(v),
    setNote(text) {
      areaNote = text;
      showNotice(text);
      if (!text) {
        lastTick = -Infinity;
        tick(now);
      }
    },
  };
}
