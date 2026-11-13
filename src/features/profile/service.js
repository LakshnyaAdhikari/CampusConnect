import { isMock } from '../../lib/config'
import { store, notify, clone } from '../../lib/mockData'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
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

export const ensureUserProfile = async user => {
  if (isMock('profile')) return null
  if (!user?.uid) throw new Error('A signed-in user is required to create a profile.')
  const ref = profileRef(user.uid)
  const snapshot = await getDoc(ref)
  if (snapshot.exists()) return { ...profileDefaults(user.uid, user), ...snapshot.data(), uid: user.uid, id: user.uid }
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
    await setDoc(ref, { ...profile, createdAt: serverTimestamp() })
    return { ...profile, uid, id: uid }
  }
  await updateDoc(ref, { ...data, updatedAt: serverTimestamp() })
  return { ...snapshot.data(), ...data, uid, id: uid }
}

export const completeOnboarding = async (uid, data) => updateUser(uid, {
  ...data,
  name: data.name?.trim() || auth?.currentUser?.displayName || 'Student',
  onboarded: true
})
