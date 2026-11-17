import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Compass, Users, MessageCircle, Sparkles, Shield, Settings, GraduationCap, LogOut, Network, Bell } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePendingCount } from '../features/connections/hooks'
import { listenNotifications } from '../features/notifications/service'
import { store, notify } from '../lib/mockData'
import { isMock } from '../lib/config'

const links = [
  ['/discover', 'Discover', Compass, 'Find your people'],
  ['/connections', 'Connections', Users, 'Your growing circle'],
  ['/connect-map', 'ConnectMap', Network, 'Mutuals & circle tree', 'Soon'],
  ['/notifications', 'Notifications', Bell, 'Requests & activity'],
  ['/messages', 'Messages', MessageCircle, 'Pick up the chat'],
  ['/spaces', 'Spaces', Sparkles, 'Meet around interests']
]

export default function AppLayout(){
  const {user, profile, role, signOut} = useAuth()
  const count = usePendingCount()
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const nav = useNavigate()
  const rows = [...links, ...(role === 'admin' || role === 'moderator' ? [['/admin','Admin',Shield,'Community care']] : [])]
  const logout = async()=>{await signOut();nav('/')}
  const userProfileUid = user?.uid || profile?.uid || 'me'

  useEffect(() => {
    if (!user?.uid) {
      setUnreadNotifications(0)
      return undefined
    }
    try {
      return listenNotifications(user.uid, items => {
        setUnreadNotifications(items.filter(item => !item.read).length)
      }, error => {
        console.error('Could not update notification count:', error)
        setUnreadNotifications(0)
      })
    } catch (error) {
      console.error('Could not subscribe to notification count:', error)
      setUnreadNotifications(0)
      return undefined
    }
  }, [user?.uid])

  useEffect(() => {
    const savedTheme = localStorage.getItem('cc_theme')
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  return (
    <div className="app-shell min-h-screen md:flex">
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:w-72 md:h-screen md:flex md:flex-col md:overflow-hidden z-30 border-r border-line/80 bg-surface dark:bg-[#1A1A22] dark:border-[#2E2E3A] p-5">
        <div className="shrink-0">
          <NavHeader/>
          <div className="mt-4 mb-3 rounded-2xl border border-[#E8BCB9]/40 bg-[#F8F0F2] dark:bg-[#23232E] dark:border-[#2E2E3A] p-3 shadow-xs">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={()=>nav(`/profile/${userProfileUid}`)}
                className="profile-avatar grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold transition hover:opacity-90"
              >
                {profile?.name?.[0]||'C'}
              </button>
              <div
                onClick={()=>nav(`/profile/${userProfileUid}`)}
                className="min-w-0 flex-1 cursor-pointer"
              >
                <p className="truncate text-sm font-semibold text-[#1D1A39] dark:text-[#F4F4F6] hover:underline">{profile?.name||'Campus guest'}</p>
                <p className="truncate text-xs text-muted dark:text-[#A1A1B0]">{profile?.campus||'Join the community'}</p>
              </div>
              <button aria-label="Settings" onClick={()=>nav('/settings')} className="rounded-xl p-1.5 text-muted hover:bg-[#E8BCB9]/30 hover:text-[#451952] dark:text-[#A1A1B0] dark:hover:bg-[#2E2E3A] dark:hover:text-[#F4F4F6] transition">
                <Settings size={17}/>
              </button>
              <button aria-label="Sign out" onClick={logout} className="rounded-xl p-1.5 text-muted hover:bg-[#E8BCB9]/30 hover:text-[#AE445A] dark:text-[#A1A1B0] dark:hover:bg-[#2E2E3A] dark:hover:text-[#E59858] transition">
                <LogOut size={17}/>
              </button>
            </div>
            {isMock('auth') && (
              <div className="mt-2.5 pt-2 border-t border-[#E8BCB9]/30 dark:border-[#2E2E3A] flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted dark:text-[#717182] shrink-0">Role</label>
                <select
                  aria-label="Development role"
                  value={role||'student'}
                  onChange={e=>{const cur=store.users.find(u=>u.uid===profile?.uid);if(cur){cur.role=e.target.value;notify()}}}
                  className="rounded-lg border border-line bg-background px-2 py-1 text-xs text-ink focus:outline-none dark:bg-[#1A1A22] dark:text-[#F4F4F6] dark:border-[#2E2E3A]"
                >
                  <option>student</option>
                  <option>moderator</option>
                  <option>admin</option>
                </select>
              </div>
            )}
          </div>
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[.18em] text-muted dark:text-[#717182]">Your campus</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          <Nav rows={rows} count={count} unreadNotifications={unreadNotifications}/>
        </div>
      </aside>

      <div className="min-w-0 flex-1 md:pl-72">
        <header className="app-topbar flex items-center justify-between px-4 py-3 md:hidden">
          <NavHeader compact/>
          <div className="flex items-center gap-2">
            <button aria-label="Settings" onClick={()=>nav('/settings')} className="rounded-xl p-2 text-muted dark:text-[#A1A1B0]"><Settings size={19}/></button>
            <button aria-label="Sign out" onClick={logout} className="rounded-xl p-2 text-muted dark:text-[#A1A1B0]"><LogOut size={19}/></button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 md:px-10 md:py-9"><Outlet/></main>
      </div>

      <nav className="mobile-dock fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-line/80 p-2 shadow-card md:hidden">
        <Nav rows={rows} count={count} unreadNotifications={unreadNotifications} mobile/>
      </nav>
    </div>
  )
}

function NavHeader({compact=false}){
  return (
    <NavLink to="/discover" className="flex items-center gap-3">
      <span className="brand-mark grid h-11 w-11 place-items-center rounded-2xl text-white shadow"><GraduationCap size={23}/></span>
      <span><b className="block text-lg leading-tight text-primary dark:text-[#F4F4F6]">CampusConnect</b>{!compact && <small className="text-xs text-muted dark:text-[#A1A1B0]">Good people. Right here.</small>}</span>
    </NavLink>
  )
}

function Nav({rows, count, unreadNotifications, mobile=false}){
  return (
    <div className={mobile ? 'flex w-full justify-around' : 'space-y-1.5'}>
      {rows.map(([to, label, Icon, subtitle, tag]) => (
        <NavLink key={to} to={to} className={({isActive})=>`${mobile ? 'mobile-nav-link flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px]' : 'group flex items-center justify-between rounded-2xl px-3 py-3'} ${isActive ? 'nav-active' : 'text-muted dark:text-[#A1A1B0] hover:bg-primary-50/70 dark:hover:bg-[#23232E] hover:text-primary dark:hover:text-[#F4F4F6]'}`}>
          <div className={`flex items-center ${mobile ? 'flex-col gap-1' : 'gap-3 min-w-0'}`}>
            <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl">
              <Icon size={20}/>
              {label==='Connections' && count>0 && <b className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-apricot px-1 text-[10px] text-primary">{count}</b>}
              {label==='Notifications' && unreadNotifications>0 && <b className="absolute -right-2 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#9E3B50] px-1 text-[9px] font-bold text-white">{unreadNotifications>99?'99+':unreadNotifications}</b>}
            </span>
            {mobile ? (
              <span className="truncate">{label}</span>
            ) : (
              <span className="min-w-0">
                <b className="block text-sm">{label}</b>
                <small className="block text-xs opacity-70">{subtitle}</small>
              </span>
            )}
          </div>
          {!mobile && tag && (
            <span className="ml-2 rounded-full bg-[#F39F5A]/20 dark:bg-[#23232E] dark:border dark:border-[#2E2E3A] px-2 py-0.5 text-[10px] font-bold text-[#662549] dark:text-[#E59858]">
              {tag}
            </span>
          )}
        </NavLink>
      ))}
    </div>
  )
}
