import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Eye,
  EyeOff,
  GraduationCap,
  MessageCircle,
  Send,
  Shield,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react'

const PHOTO_URL =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85'

function BentoGrid() {
  const sectionRef = useRef(null)
  const [scrollOffset, setScrollOffset] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return
      const rect = sectionRef.current.getBoundingClientRect()
      const vh = window.innerHeight || 800
      const progress = (vh - rect.top) / (vh + rect.height)
      const rawOffset = (progress - 0.5) * 180
      const clamped = Math.max(-90, Math.min(90, Math.round(rawOffset)))
      setScrollOffset(clamped)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-background py-14 sm:py-20"
    >
      <div className="pointer-events-none select-none absolute left-6 top-8 text-[#AE445A] opacity-35 hidden sm:block">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6 C4 4 6 3 12 3 C18 3 20 4 20 9 C20 14 17 15 13 15 L9 19 L9 15 C5 15 4 14 4 9 Z" />
        </svg>
      </div>
      <div className="pointer-events-none select-none absolute left-14 top-16 text-[#F39F5A] opacity-35">
        <svg width="34" height="32" viewBox="0 0 40 38" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M20 4 C30 3 37 10 36 20 C35 29 27 35 17 34 C8 33 3 24 4 16 C5 8 13 4 22 4 C31 4 36 9 37 14" />
        </svg>
      </div>
      <div className="pointer-events-none select-none absolute left-28 top-6 text-[#AE445A] opacity-40 hidden sm:block">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L14.8 8.5 L22 9.2 L16.5 14 L18.2 21 L12 17.2 L5.8 21 L7.5 14 L2 9.2 L9.2 8.5 Z" />
        </svg>
      </div>
      <div className="pointer-events-none select-none absolute right-10 top-16 text-[#F39F5A] opacity-35">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0 C12 6.5 17.5 12 24 12 C17.5 12 12 17.5 12 24 C12 17.5 6.5 12 0 12 C6.5 12 12 6.5 12 0 Z" />
        </svg>
      </div>
      <div className="pointer-events-none select-none absolute right-24 top-8 text-[#451952] opacity-30 hidden sm:block">
        <svg width="30" height="30" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17 5 C24 5 29 10 28 17 C27 24 21 28 15 28 C9 28 5 22 6 16 C7 11 12 8 17 8 C21 8 24 11 24 15 C24 19 20 22 16 21" />
        </svg>
      </div>
      <div className="pointer-events-none select-none absolute right-36 top-16 text-[#AE445A] opacity-35 hidden md:block">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M10 2 V18 M2 10 H18 M4 4 L16 16 M4 16 L16 4" />
        </svg>
      </div>

      <div className="relative mb-10 px-5 text-center sm:px-8">
        <div className="pointer-events-none select-none absolute -top-5 left-1/2 -translate-x-32 text-[#F39F5A] opacity-40">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor">
            <path d="M8 2 C8 5 10 7 13 7 C10 7 8 9 8 12 C8 9 6 7 3 7 C6 7 8 5 8 2 Z" />
            <path d="M24 14 C24 17 26 19 29 19 C26 19 24 21 24 24 C24 21 22 19 19 19 C22 19 24 17 24 14 Z" />
          </svg>
        </div>
        <p className="text-sm font-bold uppercase tracking-[.18em] text-rose">By the numbers</p>
        <h2 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
          A campus already alive with connections
        </h2>
        <div className="mx-auto mt-2 flex justify-center text-[#AE445A] opacity-35">
          <svg width="56" height="10" viewBox="0 0 56 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M2 6 Q 9 1, 16 6 T 30 6 T 44 6 T 54 5" />
          </svg>
        </div>
      </div>

      <div className="max-w-5xl mx-auto overflow-hidden px-4 py-4">
        <div
          style={{ transform: `translate3d(${scrollOffset}px, 0, 0)` }}
          className="flex gap-4 mb-4 h-[210px]"
        >
          <div
            className="w-[380px] shrink-0 rounded-[28px]"
            style={{
              backgroundImage: `url(${PHOTO_URL})`,
              backgroundSize: '1200px 760px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${0 - scrollOffset}px -40px`,
            }}
          />
          <div className="w-[320px] shrink-0 rounded-[28px] bg-[#451952] text-white flex flex-col justify-center items-center text-center p-6">
            <span className="text-5xl font-extrabold tracking-tight">500+</span>
            <span className="mt-2 text-sm font-medium text-white/80 leading-snug">
              Peer Matches & Connections Made
            </span>
          </div>
          <div
            className="w-[380px] shrink-0 rounded-[28px]"
            style={{
              backgroundImage: `url(${PHOTO_URL})`,
              backgroundSize: '1200px 760px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${-716 - scrollOffset}px -40px`,
            }}
          />
        </div>

        <div
          style={{ transform: `translate3d(${-scrollOffset * 1.15}px, 0, 0)` }}
          className="flex gap-4 mb-4 h-[210px]"
        >
          <div
            className="w-[260px] shrink-0 rounded-[28px]"
            style={{
              backgroundImage: `url(${PHOTO_URL})`,
              backgroundSize: '1200px 760px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${0 + scrollOffset * 1.15}px -266px`,
            }}
          />
          <div
            className="w-[280px] shrink-0 rounded-[28px]"
            style={{
              backgroundImage: `url(${PHOTO_URL})`,
              backgroundSize: '1200px 760px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${-276 + scrollOffset * 1.15}px -266px`,
            }}
          />
          <div className="w-[300px] shrink-0 rounded-[28px] bg-[#AE445A] text-white flex flex-col justify-center items-center text-center p-6">
            <span className="text-5xl font-extrabold tracking-tight">50+</span>
            <span className="mt-2 text-sm font-medium text-white/80 leading-snug">
              Active Campus Spaces & Circles
            </span>
          </div>
          <div
            className="w-[220px] shrink-0 rounded-[28px]"
            style={{
              backgroundImage: `url(${PHOTO_URL})`,
              backgroundSize: '1200px 760px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${-880 + scrollOffset * 1.15}px -266px`,
            }}
          />
        </div>

        <div
          style={{ transform: `translate3d(${scrollOffset * 0.85}px, 0, 0)` }}
          className="flex gap-4 mb-4 h-[210px]"
        >
          <div
            className="w-[250px] shrink-0 rounded-[28px]"
            style={{
              backgroundImage: `url(${PHOTO_URL})`,
              backgroundSize: '1200px 760px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${0 - scrollOffset * 0.85}px -492px`,
            }}
          />
          <div
            className="w-[360px] shrink-0 rounded-[28px]"
            style={{
              backgroundImage: `url(${PHOTO_URL})`,
              backgroundSize: '1200px 760px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${-266 - scrollOffset * 0.85}px -492px`,
            }}
          />
          <div className="w-[300px] shrink-0 rounded-[28px] bg-[#F39F5A] text-[#1D1A39] flex flex-col justify-center items-center text-center p-6">
            <span className="text-5xl font-extrabold tracking-tight">200+</span>
            <span className="mt-2 text-sm font-semibold text-[#1D1A39]/80 leading-snug">
              Skills Shared & Swapped on Campus
            </span>
          </div>
          <div
            className="w-[160px] shrink-0 rounded-[28px]"
            style={{
              backgroundImage: `url(${PHOTO_URL})`,
              backgroundSize: '1200px 760px',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: `${-940 - scrollOffset * 0.85}px -492px`,
            }}
          />
        </div>
      </div>
    </section>
  )
}

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Campus Spaces', href: '#spaces' },
  { label: 'Safety', href: '#safety' },
]

