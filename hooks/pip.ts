// Pip, a small voxel creature, on a floating asteroid: the diorama every variant can place.
//
// Pip is rendered at a number of angles into a strip of frames, and CSS steps through them.
// What it does follows Claude (`Mood`): between turns it rests facing the conversation,
// blinks, glances around and sometimes does a full turn; while Claude works it scans about,
// its antennae pulsing; when the answer is in it hops and turns, pleased.

import { at } from './sky'
import { Grid, random, render, Shades, type Point, type Voxel } from './voxel'

/** Where Pip turns, in voxel units: the middle of its body. */
const CENTER = { x: 3.5, y: 0, z: 2.5 }
/** Pixels per voxel in the diorama, before it is scaled into place. */
const UNIT = 17

/**
 * Pip, in voxels: x to its left, y up, z toward whoever it faces. A rounded coral body with
 * stubby arms and feet, a face on the front (two tall eyes, two blushing cheeks), and two
 * antennae with glowing tips. Edit the cells here to draw another creature.
 */
function pip(isBlinking: boolean): Voxel[] {
  const grid = new Grid()

  // Feet.
  for (const [x, z] of [[1, 1], [5, 1], [1, 3], [5, 3]] as const) grid.put(x, 0, z, 'f')
  // The body: 7 wide, 5 deep, 4 tall, its vertical edges rounded at the top and bottom.
  for (let y = 1; y <= 4; y++) {
    for (let x = 0; x <= 6; x++) {
      for (let z = 0; z <= 4; z++) {
        const isCorner = (x === 0 || x === 6) && (z === 0 || z === 4)
        if (isCorner && (y === 1 || y === 4)) continue
        grid.put(x, y, z, 'b')
      }
    }
  }
  // The crown of the head.
  for (let x = 1; x <= 5; x++) for (let z = 1; z <= 3; z++) grid.put(x, 5, z, 'b')
  // Arms.
  grid.put(-1, 2, 2, 'b')
  grid.put(7, 2, 2, 'b')
  // The face, on the front (z = 4).
  if (isBlinking) {
    grid.put(2, 2, 4, 'l')
    grid.put(4, 2, 4, 'l')
  } else {
    for (const x of [2, 4]) for (const y of [2, 3]) grid.put(x, y, 4, 'e')
  }
  grid.put(1, 2, 4, 'p')
  grid.put(5, 2, 4, 'p')
  // Antennae.
  for (const x of [1, 5]) {
    grid.put(x, 6, 2, 'a')
    grid.put(x, 7, 2, 'a')
    grid.put(x, 8, 2, 'o')
  }
  return grid.voxels()
}

/** The asteroid Pip stands on, rough-edged and tapering to a point, with a few crystals. */
function asteroid(seed: number): Voxel[] {
  const rnd = random(seed)
  const grid = new Grid()
  const layers: [number, number][] = [[-1, 6.1], [-2, 5.1], [-3, 3.9], [-4, 2.6], [-5, 1.3]]
  for (const [y, radius] of layers) {
    for (let x = -4; x <= 11; x++) {
      for (let z = -5; z <= 10; z++) {
        const d = Math.hypot(x + 0.5 - CENTER.x, z + 0.5 - CENTER.z) + (rnd() - 0.5) * 0.9
        if (d <= radius) grid.put(x, y, z, y === -1 ? 'g' : 'r')
      }
    }
  }
  grid.put(3, -5, 2, 'r')
  grid.put(3, -6, 2, 'r')

  // Crystals and pebbles on the top, clear of the circle Pip turns in.
  const decor: [number, number, number, 'c' | 'g'][] = [
    [-1, 0, 5, 'c'], [-1, 1, 5, 'c'], [-1, 2, 5, 'c'], [-2, 0, 4, 'c'], [0, 0, 6, 'c'],
    [8, 0, -1, 'c'], [8, 1, -1, 'c'], [9, 0, 0, 'c'],
    [6, 0, 7, 'g'], [7, 0, 6, 'g'], [-2, 0, 0, 'g'],
  ]
  for (const [x, y, z, m] of decor) if (grid.has(x, -1, z)) grid.put(x, y, z, m)
  return grid.voxels()
}

/** On the right of the window, facing a little to its right, toward the conversation, when it rests. */
const REST_YAW = (-32 * Math.PI) / 180
const ASTEROID_YAW = (-20 * Math.PI) / 180

/** Which side of the window the diorama stands on; on the left, Pip faces the other way. */
export type Side = 'left' | 'right'

export const SIDES: readonly Side[] = ['left', 'right']
/** One frame of the strip, in pixels, and where Pip's center stands in it. */
const FRAME = { w: 220, h: 250, x: 110, y: 200 }

/**
 * How Pip behaves, following Claude: at rest between turns, at work while Claude answers,
 * and pleased for a moment when the answer is in.
 */
export type Mood = 'idle' | 'busy' | 'done'

export const MOODS: readonly Mood[] = ['idle', 'busy', 'done']

