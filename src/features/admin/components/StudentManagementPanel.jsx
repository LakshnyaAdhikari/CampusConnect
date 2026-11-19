import { useEffect, useState } from 'react'
import { ArrowDownUp, Search, UserRound } from 'lucide-react'
import { Avatar, Button, Card, Input, Modal, Select } from '../../../components/ui'
import { CAMPUSES, INTERESTS, SKILLS } from '../../../lib/schema'
import { getStudentPublicProfile, listStudents } from '../service'
import { EmptyPanel, ErrorPanel, Field, LoadingPanel, Pagination, SectionIntro, formatAdminDate } from './AdminUI'

const defaultFilters = {
  namePrefix: '',
  campus: '',
  interest: '',
  skill: '',
  skillField: 'teach',
  sortBy: 'name',
  direction: 'asc',
  startDate: '',
  endDate: '',
  pageSize: 25,
}

export default function StudentManagementPanel({ expectedUid }) {
  const [filters, setFilters] = useState(defaultFilters)
  const [searchInput, setSearchInput] = useState('')
  const [cursorHistory, setCursorHistory] = useState([null])
  const [page, setPage] = useState(0)
  const [rows, setRows] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [selectedUid, setSelectedUid] = useState('')
  const [student, setStudent] = useState(null)
  const [detailBusy, setDetailBusy] = useState(false)
  const [detailError, setDetailError] = useState('')

  const changeFilter = (key, value) => {
    setFilters(current => {
      const next = { ...current, [key]: value }
      if (key === 'interest' && value) next.skill = ''
      if (key === 'skill' && value) next.interest = ''
      if ((key === 'startDate' || key === 'endDate') && value) {
        next.sortBy = 'createdAt'
        next.namePrefix = ''
      }
      if (key === 'sortBy') next.direction = value === 'createdAt' ? 'desc' : 'asc'
      return next
    })
    if ((key === 'startDate' || key === 'endDate') && value) setSearchInput('')
    setCursorHistory([null])
    setPage(0)
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.namePrefix !== searchInput.trim()) {
        const namePrefix = searchInput.trim()
        setFilters(current => ({
          ...current,
          namePrefix,
          ...(namePrefix ? { sortBy: 'name', direction: 'asc', startDate: '', endDate: '' } : {}),
        }))
        setCursorHistory([null])
        setPage(0)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput, filters.namePrefix])

  const currentCursor = cursorHistory[page] || null
  useEffect(() => {
    let active = true
    setBusy(true)
    setError('')
    const requestFilters = { ...filters, cursor: currentCursor }
    listStudents(requestFilters, expectedUid).then(result => {
      if (!active) return
      setRows(result.items)
      setNextCursor(result.nextCursor)
    }).catch(reason => {
      if (!active) return
      setRows([])
      setNextCursor(null)
      setError(reason.message || 'The public student directory could not be loaded.')
    }).finally(() => {
      if (active) setBusy(false)
    })
    return () => { active = false }
  }, [filters, expectedUid, currentCursor])

  useEffect(() => {
    if (!selectedUid) return undefined
    let active = true
    setDetailBusy(true)
    setDetailError('')
    setStudent(null)
    getStudentPublicProfile(selectedUid, expectedUid).then(result => {
      if (active) setStudent(result)
    }).catch(reason => {
      if (active) setDetailError(reason.message || 'This public profile could not be loaded.')
    }).finally(() => {
      if (active) setDetailBusy(false)
    })
    return () => { active = false }
  }, [selectedUid, expectedUid])

  const resetFilters = () => {
    setFilters(defaultFilters)
    setSearchInput('')
    setCursorHistory([null])
    setPage(0)
  }

  const goNext = () => {
    if (!nextCursor) return
    setCursorHistory(current => [...current.slice(0, page + 1), nextCursor])
    setPage(value => value + 1)
  }

  return <div className="space-y-5">
    <Card>
      <SectionIntro title="Discoverable student directory" description="Only discoverable public profiles are shown. Private account records are not available here." action={<span className="inline-flex items-center gap-2 text-xs font-semibold text-berry"><UserRound size={15} /> Public profiles</span>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Search by name">
          <span className="relative block"><Search size={16} className="absolute left-3 top-3 text-muted" /><Input className="pl-9" value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Start typing a name" /></span>
        </Field>
        <Field label="Campus"><Select value={filters.campus} onChange={event => changeFilter('campus', event.target.value)}><option value="">All campuses</option>{CAMPUSES.map(campus => <option key={campus} value={campus}>{campus}</option>)}</Select></Field>
        <Field label="Interest"><Select value={filters.interest} onChange={event => changeFilter('interest', event.target.value)}><option value="">Any interest</option>{INTERESTS.map(interest => <option key={interest} value={interest}>{interest}</option>)}</Select></Field>
        <Field label="Skill"><Select value={filters.skill} onChange={event => changeFilter('skill', event.target.value)}><option value="">Any skill</option>{SKILLS.map(skill => <option key={skill} value={skill}>{skill}</option>)}</Select></Field>
        <Field label="Skill type"><Select value={filters.skillField} disabled={!filters.skill} onChange={event => changeFilter('skillField', event.target.value)}><option value="teach">Can teach</option><option value="learn">Wants to learn</option></Select></Field>
        <Field label="Sort by"><Select value={filters.sortBy} onChange={event => changeFilter('sortBy', event.target.value)}><option value="name">Name</option><option value="createdAt">Registration date</option></Select></Field>
        <Field label="Direction"><Select value={filters.direction} onChange={event => changeFilter('direction', event.target.value)}><option value="asc">Ascending</option><option value="desc">Descending</option></Select></Field>
        <Field label="Rows per page"><Select value={filters.pageSize} onChange={event => changeFilter('pageSize', Number(event.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></Select></Field>
        <Field label="Registered from"><Input type="date" value={filters.startDate} onChange={event => changeFilter('startDate', event.target.value)} /></Field>
        <Field label="Registered to"><Input type="date" min={filters.startDate || undefined} value={filters.endDate} onChange={event => changeFilter('endDate', event.target.value)} /></Field>
        <div className="flex items-end"><Button type="button" variant="secondary" className="inline-flex w-full items-center justify-center gap-2 sm:w-auto" onClick={resetFilters}><ArrowDownUp size={15} /> Reset filters</Button></div>
      </div>
      {filters.interest && <p className="mt-3 text-xs text-muted">Choose an interest or a skill filter per request; Firestore does not combine these array filters.</p>}
    </Card>

    {error ? <ErrorPanel title="Student directory unavailable" message={error} onRetry={() => setFilters(current => ({ ...current }))} />
      : busy ? <LoadingPanel label="Loading student profiles" />
        : rows.length ? <Card>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold text-ink dark:text-[#F4F4F6]">Public student profiles</h2><span className="text-xs text-muted dark:text-[#A1A1B0]">Page {page + 1} · {rows.length} shown</span></div>
          <ul className="divide-y divide-line/70 dark:divide-[#2E2E3A]">
            {rows.map(row => <li key={row.uid} className="flex flex-wrap items-center gap-3 py-4">
              <Avatar user={row} />
              <div className="min-w-0 flex-1"><p className="truncate font-semibold text-ink dark:text-[#F4F4F6]">{row.name || 'Campus member'}</p><p className="truncate text-sm text-muted dark:text-[#A1A1B0]">{row.campus || 'Campus not set'} · Registered {formatAdminDate(row.createdAt, { dateOnly: true })}</p></div>
              <Button variant="secondary" onClick={() => setSelectedUid(row.uid)}>View public profile</Button>
            </li>)}
          </ul>
          <div className="mt-3"><Pagination page={page} hasPrevious={page > 0} hasNext={Boolean(nextCursor)} onPrevious={() => setPage(value => Math.max(0, value - 1))} onNext={goNext} busy={busy} /></div>
        </Card>
          : <EmptyPanel title="No discoverable students match these filters"><Button className="mt-4" variant="secondary" onClick={resetFilters}>Clear filters</Button></EmptyPanel>}

    <Modal open={Boolean(selectedUid)} onClose={() => setSelectedUid('')} title="Public student profile">
      {detailBusy ? <LoadingPanel label="Loading public profile" />
        : detailError ? <p role="alert" className="text-sm text-danger">{detailError}</p>
          : student ? <div className="space-y-4">
            <div className="flex items-center gap-3"><Avatar user={student} size="md" /><div className="min-w-0"><h3 className="truncate text-lg font-bold text-ink dark:text-[#F4F4F6]">{student.name || 'Campus member'}</h3><p className="text-sm text-muted dark:text-[#A1A1B0]">{student.campus || 'Campus not set'}</p></div></div>
            <ProfileDetail label="Bio" value={student.bio || 'No public bio provided.'} />
            <ProfileDetail label="Interests" value={student.interests?.join(', ') || 'None listed'} />
            <ProfileDetail label="Can teach" value={student.teach?.join(', ') || 'None listed'} />
            <ProfileDetail label="Wants to learn" value={student.learn?.join(', ') || 'None listed'} />
            <ProfileDetail label="Looking for" value={student.lookingFor?.join(', ') || 'Not specified'} />
            <ProfileDetail label="Registered" value={formatAdminDate(student.createdAt)} />
            <p className="text-xs text-muted dark:text-[#A1A1B0]">This view contains only the student’s discoverable public profile.</p>
          </div>
            : <p className="text-sm text-muted">This profile is no longer discoverable or is unavailable.</p>}
    </Modal>
  </div>
}

function ProfileDetail({ label, value }) {
  return <div className="rounded-xl border border-line/60 bg-background p-3 dark:border-[#2E2E3A] dark:bg-[#23232E]"><p className="text-[11px] font-bold uppercase tracking-wide text-muted dark:text-[#A1A1B0]">{label}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink dark:text-[#F4F4F6]">{value}</p></div>
}
