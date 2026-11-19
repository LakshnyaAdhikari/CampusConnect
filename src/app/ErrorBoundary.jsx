
import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  state = {
    error: null,
    errorInfo: null
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('CampusConnect Runtime Error:', error)
    console.error('Component Stack:', errorInfo.componentStack)

    this.setState({ errorInfo })
  }

  render() {
    if (this.state.error) {
      return (
        <main className="grid min-h-screen place-items-center p-6">
          <section className="w-full max-w-2xl rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold">This page hit a snag</h1>

            <p className="mt-3 text-rose">
              {this.state.error.message}
            </p>

            {import.meta.env.DEV && (
              <pre className="mt-4 max-h-80 overflow-auto rounded-xl bg-background p-3 text-left text-xs">
                {this.state.errorInfo?.componentStack || 'Component stack unavailable'}
              </pre>
            )}

            <div className="mt-6 flex justify-center gap-3">
              <button
                className="rounded-xl bg-primary px-4 py-2 text-white"
                onClick={() => window.location.reload()}
              >
                Reload page
              </button>

              <Link
                className="rounded-xl bg-primary-50 px-4 py-2 text-primary"
                to="/discover"
              >
                Go to Discover
              </Link>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
