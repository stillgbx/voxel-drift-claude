// The backdrop: Pip, a small voxel creature on a floating asteroid, drifting through a
// starfield. Drawn as one SVG behind the conversation.
//
// A backdrop runs no script, so the 3D happens here, once, when the module loads: a tiny
// voxel renderer turns Pip into a strip of frames, one per angle, and CSS steps through
// them. Each frame keeps only the faces the camera sees, shades them from one light, and
// orders them back to front (painter's algorithm); faces of one shade that nothing has to
// come between are merged into one path, which keeps the whole scene under the 131,072
// characters a backdrop may hold.
//
// Colors are CSS variables, each `light-dark(light, dark)`, so the scene follows the app's
// mode with no media query (a media query other than reduced motion makes the desktop app
// draw a scene still). Every style sits in the <style> sheet, none in a style attribute.
//
// This file imports nothing at run time, so `node scripts/preview.ts` can run it as is.

// ---------------------------------------------------------------- the model

/** What a voxel is made of: one color per mode, and whether it glows (shaded less). */
type Material = { key: string; light: string; dark: string; glow?: boolean }

const MATERIALS = {
  body: { key: 'b', light: '#d9714f', dark: '#e07a58' },
  foot: { key: 'f', light: '#a9523a', dark: '#b85a3f' },
  cheek: { key: 'p', light: '#f19a86', dark: '#f5a08c' },
  eye: { key: 'e', light: '#2b2030', dark: '#1d1624' },
  lid: { key: 'l', light: '#8e4430', dark: '#9a4a34' },
  stalk: { key: 'a', light: '#8e4430', dark: '#a8553d' },
  bulb: { key: 'o', light: '#ffc95e', dark: '#ffd978', glow: true },
  top: { key: 'g', light: '#c3b8de', dark: '#6e6896' },
  rock: { key: 'r', light: '#a197c4', dark: '#4b4570' },
  crystal: { key: 'c', light: '#43c2b0', dark: '#62eed6', glow: true },
} satisfies Record<string, Material>

type MaterialId = keyof typeof MATERIALS

type Voxel = { x: number; y: number; z: number; m: MaterialId }

/** Where Pip turns, in voxel units: the middle of its body. */
const CENTER = { x: 3.5, z: 2.5 }

/**
 * Pip, in voxels: x to its left, y up, z toward whoever it faces. A rounded coral body with
 * stubby arms and feet, a face on the front (two tall eyes, two blushing cheeks), and two
 * antennae with glowing tips. Edit the cells here to draw another creature.
 */
function pip(isBlinking: boolean): Voxel[] {
  const cells = new Map<string, Voxel>()
  const put = (x: number, y: number, z: number, m: MaterialId): void => {
    cells.set(`${x},${y},${z}`, { x, y, z, m })
  }

  // Feet.
  for (const [x, z] of [[1, 1], [5, 1], [1, 3], [5, 3]] as const) put(x, 0, z, 'foot')
  // The body: 7 wide, 5 deep, 4 tall, its vertical edges rounded at the top and bottom.
  for (let y = 1; y <= 4; y++) {
    for (let x = 0; x <= 6; x++) {
      for (let z = 0; z <= 4; z++) {
        const isCorner = (x === 0 || x === 6) && (z === 0 || z === 4)
        if (isCorner && (y === 1 || y === 4)) continue
        put(x, y, z, 'body')
      }
    }
  }
  // The crown of the head.
  for (let x = 1; x <= 5; x++) for (let z = 1; z <= 3; z++) put(x, 5, z, 'body')
  // Arms.
  put(-1, 2, 2, 'body')
  put(7, 2, 2, 'body')
  // The face, on the front (z = 4).
  if (isBlinking) {
    put(2, 2, 4, 'lid')
    put(4, 2, 4, 'lid')
  } else {
    for (const x of [2, 4]) for (const y of [2, 3]) put(x, y, 4, 'eye')
  }
  put(1, 2, 4, 'cheek')
  put(5, 2, 4, 'cheek')
  // Antennae.
  for (const x of [1, 5]) {
    put(x, 6, 2, 'stalk')
    put(x, 7, 2, 'stalk')
    put(x, 8, 2, 'bulb')
  }
  return [...cells.values()]
}

