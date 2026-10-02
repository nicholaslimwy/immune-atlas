import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { optimiseSvg } from './scripts/optimise-svg.ts'

/**
 * Shrinks every SVG that ships with SVGO (settings in scripts/optimise-svg.ts) while leaving the
 * sources in public/scenes and src/icons as written: the scenes are copied to dist/scenes and
 * optimised there, and the icons are optimised as they are imported into the sprite.
 */
function svgo(): Plugin {
  let outDir = 'dist'
  return {
    name: 'atlas-svgo',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) {
      outDir = join(config.root, config.build.outDir)
    },
    // `import.meta.glob('../icons/*.svg', { query: '?raw' })` in src/art/icons.ts
    load(id) {
      const [file, query] = id.split('?')
      if (query !== 'raw' || !/[\\/]src[\\/]icons[\\/][^\\/]+\.svg$/.test(file)) return null
      return `export default ${JSON.stringify(optimiseSvg(readFileSync(file, 'utf8'), file))}`
    },
    // Runs once the public folder has been copied into dist.
    closeBundle() {
      const dir = join(outDir, 'scenes')
      for (const name of readdirSync(dir).filter((n) => n.endsWith('.svg'))) {
        const file = join(dir, name)
        writeFileSync(file, optimiseSvg(readFileSync(file, 'utf8'), file))
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgo()],
})
