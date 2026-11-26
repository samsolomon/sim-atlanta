import { describe, expect, it } from 'vitest';
import { FOLDED_IDS, VARIANT_FAMILIES, WELL_CONTAINER_SETS, entryFor, familyOf, resolveModel, writeEntryParams } from './variants';
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
});
