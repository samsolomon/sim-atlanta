import type { View } from '../ui/shell';

export function initialView(search: string, hash: string): View {
  const params = new URLSearchParams(search);
  const view = params.get('view');
  if (view === 'city' || view === '3d') return 'city';
  // Models is a view of the A2c interface; the classic shell keeps /models.html.
  if (view === 'models' && params.get('ui') !== 'classic') return 'models';
  // Existing MapLibre bookmarks and map palette tools keep their original view.
  if (view === 'map' || /^#-?[\d.]+\/-?[\d.]+\/-?[\d.]+(?:\/|$)/.test(hash)
    || params.has('tune') || params.has('palette')) return 'map';
  return 'city';
}
