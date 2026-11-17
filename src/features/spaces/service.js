import { isMock } from '../../lib/config'
import { store, notify, subscribe, clone, id } from '../../lib/mockData'
import { auth, db } from '../../lib/firebase'
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore'

const user = () => store.users.find(item => item.uid === store.currentUid)
const mockSpace = spaceId => store.spaces.find(item => item.id === spaceId)
const requireDb = () => {
  if (!db) throw new Error('Cloud Firestore is not initialized. Check your Firebase configuration.')
  return db
}
const currentUid = () => {
  const uid = auth?.currentUser?.uid
  if (!uid) throw new Error('A signed-in user is required.')
  return uid
}
const spaceRef = (firestore, spaceId) => doc(firestore, 'spaces', spaceId)
const membershipRef = (firestore, uid, spaceId) => doc(firestore, 'users', uid, 'spaceMemberships', spaceId)
const postsRef = (firestore, spaceId) => collection(firestore, 'spaces', spaceId, 'posts')
const postRef = (firestore, spaceId, postId) => doc(firestore, 'spaces', spaceId, 'posts', postId)
const commentsRef = (firestore, spaceId, postId) => collection(firestore, 'spaces', spaceId, 'posts', postId, 'comments')
const commentRef = (firestore, spaceId, postId, commentId) => doc(firestore, 'spaces', spaceId, 'posts', postId, 'comments', commentId)
const joinRequestsRef = (firestore, spaceId) => collection(firestore, 'spaces', spaceId, 'joinRequests')
const joinRequestRef = (firestore, spaceId, uid) => doc(firestore, 'spaces', spaceId, 'joinRequests', uid)
const asMillis = value => value?.toMillis?.() ?? (typeof value === 'number' ? value : Date.now())
const normalizedMembers = data => {
  if (!Array.isArray(data.members) || data.members.some(uid => typeof uid !== 'string' || !uid)) {
    throw new Error('Space membership data is invalid.')
  }
  return [...new Set(data.members)]
}

const normalizeComment = comment => ({ ...comment, createdAt: asMillis(comment.createdAt) })
const normalizePost = snapshot => {
  const data = snapshot.data()
  return {
    ...data,
    id: snapshot.id,
    createdAt: asMillis(data.createdAt),
    comments: (Array.isArray(data.comments) ? data.comments : []).map(normalizeComment),
  }
}
const normalizeSpace = snapshot => {
  const data = snapshot.data()
  const members = Array.isArray(data.members) ? [...new Set(data.members)] : []
  return {
    ...data,
    id: snapshot.id,
    members,
    memberCount: members.length,
    // Missing visibility retains the pre-visibility campus-only behavior.
    visibility: data.visibility ?? 'campus',
    createdAt: asMillis(data.createdAt),
    posts: [],
  }
}

const getPosts = async (firestore, spaceId) => {
  const snapshot = await getDocs(query(postsRef(firestore, spaceId), orderBy('createdAt', 'desc')))
  return Promise.all(snapshot.docs.map(async postSnapshot => ({
    ...normalizePost(postSnapshot),
    comments: await getComments(firestore, spaceId, postSnapshot.id),
  })))
}

const getComments = async (firestore, spaceId, postId) => {
  const snapshot = await getDocs(query(commentsRef(firestore, spaceId, postId), orderBy('createdAt', 'asc')))
  return snapshot.docs.map(commentSnapshot => ({ ...commentSnapshot.data(), id: commentSnapshot.id, createdAt: asMillis(commentSnapshot.data().createdAt) }))
}

const getOwnProfile = async (firestore, uid) => {
  const snapshot = await getDoc(doc(firestore, 'users', uid))
  return snapshot.exists() ? snapshot.data() : {}
}

const assertSpaceExists = snapshot => {
  if (!snapshot.exists()) throw new Error('Space not found.')
}

