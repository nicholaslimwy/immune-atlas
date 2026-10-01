# Immune System Atlas: project context

Read this at the start of every session. Full source plan: `docs/build-plan.md`. Update the "Current status" section at the end of every session.

## Vision and v1 scope

An interactive, zoomable map of the immune system: start at the whole body, click a tissue, click a cell, read what it does and who it talks to. Every screen answers two questions: where am I, and what is interacting here?

**Audience (assumed):** curious adults through early university and medical students. CD markers and key cytokines appear; signalling pathways do not.

**v1 is done when it has:**

- A whole-body view with clickable hotspots
- Six compartments: peripheral blood, lymph node, bone marrow, thymus, spleen, skin
- About 25 cell types (content map lists 27), each with a profile panel and clickable links to the cells it interacts with
- One guided tour: follow an infection from a skin cut to antibody production
- A public URL anyone can visit

**Out of scope for v1:** disease states, detailed molecular signalling, 3D models, quizzes. New ideas go in `BACKLOG.md`, not into v1. Freeze the v1 list.

**v1 cell types (27):**

- Innate myeloid (9): neutrophil, eosinophil, basophil, mast cell, monocyte, macrophage, conventional dendritic cell, plasmacytoid dendritic cell, Langerhans cell
- Innate lymphoid (2 groups): NK cell, innate lymphoid cells (groups 1-3)
- T cells (8): naive CD4 T, Th1, Th2, Th17, Tfh, regulatory T, cytotoxic CD8 T, memory T
- B cells (4): naive B, germinal centre B, plasma cell, memory B
- Support and stromal (4): haematopoietic stem cell, platelet, follicular dendritic cell, thymic epithelial cell

**Scenes (7):** whole body (Phase 1), peripheral blood (Phases 2-3, first fully illustrated), then bone marrow, thymus, lymph node, spleen, skin (Phase 4).

## Architecture

Science and visuals are kept apart: all content lives in data files, one engine turns them into screens. Adding a cell or place means writing a file, not code. Each click sends a new URL through the router, which picks the next view. Zoom is a tree (each place has one parent); cell-to-cell links form a web; the data model keeps both.

Zoom levels:

| Level | URL | Gets the visitor |
| --- | --- | --- |
| Body | `/body` | Hotspots on lymphoid organs, vessels, barrier tissues |
| Compartment | `/body/blood` | Illustrated scene of resident cells; busy scenes (lymph node) get one more zoom (germinal centre) |
| Cell panel | `/body/blood/neutrophil` | Side panel over the scene: summary, markers, functions, where else it lives, interaction links (links jump sideways, breadcrumb follows) |
| Guided tour | `/tours/infection` | Step-by-step story that zooms between levels itself |

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | React + TypeScript, built with Vite |
| Scenes | Inline SVG |
| Transitions | Framer Motion (added in Phase 1) |
| Routing | React Router (added in Phase 1) |
| Content | JSON files in `/content` |
| Network view (Phase 6) | Cytoscape.js or d3-force |
| Hosting | GitHub Pages, Netlify or Vercel (static) |

**Zoom effect:** separate scenes joined by animated transitions. On hotspot click the current scene scales up around it (about 1x to 8x) while fading out; the child scene fades in slightly small and settles to 1x. No tiled deep-zoom, no 3D.

Installed so far (Phase 0): Vite 8, React 19, TypeScript 6, oxlint (`npm run lint`). Do not add other dependencies unless the session asks for them.

## Folder structure

```text
immune-atlas/
  CLAUDE.md              this file
  ATTRIBUTIONS.md        log every borrowed image as it enters the project
  BACKLOG.md             ideas that are NOT in v1
  docs/build-plan.md     the full build plan
  content/
    locations/           one JSON per Location
    cells/               one JSON per Cell
    interactions/        Interaction records
    molecules/           Molecule records
  public/scenes/         SVG scenes referenced by Location.scene
  scripts/               validate.ts + schema.ts (npm run validate)
  src/
    art/                 style tokens (palette.ts), icon specs (iconSpecs.ts), icon loader (icons.ts)
    icons/               one SVG per cell icon, file name = cell id
    components/          UI pieces (panel, breadcrumb, hotspot, icon sprite...)
    engine/              loads content (content.ts is the only reader of /content), resolves routes, runs transitions
    routes/              route-level views (scenes, /styleguide)
    types/               TypeScript types for the four schemas
  index.html, vite.config.ts, tsconfig*.json, package.json
```

Empty folders hold a `.gitkeep` until real files arrive.

## Data model (locked in Phase 2.1; change rarely)

Source of truth: `src/types/{location,cell,interaction,molecule}.ts`. The validator's runtime shapes (`scripts/schema.ts`) are typed against those interfaces, so a field added there without updating the shape fails `tsc`. Run `npm run validate` after every content change.

