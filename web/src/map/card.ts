import type { LiveBus, CrossingProps, Route, Stop, Tier, TrackArcProps, TrainState, VehicleType } from '../model/types';
import { MODE_COLOR, routeColor } from './layers';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const TIER_LABEL: Record<Tier, string> = {
  live: 'Live',
  scheduled: 'Scheduled · not live',
  reported: 'Reported average',
  inferred: 'Inferred',
  illustrative: 'Illustrative',
};

export const chip = (t: Tier, text = TIER_LABEL[t]) => `<span class="chip ${t}">${esc(text)}</span>`;

const titleCase = (s: string) =>
  s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ns|Csx|Csxt|Rr|Sr|Us)\b/g, (m) => m.toUpperCase());

const OWNERS: Record<string, string> = { NS: 'Norfolk Southern', CSXT: 'CSX', GFRR: 'Georgia & Florida', GC: 'Georgia Central', GSWR: 'Georgia Southwestern', HOG: 'Heart of Georgia', GNRR: 'Georgia Northeastern', AMTK: 'Amtrak' };

/** "RED SOUTHBOUND TO AIRPORT STATION" → "Airport"; "Lakewood-Ft Mcpherson Station" → "Lakewood-Ft Mcpherson". */
export const place = (s: string) => titleCase(s.replace(/^.*\bto\s+/i, '').replace(/\s+station\b.*$/i, ''));

const ago = (ms: number, now = Date.now()) => {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  return s < 90 ? `${s} s ago` : `${Math.round(s / 60)} min ago`;
};

function nextRow(t: TrainState, next: Stop | undefined) {
  const name = t.nextStopName ?? next?.name;
  if (!name) return '';
  const eta = t.nextInSec != null ? ` · ${t.nextInSec < 60 ? 'arriving' : `${Math.round(t.nextInSec / 60)} min`}` : '';
  return `<dt>Next stop</dt><dd>${esc(place(name))}${eta}</dd>`;
}

const TIER_WORD: Record<Tier, string> = { live: 'Live', scheduled: 'Scheduled', reported: 'Reported', inferred: 'Inferred', illustrative: 'Illustrative' };
const SERVICE: Record<string, string> = { heavy_rail: 'City rail', light_rail: 'City rail', streetcar: 'City rail', intercity: 'Intercity', freight: 'Freight', bus: 'Bus' };

/** "RED SOUTHBOUND TO AIRPORT STATION" → "Southbound to Airport"; no direction → "To Airport". */
export const destination = (headsign: string) => {
  const dir = headsign.match(/\b(north|south|east|west)bound\b/i)?.[0];
  return `${dir ? `${dir.charAt(0).toUpperCase()}${dir.slice(1).toLowerCase()} to` : 'To'} ${place(headsign)}`;
};

/** Where City drew the tapped car: on the North Line open cut, whose alignment is inferred,
 * or on the Brookwood model, whose berth is inferred. Tier words live on cards, never as
 * ambient scene notes (#231). */
export interface DrawnAt { inferredTrack?: boolean; inferredBerth?: boolean }
const drawnRows = (city: boolean, drawn: DrawnAt, row: (k: string, v: string) => string) =>
  (city && drawn.inferredBerth ? row('Brookwood berth', `Main 1 beside the island ${chip('inferred', 'inferred berth')}`) : '') +
  (city && drawn.inferredTrack ? row('Track', `North Line open cut ${chip('inferred', 'inferred track')}`) : '');

