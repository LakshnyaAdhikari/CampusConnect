import { useEffect, useState } from 'react'
import { listenConnections } from './service'
import { useAuth } from '../../context/AuthContext'

const subscribeSafely = (uid, callback) => {
  try {
    return listenConnections(uid, callback)
  } catch {
    // Keep unsupported connection storage from breaking routes that share the app layout.
    callback([])
    return () => {}
  }
}

export const usePendingCount = () => {
  const { user } = useAuth()
  const [value, setValue] = useState(0)
  useEffect(() => user
    ? subscribeSafely(user.uid, connections => setValue(connections.filter(item => item.toUid === user.uid && item.status === 'pending').length))
    : undefined, [user])
  return value
}

export const useConnectionStatus = otherUid => {
  const { user } = useAuth()
  const [value, setValue] = useState('none')
  useEffect(() => user
    ? subscribeSafely(user.uid, connections => {
      const item = connections.find(connection => connection.participants?.includes(otherUid))
      setValue(!item ? 'none' : item.status === 'accepted' ? 'accepted' : item.fromUid === user.uid ? 'pending_sent' : 'pending_received')
    })
    : undefined, [user, otherUid])
  return value
}
