import { createContext, useContext, useEffect, useState } from 'react'
import { isMock } from '../lib/config'
import { store, subscribe, clone } from '../lib/mockData'
import { auth } from '../lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import * as authService from '../features/auth/service'
import { getUser } from '../features/profile/service'

const Context = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const syncMock = () => {
    const p = store.users.find(x => x.uid === store.currentUid)
    setUser(p ? { uid: p.uid, email: p.email } : null)
    setProfile(p ? clone(p) : null)
    setLoading(false)
  }

  // Helper to ensure mock services (connections, spaces, messages) don't crash
  // when Auth and Profile are running with real Firebase.
  const syncStoreForRealUser = (firebaseUid, userProfile) => {
    store.currentUid = firebaseUid
    if (userProfile && firebaseUid) {
      const idx = store.users.findIndex(x => x.uid === firebaseUid)
      if (idx >= 0) {
        store.users[idx] = { ...store.users[idx], ...userProfile }
      } else {
        store.users.push({ ...userProfile })
      }
    }
  }

  useEffect(() => {
    if (isMock('auth')) {
      syncMock()
      return subscribe(syncMock)
    }

    if (!auth) {
      setLoading(false)
      return
    }

    let isSubscribed = true

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isSubscribed) return

      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email })

        let userProfile = null
        try {
          userProfile = await getUser(firebaseUser.uid)
        } catch {
          // If setDoc during registration is still in flight, retry briefly
          await new Promise(resolve => setTimeout(resolve, 350))
          try {
            userProfile = await getUser(firebaseUser.uid)
          } catch {
            // Document not found yet
          }
        }

        if (isSubscribed) {
          if (userProfile) {
            setProfile(userProfile)
            syncStoreForRealUser(firebaseUser.uid, userProfile)
          } else {
            // Keep existing profile if already matching UID (set during wrap)
            setProfile(prev => (prev?.uid === firebaseUser.uid ? prev : null))
            store.currentUid = firebaseUser.uid
          }
        }
      } else {
        if (isSubscribed) {
          setUser(null)
          setProfile(null)
          store.currentUid = null
        }
      }

      if (isSubscribed) {
        setLoading(false)
      }
    })

    return () => {
      isSubscribed = false
      unsubscribe()
    }
  }, [])

  const wrap = fn => async (...args) => {
    const result = await fn(...args)
    if (isMock('auth')) {
      syncMock()
    } else if (result && result.uid) {
      setUser({ uid: result.uid, email: result.email })
      setProfile(result)
      syncStoreForRealUser(result.uid, result)
    } else if (fn === authService.signOutUser) {
      setUser(null)
      setProfile(null)
      store.currentUid = null
    }
    return result
  }

  const refreshProfile = async () => {
    if (isMock('auth')) {
      syncMock()
      return profile
    }
    const currentUid = user?.uid || auth?.currentUser?.uid
    if (currentUid) {
      try {
        const updated = await getUser(currentUid)
        setProfile(updated)
        syncStoreForRealUser(currentUid, updated)
        return updated
      } catch (err) {
        console.error('Failed to refresh profile:', err)
      }
    }
    return null
  }

  return (
    <Context.Provider
      value={{
        user,
        profile,
        role: profile?.role,
        loading,
        signUp: wrap(authService.signUpEmail),
        signIn: wrap(authService.signInEmail),
        signInWithGoogle: wrap(authService.signInGoogle),
        signOut: wrap(authService.signOutUser),
        refreshProfile,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export const useAuth = () => useContext(Context)
