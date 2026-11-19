import { isMock } from '../../lib/config'
import { store, notify, clone } from '../../lib/mockData'
import { Timestamp, doc, getDoc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { auth, db } from '../../lib/firebase'
import { CAMPUSES, INTERESTS, SKILLS, LOOKING_FOR } from '../../lib/schema'

const EDITABLE_FIELDS = [
  'name',
  'campus',
  'interests',
  'teach',
  'learn',
  'lookingFor',
  'bio',
  'photoURL',
  'discoverable'
]

const PROTECTED_FIELDS = [
  'uid',
  'id',
  'email',
  'role',
  'createdAt',
  'updatedAt'
]

const validateProfileUpdate = (data, { allowOnboarding = false } = {}) => {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Update payload must be a non-null object.')
  }

  const allowedEditable = allowOnboarding
    ? [...EDITABLE_FIELDS, 'onboarded']
    : EDITABLE_FIELDS

  const keys = Object.keys(data)
  for (const key of keys) {
    if (allowedEditable.includes(key)) {
      continue
    }
    if (PROTECTED_FIELDS.includes(key) || key === 'onboarded') {
      continue
    }
    throw new Error(`Cannot update unknown field: ${key}`)
  }

  const validated = {}

  if ('name' in data) {
    if (typeof data.name !== 'string') {
      throw new Error('Name must be a string.')
    }
    const trimmed = data.name.trim()
    if (!trimmed) {
      throw new Error('Name cannot be empty.')
    }
    if (trimmed.length > 80) {
      throw new Error('Name cannot exceed 80 characters.')
    }
    validated.name = trimmed
  }

  if ('campus' in data) {
    if (typeof data.campus !== 'string' || !CAMPUSES.includes(data.campus)) {
      throw new Error(`Campus must be one of: ${CAMPUSES.join(', ')}`)
    }
    validated.campus = data.campus
  }

  if ('interests' in data) {
    if (!Array.isArray(data.interests)) {
      throw new Error('Interests must be an array.')
    }
    if (data.interests.length > 40) {
      throw new Error('Interests cannot exceed 40 items.')
    }
    for (const item of data.interests) {
      if (typeof item !== 'string' || !INTERESTS.includes(item)) {
        throw new Error(`Invalid interest: ${item}`)
      }
    }
    validated.interests = [...data.interests]
  }

  if ('teach' in data) {
    if (!Array.isArray(data.teach)) {
      throw new Error('Teach must be an array.')
    }
    if (data.teach.length > 40) {
      throw new Error('Teach skills cannot exceed 40 items.')
    }
    for (const item of data.teach) {
      if (typeof item !== 'string' || !SKILLS.includes(item)) {
        throw new Error(`Invalid teach skill: ${item}`)
      }
    }
    validated.teach = [...data.teach]
  }

  if ('learn' in data) {
    if (!Array.isArray(data.learn)) {
      throw new Error('Learn must be an array.')
    }
    if (data.learn.length > 40) {
      throw new Error('Learn skills cannot exceed 40 items.')
    }
    for (const item of data.learn) {
      if (typeof item !== 'string' || !SKILLS.includes(item)) {
        throw new Error(`Invalid learn skill: ${item}`)
      }
    }
    validated.learn = [...data.learn]
  }

  if ('lookingFor' in data) {
    if (!Array.isArray(data.lookingFor)) {
      throw new Error('LookingFor must be an array.')
    }
    if (data.lookingFor.length > 20) {
      throw new Error('LookingFor preferences cannot exceed 20 items.')
    }
    for (const item of data.lookingFor) {
      if (typeof item !== 'string' || !LOOKING_FOR.includes(item)) {
        throw new Error(`Invalid lookingFor preference: ${item}`)
      }
    }
    validated.lookingFor = [...data.lookingFor]
  }

  if ('bio' in data) {
    if (typeof data.bio !== 'string') {
      throw new Error('Bio must be a string.')
    }
    if (data.bio.length > 500) {
      throw new Error('Bio cannot exceed 500 characters.')
    }
    validated.bio = data.bio
  }

  if ('photoURL' in data) {
    if (typeof data.photoURL !== 'string') {
      throw new Error('PhotoURL must be a string.')
    }
    if (data.photoURL.length > 2048) {
      throw new Error('PhotoURL cannot exceed 2048 characters.')
    }
    validated.photoURL = data.photoURL
  }

  if ('discoverable' in data) {
    if (typeof data.discoverable !== 'boolean') {
      throw new Error('Discoverable must be a boolean.')
    }
    validated.discoverable = data.discoverable
  }

  if (allowOnboarding && 'onboarded' in data) {
    if (typeof data.onboarded !== 'boolean') {
      throw new Error('Onboarded must be a boolean.')
    }
    validated.onboarded = data.onboarded
  }

  return validated
}

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
  if (!profile || profile.onboarded !== true || profile.discoverable !== true) {
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

const updateProfileInternal = async (uid, data, { allowOnboarding = false } = {}) => {
  if (!uid || typeof uid !== 'string') {
    throw new Error('A valid user ID is required.')
  }

  if (isMock('profile')) {
    if (store.currentUid !== uid) {
      throw new Error('Unauthorized: You can only update your own profile.')
    }
    const cleanData = validateProfileUpdate(data, { allowOnboarding })
    const user = store.users.find(x => x.uid === uid || x.id === uid)
    if (!user) throw new Error('User not found')
    Object.assign(user, cleanData)
    notify()
    return clone(user)
  }

  if (!auth?.currentUser || auth.currentUser.uid !== uid) {
    throw new Error('Unauthorized: You can only update your own profile.')
  }

  const cleanData = validateProfileUpdate(data, { allowOnboarding })
  const ref = profileRef(uid)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) {
    const currentUser = auth.currentUser
    const profile = { ...profileDefaults(uid, currentUser), ...cleanData, updatedAt: serverTimestamp() }
    const result = { ...profile, uid, id: uid }
    const batch = writeBatch(db)
    batch.set(ref, { ...profile, createdAt: serverTimestamp() })
    queuePublicProfile(batch, uid, result)
    await batch.commit()
    return result
  }
  const result = { ...snapshot.data(), ...cleanData, uid, id: uid }
  const batch = writeBatch(db)
  batch.update(ref, { ...cleanData, updatedAt: serverTimestamp() })
  queuePublicProfile(batch, uid, result)
  await batch.commit()
  return result
}

export const updateUser = async (uid, data) => updateProfileInternal(uid, data, { allowOnboarding: false })

export const getPublicUser = async uid => {
  if (isMock('profile')) {
    const user = store.users.find(item => item.uid === uid || item.id === uid)
    if (!user || user.onboarded !== true || user.discoverable !== true) {
      return null
    }
    return clone(user)
  }
  const snapshot = await getDoc(publicProfileRef(uid))
  if (!snapshot.exists()) return null
  const data = snapshot.data()
  return { ...data, uid, id: uid, role: 'student', createdAt: data.createdAt?.toMillis?.() ?? 0 }
}

export const completeOnboarding = async (uid, data) => {
  const currentName = data?.name?.trim() ||
    (isMock('profile')
      ? store.users.find(x => x.uid === uid || x.id === uid)?.name
      : auth?.currentUser?.displayName) ||
    'Student'

  return updateProfileInternal(uid, {
    ...data,
    name: currentName,
    onboarded: true
  }, { allowOnboarding: true })
}
