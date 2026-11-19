import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Bookmark,
  Check,
  Compass,
  Heart,
  LockKeyhole,
  MessageCircle,
  Plus,
  Search,
  Share2,
  Sparkles,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, EmptyState, Input, Modal, Spinner, Textarea, useToast } from '../components/ui'
import { listSpaces, createSpace, joinSpace } from '../features/spaces/service'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = [
  'All',
  'Tech & Coding',
  'Design & Creative',
  'Study & Exams',
  'Campus Life',
]

const GRADIENT_PRESETS = [
  'from-[#451952] via-[#662549] to-[#AE445A]',
  'from-[#1D1A39] via-[#451952] to-[#662549]',
  'from-[#662549] via-[#AE445A] to-[#F39F5A]',
  'from-[#451952] to-[#AE445A]',
  'from-[#1D1A39] to-[#AE445A]',
]

export default function Spaces() {
  const { profile, user } = useAuth()
  const [spaces, setSpaces] = useState(null)
  const [activeTab, setActiveTab] = useState('discover')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [openModal, setOpenModal] = useState(false)
  const [modalFormData, setModalFormData] = useState({ name: '', description: '', category: 'Tech & Coding', visibility: 'public' })
  const [modalSaving, setModalSaving] = useState(false)
  const [likesMap, setLikesMap] = useState({})
  const [joiningMap, setJoiningMap] = useState({})
  const [error, setError] = useState('')

  const toast = useToast()
  const navigate = useNavigate()

  const load = () => {
    setError('')
    listSpaces()
      .then(setSpaces)
      .catch(() => setError('Spaces could not be loaded. Try again.'))
  }

  useEffect(() => {
    load()
  }, [profile.campus])

  const myJoinedCount = useMemo(() => {
    return spaces?.filter(s => s.members?.includes(user?.uid)).length || 0
  }, [spaces, user?.uid])

  const handleTabClick = tab => {
    if (tab === 'joined') {
      navigate('/spaces/joined')
      return
    }
    if (tab === 'create') {
      setOpenModal(true)
      return
    }
    setActiveTab('discover')
  }

  const handleCreateSpace = async formData => {
    if (!formData.name?.trim()) {
      return toast('Give your space a name', 'error')
    }
    try {
      setModalSaving(true)
      const created = await createSpace({
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category || 'Tech & Coding',
        visibility: formData.visibility || 'public',
      })
      toast('Your space is ready!')
      setModalFormData({ name: '', description: '', category: 'Tech & Coding', visibility: 'public' })
      setOpenModal(false)
      load()
      if (created?.visibility === 'private') navigate(`/spaces/${created.id}`)
    } catch (err) {
      toast(err.message || 'Could not create space', 'error')
    } finally {
      setModalSaving(false)
    }
  }

  const toggleMembership = async space => {
    const isMember = space.members?.includes(user?.uid)
    if (isMember) {
      navigate(`/spaces/${space.id}`)
      return
    }

    try {
      setJoiningMap(prev => ({ ...prev, [space.id]: true }))
      await joinSpace(space.id)
      toast(`Joined ${space.name}!`)
      load()
    } catch (err) {
      toast(err.message || 'Could not join space', 'error')
    } finally {
      setJoiningMap(prev => ({ ...prev, [space.id]: false }))
    }
  }

  const toggleLike = spaceId => {
    setLikesMap(prev => {
      const current = prev[spaceId] || 0
      return { ...prev, [spaceId]: current ? 0 : 1 }
    })
  }

  const handleCopyLink = spaceId => {
    const url = `${window.location.origin}/spaces/${spaceId}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      toast('Space link copied to clipboard!')
    }
  }

  const filteredSpaces = useMemo(() => {
    if (!spaces) return []
    return spaces.filter(space => {
      const matchesCategory =
        selectedCategory === 'All' || space.category === selectedCategory
      const matchesSearch = `${space.name} ${space.description} ${space.category || ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [spaces, selectedCategory, search])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <section className="spaces-hero overflow-hidden rounded-2xl p-5 sm:p-6 text-white bg-gradient-to-r from-[#1D1A39] via-[#451952] to-[#662549] shadow-sm">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Spaces</h1>
        <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-white/80 leading-relaxed">
          Interest-based campus hubs where students discuss ideas, share resources, and connect anonymously or openly.
        </p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => handleTabClick('discover')}
          className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left transition ${
            activeTab === 'discover'
              ? 'border-[#451952] bg-[#F8F0F2] shadow-sm ring-1 ring-[#451952]/20'
              : 'border-line bg-surface hover:bg-[#F8F0F2]/50'
          }`}
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#451952] text-white">
            <Sparkles size={20} />
          </span>
          <div>
            <span className="block text-sm font-bold text-[#1D1A39]">✨ Discover &amp; Join Spaces</span>
          <small className="block text-xs text-muted">Discover public circles across every campus</small>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('create')}
          className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 text-left transition hover:bg-[#F8F0F2]/50 group"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#662549] text-white group-hover:scale-105 transition-transform">
            <Plus size={20} />
          </span>
          <div>
            <span className="block text-sm font-bold text-[#1D1A39]">➕ Create Your Own Space</span>
            <small className="block text-xs text-muted">Launch a new campus community</small>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleTabClick('joined')}
          className="flex items-center gap-3.5 rounded-2xl border border-line bg-surface p-4 text-left transition hover:bg-[#F8F0F2]/50 group"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#AE445A] text-white group-hover:scale-105 transition-transform">
            <Bookmark size={20} />
          </span>
          <div>
            <span className="block text-sm font-bold text-[#1D1A39]">
              🔖 My Joined Spaces ({myJoinedCount})
            </span>
            <small className="block text-xs text-muted">View conversations in your active circles</small>
          </div>
        </button>
      </div>

      <div className="w-full space-y-6">
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#662549]">
              Trending Spaces
            </span>
            <span className="text-xs text-muted">Stories &amp; active hubs</span>
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setOpenModal(true)}
              className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
            >
              <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-dashed border-[#AE445A] p-0.5 group-hover:border-[#F39F5A] transition">
                <span className="grid h-full w-full place-items-center rounded-full bg-[#F8F0F2] text-[#451952] group-hover:bg-[#E8BCB9]/40 transition">
                  <Plus size={22} />
                </span>
              </div>
              <span className="text-[11px] font-semibold text-[#1D1A39]">New Space</span>
            </button>

            {spaces?.map(space => {
              const initials = space.name
                .split(' ')
                .map(w => w[0])
                .slice(0, 2)
                .join('')
              return (
                <Link
                  key={space.id}
                  to={`/spaces/${space.id}`}
                  className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
                >
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#AE445A] via-[#662549] to-[#F39F5A] transition-transform group-hover:scale-105">
                    <div className="grid h-15 w-15 place-items-center rounded-full bg-surface p-0.5">
                      <span className="grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-[#451952] to-[#AE445A] text-white font-bold text-xs shadow-inner">
                        {initials}
                      </span>
                    </div>
                  </div>
                  <span className="w-16 truncate text-center text-[11px] font-medium text-[#1D1A39] group-hover:text-[#451952]">
                    {space.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  selectedCategory === cat
                    ? 'bg-[#451952] text-white shadow-xs'
                    : 'bg-surface border border-line text-muted hover:border-[#E8BCB9] hover:text-[#451952]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-2.5 text-muted" size={16} />
            <Input
              className="pl-9 text-xs sm:text-sm rounded-xl py-1.5"
              placeholder="Search spaces &amp; topics..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {spaces === null && !error ? (
          <Spinner />
        ) : error ? (
          <Card className="text-center p-8">
            <p className="text-muted">{error}</p>
            <Button className="mt-3 bg-[#451952]" onClick={load}>
              Try again
            </Button>
          </Card>
        ) : filteredSpaces.length ? (
          <div className="space-y-6">
            {filteredSpaces.map((space, idx) => {
              const isUserMember = space.members?.includes(user?.uid)
              const visibility = space.visibility ?? 'campus'
              const isJoining = joiningMap[space.id]
              const isLiked = Boolean(likesMap[space.id])
              const latestPost = space.posts?.[0]
              const gradient = GRADIENT_PRESETS[idx % GRADIENT_PRESETS.length]
              const initials = space.name
                .split(' ')
                .map(w => w[0])
                .slice(0, 2)
                .join('')

              return (
                <Card
                  key={space.id}
                  className="overflow-hidden p-0 border border-line/80 shadow-sm hover:shadow-md transition bg-surface rounded-[24px]"
                >
                  <div className="flex items-center justify-between px-5 sm:px-7 py-4 border-b border-line/60">
                    <div className="flex items-center gap-3.5">
                      <div className="p-0.5 rounded-full bg-gradient-to-tr from-[#AE445A] to-[#F39F5A]">
                        <div className="grid h-11 w-11 place-items-center rounded-full bg-[#451952] text-white font-bold text-xs">
                          {initials}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <Link
                            to={`/spaces/${space.id}`}
                            className="font-bold text-base text-[#1D1A39] hover:text-[#451952] hover:underline"
                          >
                            {space.name}
                          </Link>
                          <span className="rounded-full bg-[#E8BCB9]/30 px-2.5 py-0.5 text-[11px] font-semibold text-[#662549]">
                            {space.category || 'Campus Life'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold text-[#662549]">
                            {visibility === 'private' ? <LockKeyhole size={12} /> : <Users size={12} />}
                            {visibility === 'private' ? 'Private' : visibility === 'campus' ? 'Campus' : 'Public'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                          <span>{space.campus}</span>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-medium text-[#662549]">
                            <Users size={13} /> {space.memberCount || space.members?.length || 1} members
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      loading={isJoining}
                      variant={isUserMember ? 'ghost' : 'primary'}
                      className={`text-xs sm:text-sm px-4 py-2 h-auto rounded-xl font-semibold transition ${
                        isUserMember
                          ? 'bg-[#F8F0F2] text-[#451952] border border-[#E8BCB9]/60 hover:bg-[#E8BCB9]/40'
                          : 'bg-[#451952] text-white hover:bg-[#662549]'
                      }`}
                      onClick={() => toggleMembership(space)}
                    >
                      {isUserMember ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Check size={15} /> Joined
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Plus size={15} /> Join Space
                        </span>
                      )}
                    </Button>
                  </div>

                  <div className={`p-6 sm:p-8 bg-gradient-to-br ${gradient} text-white relative overflow-hidden`}>
                    <div className="absolute right-6 top-6 text-white/10 pointer-events-none select-none">
                      <Sparkles size={110} />
                    </div>
                    <p className="relative z-10 text-base sm:text-lg font-medium leading-relaxed max-w-2xl text-white/95">
                      {space.description}
                    </p>

                    <div className="mt-5 relative z-10 rounded-2xl bg-black/25 backdrop-blur-md p-4 sm:p-5 border border-white/15">
                      <div className="flex items-center justify-between text-xs sm:text-sm text-white/80 font-semibold mb-1.5">
                        <span className="flex items-center gap-2 text-[#E8BCB9]">
                          <MessageCircle size={15} />
                          {latestPost
                            ? `Latest from ${latestPost.isAnonymous ? 'Anonymous' : latestPost.authorName}`
                            : 'Community Channel'}
                        </span>
                        <span className="text-xs text-white/70">
                          {latestPost ? `${latestPost.comments?.length || 0} replies` : 'Open'}
                        </span>
                      </div>
                      <p className="text-sm sm:text-base text-white/90 italic leading-relaxed">
                        {latestPost
                          ? `"${latestPost.text}"`
                          : 'No posts yet. Join and share what’s on your mind!'}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 sm:px-7 py-4 flex items-center justify-between border-t border-line/60 bg-surface">
                    <div className="flex items-center gap-5">
                      <button
                        type="button"
                        onClick={() => toggleLike(space.id)}
                        className={`flex items-center gap-1.5 text-sm font-semibold transition ${
                          isLiked ? 'text-[#AE445A]' : 'text-muted hover:text-[#AE445A]'
                        }`}
                      >
                        <Heart size={20} className={isLiked ? 'fill-[#AE445A]' : ''} />
                        <span>{isLiked ? 1 : 0}</span>
                      </button>

                      <Link
                        to={`/spaces/${space.id}`}
                        className="flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-[#451952] transition"
                      >
                        <MessageCircle size={20} />
                        <span>{space.posts?.length || 0}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleCopyLink(space.id)}
                        className="text-muted hover:text-[#451952] transition p-1"
                        aria-label="Share space"
                      >
                        <Share2 size={19} />
                      </button>
                    </div>

                    <Link
                      to={`/spaces/${space.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-[#451952] hover:text-[#AE445A] transition"
                    >
                      Explore Space Feed <ArrowRight size={16} />
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            title={
              search
                ? 'No spaces match that search'
                : `No spaces in ${selectedCategory} yet`
            }
          >
            <p>
              {search
                ? 'Try a different keyword or create a new space.'
                : 'Be the first to launch a community in this category!'}
            </p>
            <Button
              className="mt-4 bg-[#451952] hover:bg-[#662549]"
              onClick={() => setOpenModal(true)}
            >
              Create a space
            </Button>
          </EmptyState>
        )}
      </div>

      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Create a Campus Space">
        <form
          onSubmit={e => {
            e.preventDefault()
            handleCreateSpace(modalFormData)
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-[#1D1A39] mb-1">Space name</label>
            <Input
              className="mt-1"
              placeholder="e.g. AI &amp; Robotics Circle"
              value={modalFormData.name}
              onChange={e => setModalFormData({ ...modalFormData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1D1A39] mb-1">Category</label>
            <select
              value={modalFormData.category}
              onChange={e => setModalFormData({ ...modalFormData, category: e.target.value })}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none"
            >
              <option>Tech &amp; Coding</option>
              <option>Design &amp; Creative</option>
              <option>Study &amp; Exams</option>
              <option>Campus Life</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1D1A39] mb-1">
              What brings people together?
            </label>
            <Textarea
              className="mt-1"
              rows={3}
              placeholder="Tell people what this space is for, topics, and community vibe..."
              value={modalFormData.description}
              onChange={e => setModalFormData({ ...modalFormData, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1D1A39] mb-1">Visibility</label>
            <select
              value={modalFormData.visibility}
              onChange={e => setModalFormData({ ...modalFormData, visibility: e.target.value })}
              className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none"
            >
              <option value="public">Public — discoverable across campuses</option>
              <option value="private">Private — membership requires approval</option>
            </select>
            <p className="mt-1 text-xs text-muted">Private spaces are not listed publicly. Share the space link to accept requests.</p>
          </div>

          <Button
            type="submit"
            loading={modalSaving}
            className="w-full bg-[#451952] hover:bg-[#662549]"
          >
            Create space
          </Button>
        </form>
      </Modal>
    </div>
  )
}