export const listSpaces = async campus => {
  if (isMock('spaces')) {
    const ownCampus = user()?.campus
    const requestedCampus = campus || ownCampus
    if (campus && ownCampus && campus !== ownCampus) {
      throw new Error('You can only browse legacy spaces for your profile campus.')
    }
    return clone(store.spaces
      .filter(item => {
        const visibility = item.visibility ?? 'campus'
        return visibility === 'public'
          || ((visibility === 'campus') && item.campus === requestedCampus)
      })
      .sort((a, b) => b.createdAt - a.createdAt))
  }

  const firestore = requireDb()
  const uid = currentUid()
  const profile = await getOwnProfile(firestore, uid)
  const requestedCampus = campus || profile.campus
  if (campus && profile.campus && campus !== profile.campus) {
    throw new Error('You can only browse legacy spaces for your profile campus.')
  }

  // Public spaces are discoverable across campuses. Campus-scoped legacy spaces
  // are queried separately so private and other-campus spaces cannot be returned.
  const publicQuery = query(collection(firestore, 'spaces'), where('visibility', '==', 'public'))
  const campusQuery = requestedCampus
    ? query(
      collection(firestore, 'spaces'),
      where('visibility', '==', 'campus'),
      where('campus', '==', requestedCampus),
    )
    : null
  const [publicSnapshot, campusSnapshot] = await Promise.all([
    getDocs(publicQuery),
    campusQuery ? getDocs(campusQuery) : Promise.resolve(null),
  ])
  const uniqueSnapshots = new Map()
  for (const spaceSnapshot of [...publicSnapshot.docs, ...(campusSnapshot?.docs || [])]) {
    uniqueSnapshots.set(spaceSnapshot.id, spaceSnapshot)
  }
  const spaces = await Promise.all([...uniqueSnapshots.values()].map(async spaceSnapshot => ({
    ...normalizeSpace(spaceSnapshot),
    posts: await getPosts(firestore, spaceSnapshot.id),
  })))
  return spaces.sort((a, b) => b.createdAt - a.createdAt)
}

export const listJoinedSpaces = async () => {
  if (isMock('spaces')) {
    return clone(store.spaces
      .filter(item => item.members?.includes(store.currentUid))
      .sort((a, b) => b.createdAt - a.createdAt))
  }

  const firestore = requireDb()
  const uid = currentUid()
  const snapshot = await getDocs(collection(firestore, 'users', uid, 'spaceMemberships'))
  const spaces = await Promise.all(snapshot.docs.map(async membership => {
    const spaceSnapshot = await getDoc(spaceRef(firestore, membership.id))
    if (!spaceSnapshot.exists() || !(spaceSnapshot.data().members || []).includes(uid)) return null
    return { ...normalizeSpace(spaceSnapshot), posts: await getPosts(firestore, spaceSnapshot.id) }
  }))
  return spaces.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt)
}

export const getSpace = async spaceId => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    if (!found) throw new Error('Space not found.')
    return clone(found)
  }

  const firestore = requireDb()
  currentUid()
  const snapshot = await getDoc(spaceRef(firestore, spaceId))
  assertSpaceExists(snapshot)
  return { ...normalizeSpace(snapshot), posts: await getPosts(firestore, spaceId) }
}

export const createSpace = async ({ name, description, category, visibility = 'public' }) => {
  const selectedVisibility = visibility === 'private' ? 'private' : 'public'
  if (isMock('spaces')) {
    const profile = user()
    if (!profile) throw new Error('A signed-in user profile is required to create a space.')
    const item = {
      id: id('space'), name, description, category: category || 'Campus Life', campus: profile.campus,
      visibility: selectedVisibility,
      createdBy: store.currentUid, memberCount: 1, createdAt: Date.now(), members: [store.currentUid], posts: [],
    }
    store.spaces.push(item)
    notify()
    return clone(item)
  }

  const firestore = requireDb()
  const uid = currentUid()
  const profile = await getOwnProfile(firestore, uid)
  const cleanName = String(name || '').trim()
  if (!cleanName) throw new Error('A space name is required.')
  if (!profile.campus) throw new Error('Your profile needs a campus before you can create a space.')
  const ref = doc(collection(firestore, 'spaces'))
  const data = {
    name: cleanName.slice(0, 100),
    description: String(description || '').trim().slice(0, 2000),
    category: category || 'Campus Life',
    campus: profile.campus,
    visibility: selectedVisibility,
    createdBy: uid,
    members: [uid],
    memberCount: 1,
    createdAt: serverTimestamp(),
  }
  const batch = writeBatch(firestore)
  batch.set(ref, data)
  batch.set(membershipRef(firestore, uid, ref.id), { spaceId: ref.id, joinedAt: serverTimestamp() })
  await batch.commit()
  return { ...data, id: ref.id, createdAt: Date.now(), posts: [] }
}

