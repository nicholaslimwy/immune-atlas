import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useIsPresent, useReducedMotion } from 'framer-motion'
import { familyVars, getIcon, iconOrGeneric, iconPx, iconRef } from '../art/icons.ts'
import { FAMILY_COLOURS, INK } from '../art/palette.ts'
import { matchesArm } from '../engine/armFilter.ts'
import { arrowPath } from '../engine/arrows.ts'
import { getCell } from '../engine/content.ts'
import { buildTimeline, phaseWindows, placeOf, sampleTimeline, type ActorFrame } from '../engine/loop.ts'
import type { LoopMarks, SceneLoop as Loop } from '../types/loop.ts'
import { useArmFilter } from './armFilterState.ts'

interface Props {
  loop: Loop
  /** The open step (1-based) of the loop's process, if one is open: its phases are highlighted. */
  step?: number
  /** Little room on the stage: the speed label drops its note. */
  compact?: boolean
}

/** Up to this many antigen pieces and signal dots per cell (the highest level). */
const MAX_PIECES = 3
const HELP_DOTS = 2
/** The cell's membrane is 40 units from the centre of its 100-unit box. */
const MEMBRANE = 0.4
const LEVELS = [0, 1, 2, 3]
/** Seconds of fade where a step's replay jumps from the end of one stretch to the start of another. */
const JUMP_FADE = 0.35

/** Elements of one drawn cell, found once after mount and then updated in place every frame. */
interface ActorEls {
  root: SVGGElement
  body: SVGGElement
  cell: SVGUseElement
  ring: SVGCircleElement
  sibling: SVGUseElement
  pieces: SVGCircleElement[]
  help: SVGCircleElement[]
  /** Last written values, so a frame only touches what changed. */
  last: Record<string, string>
}

const globalPaused = () => document.documentElement.classList.contains('motion-paused')

/**
 * A looping animation drawn inside its scene (into the scene SVG's <g data-loop="<id>">, under the
 * labels and hotspot cells), plus a Pause/Play button and a "Sped up" label on the stage. It runs only
 * while it is on screen, the tab is visible and the visitor has not paused it (here or with Pause scene
 * motion); under reduced motion it is a still diagram with arrows instead. While a step of the loop's
 * process is open, the cells (or diagram parts) in the matching phases are ringed and the rest dimmed.
 */
