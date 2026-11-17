import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone } from '../../lib/mockData'
import { pairId } from '../../lib/schema'
import { auth, db } from '../../lib/firebase'
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore'

const getDb = () => {
  if (!db) {
    throw new Error('Cloud Firestore is not initialized. Check your Firebase configuration.')
  }
  return db
}

const getAuthUid = () => {
  const currentUid = auth?.currentUser?.uid
  if (!currentUid) {
    throw new Error('Unauthorized: A signed-in user is required.')
  }
  return currentUid
}

const getMockUid = () => {
  const currentUid = store.currentUid
  if (!currentUid) {
    throw new Error('Unauthorized: An authenticated user is required.')
  }
  return currentUid
}

const resolveTargetUid = (currentUid, toUid, maybeTarget) => {
  if (maybeTarget !== undefined && typeof toUid === 'string' && typeof maybeTarget === 'string') {
    if (toUid === currentUid) return maybeTarget
    if (maybeTarget === currentUid) return toUid
  }
  return toUid
}

export const getConnectionStatus = async otherUid => {
  if (!otherUid || typeof otherUid !== 'string' || !otherUid.trim()) {
    throw new Error('A valid user ID is required.')
  }
  const targetUid = otherUid.trim()

  if (isMock('connections')) {
    const currentUid = getMockUid()
    if (targetUid === currentUid) throw new Error('Cannot check a connection with yourself.')
    const connection = store.connections.find(item => item.id === pairId(currentUid, targetUid))
    return connection?.status || null
  }

  const firestore = getDb()
  const currentUid = getAuthUid()
  if (targetUid === currentUid) throw new Error('Cannot check a connection with yourself.')
  const snapshot = await getDoc(doc(firestore, 'connections', pairId(currentUid, targetUid)))
  if (!snapshot.exists()) return null
  const connection = snapshot.data()
  if (!Array.isArray(connection.participants) || !connection.participants.includes(currentUid)) {
    throw new Error('Unauthorized: You are not a participant in this connection.')
  }
  return connection.status || null
}

export const sendRequest = async (toUid, maybeTarget) => {
  if (isMock('connections')) {
    const currentUid = getMockUid()
    const targetUid = resolveTargetUid(currentUid, toUid, maybeTarget)
    if (!targetUid || typeof targetUid !== 'string' || !targetUid.trim()) {
      throw new Error('A valid recipient user ID is required.')
    }
    const recipient = targetUid.trim()
    if (recipient === currentUid) {
      throw new Error('Cannot send a connection request to yourself.')
    }

    const connId = pairId(currentUid, recipient)
    const existing = store.connections.find(x => x.id === connId)
    if (existing) {
      if (existing.status === 'accepted') {
        throw new Error('Connection already exists with this user.')
      }
      throw new Error('Connection request already pending.')
    }

    const currentUser = store.users?.find(x => x.uid === currentUid || x.id === currentUid)
    const senderName = currentUser?.name?.trim() || 'Student'

    const item = {
      id: connId,
      fromUid: currentUid,
      toUid: recipient,
      participants: [currentUid, recipient],
      status: 'pending',
      profiles: {
        [currentUid]: { name: senderName }
      },
      createdAt: Date.now()
    }
    store.connections.push(item)
    notify()
    return clone(item)
  }

  const firestore = getDb()
  const currentUid = getAuthUid()
  const targetUid = resolveTargetUid(currentUid, toUid, maybeTarget)
  if (!targetUid || typeof targetUid !== 'string' || !targetUid.trim()) {
    throw new Error('A valid recipient user ID is required.')
  }
  const recipient = targetUid.trim()
  if (recipient === currentUid) {
    throw new Error('Cannot send a connection request to yourself.')
  }

  const connId = pairId(currentUid, recipient)
  const connRef = doc(firestore, 'connections', connId)
  const userRef = doc(firestore, 'users', currentUid)
  const notificationRef = doc(collection(firestore, 'notifications'))

  return await runTransaction(firestore, async transaction => {
    const connSnap = await transaction.get(connRef)
    if (connSnap.exists()) {
      const data = connSnap.data()
      if (data.status === 'accepted') {
        throw new Error('Connection already exists with this user.')
      }
      throw new Error('Connection request already pending.')
    }

    const userSnap = await transaction.get(userRef)
    const senderName = userSnap.data()?.name?.trim()
    if (!senderName) throw new Error('Complete your profile name before sending a request.')

    const item = {
      id: connId,
      fromUid: currentUid,
      toUid: recipient,
      participants: [currentUid, recipient],
      status: 'pending',
      notificationKey: notificationRef.id,
      profiles: {
        [currentUid]: { name: senderName }
      },
      createdAt: serverTimestamp()
    }
    transaction.set(connRef, item)
    transaction.set(notificationRef, {
      recipientUid: recipient,
      type: 'connection_request',
      actorUid: currentUid,
      actorName: senderName,
      createdAt: serverTimestamp(),
      read: false,
      connectionId: connId,
    })
    return {
      ...item,
      createdAt: Date.now()
    }
  })
}

