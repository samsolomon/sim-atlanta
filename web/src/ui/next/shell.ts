/**
 * The A2c shell (behind ?ui=next until it replaces ui/shell.ts). Four fixed glass places,
 * 8 px from the edges, the same in every view:
 *   - top-left: the subject card (place, time and weather, confidence line), notices under it
 *   - bottom-left: the app bar (menu, Map · City · Models)
 *   - right: the detail panel (#card, positioned by next.css)
 *   - bottom-right: the camera column (compass, zoom); on phones it moves top-right
 * Plus the OpenStreetMap credit line (persistent on Map, fading in City) and a first-visit hint. See docs/ui-controls-brief.md.
 */
import './next.css';
import type { AtmosphereOverride } from '../../core/atmosphere';
import { fetchLive, type Weather } from '../../core/weather';
import { findPlaces, loadPlaces, placeAt } from '../../core/places';
import { sunPosition } from '../../vignette/time';
import { ICON, weatherIcon } from '../icons';
import { createKeyboard } from '../keyboard';
import { createRadio, PLAYLIST, type Radio } from './radio';
import { BYLINE, createDetailPanel } from './panel';
import { atlantaDate, confidence, confidenceWords, sameTimeOnDate, hintText, placeLabel, SLIDER_MIN, sliderValue, skyLabel, type View } from '../status';
import { clock } from '../../core/clock';
import { shareUrl } from '../share';
import type { ShellApi, ShellOptions } from '../shell-api';

const TZ = 'America/New_York';
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const dayTimeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'short', day: 'numeric' });
const shortDate = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);

