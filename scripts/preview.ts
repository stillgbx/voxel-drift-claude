// Writes each variant, Pip at rest, to Preview/<variant>.svg; Preview/index.html, every
// variant in each of Pip's moods, in dark and light; and Preview/frames.html, each of Pip's
// frames, still. Prints each scene's size against the 131,072 characters a backdrop may hold.
//
//   node --import ./scripts/ts-resolve.mjs scripts/preview.ts

import { mkdirSync, writeFileSync } from 'node:fs'

import { MOODS } from '../hooks/pip.ts'
import { svgOf, VARIANT_IDS } from '../hooks/scenes.ts'
import { stamp } from '../hooks/sky.ts'

const LIMIT = 131072
const out = new URL('../Preview/', import.meta.url)
mkdirSync(out, { recursive: true })

// Several copies on one page: each gets its own ids, or all would paint the first's.
const own = (copy: string, suffix: string): string =>
  copy
    .replace(/id="([\w-]+)"/g, `id="$1-${suffix}"`)
    .replace(/url\(#([\w-]+)\)/g, `url(#$1-${suffix})`)
    .replace(/href="#([\w-]+)"/g, `href="#$1-${suffix}"`)

const PAGE_CSS = `body{margin:0;padding:16px;background:#222;font:14px system-ui;color:#ddd;display:grid;gap:16px}
figure{margin:0}.box{aspect-ratio:16/10;border-radius:8px;overflow:hidden}
.box svg{width:100%;height:100%;display:block}
.light .vd{color-scheme:light}.dark .vd{color-scheme:dark}`

let panels = ''
let failed = false
for (const id of VARIANT_IDS) {
  writeFileSync(new URL(`${id}.svg`, out), stamp(svgOf(id, 'idle', 'right'), 0))
  for (const mood of MOODS) {
    const svg = stamp(svgOf(id, mood, 'right'), 0)
    for (const mode of ['dark', 'light'] as const) {
      const name = `${id}-${mood}-${mode}`
      panels += `<figure id="${name}" class="${mode}"><figcaption>${id}, ${mood}, ${mode}</figcaption><div class="box">${own(svg, name)}</div></figure>`
    }
    console.log(`${id} ${mood}: ${svg.length} characters (${((svg.length / LIMIT) * 100).toFixed(1)}% of ${LIMIT})`)
    if (svg.length > LIMIT) failed = true
  }
  writeFileSync(new URL(`${id}-left.svg`, out), stamp(svgOf(id, 'idle', 'left'), 0))
}
writeFileSync(new URL('index.html', out), `<!doctype html><meta charset="utf-8"><title>Voxel Drift preview</title><style>${PAGE_CSS}</style>${panels}`)

// Every frame of Pip, still and close up, to check the drawing order angle by angle.
const close = stamp(svgOf('earth', 'idle', 'right'), 0).replace(/viewBox="0 0 1600 1000"/, 'viewBox="1250 470 270 290"')
const frames = Array.from({ length: 33 }, (_, k) => {
  const id = `f${k}`
  return `<figure id="${id}" class="${k % 2 === 0 ? 'dark' : 'light'}"><figcaption>${k === 32 ? 'blink' : k}</figcaption><style>#${id} .strip{animation:none!important;transform:translateX(${-k * 220}px)}#${id} *{animation-play-state:paused!important}</style><div class="box">${own(close, id)}</div></figure>`
}).join('')
writeFileSync(
  new URL('frames.html', out),
  `<!doctype html><meta charset="utf-8"><title>Pip frames</title><style>${PAGE_CSS}
body{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;padding:8px;font-size:12px}.box{aspect-ratio:27/29}</style>${frames}`,
)

if (failed) process.exitCode = 1
