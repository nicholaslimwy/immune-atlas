# Accessibility: how it is built, how it is checked, what a person still has to test

Phase 7, session 1 (2026-10-02). Target: WCAG 2.2 level AA. Nothing here has been tried with a real screen reader yet (see the checklist at the end).

## How the site behaves

**Structure.** A skip link is the first Tab stop; it moves focus to the page's title. Landmarks: banner (site name, Glossary, Network, search), a labelled "Highlight" region (the innate/adaptive filter), `main`. Every page has one `h1` and sets the browser tab title (`useDocumentTitle`).

**Scenes.**

- Each scene SVG is a named group ("Skin scene") whose `aria-describedby` points at the location's `description` (content field, required once the scene is built, 65 words at most, checked by `npm run validate`).
- Each hotspot is a `role="button"` with an `aria-label` (the name from content, plus "(coming soon)" for a stub) and an `aria-description` ("Cell. Press Enter to open its profile." / "Place. Press Enter to zoom in."; a tour adds "Highlighted in this step.").
- **List view**: under every scene (not in tours) a collapsed "List view: everything in this scene (n)" lists the same targets as ordinary links, so nobody has to aim at the art.
- While one scene zooms away its twin is `inert`: it cannot take focus and is not read.
- Colour never carries meaning alone (style guide); the arm filter's dimming is announced ("Highlighting innate cells: 11 of 27...").

**Focus** goes somewhere predictable after every change:

| Action | Focus lands on |
| --- | --- |
| Skip link, link to another page (glossary, network...) | that page's title (`h1`) |
| Zoom in, zoom out, Back, breadcrumb, browser back/forward | the new scene's title |
| Open a cell panel (hotspot, list link, sideways link in a panel) | the panel's title |
| Close a panel (Escape, ×, Back) | the hotspot that opened it, if the scene is the same |
| Next, Back, arrow keys in a tour | stay put; the live region says "Step n of N, <scene>." and then the caption |
| Exit tour, Explore freely | the scene title |
| Choose a search result | the new page's title (also when it is the page you are on) |

**Keyboard.** Tab and Shift+Tab reach everything; Enter or Space activates a hotspot; Escape closes a panel, a molecule popover (the popover first, alone) or the search list; `/` focuses the search box; left and right arrows move through a tour. The network graph canvas itself is not keyboard-reachable; its **List view** (same records, same links) is the alternative and is one Tab stop away.

**Motion.** `prefers-reduced-motion: reduce` removes the flowing and bobbing cells (CSS), turns the zoom into a plain cross-fade (Framer Motion: `useReducedMotion` plus `MotionConfig reducedMotion="user"`), and makes tours cut between steps. For everyone else a "Pause scene motion" button under the stage freezes the cells (WCAG 2.2.2); the choice is remembered in `localStorage` (`immune-atlas:motion-paused`).

## Checks that can be rerun

Start the site (`npm run dev`), then:

| Command | What it does |
| --- | --- |
| `npm run a11y` | axe-core (WCAG 2.0/2.1/2.2 A and AA plus best practices) on every scene, every cell panel, all tour steps and the end screen, the glossary and every entry, the network (graph and list), the style guide, the not-found page, plus an open search list, an open molecule tooltip and the highlight filter; desktop width and 320 px. At 320 px it also fails any page that needs sideways scrolling (reflow, WCAG 1.4.10). About 8 minutes; `A11Y_ONLY="tour|glossary"` limits it to routes whose name matches. |
| `npm run a11y:keys` | Real key presses only, in headless Chrome: skip link, zooming in and out, opening and closing panels, the scene list, the tour (Next, arrows, Exit), search, a molecule tooltip, following a link to the glossary, the network list; then checks each scene's name, description and hotspot labels, and walks the tab order of seven pages checking that every stop shows a focus indicator. |
| `npm run a11y:contrast` | Contrast of the text inside the scene SVGs (which axe cannot judge): two screenshots per scene, letters found by difference, ratio against the pixels behind each letter. `CONTRAST_MIN=7` changes the bar. |

