import { useEffect, useState } from 'react'
import { listenConnections } from './service'
import { useAuth } from '../../context/AuthContext'
export const usePendingCount = () => { const {user}=useAuth(); const [value,setValue]=useState(0); useEffect(()=>user?listenConnections(user.uid,x=>setValue(x.filter(y=>y.toUid===user.uid&&y.status==='pending').length)):undefined,[user]); return value }
export const useConnectionStatus = otherUid => { const {user}=useAuth(); const [value,setValue]=useState('none'); useEffect(()=>user?listenConnections(user.uid,x=>{const item=x.find(y=>y.participants.includes(otherUid)); setValue(!item?'none':item.status==='accepted'?'accepted':item.fromUid===user.uid?'pending_sent':'pending_received')}):undefined,[user,otherUid]); return value }
