// The app's colors: violet night and lavender dawn, with Pip's coral as the accent.

import { makeColors } from './make-colors.js'

export const { theme, problems } = makeColors({
  id: 'voxel-drift',
  label: 'Voxel Drift',
  roles: { accent: '#d9714f', danger: '#e0534a', success: '#3fb79f', warning: '#d9a03f', pro: '#9a7bea' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#ebe5f3',
        'surface-1': '#f2eef8',
        'surface-2': '#f9f7fc',
        'surface-3': '#f9f7fc',
        'text-primary': '#211b2e',
        'text-secondary': '#463f57',
        'text-muted': '#5e5670',
      },
    },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#13111c',
        'surface-1': '#1a1725',
        'surface-2': '#201c2d',
        'surface-3': '#262134',
        'text-primary': '#f1edf8',
        'text-secondary': '#cdc6dc',
        'text-muted': '#a69eb8',
      },
    },
  },
})