```typescript
// A place you can zoom into
interface Location {
  id: string;                 // "peripheral-blood"
  name: string;               // "Peripheral blood"
  parent: string | null;      // "body" (drives zoom-out and breadcrumbs); exactly one root has null
  slug?: string;              // URL segment if it differs from the id: "blood"
  scene: string;              // "scenes/peripheral-blood.svg"
  summary: string;
  hotspots: { region: string; target: string }[]; // SVG element id -> child location or cell
  residents: { cell: string; note?: string }[];   // which cells appear here, and what they do here
}

// A cell type, independent of where it is found
interface Cell {
  id: string;                 // "neutrophil"
  name: string;
  cellOntologyId?: string;    // "CL:0000775" (links to the standard Cell Ontology)
  arm: "innate" | "adaptive" | "innate-like" | "stromal";
  lineage: "myeloid" | "lymphoid" | "stromal" | "other";
  family: "innate-myeloid" | "innate-lymphoid" | "t-cell" | "b-cell" | "support"; // colour family (style guide)
  parent?: string;            // "granulocyte" (builds the blood-cell family tree)
  markers: string[];          // ["CD15", "CD16", "CD66b"]
  summary: string;            // 2-3 sentences for the panel, 60 words max
  functions: string[];
  abundance?: string;         // e.g. share of circulating white cells
  sources: string[];          // citations; may be empty only while status is "stub"
  status: "stub" | "draft" | "reviewed"; // reviewed = signed off by the reviewer
  lastReviewed?: string;      // "2026-10-01" (ISO date); required once status is "reviewed"
}

// Who does what to whom
interface Interaction {
  id: string;
  source: string;             // cell id
  target: string;             // cell id or location id
  type: "activates" | "presents-antigen-to" | "helps" | "kills" | "phagocytoses"
      | "recruits" | "suppresses" | "differentiates-into" | "migrates-to";
  via?: string[];             // molecule ids, e.g. ["mhc-ii", "il-12"]
  where?: string[];           // location ids
  description: string;
}

// Cytokines, receptors, antibodies, complement: shown as glossary tooltips
interface Molecule {
  id: string;                 // "il-12"
  name: string;
  kind: "cytokine" | "chemokine" | "receptor" | "antibody" | "complement" | "other";
  summary: string;
}
```

Cell and location ids must not collide (hotspot and interaction targets can be either).

Three rules:

1. **Cells are not owned by places.** A neutrophil appears in blood, bone marrow and inflamed skin. Locations point to cells through `residents`, with an optional note.
2. **Interactions are records of their own.** A cell's panel lists every interaction where it is source or target. One record updates two panels and, later, the network view.
3. **Movement is an interaction.** A dendritic cell carrying antigen to a lymph node is `migrates-to` pointing at a location. Tours and "bigger picture" views are built from these.

## Style guide (locked in Phase 3.1)

One flat, stylised vector style, never deviated from. Live reference: `/styleguide` (palette, rules, the icons at true relative size, at blood-scene scale, enlarged, and a greyscale toggle). Tokens in code: `src/art/palette.ts`; `npm run validate` rejects icon colours that are not tokens.

**From the plan:**

- One SVG symbol per cell type, drawn once and reused in every scene. A neutrophil looks identical in blood, bone marrow and a wound.
- Anchor each icon on the feature a student recognises under a microscope: neutrophil = multi-lobed nucleus; eosinophil = two-lobed nucleus, red-orange granules; basophil = dense dark purple granules hiding the nucleus; monocyte = large, kidney-shaped nucleus; lymphocyte = round nucleus filling almost the whole cell; plasma cell = off-centre nucleus, lots of cytoplasm; dendritic cell = long branching arms; macrophage = large, irregular, often with engulfed debris.
- Keep relative sizes roughly true (monocyte clearly bigger than lymphocyte; red cells fill the blood background).
- Colour by family, used in scenes, panels, network view and legend. Colour never carries meaning alone: pair with a label or shape.
- About 10 hotspots per scene at most; hotspots are focusable, labelled buttons; offer a plain list view of each scene.

**Palette.** A cell's family is its `family` field. Tint fills the cytoplasm, base the nucleus (and legend swatches, panel accents), shade the granules, receptors and chromatin.

| Family (`family`) | Tint | Base | Shade | Cells |
| --- | --- | --- | --- | --- |
| Innate myeloid (`innate-myeloid`) | `#FBD9CC` | `#E4572E` | `#A8341A` | neutrophil, eosinophil, basophil, mast cell, monocyte, macrophage, cDC, pDC, Langerhans cell |
| Innate lymphoid (`innate-lymphoid`) | `#E6D8F0` | `#8E5BB5` | `#5E3580` | NK cell, ILCs |
| T cells (`t-cell`) | `#D3E2F4` | `#2F6DB5` | `#1D4680` | all eight T cells |
| B cells (`b-cell`) | `#D3ECDD` | `#3E9B63` | `#25633D` | naive B, germinal centre B, plasma cell, memory B |
| Support (`support`) | `#E3E5E8` | `#8A8F98` | `#5A5F68` | haematopoietic stem cell, platelet, FDC, thymic epithelial cell |

Ink `#1F2933`: membrane and nucleus outlines, label text. Red blood cells are background art, not a family: tint `#F6D6D6`, base `#D98C8C` (muted so they never compete with myeloid orange; the blood scene background is the red-cell tint).

