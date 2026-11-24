/**
 * A2c is the interface (Sam, 2026-11-23). `?ui=classic` brings back the previous shell for ONE
 * release as an escape hatch; delete it, `ui/shell.ts`, and the classic-only markup in index.html
 * in the release after this one. Old `?ui=next` links keep working: they are A2c too.
 */
export const uiClassic = (search: string) => new URLSearchParams(search).get('ui') === 'classic';
export const uiNext = (search: string) => !uiClassic(search);
