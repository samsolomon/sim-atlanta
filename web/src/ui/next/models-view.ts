/**
 * A2c Models view: the Model lab (models/main.ts, markup in models/lab-markup.ts) inside the app,
 * in the same four places as Map and City:
 *   - top-left: the model card (name ⌄ to browse, ‹ › through its category, one line, position)
 *   - right: Details (the lab's own controls, re-homed; "Compare with a photo" only with ?dev)
 *   - left, on demand: the browser (search, category chips with counts, grouped list)
 * Nothing here copies the catalogue: it reads the lab's [data-model] buttons and clicks them, so
 * entries other agents add keep working.
 */
const SVG = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const X = SVG('<path d="M6 6l12 12M18 6L6 18"/>');

/** A small swatch per model, coloured by the kind of service (never the agency). */
export function swatchFor(group: string, id: string): string {
  if (/freight|cm44|ac44/i.test(id)) return 'var(--freight)';
  if (/xn40|xe60|bus/i.test(id)) return 'var(--bus)';
  if (/cq400|s70|streetcar|marta/i.test(id)) return 'var(--city-rail)';
  if (/^vehicles$/i.test(group)) return 'var(--intercity)';
  if (/^trees$/i.test(group)) return '#5f8f3e';
  if (/^people$/i.test(group)) return '#8a8479';
  return '#b8a98c';
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  e.innerHTML = html;
  return e;
}

