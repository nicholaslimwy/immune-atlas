# Attributions

Log every borrowed image as it enters the project: file, source, licence, credit line. Everything from the first `##` heading down is shown as the credits on the site's `/about` page (`src/engine/attributions.ts` reads this file at build time), so keep each section to plain paragraphs and one table; a table row whose first cell is `(none yet)` is left out there.

## Images

Nothing borrowed so far: the cell icons and the eight scenes (whole body, peripheral blood, lymph node, germinal centre, bone marrow, thymus, skin, spleen) were drawn from scratch for this project.

| File | Source | Licence | Credit |
| --- | --- | --- | --- |
| (none yet) | | | |

## Software

Open-source libraries that ship in the site's code.

| Library | Used for | Licence | Credit |
| --- | --- | --- | --- |
| [React](https://react.dev) and React DOM | The interface | MIT | Copyright Meta Platforms, Inc. and affiliates |
| [React Router](https://reactrouter.com) | Addresses and page changes | MIT | Copyright React Training LLC, Remix Software Inc. and Shopify Inc. |
| [Framer Motion](https://motion.dev) | Zoom and fade transitions | MIT | Copyright Framer B.V. |
| [Fuse.js](https://www.fusejs.io) | Typo-tolerant search | Apache 2.0 | Copyright Kirollos Risk |
| [Cytoscape.js](https://js.cytoscape.org) | The interaction network | MIT | Copyright The Cytoscape Consortium |

The site is built with [Vite](https://vite.dev) and [TypeScript](https://www.typescriptlang.org), its SVG files are shrunk with [SVGO](https://svgo.dev), and its accessibility is checked with [axe-core](https://github.com/dequelabs/axe-core); none of these ship in the site.

## Colours and identifiers

| Item | Used for | Licence | Credit |
| --- | --- | --- | --- |
| Okabe-Ito colour-blind-safe palette | Line colours in the network view (three darkened for contrast) | Published palette | Okabe M, Ito K. Color Universal Design (CUD): how to make figures and presentations that are friendly to colorblind people. 2008 |
| [Cell Ontology](https://obofoundry.org/ontology/cl.html) | The standard identifier linked from each cell profile (CL:...) | CC BY 4.0 | Cell Ontology contributors, OBO Foundry |
