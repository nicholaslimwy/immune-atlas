// npm run validate [project-root]
// Checks every file in /content against its schema (scripts/schema.ts), then checks that every
// id referenced between files exists. Exits 1 if anything is wrong.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { BODY_UNITS, GENERIC_ICON, ICON_SPECS, RESERVED_ICONS } from '../src/art/iconSpecs.ts'
import { ICON_COLOURS, SCENE_COLOURS } from '../src/art/palette.ts'
import type { Cell } from '../src/types/cell.ts'
import type { Interaction } from '../src/types/interaction.ts'
import type { Location } from '../src/types/location.ts'
import type { Molecule } from '../src/types/molecule.ts'
import type { Process } from '../src/types/process.ts'
import type { Tour } from '../src/types/tour.ts'
import {
  cellShape,
  interactionShape,
  locationShape,
  moleculeShape,
  objectOf,
  processShape,
  tourShape,
  type Shape,
} from './schema.ts'

/** Longest scene description, in words. */
const DESCRIPTION_MAX_WORDS = 65
/** Longest scene caption, in words: it is one line under the stage. */
const SCENE_CAPTION_MAX_WORDS = 20
/** Longest region summary, in words (the same as a cell's). */
const REGION_SUMMARY_MAX_WORDS = 60
/** The networks a scene may mark with data-network; the Show toggle under the stage knows these. */
const SCENE_NETWORKS = ['blood', 'lymph']

const root = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL('..', import.meta.url))

// file -> messages, each prefixed "error" or "warning"
const problems = new Map<string, string[]>()
let errorCount = 0
let warningCount = 0
const report = (file: string, message: string) => problems.set(file, [...(problems.get(file) ?? []), message])
const error = (file: string, message: string) => {
  errorCount++
  report(file, `error    ${message}`)
}
const warn = (file: string, message: string) => {
  warningCount++
  report(file, `warning  ${message}`)
}

interface Entry<T> {
  file: string
  data: T
}

interface Loaded<T> {
  /** Files that match their schema; only these get cross-reference checks. */
  valid: Map<string, Entry<T>>
  /** Every id found, valid file or not (id -> file), so one broken file does not make every
   *  reference to it look missing too. */
  ids: Map<string, string>
  broken: number
}

/** Reads content/<dir>/*.json and checks each file against its schema. */
function load<T extends { id: string }>(dir: string, shape: Shape<T>): Loaded<T> {
  const check = objectOf<T>(shape)
  const loaded: Loaded<T> = { valid: new Map(), ids: new Map(), broken: 0 }
  const folder = join(root, 'content', dir)
  if (!existsSync(folder)) return loaded
  for (const name of readdirSync(folder).filter((n) => n.endsWith('.json')).sort()) {
    const file = `content/${dir}/${name}`
    let data: unknown
    try {
      data = JSON.parse(readFileSync(join(folder, name), 'utf8'))
    } catch (err) {
      error(file, `not valid JSON (${(err as Error).message})`)
      loaded.broken++
      continue
    }
    const found: string[] = []
    check(data, '', found)
    found.forEach((p) => error(file, p))
    const id = (data as { id?: unknown } | null)?.id
    if (typeof id === 'string') {
      if (name !== `${id}.json`) error(file, `file name must be ${id}.json to match its id`)
      const clash = loaded.ids.get(id)
      if (clash) error(file, `id "${id}" is already used by ${clash}`)
      else loaded.ids.set(id, file)
    }
    if (found.length) loaded.broken++
    else if (typeof id === 'string' && loaded.ids.get(id) === file) loaded.valid.set(id, { file, data: data as T })
  }
  return loaded
}

const locationFiles = load<Location>('locations', locationShape)
const cellFiles = load<Cell>('cells', cellShape)
const interactionFiles = load<Interaction>('interactions', interactionShape)
const moleculeFiles = load<Molecule>('molecules', moleculeShape)
const tourFiles = load<Tour>('tours', tourShape)
const processFiles = load<Process>('processes', processShape)

