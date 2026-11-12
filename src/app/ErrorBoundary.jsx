import { Component } from 'react'
import { Link } from 'react-router-dom'

export default class ErrorBoundary extends Component {
  state={error:null}
  static getDerivedStateFromError(error){return {error}}
  render(){
    if(this.state.error)return <main className="grid min-h-screen place-items-center p-6"><section className="w-full max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-card"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary-50 text-primary">!</span><h1 className="mt-5 text-2xl font-bold">This page hit a snag</h1><p className="mt-2 text-muted">Your account and other pages are still here. Reload this view or return to Discover.</p>{import.meta.env.DEV&&<pre className="mt-4 overflow-auto rounded-xl bg-background p-3 text-left text-xs text-rose">{this.state.error.message}</pre>}<div className="mt-6 flex justify-center gap-3"><button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white" onClick={()=>window.location.reload()}>Reload page</button><Link className="rounded-xl bg-primary-50 px-4 py-2 font-semibold text-primary" to="/discover">Go to Discover</Link></div></section></main>
    return this.props.children
  }
}
