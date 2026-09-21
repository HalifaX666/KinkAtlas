import { Component, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  hasError: boolean
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return <div className="page-width empty-results app-error-boundary">
      <h1>Something went wrong.</h1>
      <p>KinkAtlas doesn’t send your assessment data anywhere. Reloading will restart the current session.</p>
      <div className="empty-results-actions"><a className="button primary" href="/">Return home</a><button type="button" className="button secondary" onClick={() => window.location.reload()}>Reload and restart</button></div>
    </div>
    return this.props.children
  }
}
