// npm run a11y:contrast [base-url]
// Checks the contrast of text drawn inside the scene SVGs (hotspot labels, structure tags), which axe cannot
// do reliably because the text sits on art. For each scene it takes two screenshots of the stage, one as it
// looks and one with the letters made transparent (their white halo stays), and treats the pixels that differ
// as the letters. It compares the label colour with what is behind each letter pixel (WCAG 2.x contrast
// ratio, 4.5:1 for text) and reports labels whose 5th-percentile letter pixel falls below that.
// Start the site first (`npm run dev`). Exits 1 if any label fails.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Browser } from './cdp.ts'

const MIN = Number(process.env.CONTRAST_MIN ?? 4.5)
const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '')
const root = fileURLToPath(new URL('..', import.meta.url))
const json = (id: string) => JSON.parse(readFileSync(`${root}content/locations/${id}.json`, 'utf8'))
const locations = readdirSync(`${root}content/locations`).map((f) => json(f.slice(0, -5)))
const byId = new Map(locations.map((l) => [l.id, l]))
const pathOf = (l: any): string => (l.parent ? `${pathOf(byId.get(l.parent))}/${l.slug ?? l.id}` : `/${l.slug ?? l.id}`)

/** Runs in the page: `shot` is the stage as drawn, `bare` the same with transparent letters (data URLs). */
const measure = (shot: string, bare: string) => `(async () => {
  const load = async (src) => { const i = new Image(); await new Promise((res) => { i.onload = res; i.src = src }); return i }
  const img = await load(${JSON.stringify(shot)})
  const imgB = await load(${JSON.stringify(bare)})
  const stage = document.querySelector('.stage').getBoundingClientRect()
  const canvas = document.createElement('canvas')
  canvas.width = img.width; canvas.height = img.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const canvasB = document.createElement('canvas')
  canvasB.width = img.width; canvasB.height = img.height
  const ctxB = canvasB.getContext('2d', { willReadFrequently: true })
  ctxB.drawImage(imgB, 0, 0)
  const k = img.width / stage.width
  const lum = (r, g, b) => [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0)
  const parse = (c) => { const m = c.match(/[\\d.]+/g).map(Number); return m }
  const out = []
  for (const t of document.querySelectorAll('.zoom-layer text')) {
    if (t.closest('[aria-hidden="true"]')) continue
    const text = t.textContent.trim()
    if (!text) continue
    const cs = getComputedStyle(t)
    const fill = parse(cs.fill)
    const fl = lum(fill[0], fill[1], fill[2])
    const r = t.getBoundingClientRect()
    const x0 = Math.max(0, Math.floor((r.left - stage.left) * k)), y0 = Math.max(0, Math.floor((r.top - stage.top) * k))
    const w = Math.min(img.width - x0, Math.ceil(r.width * k)), h = Math.min(img.height - y0, Math.ceil(r.height * k))
    if (w <= 0 || h <= 0) continue
    const data = ctx.getImageData(x0, y0, w, h).data
    const bare = ctxB.getImageData(x0, y0, w, h).data
    const ratios = []
    for (let i = 0; i < data.length; i += 4) {
      // A letter pixel is one the transparent-letter picture does not have.
      const d = Math.hypot(data[i] - bare[i], data[i + 1] - bare[i + 1], data[i + 2] - bare[i + 2])
      if (d < 150) continue
      const bl = lum(bare[i], bare[i + 1], bare[i + 2])
      const [hi, lo] = fl > bl ? [fl, bl] : [bl, fl]
      ratios.push((hi + 0.05) / (lo + 0.05))
    }
    if (!ratios.length) continue
    ratios.sort((a, b) => a - b)
    // The 5th percentile ignores a few stray pixels (an outline, a speck of art) but still catches a label lying across art.
    out.push({ text: text.slice(0, 40), size: parseFloat(cs.fontSize), fill: cs.fill, p5: ratios[Math.floor(ratios.length * 0.05)], min: ratios[0] })
  }
  return out
})()`

const b = await Browser.launch(9336, { width: 1000, height: 900 })
let failures = 0
let labels = 0
let lowest = Infinity
try {
  await b.setMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  for (const l of locations.filter((l) => l.status !== 'stub')) {
    await b.goto(base + pathOf(l), 1500)
    const box = await b.eval<{ x: number; y: number; width: number; height: number }>(
      `(() => { const r = document.querySelector('.stage').getBoundingClientRect(); return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height } })()`,
    )
    const grab = () => b.send('Page.captureScreenshot', { format: 'png', clip: { ...box, scale: 2 }, captureBeyondViewport: true })
    const shot = await grab()
    await b.eval(`(() => { const s = document.createElement('style'); s.textContent = '.zoom-layer text { fill: transparent !important }'; document.head.append(s) })()`)
    const bare = await grab()
    const rows = await b.eval<{ text: string; size: number; fill: string; p5: number; min: number }[]>(measure(`data:image/png;base64,${shot.data}`, `data:image/png;base64,${bare.data}`))
    const bad = rows.filter((r) => r.p5 < MIN)
    labels += rows.length
    for (const r of rows) lowest = Math.min(lowest, r.p5)
    failures += bad.length
    console.log(`${l.id}: ${rows.length} texts, ${bad.length} below 4.5:1`)
    for (const r of bad) console.log(`    "${r.text}" ${r.size}px ${r.fill}: 5th-percentile ${r.p5.toFixed(2)}:1, worst letter pixel ${r.min.toFixed(2)}:1`)
  }
} finally {
  b.close()
}
console.log(`\n${labels} scene texts checked, ${failures} below ${MIN}:1; the lowest 5th-percentile ratio is ${lowest.toFixed(1)}:1.`)
process.exit(failures ? 1 : 0)
