import { useEffect, useMemo, useState } from 'react'
import { BarChart3, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { Button, Card, Input } from '../../../components/ui'
import { CAMPUSES } from '../../../lib/schema'
import {
  getCampusStats,
  getDashboardMetric,
  getDashboardStats,
  getRecentActivity,
  getRegistrationTrends,
} from '../service'
import { retryMetricLoader, sumMetricResults, unavailableMetric } from '../overview-metrics'
import { EmptyPanel, ErrorPanel, Field, LoadingPanel, SectionIntro, toDateInput } from './AdminUI'

export default function OverviewPanel({ expectedUid }) {
  const [metrics, setMetrics] = useState({})
  const [campusStats, setCampusStats] = useState([])
  const [campusBusy, setCampusBusy] = useState(true)
  const [campusError, setCampusError] = useState('')
  const [activity, setActivity] = useState(null)
  const [activityBusy, setActivityBusy] = useState(true)
  const [activityError, setActivityError] = useState('')

  const initialEnd = useMemo(() => toDateInput(new Date()), [])
  const initialStart = useMemo(() => {
    const start = new Date()
    start.setMonth(start.getMonth() - 11, 1)
    return toDateInput(start)
  }, [])
  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)
  const [appliedDates, setAppliedDates] = useState({ startDate: initialStart, endDate: initialEnd })
  const [trends, setTrends] = useState([])
  const [trendsBusy, setTrendsBusy] = useState(true)
  const [trendsError, setTrendsError] = useState('')

  const loadCampusStats = async () => {
    setCampusBusy(true)
    setCampusError('')
    try {
      setCampusStats(await getCampusStats({ campuses: CAMPUSES }, expectedUid))
    } catch (error) {
      setCampusError(error.message || 'Campus statistics could not be loaded.')
    } finally {
      setCampusBusy(false)
    }
  }

  const loadActivity = async () => {
    setActivityBusy(true)
    setActivityError('')
    try {
      setActivity(await getRecentActivity({}, expectedUid))
    } catch (error) {
      setActivityError(error.message || 'Activity availability could not be checked.')
    } finally {
      setActivityBusy(false)
    }
  }

  useEffect(() => {
    let active = true
    const supportedMetrics = [
      'discoverableStudents', 'visibleSpaces', 'publicSpaces', 'campusSpaces',
      'pendingReports', 'underReviewReports', 'resolvedReports', 'dismissedReports',
    ]
    setMetrics(Object.fromEntries(supportedMetrics.map(metric => [metric, { status: 'loading', metric }])))
    getDashboardStats({}, expectedUid, (metric, result) => {
      if (!active) return
      setMetrics(current => {
        const next = { ...current, [metric]: result }
        if (next.publicSpaces && next.publicSpaces.status !== 'loading'
          && next.campusSpaces && next.campusSpaces.status !== 'loading') {
          next.visibleSpaces = { ...sumMetricResults(next.publicSpaces, next.campusSpaces), metric: 'visibleSpaces' }
        }
        return next
      })
    }).then(result => {
      if (active) setMetrics(result.metrics)
    }).catch(error => {
      if (!active) return
      setMetrics(Object.fromEntries(supportedMetrics.map(metric => [metric, {
        status: 'error', metric, code: error.code || 'unknown',
        message: error.message || 'Administrator statistics could not be loaded.',
      }])))
    })
    setCampusBusy(true)
    setActivityBusy(true)
    getCampusStats({ campuses: CAMPUSES }, expectedUid).then(value => {
      if (active) setCampusStats(value)
    }).catch(error => {
      if (active) setCampusError(error.message || 'Campus statistics could not be loaded.')
    }).finally(() => { if (active) setCampusBusy(false) })
    getRecentActivity({}, expectedUid).then(value => {
      if (active) setActivity(value)
    }).catch(error => {
      if (active) setActivityError(error.message || 'Activity availability could not be checked.')
    }).finally(() => { if (active) setActivityBusy(false) })
    return () => { active = false }
  }, [expectedUid])

  const retryLoaders = {
    discoverableStudents: () => getDashboardMetric('discoverableStudents', expectedUid),
    publicSpaces: () => getDashboardMetric('publicSpaces', expectedUid),
    campusSpaces: () => getDashboardMetric('campusSpaces', expectedUid),
    pendingReports: () => getDashboardMetric('pendingReports', expectedUid),
    underReviewReports: () => getDashboardMetric('underReviewReports', expectedUid),
    resolvedReports: () => getDashboardMetric('resolvedReports', expectedUid),
    dismissedReports: () => getDashboardMetric('dismissedReports', expectedUid),
  }

  const retryOverviewMetric = async metric => {
    const keys = metric === 'visibleSpaces'
      ? ['publicSpaces', 'campusSpaces'].filter(key => metrics[key]?.status !== 'success')
      : [metric]
    const retryKeys = keys.length ? keys : ['campusSpaces']
    setMetrics(current => ({
      ...current,
      ...Object.fromEntries(retryKeys.map(key => [key, { status: 'loading', metric: key }])),
      ...(metric === 'visibleSpaces' ? { visibleSpaces: { status: 'loading', metric: 'visibleSpaces' } } : {}),
    }))
    const retried = await Promise.all(retryKeys.map(key => retryMetricLoader(retryLoaders, key)))
    setMetrics(current => {
      const next = { ...current, ...Object.fromEntries(retried) }
      next.visibleSpaces = sumMetricResults(next.publicSpaces, next.campusSpaces)
      next.visibleSpaces.metric = 'visibleSpaces'
      return next
    })
  }

  useEffect(() => {
    let active = true
    setTrendsBusy(true)
    setTrendsError('')
    getRegistrationTrends({ ...appliedDates, interval: 'month' }, expectedUid).then(result => {
      if (active) setTrends(result)
    }).catch(error => {
      if (active) setTrendsError(error.message || 'Registration trends could not be loaded.')
    }).finally(() => {
      if (active) setTrendsBusy(false)
    })
    return () => { active = false }
  }, [appliedDates, expectedUid])

  const applyTrendFilters = event => {
    event.preventDefault()
    setAppliedDates({ startDate, endDate })
  }

  return <div className="space-y-5">
    <section aria-label="Campus overview statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard title="Discoverable students" state={metrics.discoverableStudents} detail="Discoverable public profiles" Icon={Users} onRetry={() => retryOverviewMetric('discoverableStudents')} />
      <MetricCard title="Visible Spaces" state={metrics.visibleSpaces} detail="Public and matching-campus" Icon={Sparkles} onRetry={() => retryOverviewMetric('visibleSpaces')} />
      <MetricCard title="Public Spaces" state={metrics.publicSpaces} detail="Visible across campuses" Icon={Sparkles} onRetry={() => retryOverviewMetric('publicSpaces')} />
      <MetricCard title="Campus Spaces" state={metrics.campusSpaces} detail="Matching the admin campus" Icon={Sparkles} onRetry={() => retryOverviewMetric('campusSpaces')} />
      <MetricCard title="Pending reports" state={metrics.pendingReports} detail="Awaiting review" Icon={ShieldCheck} onRetry={() => retryOverviewMetric('pendingReports')} />
      <MetricCard title="Under review" state={metrics.underReviewReports} detail="Currently being reviewed" Icon={ShieldCheck} onRetry={() => retryOverviewMetric('underReviewReports')} />
      <MetricCard title="Resolved reports" state={metrics.resolvedReports} detail="Marked resolved" Icon={ShieldCheck} onRetry={() => retryOverviewMetric('resolvedReports')} />
      <MetricCard title="Dismissed reports" state={metrics.dismissedReports} detail="Dismissed by moderators" Icon={ShieldCheck} onRetry={() => retryOverviewMetric('dismissedReports')} />
      <MetricCard title="Active Spaces" state={unavailableMetric('The Space schema has no active-state field.')} detail="Not tracked by current schema" Icon={BarChart3} />
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <Card>
        <SectionIntro title="Student registrations" description="Monthly registrations among discoverable public profiles." />
        <form onSubmit={applyTrendFilters} className="mb-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="From"><Input type="date" value={startDate} max={endDate || undefined} onChange={event => setStartDate(event.target.value)} /></Field>
          <Field label="To"><Input type="date" value={endDate} min={startDate || undefined} onChange={event => setEndDate(event.target.value)} /></Field>
          <Button type="submit" disabled={!startDate || !endDate || startDate > endDate}>Apply dates</Button>
        </form>
        {trendsBusy ? <LoadingPanel label="Loading registration trends" />
          : trendsError ? <ErrorPanel title="Registration trends unavailable" message={trendsError} onRetry={() => setAppliedDates(current => ({ ...current }))} />
            : trends.length ? <RegistrationChart data={trends} />
              : <EmptyPanel title="No registration data for this period" />}
      </Card>

      <Card>
        <SectionIntro title="Discoverable students by campus" description="Counts use the configured campus list and public profiles only." />
        {campusBusy ? <LoadingPanel label="Loading campus statistics" />
          : campusError ? <ErrorPanel title="Campus statistics unavailable" message={campusError} onRetry={loadCampusStats} />
            : campusStats.length ? <CampusBars data={campusStats} />
              : <EmptyPanel title="No campus statistics available" />}
      </Card>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <Card>
        <SectionIntro title="Recent activity" description="A campus-wide activity feed is not available in the current data model." />
        {activityBusy ? <LoadingPanel label="Checking activity availability" />
          : activityError ? <ErrorPanel title="Activity availability unavailable" message={activityError} onRetry={loadActivity} />
            : <div className="rounded-2xl border border-dashed border-line bg-background p-5 text-sm text-muted dark:border-[#2E2E3A] dark:bg-[#23232E] dark:text-[#A1A1B0]">
              {activity?.supported === false ? activity.reason : 'No activity feed is available.'}
            </div>}
      </Card>
      <Card>
        <SectionIntro title="Data coverage" description="Counts reflect data that the existing schema and Rules expose." />
        <ul className="space-y-3 text-sm">
          <CoverageRow label="Discoverable profiles" value="Public profiles only" />
          <CoverageRow label="Spaces" value="Public and matching-campus Spaces" />
          <CoverageRow label="Active Space count" value="Unavailable · no active-state field" />
          <CoverageRow label="Recent global activity" value="Unavailable · no activity feed" />
        </ul>
      </Card>
    </section>
  </div>
}