/** A small deterministic random, so the scene is the same on every load. */
function random(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** The asteroid Pip stands on, rough-edged and tapering to a point, with a few crystals. */
function asteroid(): Voxel[] {
  const rnd = random(11)
  const cells = new Map<string, Voxel>()
  const has = (x: number, y: number, z: number): boolean => cells.has(`${x},${y},${z}`)
  const put = (x: number, y: number, z: number, m: MaterialId): void => {
    cells.set(`${x},${y},${z}`, { x, y, z, m })
  }

  const layers: [number, number][] = [[-1, 6.1], [-2, 5.1], [-3, 3.9], [-4, 2.6], [-5, 1.3]]
  for (const [y, radius] of layers) {
    for (let x = -4; x <= 11; x++) {
      for (let z = -5; z <= 10; z++) {
        const d = Math.hypot(x + 0.5 - CENTER.x, z + 0.5 - CENTER.z) + (rnd() - 0.5) * 0.9
        if (d <= radius) put(x, y, z, y === -1 ? 'top' : 'rock')
      }
    }
  }
  if (!has(3, -5, 2)) put(3, -5, 2, 'rock')
  put(3, -6, 2, 'rock')

  // Crystals and pebbles on the top, clear of the circle Pip turns in.
  const decor: [number, number, number, MaterialId][] = [
    [-1, 0, 5, 'crystal'], [-1, 1, 5, 'crystal'], [-1, 2, 5, 'crystal'], [-2, 0, 4, 'crystal'], [0, 0, 6, 'crystal'],
    [8, 0, -1, 'crystal'], [8, 1, -1, 'crystal'], [9, 0, 0, 'crystal'],
    [6, 0, 7, 'top'], [7, 0, 6, 'top'], [-2, 0, 0, 'top'],
  ]
  for (const [x, y, z, m] of decor) if (has(x, -1, z)) put(x, y, z, m)
  return [...cells.values()]
}

// ---------------------------------------------------------------- the renderer

/** The camera looks down at this angle. */
const PITCH = (28 * Math.PI) / 180
/** Pixels per voxel. */
const UNIT = 17
/** The light, in camera space (x right, y up, z toward the viewer): from the upper left. */
const LIGHT = normalize([-0.55, 0.78, 0.42])
/** How many shades a face can take, per material. */
const LEVELS = 10

type Vec3 = [number, number, number]
type Point = [number, number]

function normalize([x, y, z]: Vec3): Vec3 {
  const l = Math.hypot(x, y, z)
  return [x / l, y / l, z / l]
}

const DIRECTIONS: { n: Vec3; corners: Vec3[] }[] = [
  { n: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], corners: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
  { n: [0, 1, 0], corners: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
  { n: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], corners: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
  { n: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
]

type Face = {
  /** The shade's CSS class: the material's key and a level. */
  shade: string
  /** Its corners on screen, rounded (shared corners round alike, so faces meet with no gap). */
  points: Point[]
  /** The same, unrounded, for the overlap test. */
  exact: Point[]
  /** How near the camera its voxel is: the painter's order. */
  depth: number
}

/** Every shade class a drawing used, so the style sheet colors only those. */
const usedShades = new Set<string>()

/**
 * Projects voxels turned by `yaw` (radians) about Pip's center, as seen from the camera,
 * with (0, 0, 0) at `origin` on screen, into SVG paths.
 */
function render(voxels: Voxel[], yaw: number, origin: Point): string {
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const cp = Math.cos(PITCH)
  const sp = Math.sin(PITCH)
  const occupied = new Set(voxels.map(v => `${v.x},${v.y},${v.z}`))

  /** World (relative to the center) to camera space, turned by the yaw. */
  const turn = ([x, y, z]: Vec3): Vec3 => [x * cos + z * sin, y, -x * sin + z * cos]
  const project = (p: Vec3): Point => {
    const [x, y, z] = turn([p[0] - CENTER.x, p[1], p[2] - CENTER.z])
    return [origin[0] + x * UNIT, origin[1] - (y * cp - z * sp) * UNIT]
  }

  const faces: Face[] = []
  for (const v of voxels) {
    const [cx, cy, cz] = turn([v.x + 0.5 - CENTER.x, v.y + 0.5, v.z + 0.5 - CENTER.z])
    const depth = cz * cp + cy * sp
    const material: Material = MATERIALS[v.m]
    for (const { n, corners } of DIRECTIONS) {
      if (occupied.has(`${v.x + n[0]},${v.y + n[1]},${v.z + n[2]}`)) continue
      const [nx, ny, nz] = turn(n)
      // Back faces: those turned away from the camera.
      if (ny * sp + nz * cp <= 1e-6) continue
      const lambert = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2])
      const level = Math.min(LEVELS - 1, Math.round(lambert * (LEVELS - 1)))
      const shade = material.key + level
      const exact = corners.map(([a, b, c]) => project([v.x + a, v.y + b, v.z + c]))
      const points = exact.map(([x, y]): Point => [Math.round(x), Math.round(y)])
      if (Math.abs(area(points)) < 0.5) continue
      usedShades.add(shade)
      faces.push({ shade, points, exact, depth })
    }
  }
  return paths(order(faces))
}

function area(points: Point[]): number {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]!
    const [x2, y2] = points[(i + 1) % points.length]!
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

/** Whether two convex quads overlap by more than a hair (separating axis test). */
function overlaps(a: Point[], b: Point[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i]!
      const [x2, y2] = poly[(i + 1) % poly.length]!
      const ax = y1 - y2
      const ay = x2 - x1
      let minA = Infinity
      let maxA = -Infinity
      let minB = Infinity
      let maxB = -Infinity
      for (const [x, y] of a) {
        const d = x * ax + y * ay
        minA = Math.min(minA, d)
        maxA = Math.max(maxA, d)
      }
      for (const [x, y] of b) {
        const d = x * ax + y * ay
        minB = Math.min(minB, d)
        maxB = Math.max(maxB, d)
      }
      const length = Math.hypot(ax, ay)
      if (Math.min(maxA, maxB) - Math.max(minA, minB) <= 0.05 * length) return false
    }
  }
  return true
}