const SLIDES = [
  { id: 1, badge: 'Smart Peer Matching', title: 'People who get your energy', subtitle: 'Shared interests. New possibilities.', type: 'matching' },
  { id: 2, badge: 'SkillSwap & Study Partners', title: 'Learn & teach on campus', subtitle: 'Trade what you know. Gain what you need.', type: 'skillswap' },
  { id: 3, badge: 'Campus Spaces', title: 'Join your campus circles', subtitle: 'Find your crew. Own the conversation.', type: 'spaces' },
  { id: 4, badge: '1-on-1 Real-Time Chat', title: 'Turn matches into teammates', subtitle: 'From hello to hackathon in a few taps.', type: 'chat' },
]

const MATCH_USERS = [
  { name: 'Maya Iyer', initials: 'M', tags: 'Photography \u00b7 Travel', reason: 'Could teach you photo editing', accent: false },
  { name: 'Rohan Mehta', initials: 'R', tags: 'AI \u00b7 Music', reason: 'Looking for a project mate', accent: true },
  { name: 'Nisha Kumar', initials: 'N', tags: 'Design \u00b7 Film', reason: 'You both love making things', accent: false },
]

const SKILL_USERS = [
  { name: 'Arjun Sethi', initials: 'A', teaches: 'Python', wants: 'UI/UX', accent: false },
  { name: 'Priya Das', initials: 'P', teaches: 'Video Editing', wants: 'DSA', accent: true },
  { name: 'Karthik Rao', initials: 'K', teaches: 'Public Speaking', wants: 'ML Basics', accent: false },
]

