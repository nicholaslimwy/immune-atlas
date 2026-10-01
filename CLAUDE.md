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
    components/          UI pieces (panel, breadcrumb, hotspot...)
    engine/              loads content (content.ts is the only reader of /content), resolves routes, runs transitions
    routes/              route-level views
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

## Style guide

Pick one flat, stylised vector style and never deviate. Rules from the plan:

- One SVG symbol per cell type, drawn once and reused in every scene. A neutrophil looks identical in blood, bone marrow and a wound.
- Anchor each icon on the feature a student recognises under a microscope: neutrophil = multi-lobed nucleus; eosinophil = two-lobed nucleus, red-orange granules; basophil = dense dark purple granules hiding the nucleus; monocyte = large, kidney-shaped nucleus; lymphocyte = round nucleus filling almost the whole cell; plasma cell = off-centre nucleus, lots of cytoplasm; dendritic cell = long branching arms; macrophage = large, irregular, often with engulfed debris.
- Keep relative sizes roughly true (monocyte clearly bigger than lymphocyte; red cells fill the blood background).
- Colour by family: warm reds/oranges = innate myeloid; purple = innate lymphoid; blue = T cells; green = B cells; grey = support cells. Used in scenes, panels, network view and legend. Colour never carries meaning alone: pair with a label or shape.
- About 10 hotspots per scene at most; hotspots are focusable, labelled buttons; offer a plain list view of each scene.

**Provisional values (not in the plan; proposed in Phase 0, to be locked in Phase 3 after trial icons):**

| Token | Value |
| --- | --- |
| Icon viewBox | `0 0 100 100` |
| Stroke width | 2 (in viewBox units), round joins and caps |
| Innate myeloid | `#E4572E` (orange-red) |
| Innate lymphoid | `#8E5BB5` (purple) |
| T cell | `#2F6DB5` (blue) |
| B cell | `#3E9B63` (green) |
| Support / stromal | `#8A8F98` (grey) |
| Outline | `#1F2933` |

## Naming rules

- All ids are lowercase-with-hyphens: `peripheral-blood`, `il-12`, `th1`, `germinal-centre-b`.
- Content file name equals its id: `content/cells/neutrophil.json` has `"id": "neutrophil"`.
- Interaction ids: `<source>-<type>-<target>`, e.g. `dendritic-cell-presents-antigen-to-naive-cd4-t` (proposed convention, not from the plan).
- Every id referenced in a hotspot, resident, interaction `source`/`target`/`via`/`where` must exist, and every `hotspots[].region` must be an element id in the scene SVG (`npm run validate` checks this).
- Scene SVG element ids used by `hotspots[].region` are the same lowercase-with-hyphens style.
- UK spelling in content (haematopoietic, centre, granulocyte).
- All wording lives in `/content` JSON from Phase 2 on; never hard-code science text in components.
- Every Cell and fact carries a citation in `sources`; label anything that differs between mice and humans; show "last reviewed" on each cell panel.

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

## Current status and next task

**Status:** Phase 2, session 3 complete (2026-10-01). Eosinophil, basophil, monocyte and platelet are full draft profiles matching the neutrophil (Cell Ontology id, markers with human-only/mouse-only labels, summary of 60 words or fewer, six or seven functions, abundance, 10-12 citations each; `status: "draft"`, not reviewed). Debated points are written into the function text starting "Debated:" (eosinophil protection against worms; basophils as antigen-presenting cells; platelet-neutrophil clumps in sepsis; monocyte origin of tissue macrophages, framed as "Revised view"); human vs mouse differences are flagged inline (Siglec-8/Siglec-F, mouse eosinophils degranulate less, CD203c/CD49b, Ly6C and the missing mouse intermediate monocyte, human-only platelet FcγRIIA, mouse lung megakaryocytes, mouse platelet counts and lifespan). Twelve new interactions (19 in total): haematopoietic stem cell `differentiates-into` each of the four (via IL-5, IL-3, M-CSF, thrombopoietin), Th2 activates eosinophil (IL-5), mast cell recruits eosinophil and basophil (PGD2), plasma cell activates basophil (IgE), basophil helps Th2 (IL-4, flagged debated), monocyte differentiates into macrophage (M-CSF), macrophage recruits monocyte (CCL2), platelet activates monocyte (P-selectin, in blood). Eight new molecules (IL-5, IL-3, IL-4, IgE, prostaglandin D2, M-CSF, CCL2, thrombopoietin). New stubs: Th2, plasma cell. Blood scene has placeholder rectangles for all five cells (myeloid orange, platelet grey and smaller, monocyte largest), each a hotspot and resident. Verified in the browser: each of the five hotspots opens its panel at `/body/blood/<cell>` with real content and the expected interaction links (stub partners tagged); no console errors. `validate` (2 locations, 11 cells, 19 interactions, 13 molecules, 0 warnings), `build` and `lint` pass.

