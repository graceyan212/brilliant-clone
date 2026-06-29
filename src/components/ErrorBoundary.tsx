import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean }

// Catches render-time and lazy-chunk-load failures so the app degrades to a
// friendly, recoverable message instead of a blank white screen. Especially
// relevant now that StepRenderer is code-split: a dropped network request while
// fetching the lesson chunk would otherwise leave nothing on screen.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled error in app:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell notice-shell">
          <section className="notice">
            <h1>Something went wrong</h1>
            <p>The page hit an unexpected error. Reloading usually fixes it.</p>
            <div className="notice__actions">
              <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
                Reload
              </button>
            </div>
          </section>
        </main>
      )
    }
    return this.props.children
  }
}
