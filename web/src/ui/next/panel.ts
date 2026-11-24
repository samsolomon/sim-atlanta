/**
 * The A2c detail panel: one slot on the right (a bottom sheet on phones) holding the selected
 * train or building, the Key, or About & credits. The newer content replaces the older one, and a
 * back row ("‹ Northbound to North Springs") returns to it.
 *
 * The selection is the page's existing #card: main.ts still fills it and toggles its `hidden`
 * attribute, and the panel adopts it, so the Follow wiring stays where it is.
 */
const SVG = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const X = SVG('<path d="M6 6l12 12M18 6L6 18"/>');
const BACK = SVG('<path d="M15 6l-6 6 6 6"/>');
const OUT = SVG('<path d="M7 17L17 7M9 7h8v8"/>');

type Id = 'selection' | 'key' | 'about' | 'stops';
interface Entry { id: Id; node: HTMLElement; title(): string; full?: boolean }

const head = (title: string) =>
  `<div class="a2-panel-head"><h2>${title}</h2><button type="button" class="a2-x" data-close aria-label="Close">${X}</button></div>`;

function keyNode(): HTMLElement {
  const n = document.createElement('div');
  n.className = 'a2-key-body';
  const swatch = (c: string, name: string, small: string) =>
    `<div class="a2-k"><span class="a2-sw" style="background:var(${c})"></span><span>${name}<small>${small}</small></span></div>`;
  const tier = (t: string, d: string) => `<div class="a2-k"><span class="a2-tier-label">${t}</span><span>${d}</span></div>`;
  n.innerHTML = `${head('Key')}
    <p class="a2-h">Colour means the kind of service</p>
    ${swatch('--city-rail', 'City rail', 'MARTA trains and the streetcar')}
    ${swatch('--intercity', 'Intercity', 'Amtrak’s Crescent')}
    ${swatch('--freight', 'Freight', 'Freight railroads, simulated')}
    ${swatch('--bus', 'Bus', 'City steers Route 49 buses toward fresh GPS. Trips without a matched observation follow the timetable.')}
    <p class="a2-k-note" data-bus-calendar hidden></p>
    <div class="a2-sep a2-k-sep"></div>
    <p class="a2-h">Confidence</p>
    ${tier('Live', 'Real-time feed, moments ago')}
    ${tier('Scheduled', 'From a published timetable')}
    ${tier('Reported', 'An operator’s reported average')}
    ${tier('Inferred', 'Filled in from nearby reports')}
    ${tier('Illustrative', 'Typical, not observed')}
    <p class="a2-k-note">Labels appear on what you select and in the corner (Live or Timetable). Scenery carries none: the sky away from the present, trees, building heights, crowds and road traffic are drawn to look right, not measured.</p>`;
  return n;
}

/** "Built by Sam Solomon ↗" with X and Instagram, shared by About and the menu. */
export const BYLINE = `<a class="a2-by" href="https://solomon.io">Built by Sam Solomon${OUT}</a>
      <a class="a2-social" href="https://x.com/samuelrsolomon" aria-label="Sam Solomon on X"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.47l8.6-9.83L0 1.15h7.59l5.24 6.93zM17.61 20.64h2.04L6.49 3.24H4.3z"/></svg></a>
      <a class="a2-social" href="https://www.instagram.com/samuelrsolomon" aria-label="Sam Solomon on Instagram"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.5"/><circle cx="16.8" cy="7.2" r=".6" fill="currentColor"/></svg></a>`;

