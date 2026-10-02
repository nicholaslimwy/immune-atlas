import source from '../../ATTRIBUTIONS.md?raw'

/** A piece of inline text: plain, `code`, or a [link](url). */
export type Inline = { text: string; code?: boolean; href?: string }

export interface CreditSection {
  heading: string
  /** Paragraphs before and after the table, in order, each as inline pieces. */
  before: Inline[][]
  table?: { header: string[]; rows: Inline[][][] }
  after: Inline[][]
}

/** Splits a line of Markdown into plain text, `code` spans and [text](url) links (nothing else is used). */
export function parseInline(line: string): Inline[] {
  const out: Inline[] = []
  const pattern = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g
  let last = 0
  for (const m of line.matchAll(pattern)) {
    if (m.index > last) out.push({ text: line.slice(last, m.index) })
    out.push(m[1] !== undefined ? { text: m[1], code: true } : { text: m[2], href: m[3] })
    last = m.index + m[0].length
  }
  if (last < line.length) out.push({ text: line.slice(last) })
  return out
}

const cellsOf = (row: string) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())

/**
 * The credits shown on /about: every `##` section of ATTRIBUTIONS.md, each with its paragraphs and table.
 * The title and the maintainers' note above the first `##` are left out, and so are placeholder rows
 * ("(none yet)") and a table that has nothing else.
 */
export function parseAttributions(markdown: string): CreditSection[] {
  const sections: CreditSection[] = []
  let current: CreditSection | undefined
  let tableLines: string[] = []

  const flushTable = () => {
    if (!current || tableLines.length < 2) {
      tableLines = []
      return
    }
    const [header, , ...body] = tableLines
    const rows = body.map(cellsOf).filter((r) => r[0] && r[0] !== '(none yet)')
    if (rows.length) current.table = { header: cellsOf(header), rows: rows.map((r) => r.map(parseInline)) }
    tableLines = []
  }

  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('|')) {
      tableLines.push(line)
      continue
    }
    flushTable()
    if (line.startsWith('## ')) {
      current = { heading: line.slice(3).trim(), before: [], after: [] }
      sections.push(current)
    } else if (line && current) {
      ;(current.table ? current.after : current.before).push(parseInline(line))
    }
  }
  flushTable()
  return sections
}

/** ATTRIBUTIONS.md as it was when the site was built. */
export const CREDITS = parseAttributions(source)
