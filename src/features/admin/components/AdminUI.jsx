import { Button, Card, Spinner } from '../../../components/ui'

export function LoadingPanel({ label = 'Loading data' }) {
  return <Card className="py-8 text-center">
    <Spinner />
    <p className="mt-1 text-sm text-muted dark:text-[#A1A1B0]">{label}…</p>
  </Card>
}

export function ErrorPanel({ title = 'Could not load this section', message, onRetry }) {
  return <Card role="alert" className="border-danger/30">
    <h2 className="font-semibold text-ink dark:text-[#F4F4F6]">{title}</h2>
    <p className="mt-2 text-sm text-muted dark:text-[#A1A1B0]">{message || 'An unexpected error occurred.'}</p>
    {onRetry && <Button className="mt-4" onClick={onRetry}>Try again</Button>}
  </Card>
}

export function EmptyPanel({ title, children }) {
  return <Card className="text-center">
    <h3 className="font-semibold text-ink dark:text-[#F4F4F6]">{title}</h3>
    {children && <div className="mt-2 text-sm text-muted dark:text-[#A1A1B0]">{children}</div>}
  </Card>
}

export function SectionIntro({ title, description, action }) {
  return <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
    <div><h2 className="text-lg font-bold text-ink dark:text-[#F4F4F6]">{title}</h2><p className="mt-1 text-sm text-muted dark:text-[#A1A1B0]">{description}</p></div>
    {action}
  </div>
}

export function Pagination({ page, hasPrevious, hasNext, onPrevious, onNext, busy = false }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line/70 pt-4 dark:border-[#2E2E3A]">
    <p className="text-xs font-medium text-muted dark:text-[#A1A1B0]">Page {page + 1}</p>
    <div className="flex gap-2">
      <Button variant="secondary" disabled={!hasPrevious || busy} onClick={onPrevious}>Previous</Button>
      <Button disabled={!hasNext || busy} onClick={onNext}>Next</Button>
    </div>
  </div>
}

export function Field({ label, children, className = '' }) {
  return <label className={`block min-w-0 text-xs font-semibold text-muted dark:text-[#A1A1B0] ${className}`}>
    <span className="mb-1 block">{label}</span>
    {children}
  </label>
}

export function formatAdminDate(value, { dateOnly = false } = {}) {
  if (!value) return 'Date unavailable'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return 'Date unavailable'
  return dateOnly ? date.toLocaleDateString() : date.toLocaleString()
}

export function toDateInput(value) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
