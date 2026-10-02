// Runtime checks for the content schemas. Each shape is typed against its interface in
// src/types, so adding, removing or retyping a field there fails `tsc` until the shape matches.
import { CELL_ARMS, CELL_FAMILIES, CELL_LINEAGES, CELL_STATUSES, type Cell } from '../src/types/cell.ts'
import { INTERACTION_TYPES, type Interaction } from '../src/types/interaction.ts'
import { LOCATION_STATUSES, type Location } from '../src/types/location.ts'
import { MOLECULE_KINDS, type Molecule } from '../src/types/molecule.ts'
import type { Tour, TourStep } from '../src/types/tour.ts'

/** Pushes a message for each problem with `value`. `_type` only ties the check to a TS type. */
export interface Check<T> {
  (value: unknown, path: string, errors: string[]): void
  _type?: T
}

interface Field<T, Optional extends boolean> {
  check: Check<T>
  optional: Optional
}

/** One field spec per property of T, optional exactly where T's property is optional. */
export type Shape<T> = {
  [K in keyof T]-?: Field<Exclude<T[K], undefined>, {} extends Pick<T, K> ? true : false>
}

const req = <T>(check: Check<T>): Field<T, false> => ({ check, optional: false })
const opt = <T>(check: Check<T>): Field<T, true> => ({ check, optional: true })

const describe = (v: unknown) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v)

const text: Check<string> = (v, path, errors) => {
  if (typeof v !== 'string') errors.push(`${path}: expected a string, got ${describe(v)}`)
  else if (!v.trim()) errors.push(`${path}: must not be empty`)
}

export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const id: Check<string> = (v, path, errors) => {
  if (typeof v !== 'string') errors.push(`${path}: expected an id string, got ${describe(v)}`)
  else if (!ID_PATTERN.test(v)) errors.push(`${path}: "${v}" is not lowercase-with-hyphens`)
}

const isoDate: Check<string> = (v, path, errors) => {
  const ok =
    typeof v === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    new Date(v + 'T00:00:00Z').toISOString().startsWith(v)
  if (!ok) errors.push(`${path}: expected a date like 2026-10-01, got ${JSON.stringify(v)}`)
}

const oneOf =
  <const V extends readonly string[]>(values: V): Check<V[number]> =>
  (v, path, errors) => {
    if (!values.includes(v as string)) {
      errors.push(`${path}: expected one of ${values.join(', ')}; got ${JSON.stringify(v)}`)
    }
  }

const nullable =
  <T>(check: Check<T>): Check<T | null> =>
  (v, path, errors) => {
    if (v !== null) check(v, path, errors)
  }

const arrayOf =
  <T>(check: Check<T>): Check<T[]> =>
  (v, path, errors) => {
    if (!Array.isArray(v)) errors.push(`${path}: expected an array, got ${describe(v)}`)
    else v.forEach((item, i) => check(item, `${path}[${i}]`, errors))
  }

/** Checks every field in `shape` and rejects fields it does not know (usually typos). */
export const objectOf =
  <T>(shape: Shape<T>): Check<T> =>
  (v, path, errors) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      errors.push(`${path || 'file'}: expected an object, got ${describe(v)}`)
      return
    }
    const record = v as Record<string, unknown>
    const at = (key: string) => (path ? `${path}.${key}` : key)
    for (const [key, field] of Object.entries(shape) as [string, Field<unknown, boolean>][]) {
      if (record[key] === undefined) {
        if (!field.optional) errors.push(`${at(key)}: required field is missing`)
      } else {
        field.check(record[key], at(key), errors)
      }
    }
    for (const key of Object.keys(record)) {
      if (!(key in shape)) errors.push(`${at(key)}: unknown field`)
    }
  }

export const locationShape: Shape<Location> = {
  id: req(id),
  name: req(text),
  parent: req(nullable(id)),
  slug: opt(id),
  scene: req(text),
  summary: req(text),
  description: opt(text),
  caption: opt(text),
  hotspots: req(arrayOf(objectOf<Location['hotspots'][number]>({ region: req(id), target: req(id) }))),
  residents: req(arrayOf(objectOf<Location['residents'][number]>({ cell: req(id), note: opt(text) }))),
  status: opt(oneOf(LOCATION_STATUSES)),
}

export const cellShape: Shape<Cell> = {
  id: req(id),
  name: req(text),
  aliases: opt(arrayOf(text)),
  home: opt(id),
  cellOntologyId: opt<string>((v, path, errors) => {
    if (typeof v !== 'string' || !/^CL:\d{7}$/.test(v)) {
      errors.push(`${path}: expected a Cell Ontology id like CL:0000775, got ${JSON.stringify(v)}`)
    }
  }),
  arm: req(oneOf(CELL_ARMS)),
  lineage: req(oneOf(CELL_LINEAGES)),
  family: req(oneOf(CELL_FAMILIES)),
  parent: opt(id),
  markers: req(arrayOf(text)),
  summary: req(text),
  functions: req(arrayOf(text)),
  abundance: opt(text),
  sources: req(arrayOf(text)),
  status: req(oneOf(CELL_STATUSES)),
  lastReviewed: opt(isoDate),
}

export const interactionShape: Shape<Interaction> = {
  id: req(id),
  source: req(id),
  target: req(id),
  type: req(oneOf(INTERACTION_TYPES)),
  via: opt(arrayOf(id)),
  where: opt(arrayOf(id)),
  description: req(text),
}

export const moleculeShape: Shape<Molecule> = {
  id: req(id),
  name: req(text),
  aliases: opt(arrayOf(text)),
  kind: req(oneOf(MOLECULE_KINDS)),
  summary: req(text),
}

const tourStepShape: Shape<TourStep> = {
  location: req(id),
  focus: opt(id),
  caption: req(text),
  highlight: req(arrayOf(id)),
  interactions: req(arrayOf(id)),
}

export const tourShape: Shape<Tour> = {
  id: req(id),
  title: req(text),
  steps: req(arrayOf(objectOf(tourStepShape))),
}
