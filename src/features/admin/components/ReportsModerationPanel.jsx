import { useEffect, useState } from 'react'
import { Check, Clock3, Eye, Flag, ShieldCheck, X } from 'lucide-react'
import { Button, Card, Input, Modal, Select, Textarea } from '../../../components/ui'
import { listReportPage, getReportHistory, updateReportStatus, addModeratorNote, REPORT_CATEGORIES, REPORT_STATUSES } from '../service'
import { EmptyPanel, ErrorPanel, Field, LoadingPanel, Pagination, SectionIntro, formatAdminDate } from './AdminUI'

const defaultFilters = { status: '', category: '', startDate: '', endDate: '', pageSize: 25 }

export default function ReportsModerationPanel({ expectedUid }) {
  const [filters, setFilters] = useState(defaultFilters)
  const [cursorHistory, setCursorHistory] = useState([null])
  const [page, setPage] = useState(0)
  const [reports, setReports] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState('')
  const [history, setHistory] = useState(null)
  const [detailBusy, setDetailBusy] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [note, setNote] = useState('')
  const [noteBusy, setNoteBusy] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [statusBusy, setStatusBusy] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [confirmStatus, setConfirmStatus] = useState('')

  const changeFilter = (key, value) => {
    setFilters(current => ({ ...current, [key]: value }))
    setCursorHistory([null])
    setPage(0)
  }
  const cursor = cursorHistory[page] || null

  const refresh = () => setReloadKey(value => value + 1)
  useEffect(() => {
    let active = true
    setBusy(true)
    setError('')
    listReportPage({ ...filters, cursor }, expectedUid).then(result => {
      if (!active) return
      setReports(result.items)
      setNextCursor(result.nextCursor)
    }).catch(reason => {
      if (!active) return
      setReports([])
      setNextCursor(null)
      setError(reason.message || 'Reports could not be loaded.')
    }).finally(() => {
      if (active) setBusy(false)
    })
    return () => { active = false }
  }, [filters, cursor, expectedUid, reloadKey])

  useEffect(() => {
    if (!selectedId) return undefined
    let active = true
    setDetailBusy(true)
    setDetailError('')
    setNoteError('')
    setStatusError('')
    setHistory(null)
    getReportHistory(selectedId, expectedUid).then(result => {
      if (active) setHistory(result)
    }).catch(reason => {
      if (active) setDetailError(reason.message || 'Report details and notes could not be loaded.')
    }).finally(() => {
      if (active) setDetailBusy(false)
    })
    return () => { active = false }
  }, [selectedId, expectedUid])

  const goNext = () => {
    if (!nextCursor) return
    setCursorHistory(current => [...current.slice(0, page + 1), nextCursor])
    setPage(value => value + 1)
  }

  const loadHistory = async () => {
    if (!selectedId) return
    setDetailError('')
    try {
      setHistory(await getReportHistory(selectedId, expectedUid))
    } catch (reason) {
      setDetailError(reason.message || 'Report details and notes could not be refreshed.')
    }
  }

  const saveNote = async event => {
    event.preventDefault()
    if (!selectedId || !note.trim() || note.trim().length > 1000) return
    setNoteBusy(true)
    setNoteError('')
    try {
      await addModeratorNote(selectedId, note, expectedUid)
      setNote('')
      await loadHistory()
    } catch (reason) {
      setNoteError(reason.message || 'The private note could not be saved.')
    } finally {
      setNoteBusy(false)
    }
  }

  const updateStatus = async status => {
    if (!selectedId || !history?.report) return
    setStatusBusy(true)
    setStatusError('')
    try {
      await updateReportStatus(selectedId, status, expectedUid)
      await Promise.all([loadHistory(), Promise.resolve(refresh())])
      setConfirmStatus('')
    } catch (reason) {
      setStatusError(reason.message || 'The report status could not be updated.')
    } finally {
      setStatusBusy(false)
    }
  }

  const clearFilters = () => {
    setFilters(defaultFilters)
    setCursorHistory([null])
    setPage(0)
  }

  const pendingAction = confirmStatus === 'resolved' ? 'resolve' : 'dismiss'

  return <div className="space-y-5">
    <Card>
      <SectionIntro title="Submitted reports" description="Review student reports about public profiles and non-private Spaces or posts." action={<span className="inline-flex items-center gap-1.5 text-xs font-semibold text-berry"><ShieldCheck size={14} /> Trusted admin access</span>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Field label="Status"><Select value={filters.status} onChange={event => changeFilter('status', event.target.value)}><option value="">All statuses</option>{REPORT_STATUSES.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</Select></Field>
        <Field label="Category"><Select value={filters.category} onChange={event => changeFilter('category', event.target.value)}><option value="">All categories</option>{REPORT_CATEGORIES.map(category => <option key={category.value} value={category.value}>{category.label}</option>)}</Select></Field>
        <Field label="From"><Input type="date" value={filters.startDate} max={filters.endDate || undefined} onChange={event => changeFilter('startDate', event.target.value)} /></Field>
        <Field label="To"><Input type="date" value={filters.endDate} min={filters.startDate || undefined} onChange={event => changeFilter('endDate', event.target.value)} /></Field>
        <Field label="Rows per page"><Select value={filters.pageSize} onChange={event => changeFilter('pageSize', Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></Select></Field>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-5">
          <Button type="button" variant="secondary" onClick={clearFilters}>Clear filters</Button>
          <Button type="button" variant="ghost" onClick={refresh}>Refresh</Button>
        </div>
      </div>
    </Card>

    {error ? <ErrorPanel title="Reports unavailable" message={error} onRetry={refresh} />
      : busy ? <LoadingPanel label="Loading reports" />
        : reports.length ? <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-ink dark:text-[#F4F4F6]">Reports</h2><span className="text-xs text-muted dark:text-[#A1A1B0]">Page {page + 1} · {reports.length} shown</span></div>
          <ul className="divide-y divide-line/70 dark:divide-[#2E2E3A]">
            {reports.map(report => <li key={report.id}>
              <button type="button" onClick={() => { setNote(''); setSelectedId(report.id) }} className="flex w-full flex-wrap items-center gap-3 rounded-xl py-4 text-left transition hover:bg-background dark:hover:bg-[#23232E]">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary dark:bg-[#23232E] dark:text-[#E59858]"><Flag size={18} /></span>
                <span className="min-w-0 flex-1"><b className="block truncate text-sm text-ink dark:text-[#F4F4F6]">{categoryLabel(report.category)} · {report.targetType}</b><small className="block truncate text-muted dark:text-[#A1A1B0]">{targetReference(report)} · {formatAdminDate(report.createdAt)}</small></span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${report.status === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-[#20382D] dark:text-[#A8D5B5]' : report.status === 'dismissed' ? 'bg-primary-50 text-muted dark:bg-[#23232E] dark:text-[#A1A1B0]' : 'bg-[#FFEDDA] text-berry dark:bg-[#2E2E3A] dark:text-[#E59858]'}`}>{statusLabel(report.status)}</span>
                <Eye size={16} className="shrink-0 text-muted" />
              </button>
            </li>)}
          </ul>
          <div className="mt-3"><Pagination page={page} hasPrevious={page > 0} hasNext={Boolean(nextCursor)} onPrevious={() => setPage(value => Math.max(0, value - 1))} onNext={goNext} busy={busy} /></div>
        </Card>
          : <EmptyPanel title={filters.status || filters.category || filters.startDate || filters.endDate ? 'No reports match these filters' : 'There are no submitted reports'}><p>Reports use cursor-based pages; filters are applied by Firestore.</p></EmptyPanel>}

    <Modal open={Boolean(selectedId) && !confirmStatus} onClose={() => { if (!detailBusy && !statusBusy && !noteBusy) setSelectedId('') }} title="Report details">
      {detailBusy ? <LoadingPanel label="Loading report details and moderation history" />
        : detailError ? <ErrorPanel title="Report details unavailable" message={detailError} onRetry={loadHistory} />
          : history?.report ? <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailBox label="Report ID" value={history.report.id} />
              <DetailBox label="Status" value={statusLabel(history.report.status)} />
              <DetailBox label="Category" value={categoryLabel(history.report.category)} />
              <DetailBox label="Submitted" value={formatAdminDate(history.report.createdAt)} />
              <DetailBox label="Reporter UID" value={history.report.reporterUid} />
              <DetailBox label="Target" value={targetReference(history.report)} />
            </div>
            <DetailBox label="Reason" value={history.report.reason} />

            <div>
              <div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-semibold text-ink dark:text-[#F4F4F6]">Private moderator notes</h3><Button type="button" variant="ghost" className="text-xs" onClick={loadHistory}>Refresh notes</Button></div>
              {history.notes.length ? <ul className="space-y-2">{history.notes.map(item => <li key={item.id} className="rounded-xl border border-line/60 bg-background p-3 dark:border-[#2E2E3A] dark:bg-[#23232E]"><p className="whitespace-pre-wrap break-words text-sm text-ink dark:text-[#F4F4F6]">{item.note}</p><small className="mt-2 block text-muted dark:text-[#A1A1B0]">{item.authorUid} · {formatAdminDate(item.createdAt)}</small></li>)}</ul>
                : <p className="rounded-xl bg-background p-3 text-sm text-muted dark:bg-[#23232E] dark:text-[#A1A1B0]">No private moderator notes.</p>}
            </div>

            <form onSubmit={saveNote} className="space-y-2">
              <Field label="Add a private note"><Textarea rows={3} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Internal note visible only to administrators" /></Field>
              <div className="flex flex-wrap items-center justify-between gap-2"><span className={`text-xs ${note.length > 1000 ? 'text-danger' : 'text-muted dark:text-[#A1A1B0]'}`}>{note.length}/1000 characters</span><Button type="submit" variant="secondary" loading={noteBusy} disabled={!note.trim() || note.trim().length > 1000}>Save private note</Button></div>
              {noteError && <p role="alert" className="text-sm text-danger">{noteError}</p>}
            </form>

            <div className="rounded-xl border border-dashed border-line p-3 dark:border-[#2E2E3A]">
              <div className="flex items-center gap-2 text-sm font-semibold text-ink dark:text-[#F4F4F6]"><Clock3 size={16} /> Moderation history</div>
              <p className="mt-1 text-xs text-muted dark:text-[#A1A1B0]">{history.statusHistorySupported ? `${history.statusHistory.length} status events` : 'Status-change history is unavailable; only current status and private notes are stored.'}</p>
            </div>

            {statusError && <p role="alert" className="text-sm text-danger">{statusError}</p>}
            {['pending', 'under_review'].includes(history.report.status) && <div className="flex flex-wrap justify-end gap-2 border-t border-line/70 pt-4 dark:border-[#2E2E3A]">
              {history.report.status === 'pending' && <Button type="button" variant="secondary" loading={statusBusy} disabled={statusBusy} onClick={() => updateStatus('under_review')}>Mark under review</Button>}
              <Button type="button" variant="secondary" disabled={statusBusy} onClick={() => setConfirmStatus('dismissed')}><X size={15} className="mr-1 inline" /> Dismiss</Button>
              <Button type="button" disabled={statusBusy} onClick={() => setConfirmStatus('resolved')}><Check size={15} className="mr-1 inline" /> Resolve</Button>
            </div>}
          </div>
            : <p className="text-sm text-muted">This report is unavailable.</p>}
    </Modal>

    <Modal open={Boolean(confirmStatus)} onClose={() => { if (!statusBusy) setConfirmStatus('') }} title={`Confirm ${pendingAction}`}>
      <p className="text-sm text-muted dark:text-[#A1A1B0]">{confirmStatus === 'resolved' ? 'Mark this report as resolved?' : 'Dismiss this report?'} This changes the report status and records this administrator as reviewer.</p>
      {statusError && <p role="alert" className="mt-3 text-sm text-danger">{statusError}</p>}
      <div className="mt-5 flex justify-end gap-2"><Button type="button" variant="ghost" disabled={statusBusy} onClick={() => setConfirmStatus('')}>Cancel</Button><Button type="button" variant={confirmStatus === 'dismissed' ? 'danger' : 'primary'} loading={statusBusy} onClick={() => updateStatus(confirmStatus)}>Confirm {pendingAction}</Button></div>
    </Modal>
  </div>
}

function DetailBox({ label, value }) {
  return <div className="min-w-0 rounded-xl border border-line/60 bg-background p-3 dark:border-[#2E2E3A] dark:bg-[#23232E]"><p className="text-[11px] font-bold uppercase tracking-wide text-muted dark:text-[#A1A1B0]">{label}</p><p className="mt-1 break-words text-sm font-medium text-ink dark:text-[#F4F4F6]">{value || '—'}</p></div>
}

function categoryLabel(value) {
  return REPORT_CATEGORIES.find(item => item.value === value)?.label || String(value || 'Other')
}

function statusLabel(value) {
  return String(value || '').replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase())
}

function targetReference(report) {
  if (report.targetType === 'post') return `Space ${report.spaceId} · post ${report.targetId}`
  return `${report.targetType} ${report.targetId}`
}
