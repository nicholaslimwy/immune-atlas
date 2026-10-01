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
}

/** Every icon's cell body is 80 of its 100 viewBox units across; the rest is room for protrusions. */
export const BODY_UNITS = 80
