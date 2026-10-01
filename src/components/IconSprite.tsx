import { SPRITE_ICONS, iconRef } from '../art/icons.ts'

const symbols = SPRITE_ICONS.map(
  ({ id, markup }) => `<symbol id="${iconRef(id)}" viewBox="0 0 100 100">${markup}</symbol>`,
).join('')

// Mounted once for the whole app, so the page and any inlined scene can <use href="#icon-...">.
// Zero-size rather than display:none, which can stop some browsers rendering the symbols.
export default function IconSprite() {
  return (
    <svg
      aria-hidden="true"
      width="0"
      height="0"
      style={{ position: 'absolute', overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: symbols }}
    />
  )
}