const isLocation = (id: string) => locationFiles.ids.has(id)
const isCell = (id: string) => cellFiles.ids.has(id)
const isMolecule = (id: string) => moleculeFiles.ids.has(id)
const isInteraction = (id: string) => interactionFiles.ids.has(id)

// Hotspot and interaction targets may be a cell or a location, so the two must not share ids.
for (const [id, file] of cellFiles.ids) {
  const loc = locationFiles.ids.get(id)
  if (loc) error(file, `id "${id}" is also a location (${loc}); targets would be ambiguous`)
}

const locations = locationFiles.valid

// Scenes (public/scenes): drawn to the style guide like icons, palette and anatomy colours only.
// A scene that places cells declares its scale (data-px-per-um on the root), and every
// <use href="#icon-..."> must then be drawn at that scale, so cells keep their true relative size.
const sceneColours = new Set(SCENE_COLOURS.map((c) => c.toUpperCase()))
const iconSpecOf = (id: string) => RESERVED_ICONS[id] ?? ICON_SPECS[id]
function checkScene(file: string, svg: string) {
  if (!/<svg[^>]*\sviewBox="0 0 800 500"/.test(svg)) error(file, 'viewBox must be "0 0 800 500" (the stage shape)')
  for (const hex of new Set(svg.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])) {
    if (!sceneColours.has(hex.toUpperCase())) error(file, `colour ${hex} is not a palette or anatomy token (src/art/palette.ts)`)
  }
  if (/gradient|filter|opacity/i.test(svg)) error(file, 'flat style: no gradients, filters or opacity')
  for (const net of new Set([...svg.matchAll(/\sdata-network="([^"]*)"/g)].map((m) => m[1]))) {
    if (!SCENE_NETWORKS.includes(net)) error(file, `data-network="${net}": expected one of ${SCENE_NETWORKS.join(', ')}`)
  }
  const scale = Number(svg.match(/<svg[^>]*\sdata-px-per-um="([\d.]+)"/)?.[1])
  for (const use of svg.match(/<use\b[^>]*>/g) ?? []) {
    const id = use.match(/\shref="#icon-([^"]+)"/)?.[1]
    if (!id) continue
    const spec = iconSpecOf(id)
    if (!spec) {
      error(file, `<use href="#icon-${id}">: no icon "${id}" in src/icons`)
      continue
    }
    if (!scale) {
      error(file, `<use href="#icon-${id}">: the root <svg> needs data-px-per-um to place cells`)
      continue
    }
    const want = (spec.diameterUm * scale * 100) / BODY_UNITS
    for (const dim of ['width', 'height']) {
      const got = Number(use.match(new RegExp(`\\s${dim}="([\\d.]+)"`))?.[1])
      if (Math.abs(got - want) > 0.5) {
        error(file, `<use href="#icon-${id}">: ${dim} ${got || 'missing'}, expected ${want.toFixed(1)} at ${scale} px/µm`)
      }
    }
  }
}

