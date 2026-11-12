import { useEffect, useRef, useState } from 'react'
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
  Network,
} from 'lucide-react'

const PHOTO_URL =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85'

function Landing() {
  const sectionRef = useRef(null)
  const [scrollOffset, setScrollOffset] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return
      const top = sectionRef.current.getBoundingClientRect().top
      const offset = Math.max(-90, Math.min(90, Math.round(top / 4)))
      setScrollOffset(offset)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const baseStyle = {
    backgroundImage: `url(${PHOTO_URL})`,
    backgroundSize: '1100px 680px',
    backgroundRepeat: 'no-repeat',
  }

  const tilePositions = [
    // Row 1 photo tile
    { x: 0, y: -40 },
    // Row 2 three tiles
    { x: 0, y: -266 },
    { x: -276, y: -266 },
    { x: -552, y: -266 },
    // Row 3 three tiles
    { x: 0, y: -460 },
    { x: -276, y: -460 },
    { x: -552, y: -460 },
  ]

  const computePos = (baseX, baseY) => {
    // Counter shift by scrollOffset to keep picture stationary
    const x = baseX - scrollOffset
    const y = baseY
    return `${x}px ${y}px`
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-background py-14 sm:py-20">
      <div className="max-w-5xl mx-auto overflow-hidden px-4 py-12">
        <div className="flex items-center gap-4 mb-4 h-[210px]" style={{ transform: `translate3d(${scrollOffset}px,0,0)` }}>
          <div
            className="w-[380px] shrink-0 rounded-[28px] shadow-sm"
            style={{ ...baseStyle, backgroundPosition: computePos(tilePositions[0].x, tilePositions[0].y) }}
          ></div>
          <div className="w-[320px] shrink-0 rounded-[28px] bg-[#451952] text-white flex flex-col justify-center items-center text-center p-6">
            <span className="text-5xl font-extrabold tracking-tight">500+</span>
            <span className="mt-2 text-sm font-medium text-white/80 leading-snug">
              Peer Matches &amp; Connections Made
            </span>
          </div>
          <div className="flex-1 flex items-center justify-start pl-6">
            <svg width="120" height="70" viewBox="0 0 120 70" fill="none" stroke="#F39F5A" strokeWidth="2.8" strokeLinecap="round">
              <path d="M10 52 C 45 68, 80 50, 110 12" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-4 mb-4 h-[210px]" style={{ transform: `translate3d(${-scrollOffset * 1.15}px,0,0)` }}>
          <div
            className="w-[200px] shrink-0 rounded-[28px] shadow-sm"
            style={{ ...baseStyle, backgroundPosition: computePos(tilePositions[1].x + scrollOffset * 1.15, tilePositions[1].y) }}
          ></div>
          <div
            className="w-[220px] shrink-0 rounded-[28px] shadow-sm"
            style={{ ...baseStyle, backgroundPosition: computePos(tilePositions[2].x + scrollOffset * 1.15, tilePositions[2].y) }}
          ></div>
          <div
            className="w-[260px] shrink-0 rounded-[28px] shadow-sm"
            style={{ ...baseStyle, backgroundPosition: computePos(tilePositions[3].x + scrollOffset * 1.15, tilePositions[3].y) }}
          ></div>
        </div>
        <div className="flex items-center gap-4 mb-4 h-[210px]" style={{ transform: `translate3d(${scrollOffset * 0.85}px,0,0)` }}>
          <div
            className="w-[190px] shrink-0 rounded-[28px] shadow-sm"
            style={{ ...baseStyle, backgroundPosition: computePos(tilePositions[4].x - scrollOffset * 0.85, tilePositions[4].y) }}
          ></div>
          <div
            className="w-[260px] shrink-0 rounded-[28px] shadow-sm"
            style={{ ...baseStyle, backgroundPosition: computePos(tilePositions[5].x - scrollOffset * 0.85, tilePositions[5].y) }}
          ></div>
          <div
            className="w-[160px] shrink-0 rounded-[28px] shadow-sm"
            style={{ ...baseStyle, backgroundPosition: computePos(tilePositions[6].x - scrollOffset * 0.85, tilePositions[6].y) }}
          ></div>
        </div>
      </div>
      <div className="flex justify-center space-x-4 mt-8">
        <Link to="/features" className="px-4 py-2 bg-[#AE445A] text-white rounded">
          Get Started
        </Link>
        <Link to="/about" className="px-4 py-2 bg-[#F39F5A] text-[#1D1A39] rounded">
          Learn More
        </Link>
      </div>
    </section>
  )
}

export default Landing
