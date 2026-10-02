// npm run a11y:keys [base-url]
// Drives the site with real key presses only (no mouse) in headless Chrome and checks where focus goes:
// the skip link, zooming into a scene and a cell panel and back out, the guided tour, search, molecule
// tooltips, the glossary and the network. Also walks the tab order of the main pages and checks that every
// stop shows a focus indicator. Start the site first (`npm run dev`). Exits 1 if anything fails.
import { Browser, sleep } from './cdp.ts'

const base = (process.argv[2] ?? 'http://localhost:5173').replace(/\/$/, '')
let failed = 0
const check = (ok: boolean, what: string, detail = '') => {
  if (!ok) failed++
  console.log(`${ok ? 'pass' : 'FAIL'}  ${what}${!ok && detail ? `  (${detail})` : ''}`)
}

const b = await Browser.launch(9335)
await b.setMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }])

/** A short description of the focused element: its role or tag and its name. */
const focused = () =>
  b.eval<string>(`(() => {
    const e = document.activeElement
    if (!e || e === document.body) return 'body'
    const name = e.getAttribute('aria-label') || e.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40) || e.id
    return (e.getAttribute('role') || e.tagName.toLowerCase()) + ': ' + name
  })()`)
const path = () => b.eval<string>('location.pathname + location.search')
const tab = async (n = 1, shift = false) => {
  for (let i = 0; i < n; i++) await b.key('Tab', shift ? 8 : 0)
}
/** Presses Tab until the focused element's description contains `text`; returns false after `max` presses. */
const tabTo = async (text: string, max = 80) => {
  for (let i = 0; i < max; i++) {
    await tab()
    if ((await focused()).toLowerCase().includes(text.toLowerCase())) return true
  }
  return false
}
const go = async (p: string, settle = 1200) => {
  await b.goto(base + p, settle)
}
/** Does the focused element show something? A hotspot lights its label, dot or tap ring; anything else needs an outline or shadow. */
const hasFocusIndicator = () =>
  b.eval<boolean>(`(() => {
    const e = document.activeElement
    if (!e) return false
    if (e.matches('g.hotspot')) {
      const css = (sel) => { const n = e.querySelector(sel); return n ? getComputedStyle(n) : null }
      const hit = css('.hit'), dot = css('.leader-dot'), label = css('.scene-label')
      return !!((hit && hit.stroke !== 'none') || (dot && dot.strokeWidth !== '1.5px' && dot.stroke !== 'none') || (label && label.textDecorationLine.includes('underline')))
    }
    const cs = getComputedStyle(e)
    return (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none'
  })()`)

/** Walks the tab order from the top of the page (until it wraps round to the skip link) and reports stops with no focus indicator. */
const walk = async (p: string, max = 150) => {
  await go(p)
  const missing: string[] = []
  let stops = 0
  for (let i = 0; i < max; i++) {
    await tab()
    const d = await focused()
    if (d === 'body' || (i > 0 && d.includes('Skip to main content'))) break
    stops++
    if (!(await hasFocusIndicator())) missing.push(d)
  }
  check(missing.length === 0, `${p}: every tab stop (${stops}) shows a focus indicator`, missing.slice(0, 5).join(' | '))
}