// Locations: one tree, real scenes, hotspots that exist in the scene and point somewhere real.
const roots = [...locations.values()].filter((l) => l.data.parent === null)
if (locations.size && !locationFiles.broken && roots.length !== 1) {
  error('content/locations', `expected exactly one root (parent: null), found ${roots.length}`)
}
const segments = new Map<string, string>() // "<parent>/<segment>" -> file, to catch clashing URLs
for (const { file, data: loc } of locations.values()) {
  const stub = loc.status === 'stub'
  if (loc.parent !== null) {
    if (!isLocation(loc.parent)) error(file, `parent: no location "${loc.parent}"`)
    else if (locations.get(loc.parent)?.data.status === 'stub') {
      error(file, `parent: "${loc.parent}" is a stub, so this place could never be reached`)
    }
    // Walk up; meeting this location again means a cycle.
    const seen = new Set([loc.id])
    for (let p = locations.get(loc.parent); p?.data.parent; p = locations.get(p.data.parent)) {
      if (seen.has(p.data.parent)) {
        error(file, `parent chain loops back on itself`)
        break
      }
      seen.add(p.data.parent)
    }
  }

  const key = `${loc.parent}/${loc.slug ?? loc.id}`
  const other = segments.get(key)
  if (other) error(file, `URL segment "${loc.slug ?? loc.id}" is already used by sibling ${other}`)
  else segments.set(key, file)

  // A stub is only a name and a place in the tree: its scene is planned, so nothing in it is checked yet.
  if (stub) {
    if (loc.parent === null) error(file, `status: the root cannot be a stub`)
    if (loc.hotspots.length) error(file, `hotspots: a stub has no scene to hold them; leave empty`)
    if (loc.residents.length) error(file, `residents: add them when the scene is built; leave empty`)
    if (loc.regions?.length) error(file, `regions: a stub has no scene to hold them; leave out`)
    continue
  }

  // A built scene needs text for people who cannot see it: what is drawn and where, in a few sentences.
  const descWords = loc.description?.trim().split(/\s+/).filter(Boolean).length ?? 0
  if (descWords === 0) error(file, `description: a built scene needs a text description for screen readers`)
  else if (descWords > DESCRIPTION_MAX_WORDS) {
    error(file, `description: ${descWords} words; keep it to ${DESCRIPTION_MAX_WORDS} so it reads in one breath`)
  }
  const captionWords = loc.caption?.trim().split(/\s+/).length ?? 0
  if (captionWords > SCENE_CAPTION_MAX_WORDS) {
    error(file, `caption: ${captionWords} words; it is one line under the scene, keep it to ${SCENE_CAPTION_MAX_WORDS}`)
  }

  const scenePath = join(root, 'public', loc.scene)
  const svg = existsSync(scenePath) ? readFileSync(scenePath, 'utf8') : undefined
  if (svg === undefined) error(file, `scene: public/${loc.scene} does not exist`)
  else checkScene(`public/${loc.scene}`, svg)

  loc.hotspots.forEach(({ region, target }, i) => {
    if (!isLocation(target) && !isCell(target)) {
      error(file, `hotspots[${i}].target: no location or cell "${target}"`)
    }
    if (svg !== undefined && !new RegExp(`\\sid=["']${region}["']`).test(svg)) {
      error(file, `hotspots[${i}].region: no element with id="${region}" in public/${loc.scene}`)
    }
  })
  loc.residents.forEach(({ cell }, i) => {
    if (!isCell(cell)) error(file, `residents[${i}].cell: no cell "${cell}"`)
  })

  // Regions: labelled areas of the scene. A region's id is its element in the SVG, its URL segment over the
  // scene and its key among the measured centres, so it must not be a hotspot element, a cell, a place or
  // a child's URL segment.
  const regionIds = new Set<string>()
  const childSegments = new Set(
    [...locations.values()].filter((l) => l.data.parent === loc.id).map((l) => l.data.slug ?? l.data.id),
  )
  loc.regions?.forEach((region, i) => {
    const at = `regions[${i}]`
    if (regionIds.has(region.id)) error(file, `${at}.id: "${region.id}" is used by another region here`)
    regionIds.add(region.id)
    if (loc.hotspots.some((h) => h.region === region.id)) error(file, `${at}.id: "${region.id}" is also a hotspot region`)
    if (isCell(region.id)) error(file, `${at}.id: "${region.id}" is a cell id; the URL would be ambiguous`)
    if (isLocation(region.id) || childSegments.has(region.id)) {
      error(file, `${at}.id: "${region.id}" is a place id or URL segment; the URL would be ambiguous`)
    }
    if (svg !== undefined && !new RegExp(`\\sid=["']${region.id}["']`).test(svg)) {
      error(file, `${at}.id: no element with id="${region.id}" in public/${loc.scene}`)
    }
    const words = region.summary.trim().split(/\s+/).length
    if (words > REGION_SUMMARY_MAX_WORDS) {
      error(file, `${at}.summary: ${words} words; the panel allows ${REGION_SUMMARY_MAX_WORDS}`)
    }
    region.cells.forEach((c, j) => {
      if (!isCell(c)) error(file, `${at}.cells[${j}]: no cell "${c}"`)
      else if (!loc.residents.some((r) => r.cell === c)) {
        error(file, `${at}.cells[${j}]: "${c}" is not a resident of ${loc.id}; add it to residents first`)
      }
    })
  })
}

