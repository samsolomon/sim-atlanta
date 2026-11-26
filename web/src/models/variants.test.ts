import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FOLDED_IDS, VARIANT_FAMILIES, WELL_CONTAINER_SETS, entryFor, familyOf, nextEntry, resolveModel, viewUrl, writeEntryParams } from './variants';
import { WELL_LOADS } from '../vignette/intermodal';

describe('Model Lab families', () => {
  it('redirects every former per-state id to its family with the matching preset, and builds that same model', () => {
    for (const family of VARIANT_FAMILIES)
      for (const member of family.members) {
        const { entry, state } = entryFor(member.id);
        expect(entry).toBe(family.id);
        expect(state).toEqual(member.state);
        expect(resolveModel(entry, state)).toEqual({ model: member.id });
      }
  });
  it('lists one picker entry per family and drops only the folded ids', () => {
    expect(FOLDED_IDS.has('freightCoalEmpty')).toBe(true);
    expect(FOLDED_IDS.has('chargerPhase6')).toBe(true);
    // A family whose id is a former entry keeps that id in the picker.
    for (const id of ['cm44ac', 'xn40', 'freightBoxcar', 'charger', 'coach']) expect(FOLDED_IDS.has(id)).toBe(false);
    expect(entryFor('semi589')).toEqual({ entry: 'semi589', state: {} });
  });
  it('reads control state from the URL, ignoring values a control does not offer', () => {
    expect(entryFor('freightCoal', new URLSearchParams('load=empty')).state).toEqual({ load: 'empty' });
    expect(entryFor('freightCoal', new URLSearchParams('load=bogus')).state).toEqual({ load: 'loaded' });
    const url = new URL('https://x/models.html?v=freightCoalEmpty&load=empty&tier=low&paint=blue');
    writeEntryParams(url, 'v', 'freightBoxcar', { paint: 'faded' });
    expect(url.searchParams.get('v')).toBe('freightBoxcar');
    expect(url.searchParams.get('paint')).toBe('faded');
    expect(url.searchParams.has('load')).toBe(false); // another family's key
    expect(url.searchParams.get('tier')).toBe('low'); // the Lab's own controls stay
  });
  it('builds well-car loads with no former id from colour overrides, matching the baked loads it replaces', () => {
    expect(WELL_CONTAINER_SETS.whiteRed).toEqual(WELL_LOADS.wellA);
    expect(WELL_CONTAINER_SETS.blueGrey).toEqual(WELL_LOADS.wellB);
    expect(WELL_CONTAINER_SETS.mustard[0]).toBe(WELL_LOADS.wellC[0]);
    expect(resolveModel('freightWell', { load: 'empty', containers: 'blueGrey' })).toEqual({ model: 'freightWellA', well: [null, null] });
    expect(resolveModel('freightWell', { load: 'single', containers: 'whiteRed' }).well).toEqual(['#d6d4cc', null]);
    expect(familyOf('freightWell')?.controls.map(c => c.key)).toEqual(['load', 'containers']);
  });
  it('takes a loaded Lab to a former id from City, and leaves it alone when it is already there', () => {
    // "See the model" on an NS ES44 lead, with the Lab warm on the CQ400 and a stale coal key in the URL.
    const params = new URLSearchParams('view=models&model=es44acNs&load=empty');
    expect(nextEntry({ entry: 'cq400', state: {} }, 'es44acNs', params)).toEqual({ entry: 'es44', state: { scheme: 'ns' } });
    expect(nextEntry({ entry: 'es44', state: { scheme: 'csx' } }, 'es44acNs', params)).toEqual({ entry: 'es44', state: { scheme: 'ns' } });
    expect(nextEntry({ entry: 'es44', state: { scheme: 'ns' } }, 'es44acNs', params)).toBeNull();
    // A family id takes its state from the URL; the same entry and state is a no-op.
    expect(nextEntry({ entry: 'freightCoal', state: { load: 'empty' } }, 'freightCoal', new URLSearchParams('load=empty'))).toBeNull();
    expect(nextEntry({ entry: 'cq400', state: {} }, 'cq400')).toBeNull();
  });
});

describe('the app opens Lab ids through the Lab', () => {
  it('routes openModels through lab.open, not a picker click by raw id (a folded id has no button)', () => {
    const app = readFileSync(new URL('../main.ts', import.meta.url), 'utf8');
    const open = app.slice(app.indexOf('async function openModels'), app.indexOf('function leaveModels'));
    expect(open).toContain('labApi?.open(target, here.searchParams)');
    expect(open).not.toMatch(/data-model="\$\{CSS\.escape\(target\)\}"/);
    const lab = readFileSync(new URL('./main.ts', import.meta.url), 'utf8');
    // Reset view re-selects the current entry; that keeps its controls.
    expect(lab).toMatch(/if \(id === entry\) applyEntry\(entry, variantState\);/);
  });
});

describe('no control state leaks from one Models visit into the next', () => {
  // The app's sequence: setViewParam (viewUrl) on each view change, then openModels asks the loaded
  // Lab to open the URL's model (nextEntry), with `preset` when City's "See the model" named it.
  const visit = (href: string, lab: { entry: string; state: Record<string, string> }, view: string, pending: string | null) => {
    const url = viewUrl(href, view, pending, lab.entry);
    if (view !== 'models') return { url, lab };
    const next = pending ? nextEntry(lab, pending, undefined, true) : nextEntry(lab, url.searchParams.get('model')!, url.searchParams);
    return { url, lab: next ?? lab };
  };
  it('a CSX lead after the ES44 in NS-like opens CSX-like', () => {
    let s = visit('https://sim.example/?view=models&model=es44&scheme=ns', { entry: 'es44', state: { scheme: 'ns' } }, 'city', null);
    expect(s.url.searchParams.has('scheme')).toBe(false);
    s = visit(s.url.href, s.lab, 'models', 'cm44ac'); // CSX CM44AC lead card
    expect(s.url.searchParams.has('scheme')).toBe(false);
    expect(s.lab).toEqual({ entry: 'cm44ac', state: { scheme: 'csx' } });
  });
  it('a City bus after the XN40 in Rapid A-Line paint opens the MARTA paint', () => {
    let s = visit('https://sim.example/?view=models&model=xn40&paint=rapid', { entry: 'xn40', state: { paint: 'rapid' } }, 'city', null);
    s = visit(s.url.href, s.lab, 'models', 'xn40'); // the bus card's "See the model"
    expect(s.lab).toEqual({ entry: 'xn40', state: { paint: 'marta' } });
  });
  it('a plain return to Models keeps the state the Lab was left in', () => {
    let s = visit('https://sim.example/?view=models&model=es44&scheme=ns', { entry: 'es44', state: { scheme: 'ns' } }, 'map', null);
    s = visit(s.url.href, s.lab, 'models', null);
    expect(s.lab).toEqual({ entry: 'es44', state: { scheme: 'ns' } });
  });
});

