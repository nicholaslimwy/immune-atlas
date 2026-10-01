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
  src/
    components/          UI pieces (panel, breadcrumb, hotspot...)
    engine/              loads content, resolves routes, runs transitions
    routes/              route-level views
    types/               TypeScript types for the four schemas
  index.html, vite.config.ts, tsconfig*.json, package.json
```

Empty folders hold a `.gitkeep` until real files arrive.

## Data model (lock in Phase 2; change rarely)

```typescript
// A place you can zoom into
interface Location {
  id: string;                 // "peripheral-blood"
  name: string;               // "Peripheral blood"
  parent: string | null;      // "body" (drives zoom-out and breadcrumbs)
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
  summary: string;            // 2-3 sentences for the panel
  functions: string[];
  abundance?: string;         // e.g. share of circulating white cells
  sources: string[];          // citations
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
- Every id referenced in a hotspot, resident, interaction `source`/`target`/`via`/`where` must exist (the Phase 2 validator checks this).
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

## Current status and next task

**Status:** Phase 0 complete (2026-10-01). Gate passed: `CLAUDE.md` written; Vite + React + TypeScript scaffolded in this folder; `npm run build` and `npm run lint` pass; `npm run dev` serves a blank "Immune System Atlas" page at http://localhost:5173 with no console errors. Git repo initialised, no commits yet. `.claude/launch.json` defines the `dev` server for previews. Folder skeleton exists (empty, `.gitkeep`); no content, routing or art yet.

**Next task:** Phase 1, session 1: add React Router with routes `/body`, `/body/blood`, `/body/blood/:cell`, and scene switching between coloured placeholder rectangles.
