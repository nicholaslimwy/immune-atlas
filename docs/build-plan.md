# Immune System Atlas: Build Plan

Sep 30, 2026 · @Nick

## Vision

Build v1 in eight phases, starting with a working click-through skeleton and one fully illustrated compartment (peripheral blood), then widening outward. The atlas is a zoomable map of the immune system: start at the whole body, click a tissue, click a cell, and read what it does and who it talks to. Every screen should answer two questions: where am I, and what is interacting here?

**Audience (assumed).** Curious adults through early university and medical students. This sets the depth: CD markers and key cytokines appear, but signalling pathways do not.

**What "v1 done" means.** The immune system is effectively infinite, so a fixed finish line matters more than anything else in this plan. v1 is done when it has:

- A whole-body view with clickable hotspots
- Six compartments: peripheral blood, lymph node, bone marrow, thymus, spleen, and skin
- About 25 cell types, each with a profile panel and clickable links to the cells it interacts with
- One guided tour that follows an infection from a skin cut to antibody production
- A public URL anyone can visit

**Out of scope for v1.** Disease states, detailed molecular signalling, 3D models and quizzes. These sit in the stretch list at the end of the roadmap.

## Architecture

Keep the science and the visuals apart: every piece of content lives in data files, and one engine turns them into screens. Adding a new cell or place then means writing a file, not writing code.

&#91;embedded content: atlas architecture · content, engine, screens\]

Each click sends a new URL back through the router, which picks the next view. Zooming follows a simple tree (each place has one parent), while the links between cells form a web; the data model below keeps both.

## The zoom levels

Three levels cover v1: the body, a compartment, and a cell panel. Guided tours sit on top and carries the visitor through all three.

&#91;embedded content: zoom levels · body, compartment, cell panel\]

Clicking a cell opens a side panel over the scene rather than zooming again, so the visitor keeps their place. The panel's interaction links jump sideways to other cells, even ones that live elsewhere, and the breadcrumb follows.

| Level | Example URL | What the visitor gets |
| --- | --- | --- |
| Body | `/body` | Hotspots on lymphoid organs, vessels and barrier tissues |
| Compartment | `/body/blood` | An illustrated scene of the resident cells; busy scenes such as the lymph node get one more zoom (the germinal centre) |
| Cell panel | `/body/blood/neutrophil` | Summary, markers, functions, where else it lives, and links to the cells it interacts with |
| Guided tour | `/tours/infection` | A step-by-step story that zooms between levels on its own |

## Tech stack and the zoom effect

Use React with TypeScript, draw every scene as SVG, and fake the continuous zoom with animated transitions between separate scenes. Everything is static files, so hosting is free.

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | React + TypeScript, built with Vite | Scenes and panels map neatly onto components; TypeScript flags content files that break the schema |
| Scenes | Inline SVG | Crisp at any scale; every organ and cell is a real, clickable, stylable element |
| Transitions | Framer Motion (GSAP is a fine alternative) | Smooth "camera" moves with little code |
| Routing | React Router | Every view gets a shareable URL, e.g. `/body/blood/neutrophil` |
| Content | JSON files in a `/content` folder | Edit the science without touching code |
| Network view (Phase 6) | Cytoscape.js or d3-force | Draws the whole interaction graph |
| Hosting | GitHub Pages, Netlify or Vercel | Free static hosting with a public URL |

**How the zoom works.** When a hotspot is clicked, the current scene scales up around it (say 1× to 8×, centred on the blood vessel) while fading out. The child scene fades in starting slightly small and settles to 1×. The eye reads this as one continuous dive, but each level is drawn separately at the detail it needs.

| Approach | Effort | Verdict |
| --- | --- | --- |
| Separate scenes joined by zoom transitions | Low to medium | Recommended: easy to author one scene at a time |
| Continuous deep zoom, map-style (e.g. OpenSeadragon tiles) | High | Every level must live in one giant tiled artwork |
| 3D with three.js | Very high | Stretch goal at most; art and performance costs multiply |

**Lower-setup option.** Phases 1 to 3 can be prototyped as a single self-contained HTML page built here in Claude, then moved into the React project once the design settles.

## Data model

Four record types hold all the content: locations, cells, interactions and molecules. Lock these schemas in Phase 2 and change them rarely, since every later session builds on them.

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

Three rules make this scale:

1. **Cells are not owned by places.** A neutrophil appears in blood, bone marrow and inflamed skin. Locations point to cells through `residents`, with an optional note on what the cell does there.
2. **Interactions are records of their own.** A cell's panel lists every interaction where it is the source or target. Adding one record updates two panels and, later, the network view.
3. **Movement is an interaction.** A dendritic cell carrying antigen to a lymph node is `migrates-to` pointing at a location. These records are what the "bigger picture" views and guided tours are built from.

## Content map

v1 covers 7 scenes and 27 cell types. Peripheral blood comes first because it holds the widest mix of cells in one simple scene.