export const joinSpace = async spaceId => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    if (!found) throw new Error('Space not found.')
    const visibility = found.visibility ?? 'campus'
    if (visibility === 'private' && !found.members.includes(store.currentUid)) {
      throw new Error('Private spaces require owner approval.')
    }
    if (visibility === 'campus' && user()?.campus !== found.campus) {
      throw new Error('Campus-scoped spaces are only available to students at that campus.')
    }
    if (!found.members.includes(store.currentUid)) {
      found.members.push(store.currentUid)
      found.memberCount = (found.memberCount || found.members.length - 1) + 1
    }
    notify()
    return
  }

  const firestore = requireDb()
  const uid = currentUid()
  const ref = spaceRef(firestore, spaceId)
  const indexRef = membershipRef(firestore, uid, spaceId)
  await runTransaction(firestore, async transaction => {
    const snapshot = await transaction.get(ref)
    assertSpaceExists(snapshot)
    const indexSnapshot = await transaction.get(indexRef)
    const data = snapshot.data()
    const members = normalizedMembers(data)
    if ((data.visibility || 'public') === 'private' && !members.includes(uid)) {
      throw new Error('Private spaces require owner approval.')
    }
    if (members.includes(uid)) {
      if (data.members.length !== members.length || data.memberCount !== members.length) {
        transaction.update(ref, { members, memberCount: members.length, membershipApproval: deleteField() })
      } else if ('membershipApproval' in data) {
        transaction.update(ref, { membershipApproval: deleteField() })
      }
      if (!indexSnapshot.exists()) transaction.set(indexRef, { spaceId, joinedAt: serverTimestamp() })
      return
    }
    const nextMembers = [...members, uid]
    transaction.update(ref, { members: nextMembers, memberCount: nextMembers.length, membershipApproval: deleteField() })
    transaction.set(indexRef, { spaceId, joinedAt: serverTimestamp() })
  })
}

export const requestJoinSpace = async spaceId => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    const uid = store.currentUid
    if (!found) throw new Error('Space not found.')
    if ((found.visibility || 'public') !== 'private') return 'public'
    if (found.members.includes(uid)) return 'approved'
    found.joinRequests ||= {}
    const existing = found.joinRequests[uid]
    if (existing) {
      if (existing.status === 'pending') return 'pending'
      if (found.members.includes(uid)) return existing.status
      if (!['approved', 'rejected'].includes(existing.status)) return existing.status
      existing.status = 'pending'
      existing.createdAt = Date.now()
      delete existing.reviewedBy
      delete existing.reviewedAt
      notify()
      return 'pending'
    }
    found.joinRequests[uid] = { uid, status: 'pending', createdAt: Date.now() }
    notify()
    return 'pending'
  }

  const firestore = requireDb()
  const uid = currentUid()
  const ref = joinRequestRef(firestore, spaceId, uid)
  const notificationRef = doc(collection(firestore, 'notifications'))
  return runTransaction(firestore, async transaction => {
    const spaceSnapshot = await transaction.get(spaceRef(firestore, spaceId))
    const requestSnapshot = await transaction.get(ref)
    assertSpaceExists(spaceSnapshot)
    const spaceData = spaceSnapshot.data()
    if ((spaceData.visibility || 'public') !== 'private') return 'public'
    if ((spaceData.members || []).includes(uid)) return 'approved'
    if (spaceData.createdBy === uid) throw new Error('Space owners do not need to request access.')
    const profileSnapshot = await transaction.get(doc(firestore, 'users', uid))
    const actorName = profileSnapshot.data()?.name?.trim()
    if (!actorName) throw new Error('Complete your profile name before requesting access.')

    const notification = {
      recipientUid: spaceData.createdBy,
      type: 'space_join_request',
      actorUid: uid,
      actorName,
      createdAt: serverTimestamp(),
      read: false,
      spaceId,
      spaceName: spaceData.name,
      requestUid: uid,
    }
    if (requestSnapshot.exists()) {
      const requestData = requestSnapshot.data()
      if (requestData.status === 'pending') return 'pending'
      if (!['approved', 'rejected'].includes(requestData.status)) return requestData.status
      transaction.update(ref, {
        status: 'pending',
        createdAt: serverTimestamp(),
        notificationKey: notificationRef.id,
        reviewedBy: deleteField(),
        reviewedAt: deleteField(),
      })
      transaction.set(notificationRef, notification)
      return 'pending'
    }
    transaction.set(ref, {
      uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      notificationKey: notificationRef.id,
    })
    transaction.set(notificationRef, notification)
    return 'pending'
  })
}