/**
 * Back to front, as few runs of one shade as it can: a face must follow every face it
 * overlaps that sits further back (grid cubes sort correctly by their centers' depth), and
 * otherwise goes wherever it continues the current run.
 */
function order(faces: Face[]): Face[] {
  const after: number[][] = faces.map(() => [])
  const waiting = faces.map(() => 0)
  for (let i = 0; i < faces.length; i++) {
    for (let j = i + 1; j < faces.length; j++) {
      const a = faces[i]!
      const b = faces[j]!
      if (a.depth === b.depth || !overlaps(a.exact, b.exact)) continue
      const [back, front] = a.depth < b.depth ? [i, j] : [j, i]
      after[back]!.push(front)
      waiting[front]!++
    }
  }
  const ready = new Set<number>()
  waiting.forEach((count, i) => {
    if (count === 0) ready.add(i)
  })
  const sorted: Face[] = []
  let current = ''
  while (ready.size > 0) {
    let pick = [...ready].find(i => faces[i]!.shade === current)
    if (pick === undefined) {
      // Start the shade with the most faces ready.
      const counts = new Map<string, number>()
      for (const i of ready) counts.set(faces[i]!.shade, (counts.get(faces[i]!.shade) ?? 0) + 1)
      current = [...counts].sort((x, y) => y[1] - x[1])[0]![0]
      pick = [...ready].find(i => faces[i]!.shade === current)!
    }
    ready.delete(pick)
    sorted.push(faces[pick]!)
    for (const next of after[pick]!) if (--waiting[next]! === 0) ready.add(next)
  }
  return sorted
}

/** Numbers joined the way SVG reads them: a minus sign needs no space before it. */
function nums(values: number[]): string {
  return values.map((n, i) => (i > 0 && n >= 0 ? ' ' : '') + n).join('')
}

