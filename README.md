# Voxel Drift

A 3D theme for Claude Desktop. Violet night in dark mode and lavender dawn in light mode, over Pip: a small coral voxel creature with glowing antennae. Pip stands on a floating asteroid while stars drift past. It rests facing the conversation, blinks, glances around and sometimes does a happy full turn.

![Preview](Preview/scene.svg)

## How the 3D works

A backdrop is one SVG with no script, so the 3D runs once, when the mod loads. [`hooks/scene.ts`](hooks/scene.ts) has a small voxel renderer. It projects Pip at 32 angles, keeps only the faces the camera sees, shades them from one light and orders them back to front. Faces of one shade are merged into single paths, which keeps the scene under the 131,072 characters a backdrop may hold. A CSS `steps()` animation then plays the frames like a flip book. The asteroid, stars and planet are plain SVG with CSS animations, and everything stops under reduced motion.

To draw another creature, edit the voxel cells in `pip()` in `hooks/scene.ts`.

## Commands

- `/drift scene`: Pip and the stars (the default).
- `/drift still`: the colors alone.
- `/drift off`: back to the app's own look, for this session.

## Developing

```bash
node scripts/preview.ts
```

This writes `Preview/scene.svg`, `Preview/index.html` (the scene in dark and light) and `Preview/frames.html` (every frame, still), and prints the scene's size.

```bash
claude plugin validate .
```

```bash
claude plugin test .
```
