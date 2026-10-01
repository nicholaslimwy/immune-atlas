import { Link, useNavigate } from 'react-router'

/** Back button and breadcrumbs for pages outside the scene tree: Whole body > ...trail. The last crumb is the page. */
export default function PageTopbar({ trail }: { trail: { label: string; to?: string }[] }) {
  const navigate = useNavigate()
  // history.state.idx is React Router's position in this tab's history: 0 means nothing to go back to.
  const canGoBack = (window.history.state?.idx ?? 0) > 0

  return (
    <div className="topbar">
      <button type="button" className="back" onClick={() => (canGoBack ? navigate(-1) : navigate('/body'))}>
        ← Back
      </button>
      <nav aria-label="Breadcrumb">
        <ol className="crumbs">
          <li>
            <Link to="/body">Whole body</Link>
          </li>
          {trail.map((crumb, i) => (
            <li key={crumb.label}>
              {i < trail.length - 1 && crumb.to ? (
                <Link to={crumb.to}>{crumb.label}</Link>
              ) : (
                <span aria-current="page">{crumb.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  )
}
