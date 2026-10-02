import { useEffect } from 'react'

const SITE = 'Immune System Atlas'

/** Sets the browser tab's title (what a screen reader reads when a page loads and what history lists). */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : SITE
  }, [title])
}
