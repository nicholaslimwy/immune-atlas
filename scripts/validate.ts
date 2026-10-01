// npm run validate [project-root]
// Checks every file in /content against its schema (scripts/schema.ts), then checks that every
// id referenced between files exists. Exits 1 if anything is wrong.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Cell } from '../src/types/cell.ts'
import type { Interaction } from '../src/types/interaction.ts'
import type { Location } from '../src/types/location.ts'
import type { Molecule } from '../src/types/molecule.ts'
import { cellShape, interactionShape, locationShape, moleculeShape, objectOf, type Shape } from './schema.ts'

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

const isLocation = (id: string) => locationFiles.ids.has(id)
const isCell = (id: string) => cellFiles.ids.has(id)
const isMolecule = (id: string) => moleculeFiles.ids.has(id)

// Hotspot and interaction targets may be a cell or a location, so the two must not share ids.
for (const [id, file] of cellFiles.ids) {
  const loc = locationFiles.ids.get(id)
  if (loc) error(file, `id "${id}" is also a location (${loc}); targets would be ambiguous`)
}

const locations = locationFiles.valid

// Locations: one tree, real scenes, hotspots that exist in the scene and point somewhere real.
const roots = [...locations.values()].filter((l) => l.data.parent === null)
if (locations.size && !locationFiles.broken && roots.length !== 1) {
  error('content/locations', `expected exactly one root (parent: null), found ${roots.length}`)
}
const segments = new Map<string, string>() // "<parent>/<segment>" -> file, to catch clashing URLs
for (const { file, data: loc } of locations.values()) {
  if (loc.parent !== null) {
    if (!isLocation(loc.parent)) error(file, `parent: no location "${loc.parent}"`)
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

  const scenePath = join(root, 'public', loc.scene)
  const svg = existsSync(scenePath) ? readFileSync(scenePath, 'utf8') : undefined
  if (svg === undefined) error(file, `scene: public/${loc.scene} does not exist`)

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
}

// Cells: citations, summary length and review dates follow the status.
const SUMMARY_MAX_WORDS = 60
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

for (const [file, messages] of [...problems].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`\n${file}`)
  for (const m of messages) console.log(`  ${m}`)
}

const summary =
  `${locationFiles.valid.size} locations, ${cellFiles.valid.size} cells, ` +
  `${interactionFiles.valid.size} interactions, ${moleculeFiles.valid.size} molecules`
if (errorCount) {
  console.log(`\nContent invalid: ${errorCount} error(s), ${warningCount} warning(s) across ${problems.size} file(s).`)
  process.exit(1)
}
console.log(`${problems.size ? '\n' : ''}Content OK: ${summary}; ${warningCount} warning(s).`)
