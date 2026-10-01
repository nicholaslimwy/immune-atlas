import { useState } from 'react'
import { Link } from 'react-router'
import { familyVars, GENERIC, ICONS, iconPx, iconRef } from '../art/icons.ts'
import { BODY_UNITS } from '../art/iconSpecs.ts'
import { FAMILY_COLOURS, INK, RED_CELL } from '../art/palette.ts'
import CellIcon from '../components/CellIcon.tsx'
import { getCell, getCells } from '../engine/content.ts'
import { CELL_FAMILIES } from '../types/cell.ts'

/** Scale for the true-size comparison. */
const COMPARE_PX_PER_UM = 12
/** Scale cells are drawn at in the blood scene (800x500). */
const SCENE_PX_PER_UM = 7
/** Red blood cell diameter, drawn as the size reference. */
const RED_CELL_UM = 7.5

const nameOf = (id: string) => getCell(id)?.name ?? id
const familyOf = (id: string) => FAMILY_COLOURS[getCell(id)?.family ?? 'support']
const familyRank = (id: string) => CELL_FAMILIES.indexOf(getCell(id)?.family ?? 'support')

/** Drawn icons grouped by family (style guide order), largest first within a family. */
const ORDERED = [...ICONS].sort((a, b) => familyRank(a.id) - familyRank(b.id) || b.diameterUm - a.diameterUm)

/** A red blood cell disc (paler centre for the biconcave dip), sized like a cell body. */
function RedCell({ pxPerUm, dashed = false }: { pxPerUm: number; dashed?: boolean }) {
  const px = (RED_CELL_UM * pxPerUm * 100) / BODY_UNITS
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} role="img" aria-label="Red blood cell (size reference)">
      {dashed ? (
        <circle cx="50" cy="50" r="40" fill="none" stroke={RED_CELL.base} strokeWidth="2" strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
      ) : (
        <>
          <circle cx="50" cy="50" r="40" fill={RED_CELL.base} />
          <circle cx="50" cy="50" r="15" fill={RED_CELL.tint} />
        </>
      )}
    </svg>
  )
}

function Swatch({ hex, role }: { hex: string; role: string }) {
  return (
    <div className="swatch">
      <div className="swatch-colour" style={{ background: hex }} />
      <span>{role}</span>
      <code>{hex}</code>
    </div>
  )
}