export const getJoinRequestStatus = async spaceId => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    return found?.joinRequests?.[store.currentUid]?.status || null
  }
  const firestore = requireDb()
  const uid = currentUid()
  const snapshot = await getDoc(joinRequestRef(firestore, spaceId, uid))
  return snapshot.exists() ? snapshot.data().status : null
}

export const listenJoinRequests = (spaceId, callback) => {
  if (typeof callback !== 'function') throw new Error('A callback function is required.')
  if (isMock('spaces')) {
    const push = () => callback(Object.values(mockSpace(spaceId)?.joinRequests || {}).filter(item => item.status === 'pending'))
    push()
    return subscribe(push)
  }
  const firestore = requireDb()
  currentUid()
  return onSnapshot(
    query(joinRequestsRef(firestore, spaceId), where('status', '==', 'pending')),
    snapshot => callback(snapshot.docs
      .map(item => ({ ...item.data(), id: item.id, createdAt: asMillis(item.data().createdAt) }))
      .sort((left, right) => left.createdAt - right.createdAt)),
    error => {
      console.error('Error listening to private Space requests:', error)
      callback([])
    },
  )
}

export const respondJoinRequest = async (spaceId, requesterUid, approved) => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    const request = found?.joinRequests?.[requesterUid]
    if (!found || !request || request.status !== 'pending') throw new Error('Pending request not found.')
    if (approved && !found.members.includes(requesterUid)) found.members.push(requesterUid)
    found.memberCount = found.members.length
    request.status = approved ? 'approved' : 'rejected'
    notify()
    return
  }

  const firestore = requireDb()
  const uid = currentUid()
  const spaceDocument = spaceRef(firestore, spaceId)
  const requestDocument = joinRequestRef(firestore, spaceId, requesterUid)
  const fallbackNotificationKey = doc(collection(firestore, 'notifications')).id
  return runTransaction(firestore, async transaction => {
    const spaceSnapshot = await transaction.get(spaceDocument)
    const requestSnapshot = await transaction.get(requestDocument)
    assertSpaceExists(spaceSnapshot)
    if (!requestSnapshot.exists() || requestSnapshot.data().status !== 'pending') {
      throw new Error('Pending request not found.')
    }
    const requestData = requestSnapshot.data()
    const notificationKey = requestData.notificationKey || fallbackNotificationKey
    const notificationId = `space_decision_${notificationKey}`
    let actorName = ''
    if (requesterUid !== uid) {
      const reviewerProfile = await transaction.get(doc(firestore, 'users', uid))
      actorName = reviewerProfile.data()?.name?.trim()
      if (!actorName) throw new Error('Complete your profile name before reviewing a request.')
    }
    const reviewedAt = serverTimestamp()
    transaction.update(requestDocument, {
      status: approved ? 'approved' : 'rejected',
      reviewedAt,
      reviewedBy: uid,
      ...(!requestData.notificationKey ? { notificationKey } : {}),
    })
    if (requesterUid !== uid) {
      transaction.set(doc(firestore, 'notifications', notificationId), {
        recipientUid: requesterUid,
        type: approved ? 'space_join_approved' : 'space_join_rejected',
        actorUid: uid,
        actorName,
        createdAt: serverTimestamp(),
        read: false,
        spaceId,
        spaceName: spaceSnapshot.data().name,
        requestUid: requesterUid,
      })
    }
    if (approved) {
      const members = normalizedMembers(spaceSnapshot.data())
      if (members.includes(requesterUid)) throw new Error('User is already a member.')
      const nextMembers = [...members, requestData.uid]
      transaction.update(spaceDocument, {
        members: nextMembers,
        memberCount: nextMembers.length,
        membershipApproval: deleteField(),
      })
      transaction.set(membershipRef(firestore, requesterUid, spaceId), {
        spaceId,
        joinedAt: serverTimestamp(),
      })
    }
  })
}

