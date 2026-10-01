import { Link } from 'react-router'

export default function NotFound() {
  return (
    <main>
      <h1>Not found</h1>
      <p>
        There is nothing at this address. <Link to="/body">Back to the whole body</Link>
      </p>
    </main>
  )
}
