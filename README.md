# Voxel Drift

A 3D theme for Claude Desktop. Violet night in dark mode and lavender dawn in light mode, over voxel scenes where Pip, a small coral creature with glowing antennae, helps unravel the mysteries of space.

Pip follows Claude. Between turns it rests facing the conversation, blinks, glances around and sometimes does a full turn. While Claude works, it scans about with its antennae pulsing. When the answer is in, it hops and turns, pleased, then goes back to rest.

## Variants

- **earth**: Pip on a floating asteroid while stars drift past, the Earth in voxels and its Moon in the distance.
- **solar**: the solar system, the sun on the left and its eight planets on slow tilted orbits across the window, the Moon turning around the Earth, with Pip watching from its corner.

![Pip in view of the Earth](Preview/earth.svg)

![The solar system](Preview/solar.svg)

## How the 3D works

A backdrop is one SVG with no script, so the 3D runs once, when the mod loads. [`hooks/voxel.ts`](hooks/voxel.ts) is a small voxel renderer. It projects Pip at 32 angles, keeps only the faces the camera sees, shades them from one light and orders them back to front. Faces of one shade are merged into single paths, which keeps each scene under the 131,072 characters a backdrop may hold. A CSS `steps()` animation then plays Pip's frames like a flip book. The planets are rendered once each, and their orbits are CSS alone: a group squashed into an ellipse turns, and an inner group turns back so the planet stays upright. Each mood of Pip's is its own drawing of the scene, and the mod draws the backdrop again when a turn starts or ends. Everything stops under reduced motion.

The backdrop takes no pointer: neither hover nor clicks reach it in the app, so Pip follows Claude rather than the mouse.

To draw another creature, edit the voxel cells in `pip()` in [`hooks/pip.ts`](hooks/pip.ts). Each variant is listed in [`hooks/scenes.ts`](hooks/scenes.ts).

## Commands

- `/drift earth`, `/drift solar`: pick the variant (earth is the default).
- `/drift left`, `/drift right`: the side Pip stands on (right is the default). The left stays clear when a panel is open on the right of the window: the backdrop can't tell which panels are open, so the side is yours to pick.
- `/drift scene`: the scene again, after `still`.
- `/drift still`: the colors alone.
- `/drift off`: back to the app's own look, for this session.

## Developing

```bash
node --import ./scripts/ts-resolve.mjs scripts/preview.ts
```

This writes `Preview/<variant>.svg`, `Preview/index.html` (every variant in each of Pip's moods, in dark and light) and `Preview/frames.html` (each of Pip's frames, still), and prints each scene's size.

```bash
claude plugin validate .
```

```bash
claude plugin test .
```
