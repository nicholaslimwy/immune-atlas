// What each cell icon is drawn to: its size and the microscope feature it is anchored on.
// Plain data so `npm run validate` can check that every icon file has a spec and vice versa.

export interface IconSpec {
  /** Drawn cell-body diameter in µm: a typical size on a blood smear, kept roughly true. */
  diameterUm: number
  /** The recognisable feature the icon is built around (art direction, shown on /styleguide). */
  cue: string
}

export const ICON_SPECS: Record<string, IconSpec> = {
  neutrophil: {
    diameterUm: 12,
    cue: 'Nucleus of several lobes joined by thin strands; fine, sparse granules.',
  },
  'naive-b': {
    diameterUm: 7.5,
    cue: 'Round nucleus filling most of the cell; Y-shaped B-cell receptors (membrane antibody).',
  },
  'naive-cd4-t': {
    diameterUm: 7.5,
    cue: 'Round nucleus filling most of the cell; blunt two-chain T-cell receptors.',
  },
  eosinophil: {
    diameterUm: 13,
    cue: 'Two-lobed nucleus; large red-orange granules packed densely through the cytoplasm.',
  },
  basophil: {
    diameterUm: 11,
    cue: 'Coarse, dense dark granules lying over the nucleus and mostly hiding it.',
  },
  monocyte: {
    diameterUm: 16,
    cue: 'Largest white cell in blood; big kidney-shaped nucleus set off-centre in plenty of cytoplasm.',
  },
  platelet: {
    diameterUm: 2.5,
    cue: 'Tiny, slightly irregular disc with no nucleus; granules clustered in the centre.',
  },
  'nk-cell': {
    diameterUm: 10,
    cue: 'Large granular lymphocyte: indented nucleus, more cytoplasm, a cluster of killing granules; no antigen receptor.',
  },
  'cytotoxic-cd8-t': {
    diameterUm: 7.5,
    cue: 'T-cell body and two-chain receptors, plus a few killing granules (shared with the NK cell).',
  },
}

/** File name (src/icons/generic.svg) of the placeholder drawn for cells with no icon yet. Never a cell id. */
export const GENERIC_ICON = 'generic'

export const GENERIC_SPEC: IconSpec = {
  diameterUm: 10,
  cue: 'Plain body, small round nucleus and a dashed membrane, in the cell family colours.',
}

/** File name (src/icons/red-blood-cell.svg) of the red blood cell: background art, not a cell record. */
export const RED_CELL_ICON = 'red-blood-cell'

export const RED_CELL_SPEC: IconSpec = {
  diameterUm: 7.5,
  cue: 'Background art: a disc with a pale centre (the biconcave dip), no nucleus and no outline, so it stays behind the white cells. Tilt it in a scene by squashing it.',
}

/** Icon files that are not cells. Their names are reserved: no cell may use them. */
export const RESERVED_ICONS: Record<string, IconSpec> = {
  [GENERIC_ICON]: GENERIC_SPEC,
  [RED_CELL_ICON]: RED_CELL_SPEC,
}

/** Every icon's cell body is 80 of its 100 viewBox units across; the rest is room for protrusions. */
export const BODY_UNITS = 80