| Scene | Zooms from | What it shows | Key residents | Phase |
| --- | --- | --- | --- | --- |
| Whole body | none | Silhouette with lymphoid organs, blood and lymph vessels, barrier tissues | none | 1 |
| Peripheral blood | Whole body | Vessel cross-section with cells flowing past | Neutrophils, monocytes, lymphocytes, eosinophils, basophils, platelets | 2-3 |
| Bone marrow | Whole body | The niche where blood cells are born | Stem cells, progenitors, developing B cells, long-lived plasma cells | 4 |
| Thymus | Whole body | Cortex and medulla, where T cells are selected | Developing T cells, thymic epithelial cells, dendritic cells | 4 |
| Lymph node | Whole body | Follicles, germinal centre, T-cell zone, medulla | Naive T and B cells, Tfh cells, germinal centre B cells, follicular dendritic cells | 4 |
| Spleen | Whole body | Red pulp filtering blood, white pulp organising responses | Red pulp macrophages, marginal zone B cells, T and B zones | 4 |
| Skin | Whole body | Epidermis and dermis at a small wound | Langerhans cells, dermal dendritic cells, mast cells, resident memory T cells | 4 |

| Group | v1 cell types | Count |
| --- | --- | --- |
| Innate, myeloid | Neutrophil, eosinophil, basophil, mast cell, monocyte, macrophage, conventional dendritic cell, plasmacytoid dendritic cell, Langerhans cell | 9 |
| Innate, lymphoid | NK cell, innate lymphoid cells (groups 1-3) | 2 |
| Adaptive, T cells | Naive CD4 T, Th1, Th2, Th17, Tfh, regulatory T, cytotoxic CD8 T, memory T | 8 |
| Adaptive, B cells | Naive B, germinal centre B, plasma cell, memory B | 4 |
| Support and stromal | Haematopoietic stem cell, platelet, follicular dendritic cell, thymic epithelial cell | 4 |

The v1 guided tour is "follow an infection": a skin cut, neutrophils arrive, a dendritic cell carries antigen to a lymph node, T and B cells activate, and antibodies return through the blood.

