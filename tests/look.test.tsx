import type { ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const backdrop = (scene: string) =>
  ({
    plugin: 'voxel-drift',
    component: 'Backdrop',
    props: { scene, plugin: 'voxel-drift', glass: { blur: 18, opacity: 0.6 } },
  }) as const

const run = (args: string) => ({
  command: 'drift',
  args,
  origin: { kind: 'composer' as const },
  presentation: { isFullscreen: false, columns: 80 },
})

test('the look starts on the earth variant, and /drift switches variant or drops the scene', async ($, on) => {
  const sets: ThemeSetArgs[] = []
  mock.store(on)
  on('command.register', () => ({ value: { command: 'drift' } }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets[0]?.backdrop).toEqual({ scene: 'voxel-drift-earth', glass: { blur: 18, opacity: 0.6 } })
  expect(sets[0]?.colors).toBeDefined()

  expect(await $.command.run(run('solar'))).toEqual({ text: 'Voxel Drift: the solar system turning, with Pip watching.' })
  expect(sets[1]?.backdrop).toEqual({ scene: 'voxel-drift-solar', glass: { blur: 18, opacity: 0.6 } })

  expect(await $.command.run(run('left'))).toEqual({ text: 'Voxel Drift: the solar system turning, with Pip watching, Pip on the left.' })

  expect(await $.command.run(run('still'))).toEqual({ text: 'Voxel Drift, the colors alone.' })
  expect(sets[3]?.backdrop).toBeUndefined()

  expect(await $.command.run(run('nebula'))).toEqual({
    text: 'Unknown: nebula. Use /drift earth | solar | left | right | scene | still | off',
  })
})

test('every variant draws on desktop and mobile, within the size a backdrop holds', async $ => {
  for (const scene of ['voxel-drift', 'voxel-drift-asteroid', 'voxel-drift-earth', 'voxel-drift-solar']) {
    for (const surface of ['desktop', 'mobile'] as const) {
      const ui = await $.ui.mount({ ...backdrop(scene), surface })
      const source = String((await ui.find({ type: 'Svg' }))?.props.source)
      expect(source.startsWith('<svg')).toBe(true)
      // The style is text in the SVG: a `<` in it would open a tag and cut it short.
      expect(source.slice(source.indexOf('<style>') + 7, source.indexOf('</style>'))).not.toContain('<')
      expect(source.length).toBeLessThan(131072)
      // Every delay is written out as a number, stamped with the time it's drawn.
      expect(source).not.toContain('{{')
      expect(source).not.toContain('var(--t)')
      expect(source).toMatch(/animation-delay:-\d+\.\d{3}s/)
      await ui.unmount()
    }
  }
})

test('Pip gets to work during a turn, is pleased by the answer, then rests', async ($, on) => {
  const clock = mock.clock(on)
  const svg = async (): Promise<string> => {
    const ui = await $.ui.mount({ ...backdrop('voxel-drift-earth'), surface: 'desktop' })
    const source = String((await ui.find({ type: 'Svg' }))?.props.source)
    await ui.unmount()
    return source
  }
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  const turn = { turnId: 't1', answer: 'done', durationMs: 1000, isAborted: false }

  expect(await svg()).not.toContain('@keyframes pulse')
  await $.turn.start({ text: 'hello', turnId: 't1' })
  expect(await svg()).toContain('@keyframes pulse')

  await $.turn.complete({ ...turn, reason: 'answer' })
  expect(await svg()).toContain('@keyframes hop')
  await clock.advance(6000)
  const rest = await svg()
  expect(rest).not.toContain('@keyframes hop')
  expect(rest).not.toContain('@keyframes pulse')

  await $.turn.start({ text: 'again', turnId: 't2' })
  await $.turn.complete({ ...turn, turnId: 't2', isAborted: true, reason: 'aborted' })
  expect(await svg()).not.toContain('@keyframes hop')
})

test("another plugin's backdrop is left alone", async $ => {
  const ui = await $.ui.mount({ ...backdrop('lagoon'), props: { ...backdrop('lagoon').props, plugin: 'other' }, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})
