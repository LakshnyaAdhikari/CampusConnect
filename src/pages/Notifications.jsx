import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, CheckCheck, MessageCircle, Sparkles, UserPlus, X } from 'lucide-react'
import { Button, Card, EmptyState, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { getConnectionStatus, respondRequest } from '../features/connections/service'
import { listenNotifications, markAllNotificationsRead, markNotificationRead } from '../features/notifications/service'

const filters = ['All', 'Connection Requests', 'Space Activity', 'System']

const relativeTime = timestamp => {
  const age = Math.max(0, Date.now() - timestamp)
  const minutes = Math.floor(age / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

const detailsFor = item => {
  const name = item.actorName || 'A campus member'
  switch (item.type) {
    case 'connection_request':
      return { title: 'Connection Request', body: `${name} sent you a connection request.` }
    case 'connection_accepted':
      return { title: 'Connection Accepted', body: `${name} accepted your connection request.`, link: '/messages', linkText: 'Open messages' }
    case 'message_received':
      return { title: 'New Message', body: `${name} sent you a message.`, link: '/messages', linkText: 'Open messages' }
    case 'space_join_request':
      return { title: 'Private Space Request', body: `${name} requested to join “${item.spaceName}”.`, link: `/spaces/${item.spaceId}`, linkText: 'Review request' }
    case 'space_join_approved':
      return { title: 'Space Request Approved', body: `${name} approved your request to join “${item.spaceName}”.`, link: `/spaces/${item.spaceId}`, linkText: 'Open Space' }
    case 'space_join_rejected':
      return { title: 'Space Request Update', body: `${name} declined your request to join “${item.spaceName}”.` }
    default:
      return { title: 'CampusConnect Update', body: 'You have a new notification.' }
  }
}

export default function Notifications() {
  const { user } = useAuth()
  const toast = useToast()
  const [filter, setFilter] = useState('All')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [listenAttempt, setListenAttempt] = useState(0)
  const [actionLoading, setActionLoading] = useState({})
  const [connectionStatuses, setConnectionStatuses] = useState({})
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => {
    let active = true
    setItems([])
    setError(null)
    setLoading(true)
    if (!user?.uid) {
      setLoading(false)
      return () => { active = false }
    }
    try {
      const unsubscribe = listenNotifications(user.uid, notifications => {
        if (!active) return
        setItems(notifications)
        setError(null)
        setLoading(false)
      }, listenerError => {
        if (!active) return
        console.error('Could not subscribe to notifications:', listenerError)
        setItems([])
        setError(listenerError)
        setLoading(false)
      })
      return () => {
        active = false
        unsubscribe()
      }
    } catch (error) {
      console.error('Could not subscribe to notifications:', error)
      setItems([])
      setError(error)
      setLoading(false)
      return () => { active = false }
    }
  }, [user?.uid, listenAttempt])

  useEffect(() => {
    let active = true
    const requests = items.filter(item => item.type === 'connection_request')
    if (!requests.length) {
      setConnectionStatuses({})
      return () => { active = false }
    }

    setConnectionStatuses(previous => Object.fromEntries(requests.map(item => [
      item.id,
      { loading: true, ...(previous[item.id]?.response ? { response: previous[item.id].response } : {}) },
    ])))
    Promise.all(requests.map(async item => {
      try {
        const status = await getConnectionStatus(item.actorUid)
        return [item.id, { status, checked: true }]
      } catch (statusError) {
        return [item.id, { error: statusError, checked: true }]
      }
    })).then(results => {
      if (active) setConnectionStatuses(Object.fromEntries(results))
    })
    return () => { active = false }
  }, [items])

  const handleMarkRead = async item => {
    if (item.read) return
    try {
      setActionLoading(previous => ({ ...previous, [item.id]: true }))
      await markNotificationRead(item.id)
    } catch (error) {
      toast(error.message || 'Could not mark notification as read', 'error')
    } finally {
      setActionLoading(previous => ({ ...previous, [item.id]: false }))
    }
  }

  const handleRespond = async (item, status) => {
    try {
      setActionLoading(previous => ({ ...previous, [item.id]: true }))
      await respondRequest(item.actorUid, status)
      await markNotificationRead(item.id)
      setConnectionStatuses(previous => ({
        ...previous,
        [item.id]: {
          status: status === 'accepted' ? 'accepted' : null,
          checked: true,
          response: status === 'accepted' ? 'Accepted' : 'Declined',
        },
      }))
      toast(status === 'accepted' ? 'Connection request accepted!' : 'Connection declined')
    } catch (error) {
      toast(error.message || 'Could not update connection', 'error')
    } finally {
      setActionLoading(previous => ({ ...previous, [item.id]: false }))
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.uid) return
    try {
      setMarkingAll(true)
      await markAllNotificationsRead(user.uid)
      toast('All notifications marked as read')
    } catch (error) {
      toast(error.message || 'Could not mark notifications as read', 'error')
    } finally {
      setMarkingAll(false)
    }
  }

  const filteredItems = items.filter(item => {
    if (filter === 'All') return true
    if (filter === 'Connection Requests') return item.type === 'connection_request'
    if (filter === 'Space Activity') return item.type.startsWith('space_')
    if (filter === 'System') return ['connection_accepted', 'message_received'].includes(item.type)
    return true
  })
  const unreadCount = items.filter(item => !item.read).length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1A39] flex items-center gap-3">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="rounded-full bg-[#AE445A] px-2.5 py-0.5 text-xs font-bold text-white">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-muted">Stay up to date with your connection requests and campus circles.</p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="secondary"
            loading={markingAll}
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
          >
            <CheckCheck size={16} /> Mark all as read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {filters.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === tab
                ? 'bg-[#451952] text-white shadow-xs'
                : 'bg-surface border border-line text-muted hover:text-[#451952]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <Card className="p-6 text-center text-sm text-muted">Loading notifications…</Card>
      ) : error ? (
        <Card role="alert" className="border border-[#E8BCB9] bg-[#F8F0F2]/70 p-6 text-center">
          <p className="text-sm font-semibold text-[#451952]">Could not load notifications.</p>
          <p className="mt-1 text-xs text-muted">{error.message || 'An unexpected error occurred while loading notifications.'}</p>
          <Button variant="secondary" onClick={() => setListenAttempt(value => value + 1)} className="mt-4 text-xs">
            Try again
          </Button>
        </Card>
      ) : filteredItems.length ? (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const details = detailsFor(item)
            const isBusy = actionLoading[item.id]
            const connectionStatus = connectionStatuses[item.id]
            return (
              <Card
                key={item.id}
                className={`p-4 transition border ${
                  !item.read
                    ? 'border-[#E8BCB9] bg-[#F8F0F2]/70 shadow-xs'
                    : 'border-line/70 bg-surface'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="shrink-0 mt-0.5">
                    {item.type === 'connection_request' ? (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#451952] text-white font-bold text-sm">
                        {(item.actorName || '?').trim().charAt(0).toUpperCase() || '?'}
                      </div>
                    ) : item.type.startsWith('space_') ? (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#AE445A]/15 text-[#AE445A]">
                        <Sparkles size={20} />
                      </div>
                    ) : item.type === 'connection_accepted' ? (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F39F5A]/20 text-[#451952]">
                        <UserPlus size={20} />
                      </div>
                    ) : item.type === 'message_received' ? (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary">
                        <MessageCircle size={20} />
                      </div>
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary">
                        <Bell size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#1D1A39] truncate">{details.title}</p>
                      <span className="text-[11px] text-muted shrink-0">{relativeTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-[#1D1A39]/80 leading-relaxed">{details.body}</p>

                    {item.type === 'connection_request' && connectionStatus?.status === 'pending' && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          loading={isBusy}
                          onClick={() => handleRespond(item, 'accepted')}
                          className="bg-[#451952] hover:bg-[#662549] text-xs font-semibold px-3 py-1.5 h-auto rounded-lg text-white"
                        >
                          <Check size={14} className="mr-1 inline" /> Accept
                        </Button>
                        <Button
                          variant="ghost"
                          loading={isBusy}
                          onClick={() => handleRespond(item, 'rejected')}
                          className="text-xs font-semibold px-3 py-1.5 h-auto rounded-lg text-muted hover:text-[#AE445A] hover:bg-[#AE445A]/10"
                        >
                          <X size={14} className="mr-1 inline" /> Decline
                        </Button>
                      </div>
                    )}

                    {item.type === 'connection_request' && connectionStatus?.loading && (
                      <div className="mt-2 text-xs text-muted">Checking request status…</div>
                    )}

                    {item.type === 'connection_request' && connectionStatus?.error && (
                      <div className="mt-2 text-xs text-[#AE445A]">Could not verify whether this request is still pending.</div>
                    )}

                    {item.type === 'connection_request' && connectionStatus?.checked && !connectionStatus.error && connectionStatus.status !== 'pending' && (
                      <div className="mt-2 text-xs font-semibold text-[#451952]">
                        {connectionStatus.response || (connectionStatus.status === 'accepted' ? 'Accepted' : 'No longer pending')}
                      </div>
                    )}

                    {details.link && (
                      <div className="mt-3">
                        <Link
                          to={details.link}
                          onClick={() => handleMarkRead(item)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#451952] hover:text-[#AE445A] hover:underline"
                        >
                          {details.linkText} →
                        </Link>
                      </div>
                    )}

                    {!item.read && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleMarkRead(item)}
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-[#451952] disabled:opacity-50"
                      >
                        <CheckCheck size={14} /> Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState title={items.length ? 'No matching notifications' : 'All caught up!'}>
          <p>{items.length ? `No notifications found under ${filter}.` : 'You have no notifications yet.'}</p>
        </EmptyState>
      )}
    </div>
  )
}
