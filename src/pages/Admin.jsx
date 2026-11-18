import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BarChart3, GraduationCap, LogOut, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Button, Card, Modal, Select, Spinner, Textarea } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { listModerationNotes, listReports, loadAdminDashboard, REPORT_CATEGORIES, REPORT_STATUSES, updateReport } from '../features/admin/service'

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
    if (denied) return undefined
    let active = true
    setBusy(true)
    setError('')
    loadAdminDashboard(profile?.campus || '').then(result => {
      if (active) setData(result)
    }).catch(reason => {
      if (import.meta.env.DEV) {
        console.error('[Admin Dashboard] loadAdminDashboard authorization failed', {
          code: reason?.code || 'unknown',
          message: reason?.message || String(reason),
        }, reason)
      }
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
      {section === 'Reports / Moderation'
        ? <ReportsModeration />
        : busy
          ? <Spinner/>
          : error
            ? <Card role="alert" className="border-danger/30"><h2 className="font-semibold">Dashboard data unavailable</h2><p className="mt-2 text-sm text-muted">{error}</p></Card>
            : <SectionContent section={section} data={data || { students: [], spaces: [], errors: {} }}/ >}
    </main>
  </div>
}

function SectionContent({ section, data }) {
  if (section === 'Overview') return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    <Stat title="Discoverable students" value={data.errors.students ? 'Unavailable' : data.students.length} detail={data.errors.students ? 'The public directory query failed.' : 'Public directory profiles only'} icon={Users}/>
    <Stat title="Readable public and campus Spaces" value={data.errors.publicSpaces || data.errors.campusSpaces ? 'Unavailable' : data.spaces.length} detail={data.errors.publicSpaces || data.errors.campusSpaces ? 'One or more permitted Space queries failed.' : 'Only Spaces exposed to this account by existing rules'} icon={Sparkles}/>
    <Card className="sm:col-span-2 xl:col-span-1"><h2 className="font-semibold">Reports / Moderation</h2><p className="mt-2 text-sm text-muted">Open the moderation section to review real submitted reports.</p></Card>
  </div>

  if (section === 'Student Management') return <Card><h2 className="font-semibold">Public directory</h2><p className="mt-2 text-sm text-muted">Private student profiles and account management are not available here. This read-only list contains only discoverable public profiles.</p>
    {data.errors.students ? <p className="mt-4 rounded-xl bg-background p-4 text-sm text-danger">Public directory unavailable: {data.errors.students.message}</p> : data.students.length ? <ul className="mt-4 divide-y divide-line">{data.students.map(student => <li key={student.uid} className="flex items-center justify-between gap-3 py-3"><span className="truncate font-medium">{student.name || 'Campus member'}</span><span className="shrink-0 text-sm text-muted">{student.campus || 'Campus not set'}</span></li>)}</ul> : <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted">No discoverable student profiles are available.</p>}
  </Card>

  if (section === 'Space Management') return <Card><h2 className="font-semibold">Spaces visible to this account</h2><p className="mt-2 text-sm text-muted">Read-only list of public and matching-campus Spaces. Space management actions are not implemented here.</p>
    {(data.errors.publicSpaces || data.errors.campusSpaces) && <p className="mt-4 rounded-xl bg-background p-4 text-sm text-danger">{[data.errors.publicSpaces, data.errors.campusSpaces].filter(Boolean).map(item => `${item.operation}: ${item.message}`).join(' ')}</p>}
    {data.spaces.length ? <ul className="mt-4 divide-y divide-line">{data.spaces.map(space => <li key={space.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="font-medium">{space.name || 'Untitled Space'}</span><span className="text-sm text-muted">{space.category || 'General'} · {space.campus || 'Campus not set'}</span></li>)}</ul> : !(data.errors.publicSpaces || data.errors.campusSpaces) && <p className="mt-4 rounded-xl bg-background p-4 text-sm text-muted">No readable Spaces were found.</p>}
  </Card>

  return null
}

function ReportsModeration() {
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [note, setNote] = useState('')
  const [notes, setNotes] = useState([])
  const [notesBusy, setNotesBusy] = useState(false)
  const [notesError, setNotesError] = useState('')

  const refresh = async () => {
    setBusy(true)
    setError('')
    try {
      setReports(await listReports())
    } catch (reason) {
      if (import.meta.env.DEV) {
        console.error('[Reports] listReports failed in dashboard', {
          code: reason?.code || 'unknown',
          message: reason?.message || String(reason),
        }, reason)
      }
      setError(reason.message || 'Reports could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => reports.filter(report =>
    (statusFilter === 'all' || report.status === statusFilter)
      && (categoryFilter === 'all' || report.category === categoryFilter)),
  [reports, statusFilter, categoryFilter])

  const openDetails = async report => {
    setSelected(report)
    setNote('')
    setNotes([])
    setNotesError('')
    setNotesBusy(true)
    try {
      setNotes(await listModerationNotes(report.id))
    } catch (reason) {
      setNotesError(reason.message || 'Moderation notes could not be loaded.')
    } finally {
      setNotesBusy(false)
    }
  }

  const moderate = async status => {
    if (!selected) return
    setSaving(true)
    setError('')
    try {
      await updateReport(selected.id, { status, moderatorNote: note })
      const rows = await listReports()
      setReports(rows)
      setSelected(rows.find(report => report.id === selected.id) || null)
      setNote('')
      try {
        setNotes(await listModerationNotes(selected.id))
        setNotesError('')
      } catch (reason) {
        setNotesError(reason.message || 'Moderation notes could not be refreshed.')
      }
    } catch (reason) {
      if (import.meta.env.DEV) {
        console.error(`[Reports] moderate report ${selected.id} failed`, {
          code: reason?.code || 'unknown',
          message: reason?.message || String(reason),
        }, reason)
      }
      setError(reason.message || 'The report could not be updated.')
    } finally {
      setSaving(false)
    }
  }

  if (busy) return <Spinner/>
  if (error && reports.length === 0) return <Card role="alert" className="border-danger/30"><h2 className="font-semibold">Reports unavailable</h2><p className="mt-2 text-sm text-muted">{error}</p><Button className="mt-4" onClick={refresh}>Try again</Button></Card>

  return <>
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="font-semibold">Submitted reports</h2><p className="mt-1 text-sm text-muted">Review reports submitted against public profiles and non-private Spaces or posts.</p></div>
        <div className="flex flex-wrap gap-2">
          <label className="text-sm">Status<Select className="mt-1" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{REPORT_STATUSES.map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}</Select></label>
          <label className="text-sm">Category<Select className="mt-1" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}><option value="all">All categories</option>{REPORT_CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</Select></label>
          <Button type="button" variant="secondary" onClick={refresh}>Refresh</Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-sm text-danger">{error}</p>}
      {filtered.length ? <ul className="mt-4 divide-y divide-line">{filtered.map(report => <li key={report.id}>
        <button type="button" className="flex w-full flex-wrap items-center justify-between gap-3 py-4 text-left hover:bg-background" onClick={() => openDetails(report)}>
          <span className="min-w-0"><b className="block truncate">{report.category.replaceAll('_', ' ')} · {report.targetType}</b><small className="block truncate text-muted">{targetReference(report)} · {formatDate(report.createdAt)}</small></span>
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold capitalize text-primary">{report.status.replace('_', ' ')}</span>
        </button>
      </li>)}</ul> : <p className="mt-5 rounded-xl bg-background p-5 text-sm text-muted">{reports.length ? 'No reports match these filters.' : 'There are no submitted reports.'}</p>}
    </Card>
    <Modal open={Boolean(selected)} onClose={() => { if (!saving) setSelected(null) }} title="Report details">
      {selected && <div className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <Detail label="Report ID" value={selected.id}/>
          <Detail label="Status" value={selected.status.replace('_', ' ')}/>
          <Detail label="Category" value={selected.category.replaceAll('_', ' ')}/>
          <Detail label="Submitted" value={formatDate(selected.createdAt)}/>
          <Detail label="Reporter UID" value={selected.reporterUid}/>
          <Detail label="Target reference" value={targetReference(selected)}/>
        </dl>
        <div><h3 className="text-sm font-semibold">Reason</h3><p className="mt-1 whitespace-pre-wrap text-sm text-muted">{selected.reason}</p></div>
        <div><h3 className="text-sm font-semibold">Private moderator notes</h3>
          {notesBusy ? <p className="mt-1 text-sm text-muted">Loading notes…</p> : notes.length ? <ul className="mt-2 space-y-2">{notes.map(item => <li key={item.id} className="rounded-lg bg-background p-3"><p className="whitespace-pre-wrap text-sm">{item.note}</p><small className="mt-1 block text-muted">{item.authorUid} · {formatDate(item.createdAt)}</small></li>)}</ul> : <p className="mt-1 text-sm text-muted">No private moderator notes.</p>}
        </div>
        {notesError && <p role="alert" className="text-sm text-danger">{notesError}</p>}
        {['pending', 'under_review'].includes(selected.status)
          ? <label className="block text-sm font-medium">Add moderator note
            <Textarea className="mt-1" rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Optional internal moderation note"/>
          </label>
          : null}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {['pending', 'under_review'].includes(selected.status) && <div className="flex flex-wrap justify-end gap-2">
          {selected.status === 'pending' && <Button type="button" variant="secondary" disabled={saving} onClick={() => moderate('under_review')}>Mark under review</Button>}
          <Button type="button" variant="ghost" disabled={saving} onClick={() => moderate(selected.status === 'pending' ? 'under_review' : selected.status)}>{selected.status === 'pending' ? 'Start review & save note' : 'Save note'}</Button>
          <Button type="button" variant="secondary" disabled={saving} onClick={() => moderate('dismissed')}>Dismiss</Button>
          <Button type="button" disabled={saving} onClick={() => moderate('resolved')}>Resolve</Button>
        </div>}
      </div>}
    </Modal>
  </>
}

function Detail({ label, value }) {
  return <div className="min-w-0"><dt className="text-xs uppercase tracking-wide text-muted">{label}</dt><dd className="mt-1 break-all font-medium">{value || '—'}</dd></div>
}

function targetReference(report) {
  if (report.targetType === 'post') return `Space ${report.spaceId} · post ${report.targetId}`
  return `${report.targetType} ${report.targetId}`
}

function formatDate(value) {
  return value ? new Date(value).toLocaleString() : 'Date unavailable'
}

function Stat({ title, value, detail, icon: Icon }) {
  return <Card><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-muted">{title}</p><p className="mt-3 text-3xl font-bold">{value}</p><p className="mt-2 text-xs text-muted">{detail}</p></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary"><Icon size={19}/></span></div></Card>
}
