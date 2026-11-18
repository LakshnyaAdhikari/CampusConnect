import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone, id } from '../../lib/mockData'
import { auth, db } from '../../lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

const reportReadFailure = (operation, error) => {
  if (import.meta.env.DEV) {
    console.error(`[Admin Dashboard] ${operation} failed`, {
      code: error?.code || 'unknown',
      message: error?.message || String(error),
    }, error)
  }
  return { operation, code: error?.code || 'unknown', message: error?.message || String(error) }
}

const readSafely = async (operation, read) => {
  try {
    return { value: await read(), error: null }
  } catch (error) {
    return { value: null, error: reportReadFailure(operation, error) }
  }
}

// Firebase Rules authorize these collection queries only when each query
// proves the same constraints used by the corresponding allow-list rule.
export const loadAdminDashboard = async campus => {
  if (!db || !auth?.currentUser) throw new Error('Sign in with an authorized administrator account to load dashboard data.')

  let tokenResult
  try {
    tokenResult = await auth.currentUser.getIdTokenResult()
  } catch (error) {
    reportReadFailure('auth.currentUser.getIdTokenResult (verify campusRole)', error)
    throw error
  }
  const campusRole = tokenResult.claims.campusRole ?? null
  if (import.meta.env.DEV) {
    console.info('[Admin Dashboard] Firebase token authorization claim', { campusRole })
  }
  if (campusRole !== 'admin') {
    if (import.meta.env.DEV) {
      console.error('[Admin Dashboard] authorization claim check failed', {
        operation: 'verify campusRole === admin',
        code: 'missing-admin-claim',
        campusRole,
      })
    }
    throw new Error('The current Firebase ID token does not contain campusRole: "admin". Refresh authorization or sign in again.')
  }

  const studentRead = readSafely('publicProfiles.listDiscoverable (discoverable == true)', async () => {
    const snapshot = await getDocs(query(
      collection(db, 'publicProfiles'),
      where('discoverable', '==', true),
    ))
    return snapshot.docs.map(item => ({ uid: item.id, ...item.data() }))
  })

  const publicSpaceRead = readSafely('spaces.listPublic (visibility == public)', async () => {
    const snapshot = await getDocs(query(
      collection(db, 'spaces'),
      where('visibility', '==', 'public'),
    ))
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
  })

  const campusSpaceRead = campus
    ? readSafely('spaces.listCampus (visibility == campus, campus == own profile campus)', async () => {
      const snapshot = await getDocs(query(
        collection(db, 'spaces'),
        where('visibility', '==', 'campus'),
        where('campus', '==', campus),
      ))
      return snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
    })
    : Promise.resolve({ value: [], error: null })

  const [studentsResult, publicSpacesResult, campusSpacesResult] = await Promise.all([
    studentRead,
    publicSpaceRead,
    campusSpaceRead,
  ])

  const spaces = new Map()
  for (const space of [...(publicSpacesResult.value || []), ...(campusSpacesResult.value || [])]) {
    spaces.set(space.id, space)
  }

  return {
    students: studentsResult.value || [],
    spaces: [...spaces.values()],
    errors: {
      students: studentsResult.error,
      publicSpaces: publicSpacesResult.error,
      campusSpaces: campusSpacesResult.error,
    },
  }
}

// These admin-service operations remain mock-only. No Firebase reports or
// user-management collections / endpoints are implemented.
export const createReport = async data => { if (isMock('admin')) { const item={id:id('r'),reporterUid:store.currentUid,...data,status:'open',createdAt:Date.now()};store.reports.push(item);notify();return clone(item)} throw new Error('not implemented') }
export const listenReports = cb => { if (isMock('admin')) { const push=()=>cb(clone(store.reports));push();return subscribe(push)} throw new Error('not implemented') }
export const resolveReport = async reportId => { if (isMock('admin')) { store.reports.find(x=>x.id===reportId).status='resolved';notify();return} throw new Error('not implemented') }
export const listUsers = async () => { if (isMock('admin')) return clone(store.users); throw new Error('not implemented') }
export const setUserRole = async (uid,role) => { if (isMock('admin')) { store.users.find(x=>x.uid===uid).role=role;notify();return} throw new Error('not implemented') }