export function trainCard(t: TrainState, route: Route | undefined, next: Stop | undefined, vt: VehicleType | undefined, city = false, a2c = false,
  drawn: DrawnAt = {}) {
  if (a2c) return trainCardA2c(t, route, next, vt, city, drawn);
  const color = route ? routeColor(route) : '#333';
  const name = route?.mode === 'heavy_rail' ? `${titleCase(route.shortName)} Line` : route?.longName ?? 'Train';
  let model: string | undefined;
  if (city && vt && route?.mode === 'heavy_rail') model = `${vt.typicalUnits} × Stadler CQ400`;
  if (city && t.routeId === 'amtrak:route:Crescent') {
    model = 'Two locomotives, three coaches, café, diner, sleeper and baggage-dorm';
  }
  const units = model ?? (vt ? `${vt.typicalUnits} × ${vt.name}` : '');
  const live = t.s.tier === 'live';
  return `
    <h2><span class="dot" style="background:${esc(color)}"></span>${esc(name)}${t.label ? ` <small>#${esc(t.label)}</small>` : ''}</h2>
    <p class="sub">to ${esc(place(t.headsign))} ${chip(t.s.tier, live ? 'Live' : undefined)}</p>
    <dl>
      ${nextRow(t, next)}
      ${units ? `<dt>${model ? 'City model' : 'Looks like'}</dt><dd>${esc(units)} ${chip('illustrative', model ? undefined : 'typical')}</dd>` : ''}
      ${drawnRows(city, drawn, (k, v) => `<dt>${esc(k)}</dt><dd>${v}</dd>`)}
      ${
        live
          ? `<dt class="position-report">Position</dt><dd class="position-report">${t.observedAt ? `reported ${ago(t.observedAt)}` : 'report time unknown'} by ${esc(route?.operator)}</dd>`
          : `<dt>Source</dt><dd>${esc(route?.operator)} timetable${t.s.asOf ? ` (version ${esc(t.s.asOf)})` : ''}</dd>`
      }
    </dl>
    <p class="tip">${
      live
        ? 'Between reports (every 30–60 s) we glide the train along the track toward its latest position.'
        : 'Position comes from the published timetable, so a delayed train will be somewhere else.'
    }</p>`;
}

export function crossingCard(p: CrossingProps) {
  const total = p.dayTrains + p.nightTrains;
  const kind = p.position === 'At Grade' ? 'Street-level crossing' : p.position === 'RR Under' ? 'Rail passes under the road' : 'Rail passes over the road';
  return `
    <h2>${esc(titleCase(p.street || 'Crossing'))}</h2>
    <p class="sub">${esc(titleCase(p.city))} · ${esc(kind)}</p>
    <dl>
      <dt>Trains / day</dt><dd><b>~${total}</b> ${chip('reported', 'reported to FRA')}</dd>
      <dt>Day · night</dt><dd>${p.dayTrains} · ${p.nightTrains}</dd>
      ${p.passengerTrains ? `<dt>Passenger</dt><dd>${p.passengerTrains} / day</dd>` : ''}
      ${p.maxSpeedMph ? `<dt>Track speed</dt><dd>up to ${p.maxSpeedMph} mph</dd>` : ''}
      <dt>Railroad</dt><dd>${esc(p.railroad)}</dd>
      <dt>FRA ID</dt><dd>${esc(p.id.split(':').pop())}</dd>
    </dl>
    <p class="tip">A railroad-reported daily average, not a live count. Watch from a safe public spot, well back from the tracks.</p>`;
}

const NET: Record<string, string> = {
  M: 'Main line',
  S: 'Passing siding',
  I: 'Industrial lead',
  O: 'Minor industrial track',
  Y: 'Yard track',
  F: 'Ferry connection',
};

export function freightCard(p: TrackArcProps) {
  const owner = OWNERS[p.owner] ?? p.owner ?? 'Unknown';
  const rights = p.rights.map((r) => OWNERS[r] ?? r).join(', ');
  const tpd =
    p.tpd == null
      ? `<dd>Unknown: no reported crossing on this track</dd>`
      : `<dd><b>~${p.tpd}</b> ${chip(p.tpdTier ?? 'reported', p.tpdTier === 'inferred' ? 'inferred from nearby track' : 'reported to FRA')}</dd>`;
  return `
    <h2>${esc(owner)}</h2>
    <p class="sub">${esc([NET[p.net] ?? 'Freight track', p.subdiv && titleCase(p.subdiv)].filter(Boolean).join(' · '))}</p>
    <dl>
      <dt>Trains / day</dt>${tpd}
      ${p.tracks ? `<dt>Tracks</dt><dd>${p.tracks}</dd>` : ''}
      ${rights ? `<dt>Also runs here</dt><dd>${esc(rights)}</dd>` : ''}
    </dl>
    <p class="tip">No free live feed exists for freight trains, so this shows how busy the line usually is.</p>`;
}

export function busCard(bus: LiveBus, now: number, model?: string) {
  const name = bus.routeId?.value.slice('marta:route:'.length);
  return `<h2><span class="dot" style="background:${MODE_COLOR.bus}"></span>MARTA bus ${esc(bus.id.slice('marta:bus:'.length))}</h2>
    <p class="sub">${name ? 'Route ' + esc(name) : 'Route unavailable'}</p>
    <dl><dt class="position-report">Position</dt><dd class="position-report">${bus.at === null ? 'report time unknown' : 'reported ' + ago(bus.at, now)} ${chip(bus.position.tier)}</dd>
      ${model ? `<dt>City model</dt><dd>${esc(model)} ${chip('illustrative')}</dd>` : ''}</dl>`;
}

export function cityFreightCard(line = 'Atlanta Terminal Subdivision', a2c = false) {
  // Look-alike schemes only: CSX-like on the CSX line downtown, NS-like on Norfolk Southern track.
  const consist = /\bNS\b|Norfolk/.test(line)
    ? 'GE AC44-type locomotives in an NS-like scheme, with boxcars'
    : 'GE/Wabtec CM44AC locomotives in a CSX-like scheme, with boxcars';
  if (a2c) {
    const row = (k: string, v: string) => `<div class="a2-row-fact"><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
    return `<p class="a2-kicker"><span class="a2-svc" style="background:${MODE_COLOR.freight}"></span>Freight · ${esc(line)}</p>
      <h2>Freight train</h2>
      <dl class="a2-facts">
        ${row('Position', `Simulated on the mapped track ${chip('illustrative')}`)}
        ${row('Timing', `A typical pattern, not a timetable ${chip('illustrative')}`)}
        ${row('Consist', `${esc(consist)} ${chip('illustrative')}`)}
      </dl>`;
  }
  return `<h2><span class="dot" style="background:${MODE_COLOR.freight}"></span>Freight train</h2>
    <p class="sub">${esc(line)} ${chip('illustrative')}</p>
    <dl><dt>City model</dt><dd>${esc(consist)}</dd></dl>
    <p class="tip">This train follows the mapped track in a simulated pattern. Its position, timing and consist are illustrative.</p>`;
}