// Cells: citations, summary length and review dates follow the status.
const SUMMARY_MAX_WORDS = 60
const CAPTION_MAX_WORDS = 40
for (const { file, data: cell } of cellFiles.valid.values()) {
  if (cell.status !== 'stub' && cell.sources.length === 0) {
    error(file, `sources: a ${cell.status} cell needs at least one citation`)
  }
  const words = cell.summary.trim().split(/\s+/).length
  if (cell.status !== 'stub' && words > SUMMARY_MAX_WORDS) {
    error(file, `summary: ${words} words; the panel allows ${SUMMARY_MAX_WORDS}`)
  }
  if (cell.status === 'reviewed' && !cell.lastReviewed) {
    error(file, `lastReviewed: required once status is "reviewed"`)
  }

  // Search opens a cell's panel over its home scene: the explicit `home`, else the first place that
  // lists it as a resident (src/engine/content.ts, getCellHome). Either way it must be a real, built place.
  const residentIn = [...locations.values()].filter((l) => l.data.residents.some((r) => r.cell === cell.id))
  if (cell.home !== undefined) {
    const home = locations.get(cell.home)?.data
    if (!home) {
      if (!isLocation(cell.home)) error(file, `home: no location "${cell.home}"`)
    } else if (home.status === 'stub') {
      error(file, `home: "${home.id}" is a stub and has no scene to open the panel over`)
    } else if (!residentIn.some((l) => l.data.id === home.id)) {
      error(file, `home: "${home.id}" does not list ${cell.id} as a resident`)
    }
  } else if (!residentIn.some((l) => l.data.status !== 'stub')) {
    warn(file, `home: ${cell.id} is a resident nowhere, so search opens it over the whole body`)
  }
}

// Search names (name, aliases, place and tour names): an alias that repeats its own cell or molecule's
// name, or another entry's name or alias, adds nothing or makes a search ambiguous. Compared ignoring
// case, spaces and punctuation, the way search does.
const squash = (s: string) => s.normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
const searchNames = new Map<string, { file: string; label: string }[]>()
const addSearchName = (text: string, file: string, label: string) => {
  const key = squash(text)
  searchNames.set(key, [...(searchNames.get(key) ?? []), { file, label }])
}
for (const { file, data: item } of [...cellFiles.valid.values(), ...moleculeFiles.valid.values()]) {
  addSearchName(item.name, file, item.id)
  for (const alias of item.aliases ?? []) addSearchName(alias, file, item.id)
}
for (const { file, data: loc } of locations.values()) if (loc.status !== 'stub') addSearchName(loc.name, file, loc.id)
for (const { file, data: tour } of tourFiles.valid.values()) addSearchName(tour.title, file, tour.id)
for (const [key, owners] of searchNames) {
  if (owners.length < 2) continue
  const ids = [...new Set(owners.map((o) => o.label))]
  for (const file of new Set(owners.map((o) => o.file))) {
    const others = ids.filter((i) => !owners.some((o) => o.file === file && o.label === i))
    warn(
      file,
      others.length
        ? `aliases: "${key}" is also a name or alias of ${others.join(', ')}; a search for it is ambiguous`
        : `aliases: "${key}" repeats this entry's own name or another of its aliases`,
    )
  }
}

