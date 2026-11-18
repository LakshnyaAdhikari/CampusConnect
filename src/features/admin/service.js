import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone, id } from '../../lib/mockData'
import { auth, db } from '../../lib/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

// Dashboard reads are limited to the public student directory and Spaces that
// Firestore rules already expose to the signed-in administrator.
export const loadAdminDashboard = async campus => {
  if (!db || !auth?.currentUser) throw new Error('Sign in with an authorized administrator account to load dashboard data.')
  const publicProfiles = getDocs(collection(db, 'publicProfiles'))
  const publicSpaces = getDocs(query(collection(db, 'spaces'), where('visibility', '==', 'public')))
  const campusSpaces = campus
    ? getDocs(query(collection(db, 'spaces'), where('visibility', '==', 'campus'), where('campus', '==', campus)))
    : Promise.resolve(null)
  const [students, publicSpaceResults, campusSpaceResults] = await Promise.all([publicProfiles, publicSpaces, campusSpaces])
  const spaces = new Map()
  for (const snapshot of [...publicSpaceResults.docs, ...(campusSpaceResults?.docs || [])]) {
    spaces.set(snapshot.id, { id: snapshot.id, ...snapshot.data() })
  }
  return {
    students: students.docs.map(snapshot => ({ uid: snapshot.id, ...snapshot.data() })),
    spaces: [...spaces.values()],
  }
}
export const createReport = async data => { if (isMock('admin')) { const item={id:id('r'),reporterUid:store.currentUid,...data,status:'open',createdAt:Date.now()};store.reports.push(item);notify();return clone(item)} throw new Error('not implemented') }
export const listenReports = cb => { if (isMock('admin')) { const push=()=>cb(clone(store.reports));push();return subscribe(push)} throw new Error('not implemented') }
export const resolveReport = async reportId => { if (isMock('admin')) { store.reports.find(x=>x.id===reportId).status='resolved';notify();return} throw new Error('not implemented') }
export const listUsers = async () => { if (isMock('admin')) return clone(store.users); throw new Error('not implemented') }
export const setUserRole = async (uid,role) => { if (isMock('admin')) { store.users.find(x=>x.uid===uid).role=role;notify();return} throw new Error('not implemented') }
