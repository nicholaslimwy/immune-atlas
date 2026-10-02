# Review flags: infection tour

For the immunology reviewer. Everything the tour (`content/tours/infection.json`, "From a skin cut to antibodies") simplifies, skips or leaves unverified. Written 2026-10-01, Phase 5 session 2. Nothing here has been reviewed.

Interaction records, cell profiles and their citations were checked as described in `CLAUDE.md`. Journal citations were matched on Crossref, but a match shows the paper exists, not that it supports the sentence beside it.

## Whole-story simplifications

1. **One idealised infection.** The bacteria are never named. The path (Tfh help, germinal centre, IgG) suits a protein antigen from an extracellular bacterium. Responses to bacterial polysaccharides can skip T-cell help, and bacteria that live inside cells would call for Th1 and killer T cells. The tour follows only the Tfh branch.
2. **Innate immunity would usually win first.** A small cut is normally cleared by neutrophils and macrophages within days, before any antibody exists. The story assumes the bacteria persist long enough for an adaptive response.
3. **No time axis.** Steps 1 to 3 happen in minutes to hours, step 5 in a day or two, steps 6 and 7 over several days to weeks, and step 8 only once antibody is being made. Captions give no timings except "within hours" (step 3).
4. **Other helper cells are dropped.** The same dendritic cell would also drive Th1 and Th17 cells, which leave the node for the wound (records exist, not used). The early antibody wave from short-lived plasma cells outside the follicle (mostly IgM, before any germinal centre) is not shown.
5. **Things with no record.** Bacteria, endothelial cells (vessel widening and leakiness) and complement are not cell or molecule records (v1 list is frozen), so the story about them lives in captions and descriptions only. Histamine has no molecule record.
6. **Tour highlights need a hotspot.** Where a cell is part of the story but not a hotspot in the step's scene, it is named in the caption but cannot be ringed: Tfh in step 5 and step 6 (its only hotspot is in the germinal centre), the plasma cell in step 8 (not in the skin scene), and every cell in step 9.
7. **Mouse versus human.** Most of the records behind steps 3 to 9 are mouse evidence and are labelled as such in their descriptions. Captions do not repeat the labels (40-word limit), so the "In this step" list under each caption is where the reader sees them.

## Step by step

### 1. Skin: bacteria enter through a small cut

- No interaction records (empty list): the bacteria are not a cell, and no existing record covers the wound itself.
- The platelet is highlighted as a stand-in for the cut (the scene has no hotspot on the cut or the bacteria; they are art).
- The cut is drawn about 70 µm across so cells stay visible; a real cut would also bleed.

### 2. Skin: mast cells and macrophages raise the alarm

- Records: `mast-cell-recruits-neutrophil`, `macrophage-recruits-neutrophil`. Neither says vessels widen: the caption's "widen nearby vessels and make them leaky and sticky" comes from the skin location's mast cell note (histamine and TNF), which has no citation, and from the macrophage record (TNF makes the vessel lining sticky).
- "Sense the bacteria": no record for how (TLRs, complement, damage signals).
- Most mast cell evidence comes from Kit-mutant mice and is flagged `Debated:` in the mast cell profile.
- CXCL8 does not exist in mice; the record says so only through the CXCL8 molecule summary.

### 3. Skin: neutrophils leave the blood and swarm the wound

- **New record** `neutrophil-migrates-to-skin` (`where: peripheral-blood`, via CXCL8 and TNF). Sources added to the neutrophil profile: Kolaczkowska 2013 (already there; not re-read) and Lämmermann 2013 (new; mouse ear, laser damage; only the Crossref match was checked, not the abstract).
- Caption says neutrophils are "the most common white blood cells": true for human blood (about half to three quarters), not for mice (about a fifth). Not labelled.
- "Swallowing and killing bacteria" has no record (no bacterium to point at).
- Neutrophils are said to "squeeze out" of vessels, which the scene does not draw: they leave through post-capillary venules that are not in the picture, and the neutrophil hotspot is drawn already in the dermis.
- "Within hours" and "swarm" rest on the skin note and the mouse swarming paper.

### 4. Skin to lymph node: dendritic cells carry fragments

- Shown in the skin scene with the dendritic cell in the lymph vessel; the next step is a plain cross-fade to the lymph node, so the journey itself is not animated.
- The caption lumps dermal dendritic cells with Langerhans cells (the highlighted cell is the dermal one). The Langerhans cell has its own records (it too migrates, debated role).
- "Engulf bacteria and cut them into fragments" and "sensing danger" (maturation) have no records. `conventional-dendritic-cell-migrates-to-lymph-node` is mainly mouse; human skin dendritic cells are seen leaving tissue the same way.
- Plasmacytoid dendritic cells also enter wounds (see the skin note) and are left out.

### 5. Lymph node, T-cell zone: dendritic cell activates a naive CD4 T cell, which becomes Tfh