// Interactions: every end, molecule and place must exist. Movement points at a location.
for (const { file, data: ix } of interactionFiles.valid.values()) {
  if (!isCell(ix.source)) error(file, `source: no cell "${ix.source}"`)
  if (ix.type === 'migrates-to') {
    if (!isLocation(ix.target)) error(file, `target: "migrates-to" needs a location; no location "${ix.target}"`)
  } else if (!isCell(ix.target)) {
    error(file, `target: no cell "${ix.target}"`)
  }
  ix.via?.forEach((m, i) => {
    if (!isMolecule(m)) error(file, `via[${i}]: no molecule "${m}"`)
  })
  ix.where?.forEach((l, i) => {
    if (!isLocation(l)) error(file, `where[${i}]: no location "${l}"`)
  })
  const expected = `${ix.source}-${ix.type}-${ix.target}`
  if (ix.id !== expected) warn(file, `id: convention is "${expected}"`)
}

// Tours: every step shows a built scene, and what it zooms to and highlights must be in that scene.
for (const { file, data: tour } of tourFiles.valid.values()) {
  if (!tour.steps.length) error(file, 'steps: a tour needs at least one step')
  tour.steps.forEach((step, i) => {
    const at = `steps[${i}]`
    const captionWords = step.caption.trim().split(/\s+/).length
    if (captionWords > CAPTION_MAX_WORDS) error(file, `${at}.caption: ${captionWords} words; a caption allows ${CAPTION_MAX_WORDS}`)
    const loc = locations.get(step.location)?.data
    if (!loc) {
      if (!isLocation(step.location)) error(file, `${at}.location: no location "${step.location}"`)
      return
    }
    if (loc.status === 'stub') {
      error(file, `${at}.location: "${loc.id}" is a stub and has no scene to show`)
      return
    }
    if (step.focus !== undefined && !loc.hotspots.some((h) => h.region === step.focus || h.target === step.focus)) {
      error(file, `${at}.focus: "${step.focus}" is not a hotspot region or target in ${loc.id}`)
    }
    step.highlight.forEach((c, j) => {
      if (!isCell(c)) error(file, `${at}.highlight[${j}]: no cell "${c}"`)
      else if (!loc.hotspots.some((h) => h.target === c)) {
        error(file, `${at}.highlight[${j}]: "${c}" has no hotspot in ${loc.id}, so it cannot be highlighted there`)
      }
    })
    step.interactions.forEach((ix, j) => {
      if (!isInteraction(ix)) error(file, `${at}.interactions[${j}]: no interaction "${ix}"`)
    })
  })
}

// Processes: every step shows the process's one scene, and what it zooms to, highlights and draws arrows
// between must be in that scene (a hotspot region or target, or a region).
for (const { file, data: process } of processFiles.valid.values()) {
  if (!process.steps.length) error(file, 'steps: a process needs at least one step')
  if (tourFiles.ids.has(process.id)) warn(file, `id: "${process.id}" is also a tour; fine for URLs, confusing to read`)
  const loc = locations.get(process.location)?.data
  if (!loc) {
    if (!isLocation(process.location)) error(file, `location: no location "${process.location}"`)
    continue
  }
  if (loc.status === 'stub') {
    error(file, `location: "${loc.id}" is a stub and has no scene to show`)
    continue
  }
  // The same lookup the player uses (src/engine/stories.ts, pointKey): hotspot region, hotspot target, region.
  const pointOf = (id: string) =>
    loc.hotspots.find((h) => h.region === id)?.target ??
    loc.hotspots.find((h) => h.target === id)?.target ??
    loc.regions?.find((r) => r.id === id)?.id
  process.steps.forEach((step, i) => {
    const at = `steps[${i}]`
    const captionWords = step.caption.trim().split(/\s+/).length
    if (captionWords > CAPTION_MAX_WORDS) error(file, `${at}.caption: ${captionWords} words; a caption allows ${CAPTION_MAX_WORDS}`)
    if (step.focus !== undefined && !pointOf(step.focus)) {
      error(file, `${at}.focus: "${step.focus}" is not a hotspot region or target, or a region, in ${loc.id}`)
    }
    step.highlight.forEach((c, j) => {
      if (!isCell(c)) error(file, `${at}.highlight[${j}]: no cell "${c}"`)
      else if (!loc.hotspots.some((h) => h.target === c)) {
        error(file, `${at}.highlight[${j}]: "${c}" has no hotspot in ${loc.id}, so it cannot be highlighted there`)
      }
    })
    step.interactions.forEach((ix, j) => {
      if (!isInteraction(ix)) error(file, `${at}.interactions[${j}]: no interaction "${ix}"`)
    })
    step.arrows?.forEach(({ from, to }, j) => {
      const [a, b] = [pointOf(from), pointOf(to)]
      if (!a) error(file, `${at}.arrows[${j}].from: "${from}" is not a hotspot region or target, or a region, in ${loc.id}`)
      if (!b) error(file, `${at}.arrows[${j}].to: "${to}" is not a hotspot region or target, or a region, in ${loc.id}`)
      if (a && a === b) error(file, `${at}.arrows[${j}]: from and to are the same place`)
    })
  })
}

