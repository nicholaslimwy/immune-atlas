// Every address the app answers, read from /content: each scene, every cell panel over every scene
// (interaction links open any cell over the scene you are in), each tour step and end screen, each
// glossary entry, and the pages outside the scenes. Used by the build (vite.config.ts) to write one
// HTML file per address, so a static host such as GitHub Pages answers a deep link with the app
// and status 200 instead of "not found". Paths have no base folder and no trailing slash.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

interface LocationFile {
  id: string
  parent: string | null
  slug?: string
  status?: string
}

export function appRoutes(root: string): string[] {
  const ids = (dir: string) =>
    readdirSync(join(root, 'content', dir))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
  const json = <T>(dir: string, id: string): T => JSON.parse(readFileSync(join(root, 'content', dir, `${id}.json`), 'utf8'))

  const locations = ids('locations').map((id) => json<LocationFile>('locations', id))
  const byId = new Map(locations.map((l) => [l.id, l]))
  const pathOf = (l: LocationFile): string => {
    const own = `/${l.slug ?? l.id}`
    return l.parent ? pathOf(byId.get(l.parent)!) + own : own
  }
  const cells = ids('cells')

  const routes: string[] = []
  // A stub place has no scene, so it has no URL (src/engine/paths.ts).
  for (const l of locations.filter((l) => l.status !== 'stub')) {
    routes.push(pathOf(l))
    for (const cell of cells) routes.push(`${pathOf(l)}/${cell}`)
  }
  for (const id of ids('tours')) {
    const steps = json<{ steps: unknown[] }>('tours', id).steps.length
    routes.push(`/tours/${id}`, `/tours/${id}/end`)
    for (let i = 1; i <= steps; i++) routes.push(`/tours/${id}/${i}`)
  }
  routes.push('/glossary', ...ids('molecules').map((id) => `/glossary/${id}`))
  routes.push('/network', '/styleguide', '/about')
  return routes
}
