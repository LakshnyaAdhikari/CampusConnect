import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile
} from 'firebase/auth'
import { auth, googleProvider } from '../../lib/firebase'
import { isMock } from '../../lib/config'
import { store, notify, clone, id } from '../../lib/mockData'
import { ensureUserProfile } from '../profile/service'

function formatAuthError(error) {
  const code = error?.code || ''
  switch (code) {
    case 'auth/invalid-email':
      return new Error('Please enter a valid email address.')
    case 'auth/user-disabled':
      return new Error('This account has been disabled.')
    case 'auth/user-not-found':
      return new Error('No account found with this email address.')
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return new Error('Invalid email or password.')
    case 'auth/email-already-in-use':
      return new Error('An account with this email already exists.')
    case 'auth/weak-password':
      return new Error('Password must be at least 6 characters.')
    case 'auth/popup-closed-by-user':
      return new Error('Sign-in popup was closed before completing.')
    case 'auth/cancelled-popup-request':
      return new Error('Sign-in popup was cancelled.')
    case 'auth/popup-blocked':
      return new Error('Sign-in popup was blocked by your browser. Please allow popups for this site.')
    case 'auth/network-request-failed':
      return new Error('Network error. Please check your internet connection.')
    case 'auth/too-many-requests':
      return new Error('Too many failed attempts. Please try again later.')
    case 'auth/operation-not-allowed':
      return new Error('This sign-in method is not enabled in Firebase Console.')
    default:
      return new Error(error?.message || 'Authentication failed. Please try again.')
  }
}

export const signUpEmail = async (email, password, name) => {
  if (isMock('auth')) {
    const uid = id('u')
    const user = {
      id: uid,
      uid,
      name,
      email,
      campus: '',
      role: 'student',
      interests: [],
      teach: [],
      learn: [],
      lookingFor: [],
      bio: '',
      photoURL: '',
      discoverable: true,
      onboarded: false,
      createdAt: Date.now()
    }
    store.users.push(user)
    store.currentUid = uid
    notify()
    return clone(user)
  }

  if (!auth) throw new Error('Firebase Auth is not initialized. Check your Firebase configuration.')

  try {
    if (import.meta.env.DEV) {
      console.log('[Auth] signUpEmail attempt, email:', email)
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (name && cred.user) {
      try {
        await updateProfile(cred.user, { displayName: name })
      } catch {
        // Non-fatal if display name update fails
      }
    }
    const profile = await ensureUserProfile(cred.user)
    if (import.meta.env.DEV) {
      console.log('[Auth] signUpEmail success, uid:', cred.user.uid)
    }
    return {
      uid: cred.user.uid,
      id: cred.user.uid,
      email: cred.user.email,
      name: name || cred.user.displayName || email.split('@')[0],
      displayName: name || cred.user.displayName || email.split('@')[0],
      photoURL: cred.user.photoURL || '',
      campus: '',
      role: 'student',
      interests: [],
      teach: [],
      learn: [],
      lookingFor: [],
      bio: '',
      discoverable: true,
      onboarded: false,
      ...profile
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[Auth] signUpEmail error:', error.code, error.message)
    throw formatAuthError(error)
  }
}

export const signInEmail = async (email, password) => {
  if (isMock('auth')) {
    const user = store.users.find(x => x.email === email) || store.users[0]
    store.currentUid = user.uid
    notify()
    return clone(user)
  }

  if (!auth) throw new Error('Firebase Auth is not initialized. Check your Firebase configuration.')

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const profile = await ensureUserProfile(cred.user)
    if (import.meta.env.DEV) {
      console.log('[Auth] signInEmail success, uid:', cred.user.uid)
    }
    return {
      uid: cred.user.uid,
      id: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName || cred.user.email?.split('@')[0] || '',
      displayName: cred.user.displayName || cred.user.email?.split('@')[0] || '',
      photoURL: cred.user.photoURL || '',
      campus: '',
      role: 'student',
      interests: [],
      teach: [],
      learn: [],
      lookingFor: [],
      bio: '',
      discoverable: true,
      ...profile
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[Auth] signInEmail error:', error.code, error.message)
    throw formatAuthError(error)
  }
}

export const signInGoogle = async () => {
  if (isMock('auth')) {
    store.currentUid = 'u1'
    notify()
    return clone(store.users[0])
  }

  if (!auth) throw new Error('Firebase Auth is not initialized. Check your Firebase configuration.')

  try {
    if (import.meta.env.DEV) {
      console.log('[Auth] signInGoogle attempt')
    }
    const cred = await signInWithPopup(auth, googleProvider)
    const isNewUser = cred.user.metadata?.creationTime === cred.user.metadata?.lastSignInTime
    const profile = await ensureUserProfile(cred.user)
    if (import.meta.env.DEV) {
      console.log('[Auth] signInGoogle success, uid:', cred.user.uid, 'isNewUser:', isNewUser)
    }
    return {
      uid: cred.user.uid,
      id: cred.user.uid,
      email: cred.user.email,
      name: cred.user.displayName || cred.user.email?.split('@')[0] || '',
      displayName: cred.user.displayName || cred.user.email?.split('@')[0] || '',
      photoURL: cred.user.photoURL || '',
      campus: '',
      role: 'student',
      interests: [],
      teach: [],
      learn: [],
      lookingFor: [],
      bio: '',
      discoverable: true,
      ...profile,
      onboarded: profile.onboarded ?? !isNewUser
    }
  } catch (error) {
    if (import.meta.env.DEV) console.error('[Auth] signInGoogle error:', error.code, error.message)
    throw formatAuthError(error)
  }
}

export const signOutUser = async () => {
  if (isMock('auth')) {
    store.currentUid = null
    notify()
    return
  }

  if (!auth) throw new Error('Firebase Auth is not initialized. Check your Firebase configuration.')

  try {
    await signOut(auth)
  } catch (error) {
    throw formatAuthError(error)
  }
}