**Icon geometry.**

- File: `src/icons/<cell id>.svg`, a standalone `<svg viewBox="0 0 100 100">`, plus an entry in `src/art/iconSpecs.ts` (drawn diameter and cue). The validator checks both exist, the viewBox, and the colours.
- Cell body: centred at (50, 50), diameter 80 units. The outer 10 units hold only protrusions (receptors, arms, pseudopods); keep them inside the box (the symbol clips).
- Outlines: membrane and nucleus in ink, `stroke-width="2"` with `vector-effect="non-scaling-stroke"`, so every outline is 2 px on screen whatever size the cell is drawn. Round joins and caps.
- Detail (granules, chromatin, receptors): flat shapes in the family shade (neutrophil granules: base), no outline. Receptor glyphs may be drawn as round-capped strokes in viewBox units, which scale with the cell.
- Flat only: no gradients, filters, shadows or opacity (validator checks).
- Draw order: protrusions, membrane, granules, nucleus, chromatin, so protrusion stems tuck under the membrane.

**Relative size.** The 80-unit body stands for the cell's real diameter (`diameterUm` in `iconSpecs.ts`: typical blood-smear size). Within one scene every cell is drawn at the same px per µm, so `box px = diameterUm x pxPerUm x 100 / 80` (`iconPx` in `src/art/icons.ts`). Blood scene: 7 px per µm (red cell and lymphocyte 7.5 µm = 66 px box, neutrophil 12 µm = 105 px). Other scenes pick their own scale and use it for all their cells.

| Icon | Drawn diameter |
| --- | --- |
| Red blood cell (reference) | 7.5 µm |
| Naive B, naive CD4 T | 7.5 µm |
| Neutrophil | 12 µm |

**Look-alike cells.** B and T cells look the same under a microscope, so every B-cell icon carries Y-shaped B-cell receptors (membrane antibody) and every T-cell icon blunt two-chain T-cell receptors (two parallel short bars), five per cell, evenly spaced, in the family shade. The plasma cell, which has little surface antibody, shows secreted Ys beside it instead. T-cell subsets (Th1, Treg...) keep the same body and receptor and differ by label; a subset badge, if ever needed, is decided in the session that draws them. The shape cue reads at blood-scene scale on desktop; on a phone the stage shrinks and the label carries the distinction.

**Using icons.** `IconSprite` (mounted once in `App.tsx`) turns every icon into `<symbol id="icon-<cell id>">`; anything in the page, including an inlined scene SVG, places one with `<use href="#icon-<cell id>">`. The `icon-` prefix keeps symbol ids apart from scene element ids. In React use `<CellIcon cell="..." pxPerUm={...} />`.

## Naming rules

- All ids are lowercase-with-hyphens: `peripheral-blood`, `il-12`, `th1`, `germinal-centre-b`.
- Content file name equals its id: `content/cells/neutrophil.json` has `"id": "neutrophil"`.
- Interaction ids: `<source>-<type>-<target>`, e.g. `dendritic-cell-presents-antigen-to-naive-cd4-t` (proposed convention, not from the plan).
- Every id referenced in a hotspot, resident, interaction `source`/`target`/`via`/`where` must exist, and every `hotspots[].region` must be an element id in the scene SVG (`npm run validate` checks this).
- Scene SVG element ids used by `hotspots[].region` are the same lowercase-with-hyphens style.
- UK spelling in content (haematopoietic, centre, granulocyte).
- All wording lives in `/content` JSON from Phase 2 on; never hard-code science text in components.
- Every Cell and fact carries a citation in `sources`; label anything that differs between mice and humans; show "last reviewed" on each cell panel.
- Species labels on markers use two forms only: "(human only)" / "(mouse only)" when the other species' cell lacks the molecule; "(human marker)" / "(mouse marker)" when it is the marker used to identify the cell in that species, though the other may carry it.
- Debated science: each debated point is its own `functions` item starting "Debated:" (split mixed items). Interaction descriptions say "is debated" inside the sentence.

## Roadmap and gates

Do not start a phase until the previous gate passes. One session, one clickable deliverable.

| Phase | Work | Gate |
| --- | --- | --- |
| 0 Decisions | Context file, scaffold Vite/React/TS | Blank site runs locally |
| 1 Skeleton | Routing and scene switching with coloured rectangles; zoom transition, Back, breadcrumbs; empty side panel | Click through body to blood and back with working URLs |
| 2 Data model | Schemas as TS types; blood cell files (3-4 per session); interactions and molecules; validator; clickable panel links | Panel links work from data; validator passes |
| 3 First art | Style guide plus 3 trial icons; remaining icons; body scene with hotspots; blood scene with gentle motion | Body and blood scenes illustrated and consistent |
| 4 Five places | Scene art, hotspots, new cells and interactions, reviewer fixes for the other five compartments | Every compartment reachable and reviewed |
| 5 Guided tour | Tour engine, infection story, phone test | Tour plays end to end on a phone |
| 6 Tools | Search, glossary tooltips, network view, innate/adaptive filter | Each tool works |
| 7 Launch | Accessibility audit, performance pass, deploy, attributions page | Public URL live |

