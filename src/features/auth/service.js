import { isMock } from '../../lib/config'
import { store, notify, clone, id } from '../../lib/mockData'
import { auth, db, googleProvider } from '../../lib/firebase'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  deleteUser,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

const formatAuthError = (error) => {
  if (!error) return new Error('Authentication failed')
  switch (error.code) {
    case 'auth/email-already-in-use':
      return new Error('This email is already in use. Please sign in instead.')
    case 'auth/invalid-email':
      return new Error('Please provide a valid email address.')
    case 'auth/weak-password':
      return new Error('Password must be at least 6 characters.')
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return new Error('Invalid email or password.')
    case 'auth/popup-closed-by-user':
      return new Error('Sign-in popup was closed before completing.')
    case 'auth/popup-blocked':
      return new Error('Sign-in popup was blocked by the browser. Please allow popups.')
    case 'auth/network-request-failed':
      return new Error('Network error. Please check your internet connection.')
    default:
      return new Error(error.message || 'An error occurred during authentication.')
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
      createdAt: Date.now(),
    }
    store.users.push(user)
    store.currentUid = uid
    notify()
    return clone(user)
  }

  if (!auth || !db) {
    throw new Error('Firebase is not initialized. Please check your environment variables in .env.')
  }

  let createdFirebaseUser = null
  try {
    const res = await createUserWithEmailAndPassword(auth, email, password)
    createdFirebaseUser = res.user

    if (name) {
      await updateProfile(createdFirebaseUser, { displayName: name }).catch(() => {})
    }

    const userData = {
      id: createdFirebaseUser.uid,
      uid: createdFirebaseUser.uid,
      name: name || createdFirebaseUser.displayName || '',
      email: createdFirebaseUser.email || email,
      campus: '',
      role: 'student',
      interests: [],
      teach: [],
      learn: [],
      lookingFor: [],
      bio: '',
      photoURL: createdFirebaseUser.photoURL || '',
      discoverable: true,
      onboarded: false,
      createdAt: Date.now(),
    }

    await setDoc(doc(db, 'users', createdFirebaseUser.uid), userData)
    return userData
  } catch (error) {
    // If Auth user was created but Firestore document creation failed, roll back Auth user
    if (createdFirebaseUser && auth.currentUser?.uid === createdFirebaseUser.uid) {
      try {
        await deleteUser(createdFirebaseUser)
      } catch {
        await signOut(auth).catch(() => {})
      }
    }
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

  if (!auth || !db) {
    throw new Error('Firebase is not initialized. Please check your environment variables in .env.')
  }

  try {
    const res = await signInWithEmailAndPassword(auth, email, password)
    const firebaseUser = res.user

    const userDocRef = doc(db, 'users', firebaseUser.uid)
    const snapshot = await getDoc(userDocRef)

    if (snapshot.exists()) {
      return snapshot.data()
    }

    const fallbackUser = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || '',
      email: firebaseUser.email || email,
      campus: '',
      role: 'student',
      interests: [],
      teach: [],
      learn: [],
      lookingFor: [],
      bio: '',
      photoURL: firebaseUser.photoURL || '',
      discoverable: true,
      onboarded: false,
      createdAt: Date.now(),
    }

    await setDoc(userDocRef, fallbackUser)
    return fallbackUser
  } catch (error) {
    throw formatAuthError(error)
  }
}

export const signInGoogle = async () => {
  if (isMock('auth')) {
    store.currentUid = 'u1'
    notify()
    return clone(store.users[0])
  }

  if (!auth || !db) {
    throw new Error('Firebase is not initialized. Please check your environment variables in .env.')
  }

  try {
    const res = await signInWithPopup(auth, googleProvider)
    const firebaseUser = res.user

    const userDocRef = doc(db, 'users', firebaseUser.uid)
    const snapshot = await getDoc(userDocRef)

    if (snapshot.exists()) {
      return snapshot.data()
    }

    const newUser = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || 'Campus Student',
      email: firebaseUser.email || '',
      campus: '',
      role: 'student',
      interests: [],
      teach: [],
      learn: [],
      lookingFor: [],
      bio: '',
      photoURL: firebaseUser.photoURL || '',
      discoverable: true,
      onboarded: false,
      createdAt: Date.now(),
    }

    await setDoc(userDocRef, newUser)
    return newUser
  } catch (error) {
    throw formatAuthError(error)
  }
}

export const signOutUser = async () => {
  if (isMock('auth')) {
    store.currentUid = null
    notify()
    return
  }

  if (!auth) return

  try {
    await signOut(auth)
  } catch (error) {
    throw new Error(error.message || 'Failed to sign out')
  }
}
