import PageTopbar from './PageTopbar.tsx'

/** Back button and breadcrumbs for the glossary pages: Whole body > Glossary [> entry]. */
export default function GlossaryTopbar({ entry }: { entry?: string }) {
  return <PageTopbar trail={entry ? [{ label: 'Glossary', to: '/glossary' }, { label: entry }] : [{ label: 'Glossary' }]} />
}