function MetricCard({ title, state = { status: 'loading' }, detail, Icon, onRetry }) {
  const value = state.status === 'loading' ? '…'
    : state.status === 'success' ? state.value
      : 'Unavailable'
  return <Card className="min-w-0">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-sm text-muted dark:text-[#A1A1B0]">{title}</p><p className={`mt-3 break-words text-3xl font-bold ${state.status === 'success' || state.status === 'loading' ? 'text-ink dark:text-[#F4F4F6]' : 'text-muted dark:text-[#A1A1B0]'}`}>{value}</p><p className="mt-2 text-xs text-muted dark:text-[#A1A1B0]">{detail}</p>
        {state.status === 'error' && <div className="mt-3 space-y-2"><p role="alert" className="break-words text-xs text-danger">{state.message}</p>{onRetry && <Button type="button" variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={onRetry}>Retry this metric</Button>}</div>}
        {state.status === 'unavailable' && <p className="mt-2 text-xs text-muted dark:text-[#A1A1B0]">{state.reason}</p>}
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-50 to-[#FFEDDA] text-primary dark:bg-[#23232E] dark:text-[#E59858]"><Icon size={19} /></span>
    </div>
  </Card>
}

function RegistrationChart({ data }) {
  const maximum = Math.max(1, ...data.map(item => item.count))
  const labelEvery = Math.max(1, Math.ceil(data.length / 6))
  return <div>
    <div role="img" aria-label={`Monthly registrations: ${data.map(item => `${item.period} ${item.count}`).join(', ')}`} className="flex h-48 items-end gap-1.5 overflow-x-auto rounded-2xl bg-background p-4 dark:bg-[#23232E]">
      {data.map((item, index) => <div key={item.period} className="flex h-full min-w-5 flex-1 flex-col items-center justify-end gap-2">
        <span className="text-[10px] font-semibold text-muted dark:text-[#A1A1B0]">{item.count}</span>
        <div className="w-full min-w-3 rounded-t-md bg-gradient-to-t from-primary to-rose transition hover:from-berry hover:to-apricot" style={{ height: `${Math.max(item.count ? 8 : 3, (item.count / maximum) * 100)}%` }} />
        <span className="min-h-3 text-[9px] text-muted dark:text-[#A1A1B0]">{index % labelEvery === 0 || index === data.length - 1 ? item.period.slice(5) : ''}</span>
      </div>)}
    </div>
    <p className="mt-2 text-right text-[11px] text-muted dark:text-[#A1A1B0]">Month · registration count</p>
  </div>
}

function CampusBars({ data }) {
  const max = Math.max(1, ...data.map(item => item.students))
  return <ul className="space-y-4">
    {data.map(item => <li key={item.campus}>
      <div className="mb-1 flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium text-ink dark:text-[#F4F4F6]">{item.campus}</span><b className="text-primary dark:text-[#E59858]">{item.students}</b></div>
      <div className="h-2 overflow-hidden rounded-full bg-primary-50 dark:bg-[#23232E]" role="progressbar" aria-label={`${item.campus} discoverable students`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={item.students}>
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-rose" style={{ width: `${Math.max(item.students ? 2 : 0, (item.students / max) * 100)}%` }} />
      </div>
    </li>)}
  </ul>
}

function CoverageRow({ label, value }) {
  return <li className="flex flex-wrap justify-between gap-2 border-b border-line/60 pb-2 last:border-0 dark:border-[#2E2E3A]">
    <span className="text-muted dark:text-[#A1A1B0]">{label}</span><span className="text-right font-medium text-ink dark:text-[#F4F4F6]">{value}</span>
  </li>
}
