import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button, Card, Spinner } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import OverviewPanel from '../features/admin/components/OverviewPanel'
import StudentManagementPanel from '../features/admin/components/StudentManagementPanel'
import SpaceManagementPanel from '../features/admin/components/SpaceManagementPanel'
import ReportsModerationPanel from '../features/admin/components/ReportsModerationPanel'

const sections = [
  { id: 'overview', label: 'Overview', Icon: BarChart3 },
  { id: 'students', label: 'Student Management', Icon: Users },
  { id: 'spaces', label: 'Space Management', Icon: Sparkles },
  { id: 'reports', label: 'Reports / Moderation', Icon: ShieldCheck },
]

const panelBySection = {
  overview: OverviewPanel,
  students: StudentManagementPanel,
  spaces: SpaceManagementPanel,
  reports: ReportsModerationPanel,
}

export default function Admin({ denied = false }) {
  const { user, profile, isAdmin, loading, roleLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState('overview')
  const [logoutBusy, setLogoutBusy] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const logout = async () => {
    setLogoutBusy(true)
    setLogoutError('')
    try {
      await signOut()
      navigate('/admin/login')
    } catch (error) {
      setLogoutError(error.message || 'Could not sign out. Try again.')
    } finally {
      setLogoutBusy(false)
    }
  }

  if (loading || roleLoading) return <Spinner />

  if (denied || !user || !isAdmin) {
    return <main className="grid min-h-screen place-items-center bg-background p-5 text-ink dark:bg-[#121217] dark:text-[#F4F4F6]">
      <Card className="w-full max-w-lg text-center">
        <ShieldCheck className="mx-auto mb-4 text-danger" size={34} />
        <h1 className="text-2xl font-bold">Administrator access required</h1>
        <p className="my-3 text-sm text-muted">This page requires an authenticated administrator account.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link to="/admin/login"><Button>Administrator sign in</Button></Link>
          <Link to="/discover"><Button variant="secondary">Student dashboard</Button></Link>
          {user && <Button variant="ghost" onClick={logout} loading={logoutBusy}>Sign out</Button>}
        </div>
        {logoutError && <p role="alert" className="mt-4 text-sm text-danger">{logoutError}</p>}
      </Card>
    </main>
  }

  const ActivePanel = panelBySection[section] || OverviewPanel
  const displayName = profile?.name || user.displayName || 'Administrator'
  const initial = displayName.trim().charAt(0).toUpperCase() || 'A'

  return <div className="app-shell min-h-screen md:flex">
    <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:h-screen md:w-72 md:flex-col md:overflow-hidden border-r border-line/80 bg-surface p-5 dark:border-[#2E2E3A] dark:bg-[#1A1A22]">
      <div className="shrink-0">
        <Brand />
        <div className="mt-4 mb-3 rounded-2xl border border-[#E8BCB9]/40 bg-[#F8F0F2] p-3 shadow-xs dark:border-[#2E2E3A] dark:bg-[#23232E]">
          <div className="flex items-center gap-3">
            <span className="profile-avatar grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold">{initial}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6]">{displayName}</p>
              <p className="truncate text-xs text-muted dark:text-[#A1A1B0]">{user.email || 'Administrator'}</p>
            </div>
            <button type="button" aria-label="Sign out" onClick={logout} disabled={logoutBusy} className="rounded-xl p-1.5 text-muted transition hover:bg-[#E8BCB9]/30 hover:text-rose disabled:opacity-50 dark:text-[#A1A1B0] dark:hover:bg-[#2E2E3A] dark:hover:text-[#E59858]">
              <LogOut size={17} />
            </button>
          </div>
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-primary dark:bg-[#2E2E3A] dark:text-[#E59858]">
            <ShieldCheck size={13} /> Trusted administrator
          </span>
        </div>
        <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[.18em] text-muted dark:text-[#717182]">Campus operations</p>
      </div>

      <nav aria-label="Admin dashboard sections" className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {sections.map(({ id, label, Icon }) => <SectionButton key={id} id={id} label={label} Icon={Icon} active={section === id} onClick={() => setSection(id)} />)}
      </nav>

      <div className="mt-3 shrink-0 border-t border-line/70 pt-3 dark:border-[#2E2E3A]">
        <Link to="/discover" className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-muted transition hover:bg-primary-50/70 hover:text-primary dark:text-[#A1A1B0] dark:hover:bg-[#23232E] dark:hover:text-[#F4F4F6]">
          <GraduationCap size={19} /> Back to Student Dashboard
        </Link>
      </div>
    </aside>

    <div className="min-w-0 flex-1 md:pl-72">
      <header className="app-topbar flex items-center justify-between border-b border-line/70 bg-surface px-4 py-3 dark:border-[#2E2E3A] dark:bg-[#1A1A22] md:hidden">
        <Brand compact />
        <button type="button" aria-label="Sign out" onClick={logout} disabled={logoutBusy} className="rounded-xl p-2 text-muted transition hover:bg-primary-50 hover:text-rose disabled:opacity-50 dark:text-[#A1A1B0] dark:hover:bg-[#23232E]">
          <LogOut size={19} />
        </button>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 md:px-10 md:py-9">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-berry">CampusConnect · Admin workspace</p>
            <h1 className="text-2xl font-bold text-ink dark:text-[#F4F4F6] sm:text-3xl">{sections.find(item => item.id === section)?.label}</h1>
            <p className="mt-2 text-sm text-muted dark:text-[#A1A1B0]">Campus operations and community health.</p>
          </div>
          <Link to="/discover" className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-primary transition hover:border-primary/40 hover:bg-primary-50 sm:inline-flex dark:border-[#2E2E3A] dark:bg-[#1A1A22] dark:text-[#E59858]">
            <GraduationCap size={17} /> Student dashboard
          </Link>
        </header>

        {logoutError && <div role="alert" className="mb-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{logoutError}</div>}
        <ActivePanel expectedUid={user.uid} campus={profile?.campus || ''} />
      </main>
    </div>

    <nav aria-label="Mobile admin sections" className="mobile-dock fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-line/80 p-2 shadow-card md:hidden">
      {sections.map(({ id, label, Icon }) => <button key={id} type="button" aria-current={section === id ? 'page' : undefined} onClick={() => setSection(id)} className={`mobile-nav-link flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px] transition ${section === id ? 'active' : ''}`}>
        <Icon size={19} />
        <span className="max-w-full truncate">{id === 'students' ? 'Students' : id === 'spaces' ? 'Spaces' : id === 'reports' ? 'Reports' : 'Overview'}</span>
      </button>)}
    </nav>
  </div>
}

function Brand({ compact = false }) {
  return <Link to="/admin" className="flex min-w-0 items-center gap-3">
    <span className="brand-mark grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow"><GraduationCap size={23} /></span>
    <span className="min-w-0"><b className="block truncate text-lg leading-tight text-primary dark:text-[#F4F4F6]">CampusConnect</b>{!compact && <small className="text-xs text-muted dark:text-[#A1A1B0]">Good people. Right here.</small>}</span>
  </Link>
}

function SectionButton({ id, label, Icon, active, onClick }) {
  return <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined} className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm transition ${active ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-primary-50/70 hover:text-primary dark:text-[#A1A1B0] dark:hover:bg-[#23232E] dark:hover:text-[#F4F4F6]'}`}>
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? 'bg-white/15' : 'group-hover:bg-white dark:group-hover:bg-[#2E2E3A]'}`}><Icon size={19} /></span>
    <span className="min-w-0"><b className="block truncate">{label}</b><small className={`block text-xs ${active ? 'text-white/70' : 'opacity-70'}`}>{id === 'overview' ? 'Campus snapshot' : id === 'students' ? 'Discoverable directory' : id === 'spaces' ? 'Visible communities' : 'Review submissions'}</small></span>
  </button>
}
