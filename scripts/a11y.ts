// npm run a11y [base-url]
// Runs axe-core (WCAG 2.2 A and AA rules) in headless Chrome on every route of a running site
// (default http://localhost:5173, start it with `npm run dev`): every scene, every cell panel, every
// tour step, the glossary, the network (graph and list) and a few open states (search results, a
// molecule tooltip, a highlight filter), at desktop width and at 320 px (also checking that nothing scrolls sideways). Exits 1 if axe finds anything.
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Browser, sleep } from './cdp.ts'

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '')
const root = fileURLToPath(new URL('..', import.meta.url))
const axeSource = readFileSync(fileURLToPath(new URL('../node_modules/axe-core/axe.min.js', import.meta.url)), 'utf8')

const ids = (dir: string) => readdirSync(`${root}content/${dir}`).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5))
const json = (dir: string, id: string) => JSON.parse(readFileSync(`${root}content/${dir}/${id}.json`, 'utf8'))

// Scene URLs from the location tree (slug when it differs from the id; stubs have no URL).
const locations = ids('locations').map((id) => json('locations', id))
const byId = new Map(locations.map((l) => [l.id, l]))
const pathOf = (l: any): string => (l.parent ? `${pathOf(byId.get(l.parent))}/${l.slug ?? l.id}` : `/${l.slug ?? l.id}`)
const built = locations.filter((l) => l.status !== 'stub')
// motion: run with reduced motion off (every other route runs with it on), for what only moving scenes show.
const routes: { name: string; path: string; before?: string; motion?: boolean }[] = []
for (const l of built) routes.push({ name: `scene ${l.id}`, path: pathOf(l) })
for (const id of ids('cells')) {
  const home = built.find((l) => l.residents.some((r: any) => r.cell === id) && l.hotspots.some((h: any) => h.target === id))
  if (home) routes.push({ name: `cell ${id}`, path: `${pathOf(home)}/${id}` })
}
for (const l of built) for (const r of l.regions ?? []) routes.push({ name: `region ${l.id}/${r.id}`, path: `${pathOf(l)}/${r.id}` })
for (const [folder, kind] of [['tours', 'tour'], ['processes', 'process']]) {
  for (const t of ids(folder)) {
    const n = json(folder, t).steps.length
    for (let i = 1; i <= n; i++) routes.push({ name: `${kind} ${t} step ${i}`, path: `/${folder}/${t}/${i}` })
    routes.push({ name: `${kind} ${t} end`, path: `/${folder}/${t}/end` })
  }
}
routes.push({ name: 'glossary', path: '/glossary' })
for (const id of ids('molecules')) routes.push({ name: `glossary entry ${id}`, path: `/glossary/${id}` })
routes.push({ name: 'network graph', path: '/network' })
routes.push({ name: 'network list', path: '/network?view=list' })
routes.push({ name: 'styleguide', path: '/styleguide' })
routes.push({ name: 'about', path: '/about' })
routes.push({ name: 'not found', path: '/nowhere' })
// Open states.
routes.push({
  name: 'search results',
  path: '/body',
  before: `(() => { const i = document.querySelector('.search-input'); i.focus(); })()`,
})
routes.push({ name: 'highlight filter: innate', path: '/body/lymph-node', before: `localStorage.setItem('immune-atlas:arm-filter', 'innate'); location.reload()` })
// A scene loop's Pause/Play button and Sped up label are only there with motion on.
for (const id of ids('loops')) {
  const loop = json('loops', id)
  const at = built.find((l) => l.id === loop.location)
  if (at) routes.push({ name: `loop ${id} with motion`, path: pathOf(at), motion: true })
  if (loop.process) routes.push({ name: `loop ${id} with motion, process step 2`, path: `/processes/${loop.process}/2`, motion: true })
}

// A11Y_ONLY=<regex> limits the run to routes whose name matches (for rechecking a fix).
const only = process.env.A11Y_ONLY ? new RegExp(process.env.A11Y_ONLY, 'i') : undefined
if (only) routes.splice(0, routes.length, ...routes.filter((r) => only.test(r.name)))

interface Violation {
  id: string
  impact: string
  help: string
  nodes: { target: string[]; summary: string }[]
}

const run = async (b: Browser, label: string) => {
  let failures = 0
  for (const r of routes) {
    await b.eval(`localStorage.removeItem('immune-atlas:arm-filter')`).catch(() => {})
    if (r.motion) await b.setMedia([{ name: 'prefers-reduced-motion', value: 'no-preference' }])
    await b.goto(base + r.path, 1600)
    if (r.name === 'search results') {
      await b.key('/')
      await b.type('cd4')
      await sleep(300)
    } else if (r.before) {
      await b.eval(r.before).catch(() => {})
      await sleep(1600)
    }
    if (r.name.startsWith('cell ')) {
      // Open the first molecule tooltip, if the panel has one.
      await b.eval(`document.querySelector('.mol-term')?.click()`)
      await sleep(200)
    }
    await b.eval(axeSource)
    const result = await b.eval<{ violations: Violation[]; incomplete: number }>(`(async () => {
      const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })
      const shorten = (n) => ({ target: n.target.map(String), summary: (n.failureSummary || '').split('\\n').slice(0, 3).join(' ').slice(0, 220) })
      return { violations: r.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map(shorten) })), incomplete: r.incomplete.length }
    })()`)
    if (r.motion) await b.setMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }])
    // Reflow (WCAG 1.4.10): at 320 CSS px wide nothing may need sideways scrolling.
    const overflow = await b.eval<string[]>(`(() => {
      const w = document.documentElement.clientWidth
      if (document.documentElement.scrollWidth <= w + 1) return []
      return [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > w + 1 && !e.closest('svg, .visually-hidden, .network-canvas'))
        .slice(0, 4).map((e) => e.tagName.toLowerCase() + '.' + e.className)
    })()`)
    if (overflow.length) {
      failures++
      console.log(`
[${label}] ${r.name} (${r.path})
  scrolls sideways: ${overflow.join(', ')}`)
    }
    if (result.violations.length) {
      failures += result.violations.length
      console.log(`\n[${label}] ${r.name} (${r.path})`)
      for (const v of result.violations) {
        console.log(`  ${v.impact} ${v.id}: ${v.help}`)
        for (const n of v.nodes) console.log(`    ${n.target.join(' ')}\n      ${n.summary}`)
      }
    }
  }
  return failures
}

const b = await Browser.launch(9334)
let failures = 0
try {
  await b.setMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }])
  failures += await run(b, 'desktop 1280')
  await b.setViewport(320, 640, true)
  failures += await run(b, 'phone 320')
} finally {
  b.close()
}
console.log(`\n${routes.length} routes x 2 sizes checked, ${failures} violation${failures === 1 ? '' : 's'}.`)
process.exit(failures ? 1 : 0)
