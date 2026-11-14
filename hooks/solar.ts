// The solar system: a voxel sun on the left and its eight planets on slow, tilted orbits that
// sweep across the window, the Moon turning around the Earth.
//
// Each planet is rendered once, in voxels, into <defs>, and an orbit is CSS alone: a group
// squashed into an ellipse turns, carrying the planet out at its radius, and an inner group
// turns back and unsquashes it, so the planet stays upright and round. To pass behind the
// sun, a copy of the sun's upper half is drawn over every planet: on the far half of an
// orbit (above the sun's middle) a planet goes under it, on the near half over it.

import { at } from './sky'
import { ball, random, render, Shades, type MaterialId, type Voxel } from './voxel'

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
  /** Extra voxels, such as Saturn's ring. */
  extra?: () => Voxel[]
}

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
  },
  { id: 'mars', r: 2, unit: 5, orbit: 265, period: 150, paint: (x, y, z) => (y > 1.4 ? 'ic' : 'ma') },
  {
    id: 'jupiter',
    r: 5.2,
    unit: 4.6,
    orbit: 390,
    period: 290,
    paint: (x, y, z) => (Math.abs(y + 1.5) < 0.8 && x > 0.5 && x < 2.6 && z > 2 ? 'js' : Math.floor(y * 0.9 + 10) % 2 === 0 ? 'ja' : 'jb'),
  },
  { id: 'saturn', r: 4.2, unit: 4.6, orbit: 540, period: 450, paint: () => 'sa', extra: () => ring(5.6, 8) },
  { id: 'uranus', r: 3.2, unit: 4.6, orbit: 700, period: 660, paint: () => 'ur' },
  { id: 'neptune', r: 3.1, unit: 4.6, orbit: 860, period: 880, paint: () => 'ne' },
]

const MOON = { r: 1.1, unit: 5, orbit: 24, period: 14 }

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
    '.co-a{stop-color:var(--corona);stop-opacity:.55}.co-b{stop-color:var(--corona);stop-opacity:0}' +
    `.sun{animation:breathe 7s ease-in-out infinite alternate;${at(0)};transform-box:fill-box;transform-origin:center}` +
    '@keyframes breathe{to{transform:scale(1.08);opacity:.8}}'

  // The sun: a glowing ball with a few hotter flares.
  const sun = ball(SUN.r, (x, y, z) => (Math.sin(x * 2.1) + Math.sin(y * 1.7 + z) > 1.2 ? 'sf' : 'su'))
  defs +=
    `<radialGradient id="corona"><stop class="co-a" offset=".25"/><stop class="co-b" offset="1"/></radialGradient>` +
    `<g id="sun">${draw(sun, SUN.unit, shades)}</g>` +
    // The upper halves the planets and the Moon pass behind, in the space of the copy drawn
    // over them (a `<use>` with `x` and `y` moves its clip with it).
    `<clipPath id="sun-top"><rect x="-80" y="-80" width="160" height="80"/></clipPath>` +
    `<clipPath id="planet-top"><rect x="-30" y="-30" width="60" height="30"/></clipPath>`

  // The planets, outermost first: further out is further back on the far half of an orbit.
  let orbits = ''
  let planets = ''
  for (const planet of [...PLANETS].reverse()) {
    const voxels = ball(planet.r, planet.paint).concat(planet.extra?.() ?? [])
    defs += `<g id="${planet.id}">${draw(voxels, planet.unit, shades)}</g>`
    orbits += `<ellipse cx="${SUN.x}" cy="${SUN.y}" rx="${planet.orbit}" ry="${+(planet.orbit * TILT).toFixed(1)}"/>`

    let content = `<use href="#${planet.id}"/>`
    if (planet.id === 'earth') {
      defs += `<g id="moon">${draw(ball(MOON.r, () => 'mo'), MOON.unit, shades)}</g>`
      const moon = orbit('<use href="#moon"/>', MOON.orbit, MOON.period, 0.2, 'moon')
      css += moon.css
      content += moon.body + `<use href="#earth" clip-path="url(#planet-top)"/>`
    }
    const turn = orbit(content, planet.orbit, planet.period, rnd(), planet.id)
    css += turn.css
    planets += turn.body
  }

  const body =
    `<g class="orbits">${orbits}</g>` +
    `<circle class="sun" cx="${SUN.x}" cy="${SUN.y}" r="130" fill="url(#corona)"/>` +
    `<g class="vox"><use href="#sun" x="${SUN.x}" y="${SUN.y}"/>` +
    `<g transform="translate(${SUN.x} ${SUN.y})">${planets}</g>` +
    `<use href="#sun" x="${SUN.x}" y="${SUN.y}" clip-path="url(#sun-top)"/></g>`

  // The definitions sit in a `.vox` group too: a `<use>` copy is styled as its original is.
  return { defs: `<g class="vox">${defs}</g>`, css: css + shades.rules(), body }
}