export const leaveSpace = async spaceId => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    if (!found) throw new Error('Space not found.')
    if (found.members.includes(store.currentUid)) {
      const memberCount = Number.isFinite(found.memberCount) ? found.memberCount : found.members.length
      found.members = found.members.filter(uid => uid !== store.currentUid)
      found.memberCount = Math.max(0, memberCount - 1)
    }
    notify()
    return
  }

  const firestore = requireDb()
  const uid = currentUid()
  const ref = spaceRef(firestore, spaceId)
  const indexRef = membershipRef(firestore, uid, spaceId)
  await runTransaction(firestore, async transaction => {
    const snapshot = await transaction.get(ref)
    assertSpaceExists(snapshot)
    const indexSnapshot = await transaction.get(indexRef)
    const data = snapshot.data()
    const members = normalizedMembers(data)
    if (!members.includes(uid) && data.members.length === members.length && data.memberCount === members.length) {
      if (indexSnapshot.exists()) transaction.delete(indexRef)
      if ('membershipApproval' in data) transaction.update(ref, { membershipApproval: deleteField() })
      return
    }
    const nextMembers = members.filter(memberUid => memberUid !== uid)
    transaction.update(ref, { members: nextMembers, memberCount: nextMembers.length, membershipApproval: deleteField() })
    if (indexSnapshot.exists()) transaction.delete(indexRef)
  })
}

export const isMember = async (spaceId, uid) => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    if (!found) throw new Error('Space not found.')
    return found.members.includes(uid)
  }

  const firestore = requireDb()
  const snapshot = await getDoc(spaceRef(firestore, spaceId))
  assertSpaceExists(snapshot)
  return (snapshot.data().members || []).includes(uid)
}

export const listenPosts = (spaceId, callback) => {
  if (typeof callback !== 'function') throw new Error('A callback function is required.')
  if (isMock('spaces')) {
    const push = () => callback(clone(mockSpace(spaceId)?.posts || []))
    push()
    return subscribe(push)
  }

  const firestore = requireDb()
  currentUid()
  const commentListeners = new Map()
  const postsById = new Map()
  const emit = () => callback([...postsById.values()].sort((a, b) => b.createdAt - a.createdAt))
  const stopPosts = onSnapshot(
    query(postsRef(firestore, spaceId), orderBy('createdAt', 'desc')),
    snapshot => {
      const currentIds = new Set(snapshot.docs.map(item => item.id))
      for (const [postId, unsubscribe] of commentListeners) {
        if (!currentIds.has(postId)) {
          unsubscribe()
          commentListeners.delete(postId)
          postsById.delete(postId)
        }
      }
      for (const postSnapshot of snapshot.docs) {
        const post = normalizePost(postSnapshot)
        postsById.set(post.id, { ...post, comments: postsById.get(post.id)?.comments || [] })
        if (!commentListeners.has(post.id)) {
          const unsubscribe = listenComments(spaceId, post.id, comments => {
            const current = postsById.get(post.id)
            if (!current) return
            postsById.set(post.id, { ...current, comments })
            emit()
          })
          commentListeners.set(post.id, unsubscribe)
        }
      }
      emit()
    },
    error => {
      console.error('Error listening to space posts:', error)
      callback([])
    }
  )
  return () => {
    stopPosts()
    commentListeners.forEach(unsubscribe => unsubscribe())
    commentListeners.clear()
    postsById.clear()
  }
}

