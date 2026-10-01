// Search over everything a visitor might look for: cells, molecules, places and tours.
// Matching is two-stage. A plain scan finds exact, whole-word, word-start and substring hits and
// ranks them (names before aliases before markers). Then Fuse.js proposes near misses for typos,
// but only for queries long enough that a typo is not just another word ("cd8" must not find CD4).
// Fuse's own score mixes the weights of every field, so it is not used to rank: each proposal is
// checked and ranked by word-level edit distance instead, which drops accidental matches.
import Fuse from 'fuse.js'
import { getCellHome, getCells, getLocation, getLocations, getMolecules, getTours } from './content.ts'
import { cellPathFor, glossaryPathFor, pathFor } from './paths.ts'
import { tourStepPath } from './tours.ts'

export type SearchKind = 'cell' | 'molecule' | 'place' | 'tour'

/** Where a piece of searchable text came from. */
type FieldKind = 'name' | 'alias' | 'marker'

interface Field {
  text: string
  kind: FieldKind
  /** Lower case, accents folded, letters and digits only: "IL-12" -> "il12". */
  squashed: string
  /** The words of `text`, lower case: "IL-12" -> ["il", "12"]. */
  words: string[]
}

export interface SearchEntry {
  key: string
  kind: SearchKind
  id: string
  name: string
  /** One line saying where it is or what it is: "In Peripheral blood", "Cytokine". */
  context: string
  /** Where choosing the result goes. */
  path: string
  fields: Field[]
  // The same text as plain arrays, for Fuse.
  names: string[]
  aliases: string[]
  markers: string[]
}

/** Why a result matched, when the visitor did not type its name. */
export interface SearchHint {
  label: 'Also called' | 'Marker'
  text: string
}

export interface SearchResult {
  entry: SearchEntry
  hint?: SearchHint
}

const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
const squash = (s: string) => fold(s).replace(/[^\p{L}\p{N}]/gu, '')
const wordsOf = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean)

const field = (text: string, kind: FieldKind): Field => ({ text, kind, squashed: squash(text), words: wordsOf(text) })

/**
 * The names a thing answers to. "NK cell (natural killer cell)" also answers to "NK cell" and
 * "natural killer cell", and "CCL2 (MCP-1)" to "CCL2" and "MCP-1", so each counts as an exact name.
 */
function nameVariants(name: string): string[] {
  const variants = new Set([name])
  const head = name.split(/\s+\(/)[0].trim()
  if (head) variants.add(head)
  for (const group of name.matchAll(/\(([^)]*)\)/g)) {
    for (const part of group[1].split(/[;,]/)) if (part.trim()) variants.add(part.trim())
  }
  return [...variants]
}

/**
 * The marker names inside one marker string. Marker strings are panel text: "CD66b (human only)",
 * "CCR3 (CD193)", "No CD3 and no antigen receptor". The lead term is kept ("CD66b"), so are
 * single-word synonyms in brackets ("CD193"), and an absence ("No CD3...") is dropped, because
 * searching CD3 should not find the cell that lacks it.
 */
export function markerKeys(marker: string): string[] {
  if (/^no\s/i.test(marker)) return []
  const keys = new Set<string>()
  const head = marker.split(/\s+\(/)[0].trim()
  if (head) keys.add(head)
  for (const group of marker.matchAll(/\(([^)]*)\)/g)) {
    for (const part of group[1].split(/[;,]/)) {
      const p = part.trim()
      // One word with a digit or a capital after its first letter: CD193, CR2, Thy-1, not "human" or "mouse".
      if (/^[\p{L}][\p{L}\p{N}-]*$/u.test(p) && /[\p{N}\p{Lu}]/u.test(p.slice(1))) keys.add(p)
    }
  }
  return [...keys]
}

function makeEntry(
  base: Pick<SearchEntry, 'kind' | 'id' | 'name' | 'context' | 'path'>,
  aliases: string[] = [],
  markers: string[] = [],
): SearchEntry {
  const names = nameVariants(base.name)
  const markerNames = markers.flatMap(markerKeys)
  return {
    ...base,
    key: `${base.kind}:${base.id}`,
    names,
    aliases,
    markers: markerNames,
    fields: [
      ...names.map((t) => field(t, 'name')),
      ...aliases.map((t) => field(t, 'alias')),
      ...markerNames.map((t) => field(t, 'marker')),
    ],
  }
}

const KIND_LABELS = {
  cytokine: 'Cytokine',
  chemokine: 'Chemokine',
  receptor: 'Receptor',
  antibody: 'Antibody',
  complement: 'Complement',
  other: 'Molecule',
} as const

export function buildEntries(): SearchEntry[] {
  const entries: SearchEntry[] = []
  for (const cell of getCells()) {
    const home = getCellHome(cell)
    entries.push(
      makeEntry(
        { kind: 'cell', id: cell.id, name: cell.name, context: `Opens in ${home.name}`, path: cellPathFor(home, cell.id) },
        cell.aliases,
        cell.markers,
      ),
    )
  }
  for (const mol of getMolecules()) {
    entries.push(
      makeEntry(
        { kind: 'molecule', id: mol.id, name: mol.name, context: KIND_LABELS[mol.kind], path: glossaryPathFor(mol.id) },
        mol.aliases,
      ),
    )
  }
  for (const loc of getLocations()) {
    // A stub place has no scene and no URL yet, so there is nothing to open.
    if (loc.status === 'stub') continue
    const parent = loc.parent ? getLocation(loc.parent) : undefined
    entries.push(
      makeEntry(
        { kind: 'place', id: loc.id, name: loc.name, context: parent ? `Inside ${parent.name}` : 'The whole body', path: pathFor(loc) },
        // The URL segment is another way to say the place: "blood" for Peripheral blood.
        loc.slug && loc.slug !== loc.id ? [loc.slug] : [],
      ),
    )
  }
  for (const tour of getTours()) {
    entries.push(
      makeEntry({
        kind: 'tour',
        id: tour.id,
        name: tour.title,
        context: `Guided tour, ${tour.steps.length} steps`,
        path: tourStepPath(tour, 0),
      }),
    )
  }
  return entries
}

