# Changelog

## 0.1.2

* The scenes no longer freeze, planets in a line, while Claude works or the conversation scrolls: they cost about half as much to draw. The stars twinkle in four groups rather than one by one, and the sun's flares change color in fine steps, a few a second.
* The scene and Pip drift slowly up and down, each at its own pace over a few minutes, so nothing stays long on the same pixels of the screen. With Pip on the left of the solar system, Pip rises and falls with the sun.
* Pip's routine carries on where it was when the scene is drawn again, rather than starting over.

## 0.1.1

* The plugin has an icon: Pip at rest on its asteroid in the night sky, the Earth in the distance, square at 512 px.

## 0.1.0

* Violet night and lavender dawn colors for the whole Claude desktop app.
* **Earth**: Pip, a small coral voxel creature, on a floating asteroid among drifting stars, with a voxel Earth and its Moon in the distance.
* **Solar**: a voxel sun that boils softly and eight planets on slow tilted orbits, passing behind the sun on the far side, with their main moons: the Moon, Io, Europa, Ganymede, Callisto, Titan and Triton.
* Pip follows Claude's turns: it rests between turns, scans about with its antennae pulsing while Claude works, and hops and turns when the answer is in.
* The planets and stars carry on where they were when Pip's mood changes.
* `/drift earth | solar | left | right | scene | still | off` to switch.
* The 3D is rendered once, when the mod loads, by a small voxel renderer that writes SVG: the scenes run no script.