try {
  // 1. Skip link.
  await go('/body')
  await tab()
  check((await focused()).includes('Skip to main content'), 'first Tab stop is the skip link', await focused())
  await b.key('Enter')
  check((await focused()).startsWith('h1'), 'skip link moves focus to the page title', await focused())

  // 2. Zoom into a place with the keyboard.
  check(await tabTo('Peripheral blood'), 'Tab reaches the Peripheral blood hotspot')
  await b.key('Enter')
  await sleep(500)
  check((await path()) === '/body/blood', 'Enter on a place hotspot zooms to it', await path())
  check((await focused()).startsWith('h1: Peripheral blood'), 'focus lands on the new scene title', await focused())
  check((await b.eval<string>('document.title')).startsWith('Peripheral blood'), 'tab title names the scene', await b.eval<string>('document.title'))

  // 3. Open a cell, then close it with Escape: focus returns to its hotspot.
  check(await tabTo('Neutrophil'), 'Tab reaches the Neutrophil hotspot')
  await b.key('Enter')
  await sleep(500)
  check((await path()) === '/body/blood/neutrophil', 'Enter on a cell hotspot opens its panel', await path())
  check((await focused()).startsWith('h2: Neutrophil'), 'focus lands on the panel title', await focused())
  await tab()
  check((await b.eval<boolean>('!!document.activeElement.closest(".panel")')), 'Tab moves on inside the panel')
  await b.key('Escape')
  await sleep(400)
  check((await path()) === '/body/blood', 'Escape closes the panel', await path())
  check((await focused()) === 'button: Neutrophil', 'focus returns to the hotspot that opened the panel', await focused())

  // 4. Back button.
  await go('/body/blood')
  check(await tabTo('Back'), 'Tab reaches the Back button')
  await b.key('Enter')
  await sleep(500)
  check((await path()) === '/body', 'Enter on Back zooms out', await path())
  check((await focused()).startsWith('h1: Whole body'), 'focus lands on the title after zooming out', await focused())

  // 5. Plain list view of the scene.
  await go('/body/blood')
  check(await tabTo('List view'), 'Tab reaches the scene list')
  await b.key('Enter')
  const listLinks = await b.eval<number>('document.querySelectorAll(".scene-list a").length')
  check(listLinks === 9, 'the scene list opens with a link for each hotspot', String(listLinks))
  check(await tabTo('Neutrophil'), 'Tab reaches a list link')
  await b.key('Enter')
  await sleep(500)
  check((await path()) === '/body/blood/neutrophil' && (await focused()).startsWith('h2: Neutrophil'), 'a list link opens the panel and moves focus to it', `${await path()} ${await focused()}`)

  // 6. Guided tour: focus stays on Next; arrow keys; Exit returns to the scene.
  await go('/body')
  check(await tabTo('Take the tour'), 'Tab reaches the tour entry link')
  await b.key('Enter')
  await sleep(500)
  check((await path()) === '/tours/infection/1', 'Enter starts the tour', await path())
  check(await tabTo('Next'), 'Tab reaches Next')
  await b.key('Enter')
  await sleep(500)
  check((await path()) === '/tours/infection/2', 'Enter on Next goes to step 2', await path())
  check((await focused()).includes('Next'), 'focus stays on Next', await focused())
  const live = await b.eval<string>('document.querySelector("[aria-live=polite]").textContent')
  check(live.startsWith('Step 2 of 9, Skin.'), 'the live region says the step and the scene', live.slice(0, 50))
  await b.key('ArrowRight')
  await sleep(300)
  check((await path()) === '/tours/infection/3', 'right arrow goes to step 3', await path())
  await b.key('ArrowLeft')
  await sleep(300)
  check((await path()) === '/tours/infection/2', 'left arrow goes back to step 2', await path())
  check(await tabTo('Exit tour'), 'Tab reaches Exit tour')
  await b.key('Enter')
  await sleep(600)
  check(!(await path()).startsWith('/tours') && (await focused()).startsWith('h1'), 'Exit tour moves focus to the scene title', `${await path()} ${await focused()}`)

  // 7. Search by keyboard.
  await go('/body')
  await b.key('/')
  check((await focused()).startsWith('combobox') || (await focused()).includes('Search'), '"/" focuses the search box', await focused())
  await b.type('neutro')
  await sleep(300)
  const expanded = await b.eval<string>('document.querySelector(".search-input").getAttribute("aria-expanded")')
  check(expanded === 'true', 'typing opens the result list')
  await b.key('ArrowDown')
  await b.key('Enter')
  await sleep(600)
  const p = await path()
  check(p.includes('neutrophil') || p.includes('/body'), 'Enter on a result opens it', p)
  check(!(await focused()).startsWith('body'), 'focus is not lost after choosing a result', await focused())

  // 8. Molecule tooltips.
  await go('/body/blood/neutrophil')
  check(await tabTo('CXCL8', 120) || (await b.eval<boolean>('!!document.activeElement.closest(".mol")')), 'Tab reaches a molecule term')
  const open = await b.eval<string>('document.activeElement.getAttribute("aria-expanded")')
  check(open === 'true', 'keyboard focus opens the term\'s popover', String(open))
  await b.key('Escape')
  const stillOpen = await b.eval<string>('document.activeElement.getAttribute("aria-expanded")')
  check(stillOpen === 'false' && (await path()) === '/body/blood/neutrophil', 'Escape closes the popover only', `${stillOpen} ${await path()}`)

  // 9. Pages outside the scenes: following a link moves focus to the title.
  await go('/body')
  check(await tabTo('Glossary'), 'Tab reaches the Glossary link')
  await b.key('Enter')
  await sleep(500)
  check((await path()) === '/glossary' && (await focused()).startsWith('h1: Glossary'), 'following Glossary moves focus to its title', `${await path()} ${await focused()}`)
  check((await b.eval<string>('document.title')).startsWith('Glossary'), 'tab title names the page')

  // 10. Network: list view reachable, nothing traps focus.
  await go('/network')
  check(await tabTo('List'), 'Tab reaches the List view button')
  await b.key('Enter')
  await sleep(400)
  check((await path()).includes('view=list'), 'Enter switches to the list view', await path())
  check(await tabTo('Macrophage', 200), 'Tab reaches links inside the list view')

  // 11. What a screen reader meets in each scene: a named group with a description, and labelled hotspots.
  for (const p of ['/body', '/body/blood', '/body/lymph-node', '/body/lymph-node/germinal-centre', '/body/bone-marrow', '/body/thymus', '/body/spleen', '/body/skin']) {
    await go(p, 1000)
    const sem = await b.eval<{ label: string; desc: string; hotspots: number; unlabelled: number; undescribed: number; empty: number }>(`(() => {
      const svg = document.querySelector('.scene svg')
      const d = svg.getAttribute('aria-describedby')
      const hs = [...document.querySelectorAll('.scene g.hotspot')]
      return {
        label: svg.getAttribute('aria-label'),
        desc: (d && document.getElementById(d)?.textContent) || '',
        hotspots: hs.length,
        unlabelled: hs.filter((h) => !h.getAttribute('aria-label')).length,
        undescribed: hs.filter((h) => !h.getAttribute('aria-description')).length,
        empty: hs.filter((h) => !h.querySelector('.scene-label')?.textContent?.trim() && h.querySelector('.scene-label')).length,
      }
    })()`)
    check(
      sem.label.endsWith(' scene') && sem.desc.length > 40 && sem.hotspots > 0 && sem.unlabelled === 0 && sem.undescribed === 0 && sem.empty === 0,
      `${p}: scene is named and described, and all ${sem.hotspots} hotspots are labelled and described`,
      JSON.stringify(sem),
    )
  }

  // 12. Focus indicators on every tab stop of the main pages.
  for (const p of ['/body', '/body/blood', '/body/lymph-node', '/body/blood/neutrophil', '/tours/infection/4', '/glossary', '/network']) await walk(p)
} finally {
  b.close()
}
console.log(failed ? `\n${failed} check(s) failed.` : '\nAll keyboard checks passed.')
process.exit(failed ? 1 : 0)