The scripts drive Chrome over the DevTools protocol (`scripts/cdp.ts`), so no browser-automation package is installed; only `axe-core` was added (dev dependency).

## Contrast

- All HTML text passes axe's contrast rule at both widths.
- Text in scenes (labels, structure tags) sits on a 4 px white halo (paint-order stroke), which is why every label reads at 18:1 or better wherever it lies across art.
- Keyboard focus on a hotspot is a ring in `#0842a0`, 3 px, plus the label underlined in blue; the lighter `#1a73e8` is used for hover only.
- Network lines: the Okabe-Ito orange (`#E69F00`), sky blue (`#56B4E9`) and pink (`#CC79A7`) were below 3:1 on the white canvas, so they are darkened to `#B87A00`, `#1E88C7` and `#C0618F` (3.6:1, 3.9:1, 3.9:1). Each type also keeps its own dash pattern and arrowhead.
- **Known exception:** the arm filter dims cells outside the chosen arm to 30% opacity, which is far below 4.5:1 on purpose (it is the effect). Hover and focus bring a dimmed hotspot back to full strength, the list view under the scene is not dimmed, and the filter is announced. WCAG treats inactive components as exempt; these are still clickable, so this is a judgement call, not a pass.

## Not yet tested by a person with a screen reader (please test)

Test with NVDA + Firefox or Chrome (Windows), VoiceOver + Safari (Mac, and iPhone), and TalkBack + Chrome (Android) if you can. Things automated checks cannot judge:

1. **Landmarks and skip link.** Do the rotor or landmark list show banner, navigation "Site", search, region "Highlight" and main? Does "Skip to main content" land on the page title and read it?
2. **A scene.** On `/body`, move into the picture. Is "Whole body scene" announced with its description? Is each hotspot read as a button with its name, and does your reader also read the "Place. Press Enter to zoom in." text? (`aria-description` is newer; VoiceOver may ignore it. If it does, the hint is lost but the name is fine.) Are labels read twice (the SVG text inside a button should be ignored)?
3. **Zooming.** Activate "Peripheral blood". Is the new title announced straight away? Can you reach anything from the old scene during the 0.9 s transition (you should not)? Does Back, and the browser's back button, announce the title it returns to?
4. **Cell panels.** Open a cell: is the panel title read? Press Escape: does focus come back to the cell's hotspot and is its name read? Do sideways links ("Interacts with") announce the new cell?
5. **Molecule terms.** In a cell panel Tab to a dotted-underlined term (for example CXCL8 in the neutrophil panel). Does your reader announce that it is expanded and read the definition, or do you have to move on to find it? This is the part I am least sure of: the popover is a sibling element after the term, not a live region.
6. **Tour.** Press Next: is "Step 2 of 9, Skin." followed by the caption read, with focus still on Next? Try Back, the arrow keys, the step links, Finish, Restart, Exit tour.
7. **Search.** Type "cd4": is the result count announced, and does each arrow-key press read the highlighted result (name, kind, why it matched)? Does Enter open it and read the new title?
8. **Highlight filter.** Press Innate: is "Highlighting innate cells: 11 of 27. Other cells are dimmed." read?
9. **Network.** Does the graph announce a useful label and point you to the List view? Is the list readable as grouped lists with working links?
10. **Pause button.** Present only if your system is not set to reduce motion.
11. **Phone.** With VoiceOver or TalkBack, can you swipe through the scene's hotspots, double-tap to open one, and is the list view under the scene easier to use? (Touch exploration of the SVG itself is untested.)
12. **Zoom and contrast modes.** Browser zoom to 200% and 400%, text-only zoom, Windows High Contrast (forced colours), and dark mode. Scenes keep their own colours in forced-colours mode; check that labels, focus rings and the Back/Next buttons are still visible.
