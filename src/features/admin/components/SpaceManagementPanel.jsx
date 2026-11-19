import { useEffect, useState } from 'react'
import { Eye, LockKeyhole, Power, Sparkles } from 'lucide-react'
import { Button, Card, Modal, Select } from '../../../components/ui'
import { getSpaceDetails, getSpaceStats, listSpaces, updateSpaceActiveStatus } from '../service'
import { EmptyPanel, ErrorPanel, Field, LoadingPanel, Pagination, SectionIntro, formatAdminDate } from './AdminUI'

const CATEGORIES = ['Tech & Coding', 'Design & Creative', 'Study & Exams', 'Campus Life']

export default function SpaceManagementPanel({ expectedUid, campus: adminCampus }) {
  const [filters, setFilters] = useState({ category: '', campus: '', visibility: 'all', pageSize: 25 })
  const [cursorHistory, setCursorHistory] = useState([null])
  const [page, setPage] = useState(0)
  const [spaces, setSpaces] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [space, setSpace] = useState(null)
  const [stats, setStats] = useState(null)
  const [detailsBusy, setDetailsBusy] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusError, setStatusError] = useState('')

  const changeFilter = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }))
    setCursorHistory([null])
    setPage(0)
  }
  const cursor = cursorHistory[page] || null

  useEffect(() => {
    let active = true
    setBusy(true)
    setError('')
    listSpaces({ ...filters, cursor }, expectedUid).then(result => {
      if (!active) return
      setSpaces(result.items)
      setNextCursor(result.nextCursor)
    }).catch(reason => {
      if (!active) return
      setSpaces([])
      setNextCursor(null)
      setError(reason.message || 'Visible Spaces could not be loaded.')
    }).finally(() => {
      if (active) setBusy(false)
    })
    return () => { active = false }
  }, [filters, cursor, expectedUid])

  useEffect(() => {
    if (!selectedId) return undefined
    let active = true
    setDetailsBusy(true)
    setDetailsError('')
    setSpace(null)
    setStats(null)
    Promise.all([
      getSpaceDetails(selectedId, expectedUid),
      getSpaceStats(selectedId, expectedUid),
    ]).then(([details, spaceStats]) => {
      if (!active) return
      setSpace(details)
      setStats(spaceStats)
    }).catch(reason => {
      if (active) setDetailsError(reason.message || 'Space details could not be loaded.')
    }).finally(() => {
      if (active) setDetailsBusy(false)
    })
    return () => { active = false }
  }, [selectedId, expectedUid])

  const goNext = () => {
    if (!nextCursor) return
    setCursorHistory(current => [...current.slice(0, page + 1), nextCursor])
    setPage(value => value + 1)
  }

  const changeSpaceStatus = async () => {
    if (!space || statusBusy) return
    const nextIsActive = !space.isActive
    if (space.isActive && !window.confirm(`Deactivate “${space.name || 'this Space'}”? Its membership and content will remain unchanged.`)) return

    setStatusBusy(true)
    setStatusError('')
    try {
      const refreshedSpace = await updateSpaceActiveStatus(space.id, nextIsActive, expectedUid)
      setSpace(refreshedSpace)
      setSpaces(current => current.map(item => item.id === refreshedSpace.id
        ? { ...item, isActive: refreshedSpace.isActive }
        : item))
    } catch (reason) {
      setStatusError(reason.message || 'Space status could not be updated.')
    } finally {
      setStatusBusy(false)
    }
  }

  return <div className="space-y-5">
    <Card>
      <SectionIntro title="Visible Spaces" description="Read-only directory of public Spaces and matching-campus Spaces. Private Spaces are not listed." action={<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-berry"><LockKeyhole size={14} /> Read only</span>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Category"><Select value={filters.category} onChange={event => changeFilter('category', event.target.value)}><option value="">All categories</option>{CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}</Select></Field>
        <Field label="Campus"><Select value={filters.campus} onChange={event => changeFilter('campus', event.target.value)}><option value="">All visible campuses</option>{adminCampus && <option value={adminCampus}>{adminCampus}</option>}</Select></Field>
        <Field label="Visibility"><Select value={filters.visibility} onChange={event => changeFilter('visibility', event.target.value)}><option value="all">Public and my campus</option><option value="public">Public</option><option value="campus" disabled={!adminCampus}>My campus</option></Select></Field>
        <Field label="Rows per page"><Select value={filters.pageSize} onChange={event => changeFilter('pageSize', Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></Select></Field>
      </div>
      {!adminCampus && <p className="mt-3 text-xs text-muted">No administrator campus is available; only public Spaces can be listed.</p>}
    </Card>

    {error ? <ErrorPanel title="Space directory unavailable" message={error} onRetry={() => setFilters(current => ({ ...current }))} />
      : busy ? <LoadingPanel label="Loading visible Spaces" />
        : spaces.length ? <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-ink dark:text-[#F4F4F6]">Space directory</h2><span className="text-xs text-muted dark:text-[#A1A1B0]">Page {page + 1} · {spaces.length} shown</span></div>
          <ul className="divide-y divide-line/70 dark:divide-[#2E2E3A]">
            {spaces.map(item => <li key={item.id} className="flex flex-wrap items-center gap-3 py-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-white"><Sparkles size={20} /></span>
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink dark:text-[#F4F4F6]">{item.name || 'Untitled Space'}</p><p className="truncate text-sm text-muted dark:text-[#A1A1B0]">{item.category || 'General'} · {item.campus || 'Campus not set'} · {visibilityLabel(item.visibility)}</p></div>
              <span className="text-xs text-muted dark:text-[#A1A1B0]">{item.memberCount} members</span>
              <StatusBadge isActive={item.isActive} />
              <Button variant="secondary" className="inline-flex items-center gap-2" onClick={() => setSelectedId(item.id)}><Eye size={15} /> Details</Button>
            </li>)}
          </ul>
          <div className="mt-3"><Pagination page={page} hasPrevious={page > 0} hasNext={Boolean(nextCursor)} onPrevious={() => setPage(value => Math.max(0, value - 1))} onNext={goNext} busy={busy} /></div>
        </Card>
          : <EmptyPanel title="No visible Spaces match these filters"><p>Only public and matching-campus Spaces are included.</p></EmptyPanel>}

    <Modal open={Boolean(selectedId)} onClose={() => setSelectedId('')} title="Space details">
      {detailsBusy ? <LoadingPanel label="Loading Space details and statistics" />
        : detailsError ? <p role="alert" className="text-sm text-danger">{detailsError}</p>
          : space ? <div className="space-y-4">
            <div><h3 className="text-xl font-bold text-ink dark:text-[#F4F4F6]">{space.name || 'Untitled Space'}</h3><p className="mt-1 text-sm text-muted dark:text-[#A1A1B0]">{space.category} · {space.campus} · {visibilityLabel(space.visibility)}</p></div>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/60 p-3 dark:border-[#2E2E3A]">
              <div><p className="text-sm font-semibold text-ink dark:text-[#F4F4F6]">Space status</p><p className="mt-1 text-xs text-muted dark:text-[#A1A1B0]">This status does not alter visibility, membership, or existing content.</p></div>
              <div className="flex items-center gap-2"><StatusBadge isActive={space.isActive} /><Button type="button" variant={space.isActive ? 'secondary' : 'primary'} loading={statusBusy} disabled={statusBusy} className="inline-flex items-center gap-2" onClick={changeSpaceStatus}><Power size={15} />{space.isActive ? 'Deactivate Space' : 'Activate Space'}</Button></div>
              {statusError && <p role="alert" className="w-full text-sm text-danger">{statusError}</p>}
            </div>
            <DetailBox label="Description" value={space.description || 'No description provided.'} />
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailBox label="Members" value={stats ? String(stats.memberCount) : 'Unavailable'} />
              <DetailBox label="Total posts" value={stats ? String(stats.postCount) : 'Unavailable'} />
              <DetailBox label="Latest post" value={stats ? formatAdminDate(stats.latestPostAt) : 'Unavailable'} />
              <DetailBox label="Recent posts returned" value={stats ? String(stats.recentPostCount) : 'Unavailable (up to 5)'} />
              <DetailBox label="Active members" value="Unavailable · no activity window in schema" />
              <DetailBox label="Created" value={formatAdminDate(space.createdAt)} />
            </div>
            <p className="text-xs text-muted dark:text-[#A1A1B0]">Details and statistics are read-only. Space posts and private membership data are not included.</p>
          </div>
            : <p className="text-sm text-muted">This Space is no longer visible or is unavailable.</p>}
    </Modal>
  </div>
}

function DetailBox({ label, value }) {
  return <div className="rounded-xl border border-line/60 bg-background p-3 dark:border-[#2E2E3A] dark:bg-[#23232E]"><p className="text-[11px] font-bold uppercase tracking-wide text-muted dark:text-[#A1A1B0]">{label}</p><p className="mt-1 break-words text-sm font-medium text-ink dark:text-[#F4F4F6]">{value}</p></div>
}

function StatusBadge({ isActive }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
    {isActive ? 'Active' : 'Inactive'}
  </span>
}

function visibilityLabel(visibility) {
  if (visibility === 'public') return 'Public'
  if (visibility === 'private') return 'Private'
  return 'Campus'
}
