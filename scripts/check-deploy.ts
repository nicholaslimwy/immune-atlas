// npm run check:deploy -- <site-url>
// Checks a built and served copy of the atlas the way a visitor meets it: deep links opened directly and
// refreshed, the status codes a static host sends, a zoom by hotspot, search, the tour, the glossary, the
// network, the about page and the not-found page, all under the site's folder (e.g.
// https://<user>.github.io/immune-atlas/). Runs headless Chrome (scripts/cdp.ts). Exits 1 if anything fails.
//
// Locally, like GitHub Pages: BASE_PATH=/immune-atlas/ npm run build, then
//   node scripts/serve-dist.ts 4391 dist --base=/immune-atlas/   and   npm run check:deploy -- http://localhost:4391/immune-atlas/
import { Browser, sleep } from './cdp.ts'

const site = (process.argv[2] ?? 'http://localhost:4391/immune-atlas/').replace(/\/?$/, '/')
const folder = new URL(site).pathname
let failed = 0
const check = (ok: boolean, what: string, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'pass' : 'FAIL'}  ${what}${!ok && detail ? `  (${detail})` : ''}`)
}

// 1. What the host answers, before any script runs (redirects followed, as a browser would).
const statuses: [string, number][] = [
  ['', 200],
  ['body', 200],
  ['body/blood/neutrophil', 200],
  ['body/lymph-node/germinal-centre/tfh', 200],
  ['tours/infection/3', 200],
  ['glossary/il-12', 200],
  ['network?type=suppresses', 200],
  ['about', 200],
  ['scenes/peripheral-blood.svg', 200],
  ['no-such-page', 404],
  ['body/blood/no-such-cell', 404],
]
for (const [path, want] of statuses) {
  const res = await fetch(site + path)
  check(res.status === want, `GET /${path} answers ${want}`, `got ${res.status}`)
}

// 2. The pages in a browser.
const b = await Browser.launch(9351)
await b.setMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await b.send('Page.addScriptToEvaluateOnNewDocument', {
  source: `window.__errors = []; addEventListener('error', (e) => __errors.push(String(e.message || e.target?.src || e.target?.href))); addEventListener('unhandledrejection', (e) => __errors.push(String(e.reason)))`,
})
const text = (sel: string) => b.eval<string>(`document.querySelector(${JSON.stringify(sel)})?.textContent?.trim() ?? ''`)
const appPath = () => b.eval<string>(`location.pathname.slice(${folder.length - 1}).replace(/(.)\\/$/, '$1') + location.search`)
const hotspots = () => b.eval<number>(`document.querySelectorAll('main svg [role=button]').length`)
const problems = () =>
  b.eval<string[]>(`[...window.__errors, ...performance.getEntriesByType('resource').filter((r) => r.responseStatus >= 400).map((r) => r.name + ' ' + r.responseStatus)]`)
const settled = async (what: string) => {
  const p = await problems()
  check(p.length === 0, `${what}: no script errors or failed requests`, p.join('; '))
}

/** Opens `path` directly, checks it, refreshes it and checks it again. */
async function deepLink(path: string, what: string, test: () => Promise<[boolean, string]>) {
  for (const pass of ['opened directly', 'after a refresh']) {
    if (pass === 'opened directly') await b.goto(site + path, 1500)
    else {
      await b.send('Page.reload')
      await sleep(2000)
    }
    const [ok, detail] = await test()
    check(ok, `${what} ${pass}`, detail)
    await settled(`${what} ${pass}`)
  }
}

await deepLink('body/blood/neutrophil', '/body/blood/neutrophil', async () => {
  const [title, panel, n, p] = [await text('main h1'), await text('#cell-panel-title'), await hotspots(), await appPath()]
  return [title === 'Peripheral blood' && panel === 'Neutrophil' && n > 0 && p === '/body/blood/neutrophil', `h1 "${title}", panel "${panel}", ${n} hotspots, at ${p}`]
})
await deepLink('body/lymph-node/germinal-centre', '/body/lymph-node/germinal-centre', async () => {
  const [title, n] = [await text('main h1'), await hotspots()]
  return [title === 'Germinal centre' && n === 7, `h1 "${title}", ${n} hotspots`]
})
await deepLink('tours/infection/3', '/tours/infection/3', async () => {
  const body = await b.eval<string>(`document.querySelector('.tour-panel')?.textContent ?? ''`)
  return [body.includes('Step 3 of 9'), body.slice(0, 80)]
})
await deepLink('glossary/il-12', '/glossary/il-12', async () => {
  const title = await text('main h1')
  return [title.startsWith('IL-12'), `h1 "${title}"`]
})
await deepLink('network?view=list', '/network?view=list', async () => {
  const [title, rows] = [await text('main h1'), await b.eval<number>(`document.querySelectorAll('main li').length`)]
  return [title === 'Interaction network' && rows > 100, `h1 "${title}", ${rows} list items`]
})
await deepLink('about', '/about', async () => {
  const [title, rows] = [await text('main h1'), await b.eval<number>(`document.querySelectorAll('.about-table tbody tr').length`)]
  const note = await text('.about-note h2')
  return [title === 'About the atlas' && rows >= 5 && note.includes('not medical advice'), `h1 "${title}", ${rows} credit rows, note "${note}"`]
})
await deepLink('no-such-page', 'an unknown address', async () => {
  const title = await text('main h1')
  return [title === 'Not found', `h1 "${title}"`]
})

// The front page redirects into the body scene; a hotspot zooms into its place, inside the folder.
await b.goto(site, 1500)
check((await appPath()) === '/body', 'the front page opens /body', await appPath())
await b.eval(`document.querySelector('main svg [role=button][aria-label="Peripheral blood"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))`)
await sleep(2000)
check((await appPath()) === '/body/blood' && (await text('main h1')) === 'Peripheral blood', 'clicking the blood hotspot zooms to /body/blood', `${await appPath()}, h1 "${await text('main h1')}"`)
const sceneHref = await b.eval<string>(`performance.getEntriesByType('resource').map((r) => r.name).find((n) => n.endsWith('peripheral-blood.svg')) ?? ''`)
check(new URL(sceneHref || 'http://x/').pathname === `${folder}scenes/peripheral-blood.svg`, 'the scene is fetched from inside the site folder', sceneHref)

// Search, from the keyboard, lands on the cell's panel.
await b.key('/')
await b.type('neutrophil')
await sleep(800)
await b.key('Enter')
await sleep(1500)
check((await text('#cell-panel-title')) === 'Neutrophil', 'search for "neutrophil" opens its panel', `${await appPath()}`)
// The header links stay inside the folder.
const hrefs = await b.eval<string[]>(`[...document.querySelectorAll('.site-header a')].map((a) => new URL(a.href).pathname)`)
check(hrefs.length >= 4 && hrefs.every((h) => h.startsWith(folder)), 'header links stay inside the site folder', hrefs.join(', '))
// Browser back returns to the scene it came from.
await b.eval('history.back()')
await sleep(1500)
check((await appPath()) === '/body/blood', 'browser back returns to /body/blood', await appPath())
await settled('navigation')

b.close()
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.')
process.exit(failed ? 1 : 0)
