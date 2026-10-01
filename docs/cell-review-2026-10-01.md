# Cell content review, Phase 2 session 5 (2026-10-01)

Self-review of the nine draft blood profiles for scientific errors, inconsistent terms and uncited claims. The immunology reviewer should still check every profile; this list does not replace that.

## Outcome (applied 2026-10-01)

| Item | Decision | Applied as |
| --- | --- | --- |
| A1 | Basophil marker, no species | `CD203c (basophil marker)` |
| A2 | Keep as is | no change |
| A3 | Different definition | `KLRG1 (on killer cells that have divided many times and can divide little further)`, cited to Voehringer et al. 2002 (human cells; the mouse short-lived effector work is Kaech & Cui 2012, already cited) |
| A4 | Proposed | "is studied in mice engineered..." |
| A5 | Keep as is | no change |
| B1 | Omit fat tissue | item now reads "Debated: what eosinophils do in healthy tissue such as the gut lining..." |
| B2 | Cite Janeway | "It helps expel some parasitic worms" no longer says "in mice"; cited to Janeway (already in sources). Janeway was not opened this session, so the reviewer should confirm the chapter and the human evidence |
| B3, B4 | Cite | already added with the session 5 interactions |
| C1 | Proposed | applied to all marker lists (see CLAUDE.md naming rules) |
| C2 | Option 1 | five mixed items split (platelet, NK, naive B, naive CD4 T, cytotoxic CD8 T); monocyte "Revised view:" kept, since it is a revision, not a debate |
| C3 | Proposed | "white blood cells" everywhere |
| C4 | Monocyte-derived dendritic cell | used in summary and functions, no abbreviation (see note) |

Note on C4: "mDC" usually means *myeloid* dendritic cell in human blood (i.e. conventional dendritic cells), so it would cause the very confusion C4 is meant to avoid. If an abbreviation is wanted, "moDC" is the usual one.

## Original proposals

## A. Scientific errors or overstatements

| # | File | Now | Proposed | Why |
| --- | --- | --- | --- | --- |
| A1 | basophil | marker `CD203c (human only)` | `CD203c (used to identify human basophils)` | Mouse basophils and mast cells also carry CD203c (E-NPP3; Tsai et al., Immunity 2015). It is a human *gating* marker, not human-only. |
| A2 | cytotoxic-cd8-t | summary: "MHC class I, which almost every cell in the body displays" | "...which almost every cell with a nucleus displays"; trim "multiplies enormously" to "multiplies" to stay at 60 words | Red blood cells carry no MHC class I. Matches the `mhc-i` molecule text. |
| A3 | cytotoxic-cd8-t | marker `KLRG1 (short-lived killer cells)` | `KLRG1 (marks short-lived killer cells in mice)` | The short-lived effector definition is from mouse work; in humans KLRG1 is on many memory CD8 T cells too. |
| A4 | platelet | "antibody-triggered platelet activation ... can only be studied in mice engineered to carry the human receptor" | "...is studied in mice engineered to carry the human receptor" | "Only" is too strong; human platelets are studied directly too. |
| A5 | naive-b | summary: "It carries one unique antibody on its surface as its receptor" | "It carries copies of a single antibody, unique to it and its descendants, as its surface receptor" (check the word count) | It carries many copies (as IgM and IgD) of one specificity, and its clone shares it. |

## B. Uncited claims (add a source)

| # | File | Claim | Proposed source |
| --- | --- | --- | --- |
| B1 | eosinophil | quieter roles "in fat tissue" | Wu D, Molofsky AB, Liang HE, et al. Eosinophils sustain adipose alternatively activated macrophages associated with glucose homeostasis. Science. 2011;332(6026):243-247. |
| B2 | basophil | "helps expel some parasitic worms" (mice) | Ohnmacht C, Schwartz C, Panzer M, et al. Basophils orchestrate chronic allergic dermatitis and protective immunity against helminths. Immunity. 2010;33(3):364-374. |
| B3 | basophil | IL-4/IL-13 "push B cells to switch to making IgE" | Gauchat 1993 (**added this session** with `basophil-helps-naive-b`) |
| B4 | naive-b | antigen "held on the surface of macrophages" | Carrasco & Batista 2007; Junt et al. 2007 (**added this session** with `macrophage-presents-antigen-to-naive-b`) |

Everything else checked is covered by an existing source. Janeway and Abbas chapter numbers, and journal details written from memory, still need checking against the books and PubMed (existing open point).

## C. Inconsistent terms

| # | Where | Now | Proposed |
| --- | --- | --- | --- |
| C1 | marker species labels (5 files) | `(human only)`, `(mouse only)`, `(mouse)`, `(human, once activated)`, `(used to identify mouse basophils)`, `(DX5, mouse)`, `(human NK cells only)` | Two forms only: **"(human only)" / "(mouse only)"** when the other species' cell lacks the molecule; **"(human marker)" / "(mouse marker)"** when both may carry it but it is used to identify the cell in one species. E.g. `CD49b (mouse marker)`, `CD203c (human marker)`, `B220 (CD45R; mouse marker)`, `CD45RO (human marker, once activated)`. |
| C2 | debated flags (all nine) | myeloid profiles start with "Debated:" / "Revised view:"; lymphocyte profiles say "still debated" mid-sentence; eosinophil uses both | Decision needed (see below). |
| C3 | neutrophil, platelet | "blood white cells", "white cells" | "white blood cells" everywhere |
| C4 | monocyte | "dendritic-like cell" | keep, but say "monocyte-derived dendritic cell" once so it is not confused with the `conventional-dendritic-cell` entry |

## D. Left as they are (checked, no change)

- Cell Ontology ids for all nine match their terms.
- Abundance figures (×10⁹ per litre, % of white blood cells or lymphocytes) are in line with standard reference ranges.
- `arm`/`lineage` problems (platelet as "stromal"; pDC as "myeloid") stay as open points for the colour-by-family decision in Phase 3.

## Decision needed: debated-flag style

- **Option 1 (recommended): prefix.** Every debated point is its own function item starting "Debated:". Mixed items in the lymphocyte profiles get split (e.g. NK function 6 becomes "Belongs to the ILC family..." + "Debated: where to draw the line..."). Easy to detect for a later badge. Interaction descriptions keep in-sentence wording, since a record is a single description.
- **Option 2: in-sentence.** Rewrite the five "Debated:"/"Revised view:" items as normal sentences ending "...is still debated". Reads more naturally but cannot be badged without a schema field.
