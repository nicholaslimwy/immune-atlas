import { Link, useNavigate } from 'react-router'

/** Back button and breadcrumbs for the glossary pages: Whole body > Glossary [> entry]. */
export default function GlossaryTopbar({ entry }: { entry?: string }) {
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
          <li>{entry ? <Link to="/glossary">Glossary</Link> : <span aria-current="page">Glossary</span>}</li>
          {entry && (
            <li>
              <span aria-current="page">{entry}</span>
            </li>
          )}
        </ol>
      </nav>
    </div>
  )
}