// Rank = tier + penalty for the kind of field; lower is better. Tiers: the whole text, every word
// of the query as a whole word, every word as the start of a word, a run of letters inside it.
const TIER = { exact: 0, word: 10, prefix: 20, substring: 30 } as const
const FIELD_PENALTY: Record<FieldKind, number> = { name: 0, alias: 2, marker: 12 }
const FUZZY_BASE = 50

interface Query {
  squashed: string
  words: string[]
}

function tierOf(q: Query, f: Field): number | undefined {
  if (f.squashed === q.squashed) return TIER.exact
  if (q.words.every((w) => f.words.includes(w))) return TIER.word
  if (q.words.every((w) => f.words.some((fw) => fw.startsWith(w)))) return TIER.prefix
  if (q.squashed.length >= 3 && f.squashed.includes(q.squashed)) return TIER.substring
  return undefined
}

/** A marker string can be a phrase ("CD3 with CD4 or CD8"); show just the word the visitor typed. */
function markerShown(q: Query, f: Field): string {
  if (q.words.length !== 1) return f.text
  const word = f.text.split(/[\s,;]+/).find((w) => squash(w).startsWith(q.squashed))
  return word ?? f.text
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

/** One typo is allowed per four letters of a word. */
const allowedTypos = (word: string) => Math.floor(word.length / 4)

/** Distance from `word` to the nearest word of `f`, or to the start of one (a half-typed word still counts). */
const nearest = (word: string, targets: string[]) =>
  Math.min(...targets.map((t) => Math.min(editDistance(word, t), editDistance(word, t.slice(0, word.length)))))

/** The total typos if every query word is a near miss of a word in `f`, else undefined. */
function typoCost(q: Query, f: Field): number | undefined {
  let total = 0
  let everyWord = true
  for (const w of q.words) {
    const d = nearest(w, f.words)
    if (d > allowedTypos(w)) {
      everyWord = false
      break
    }
    total += d
  }
  if (everyWord) return total
  // One word that should be two ("lymphnod" for "lymph node"): compare the run-together text.
  if (q.words.length !== 1) return undefined
  const d = editDistance(q.squashed, f.squashed.slice(0, q.squashed.length))
  return d <= allowedTypos(q.squashed) ? d : undefined
}

function fuzzyRank(q: Query, entry: SearchEntry): number | undefined {
  let best: number | undefined
  for (const f of entry.fields) {
    const cost = typoCost(q, f)
    if (cost === undefined) continue
    const rank = FUZZY_BASE + cost + FIELD_PENALTY[f.kind]
    if (best === undefined || rank < best) best = rank
  }
  return best
}

function scan(q: Query, entry: SearchEntry): { rank: number; hint?: SearchHint } | undefined {
  let best: { rank: number; field: Field } | undefined
  for (const f of entry.fields) {
    const tier = tierOf(q, f)
    if (tier === undefined) continue
    const rank = tier + FIELD_PENALTY[f.kind]
    if (!best || rank < best.rank) best = { rank, field: f }
  }
  if (!best) return undefined
  const { field: f } = best
  return {
    rank: best.rank,
    hint: f.kind === 'alias' ? { label: 'Also called', text: f.text } : f.kind === 'marker' ? { label: 'Marker', text: markerShown(q, f) } : undefined,
  }
}

let entries: SearchEntry[] | undefined
let fuse: Fuse<SearchEntry> | undefined

function index() {
  if (!entries || !fuse) {
    entries = buildEntries()
    fuse = new Fuse(entries, {
      keys: [
        { name: 'names', weight: 4 },
        { name: 'aliases', weight: 3 },
        { name: 'markers', weight: 2 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      ignoreDiacritics: true,
      minMatchCharLength: 3,
    })
  }
  return { entries, fuse }
}

/** Every searchable entry (for tests and the validator-style checks). */
export function allEntries(): SearchEntry[] {
  return index().entries
}

/** Fewer characters than this gives too many hits to help. */
export const MIN_QUERY_LENGTH = 2
/** A typo needs room to hide in: below this, only exact, word, word-start and substring hits count. */
const FUZZY_MIN_LENGTH = 4

export function search(query: string, limit = 20): SearchResult[] {
  const q: Query = { squashed: squash(query), words: wordsOf(query) }
  if (q.squashed.length < MIN_QUERY_LENGTH) return []
  const { entries, fuse } = index()

  const found = new Map<string, { entry: SearchEntry; rank: number; hint?: SearchHint }>()
  for (const entry of entries) {
    const hit = scan(q, entry)
    if (hit) found.set(entry.key, { entry, ...hit })
  }
  if (q.squashed.length >= FUZZY_MIN_LENGTH) {
    for (const r of fuse.search(fold(query).trim(), { limit: limit * 2 })) {
      const rank = found.has(r.item.key) ? undefined : fuzzyRank(q, r.item)
      if (rank !== undefined) found.set(r.item.key, { entry: r.item, rank })
    }
  }
  return [...found.values()]
    .sort((a, b) => a.rank - b.rank || a.entry.name.length - b.entry.name.length || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit)
    .map(({ entry, hint }) => ({ entry, hint }))
}
