import { SURFACE_KINDS, type SurfaceKind } from './glsl';

/**
 * The shared material library. A surface is a pattern plus a suggested base colour; the
 * landmark still draws in its own vertex colour, which the pattern keeps as its mean.
 *
 *   shell.paint(surfaces.agedCopper(), () => hip(...));
 *   shell.paint(surfaces.brick({ colour: 'deepRed', bond: 'flemish' }), () => shell.prism(...));
 *
 * Landmarks pick materials from here first. Add a new material only when photographs show
 * something these cannot cover, and give it a swatch in the model lab's Materials section.
 */
export interface Surface {
  readonly name: string;
  readonly kind: SurfaceKind;
  /** A suggested base colour (sRGB hex), from the palettes below. */
  readonly colour: string;
  /** The per-vertex surface: kind index, p1, strength, p2 (see glsl.ts for each kind). */
  readonly data: readonly [number, number, number, number];
}

/** Base colours seen in Atlanta photographs, shared with the residential and landmark code. */
export const PALETTE = {
  brick: { commonRed: '#a5553b', deepRed: '#7e3a2f', brown: '#6f4a38', buff: '#c9ad84', painted: '#e6e2d8' },
  stucco: { cream: '#e8dec8', blush: '#dcc0ab', ochre: '#d8bd86' },
  limestone: { indiana: '#d6ccb9', warm: '#dcd2c0' },
  precast: { light: '#d4cfc4', warm: '#cbbfa9' },
  granite: { pink: '#ccaea0', grey: '#9c9a96' },
  glass: { blueGreen: '#5f8288', silver: '#8f9fa9', bronze: '#6d6558', blue: '#56708a' },
  copper: { verdigris: '#7fae9c', muted: '#86a596', brown: '#7c6a52' },
  slate: { grey: '#5d6168', purple: '#5e5866' },
  terracotta: { red: '#b5653f', clay: '#c27a4e' },
  clapboard: { white: '#f1eee6', cream: '#e8dfc8', sage: '#b5bf9c' },
  shingle: { cedar: '#7a6048', weathered: '#8a8780' },
  concrete: { light: '#c4bfb5', board: '#b2ada3' },
  asphalt: { charcoal: '#55575a', weathered: '#6b6a66', brown: '#5e5348' },
} as const;

export type Bond = 'running' | 'flemish' | 'stack' | 'english';
const BONDS: Bond[] = ['running', 'flemish', 'stack', 'english'];

function surface(name: string, kind: SurfaceKind, colour: string, p1 = 0, strength = 1, p2 = 0): Surface {
  return { name, kind, colour, data: [SURFACE_KINDS.indexOf(kind), p1, strength, p2] };
}

type Of<K extends keyof typeof PALETTE> = keyof typeof PALETTE[K];

