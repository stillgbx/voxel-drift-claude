import type { ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BACKDROP = {
  plugin: 'voxel-drift',
  component: 'Backdrop',
  props: { scene: 'voxel-drift', plugin: 'voxel-drift', glass: { blur: 18, opacity: 0.6 } },
} as const

test('the look is set at start, over the scene, and /drift still drops the scene', async ($, on) => {
  const sets: ThemeSetArgs[] = []
  mock.store(on)
  on('command.register', () => ({ value: { command: 'drift' } }))
  on('theme.set', (_, e) => {
    sets.push(e)
    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  expect(sets[0]?.backdrop).toEqual({ scene: 'voxel-drift', glass: { blur: 18, opacity: 0.6 } })
  expect(sets[0]?.colors).toBeDefined()

  const still = await $.command.run({
    command: 'drift',
    args: 'still',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 80 },
  })
  expect(still).toEqual({ text: 'Voxel Drift, the colors alone.' })
  expect(sets[1]?.backdrop).toBeUndefined()
})

test('the backdrop draws the scene on desktop and mobile, within the size a backdrop holds', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BACKDROP, surface })
    const svg = await ui.find({ type: 'Svg' })
    const source = String(svg?.props.source)
    expect(source.startsWith('<svg')).toBe(true)
    expect(source.length).toBeLessThan(131072)
    await ui.unmount()
  }
})

test("another plugin's backdrop is left alone", async $ => {
  const ui = await $.ui.mount({ ...BACKDROP, props: { ...BACKDROP.props, scene: 'lagoon', plugin: 'other' }, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})
