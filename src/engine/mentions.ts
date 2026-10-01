// Finds molecule names inside running text, at display time, so the content files stay plain strings.
// Pure (no content import) so it can be tested on its own; `glossary.ts` feeds it the real molecules.
import type { Molecule } from '../types/molecule.ts'

/** A stretch of text: plain, or the name of a molecule (as written in the text). */
export type TextPart = string | { molecule: Molecule; text: string }

/** A name written this short must match exactly, case included ("FL", "SCF", "IL-2"); longer ones may differ in case. */
const CASE_SENSITIVE_UP_TO = 5

/**
 * Every written form of a molecule's name: the whole name, its lead term ("CCL2" from "CCL2 (MCP-1)"),
 * each term in brackets ("MCP-1"; "IFN-α and IFN-β" gives both), and its aliases. Same rule as search,
 * plus the split on "and", because a bracket is often a list.
 */
function variantsOf(m: Molecule): string[] {
  const out = new Set<string>([m.name])
  const head = m.name.split(/\s+\(/)[0].trim()
  if (head) out.add(head)
  for (const group of m.name.matchAll(/\(([^)]*)\)/g)) {
    for (const part of group[1].split(/;|,|\sand\s/)) if (part.trim()) out.add(part.trim())
  }
  for (const alias of m.aliases ?? []) out.add(alias)
  return [...out]
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const key = (s: string) => s.toLowerCase()

/**
 * A function that cuts text into parts, marking the first mention of each molecule (by exact name
 * or alias, whole words only; the longest form wins, so "IL-17A" is not "IL-17" and "MHC class II"
 * is not "MHC class I"). Later mentions of a molecule already in `seen` stay plain, and the ids it
 * marks are added to `seen`, so one set shared across several texts means "first mention overall".
 */
export function createMentionFinder(molecules: Molecule[]) {
  const byKey = new Map<string, { molecule: Molecule; form: string }>()
  for (const molecule of molecules) {
    for (const form of variantsOf(molecule)) {
      // Two molecules claiming one form: the first stays (the validator warns about alias clashes).
      if (!byKey.has(key(form))) byKey.set(key(form), { molecule, form })
    }
  }
  const forms = [...byKey.values()].map((v) => v.form).sort((a, b) => b.length - a.length)
  if (forms.length === 0) return (text: string): TextPart[] => [text]
  // A letter or digit on either side means a longer word ("IL-2R", "IL-21"), not a mention.
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${forms.map(escapeRegExp).join('|')})(?![\\p{L}\\p{N}])`, 'giu')

  return (text: string, seen: Set<string>): TextPart[] => {
    const parts: TextPart[] = []
    let last = 0
    for (const match of text.matchAll(re)) {
      const hit = byKey.get(key(match[0]))
      if (!hit || seen.has(hit.molecule.id)) continue
      if (hit.form.length <= CASE_SENSITIVE_UP_TO && match[0] !== hit.form) continue
      if (match.index > last) parts.push(text.slice(last, match.index))
      parts.push({ molecule: hit.molecule, text: match[0] })
      seen.add(hit.molecule.id)
      last = match.index + match[0].length
    }
    if (last < text.length) parts.push(text.slice(last))
    return parts.length > 0 ? parts : [text]
  }
}
