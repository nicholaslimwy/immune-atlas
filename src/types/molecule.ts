// Cytokines, receptors, antibodies, complement: shown as glossary tooltips. Mirrors CLAUDE.md.
export const MOLECULE_KINDS = ['cytokine', 'chemokine', 'receptor', 'antibody', 'complement', 'other'] as const

export interface Molecule {
  id: string
  name: string
  /** Other names a visitor might search for: "Interleukin-12" for IL-12. Search only. */
  aliases?: string[]
  kind: (typeof MOLECULE_KINDS)[number]
  summary: string
}
