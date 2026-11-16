import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { problems, theme } from './colors'
import { SIDES } from './pip'
import { svgOf, VARIANT_IDS, VARIANTS, type Mood, type Side, type VariantId } from './scenes'
import { stamp } from './sky'

// Voxel Drift for Claude Desktop: violet night and lavender dawn, over a voxel scene where
// Pip, a small creature, helps unravel the mysteries of space. Pip follows Claude: it rests
// between turns, gets to work while Claude answers, and is pleased when the answer is in.
//
//   /drift earth | solar      pick the scene
//   /drift left | right       the side Pip stands on: the left stays clear of a panel open
//                             on the right of the window
//   /drift scene | still      the scene, or the colors alone
//   /drift off                back to the app's own look (for this session)

type Backdrop = 'scene' | 'still'
/** A scene's name holds letters, digits, _ and - alone. */
const PREFIX = 'voxel-drift-'
const DEFAULT: VariantId = 'earth'
/** Names a variant had before, still read from the store and from a scene already set. */
const FORMERLY: Record<string, VariantId> = { asteroid: 'earth' }
const current = (name: unknown): unknown => (typeof name === 'string' && name in FORMERLY ? FORMERLY[name] : name)

/** How long Pip stays pleased after an answer, before it rests: its turn, and a moment. */
const DONE_MS = 5500

const UNPAINTED = problems.find(line => line.startsWith("Desktop won't paint"))

const isBackdrop = (value: unknown): value is Backdrop => value === 'scene' || value === 'still'
const isVariant = (value: unknown): value is VariantId => VARIANT_IDS.includes(value as VariantId)
const isSide = (value: unknown): value is Side => SIDES.includes(value as Side)

const USAGE = `/drift ${VARIANT_IDS.join(' | ')} | left | right | scene | still | off`

// Pip's mood, for the session (a reload starts it over, at rest), and the side it stands on,
// as stored: the backdrop's drawing reads both.
let mood: Mood = 'idle'
let side: Side = 'right'
/** When Pip's mood began: its routine and its hop carry on from there when drawn again. */
let began = Date.now()
let settle: { cancel: () => void } | undefined

async function apply($: EngineInterface): Promise<string> {
  const storedBackdrop = await $.store.get('backdrop')
  const storedVariant = current(await $.store.get('variant'))
  const storedSide = await $.store.get('side')
  side = isSide(storedSide) ? storedSide : 'right'
  const backdrop: Backdrop = isBackdrop(storedBackdrop) ? storedBackdrop : 'scene'
  const variant: VariantId = isVariant(storedVariant) ? storedVariant : DEFAULT
  if (UNPAINTED !== undefined) $.ui.toast(UNPAINTED)

  const args: ThemeSetArgs =
    backdrop === 'scene'
      ? { colors: theme, backdrop: { scene: PREFIX + variant, glass: { blur: 18, opacity: 0.6 } } }
      : { colors: theme }
  const set = await $.theme.set(args)
  // Drawn again, in case only the side changed and the scene kept its name.
  $.ui.invalidate('ui.render')
  if (!set.isDrawn) return `Voxel Drift is set, but nothing draws it here: ${set.reason}`
  if (backdrop === 'still') return 'Voxel Drift, the colors alone.'
  return `Voxel Drift: ${VARIANTS[variant].summary}${side === 'left' ? ', Pip on the left' : ''}.`
}

/** Sets Pip's mood; the backdrop is drawn again whenever it changes. */
function feel($: EngineInterface, next: Mood): void {
  if (mood === next) return
  mood = next
  began = Date.now()
  $.ui.invalidate('ui.render')
}

export const register: Register = on => {
  on('turn.start', ($, e, next) => {
    if (e.agentId === undefined) {
      settle?.cancel()
      feel($, 'busy')
    }
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    // The main turn alone: a subagent's end is not the answer.
    if (e.agentId === undefined) {
      settle?.cancel()
      // Pleased only by an answer: a turn stopped or failed sends Pip back to rest.
      if (e.reason !== 'answer') return next(e).finally(() => feel($, 'idle'))
      feel($, 'done')
      settle = $.clock.after(DONE_MS, () => feel($, 'idle'))
    }
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'drift', description: `Voxel Drift look: ${USAGE}` })
    await apply($)
    return next(e)
  })

  on('command.run', { command: 'drift' }, async ($, e) => {
    const words = e.args.trim().toLowerCase().split(/\s+/).filter(Boolean)
    if (words.includes('off')) {
      await $.theme.clear()
      return { text: 'Voxel Drift is off for this session. /drift brings it back.' }
    }
    const unknown = words.filter(word => !isVariant(word) && !isSide(word) && !isBackdrop(word))
    if (unknown.length > 0) return { text: `Unknown: ${unknown.join(' ')}. Use ${USAGE}` }
    for (const word of words) {
      if (isVariant(word)) {
        await $.store.set('variant', word)
        await $.store.set('backdrop', 'scene')
      }
      if (isSide(word)) await $.store.set('side', word)
      if (isBackdrop(word)) await $.store.set('backdrop', word)
    }
    return { text: await apply($) }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') return next(e)
    // `voxel-drift` alone is what the first version set: the earth variant.
    const variant = e.props.scene === 'voxel-drift' ? DEFAULT : current(e.props.scene.slice(PREFIX.length))
    if (!e.props.scene.startsWith('voxel-drift') || !isVariant(variant)) return next(e)

    // The backdrop takes no pointer, so the drawing is all there is: no Button, no hover. Nor
    // does it learn which panels are open (its viewport stays the same), hence the side to pick.
    // Stamped with the time, so what loops carries on from where it was when it's redrawn,
    // and with when the mood began, so Pip's routine does too.
    const { Svg } = $.ui.resolve(e)
    return <Svg source={stamp(svgOf(variant, mood, side), Date.now(), began)} alt={VARIANTS[variant].alt} isInteractive />
  })
}
