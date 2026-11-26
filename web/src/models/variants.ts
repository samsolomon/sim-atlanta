/**
 * Model Lab entries that are one physical model in several states or paints. The picker lists one
 * entry per family; controls pick the state, and the state lives in the URL beside the entry id.
 * Every former per-state id (?v=freightCoalEmpty, ?v=chargerPhase6, …) still opens, redirected to
 * its family with the matching control preset. Nothing here changes what City draws.
 */

export interface VariantControl {
  key: string;
  legend: string;
  options: readonly { value: string; label: string }[];
}
export interface VariantFamily {
  /** The entry id the picker shows. It may equal one member's id (that member is then the default). */
  id: string;
  label: string;
  controls: readonly VariantControl[];
  /** Former entry ids and the control state each one stands for; the first is the default. */
  members: readonly { id: string; state: Readonly<Record<string, string>> }[];
}
export type VariantState = Record<string, string>;

const load = (...options: [string, string][]): VariantControl =>
  ({ key: 'load', legend: 'Load', options: options.map(([value, label]) => ({ value, label })) });
const choice = (key: string, legend: string, ...options: [string, string][]): VariantControl =>
  ({ key, legend, options: options.map(([value, label]) => ({ value, label })) });

/** Well-car container sets: lower and upper box colours. A single stack shows the lower box only. */
export const WELL_CONTAINER_SETS: Record<string, [string, string]> = {
  whiteRed: ['#d6d4cc', '#8b3a2e'],
  blueGrey: ['#2f5b8c', '#7e848a'],
  mustard: ['#a8893f', '#d6d4cc'],
};

export const VARIANT_FAMILIES: readonly VariantFamily[] = [
  {
    id: 'cm44ac', label: 'GE AC44 rebuild (CM44AC family)',
    controls: [choice('scheme', 'Scheme', ['csx', 'CSX-like'], ['ns', 'NS-like'])],
    members: [{ id: 'cm44ac', state: { scheme: 'csx' } }, { id: 'cm44acNs', state: { scheme: 'ns' } }],
  },
  {
    id: 'es44', label: 'GE Evolution series (ES44)',
    controls: [choice('scheme', 'Scheme', ['csx', 'CSX-like (ES44AH)'], ['ns', 'NS-like (ES44AC)'])],
    members: [{ id: 'es44ah', state: { scheme: 'csx' } }, { id: 'es44acNs', state: { scheme: 'ns' } }],
  },
  {
    id: 'xn40', label: 'New Flyer Xcelsior XN40',
    controls: [choice('paint', 'Paint', ['marta', 'MARTA'], ['rapid', 'Rapid A-Line'])],
    members: [{ id: 'xn40', state: { paint: 'marta' } }, { id: 'xn40Rapid', state: { paint: 'rapid' } }],
  },
  {
    id: 'freightBoxcar', label: '50-foot boxcar',
    controls: [choice('paint', 'Paint', ['standard', 'Standard'], ['faded', 'Faded'], ['blue', 'Blue'])],
    members: [
      { id: 'freightBoxcar', state: { paint: 'standard' } },
      { id: 'freightBoxcarFaded', state: { paint: 'faded' } },
      { id: 'freightBoxcarBlue', state: { paint: 'blue' } },
    ],
  },
  {
    id: 'freightCoal', label: 'Aluminum coal hopper',
    controls: [load(['loaded', 'Loaded'], ['empty', 'Empty'])],
    members: [{ id: 'freightCoalLoaded', state: { load: 'loaded' } }, { id: 'freightCoalEmpty', state: { load: 'empty' } }],
  },
  {
    id: 'freightCenterbeam', label: '73-foot centerbeam',
    controls: [load(['loaded', 'Lumber'], ['empty', 'Empty'])],
    members: [{ id: 'freightCenterbeamLumber', state: { load: 'loaded' } }, { id: 'freightCenterbeamEmpty', state: { load: 'empty' } }],
  },
  {
    id: 'freightGondola', label: '52-foot mill gondola',
    controls: [load(['loaded', 'Scrap'], ['empty', 'Empty'])],
    members: [{ id: 'freightGondolaScrap', state: { load: 'loaded' } }, { id: 'freightGondolaEmpty', state: { load: 'empty' } }],
  },
  {
    id: 'freightWell', label: '53-foot well car',
    controls: [
      load(['double', 'Double stack'], ['single', 'Single'], ['empty', 'Empty']),
      choice('containers', 'Containers', ['whiteRed', 'White, red-brown'], ['blueGrey', 'Blue, grey'], ['mustard', 'Mustard, white']),
    ],
    members: [
      { id: 'freightWellA', state: { load: 'double', containers: 'whiteRed' } },
      { id: 'freightWellB', state: { load: 'double', containers: 'blueGrey' } },
      { id: 'freightWellC', state: { load: 'single', containers: 'mustard' } },
    ],
  },
  {
    id: 'charger', label: 'Siemens ALC-42 Charger',
    controls: [choice('paint', 'Paint', ['phase7', 'Phase VII'], ['phase6', 'Phase VI'])],
    members: [{ id: 'charger', state: { paint: 'phase7' } }, { id: 'chargerPhase6', state: { paint: 'phase6' } }],
  },
  {
    id: 'coach', label: 'Amfleet II coach',
    controls: [choice('paint', 'Paint', ['phase6', 'Phase VI'], ['phase7', 'Phase VII'])],
    members: [{ id: 'coach', state: { paint: 'phase6' } }, { id: 'coachPhase7', state: { paint: 'phase7' } }],
  },
];

