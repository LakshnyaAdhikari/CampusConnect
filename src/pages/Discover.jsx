import { useEffect,useMemo,useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowDownWideNarrow, ArrowRight, BookOpen, BriefcaseBusiness, Compass, Filter, GraduationCap, Heart, MessageCircle, Search, Sparkles, Users, X } from 'lucide-react'
import { Avatar,Button,Card,EmptyState,Input,Select,Spinner,Tag,useToast } from '../components/ui'
import { getMatches } from '../features/discover/service'
import { sendRequest } from '../features/connections/service'
import { openChat } from '../features/messages/service'
import { useAuth } from '../context/AuthContext'
import { useConnectionStatus } from '../features/connections/hooks'
import { CAMPUSES, INTERESTS, LOOKING_FOR, SKILLS } from '../lib/schema'

const purposes=[['Any connection','',Sparkles],['Study partner','study_partner',BookOpen],['Project mate','project_mate',BriefcaseBusiness],['Friends','friends',Heart],['Mentor','mentor',GraduationCap]]

export default function Discover(){
  const {profile}=useAuth()
  const location=useLocation()
  const nav=useNavigate()
  const toast=useToast()
  const directory=location.pathname==='/discover/people'
  const [items,setItems]=useState(null)
  const [error,setError]=useState('')
  const [search,setSearch]=useState('')
  const [interest,setInterest]=useState('')
  const [skill,setSkill]=useState('')
  const [goal,setGoal]=useState('')
  const [campus,setCampus]=useState('')
  const [sort,setSort]=useState('recommended')
  const [showFilters,setShowFilters]=useState(false)
  const load=()=>{setError('');getMatches(profile).then(setItems).catch(()=>setError('We could not load people right now. Try again.'))}
  useEffect(()=>{load()},[profile])
  const filtered=useMemo(()=>{
    if(!items)return []
    const term=search.trim().toLowerCase()
    const result=items.filter(({user,reasons})=>(!term||`${user.name} ${user.bio} ${user.interests.join(' ')} ${user.teach.join(' ')}`.toLowerCase().includes(term))&&(!interest||user.interests.includes(interest))&&(!skill||user.teach.includes(skill)||user.learn.includes(skill))&&(!goal||user.lookingFor.includes(goal))&&(!campus||user.campus===campus))
    return result.sort((a,b)=>sort==='name'?a.user.name.localeCompare(b.user.name):sort==='newest'?b.user.createdAt-a.user.createdAt:b.score-a.score)
  },[items,search,interest,skill,goal,campus,sort])
  const clear=()=>{setSearch('');setInterest('');setSkill('');setGoal('');setCampus('')}
  const activeFilters=[interest,skill,goal,campus].filter(Boolean).length
  if(!items&&!error)return <Spinner/>
  return <div className="space-y-6">
    <section className="discover-hero relative overflow-hidden rounded-[28px] p-6 text-white sm:p-8 lg:p-10"><div className="relative z-10 max-w-3xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Sparkles size={14}/> YOUR CAMPUS, CLOSER</div><h1 className="text-3xl font-bold sm:text-4xl">{directory?'Meet your campus':'Find your kind of people'}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">{directory?'Explore students by what they love, what they know, and what they want to build.':'Shared interests are a lovely start. Find a study buddy, project partner, mentor, or friend.'}</p><div className="mt-6 flex flex-wrap gap-2"><Link to="/discover"><span className={`rounded-full px-4 py-2 text-sm font-semibold ${!directory?'bg-white text-primary':'border border-white/25 bg-white/10'}`}>For you</span></Link><Link to="/discover/people"><span className={`rounded-full px-4 py-2 text-sm font-semibold ${directory?'bg-white text-primary':'border border-white/25 bg-white/10'}`}>Browse everyone</span></Link></div></div><div className="discover-orb absolute -right-10 -top-24 h-80 w-80 rounded-full opacity-60"/><div className="discover-orb-two absolute -bottom-40 right-48 h-72 w-72 rounded-full opacity-60"/></section>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[[Users,items?.length||0,'people to explore'],[Heart,items?.filter(x=>x.score>0).length||0,'with something in common'],[BookOpen,items?.filter(x=>x.reasons.some(r=>r.includes('teach'))).length||0,'skill exchanges'],[Sparkles,INTERESTS.length,'ways to connect']].map(([Icon,value,label])=><Card key={label} className="flex items-center gap-3 p-4"><span className="stat-icon grid h-11 w-11 place-items-center rounded-2xl text-primary"><Icon size={20}/></span><span><b className="block text-xl">{value}</b><small className="text-muted">{label}</small></span></Card>)}</section>
    <section className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-xl font-bold">{directory?'Explore students':`People you could click with`}</h2><p className="mt-1 text-sm text-muted">{directory?'A whole campus of ideas, skills, and potential friends.':'A few thoughtful matches, picked around your profile.'}</p></div><div className="flex gap-2"><Button variant="secondary" className="inline-flex items-center gap-2" onClick={()=>setShowFilters(!showFilters)}><Filter size={17}/>Filters{activeFilters>0&&<span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs text-white">{activeFilters}</span>}</Button><label className="relative min-w-0 flex-1 lg:w-64"><Search className="absolute left-3 top-3 text-muted" size={17}/><Input className="pl-9" value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search people or interests"/></label></div></div>
      <div className="flex gap-2 overflow-x-auto pb-1">{purposes.map(([label,value,Icon])=><button key={label} onClick={()=>setGoal(value)} className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${goal===value?'border-primary bg-primary text-white':'border-line bg-surface text-muted hover:border-primary/40 hover:text-primary'}`}><Icon size={16}/>{label}</button>)}</div>
      {showFilters&&<Card className="grid gap-3 border-primary/15 bg-white sm:grid-cols-2 lg:grid-cols-4"><label className="text-xs font-semibold text-muted">INTEREST<select className="mt-1 block w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink" value={interest} onChange={event=>setInterest(event.target.value)}><option value="">Any interest</option>{INTERESTS.map(item=><option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-muted">SKILL TO SHARE<select className="mt-1 block w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink" value={skill} onChange={event=>setSkill(event.target.value)}><option value="">Any skill</option>{SKILLS.map(item=><option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-muted">CAMPUS<select className="mt-1 block w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink" value={campus} onChange={event=>setCampus(event.target.value)}><option value="">All campuses</option>{CAMPUSES.map(item=><option key={item}>{item}</option>)}</select></label><label className="text-xs font-semibold text-muted">SORT BY<select className="mt-1 block w-full rounded-xl border border-line bg-background px-3 py-2 text-sm text-ink" value={sort} onChange={event=>setSort(event.target.value)}><option value="recommended">Best match</option><option value="name">Name</option><option value="newest">Recently active</option></select></label><div className="sm:col-span-2 lg:col-span-4 flex justify-end"><button className="inline-flex items-center gap-1 text-sm font-semibold text-primary" onClick={clear}><X size={15}/>Clear filters</button></div></Card>}
      {error?<Card className="text-center"><p className="text-muted">{error}</p><Button className="mt-3" onClick={load}>Try again</Button></Card>:filtered.length?<div className="grid gap-4 xl:grid-cols-2">{filtered.map(item=><Match key={item.user.uid} item={item} onMessage={async uid=>nav(`/messages/${await openChat(uid)}`)} toast={toast}/>)}</div>:<EmptyState title="No matches with those filters"><p>Try another interest or explore a different campus.</p><Button variant="secondary" className="mt-4" onClick={clear}>Show everyone</Button></EmptyState>}
    </section>
  </div>
}

function Match({item,onMessage,toast}){
  const {user,score,reasons}=item
  const status=useConnectionStatus(user.uid)
  const connect=async()=>{try{await sendRequest(user.uid);toast(`Request sent to ${user.name}`)}catch(error){toast(error.message||'Could not send request','error')}}
  return <Card className="match-card group overflow-hidden p-0"><div className="match-card-top h-2"/><div className="p-5 sm:p-6"><div className="flex items-start gap-4"><Link to={`/profile/${user.uid}`}><Avatar user={user}/></Link><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Link to={`/profile/${user.uid}`} className="text-lg font-bold text-ink hover:text-primary">{user.name}</Link>{score>0&&<span className="match-score rounded-full px-2.5 py-1 text-xs font-bold">{score} match points</span>}</div><p className="mt-1 text-sm text-muted">{user.campus}</p><p className="mt-3 text-sm leading-relaxed">{user.bio}</p></div><button aria-label={`Save ${user.name}`} className="rounded-full p-2 text-muted hover:bg-primary-50 hover:text-rose"><Heart size={18}/></button></div>
    <div className="mt-4 rounded-2xl bg-background p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-berry">Why you might click</p>{reasons.length?<ul className="space-y-1 text-sm">{reasons.slice(0,3).map(reason=><li key={reason} className="flex gap-2"><Sparkles className="mt-0.5 shrink-0 text-apricot" size={15}/>{reason}</li>)}</ul>:<p className="text-sm text-muted">A new perspective from your campus could be just what you need.</p>}</div>
    <div className="mt-4 flex flex-wrap">{user.interests.slice(0,4).map(tag=><Tag key={tag}>{tag}</Tag>)}</div><p className="mt-2 text-xs text-muted">Can share: {user.teach.slice(0,3).join(' · ')||'Ask them what they know'}</p>
    <div className="mt-5 flex flex-wrap gap-2"><Button disabled={status!=='none'} onClick={connect}>{status==='none'?'Connect':status==='accepted'?'Connected':status==='pending_received'?'They reached out':'Request sent'}</Button><Button variant="secondary" className="inline-flex items-center gap-2" onClick={()=>onMessage(user.uid)}><MessageCircle size={16}/>Message</Button><Link to={`/profile/${user.uid}`} className="ml-auto inline-flex items-center gap-1 self-center text-sm font-semibold text-primary">View profile<ArrowRight size={15}/></Link></div>
  </div></Card>
}
