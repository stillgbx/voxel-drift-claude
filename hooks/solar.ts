// The solar system: a voxel sun on the left and its eight planets on slow, tilted orbits that
// sweep across the window, with their main moons: the Moon, Jupiter's four Galilean moons,
// Titan and Triton.
//
// Each planet is rendered once, in voxels, into <defs>, and an orbit is CSS alone: a group
// squashed into an ellipse turns, carrying the planet out at its radius, and an inner group
// turns back and unsquashes it, so the planet stays upright and round. To pass behind the
// sun, a copy of the sun's upper half is drawn over every planet: on the far half of an
// orbit (above the sun's middle) a planet goes under it, on the near half over it.

import { at } from './sky'
import { ball, MATERIALS, random, render, Shades, type MaterialId, type Voxel } from './voxel'

/** The sun, in the strip on the left that stays clear whether the app's sidebar shows or not. */
const SUN = { x: 360, y: 470, r: 6.5, unit: 7.5 }
/** How flat the orbits look: their height over their width. */
const TILT = 0.3

type Planet = {
  id: string
  /** Radius in voxels, and pixels per voxel. */
  r: number
  unit: number
  /** The orbit's half width, in pixels, and one turn, in seconds. */
  orbit: number
  period: number
  paint: (x: number, y: number, z: number) => MaterialId
  /** Extra voxels, such as Saturn's ring, and how far out they reach, in voxels. */
  extra?: () => Voxel[]
  reach?: number
  /** Its main moons, innermost first. */
  moons?: Moon[]
}

/**
 * A moon: a small cube of voxels (a ball under 1.66 voxels across is eight of them), sized by
 * its pixels per voxel, on an orbit around its planet. Each takes a material a planet already
 * uses, which adds no colors to the style. Triton turns the other way round, as it does.
 */
type Moon = { id: string; m: MaterialId; unit: number; orbit: number; period: number; retrograde?: boolean }

/** Land on the Earth: a few overlapping waves, so continents read at a glance. */
const land = (x: number, y: number, z: number): number =>
  Math.sin(x * 1.1 + z * 0.4) + Math.sin(y * 1.3 - x * 0.7 + 1) + Math.sin(z * 1.2 + y * 0.5 + 2)

/**
 * The Earth's paint for a ball of radius `r`: oceans, the same continents at any size, ice
 * caps. `shore` sets how much is land: lower, more; a large Earth shows the detail of more.
 */
export const earthPaint =
  (r: number, shore = 0.9, ice = 0.79) =>
  (x: number, y: number, z: number): MaterialId => {
    const k = 2.8 / r
    return Math.abs(y) > r * ice ? 'ic' : land(x * k, y * k, z * k) > shore ? 'la' : 'oc'
  }

const ring = (inner: number, outer: number): Voxel[] => {
  const voxels: Voxel[] = []
  const n = Math.ceil(outer)
  for (let x = -n; x < n; x++) {
    for (let z = -n; z < n; z++) {
      const d = Math.hypot(x + 0.5, z + 0.5)
      if (d >= inner && d <= outer) voxels.push({ x, y: 0, z, m: 'ri' })
    }
  }
  return voxels
}

