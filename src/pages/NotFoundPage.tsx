import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return <div className="page-width empty-results"><Compass /><h1>That path is not on this map.</h1><Link className="button primary" to="/">Return home</Link></div>
}
