/**
 * `?tune`: a palette panel for the Map view. Presets (light, warm, golden, dusk, night, overcast,
 * rain, fog), a colour picker per part, the transit ink strength, and Copy to share a palette.
 * A design tool, not part of the product UI.
 */
import type { Map as MlMap } from 'maplibre-gl';
import { PALETTES, applyPalette, type Palette } from './basestyle';

const LABELS: [keyof Palette, string][] = [
  ['ground', 'Ground'], ['resi', 'Neighbourhoods'], ['building', 'Buildings'], ['buildingLine', 'Building edge'],
  ['street', 'Streets'], ['major', 'Major roads'], ['motorway', 'Freeways'], ['casing', 'Road edges'],
  ['park', 'Parks'], ['wood', 'Woods'], ['water', 'Water'], ['rail', 'Basemap rail'],
  ['label', 'Street labels'], ['placeLabel', 'Place labels'], ['halo', 'Label halo'], ['ink', 'Line ink'],
];

export function mountTuner(map: MlMap, start: string) {
  let P: Palette = { ...PALETTES[start] };
  const box = document.createElement('section');
  box.className = 'tuner glass';
  box.setAttribute('aria-label', 'Map palette');
  const presets = Object.keys(PALETTES)
    .map((k) => `<button type="button" data-p="${k}" aria-pressed="${k === start}">${k}</button>`)
    .join('');
  const rows = LABELS.map(
    ([k, label]) => `<label><input type="color" data-k="${k}" value="${P[k]}"><span>${label}</span></label>`,
  ).join('');
  box.innerHTML = `
    <header><b>Map palette</b><button type="button" class="t-copy">Copy</button></header>
    <div class="t-presets">${presets}</div>
    <div class="t-grid">${rows}</div>
    <label class="t-range"><span>Line ink</span><input type="range" min="0" max="1" step="0.01" data-k="inkOpacity" value="${P.inkOpacity}"><output>${P.inkOpacity}</output></label>`;
  document.body.append(box);

  const paint = () => applyPalette(map, P);
  const sync = () => {
    box.querySelectorAll<HTMLInputElement>('input[type=color]').forEach((i) => (i.value = P[i.dataset.k as keyof Palette] as string));
    const r = box.querySelector<HTMLInputElement>('input[type=range]')!;
    r.value = String(P.inkOpacity);
    r.nextElementSibling!.textContent = P.inkOpacity.toFixed(2);
  };
  box.querySelectorAll<HTMLButtonElement>('[data-p]').forEach((b) =>
    b.addEventListener('click', () => {
      P = { ...PALETTES[b.dataset.p!] };
      box.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      sync();
      paint();
    }),
  );
  box.addEventListener('input', (e) => {
    const i = e.target as HTMLInputElement;
    const k = i.dataset.k as keyof Palette | undefined;
    if (!k) return;
    (P as unknown as Record<string, string | number>)[k] = i.type === 'range' ? Number(i.value) : i.value;
    if (i.type === 'range') i.nextElementSibling!.textContent = Number(i.value).toFixed(2);
    box.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    paint();
  });
  box.querySelector('.t-copy')!.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    try {
      await navigator.clipboard.writeText(JSON.stringify(P, null, 2));
      b.textContent = 'Copied';
    } catch {
      console.log(JSON.stringify(P, null, 2));
      b.textContent = 'In console';
    }
    setTimeout(() => (b.textContent = 'Copy'), 1500);
  });
  paint();
}
