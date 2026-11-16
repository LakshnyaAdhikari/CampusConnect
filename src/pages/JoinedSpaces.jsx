import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Compass, MessageCircle, Plus, Search, Sparkles, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, ConfirmDialog, EmptyState, Input, Spinner, useToast } from '../components/ui'
import { listSpaces, leaveSpace } from '../features/spaces/service'
import { useAuth } from '../context/AuthContext'

export default function JoinedSpaces() {
  const { profile, user } = useAuth()
  const [spaces, setSpaces] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [leavingId, setLeavingId] = useState(null)
  const toast = useToast()
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    listSpaces(profile.campus)
      .then(all => {
        const joined = (all || []).filter(s => s.members?.includes(user.uid))
        setSpaces(joined)
      })
      .catch(() => {
        toast('Could not load joined spaces', 'error')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [profile.campus, user.uid])

  const confirmLeave = async () => {
    if (!leavingId) return
    try {
      await leaveSpace(leavingId)
      toast('You left the space')
      setLeavingId(null)
      load()
    } catch (err) {
      toast(err.message || 'Could not leave space', 'error')
    }
  }

  const filtered = (spaces || []).filter(s =>
    `${s.name} ${s.description} ${s.category || ''}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            onClick={() => navigate('/spaces')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-[#451952] transition mb-2"
          >
            <ArrowLeft size={16} /> Back to Discover Feed
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1D1A39] flex items-center gap-2.5">
            <span>My Joined Spaces</span>
            <span className="rounded-full bg-[#E8BCB9]/40 px-3 py-0.5 text-sm font-semibold text-[#662549]">
              {spaces?.length || 0}
            </span>
          </h1>
          <p className="mt-1 text-sm text-muted">Spaces where you are an active member and participant.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 text-muted" size={17} />
            <Input
              className="pl-9 text-sm"
              placeholder="Search your spaces..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => navigate('/spaces')} variant="secondary" className="shrink-0 text-xs sm:text-sm">
            <Plus size={16} className="mr-1 inline" /> Discover More
          </Button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length ? (
        <div className="grid gap-5 md:grid-cols-2">
          {filtered.map(space => {
            const latestPost = space.posts?.[0]
            return (
              <Card key={space.id} className="flex flex-col justify-between overflow-hidden p-0 border border-[#E8BCB9]/30 shadow-sm hover:shadow-md transition">
                <div className="bg-gradient-to-r from-[#451952] to-[#662549] p-5 text-white">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold backdrop-blur">
                      {space.category || 'Campus Life'}
                    </span>
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/90">
                      {space.campus}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-bold text-white">{space.name}</h3>
                  <p className="mt-1.5 line-clamp-2 text-xs sm:text-sm text-white/80 leading-relaxed">
                    {space.description}
                  </p>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between bg-surface space-y-4">
                  {latestPost ? (
                    <div className="rounded-xl border border-[#E8BCB9]/20 bg-[#F8F0F2] p-3 text-xs leading-relaxed text-[#1D1A39]">
                      <div className="flex items-center justify-between font-semibold text-[#662549] mb-1">
                        <span className="flex items-center gap-1.5">
                          <MessageCircle size={13} />
                          {latestPost.isAnonymous ? 'Anonymous' : latestPost.authorName}
                        </span>
                        <span className="text-[10px] text-muted">
                          {latestPost.comments?.length || 0} comments
                        </span>
                      </div>
                      <p className="italic text-[#1D1A39]/85 line-clamp-2">
                        "{latestPost.text}"
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-line p-3 text-xs text-center text-muted">
                      No posts shared yet. Start the first conversation!
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-line/60 pt-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                      <Users size={14} />
                      {space.memberCount || space.members?.length || 1} members
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        className="text-xs text-[#AE445A] hover:bg-[#AE445A]/10 px-2.5 py-1.5 h-auto"
                        onClick={() => setLeavingId(space.id)}
                      >
                        Leave
                      </Button>
                      <Button
                        className="text-xs bg-[#451952] hover:bg-[#662549] px-3.5 py-1.5 h-auto"
                        onClick={() => navigate(`/spaces/${space.id}`)}
                      >
                        Explore Space →
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title={search ? 'No joined spaces match your search' : 'You haven’t joined any spaces yet'}
        >
          <p>
            {search
              ? 'Try a different search keyword.'
              : 'Explore the campus community feed and join circles that match your vibe.'}
          </p>
          <Button className="mt-4 bg-[#451952] hover:bg-[#662549]" onClick={() => navigate('/spaces')}>
            Discover Spaces to Join
          </Button>
        </EmptyState>
      )}

      <ConfirmDialog
        open={Boolean(leavingId)}
        onClose={() => setLeavingId(null)}
        onConfirm={confirmLeave}
        title="Leave this space?"
      >
        Are you sure you want to leave this space? You can rejoin anytime from the Discover feed.
      </ConfirmDialog>
    </div>
  )
}
