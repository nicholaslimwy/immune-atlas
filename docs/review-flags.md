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
- "Reward" compresses the light-zone competition (more antigen captured, more help, more rounds of division). Follicular dendritic cells and the cells that clear dying B cells are in the scene and omitted from the caption. Class switching is not shown; most of it happens before the germinal centre (see the affinity maturation flags below).
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

# Review flags: germinal centre, affinity maturation

For the immunology reviewer. Covers the "See how it works" process `content/processes/affinity-maturation.json` (7 steps, played at `/processes/affinity-maturation/1`), the dark zone and light zone regions in `content/locations/germinal-centre.json`, the new AID molecule, one new interaction record and the profile edits listed at the end. Written 2026-10-03 on branch `processes`. Nothing here has been reviewed.

Captions and region text carry no citations of their own (Process and Location have no `sources` field); the interaction records listed under each step, and the `sources` of the cells they touch, carry them. Processes, regions and molecules have no `status` field either, so they cannot be marked "draft" in the data; treat all of them as draft. The cell profiles touched stay `status: "draft"`.

## Where class switching happens

1. **Mostly before the germinal centre, not inside it.** Roco et al. 2019 (Immunity 51:337) report that class-switch recombination is triggered when the B cell first gets T-cell help, before it becomes a germinal centre B cell or plasmablast, and is much reduced inside germinal centres: most switch events in germinal centre B-cell family trees came before the first hypermutation, and some germinal centres stay mostly IgM. The textbook picture (switching as a germinal centre hallmark) is still common, including in Janeway and Abbas.
2. **What the atlas now says.** Step 1's caption ends "In mice, most class switching (IgM to IgG) happens before this." The light zone region says "Little class switching happens here: in mice, most B cells have already switched antibody class before the germinal centre forms." The germinal centre B cell's switching function was rewritten to the same effect ("shown in mice").
3. **Species.** I read the abstract only, which does not name the species, so the text says "in mice" to be safe. If the paper also shows it in human tissue, the label can be dropped or softened.
4. **Older text.** The infection tour's step 7 flag above listed class switching among things drawn in the germinal centre scene; the scene does not draw switching, so that line was corrected. No caption in the infection tour mentions switching. `tfh-helps-naive-b` ("Without this help most B cells cannot form a germinal centre or switch antibody class") already fits the new picture.

## Whole-process simplifications