**Phase 2, session 2:** complete (2026-10-01). The cell panel renders entirely from JSON. `content/cells/neutrophil.json` is a full draft profile (Cell Ontology id, human markers plus the mouse-only Ly6G, 57-word summary, six functions, human vs mouse abundance, ten citations; `status: "draft"`, not yet reviewed). Seven interaction records connect it to six stub cells (macrophage, monocyte, mast cell, Th17, haematopoietic stem cell, platelet) through five molecules (CXCL8, TNF, IL-17, G-CSF, P-selectin; the CXCL8 entry notes that mice lack it). The stand-in `content/locations/neutrophil.json` and `public/scenes/neutrophil.svg` are deleted; blood now lists neutrophil, monocyte and platelet as residents. `resolvePath` in `src/engine/paths.ts` returns `{ location, cell? }`: a cell id is allowed only as the last segment, under any location (`cellPathFor` builds those URLs). `src/components/CellPanel.tsx` shows name, arm and lineage, summary, markers, functions, abundance, an "Interacts with" list from `interactionLinksOf` (`src/engine/interactions.ts`: the other end, phrased from this cell's side, with "via" molecule names and "where" location names), sources (collapsed), Cell Ontology link and "Last reviewed" (or "not yet reviewed (draft)"). Stub cells show "Full profile coming soon." in their panel and a "full profile coming soon" tag wherever they are linked. Scene hotspots can now target a cell (opens the panel, no zoom). Breadcrumbs end with the cell; Back and Escape close the panel; focus moves to the panel title when a cell opens and to the scene title when it closes, but not on a direct page load (the old "skip the first render" guard failed under StrictMode's double effect and scrolled the page). Panel sits beside the 800px stage and stacks below it under 1000px. Validator now caps draft/reviewed summaries at 60 words. Verified in the browser: `/body/blood/neutrophil` loads directly with real content; hotspot, sideways links to stubs and back, Escape, Back, browser back; unknown cells and a cell in the middle of a path show Not found; no horizontal scroll at 375px; no console errors. A scratch copy with a 70-word summary and a missing stub fails validation as expected. `validate`, `build` and `lint` pass.

**Phase 2, session 1:** complete (2026-10-01). Data model locked as TypeScript types in `src/types/` (Location, Cell, Interaction, Molecule; Cell has `status` and `lastReviewed`, Location has optional `slug`). `src/engine/content.ts` is the single loader for all four content folders (`getLocation`, `getRoot`, `getChildren`, `getCell`, `getMolecule`, `getInteractionsOf`); components and engine code go through it. The hard-coded `SLUGS` table and the hard-coded root id in `paths.ts` are gone: `peripheral-blood.json` now carries `"slug": "blood"` and the root is the location with `parent: null`. `npm run validate` (`scripts/validate.ts`, shapes in `scripts/schema.ts`) checks each file against its schema (required/optional fields, enums, id format, ISO dates, Cell Ontology id format, unknown fields), file name equals id, unique ids, no cell/location id clash, one root and no parent loops, unique URL segments among siblings, scene file exists, hotspot regions exist in the SVG, and every hotspot/resident/interaction reference resolves (`migrates-to` must target a location, other types a cell). Draft/reviewed cells need sources; reviewed cells need `lastReviewed`. Verified: a deliberately broken copy of the content triggered every check; adding a field to a type without updating its shape fails `tsc`; the site clicks through body, blood, neutrophil and back (hotspot, Back, breadcrumb, browser back, direct URLs) exactly as before. `validate`, `build` and `lint` pass. Cells, interactions and molecules folders are still empty.

