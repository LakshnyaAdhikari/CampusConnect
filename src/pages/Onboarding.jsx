import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, Input, Select, Tag } from '../components/ui'
import { CAMPUSES, INTERESTS, SKILLS, LOOKING_FOR } from '../lib/schema'
import { completeOnboarding } from '../features/profile/service'
import { useAuth } from '../context/AuthContext'

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth()
  const nav = useNavigate()
  const [step, setStep] = useState(1)
  const [data, setData] = useState({ name: profile?.name || '', campus: 'North Campus', interests: [], teach: [], learn: [], lookingFor: [] })
  const toggle = (key, value) => setData(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }))
  const next = async () => {
    if (step < 3) return setStep(step + 1)
    await completeOnboarding(user.uid, data)
    await refreshProfile()
    nav('/discover')
  }
  return <main className="mx-auto max-w-2xl py-8"><p className="mb-3 text-sm text-muted">Step {step} of 3</p><Card><h1 className="text-2xl font-bold">{step === 1 ? 'A little about you' : step === 2 ? 'What lights you up?' : 'What are you looking for?'}</h1>{step === 1 ? <div className="mt-5 space-y-3"><Input value={data.name} onChange={event => setData({ ...data, name: event.target.value })}/><Select value={data.campus} onChange={event => setData({ ...data, campus: event.target.value })}>{CAMPUSES.map(item => <option key={item}>{item}</option>)}</Select></div> : step === 2 ? <div className="mt-5">{INTERESTS.map(item => <Tag key={item} selected={data.interests.includes(item)} onClick={() => toggle('interests', item)}>{item}</Tag>)}</div> : <div className="mt-5">{['teach', 'learn', 'lookingFor'].map(key => <div key={key} className="mb-4"><b className="capitalize">{key}</b><div>{(key === 'lookingFor' ? LOOKING_FOR : SKILLS).map(item => <Tag key={item} selected={data[key].includes(item)} onClick={() => toggle(key, item)}>{item}</Tag>)}</div></div>)}</div>}<div className="mt-6 flex justify-end gap-2">{step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}<Button onClick={next}>{step === 3 ? 'Finish' : 'Next'}</Button></div></Card></main>
}
