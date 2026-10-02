// Lighthouse performance numbers for the built site: `npm run build && npm run perf`.
// Serves dist/ with compression (scripts/serve-dist.ts), runs Lighthouse through npx (it is not a
// dependency of the project) on a few key pages in two setups, and prints one table of medians.
//   --dist=folder (default dist) measures another build, e.g. a saved copy to compare against
//   mobile  = Lighthouse's default: Moto G Power, simulated slow 4G (1.6 Mbps, 150 ms), 4x CPU slowdown
//   desktop = Lighthouse's desktop preset: no CPU slowdown, fast network
// Options: --runs=N (default 3, the median run is reported)  --only=mobile|desktop  --pages=/body,/network
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const RUNS = Number(arg('runs') ?? 3)
const ONLY = arg('only')
const PAGES = (arg('pages') ?? '/body,/body/lymph-node,/network,/tours/infection/1').split(',')
const DIST = arg('dist') ?? 'dist'
const PORT = 4173
const CHROME = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const out = join(tmpdir(), 'immune-atlas-lighthouse')
mkdirSync(out, { recursive: true })

const server = spawn(process.execPath, [join(import.meta.dirname, 'serve-dist.ts'), String(PORT), DIST], { stdio: 'ignore' })
process.on('exit', () => server.kill())
await new Promise((r) => setTimeout(r, 1500))

interface Result {
  score: number
  fcp: number
  lcp: number
  tbt: number
  cls: number
  si: number
  tti: number
  kb: number
  requests: number
}

function run(path: string, mode: 'mobile' | 'desktop', n: number): Result {
  const file = join(out, `${mode}-${path.replace(/\W+/g, '_')}-${n}.json`)
  const args = [
    '-y',
    'lighthouse',
    `http://localhost:${PORT}${path}`,
    '--only-categories=performance',
    '--output=json',
    `--output-path=${file}`,
    '--chrome-flags=--headless=new --no-sandbox',
    '--quiet',
    ...(mode === 'desktop' ? ['--preset=desktop'] : []),
  ]
  // Lighthouse occasionally dies on a slow machine; one retry is enough in practice.
  let status: number | null = 1
  for (let attempt = 0; attempt < 2 && status !== 0; attempt++) {
    status = spawnSync('npx', args, { env: { ...process.env, CHROME_PATH: CHROME }, shell: true, stdio: 'ignore' }).status
  }
  if (status !== 0) throw new Error(`lighthouse failed for ${mode} ${path}`)
  const lhr = JSON.parse(readFileSync(file, 'utf8'))
  const a = lhr.audits
  return {
    score: Math.round(lhr.categories.performance.score * 100),
    fcp: a['first-contentful-paint'].numericValue,
    lcp: a['largest-contentful-paint'].numericValue,
    tbt: a['total-blocking-time'].numericValue,
    cls: a['cumulative-layout-shift'].numericValue,
    si: a['speed-index'].numericValue,
    tti: a['interactive'].numericValue,
    kb: a['total-byte-weight'].numericValue / 1024,
    requests: a['network-requests'].details.items.length,
  }
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]
const s = (ms: number) => (ms / 1000).toFixed(1)

console.log(`Lighthouse ${RUNS} run(s) per row, median reported\n`)
console.log('setup    page                       score  FCP    LCP    TBT     CLS    SI     TTI    KB     reqs')
for (const mode of ['mobile', 'desktop'] as const) {
  if (ONLY && ONLY !== mode) continue
  for (const path of PAGES) {
    const runs = Array.from({ length: RUNS }, (_, i) => run(path, mode, i))
    const m = (k: keyof Result) => median(runs.map((r) => r[k]))
    console.log(
      `${mode.padEnd(8)} ${path.padEnd(26)} ${String(m('score')).padEnd(6)} ${s(m('fcp')).padEnd(6)} ${s(m('lcp')).padEnd(6)} ${String(Math.round(m('tbt'))).padEnd(7)} ${m('cls').toFixed(3).padEnd(6)} ${s(m('si')).padEnd(6)} ${s(m('tti')).padEnd(6)} ${String(Math.round(m('kb'))).padEnd(6)} ${m('requests')}`,
    )
  }
}
server.kill()