Phases 1 and 2 use plain placeholder shapes on purpose.

## Working agreements

- Session prompt shape: phase and session, goal, constraints, "done when", then finish by updating the status section below.
- Keep schemas unchanged unless the session explicitly changes them.
- Art: attach the style guide and two finished icons every art session; log every borrowed image in `ATTRIBUTIONS.md` (Servier Medical Art is CC BY 4.0; NIH BIOART varies per image).
- Accuracy: sources are *Janeway's Immunobiology*, Abbas *Cellular and Molecular Immunology*, Cell Ontology, Human Protein Atlas, recent PubMed reviews. A reviewer with immunology training signs off each compartment.
- Performance: load scenes only when needed; shrink SVGs with SVGO.

## Decisions log

| Date | Decision |
| --- | --- |
| 2026-09-30 | Plan written: 8 phases, v1 = 7 scenes, 27 cell types, one tour |
| 2026-10-01 | Context file named `CLAUDE.md` (not `PROJECT_CONTEXT.md`) so Claude Code reads it automatically |
| 2026-10-01 | Audience assumed: curious adults through early university and medical students |
| 2026-10-01 | Separate scenes with zoom transitions (not deep-zoom, not 3D) |
| 2026-10-01 | Project lives at `C:\Users\limn\immune-atlas`; plan moved to `docs/build-plan.md` |
| 2026-10-01 | Provisional style tokens (viewBox, stroke, hex colours) proposed; lock in Phase 3 |
| 2026-10-01 | Framer Motion and React Router deferred to Phase 1 to keep the Phase 0 scaffold bare |
| 2026-10-01 | React Router added (Phase 1.1); one `/body/*` route resolves paths against the Location tree; scenes fetched and inlined at runtime |
| 2026-10-01 | Framer Motion added (Phase 1.2); zoom direction and origin derived from the two scenes, not from click state, so browser back/forward animate like in-app navigation; Back button goes up one level |
| 2026-10-01 | Data model locked (Phase 2.1). Cell gains `status` and `lastReviewed`; Location gains optional `slug` (replaces the `SLUGS` table in code); root found as the location with `parent: null` |
| 2026-10-01 | Validator is a plain Node script (Node 24 runs `.ts` directly), no schema library; warnings (e.g. interaction id convention) do not fail it |
| 2026-10-01 | Cell panel (Phase 2.2): a cell id may be the last URL segment under any location (`/body/blood/macrophage`); the panel opens over that scene without a zoom, and interaction links jump sideways while staying in the current scene. Back from a panel closes it |
| 2026-10-01 | Interaction wording seen from each end (Recruits / Recruited by, Engulfs / Engulfed by...) lives in `src/engine/interactions.ts`; it is UI phrasing of the type enum, not science text |
| 2026-10-01 | Stub cells (`status: "stub"`, empty markers/functions/sources, placeholder summary) exist so interaction targets resolve; their panels and link tags show "full profile coming soon" |
| 2026-10-01 | Validator: draft and reviewed cell summaries are at most 60 words |
| 2026-10-01 | Debated science is flagged in the text itself ("Debated:" at the start of a function or interaction sentence); species differences are flagged inline ("(human only)", "(mouse only)", "shown mainly in mice"). No schema field for either |
| 2026-10-01 | Debated-flag style unified (Phase 2.5): every debated point is its own function item starting "Debated:"; interaction descriptions keep in-sentence wording. Marker species labels reduced to "(human/mouse only)" and "(human/mouse marker)" |
| 2026-10-01 | Interaction records go in only when they touch a draft cell, so their citations have a draft cell's `sources` to sit in; stub-to-stub records wait for Phase 4 |
| 2026-10-01 | Cell gains a required `family` field (`innate-myeloid`, `innate-lymphoid`, `t-cell`, `b-cell`, `support`) that sets its colour (Phase 3.1); `arm` and `lineage` stay as they were |
| 2026-10-01 | Style tokens locked (Phase 3.1): the five Phase 0 base colours plus a tint and a shade per family; red cells get their own muted pair |
| 2026-10-01 | Outlines use `vector-effect="non-scaling-stroke"` (2 px on screen at any size) instead of 2 viewBox units, because true relative sizes make icons render from ~20 px to 150+ px |
| 2026-10-01 | Icon geometry: 100-unit box, 80-unit body = the cell's real diameter, one px-per-µm scale per scene (blood: 7) |
| 2026-10-01 | B vs T cue: Y-shaped receptors on every B-cell icon, blunt two-chain receptors on every T-cell icon |
| 2026-10-01 | Icons are one SVG file per cell in `src/icons`, bundled into a sprite of `<symbol id="icon-<cell id>">`; the validator checks file name, spec, viewBox, palette and flat style |

## Current status and next task

