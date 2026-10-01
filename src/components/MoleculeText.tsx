import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { KIND_LABELS } from '../engine/glossary.ts'
import type { TextPart } from '../engine/mentions.ts'
import { glossaryPathFor } from '../engine/paths.ts'
import type { Molecule } from '../types/molecule.ts'

/** Text cut up by `mentionAnnotator`: plain stretches stay text, each marked molecule becomes a MoleculeTerm. */
export default function MoleculeText({ parts }: { parts: TextPart[] }) {
  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <MoleculeTerm key={`${i}-${part.molecule.id}`} molecule={part.molecule}>
            {part.text}
          </MoleculeTerm>
        ),
      )}
    </>
  )
}

/** Several names, comma-separated (an interaction's "Via" line), each cut up already like MoleculeText's text. */
export function MoleculeList({ items }: { items: TextPart[][] }) {
  return (
    <>
      {items.map((parts, i) => (
        <Fragment key={i}>
          {i > 0 && ', '}
          <MoleculeText parts={parts} />
        </Fragment>
      ))}
    </>
  )
}

const MARGIN = 12
const HOVER_CLOSE_MS = 150

/**
 * A molecule's name in running text. Its summary opens on mouse hover, on keyboard focus and on a
 * tap or click (a second one closes it); Escape, a tap elsewhere, or moving focus away closes it too.
 * The popover sits inside the term, so Tab reaches its glossary link next.
 */
function MoleculeTerm({ molecule, children }: { molecule: Molecule; children: string }) {
  const popId = useId()
  const wrapRef = useRef<HTMLSpanElement>(null)
  const popRef = useRef<HTMLSpanElement>(null)
  const pointerActive = useRef(false)
  const hoverTimer = useRef<number | undefined>(undefined)
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const open = hovered || pinned

  // The popover is fixed to the viewport (the panel scrolls and clips), so place it by hand: under
  // the term, or above it when there is no room below, never past the screen edges. Follows scrolling.
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      const term = wrapRef.current?.getBoundingClientRect()
      const pop = popRef.current
      if (!term || !pop) return
      const width = pop.offsetWidth
      const height = pop.offsetHeight
      const left = Math.max(MARGIN, Math.min(term.left, window.innerWidth - width - MARGIN))
      const below = term.bottom + 4
      const top = below + height > window.innerHeight - MARGIN && term.top - height - 4 > MARGIN ? term.top - height - 4 : below
      setPos((p) => (p && p.left === left && p.top === top ? p : { left, top }))
    }
    place()
    window.addEventListener('scroll', place, true)
    window.addEventListener('resize', place)
    return () => {
      window.removeEventListener('scroll', place, true)
      window.removeEventListener('resize', place)
    }
  }, [open])

  // A tap or click anywhere else closes a pinned popover (iOS buttons take no focus, so blur is not enough).
  useEffect(() => {
    if (!pinned) return
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPinned(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [pinned])

  useEffect(() => () => window.clearTimeout(hoverTimer.current), [])

  return (
    <span
      ref={wrapRef}
      className="mol"
      // Hover only for a mouse: a touch also fires pointerenter, and would open then close on the tap.
      onPointerEnter={(e) => {
        if (e.pointerType !== 'mouse') return
        window.clearTimeout(hoverTimer.current)
        setHovered(true)
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== 'mouse') return
        // A short delay lets the pointer cross from the term to the popover.
        hoverTimer.current = window.setTimeout(() => setHovered(false), HOVER_CLOSE_MS)
      }}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget as Node | null)) setPinned(false)
      }}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return
        // Closes the popover only: not the cell panel or tour the term sits in.
        e.stopPropagation()
        window.clearTimeout(hoverTimer.current)
        setHovered(false)
        setPinned(false)
        // Focus returns to the term (from the popover's link) without reopening it.
        if (popRef.current?.contains(document.activeElement)) {
          pointerActive.current = true
          wrapRef.current?.querySelector('button')?.focus()
          pointerActive.current = false
        }
      }}
    >
      <button
        type="button"
        className="mol-term"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        onPointerDown={() => {
          pointerActive.current = true
        }}
        onPointerUp={() => {
          pointerActive.current = false
        }}
        onPointerCancel={() => {
          pointerActive.current = false
        }}
        // Focus from the keyboard opens it; focus from a press is left to the click, or the two would cancel out.
        onFocus={() => {
          if (!pointerActive.current) setPinned(true)
        }}
        onClick={() => setPinned((p) => !p)}
      >
        {children}
      </button>
      {open && (
        <span
          ref={popRef}
          id={popId}
          role="group"
          aria-label={`${molecule.name}: definition`}
          className="mol-pop"
          style={pos ? { left: pos.left, top: pos.top } : { visibility: 'hidden' }}
        >
          <span className="mol-pop-name">
            {molecule.name} <span className="mol-pop-kind">{KIND_LABELS[molecule.kind]}</span>
          </span>
          <span className="mol-pop-text">{molecule.summary}</span>
          <Link to={glossaryPathFor(molecule.id)} className="mol-pop-link">
            Glossary entry →
          </Link>
        </span>
      )}
    </span>
  )
}