- Records: `conventional-dendritic-cell-presents-antigen-to-naive-cd4-t`, `naive-cd4-t-differentiates-into-tfh`.
- Biggest simplification of the tour. The caption says the T cell "starts to become" a Tfh because commitment begins here (IL-6, IL-21, human IL-12) and finishes after contact with a B cell (the record in step 6 says so), and because many primed cells take other fates (Th1, Th17). Whether Tfh is a lineage or a state is `Debated:` in the Tfh profile.
- Tfh cannot be highlighted here (see above).

### 6. Lymph node, follicle: a B cell receives Tfh help

- Records: `naive-b-presents-antigen-to-tfh`, `tfh-helps-naive-b`.
- How the B cell first meets the bacteria is skipped (direct binding of antigen in the lymph, hand-over by subcapsular sinus macrophages, follicular dendritic cells). `macrophage-presents-antigen-to-naive-b` exists and is not used; it is mainly mouse.
- The meeting actually happens at the edge of the follicle and the T-cell zone; the scene shows the follicle only, as a schematic at 4 px/µm with cells far larger than the node.
- The caption's "survival and dividing" signals stand for CD40L, IL-21 and IL-4 (listed under the caption).

### 7. Germinal centre: improved antibodies, plasma cells and memory B cells

- Records: `naive-b-differentiates-into-germinal-centre-b` (its `where` is `lymph-node`, though it is shown in the germinal centre scene), `tfh-helps-germinal-centre-b`, `germinal-centre-b-differentiates-into-plasma-cell`, `germinal-centre-b-differentiates-into-memory-b`.
- Debated, and softened only by "can": what decides plasma cell versus memory B, and how strongly the germinal centre selects.
- "Reward" compresses the light-zone competition (more antigen captured, more help, more rounds of division). Class switching, follicular dendritic cells and the cells that clear dying B cells are in the scene and omitted from the caption.
- The germinal centre scene is drawn at 6 px/µm, larger than the lymph node's 4 px/µm; the germinal centre is shown as filling the stage.
- Evidence for Tfh help in the germinal centre is mainly mouse.
- A germinal centre takes about a week to form; the caption gives no time.

### 8. Blood to skin: antibodies coat the bacteria for phagocytes

- **New records** `plasma-cell-activates-neutrophil` and `plasma-cell-activates-macrophage` (via IgG, `where: skin`). `activates` is the closest verb in the type list (same compromise as `plasma-cell-activates-nk-cell` and the IgE records); the real events are opsonisation and Fcγ receptor engagement. Sources added to the plasma cell, neutrophil (Nimmerjahn 2008) and macrophage profiles: Nimmerjahn 2008 and Lu 2018, matched on Crossref, abstracts not read.
- Antibody travel (lymph, then blood, then leaky vessels at the wound) has no record, since antibody is a molecule, not a mover. `plasma-cell-migrates-to-bone-marrow` is not used here.
- Shown in the skin scene, which has no plasma cell; the plasma cell cannot be highlighted.
- The first antibody is IgM, then class-switched IgG; the caption names IgG only.
- Fcγ receptors differ between mice and people; the descriptions say "Fcγ receptors" without a species label.
- Complement is mentioned in one description only (no molecule record). Neutralisation (blocking toxins) is not shown.

### 9. Epilogue: memory cells remain

- Records: `memory-b-migrates-to-peripheral-blood`, `memory-b-differentiates-into-plasma-cell`, `plasma-cell-migrates-to-bone-marrow`.
- Shown on the whole body, with no highlighted cell (no hotspot there is a cell), so nothing visible stands for memory. The bone marrow and blood vessel hotspots are on the stage but not framed.
- Memory T cells (including resident memory T cells in the skin) would also form and are not mentioned; `plasma-cell-migrates-to-bone-marrow` is mainly mouse; long-lived plasma cells are only some of the plasma cells.
- "Antibody arrives sooner and in larger amounts" rests on the memory B record; the contribution of long-lived plasma cells (antibody already there) is implied by "settle in the bone marrow", not stated.
- Resolution of the inflammation (neutrophil death, macrophage clean-up, wound healing, regulatory T cells) is not shown.

## Changes made in this session that need a look

- Three new interaction records (above); no new molecules or cells.
- Six new entries in `sources`, three papers (Lämmermann 2013 on the neutrophil; Nimmerjahn 2008 on the neutrophil, macrophage and plasma cell; Lu 2018 on the macrophage and plasma cell). Interactions have no `sources` field, so the citations sit with the cells.
- `scripts/validate.ts` now rejects a tour caption of more than 40 words.
- `content/tours/placeholder.json` is deleted.

# Review flags: body scene, blood and lymph networks

