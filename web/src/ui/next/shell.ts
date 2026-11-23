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
import { loadPlaces, placeAt } from '../../core/places';
import { sunPosition } from '../../vignette/time';
import { ICON, weatherIcon } from '../icons';
import { createKeyboard } from '../keyboard';
import { createDetailPanel } from './panel';
import { atlantaDate, confidence, liveDetails, confidenceWords, sameTimeOnDate, hintText, placeLabel, SLIDER_MIN, sliderValue, skyLabel, type View } from '../status';
import { clock } from '../../core/clock';
import { shareUrl } from '../share';
import type { ShellApi, ShellOptions } from '../shell';

const TZ = 'America/New_York';
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });
const dayTimeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long', month: 'short', day: 'numeric' });
const shortDate = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric' });
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
  open.append(place, line);
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
    <button type="button" class="a2-back">${SVG('<path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/>')}Back to now</button>
    <details class="a2-sources"><summary>Each feed right now</summary><div class="a2-sources-body"></div></details>`;
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
  const sourcesBox = panel.querySelector<HTMLDetailsElement>('.a2-sources')!;
  sourcesBox.addEventListener('toggle', () => {
    panel.querySelector<HTMLElement>('.a2-sources-body')!.dataset.open = sourcesBox.open ? '1' : '';
    clockChanged();
  });
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
    <button type="button" class="a2-row" data-act="about"><span><b>About &amp; credits</b><small>How it works and where the data comes from</small></span><span class="a2-chev" aria-hidden="true">›</span></button>
    <p class="a2-fine">Unofficial. Rail data: MARTA, Amtrak GTFS; FRA; BTS NARN. Map © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> · OpenMapTiles · OpenFreeMap.</p>`;
  const cityInfoRow = menu.querySelector<HTMLButtonElement>('[data-act=city-info]')!;

  // ---- camera column (bottom-right) -------------------------------------------------------
  const cam = el('div', { class: 'a2-camera a2-g', role: 'group', 'aria-label': 'Camera' });
  const compass = el('button', { type: 'button', class: 'a2-ib a2-compass', 'aria-label': 'Face north', title: 'Face north (N)' }, COMPASS);
  const zoomIn = el('button', { type: 'button', class: 'a2-ib a2-zoom', 'aria-label': 'Zoom in', title: 'Zoom in (+)' }, `<span class="a2-ic">${ICON.plus}</span>`);
  const zoomOut = el('button', { type: 'button', class: 'a2-ib a2-zoom', 'aria-label': 'Zoom out', title: 'Zoom out (−)' }, `<span class="a2-ic">${ICON.minus}</span>`);
  const camSep = el('div', { class: 'a2-sep a2-compass-sep', 'aria-hidden': 'true' });
  const shareSep = el('div', { class: 'a2-sep a2-share-sep', 'aria-hidden': 'true' });
  const shareBtn = el('button', { type: 'button', class: 'a2-ib a2-share', 'aria-label': 'Share this view', 'aria-expanded': 'false', 'aria-controls': 'a2-share', title: 'Share this view' },
    SVG('<path d="M12 3v12"/><path d="M7.5 7.5L12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>'));
  cam.append(compass, camSep, zoomIn, zoomOut, shareSep, shareBtn);

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
      : target.view === 'city' ? 'The link opens on this exact camera in City.' : 'The link opens on this exact view of the Map.';
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

  const panelHost = createDetailPanel();
  document.body.append(subject, notice, bar, menu, cam, share, credit, panelHost.host, ...(hint ? [hint] : []));
  subjectBottom();

  // ---- pop-overs ---------------------------------------------------------------------------
  const pops: [HTMLElement, HTMLButtonElement][] = [[menu, menuBtn], [panel, open], [share, shareBtn]];
  const closePops = (except?: HTMLElement) => {
    for (const [p, b] of pops)
      if (p !== except && !p.hidden) {
        p.hidden = true;
        b.setAttribute('aria-expanded', 'false');
        if (p === panel) subject.classList.remove('a2-open');
      }
  };
  const toggle = (p: HTMLElement, b: HTMLButtonElement, focus: () => void) => {
    const show = p.hidden;
    closePops(p);
    p.hidden = !show;
    b.setAttribute('aria-expanded', String(show));
    if (p === panel) subject.classList.toggle('a2-open', show);
    if (show) focus();
  };
  menuBtn.addEventListener('click', () => toggle(menu, menuBtn, () => menu.querySelector<HTMLElement>('.a2-row')?.focus()));
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
  menu.querySelector('[data-act=about]')!.addEventListener('click', () => {
    closePops();
    panelHost.show('about');
  });
  cityInfoRow.addEventListener('click', () => {
    closePops();
    document.getElementById('city-info')?.showPopover?.();
  });
  document.addEventListener('click', (e) => {
    const t = e.target as Node;
    if (![subject, panel, bar, menu, share, shareBtn].some((c) => c.contains(t))) closePops();
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
  const sources = panel.querySelector<HTMLElement>('.a2-sources-body')!;

  let lastTick = 0;
  let areaNote: string | null = null;
  function tick(t0: Date) {
    now = t0;
    const t = performance.now();
    if (t - lastTick < 500) return;
    lastTick = t;
    const c = o.center();
    const mpp = o.metresPerPixel?.() ?? null;
    const name = placeLabel(c ? placeAt(c[0], c[1]) : null, mpp == null ? null : mpp * innerWidth);
    if (name && place.textContent !== name) place.textContent = name;
    const s = o.live();
    const preview = weatherChoice !== 'Auto';
    // Weather is live data: show it only when the clock is the real present.
    const wxNow = s.realTime && !preview ? weather : null;
    const conf = confidence(s, !!wxNow, preview);
    const night = sunPosition(now).elevation < -2;
    let svg: string;
    if (wxNow) {
      svg = weatherIcon(wxNow, night);
      wxText.textContent = `${wxNow.tempF != null ? `${Math.round(wxNow.tempF)}° ` : ''}${cap(wxNow.label)}`;
    } else if (s.realTime && !preview) {
      // At the present with no observation yet (or the fetch failed): show no condition at all,
      // never a guessed one in the observed-weather slot.
      svg = '';
      wxText.textContent = '';
    } else {
      // A shifted clock or a chosen sky is a scene setting: its icon only, no words, so it never
      // reads as a reported condition (#231).
      const sk = skyLabel(o.sky?.() ?? { cloud: 0, rain: 0, fog: 0, snow: 0 });
      svg = weatherIcon({ kind: sk.kind, label: sk.snow ? 'snow' : sk.label, cloud: 0, rain: 0, fog: 0, live: false }, night);
      // At the present, a picked sky says so in words, so it can't pass for the observed one.
      wxText.textContent = s.realTime && preview ? `Chosen: ${sk.label}` : '';
      wx.title = `Scene sky: ${sk.label.toLowerCase()}`;
    }
    wx.hidden = !svg;
    if (wxText.textContent) wx.removeAttribute('title');
    if (wxIcon.dataset.svg !== svg) {
      wxIcon.innerHTML = svg;
      wxIcon.dataset.svg = svg;
    }
    timeText.textContent = (conf.shifted ? dayTimeFmt : timeFmt).format(now);
    tierDot.className = `a2-dot a2-dot-${conf.tier}`;
    tierText.textContent = confidenceWords(conf).join(' · ');
    tierDate.textContent = conf.shifted ? '' : dateFmt.format(now);
    tierDate.hidden = conf.shifted;
    nowBtn.hidden = !conf.shifted;
    open.setAttribute('aria-label', `${place.textContent}, ${timeText.textContent}${wxText.textContent ? `, ${wxText.textContent}` : ''}, ${tierText.textContent}. Time and weather`);
    // Feed status is a notice too, but the host's area note wins the single slot.
    const feedNote = s.realTime && s.rail === 'down' ? 'Live feed unavailable · showing the timetable' : null;
    showNotice(areaNote ?? feedNote);
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
    anchorPhone.textContent = anchorLabel;
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
    if (sources.dataset.open === '1') sources.innerHTML = liveDetails(s, view, weather, weatherAt);
  }
  const fmtSpan = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `${m} min`);

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
    if (changed) {
      if (v === 'city' && !cityCreditDone) armCredit();
      showCredit();
      o.onView(v);
    }
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
      return panelHost.escape();
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