/** One path per run of a shade, each face a subpath placed relative to the one before. */
function paths(faces: Face[]): string {
  let svg = ''
  let i = 0
  while (i < faces.length) {
    const shade = faces[i]!.shade
    let d = ''
    let start: Point | undefined
    for (; i < faces.length && faces[i]!.shade === shade; i++) {
      const p = faces[i]!.points
      const [x0, y0] = p[0]!
      d += start === undefined ? `M${nums([x0, y0])}` : `m${nums([x0 - start[0], y0 - start[1]])}`
      const steps: number[] = []
      for (let k = 1; k < p.length; k++) steps.push(p[k]![0] - p[k - 1]![0], p[k]![1] - p[k - 1]![1])
      d += `l${nums(steps)}z`
      start = [x0, y0]
    }
    svg += `<path class="${shade}" d="${d}"/>`
  }
  return svg
}

// ---------------------------------------------------------------- shading

const hex = (n: number): string => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
const rgb = (color: string): Vec3 => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) as Vec3
const mix = (a: string, b: string, t: number): string => {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  return `#${hex(r1 + (r2 - r1) * t)}${hex(g1 + (g2 - g1) * t)}${hex(b1 + (b2 - b1) * t)}`
}

/** A material's color at a light level: toward a violet shadow in the dark, a touch of light at the top. */
function shadeOf(material: Material, level: number, mode: 'light' | 'dark'): string {
  const t = level / (LEVELS - 1)
  const base = material[mode]
  const shadow = mode === 'dark' ? '#140f22' : '#3a2f58'
  if (material.glow === true) return mix(base, '#ffffff', 0.12 * t)
  const dark = (mode === 'dark' ? 0.62 : 0.5) * (1 - t)
  const lit = t > 0.75 ? mix(base, '#fff6ea', (t - 0.75) * 0.5) : base
  return mix(lit, shadow, dark)
}

function shadeRules(): string {
  return [...usedShades]
    .sort()
    .map(shade => {
      const material = Object.values(MATERIALS).find(m => m.key === shade[0])!
      const level = Number(shade.slice(1))
      return `.${shade}{--c:light-dark(${shadeOf(material, level, 'light')},${shadeOf(material, level, 'dark')})}`
    })
    .join('')
}

// ---------------------------------------------------------------- the scene

const W = 1600
const H = 1000

/** The frames of one full turn; more is smoother, and longer. */
const TURN_FRAMES = 32
/** Facing a little to its right, toward the conversation, when it rests. */
const REST_YAW = (-32 * Math.PI) / 180
const ASTEROID_YAW = (-20 * Math.PI) / 180
/** One frame of the strip, in pixels, and where Pip's center stands in it. */
const FRAME = { w: 220, h: 250, x: 110, y: 200 }
/**
 * Where the diorama stands in the scene, and how big: low in the right corner, in the margin
 * beside the conversation even in a wide window (where the scene is scaled up to fill it).
 */
const SPOT = { x: 1385, y: 700, scale: 0.85 }

/** Frame indexes: 0..TURN_FRAMES-1 turn, TURN_FRAMES blinks at rest. */
const BLINK = TURN_FRAMES

/** What Pip does in one loop: [frame, seconds]. */
function routine(): [number, number][] {
  const steps: [number, number][] = []
  const rest = (s: number): void => void steps.push([0, s])
  const blink = (): void => void steps.push([BLINK, 0.14])
  const turn = (frames: number[], s: number): void => frames.forEach(f => steps.push([f, s]))

  rest(2.4)
  blink()
  rest(2.2)
  // A glance toward the viewer, and back.
  turn([1, 2, 3, 4], 0.09)
  steps.push([5, 1.8])
  turn([4, 3, 2, 1], 0.09)
  rest(1.6)
  blink()
  rest(0.3)
  blink()
  rest(2.6)
  // A happy full turn.
  turn(Array.from({ length: TURN_FRAMES - 1 }, (_, k) => k + 1), 0.085)
  rest(3)
  return steps
}

