import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Compass, Users, MessageCircle, Sparkles, UserRound, Shield, Settings, GraduationCap, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePendingCount } from '../features/connections/hooks'
import { store, notify } from '../lib/mockData'
import { isMock } from '../lib/config'

const links=[['/discover','Discover',Compass,'Find your people'],['/connections','Connections',Users,'Your growing circle'],['/messages','Messages',MessageCircle,'Pick up the chat'],['/spaces','Spaces',Sparkles,'Meet around interests'],['/profile/me','Profile',UserRound,'Your campus profile']]

export default function AppLayout(){
  const {profile,role,signOut}=useAuth()
  const count=usePendingCount()
  const nav=useNavigate()
  const rows=[...links,...(role==='admin'||role==='moderator'?[['/admin','Admin',Shield,'Community care']]:[])]
  const logout=async()=>{await signOut();nav('/')}
  return <div className="app-shell min-h-screen md:flex">
    <aside className="hidden w-[286px] shrink-0 border-r border-line/80 bg-surface p-5 md:flex md:flex-col">
      <NavHeader/>
      <p className="mb-3 mt-9 px-3 text-[11px] font-bold uppercase tracking-[.18em] text-muted">Your campus</p>
      <Nav rows={rows} count={count}/>
      <div className="sidebar-prompt mt-auto mb-5 rounded-2xl p-4 text-white"><Sparkles size={19}/><p className="mt-3 font-semibold">Your next idea starts here.</p><p className="mt-1 text-xs leading-relaxed text-white/70">Find a space, share an idea, and bring people together.</p><NavLink to="/spaces" className="mt-3 inline-flex items-center text-sm font-semibold">Explore spaces <ChevronRight size={16}/></NavLink></div>
      {isMock('auth')&&<label className="mb-3 block px-1 text-xs text-muted">Preview role<select aria-label="Development role" value={role||'student'} onChange={event=>{const current=store.users.find(item=>item.uid===profile?.uid);if(current){current.role=event.target.value;notify()}}} className="mt-1 w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink"><option>student</option><option>moderator</option><option>admin</option></select></label>}
      <div className="flex items-center gap-3 border-t border-line pt-4"><div className="profile-avatar grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold">{profile?.name?.[0]||'C'}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{profile?.name||'Campus guest'}</p><p className="truncate text-xs text-muted">{profile?.campus||'Join the community'}</p></div><button aria-label="Settings" onClick={()=>nav('/settings')} className="rounded-xl p-2 text-muted hover:bg-primary-50 hover:text-primary"><Settings size={18}/></button><button aria-label="Sign out" onClick={logout} className="rounded-xl p-2 text-muted hover:bg-primary-50 hover:text-primary"><LogOut size={18}/></button></div>
    </aside>
    <div className="min-w-0 flex-1"><header className="app-topbar flex items-center justify-between px-4 py-3 md:hidden"><NavHeader compact/><div className="flex items-center gap-2"><button aria-label="Settings" onClick={()=>nav('/settings')} className="rounded-xl p-2 text-muted"><Settings size={19}/></button><button aria-label="Sign out" onClick={logout} className="rounded-xl p-2 text-muted"><LogOut size={19}/></button></div></header><main className="mx-auto w-full max-w-7xl px-4 pb-28 pt-5 sm:px-6 md:px-10 md:py-9"><Outlet/></main></div>
    <nav className="mobile-dock fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-line/80 p-2 shadow-card md:hidden"><Nav rows={rows} count={count} mobile/></nav>
  </div>
}

function NavHeader({compact=false}){return <NavLink to="/discover" className="flex items-center gap-3"><span className="brand-mark grid h-11 w-11 place-items-center rounded-2xl text-white shadow"><GraduationCap size={23}/></span><span><b className="block text-lg leading-tight text-primary">CampusConnect</b>{!compact&&<small className="text-xs text-muted">Good people. Right here.</small>}</span></NavLink>}
function Nav({rows,count,mobile=false}){return <div className={mobile?'flex w-full justify-around':'space-y-1.5'}>{rows.map(([to,label,Icon,subtitle])=><NavLink key={to} to={to} className={({isActive})=>`${mobile?'mobile-nav-link flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl py-2 text-[10px]':'group flex items-center gap-3 rounded-2xl px-3 py-3'} ${isActive?'nav-active':'text-muted hover:bg-primary-50/70 hover:text-primary'}`}><span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl"><Icon size={20}/>{label==='Connections'&&count>0&&<b className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-apricot px-1 text-[10px] text-primary">{count}</b>}</span>{mobile?<span className="truncate">{label}</span>:<span className="min-w-0"><b className="block text-sm">{label}</b><small className="block text-xs opacity-70">{subtitle}</small></span>}</NavLink>)}</div>}