export const respondRequest = async (otherUid, status) => {
  if (status !== 'accepted' && status !== 'rejected') {
    throw new Error("Status must be either 'accepted' or 'rejected'.")
  }

  if (isMock('connections')) {
    const currentUid = getMockUid()
    if (!otherUid || typeof otherUid !== 'string' || !otherUid.trim()) {
      throw new Error('A valid user ID is required.')
    }
    const targetUid = otherUid.trim()
    if (targetUid === currentUid) {
      throw new Error('Cannot respond to a connection request with yourself.')
    }

    const connId = pairId(currentUid, targetUid)
    const index = store.connections.findIndex(x => x.id === connId)
    if (index === -1) {
      throw new Error('Connection request not found.')
    }

    const conn = store.connections[index]
    if (conn.status !== 'pending') {
      throw new Error(`Cannot respond to a request with status '${conn.status}'. Only pending requests can be answered.`)
    }
    if (conn.toUid !== currentUid) {
      throw new Error('Unauthorized: Only the recipient can respond to a connection request.')
    }

    if (status === 'rejected') {
      store.connections.splice(index, 1)
      notify()
      return
    }

    const currentUser = store.users?.find(x => x.uid === currentUid || x.id === currentUid)
    const recipientName = currentUser?.name?.trim() || 'Student'
    const existingProfiles = (conn.profiles && typeof conn.profiles === 'object') ? conn.profiles : {}

    conn.status = 'accepted'
    conn.profiles = {
      ...existingProfiles,
      [currentUid]: { name: recipientName }
    }
    conn.updatedAt = Date.now()
    notify()
    return clone(conn)
  }

  const firestore = getDb()
  const currentUid = getAuthUid()
  if (!otherUid || typeof otherUid !== 'string' || !otherUid.trim()) {
    throw new Error('A valid user ID is required.')
  }
  const targetUid = otherUid.trim()
  if (targetUid === currentUid) {
    throw new Error('Cannot respond to a connection request with yourself.')
  }

  const connId = pairId(currentUid, targetUid)
  const connRef = doc(firestore, 'connections', connId)
  const userRef = doc(firestore, 'users', currentUid)
  const fallbackNotificationKey = doc(collection(firestore, 'notifications')).id

  return await runTransaction(firestore, async transaction => {
    const connSnap = await transaction.get(connRef)
    if (!connSnap.exists()) {
      throw new Error('Connection request not found.')
    }
    const data = connSnap.data()
    if (data.status !== 'pending') {
      throw new Error(`Cannot respond to a request with status '${data.status}'. Only pending requests can be answered.`)
    }
    if (data.toUid !== currentUid) {
      throw new Error('Unauthorized: Only the recipient can respond to a connection request.')
    }

    if (status === 'accepted') {
      const userSnap = await transaction.get(userRef)
      const recipientName = userSnap.data()?.name?.trim()
      if (!recipientName) throw new Error('Complete your profile name before accepting a request.')

      const notificationKey = data.notificationKey || fallbackNotificationKey
      const acceptedNotificationRef = doc(
        firestore,
        'notifications',
        `connection_accepted_${notificationKey}`,
      )

      const existingProfiles = (data.profiles && typeof data.profiles === 'object') ? data.profiles : {}
      const updatedProfiles = {
        ...existingProfiles,
        [currentUid]: { name: recipientName }
      }

      transaction.update(connRef, {
        status: 'accepted',
        notificationKey,
        profiles: updatedProfiles,
        updatedAt: serverTimestamp()
      })
      transaction.set(acceptedNotificationRef, {
        recipientUid: data.fromUid,
        type: 'connection_accepted',
        actorUid: currentUid,
        actorName: recipientName,
        createdAt: serverTimestamp(),
        read: false,
        connectionId: connId,
      })

      return {
        ...data,
        id: connId,
        status: 'accepted',
        profiles: updatedProfiles,
        createdAt: data.createdAt?.toMillis?.() ?? (typeof data.createdAt === 'number' ? data.createdAt : Date.now()),
        updatedAt: Date.now()
      }
    } else {
      transaction.delete(connRef)
      return { id: connId, status: 'rejected' }
    }
  })
}

