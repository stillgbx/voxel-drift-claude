// Lets Node run the hooks' TypeScript as the engine does: an import with no extension
// (`./voxel`) finds the `.ts` file.
//
//   node --import ./scripts/ts-resolve.mjs scripts/preview.ts

import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context)
    } catch (error) {
      if (specifier.startsWith('.') && !/\.[cm]?[jt]sx?$/.test(specifier)) return next(`${specifier}.ts`, context)
      throw error
    }
  },
})