**Status:** Phase 3, session 1 complete (2026-10-01): style guide and three trial icons. Cell has a new required `family` field (all 24 cell files set; `scripts/schema.ts` checks it), which settles the colour-by-family rule. The style guide in this file is now locked (see "Style guide"): palette with tint/base/shade per family in `src/art/palette.ts`, 100-unit icon box with an 80-unit body standing for the real diameter, non-scaling 2 px ink outlines, flat fills only, one px-per-µm per scene (blood: 7), receptor cue for B vs T. Icons drawn: `src/icons/neutrophil.svg` (four lobes in a chain joined by thin necks, fine sparse granules), `naive-b.svg` (round nucleus filling most of the cell, five Y-shaped receptors), `naive-cd4-t.svg` (same body, five blunt two-chain receptors); sizes and cues in `src/art/iconSpecs.ts`. `IconSprite` (mounted in `App.tsx`) exposes them as `<symbol id="icon-<cell id>">`, `CellIcon` draws one at a given px per µm, and `getCells()` was added to `content.ts`. `/styleguide` (`src/routes/StyleGuide.tsx`) shows the palette with each family's cells (from content), the rules, the icons side by side at 12 px/µm next to a dashed red-cell reference and a 10 µm bar, the icons at blood-scene scale among red cells, the icons enlarged with their cue, and a greyscale toggle. Validator now also checks icons (file name is a cell id, spec exists, viewBox, palette-only colours, no gradients/filters/opacity); a scratch copy with an off-palette hex, an opacity attribute and a stray icon each failed as expected. **Self-critique in the Browser pane, and what changed:** (1) first draft's receptors were too small at scene scale for B and T to be told apart, so there are now five bolder, longer receptors and the blood scale went from 6 to 7 px/µm; (2) the first neutrophil had four round, separate lobes that read as four nuclei, so the lobes now sit closer in a chain with visible necks; (3) its granules clustered on one side and were spread out; (4) white hex labels on the orange and grey swatches had poor contrast, so labels moved below the colour blocks. Still weak, for the next art session to judge: the neutrophil necks look a little mechanical (ball-and-stick); its granules use the base orange, so the eosinophil must have clearly bigger, denser granules to stay distinct; at phone width the receptor cue is only a few pixels and the label does the work; the red-cell disc on the page is a stand-in, not yet a drawn icon. Verified: greyscale keeps B and T distinct by shape; no horizontal scroll at 375 px; `/body` to blood to `/body/blood/naive-b` still works with the sprite mounted; no new console errors. `validate` (2 locations, 24 cells, 52 interactions, 29 molecules, 3 icons, 0 warnings), `build` and `lint` pass.