const byFamily = new Map(VARIANT_FAMILIES.map((f) => [f.id, f]));
const byMember = new Map(VARIANT_FAMILIES.flatMap((f) => f.members.map((m) => [m.id, { family: f, state: m.state }] as const)));

export const familyOf = (id: string) => byFamily.get(id);
/** Every former member id that is not itself a picker entry: these leave the picker. */
export const FOLDED_IDS: ReadonlySet<string> = new Set([...byMember.keys()].filter((id) => !byFamily.has(id)));

/** The picker entry and control state for a requested id plus URL params. Unknown ids pass through. */
export function entryFor(requested: string, params?: URLSearchParams): { entry: string; state: VariantState } {
  const family = byFamily.get(requested);
  if (family) {
    const state: VariantState = { ...family.members[0].state };
    for (const c of family.controls) {
      const v = params?.get(c.key);
      if (v && c.options.some((o) => o.value === v)) state[c.key] = v;
    }
    return { entry: family.id, state };
  }
  const member = byMember.get(requested);
  if (member) return { entry: member.family.id, state: { ...member.state } };
  return { entry: requested, state: {} };
}

/**
 * The model the Lab builds for an entry and state: a former member id when one matches exactly,
 * otherwise the family's first member (the well car then takes `well` colours from the state).
 */
export function resolveModel(entry: string, state: VariantState): { model: string; well?: [string | null, string | null] } {
  const family = byFamily.get(entry);
  if (!family) return { model: entry };
  const exact = family.members.find((m) => family.controls.every((c) => m.state[c.key] === state[c.key]));
  if (family.id !== 'freightWell') return { model: (exact ?? family.members[0]).id };
  const [lower, upper] = WELL_CONTAINER_SETS[state.containers] ?? WELL_CONTAINER_SETS.whiteRed;
  if (exact) return { model: exact.id };
  return { model: 'freightWellA', well: state.load === 'empty' ? [null, null] : state.load === 'single' ? [lower, null] : [lower, upper] };
}

/**
 * Where an already-loaded Lab should go for a requested id: the entry and state, or null when it is
 * already there. A former id (City's "See the model" names lead units like es44acNs) resolves to
 * its family and preset; a family id takes its state from the URL params.
 * - `preset` (City's "See the model"): the target's own preset, ignoring the URL, even on the
 *   entry already shown (a City bus after XN40 Rapid opens the MARTA paint).
 * - Otherwise, returning to the entry already shown with no control keys in the URL keeps its state.
 */
export function nextEntry(current: { entry: string; state: VariantState }, id: string, params?: URLSearchParams, preset = false) {
  if (!preset && id === current.entry && !VARIANT_KEYS.some((k) => params?.has(k))) return null;
  const next = entryFor(id, preset ? undefined : params);
  const same = next.entry === current.entry && Object.keys({ ...next.state, ...current.state })
    .every((k) => next.state[k] === current.state[k]);
  return same ? null : next;
}

/** Every control key any family uses (load, paint, scheme, containers). */
export const VARIANT_KEYS: readonly string[] = [...new Set(VARIANT_FAMILIES.flatMap((f) => f.controls.map((c) => c.key)))];

/**
 * The app's URL for a view change. Leaving Models drops the model and every control key. Opening a
 * named model from City (`pending`, "See the model") drops the ambient control keys too, so the Lab
 * shows that model's own preset rather than whatever state the last family left in the query.
 */
export function viewUrl(href: string, view: string, pending: string | null, current: string | null): URL {
  const u = new URL(href);
  u.searchParams.set('view', view);
  if (view !== 'models' || pending) for (const k of VARIANT_KEYS) u.searchParams.delete(k);
  if (view === 'models') {
    u.searchParams.set('model', pending ?? u.searchParams.get('model') ?? current ?? u.searchParams.get('v') ?? 'cq400');
  } else u.searchParams.delete('model');
  u.searchParams.delete('v');
  return u;
}

/**
 * What the app's openModels asks a loaded Lab to do: City's "See the model" (`requested`) opens that
 * model's own preset; otherwise the URL's model opens with the URL's control keys.
 */
export function labOpenRequest(requested: string | null, href: string): { id: string; params?: URLSearchParams; preset: boolean } | null {
  if (requested) return { id: requested, preset: true };
  const url = new URL(href);
  const target = url.searchParams.get('model');
  return target ? { id: target, params: url.searchParams, preset: false } : null;
}

/**
 * The Lab's response to an open request: where to go (null to stay) and the URL to show, which
 * always carries the resulting entry and state (a plain return writes back the kept state that
 * leaving Models cleared).
 */
export function labOpen(current: { entry: string; state: VariantState }, request: { id: string; params?: URLSearchParams; preset: boolean },
  href: string, embedded: boolean): { next: { entry: string; state: VariantState } | null; url: URL } {
  const next = nextEntry(current, request.id, request.params, request.preset);
  const shown = next ?? current;
  const url = new URL(href);
  if (familyOf(shown.entry)) writeEntryParams(url, embedded ? 'model' : 'v', shown.entry, shown.state);
  else url.searchParams.set(embedded ? 'model' : 'v', shown.entry);
  if (embedded) url.searchParams.delete('v');
  return { next, url };
}

/** Write the entry and its control state into a URL, dropping keys that belong to other families. */
export function writeEntryParams(url: URL, idKey: 'v' | 'model', entry: string, state: VariantState) {
  url.searchParams.set(idKey, entry);
  const keys = new Set(VARIANT_FAMILIES.flatMap((f) => f.controls.map((c) => c.key)));
  for (const k of keys) url.searchParams.delete(k);
  for (const [k, v] of Object.entries(state)) url.searchParams.set(k, v);
}
