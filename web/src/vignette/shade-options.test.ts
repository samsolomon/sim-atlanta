import { Color } from 'three';
import { expect, it } from 'vitest';
import { isGlassColour, shadeOption } from './shade-options';

const lin = (hex: string) => { const c = new Color(hex); return [c.r, c.g, c.b] as [number, number, number]; };

it('reads only glass colours as glass', () => {
  // Skin glass bases from the merged skins.
  for (const g of ['#82919e', '#737c86', '#7b8fa5', '#6f7b85', '#868e96', '#7d97ad', '#6c8594', '#4f6b84', '#566f84', '#7f9fb0'])
    expect(isGlassColour(lin(g)), g).toBe(true);
  // Precast, brick, limestone, concrete, roofs, garage bands, the bronze glass that should stay as is.
  for (const n of ['#ddd5c4', '#e6e6e1', '#8c4636', '#cbb3a2', '#d9d1c1', '#c9cdd0', '#9c9890', '#8d8f8e', '#dcc7bd', '#e8e7e2', '#b7b8b6'])
    expect(isGlassColour(lin(n)), n).toBe(false);
});

it('is off unless the URL asks', () => {
  expect(shadeOption('')).toBe('off');
  expect(shadeOption('?shade=floor')).toBe('floor');
  expect(shadeOption('?shade=lift')).toBe('lift');
  expect(shadeOption('?shade=bogus')).toBe('off');
});
