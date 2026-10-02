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

/**
 * Pages that load their own chunks (App.tsx lazy routes, the network graph) would otherwise request them
 * only after the app has started and rendered. For a visit that begins on one of those URLs, preload the
 * chunks from a tiny inline script, so they download alongside the main bundle instead of after it.
 */
function preloadRoutes(): Plugin {
  const ROUTES: Record<string, string[]> = {
    network: ['src/routes/Network.tsx', 'src/components/NetworkGraph.tsx'],
    glossary: ['src/routes/GlossaryIndex.tsx', 'src/routes/GlossaryEntry.tsx'],
  }
  let base = '/'
  return {
    name: 'atlas-preload-routes',
    apply: 'build',
    configResolved(config) {
      base = config.base
    },
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const bundle = ctx.bundle ?? {}
        const chunks = Object.values(bundle).filter((c) => c.type === 'chunk')
        const byName = new Map(chunks.map((c) => [c.fileName, c]))
        const table: Record<string, string[]> = {}
        for (const [route, sources] of Object.entries(ROUTES)) {
          const files = new Set<string>()
          const add = (name: string) => {
            const chunk = byName.get(name)
            if (!chunk || chunk.isEntry || files.has(name)) return
            files.add(name)
            chunk.imports.forEach(add)
          }
          for (const source of sources) {
            const chunk = chunks.find((c) => c.facadeModuleId?.replaceAll('\\', '/').endsWith(source))
            if (chunk) add(chunk.fileName)
          }
          table[route] = [...files]
        }
        const code =
          `var t=${JSON.stringify(table)},b=${JSON.stringify(base)},r=location.pathname.slice(b.length).split('/')[0];` +
          `(t[r]||[]).forEach(function(f){var l=document.createElement('link');l.rel='modulepreload';l.href=b+f;document.head.appendChild(l)})`
        return [{ tag: 'script', children: code, injectTo: 'head' }]
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), svgo(), preloadRoutes()],
})