function stripAnimation(): { css: string; seconds: number } {
  const steps = routine()
  const seconds = steps.reduce((sum, [, s]) => sum + s, 0)
  let t = 0
  const frames = steps.map(([frame, s]) => {
    const key = `${+((t / seconds) * 100).toFixed(3)}%{transform:translateX(${-frame * FRAME.w}px)}`
    t += s
    return key
  })
  frames.push('100%{transform:translateX(0)}')
  return { css: `@keyframes pip{${frames.join('')}}`, seconds: +seconds.toFixed(2) }
}

/** The stars: a still field that twinkles, and a slow drift streaming out of the distance. */
function stars(): string {
  const rnd = random(5)
  let field = ''
  for (let i = 0; i < 150; i++) {
    const x = Math.round(rnd() * W)
    const y = Math.round(rnd() * H)
    const r = (0.5 + rnd() * rnd() * 1.6).toFixed(1)
    field += `<circle class="t${i % 4}" cx="${x}" cy="${y}" r="${r}"/>`
  }

  // The drift: each star is turned toward its heading and flies out along x.
  const vx = 560
  const vy = 330
  let drift = ''
  for (let i = 0; i < 56; i++) {
    const angle = Math.round(rnd() * 360)
    const from = Math.round(20 + rnd() * 90)
    const r = (0.7 + rnd() * 0.9).toFixed(1)
    drift += `<g transform="rotate(${angle} ${vx} ${vy})"><circle class="w v${i % 3} d${i % 12}" cx="${vx + from}" cy="${vy}" r="${r}"/></g>`
  }
  return `<g class="field">${field}</g><g class="drift">${drift}</g>`
}

const VARS = [
  ['sky-top', '#ede6f6', '#0d0b16'],
  ['sky-low', '#f8e7dd', '#191325'],
  ['neb-a', '#e3cff3', '#3a2361'],
  ['neb-b', '#fbd3c3', '#4f2238'],
  ['star', '#8476b8', '#ffffff'],
  ['planet-a', '#b7d6ee', '#5f86b8'],
  ['planet-b', '#8a9fd6', '#28325e'],
  ['ring', '#c9a1c9', '#b98ab9'],
  ['halo', '#ffffff00', '#ff8d6640'],
] as const

function styles(): { css: string } {
  const { css: keyframes, seconds } = stripAnimation()
  const vars = VARS.map(([name, light, dark]) => `--${name}:light-dark(${light},${dark})`).join(';')
  const css = [
    `.vd{color-scheme:light dark;${vars}}`,
    '.sky-top{stop-color:var(--sky-top)}.sky-low{stop-color:var(--sky-low)}',
    '.neb-a{stop-color:var(--neb-a)}.neb-b{stop-color:var(--neb-b)}.clear-a{stop-color:var(--neb-a);stop-opacity:0}.clear-b{stop-color:var(--neb-b);stop-opacity:0}',
    '.pl-a{stop-color:var(--planet-a)}.pl-b{stop-color:var(--planet-b)}',
    '.ring{fill:none;stroke:var(--ring);stroke-width:5;opacity:.75}',
    '.field circle,.w{fill:var(--star)}',
    '.t0{opacity:.5;animation:tw 3.1s ease-in-out infinite alternate}',
    '.t1{opacity:.8;animation:tw 4.7s ease-in-out -1.3s infinite alternate}',
    '.t2{opacity:.35;animation:tw 6.3s ease-in-out -2.9s infinite alternate}',
    '.t3{opacity:.65}',
    '@keyframes tw{to{opacity:.12}}',
    '.w{opacity:0;transform-box:fill-box;transform-origin:center;animation:warp 24s cubic-bezier(.7,0,1,.55) infinite}',
    '.v1{animation-duration:31s}.v2{animation-duration:39s}',
    ...Array.from({ length: 12 }, (_, k) => `.d${k}{animation-delay:${-(k * 3.3).toFixed(1)}s}`),
    '@keyframes warp{0%{transform:translateX(0) scale(.3);opacity:0}12%{opacity:.9}100%{transform:translateX(1150px) scale(2.4);opacity:0}}',
    '.island{animation:bob 5.5s ease-in-out infinite alternate;filter:drop-shadow(0 0 14px var(--halo))}',
    '@keyframes bob{to{transform:translateY(-12px)}}',
    `.strip{animation:pip ${seconds}s infinite step-end}`,
    keyframes,
    '.vox path{fill:var(--c);stroke:var(--c);stroke-width:.7;stroke-linejoin:round}',
    shadeRules(),
    '@media (prefers-reduced-motion:reduce){.vd *{animation:none!important}.w{display:none}}',
  ]
  return { css: css.join('') }
}