export default function StyleGuide() {
  const [grey, setGrey] = useState(false)
  const cells = getCells()

  return (
    <main className={grey ? 'styleguide grey' : 'styleguide'}>
      <p>
        <Link to="/body">← Back to the atlas</Link>
      </p>
      <h1>Style guide</h1>
      <p className="lede">
        Flat, stylised vector cells. One icon per cell type, drawn once and reused in every scene; each is anchored on
        the feature a student would recognise under a microscope.
      </p>
      <label className="grey-toggle">
        <input type="checkbox" checked={grey} onChange={(e) => setGrey(e.target.checked)} /> Show in greyscale (shapes
        and labels must still tell cells apart)
      </label>

      <section>
        <h2>Palette</h2>
        <p>
          One hue per family. Tint fills the cytoplasm, base the nucleus, shade the granules, receptors and chromatin.
          Colour never works alone: every cell also has a label and a shape cue.
        </p>
        <div className="families">
          {CELL_FAMILIES.map((family) => {
            const c = FAMILY_COLOURS[family]
            const members = cells.filter((cell) => cell.family === family).map((cell) => cell.name).sort()
            return (
              <div className="family" key={family}>
                <h3>{c.label}</h3>
                <div className="swatches">
                  <Swatch hex={c.tint} role="tint" />
                  <Swatch hex={c.base} role="base" />
                  <Swatch hex={c.shade} role="shade" />
                </div>
                <p className="members">{members.join(', ')}</p>
              </div>
            )
          })}
          <div className="family">
            <h3>Outline and background</h3>
            <div className="swatches">
              <Swatch hex={INK} role="ink" />
              <Swatch hex={RED_CELL.tint} role="red cell tint" />
              <Swatch hex={RED_CELL.base} role="red cell" />
            </div>
            <p className="members">Ink outlines membranes and nuclei and sets label text. Red cells are background art in blood, muted so they never compete with myeloid orange.</p>
          </div>
        </div>
      </section>

      <section>
        <h2>Rules</h2>
        <dl className="rules">
          <dt>Icon box</dt>
          <dd>
            <code>viewBox="0 0 100 100"</code>; the cell body is a circle of diameter {BODY_UNITS} centred at (50, 50).
            The outer 10 units hold only protrusions: receptors, arms, pseudopods.
          </dd>
          <dt>Outline</dt>
          <dd>
            Membrane and nucleus outlined in ink, 2 px on screen at any size (
            <code>vector-effect="non-scaling-stroke"</code>), round joins and caps.
          </dd>
          <dt>Detail</dt>
          <dd>Granules, chromatin and receptors are flat shapes in the family shade, with no outline. No gradients, shadows or transparency.</dd>
          <dt>Size</dt>
          <dd>
            The {BODY_UNITS}-unit body stands for the cell's real diameter. Within one scene every cell is drawn at the
            same px per µm (blood: {SCENE_PX_PER_UM} px per µm), so a lymphocyte is about the size of a red cell and a
            neutrophil is clearly bigger.
          </dd>
          <dt>Look-alikes</dt>
          <dd>
            B and T cells look the same under a microscope, so their icons differ by a receptor on the membrane:
            Y-shaped antibody for every B-cell icon, a blunt two-chain receptor for every T-cell icon. The NK cell has
            neither receptor.
          </dd>
          <dt>Granules</dt>
          <dd>
            Size and density tell the granulocytes apart: fine and sparse (neutrophil), large and packed around a
            visible two-lobed nucleus (eosinophil), coarse and dark over the nucleus (basophil, the one icon drawn
            granules-over-nucleus). The two killers, NK cell and cytotoxic CD8 T, share a small cluster of killing
            granules.
          </dd>
          <dt>Placeholder</dt>
          <dd>
            Cells with no icon yet are drawn with the generic icon: plain body, small round nucleus, dashed membrane, in
            their family colours.
          </dd>
        </dl>
      </section>

      <section>
        <h2>True relative size</h2>
        <p>
          At {COMPARE_PX_PER_UM} px per µm, next to a red blood cell ({RED_CELL_UM} µm, dashed).
        </p>
        <div className="size-row">
          <figure>
            <RedCell pxPerUm={COMPARE_PX_PER_UM} dashed />
            <figcaption>
              Red blood cell
              <span>{RED_CELL_UM} µm</span>
            </figcaption>
          </figure>
          {ORDERED.map((icon) => (
            <figure key={icon.id}>
              <CellIcon cell={icon.id} pxPerUm={COMPARE_PX_PER_UM} />
              <figcaption>
                {nameOf(icon.id)}
                <span>≈ {icon.diameterUm} µm</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <div className="scale-bar" style={{ width: 10 * COMPARE_PX_PER_UM }}>
          10 µm
        </div>
      </section>

      <section>
        <h2>At scene scale</h2>
        <p>The same icons at the blood scene's {SCENE_PX_PER_UM} px per µm, among red cells. The receptor cue must still read here.</p>
        <div className="scene-row" style={{ background: RED_CELL.tint }}>
          <RedCell pxPerUm={SCENE_PX_PER_UM} />
          {ORDERED.map((icon) => (
            <figure key={icon.id}>
              <CellIcon cell={icon.id} pxPerUm={SCENE_PX_PER_UM} />
              <figcaption>{nameOf(icon.id)}</figcaption>
            </figure>
          ))}
          <RedCell pxPerUm={SCENE_PX_PER_UM} />
        </div>
      </section>

      <section>
        <h2>Icons in detail</h2>
        <div className="detail-row">
          {ORDERED.map((icon) => {
            const family = familyOf(icon.id)
            return (
              <figure key={icon.id} className="detail">
                <CellIcon cell={icon.id} pxPerUm={(200 * BODY_UNITS) / 100 / icon.diameterUm} />
                <figcaption>
                  <strong>{nameOf(icon.id)}</strong>
                  <span className="family-tag">
                    <span className="dot" style={{ background: family.base }} />
                    {family.label}
                  </span>
                  <span>{icon.cue}</span>
                  <code>src/icons/{icon.id}.svg</code>
                  <span className="px-note">Shown here at 200 px; in the blood scene {Math.round(iconPx(icon, SCENE_PX_PER_UM))} px.</span>
                </figcaption>
              </figure>
            )
          })}
        </div>
      </section>

      <section>
        <h2>Placeholder for cells not drawn yet</h2>
        <p>{GENERIC.cue}</p>
        <div className="detail-row">
          {CELL_FAMILIES.map((family) => (
            <figure key={family}>
              <svg viewBox="0 0 100 100" width={96} height={96} role="img" aria-label={`Generic icon, ${FAMILY_COLOURS[family].label}`} style={familyVars(family)}>
                <use href={`#${iconRef(GENERIC.id)}`} />
              </svg>
              <figcaption>{FAMILY_COLOURS[family].label}</figcaption>
            </figure>
          ))}
        </div>
        <p className="members">
          Cells using it now: {cells.filter((cell) => !ICONS.some((icon) => icon.id === cell.id)).map((cell) => cell.name).sort().join(', ')}.{' '}
          <code>src/icons/{GENERIC.id}.svg</code>
        </p>
      </section>
    </main>
  )
}
