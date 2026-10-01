import type { Location } from '../types/location.ts'

const files = import.meta.glob<Location>('../../content/locations/*.json', {
  eager: true,
  import: 'default',
})

const locations = new Map<string, Location>(
  Object.values(files).map((loc) => [loc.id, loc]),
)

export function getLocation(id: string): Location | undefined {
  return locations.get(id)
}

export function getChildren(id: string): Location[] {
  return [...locations.values()].filter((loc) => loc.parent === id)
}
