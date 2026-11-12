import { useState } from 'react'
import { Flag } from 'lucide-react'
import { Button, Modal, Select, useToast } from '../../../components/ui'
import { createReport } from '../service'
export const ReportButton=({targetType,targetId,spaceId=''})=>{const [open,setOpen]=useState(false),[reason,setReason]=useState('Spam');const toast=useToast();return <><Button aria-label="Report" variant="ghost" className="p-1" onClick={()=>setOpen(true)}><Flag size={16}/></Button><Modal open={open} onClose={()=>setOpen(false)} title="Report content"><Select value={reason} onChange={e=>setReason(e.target.value)}><option>Spam</option><option>Harassment</option><option>Inappropriate profile</option><option>Other</option></Select><Button className="mt-4" onClick={async()=>{await createReport({targetType,targetId,spaceId,reason});setOpen(false);toast('Report submitted')}}>Send report</Button></Modal></>}
