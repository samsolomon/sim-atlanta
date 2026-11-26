import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FOLDED_IDS, VARIANT_FAMILIES, WELL_CONTAINER_SETS, entryFor, familyOf, nextEntry, resolveModel, writeEntryParams } from './variants';
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

