// The variants of the backdrop, each one whole SVG document per mood of Pip's and side it
// stands on, built the first time it's drawn.

import { diorama, type Mood, type Side } from './pip'
import { scene } from './sky'
import { draw, earthPaint, orbit, ORBIT_KEYFRAMES, solarSystem } from './solar'
import { ball, Shades } from './voxel'

export type { Mood, Side } from './pip'

/**
 * Pip's corner on each side. On the right, low in the margin beside the conversation, even in
 * a wide window. On the left, in the strip between the app's sidebar and the conversation,
 * which a panel open on the right leaves clear, below the sun of the solar variant.
 */
const PIP_SPOT: Record<Side, { x: number; y: number; scale: number }> = {
  right: { x: 1385, y: 700, scale: 0.85 },
  left: { x: 345, y: 765, scale: 0.85 },
}

/**
 * The Earth in voxels, high on the left, for the earth variant, the Moon turning around it
 * on a tilted orbit and passing behind it on the far half.
 */
function voxelEarth(): { css: string; defs: string; body: string } {
  const x = 345
  const y = 210
  const r = 5.6
  /** Pixels per voxel: the Earth is made bigger by its voxels, not by more of them, which keeps the scene's size. */
  const unit = 10
  const shades = new Shades()
  const moon = orbit('<use href="#big-moon"/>', 100, 48, 0.15, 'big-moon')
  // Drawn first: the shades they use make the style.
  const defs =
    `<g class="vox"><g id="big-earth">${draw(ball(r, earthPaint(r, 0.35, 0.86)), unit, shades)}</g>` +
    `<g id="big-moon">${draw(ball(1.7, () => 'mo'), 8, shades)}</g>` +
    `<clipPath id="big-earth-top"><rect x="-80" y="-80" width="160" height="80"/></clipPath></g>`
  return {
    css: ORBIT_KEYFRAMES + moon.css + shades.rules(),
    defs,
    body:
      `<g transform="translate(${x} ${y})"><use href="#big-earth"/>${moon.body}` +
      `<use href="#big-earth" clip-path="url(#big-earth-top)"/></g>`,
  }
}

export const VARIANTS = {
  earth: {
    summary: 'Pip on its asteroid among drifting stars, the Earth in view',
    alt: 'Pip, a small coral voxel creature with glowing antennae, standing on a floating asteroid among drifting stars, the Earth and its Moon in the distance',
    build: (mood: Mood, side: Side) =>
      scene([voxelEarth(), diorama({ spot: PIP_SPOT[side], side, turn: 32, mood })], { drift: { x: 560, y: 330, count: 56 } }),
  },
  solar: {
    summary: 'the solar system turning, with Pip watching',
    alt: 'A voxel solar system: the sun on the left and eight planets on slow tilted orbits, with Pip on an asteroid in the corner',
    build: (mood: Mood, side: Side) => scene([solarSystem(), diorama({ spot: PIP_SPOT[side], side, turn: 24, mood })], { stars: 120 }),
  },
} satisfies Record<string, { summary: string; alt: string; build: (mood: Mood, side: Side) => string }>

export type VariantId = keyof typeof VARIANTS

export const VARIANT_IDS = Object.keys(VARIANTS) as VariantId[]

const built = new Map<string, string>()

/** A variant's SVG, with Pip in one of its moods on one side, built once. */
export function svgOf(id: VariantId, mood: Mood, side: Side): string {
  const key = `${id}-${mood}-${side}`
  let svg = built.get(key)
  if (svg === undefined) {
    svg = VARIANTS[id].build(mood, side)
    built.set(key, svg)
  }
  return svg
}