**Phase 2, session 5:** complete (2026-10-01): interaction web for the nine blood cells. Reviewed all 41 interaction records and added 11, each touching at least one draft blood cell so its citation has a draft cell to sit in (52 in total): conventional dendritic cell activates NK cell (IL-15, IL-12); plasma cell activates NK cell (IgG, ADCC); regulatory T suppresses cytotoxic CD8 T (CTLA-4); haematopoietic stem cell `differentiates-into` NK cell (IL-15), naive B (IL-7; flagged essential in mice but not humans), naive CD4 T and cytotoxic CD8 T (IL-7, via the thymus); monocyte recruits neutrophil (patrolling monocytes, mice, `where: ["peripheral-blood"]`); macrophage phagocytoses platelet; basophil helps naive B (IL-4, CD40L; IgE switching, human cells in culture); macrophage presents antigen to naive B (subcapsular sinus, intact antigen, mainly mice). One fix: `naive-cd4-t-differentiates-into-th1` now lists IFN-γ in `via`, as its description already said. Three new molecules (IL-15, IL-7, IgG); every `via` id resolves. Ten citations for the new records were added to the `sources` of the draft cells they touch (NK, naive B, naive CD4 T, cytotoxic CD8 T, neutrophil, platelet, basophil). Records between two stubs (Th1 activates macrophage, Tfh helps germinal centre B, germinal centre B to plasma and memory B, FDC holds antigen for germinal centre B, memory B to plasma cell, plasma cell IgE arms mast cell, Th2 activates macrophage) are deferred to Phase 4, when those cells get profiles and sources. `where` could only be filled for the blood record; the rest wait for their locations (see open points). Cell files were then reviewed for errors, inconsistent terms and uncited claims (`docs/cell-review-2026-10-01.md`, with the user's decision on each item). Applied: CD203c relabelled as a basophil marker; KLRG1 redefined as a marker of cells that have divided many times (cited to Voehringer 2002); platelet "can only be studied" softened; eosinophil fat-tissue role removed; basophil worm expulsion cited to Janeway; "white blood cells" throughout; "monocyte-derived dendritic cell" replaces "dendritic-like cell"; marker species labels and debated flags unified (two new naming rules). Kept as they were: the CD8 T summary's "almost every cell in the body" and the naive B "one unique antibody". Verified in the browser: every blood panel lists its new partners with via molecules and stub tags; the sideways link naive B to basophil works and the breadcrumb follows; no console errors. `validate` (2 locations, 24 cells, 52 interactions, 29 molecules, 0 warnings), `build` and `lint` pass. Phase 2 gate passes.

**Phase 2, session 3 (lymphocytes):** complete (2026-10-01), done as two parallel sessions. **Lymphocytes:** NK cell, naive B, naive CD4 T and cytotoxic CD8 T are full draft profiles matching the neutrophil (Cell Ontology ids CL:0000623, CL:0000788, CL:0000895, CL:0000794; summaries of 56-59 words; six functions; abundance with human vs mouse figures; 11-13 citations each; `status: "draft"`, not reviewed). Debated points are flagged inside the sentence ("still debated", "is debated"): NK cells vs ILC1s and NK "memory"; human B-1 cells; whether memory T cells pass through an effector stage; how fixed helper fates are; the first source of IL-4 for Th2; TGF-β's role in human Th17. Species differences are flagged inline: CD56 (human NK only), KIR vs Ly49, NK1.1 and DX5; CD27 as a memory B marker (human only), B220, mouse blood richer in B cells; CD45RA vs CD44 for naive T cells; naive T cells kept up by the thymus in mice but by peripheral division in adult humans; lab mice have few memory T cells; CD8α on a mouse-only dendritic cell subset; MHC class II on activated human but not mouse T cells; IL-12 driving human Tfh; induced regulatory T cells hard to identify in humans; mouse-only evidence for NK help to Th1 and early germinal-centre-independent memory B cells. 22 new interactions (41 in total), 13 new molecules (IFN-γ, IL-12, IL-18, type I interferons, IL-2, IL-6, IL-21, TGF-β, CXCL13, MHC class I, MHC class II, CD40L, CTLA-4) and 9 new stubs (conventional and plasmacytoid dendritic cell, follicular dendritic cell, Th1, Tfh, regulatory T, memory T, germinal centre B, memory B); the existing Th2, plasma cell and IL-4 were reused. Blood scene has four more placeholder hotspots in family colours with near-round corners (NK purple, T cells blue, B green, white labels), each a resident too. Verified in the browser: all nine blood hotspots are labelled buttons; each new one opens its panel at `/body/blood/<cell>` with the expected links (stub partners tagged); the sideways link naive CD4 T to NK cell works and the breadcrumb follows; no console errors. `validate` (2 locations, 24 cells, 41 interactions, 26 molecules, 0 warnings), `build` and `lint` pass. The 13 lymphocyte cell files went into the other session's commit `dba8b03` (marked WIP); everything else is in the following commit.

**Phase 2, session 3 (myeloid and platelet):** complete (2026-10-01). Eosinophil, basophil, monocyte and platelet are full draft profiles matching the neutrophil (Cell Ontology id, markers with human-only/mouse-only labels, summary of 60 words or fewer, six or seven functions, abundance, 10-12 citations each; `status: "draft"`, not reviewed). Debated points are written into the function text starting "Debated:" (eosinophil protection against worms; basophils as antigen-presenting cells; platelet-neutrophil clumps in sepsis; monocyte origin of tissue macrophages, framed as "Revised view"); human vs mouse differences are flagged inline (Siglec-8/Siglec-F, mouse eosinophils degranulate less, CD203c/CD49b, Ly6C and the missing mouse intermediate monocyte, human-only platelet FcγRIIA, mouse lung megakaryocytes, mouse platelet counts and lifespan). Twelve new interactions (19 in total): haematopoietic stem cell `differentiates-into` each of the four (via IL-5, IL-3, M-CSF, thrombopoietin), Th2 activates eosinophil (IL-5), mast cell recruits eosinophil and basophil (PGD2), plasma cell activates basophil (IgE), basophil helps Th2 (IL-4, flagged debated), monocyte differentiates into macrophage (M-CSF), macrophage recruits monocyte (CCL2), platelet activates monocyte (P-selectin, in blood). Eight new molecules (IL-5, IL-3, IL-4, IgE, prostaglandin D2, M-CSF, CCL2, thrombopoietin). New stubs: Th2, plasma cell. Blood scene has placeholder rectangles for all five cells (myeloid orange, platelet grey and smaller, monocyte largest), each a hotspot and resident. Verified in the browser: each of the five hotspots opens its panel at `/body/blood/<cell>` with real content and the expected interaction links (stub partners tagged); no console errors. `validate` (2 locations, 11 cells, 19 interactions, 13 molecules, 0 warnings), `build` and `lint` pass.

**Phase 2, session 2:** complete (2026-10-01). The cell panel renders entirely from JSON. `content/cells/neutrophil.json` is a full draft profile (Cell Ontology id, human markers plus the mouse-only Ly6G, 57-word summary, six functions, human vs mouse abundance, ten citations; `status: "draft"`, not yet reviewed). Seven interaction records connect it to six stub cells (macrophage, monocyte, mast cell, Th17, haematopoietic stem cell, platelet) through five molecules (CXCL8, TNF, IL-17, G-CSF, P-selectin; the CXCL8 entry notes that mice lack it). The stand-in `content/locations/neutrophil.json` and `public/scenes/neutrophil.svg` are deleted; blood now lists neutrophil, monocyte and platelet as residents. `resolvePath` in `src/engine/paths.ts` returns `{ location, cell? }`: a cell id is allowed only as the last segment, under any location (`cellPathFor` builds those URLs). `src/components/CellPanel.tsx` shows name, arm and lineage, summary, markers, functions, abundance, an "Interacts with" list from `interactionLinksOf` (`src/engine/interactions.ts`: the other end, phrased from this cell's side, with "via" molecule names and "where" location names), sources (collapsed), Cell Ontology link and "Last reviewed" (or "not yet reviewed (draft)"). Stub cells show "Full profile coming soon." in their panel and a "full profile coming soon" tag wherever they are linked. Scene hotspots can now target a cell (opens the panel, no zoom). Breadcrumbs end with the cell; Back and Escape close the panel; focus moves to the panel title when a cell opens and to the scene title when it closes, but not on a direct page load (the old "skip the first render" guard failed under StrictMode's double effect and scrolled the page). Panel sits beside the 800px stage and stacks below it under 1000px. Validator now caps draft/reviewed summaries at 60 words. Verified in the browser: `/body/blood/neutrophil` loads directly with real content; hotspot, sideways links to stubs and back, Escape, Back, browser back; unknown cells and a cell in the middle of a path show Not found; no horizontal scroll at 375px; no console errors. A scratch copy with a 70-word summary and a missing stub fails validation as expected. `validate`, `build` and `lint` pass.

**Phase 2, session 1:** complete (2026-10-01). Data model locked as TypeScript types in `src/types/` (Location, Cell, Interaction, Molecule; Cell has `status` and `lastReviewed`, Location has optional `slug`). `src/engine/content.ts` is the single loader for all four content folders (`getLocation`, `getRoot`, `getChildren`, `getCell`, `getMolecule`, `getInteractionsOf`); components and engine code go through it. The hard-coded `SLUGS` table and the hard-coded root id in `paths.ts` are gone: `peripheral-blood.json` now carries `"slug": "blood"` and the root is the location with `parent: null`. `npm run validate` (`scripts/validate.ts`, shapes in `scripts/schema.ts`) checks each file against its schema (required/optional fields, enums, id format, ISO dates, Cell Ontology id format, unknown fields), file name equals id, unique ids, no cell/location id clash, one root and no parent loops, unique URL segments among siblings, scene file exists, hotspot regions exist in the SVG, and every hotspot/resident/interaction reference resolves (`migrates-to` must target a location, other types a cell). Draft/reviewed cells need sources; reviewed cells need `lastReviewed`. Verified: a deliberately broken copy of the content triggered every check; adding a field to a type without updating its shape fails `tsc`; the site clicks through body, blood, neutrophil and back (hotspot, Back, breadcrumb, browser back, direct URLs) exactly as before. `validate`, `build` and `lint` pass. Cells, interactions and molecules folders are still empty.

**Phase 1, session 2:** complete (2026-10-01). Framer Motion added. Moving between scenes is now a continuous zoom: the outer scene scales about 1x to 8x around the clicked hotspot while fading out, and the inner scene fades in from 0.85x to 1x. Zooming out plays the same thing in reverse (outer scene arrives at 8x and settles). The direction and zoom point are derived only from the scene left and the scene arrived at (`computeNav` in `src/engine/zoom.ts`), so hotspot clicks, breadcrumbs, the Back button and the browser's back/forward all animate identically, including multi-level jumps (neutrophil to body). `src/components/ZoomStage.tsx` preloads the next scene's SVG before swapping (`src/engine/sceneCache.ts` caches scenes and measures each hotspot's centre by rendering the SVG off-screen), then runs the `AnimatePresence` transition; scenes one click away are prefetched. `Scene.tsx` now receives its SVG as a prop instead of fetching. Back button goes up one level (pushes history; disabled at the body); breadcrumbs (`Breadcrumbs.tsx`) show the Location chain and each earlier crumb is a link. Focus moves to the scene title after a zoom. `prefers-reduced-motion` gets a plain cross-fade. Verified in the browser: body to blood to neutrophil and back via hotspot, Back button, breadcrumb and browser back/forward, with the hotspot temporarily moved off-centre to confirm the zoom origin (restored). `npm run build` and `npm run lint` pass. Nothing committed yet beyond Phase 0.

**Session 1:** complete (2026-10-01). React Router added. `/` redirects to `/body`; a single `/body/*` route resolves the path against the Location tree (`src/engine/paths.ts`), so `/body`, `/body/blood` and `/body/blood/neutrophil` all load directly. Scenes are placeholder SVGs in `public/scenes/`, described by `content/locations/{body,peripheral-blood,neutrophil}.json` (Location schema, unchanged). `src/engine/content.ts` loads the JSON with `import.meta.glob`; `src/components/Scene.tsx` fetches the SVG, inlines it, and turns each `hotspots[].region` element into a focusable, labelled button (click, Enter or Space navigates). Unknown URLs show a Not found page. Verified in the browser: vessel on `/body` leads to `/body/blood`, which leads to `/body/blood/neutrophil`; direct URL loads work; no console errors. `npm run build` and `npm run lint` pass. Nothing committed yet beyond Phase 0.

**Open points:**

- Janeway and Abbas chapter numbers in the session 3 profiles (eosinophil, basophil, monocyte, platelet, NK cell, naive B, naive CD4 T, cytotoxic CD8 T) were not checked against the books; the reviewer should confirm them. Journal citations were written from memory too and want a quick PubMed check.
- Basophil "helps expel some parasitic worms" is now cited to Janeway with no species label, on the user's word that Janeway covers humans; the book was not opened, so the reviewer should confirm the chapter and that the human evidence is there (the direct experiments are in mice, e.g. Ohnmacht et al., Immunity 2010).
- Monocyte profile says "monocyte-derived dendritic cell" in full. Avoid the abbreviation "mDC", which usually means myeloid (conventional) dendritic cell in human blood; "moDC" is the usual short form.
- NK cells and cytotoxic CD8 T cells kill infected and cancer cells, but no cell id stands for "an infected cell", so there are no `kills` records yet; killing lives in `functions`. Decide whether to add a non-immune target cell or leave it there.
- `cytotoxic-cd8-t` also covers the naive CD8 stage (the v1 list has no naive CD8 T cell), and `memory-t` is one cell for CD4 and CD8 memory.
- `plasmacytoid-dendritic-cell` has `lineage: "myeloid"` and `family: "innate-myeloid"` to match the content map's grouping, but mouse studies suggest many come from lymphoid progenitors. The reviewer may want to revisit.
- `th1-helps-cytotoxic-cd8-t` simplifies: much CD4 help reaches CD8 T cells indirectly, by licensing the dendritic cell (the description says so).
- Not yet recorded because the locations do not exist: naive lymphocytes and dendritic cells `migrates-to` lymph node; `where: ["lymph-node"]` on the antigen-presentation, Tfh help and differentiation records, and on the session 5 records cDC activates NK cell and macrophage presents antigen to naive B; `where: ["bone-marrow"]` on haematopoietic stem cell to NK cell and naive B, `["bone-marrow", "thymus"]` on haematopoietic stem cell to naive CD4 T and cytotoxic CD8 T; `where: ["spleen"]` on macrophage phagocytoses platelet (the liver is not a v1 location).
- `plasma-cell-activates-basophil` uses `activates` for "makes the IgE that arms basophils"; the type enum has no closer verb. Same will apply to mast cells.
- Not yet recorded because the locations do not exist: monocyte `migrates-to` inflamed tissue, eosinophil `migrates-to` the gut, and `where: ["bone-marrow"]` on the four new `differentiates-into` records.
- Interactions have no `sources` field, so their citations sit in the `sources` of the draft cell(s) each record touches for now. Decide in a schema session whether Interaction gets its own `sources` (one record feeds two panels, so the citation belongs on the record).
- `arm: "stromal"` is used for the support group (haematopoietic stem cell with `lineage: "other"`, platelet with `lineage: "myeloid"`), though neither is stromal. Colour no longer depends on it (`family: "support"` does that), so `arm` could now be corrected in a schema session.
- Neutrophil `parent: "granulocyte"` is left out: no granulocyte cell exists and the validator does not check `parent`. Decide whether family-tree parents are real cells.
- Not yet recorded because the locations do not exist: neutrophil `migrates-to` inflamed skin, and `where: ["bone-marrow"]` on haematopoietic stem cell `differentiates-into` neutrophil. Add in Phase 4.
- Molecule names in the panel are plain text; glossary tooltips are Phase 6.
- The neutrophil profile needs the immunology reviewer's sign-off before `status: "reviewed"`.
- The dev server already running on port 5173 (started outside the preview tool) once cached a half-written module and served it empty; touching the file fixed it. If the page goes blank with "does not provide an export named", touch the file or restart the server.
- Hosting must rewrite unknown paths to `index.html` (SPA fallback) or direct URLs will 404 in production.
- Hotspot hover/focus styling is a stroke only; real hotspot visuals and a plain list view come with the art phase.

**Notes:**

- Scenes must be authored at 800x500 (the stage has that fixed aspect ratio, so hotspot centres map to percentages of the stage). A scene with another viewBox will aim the zoom slightly wrong.
- The URL changes immediately on a click but the old scene stays on screen until the new SVG has loaded (instant locally; a slow network would show a short pause).
- The Browser preview pane throttles animation frames when hidden, so check motion with the pane in front (a hidden pane leaves fades frozen part-way and screenshots look washed out). This machine has reduced motion switched on at OS level, so you will see the cross-fade here unless you turn that off.

**Next task:** Phase 3, session 2: draw the remaining blood-cell icons (eosinophil, basophil, monocyte, platelet, NK cell, cytotoxic CD8 T) and a red blood cell (not a cell record, so it needs a home outside `src/icons` or a wider validator rule), matching the style guide and the two attached trial icons (naive B and neutrophil are the references). Then the body scene with hotspots and the illustrated blood scene. Send the nine draft profiles to the immunology reviewer in parallel.
