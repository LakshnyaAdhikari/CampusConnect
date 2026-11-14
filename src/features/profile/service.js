import { isMock } from '../../lib/config'
import { store, notify, clone } from '../../lib/mockData'
import { db } from '../../lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'

export const getUser = async (uid) => {
  if (!uid) {
    throw new Error('User not found')
  }

  if (isMock('profile')) {
    const user = store.users.find(x => x.uid === uid || x.id === uid)
    if (!user) throw new Error('User not found')
    return clone(user)
  }

  if (!db) {
    throw new Error('Firestore is not initialized. Please check your environment variables in .env.')
  }

  try {
    const docRef = doc(db, 'users', uid)
    const snapshot = await getDoc(docRef)
    if (!snapshot.exists()) {
      throw new Error('User not found')
    }
    return snapshot.data()
  } catch (error) {
    throw new Error(error.message || 'Could not fetch user profile')
  }
}

export const updateUser = async (uid, data) => {
  if (!uid) {
    throw new Error('User ID is required to update profile')
  }

  if (isMock('profile')) {
    const user = store.users.find(x => x.uid === uid || x.id === uid)
    if (!user) throw new Error('User not found')
    Object.assign(user, data)
    notify()
    return clone(user)
  }

  if (!db) {
    throw new Error('Firestore is not initialized. Please check your environment variables in .env.')
  }

  try {
    const docRef = doc(db, 'users', uid)
    await setDoc(docRef, data, { merge: true })
    const updated = await getDoc(docRef)
    return updated.data()
  } catch (error) {
    throw new Error(error.message || 'Could not update user profile')
  }
}

export const completeOnboarding = async (uid, data) => {
  if (isMock('profile')) {
    return updateUser(uid, { ...data, onboarded: true })
  }

  return updateUser(uid, { ...data, onboarded: true })
}
