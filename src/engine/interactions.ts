import type { Interaction } from '../types/interaction.ts'
import { getCell, getInteractionsOf, getLocation, getMolecule } from './content.ts'

type Type = Interaction['type']

/** How each interaction type reads from the source's panel and from the target's panel. */
const VERBS: Record<Type, { active: string; passive: string }> = {
  activates: { active: 'Activates', passive: 'Activated by' },
  'presents-antigen-to': { active: 'Presents antigen to', passive: 'Receives antigen from' },
  helps: { active: 'Helps', passive: 'Helped by' },
  kills: { active: 'Kills', passive: 'Killed by' },
  phagocytoses: { active: 'Engulfs', passive: 'Engulfed by' },
  recruits: { active: 'Recruits', passive: 'Recruited by' },
  suppresses: { active: 'Suppresses', passive: 'Suppressed by' },
  'differentiates-into': { active: 'Develops into', passive: 'Develops from' },
  'migrates-to': { active: 'Moves to', passive: 'Receives' },
}

/** One row of a cell's "Interacts with" list, seen from that cell's side. */
export interface InteractionLink {
  id: string
  /** E.g. "Recruited by". */
  verb: string
  /** The cell or location at the other end. */
  other: { kind: 'cell' | 'location'; id: string; name: string; stub: boolean }
  description: string
  /** Molecule names, in the record's order. */
  via: string[]
  /** Location names, in the record's order. */
  where: string[]
}

/** Every interaction that involves `cellId`, phrased from its side, sorted by the other end's name. */
export function interactionLinksOf(cellId: string): InteractionLink[] {
  return getInteractionsOf(cellId)
    .map((ix): InteractionLink => {
      const outgoing = ix.source === cellId
      const otherId = outgoing ? ix.target : ix.source
      const cell = getCell(otherId)
      const loc = cell ? undefined : getLocation(otherId)
      return {
        id: ix.id,
        verb: VERBS[ix.type][outgoing ? 'active' : 'passive'],
        other: {
          kind: cell ? 'cell' : 'location',
          id: otherId,
          name: cell?.name ?? loc?.name ?? otherId,
          stub: cell?.status === 'stub',
        },
        description: ix.description,
        via: (ix.via ?? []).map((m) => getMolecule(m)?.name ?? m),
        where: (ix.where ?? []).map((l) => getLocation(l)?.name ?? l),
      }
    })
    .sort((a, b) => a.other.name.localeCompare(b.other.name) || a.verb.localeCompare(b.verb))
}