function planet(): string {
  // High on the left, in the strip that stays clear whether the app's sidebar shows (it
  // covers the window's left edge) or not (the conversation column then moves left).
  const x = 345
  const y = 195
  const r = 44
  const ring = `M${x - 86} ${y + 12}a86 22 -12 0 0 172 -24`
  return (
    `<ellipse class="ring" cx="${x}" cy="${y}" rx="86" ry="22" transform="rotate(-12 ${x} ${y})"/>` +
    `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#pl)"/>` +
    `<path class="ring" d="${ring}"/>`
  )
}

/** The whole backdrop, as one SVG document. */
export function sceneSvg(): string {
  usedShades.clear()
  const back = asteroid()
  const turning = pip(false)
  const blinking = pip(true)

  // The asteroid stands still under Pip: its decorations in front of Pip are drawn after it.
  const sin = Math.sin(ASTEROID_YAW)
  const cos = Math.cos(ASTEROID_YAW)
  const nearness = (v: Voxel): number => -(v.x + 0.5 - CENTER.x) * sin + (v.z + 0.5 - CENTER.z) * cos
  const front = back.filter(v => v.y >= 0 && nearness(v) > 1)
  const behind = back.filter(v => !front.includes(v))

  const origin: Point = [FRAME.x, FRAME.y]
  let strip = ''
  for (let k = 0; k <= TURN_FRAMES; k++) {
    const voxels = k === BLINK ? blinking : turning
    const yaw = REST_YAW + (k === BLINK ? 0 : (k * 2 * Math.PI) / TURN_FRAMES)
    strip += `<g transform="translate(${k * FRAME.w} 0)">${render(voxels, yaw, origin)}</g>`
  }

  // Drawn about (0, 0), then placed and sized by the outer group: the inner one bobs, and a
  // CSS transform would replace a transform attribute on the same element.
  const island =
    `<g transform="translate(${SPOT.x} ${SPOT.y}) scale(${SPOT.scale})"><g class="island vox">` +
    render(behind, ASTEROID_YAW, [0, 0]) +
    `<svg x="${-FRAME.x}" y="${-FRAME.y}" width="${FRAME.w}" height="${FRAME.h}" viewBox="0 0 ${FRAME.w} ${FRAME.h}"><g class="strip">${strip}</g></svg>` +
    render(front, ASTEROID_YAW, [0, 0]) +
    `</g></g>`

  const { css } = styles()
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="vd" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<style>${css}</style>` +
    `<defs>` +
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop class="sky-top" offset="0"/><stop class="sky-low" offset="1"/></linearGradient>` +
    `<radialGradient id="na" cx=".22" cy=".3" r=".45"><stop class="neb-a" offset="0"/><stop class="clear-a" offset="1"/></radialGradient>` +
    `<radialGradient id="nb" cx=".8" cy=".72" r=".42"><stop class="neb-b" offset="0"/><stop class="clear-b" offset="1"/></radialGradient>` +
    `<radialGradient id="pl" cx=".35" cy=".3" r=".8"><stop class="pl-a" offset="0"/><stop class="pl-b" offset="1"/></radialGradient>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
    `<rect width="${W}" height="${H}" fill="url(#na)" opacity=".7"/>` +
    `<rect width="${W}" height="${H}" fill="url(#nb)" opacity=".6"/>` +
    stars() +
    planet() +
    island +
    `</svg>`
  )
}

export const SCENE_ALT = 'Pip, a small coral voxel creature with glowing antennae, standing on a floating asteroid among drifting stars'
