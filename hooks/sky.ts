// What every variant shares: the frame of the SVG document, the sky and its nebulae, the
// stars, and the colors that change with the mode.
//
// Colors are CSS variables, each `light-dark(light, dark)`, so a scene follows the app's mode
// with no media query (a media query other than reduced motion makes the desktop app draw a
// scene still). Every style sits in the <style> sheet, none in a style attribute.

import { random } from './voxel'

export const W = 1600
export const H = 1000

/**
 * An animation delay on the scene's clock, left as a mark that `stamp` turns into a plain
 * number when the backdrop is drawn: the delay, less the time. An animation that loops forever
 * (an orbit, a twinkle, the bob) is then at the phase the clock says whenever the backdrop is
 * drawn again, as when Pip's mood changes, and carries on with no jump. One that plays on an
 * event (Pip's hop) leaves it out and starts. The number is written out: in the app, a delay
 * read from a `var()` left every loop starting over at each redraw.
 */
export const at = (seconds: number): string => `animation-delay:{{${+seconds.toFixed(2)}}}s`

/**
 * An animation delay counted from when what's drawn began (Pip's mood), for what plays on an
 * event: Pip's routine, its hop. Drawn again a moment later, it carries on and doesn't start over.
 */
export const since = (seconds: number): string => `animation-delay:{{@${+seconds.toFixed(2)}}}s`

/**
 * Writes each delay `at` and `since` marked as a plain number: the scene's clock at a time in
 * milliseconds, and how long ago what's drawn `began` (now, left out).
 */
export const stamp = (svg: string, ms: number, began = ms): string => {
  const now = (ms / 1000) % 1e6
  const ago = (ms - began) / 1000
  return svg.replace(/\{\{(@?)(-?[\d.]+)\}\}/g, (_, event: string, delay: string) => (Number(delay) - (event === '@' ? ago : now)).toFixed(3))
}

const VARS: [string, string, string][] = [
  ['sky-top', '#ede6f6', '#0d0b16'],
  ['sky-low', '#f8e7dd', '#191325'],
  ['neb-a', '#e3cff3', '#3a2361'],
  ['neb-b', '#fbd3c3', '#4f2238'],
  ['star', '#8476b8', '#ffffff'],
  ['planet-a', '#b7d6ee', '#5f86b8'],
  ['planet-b', '#8a9fd6', '#28325e'],
  ['ring', '#c9a1c9', '#b98ab9'],
  ['halo', '#ffffff00', '#ff8d6640'],
  ['orbit', '#7d6fae33', '#c9b8ff26'],
  ['corona', '#ffc56b', '#ffb44d'],
]

/** The rules every scene starts with: its colors, the sky's gradients, the stars. */
const BASE_CSS = [
  `.vd{color-scheme:light dark;${VARS.map(([name, light, dark]) => `--${name}:light-dark(${light},${dark})`).join(';')}}`,
  '.sky-top{stop-color:var(--sky-top)}.sky-low{stop-color:var(--sky-low)}',
  '.neb-a{stop-color:var(--neb-a)}.neb-b{stop-color:var(--neb-b)}.clear-a{stop-color:var(--neb-a);stop-opacity:0}.clear-b{stop-color:var(--neb-b);stop-opacity:0}',
  '.field circle,.w{fill:var(--star)}',
  `.t0{opacity:.5;animation:tw 3.1s ease-in-out infinite alternate;${at(0)}}`,
  `.t1{opacity:.8;animation:tw 4.7s ease-in-out infinite alternate;${at(-1.3)}}`,
  `.t2{opacity:.35;animation:tw 6.3s ease-in-out infinite alternate;${at(-2.9)}}`,
  '.t3{opacity:.65}',
  '@keyframes tw{to{opacity:.12}}',
].join('')

const DRIFT_CSS = [
  '.w{opacity:0;transform-box:fill-box;transform-origin:center;animation:warp 24s cubic-bezier(.7,0,1,.55) infinite}',
  '.v1{animation-duration:31s}.v2{animation-duration:39s}',
  ...Array.from({ length: 12 }, (_, k) => `.d${k}{${at(-k * 3.3)}}`),
  '@keyframes warp{0%{transform:translateX(0) scale(.3);opacity:0}12%{opacity:.9}100%{transform:translateX(1150px) scale(2.4);opacity:0}}',
].join('')

const REDUCED_CSS = '@media (prefers-reduced-motion:reduce){.vd *{animation:none!important}.w{display:none}}'

/** The sky: a gradient from top to bottom and two soft nebulae. */
function sky(): { defs: string; body: string } {
  return {
    defs:
      `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop class="sky-top" offset="0"/><stop class="sky-low" offset="1"/></linearGradient>` +
      `<radialGradient id="na" cx=".22" cy=".3" r=".45"><stop class="neb-a" offset="0"/><stop class="clear-a" offset="1"/></radialGradient>` +
      `<radialGradient id="nb" cx=".8" cy=".72" r=".42"><stop class="neb-b" offset="0"/><stop class="clear-b" offset="1"/></radialGradient>`,
    body:
      `<rect width="${W}" height="${H}" fill="url(#sky)"/>` +
      `<rect width="${W}" height="${H}" fill="url(#na)" opacity=".7"/>` +
      `<rect width="${W}" height="${H}" fill="url(#nb)" opacity=".6"/>`,
  }
}

/**
 * A still field of stars that twinkle, and, with `drift`, a slow stream out of the distance.
 * The stars twinkle in four sets, each a group that twinkles whole: one animation a set
 * rather than one a star, which cost the browser a restyle of every star every frame.
 */
function stars(count: number, drift: { x: number; y: number; count: number } | undefined): string {
  const rnd = random(5)
  const sets = ['', '', '', '']
  for (let i = 0; i < count; i++) {
    const x = Math.round(rnd() * W)
    const y = Math.round(rnd() * H)
    const r = (0.5 + rnd() * rnd() * 1.6).toFixed(1)
    sets[i % 4] += `<circle cx="${x}" cy="${y}" r="${r}"/>`
  }
  const field = sets.map((set, k) => `<g class="t${k}">${set}</g>`).join('')
  if (drift === undefined) return `<g class="field">${field}</g>`

  // Each drifting star is turned toward its heading and flies out along x.
  let stream = ''
  for (let i = 0; i < drift.count; i++) {
    const angle = Math.round(rnd() * 360)
    const from = Math.round(20 + rnd() * 90)
    const r = (0.9 + rnd() * 1.1).toFixed(1)
    stream += `<g transform="rotate(${angle} ${drift.x} ${drift.y})"><circle class="w v${i % 3} d${i % 12}" cx="${drift.x + from}" cy="${drift.y}" r="${r}"/></g>`
  }
  return `<g class="field">${field}</g><g class="drift">${stream}</g>`
}

export type Layer = { defs?: string; css?: string; body: string }

/**
 * One whole backdrop: the sky and its stars, then each layer in order, as one SVG document.
 * `drift` sets the point the drifting stars stream out of; without it, the stars stay still.
 */
export function scene(layers: Layer[], options: { stars?: number; drift?: { x: number; y: number; count: number } } = {}): string {
  const back = sky()
  const css = BASE_CSS + (options.drift === undefined ? '' : DRIFT_CSS) + layers.map(l => l.css ?? '').join('') + REDUCED_CSS
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" class="vd" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<style>${css}</style>` +
    `<defs>${back.defs}${layers.map(l => l.defs ?? '').join('')}</defs>` +
    back.body +
    stars(options.stars ?? 150, options.drift) +
    layers.map(l => l.body).join('') +
    `</svg>`
  )
}
