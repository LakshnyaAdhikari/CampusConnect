import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button, Modal, Select, Textarea, useToast } from '../../../components/ui'
import { createReport, REPORT_CATEGORIES } from '../service'

export const ReportButton = ({ targetType, targetId, spaceId }) => {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState(REPORT_CATEGORIES[0].value)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const toast = useToast()

  const submit = async event => {
    event.preventDefault()
    setBusy(true)
    try {
      const result = await createReport({
        targetType,
        targetId,
        ...(targetType === 'post' ? { spaceId } : {}),
        category,
        reason,
      })
      setOpen(false)
      setReason('')
      toast(result.duplicate ? 'You already have an active report for this item.' : 'Report submitted for review.')
    } catch (error) {
      toast(error.message || 'Could not submit report.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return <>
    <Button type="button" aria-label="Report" variant="ghost" className="p-1" onClick={() => setOpen(true)}>
      <Flag size={16}/>
    </Button>
    <Modal open={open} onClose={() => { if (!busy) setOpen(false) }} title="Report content">
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">Category
          <Select value={category} onChange={event => setCategory(event.target.value)} className="mt-1">
            {REPORT_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </label>
        <label className="block text-sm font-medium">Reason
          <Textarea
            className="mt-1"
            rows={4}
            maxLength={1000}
            required
            value={reason}
            onChange={event => setReason(event.target.value)}
            placeholder="Briefly describe the concern. Do not include private messages or sensitive information."
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" loading={busy} disabled={!reason.trim()}>Send report</Button>
        </div>
      </form>
    </Modal>
  </>
}