Written 2026-10-02 (branch `body-two-networks`). The whole-body scene (`public/scenes/body.svg`, generated, then checked by eye) now draws the blood vessels and the lymphatic system as two networks, with a Show toggle (Both / Blood / Lymph), a legend and the caption "Immune cells travel through both the blood and the lymphatic system." Nothing here has been reviewed, and nothing in the drawing is cited (Location has no `sources`). "Left" and "right" below are the figure's own sides.

## Blood

1. **Only the body circuit.** The heart is drawn as a single pump: arteries leave it, loop out to the head, arms and legs, and veins bring the blood back. The lungs and the pulmonary circulation (right heart to lungs to left heart) are not drawn, so the picture skips the half of every circuit that goes through the lungs.
2. **One artery and one vein per limb.** Each arm, leg and side of the head has a single artery-vein pair that turns round at the hand, foot or top of the head. That U-turn stands for whole capillary beds; real limbs have many arteries and veins, deep and superficial. Arteries and veins share one colour; only the direction of the moving dots tells them apart (and it is hidden for visitors who ask for reduced motion).
3. **Great vessels simplified.** The aortic arch, its branches, the brachiocephalic veins and the superior vena cava are mostly hidden behind the thymus; the vessels there are not anatomically placed. The neck was widened a little so the carotid arteries, jugular veins and neck lymph vessels fit side by side.
4. **The spleen's vein goes straight back.** The splenic vein is drawn returning to the inferior vena cava. In fact it joins the portal vein and the blood passes through the liver first; the liver and gut are not drawn.
5. **Bone marrow is in the thigh bones only**, each with one nutrient artery and vein. Adult red marrow is mostly in flat bones (pelvis, sternum, vertebrae, skull), as already flagged for Phase 3.3.
6. **The thymus is drawn with no vessels of its own.** It sits in front of the great vessels; the blood that brings T-cell precursors in and takes mature T cells out is not shown as a branch.
7. **Speeds are illustrative.** The dots go round a limb loop in about 40 seconds and move about three times faster in blood than in lymph. Real blood takes about a minute for a full circuit at rest, and lymph flow is far slower and irregular.

## Lymphatic system

8. **Starts in four places only.** Lymph vessels are drawn beginning as small forks (blind-ended capillaries) in the hands, feet, head and gut. In reality lymph forms in almost every tissue.
9. **Four node clusters**: neck, armpits, groin and abdomen, two to three beads each. The body has several hundred nodes; other groups (in the chest, behind the knee, at the elbow, along the aorta and in the gut wall) are not drawn. The abdominal cluster stands for the mesenteric and para-aortic nodes together.
10. **Leg lymph is drawn on the outer side of the thigh**, for room beside the femur and the blood vessels. The main superficial lymph vessels of the leg run on the inner side, with the great saphenous vein. Arm lymph is drawn on the inner side of the arm, which is right.
11. **Thoracic duct simplified.** It is drawn from a junction between the inferior vena cava and the aorta (no cisterna chyli sac) straight up behind the heart and thymus to the left venous angle. In fact it starts at the cisterna chyli behind the aorta, runs up on the right of the aorta and crosses to the left in the upper chest. The right lymphatic duct is not drawn as a separate vessel: the right-side lines simply end at the right venous angle, and on the left the neck and arm lines end at the angle rather than joining the duct.
12. **Where lymph meets blood.** All lymph lines end at the venous angles, the junctions of the subclavian and internal jugular veins at the base of the neck, near the collarbones (really just behind the sternoclavicular joints). Small lymphatic-venous connections elsewhere (for example inside some nodes) are left out.
13. **Lymph nodes are drawn on lymph lines only.** Every node also has its own artery and vein, and most lymphocytes enter a node from the blood through high endothelial venules, not from the lymph. The caption's point (immune cells use both networks) depends on this, but the body scene does not draw it; the lymph node scene does not draw blood vessels either (already listed under Phase 4 lymph node A).

## Organs that connect to the blood, not the lymph

14. **Spleen**: drawn with no lymph vessels. It has no afferent lymph vessels (it filters blood, not lymph), but it does have some efferent lymph vessels, which are sparse in humans and are left out.
15. **Bone marrow**: drawn with no lymph vessels, the classical view. Recent work in mice reports lymphatic vessels in bone; this was not checked against a source and is not drawn.
16. **Thymus**: drawn with no lymph vessels. Like the spleen it has no afferent lymph vessels; it does have efferent lymph vessels, which are left out.

## Other changes that need a look

- New stub location `lymph-vessels` ("Lymph vessels", coming soon): the lymph lines are its hotspot. The lymph nodes hotspot is the beads, and the blood vessels hotspot is every blood line plus the heart; its leader now points at the right shoulder vessels, so the zoom into peripheral blood starts there, not at the heart.
- The body location has a new `caption` field (one line under the stage) and a rewritten `description`. The legend text ("a loop from the heart and back", "one way, back to the blood") is site text in `src/components/SceneNetworks.tsx`.
- Infection tour step 9 (epilogue, whole body) now shows both networks; its caption was not changed.
