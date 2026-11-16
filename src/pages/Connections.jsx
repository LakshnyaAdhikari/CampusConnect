import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, PageHeader, Tabs } from '../components/ui'
import { listenConnections, respondRequest, cancelRequest, removeConnection } from '../features/connections/service'
import { useAuth } from '../context/AuthContext'
import { openChat } from '../features/messages/service'
import { getPublicUser } from '../features/profile/service'

export default function Connections() {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [publicNames, setPublicNames] = useState({})
  const lookedUpUids = useRef(new Set())
  const [tab, setTab] = useState('Received')
  const nav = useNavigate()

  useEffect(() => {
    if (!user?.uid) return
    return listenConnections(user.uid, setItems)
  }, [user])

  useEffect(() => {
    lookedUpUids.current.clear()
    setPublicNames({})
  }, [user?.uid])

  useEffect(() => {
    if (!user?.uid) return
    let active = true
    const missingNames = [...new Set(items
      .filter(item => {
        const otherUid = item.participants?.find(uid => uid !== user.uid)
        return otherUid && !item.profiles?.[otherUid]?.name
      })
      .map(item => item.participants?.find(uid => uid !== user.uid))
      .filter(uid => uid && !lookedUpUids.current.has(uid)))]

    missingNames.forEach(uid => lookedUpUids.current.add(uid))
    if (missingNames.length) {
      Promise.all(missingNames.map(async uid => {
        try {
          const publicProfile = await getPublicUser(uid)
          return [uid, publicProfile?.name || '']
        } catch {
          return [uid, '']
        }
      })).then(entries => {
        if (active) setPublicNames(current => ({ ...current, ...Object.fromEntries(entries) }))
      })
    }

    return () => { active = false }
  }, [items, user?.uid])

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
          rows.map(x => <Row key={x.id} item={x} tab={tab} me={user?.uid} nav={nav} publicNames={publicNames} />)
        ) : (
          <EmptyState title={`No ${tab.toLowerCase()} connections`} />
        )}
      </div>
    </>
  )
}

function Row({ item, tab, me, nav, publicNames }) {
  const other = item.participants?.find(x => x !== me)
  const name = item.profiles?.[other]?.name || publicNames[other] || 'Student'

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