**Phase 1, session 2:** complete (2026-10-01). Framer Motion added. Moving between scenes is now a continuous zoom: the outer scene scales about 1x to 8x around the clicked hotspot while fading out, and the inner scene fades in from 0.85x to 1x. Zooming out plays the same thing in reverse (outer scene arrives at 8x and settles). The direction and zoom point are derived only from the scene left and the scene arrived at (`computeNav` in `src/engine/zoom.ts`), so hotspot clicks, breadcrumbs, the Back button and the browser's back/forward all animate identically, including multi-level jumps (neutrophil to body). `src/components/ZoomStage.tsx` preloads the next scene's SVG before swapping (`src/engine/sceneCache.ts` caches scenes and measures each hotspot's centre by rendering the SVG off-screen), then runs the `AnimatePresence` transition; scenes one click away are prefetched. `Scene.tsx` now receives its SVG as a prop instead of fetching. Back button goes up one level (pushes history; disabled at the body); breadcrumbs (`Breadcrumbs.tsx`) show the Location chain and each earlier crumb is a link. Focus moves to the scene title after a zoom. `prefers-reduced-motion` gets a plain cross-fade. Verified in the browser: body to blood to neutrophil and back via hotspot, Back button, breadcrumb and browser back/forward, with the hotspot temporarily moved off-centre to confirm the zoom origin (restored). `npm run build` and `npm run lint` pass. Nothing committed yet beyond Phase 0.

**Session 1:** complete (2026-10-01). React Router added. `/` redirects to `/body`; a single `/body/*` route resolves the path against the Location tree (`src/engine/paths.ts`), so `/body`, `/body/blood` and `/body/blood/neutrophil` all load directly. Scenes are placeholder SVGs in `public/scenes/`, described by `content/locations/{body,peripheral-blood,neutrophil}.json` (Location schema, unchanged). `src/engine/content.ts` loads the JSON with `import.meta.glob`; `src/components/Scene.tsx` fetches the SVG, inlines it, and turns each `hotspots[].region` element into a focusable, labelled button (click, Enter or Space navigates). Unknown URLs show a Not found page. Verified in the browser: vessel on `/body` leads to `/body/blood`, which leads to `/body/blood/neutrophil`; direct URL loads work; no console errors. `npm run build` and `npm run lint` pass. Nothing committed yet beyond Phase 0.

**Open points:**

- Janeway and Abbas chapter numbers in the session 3 profiles (eosinophil, basophil, monocyte, platelet) were not checked against the books; the reviewer should confirm them. Journal citations were written from memory too and want a quick PubMed check.
- `plasma-cell-activates-basophil` uses `activates` for "makes the IgE that arms basophils"; the type enum has no closer verb. Same will apply to mast cells.
- Not yet recorded because the locations do not exist: monocyte `migrates-to` inflamed tissue, eosinophil `migrates-to` the gut, and `where: ["bone-marrow"]` on the four new `differentiates-into` records.
- Interactions have no `sources` field, so their citations sit in the neutrophil's `sources` for now. Decide in a schema session whether Interaction gets its own `sources` (one record feeds two panels, so the citation belongs on the record).
- Colour by family cannot be derived from the Cell schema: T cells and B cells are both `adaptive` + `lymphoid`. Phase 3 needs a rule or a field (e.g. `family`) before the legend and panel colours.
- `arm: "stromal"` is used for the support group (haematopoietic stem cell with `lineage: "other"`, platelet with `lineage: "myeloid"`), though neither is stromal. Revisit with the family question above.
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

**Next task:** finish the blood lymphocytes (NK, naive B, naive CD4 T and cytotoxic CD8 T are being written in a parallel session), then Phase 3 art. All five blood myeloid/platelet profiles are drafts awaiting review.
