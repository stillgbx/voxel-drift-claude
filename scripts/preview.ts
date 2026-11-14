// Writes Preview/scene.svg and Preview/index.html (the scene in light and dark, side by side),
// and prints the scene's size against the 131,072 characters a backdrop may hold.
//
//   node scripts/preview.ts

import { mkdirSync, writeFileSync } from 'node:fs'

import { sceneSvg } from '../hooks/scene.ts'

const LIMIT = 131072
const svg = sceneSvg()
const out = new URL('../Preview/', import.meta.url)
mkdirSync(out, { recursive: true })
writeFileSync(new URL('scene.svg', out), svg)

// Two copies on one page: each gets its own gradient ids, or both would paint the first's.
const own = (copy: string, suffix: string): string =>
  copy.replace(/id="(\w+)"/g, `id="$1-${suffix}"`).replace(/url\(#(\w+)\)/g, `url(#$1-${suffix})`)

const panel = (mode: 'light' | 'dark'): string =>
  `<figure class="${mode}"><figcaption>${mode}</figcaption><div class="box">${own(svg, mode)}</div></figure>`

writeFileSync(
  new URL('index.html', out),
  `<!doctype html><meta charset="utf-8"><title>Pip preview</title>
<style>
body{margin:0;padding:16px;background:#222;font:14px system-ui;color:#ddd;display:grid;gap:16px}
figure{margin:0}.box{aspect-ratio:16/10;border-radius:8px;overflow:hidden}
.box svg{width:100%;height:100%;display:block}
.light .vd{color-scheme:light}.dark .vd{color-scheme:dark}
</style>
${panel('dark')}${panel('light')}`,
)

// Every frame of Pip, still and close up, to check the drawing order angle by angle.
const close = svg.replace(/viewBox="0 0 1600 1000"/, 'viewBox="1250 470 270 290"')
const frames = Array.from({ length: 33 }, (_, k) => {
  const id = `f${k}`
  return `<figure id="${id}" class="${k % 2 === 0 ? 'dark' : 'light'}"><figcaption>${k === 32 ? 'blink' : k}</figcaption><style>#${id} .strip{animation:none!important;transform:translateX(${-k * 220}px)}#${id} *{animation-play-state:paused!important}</style><div class="box">${close}</div></figure>`
}).join('')
writeFileSync(
  new URL('frames.html', out),
  `<!doctype html><meta charset="utf-8"><title>Pip frames</title>
<style>
body{margin:0;padding:8px;background:#222;font:12px system-ui;color:#ddd;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
figure{margin:0}.box{aspect-ratio:27/29;border-radius:6px;overflow:hidden}
.box svg{width:100%;height:100%;display:block}
.light .vd{color-scheme:light}.dark .vd{color-scheme:dark}
</style>
${frames}`,
)

console.log(`${svg.length} characters (${((svg.length / LIMIT) * 100).toFixed(1)}% of ${LIMIT})`)
if (svg.length > LIMIT) process.exitCode = 1
