// Writes the plugin's icon as an SVG, Preview/icon.svg: Pip at rest on its asteroid in the
// night sky, with the Earth in the distance. A browser turns it into .claude-plugin/icon.png,
// 512 px square.
//
//   node --import ./scripts/ts-resolve.mjs scripts/icon.ts

import { writeFileSync } from 'node:fs'

import { portrait } from '../hooks/pip.ts'
import { draw, earthPaint } from '../hooks/solar.ts'
import { ball, random, Shades } from '../hooks/voxel.ts'

const pip = portrait()
const shades = new Shades()
const earth = draw(ball(3.4, earthPaint(3.4, 0.5, 0.82)), 10, shades)

const rnd = random(9)
let stars = ''
for (let i = 0; i < 46; i++) {
  const x = Math.round(rnd() * 512)
  const y = Math.round(rnd() * 512)
  stars += `<circle cx="${x}" cy="${y}" r="${(0.7 + rnd() * rnd() * 1.8).toFixed(1)}" opacity="${(0.35 + rnd() * 0.6).toFixed(2)}"/>`
}

const svg =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
  `<style>svg{color-scheme:dark}${pip.css}${shades.rules()}</style>` +
  `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b16"/><stop offset="1" stop-color="#1f1530"/></linearGradient>` +
  `<radialGradient id="neb" cx=".3" cy=".25" r=".6"><stop offset="0" stop-color="#3a2361" stop-opacity=".9"/><stop offset="1" stop-color="#3a2361" stop-opacity="0"/></radialGradient>` +
  `<radialGradient id="warm" cx=".7" cy=".8" r=".55"><stop offset="0" stop-color="#4f2238" stop-opacity=".8"/><stop offset="1" stop-color="#4f2238" stop-opacity="0"/></radialGradient>` +
  `<filter id="halo" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#ff8d66" flood-opacity=".35"/></filter></defs>` +
  `<rect width="512" height="512" fill="url(#sky)"/><rect width="512" height="512" fill="url(#neb)"/><rect width="512" height="512" fill="url(#warm)"/>` +
  `<g fill="#fff">${stars}</g>` +
  `<g transform="translate(112 104)">${earth}</g>` +
  `<g transform="translate(268 318) scale(1.32)" filter="url(#halo)">${pip.body}</g>` +
  `</svg>`

writeFileSync(new URL('../Preview/icon.svg', import.meta.url), svg)
console.log(`${svg.length} characters`)
