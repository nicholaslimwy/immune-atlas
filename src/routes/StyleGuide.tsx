import { useState } from 'react'
import { Link } from 'react-router'
import { familyVars, GENERIC, ICONS, iconPx, iconRef, RED_CELL_ART } from '../art/icons.ts'
import { BODY_UNITS } from '../art/iconSpecs.ts'
import { ANATOMY, FAMILY_COLOURS, INK, RED_CELL } from '../art/palette.ts'
import CellIcon from '../components/CellIcon.tsx'
import { useDocumentTitle } from '../components/useDocumentTitle.ts'
import { getCell, getCells } from '../engine/content.ts'
import { CELL_FAMILIES } from '../types/cell.ts'

/** Scale for the true-size comparison. */
const COMPARE_PX_PER_UM = 12
/** Scale cells are drawn at in the blood scene (800x500). */
const SCENE_PX_PER_UM = 7

const nameOf = (id: string) => getCell(id)?.name ?? id
const familyOf = (id: string) => FAMILY_COLOURS[getCell(id)?.family ?? 'support']
const familyRank = (id: string) => CELL_FAMILIES.indexOf(getCell(id)?.family ?? 'support')

/** Drawn icons grouped by family (style guide order), largest first within a family. */
const ORDERED = [...ICONS].sort((a, b) => familyRank(a.id) - familyRank(b.id) || b.diameterUm - a.diameterUm)

/** The red blood cell icon (background art, not a cell record), the size reference. */
function RedCell({ pxPerUm }: { pxPerUm: number }) {
  const px = iconPx(RED_CELL_ART, pxPerUm)
  return (
    <svg viewBox="0 0 100 100" width={px} height={px} role="img" aria-label="Red blood cell (size reference)">
      <use href={`#${iconRef(RED_CELL_ART.id)}`} />
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
  useDocumentTitle('Style guide')
  const [grey, setGrey] = useState(false)
  const cells = getCells()

  return (
    <main id="main" className={grey ? 'styleguide grey' : 'styleguide'}>
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
          <div className="family">
            <h3>Anatomy (scenes)</h3>
            <div className="swatches">
              <Swatch hex={ANATOMY.stage} role="stage" />
              <Swatch hex={ANATOMY.figure} role="figure" />
              <Swatch hex={ANATOMY.bone} role="bone" />
              <Swatch hex={ANATOMY.lymphTint} role="thymus" />
              <Swatch hex={ANATOMY.lymphBase} role="lymph" />
              <Swatch hex={ANATOMY.spleen} role="spleen" />
              <Swatch hex={ANATOMY.dermis} role="dermis" />
              <Swatch hex={ANATOMY.epidermis} role="epidermis" />
              <Swatch hex={ANATOMY.vesselWall} role="vessel wall" />
              <Swatch hex={ANATOMY.follicle} role="follicle" />
              <Swatch hex={ANATOMY.germinalCentre} role="germinal centre" />
              <Swatch hex={ANATOMY.paracortex} role="T-cell zone" />
              <Swatch hex={ANATOMY.marrow} role="marrow" />
              <Swatch hex={ANATOMY.redPulp} role="red pulp" />
              <Swatch hex={ANATOMY.marginalZone} role="marginal zone" />
            </div>
            <p className="members">Places, kept muted and away from the family hues so they never read as cells. Vessels, heart and marrow use the red-cell base, as do the flattened nuclei of a vessel wall. Inside a lymph node, follicles are the darkest and germinal centres the palest, as on a stained section; sinuses use the lymph tint, the capsule and lymph vessel walls the lymph base. In bone marrow the ground between vessels is the marrow tint, fat cells are the figure white and sinusoid lumens the red-cell tint. In the spleen the red pulp cords are the red pulp rose and their venous sinuses the red-cell tint; the marginal zone is a pale band round the white pulp, which uses the follicle and T-cell zone colours; the capsule is the spleen colour.</p>
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
          <dt>Red cells</dt>
          <dd>
            Background art, not a cell: a disc with a pale centre and no outline, squashed in a scene to show a tilted or
            edge-on cell. They fill the blood scene but never compete with the outlined white cells.
          </dd>
          <dt>Scenes</dt>
          <dd>
            Authored at 800x500. A scene that places cells declares one px per µm and draws every cell at it. Motion is
            gentle (red cells drift with the flow, white cells bob in place) and stops for visitors who ask for reduced
            motion. Every hotspot is a labelled button at least 108 scene units across, so it can be tapped on a phone.
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
          At {COMPARE_PX_PER_UM} px per µm, next to a red blood cell ({RED_CELL_ART.diameterUm} µm).
        </p>
        <div className="size-row">
          <figure>
            <RedCell pxPerUm={COMPARE_PX_PER_UM} />
            <figcaption>
              Red blood cell
              <span>{RED_CELL_ART.diameterUm} µm</span>
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