5. **One idealised cycle.** A germinal centre holds many B-cell families at once and many stay diverse (a "Debated:" item in the germinal centre B cell profile); the process follows "a B cell" through the cycle as if selection were a clean contest for the single best antibody.
6. **Mouse evidence.** The cycle (dark zone to light zone and back, help setting how many divisions follow) was worked out mainly by imaging and fate-mapping in mice (Victora 2010, Gitlin 2014). Step 7 says so once; the other captions do not repeat the label (40-word limit). Human germinal centres are known to persist for months after vaccination (Turner 2021), but their dynamics are not measured directly.
7. **No timings except "every few hours" and "several weeks".** "Divides every few hours" (step 2) is from mouse data and is not labelled in the caption.
8. **The two zones as two halves.** The scene splits the oval with a straight dashed line. Real zones are irregular, and their orientation (dark zone toward the T-cell zone, light zone toward the capsule) is not drawn.
9. **Arrows are directions, not paths.** Each arrow runs between the centres of the two halves and passes over cells. Step 7 draws both arrows as a loop; the scene's own exit arrows (to the memory B cell and plasma cell) are part of the drawing, not the process.
10. **Tfh help is reduced to CD40L and IL-21.** IL-4, ICOS and other signals are in the interaction record (`tfh-helps-germinal-centre-b` lists IL-4), not the caption. Follicular regulatory T cells, which also enter the germinal centre, are left out (`regulatory-t-suppresses-tfh` exists and is not used).
11. **How a B cell "tests" its receptor.** Step 4 says the better binder pulls off more antigen. Physical pulling forces at the B cell's contact with the follicular dendritic cell (Nowosad 2016, cited on the FDC) are part of how affinity is sensed and are not mentioned.
12. **Who makes CXCL13 in the light zone.** Step 3 says follicular dendritic cells make it. Allen 2004 shows CXCR5 and CXCL13 steer cells to the light zone; that FDCs are the source rests on the FDC profile's citations (Ansel 2000 for follicles generally), not on a light-zone-specific source I read.
13. **"Seemingly on an internal timer"** (dark zone region and the new interaction) rests on Bannard 2013, mouse: cells switched from the dark-zone to the light-zone state on schedule even when kept out of the dark zone.
14. **Death in both zones.** Step 6 and both regions say B cells with weak receptors (light zone, no help) or damaged receptors (dark zone, AID damage) die. That split and "up to half of all germinal centre B cells die every six hours" are from Mayer 2017, in mice.
15. **Step 1 shortcuts.** The B cells that start the germinal centre get help at the T-cell zone edge of the follicle from T cells that are becoming Tfh cells; the caption calls them Tfh. The ringed naive B cell is a resting mantle cell, ringed to show the mantle, not a founder. Germinal centres take several days to form, which the caption does not say.
16. **Highlights need a hotspot.** The scene's only labelled germinal centre B cell sits in the dark zone, so steps 4 and 5 (light zone) ring only the follicular dendritic cell and the Tfh cell; the B cells being tested there are unlabelled decoration.
17. **Plasma cell versus memory B cell.** Step 7 does not say what decides the choice (debated, in both records' text) or that in mice early leavers tend to be memory cells and late leavers plasma cells (Weisel 2016).

## Changes made in this session that need a look

- New molecule `aid` (AID, activation-induced cytidine deaminase; `kind: "other"`). Its summary rests on Muramatsu 2000 and Revy 2000 (people lacking AID: no switching, no hypermutation, giant germinal centres), both now in the germinal centre B cell's `sources`. No interaction carries it in `via` (it works inside the B cell), so its glossary entry says "No interactions recorded yet".
- New interaction `follicular-dendritic-cell-recruits-germinal-centre-b` (via CXCL13; mouse): movement between the zones. `recruits` is the closest type for "draws cells into a zone". Citations: Allen 2004, Bannard 2013.
- `macrophage-phagocytoses-germinal-centre-b` now says where and why the B cells die (Mayer 2017).
- Germinal centre B cell profile: the switching function rewritten (point 2), and the light-zone function gained "In the dark zone, cells whose receptor has been damaged by a mutation die too (shown in mice)." New sources: Roco 2019, Revy 2000, Mayer 2017, Bannard 2013. Macrophage: Mayer 2017. Follicular dendritic cell: Allen 2004, Bannard 2013.
- Dark zone and light zone regions rewritten (summaries of 44 and 54 words; four and five "What happens here" points).
- The four new citations and Allen 2004 were matched on Europe PMC (authors, journal, year, volume, issue, pages) and their abstracts read; the full papers were not.
- `content/processes/placeholder.json` is deleted.

# Review flags: germinal centre, affinity maturation loop

For the immunology reviewer. Covers the looping animation in the germinal centre scene (`content/loops/affinity-maturation.json`, drawn by `src/components/SceneLoop.tsx`), its still diagram under reduced motion, and the scene edits that came with it. Written 2026-10-03 on branch `processes`. Nothing here has been reviewed. The loop carries no citations of its own (no `sources` field); it shows what the process captions and the dark and light zone regions already say, and every point below is a drawing choice, not a new claim, unless it says otherwise.

## What it shows

One B cell at a time, so a viewer can follow it the whole way (changed 2026-10-04 after the first version, ten cells at once, was too busy to follow). A 72-second loop tells three stories in turn, each cell ringed in ink while it is on stage: (a) a cell goes round twice, its receptor improving each time, and on the third round leaves as a plasma cell; (b) a cell whose mutation makes its receptor worse takes no antigen, gets no help and dies; (c) a cell goes round once and then leaves as a memory B cell. One round (12 s): divide in the dark zone (3 s), move to the light zone (2.4 s), take antigen from a follicular dendritic cell (1.8 s), move to the Tfh cell and wait for help (2.4 s), then return, die and be swallowed by the macrophage, or leave (2.4 s). While a "See how it works" step is open, the loop replays only the stretches that match it, so its part is always on show: step 2 division; 3 moving to the light zone; 4 taking antigen; 5 Tfh help; 6 returning and dying; 7 returning and leaving. Step 1 plays the whole loop.

## Simplifications

1. **Sped up, with no number.** The label says "Sped up: a real round takes hours". A round in mice takes hours (mouse imaging, Victora 2010, already cited for the process); the animation gives no figure, so none needs checking, but "hours" itself is from the process's own sources, not a new one.
2. **One division per round.** Each cell divides once in the dark zone; real cells divide several times per visit, more after more help (process step 6 says so). Only one daughter is followed; the other drifts off and fades into the crowd of dark-zone cells. That fade is not death (dying cells look different: shrunken, receptors gone, nucleus in pieces).
3. **Mutation as receptor shape.** Every daughter shows a new receptor shape, one of four: bent short arms (poor fit), a plain Y, a Y with knobs, a Y with inward hooks (best grip). Real affinity changes in small steps and most mutations are neutral or harmful; four shapes stand for "worse or better". The two daughters of a division always differ. At phone size the shapes are a pixel or two and do not read; the cell colour never changes.
4. **Better grip, more antigen, more help.** A cell takes as many antigen pieces (0 to 3) as its receptor level; only a cell holding antigen gets help. This draws the light-zone rule in the captions (more antigen captured, more help) as a count. Some cells that took one piece still die without help, to show competition, not just a threshold.
5. **Antigen as beads.** The follicular dendritic cell processes now carry small ink beads (antigen held on their surface); the moving pieces are the same beads. They are not to scale and do not show antibody or complement on the antigen.
6. **Help as two dots.** Tfh help is drawn as two small blue dots crossing into the B cell. CD40L is a surface molecule, not a released one, and peptide shown on MHC class II is not drawn; the dots stand for "a signal from the Tfh cell", in the Tfh colour.
7. **Where cells die.** Dying cells travel from the light zone across the midline to the one labelled macrophage, in the dark zone, and disappear under it. Real tingible body macrophages sit in both zones and clear dying cells near where they die; cells with damaged receptors also die in the dark zone (dark zone region text), which the loop does not show (a level-0 cell still crosses to the light zone and dies there).
8. **How many die.** One cell of three dies, after one round; the other two survive several rounds and leave. That is far more success than in a real germinal centre, where most B cells die (the light zone region: in mice up to half of all germinal centre B cells die every six hours) and few leave. The loop picks one story of each kind so each can be followed; it shows outcomes, not their odds. (The first version, ten cells at once, had 11 deaths in 26 rounds.)
9. **Exits.** Exiting cells leave from the light zone along the scene's exit arrows and fade out beside the labelled memory B cell or plasma cell; they keep the germinal centre B cell look until they fade. Plasma cells leave with the best receptor shape, memory B cells with the second best: this follows the mouse picture that memory B cells leave earlier and with lower affinity than plasma cells (Weisel 2016 is cited in flag 17 above; I did not check a source for affinity at exit). The reviewer may prefer both at the best shape.
10. **One Tfh cell.** Every cell meets the labelled Tfh cell; each contact lasts about a second. There is no visible competition between B cells for the same Tfh cell, because only one B cell is on stage.
11. **Fixed paths.** Cells glide along gentle curves between fixed spots (curving up when they cross to the light zone and down when they come back, like the process arrows). Real cells crawl along the follicular dendritic cell network and do not keep to lanes.
12. **The look of the moving cells.** They are the generic placeholder body in B-cell colours plus five B-cell receptors (no germinal centre B cell icon exists yet). The scene's other germinal centre B cells, including the labelled one, are placeholders without receptors, so the moving ones look a little different from the still ones until the icon is drawn.
13. **Fewer still cells.** 11 of the 22 decorative germinal centre B cells were removed, so the moving cell has room and the dark zone is still the more crowded half.
14. **The still diagram** (reduced motion) shows one cell per stage: a cell just divided (two daughters), one holding antigen at a follicular dendritic cell, one getting help at the Tfh cell, one dying on its way to the macrophage, joined by thin arrows (to the light zone, to the Tfh cell, back to the dark zone, to the macrophage). Leaving is shown by the scene's own exit arrows.
15. **Fixed order, one at a time.** The three cells take turns in the same order every loop; in a real germinal centre thousands of cells cycle at once, out of step. A step's replay jumps between stretches (from one round to the next, or from one cell to another) with a short fade.

## Changes made in this session that need a look

- New content type `content/loops/` (schema in `CLAUDE.md`); the germinal centre has the only loop.
- `public/scenes/germinal-centre.svg`: antigen beads on the follicular dendritic cell processes, 11 decorative germinal centre B cells removed, and an empty `<g data-loop>` layer under the labels.
- The germinal centre scene `description` now mentions the moving cells (and the still diagram), and no longer says how many cells are labelled.
