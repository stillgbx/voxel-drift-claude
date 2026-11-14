// A tiny voxel renderer that writes SVG.
//
// A backdrop runs no script, so the 3D happens here, once, when the module loads. `render`
// projects voxels from a camera looking down at PITCH, keeps only the faces the camera sees,
// shades them from one light and orders them back to front (painter's algorithm). Faces of
// one shade that nothing has to come between are merged into one path, which keeps a scene
// within the 131,072 characters a backdrop may hold.
//
// Each shade is a CSS class whose color is `light-dark(light, dark)`, so a drawing follows
// the app's mode: `Shades` collects the classes a scene used and writes their rules.

/** What a voxel is made of: one color per mode, and whether it glows (shaded less). */
export type Material = { light: string; dark: string; glow?: boolean }

export const MATERIALS = {
  // Pip.
  b: { light: '#d9714f', dark: '#e07a58' }, // body
  f: { light: '#a9523a', dark: '#b85a3f' }, // feet
  p: { light: '#f19a86', dark: '#f5a08c' }, // cheeks
  e: { light: '#2b2030', dark: '#1d1624' }, // eyes
  l: { light: '#8e4430', dark: '#9a4a34' }, // closed eyelids
  a: { light: '#8e4430', dark: '#a8553d' }, // antenna stalks
  o: { light: '#ffc95e', dark: '#ffd978', glow: true }, // antenna bulbs
  // Asteroids.
  g: { light: '#c3b8de', dark: '#6e6896' }, // rock, top layer
  r: { light: '#a197c4', dark: '#4b4570' }, // rock
  c: { light: '#43c2b0', dark: '#62eed6', glow: true }, // crystals
  // The solar system.
  su: { light: '#ffb347', dark: '#ffbe5c', glow: true }, // sun
  sf: { light: '#ff8a3d', dark: '#ff9a4a', glow: true }, // sun flares
  me: { light: '#a39a94', dark: '#8f8780' }, // mercury
  ve: { light: '#e8c48a', dark: '#d9b277' }, // venus
  oc: { light: '#3f7fd1', dark: '#3a78cc' }, // ocean
  la: { light: '#4fae5d', dark: '#4aa357' }, // land
  ic: { light: '#eef3f8', dark: '#e4ecf3' }, // ice
  mo: { light: '#c9c6c2', dark: '#b3afab' }, // moon
  ma: { light: '#d0603d', dark: '#c8583a' }, // mars
  ja: { light: '#dcb88f', dark: '#cfa57c' }, // jupiter, light band
  jb: { light: '#a8744f', dark: '#9c6a47' }, // jupiter, dark band
  js: { light: '#c4553b', dark: '#c4553b' }, // jupiter, the red spot
  sa: { light: '#e6cf94', dark: '#d9bf82' }, // saturn
  ri: { light: '#cdb98c', dark: '#b8a57a' }, // saturn's ring
  ur: { light: '#8fd8de', dark: '#7ccbd2' }, // uranus
  ne: { light: '#4f6fe0', dark: '#4766d6' }, // neptune
} satisfies Record<string, Material>

export type MaterialId = keyof typeof MATERIALS

export type Voxel = { x: number; y: number; z: number; m: MaterialId }

type Vec3 = [number, number, number]
export type Point = [number, number]

/** The camera looks down at this angle. */
const PITCH = (28 * Math.PI) / 180
/** The light, in camera space (x right, y up, z toward the viewer): from the upper left. */
const LIGHT = normalize([-0.55, 0.78, 0.42])
/** How many shades a face can take, per material. */
const LEVELS = 10

function normalize([x, y, z]: Vec3): Vec3 {
  const l = Math.hypot(x, y, z)
  return [x / l, y / l, z / l]
}

