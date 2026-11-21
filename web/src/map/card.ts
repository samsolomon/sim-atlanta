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
const place = (s: string) => titleCase(s.replace(/^.*\bto\s+/i, '').replace(/\s+station\b.*$/i, ''));

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

export function trainCard(t: TrainState, route: Route | undefined, next: Stop | undefined, vt: VehicleType | undefined) {
  const color = route ? routeColor(route) : '#333';
  const name = route?.mode === 'heavy_rail' ? `${titleCase(route.shortName)} Line` : route?.longName ?? 'Train';
  const units = vt ? `${vt.typicalUnits} × ${vt.name}` : '';
  const live = t.s.tier === 'live';
  return `
    <h2><span class="dot" style="background:${esc(color)}"></span>${esc(name)}${t.label ? ` <small>#${esc(t.label)}</small>` : ''}</h2>
    <p class="sub">to ${esc(place(t.headsign))} ${chip(t.s.tier, live ? 'Live' : undefined)}</p>
    <dl>
      ${nextRow(t, next)}
      ${units ? `<dt>Looks like</dt><dd>${esc(units)} ${chip('illustrative', 'typical')}</dd>` : ''}
      ${
        live
          ? `<dt>Position</dt><dd>${t.observedAt ? `reported ${ago(t.observedAt)}` : 'report time unknown'} by ${esc(route?.operator)}</dd>`
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

export function busCard(bus: LiveBus, now: number) {
  const name = bus.routeId?.value.slice('marta:route:'.length);
  return `<h2><span class="dot" style="background:${MODE_COLOR.bus}"></span>MARTA bus ${esc(bus.id.slice('marta:bus:'.length))}</h2>
    <p class="sub">${name ? 'Route ' + esc(name) : 'Route unavailable'}</p>
    <dl><dt>Position</dt><dd>${bus.at === null ? 'report time unknown' : 'reported ' + ago(bus.at, now)} ${chip(bus.position.tier)}</dd></dl>`;
}
