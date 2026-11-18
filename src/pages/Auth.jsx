import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, CircleHelp, GraduationCap, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { Button, Card, Input, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'

export default function Auth({ initialMode = false, initialAudience = 'student' }) {
  const [signup, setSignup] = useState(initialAudience === 'admin' ? false : initialMode)
  const [audience, setAudience] = useState(initialAudience)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp, signInWithGoogle, signInAdminWithGoogle } = useAuth()
  const toast = useToast()
  const nav = useNavigate()
  const finish = user => nav(user.role === 'admin' ? '/admin' : user.onboarded ? '/discover' : '/onboarding')
  const submit = async event => {
    event.preventDefault()
    if (signup && !name.trim()) return toast('Add your name to continue', 'error')
    try {
      setLoading(true)
      const user = signup ? await signUp(email, password, name.trim()) : await signIn(email, password)
      finish(user)
    } catch (error) {
      toast(error.message || 'Could not sign in', 'error')
    } finally {
      setLoading(false)
    }
  }
  const demo = async () => {
    try {
      setLoading(true)
      finish(await signInWithGoogle())
    } catch (error) {
      toast(error.message || 'Demo access is unavailable', 'error')
    } finally {
      setLoading(false)
    }
  }
  const adminSignIn = async () => {
    try {
      setLoading(true)
      await signInAdminWithGoogle()
      nav('/admin')
    } catch (error) {
      toast(error.message || 'Administrator sign-in was denied', 'error')
    } finally {
      setLoading(false)
    }
  }
  const chooseAudience = next => {
    setAudience(next)
    setSignup(false)
  }
  return <main className="auth-shell grid min-h-screen lg:grid-cols-[1fr_1fr]">
    <section className="auth-story relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="absolute -right-20 top-16 h-80 w-80 rounded-full bg-apricot/25 blur-3xl" />
      <div className="relative flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15"><GraduationCap size={24}/></span><span className="text-xl font-bold">CampusConnect</span></div>
      <div className="relative max-w-xl"><p className="mb-4 text-sm font-semibold uppercase tracking-[.2em] text-apricot">Find your people</p><h1 className="text-5xl font-bold leading-tight">Campus life is better together.</h1><p className="mt-5 max-w-md text-lg text-white/75">Meet collaborators, find a study buddy, and build the circle you wish you had on day one.</p><div className="mt-9 flex flex-wrap gap-2">{['Friends','Study partners','Creative projects'].map(item=><span key={item} className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">{item}</span>)}</div></div>
      <p className="relative text-sm text-white/65">A warmer way to find your campus community.</p>
    </section>
    <section className="flex items-center justify-center p-5 sm:p-10"><div className="w-full max-w-md">
      <Link to="/" className="mb-8 inline-flex items-center gap-2 font-bold text-primary lg:hidden"><GraduationCap size={22}/>CampusConnect</Link>
      <div className="mb-6"><p className="mb-2 text-sm font-semibold text-berry">{audience === 'admin' ? 'ADMINISTRATOR ACCESS' : signup ? 'CREATE YOUR ACCOUNT' : 'WELCOME BACK'}</p><h2 className="text-3xl font-bold">{audience === 'admin' ? 'Administrator sign in' : signup ? 'Start your circle' : 'Sign in to your campus'}</h2><p className="mt-2 text-muted">{audience === 'admin' ? 'Sign in with a Google account provisioned by the project owner.' : signup ? 'Set up your profile and find your people.' : 'Your next good connection is one click away.'}</p></div>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-primary-50 p-1" aria-label="Choose account type">
        <button type="button" onClick={() => chooseAudience('student')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${audience === 'student' ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}>Student</button>
        <button type="button" onClick={() => chooseAudience('admin')} className={`rounded-xl px-3 py-2 text-sm font-semibold ${audience === 'admin' ? 'bg-white text-primary shadow-sm' : 'text-muted'}`}>Administrator</button>
      </div>
      <Card className="border-white/70 p-6 sm:p-8">
        {audience === 'admin' ? <div className="space-y-4"><Button type="button" variant="secondary" className="w-full py-3" onClick={adminSignIn} loading={loading}><ShieldCheck className="mr-2 inline" size={17}/>Continue with Google</Button><p className="text-center text-xs text-muted">Administrator accounts are provisioned privately. There is no administrator registration.</p></div> : <>
        <form onSubmit={submit} className="space-y-4">
          {signup && <label className="block text-sm font-medium">Your name<Input autoComplete="name" className="mt-1" placeholder="e.g. Aanya Shah" value={name} onChange={event=>setName(event.target.value)} required/></label>}
          <label className="block text-sm font-medium">Email address<span className="relative mt-1 block"><Mail className="absolute left-3 top-3 text-muted" size={18}/><Input className="pl-10" type="email" autoComplete="email" placeholder="you@campus.edu" value={email} onChange={event=>setEmail(event.target.value)} required/></span></label>
          <label className="block text-sm font-medium">Password<span className="relative mt-1 block"><LockKeyhole className="absolute left-3 top-3 text-muted" size={18}/><Input className="pl-10" type="password" autoComplete={signup?'new-password':'current-password'} placeholder="At least 8 characters" value={password} onChange={event=>setPassword(event.target.value)} required minLength={6}/></span></label>
          {!signup && <div className="text-right"><button type="button" className="text-sm font-medium text-primary" onClick={()=>toast('Password reset will be available with OAuth setup')}>Forgot password?</button></div>}
          <Button loading={loading} className="flex w-full items-center justify-center gap-2 py-3">{signup?'Create account':'Sign in'}<ArrowRight size={17}/></Button>
        </form>
        <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line"/>OR<span className="h-px flex-1 bg-line"/></div>
        <Button variant="secondary" className="w-full py-3" onClick={demo} loading={loading}><CircleHelp className="mr-2 inline" size={17}/>Continue with Google</Button>
        </>}
      </Card>
      {audience === 'student' && <p className="mt-6 text-center text-sm text-muted">{signup?'Already have an account?':'New to CampusConnect?'} <Link className="font-semibold text-primary" to={signup?'/auth':'/signup'}>{signup?'Sign in':'Create an account'}</Link></p>}
      <div className="mt-6 flex justify-center gap-5 text-xs text-muted"><span className="inline-flex items-center gap-1"><Check size={14}/>Free to join</span><span className="inline-flex items-center gap-1"><Check size={14}/>Campus-first</span></div>
    </div></section>
  </main>
}
