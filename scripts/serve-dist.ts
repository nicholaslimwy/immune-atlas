// Serves dist/ the way a static host would: brotli or gzip, long caching for hashed files, and the
// address rules of GitHub Pages. `vite preview` sends everything uncompressed, which makes every
// performance number look worse than production. Used by `npm run perf` (scripts/perf.ts).
//
//   node scripts/serve-dist.ts [port] [folder] [--base=/immune-atlas/] [--dir-first]
//
// (run `npm run build` first; folder defaults to dist). An address is answered, like GitHub Pages, by
// the file itself, then `<address>.html`, then a folder (redirected to end in "/", then its index.html),
// then 404.html with status 404; a dist without 404.html falls back to index.html. --base serves the site
// under a folder, as GitHub Pages does for a project site (build with BASE_PATH set to match);
// --dir-first tries the folder before `<address>.html`, the other order a host might use.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import { createBrotliCompress, createGzip, constants } from 'node:zlib'

const flags = process.argv.slice(2).filter((a) => a.startsWith('--'))
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const root = resolve(args[1] ?? join(import.meta.dirname, '..', 'dist'))
const port = Number(args[0] ?? 4173)
const base = `/${(flags.find((f) => f.startsWith('--base='))?.slice(7) ?? '').replace(/^\/+|\/+$/g, '')}/`.replace('//', '/')
const dirFirst = flags.includes('--dir-first')

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

const isFile = (f: string) => existsSync(f) && statSync(f).isFile()
const isDir = (f: string) => existsSync(f) && statSync(f).isDirectory()

/** The file that answers `path` (inside the base folder), a redirect, or the not-found page. */
function lookup(path: string): { file: string; status: number } | { redirect: string } {
  const notFound = isFile(join(root, '404.html'))
    ? { file: join(root, '404.html'), status: 404 }
    : { file: join(root, 'index.html'), status: 200 }
  if (!path.startsWith(base) && `${path}/` !== base) return notFound
  if (`${path}/` === base) return { redirect: base }
  const file = normalize(join(root, decodeURIComponent(path.slice(base.length))))
  if (!file.startsWith(root)) return notFound
  if (isFile(file)) return { file, status: 200 }
  const html = () => (!path.endsWith('/') && isFile(`${file}.html`) ? { file: `${file}.html`, status: 200 } : undefined)
  const dir = () => {
    if (!isDir(file)) return undefined
    if (!path.endsWith('/')) return { redirect: `${path}/` }
    return isFile(join(file, 'index.html')) ? { file: join(file, 'index.html'), status: 200 } : undefined
  }
  return (dirFirst ? dir() ?? html() : html() ?? dir()) ?? notFound
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const found = lookup(url.pathname)
  if ('redirect' in found) {
    res.writeHead(301, { Location: found.redirect + url.search }).end()
    return
  }
  const { file, status } = found
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
    res.writeHead(status, { ...headers, 'Content-Encoding': 'br' })
    source.pipe(createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })).pipe(res)
  } else if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(accept)) {
    res.writeHead(status, { ...headers, 'Content-Encoding': 'gzip' })
    source.pipe(createGzip()).pipe(res)
  } else {
    res.writeHead(status, headers)
    source.pipe(res)
  }
}).listen(port, () => console.log(`Serving ${root} on http://localhost:${port}${base}${dirFirst ? ' (folders first)' : ''}`))