/** Each factory takes an optional palette colour and `strength` (1 is the calm default). */
export const surfaces = {
  /** 215 x 65 mm brick with 10 mm joints. Painted brick reads with joints of its own colour. */
  brick(o: { colour?: Of<'brick'>; bond?: Bond; strength?: number; darkJoints?: boolean } = {}) {
    const colour = o.colour ?? 'commonRed', painted = colour === 'painted';
    return surface(`brick:${colour}:${o.bond ?? 'running'}`, 'brick', PALETTE.brick[colour], BONDS.indexOf(o.bond ?? 'running'),
      (o.strength ?? 1) * (painted ? .5 : 1), o.darkJoints || painted ? -1 : 1);
  },
  stucco(o: { colour?: Of<'stucco'>; strength?: number } = {}) {
    return surface(`stucco:${o.colour ?? 'cream'}`, 'stucco', PALETTE.stucco[o.colour ?? 'cream'], 0, o.strength ?? 1);
  },
  /** Coursed limestone ashlar; `course` is the block height in metres. */
  limestone(o: { colour?: Of<'limestone'>; course?: number; strength?: number } = {}) {
    return surface(`limestone:${o.colour ?? 'indiana'}`, 'ashlar', PALETTE.limestone[o.colour ?? 'indiana'], o.course ?? .6, o.strength ?? 1);
  },
  /** Precast concrete panels `width` x `height` metres with darker reveals. */
  precast(o: { colour?: Of<'precast'>; width?: number; height?: number; strength?: number } = {}) {
    return surface(`precast:${o.colour ?? 'light'}`, 'precast', PALETTE.precast[o.colour ?? 'light'], o.width ?? 1.5, o.strength ?? 1, o.height ?? 3);
  },
  /** Flame-finished granite ashlar, pink or grey. */
  granite(o: { colour?: Of<'granite'>; course?: number; strength?: number } = {}) {
    return surface(`granite:${o.colour ?? 'grey'}`, 'granite', PALETTE.granite[o.colour ?? 'grey'], o.course ?? .75, o.strength ?? 1);
  },
  /** A glass curtain wall: mullions every `mullion` m, a spandrel band every `floor` m. */
  curtainGlass(o: { tint?: Of<'glass'>; mullion?: number; floor?: number; strength?: number } = {}) {
    return surface(`glass:${o.tint ?? 'blueGreen'}`, 'curtain-glass', PALETTE.glass[o.tint ?? 'blueGreen'], o.mullion ?? 1.5, o.strength ?? 1, o.floor ?? 4);
  },
  /** Muted, uneven, streaked verdigris with standing seams every `seam` m (0: the model draws its own). */
  agedCopper(o: { colour?: Of<'copper'>; seam?: number; strength?: number } = {}) {
    return surface(`copper:${o.colour ?? 'verdigris'}`, 'aged-copper', PALETTE.copper[o.colour ?? 'verdigris'], o.seam ?? .5, o.strength ?? 1);
  },
  slate(o: { colour?: Of<'slate'>; strength?: number } = {}) {
    return surface(`slate:${o.colour ?? 'grey'}`, 'slate', PALETTE.slate[o.colour ?? 'grey'], 0, o.strength ?? 1);
  },
  terracottaTile(o: { colour?: Of<'terracotta'>; strength?: number } = {}) {
    return surface(`terracotta:${o.colour ?? 'red'}`, 'terracotta-tile', PALETTE.terracotta[o.colour ?? 'red'], 0, o.strength ?? 1);
  },
  clapboard(o: { colour?: Of<'clapboard'>; strength?: number } = {}) {
    return surface(`clapboard:${o.colour ?? 'white'}`, 'clapboard', PALETTE.clapboard[o.colour ?? 'white'], 0, o.strength ?? 1);
  },
  shingle(o: { colour?: Of<'shingle'>; strength?: number } = {}) {
    return surface(`shingle:${o.colour ?? 'cedar'}`, 'shingle', PALETTE.shingle[o.colour ?? 'cedar'], 0, o.strength ?? 1);
  },
  /** Cast-in-place concrete with lift lines every `lift` m. */
  concrete(o: { colour?: Of<'concrete'>; lift?: number; strength?: number } = {}) {
    return surface(`concrete:${o.colour ?? 'light'}`, 'concrete', PALETTE.concrete[o.colour ?? 'light'], o.lift ?? 1.2, o.strength ?? 1);
  },
  asphaltRoof(o: { colour?: Of<'asphalt'>; strength?: number } = {}) {
    return surface(`asphalt:${o.colour ?? 'charcoal'}`, 'asphalt-roof', PALETTE.asphalt[o.colour ?? 'charcoal'], 0, o.strength ?? 1);
  },
} as const;

/** No pattern: the plain vertex colour. Used to keep window quads flat inside a painted wall. */
export const FLAT: Surface = { name: 'flat', kind: 'none', colour: '#ffffff', data: [0, 0, 0, 0] };

/** One default instance of every material, for swatches and tests. */
export function catalogue(): Surface[] {
  return [
    surfaces.brick(), surfaces.brick({ colour: 'deepRed', bond: 'flemish' }), surfaces.brick({ colour: 'buff', bond: 'english' }),
    surfaces.brick({ colour: 'painted' }), surfaces.stucco(), surfaces.limestone(), surfaces.precast(),
    surfaces.granite({ colour: 'pink' }), surfaces.granite(), surfaces.curtainGlass(), surfaces.curtainGlass({ tint: 'silver' }),
    surfaces.agedCopper(), surfaces.slate(), surfaces.terracottaTile(), surfaces.clapboard(), surfaces.shingle(),
    surfaces.concrete(), surfaces.asphaltRoof(),
  ];
}
