import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { sendRequest } from '../features/connections/service'
import { openChat } from '../features/messages/service'
import { store } from '../lib/mockData'
import { Button } from '../components/ui'

export default function ConnectMap(){
  const {profile,loading}=useAuth()
  const nav=useNavigate()
  const [mode,setMode]=useState('radial')
  const [filter,setFilter]=useState('all')
  const [selected,setSelected]=useState(null)
  const [graph,setGraph]=useState({nodes:[],links:[]})

  useEffect(()=>{
    if(!profile||loading)return
    const uid=profile.uid
    const accepted=store.connections.filter(c=>c.status==='accepted')
    const firstDegree=accepted.filter(c=>c.fromUid===uid||c.toUid===uid).map(c=>c.fromUid===uid?c.toUid:c.fromUid)
    const secondDegree=[]
    const secondLinks=[]
    accepted.forEach(c=>{
      if(firstDegree.includes(c.fromUid)&&c.toUid!==uid&&!firstDegree.includes(c.toUid)){
        secondDegree.push(c.toUid)
        secondLinks.push({source:c.fromUid,target:c.toUid})
      }
      if(firstDegree.includes(c.toUid)&&c.fromUid!==uid&&!firstDegree.includes(c.fromUid)){
        secondDegree.push(c.fromUid)
        secondLinks.push({source:c.toUid,target:c.fromUid})
      }
    })
    const uniqueSecond=[...new Set(secondDegree)]
    const nodes=[
      {uid, name:profile.name||'You', type:'root'},
      ...firstDegree.map(id=>({uid:id,name:store.users.find(u=>u.uid===id)?.name||'?',type:'first'})),
      ...uniqueSecond.map(id=>({uid:id,name:store.users.find(u=>u.uid===id)?.name||'?',type:'second'}))
    ]
    const firstLinks=firstDegree.map(id=>({source:uid,target:id}))
    const links=[...firstLinks,...secondLinks]
    setGraph({nodes,links})
  },[profile,loading])

  const handleConnect=node=>{
    if(!profile)return
    sendRequest(profile.uid,node.uid)
  }

  const handleMessage=node=>{
    if(!profile)return
    openChat(profile.uid,node.uid)
  }

  const filteredNodes=graph.nodes.filter(n=>{
    if(filter==='all')return true
    if(filter==='2plus') return n.type==='second' && graph.links.filter(l=>l.target===n.uid||l.source===n.uid).length>=2
    if(filter==='same') return n.type!=='root' && store.users.find(u=>u.uid===n.uid)?.campus===profile.campus
    return true
  })

  const filteredLinks=graph.links.filter(l=>filteredNodes.some(n=>n.uid===l.source) && filteredNodes.some(n=>n.uid===l.target))

  const radius=200
  const angleStep=Math.PI*2/Math.max(1,filteredNodes.filter(n=>n.type!=='root').length)
  const positions={}
  filteredNodes.forEach((n,i)=>{
    if(n.type==='root') positions[n.uid]={x:0,y:0}
    else {
      const idx=filteredNodes.filter(m=>m.type!=="root").indexOf(n)
      const r=n.type==='first'?radius:radius*1.6
      const ang=idx*angleStep
      positions[n.uid]={x:r*Math.cos(ang),y:r*Math.sin(ang)}
    }
  })

  return (
    <div className="flex h-screen overflow-hidden bg-background text-ink">
      <div className="flex-1 relative p-4 overflow-auto">
        <div className="flex gap-4 mb-4">
          <Button onClick={()=>setMode('radial')} className={mode==='radial'?'bg-primary-50 text-primary':'text-muted'}>Radial Community Web</Button>
          <Button onClick={()=>setMode('tree')} className={mode==='tree'?'bg-primary-50 text-primary':'text-muted'}>Mutual Hierarchy Tree</Button>
          <Button onClick={()=>setFilter('all')} className={filter==='all'?'bg-primary-50 text-primary':'text-muted'}>All Circle</Button>
          <Button onClick={()=>setFilter('2plus')} className={filter==='2plus'?'bg-primary-50 text-primary':'text-muted'}>2+ Mutuals</Button>
          <Button onClick={()=>setFilter('same')} className={filter==='same'?'bg-primary-50 text-primary':'text-muted'}>Same Campus</Button>
        </div>
        {mode==='radial' && (
          <svg viewBox="-250 -250 500 500" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            {filteredLinks.map((l,i)=>(
              <line key={i} x1={positions[l.source].x} y1={positions[l.source].y} x2={positions[l.target].x} y2={positions[l.target].y} stroke={l.source===profile.uid? '#AE445A' : '#F39F5A'} strokeDasharray={l.source===profile.uid? '' : '4 2'} strokeWidth={2} />
            ))}
            {filteredNodes.map((n,i)=>(
              <g key={i} transform={`translate(${positions[n.uid].x},${positions[n.uid].y})`} onClick={()=>setSelected(n)} className="cursor-pointer">
                <circle r={n.type==='root'?30:20} fill={n.type==='root'?'#1D1A39':n.type==='first'?'#451952':'#AE445A'} stroke="#fff" strokeWidth={2} />
                <text x={0} y={5} textAnchor="middle" className="text-white text-xs font-medium" dominantBaseline="middle">{n.name}</text>
                {n.type==='second' && (
                  <text x={0} y={-25} textAnchor="middle" className="text-[#F39F5A] text-xxs font-bold">🔥 {graph.links.filter(l=>l.target===n.uid||l.source===n.uid).length}</text>
                )}
              </g>
            ))}
          </svg>
        )}
        {mode==='tree' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-[#1D1A39]" />
              <span className="font-bold text-[#1D1A39]">You</span>
            </div>
            {graph.nodes.filter(n=>n.type==='first').map(first=>(
              <div key={first.uid} className="ml-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-[#451952]" />
                  <span className="font-medium text-[#451952]">{first.name}</span>
                </div>
                {graph.nodes.filter(n=>n.type==='second' && graph.links.some(l=> (l.source===first.uid && l.target===n.uid) || (l.target===first.uid && l.source===n.uid))).map(sec=>(
                  <div key={sec.uid} className="ml-6 flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#AE445A]" />
                    <span className="text-[#AE445A]">{sec.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <div className="w-64 border-l border-line bg-surface p-4 overflow-y-auto">
          <div className="flex flex-col items-center gap-2 mb-4">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold text-primary">
              {selected.name?.[0] ?? '?'}
            </div>
            <h2 className="text-xl font-extrabold text-[#1D1A39]">{selected.name}</h2>
            <span className="rounded-full bg-primary-50 border border-primary/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
              {selected.type==='first'?'1st Degree Connection':selected.type==='second'?'2nd Degree • Mutual Connection':'You'}
            </span>
            <p className="text-sm text-berry">{store.users.find(u=>u.uid===selected.uid)?.campus}</p>
          </div>
          <div className="mb-4">
            <h3 className="font-semibold text-[#1D1A39] mb-2">Mutual Bridges</h3>
            <p className="text-sm">
              {graph.links.filter(l=> (l.source===profile.uid && l.target===selected.uid) || (l.target===profile.uid && l.source===selected.uid)).map(l=>store.users.find(u=>u.uid===l.source&&u.uid!==profile.uid||u.uid===l.target&&u.uid!==profile.uid).name).join(' & ') || 'None'}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button onClick={()=>handleConnect(selected)} className="bg-[#AE445A] text-white hover:bg-[#AE445A]/80">Connect</Button>
            <Button onClick={()=>handleMessage(selected)} className="bg-[#F39F5A] text-[#1D1A39] hover:bg-[#F39F5A]/80">Message</Button>
            <Button onClick={()=>nav('/profile/'+selected.uid)} className="bg-primary-50 text-primary hover:bg-primary-50/80">View Full Profile →</Button>
          </div>
          <button onClick={()=>setSelected(null)} className="absolute top-2 right-2 text-muted hover:text-primary">✕</button>
        </div>
      )}
    </div>
  )
}
