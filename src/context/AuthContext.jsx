import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { isMock } from '../lib/config'
import { store, subscribe, clone } from '../lib/mockData'
import * as authService from '../features/auth/service'
import { ensureUserProfile, getUser } from '../features/profile/service'

const Context = createContext(null)

// --- localStorage profile cache (bridges page-refresh gap until Firestore profile service is implemented) ---
const CACHE_KEY = uid => `cc_profile_${uid}`

const cacheProfile = profile => {
  try {
    if (profile?.uid) {
      localStorage.setItem(CACHE_KEY(profile.uid), JSON.stringify({
        onboarded: profile.onboarded,
        role: profile.role,
        name: profile.name
      }))
    }
  } catch { /* storage unavailable */ }
}

const readCachedProfile = uid => {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY(uid)) || 'null') } catch { return null }
}

const clearCachedProfile = uid => {
  try { if (uid) localStorage.removeItem(CACHE_KEY(uid)) } catch { /* ignore */ }
}
// ---

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null),
    [profile, setProfile] = useState(null),
    [loading, setLoading] = useState(true)

  const sync = () => {
    const p = store.users.find(x => x.uid === store.currentUid)
    setUser(p ? { uid: p.uid, email: p.email } : null)
    setProfile(p ? clone(p) : null)
    setLoading(false)
  }

  useEffect(() => {
    if (isMock('auth')) {
      sync()
      return subscribe(sync)
    }

    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const u = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        }
        setUser(u)
        try {
          const p = await ensureUserProfile(firebaseUser)
          setProfile(p)
          cacheProfile(p)
        } catch {
          const cached = readCachedProfile(firebaseUser.uid)
          setProfile(prev => (prev && prev.uid === firebaseUser.uid) ? prev : {
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            name: cached?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
            email: firebaseUser.email || '',
            campus: '',
            role: cached?.role || 'student',
            interests: [],
            teach: [],
            learn: [],
            lookingFor: [],
            bio: '',
            photoURL: firebaseUser.photoURL || '',
            discoverable: true,
            onboarded: cached?.onboarded ?? false,
            createdAt: Date.now()
          })
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const wrap = fn => async (...args) => {
    const result = await fn(...args)
    if (isMock('auth')) {
      sync()
    } else if (result && result.uid) {
      setUser({
        uid: result.uid,
        email: result.email,
        displayName: result.displayName || result.name,
        photoURL: result.photoURL
      })
      setProfile(result)
      cacheProfile(result)
    } else if (fn === authService.signOutUser) {
      clearCachedProfile(user?.uid)
      setUser(null)
      setProfile(null)
    }
    return result
  }

  const refreshProfile = async () => {
    if (user) {
      try {
        const p = await getUser(user.uid)
        if (p) {
          setProfile(p)
          cacheProfile(p)
        }
      } catch {
        // Fallback gracefully if getUser is not implemented yet
      }
    }
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
        refreshProfile
      }}
    >
      {children}
    </Context.Provider>
  )
}

export const useAuth = () => useContext(Context)
