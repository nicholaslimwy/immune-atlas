// Serves dist/ the way a static host would: brotli or gzip, long caching for hashed files, and a
// fallback to index.html for unknown paths. `vite preview` sends everything uncompressed, which makes
// every performance number look worse than production. Used by `npm run perf` (scripts/perf.ts).
//
//   node scripts/serve-dist.ts [port] [folder]      (run `npm run build` first; folder defaults to dist)
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { createBrotliCompress, createGzip, constants } from 'node:zlib'

const root = resolve(process.argv[3] ?? join(import.meta.dirname, '..', 'dist'))
const port = Number(process.argv[2] ?? 4173)

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg'])

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  let file = normalize(join(root, decodeURIComponent(url.pathname)))
  if (!file.startsWith(root)) {
    res.writeHead(403).end()
    return
  }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html')
  const ext = extname(file)
  const headers: Record<string, string> = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    // Hashed bundles never change under the same name; scenes and the page itself must be revalidated.
    'Cache-Control': file.includes(`${join(root, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    Vary: 'Accept-Encoding',
  }
  const accept = String(req.headers['accept-encoding'] ?? '')
  const source = createReadStream(file)
  if (COMPRESSIBLE.has(ext) && /\bbr\b/.test(accept)) {
    res.writeHead(200, { ...headers, 'Content-Encoding': 'br' })
    source.pipe(createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })).pipe(res)
  } else if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(accept)) {
    res.writeHead(200, { ...headers, 'Content-Encoding': 'gzip' })
    source.pipe(createGzip()).pipe(res)
  } else {
    res.writeHead(200, headers)
    source.pipe(res)
  }
}).listen(port, () => console.log(`Serving dist/ on http://localhost:${port}`))
