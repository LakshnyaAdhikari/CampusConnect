import { auth, db } from '../../lib/firebase'
import { resolveAuthenticatedUser } from './auth-session'
import { settleMetricLoaders, sumMetricResults, unavailableMetric } from './overview-metrics'
import {
  addDoc,
  collection,
  documentId,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const PAGE_SIZE_DEFAULT = 25
const PAGE_SIZE_MAX = 100

const ensureDb = () => {
  if (!db) throw new Error('Cloud Firestore is not initialized.')
  return db
}

const dateValue = (value, name) => {
  if (value === undefined || value === null || value === '') return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error(`${name} must be a valid date.`)
  return date
}

const pageSizeValue = value => {
  const size = value === undefined ? PAGE_SIZE_DEFAULT : Number(value)
  if (!Number.isInteger(size) || size < 1 || size > PAGE_SIZE_MAX) {
    throw new Error(`pageSize must be an integer between 1 and ${PAGE_SIZE_MAX}.`)
  }
  return size
}

const safeCursor = (cursor, sortField) => {
  if (cursor === undefined || cursor === null) return null
  if (typeof cursor !== 'object' || typeof cursor.id !== 'string' || !cursor.id) {
    throw new Error('The pagination cursor is invalid.')
  }
  const value = sortField === 'createdAt' ? Number(cursor.createdAt) : String(cursor.name || '')
  if (sortField === 'createdAt' && !Number.isFinite(value)) throw new Error('The pagination cursor is invalid.')
  return { value, id: cursor.id }
}

const fromMillis = value => value?.toMillis?.() ?? (typeof value === 'number' ? value : 0)

const withDateBounds = (constraints, startDate, endDate, field = 'createdAt') => {
  const start = dateValue(startDate, 'startDate')
  const end = dateValue(endDate, 'endDate')
  if (start && end && start > end) throw new Error('startDate must be earlier than endDate.')
  if (start) constraints.push(where(field, '>=', Timestamp.fromDate(start)))
  if (end) constraints.push(where(field, '<=', Timestamp.fromDate(end)))
  return { start, end }
}

const normalizeProfile = snapshot => {
  const data = snapshot.data()
  return { ...data, uid: snapshot.id, id: snapshot.id, role: 'student', createdAt: fromMillis(data.createdAt) }
}

const normalizeSpaceSummary = snapshot => {
  const data = snapshot.data()
  const members = Array.isArray(data.members) ? [...new Set(data.members)] : []
  return {
    id: snapshot.id,
    name: data.name || '',
    description: data.description || '',
    category: data.category || '',
    campus: data.campus || '',
    visibility: data.visibility ?? 'campus',
    createdBy: data.createdBy || '',
    memberCount: Number.isFinite(data.memberCount) ? data.memberCount : members.length,
    createdAt: fromMillis(data.createdAt),
  }
}

export const REPORT_CATEGORIES = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'safety', label: 'Safety concern' },
  { value: 'other', label: 'Other' },
]

export const REPORT_STATUSES = ['pending', 'under_review', 'resolved', 'dismissed']

