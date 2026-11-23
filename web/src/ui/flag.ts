/** The A2c interface is opt-in with `?ui=next` until it replaces the current one. */
export const uiNext = (search: string) => new URLSearchParams(search).get('ui') === 'next';