**Next in line after v1:** gut (Peyer's patches, lamina propria), lungs (alveolar macrophages), liver (Kupffer cells), brain (microglia), tonsils, and innate-like T cells (gamma-delta T, NKT, MAIT).

## Art direction

Art is the slowest part of this project, so pick one flat, stylised vector style in Phase 3 and never deviate. Realistic rendering looks impressive in one scene and inconsistent across twenty.

**One icon per cell type, reused everywhere.** Draw each cell once as an SVG symbol and place that same symbol in every scene where it appears. A neutrophil should look identical in the blood, the bone marrow and a wound. Anchor each icon on the feature a student would recognise under a microscope:

| Cell | Recognisable feature |
| --- | --- |
| Neutrophil | Nucleus split into several lobes |
| Eosinophil | Two-lobed nucleus, red-orange granules |
| Basophil | Dense dark purple granules hiding the nucleus |
| Monocyte | Large cell, kidney-shaped nucleus |
| Lymphocyte | Round nucleus filling almost the whole cell |
| Plasma cell | Off-centre nucleus, lots of cytoplasm |
| Dendritic cell | Long branching arms |
| Macrophage | Large, irregular, often with engulfed debris |

Keep relative sizes roughly true: a monocyte should look clearly bigger than a lymphocyte, and red cells can fill the background of the blood scene.

**Colour code by family.** One hue per group, used in scenes, panels, the network view and the legend: warm reds and oranges for innate myeloid cells, purple for innate lymphoid cells, blue for T cells, green for B cells, grey for support cells. Never let colour carry meaning alone; pair it with a label or shape so colour-blind visitors are not shut out.

**Where the art comes from.**

| Source | Licence | Best for |
| --- | --- | --- |
| Drawn by Claude as SVG | Yours | Cell icons and simple scenes, once the style guide is fixed |
| [Servier Medical Art](https://smart.servier.com/how-to-cite-servier-medical-art) | CC BY 4.0: free, including commercially, with credit | Body silhouettes, organs, vessel cross-sections |
| [NIH BIOART Source](https://bioart.niaid.nih.gov/) | Varies per image: many public domain, some Creative Commons with non-commercial terms | Cells, pathogens, molecules |
| A hired illustrator | By contract | The whole-body hero image, if budget allows |

Keep an `ATTRIBUTIONS.md` file from day one and log every borrowed image as it enters the project.

## Roadmap

Eight phases take the atlas from an empty folder to a public v1, in roughly 30 to 40 working sessions. Each phase ends at a gate you can test by clicking; don't start the next phase until it passes.

&#91;embedded content: roadmap · 8 phases to v1, each with a gate\]

Phases 1 and 2 use plain placeholder shapes on purpose. Proving the navigation and data model before any art exists means a design change costs minutes, not redrawn scenes.

| Phase | Sessions (estimate) | Suggested sessions |
| --- | --- | --- |
| 0 Decisions | 1 | Confirm audience and the v1 list; scaffold Vite, React and TypeScript; write `PROJECT_CONTEXT.md` |
| 1 Skeleton | 2-3 | Routing and scene switching with coloured rectangles; zoom transition, Back and breadcrumbs; empty side panel |
| 2 Data model | 3-4 | Schemas as TypeScript types; blood cell files, 3 or 4 per session; interactions and molecules; validator and clickable panel links |
| 3 First art | 3-4 | Style guide plus 3 trial icons; remaining icons; body scene with hotspots; blood scene with gentle flowing motion |
| 4 Five places | 2-3 per place | Scene art and hotspots; new cells and interactions; reviewer fixes |
| 5 Guided tour | 2-3 | Tour engine (steps, camera targets, captions); write the infection story; test on a phone |
| 6 Tools | 3-4 | Search; glossary tooltips; network view; innate/adaptive filter |
| 7 Launch | 2-3 | Accessibility audit; performance pass; deploy and attributions page |

## Running each build session with Claude

Every new chat starts with no memory of the last one, so the project's memory lives in one file: `PROJECT_CONTEXT.md`. Attach it at the start of every session and ask Claude to update it at the end.

**What the context file holds:** the one-paragraph vision, tech stack, folder structure, the four schemas, the style guide (exact colour codes, stroke width, icon viewBox size), naming rules (ids in lowercase-with-hyphens), a short decisions log, and a "current status and next task" section.

**Where to keep it.** Any of these work: attach it to each chat, add it to a Claude Project's knowledge so every chat in the project sees it, or name it `CLAUDE.md` and use Claude Code, which reads it automatically and can edit files and run the site directly in your project folder. Claude Code suits this project best once there are more than a handful of files.

**One session, one deliverable.** Each session should end with something you can click and check. Big asks ("build the lymph node") produce sprawling, hard-to-debug output; small ones ("add the lymph node scene with hotspots for its four zones") land cleanly.

Template for a feature session:

```text
[Attach PROJECT_CONTEXT.md and the files to change]
Phase 1, session 2. Goal: add the zoom transition between scenes.
Constraints: keep the Location schema unchanged; use Framer Motion; no other new dependencies.
Done when: clicking the blood vessel hotspot zooms into peripheral-blood, and Back zooms out.
Finish by giving me the updated status section for PROJECT_CONTEXT.md.
```

Template for a content session:

```text
[Attach PROJECT_CONTEXT.md and the list of existing cell ids]
Write content/cells/eosinophil.json, plus interaction records between eosinophils and existing cells.
Follow the Cell and Interaction schemas exactly. Summary: first-year university level, 60 words max.
Cite a textbook chapter or review in sources. Flag anything debated, or true in mice but not humans.
```

Template for an art session:

```text
[Attach the style guide and two finished icons]
Draw an SVG symbol for a basophil matching the attached icons: same stroke width, palette and viewBox.
Key feature: dense dark purple granules that hide the nucleus.
```

## Sources and accuracy

Every fact carries a citation, and someone with immunology training reviews each compartment before it counts as done. An atlas that looks authoritative but contains errors is worse than no atlas.

| Source | Use it for |
| --- | --- |
| *Janeway's Immunobiology* (latest edition) | The backbone for cell functions and interactions |
| Abbas, *Cellular and Molecular Immunology* | Cross-checking, and clinical relevance |
| Cell Ontology, e.g. [neutrophil, CL:0000775](https://amigo.geneontology.org/amigo/term/CL:0000775) | Standard names and ids; its "is a" tree (neutrophil is a granulocyte) seeds the `parent` field |
| Human Protein Atlas, immune cell section | Which markers human immune cells actually express |
| Recent reviews on PubMed | Newer or debated biology, such as innate lymphoid cell subsets |

**Accuracy workflow.**

1. Claude drafts each entry from these sources and flags anything uncertain or debated.
2. A small validation script checks that every id used in interactions, hotspots and residents exists, which catches typos before they become broken links.
3. A reviewer with immunology training (a lecturer, postgraduate or clinician) signs off each compartment; track their corrections as comments or issues.
4. Much immunology was worked out in mice. Label any fact that differs between mice and humans.
5. Show a "last reviewed" date on each cell panel.

## Risks and pitfalls

Scope creep is the risk most likely to stop this project; the rest are cheap to prevent if handled from the start.

| Risk | Early warning sign | Prevention |
| --- | --- | --- |
| Scope creep | v1 keeps gaining "just one more" cell or organ | Freeze the v1 list; new ideas go into a backlog file |
| Art drifting between sessions | Icons start to look like different artists drew them | Style guide in the context file; attach two finished icons to every art session |
| Text hard-coded into components | Fixing a typo in a summary means editing code | All wording lives in `/content` JSON from Phase 2 onwards |
| Lost context between chats | Claude invents new field names or ids | Attach `PROJECT_CONTEXT.md` every session |
| Scientific errors | Uncited claims, mouse data presented as human | Citations on every entry plus reviewer sign-off |
| Overcrowded scenes | Cells too small to tap on a phone | Aim for about 10 hotspots per scene at most; split busy areas into a further zoom level (lymph node, then germinal centre) |
| Slow transitions | Stutter when zooming | Load scenes only when needed; shrink SVG files with SVGO |
| Inaccessible navigation | Keyboard or screen-reader users cannot move between levels | Make hotspots focusable, labelled buttons; offer a plain list view of each scene |