/** A small deterministic random, so a scene is the same on every load. */
export function random(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

/** Cells by position, the last put at a place winning. */
export class Grid {
  private cells = new Map<string, Voxel>()

  put(x: number, y: number, z: number, m: MaterialId): void {
    this.cells.set(`${x},${y},${z}`, { x, y, z, m })
  }

  has(x: number, y: number, z: number): boolean {
    return this.cells.has(`${x},${y},${z}`)
  }

  voxels(): Voxel[] {
    return [...this.cells.values()]
  }
}

/** A ball of voxels of radius `r` about (0, 0, 0), each painted by `paint`. */
export function ball(r: number, paint: (x: number, y: number, z: number) => MaterialId): Voxel[] {
  const grid = new Grid()
  const n = Math.ceil(r)
  for (let x = -n; x < n; x++) {
    for (let y = -n; y < n; y++) {
      for (let z = -n; z < n; z++) {
        if ((x + 0.5) ** 2 + (y + 0.5) ** 2 + (z + 0.5) ** 2 <= r * r) grid.put(x, y, z, paint(x + 0.5, y + 0.5, z + 0.5))
      }
    }
  }
  return grid.voxels()
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
  /** The shade's CSS class: the material's id and a level. */
  shade: string
  /** Its corners on screen, rounded (shared corners round alike, so faces meet with no gap). */
  points: Point[]
  /** The same, unrounded, for the overlap test. */
  exact: Point[]
  /** How near the camera its voxel is: the painter's order. */
  depth: number
}

export type View = {
  /** Turn about the vertical axis through `center`, in radians. */
  yaw: number
  /** The model point drawn at `origin`. */
  center: { x: number; y: number; z: number }
  /** Where `center` lands on screen. */
  origin: Point
  /** Pixels per voxel. */
  unit: number
}

/** The shade classes a scene used, and their color rules. */
export class Shades {
  private used = new Set<string>()

  add(shade: string): void {
    this.used.add(shade)
  }

  /**
   * Each shade's color, and the paint every shade shares. The shared rule names the classes
   * themselves, with no ancestor: a `<use>` copy sits in a tree of its own, where a selector
   * such as `.vox path` would not reach it.
   */
  rules(): string {
    const shades = [...this.used].sort()
    const colors = shades.map(shade => {
      const material: Material = MATERIALS[shade.slice(0, -1) as MaterialId]
      const level = Number(shade.slice(-1))
      return `.${shade}{--c:light-dark(${shadeOf(material, level, 'light')},${shadeOf(material, level, 'dark')})}`
    })
    const paint = `${shades.map(shade => `.${shade}`).join(',')}{fill:var(--c);stroke:var(--c);stroke-width:.7;stroke-linejoin:round}`
    return colors.join('') + (shades.length > 0 ? paint : '')
  }
}

/** Projects voxels as seen from the camera into SVG paths. */
export function render(voxels: Voxel[], view: View, shades: Shades): string {
  const cos = Math.cos(view.yaw)
  const sin = Math.sin(view.yaw)
  const cp = Math.cos(PITCH)
  const sp = Math.sin(PITCH)
  const { center, origin, unit } = view
  const occupied = new Set(voxels.map(v => `${v.x},${v.y},${v.z}`))

  /** Model space (relative to the center) to camera space, turned by the yaw. */
  const turn = ([x, y, z]: Vec3): Vec3 => [x * cos + z * sin, y, -x * sin + z * cos]
  const project = (p: Vec3): Point => {
    const [x, y, z] = turn([p[0] - center.x, p[1] - center.y, p[2] - center.z])
    return [origin[0] + x * unit, origin[1] - (y * cp - z * sp) * unit]
  }

  const faces: Face[] = []
  for (const v of voxels) {
    const [cx, cy, cz] = turn([v.x + 0.5 - center.x, v.y + 0.5 - center.y, v.z + 0.5 - center.z])
    const depth = cz * cp + cy * sp
    for (const { n, corners } of DIRECTIONS) {
      if (occupied.has(`${v.x + n[0]},${v.y + n[1]},${v.z + n[2]}`)) continue
      const [nx, ny, nz] = turn(n)
      // Back faces: those turned away from the camera.
      if (ny * sp + nz * cp <= 1e-6) continue
      const lambert = Math.max(0, nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2])
      const level = Math.min(LEVELS - 1, Math.round(lambert * (LEVELS - 1)))
      const shade = v.m + level
      const exact = corners.map(([a, b, c]) => project([v.x + a, v.y + b, v.z + c]))
      const points = exact.map(([x, y]): Point => [Math.round(x), Math.round(y)])
      if (Math.abs(area(points)) < 0.5) continue
      shades.add(shade)
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
      if (Math.min(maxA, maxB) - Math.max(minA, minB) <= 0.05 * Math.hypot(ax, ay)) return false
    }
  }
  return true
}

/**
 * Back to front, in as few runs of one shade as it can: a face must follow every face it
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

const hex = (n: number): string => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
const rgb = (color: string): Vec3 => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)) as Vec3

export function mix(a: string, b: string, t: number): string {
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