// Icons (src/icons/<cell id>.svg): one per cell, drawn to the style guide, palette colours only.
// Reserved names are icons that are not cells: generic.svg (the placeholder for cells without an
// icon) and red-blood-cell.svg (background art).
const iconDir = join(root, 'src', 'icons')
const iconNames = existsSync(iconDir) ? readdirSync(iconDir).filter((n) => n.endsWith('.svg')).sort() : []
const palette = new Set(ICON_COLOURS.map((c) => c.toUpperCase()))
for (const name of iconNames) {
  const file = `src/icons/${name}`
  const id = name.slice(0, -'.svg'.length)
  const svg = readFileSync(join(iconDir, name), 'utf8')
  if (RESERVED_ICONS[id]) {
    if (isCell(id)) error(file, `"${id}" is a reserved icon name, not a cell id; rename the cell`)
  } else {
    if (!isCell(id)) error(file, `no cell "${id}" (icon file names are cell ids)`)
    if (!ICON_SPECS[id]) error(file, `no entry for "${id}" in src/art/iconSpecs.ts`)
  }
  if (!/<svg[^>]*\sviewBox="0 0 100 100"/.test(svg)) error(file, 'viewBox must be "0 0 100 100"')
  for (const hex of new Set(svg.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [])) {
    if (!palette.has(hex.toUpperCase())) error(file, `colour ${hex} is not a palette token (src/art/palette.ts)`)
  }
  if (/gradient|filter|opacity/i.test(svg)) error(file, 'flat style: no gradients, filters or opacity')
}
if (!iconNames.includes(`${GENERIC_ICON}.svg`)) error(`src/icons/${GENERIC_ICON}.svg`, 'missing: the generic icon for cells without one')
for (const id of Object.keys(RESERVED_ICONS)) {
  if (!iconNames.includes(`${id}.svg`)) error('src/art/iconSpecs.ts', `reserved icon "${id}" has no file src/icons/${id}.svg`)
}
for (const id of Object.keys(ICON_SPECS)) {
  if (!iconNames.includes(`${id}.svg`)) error('src/art/iconSpecs.ts', `"${id}" has no icon file src/icons/${id}.svg`)
}

for (const [file, messages] of [...problems].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`\n${file}`)
  for (const m of messages) console.log(`  ${m}`)
}

const summary =
  `${locationFiles.valid.size} locations, ${cellFiles.valid.size} cells, ` +
  `${interactionFiles.valid.size} interactions, ${moleculeFiles.valid.size} molecules, ${tourFiles.valid.size} tours, ` +
  `${processFiles.valid.size} processes, ` +
  `${iconNames.length} icons`
if (errorCount) {
  console.log(`\nContent invalid: ${errorCount} error(s), ${warningCount} warning(s) across ${problems.size} file(s).`)
  process.exit(1)
}
console.log(`${problems.size ? '\n' : ''}Content OK: ${summary}; ${warningCount} warning(s).`)
