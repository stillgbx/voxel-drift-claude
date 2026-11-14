import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { problems, theme } from './colors'
import { SCENE_ALT, sceneSvg } from './scene'

// Voxel Drift for Claude Desktop: violet night and lavender dawn, over Pip, a voxel creature
// turning on its asteroid among drifting stars.
//
//   /drift scene | still    Pip and the stars, or the colors alone
//   /drift off              back to the app's own look (for this session)

type Backdrop = 'scene' | 'still'

const SCENE = 'voxel-drift'

const UNPAINTED = problems.find(line => line.startsWith("Desktop won't paint"))

/** Drawn once: the 3D runs here, at load, and the backdrop only steps through its frames. */
const SVG = sceneSvg()

const isBackdrop = (value: unknown): value is Backdrop => value === 'scene' || value === 'still'

async function apply($: EngineInterface): Promise<string> {
  const stored = await $.store.get('backdrop')
  const backdrop: Backdrop = isBackdrop(stored) ? stored : 'scene'
  if (UNPAINTED !== undefined) $.ui.toast(UNPAINTED)

  const args: ThemeSetArgs =
    backdrop === 'scene' ? { colors: theme, backdrop: { scene: SCENE, glass: { blur: 18, opacity: 0.6 } } } : { colors: theme }
  const set = await $.theme.set(args)
  if (!set.isDrawn) return `Voxel Drift is set, but nothing draws it here: ${set.reason}`
  return backdrop === 'scene' ? 'Voxel Drift, with Pip among the stars.' : 'Voxel Drift, the colors alone.'
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'drift', description: 'Voxel Drift look: /drift scene | still | off' })
    await apply($)
    return next(e)
  })

  on('command.run', { command: 'drift' }, async ($, e) => {
    const word = e.args.trim().toLowerCase()
    if (word === 'off') {
      await $.theme.clear()
      return { text: 'Voxel Drift is off for this session. /drift brings it back.' }
    }
    if (word !== '' && !isBackdrop(word)) return { text: `Unknown: ${word}. Use /drift scene | still | off` }
    if (isBackdrop(word)) await $.store.set('backdrop', word)
    return { text: await apply($) }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE) return next(e)
    const { Svg } = $.ui.resolve(e)
    return <Svg source={SVG} alt={SCENE_ALT} isInteractive />
  })
}
