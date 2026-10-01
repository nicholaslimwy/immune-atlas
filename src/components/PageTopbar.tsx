import { Link, useNavigate } from 'react-router'

export interface Crumb {
  label: string
  /** Absent on the current page, the last crumb. */
  to?: string
}

/** Back button and breadcrumbs for pages outside the scenes (glossary, network): Whole body > ... */
export default function PageTopbar({ trail }: { trail: Crumb[] }) {
  const navigate = useNavigate()
  // history.state.idx is React Router's position in this tab's history: 0 means nothing to go back to.
  const canGoBack = (window.history.state?.idx ?? 0) > 0
  const crumbs: Crumb[] = [{ label: 'Whole body', to: '/body' }, ...trail]

  return (
    <div className="topbar">
      <button type="button" className="back" onClick={() => (canGoBack ? navigate(-1) : navigate('/body'))}>
        ← Back
      </button>
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          {crumbs.map((c) => (
            <li key={c.label}>{c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
