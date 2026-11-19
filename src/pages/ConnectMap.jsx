import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Network, Users, Compass, BellRing, ArrowRight, Check } from 'lucide-react'
import { Button, Card, useToast } from '../components/ui'

export default function ConnectMap() {
  const [notified, setNotified] = useState(false)
  const toast = useToast()

  const handleNotifyMe = () => {
    setNotified(prev => !prev)
    if (!notified) {
      toast("You're on the list! We'll notify you as soon as ConnectMap goes live.")
    } else {
      toast('Notification preference updated.')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 py-2">
      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1D1A39] via-[#451952] to-[#662549] p-8 text-white shadow-card">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#F39F5A] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#1D1A39] shadow-sm">
            <Sparkles size={14} /> 🚀 Coming Soon • Future Release
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl text-white">
            ConnectMap
          </h1>
          <p className="mt-3 text-base sm:text-lg text-[#E8BCB9] leading-relaxed">
            Visualizing mutual connection bridges and campus community circles as an interactive, living network tree.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={handleNotifyMe}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-sm transition shadow-sm ${
                notified
                  ? 'bg-[#E8BCB9] text-[#1D1A39] hover:bg-white'
                  : 'bg-[#F39F5A] text-[#1D1A39] hover:bg-[#F39F5A]/90'
              }`}
            >
              {notified ? (
                <>
                  <Check size={16} /> Subscribed to Updates
                </>
              ) : (
                <>
                  <BellRing size={16} /> Notify Me When Live
                </>
              )}
            </Button>
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition"
            >
              <Compass size={16} /> Explore Discover Instead <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="pointer-events-none select-none absolute -right-10 -bottom-10 opacity-15 text-white">
          <Network size={360} />
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-card">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#451952] to-[#AE445A] text-white shadow-card mb-4">
            <Network size={32} />
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#1D1A39]">
            Interactive Community Graph in Active Development
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted">
            Our team is fine-tuning the force-directed physics engine to map campus connections with fluid 60 FPS transitions.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <Button
              onClick={handleNotifyMe}
              className="bg-[#451952] text-white hover:bg-[#662549] text-xs sm:text-sm px-4 py-2"
            >
              {notified ? 'Notification Saved ✓' : 'Get Early Access Notification'}
            </Button>
          </div>
        </div>

        <div className="opacity-25 filter blur-xs select-none pointer-events-none py-10">
          <div className="flex justify-center items-center gap-8">
            <div className="h-16 w-16 rounded-full bg-[#451952] flex items-center justify-center text-white font-bold">You</div>
            <div className="h-0.5 w-24 bg-[#AE445A]"></div>
            <div className="h-14 w-14 rounded-full bg-[#AE445A] flex items-center justify-center text-white font-bold">Aanya</div>
            <div className="h-0.5 w-24 border-t-2 border-dashed border-[#F39F5A]"></div>
            <div className="h-12 w-12 rounded-full bg-[#F39F5A] flex items-center justify-center text-[#1D1A39] font-bold">Rohan</div>
          </div>
          <div className="mt-8 flex justify-center items-center gap-16">
            <div className="h-12 w-12 rounded-full bg-[#662549] flex items-center justify-center text-white font-bold">Maya</div>
            <div className="h-12 w-12 rounded-full bg-[#AE445A] flex items-center justify-center text-white font-bold">Nisha</div>
            <div className="h-12 w-12 rounded-full bg-[#F39F5A] flex items-center justify-center text-[#1D1A39] font-bold">Arjun</div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="border border-line/70 p-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#451952]/10 text-[#451952]">
            <Network size={20} />
          </span>
          <h3 className="mt-4 font-bold text-base text-[#1D1A39]">1st-Degree Inner Circle</h3>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            See everyone you are directly connected with in real-time, grouped naturally by campus spaces and shared skills.
          </p>
        </Card>

        <Card className="border border-line/70 p-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#AE445A]/10 text-[#AE445A]">
            <Users size={20} />
          </span>
          <h3 className="mt-4 font-bold text-base text-[#1D1A39]">2nd-Degree Mutual Bridges</h3>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            Discover peers connected through your friends with clear "Mutual via" links to break the ice with warm intros.
          </p>
        </Card>

        <Card className="border border-line/70 p-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F39F5A]/20 text-[#662549]">
            <Compass size={20} />
          </span>
          <h3 className="mt-4 font-bold text-base text-[#1D1A39]">Campus Skill Clusters</h3>
          <p className="mt-1.5 text-xs text-muted leading-relaxed">
            Filter your tree by teach and learn tags to pinpoint hackathon partners, exam study squads, and creative peers.
          </p>
        </Card>
      </div>
    </div>
  )
}