const SVG = (body: string, box = 24) =>
  `<svg viewBox="0 0 ${box} ${box}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const CARET = SVG('<path d="M6 9l6 6 6-6"/>');
// The ring stays put; the needle is its own SVG on its own compositor layer, turned by a CSS
// transform, so a turning camera never repaints or re-rasters the compass.
const COMPASS = `<span class="a2-needle" aria-hidden="true"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="1.2"/></svg><svg viewBox="0 0 32 32" class="a2-needle-turn"><text x="16" y="10" text-anchor="middle" font-size="7" font-weight="700" fill="currentColor">N</text><path d="M16 11l3.2 11h-6.4z" class="a2-north"/><path d="M16 27l3.2-11h-6.4z" fill="currentColor" opacity=".55"/></svg></span>`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}

/** Set text only when it differs, so a periodic refresh doesn't invalidate style for nothing. */
function setText(el: HTMLElement, text: string) {
  if (el.textContent !== text) el.textContent = text;
}

export function createShellNext(o: ShellOptions): ShellApi {
  let view = o.view;
  let mapMode: View = new URL(location.href).searchParams.get('view') === 'models' ? 'city' : view;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(pointer: coarse)');

  // ---- subject card (top-left) ------------------------------------------------------------
  const subject = el('section', { class: 'a2-subject a2-g', 'aria-label': 'Place and time' });
  const open = el('button', { type: 'button', class: 'a2-subject-open', 'aria-expanded': 'false', 'aria-controls': 'a2-time' });
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
  open.append(el('span', { class: 'a2-eyebrow' }, 'Atlanta'), place, line);
  const tier = el('span', { class: 'a2-tier' });
  const tierDot = el('span', { class: 'a2-dot', 'aria-hidden': 'true' });
  const tierText = el('span');
  const tierDate = el('span', { class: 'a2-tier-date' });
  const nowBtn = el('button', { type: 'button', class: 'a2-link' }, 'Now');
  nowBtn.setAttribute('aria-label', 'Back to now');
  tier.append(tierDot, tierText, tierDate, nowBtn);
  subject.append(open, tier);

  // ---- Time & weather: inside the card on desktop, a bottom sheet on phones ------------------
  const panel = el('section', { class: 'a2-timepanel', id: 'a2-time', hidden: '', 'aria-label': 'Time and weather' });
  panel.innerHTML = `
    <div class="a2-sheet-head"><span class="a2-grab" aria-hidden="true"></span><h2>Time &amp; weather</h2>
      <button type="button" class="a2-close" aria-label="Close">${SVG('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>
    <div class="a2-h a2-time-head"><span class="a2-h-label">Time</span>
      <label class="a2-date">${SVG('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>')}<span class="a2-date-text"></span><span class="a2-date-time"></span>
        <input type="date" class="a2-date-input" aria-label="Date"></label>
      <span class="a2-anchor-phone"></span></div>
    <div class="a2-slider"><span class="a2-now-tick" aria-hidden="true"></span>
      <input type="range" class="a2-range" min="${-SLIDER_MIN}" max="${SLIDER_MIN}" step="5" value="0" aria-label="Time, 12 hours either side"></div>
    <div class="a2-scale" aria-hidden="true"><span>−12 h</span><span class="a2-anchor"></span><span>+12 h</span></div>
    <p class="a2-h">Speed</p>
    <div class="a2-seg2" role="group" aria-label="Speed">
      <button type="button" data-speed="0" aria-label="Pause">${SVG('<path d="M8 5v14M16 5v14"/>')}</button>
      <button type="button" data-speed="1">1×</button><button type="button" data-speed="30">30×</button>
      <button type="button" class="a2-speed-custom" aria-pressed="true" hidden></button></div>
    <p class="a2-h">Weather</p>
    <div class="a2-seg2" role="group" aria-label="Weather">${['Auto', 'Clear', 'Rain', 'Fog', 'Storm'].map((w) => `<button type="button" data-wx="${w}">${w}</button>`).join('')}</div>
    <p class="a2-caption">Auto shows the observed weather at the present time and an illustrative sky otherwise.</p>
    <button type="button" class="a2-back">${SVG('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>')}Back to now</button>`;
  const range = panel.querySelector<HTMLInputElement>('.a2-range')!;
  const dateInput = panel.querySelector<HTMLInputElement>('.a2-date-input')!;
  const dateText = panel.querySelector<HTMLElement>('.a2-date-text')!;
  const anchorText = panel.querySelector<HTMLElement>('.a2-anchor')!;
  const anchorPhone = panel.querySelector<HTMLElement>('.a2-anchor-phone')!;
  const speedBtns = [...panel.querySelectorAll<HTMLButtonElement>('[data-speed]')];
  const wxBtns = [...panel.querySelectorAll<HTMLButtonElement>('[data-wx]')];
  const weatherSettings: Record<string, AtmosphereOverride> = {
    Auto: {},
    Clear: { cloud: 0, rain: 0, fog: 0, snow: 0 },
    Rain: { cloud: 1, rain: .75, fog: .25, snow: 0 },
    Fog: { cloud: .7, rain: 0, fog: .9, snow: 0 },
    Storm: { cloud: 1, rain: 1, fog: .4, snow: 0 },
  };
  let weatherChoice = 'Auto';
  // The slider spans ±12 h around an anchor: the real present, or the moment a link or the date
  // picker chose. Moving it shifts the clock, which then reads Timetable.
  let anchorLive = clock.isRealTime();
  let anchorMs = clock.now().getTime();
  const anchor = () => (anchorLive ? Date.now() : anchorMs);
  let dragging = false;
  const setTime = (ms: number) => {
    clock.baseSim = ms;
    clock.baseReal = performance.now();
    clock.offsetMin = 0;
    clock.pinned = true;
    clockChanged();
  };
  const clockChanged = () => {
    o.onClock?.();
    lastTick = -Infinity;
    tick(clock.now());
  };
  range.addEventListener('input', () => {
    const v = Number(range.value);
    // Back at Now on a live anchor at 1×: that is the present again, not a pinned copy of it.
    if (v === 0 && anchorLive && clock.speed === 1) backToNow(false);
    else setTime(anchor() + v * 60_000);
  });
  // Phones: once a drag actually moves, the sheet shrinks to the time and the slider, held so
  // the slider stays under the finger. A plain tap doesn't collapse it.
  let pressed = false;
  const endDrag = () => {
    pressed = dragging = false;
    if (!panel.classList.contains('a2-dragging')) return;
    panel.classList.remove('a2-dragging');
    panel.style.transform = '';
  };
  range.addEventListener('pointerdown', (e) => {
    pressed = true;
    try {
      range.setPointerCapture(e.pointerId);
    } catch {
      /* synthetic pointers have no capture */
    }
  });
  range.addEventListener('input', () => {
    if (!pressed) return;
    dragging = true;
    if (!phone.matches || panel.classList.contains('a2-dragging')) return;
    const before = range.getBoundingClientRect().top;
    panel.classList.add('a2-dragging');
    panel.style.transform = `translateY(${before - range.getBoundingClientRect().top}px)`;
  });
  for (const ev of ['pointerup', 'pointercancel'] as const) addEventListener(ev, endDrag);
  range.addEventListener('lostpointercapture', endDrag);
  range.addEventListener('change', endDrag);
  range.addEventListener('blur', endDrag);
  dateInput.addEventListener('change', () => {
    if (!dateInput.value) return;
    const ms = sameTimeOnDate(clock.now().getTime(), dateInput.value);
    anchorLive = false;
    anchorMs = ms;
    setTime(ms);
  });
  panel.querySelector('.a2-date')!.addEventListener('click', (e) => {
    if (e.target === dateInput) return;
    e.preventDefault();
    try {
      dateInput.showPicker();
    } catch {
      dateInput.focus();
    }
  });
  for (const b of speedBtns)
    b.addEventListener('click', () => {
      const sp = Number(b.dataset.speed);
      if (sp === clock.speed) return;
      clock.rebase();
      if (sp !== 1 || !clock.isRealTime()) clock.pinned = true;
      clock.speed = sp;
      clockChanged();
    });
  for (const b of wxBtns)
    b.addEventListener('click', () => {
      weatherChoice = b.dataset.wx!;
      o.onSceneConditions({ ...weatherSettings[weatherChoice] });
      clockChanged();
    });
  function backToNow(resetWeather = true) {
    anchorLive = true;
    o.onNow?.();
    if (resetWeather && weatherChoice !== 'Auto') {
      weatherChoice = 'Auto';
      o.onSceneConditions({});
    }
    clockChanged();
  }
  panel.querySelector('.a2-back')!.addEventListener('click', () => backToNow());
  panel.querySelector('.a2-close')!.addEventListener('click', () => {
    closePops();
    open.focus();
  });
  // Desktop: the card grows to hold the panel. Phones: the panel is its own bottom sheet (glass
  // with backdrop-filter is a containing block, so the sheet can't be fixed from inside the card).
  const phone = matchMedia('(max-width: 600px)');
  const placePanel = () => {
    if (phone.matches) {
      panel.classList.add('a2-g', 'a2-long');
      document.body.append(panel);
    } else {
      panel.classList.remove('a2-g', 'a2-long');
      subject.append(panel);
    }
  };
  phone.addEventListener('change', placePanel);
  placePanel();

  // One notice at a time, 8 px under the subject card. Tier words wrap; they never truncate.
  const notice = el('p', { class: 'a2-notice a2-g', hidden: '', role: 'status' });
  const subjectBottom = () => document.documentElement.style.setProperty('--a2-subject-bottom', `${Math.round(subject.getBoundingClientRect().bottom)}px`);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(subjectBottom).observe(subject);
  addEventListener('resize', subjectBottom);

  // ---- app bar (bottom-left) and menu -----------------------------------------------------
  const bar = el('nav', { class: 'a2-appbar a2-g', 'aria-label': 'App' });
  const menuBtn = el('button', { type: 'button', class: 'a2-ib', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'a2-menu' }, `<span class="a2-ic">${ICON.list}</span>`);
  const seg = el('div', { class: 'a2-seg', role: 'group', 'aria-label': 'View' });
  const LABEL: Record<View, string> = { map: 'Map', city: 'City', models: 'Models' };
  const viewBtns = (['map', 'models'] as View[]).map((v) => {
    const b = el('button', { type: 'button', class: 'a2-vs', 'data-view': v, title: v === 'models' ? 'Models' : `${LABEL[v]} (${LABEL[v][0]})` }, LABEL[v]);
    b.addEventListener('click', () => setView(v === 'map' ? mapMode : v, true));
    return b;
  });
  seg.append(...viewBtns);
  // ---- radio: off until tapped; while it plays, the track title shows beside it ----
  const NOTE = SVG('<path d="M9 18V6l11-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>');

  const radioBtn = el('button', { type: 'button', class: 'a2-ib a2-radio', 'aria-label': 'Radio', 'aria-expanded': 'false', 'aria-controls': 'a2-radio-player' }, NOTE);
  const radioPanel = el('section', { class: 'a2-dock-pop a2-g a2-player', id: 'a2-radio-player', hidden: '', 'aria-label': 'Radio' });
  const play = el('button', { type: 'button', class: 'a2-ib', 'aria-label': 'Play' });
  const next = el('button', { type: 'button', class: 'a2-ib', 'aria-label': 'Next track' }, SVG('<path d="M18 5v14M5 5l10 7-10 7z"/>'));
  const radioTitle = el('strong');
  const trackNote = el('span');
  const trackInfo = el('div', { class: 'a2-track-info' });
  trackInfo.append(radioTitle, trackNote);
  const progress = el('progress', { 'aria-label': 'Track progress' });
  radioPanel.append(trackInfo, play, next, progress);
  let radio: Radio | null = null;
  const showRadio = () => {
    if (!radio) return;
    radioTitle.textContent = radio.track.title;
    trackNote.textContent = radio.track.src ? `Track ${radio.index + 1} of ${PLAYLIST.length}` : 'No audio yet';
    play.innerHTML = SVG(radio.playing ? '<path d="M9 5v14M15 5v14"/>' : '<path d="m8 5 11 7-11 7z"/>');
    play.setAttribute('aria-label', radio.playing ? 'Pause' : 'Play');
    radioBtn.classList.toggle('a2-playing', radio.playing);
    const radioLabel = !radio.playing ? 'Radio' : radio.track.src ? 'Radio, playing' : 'Radio, playing preview · no audio yet';
    radioBtn.setAttribute('aria-label', radioLabel);
    radioBtn.title = radioLabel;
    progress.max = radio.track.durationS;
    progress.value = radio.elapsedS;
  };
  play.onclick = () => radio?.toggle();
  next.onclick = () => radio?.next();
  bar.append(menuBtn, el('span', { class: 'a2-vsep', 'aria-hidden': 'true' }), seg, el('span', { class: 'a2-vsep', 'aria-hidden': 'true' }), radioBtn);
  const searchBtn = el('button', { type: 'button', class: 'a2-ib a2-search-icon', 'aria-label': 'Search Atlanta' }, SVG('<circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/>'));
  const searchWrap = el('div', { class: 'a2-dock-field' });
  const search = el('input', { type: 'search', placeholder: 'Search Atlanta', 'aria-label': 'Search Atlanta' });
  const searchGlyph = el('span', { class: 'a2-search-glyph', 'aria-hidden': 'true' }, searchBtn.innerHTML);
  searchWrap.append(searchGlyph, search, el('kbd', {}, /Mac/i.test(navigator.platform) ? '⌘K' : 'Ctrl K'));
  bar.insertBefore(searchWrap, radioBtn);
  bar.insertBefore(searchBtn, radioBtn);
  const resultsPanel = el('section', { class: 'a2-dock-pop a2-results a2-g', hidden: '', 'aria-label': 'Search results' });
  const cancel = el('button', { type: 'button', class: 'a2-btn' }, 'Cancel');
  const results = el('div');
  resultsPanel.append(cancel, results);
  function placeSearch() {
    if (phone.matches) resultsPanel.prepend(search);
    else searchGlyph.after(search);
  }
  placeSearch();
  phone.addEventListener('change', placeSearch);
  function renderResults() {
    results.replaceChildren();
    for (const p of findPlaces(search.value)) {
      const row = el('button', { type: 'button', class: 'a2-mi' });
      row.textContent = p.name;
      row.onclick = () => {
        closePops();
        setView('map', true);
        o.goToPlace?.(p.lon, p.lat);
      };
      results.append(row);
    }
    if (!results.childElementCount) results.textContent = 'No matching places';
  }
  const menu = el('section', { class: 'a2-menu a2-g a2-long', id: 'a2-menu', hidden: '', 'aria-label': 'Menu' });
  // No title block (A2c-menu): rows, Graphics, then the byline and the map-data credit.
  const chev = `<span class="a2-chev">${SVG('<path d="M9 6l6 6-6 6"/>')}</span>`;
  menu.innerHTML = `
    <button type="button" class="a2-x a2-menu-close" aria-label="Close menu">${SVG('<path d="M6 6l12 12M18 6L6 18"/>')}</button>
    <div class="a2-menu-rows">
      <button type="button" class="a2-mi" data-act="key">${SVG('<circle cx="6" cy="7" r="2"/><circle cx="6" cy="17" r="2"/><path d="M11 7h9M11 17h9"/>')}<span>Key<small>What the colours and labels mean</small></span>${chev}</button>
      <button type="button" class="a2-mi" data-act="board" hidden>${SVG('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M9 5v14"/>')}<span>Show full board<small>Every City area, or retry one that failed</small></span>${chev}</button>
      <button type="button" class="a2-mi" data-act="about">${SVG('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>')}<span>About &amp; credits<small>How it works and where the data comes from</small></span>${chev}</button>
    </div>
    <div class="a2-sep"></div>
    <div class="a2-menu-gfx">
      <p class="a2-h" id="a2-gfx-label">Graphics</p>
      <div class="a2-seg2" role="group" aria-labelledby="a2-gfx-label">${['Auto', 'High', 'Low'].map((q) => `<button type="button" data-gfx="${q.toLowerCase()}">${q}</button>`).join('')}</div>
      <p class="a2-caption">Low draws at standard resolution with simpler shadows, fewer leaves and less rain. Good for older phones.</p>
    </div>
    <div class="a2-sep"></div>
    <div class="a2-menu-foot">
      <div class="a2-menu-by">${BYLINE}</div>
      <p class="a2-fine">Map data © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · OpenFreeMap · Overture · MARTA</p>
    </div>`;
  // Phones: the sheet covers the app bar's ×, so it carries its own close.
  menu.querySelector('.a2-menu-close')!.addEventListener('click', () => {
    closePops();
    menuBtn.focus();
  });
  const gfxBtns = [...menu.querySelectorAll<HTMLButtonElement>('[data-gfx]')];
  const showGraphics = () => {
    const g = o.graphics?.get() ?? 'auto';
    // Honest about Auto: after a slow-frame-rate step-down it reads "Auto (Low)".
    const auto = gfxBtns.find((b) => b.dataset.gfx === 'auto');
    if (auto) auto.textContent = o.graphics?.autoResolved?.() === 'low' ? 'Auto (Low)' : 'Auto';
    gfxBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gfx === g)));
  };
  gfxBtns.forEach((b) => b.addEventListener('click', () => {
    o.graphics?.set(b.dataset.gfx as 'auto' | 'high' | 'low');
    showGraphics();
  }));
  showGraphics();
  menu.querySelector('.a2-menu-gfx')!.toggleAttribute('hidden', !o.graphics);

  // ---- camera column (bottom-right) -------------------------------------------------------
  const cam = el('div', { class: 'a2-camera a2-g', role: 'group', 'aria-label': 'Camera' });
  const compass = el('button', { type: 'button', class: 'a2-ib a2-compass', 'aria-label': 'Face north', title: 'Face north (N)' }, COMPASS);
  const zoomIn = el('button', { type: 'button', class: 'a2-ib a2-zoom', 'aria-label': 'Zoom in', title: 'Zoom in (+)' }, `<span class="a2-ic">${ICON.plus}</span>`);
  const zoomOut = el('button', { type: 'button', class: 'a2-ib a2-zoom', 'aria-label': 'Zoom out', title: 'Zoom out (−)' }, `<span class="a2-ic">${ICON.minus}</span>`);
  const camSep = el('div', { class: 'a2-sep a2-compass-sep', 'aria-hidden': 'true' });
  const shareSep = el('div', { class: 'a2-sep a2-share-sep', 'aria-hidden': 'true' });
  const shareBtn = el('button', { type: 'button', class: 'a2-ib a2-share', 'aria-label': 'Share this view', 'aria-expanded': 'false', 'aria-controls': 'a2-share', title: 'Share this view' },
    SVG('<path d="M12 3v12"/><path d="M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'));
  const resetBtn = el('button', { type: 'button', class: 'a2-ib a2-reset', 'aria-label': 'Reset view', title: 'Reset view', hidden: '' },
    SVG('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>'));
  resetBtn.addEventListener('click', () => o.resetModelView?.());
  const threeD = el('button', { type: 'button', class: 'a2-ib a2-three-d', 'aria-label': '3D city', 'aria-pressed': String(view === 'city') }, '3D');
  const tilt = el('input', { type: 'range', class: 'a2-tilt', min: '0', max: '70', value: '0', 'aria-label': 'Camera tilt in degrees' });
  const areaPop = el('section', { class: 'a2-area-pop a2-g', hidden: '' });
  const take = el('button', { type: 'button', class: 'a2-btn' }, 'Take me there');
  areaPop.append(el('p', {}, '3D covers downtown and Midtown.'), take);
  const outside = () => view === 'map' && o.outsideCity?.();
  const showArea = () => { closePops(areaPop); areaPop.hidden = false; };
  take.onclick = () => { closePops(); o.centerCity?.(); setView('city', true); };
  threeD.onfocus = () => { if (outside()) showArea(); };
  threeD.onclick = () => { if (outside()) showArea(); else setView(view === 'city' ? 'map' : 'city', true); };
  tilt.addEventListener('input', () => {
    if (outside()) { tilt.value = '0'; showArea(); return; }
    const degrees = tilt.valueAsNumber;
    if (degrees >= 20) {
      o.setTilt?.(degrees);
      setView('city', true);
    } else {
      setView('map', true);
    }
  });
  const zoomGroup = el('div', { class: 'a2-camera-piece a2-g' });
  zoomGroup.append(zoomIn, zoomOut);
  const tiltGroup = el('div', { class: 'a2-camera-piece a2-g a2-tilt-group' });
  const angle = el('output', { class: 'a2-angle' });
  tilt.oninput = () => { angle.textContent = tilt.value + '°'; };
  tiltGroup.append(threeD, tilt, angle);
  compass.classList.add('a2-g');
  resetBtn.classList.add('a2-g');
  cam.classList.remove('a2-g');
  cam.append(compass, resetBtn, zoomGroup, tiltGroup);
  bar.append(shareBtn);

  // ---- share: live (no time) or freeze this moment (t=…&speed=0), camera in the link ----------
  const share = el('section', { class: 'a2-share-panel a2-g a2-long', id: 'a2-share', hidden: '', 'aria-label': 'Share this view' });
  share.innerHTML = `
    <div class="a2-panel-head"><h2>Share this view</h2><button type="button" class="a2-x" data-close aria-label="Close">${SVG('<path d="M6 6l12 12M18 6L6 18"/>')}</button></div>
    <p class="a2-share-lede"></p>
    <fieldset class="a2-share-modes"><legend class="a2-sr">Time in the link</legend>
      <label><input type="radio" name="a2-share-mode" value="live"><span><b>Live</b><small>Opens at whatever time it is for the viewer.</small></span></label>
      <label><input type="radio" name="a2-share-mode" value="freeze"><span><b>Freeze this moment</b><small class="a2-freeze-text"></small></span></label>
    </fieldset>
    <output class="a2-share-url" aria-label="Link"></output>
    <div class="a2-share-actions"><button type="button" class="a2-btn" data-copy>Copy link</button><button type="button" class="a2-btn" data-native hidden>Share…</button></div>`;
  const shareUrlOut = share.querySelector<HTMLOutputElement>('.a2-share-url')!;
  const modeInputs = [...share.querySelectorAll<HTMLInputElement>('input[name=a2-share-mode]')];
  const copyBtn = share.querySelector<HTMLButtonElement>('[data-copy]')!;
  const nativeBtn = share.querySelector<HTMLButtonElement>('[data-native]')!;
  nativeBtn.hidden = typeof navigator.share !== 'function';
  let shareMode: 'live' | 'freeze' = 'live';
  // The frozen moment is taken once, when the panel opens, so the label and the copied link agree.
  let frozenAt = clock.now();
  /** null while there is nothing to reopen yet (City still loading, or no renderer at all). */
  const currentLink = () => {
    const target = o.shareTarget?.();
    return target ? shareUrl(location.href, target, shareMode, frozenAt) : null;
  };
  const renderShare = () => {
    const target = o.shareTarget?.();
    share.querySelector('.a2-share-lede')!.textContent = !target ? 'This view is still loading.'
      : target.view === 'city' ? 'The link opens on this exact camera in City.'
      : target.view === 'models' ? 'The link opens this model in Models.' : 'The link opens on this exact view of the Map.';
    share.querySelector<HTMLElement>('.a2-share-modes')!.hidden = target?.view === 'models';
    share.querySelector('.a2-freeze-text')!.textContent =
      `${shortDate.format(frozenAt)} · ${timeFmt.format(frozenAt)}, paused. Trains from the timetable.`;
    modeInputs.forEach((i) => (i.checked = i.value === shareMode));
    const link = currentLink();
    if (shareUrlOut.textContent !== (link ?? '')) shareUrlOut.textContent = link ?? '';
    copyBtn.disabled = nativeBtn.disabled = !link;
  };
  modeInputs.forEach((i) => i.addEventListener('change', () => {
    shareMode = i.value as 'live' | 'freeze';
    renderShare();
  }));
  copyBtn.addEventListener('click', async () => {
    const link = currentLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      copyBtn.textContent = 'Copied';
    } catch {
      // No clipboard access (an insecure origin, say): select the link so it can be copied by hand.
      const r = document.createRange();
      r.selectNodeContents(shareUrlOut);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(r);
      copyBtn.textContent = 'Select and copy';
    }
    setTimeout(() => (copyBtn.textContent = 'Copy link'), 1800);
  });
  nativeBtn.addEventListener('click', () => {
    const link = currentLink();
    if (link) navigator.share?.({ title: document.title, url: link }).catch(() => { /* dismissed */ });
  });
  share.querySelector('[data-close]')!.addEventListener('click', () => {
    closePops();
    shareBtn.focus();
  });
  compass.addEventListener('click', () => o.north?.());
  zoomIn.addEventListener('click', () => o.zoom(1));
  zoomOut.addEventListener('click', () => o.zoom(-1));
  const needle = compass.querySelector<SVGSVGElement>('.a2-needle-turn')!;
  let shownBearing = NaN;
  let labelTimer = 0;
  const watchBearing = () => {
    const b = o.bearing?.() ?? 0;
    const tiltNow = String(view === 'city' ? Math.round(o.getTilt?.() ?? 55) : 0);
    if (tilt.value !== tiltNow && !tilt.matches(':active, :focus-visible')) tilt.value = tiltNow;
    const show = view !== 'models';
    if (compass.hidden === show) {
      compass.hidden = !show;
      camSep.hidden = !show;
      cam.classList.toggle('a2-no-compass', !show);
    }
    if (!Number.isFinite(shownBearing) || Math.abs(b - shownBearing) > 0.1) {
      shownBearing = b;
      needle.style.transform = `rotate(${(-b).toFixed(1)}deg)`;
      // Screen readers get the heading once the turn settles, not a label rewrite every frame.
      clearTimeout(labelTimer);
      labelTimer = window.setTimeout(() => compass.setAttribute('aria-label', `Face north (now facing ${Math.round(((shownBearing % 360) + 360) % 360)}°)`), 250);
    }
    requestAnimationFrame(watchBearing);
  };
  requestAnimationFrame(watchBearing);

  // ---- credit line (OSMF attribution guidelines) ------------------------------------------
  // Map keeps it on screen (Sam, 2026-11-23). City fades it on the first pan or zoom, or 5 s
  // after the scene shows; then the full credits live in the menu and About.
  const credit = el('p', { class: 'a2-credit' }, '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · <a href="https://openmaptiles.org/">OpenMapTiles</a>');
  let cityCreditDone = false;
  let creditTimer = 0;
  const showCredit = () => credit.classList.toggle('a2-gone', view === 'city' && cityCreditDone);
  const fadeCityCredit = () => {
    if (view !== 'city' || cityCreditDone) return;
    cityCreditDone = true;
    showCredit();
  };
  // The 5 s count starts once the scene is on screen, not while City's loading plate shows.
  const armCredit = () => {
    clearTimeout(creditTimer);
    creditTimer = window.setTimeout(() => (document.getElementById('city-loading')?.hidden === false ? armCredit() : fadeCityCredit()), 5000);
  };
  if (view === 'city') armCredit();
  const scene = () => [document.getElementById('map'), document.getElementById('view3d-canvas')];
  for (const ev of ['pointerdown', 'wheel'] as const)
    addEventListener(ev, (e) => scene().some((s) => s?.contains(e.target as Node)) && fadeCityCredit(), { passive: true });

  // ---- first-visit hint ---------------------------------------------------------------------
  let hint: HTMLElement | null = null;
  const seen = (() => {
    try {
      return localStorage.getItem('hint-seen') === '1';
    } catch {
      return false;
    }
  })();
  const hintWords = el('span');
  if (!seen) {
    hint = el('p', { class: 'a2-hint a2-g', role: 'note' });
    const gotIt = el('button', { type: 'button', class: 'a2-got-it' }, 'Got it');
    hintWords.textContent = hintText(view, coarse.matches);
    hint.append(hintWords, gotIt);
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
    gotIt.onclick = dismiss;
    for (const target of scene()) for (const ev of ['pointerdown', 'wheel']) target?.addEventListener(ev, dismiss, { once: true, passive: true, capture: true });
  }

  const panelHost = createDetailPanel({ allStops: () => o.allStops?.() ?? null, share: () => shareBtn.click() });
  document.body.append(subject, notice, bar, menu, cam, share, radioPanel, resultsPanel, areaPop, credit, panelHost.host, ...(hint ? [hint] : []));
  subjectBottom();

  // ---- pop-overs ---------------------------------------------------------------------------
  const pops: [HTMLElement, HTMLButtonElement][] = [[menu, menuBtn], [panel, open], [share, shareBtn], [radioPanel, radioBtn], [resultsPanel, searchBtn], [areaPop, threeD]];
  const closePops = (except?: HTMLElement) => {
    for (const [p, b] of pops)
      if (p !== except && !p.hidden) {
        p.hidden = true;
        b.setAttribute('aria-expanded', 'false');
        if (p === panel) subject.classList.remove('a2-open');
        if (p === menu) menuIcon(false);
      }
  };
  // The menu button shows × while the menu is open (A2c-menu).
  const menuIcon = (open: boolean) => {
    menuBtn.innerHTML = open ? `<span class="a2-ic a2-ic-x">${SVG('<path d="M6 6l12 12M18 6L6 18"/>')}</span>` : `<span class="a2-ic">${ICON.list}</span>`;
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
  };
  const toggle = (p: HTMLElement, b: HTMLButtonElement, focus: () => void) => {
    const show = p.hidden;
    closePops(p);
    p.hidden = !show;
    b.setAttribute('aria-expanded', String(show));
    if (p === panel) subject.classList.toggle('a2-open', show);
    if (p === menu) menuIcon(show);
    if (show) focus();
  };
  const startSearch = () => {
    closePops(resultsPanel);
    if (view === 'models') { o.searchModels?.(); return; }
    resultsPanel.hidden = false;
    renderResults();
    search.focus();
  };
  searchBtn.onclick = startSearch;
  search.addEventListener('focus', startSearch);
  search.addEventListener('click', startSearch);
  search.addEventListener('input', startSearch);
  cancel.onclick = () => { closePops(); searchBtn.focus(); };
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); startSearch(); }
  });
  radioBtn.onclick = () => toggle(radioPanel, radioBtn, () => {
    if (!radio) {
      radio = createRadio();
      radio.onChange(showRadio);
    }
    showRadio();
    play.focus();
  });
  menuBtn.addEventListener('click', () => showGraphics());
  menuBtn.addEventListener('click', () => toggle(menu, menuBtn, () => menu.querySelector<HTMLElement>('.a2-mi')?.focus()));
  shareBtn.addEventListener('click', () => toggle(share, shareBtn, () => {
    // A shifted or paused clock most likely means this moment is the point of the link.
    shareMode = clock.isRealTime() ? 'live' : 'freeze';
    frozenAt = clock.now();
    renderShare();
    copyBtn.focus();
  }));
  open.addEventListener('click', () => toggle(panel, open, () => {
    lastTick = -Infinity;
    tick(clock.now());
    (phone.matches ? panel.querySelector<HTMLElement>('.a2-close') : range)?.focus();
  }));
  menu.querySelector('[data-act=key]')!.addEventListener('click', () => {
    closePops();
    panelHost.show('key');
  });
  // City's own retry control (it lives in #city-info): offered in the menu while City has one.
  const boardRow = menu.querySelector<HTMLButtonElement>('[data-act=board]')!;
  const cityBoardButton = () => document.querySelector<HTMLButtonElement>('#city-info button');
  menuBtn.addEventListener('click', () => {
    const b = cityBoardButton();
    boardRow.hidden = view !== 'city' || !b;
    // City names it by state ("Show full board", "Frame the full board").
    if (b) boardRow.querySelector('span:not(.a2-chev)')!.firstChild!.textContent = b.textContent;
  });
  boardRow.addEventListener('click', () => {
    closePops();
    cityBoardButton()?.click();
  });
  menu.querySelector('[data-act=about]')!.addEventListener('click', () => {
    closePops();
    panelHost.show('about');
  });
  document.addEventListener('click', (e) => {
    const path = e.composedPath();
    if (!radioPanel.hidden && !path.includes(radioPanel) && !path.includes(radioBtn)) closePops();
    if (![subject, bar, cam, ...pops.map(([p]) => p)].some((c) => path.includes(c))) closePops();
  });
  nowBtn.addEventListener('click', () => backToNow());

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

  let lastTick = 0;
  let areaNote: string | null = null;
  function tick(t0: Date) {
    now = t0;
    const t = performance.now();
    if (t - lastTick < 500) return;
    lastTick = t;
    if (radio && !radioPanel.hidden && progress.value !== radio.elapsedS) progress.value = radio.elapsedS;
    const c = o.center();
    const mpp = o.metresPerPixel?.() ?? null;
    threeD.classList.toggle('a2-outside', !!outside());
    const name = outside() ? 'Metro Atlanta' : placeLabel(c ? placeAt(c[0], c[1]) : null, mpp == null ? null : mpp * innerWidth);
    if (name && place.textContent !== name) place.textContent = name;
    const s = o.live();
    const preview = weatherChoice !== 'Auto';
    // Weather is live data: show it only when the clock is the real present.
    const wxNow = s.realTime && !preview ? weather : null;
    const loadingNote = o.loading?.() ?? null;
    const conf = confidence(s, !!wxNow, preview, !!loadingNote);
    const night = sunPosition(now).elevation < -2;
    let svg: string;
    if (wxNow) {
      svg = weatherIcon(wxNow, night);
      setText(wxText, `${wxNow.tempF != null ? `${Math.round(wxNow.tempF)}° ` : ''}${cap(wxNow.label)}`);
    } else if (s.realTime && !preview) {
      // At the present with no observation yet (or the fetch failed): show no condition at all,
      // never a guessed one in the observed-weather slot.
      svg = '';
      setText(wxText, '');
    } else {
      // A shifted clock or a chosen sky is a scene setting: its icon only, no words, so it never
      // reads as a reported condition (#231).
      const sk = skyLabel(o.sky?.() ?? { cloud: 0, rain: 0, fog: 0, snow: 0 });
      svg = weatherIcon({ kind: sk.kind, label: sk.snow ? 'snow' : sk.label, cloud: 0, rain: 0, fog: 0, live: false }, night);
      // At the present, a picked sky says so in words, so it can't pass for the observed one.
      setText(wxText, s.realTime && preview ? `Chosen: ${sk.label}` : '');
      if (wx.title !== `Scene sky: ${sk.label.toLowerCase()}`) wx.title = `Scene sky: ${sk.label.toLowerCase()}`;
    }
    if (wx.hidden !== !svg) wx.hidden = !svg;
    if (wxText.textContent && wx.hasAttribute('title')) wx.removeAttribute('title');
    if (wxIcon.dataset.svg !== svg) {
      wxIcon.innerHTML = svg;
      wxIcon.dataset.svg = svg;
    }
    // Write only what changed: this runs twice a second, and each DOM write re-styles the card.
    setText(timeText, timeFmt.format(now));
    const dotClass = `a2-dot a2-dot-${conf.tier}`;
    if (tierDot.className !== dotClass) tierDot.className = dotClass;
    setText(tierText, confidenceWords(conf).join(' · '));
    tier.classList.toggle('a2-tier-quiet', !tierText.textContent);
    setText(tierDate, dateFmt.format(now));
    if (tierDate.hidden !== !conf.shifted) tierDate.hidden = !conf.shifted;
    if (nowBtn.hidden !== !conf.shifted) nowBtn.hidden = !conf.shifted;
    const label = `${place.textContent}, ${timeText.textContent}${wxText.textContent ? `, ${wxText.textContent}` : ''}, ${tierText.textContent || 'loading'}. Time and weather`;
    if (open.getAttribute('aria-label') !== label) open.setAttribute('aria-label', label);
    // Feed status is a notice too, but the host's area note wins the single slot.
    const feedNote = s.realTime && s.rail === 'down' ? 'Live feed unavailable · showing the timetable' : null;
    showNotice(loadingNote ?? areaNote ?? feedNote);
    if (!panel.hidden) renderPanel(s);
    // The camera can move under an open share panel: keep the shown link the one Copy sends.
    if (!share.hidden) renderShare();
  }

  function renderPanel(s: ReturnType<ShellOptions['live']>) {
    const sim = now.getTime();
    // A clock run far past the slider's reach re-anchors on the moment it shows.
    if (Math.abs(sim - anchor()) > SLIDER_MIN * 60_000) {
      anchorLive = false;
      anchorMs = sim;
    }
    const v = sliderValue(sim, anchor());
    const stepped = Math.round(v / 5) * 5; // the range snaps to its 5-minute step
    if (!dragging && Number(range.value) !== stepped) range.value = String(stepped);
    const pct = ((Number(range.value) + SLIDER_MIN) / (2 * SLIDER_MIN)) * 100;
    range.style.setProperty('--a2-from', `${Math.min(50, pct)}%`);
    range.style.setProperty('--a2-to', `${Math.max(50, pct)}%`);
    range.setAttribute('aria-valuetext', `${dayTimeFmt.format(now)}${v === 0 ? '' : `, ${v > 0 ? '+' : '−'}${fmtSpan(Math.abs(v))} from the middle`}`);
    const anchorLabel = anchorLive ? `Now · ${timeFmt.format(Date.now())}` : `${shortDate.format(anchorMs)} · ${timeFmt.format(anchorMs)}`;
    anchorText.textContent = anchorLabel;
    // Phones show the slider's middle beside the current time; when they match it would just repeat it.
    anchorPhone.textContent = anchorLabel === `${shortDate.format(now)} · ${timeFmt.format(now)}` ? '' : anchorLabel;
    dateText.textContent = shortDate.format(now);
    panel.querySelector('.a2-date-time')?.replaceChildren(timeFmt.format(now));
    // Never rewrite the date while someone is picking or typing one.
    const iso = atlantaDate(sim);
    if (document.activeElement !== dateInput && dateInput.value !== iso) dateInput.value = iso;
    speedBtns.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === clock.speed)));
    // A link can carry another speed (?speed=600): show it as the pressed segment.
    const custom = panel.querySelector<HTMLButtonElement>('.a2-speed-custom')!;
    custom.hidden = [0, 1, 30].includes(clock.speed);
    custom.textContent = `${clock.speed}×`;
    wxBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wx === weatherChoice)));
    const back = panel.querySelector<HTMLButtonElement>('.a2-back')!;
    back.disabled = s.realTime && weatherChoice === 'Auto';
  }
  const fmtSpan = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

  function showNotice(text: string | null) {
    if (notice.textContent !== (text ?? '')) notice.textContent = text ?? '';
    if (notice.hidden !== !text) notice.hidden = !text;
  }

  // ---- views --------------------------------------------------------------------------------
  function setView(v: View, fromUser = false) {
    closePops();
    search.placeholder = v === 'models' ? 'Search models' : 'Search Atlanta';
    search.setAttribute('aria-label', search.placeholder);
    searchBtn.setAttribute('aria-label', search.placeholder);
    if (v !== 'models') mapMode = v;
    threeD.setAttribute('aria-pressed', String(v === 'city'));
    viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === (v === 'city' ? 'map' : v))));
    if (hint) hintWords.textContent = hintText(v, coarse.matches);
    // Models has its own card and panels; the scene chrome (place card, notes, credit) steps aside.
    document.body.classList.toggle('a2-in-models', v === 'models');
    resetBtn.hidden = v !== 'models';
    if (v === view && !fromUser) return;
    const changed = v !== view;
    view = v;
    if (changed) {
      if (v === 'city' && !cityCreditDone) armCredit();
      showCredit();
      o.onView(v);
    }
  }
  viewBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === (view === 'city' ? 'map' : view))));
  document.body.classList.toggle('a2-in-models', view === 'models');

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
      return panelHost.escape() || (o.viewEscape?.() ?? false);
    },
    blocked: () => false,
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
