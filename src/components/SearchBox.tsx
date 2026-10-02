import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useArmFilter } from './armFilterState.ts'
import type { SearchKind } from '../engine/search.ts'

// The search engine (Fuse.js and the index) is a separate chunk, fetched the first time the box is used.
type SearchEngine = typeof import('../engine/search.ts')
let engineLoad: Promise<SearchEngine> | undefined
const loadEngine = () => (engineLoad ??= import('../engine/search.ts'))

const KIND_LABELS: Record<SearchKind, string> = {
  cell: 'Cell',
  molecule: 'Molecule',
  place: 'Place',
  tour: 'Tour',
}

/** True when a key press is meant for a text field, not for a page shortcut. */
const isTyping = (target: EventTarget | null) =>
  !!(target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable]')

/**
 * Search box for the header: type a name, an alias or a marker (CD4, PMN, interleukin 12) and choose
 * a result to open it. Press "/" anywhere to jump to it. It follows the ARIA combobox pattern, so
 * the arrow keys move through the results while focus stays in the field.
 */
export default function SearchBox() {
  const navigate = useNavigate()
  // The path inside the app (without the GitHub Pages folder), comparable with a result's path.
  const location = useLocation()
  const { arm } = useArmFilter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [engine, setEngine] = useState<SearchEngine | null>(null)

  const warmUp = () => {
    if (!engine) loadEngine().then(setEngine)
  }

  const results = useMemo(() => (engine ? engine.search(query, undefined, arm) : []), [engine, query, arm])
  const searching = !!engine && query.trim().length >= engine.MIN_QUERY_LENGTH
  const showList = open && searching

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented || isTyping(e.target)) return
      e.preventDefault()
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const choose = (i: number) => {
    const result = results[i]
    if (!result) return
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
    // Choosing the page you are already on changes nothing, so the page's own focus rules never run: put focus on its title here.
    if (result.entry.path === location.pathname) {
      const title = document.getElementById('cell-panel-title') ?? document.querySelector<HTMLElement>('main h1')
      title?.setAttribute('tabindex', '-1')
      title?.focus()
    }
    navigate(result.entry.path)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!results.length) return
      e.preventDefault()
      setOpen(true)
      const step = e.key === 'ArrowDown' ? 1 : -1
      setActive((a) => (a + step + results.length) % results.length)
    } else if (e.key === 'Enter') {
      if (showList && results.length) {
        e.preventDefault()
        choose(active)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      // First press closes the list, the second clears the field.
      if (showList) setOpen(false)
      else if (query) setQuery('')
      else inputRef.current?.blur()
    }
  }

  const status = !searching
    ? ''
    : results.length
      ? `${results.length} ${results.length === 1 ? 'result' : 'results'}`
      : `No results for ${query.trim()}`

  return (
    <div
      className="search"
      role="search"
      onBlur={(e) => {
        // Leaving the whole widget (not moving within it) closes the list.
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
      }}
    >
      <input
        ref={inputRef}
        type="search"
        className="search-input"
        placeholder="Search the atlas"
        aria-label="Search cells, molecules, places and tours"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && results.length ? `${listId}-${active}` : undefined}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="go"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => {
          warmUp()
          setOpen(true)
        }}
        onPointerEnter={warmUp}
        onKeyDown={onKeyDown}
      />
      <kbd className="search-key" aria-hidden="true">
        /
      </kbd>
      <p className="visually-hidden" role="status">
        {status}
      </p>
      {showList && (
        <ul id={listId} className="search-results" role="listbox" aria-label="Search results">
          {results.length === 0 && (
            <li className="search-empty" role="presentation">
              No match for “{query.trim()}”. Try a cell name, a marker such as CD4, or a molecule such as IL-12.
            </li>
          )}
          {results.map(({ entry, hint }, i) => (
            <li
              key={entry.key}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'search-result is-active' : 'search-result'}
              // mousedown would blur the field before the click lands and close the list.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              onMouseMove={() => i !== active && setActive(i)}
            >
              <span className="search-kind">{KIND_LABELS[entry.kind]}</span>
              <span className="search-name">{entry.name}</span>
              <span className="search-context">
                {hint && (
                  <>
                    {hint.label} {hint.text} ·{' '}
                  </>
                )}
                {entry.context}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
