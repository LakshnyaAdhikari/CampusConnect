import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, BookOpen, Check, GraduationCap, MessageCircle, Sparkles, Users, X, Zap } from 'lucide-react'
import { Avatar, Button, Card, Input, Select, Spinner, Tag, Textarea, useToast } from '../components/ui'
import { getPublicUser, updateUser } from '../features/profile/service'
import { openChat } from '../features/messages/service'
import { cancelRequest, respondRequest, sendRequest } from '../features/connections/service'
import { listJoinedSpaces, listSpaces } from '../features/spaces/service'
import { useAuth } from '../context/AuthContext'
import { useConnectionStatus } from '../features/connections/hooks'
import { ReportButton } from '../features/admin/components/ReportButton'
import { CAMPUSES, INTERESTS, LOOKING_FOR, SKILLS } from '../lib/schema'

export default function Profile() {
  const { uid } = useParams()
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const toast = useToast()

  const own = uid === 'me' || uid === user?.uid || (profile && uid === profile.uid)
  const targetUid = own ? (user?.uid || profile?.uid) : uid

  const [p, setP] = useState(null)
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const status = useConnectionStatus(own ? '' : targetUid)

  useEffect(() => {
    setLoading(true)
    if (own) {
      if (profile) {
        setP(profile)
        setLoading(false)
      }
    } else {
      getPublicUser(targetUid)
        .then(res => {
          setP(res)
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
          toast('Could not find student profile', 'error')
        })
    }
  }, [uid, profile, own, targetUid])

  useEffect(() => {
    const spacesRequest = own ? listJoinedSpaces() : listSpaces()
    spacesRequest.then(res => setSpaces(res || [])).catch(() => {})
  }, [profile?.campus, own, user?.uid])

  const matchData = useMemo(() => {
    if (own || !profile || !p) {
      return { score: 0, reasons: [], sharedInterests: [], sharedLearn: [], sharedTeach: [], sharedGoals: [] }
    }
    const overlap = (a = [], b = []) => a.filter(x => b.includes(x))
    const sharedInterests = overlap(profile.interests, p.interests)
    const sharedLearn = overlap(profile.learn, p.teach)
    const sharedTeach = overlap(profile.teach, p.learn)
    const sharedGoals = overlap(profile.lookingFor, p.lookingFor)

    const reasons = [
      ...sharedLearn.map(x => `Can teach ${x}, which you want to learn`),
      ...sharedTeach.map(x => `You can teach ${x}, which they want to learn`),
      ...sharedInterests.map(x => `You both love ${x}`),
      ...sharedGoals.map(x => `You are both looking for a ${x.replaceAll('_', ' ')}`),
    ]
    const score = sharedLearn.length * 3 + sharedTeach.length * 3 + sharedInterests.length * 2 + sharedGoals.length
    return { score, reasons, sharedInterests, sharedLearn, sharedTeach, sharedGoals }
  }, [own, profile, p])

  const commonSpaces = useMemo(() => {
    if (!spaces.length || !p || !user) return []
    if (own) return spaces.filter(s => s.members?.includes(user.uid))
    return spaces.filter(s => s.members?.includes(user.uid) && s.members?.includes(p.uid))
  }, [spaces, p, own, user])

  const studentSpaces = useMemo(() => {
    if (!spaces.length || !p) return []
    return spaces.filter(s => s.members?.includes(p.uid))
  }, [spaces, p])

  const handleConnect = async () => {
    try {
      await sendRequest(targetUid)
      toast(`Connection request sent to ${p.name}`)
    } catch (err) {
      toast(err.message || 'Could not send request', 'error')
    }
  }

  const handleCancel = async () => {
    try {
      await cancelRequest(targetUid)
      toast('Request cancelled')
    } catch (err) {
      toast(err.message || 'Could not cancel request', 'error')
    }
  }

  const handleAccept = async () => {
    try {
      await respondRequest(targetUid, 'accepted')
      toast(`Connected with ${p.name}!`)
    } catch (err) {
      toast(err.message || 'Could not accept request', 'error')
    }
  }

  const handleReject = async () => {
    try {
      await respondRequest(targetUid, 'rejected')
      toast('Request declined')
    } catch (err) {
      toast(err.message || 'Could not decline request', 'error')
    }
  }

  const handleOpenChat = async () => {
    try {
      const chatId = await openChat(targetUid)
      nav(`/messages/${chatId}`)
    } catch (err) {
      toast(err.message || 'Could not open chat', 'error')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const profileData = {
        name: p.name,
        campus: p.campus,
        interests: p.interests || [],
        teach: p.teach || [],
        learn: p.learn || [],
        lookingFor: p.lookingFor || [],
        bio: p.bio || '',
        photoURL: p.photoURL || '',
        discoverable: p.discoverable ?? true,
      }

      await updateUser(user.uid, profileData)
      await refreshProfile()
      toast('Profile updated successfully!')
    } catch (err) {
      toast(err.message || 'Could not save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleArrayItem = (key, item) => {
    const list = p[key] || []
    const next = list.includes(item) ? list.filter(x => x !== item) : [...list, item]
    setP({ ...p, [key]: next })
  }

  if (loading || !p) return <Spinner />

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <button
        onClick={() => nav(-1)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <Card className="overflow-hidden p-0 border-line shadow-card bg-surface">
        <div className="discover-hero h-28 sm:h-36 relative overflow-hidden" />

        <div className="relative px-6 pb-6 pt-0 sm:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="-mt-12 sm:-mt-16 h-24 w-24 sm:h-28 sm:w-28 rounded-full ring-4 ring-white shadow-lg shrink-0 flex items-center justify-center bg-secondary font-bold text-3xl sm:text-4xl text-primary overflow-hidden bg-surface z-10">
              {p.photoURL ? (
                <img src={p.photoURL} alt={p.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                p.name?.[0] || '?'
              )}
            </div>

            {!own && (
              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-4">
                {status === 'none' && (
                  <Button onClick={handleConnect} className="inline-flex items-center gap-1.5 text-sm font-semibold">
                    <Sparkles size={15} />
                    Connect
                  </Button>
                )}
                {status === 'pending_sent' && (
                  <Button variant="secondary" onClick={handleCancel} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-danger">
                    <X size={15} />
                    Request Sent (Cancel)
                  </Button>
                )}
                {status === 'pending_received' && (
                  <div className="inline-flex items-center gap-1.5 bg-primary-50/70 border border-primary/20 rounded-xl p-1 shadow-xs">
                    <Button size="sm" onClick={handleAccept} className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold">
                      <Check size={14} />
                      Accept
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleReject} className="text-xs sm:text-sm font-medium text-muted hover:text-danger">
                      Reject
                    </Button>
                  </div>
                )}
                {status === 'accepted' && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary-50 px-3.5 py-2 font-bold text-primary text-xs sm:text-sm border border-primary/20">
                    <Check size={15} />
                    Connected G£ô
                  </span>
                )}

                <Button variant="secondary" className="inline-flex items-center gap-1.5 text-sm font-medium" onClick={handleOpenChat}>
                  <MessageCircle size={15} />
                  Send Message
                </Button>

                <ReportButton targetType="profile" targetId={targetUid} />
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1D1A39] tracking-tight">
                {p.name}
              </h1>
              <span className="rounded-full bg-primary-50 border border-primary/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                {p.role || 'student'}
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-berry mt-1.5">
              <GraduationCap size={16} className="text-rose" />
              {p.campus}
            </p>
          </div>

          <div className="mt-6 border-t border-line/60 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">About</h3>
            {own ? (
              <div className="mt-2 space-y-3">
                <Input
                  value={p.name || ''}
                  onChange={e => setP({ ...p, name: e.target.value })}
                  placeholder="Your full name"
                />
                <Select
                  value={p.campus || ''}
                  onChange={e => setP({ ...p, campus: e.target.value })}
                >
                  {CAMPUSES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
                <Input
                  type="url"
                  value={p.photoURL || ''}
                  onChange={e => setP({ ...p, photoURL: e.target.value })}
                  placeholder="Profile photo URL"
                  aria-label="Profile photo URL"
                />
                <Textarea
                  rows={3}
                  value={p.bio || ''}
                  onChange={e => setP({ ...p, bio: e.target.value })}
                  placeholder="Tell other students about your interests, projects, or what you're building..."
                />
                <label className="flex items-center gap-2 text-sm text-muted">
                  <input
                    type="checkbox"
                    checked={p.discoverable ?? true}
                    onChange={e => setP({ ...p, discoverable: e.target.checked })}
                    className="accent-primary"
                  />
                  Show my profile in Discover
                </label>
              </div>
            ) : (
              <p className="mt-1.5 text-sm leading-relaxed text-ink/90 sm:text-base">
                {p.bio || 'No bio provided yet.'}
              </p>
            )}
          </div>

          {!own && (
            <div className="mt-6 rounded-2xl border border-line/70 bg-background p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="stat-icon grid h-10 w-10 place-items-center rounded-xl text-primary">
                    <Sparkles size={19} className="text-apricot" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-ink">Match Score & Compatibility</h3>
                    <p className="text-xs text-muted">Calculated against your teach/learn skills & shared campus interests</p>
                  </div>
                </div>
                <span className="rounded-full bg-blush px-3.5 py-1 text-sm font-extrabold text-primary border border-rose/30 shadow-sm">
                  +{matchData.score} Match Points
                </span>
              </div>

              <div className="mt-3.5 border-t border-line/60 pt-3">
                <p className="text-xs font-bold uppercase tracking-wider text-berry mb-2">Why You Matched</p>
                {matchData.reasons.length > 0 ? (
                  <ul className="space-y-1.5 text-xs sm:text-sm">
                    {matchData.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-ink font-medium">
                        <Sparkles size={14} className="text-apricot shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">
                    No direct overlapping tags found yet, but a friendly campus hello is always a great start!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 border-line space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-berry flex items-center gap-1.5">
              <Sparkles size={15} className="text-apricot" />
              Interests & Hobbies
            </h3>
            {own && <span className="text-xs text-muted">Click to toggle</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {own ? (
              INTERESTS.map(item => (
                <Tag
                  key={item}
                  selected={p.interests?.includes(item)}
                  onClick={() => toggleArrayItem('interests', item)}
                >
                  {item}
                </Tag>
              ))
            ) : (p.interests?.length ? (
              p.interests.map(item => {
                const isShared = matchData.sharedInterests.includes(item)
                return (
                  <span
                    key={item}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border ${isShared ? 'bg-blush text-primary border-rose/40 shadow-sm' : 'bg-primary-50 text-muted border-line/60'}`}
                  >
                    {isShared ? `Gÿà ${item} (Shared)` : item}
                  </span>
                )
              })
            ) : (
              <span className="text-xs text-muted">No interests listed yet.</span>
            ))}
          </div>
        </div>

        <div className="border-t border-line/60 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-berry flex items-center gap-1.5">
              <Zap size={15} className="text-rose" />
              Can Teach (Skills)
            </h3>
            {own && <span className="text-xs text-muted">Skills you can share with peers</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {own ? (
              SKILLS.map(item => (
                <Tag
                  key={item}
                  selected={p.teach?.includes(item)}
                  onClick={() => toggleArrayItem('teach', item)}
                >
                  {item}
                </Tag>
              ))
            ) : (p.teach?.length ? (
              p.teach.map(item => {
                const youWant = profile?.learn?.includes(item)
                return (
                  <span
                    key={item}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border ${youWant ? 'bg-blush text-primary border-rose/40 shadow-sm' : 'bg-primary-50 text-muted border-line/60'}`}
                  >
                    {youWant ? `Gÿà ${item} (Shared -+ You want to learn)` : item}
                  </span>
                )
              })
            ) : (
              <span className="text-xs text-muted">No teaching skills listed yet.</span>
            ))}
          </div>
        </div>

        <div className="border-t border-line/60 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-berry flex items-center gap-1.5">
              <BookOpen size={15} className="text-secondary" />
              Wants to Learn
            </h3>
            {own && <span className="text-xs text-muted">Skills you're curious about</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {own ? (
              SKILLS.map(item => (
                <Tag
                  key={item}
                  selected={p.learn?.includes(item)}
                  onClick={() => toggleArrayItem('learn', item)}
                >
                  {item}
                </Tag>
              ))
            ) : (p.learn?.length ? (
              p.learn.map(item => {
                const youCanTeach = profile?.teach?.includes(item)
                return (
                  <span
                    key={item}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border ${youCanTeach ? 'bg-secondary/25 text-ink border-secondary/50 shadow-sm' : 'bg-primary-50 text-muted border-line/60'}`}
                  >
                    {youCanTeach ? `Gÿà ${item} (Shared -+ You can teach)` : item}
                  </span>
                )
              })
            ) : (
              <span className="text-xs text-muted">No learning goals listed yet.</span>
            ))}
          </div>
        </div>

        <div className="border-t border-line/60 pt-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-berry flex items-center gap-1.5">
              <GraduationCap size={15} className="text-primary" />
              Looking For
            </h3>
            {own && <span className="text-xs text-muted">Types of campus connections</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {own ? (
              LOOKING_FOR.map(item => (
                <Tag
                  key={item}
                  selected={p.lookingFor?.includes(item)}
                  onClick={() => toggleArrayItem('lookingFor', item)}
                >
                  {item.replaceAll('_', ' ')}
                </Tag>
              ))
            ) : (p.lookingFor?.length ? (
              p.lookingFor.map(item => {
                const isShared = matchData.sharedGoals.includes(item)
                return (
                  <span
                    key={item}
                    className={`rounded-full px-3 py-1 text-xs font-semibold capitalize border ${isShared ? 'bg-blush text-primary border-rose/40 shadow-sm' : 'bg-primary-50 text-muted border-line/60'}`}
                  >
                    {isShared ? `Gÿà ${item.replaceAll('_', ' ')} (Shared)` : item.replaceAll('_', ' ')}
                  </span>
                )
              })
            ) : (
              <span className="text-xs text-muted">No connection preferences specified.</span>
            ))}
          </div>
        </div>

        {own && (
          <div className="border-t border-line/60 pt-6 flex justify-end">
            <Button loading={saving} onClick={handleSave} className="px-6 py-2.5 font-bold">
              Save profile
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6 border-line">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-berry flex items-center gap-2">
            <Users size={16} className="text-primary" />
            {own ? 'My Campus Spaces' : (commonSpaces.length > 0 ? `Common Spaces & Domain Groups (${commonSpaces.length} Shared)` : `Spaces ${p.name.split(' ')[0]} Is Active In`)}
          </h3>
          <Link to="/spaces" className="text-xs font-bold text-rose hover:underline inline-flex items-center gap-1">
            Browse all Spaces
            <ArrowRight size={13} />
          </Link>
        </div>

        {commonSpaces.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {commonSpaces.map(s => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 font-bold text-primary text-xs">
                      {s.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-ink text-sm truncate">{s.name}</h4>
                      <p className="text-[11px] text-muted">{s.memberCount || s.members?.length || 0} members -+ {s.campus} -+ {(s.visibility ?? 'campus') === 'private' ? 'Private' : (s.visibility ?? 'campus') === 'campus' ? 'Campus' : 'Public'}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-line/50 flex justify-end">
                  <Link
                    to={`/spaces/${s.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600"
                  >
                    <span>Visit Space</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (!own && studentSpaces.length > 0) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {studentSpaces.map(s => (
              <div
                key={s.id}
                className="flex flex-col justify-between rounded-2xl border border-line bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary-50 font-bold text-primary text-xs">
                      {s.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-ink text-sm truncate">{s.name}</h4>
                      <p className="text-[11px] text-muted">{s.memberCount || s.members?.length || 0} members -+ {s.campus} -+ {(s.visibility ?? 'campus') === 'private' ? 'Private' : (s.visibility ?? 'campus') === 'campus' ? 'Campus' : 'Public'}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted line-clamp-2 leading-relaxed">
                    {s.description}
                  </p>
                </div>
                <div className="mt-3 pt-2 border-t border-line/50 flex justify-end">
                  <Link
                    to={`/spaces/${s.id}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-600"
                  >
                    <span>Visit Space</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-background p-6 text-center text-sm text-muted">
            <Users size={22} className="mx-auto text-muted/60 mb-2" />
            <p className="font-medium text-ink">
              {own ? 'You have not joined any campus spaces yet.' : `You and ${p.name.split(' ')[0]} don't share any active campus spaces yet.`}
            </p>
            <p className="text-xs text-muted mt-1">
              Campus Spaces are where students collaborate on topics, ask questions, and share study tips.
            </p>
            <Link to="/spaces" className="mt-3 inline-flex items-center gap-1 font-bold text-rose hover:underline text-xs">
              Explore Campus Spaces <ArrowRight size={12} />
            </Link>
          </div>
        )}
      </Card>
    </div>
  )
}