const SPACES_DATA = [
  { name: 'Design & Product Club', members: 142, tag: 'Design', active: true },
  { name: 'Late Night Coders', members: 89, tag: 'Tech', active: true },
  { name: 'Campus Film Society', members: 67, tag: 'Film', active: false },
]

const MESSAGES = [
  { from: 'them', name: 'Rohan', text: "Hey! Saw you're into React. Want to pair up for the hackathon?" },
  { from: 'me', text: 'Yes! I was looking for a team. When are you free?' },
  { from: 'them', name: 'Rohan', text: "Saturday morning works. I'll set up a shared repo \ud83d\ude80" },
  { from: 'me', text: "Perfect. Let's crush it \ud83d\udcaa" },
]

const PULSE_PILLS = [
  { icon: Sparkles, label: 'Interest & Skill Matching' },
  { icon: BookOpen, label: 'Peer-to-Peer SkillSwap' },
  { icon: Users, label: 'Campus-Only Spaces' },
  { icon: Shield, label: 'Anonymous Safe Posting' },
]

const HOW_STEPS = [
  { num: '01', icon: GraduationCap, title: 'Set your campus profile', body: 'Pick your college, interests, and skills you can teach or want to learn. Takes two minutes.' },
  { num: '02', icon: Sparkles, title: 'Get ranked smart matches', body: 'See exactly why you matched — shared courses, interests, or skills that complement each other.' },
  { num: '03', icon: MessageCircle, title: 'Connect, chat & join Spaces', body: 'Send a hello, start a 1-on-1 conversation, or dive into a Campus Space that fits your vibe.' },
]

const FEATURE_CARDS = [
  { icon: Sparkles, title: 'Smart Matching', body: 'Our algorithm surfaces peers by shared interests, complementary skills, and campus overlap — with transparent "why you matched" reasons.', accent: false },
  { icon: Zap, title: 'SkillSwap', body: 'List what you can teach and what you want to learn. Find your perfect swap partner in seconds — no tuition fees, just peer-to-peer growth.', accent: true },
  { icon: Users, title: 'Campus Spaces', body: 'Join topic-based communities exclusive to your campus. Toggle anonymous mode to share thoughts without attaching your name.', accent: false },
  { icon: Shield, title: 'Verified Moderation', body: 'Every user is campus-verified. Our moderation layer and reporting tools keep spaces safe, inclusive, and free from harassment.', accent: false },
]

const FOOTER_QUICK = [
  { label: 'Discover', href: '/discover' },
  { label: 'Campus Spaces', href: '/spaces' },
  { label: 'SkillSwap', href: '/discover' },
  { label: 'How it Works', href: '#how-it-works' },
]

const FOOTER_SAFETY = [
  { label: 'Community Guidelines', href: '#' },
  { label: 'Anonymous Posting Privacy', href: '#' },
  { label: 'Report & Moderation', href: '#' },
  { label: 'Student Support', href: '#' },
]

function scrollTo(href) {
  if (href.startsWith('#')) {
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }
}