export const listenSpace = (spaceId, callback) => {
  if (typeof callback !== 'function') throw new Error('A callback function is required.')
  if (isMock('spaces')) {
    const push = () => {
      const found = mockSpace(spaceId)
      callback(found ? clone(found) : null)
    }
    push()
    return subscribe(push)
  }

  const firestore = requireDb()
  currentUid()
  return onSnapshot(spaceRef(firestore, spaceId), snapshot => {
    callback(snapshot.exists() ? normalizeSpace(snapshot) : null)
  }, error => {
    console.error('Error listening to space:', error)
    callback(null)
  })
}

export const createPost = async (spaceId, { text, isAnonymous = false }) => {
  if (isMock('spaces')) {
    const profile = user()
    const found = mockSpace(spaceId)
    if (!found) throw new Error('Space not found.')
    if (!found.members.includes(store.currentUid)) throw new Error('Join this space before posting.')
    if (!String(text || '').trim()) throw new Error('Post text is required.')
    const item = {
      id: id('p'), authorName: isAnonymous ? 'Anonymous' : (profile?.name || 'Student'),
      isAnonymous, ...(!isAnonymous ? { authorUid: profile?.uid } : {}),
      text: String(text).trim(), createdAt: Date.now(), comments: [],
    }
    found.posts.unshift(item)
    notify()
    return clone(item)
  }

  const firestore = requireDb()
  const uid = currentUid()
  const cleanText = String(text || '').trim()
  if (!cleanText) throw new Error('Post text is required.')
  const profile = isAnonymous ? {} : await getOwnProfile(firestore, uid)
  const authorName = isAnonymous ? 'Anonymous' : profile.name?.trim()
  if (!isAnonymous && !authorName) throw new Error('Add a name to your profile before posting.')
  const ref = doc(postsRef(firestore, spaceId))
  const data = {
    authorName,
    isAnonymous: Boolean(isAnonymous),
    text: cleanText.slice(0, 5000),
    createdAt: serverTimestamp(),
    ...(!isAnonymous ? { authorUid: uid } : {}),
  }
  await runTransaction(firestore, async transaction => {
    const snapshot = await transaction.get(spaceRef(firestore, spaceId))
    assertSpaceExists(snapshot)
    if (!(snapshot.data().members || []).includes(uid)) throw new Error('Join this space before posting.')
    transaction.set(ref, data)
  })
  return { ...data, id: ref.id, createdAt: Date.now() }
}

const mayModerate = async (firestore, uid) => {
  const profile = await getOwnProfile(firestore, uid)
  return profile.role === 'admin' || profile.role === 'moderator'
}

export const deletePost = async (spaceId, targetPostId) => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    if (!found) throw new Error('Space not found.')
    const index = found.posts.findIndex(post => post.id === targetPostId)
    if (index < 0) throw new Error('Post not found.')
    const post = found.posts[index]
    const profile = user()
    if (post.authorUid !== store.currentUid && !['admin', 'moderator'].includes(profile?.role)) {
      throw new Error('You do not have permission to delete this post.')
    }
    found.posts.splice(index, 1)
    notify()
    return
  }

  const firestore = requireDb()
  const uid = currentUid()
  const ref = postRef(firestore, spaceId, targetPostId)
  const moderator = await mayModerate(firestore, uid)
  await runTransaction(firestore, async transaction => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists()) throw new Error('Post not found.')
    if (snapshot.data().authorUid !== uid && !moderator) throw new Error('You do not have permission to delete this post.')
    transaction.delete(ref)
  })
  // Only staff may enumerate and clean orphaned comments after the parent post
  // is deleted. Authors leave these for trusted cleanup to avoid deleting
  // comments written by other users.
  if (moderator) {
    const comments = await getDocs(commentsRef(firestore, spaceId, targetPostId))
    for (let offset = 0; offset < comments.docs.length; offset += 400) {
      const batch = writeBatch(firestore)
      comments.docs.slice(offset, offset + 400).forEach(comment => batch.delete(comment.ref))
      await batch.commit()
    }
  }
}