export default function SceneLoop({ loop, step, compact = false }: Props) {
  const reduced = useReducedMotion() ?? false
  const present = useIsPresent()
  const { arm } = useArmFilter()
  const uiRef = useRef<HTMLDivElement>(null)
  const [layer, setLayer] = useState<SVGGElement | null>(null)

  // The scene's SVG is in the page by now (the frame layer before this one has committed): find where to draw.
  useLayoutEffect(() => {
    setLayer(uiRef.current?.parentElement?.querySelector<SVGGElement>(`[data-loop="${loop.id}"]`) ?? null)
  }, [loop.id])

  // Pause/Play here; Pause scene motion (MotionToggle) sets the same state when it is pressed.
  const [playing, setPlaying] = useState(() => !globalPaused())
  useEffect(() => {
    const watch = new MutationObserver(() => setPlaying(!globalPaused()))
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => watch.disconnect()
  }, [])

  // Stop by itself while the stage is scrolled away or the tab is hidden.
  const [onScreen, setOnScreen] = useState(true)
  useEffect(() => {
    const stage = uiRef.current?.closest('.stage')
    if (!stage || typeof IntersectionObserver === 'undefined') return
    const watch = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    watch.observe(stage)
    return () => watch.disconnect()
  }, [])
  const [tabVisible, setTabVisible] = useState(() => document.visibilityState !== 'hidden')
  useEffect(() => {
    const onChange = () => setTabVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  const active = useMemo(
    () => new Set(step === undefined ? [] : loop.phases.filter((p) => p.steps.includes(step)).map((p) => p.id)),
    [loop, step],
  )
  const timelines = useMemo(() => loop.actors.map((a) => buildTimeline(loop, a.rounds, a.slots)), [loop])
  // The still diagram: each cell is a route sampled at one moment, exactly as an actor would look then.
  const stillFrames = useMemo(
    () =>
      loop.still.cells.map((c, i) =>
        sampleTimeline(buildTimeline(loop, [{ route: c.route, level: c.level }], c.slots), c.time, axisOf(i)),
      ),
    [loop],
  )
  const count = reduced ? stillFrames.length : loop.actors.length
  // While a step is open, only the stretches of the loop in its phases play, over and over, so the part the
  // step describes is always on show (with one cell on stage, it would otherwise be there a few seconds a minute).
  const windows = useMemo(
    () => (active.size && !reduced ? phaseWindows(timelines, loop.actors.map((a) => a.start), active) : []),
    [active, reduced, timelines, loop],
  )

  const els = useRef<(ActorEls | null)[]>([])
  const fadeRef = useRef<SVGGElement>(null)
  const clock = useRef(0)
  // A new step (or none) starts from the beginning of its stretches (or of the loop).
  useLayoutEffect(() => {
    clock.current = 0
  }, [windows])
  const paint = useCallback(() => {
    const { t, fade } = windows.length ? windowTime(windows, clock.current, timelines[0]?.duration ?? 0) : { t: clock.current, fade: 1 }
    if (fade < 1) fadeRef.current?.setAttribute('opacity', fade.toFixed(2))
    else fadeRef.current?.removeAttribute('opacity')
    els.current.forEach((el, i) => {
      if (!el) return
      const frame = reduced ? stillFrames[i] : sampleTimeline(timelines[i], t + loop.actors[i].start, axisOf(i))
      if (frame) paintActor(el, frame, loop.id, active, !!loop.follow && !reduced)
    })
  }, [reduced, stillFrames, timelines, loop, active, windows])

  const run = playing && onScreen && tabVisible && present && !reduced && !!layer
  // Draw once whenever something but the time changes (highlight, mode), then tick while running.
  useLayoutEffect(paint, [paint, layer, count])
  useEffect(() => {
    if (!run) return
    let frame = 0
    let last: number | undefined
    const tick = (now: number) => {
      // A long gap (a stalled frame) is not played as a jump.
      if (last !== undefined) clock.current += Math.min(0.1, (now - last) / 1000)
      last = now
      paint()
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [run, paint])

  // The arm filter dims these cells like the scene's other unlabelled cells.
  useEffect(() => {
    layer?.classList.toggle('filter-dim', !matchesArm(arm, loop.look))
  }, [layer, arm, loop.look])

  const pxPerUm = Number(layer?.ownerSVGElement?.getAttribute('data-px-per-um')) || 6
  const size = iconPx(iconOrGeneric(loop.look), pxPerUm)
  const signal = loop.signal ? getCell(loop.signal) : undefined
  const signalColour = signal ? FAMILY_COLOURS[signal.family].base : INK

  const cells: ReactNode[] = Array.from({ length: count }, (_, i) => (
    <g
      key={`${reduced ? 'still' : 'actor'}-${i}`}
      className="loop-actor"
      ref={(g) => {
        els.current[i] = g ? findEls(g) : null
      }}
    >
      <use className="loop-sibling" x={-size / 2} y={-size / 2} width={size} height={size} />
      <g className="loop-body">
        <use className="loop-cell" x={-size / 2} y={-size / 2} width={size} height={size} />
        <circle
          className="loop-ring"
          r={size * MEMBRANE + 6}
          fill="none"
          stroke={INK}
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
        />
      </g>
      {Array.from({ length: MAX_PIECES }, (_, k) => (
        <circle key={`p${k}`} className="loop-piece" r={2.6} fill={INK} />
      ))}
      {Array.from({ length: HELP_DOTS }, (_, k) => (
        <circle key={`h${k}`} className="loop-help" r={2.8} fill={signalColour} />
      ))}
    </g>
  ))

  const stillArrows = reduced
    ? loop.still.arrows.flatMap((a, i) => {
        const from = placeOf(loop, a.from, {})
        const to = placeOf(loop, a.to, {})
        const d = from && to ? arrowPath(from, to, 40, a.bow ?? 0.18) : null
        return d ? [{ key: i, d, dim: active.size > 0 && !active.has(a.phase), on: active.has(a.phase) }] : []
      })
    : []

  const drawing = layer
    ? createPortal(
        <>
          <defs>
            {LEVELS.map((level) => (
              <symbol key={level} id={`${loop.id}-cell-${level}`} viewBox="0 0 100 100" overflow="visible">
                {loop.marks && <Marks marks={loop.marks} level={level} colour={FAMILY_COLOURS[familyOf(loop.look)].shade} />}
                <LookArt look={loop.look} />
              </symbol>
            ))}
            <symbol id={`${loop.id}-dying`} viewBox="0 0 100 100">
              <DyingArt look={loop.look} />
            </symbol>
            <marker
              id={`${loop.id}-arrowhead`}
              viewBox="0 0 10 10"
              refX="4"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M0 0 L10 5 L0 10 Z" fill={INK} stroke="#FFFFFF" strokeWidth="1.2" strokeLinejoin="round" />
            </marker>
          </defs>
          {stillArrows.map(({ key, d, dim, on }) => (
            <g key={key} className={`loop-arrow${dim ? ' loop-dim' : ''}${on ? ' loop-arrow-on' : ''}`}>
              <path d={d} className="loop-arrow-casing" />
              <path d={d} className="loop-arrow-line" markerEnd={`url(#${loop.id}-arrowhead)`} />
            </g>
          ))}
          <g ref={fadeRef}>{cells}</g>
        </>,
        layer,
      )
    : null

  return (
    <div ref={uiRef} className="loop-ui" inert={!present}>
      {drawing}
      {!reduced && (
        <div className="loop-controls">
          <button
            type="button"
            className="loop-play"
            aria-label={playing ? 'Pause the animation' : 'Play the animation'}
            aria-describedby={`${loop.id}-about`}
            onClick={() => setPlaying((p) => !p)}
          >
            <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true" focusable="false">
              {playing ? <path d="M2 1.5h2v7H2zM6 1.5h2v7H6z" fill="currentColor" /> : <path d="M2.5 1.2 9 5 2.5 8.8Z" fill="currentColor" />}
            </svg>
            {playing ? 'Pause' : 'Play'}
          </button>
          <span className="loop-speed">
            {loop.speed}
            {loop.speedNote && !compact && <span className="loop-speed-note">: {loop.speedNote}</span>}
          </span>
          <span id={`${loop.id}-about`} className="visually-hidden">
            {loop.speed}
            {loop.speedNote ? `: ${loop.speedNote}` : ''}. The animation shows, in turn: {loop.phases.map((p) => p.name).join('; ')}.
          </span>
        </div>
      )}
    </div>
  )
}

/**
 * Where `clock` seconds of replay falls in `windows` (loop time), and how faded it is: a stretch fades in and out
 * where the replay jumps, not where one stretch runs straight on into the next.
 */
function windowTime(windows: { t0: number; t1: number }[], clock: number, duration: number) {
  const total = windows.reduce((sum, w) => sum + (w.t1 - w.t0), 0)
  let u = ((clock % total) + total) % total
  const joined = (end: number, start: number) => Math.abs((((end - start) % duration) + duration) % duration) < 1e-6
  for (let i = 0; i < windows.length; i++) {
    const w = windows[i]
    const len = w.t1 - w.t0
    if (u < len || i === windows.length - 1) {
      const prev = windows[(i - 1 + windows.length) % windows.length]
      const next = windows[(i + 1) % windows.length]
      const fadeIn = joined(prev.t1, w.t0) ? 1 : Math.min(1, u / JUMP_FADE)
      const fadeOut = joined(w.t1, next.t0) ? 1 : Math.min(1, (len - u) / JUMP_FADE)
      return { t: w.t0 + Math.min(u, len), fade: Math.max(0, Math.min(fadeIn, fadeOut)) }
    }
    u -= len
  }
  return { t: 0, fade: 1 }
}

/** Each cell divides along its own axis, so neighbouring divisions do not all point the same way. */
const axisOf = (i: number) => (i * 67 + 20) % 180

const familyOf = (look: string) => getCell(look)?.family ?? 'support'

/** The moving cell's own icon, or the generic placeholder in its family colours. */
function LookArt({ look }: { look: string }) {
  const own = getIcon(look)
  return own ? (
    <use href={`#${iconRef(look)}`} width="100" height="100" />
  ) : (
    <use href="#icon-generic" width="100" height="100" style={familyVars(familyOf(look))} />
  )
}

/**
 * A dying cell: shrunken, its receptors gone, its nucleus broken into pieces (as the thymus scene draws them).
 * Drawn on a 100-unit box like the icons; the frame shrinks it further.
 */
function DyingArt({ look }: { look: string }) {
  const { tint, shade } = FAMILY_COLOURS[familyOf(look)]
  return (
    <>
      <circle cx="50" cy="50" r="36" fill={tint} stroke={INK} strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx="41" cy="44" r="8" fill={shade} />
      <circle cx="58" cy="43" r="6" fill={shade} />
      <circle cx="47" cy="61" r="6.5" fill={shade} />
      <circle cx="61" cy="58" r="4" fill={shade} />
    </>
  )
}

// B-cell receptors (membrane antibody), five round the cell like the naive B icon. The binding ends change
// shape with the level: a mutation in the dark zone changes how well the receptor fits the antigen.
const RECEPTOR_ANGLES = [18, 90, 162, 234, 306]
const RECEPTOR_TIPS = [
  // 0: bent, short arms: a poor fit
  'M50 11 V6.5 L46.4 5.4 M50 6.5 L52.2 3.4',
  // 1: a plain Y
  'M50 11 V6.5 L44.6 2.2 M50 6.5 L55.4 2.2',
  // 2: a Y with a knob on each arm (dots drawn below)
  'M50 11 V6.5 L45.2 2.6 M50 6.5 L54.8 2.6',
  // 3: a Y whose arms hook inwards: the best grip
  'M50 11 V6.5 L44.6 2.2 L47.2 0.9 M50 6.5 L55.4 2.2 L52.8 0.9',
]

function Marks({ marks, level, colour }: { marks: LoopMarks; level: number; colour: string }) {
  if (marks !== 'b-cell-receptor') return null
  return (
    <g fill="none" stroke={colour} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
      {RECEPTOR_ANGLES.map((a) => (
        <g key={a} transform={`rotate(${a} 50 50)`}>
          <path d={RECEPTOR_TIPS[level]} />
          {level === 2 && (
            <>
              <circle cx="45.2" cy="2.6" r="1.7" fill={colour} stroke="none" />
              <circle cx="54.8" cy="2.6" r="1.7" fill={colour} stroke="none" />
            </>
          )}
        </g>
      ))}
    </g>
  )
}

function findEls(root: SVGGElement): ActorEls {
  return {
    root,
    body: root.querySelector<SVGGElement>('.loop-body')!,
    cell: root.querySelector<SVGUseElement>('.loop-cell')!,
    ring: root.querySelector<SVGCircleElement>('.loop-ring')!,
    sibling: root.querySelector<SVGUseElement>('.loop-sibling')!,
    pieces: [...root.querySelectorAll<SVGCircleElement>('.loop-piece')],
    help: [...root.querySelectorAll<SVGCircleElement>('.loop-help')],
    last: {},
  }
}

/** Write an attribute only when it changed (most frames change a transform and little else). */
function set(el: ActorEls, key: string, node: Element, attr: string, value: string | null) {
  if (el.last[key] === (value ?? '\0')) return
  el.last[key] = value ?? '\0'
  if (value === null) node.removeAttribute(attr)
  else node.setAttribute(attr, value)
}

const f1 = (n: number) => n.toFixed(1)
const f2 = (n: number) => n.toFixed(2)

function paintActor(el: ActorEls, frame: ActorFrame, id: string, active: Set<string>, follow: boolean) {
  const hidden = frame.gone || frame.opacity <= 0.01
  set(el, 'display', el.root, 'display', hidden ? 'none' : null)
  const highlight = active.size > 0
  set(el, 'class', el.root, 'class', highlight && !active.has(frame.phase) ? 'loop-actor loop-dim' : 'loop-actor')
  if (hidden) return

  // Division stretches the cell along its axis and narrows it across, before it pinches in two.
  const sx = frame.stretch * frame.scale
  const sy = (1 - (frame.stretch - 1) * 0.55) * frame.scale
  set(
    el,
    'body',
    el.body,
    'transform',
    `translate(${f1(frame.x)} ${f1(frame.y)}) rotate(${frame.angle}) scale(${f2(sx)} ${f2(sy)}) rotate(${-frame.angle})`,
  )
  set(el, 'bodyOpacity', el.body, 'opacity', frame.opacity < 1 ? f2(frame.opacity) : null)
  set(el, 'href', el.cell, 'href', `#${id}-${frame.dying ? 'dying' : `cell-${frame.look}`}`)
  // The ring marks the cell to watch: in a step, a cell in its phases; otherwise, with `follow`, every cell on stage.
  set(el, 'ring', el.ring, 'display', (highlight ? active.has(frame.phase) : follow) ? null : 'none')

  const sib = frame.sibling
  set(el, 'sibDisplay', el.sibling, 'display', sib && sib.opacity > 0.01 ? null : 'none')
  if (sib) {
    set(el, 'sib', el.sibling, 'transform', `translate(${f1(sib.x)} ${f1(sib.y)})`)
    set(el, 'sibOpacity', el.sibling, 'opacity', f2(sib.opacity * frame.opacity))
    set(el, 'sibHref', el.sibling, 'href', `#${id}-cell-${sib.look}`)
  }

  el.pieces.forEach((node, k) => {
    const p = frame.pieces[k]
    set(el, `p${k}`, node, 'display', p ? null : 'none')
    if (p) set(el, `pc${k}`, node, 'transform', `translate(${f1(p.x)} ${f1(p.y)})`)
  })
  el.help.forEach((node, k) => {
    const h = frame.help[k]
    const show = h && h.opacity > 0.01
    set(el, `h${k}`, node, 'display', show ? null : 'none')
    if (show) {
      set(el, `hc${k}`, node, 'transform', `translate(${f1(h.x)} ${f1(h.y)})`)
      set(el, `ho${k}`, node, 'opacity', f2(h.opacity))
    }
  })
}