export function mountModelsView(root: HTMLElement, opts: { dev: boolean }) {
  root.classList.add('a2-lab');
  const title = root.querySelector<HTMLElement>('#title')!;
  const blurb = root.querySelector<HTMLElement>('#blurb')!;
  const settings = root.querySelector<HTMLElement>('.settings')!;
  const buttons = () => [...root.querySelectorAll<HTMLButtonElement>('.library [data-model]')];
  const groupOf = (b: HTMLElement) => b.closest('.model-group')?.querySelector('h2')?.textContent?.trim() ?? 'Models';
  const current = () => buttons().find((b) => b.getAttribute('aria-pressed') === 'true') ?? buttons()[0];

  // ---- model card (top-left) ----
  const card = el('section', { class: 'a2-model-card a2-g', 'aria-label': 'Model' });
  // The lab writes the model name into its <h2 id="title">. A heading can't sit inside a button,
  // so the heading stays (visually hidden) and the button mirrors its text.
  const nameBtn = el('button', { type: 'button', class: 'a2-model-name', 'aria-expanded': 'false', 'aria-controls': 'a2-browser' });
  const nameText = el('span', { class: 'a2-model-title' });
  nameBtn.append(nameText, el('span', { class: 'a2-caret', 'aria-hidden': 'true' }, SVG('<path d="M6 9l6 6 6-6"/>')));
  title.classList.add('a2-sr');
  const mirror = () => { nameText.textContent = title.textContent; nameBtn.setAttribute('aria-label', `${title.textContent}. Browse models`); };
  new MutationObserver(mirror).observe(title, { childList: true, characterData: true, subtree: true });
  mirror();
  const prev = el('button', { type: 'button', class: 'a2-ib a2-step', 'aria-label': 'Previous model in this category' }, SVG('<path d="M15 6l-6 6 6 6"/>'));
  const next = el('button', { type: 'button', class: 'a2-ib a2-step', 'aria-label': 'Next model in this category' }, SVG('<path d="M9 6l6 6-6 6"/>'));
  const head = el('div', { class: 'a2-model-head' });
  head.append(nameBtn, el('span', { class: 'a2-model-steps' }));
  head.lastElementChild!.append(prev, next);
  const pos = el('p', { class: 'a2-model-pos' });
  const detailsBtn = el('button', { type: 'button', class: 'a2-btn a2-details-btn', 'aria-expanded': 'false', 'aria-controls': 'a2-model-details' }, 'Details');
  card.append(title, head, blurb, pos, detailsBtn);

  // ---- Details (right): the lab's controls, re-homed ----
  const details = el('aside', { class: 'a2-model-details a2-g a2-long', id: 'a2-model-details', 'aria-label': 'Details' });
  details.innerHTML = `<div class="a2-panel-head"><h2>Details</h2><button type="button" class="a2-x a2-details-close" data-close aria-label="Close">${X}</button></div>`;
  details.append(settings);
  // "Compare with a photo" is a modelling tool: only with ?dev. Kept in the DOM either way.
  const photo = settings.querySelector('#file')?.closest('fieldset');
  if (photo) {
    photo.hidden = !opts.dev;
    photo.querySelector('legend')!.textContent = 'Compare with a photo';
  }

  // ---- browser (left) ----
  const browser = el('section', { class: 'a2-browser a2-g a2-long', id: 'a2-browser', hidden: '', 'aria-label': 'Browse models' });
  browser.innerHTML = `
    <div class="a2-panel-head"><h2>Models</h2><button type="button" class="a2-x" data-close aria-label="Close">${X}</button></div>
    <input type="search" class="a2-search" placeholder="Search models" aria-label="Search models">
    <div class="a2-chips" role="group" aria-label="Category"></div>
    <div class="a2-model-list"></div>`;
  const search = browser.querySelector<HTMLInputElement>('.a2-search')!;
  const chips = browser.querySelector<HTMLElement>('.a2-chips')!;
  const list = browser.querySelector<HTMLElement>('.a2-model-list')!;
  let category = 'All';
  function renderBrowser() {
    const all = buttons();
    const groups = [...new Set(all.map(groupOf))];
    chips.innerHTML = ['All', ...groups].map((g) => {
      const n = g === 'All' ? all.length : all.filter((b) => groupOf(b) === g).length;
      return `<button type="button" class="a2-chip" aria-pressed="${g === category}" data-cat="${g}">${g} <span>${n}</span></button>`;
    }).join('');
    const q = search.value.trim().toLowerCase();
    list.replaceChildren();
    for (const g of groups) {
      if (category !== 'All' && g !== category) continue;
      const rows = all.filter((b) => groupOf(b) === g && (!q || b.textContent!.toLowerCase().includes(q)));
      if (!rows.length) continue;
      list.append(el('p', { class: 'a2-h' }, g));
      for (const b of rows) {
        const row = el('button', { type: 'button', class: 'a2-model-row', 'aria-current': String(b === current()) });
        row.append(el('span', { class: 'a2-thumb', style: `background:${swatchFor(g, b.dataset.model ?? '')}`, 'aria-hidden': 'true' }), el('span', {}, ''));
        row.lastElementChild!.textContent = b.textContent;
        row.addEventListener('click', () => {
          b.click();
          if (innerWidth < 1280) { closeBrowser(); nameBtn.focus(); }
        });
        list.append(row);
      }
    }
    if (!list.children.length) list.append(el('p', { class: 'a2-empty' }, 'No models match.'));
  }
  chips.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cat]');
    if (!c) return;
    category = c.dataset.cat!;
    renderBrowser();
  });
  search.addEventListener('input', renderBrowser);
  const layout = () => document.dispatchEvent(new Event('lab-layout'));
  const openBrowser = (focus = true) => {
    browser.hidden = false;
    nameBtn.setAttribute('aria-expanded', 'true');
    renderBrowser();
    if (focus) search.focus();
    layout();
  };
  const closeBrowser = () => {
    browser.hidden = true;
    nameBtn.setAttribute('aria-expanded', 'false');
    layout();
  };
  nameBtn.addEventListener('click', () => (browser.hidden ? openBrowser() : closeBrowser()));
  browser.querySelector('[data-close]')!.addEventListener('click', () => {
    closeBrowser();
    nameBtn.focus();
  });

  // ---- step through the category, and the position line ----
  const step = (d: 1 | -1) => {
    const cur = current();
    if (!cur) return;
    const same = buttons().filter((b) => groupOf(b) === groupOf(cur));
    same[(same.indexOf(cur) + d + same.length) % same.length]?.click();
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  const renderPos = () => {
    const cur = current();
    if (!cur) return;
    const same = buttons().filter((b) => groupOf(b) === groupOf(cur));
    pos.textContent = `${groupOf(cur)} · ${same.indexOf(cur) + 1} of ${same.length}`;
    prev.hidden = next.hidden = same.length < 2;
    if (!browser.hidden) list.querySelectorAll<HTMLElement>('.a2-model-row').forEach((r) => r.setAttribute('aria-current', String(r.textContent === cur.textContent)));
  };
  new MutationObserver(renderPos).observe(root.querySelector('.library')!, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'], childList: true });
  renderPos();

  // ---- phones: Details is a button on the card, opening a sheet ----
  const setDetails = (open: boolean) => {
    details.classList.toggle('a2-open', open);
    detailsBtn.setAttribute('aria-expanded', String(open));
    layout();
  };
  detailsBtn.addEventListener('click', () => setDetails(!details.classList.contains('a2-open')));
  details.querySelector('[data-close]')!.addEventListener('click', () => {
    setDetails(false);
    detailsBtn.focus();
  });

  root.append(card, details, browser, detailsBtn);
  if (innerWidth >= 1280) openBrowser(false);
  new ResizeObserver(() => {
    root.style.setProperty('--model-card-bottom', card.getBoundingClientRect().bottom + 'px');
    layout();
  }).observe(card);
  return {
    /** Escape: close the browser, then the phone Details sheet. */
    escape(): boolean {
      if (!browser.hidden) {
        closeBrowser();
        nameBtn.focus();
        return true;
      }
      if (details.classList.contains('a2-open')) {
        setDetails(false);
        return true;
      }
      return false;
    },
    enter() { if (innerWidth >= 1280) openBrowser(false); else closeBrowser(); setDetails(false); },
    openBrowser,
    model: () => current()?.dataset.model ?? null,
    /** Reset view: choose the current model again, which returns to its opening view. */
    reset: () => current()?.click(),
  };
}
