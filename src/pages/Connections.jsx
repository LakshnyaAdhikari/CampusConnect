import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, PageHeader, Tabs } from '../components/ui'
import { listenConnections, respondRequest, cancelRequest, removeConnection } from '../features/connections/service'
import { useAuth } from '../context/AuthContext'
import { openChat } from '../features/messages/service'

export default function Connections() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('Received')
  const nav = useNavigate()

  useEffect(() => {
    if (!user?.uid) return
    return listenConnections(user.uid, setItems)
  }, [user])

  const type = x =>
    tab === 'Received'
      ? x.toUid === user?.uid && x.status === 'pending'
      : tab === 'Sent'
        ? x.fromUid === user?.uid && x.status === 'pending'
        : x.status === 'accepted'

  const rows = items.filter(type)

  return (
    <>
      <PageHeader title="Connections" />
      <Tabs items={['Received', 'Sent', 'Connected']} value={tab} onChange={setTab} />
      <div className="space-y-3">
        {rows.length ? (
          rows.map(x => <Row key={x.id} item={x} tab={tab} me={user?.uid} nav={nav} />)
        ) : (
          <EmptyState title={`No ${tab.toLowerCase()} connections`} />
        )}
      </div>
    </>
  )
}

function Row({ item, tab, me, nav }) {
  const other = item.participants?.find(x => x !== me)
  const name = item.profiles?.[other]?.name || 'Student'

  return (
    <Card className="flex items-center justify-between">
      <b>{name}</b>
      <div className="flex gap-2">
        {tab === 'Received' && (
          <>
            <Button onClick={() => respondRequest(other, 'accepted')}>Accept</Button>
            <Button variant="danger" onClick={() => respondRequest(other, 'rejected')}>Reject</Button>
          </>
        )}
        {tab === 'Sent' && (
          <Button variant="ghost" onClick={() => cancelRequest(other)}>Cancel</Button>
        )}
        {tab === 'Connected' && (
          <>
            <Button onClick={async () => nav(`/messages/${await openChat(other)}`)}>Message</Button>
            <Button variant="ghost" onClick={() => removeConnection(other)}>Remove</Button>
          </>
        )}
      </div>
    </Card>
  )
}
