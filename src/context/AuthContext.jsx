import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { isMock } from '../lib/config'
import { store, subscribe, clone } from '../lib/mockData'
import * as authService from '../features/auth/service'
import { ensureUserProfile, getUser } from '../features/profile/service'

const Context = createContext(null)

// Cached profile presentation data never includes authorization state.
const CACHE_KEY = uid => `cc_profile_${uid}`

const cacheProfile = profile => {
  try {
    if (profile?.uid) {
      localStorage.setItem(CACHE_KEY(profile.uid), JSON.stringify({
        onboarded: profile.onboarded,
        name: profile.name,
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

const authorizationRole = (firebaseUser, profile, claims = {}) => {
  if (!firebaseUser) return null
  if (claims.campusRole === 'admin') return 'admin'
  // Legacy moderators keep only the Space moderation rights enforced by Rules.
  // A Firestore profile value of "admin" is deliberately not an admin grant.
  if (profile?.role === 'moderator') return 'moderator'
  return 'student'
}

const presentProfile = (profile, role) => profile ? { ...profile, role } : null

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [roleLoading, setRoleLoading] = useState(true)

  const sync = () => {
    const storedProfile = store.users.find(item => item.uid === store.currentUid)
    const mockUser = storedProfile ? { uid: storedProfile.uid, email: storedProfile.email } : null
    const mockRole = storedProfile?.role || authorizationRole(mockUser, storedProfile, {})
    setUser(mockUser)
    setProfile(presentProfile(storedProfile ? clone(storedProfile) : null, mockRole))
    setRole(mockRole)
    setRoleLoading(false)
    setLoading(false)
  }

  useEffect(() => {
    if (isMock('auth')) {
      sync()
      return subscribe(sync)
    }

    if (!auth) {
      setLoading(false)
      setRoleLoading(false)
      return undefined
    }

    let loadSequence = 0
    const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
      const sequence = ++loadSequence
      setLoading(true)

      if (!firebaseUser) {
        setUser(null)
        setProfile(null)
        setRole(null)
        setRoleLoading(false)
        setLoading(false)
        return
      }

      const nextUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      }
      setUser(nextUser)
      setRoleLoading(true)

      let claims = {}
      try {
        // Refresh on session restoration so newly provisioned Custom Claims
        // become active after a reload even if the previous ID token is cached.
        claims = (await firebaseUser.getIdTokenResult(true)).claims || {}
      } catch (error) {
        console.error('Could not load Firebase authorization claims:', error)
      }

      let loadedProfile
      try {
        loadedProfile = await ensureUserProfile(firebaseUser)
      } catch (error) {
        console.error('Could not load the Firebase user profile:', error)
        const cached = readCachedProfile(firebaseUser.uid)
        loadedProfile = {
          uid: firebaseUser.uid,
          id: firebaseUser.uid,
          name: cached?.name || firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Student',
          email: firebaseUser.email || '',
          campus: '',
          interests: [],
          teach: [],
          learn: [],
          lookingFor: [],
          bio: '',
          photoURL: firebaseUser.photoURL || '',
          discoverable: true,
          onboarded: cached?.onboarded ?? false,
          createdAt: Date.now(),
        }
      }

      if (sequence !== loadSequence) return
      const resolvedRole = authorizationRole(firebaseUser, loadedProfile, claims)
      setRole(resolvedRole)
      setProfile(presentProfile(loadedProfile, resolvedRole))
      cacheProfile(loadedProfile)
      setRoleLoading(false)
      setLoading(false)
    })

    return () => {
      loadSequence += 1
      unsubscribe()
    }
  }, [])

  const refreshAuthorization = async () => {
    if (isMock('auth')) {
      sync()
      return role
    }
    const firebaseUser = auth?.currentUser
    if (!firebaseUser) {
      setRole(null)
      setProfile(null)
      setRoleLoading(false)
      return null
    }

    setRoleLoading(true)
    try {
      // An administrator claim assigned while the user was signed in is only
      // available to Rules after the ID token has been refreshed.
      const tokenResult = await firebaseUser.getIdTokenResult(true)
      const resolvedRole = authorizationRole(firebaseUser, profile, tokenResult.claims || {})
      setRole(resolvedRole)
      setProfile(current => presentProfile(current, resolvedRole))
      return resolvedRole
    } finally {
      setRoleLoading(false)
    }
  }

  const wrap = fn => async (...args) => {
    const result = await fn(...args)
    if (isMock('auth')) {
      sync()
    } else if (result && result.uid) {
      const firebaseUser = auth?.currentUser?.uid === result.uid ? auth.currentUser : null
      let claims = {}
      try {
        if (firebaseUser) claims = (await firebaseUser.getIdTokenResult()).claims || {}
      } catch (error) {
        console.error('Could not load Firebase authorization claims:', error)
      }
      const resolvedRole = authorizationRole(firebaseUser, result, claims)
      setUser({
        uid: result.uid,
        email: result.email,
        displayName: result.displayName || result.name,
        photoURL: result.photoURL,
      })
      setRole(resolvedRole)
      setProfile(presentProfile(result, resolvedRole))
      setRoleLoading(false)
      setLoading(false)
      cacheProfile(result)
    } else if (fn === authService.signOutUser) {
      clearCachedProfile(user?.uid)
      setUser(null)
      setProfile(null)
      setRole(null)
      setRoleLoading(false)
    }
    return result
  }

  const refreshProfile = async () => {
    if (!user) return
    try {
      const nextProfile = await getUser(user.uid)
      if (nextProfile) {
        setProfile(presentProfile(nextProfile, role))
        cacheProfile(nextProfile)
      }
    } catch (error) {
      console.error('Could not refresh the user profile:', error)
    }
  }

  return (
    <Context.Provider
      value={{
        user,
        profile,
        role,
        isAdmin: role === 'admin',
        loading,
        roleLoading,
        signUp: wrap(authService.signUpEmail),
        signIn: wrap(authService.signInEmail),
        signInWithGoogle: wrap(authService.signInGoogle),
        signInAdminWithGoogle: wrap(authService.signInAdminGoogle),
        signOut: wrap(authService.signOutUser),
        refreshProfile,
        refreshAuthorization,
      }}
    >
      {children}
    </Context.Provider>
  )
}

export const useAuth = () => useContext(Context)