/** What Pip does in one loop of a mood, as [frame, seconds]; frame `turn` is the blink. */
function routine(turn: number, mood: Mood): [number, number][] {
  const steps: [number, number][] = []
  const rest = (s: number): void => void steps.push([0, s])
  const blink = (): void => void steps.push([turn, 0.14])
  const glance = Math.round(turn / 8)
  /** Turns `by` frames to one side (negative: the other), holds, and back. */
  const look = (by: number, hold: number, step: number): void => {
    const frame = (k: number): number => (k + turn) % turn
    const sign = Math.sign(by)
    for (let k = sign; k !== by; k += sign) steps.push([frame(k), step])
    steps.push([frame(by), hold])
    for (let k = by - sign; k !== 0; k -= sign) steps.push([frame(k), step])
  }
  const spin = (): void => {
    for (let f = 1; f < turn; f++) steps.push([f, 2.7 / turn])
  }

  if (mood === 'busy') {
    // At work: scanning one way and the other, blinking now and then.
    rest(1.2)
    look(glance, 0.9, 0.07)
    rest(0.5)
    look(-glance, 0.9, 0.07)
    rest(1.4)
    blink()
    rest(0.8)
    look(glance + 1, 0.6, 0.07)
    rest(1)
    return steps
  }
  if (mood === 'done') {
    // The answer is in: a happy full turn, then a pleased blink.
    rest(0.2)
    spin()
    rest(1.2)
    blink()
    rest(2)
    return steps
  }
  rest(2.4)
  blink()
  rest(2.2)
  look(glance, 1.8, 0.09)
  rest(1.6)
  blink()
  rest(0.3)
  blink()
  rest(2.6)
  spin()
  rest(3)
  return steps
}

function stripCss(turn: number, mood: Mood): string {
  const steps = routine(turn, mood)
  const seconds = steps.reduce((sum, [, s]) => sum + s, 0)
  let t = 0
  const frames = steps.map(([frame, s]) => {
    const key = `${+((t / seconds) * 100).toFixed(3)}%{transform:translateX(${-frame * FRAME.w}px)}`
    t += s
    return key
  })
  frames.push('100%{transform:translateX(0)}')
  return `.strip{animation:pip ${seconds.toFixed(2)}s infinite step-end}@keyframes pip{${frames.join('')}}`
}

/**
 * What each mood adds. The asteroid floats on the scene's clock in every mood, so it carries
 * on with no jump when the mood changes. At work, the bulbs pulse. When the answer is in, Pip
 * alone hops twice off the asteroid, stretching as it leaves and squashing as it lands.
 */
function moodCss(mood: Mood): string {
  const bulbs = Array.from({ length: 10 }, (_, k) => `.o${k}`).join(',')
  const bob =
    `.island{animation:bob 5.5s ease-in-out infinite alternate;${at(0)};filter:drop-shadow(0 0 14px var(--halo))}` +
    '@keyframes bob{to{transform:translateY(-12px)}}'
  if (mood === 'busy') return `${bob}${bulbs}{animation:pulse 1.1s ease-in-out infinite alternate}@keyframes pulse{from{opacity:.35}}`
  if (mood === 'done')
    return (
      bob +
      // Anchored at Pip's feet, (0, 0) in the diorama: a box-relative origin would take the
      // whole strip of frames, most of it clipped away, and swing Pip sideways.
      '.hopper{transform-box:view-box;transform-origin:0 0;animation:hop 1.5s .15s both}' +
      '@keyframes hop{' +
      '0%,50%,100%{transform:none;animation-timing-function:ease-out}' +
      '6%,56%{transform:scale(1.06,.9);animation-timing-function:ease-out}' +
      '22%,70%{transform:translateY(-16px) scale(.96,1.05);animation-timing-function:ease-in}' +
      '40%,86%{transform:scale(1.07,.9);animation-timing-function:ease-out}}'
    )
  return bob
}

export type DioramaOptions = {
  /** Where Pip's feet stand in the scene, and how big the diorama is drawn. */
  spot: { x: number; y: number; scale: number }
  /** The side it stands on, so Pip faces the conversation, and turns toward the viewer to glance. */
  side: Side
  /** Frames in one full turn: more is smoother, and longer. */
  turn: number
  mood: Mood
}

/** Pip on its asteroid, placed in a scene: a layer for `scene`. */
export function diorama({ spot, side, turn, mood }: DioramaOptions): { css: string; body: string } {
  const shades = new Shades()
  const rock = asteroid(11)
  const still = pip(false)
  const blinking = pip(true)

  // The asteroid stands still under Pip: its decorations in front of Pip are drawn after it.
  // Mirrored on the left: every angle turns the other way.
  const way = side === 'left' ? -1 : 1
  const restYaw = way * REST_YAW
  const rockYaw = way * ASTEROID_YAW
  const sin = Math.sin(rockYaw)
  const cos = Math.cos(rockYaw)
  const nearness = (v: Voxel): number => -(v.x + 0.5 - CENTER.x) * sin + (v.z + 0.5 - CENTER.z) * cos
  const front = rock.filter(v => v.y >= 0 && nearness(v) > 1)
  const behind = rock.filter(v => !front.includes(v))
  const rockView = { yaw: rockYaw, center: CENTER, origin: [0, 0] as Point, unit: UNIT }

  let strip = ''
  for (let k = 0; k <= turn; k++) {
    const yaw = restYaw + (k === turn ? 0 : (way * k * 2 * Math.PI) / turn)
    const drawn = render(k === turn ? blinking : still, { yaw, center: CENTER, origin: [FRAME.x, FRAME.y], unit: UNIT }, shades)
    strip += `<g transform="translate(${k * FRAME.w} 0)">${drawn}</g>`
  }

  // Drawn about (0, 0), then placed and sized by the outer group: the inner one bobs, and a
  // CSS transform would replace a transform attribute on the same element.
  const body =
    `<g transform="translate(${spot.x} ${spot.y}) scale(${spot.scale})"><g class="island vox">` +
    render(behind, rockView, shades) +
    `<g class="hopper"><svg x="${-FRAME.x}" y="${-FRAME.y}" width="${FRAME.w}" height="${FRAME.h}" viewBox="0 0 ${FRAME.w} ${FRAME.h}"><g class="strip">${strip}</g></svg></g>` +
    render(front, rockView, shades) +
    `</g></g>`

  const css = moodCss(mood) + stripCss(turn, mood) + shades.rules()
  return { css, body }
}