export const listenComments = (spaceId, targetPostId, callback) => {
  if (typeof callback !== 'function') throw new Error('A callback function is required.')
  if (isMock('spaces')) {
    const push = () => callback(clone(mockSpace(spaceId)?.posts.find(post => post.id === targetPostId)?.comments || []))
    push()
    return subscribe(push)
  }

  const firestore = requireDb()
  currentUid()
  return onSnapshot(query(commentsRef(firestore, spaceId, targetPostId), orderBy('createdAt', 'asc')), snapshot => {
    callback(snapshot.docs.map(comment => ({ ...comment.data(), id: comment.id, createdAt: asMillis(comment.data().createdAt) })))
  }, error => {
    console.error('Error listening to space comments:', error)
    callback([])
  })
}

export const addComment = async (spaceId, targetPostId, { text, isAnonymous = false }) => {
  if (isMock('spaces')) {
    const found = mockSpace(spaceId)
    const post = found?.posts.find(item => item.id === targetPostId)
    if (!post) throw new Error('Post not found.')
    if (!found.members.includes(store.currentUid)) throw new Error('Join this space before replying.')
    const profile = user()
    const item = {
      id: id('c'), authorName: isAnonymous ? 'Anonymous' : (profile?.name || 'Student'),
      isAnonymous, ...(!isAnonymous ? { authorUid: profile?.uid } : {}),
      text: String(text || '').trim(), createdAt: Date.now(),
    }
    if (!item.text) throw new Error('Comment text is required.')
    post.comments.push(item)
    notify()
    return clone(item)
  }

  const firestore = requireDb()
  const uid = currentUid()
  const cleanText = String(text || '').trim()
  if (!cleanText) throw new Error('Comment text is required.')
  const profile = isAnonymous ? {} : await getOwnProfile(firestore, uid)
  const authorName = isAnonymous ? 'Anonymous' : profile.name?.trim()
  if (!isAnonymous && !authorName) throw new Error('Add a name to your profile before commenting.')
  const item = {
    authorName,
    isAnonymous: Boolean(isAnonymous), text: cleanText.slice(0, 2000), createdAt: serverTimestamp(),
    ...(!isAnonymous ? { authorUid: uid } : {}),
  }
  const ref = doc(commentsRef(firestore, spaceId, targetPostId))
  await runTransaction(firestore, async transaction => {
    const parent = await transaction.get(spaceRef(firestore, spaceId))
    assertSpaceExists(parent)
    if (!(parent.data().members || []).includes(uid)) throw new Error('Join this space before replying.')
    const postSnapshot = await transaction.get(postRef(firestore, spaceId, targetPostId))
    if (!postSnapshot.exists()) throw new Error('Post not found.')
    transaction.set(ref, item)
  })
  return { ...item, id: ref.id, createdAt: Date.now() }
}

export const deleteComment = async (spaceId, targetPostId, commentId) => {
  if (isMock('spaces')) {
    const post = mockSpace(spaceId)?.posts.find(item => item.id === targetPostId)
    if (!post) throw new Error('Post not found.')
    const comment = post.comments.find(item => item.id === commentId)
    if (!comment) throw new Error('Comment not found.')
    const profile = user()
    if (comment.authorUid !== store.currentUid && !['admin', 'moderator'].includes(profile?.role)) {
      throw new Error('You do not have permission to delete this comment.')
    }
    post.comments = post.comments.filter(item => item.id !== commentId)
    notify()
    return
  }

  const firestore = requireDb()
  const uid = currentUid()
  const ref = commentRef(firestore, spaceId, targetPostId, commentId)
  const snapshot = await getDoc(ref)
  if (!snapshot.exists()) throw new Error('Comment not found.')
  const moderator = await mayModerate(firestore, uid)
  if (snapshot.data().authorUid !== uid && !moderator) throw new Error('You do not have permission to delete this comment.')
  await deleteDoc(ref)
}