const PLANETS: Planet[] = [
  { id: 'mercury', r: 1.6, unit: 5, orbit: 95, period: 38, paint: () => 'me' },
  { id: 'venus', r: 2.4, unit: 5, orbit: 140, period: 62, paint: () => 've' },
  {
    id: 'earth',
    r: 2.8,
    unit: 5,
    orbit: 200,
    period: 96,
    paint: earthPaint(2.8),
    moons: [{ id: 'moon', m: 'mo', unit: 5, orbit: 24, period: 14 }],
  },
  { id: 'mars', r: 2, unit: 5, orbit: 265, period: 150, paint: (x, y, z) => (y > 1.4 ? 'ic' : 'ma') },
  {
    id: 'jupiter',
    r: 5.2,
    unit: 4.6,
    orbit: 390,
    period: 290,
    paint: (x, y, z) => (Math.abs(y + 1.5) < 0.8 && x > 0.5 && x < 2.6 && z > 2 ? 'js' : Math.floor(y * 0.9 + 10) % 2 === 0 ? 'ja' : 'jb'),
    // The four Galilean moons: Io, Europa, Ganymede, Callisto.
    moons: [
      { id: 'io', m: 've', unit: 3.4, orbit: 34, period: 9 },
      { id: 'europa', m: 'ic', unit: 3, orbit: 43, period: 13 },
      { id: 'ganymede', m: 'me', unit: 4.4, orbit: 54, period: 19 },
      { id: 'callisto', m: 'mo', unit: 4, orbit: 66, period: 27 },
    ],
  },
  {
    id: 'saturn',
    r: 4.2,
    unit: 4.6,
    orbit: 540,
    period: 450,
    paint: () => 'sa',
    extra: () => ring(5.6, 8),
    reach: 8,
    moons: [{ id: 'titan', m: 'ja', unit: 4.4, orbit: 50, period: 21 }],
  },
  { id: 'uranus', r: 3.2, unit: 4.6, orbit: 700, period: 660, paint: () => 'ur' },
  {
    id: 'neptune',
    r: 3.1,
    unit: 4.6,
    orbit: 860,
    period: 880,
    paint: () => 'ne',
    moons: [{ id: 'triton', m: 'ic', unit: 3.4, orbit: 25, period: 15, retrograde: true }],
  },
]

const at0 = { x: 0, y: 0, z: 0 }

/** The turns every `orbit` runs on: once, in a scene's style. */
export const ORBIT_KEYFRAMES = '@keyframes orbit{to{transform:rotate(-360deg)}}@keyframes counter{to{transform:rotate(360deg)}}'

/** A ball, and what it carries, drawn about (0, 0). */
export function draw(voxels: Voxel[], unit: number, shades: Shades): string {
  return render(voxels, { yaw: 0.5, center: at0, origin: [0, 0], unit }, shades)
}

/**
 * An orbit: `content` turns about (0, 0) at `radius` once every `period` seconds, starting
 * `phase` of the way round, along an ellipse `TILT` as tall as it is wide.
 */
export function orbit(content: string, radius: number, period: number, phase: number, id: string): { css: string; body: string } {
  const delay = -(phase * period).toFixed(1)
  const css = `.o-${id}{animation:orbit ${period}s linear infinite;${at(delay)}}.c-${id}{animation:counter ${period}s linear infinite;${at(delay)}}`
  const body =
    `<g transform="scale(1 ${TILT})"><g class="o-${id}"><g transform="translate(${radius} 0)">` +
    `<g class="c-${id}"><g transform="scale(1 ${+(1 / TILT).toFixed(4)})">${content}</g></g>` +
    `</g></g></g>`
  return { css, body }
}

