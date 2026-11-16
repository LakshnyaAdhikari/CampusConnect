import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bell, Check, UserPlus, MessageCircle, Sparkles, X, CheckCheck } from 'lucide-react'
import { Button, Card, EmptyState, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { respondRequest } from '../features/connections/service'

const INITIAL_NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'connection_request',
    title: 'Connection Request',
    body: 'Rohan Mehta sent you a peer connection request.',
    timestamp: '10m ago',
    read: false,
    fromUid: 'u2',
    name: 'Rohan Mehta',
    campus: 'North Campus',
    avatar: 'R',
  },
  {
    id: 'n2',
    type: 'connection_accepted',
    title: 'Connection Accepted',
    body: 'Nisha Kumar accepted your connection request. Say hello in chat!',
    timestamp: '2h ago',
    read: false,
    fromUid: 'u5',
    name: 'Nisha Kumar',
    campus: 'North Campus',
    avatar: 'N',
    actionLink: '/messages',
    actionText: 'Message Nisha',
  },
  {
    id: 'n3',
    type: 'space_activity',
    title: 'New Reply in Design Circle',
    body: 'A student replied to your question in "Design Circle": "Anyone up for a late-night Figma jam?"',
    timestamp: '5h ago',
    read: false,
    spaceId: 'space1',
    actionLink: '/spaces/space1',
    actionText: 'View Thread',
  },
  {
    id: 'n4',
    type: 'connection_request',
    title: 'Connection Request',
    body: 'Maya Iyer wants to connect with you.',
    timestamp: '1d ago',
    read: true,
    fromUid: 'u3',
    name: 'Maya Iyer',
    campus: 'North Campus',
    avatar: 'M',
  },
  {
    id: 'n5',
    type: 'system',
    title: 'Welcome to CampusConnect!',
    body: 'Complete your skill tags to get paired with top campus peers.',
    timestamp: '2d ago',
    read: true,
    actionLink: '/profile/me',
    actionText: 'Update Skills',
  },
]

export default function Notifications() {
  const { user } = useAuth()
  const toast = useToast()
  const [filter, setFilter] = useState('All')
  const [items, setItems] = useState(INITIAL_NOTIFICATIONS)
  const [actionLoading, setActionLoading] = useState({})

  const handleRespond = async (notifId, fromUid, status) => {
    try {
      setActionLoading(prev => ({ ...prev, [notifId]: true }))
      await respondRequest(fromUid, status)
      setItems(prev =>
        prev.map(n =>
          n.id === notifId
            ? {
                ...n,
                read: true,
                resolved: status === 'accepted' ? 'Accepted' : 'Declined',
              }
            : n
        )
      )
      toast(status === 'accepted' ? 'Connection request accepted!' : 'Connection declined')
    } catch (err) {
      toast(err.message || 'Could not update connection', 'error')
    } finally {
      setActionLoading(prev => ({ ...prev, [notifId]: false }))
    }
  }

  const handleMarkAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, read: true })))
    toast('All notifications marked as read')
  }

  const filteredItems = items.filter(n => {
    if (filter === 'All') return true
    if (filter === 'Connection Requests') return n.type === 'connection_request'
    if (filter === 'Space Activity') return n.type === 'space_activity'
    if (filter === 'System') return n.type === 'system' || n.type === 'connection_accepted'
    return true
  })

  const unreadCount = items.filter(n => !n.read).length

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
            onClick={handleMarkAllRead}
            className="inline-flex items-center gap-1.5 text-xs font-semibold self-start sm:self-auto"
          >
            <CheckCheck size={16} /> Mark all as read
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-b border-line pb-3">
        {['All', 'Connection Requests', 'Space Activity', 'System'].map(tab => (
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

      {filteredItems.length ? (
        <div className="space-y-3">
          {filteredItems.map(item => {
            const isLoading = actionLoading[item.id]
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
                        {item.avatar || 'U'}
                      </div>
                    ) : item.type === 'space_activity' ? (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#AE445A]/15 text-[#AE445A]">
                        <Sparkles size={20} />
                      </div>
                    ) : item.type === 'connection_accepted' ? (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#F39F5A]/20 text-[#451952]">
                        <UserPlus size={20} />
                      </div>
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary-50 text-primary">
                        <Bell size={20} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#1D1A39] truncate">{item.title}</p>
                      <span className="text-[11px] text-muted shrink-0">{item.timestamp}</span>
                    </div>
                    <p className="mt-1 text-xs sm:text-sm text-[#1D1A39]/80 leading-relaxed">
                      {item.body}
                    </p>

                    {item.type === 'connection_request' && !item.resolved && (
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          loading={isLoading}
                          onClick={() => handleRespond(item.id, item.fromUid, 'accepted')}
                          className="bg-[#451952] hover:bg-[#662549] text-xs font-semibold px-3 py-1.5 h-auto rounded-lg text-white"
                        >
                          <Check size={14} className="mr-1 inline" /> Accept
                        </Button>
                        <Button
                          variant="ghost"
                          loading={isLoading}
                          onClick={() => handleRespond(item.id, item.fromUid, 'rejected')}
                          className="text-xs font-semibold px-3 py-1.5 h-auto rounded-lg text-muted hover:text-[#AE445A] hover:bg-[#AE445A]/10"
                        >
                          <X size={14} className="mr-1 inline" /> Decline
                        </Button>
                      </div>
                    )}

                    {item.resolved && (
                      <div className="mt-2 text-xs font-semibold text-[#451952]">
                        Status: {item.resolved}
                      </div>
                    )}

                    {item.actionLink && !item.resolved && (
                      <div className="mt-3">
                        <Link
                          to={item.actionLink}
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#451952] hover:text-[#AE445A] hover:underline"
                        >
                          {item.actionText} →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState title="All caught up!">
          <p>No notifications found under {filter}.</p>
        </EmptyState>
      )}
    </div>
  )
}
