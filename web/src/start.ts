import './style.css';
import { initialView } from './core/initial-view';
// The A2c interface's stylesheets key off data-ui; set it before anything paints.
document.documentElement.dataset.ui = 'next';

const landing = initialView(location.search, location.hash);
const city = document.getElementById('view3d')!;
const loading = document.getElementById('city-loading')!;
if (landing === 'city') {
  city.hidden = false;
  loading.hidden = false;
  const map = document.getElementById('early-map') as HTMLAnchorElement;
  const url = new URL(location.href);
  url.searchParams.set('view', 'map');
  map.href = url.href;
  map.hidden = false;
}

// Paint the opening plate while the transit data and interactive shell load.
void import('./main').catch(() => {
  city.hidden = false;
  loading.hidden = false;
  document.getElementById('city-progress')!.textContent = 'Atlanta couldn’t load. Check your connection and reload.';
});
