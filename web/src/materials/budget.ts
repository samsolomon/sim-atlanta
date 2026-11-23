/**
 * Texture memory, by source file. Every file under web/src that constructs a texture must be
 * listed here with its estimated GPU bytes (width x height x 4, plus a third for mipmaps), and
 * budget.test.ts fails when a file that is not listed makes one or a budget is exceeded.
 *
 * Bytes were measured in the City (high tier, Studio, 2026-11-23) by walking the scene's
 * materials. Nothing in the stack uses GPU-compressed formats yet: three 0.180 ships the KTX2 /
 * Basis loader and transcoder, but every texture here is generated at runtime, so the library
 * stays procedural (0 bytes) instead.
 */
export type TextureBucket = 'library' | 'building' | 'other';

export interface TextureSource { bytes: number; bucket: TextureBucket; note: string }

/** The library's own atlases. It has none: every material is a shader pattern. */
export const LIBRARY_TEXTURE_BUDGET = 1 << 20;
/** Landmark facades, lettering and signs together. */
export const BUILDING_TEXTURE_BUDGET = 40 << 20;

export const TEXTURE_SOURCES: Record<string, TextureSource> = {
  'city/brookwood.ts': { bytes: 14_905_388, bucket: 'building', note: 'painted masonry canvases at 64 px/m, map + emissive; candidate for the library' },
  'city/johnson-burgee.ts': { bytes: 6_248_448, bucket: 'building', note: 'granite window atlases: One Atlantic 864x540 and 191 Peachtree 216x552, map + emissive' },
  'city/georgia-aquarium.ts': { bytes: 3_495_252, bucket: 'building', note: '4 bands 1024x160' },
  'city/world-of-coca-cola.ts': { bytes: 1_747_627, bucket: 'building', note: '1024x320' },
  'city/fulton-government-center.ts': { bytes: 1_638_399, bucket: 'building', note: '3 x 1024x100' },
  'city/rhodes-haverty.ts': { bytes: 1_048_576, bucket: 'building', note: '256x768' },
  'city/auburn-signs.ts': { bytes: 1_048_576, bucket: 'building', note: '2 signs x 256x192, map + glow' },
  'city/midtown-skyline-symphony.ts': { bytes: 983_040, bucket: 'building', note: '1180 curtain wall 384x240, map + emissive' },
  'city/westin.ts': { bytes: 699_050, bucket: 'building', note: '256x256, map + emissive' },
  'city/peachtree-center.ts': { bytes: 699_050, bucket: 'building', note: '256x256 shared by three towers, map + emissive' },
  'city/citizens-trust.ts': { bytes: 699_051, bucket: 'building', note: '1536x64 and 512x64 lettering' },
  'city/georgia-power.ts': { bytes: 349_525, bucket: 'building', note: '128x128 glazing + 512x64 lettering' },
  'city/football-hall.ts': { bytes: 283_989, bucket: 'building', note: '512x104' },
  'city/one-park-tower.ts': { bytes: 262_144, bucket: 'building', note: '512x96' },
  'city/altitude-apartments.ts': { bytes: 218_453, bucket: 'building', note: '512x80' },
  'city/truist-plaza.ts': { bytes: 174_762, bucket: 'building', note: '128x128, map + emissive' },
  'city/equitable.ts': { bytes: 174_763, bucket: 'building', note: '512x64 lettering' },
  'city/candler.ts': { bytes: 147_456, bucket: 'building', note: '384x72' },
  'city/grady.ts': { bytes: 136_533, bucket: 'building', note: '320x80 lettering' },
  'city/hilton-atlanta.ts': { bytes: 131_072, bucket: 'building', note: '256x96 lettering' },
  'city/ritz-carlton-atlanta.ts': { bytes: 131_072, bucket: 'building', note: '512x48' },
  'city/skyline-reflection.ts': { bytes: 131_072, bucket: 'building', note: '128x64 panoramas borrowed by mirrored glass' },
  'city/midtown-marta-vents.ts': { bytes: 2_663_648, bucket: 'other', note: 'Electric Saturation mural' },
  'city/figure-looks.ts': { bytes: 1_536, bucket: 'other', note: 'street figure palette' },
  'terrain/ground-map.ts': { bytes: 420_000_000, bucket: 'other', note: 'terrain ground maps, up to 5735x1639 and 4096x4096 (routed to the terrain owner)' },
  'terrain/transport.ts': { bytes: 43_692, bucket: 'other', note: 'freight track 128x16' },
  'trees/ginkgo-variants.ts': { bytes: 0, bucket: 'other', note: 'leaf atlas (lab and opt-in variants)' },
  'vignette/ink.ts': { bytes: 4, bucket: 'other', note: '1x1 empty mask' },
  'vignette/traffic.ts': { bytes: 0, bucket: 'other', note: 'headlight beam, East Portal only' },
  'vignette/world.ts': { bytes: 0, bucket: 'other', note: 'East Portal canvases' },
};

export function bucketBytes(bucket: TextureBucket) {
  return Object.values(TEXTURE_SOURCES).filter(s => s.bucket === bucket).reduce((sum, s) => sum + s.bytes, 0);
}
