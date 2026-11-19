
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  Filter,
  GraduationCap,
  Heart,
  MessageCircle,
  Search,
  Sparkles,
  X,
  Zap
} from 'lucide-react'

import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  Spinner,
  useToast
} from '../components/ui'

import { getMatches } from '../features/discover/service'
import {
  cancelRequest,
  sendRequest
} from '../features/connections/service'
import { openChat } from '../features/messages/service'
import { useAuth } from '../context/AuthContext'
import { useConnectionStatus } from '../features/connections/hooks'
import { CAMPUSES, INTERESTS, SKILLS } from '../lib/schema'

const purposes = [
  ['Any connection', '', Sparkles],
  ['Study partner', 'study_partner', BookOpen],
  ['Project mate', 'project_mate', BriefcaseBusiness],
  ['Friends', 'friends', Heart],
  ['Mentor', 'mentor', GraduationCap]
]

export default function Discover() {
  const { profile } = useAuth()
  const location = useLocation()
  const nav = useNavigate()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState(
    location.pathname === '/discover/for-you' ? 'for-you' : 'everyone'
  )

  const [allUsers, setAllUsers] = useState(null)
  const [matchResults, setMatchResults] = useState([])
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [interest, setInterest] = useState('')
  const [skill, setSkill] = useState('')
  const [goal, setGoal] = useState('')
  const [campus, setCampus] = useState('')
  const [sort, setSort] = useState('recommended')
  const [showFilters, setShowFilters] = useState(false)
  const [skillSwapOnly, setSkillSwapOnly] = useState(false)
  const [myCampusOnly, setMyCampusOnly] = useState(false)

  // Load matches from Firebase or mock service
  const loadData = async () => {
    if (!profile) return

    setError('')

    try {
      const matchesRes = await getMatches(profile)

      setMatchResults(matchesRes || [])

      setAllUsers(
        (matchesRes || []).map(match => match.user)
      )
    } catch (err) {
      console.error('Discover loading error:', err)
      setError('We could not load students right now. Try again.')
    }
  }

  useEffect(() => {
    loadData()
  }, [profile])

  // Enrich student profiles using backend match results
  const enrichedUsers = useMemo(() => {
    if (!allUsers) return []

    const matchMap = new Map(
      matchResults.map(match => [
        match.user.uid || match.user.id,
        match
      ])
    )

    return allUsers
      .filter(
        user =>
          user.uid !== (profile?.uid || profile?.id) &&
          user.discoverable !== false
      )
      .map(user => {
        const match = matchMap.get(user.uid || user.id)

        return {
          user,
          score: match?.score ?? 0,
          reasons: match?.reasons ?? [],
          sharedInterests: match?.sharedInterests ?? [],
          sharedLearn: match?.sharedLearn ?? [],
          sharedTeach: match?.sharedTeach ?? [],
          sharedGoals: match?.sharedGoals ?? []
        }
      })
  }, [allUsers, matchResults, profile])

  // Count students with positive matching scores
  const topMatchesCount = useMemo(() => {
    return enrichedUsers.filter(item => item.score > 0).length
  }, [enrichedUsers])

  // Count skill exchange opportunities
  const skillSwapCount = useMemo(() => {
    if (!profile) return 0

    return enrichedUsers.filter(match =>
      match.sharedLearn.length > 0 ||
      match.sharedTeach.length > 0
    ).length
  }, [enrichedUsers, profile])

  // Search, filtering and sorting
  const displayedList = useMemo(() => {
    const term = search.trim().toLowerCase()

    let list =
      activeTab === 'for-you'
        ? enrichedUsers.filter(item => item.score > 0)
        : enrichedUsers

    return list
      .filter(({ user }) => {
        if (
          myCampusOnly &&
          profile &&
          user.campus !== profile.campus
        ) {
          return false
        }

        if (campus && user.campus !== campus) return false

        if (
          interest &&
          !user.interests?.includes(interest)
        ) {
          return false
        }

        if (
          skill &&
          !user.teach?.includes(skill) &&
          !user.learn?.includes(skill)
        ) {
          return false
        }

        if (
          goal &&
          !user.lookingFor?.includes(goal)
        ) {
          return false
        }

        if (
          skillSwapOnly &&
          !(
            profile &&
            (
              user.teach?.some(t => profile.learn?.includes(t)) ||
              user.learn?.some(l => profile.teach?.includes(l))
            )
          )
        ) {
          return false
        }

        if (term) {
          const hay = `
            ${user.name || ''}
            ${user.bio || ''}
            ${(user.interests || []).join(' ')}
            ${(user.teach || []).join(' ')}
            ${(user.learn || []).join(' ')}
            ${user.campus || ''}
          `.toLowerCase()

          if (!hay.includes(term)) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sort === 'name') {
          return (a.user.name || '').localeCompare(
            b.user.name || ''
          )
        }

        if (sort === 'newest') {
          return (
            (b.user.createdAt || 0) -
            (a.user.createdAt || 0)
          )
        }

        return b.score - a.score
      })
  }, [
    enrichedUsers,
    activeTab,
    search,
    interest,
    skill,
    goal,
    campus,
    sort,
    skillSwapOnly,
    myCampusOnly,
    profile
  ])

  // Clear all active filters
  const clearFilters = () => {
    setSearch('')
    setInterest('')
    setSkill('')
    setGoal('')
    setCampus('')
    setSkillSwapOnly(false)
    setMyCampusOnly(false)
  }

  const activeFiltersCount = [
    interest,
    skill,
    goal,
    campus,
    skillSwapOnly,
    myCampusOnly
  ].filter(Boolean).length

  if (!profile || (!allUsers && !error)) {
    return <Spinner />
  }

  return (
    <div className="space-y-6">

      {/* Discover Hero */}
      <section className="discover-hero relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8 lg:p-10">
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">

          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
              <Sparkles size={14} className="text-apricot" />
              YOUR CAMPUS, CLOSER
            </div>

            <h1 className="text-3xl font-bold sm:text-4xl">
              Meet your campus
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
              Explore students across campus circles by what they build,
              study, and teach. Connect, swap skills, and start conversations.
            </p>

            <div className="mt-6 flex flex-wrap gap-2.5">
              <button
                onClick={() => setActiveTab('everyone')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'everyone'
                    ? 'bg-white text-primary shadow-md'
                    : 'border border-white/25 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <GraduationCap size={15} />
                Browse everyone ({enrichedUsers.length})
              </button>

              <button
                onClick={() => setActiveTab('for-you')}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === 'for-you'
                    ? 'bg-white text-primary shadow-md'
                    : 'border border-white/25 bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Sparkles
                  size={14}
                  className={
                    activeTab === 'for-you'
                      ? 'text-primary'
                      : 'text-apricot'
                  }
                />
                Top matches ({topMatchesCount})
              </button>
            </div>
          </div>

          <div className="relative z-10 w-full shrink-0 rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur-md lg:w-72 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-apricot">
                Your Match Profile
              </span>

              <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                {profile?.campus || 'Campus'}
              </span>
            </div>

            <div className="mt-3">
              <p className="text-3xl font-extrabold text-white tracking-tight">
                {topMatchesCount} Top Matches
              </p>

              <p className="mt-1 text-xs text-white/75 leading-relaxed">
                Based on your shared skills & interests
              </p>
            </div>

            <Link
              to="/spaces"
              className="mt-4 flex items-center justify-between rounded-xl bg-white/15 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/25"
            >
              <span>Explore Campus Spaces</span>
              <ArrowRight size={14} />
            </Link>
          </div>

        </div>
      </section>

      {/* Match Radar */}
      <section className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-line bg-surface p-3.5 shadow-sm">

        <div className="flex items-center gap-1.5 shrink-0 text-xs font-bold uppercase tracking-wider text-berry pr-2 border-r border-line/60">
          <Sparkles size={14} className="text-apricot" />
          <span>Match Radar</span>
        </div>

        <button
          onClick={() => setSkillSwapOnly(prev => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            skillSwapOnly
              ? 'bg-primary text-white shadow-sm'
              : 'border border-line bg-primary-50 text-primary hover:border-primary/40'
          }`}
        >
          <Zap
            size={13}
            className={skillSwapOnly ? 'text-apricot' : 'text-rose'}
          />
          <span>⚡ SkillSwap Matches</span>

          {skillSwapCount > 0 && (
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                skillSwapOnly
                  ? 'bg-white/20 text-white'
                  : 'bg-primary/10 text-primary'
              }`}
            >
              {skillSwapCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setMyCampusOnly(prev => !prev)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
            myCampusOnly
              ? 'bg-primary text-white shadow-sm'
              : 'border border-line bg-primary-50 text-primary hover:border-primary/40'
          }`}
        >
          <GraduationCap size={14} />
          <span>🏫 My Campus Only</span>
        </button>

        <div className="ml-auto hidden sm:flex items-center gap-2 text-xs text-muted">
          <span className="shrink-0 text-muted/70">
            Your swap tags:
          </span>

          <span className="font-semibold text-ink truncate max-w-[220px]">
            {[
              ...(profile?.teach || []).map(t => `Teach: ${t}`),
              ...(profile?.learn || []).map(l => `Learn: ${l}`)
            ].slice(0, 3).join(' · ') || 'No swap tags set'}
          </span>

          <Link
            to={`/profile/${profile?.uid || profile?.id || 'me'}`}
            className="inline-flex items-center gap-0.5 font-bold text-rose hover:underline shrink-0"
          >
            <span>Edit my tags</span>
            <ArrowRight size={12} />
          </Link>
        </div>

      </section>

      {/* Students and Filters */}
      <section className="space-y-4">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">
              {activeTab === 'everyone'
                ? 'All Campus Students'
                : 'People you could click with'}
            </h2>

            {activeTab === 'for-you' && (
              <p className="mt-1 text-sm text-muted">
                Thoughtful ranked matches tailored directly to your teach/learn profile.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="inline-flex items-center gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={17} />
              Filters

              {activeFiltersCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-white">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            <label className="relative min-w-0 flex-1 lg:w-64">
              <Search
                className="absolute left-3 top-3 text-muted"
                size={17}
              />

              <Input
                className="pl-9"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Search people or skills"
              />
            </label>
          </div>
        </div>

        {/* Connection Purposes */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {purposes.map(([label, value, Icon]) => (
            <button
              key={label}
              onClick={() => setGoal(value)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                goal === value
                  ? 'border-primary bg-primary text-white shadow-sm'
                  : 'border-line bg-surface text-muted hover:border-primary/40 hover:text-primary'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="grid gap-3 border-primary/15 bg-white sm:grid-cols-2 lg:grid-cols-4">

            <label className="text-xs font-semibold text-muted">
              INTEREST

              <select
                className="mt-1 block w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink"
                value={interest}
                onChange={event => setInterest(event.target.value)}
              >
                <option value="">Any interest</option>

                {INTERESTS.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-muted">
              SKILL (TEACH OR LEARN)

              <select
                className="mt-1 block w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink"
                value={skill}
                onChange={event => setSkill(event.target.value)}
              >
                <option value="">Any skill</option>

                {SKILLS.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-muted">
              CAMPUS

              <select
                className="mt-1 block w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink"
                value={campus}
                onChange={event => setCampus(event.target.value)}
              >
                <option value="">All campuses</option>

                {CAMPUSES.map(item => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-muted">
              SORT BY

              <select
                className="mt-1 block w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink"
                value={sort}
                onChange={event => setSort(event.target.value)}
              >
                <option value="recommended">Best match</option>
                <option value="name">Name</option>
                <option value="newest">Recently active</option>
              </select>
            </label>

            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                onClick={clearFilters}
              >
                <X size={15} />
                Clear filters
              </button>
            </div>

          </Card>
        )}

        {/* Error State */}
        {error ? (
          <Card className="text-center p-8">
            <p className="text-muted">{error}</p>

            <Button className="mt-3" onClick={loadData}>
              Try again
            </Button>
          </Card>

        ) : displayedList.length ? (

          /* Student Cards */
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {displayedList.map(item => (
              <StudentCard
                key={item.user.uid || item.user.id}
                item={item}
                myProfile={profile}
                onMessage={async uid =>
                  nav(`/messages/${await openChat(uid)}`)
                }
                toast={toast}
              />
            ))}
          </div>

        ) : (

          /* Empty State */
          <EmptyState title="No students found with those filters">
            <p>
              Try clearing filters or toggling off "My Campus Only".
            </p>

            <Button
              variant="secondary"
              className="mt-4"
              onClick={clearFilters}
            >
              Show everyone
            </Button>
          </EmptyState>
        )}

      </section>
    </div>
  )
}

// Student Card Component
function StudentCard({ item, myProfile, onMessage, toast }) {
  const {
    user,
    score,
    reasons,
    sharedInterests = [],
    sharedLearn = [],
    sharedTeach = []
  } = item

  const targetId = user.uid || user.id
  const status = useConnectionStatus(targetId)

  // Send connection request
  const handleConnect = async () => {
    try {
      await sendRequest(targetId)
      toast(`Request sent to ${user.name}`)
    } catch (err) {
      toast(err.message || 'Could not send request', 'error')
    }
  }

  // Cancel connection request
  const handleCancel = async () => {
    try {
      await cancelRequest(targetId)
      toast('Request cancelled')
    } catch (err) {
      toast(err.message || 'Could not cancel request', 'error')
    }
  }

  return (
    <Card className="match-card group overflow-hidden p-0 border-line/80 flex flex-col justify-between">

      <div>
        <div className="match-card-top h-2" />

        <div className="p-5 sm:p-6">

          <div className="flex items-start gap-4">
            <Link to={`/profile/${targetId}`}>
              <Avatar user={user} />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">

                <Link
                  to={`/profile/${targetId}`}
                  className="text-lg font-bold text-ink hover:text-primary"
                >
                  {user.name}
                </Link>

                <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  {user.role || 'student'}
                </span>

                {score > 0 && (
                  <span className="match-score rounded-full px-2.5 py-0.5 text-xs font-bold text-berry bg-blush/40 ml-auto">
                    +{score} match points
                  </span>
                )}

              </div>

              <p className="mt-0.5 text-xs font-medium text-muted">
                {user.campus}
              </p>

              <p className="mt-2.5 text-sm leading-relaxed text-ink/90 line-clamp-2">
                {user.bio}
              </p>
            </div>
          </div>

          {/* Compatibility Reasons */}
          <div className="mt-4 rounded-2xl bg-background p-3.5 border border-line/50">
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-berry">
              Why you might click
            </p>

            {reasons.length ? (
              <ul className="space-y-1.5 text-xs sm:text-sm">
                {reasons.slice(0, 3).map(reason => (
                  <li
                    key={reason}
                    className="flex items-start gap-2 text-ink"
                  >
                    <Sparkles
                      className="mt-0.5 shrink-0 text-apricot"
                      size={14}
                    />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">
                A fellow student with diverse interests. Great potential collaborator.
              </p>
            )}
          </div>

          {/* Interests and Skill Exchange */}
          <div className="mt-4 space-y-2">

            <div className="flex flex-wrap items-center gap-1">
              {(user.interests || []).slice(0, 4).map(tag => {
                const isShared = sharedInterests.includes(tag)

                return (
                  <span
                    key={tag}
                    className={`m-0.5 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      isShared
                        ? 'bg-blush text-primary font-bold border border-rose/30'
                        : 'bg-primary-50 text-muted'
                    }`}
                  >
                    {isShared ? `★ ${tag} (Shared)` : tag}
                  </span>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted pt-1">

              {sharedLearn.length > 0 && (
                <span className="text-berry font-medium">
                  Can teach you:{' '}
                  <b className="text-ink">
                    {sharedLearn.join(', ')}
                  </b>
                </span>
              )}

              {sharedTeach.length > 0 && (
                <span className="text-rose font-medium">
                  Wants to learn:{' '}
                  <b className="text-ink">
                    {sharedTeach.join(', ')}
                  </b>
                </span>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* Card Actions */}
      <div className="p-5 sm:p-6 pt-0">
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line/60">

          {status === 'none' && (
            <Button
              onClick={handleConnect}
              className="text-sm font-semibold"
            >
              Connect
            </Button>
          )}

          {status === 'pending_sent' && (
            <Button
              variant="secondary"
              onClick={handleCancel}
              className="text-sm text-muted hover:text-danger"
            >
              Request Sent (Cancel)
            </Button>
          )}

          {status === 'pending_received' && (
            <Link to="/connections">
              <Button className="text-sm font-semibold">
                Respond
              </Button>
            </Link>
          )}

          {status === 'accepted' && (
            <span className="rounded-xl bg-primary-50 px-3.5 py-2 text-xs font-bold text-primary inline-flex items-center gap-1 border border-primary/20">
              <Check size={14} />
              Connected ✓
            </span>
          )}

          <Button
            variant="secondary"
            className="inline-flex items-center gap-1.5 text-sm"
            onClick={() => onMessage(targetId)}
          >
            <MessageCircle size={15} />
            Message
          </Button>

          <Link
            to={`/profile/${targetId}`}
            className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-rose transition"
          >
            <span>View Full Profile</span>
            <ArrowRight size={14} />
          </Link>

        </div>
      </div>

    </Card>
  )
}
