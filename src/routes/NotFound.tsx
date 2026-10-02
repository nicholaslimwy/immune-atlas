import { Link } from 'react-router'
import { useDocumentTitle } from '../components/useDocumentTitle.ts'

export default function NotFound() {
  useDocumentTitle('Not found')
  return (
    <main id="main">
      <h1>Not found</h1>
      <p>
        There is nothing at this address. <Link to="/body">Back to the whole body</Link>
      </p>
    </main>
  )
}