const reportCollection = () => {
  if (!db) throw new Error('Cloud Firestore is not initialized.')
  return collection(db, 'reports')
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

const requireCurrentUser = async expectedUid => {
  try {
    // Context restoration can settle before this service executes. Always wait
    // on the shared Auth instance and bind the request to the Context UID.
    return await resolveAuthenticatedUser(auth, expectedUid)
  } catch (error) {
    reportError('resolve authenticated Firebase session', error)
    throw error
  }
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

export const loadAdminDashboard = async (campus, expectedUid) => {
  if (!db) throw new Error('Cloud Firestore is not initialized.')
  const current = await requireCurrentUser(expectedUid)
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

const reportCollectionQuery = filters => {
  const constraints = []
  if (filters.status) {
    if (!REPORT_STATUSES.includes(filters.status)) throw new Error('Choose a valid report status.')
    constraints.push(where('status', '==', filters.status))
  }
  if (filters.category) {
    if (!REPORT_CATEGORIES.some(item => item.value === filters.category)) throw new Error('Choose a valid report category.')
    constraints.push(where('category', '==', filters.category))
  }
  withDateBounds(constraints, filters.startDate, filters.endDate)
  return constraints
}

// Temporary, operation-specific diagnostics for tracing Overview read failures.
// Remove this helper and the operation labels once the failing request is known.
const withAdminReadDiagnostic = async (operation, read) => {
  try {
    return await read()
  } catch (error) {
    console.error({
      operation,
      code: error?.code || 'unknown',
      message: error?.message || String(error),
    })
    throw error
  }
}

const countQuery = async (path, constraints = [], diagnosticOperation) => {
  const read = async () => {
    const result = await getCountFromServer(query(collection(ensureDb(), path), ...constraints))
    return result.data().count
  }
  return diagnosticOperation ? withAdminReadDiagnostic(diagnosticOperation, read) : read()
}

const adminContext = async expectedUid => {
  const current = await requireCurrentUser(expectedUid)
  await assertAdminClaim(current.user)
  return current
}

/**
 * Count-only dashboard summary. It reads Firestore aggregate counts instead of
 * downloading the student, Space, or report collections.
 */
export const getDashboardStats = async (filters = {}, expectedUid, onMetricSettled) => {
  const current = await adminContext(expectedUid)
  const campusPromise = getAdminCampus('Overview administrator campus profile', current.uid)
  const studentConstraints = [where('discoverable', '==', true)]
  if (filters.campus) studentConstraints.push(where('campus', '==', String(filters.campus)))
  const publicSpaceConstraints = [where('visibility', '==', 'public')]
  const reportMetricStatus = {
    pendingReports: 'pending',
    underReviewReports: 'under_review',
    resolvedReports: 'resolved',
    dismissedReports: 'dismissed',
  }
  const reportOperation = {
    pending: 'Overview pending reports count',
    under_review: 'Overview under-review reports count',
    resolved: 'Overview resolved reports count',
    dismissed: 'Overview dismissed reports count',
  }
  const metrics = await settleMetricLoaders({
    discoverableStudents: () => countQuery('publicProfiles', studentConstraints, 'Overview discoverable students count'),
    publicSpaces: () => countQuery('spaces', publicSpaceConstraints, 'Overview public Spaces count'),
    campusSpaces: async () => {
      const campus = await campusPromise
      if (!campus) return unavailableMetric('Campus Spaces cannot be counted because this administrator has no campus on their profile.')
      return countQuery('spaces', [
        where('visibility', '==', 'campus'),
        where('campus', '==', campus),
      ], 'Overview campus Spaces count')
    },
    ...Object.fromEntries(Object.entries(reportMetricStatus).map(([metric, status]) => [
      metric,
      () => countQuery('reports', [where('status', '==', status)], reportOperation[status]),
    ])),
  }, onMetricSettled)
  metrics.visibleSpaces = {
    ...sumMetricResults(metrics.publicSpaces, metrics.campusSpaces),
    metric: 'visibleSpaces',
  }
  const metricValue = metric => metric.status === 'success' ? metric.value : null
  return {
    discoverableStudents: metricValue(metrics.discoverableStudents),
    visibleSpaces: metricValue(metrics.visibleSpaces),
    spaces: {
      public: metricValue(metrics.publicSpaces),
      campus: metricValue(metrics.campusSpaces),
      active: null,
    },
    reports: Object.fromEntries(Object.entries(reportMetricStatus).map(([metric, status]) => [
      status,
      metricValue(metrics[metric]),
    ])),
    metrics,
    unsupported: ['activeSpaces'],
  }
}

export const getDashboardMetric = async (metric, expectedUid) => {
  const current = await adminContext(expectedUid)
  const campusCount = async () => {
    const campus = await getAdminCampus('Overview administrator campus profile', current.uid)
    if (!campus) return unavailableMetric('Campus Spaces cannot be counted because this administrator has no campus on their profile.')
    return countQuery('spaces', [where('visibility', '==', 'campus'), where('campus', '==', campus)], 'Overview campus Spaces count')
  }
  const metricReaders = {
    discoverableStudents: () => countQuery('publicProfiles', [where('discoverable', '==', true)], 'Overview discoverable students count'),
    publicSpaces: () => countQuery('spaces', [where('visibility', '==', 'public')], 'Overview public Spaces count'),
    campusSpaces: campusCount,
    pendingReports: () => countQuery('reports', [where('status', '==', 'pending')], 'Overview pending reports count'),
    underReviewReports: () => countQuery('reports', [where('status', '==', 'under_review')], 'Overview under-review reports count'),
    resolvedReports: () => countQuery('reports', [where('status', '==', 'resolved')], 'Overview resolved reports count'),
    dismissedReports: () => countQuery('reports', [where('status', '==', 'dismissed')], 'Overview dismissed reports count'),
  }
  const reader = metricReaders[metric]
  if (!reader) throw new Error(`Overview metric cannot be retried: ${metric}`)
  return reader()
}

const getAdminCampus = async (diagnosticOperation, authenticatedUid) => {
  const uid = authenticatedUid || (await requireCurrentUser()).uid
  const read = () => getDoc(doc(ensureDb(), 'users', uid))
  const profile = diagnosticOperation
    ? await withAdminReadDiagnostic(diagnosticOperation, read)
    : await read()
  return profile.exists() ? (profile.data().campus || '') : ''
}

/** Count new discoverable profiles in monthly buckets (maximum 36 buckets). */
export const getRegistrationTrends = async (filters = {}, expectedUid) => {
  await adminContext(expectedUid)
  const interval = filters.interval || 'month'
  if (interval !== 'month') throw new Error('Only monthly registration trends are supported.')
  const end = dateValue(filters.endDate, 'endDate') || new Date()
  const defaultStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 11, 1))
  const start = dateValue(filters.startDate, 'startDate') || defaultStart
  if (start > end) throw new Error('startDate must be earlier than endDate.')
  const firstMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
  const buckets = []
  for (let cursor = firstMonth; cursor <= end; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
    const next = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    const bucketStart = cursor < start ? start : cursor
  const endExclusive = new Date(end.getTime() + 1)
    const bucketEnd = next > endExclusive ? endExclusive : next
    const constraints = [
      where('discoverable', '==', true),
      where('createdAt', '>=', Timestamp.fromDate(bucketStart)),
      where('createdAt', '<', Timestamp.fromDate(bucketEnd)),
    ]
    if (filters.campus) constraints.push(where('campus', '==', String(filters.campus)))
    buckets.push({ period: cursor.toISOString().slice(0, 7), start: bucketStart, end: bucketEnd, constraints })
    if (buckets.length > 36) throw new Error('Registration trends are limited to 36 monthly buckets.')
  }
  return Promise.all(buckets.map(async bucket => ({
    period: bucket.period,
    start: bucket.start.getTime(),
    end: bucket.end.getTime(),
    count: await countQuery('publicProfiles', bucket.constraints),
  })))
}

/** Count students for an explicit list of campus names without scanning profiles. */
export const getCampusStats = async (filters = {}, expectedUid) => {
  await adminContext(expectedUid)
  const campuses = filters.campuses
  if (!Array.isArray(campuses) || campuses.length > 50 || campuses.some(value => typeof value !== 'string' || !value.trim())) {
    throw new Error('Provide up to 50 campus names to calculate campus statistics.')
  }
  const uniqueCampuses = [...new Set(campuses.map(value => value.trim()))]
  return Promise.all(uniqueCampuses.map(async campus => ({
    campus,
    students: await countQuery('publicProfiles', [
      where('discoverable', '==', true),
      where('campus', '==', campus),
    ]),
  })))
}

/** No global activity feed exists in the current schema. */
export const getRecentActivity = async (_filters = {}, expectedUid) => {
  await adminContext(expectedUid)
  return { supported: false, items: [], reason: 'No global activity collection is available in the current schema.' }
}

/** List only discoverable public profiles; never reads /users or Auth accounts. */
export const listStudents = async (filters = {}, expectedUid) => {
  await adminContext(expectedUid)
  const campus = filters.campus ? String(filters.campus).trim() : ''
  const interest = filters.interest ? String(filters.interest).trim() : ''
  const skill = filters.skill ? String(filters.skill).trim() : ''
  const skillField = filters.skillField || 'teach'
  if (skill && !['teach', 'learn'].includes(skillField)) throw new Error('skillField must be "teach" or "learn".')
  if (interest && skill) throw new Error('Combine interest and skill filters in separate requests; Firestore supports one array membership filter at a time.')
  const sortBy = filters.sortBy || 'name'
  const direction = filters.direction || (sortBy === 'createdAt' ? 'desc' : 'asc')
  if (!['name', 'createdAt'].includes(sortBy) || !['asc', 'desc'].includes(direction)) {
    throw new Error('Students can be sorted by name or createdAt in ascending or descending order.')
  }
  const namePrefix = filters.namePrefix ? String(filters.namePrefix).trim() : ''
  if (namePrefix && sortBy !== 'name') throw new Error('Name prefix search requires sorting by name.')
  const pageSize = pageSizeValue(filters.pageSize)
  const constraints = [where('discoverable', '==', true)]
  if (campus) constraints.push(where('campus', '==', campus))
  if (interest) constraints.push(where('interests', 'array-contains', interest))
  if (skill) constraints.push(where(skillField, 'array-contains', skill))
  if (namePrefix) {
    constraints.push(where('name', '>=', namePrefix), where('name', '<=', `${namePrefix}\uf8ff`))
  }
  if (sortBy === 'createdAt') withDateBounds(constraints, filters.startDate, filters.endDate)
  else if (filters.startDate || filters.endDate) throw new Error('Registration date filters require sortBy="createdAt".')
  const cursor = safeCursor(filters.cursor, sortBy)
  const sortValue = value => sortBy === 'createdAt' ? Timestamp.fromMillis(value) : value
  constraints.push(orderBy(sortBy, direction), orderBy(documentId(), direction), limit(pageSize + 1))
  if (cursor) constraints.splice(constraints.length - 1, 0, startAfter(sortValue(cursor.value), cursor.id))
  const snapshot = await getDocs(query(collection(ensureDb(), 'publicProfiles'), ...constraints))
  const hasMore = snapshot.docs.length > pageSize
  const page = snapshot.docs.slice(0, pageSize)
  const last = page.at(-1)
  return {
    items: page.map(normalizeProfile),
    nextCursor: hasMore && last ? {
      [sortBy]: sortBy === 'createdAt' ? fromMillis(last.data().createdAt) : last.data().name,
      id: last.id,
    } : null,
  }
}

export const getStudentPublicProfile = async (uid, expectedUid) => {
  await adminContext(expectedUid)
  if (typeof uid !== 'string' || !uid.trim()) throw new Error('A student UID is required.')
  const snapshot = await getDoc(doc(ensureDb(), 'publicProfiles', uid.trim()))
  return snapshot.exists() && snapshot.data().discoverable === true ? normalizeProfile(snapshot) : null
}

const spaceQuery = (visibility, campus, filters, cursor) => {
  const constraints = [where('visibility', '==', visibility)]
  if (visibility === 'campus' || filters.campus) {
    constraints.push(where('campus', '==', visibility === 'campus' ? campus : String(filters.campus).trim()))
  }
  if (filters.category) constraints.push(where('category', '==', String(filters.category).trim()))
  constraints.push(orderBy('createdAt', 'desc'), orderBy(documentId()), limit(pageSizeValue(filters.pageSize) + 1))
  if (cursor) constraints.splice(constraints.length - 1, 0, startAfter(Timestamp.fromMillis(Number(cursor.createdAt)), cursor.id))
  return query(collection(ensureDb(), 'spaces'), ...constraints)
}

/** Paginated visible Space summaries; private Spaces are never listed or returned. */
export const listSpaces = async (filters = {}, expectedUid) => {
  await adminContext(expectedUid)
  const campus = await getAdminCampus()
  const requestedCampus = filters.campus ? String(filters.campus).trim() : campus
  if (requestedCampus && campus && requestedCampus !== campus) throw new Error('Only Spaces visible to the administrator’s campus can be listed.')
  if (requestedCampus && !campus && filters.visibility !== 'public') throw new Error('Campus-scoped Spaces require the administrator’s own campus profile.')
  const visibility = filters.visibility || 'all'
  if (!['all', 'public', 'campus'].includes(visibility)) throw new Error('Only public and campus-scoped Spaces are available.')
  const cursor = filters.cursor || {}
  const sources = []
  if (visibility !== 'campus') sources.push({ key: 'public', query: spaceQuery('public', '', filters, cursor.public) })
  if (visibility !== 'public' && requestedCampus) sources.push({ key: 'campus', query: spaceQuery('campus', requestedCampus, filters, cursor.campus) })
  const snapshots = await Promise.all(sources.map(async source => ({
    key: source.key,
    docs: (await getDocs(source.query)).docs,
  })))
  const merged = snapshots.flatMap(source => source.docs.map(snapshot => ({ key: source.key, snapshot })))
    .sort((left, right) => fromMillis(right.snapshot.data().createdAt) - fromMillis(left.snapshot.data().createdAt)
      || left.snapshot.id.localeCompare(right.snapshot.id))
  const pageSize = pageSizeValue(filters.pageSize)
  const page = merged.slice(0, pageSize)
  const hasMore = merged.length > pageSize
  const nextCursor = { ...(cursor || {}) }
  for (const item of page) {
    nextCursor[item.key] = { createdAt: fromMillis(item.snapshot.data().createdAt), id: item.snapshot.id }
  }
  return {
    items: page.map(item => normalizeSpaceSummary(item.snapshot)),
    nextCursor: hasMore ? nextCursor : null,
  }
}

export const getSpaceDetails = async (spaceId, expectedUid) => {
  await adminContext(expectedUid)
  if (typeof spaceId !== 'string' || !spaceId.trim()) throw new Error('A Space ID is required.')
  const campus = await getAdminCampus()
  const snapshot = await getDoc(doc(ensureDb(), 'spaces', spaceId.trim()))
  if (!snapshot.exists()) return null
  const space = normalizeSpaceSummary(snapshot)
  if (space.visibility === 'private') return null
  if (space.visibility !== 'public' && (!campus || space.campus !== campus)) return null
  return space
}

export const getSpaceStats = async (spaceId, expectedUid) => {
  const space = await getSpaceDetails(spaceId, expectedUid)
  if (!space) return null
  const postCollection = collection(ensureDb(), 'spaces', space.id, 'posts')
  const [postCount, recentPosts] = await Promise.all([
    getCountFromServer(postCollection),
    getDocs(query(postCollection, orderBy('createdAt', 'desc'), limit(5))),
  ])
  return {
    spaceId: space.id,
    memberCount: space.memberCount,
    postCount: postCount.data().count,
    latestPostAt: recentPosts.docs.length ? fromMillis(recentPosts.docs[0].data().createdAt) : null,
    recentPostCount: recentPosts.size,
    activeMembers: null,
  }
}

export const createReport = async (input, expectedUid) => {
  const target = validateReportInput(input)
  const current = await requireCurrentUser(expectedUid)

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

export const listMyReports = async expectedUid => {
  const current = await requireCurrentUser(expectedUid)
  try {
    const snapshot = await getDocs(query(reportCollection(), where('reporterUid', '==', current.uid)))
    return snapshot.docs.map(normalizeReport)
  } catch (error) {
    reportError('list own reports (reporterUid == current user)', error)
    throw error
  }
}

export const listReports = async (filtersOrExpectedUid = {}, expectedUid) => {
  // Backward compatible with the existing dashboard call listReports(uid).
  const legacyArrayResult = typeof filtersOrExpectedUid === 'string'
  const filters = legacyArrayResult ? {} : (filtersOrExpectedUid || {})
  const uid = legacyArrayResult ? filtersOrExpectedUid : expectedUid
  const current = await adminContext(uid)
  try {
    if (legacyArrayResult) {
      const snapshot = await getDocs(query(reportCollection(), orderBy('createdAt', 'desc')))
      return snapshot.docs.map(normalizeReport)
    }
    const pageSize = pageSizeValue(filters.pageSize)
    const constraints = reportCollectionQuery(filters)
    const cursor = safeCursor(filters.cursor, 'createdAt')
    constraints.push(orderBy('createdAt', 'desc'), orderBy(documentId()), limit(pageSize + 1))
    if (cursor) constraints.splice(constraints.length - 1, 0, startAfter(Timestamp.fromMillis(cursor.value), cursor.id))
    const snapshot = await getDocs(query(reportCollection(), ...constraints))
    const hasMore = snapshot.docs.length > pageSize
    const page = snapshot.docs.slice(0, pageSize)
    const last = page.at(-1)
    return {
      items: page.map(normalizeReport),
      nextCursor: hasMore && last ? { createdAt: fromMillis(last.data().createdAt), id: last.id } : null,
    }
  } catch (error) {
    reportError('list administrator reports', error)
    throw error
  }
}

export const listReportPage = (filters = {}, expectedUid) => listReports(filters, expectedUid)

export const getReportDetails = async (reportId, expectedUid) => {
  await adminContext(expectedUid)
  if (typeof reportId !== 'string' || !reportId.trim()) throw new Error('A report ID is required.')
  const snapshot = await getDoc(doc(reportCollection(), reportId.trim()))
  return snapshot.exists() ? normalizeReport(snapshot) : null
}

export const updateReportStatus = async (reportId, status, expectedUid) => {
  if (!REPORT_STATUSES.includes(status)) throw new Error('Choose a valid moderation status.')
  const current = await adminContext(expectedUid)
  const report = await getReportDetails(reportId, current.uid)
  if (!report) throw new Error('Report not found.')
  const allowed = (report.status === 'pending' || report.status === 'under_review')
    && ['under_review', 'resolved', 'dismissed'].includes(status)
  if (!allowed) throw new Error('This report can no longer be moderated.')
  const updatedAt = Date.now()
  try {
    await updateDoc(doc(reportCollection(), reportId), {
      status,
      updatedAt: serverTimestamp(),
      reviewedBy: current.uid,
      reviewedAt: serverTimestamp(),
    })
    return { ...report, status, updatedAt, reviewedBy: current.uid, reviewedAt: updatedAt }
  } catch (error) {
    reportError(`update report ${reportId} status`, error)
    throw error
  }
}

export const addModeratorNote = async (reportId, note, expectedUid) => {
  if (typeof reportId !== 'string' || !reportId.trim()) throw new Error('A report ID is required.')
  const cleanNote = typeof note === 'string' ? note.trim() : ''
  if (!cleanNote || cleanNote.length > 1000) throw new Error('Moderator notes must contain 1 to 1000 characters.')
  const current = await adminContext(expectedUid)
  const report = await getReportDetails(reportId, current.uid)
  if (!report) throw new Error('Report not found.')
  const reference = await addDoc(collection(reportCollection(), reportId, 'moderationNotes'), {
    authorUid: current.uid,
    note: cleanNote,
    createdAt: serverTimestamp(),
  })
  return { id: reference.id, authorUid: current.uid, note: cleanNote, createdAt: Date.now() }
}

export const getReportHistory = async (reportId, expectedUid) => {
  const report = await getReportDetails(reportId, expectedUid)
  if (!report) return null
  const notes = await listModerationNotes(reportId, expectedUid)
  return {
    report,
    notes,
    statusHistory: [],
    statusHistorySupported: false,
  }
}

export const listModerationNotes = async (reportId, expectedUid) => {
  if (typeof reportId !== 'string' || !reportId) throw new Error('A report ID is required.')
  const current = await requireCurrentUser(expectedUid)
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

export const updateReport = async (reportId, { status, moderatorNote = '' } = {}, expectedUid) => {
  if (typeof reportId !== 'string' || !reportId) throw new Error('A report ID is required.')
  if (!REPORT_STATUSES.includes(status)) throw new Error('Choose a valid moderation status.')
  const cleanNote = typeof moderatorNote === 'string' ? moderatorNote.trim() : ''
  if (cleanNote.length > 1000) throw new Error('Moderator notes cannot exceed 1000 characters.')
  const current = await requireCurrentUser(expectedUid)
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