function SlideMatching() {
  return (
    <div className="space-y-3 bg-white p-4 sm:p-5">
      {MATCH_USERS.map(({ name, initials, tags, reason, accent }) => (
        <div key={name} className="flex items-center gap-3 rounded-2xl border border-line/70 p-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-bold text-primary ${accent ? 'bg-secondary/40' : 'bg-primary-50'}`}>
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-ink">{name}</b>
            <small className="block text-muted">{tags}</small>
            <small className="mt-0.5 block text-berry">{reason}</small>
          </span>
          <span className="rounded-xl bg-background p-2 text-primary">
            <Users size={18} />
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 text-sm">
        <span className="text-muted">A little hello goes a long way.</span>
        <span className="font-semibold text-rose">Say hello →</span>
      </div>
    </div>
  )
}

function SlideSkillSwap() {
  return (
    <div className="space-y-3 bg-white p-4 sm:p-5">
      {SKILL_USERS.map(({ name, initials, teaches, wants, accent }) => (
        <div key={name} className="flex items-center gap-3 rounded-2xl border border-line/70 p-3">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl font-bold text-primary ${accent ? 'bg-secondary/40' : 'bg-primary-50'}`}>
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-ink">{name}</b>
            <small className="block text-berry">Teaches {teaches}</small>
            <small className="block text-muted">Wants {wants}</small>
          </span>
          <button className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white">
            Connect
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1 text-sm">
        <span className="text-muted">Knowledge grows when shared.</span>
        <span className="font-semibold text-rose">Explore swaps →</span>
      </div>
    </div>
  )
}

function SlideSpaces() {
  const [anon, setAnon] = useState(false)
  return (
    <div className="space-y-3 bg-white p-4 sm:p-5">
      {SPACES_DATA.map(({ name, members, tag, active }) => (
        <div key={name} className="flex items-center gap-3 rounded-2xl border border-line/70 p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-50 font-bold text-primary">
            {name[0]}
          </span>
          <span className="min-w-0 flex-1">
            <b className="block text-ink">{name}</b>
            <small className="block text-muted">{members} members · {tag}</small>
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? 'bg-secondary/30 text-berry' : 'bg-primary-50 text-muted'}`}>
            {active ? 'Active' : 'Join'}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between rounded-2xl border border-line/70 p-3">
        <span className="flex items-center gap-2 text-sm text-muted">
          {anon ? <EyeOff size={15} className="text-berry" /> : <Eye size={15} />}
          Anonymous posting
        </span>
        <button
          onClick={() => setAnon(v => !v)}
          className={`relative h-5 w-9 rounded-full transition-colors ${anon ? 'bg-berry' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${anon ? 'left-4' : 'left-0.5'}`} />
        </button>
      </div>
    </div>
  )
}

function SlideChat() {
  return (
    <div className="bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-line pb-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary/40 text-sm font-bold text-primary">R</span>
        <span className="min-w-0 flex-1">
          <b className="block text-sm text-ink">Rohan Mehta</b>
          <small className="text-muted">Connected · BITS Pilani</small>
        </span>
        <span className="rounded-full bg-secondary/30 px-2 py-0.5 text-xs font-semibold text-berry">Hackathon</span>
      </div>
      <div className="space-y-2.5">
        {MESSAGES.map((msg, i) => (
          <div key={i} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${msg.from === 'me' ? 'message-mine text-white' : 'bg-primary-50 text-ink'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-background px-3 py-2">
        <span className="flex-1 text-xs text-muted">Type a message…</span>
        <Send size={14} className="text-berry" />
      </div>
    </div>
  )
}

const SLIDE_CONTENT = {
  matching: SlideMatching,
  skillswap: SlideSkillSwap,
  spaces: SlideSpaces,
  chat: SlideChat,
}

function HeroCarousel() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef(null)

  const advance = useCallback((dir) => {
    setActive(prev => (prev + dir + SLIDES.length) % SLIDES.length)
  }, [])

  useEffect(() => {
    if (paused) return
    timerRef.current = setInterval(() => advance(1), 4500)
    return () => clearInterval(timerRef.current)
  }, [paused, advance])

  const slide = SLIDES[active]
  const SlideBody = SLIDE_CONTENT[slide.type]

  return (
    <div
      className="relative mx-auto w-full max-w-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="absolute -inset-5 rounded-[36px] bg-gradient-to-br from-secondary/30 via-blush/50 to-primary/10 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-surface shadow-card">
        <div className="bg-primary p-5 text-white">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} className="text-apricot" />
              {slide.badge}
            </span>
            <span className="rounded-full bg-white/15 px-3 py-1 text-xs">Today</span>
          </div>
          <h2 className="mt-4 text-2xl font-bold leading-snug">{slide.title}</h2>
          <p className="mt-1 text-sm text-white/70">{slide.subtitle}</p>
        </div>
        <SlideBody />
        <div className="flex items-center justify-between border-t border-line bg-background px-4 py-2.5">
          <button
            onClick={() => advance(-1)}
            className="rounded-full p-1 text-muted transition-colors hover:bg-line/50 hover:text-primary"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-primary' : 'w-1.5 bg-line'}`}
              />
            ))}
          </div>
          <button
            onClick={() => advance(1)}
            className="rounded-full p-1 text-muted transition-colors hover:bg-line/50 hover:text-primary"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="absolute -bottom-5 -left-6 hidden rounded-2xl border border-line bg-white p-4 shadow-card sm:block">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Shared interests</p>
        <p className="mt-1 font-bold text-primary">Design · Music · Ideas</p>
      </div>
    </div>
  )
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const handleNav = (href) => {
    setMenuOpen(false)
    scrollTo(href)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="brand-mark grid h-10 w-10 place-items-center rounded-2xl text-white shadow">
            <GraduationCap size={21} />
          </span>
          <span className="flex items-center gap-2">
            <b className="text-lg text-primary">CampusConnect</b>
            <span className="hidden rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-berry sm:inline">
              Campus
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <button
              key={label}
              onClick={() => handleNav(href)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-primary-50 hover:text-primary"
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/auth">
            <button className="rounded-xl px-4 py-2 text-sm font-medium text-muted transition hover:bg-primary-50 hover:text-primary">
              Sign in
            </button>
          </Link>
          <Link to="/auth" className="hidden sm:block">
            <button className="brand-mark rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition hover:opacity-90">
              Join for free
            </button>
          </Link>
          <button
            className="flex flex-col gap-1 rounded-xl p-2 text-muted hover:bg-primary-50 md:hidden"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-line/60 bg-background px-5 pb-4 pt-2 md:hidden">
          {NAV_LINKS.map(({ label, href }) => (
            <button
              key={label}
              onClick={() => handleNav(href)}
              className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted hover:bg-primary-50 hover:text-primary"
            >
              {label}
            </button>
          ))}
          <div className="mt-3 border-t border-line/60 pt-3">
            <Link to="/auth" className="block">
              <button className="brand-mark w-full rounded-xl py-2.5 text-sm font-semibold text-white">
                Join for free
              </button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

export default function Landing() {
  return (
    <main className="min-h-screen overflow-hidden bg-background">
      <Navbar />

      <section className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 sm:px-8 md:grid-cols-[1.1fr_.9fr] md:items-center md:py-20">
        <div className="pointer-events-none select-none absolute left-3 top-4 text-[#AE445A] opacity-35 hidden sm:block">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0 C12 6.5 17.5 12 24 12 C17.5 12 12 17.5 12 24 C12 17.5 6.5 12 0 12 C6.5 12 12 6.5 12 0 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute left-20 top-2 text-[#F39F5A] opacity-40">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L14.8 8.5 L22 9.2 L16.5 14 L18.2 21 L12 17.2 L5.8 21 L7.5 14 L2 9.2 L9.2 8.5 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute left-[310px] top-12 text-[#AE445A] opacity-35 hidden md:block">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M10 2 V18 M2 10 H18 M4 4 L16 16 M4 16 L16 4" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute right-12 top-6 text-[#F39F5A] opacity-30 hidden lg:block">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12 L22 2 L13 22 L10 14 Z M10 14 L22 2" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute right-1/4 -top-3 text-[#AE445A] opacity-40">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="currentColor">
            <path d="M8 2 C8 5 10 7 13 7 C10 7 8 9 8 12 C8 9 6 7 3 7 C6 7 8 5 8 2 Z" />
            <path d="M24 14 C24 17 26 19 29 19 C26 19 24 21 24 24 C24 21 22 19 19 19 C22 19 24 17 24 14 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute bottom-8 left-8 text-[#451952] opacity-25 hidden sm:block">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 14 C4 8 10 4 16 5 C22 6 24 13 21 19 C18 24 10 23 8 16 C6 10 12 8 17 10" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute bottom-4 right-10 text-[#F39F5A] opacity-35 hidden sm:block">
          <svg width="40" height="38" viewBox="0 0 40 38" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M20 4 C30 3 37 10 36 20 C35 29 27 35 17 34 C8 33 3 24 4 16 C5 8 13 4 22 4 C31 4 36 9 37 14" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="relative mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-berry shadow-sm">
            <div className="pointer-events-none select-none absolute -left-2 -top-1.5 text-[#AE445A] opacity-40">
              <svg width="34" height="34" viewBox="0 0 40 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M20 4 C30 3 37 10 36 20 C35 29 27 35 17 34 C8 33 3 24 4 16 C5 8 13 4 22 4 C31 4 36 9 37 14" />
              </svg>
            </div>
            <Star size={14} className="fill-rose text-rose" />
            Built for real campus communities
          </div>
          <h1 className="max-w-3xl text-5xl font-bold leading-[1.07] tracking-tight text-ink sm:text-6xl lg:text-7xl">
            Find your people.
            <span className="block text-rose relative inline-block">
              Build your circle.
              <svg className="absolute -bottom-2.5 left-0 w-36 text-secondary opacity-40 pointer-events-none select-none" viewBox="0 0 120 12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M2 7 Q 18 1, 35 7 T 70 7 T 105 7 T 118 6" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            CampusConnect makes it easier to meet collaborators, study partners, mentors, and the friends who make campus feel like yours.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <button className="brand-mark inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold text-white shadow transition hover:opacity-90">
                Create a free account
                <ArrowRight size={17} />
              </button>
            </Link>
            <Link to="/discover">
              <button className="inline-flex items-center gap-2 rounded-xl bg-primary-50 px-6 py-3 font-semibold text-primary transition hover:bg-line/50">
                Explore the platform
                <Compass size={17} />
              </button>
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-3 text-sm text-muted">
            <span className="flex -space-x-2">
              {['A', 'R', 'M', 'N'].map((letter, i) => (
                <span
                  key={letter}
                  className={`grid h-8 w-8 place-items-center rounded-full border-2 border-background font-bold text-primary ${i % 2 ? 'bg-secondary' : 'bg-blush'}`}
                >
                  {letter}
                </span>
              ))}
            </span>
            <span>Built around real campus connections</span>
          </div>
        </div>

        <HeroCarousel />
      </section>

      <BentoGrid />

      <section className="border-y border-line/60 bg-white py-5">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {PULSE_PILLS.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-background px-4 py-2 text-sm font-semibold text-berry shadow-sm"
              >
                <Icon size={15} className="text-rose" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="pointer-events-none select-none absolute left-8 top-16 text-[#F39F5A] opacity-35 hidden sm:block">
          <svg width="22" height="26" viewBox="0 0 24 28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 18 H16 M9 21 H15 M6 10 C6 6 8.5 3 12 3 C15.5 3 18 6 18 10 C18 13 16 15 15 17 H9 C8 15 6 13 6 10 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute left-28 top-8 text-[#AE445A] opacity-35 hidden md:block">
          <svg width="34" height="34" viewBox="0 0 40 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 4 C30 3 37 10 36 20 C35 29 27 35 17 34 C8 33 3 24 4 16 C5 8 13 4 22 4 C31 4 36 9 37 14" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute right-10 top-20 text-[#AE445A] opacity-30 hidden sm:block">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0 C12 6.5 17.5 12 24 12 C17.5 12 12 17.5 12 24 C12 17.5 6.5 12 0 12 C6.5 12 12 6.5 12 0 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute right-28 top-8 text-[#F39F5A] opacity-40 hidden md:block">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L14.8 8.5 L22 9.2 L16.5 14 L18.2 21 L12 17.2 L5.8 21 L7.5 14 L2 9.2 L9.2 8.5 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute bottom-10 left-1/4 text-[#451952] opacity-25 hidden sm:block">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2 L14.5 8.5 L21 9.5 L16 14.5 L17.5 21 L12 17.5 L6.5 21 L8 14.5 L3 9.5 L9.5 8.5 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute bottom-12 right-1/4 text-[#AE445A] opacity-30 hidden sm:block">
          <svg width="32" height="32" viewBox="0 0 34 34" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M17 5 C24 5 29 10 28 17 C27 24 21 28 15 28 C9 28 5 22 6 16 C7 11 12 8 17 8 C21 8 24 11 24 15 C24 19 20 22 16 21" />
          </svg>
        </div>

        <div className="relative mb-12 text-center">
          <p className="text-sm font-bold uppercase tracking-[.18em] text-rose">Simple by design</p>
          <h2 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">How CampusConnect Works</h2>
          <div className="mx-auto mt-2 flex justify-center text-[#F39F5A] opacity-35">
            <svg width="56" height="10" viewBox="0 0 56 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M2 6 Q 9 1, 16 6 T 30 6 T 44 6 T 54 5" />
            </svg>
          </div>
          <p className="mx-auto mt-3 max-w-xl text-muted">Three easy steps from zero to a thriving campus network.</p>
        </div>
        <div className="relative grid gap-8 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-line to-transparent md:block" />
          {HOW_STEPS.map(({ num, icon: Icon, title, body }) => (
            <div key={num} className="relative flex flex-col items-center text-center">
              <div className="relative z-10 mb-5 flex h-20 w-20 flex-col items-center justify-center rounded-3xl border-2 border-line bg-white shadow-card">
                <span className="stat-icon flex h-12 w-12 items-center justify-center rounded-2xl text-primary">
                  <Icon size={22} />
                </span>
              </div>
              <span className="mb-1 text-xs font-bold uppercase tracking-widest text-rose">{num}</span>
              <h3 className="text-lg font-bold text-ink">{title}</h3>
              <p className="mt-2 leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="relative bg-white py-20">
        <div className="pointer-events-none select-none absolute left-8 top-14 text-[#451952] opacity-25 hidden sm:block">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12 L22 2 L13 22 L10 14 Z M10 14 L22 2" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute left-24 top-24 text-[#F39F5A] opacity-35 hidden md:block">
          <svg width="34" height="34" viewBox="0 0 40 38" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 4 C30 3 37 10 36 20 C35 29 27 35 17 34 C8 33 3 24 4 16 C5 8 13 4 22 4 C31 4 36 9 37 14" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute right-12 top-16 text-[#F39F5A] opacity-35 hidden sm:block">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0 C12 6.5 17.5 12 24 12 C17.5 12 12 17.5 12 24 C12 17.5 6.5 12 0 12 C6.5 12 12 6.5 12 0 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute right-28 top-8 text-[#AE445A] opacity-40 hidden md:block">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L14.8 8.5 L22 9.2 L16.5 14 L18.2 21 L12 17.2 L5.8 21 L7.5 14 L2 9.2 L9.2 8.5 Z" />
          </svg>
        </div>
        <div className="pointer-events-none select-none absolute right-8 bottom-10 text-[#AE445A] opacity-25 hidden sm:block">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 14 C4 8 10 4 16 5 C22 6 24 13 21 19 C18 24 10 23 8 16 C6 10 12 8 17 10" />
          </svg>
        </div>

        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-rose">Your campus, elevated</p>
            <h2 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">Built for real campus life</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">Every feature is designed around how students actually connect, collaborate, and grow.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_CARDS.map(({ icon: Icon, title, body, accent }) => (
              <div
                key={title}
                className={`rounded-2xl border p-6 shadow-card transition hover:-translate-y-1 hover:shadow-lg ${accent ? 'border-secondary/40 bg-gradient-to-br from-secondary/10 via-blush/20 to-white' : 'border-line bg-surface'}`}
              >
                <span className="stat-icon mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-primary">
                  <Icon size={22} />
                </span>
                <h3 className="text-lg font-bold text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="spaces" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-card">
          <div className="spaces-hero p-8 text-white sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-apricot">Campus Spaces</p>
            <h2 className="mt-3 max-w-xl text-3xl font-bold sm:text-4xl">Your campus, your circles</h2>
            <p className="mt-3 max-w-lg leading-relaxed text-white/75">
              Join topic-based Spaces exclusive to your college — from design clubs and coding hackathons to film fests and study sessions. Post anonymously when you need to, openly when you want to.
            </p>
            <Link to="/auth">
              <button className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white/15 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25">
                Explore Campus Spaces
                <ArrowRight size={16} />
              </button>
            </Link>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-3">
            {[
              { emoji: '🎨', name: 'Design & Product Club', members: 142, posts: 24 },
              { emoji: '💻', name: 'Late Night Coders', members: 89, posts: 51 },
              { emoji: '🎬', name: 'Campus Film Society', members: 67, posts: 18 },
            ].map(({ emoji, name, members, posts }) => (
              <div key={name} className="flex flex-col gap-1 bg-white p-5">
                <span className="text-2xl">{emoji}</span>
                <b className="mt-2 text-ink">{name}</b>
                <p className="text-sm text-muted">{members} members · {posts} posts today</p>
                <Link to="/auth">
                  <button className="mt-3 w-full rounded-xl bg-primary-50 py-2 text-sm font-semibold text-primary transition hover:bg-line/50">
                    Join Space
                  </button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="safety" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold uppercase tracking-[.18em] text-rose">Safety first</p>
            <h2 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">A campus you can trust</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Shield, title: 'Campus Verification', body: 'Only verified students from your institution can join, keeping every Space genuinely campus-only.' },
              { icon: EyeOff, title: 'Anonymous Posting', body: 'Share thoughts, questions, and confessions in Spaces without your name attached — your identity stays protected.' },
              { icon: Star, title: 'Community Moderation', body: 'Trained moderators and an AI-assisted reporting layer keep content safe, respectful, and on-topic.' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-line bg-background p-6 shadow-card">
                <span className="stat-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-primary">
                  <Icon size={20} />
                </span>
                <div>
                  <h3 className="font-bold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="discover-hero overflow-hidden rounded-3xl px-8 py-16 text-center sm:px-16 sm:py-20">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-apricot backdrop-blur-sm">
            <Sparkles size={14} />
            Join 10,000+ students already connecting
          </span>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-5xl">
            Find your people.<br />
            <span className="text-apricot">Build your circle.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md leading-relaxed text-white/70">
            Your campus community is waiting. Set up your profile in two minutes and start discovering people who get you.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <button className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-bold text-primary shadow-lg transition hover:bg-blush">
                Get Started Free
                <ArrowRight size={17} />
              </button>
            </Link>
            <Link to="/discover">
              <button className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-6 py-3 font-semibold text-white backdrop-blur-sm transition hover:bg-white/25">
                Explore first
              </button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-ink text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="flex items-center gap-2.5">
                <span className="brand-mark grid h-9 w-9 place-items-center rounded-xl text-white">
                  <GraduationCap size={18} />
                </span>
                <b className="text-white">CampusConnect</b>
              </Link>
              <p className="mt-3 text-sm font-semibold text-apricot">Find your people. Build your circle.</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/55">
                The campus community platform that connects students through shared interests, skills, and campus life.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-blush/70">Quick Links</h4>
              <ul className="space-y-2.5">
                {FOOTER_QUICK.map(({ label, href }) => (
                  <li key={label}>
                    {href.startsWith('/') ? (
                      <Link to={href} className="text-sm text-white/60 transition hover:text-apricot">
                        {label}
                      </Link>
                    ) : (
                      <button
                        onClick={() => scrollTo(href)}
                        className="text-sm text-white/60 transition hover:text-apricot"
                      >
                        {label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-blush/70">Community & Safety</h4>
              <ul className="space-y-2.5">
                {FOOTER_SAFETY.map(({ label }) => (
                  <li key={label}>
                    <span className="text-sm text-white/60">{label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-blush/70">Get Started</h4>
              <div className="space-y-2">
                <Link to="/auth" className="block">
                  <button className="brand-mark w-full rounded-xl py-2.5 text-sm font-semibold text-white">
                    Join for free
                  </button>
                </Link>
                <Link to="/auth" className="block">
                  <button className="w-full rounded-xl bg-white/10 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/15">
                    Sign in
                  </button>
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-white/40">© 2026 CampusConnect. All rights reserved.</p>
            <p className="text-xs text-white/30">Campus-first · Students only · Verified & safe</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
