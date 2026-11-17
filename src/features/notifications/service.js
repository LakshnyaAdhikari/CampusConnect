import { isMock } from '../../lib/config'
import { store } from '../../lib/mockData'
import { auth, db } from '../../lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const requireDb = () => {
  if (!db) throw new Error('Cloud Firestore is not initialized. Check your Firebase configuration.')
  return db
}

const validateUid = uid => {
  if (typeof uid !== 'string' || !uid.trim()) throw new Error('A valid user ID is required.')
  return uid.trim()
}

const requireOwnUser = uid => {
  const targetUid = validateUid(uid)
  const currentUid = isMock('auth') ? store.currentUid : auth?.currentUser?.uid
  if (!currentUid) throw new Error('A signed-in user is required.')
  if (currentUid !== targetUid) throw new Error('You can only access your own notifications.')
  return targetUid
}

const asMillis = value => value?.toMillis?.() ?? (typeof value === 'number' ? value : Date.now())

export const listenNotifications = (uid, callback, onError) => {
  if (typeof callback !== 'function') throw new Error('A callback function is required.')
  if (onError !== undefined && typeof onError !== 'function') {
    throw new Error('The error callback must be a function.')
  }
  const targetUid = requireOwnUser(uid)

  // Mock mode deliberately has no seeded or fabricated notification records.
  if (isMock('notifications')) {
    callback([])
    return () => {}
  }

  const firestore = requireDb()
  return onSnapshot(
    query(collection(firestore, 'notifications'), where('recipientUid', '==', targetUid)),
    snapshot => {
      const notifications = snapshot.docs.map(item => {
        const data = item.data()
        return { ...data, id: item.id, createdAt: asMillis(data.createdAt) }
      })
      notifications.sort((left, right) => right.createdAt - left.createdAt)
      callback(notifications)
    },
    error => {
      console.error('Error listening to notifications:', error)
      onError?.(error)
    },
  )
}

export const markNotificationRead = async notificationId => {
  const uid = requireOwnUser(isMock('auth') ? store.currentUid : auth?.currentUser?.uid)
  if (typeof notificationId !== 'string' || !notificationId.trim()) {
    throw new Error('A valid notification ID is required.')
  }
  if (isMock('notifications')) return

  const firestore = requireDb()
  const notificationRef = doc(firestore, 'notifications', notificationId.trim())
  const snapshot = await getDoc(notificationRef)
  if (!snapshot.exists() || snapshot.data().recipientUid !== uid || snapshot.data().read) return
  await updateDoc(notificationRef, { read: true })
}

export const markAllNotificationsRead = async uid => {
  const targetUid = requireOwnUser(uid)
  if (isMock('notifications')) return

  const firestore = requireDb()
  const snapshot = await getDocs(query(
    collection(firestore, 'notifications'),
    where('recipientUid', '==', targetUid),
  ))
  const unread = snapshot.docs.filter(item => item.data().read === false)
  for (let offset = 0; offset < unread.length; offset += 450) {
    const batch = writeBatch(firestore)
    unread.slice(offset, offset + 450).forEach(item => batch.update(item.ref, { read: true }))
    await batch.commit()
  }
}
