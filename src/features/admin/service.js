import { isMock } from '../../lib/config'
import { store, notify, clone, id } from '../../lib/mockData'
import { auth, db } from '../../lib/firebase'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore'

export const REPORT_CATEGORIES = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'safety', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
]

export const REPORT_STATUSES = ['pending', 'under_review', 'resolved', 'dismissed']
const mockModerationNotes = new Map()

const reportCollection = () => {
  if (!db) throw new Error('Cloud Firestore is not initialized.')
  return collection(db, 'reports')
}

const requireCurrentUser = () => {
  if (isMock('admin')) {
    if (!store.currentUid) throw new Error('Sign in before submitting or viewing reports.')
    return { uid: store.currentUid, mock: true }
  }
  if (!auth?.currentUser) throw new Error('Sign in before submitting or viewing reports.')
  return { uid: auth.currentUser.uid, mock: false, user: auth.currentUser }
}

const assertMockAdmin = current => {
  const profile = store.users.find(item => item.uid === current.uid)
  if (profile?.role !== 'admin') throw new Error('Administrator access is required to review reports.')
}

const reportError = (operation, error) => {
  if (import.meta.env.DEV) {
    console.error(`[Reports] ${operation} failed`, {
      code: error?.code || 'unknown',
      message: error?.message || String(error),
    }, error)
  }
  return error
}

const validateReportInput = input => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Report details are required.')
  }
  const allowedKeys = ['targetType', 'targetId', 'spaceId', 'category', 'reason']
  if (Object.keys(input).some(key => !allowedKeys.includes(key))) {
    throw new Error('Report contains unsupported fields.')
  }
  const { targetType, targetId, spaceId, category, reason } = input
  if (!['profile', 'space', 'post'].includes(targetType)) throw new Error('This content type cannot be reported.')
  if (typeof targetId !== 'string' || !targetId.trim() || targetId.trim().length > 128) {
    throw new Error('A valid report target is required.')
  }
  if (targetType === 'post' && (typeof spaceId !== 'string' || !spaceId.trim() || spaceId.trim().length > 128)) {
    throw new Error('A valid Space reference is required for a post report.')
  }
  if (targetType !== 'post' && spaceId !== undefined) throw new Error('Only post reports may include a Space reference.')
  if (!REPORT_CATEGORIES.some(item => item.value === category)) throw new Error('Choose a valid report category.')
  const cleanReason = typeof reason === 'string' ? reason.trim() : ''
  if (!cleanReason || cleanReason.length > 1000) throw new Error('Add a reason between 1 and 1000 characters.')
  return {
    targetType,
    targetId: targetId.trim(),
    ...(targetType === 'post' ? { spaceId: spaceId.trim() } : {}),
    category,
    reason: cleanReason,
  }
}

const toMillis = value => value?.toMillis?.() ?? (typeof value === 'number' ? value : 0)
const normalizeReport = snapshot => {
  const data = snapshot.data()
  return {
    ...data,
    id: snapshot.id,
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    reviewedAt: toMillis(data.reviewedAt),
  }
}

const assertAdminClaim = async user => {
  try {
    const token = await user.getIdTokenResult()
    if (import.meta.env.DEV) {
      console.info('[Reports] Firebase token authorization claim', { campusRole: token.claims.campusRole ?? null })
    }
    if (token.claims.campusRole !== 'admin') {
      throw new Error('Administrator access requires the trusted campusRole: "admin" token claim.')
    }
  } catch (error) {
    reportError('auth.currentUser.getIdTokenResult (verify admin report access)', error)
    throw error
  }
}

const readSafely = async (operation, read) => {
  try {
    return { value: await read(), error: null }
  } catch (error) {
    reportError(operation, error)
    return {
      value: null,
      error: {
        operation,
        code: error?.code || 'unknown',
        message: error?.message || String(error),
      },
    }
  }
}