function aboutNode(): HTMLElement {
  const n = document.createElement('div');
  n.className = 'a2-about';
  const credit = (k: string, v: string) => `<dt>${k}</dt><dd>${v}</dd>`;
  n.innerHTML = `${head('About Sim Atlanta')}
    <div class="a2-about-body">
      <p class="a2-lede">A miniature city you can watch: MARTA trains and buses from reports and timetables, with traffic typical of this hour.</p>
      <p class="a2-h">What you’re looking at</p>
      <p>The City view is a hand-built model of downtown, drawn like a tabletop diorama. The Map view zooms out to the region’s rail: subway, streetcar, Amtrak and the freight lines that cross the state. Both show the same moment, Atlanta time.</p>
      <p class="a2-quiet">Nothing here is for planning a trip. It’s a window, not a timetable.</p>
      <p class="a2-h">How true is it?</p>
      <p>Select a train, bus or freight train and every fact on its card carries a label for how much we know: live, scheduled, reported, inferred or illustrative. City infers Route 49 bus positions from scheduled trips, stops and simulated signals. At the present clock City says Live. Select a bus to see its GPS age and drawing offset, or its timetable fallback.</p>
      <p>Scenery carries no label. The sky away from the present, trees and their species, building heights, landscaping, walkers and road traffic are illustrative or inferred: drawn to look right, not measured. Freight train movements are simulated.</p>
      <p class="a2-h">Credits</p>
      <dl class="a2-credits">
        ${credit('MARTA', 'Live rail and bus positions, rail timetables and the Route 49 timetable (GTFS)')}
        ${credit('Amtrak', 'Intercity timetable (GTFS)')}
        ${credit('FRA &amp; BTS', 'The national rail network and grade crossings')}
        ${credit('Overture Maps', 'Building footprints and heights, streets and track for the City view')}
        ${credit('OpenStreetMap', '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>. City uses directed motorway ways for the Downtown Connector.')}
        ${credit('OpenFreeMap', 'Basemap tiles, <a href="https://openmaptiles.org/">OpenMapTiles</a> schema')}
        ${credit('Open-Meteo', 'Current Atlanta weather')}
        ${credit('City of Atlanta &amp; Georgia Tech', 'The <a href="https://geospatial.gatech.edu/AtlantaUTC/">2023 urban tree canopy study</a>')}
        ${credit('Meta &amp; WRI', 'The <a href="https://registry.opendata.aws/dataforgood-fb-forests/">1 m canopy height map</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>')}
        ${credit('FHWA', 'HPMS road volumes and TMAS hourly counts')}
        ${credit('City of Atlanta', 'Neighbourhood boundaries, for the place name in the corner')}
      </dl>
      <p class="a2-quiet">An unofficial project, not affiliated with MARTA, Amtrak or the City of Atlanta. Vehicles use real livery colours but no operator logos. Free to use, no ads, no tracking.</p>
    </div>
    <div class="a2-about-foot">${BYLINE}</div>`;
  return n;
}

export interface PanelHooks {
  /** The selected train's stops ahead, as HTML, or null when there's no list. */
  busCalendar?(): string | null;
  allStops?(): string | null;
  /** Open the share panel (the card's Share button). */
  share?(): void;
}

