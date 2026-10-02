// Draws the same pages from two builds in headless Chrome and compares the screenshots pixel by pixel.
// How the SVGO pass (vite.config.ts) is checked for "without changing how they look":
//   node scripts/compare-builds.ts <dist-before> <dist-after>
// The motion is switched off (reduced motion) so both builds hold still; the comparison is exact.
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { inflateSync } from 'node:zlib'
import { Browser, sleep } from './cdp.ts'

const [before, after] = process.argv.slice(2).map((p) => resolve(p))
if (!before || !after) throw new Error('usage: node scripts/compare-builds.ts <dist-before> <dist-after>')

const PAGES = process.env.PAGES ? process.env.PAGES.split(',') : [
  '/body',
  '/body/blood',
  '/body/bone-marrow',
  '/body/thymus',
  '/body/lymph-node',
  '/body/lymph-node/germinal-centre',
  '/body/spleen',
  '/body/skin',
  '/body/blood/neutrophil',
  '/tours/infection/7',
  '/styleguide',
]
const TYPES: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }

function serve(root: string, port: number): Promise<Server> {
  const server = createServer((req, res) => {
    let file = join(root, decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname))
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html')
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' })
    createReadStream(file).pipe(res)
  })
  return new Promise((r) => server.listen(port, () => r(server)))
}

/** Decodes an 8-bit, non-interlaced RGB(A) PNG (what Chrome's screenshots are) to raw RGBA. */
function decodePng(buf: Buffer) {
  let pos = 8
  let width = 0
  let height = 0
  let channels = 4
  const data: Buffer[] = []
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('latin1', pos + 4, pos + 8)
    const body = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = body.readUInt32BE(0)
      height = body.readUInt32BE(4)
      if (body[8] !== 8 || body[12] !== 0) throw new Error('unsupported PNG')
      channels = body[9] === 6 ? 4 : body[9] === 2 ? 3 : 0
      if (!channels) throw new Error('unsupported PNG colour type')
    } else if (type === 'IDAT') data.push(body)
    pos += 12 + len
  }
  const raw = inflateSync(Buffer.concat(data))
  const stride = width * channels
  const out = Buffer.alloc(height * stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x]
      const a = x >= channels ? out[y * stride + x - channels] : 0
      const b = y > 0 ? out[(y - 1) * stride + x] : 0
      const c = x >= channels && y > 0 ? out[(y - 1) * stride + x - channels] : 0
      let p = 0
      if (filter === 1) p = a
      else if (filter === 2) p = b
      else if (filter === 3) p = (a + b) >> 1
      else if (filter === 4) {
        const pa = Math.abs(b - c)
        const pb = Math.abs(a - c)
        const pc = Math.abs(a + b - 2 * c)
        p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      out[y * stride + x] = (v + p) & 255
    }
  }
  return { width, height, channels, pixels: out }
}

const servers = [await serve(before, 4190), await serve(after, 4191)]
const browser = await Browser.launch(9341, { width: 1280, height: 900 })
await browser.setMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }])

async function shot(base: string, path: string) {
  await browser.goto(`${base}${path}`, 1200)
  // Wait for the scene's labels, which the engine fills in last.
  await browser.eval(`new Promise(r => { const t = Date.now(); (function w() { const l = document.querySelector('.scene-label'); if (!l || l.textContent || Date.now() - t > 4000) r(); else setTimeout(w, 50) })() })`)
  await sleep(300)
  const r = await browser.send('Page.captureScreenshot', { format: 'png' })
  return decodePng(Buffer.from(r.data, 'base64'))
}

let failures = 0
for (const path of PAGES) {
  const a = await shot('http://localhost:4190', path)
  const b = await shot('http://localhost:4191', path)
  if (a.width !== b.width || a.height !== b.height) {
    console.log(`${path.padEnd(36)} SIZE DIFFERS`)
    failures++
    continue
  }
  let differing = 0
  let worst = 0
  let box = [Infinity, Infinity, -1, -1]
  for (let i = 0; i < a.pixels.length; i += a.channels) {
    let d = 0
    for (let c = 0; c < a.channels; c++) d = Math.max(d, Math.abs(a.pixels[i + c] - b.pixels[i + c]))
    if (d) {
      differing++
      const px = (i / a.channels) % a.width
      const py = Math.floor(i / a.channels / a.width)
      box = [Math.min(box[0], px), Math.min(box[1], py), Math.max(box[2], px), Math.max(box[3], py)]
      worst = Math.max(worst, d)
    }
  }
  const total = a.width * a.height
  console.log(`${path.padEnd(36)} ${differing} of ${total} pixels differ (${((100 * differing) / total).toFixed(3)}%), largest channel step ${worst}${differing ? `, within x ${box[0]}-${box[2]} y ${box[1]}-${box[3]}` : ''}`)
  if (differing) failures++
}
browser.close()
servers.forEach((s) => s.close())
process.exit(failures ? 1 : 0)
