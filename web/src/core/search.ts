/**
 * Search (docs/ui-controls-brief.md at c2008ecd, "Search keeps the view" and "Views in search").
 *
 * Four groups, in this order: Views (staged City cameras), Stations, Landmarks, Places
 * (neighbourhoods). An empty field lists the Views, then a few places. Pure, so it is tested
 * without the shell.
 */

/** A staged City camera: `cam` is the ?cam= value (x,z,bearing,tilt,distance), `at` an optional
 * Atlanta time of day that sets the scene clock (so the corner then reads Timetable). */
export interface StagedView { id: string; name: string; cam: string; at?: string }

/** First set, all inside City's board (Sam, 2026-11-24). Framed in the review build. */
export const VIEWS: StagedView[] = [
  {id:'north-mayson',name:'Mayson Street beneath the North Line',cam:'1292,-6202,125,62,205'},
  // MARTA's two lines cross underground here: trains show where they surface north and west.
  { id: 'five-points', name: 'Five Points from above, trains crossing', cam: '-60,60,30,30,700' },
  { id: 'gulch', name: 'The Gulch rail yards, looking north', cam: '-330,150,10,62,900' },
  { id: 'capitol', name: 'State Capitol dome', cam: '333,545,-30,55,330' },
  { id: 'centennial', name: 'Centennial Olympic Park toward the skyline', cam: '-157,-712,70,70,900' },
  { id: 'connector-dusk', name: 'Downtown Connector at dusk', cam: '1170,-250,-15,68,800', at: '17:20' },
];

/** Well-known places inside City's board, by their map position (OpenStreetMap). */
export const LANDMARKS: { name: string; lon: number; lat: number }[] = [
  { name: 'Georgia State Capitol', lon: -84.3880, lat: 33.7490 },
  { name: 'Atlanta City Hall', lon: -84.3906, lat: 33.7486 },
  { name: 'Centennial Olympic Park', lon: -84.3933, lat: 33.7603 },
  { name: 'Mercedes-Benz Stadium', lon: -84.4008, lat: 33.7554 },
  { name: 'State Farm Arena', lon: -84.3963, lat: 33.7573 },
  { name: 'Georgia Aquarium', lon: -84.3951, lat: 33.7634 },
  { name: 'World of Coca-Cola', lon: -84.3927, lat: 33.7626 },
  { name: 'SkyView Atlanta', lon: -84.3915, lat: 33.7590 },
  { name: 'Westin Peachtree Plaza', lon: -84.3878, lat: 33.7592 },
  { name: 'Bank of America Plaza', lon: -84.3863, lat: 33.7710 },
  { name: 'Fox Theatre', lon: -84.3856, lat: 33.7726 },
  { name: 'Woodruff Arts Center', lon: -84.3855, lat: 33.7899 },
  { name: 'Piedmont Park', lon: -84.3738, lat: 33.7851 },
];

export type Group = 'Views' | 'Stations' | 'Landmarks' | 'Places';
export interface Hit { group: Group; name: string; lon: number; lat: number; view?: StagedView }

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const matches = (name: string, q: string) => !q || q.split(' ').every((w) => norm(name).split(' ').some((n) => n.startsWith(w)));

const PER_GROUP: Record<Group, number> = { Views: 5, Stations: 5, Landmarks: 5, Places: 6 };

/**
 * Grouped results for `text`. `viewAt` gives a View's map position (from its camera target).
 * Empty text: the Views, then a few places, as the brief's empty state.
 */
export function search(text: string, sources: {
  stations: readonly { name: string; lon: number; lat: number }[];
  places: (q: string) => readonly { name: string; lon: number; lat: number }[];
  viewAt: (v: StagedView) => { lon: number; lat: number };
}): Hit[] {
  const q = norm(text);
  const out: Hit[] = [];
  const add = (group: Group, items: readonly { name: string; lon: number; lat: number; view?: StagedView }[]) => {
    const seen = new Set<string>();
    for (const it of items) {
      if (out.filter((h) => h.group === group).length >= PER_GROUP[group]) break;
      if (!matches(it.name, q) || seen.has(norm(it.name))) continue;
      seen.add(norm(it.name));
      out.push({ group, ...it });
    }
  };
  add('Views', VIEWS.map((v) => ({ name: v.name, ...sources.viewAt(v), view: v })));
  if (q) {
    add('Stations', sources.stations);
    add('Landmarks', LANDMARKS);
  }
  add('Places', sources.places(text));
  return out;
}