/** The A2c detail panel's train card: service and line, destination, then one row per fact,
 * each with its own truth tier. */
function trainCardA2c(t: TrainState, route: Route | undefined, next: Stop | undefined, vt: VehicleType | undefined, city: boolean, drawn: DrawnAt) {
  const line = route?.mode === 'heavy_rail' ? `${route.operator ?? 'MARTA'} ${titleCase(route.shortName)} Line` : route?.longName ?? 'Train';
  const service = route ? SERVICE[route.mode] ?? 'Rail' : 'Rail';
  const swatch = route ? MODE_COLOR[route.mode] : '#495057';
  const live = t.s.tier === 'live';
  const name = t.nextStopName ?? next?.name;
  const eta = t.nextInSec != null ? ` · ${t.nextInSec < 60 ? 'arriving' : `${Math.round(t.nextInSec / 60)} min`}` : '';
  let units = '';
  if (city && t.routeId === 'amtrak:route:Crescent') units = 'Two locomotives, three coaches, café, diner, sleeper and baggage-dorm';
  else if (vt) units = route?.mode === 'heavy_rail' ? `${vt.typicalUnits}` : `${vt.typicalUnits} × ${vt.name}`;
  const row = (k: string, v: string) => `<div class="a2-row-fact"><dt>${esc(k)}</dt><dd>${v}</dd></div>`;
  const model = ({ 'marta:vt:heavy-rail': 'cq400', 'marta:vt:streetcar': 's70', 'amtrak:vt:long-distance': 'crescent' } as Record<string, string>)[t.vehicleType];
  return `
    <p class="a2-kicker"><span class="a2-svc" style="background:${esc(swatch)}"></span>${esc(service)} · ${esc(line)}${route ? `<span class="dot" style="background:${esc(routeColor(route))}"></span>` : ''}</p>
    <h2>${esc(destination(t.headsign))}</h2>
    <dl class="a2-facts">
      ${name ? row('Next stop', `<strong>${esc(place(name))}${eta}</strong> ${chip(t.s.tier, TIER_WORD[t.s.tier])}`) : ''}
      ${units ? row(route?.mode === 'heavy_rail' ? 'Cars' : 'Consist', `${esc(units)} ${chip('illustrative')}`) : ''}
      ${drawnRows(city, drawn, row)}
      ${live
        ? row('Position', `${t.observedAt ? `reported ${ago(t.observedAt)}` : 'report time unknown'} by ${esc(route?.operator)} ${chip('live', 'Live')}`)
        : row('Position', `Timetable; delays not shown ${chip(t.s.tier, TIER_WORD[t.s.tier])}`)}
    </dl>
    ${t.nextStop || t.nextStopName ? `<button type="button" class="a2-allstops" data-all-stops>All stops<span aria-hidden="true">›</span></button>` : ''}
    ${model ? `<a class="a2-allstops" data-see-model="${model}" href="?view=models&amp;model=${model}">See the model <span aria-hidden="true">›</span></a>` : ''}`;
}
