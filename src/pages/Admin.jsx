import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, GraduationCap, LogOut, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Button, Card, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { loadAdminDashboard } from '../features/admin/service'

const sections = [
  ['Overview', BarChart3],
  ['Student Management', Users],
  ['Space Management', Sparkles],
  ['Reports / Moderation', ShieldCheck],
]

export default function Admin({ denied = false }) {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('Overview')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (denied) return
    let active = true
    setBusy(true)
    loadAdminDashboard(profile?.campus || '').then(result => {
      if (active) setData(result)
    }).catch(reason => {
      if (active) setError(reason.message || 'Dashboard data could not be loaded.')
    }).finally(() => {
      if (active) setBusy(false)
    })
    return () => { active = false }
  }, [denied, profile?.campus])

  const logout = async () => {
    await signOut()
    navigate('/')
  }

  if (denied) return <main className="grid min-h-screen place-items-center bg-background p-5">
    <Card className="w-full max-w-lg text-center">
      <ShieldCheck className="mx-auto mb-4 text-danger" size={34}/>
      <h1 className="text-2xl font-bold">Administrator access required</h1>
      <p className="my-3 text-muted">This account does not have the trusted administrator claim.</p>
      <div className="flex flex-wrap justify-center gap-2"><Link to="/discover"><Button>Go to student campus</Button></Link><Button variant="secondary" onClick={logout}>Sign out</Button></div>
    </Card>
  </main>

  return <div className="min-h-screen bg-background md:flex">
    <aside className="border-b border-line bg-surface p-4 md:fixed md:inset-y-0 md:w-72 md:border-b-0 md:border-r md:p-6">
      <Link to="/admin" className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-white"><GraduationCap size={23}/></span><span><b className="block text-lg text-primary">CampusConnect</b><small className="text-muted">Admin workspace</small></span></Link>
      <nav className="mt-6 flex gap-2 overflow-x-auto md:flex-col" aria-label="Admin dashboard sections">
        {sections.map(([name, Icon]) => <button key={name} onClick={() => setSection(name)} aria-current={section === name ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium md:w-full ${section === name ? 'bg-primary text-white' : 'text-muted hover:bg-primary-50 hover:text-primary'}`}><Icon size={18}/>{name}</button>)}
      </nav>
      <div className="mt-5 flex items-center justify-between border-t border-line pt-4 md:absolute md:inset-x-6 md:bottom-6"><span className="min-w-0"><b className="block truncate text-sm">{user?.displayName || 'Administrator'}</b><small className="block truncate text-muted">{user?.email}</small></span><button onClick={logout} aria-label="Sign out" className="rounded-lg p-2 text-muted hover:bg-primary-50 hover:text-danger"><LogOut size={18}/></button></div>
    </aside>
    <main className="min-w-0 flex-1 p-4 sm:p-7 md:ml-72 md:p-10">
      <header className="mb-7"><p className="text-sm font-semibold uppercase tracking-wider text-berry">Administrator</p><h1 className="mt-1 text-3xl font-bold">{section}</h1><p className="mt-2 text-muted">Campus operations and community health.</p></header>
      {busy ? <Spinner/> : error ? <Card role="alert" className="border-danger/30"><h2 className="font-semibold">Dashboard data unavailable</h2><p className="mt-2 text-sm text-muted">{error}</p></Card> : <SectionContent section={section} data={data || { students: [], spaces: [] }}/ >}
    </main>
  </div>
}

function SectionContent({ section, data }) {
  if (section === 'Overview') return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <Stat title="Discoverable students" value={data.students.length} detail="Public directory profiles only" icon={Users}/>
    <Stat title="Spaces available to this account" value={data.spaces.length} detail="Public Spaces and campus Spaces permitted by rules" icon={Sparkles}/>
    <Card className="sm:col-span-2 xl:col-span-1"><h2 className="font-semibold">Reports / Moderation</h2><p className="mt-2 text-sm text-muted">Report records and moderation queues are unavailable to this frontend under the current Firestore rules.</p></Card>
  </div>

  if (section === 'Student Management') return <Card><h2 className="font-semibold">Public directory</h2><p className="mt-2 text-sm text-muted">Private student profiles and account management are not available to administrators under the current Firestore rules. This list contains only discoverable public profiles.</p>
    {data.students.length ? <ul className="mt-4 divide-y divide-line">{data.students.map(student => <li key={student.uid} className="flex items-center justify-between gap-3 py-3"><span className="truncate font-medium">{student.name || 'Campus member'}</span><span className="shrink-0 text-sm text-muted">{student.campus || 'Campus not set'}</span></li>)}</ul> : <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted">No discoverable student profiles are available.</p>}
  </Card>

  if (section === 'Space Management') return <Card><h2 className="font-semibold">Spaces visible to this account</h2><p className="mt-2 text-sm text-muted">Management actions are unavailable. Firestore currently permits reading public Spaces and campus Spaces matching this administrator profile.</p>
    {data.spaces.length ? <ul className="mt-4 divide-y divide-line">{data.spaces.map(space => <li key={space.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="font-medium">{space.name || 'Untitled Space'}</span><span className="text-sm text-muted">{space.category || 'General'} · {space.campus || 'Campus not set'}</span></li>)}</ul> : <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted">No readable Spaces were found.</p>}
  </Card>

  return <Card><h2 className="font-semibold">Reports and moderation unavailable</h2><p className="mt-2 text-sm text-muted">The current backend rules do not expose a reports collection or report moderation operations. No sample reports or moderation actions are shown.</p></Card>
}

function Stat({ title, value, detail, icon: Icon }) {
  return <Card><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted">{title}</p><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-2 text-xs text-muted">{detail}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary"><Icon size={19}/></span></div></Card>
}
