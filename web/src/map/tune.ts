/**
 * `?tune`: the atmosphere playground and palette panel for the Map view.
 *   - Sky: Live (the real clock and Atlanta's weather) or your own mix of time of day, cloud,
 *     rain, snow and fog. Time and weather are independent, so any combination works.
 *   - Palette: static presets and a colour picker per part, to tune the keyframe palettes;
 *     Copy shares the result. Choosing a preset pins it; "Back to sky" returns to the blend.
 * A design tool, not part of the product UI.
 */
import { PALETTES, type Palette } from './basestyle';
import type { AtmosphereOverride } from '../core/atmosphere';

const LABELS: [keyof Palette, string][] = [
  ['ground', 'Ground'], ['resi', 'Neighbourhoods'], ['building', 'Buildings'], ['buildingLine', 'Building edge'],
  ['street', 'Streets'], ['major', 'Major roads'], ['motorway', 'Freeways'], ['casing', 'Road edges'],
  ['park', 'Parks'], ['wood', 'Woods'], ['water', 'Water'], ['rail', 'Basemap rail'],
  ['label', 'Street labels'], ['placeLabel', 'Place labels'], ['halo', 'Label halo'], ['ink', 'Line ink'],
];

export interface TunerHooks {
  /** null = live sky */
  setOverride(o: AtmosphereOverride | null): void;
  /** null = palette follows the sky */
  setPalette(p: Palette | null): void;
  /** The palette currently on screen (for Copy and pickers). */
  current(): Palette;
}

const fmtHour = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  const ap = hh < 12 ? 'AM' : 'PM';
  return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`;
};

export function mountTuner(hooks: TunerHooks) {
  const box = document.createElement('section');
  box.className = 'tuner glass';
  box.setAttribute('aria-label', 'Sky and palette');
  const slider = (k: string, label: string, max = 1, step = 0.01, v = 0) =>
    `<label class="t-range"><span>${label}</span><input type="range" min="0" max="${max}" step="${step}" data-s="${k}" value="${v}"><output></output></label>`;
  box.innerHTML = `
    <header><b>Sky</b><label class="t-live"><input type="checkbox" checked data-live> Live</label></header>
    ${slider('hour', 'Time', 24, 0.25, new Date().getHours() + new Date().getMinutes() / 60)}
    ${slider('cloud', 'Cloud')}
    ${slider('rain', 'Rain')}
    ${slider('snow', 'Snow')}
    ${slider('fog', 'Fog')}
    <header><b>Palette</b><span><button type="button" class="t-sky" hidden>Back to sky</button> <button type="button" class="t-copy">Copy</button></span></header>
    <div class="t-presets">${Object.keys(PALETTES).map((k) => `<button type="button" data-p="${k}" aria-pressed="false">${k}</button>`).join('')}</div>
    <details><summary>Colours</summary><div class="t-grid">${LABELS.map(([k, label]) => `<label><input type="color" data-k="${k}"><span>${label}</span></label>`).join('')}</div>
    ${slider('inkOpacity', 'Line ink')}</details>`;
  document.body.append(box);

  const live = box.querySelector<HTMLInputElement>('[data-live]')!;
  const sliders = [...box.querySelectorAll<HTMLInputElement>('[data-s]')];
  const skySliders = sliders.filter((s) => s.dataset.s !== 'inkOpacity');
  const inkSlider = sliders.find((s) => s.dataset.s === 'inkOpacity')!;
  const backToSky = box.querySelector<HTMLButtonElement>('.t-sky')!;
  let pinned: Palette | null = null;

  const showValues = () =>
    sliders.forEach((s) => (s.nextElementSibling!.textContent = s.dataset.s === 'hour' ? fmtHour(Number(s.value)) : Number(s.value).toFixed(2)));
  const syncPickers = () => {
    const P = hooks.current();
    box.querySelectorAll<HTMLInputElement>('input[type=color]').forEach((i) => (i.value = P[i.dataset.k as keyof Palette] as string));
    inkSlider.value = String(P.inkOpacity);
    showValues();
  };
  const pushSky = () => {
    if (live.checked) return hooks.setOverride(null);
    const o: AtmosphereOverride = {};
    for (const s of skySliders) (o as Record<string, number>)[s.dataset.s!] = Number(s.value);
    hooks.setOverride(o);
  };
  const pin = (p: Palette | null) => {
    pinned = p;
    backToSky.hidden = !p;
    hooks.setPalette(p);
    if (!p) box.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    syncPickers();
  };

  live.addEventListener('change', () => {
    pushSky();
    syncPickers();
  });
  for (const s of skySliders)
    s.addEventListener('input', () => {
      live.checked = false;
      showValues();
      pushSky();
      if (!pinned) syncPickers();
    });
  box.querySelectorAll<HTMLButtonElement>('[data-p]').forEach((b) =>
    b.addEventListener('click', () => {
      box.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      pin({ ...PALETTES[b.dataset.p!] });
    }),
  );
  backToSky.addEventListener('click', () => pin(null));
  box.addEventListener('input', (e) => {
    const i = e.target as HTMLInputElement;
    const k = (i.dataset.k ?? (i === inkSlider ? 'inkOpacity' : undefined)) as keyof Palette | undefined;
    if (!k) return;
    const P = { ...(pinned ?? hooks.current()) };
    (P as unknown as Record<string, string | number>)[k] = i.type === 'range' ? Number(i.value) : i.value;
    box.querySelectorAll('[data-p]').forEach((x) => x.setAttribute('aria-pressed', 'false'));
    pin(P);
  });
  box.querySelector('.t-copy')!.addEventListener('click', async (e) => {
    const b = e.currentTarget as HTMLButtonElement;
    const json = JSON.stringify(hooks.current(), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      b.textContent = 'Copied';
    } catch {
      console.log(json);
      b.textContent = 'In console';
    }
    setTimeout(() => (b.textContent = 'Copy'), 1500);
  });
  syncPickers();
}