export const loadAdminDashboard = async campus => {
  if (!db) throw new Error('Cloud Firestore is not initialized.')
  const current = requireCurrentUser()
  if (current.mock) throw new Error('Dashboard statistics require a Firebase-backed session; mock records are not shown as real statistics.')
  await assertAdminClaim(current.user)

  const studentRead = readSafely('publicProfiles.listDiscoverable (discoverable == true)', async () => {
    const snapshot = await getDocs(query(collection(db, 'publicProfiles'), where('discoverable', '==', true)))
    return snapshot.docs.map(item => ({ uid: item.id, ...item.data() }))
  })
  const publicSpaceRead = readSafely('spaces.listPublic (visibility == public)', async () => {
    const snapshot = await getDocs(query(collection(db, 'spaces'), where('visibility', '==', 'public')))
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

export const createReport = async input => {
  const target = validateReportInput(input)
  const current = requireCurrentUser()

  if (current.mock) {
    const existing = store.reports.find(item => item.reporterUid === current.uid
      && item.targetType === target.targetType
      && item.targetId === target.targetId
      && (target.targetType !== 'post' || item.spaceId === target.spaceId)
      && ['pending', 'under_review'].includes(item.status))
    if (existing) return { ...clone(existing), duplicate: true }
    const item = {
      id: id('report'),
      reporterUid: current.uid,
      ...target,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    store.reports.push(item)
    notify()
    return clone(item)
  }

  let existing
  try {
    existing = await getDocs(query(reportCollection(), where('reporterUid', '==', current.uid)))
  } catch (error) {
    reportError('create report duplicate check (list own reports by reporterUid)', error)
    throw error
  }
  const active = existing.docs.find(snapshot => {
    const data = snapshot.data()
    return data.targetType === target.targetType
      && data.targetId === target.targetId
      && (target.targetType !== 'post' || data.spaceId === target.spaceId)
      && ['pending', 'under_review'].includes(data.status)
  })
  if (active) return { ...normalizeReport(active), duplicate: true }

  try {
    const reference = await addDoc(reportCollection(), {
      reporterUid: current.uid,
      ...target,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    return { id: reference.id, reporterUid: current.uid, ...target, status: 'pending' }
  } catch (error) {
    reportError('create report addDoc (write reports document)', error)
    throw error
  }
}

export const listMyReports = async () => {
  const current = requireCurrentUser()
  if (current.mock) return clone(store.reports.filter(item => item.reporterUid === current.uid))
  try {
    const snapshot = await getDocs(query(reportCollection(), where('reporterUid', '==', current.uid)))
    return snapshot.docs.map(normalizeReport)
  } catch (error) {
    reportError('list own reports (reporterUid == current user)', error)
    throw error
  }
}

export const listReports = async () => {
  const current = requireCurrentUser()
  if (current.mock) {
    assertMockAdmin(current)
    return clone(store.reports).sort((a, b) => b.createdAt - a.createdAt)
  }
  await assertAdminClaim(current.user)
  try {
    const snapshot = await getDocs(query(reportCollection(), orderBy('createdAt', 'desc')))
    return snapshot.docs.map(normalizeReport)
  } catch (error) {
    reportError('list all reports (administrator collection query)', error)
    throw error
  }
}

export const listModerationNotes = async reportId => {
  if (typeof reportId !== 'string' || !reportId) throw new Error('A report ID is required.')
  const current = requireCurrentUser()
  if (current.mock) {
    assertMockAdmin(current)
    return clone(mockModerationNotes.get(reportId) || [])
  }
  await assertAdminClaim(current.user)
  try {
    const snapshot = await getDocs(query(
      collection(db, 'reports', reportId, 'moderationNotes'),
      orderBy('createdAt', 'desc'),
    ))
    return snapshot.docs.map(item => ({
      ...item.data(),
      id: item.id,
      createdAt: toMillis(item.data().createdAt),
    }))
  } catch (error) {
    reportError(`list moderation notes for report ${reportId}`, error)
    throw error
  }
}

export const updateReport = async (reportId, { status, moderatorNote = '' } = {}) => {
  if (typeof reportId !== 'string' || !reportId) throw new Error('A report ID is required.')
  if (!REPORT_STATUSES.includes(status)) throw new Error('Choose a valid moderation status.')
  const cleanNote = typeof moderatorNote === 'string' ? moderatorNote.trim() : ''
  if (cleanNote.length > 1000) throw new Error('Moderator notes cannot exceed 1000 characters.')
  const current = requireCurrentUser()

  if (current.mock) {
    assertMockAdmin(current)
    const report = store.reports.find(item => item.id === reportId)
    if (!report) throw new Error('Report not found.')
    if (!((report.status === 'pending' && ['under_review', 'resolved', 'dismissed'].includes(status))
      || (report.status === 'under_review' && ['under_review', 'resolved', 'dismissed'].includes(status)))) {
      throw new Error('This report can no longer be moderated.')
    }
    Object.assign(report, { status, reviewedBy: current.uid, reviewedAt: Date.now(), updatedAt: Date.now() })
    if (cleanNote) {
      const notes = mockModerationNotes.get(reportId) || []
      notes.unshift({ id: id('note'), authorUid: current.uid, note: cleanNote, createdAt: Date.now() })
      mockModerationNotes.set(reportId, notes)
    }
    notify()
    return clone(report)
  }

  await assertAdminClaim(current.user)
  try {
    const batch = writeBatch(db)
    batch.update(doc(reportCollection(), reportId), {
      status,
      updatedAt: serverTimestamp(),
      reviewedBy: current.uid,
      reviewedAt: serverTimestamp(),
    })
    if (cleanNote) {
      batch.set(doc(collection(db, 'reports', reportId, 'moderationNotes')), {
        authorUid: current.uid,
        note: cleanNote,
        createdAt: serverTimestamp(),
      })
    }
    await batch.commit()
    return { id: reportId, status, updatedAt: Date.now(), reviewedBy: current.uid, reviewedAt: Date.now() }
  } catch (error) {
    reportError(`update report ${reportId} moderation fields`, error)
    throw error
  }
}
