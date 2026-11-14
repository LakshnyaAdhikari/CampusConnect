import { isMock } from '../../lib/config'
import { store, notify, clone } from '../../lib/mockData'
import { Timestamp, doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'

const profileDefaults = (uid, user = {}) => ({
  uid,
  id: uid,
  name: user.displayName || user.name || user.email?.split('@')[0] || 'Student',
  email: user.email || '',
  campus: '',
  role: 'student',
  interests: [],
  teach: [],
  learn: [],
  lookingFor: [],
  bio: '',
  photoURL: user.photoURL || '',
  discoverable: true,
  onboarded: false,
  createdAt: Date.now()
})

const profileRef = uid => {
  if (!db) throw new Error('Cloud Firestore is not initialized. Check your Firebase configuration.')
  return doc(db, 'users', uid)
}

const publicProfileRef = uid => {
  if (!db) throw new Error('Cloud Firestore is not initialized. Check your Firebase configuration.')
  return doc(db, 'publicProfiles', uid)
}

const queuePublicProfile = (batch, uid, profile) => {
  const ref = publicProfileRef(uid)
  if (!profile.onboarded || profile.discoverable === false) {
    batch.delete(ref)
    return
  }
  const createdAt = profile.createdAt?.toMillis
    ? profile.createdAt
    : profile.createdAt instanceof Date
      ? Timestamp.fromDate(profile.createdAt)
      : typeof profile.createdAt === 'number'
        ? Timestamp.fromMillis(profile.createdAt)
        : serverTimestamp()
  batch.set(ref, {
    uid,
    name: String(profile.name || 'Student').slice(0, 80),
    campus: String(profile.campus || '').slice(0, 120),
    interests: Array.isArray(profile.interests) ? profile.interests.filter(value => typeof value === 'string').slice(0, 40) : [],
    teach: Array.isArray(profile.teach) ? profile.teach.filter(value => typeof value === 'string').slice(0, 40) : [],
    learn: Array.isArray(profile.learn) ? profile.learn.filter(value => typeof value === 'string').slice(0, 40) : [],
    lookingFor: Array.isArray(profile.lookingFor) ? profile.lookingFor.filter(value => typeof value === 'string').slice(0, 20) : [],
    bio: String(profile.bio || '').slice(0, 500),
    photoURL: String(profile.photoURL || '').slice(0, 2048),
    discoverable: true,
    createdAt
  })
}

export const ensureUserProfile = async user => {
  if (isMock('profile')) return null
  if (!user?.uid) throw new Error('A signed-in user is required to create a profile.')
  const ref = profileRef(user.uid)
  const snapshot = await getDoc(ref)
  if (snapshot.exists()) {
    const profile = { ...profileDefaults(user.uid, user), ...snapshot.data(), uid: user.uid, id: user.uid }
    const batch = writeBatch(db)
    queuePublicProfile(batch, user.uid, profile)
    await batch.commit()
    return profile
  }
  const profile = profileDefaults(user.uid, user)
  await setDoc(ref, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return profile
}

export const getUser = async uid => {
  if (isMock('profile')) {
    const user = store.users.find(x => x.uid === uid || x.id === uid)
    if (!user) throw new Error('User not found')
    return clone(user)
  }
  const ref = profileRef(uid)
  const snapshot = await getDoc(ref)
  if (snapshot.exists()) return { ...snapshot.data(), uid, id: uid }
  const currentUser = auth?.currentUser?.uid === uid ? auth.currentUser : null
  if (currentUser) return ensureUserProfile(currentUser)
  return null
}

export const updateUser = async (uid, data) => {
  if (isMock('profile')) {
    const user = store.users.find(x => x.uid === uid || x.id === uid)
    if (!user) throw new Error('User not found')
    Object.assign(user, data)
    notify()
    return clone(user)
  }
  const ref = profileRef(uid)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    const currentUser = auth?.currentUser?.uid === uid ? auth.currentUser : null
    if (!currentUser) throw new Error('User profile not found.')
    const profile = { ...profileDefaults(uid, currentUser), ...data, updatedAt: serverTimestamp() }
    const result = { ...profile, uid, id: uid }
    const batch = writeBatch(db)
    batch.set(ref, { ...profile, createdAt: serverTimestamp() })
    queuePublicProfile(batch, uid, result)
    await batch.commit()
    return result
  }
  const result = { ...snapshot.data(), ...data, uid, id: uid }
  const batch = writeBatch(db)
  batch.update(ref, { ...data, updatedAt: serverTimestamp() })
  queuePublicProfile(batch, uid, result)
  await batch.commit()
  return result
}

export const getPublicUser = async uid => {
  if (isMock('profile')) {
    const user = store.users.find(item => item.uid === uid || item.id === uid)
    return user?.discoverable ? clone(user) : null
  }
  const snapshot = await getDoc(publicProfileRef(uid))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return { ...data, uid, id: uid, role: 'student', createdAt: data.createdAt?.toMillis?.() ?? 0 }
}

export const completeOnboarding = async (uid, data) => updateUser(uid, {
  ...data,
  name: data.name?.trim() || auth?.currentUser?.displayName || 'Student',
  onboarded: true
})