export const cancelRequest = async otherUid => {
  if (isMock('connections')) {
    const currentUid = getMockUid()
    if (!otherUid || typeof otherUid !== 'string' || !otherUid.trim()) {
      throw new Error('A valid user ID is required.')
    }
    const targetUid = otherUid.trim()
    if (targetUid === currentUid) {
      throw new Error('Cannot cancel a connection request with yourself.')
    }

    const connId = pairId(currentUid, targetUid)
    const index = store.connections.findIndex(x => x.id === connId)
    if (index === -1) {
      throw new Error('Connection request not found.')
    }

    const conn = store.connections[index]
    if (conn.status !== 'pending') {
      throw new Error(`Cannot cancel a connection with status '${conn.status}'. Only pending requests can be cancelled.`)
    }
    if (conn.fromUid !== currentUid) {
      throw new Error('Unauthorized: Only the sender can cancel a connection request.')
    }

    store.connections.splice(index, 1)
    notify()
    return
  }

  const firestore = getDb()
  const currentUid = getAuthUid()
  if (!otherUid || typeof otherUid !== 'string' || !otherUid.trim()) {
    throw new Error('A valid user ID is required.')
  }
  const targetUid = otherUid.trim()
  if (targetUid === currentUid) {
    throw new Error('Cannot cancel a connection request with yourself.')
  }

  const connId = pairId(currentUid, targetUid)
  const connRef = doc(firestore, 'connections', connId)

  return await runTransaction(firestore, async transaction => {
    const snapshot = await transaction.get(connRef)
    if (!snapshot.exists()) {
      throw new Error('Connection request not found.')
    }
    const data = snapshot.data()
    if (data.status !== 'pending') {
      throw new Error(`Cannot cancel a connection with status '${data.status}'. Only pending requests can be cancelled.`)
    }
    if (data.fromUid !== currentUid) {
      throw new Error('Unauthorized: Only the sender can cancel a connection request.')
    }

    transaction.delete(connRef)
    return { id: connId, cancelled: true }
  })
}

export const removeConnection = async otherUid => {
  if (isMock('connections')) {
    const currentUid = getMockUid()
    if (!otherUid || typeof otherUid !== 'string' || !otherUid.trim()) {
      throw new Error('A valid user ID is required.')
    }
    const targetUid = otherUid.trim()
    if (targetUid === currentUid) {
      throw new Error('Cannot remove a connection with yourself.')
    }

    const connId = pairId(currentUid, targetUid)
    const index = store.connections.findIndex(x => x.id === connId)
    if (index === -1) {
      throw new Error('Connection not found.')
    }

    const conn = store.connections[index]
    if (conn.status !== 'accepted') {
      throw new Error(`Cannot remove connection with status '${conn.status}'. Only accepted connections can be removed.`)
    }
    if (!conn.participants?.includes(currentUid)) {
      throw new Error('Unauthorized: You are not a participant in this connection.')
    }

    store.connections.splice(index, 1)
    notify()
    return
  }

  const firestore = getDb()
  const currentUid = getAuthUid()
  if (!otherUid || typeof otherUid !== 'string' || !otherUid.trim()) {
    throw new Error('A valid user ID is required.')
  }
  const targetUid = otherUid.trim()
  if (targetUid === currentUid) {
    throw new Error('Cannot remove a connection with yourself.')
  }

  const connId = pairId(currentUid, targetUid)
  const connRef = doc(firestore, 'connections', connId)

  return await runTransaction(firestore, async transaction => {
    const snapshot = await transaction.get(connRef)
    if (!snapshot.exists()) {
      throw new Error('Connection not found.')
    }
    const data = snapshot.data()
    if (data.status !== 'accepted') {
      throw new Error(`Cannot remove connection with status '${data.status}'. Only accepted connections can be removed.`)
    }
    if (!data.participants?.includes(currentUid)) {
      throw new Error('Unauthorized: You are not a participant in this connection.')
    }

    transaction.delete(connRef)
    return { id: connId, removed: true }
  })
}

export const listenConnections = (uid, cb) => {
  if (!uid || typeof uid !== 'string' || !uid.trim()) {
    throw new Error('A valid user ID is required.')
  }
  if (typeof cb !== 'function') {
    throw new Error('A callback function is required.')
  }
  const targetUid = uid.trim()

  if (isMock('connections')) {
    const push = () => cb(clone(store.connections.filter(x => x.participants?.includes(targetUid))))
    push()
    return subscribe(push)
  }

  const firestore = getDb()
  if (!auth?.currentUser || auth.currentUser.uid !== targetUid) {
    throw new Error('Unauthorized: You can only listen to your own connections.')
  }

  const q = query(collection(firestore, 'connections'), where('participants', 'array-contains', targetUid))
  return onSnapshot(
    q,
    snapshot => {
      const connections = snapshot.docs.map(docSnap => {
        const data = docSnap.data()
        return {
          ...data,
          id: docSnap.id,
          createdAt: data.createdAt?.toMillis?.() ?? (typeof data.createdAt === 'number' ? data.createdAt : Date.now())
        }
      })
      cb(connections)
    },
    error => {
      console.error('Error listening to connections:', error)
      cb([])
    }
  )
}