export function createDetailPanel(hooks: PanelHooks = {}) {
  const host = document.createElement('aside');
  host.className = 'a2-panel a2-g a2-long';
  host.hidden = true;
  host.setAttribute('aria-label', 'Details');
  const grab = document.createElement('span');
  grab.className = 'a2-grab';
  grab.setAttribute('aria-hidden', 'true');
  const backRow = document.createElement('button');
  backRow.type = 'button';
  backRow.className = 'a2-backrow';
  backRow.hidden = true;
  const body = document.createElement('div');
  body.className = 'a2-panel-body';
  host.append(grab, backRow, body);

  const card = document.getElementById('card')!;
  const cardClose = card.querySelector<HTMLButtonElement>('.close')!;
  cardClose.innerHTML = X;
  cardClose.classList.add('a2-x');
  const entries: Record<Id, Entry> = {
    selection: { id: 'selection', node: card, title: () => card.querySelector('h2')?.textContent?.trim() || 'Selection' },
    key: { id: 'key', node: keyNode(), title: () => 'Key' },
    about: { id: 'about', node: aboutNode(), title: () => 'About & credits', full: true },
    stops: { id: 'stops', node: document.createElement('div'), title: () => 'All stops' },
  };
  entries.stops.node.className = 'a2-stops-body';
  // Share sits beside Follow (or alone when Follow isn't offered), as on the A2c-desktop board.
  const actions = document.createElement('div');
  actions.className = 'a2-card-actions';
  actions.innerHTML = '<button type="button" class="a2-btn" data-card-share>Share</button>';
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'a2-btn a2-more';
  more.textContent = 'More ⌃';
  more.setAttribute('aria-controls', 'card-content');
  actions.append(more);
  card.append(actions);
  const setExpanded = (expanded: boolean) => {
    host.classList.toggle('a2-expanded', expanded);
    more.setAttribute('aria-expanded', String(expanded));
    more.textContent = expanded ? 'Less ⌄' : 'More ⌃';
  };
  more.onclick = () => setExpanded(!host.classList.contains('a2-expanded'));
  let swipe: { x: number; y: number } | null = null;
  host.addEventListener('touchstart', event => {
    const content = card.querySelector('#card-content');
    const item = event.touches[0];
    swipe = event.touches.length === 1 && host.classList.contains('a2-selection')
      && (!(content?.contains(event.target as Node)) || content.scrollTop <= 0)
      ? { x: item.clientX, y: item.clientY } : null;
  }, { passive: true });
  host.addEventListener('touchcancel', () => { swipe = null; });
  host.addEventListener('touchend', event => {
    if (!swipe) return;
    const touch = event.changedTouches[0];
    const dy = touch.clientY - swipe.y;
    if (Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(touch.clientX - swipe.x)) setExpanded(dy < 0);
    swipe = null;
  }, { passive: true });
  actions.querySelector('[data-card-share]')!.addEventListener('click', (e) => {
    e.stopPropagation(); // the share panel it opens would otherwise see an outside click
    hooks.share?.();
  });
  const renderStops = () => {
    const html = hooks.allStops?.();
    if (!html) return false;
    const scroll = body.scrollTop;
    entries.stops.node.innerHTML = `${head('All stops')}${html}`;
    entries.stops.node.querySelector('[data-close]')?.addEventListener('click', () => close());
    body.scrollTop = scroll;
    return true;
  };
  card.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('[data-all-stops]') || !renderStops()) return;
    show('stops');
    entries.stops.node.querySelector<HTMLElement>('[data-close]')?.focus();
  });
  // The list counts down like the card it came from.
  setInterval(() => { if (current() === entries.stops && !renderStops()) back(); }, 1000);
  /** All stops belongs to the selection it was opened from. */
  const dropStops = () => {
    const at = stack.indexOf(entries.stops);
    if (at >= 0) stack.splice(at, 1);
  };
  for (const e of Object.values(entries)) {
    e.node.classList.add('a2-entry');
    body.append(e.node);
    e.node.querySelector('[data-close]')?.addEventListener('click', () => close());
  }
  const stack: Entry[] = [];
  const current = () => stack[stack.length - 1];

  function render() {
    const cur = current();
    if (cur?.id === 'key') {
      const note = cur.node.querySelector<HTMLElement>('[data-bus-calendar]')!;
      note.textContent = hooks.busCalendar?.() ?? '';
      note.hidden = !note.textContent;
    }
    host.hidden = !cur;
    host.classList.toggle('a2-selection', cur?.id === 'selection');
    for (const e of Object.values(entries)) e.node.classList.toggle('a2-shown', e === cur);
    host.classList.toggle('a2-full', !!cur?.full);
    host.setAttribute('aria-label', cur ? cur.title() : 'Details');
    const prev = stack[stack.length - 2];
    backRow.hidden = !prev;
    if (prev) {
      // The title comes from feed text (a headsign): set it as text, never as markup.
      const accent = prev.id === 'selection' ? card.querySelector<HTMLElement>('.a2-svc')?.style.background : '';
      const swatch = document.createElement('span');
      swatch.className = 'a2-back-swatch';
      swatch.style.background = accent ?? '';
      const label = document.createElement('span');
      label.textContent = prev.title();
      backRow.innerHTML = BACK;
      backRow.append(...(accent ? [swatch] : []), label);
      backRow.setAttribute('aria-label', `Back to ${prev.title()}`);
    }
    if (cur) body.scrollTop = 0;
  }
  function show(id: Id) {
    const e = entries[id];
    const at = stack.indexOf(e);
    if (at >= 0) stack.splice(at, 1);
    stack.push(e);
    render();
  }
  function back() {
    stack.pop();
    render();
    backRow.hidden ? (host.querySelector<HTMLElement>('[data-close], .close') ?? host).focus() : backRow.focus();
  }
  /** Close everything; a selection underneath is released through the page's own close. */
  function close() {
    const hadSelection = stack.includes(entries.selection);
    stack.length = 0;
    render();
    if (hadSelection && !card.hidden) cardClose.click();
  }
  backRow.addEventListener('click', back);

  // Follow the page's card: a new selection becomes the newest content; hidden → it leaves the stack.
  card.addEventListener('a2-select', () => {
    dropStops();
    setExpanded(false);
    show('selection');
  });
  // The selection's own text changes under Key or About (a train ends its trip): keep the back row true.
  new MutationObserver(() => {
    if (!backRow.hidden && stack[stack.length - 2] === entries.selection) render();
  }).observe(card.querySelector('#card-content') ?? card, { childList: true, subtree: true, characterData: true });
  new MutationObserver(() => {
    if (!card.hidden) {
      if (!stack.includes(entries.selection)) show('selection');
    } else {
      const at = stack.indexOf(entries.selection);
      if (at >= 0) {
        stack.splice(at, 1);
        dropStops();
        render();
      }
    }
  }).observe(card, { attributes: true, attributeFilter: ['hidden'] });
  if (!card.hidden) show('selection');

  return {
    host,
    show(id: 'key' | 'about') {
      show(id);
      host.querySelector<HTMLElement>('.a2-shown [data-close]')?.focus();
    },
    /** Escape: step back from Key or About; a selection is left to the page's own handler. */
    escape(): boolean {
      const cur = current();
      if (!cur || cur.id === 'selection') return false;
      if (stack.length > 1) back();
      else close();
      return true;
    },
    get open() {
      return !host.hidden;
    },
  };
}