/** The solar system, as a layer for `scene`. */
export function solarSystem(): { defs: string; css: string; body: string } {
  const shades = new Shades()
  // Its own random, so every drawing (one per mood of Pip's) starts the planets at the same
  // places: a redraw then finds each where the clock says, with no jump.
  const rnd = random(23)
  let defs = ''
  let css =
    ORBIT_KEYFRAMES +
    '.orbits ellipse{fill:none;stroke:var(--orbit);stroke-width:1.2}' +
    // The glow, as Pip's asteroid has: bright along the sun's outline, in two soft shadows of
    // light, then a wide, faint halo fading out with no edge, breathing slowly.
    '.vd{--glow-near:light-dark(#ffb04a8c,#ffae4aa0);--glow-far:light-dark(#ffb04a3a,#ff9d3d4d)}' +
    '.sunlit{filter:drop-shadow(0 0 5px var(--glow-near)) drop-shadow(0 0 22px var(--glow-far))}' +
    '.co-a{stop-color:var(--corona);stop-opacity:.22}.co-m{stop-color:var(--corona);stop-opacity:.09}.co-b{stop-color:var(--corona);stop-opacity:0}' +
    `.sun{animation:breathe 11s ease-in-out infinite alternate;${at(0)};transform-box:fill-box;transform-origin:center}` +
    '@keyframes breathe{to{transform:scale(1.04);opacity:.85}}'

  // The sun: a glowing ball with three sets of flares, each fading into the surface and back
  // in turn, so its face seems to boil. Only colors move: the shape is drawn once. The faces
  // sit in the drawing both copies of the sun `<use>`, so each change of color restyles both
  // copies: the color moves in small steps, a few a second, rather than every frame. (The app
  // takes no `@property`: a number animated on the copies instead left the flares black and
  // the whole scene still.)
  const sun = ball(SUN.r, (x, y, z) =>
    Math.sin(x * 2.1) + Math.sin(y * 1.7 + z) > 1.2
      ? 'sf'
      : Math.sin(z * 1.9 + y * 0.8) + Math.sin(x * 1.3 - y * 1.1 + 2) > 1.25
        ? 'sg'
        : Math.sin(y * 2.3 - z * 0.9 + 1) + Math.sin(x * 1.6 + z * 1.4 + 4) > 1.25
          ? 'sh'
          : 'su',
  )
  const flares = (m: string): string => Array.from({ length: 10 }, (_, k) => `.${m}${k}`).join(',')
  css +=
    `.vd{--sun:light-dark(${MATERIALS.su.light},${MATERIALS.su.dark})}` +
    '@keyframes boil{50%{fill:var(--sun);stroke:var(--sun)}}' +
    // Twelve steps each way: a change every 0.19 s, too fine to see as a step.
    ['sf', 'sg', 'sh'].map((m, k) => `${flares(m)}{animation:boil 4.5s steps(12) infinite;${at(-k * 1.5)}}`).join('')
  defs +=
    `<radialGradient id="corona"><stop class="co-a" offset="0"/><stop class="co-m" offset=".4"/><stop class="co-b" offset="1"/></radialGradient>` +
    `<g id="sun">${draw(sun, SUN.unit, shades)}</g>` +
    // The upper half the planets pass behind, in the space of the copy drawn over them (a
    // `<use>` with `x` and `y` moves its clip with it).
    `<clipPath id="sun-top"><rect x="-80" y="-80" width="160" height="80"/></clipPath>`

  // The planets, outermost first: further out is further back on the far half of an orbit.
  let orbits = ''
  let planets = ''
  for (const planet of [...PLANETS].reverse()) {
    const voxels = ball(planet.r, planet.paint).concat(planet.extra?.() ?? [])
    defs += `<g id="${planet.id}">${draw(voxels, planet.unit, shades)}</g>`
    orbits += `<ellipse cx="${SUN.x}" cy="${SUN.y}" rx="${planet.orbit}" ry="${+(planet.orbit * TILT).toFixed(1)}"/>`

    let content = `<use href="#${planet.id}"/>`
    if (planet.moons !== undefined) {
      // The moons turn around the planet and pass behind its upper half, drawn again over them.
      planet.moons.forEach((moon, k) => {
        defs += `<g id="${moon.id}">${draw(ball(1.1, () => moon.m), moon.unit, shades)}</g>`
        const turn = orbit(`<use href="#${moon.id}"/>`, moon.orbit, moon.period, (0.2 + k * 0.37) % 1, moon.id)
        css += turn.css + (moon.retrograde === true ? `.o-${moon.id},.c-${moon.id}{animation-direction:reverse}` : '')
        content += turn.body
      })
      const half = Math.ceil((planet.reach ?? planet.r) * planet.unit) + 3
      defs += `<clipPath id="top-${planet.id}"><rect x="${-half}" y="${-half}" width="${2 * half}" height="${half}"/></clipPath>`
      content += `<use href="#${planet.id}" clip-path="url(#top-${planet.id})"/>`
    }
    const turn = orbit(content, planet.orbit, planet.period, rnd(), planet.id)
    css += turn.css
    planets += turn.body
  }

  const body =
    `<g class="orbits">${orbits}</g>` +
    `<circle class="sun" cx="${SUN.x}" cy="${SUN.y}" r="175" fill="url(#corona)"/>` +
    `<g class="vox"><use href="#sun" class="sunlit" x="${SUN.x}" y="${SUN.y}"/>` +
    `<g transform="translate(${SUN.x} ${SUN.y})">${planets}</g>` +
    `<use href="#sun" x="${SUN.x}" y="${SUN.y}" clip-path="url(#sun-top)"/></g>`

  // The definitions sit in a `.vox` group too: a `<use>` copy is styled as its original is.
  return { defs: `<g class="vox">${defs}</g>`, css: css + shades.rules(), body }
}
