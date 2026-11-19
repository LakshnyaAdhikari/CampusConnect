import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  deleteField,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
  where,
} from 'firebase/firestore'

const PROJECT_ID = 'demo-campusconnect'
const SPACE_ID = 'north-space'
const SPACE_PATH = `spaces/${SPACE_ID}`
const POST_ID = 'post-one'
const COMMENT_ID = 'comment-one'
const now = () => Timestamp.fromMillis(1_700_000_000_000)

let testEnv

function dbFor(uid, claims = {}) {
  return testEnv.authenticatedContext(uid, claims).firestore()
}

test('an administrator cannot list private Spaces through the admin directory query', async () => {
  await seed({ visibility: 'private' })
  const db = dbFor('admin', { campusRole: 'admin' })
  await assertFails(getDocs(query(collection(db, 'spaces'), where('visibility', '==', 'private'))))
})

function profile(uid, campus = 'North Campus', role = 'student') {
  return {
    uid,
    id: uid,
    email: `${uid}@test.local`,
    name: uid[0].toUpperCase() + uid.slice(1),
    campus,
    role,
    createdAt: now(),
  }
}

function space({
  campus = 'North Campus',
  visibility = 'public',
  isActive = true,
  members = ['alice', 'bob'],
  memberCount = members.length,
  createdBy = 'alice',
} = {}) {
  return {
    name: 'Campus Coders',
    description: 'A test space',
    category: 'Technology',
    campus,
    visibility,
    isActive,
    createdBy,
    members,
    memberCount,
    createdAt: now(),
  }
}

function post(overrides = {}) {
  return {
    authorName: 'Alice',
    authorUid: 'alice',
    isAnonymous: false,
    text: 'A test post',
    createdAt: now(),
    ...overrides,
  }
}

function comment(overrides = {}) {
  return {
    authorName: 'Alice',
    authorUid: 'alice',
    isAnonymous: false,
    text: 'A test comment',
    createdAt: now(),
    ...overrides,
  }
}

async function seed({ members = ['alice', 'bob'], withPost = true, campus = 'North Campus', visibility = 'public', isActive = true, legacy = false } = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const profiles = [
      profile('alice'),
      profile('bob'),
      profile('carol'),
      profile('dave', 'South Campus'),
      profile('eve', 'Tech Park Campus'),
      profile('moderator', 'North Campus', 'moderator'),
      profile('admin', 'North Campus', 'admin'),
    ]
    for (const item of profiles) {
      await setDoc(doc(db, `users/${item.uid}`), item)
    }
    const spaceData = space({ members, campus, visibility, isActive })
    if (legacy) delete spaceData.visibility
    await setDoc(doc(db, SPACE_PATH), spaceData)
    if (withPost) {
      await setDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`), post())
      await setDoc(
        doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`),
        comment(),
      )
    }
  })
}

function notification({
  recipientUid = 'bob',
  actorUid = 'alice',
  actorName = 'Alice',
  type = 'connection_request',
  ...eventFields
} = {}) {
  return {
    recipientUid,
    type,
    actorUid,
    actorName,
    createdAt: now(),
    read: false,
    ...eventFields,
  }
}

async function createPendingJoinRequest(requesterUid, notificationKey = `request-${requesterUid}`) {
  const db = dbFor(requesterUid)
  const batch = writeBatch(db)
  batch.set(doc(db, `${SPACE_PATH}/joinRequests/${requesterUid}`), {
    uid: requesterUid,
    status: 'pending',
    createdAt: now(),
    notificationKey,
  })
  batch.set(doc(db, 'notifications', notificationKey), notification({
    recipientUid: 'alice',
    actorUid: requesterUid,
    actorName: requesterUid[0].toUpperCase() + requesterUid.slice(1),
    type: 'space_join_request',
    spaceId: SPACE_ID,
    spaceName: 'Campus Coders',
    requestUid: requesterUid,
  }))
  await assertSucceeds(batch.commit())
  return notificationKey
}

function addSpaceDecisionNotification(batch, db, reviewerUid, requesterUid, notificationKey, approved) {
  batch.set(doc(db, 'notifications', `space_decision_${notificationKey}`), notification({
    recipientUid: requesterUid,
    actorUid: reviewerUid,
    actorName: reviewerUid[0].toUpperCase() + reviewerUid.slice(1),
    type: approved ? 'space_join_approved' : 'space_join_rejected',
    spaceId: SPACE_ID,
    spaceName: 'Campus Coders',
    requestUid: requesterUid,
  }))
}

async function assertStaffCannotApproveOwnRequest(uid, claims = {}) {
  await seed({ visibility: 'private', members: ['alice'], withPost: false })
  const db = dbFor(uid, claims)
  const requestRef = doc(db, `${SPACE_PATH}/joinRequests/${uid}`)
  await createPendingJoinRequest(uid)

  const batch = writeBatch(db)
  batch.update(doc(db, SPACE_PATH), { members: ['alice', uid], memberCount: 2 })
  batch.update(requestRef, { status: 'approved', reviewedBy: uid, reviewedAt: now() })
  batch.set(doc(db, `users/${uid}/spaceMemberships/north-space`), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  await assertFails(batch.commit())
  await assertFails(updateDoc(requestRef, {
    status: 'approved', reviewedBy: uid, reviewedAt: now(),
  }))

  const savedRequest = await getDoc(requestRef)
  assert.equal(savedRequest.data().status, 'pending')
  const savedSpace = await getDoc(doc(db, SPACE_PATH))
  assert.equal(savedSpace.data().members.includes(uid), false)
}

before(async () => {
  const rulesPath = process.env.SPACES_RULES_FILE
    || new URL('../firestore.rules.test', import.meta.url)
  const rules = await readFile(rulesPath, 'utf8')
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1',
      port: 8080,
      rules,
    },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
})

after(async () => {
  await testEnv?.cleanup()
})

test('notifications can only be read by their recipient', async () => {
  await seed({ withPost: false })
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'notifications/for-bob'), notification({ connectionId: 'alice_bob' }))
  })
  const bobDb = dbFor('bob')
  const aliceDb = dbFor('alice')
  await assertSucceeds(getDoc(doc(bobDb, 'notifications/for-bob')))
  await assertFails(getDoc(doc(aliceDb, 'notifications/for-bob')))
  const ownList = await assertSucceeds(getDocs(query(
    collection(bobDb, 'notifications'), where('recipientUid', '==', 'bob'),
  )))
  assert.equal(ownList.size, 1)
  await assertFails(getDocs(query(
    collection(aliceDb, 'notifications'), where('recipientUid', '==', 'bob'),
  )))
})

test('only the recipient can mark unread notifications read', async () => {
  await seed({ withPost: false })
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'notifications/read-check'), notification({ connectionId: 'alice_bob' }))
  })
  await assertSucceeds(updateDoc(doc(dbFor('bob'), 'notifications/read-check'), { read: true }))
  await assertFails(updateDoc(doc(dbFor('alice'), 'notifications/read-check'), { read: true }))
  await assertFails(updateDoc(doc(dbFor('bob'), 'notifications/read-check'), { actorName: 'Changed Name' }))
  await assertFails(deleteDoc(doc(dbFor('bob'), 'notifications/read-check')))
})

test('connection request and acceptance notifications are source-bound and atomic', async () => {
  await seed({ withPost: false })
  const aliceDb = dbFor('alice')
  const connectionRef = doc(aliceDb, 'connections/alice_bob')
  const requestNotificationRef = doc(aliceDb, 'notifications/request-notification-key')
  const createRequest = writeBatch(aliceDb)
  createRequest.set(connectionRef, {
    id: 'alice_bob', fromUid: 'alice', toUid: 'bob', participants: ['alice', 'bob'],
    status: 'pending', profiles: { alice: { name: 'Alice' } }, createdAt: now(),
    notificationKey: 'request-notification-key',
  })
  createRequest.set(requestNotificationRef, notification({
    recipientUid: 'bob', type: 'connection_request', connectionId: 'alice_bob',
  }))
  await assertSucceeds(createRequest.commit())

  const bobDb = dbFor('bob')
  const acceptedNotificationRef = doc(bobDb, 'notifications/connection_accepted_request-notification-key')
  const acceptRequest = writeBatch(bobDb)
  acceptRequest.update(doc(bobDb, 'connections/alice_bob'), {
    status: 'accepted',
    profiles: { alice: { name: 'Alice' }, bob: { name: 'Bob' } },
    updatedAt: now(),
  })
  acceptRequest.set(acceptedNotificationRef, notification({
    recipientUid: 'alice', actorUid: 'bob', actorName: 'Bob',
    type: 'connection_accepted', connectionId: 'alice_bob',
  }))
  await assertSucceeds(acceptRequest.commit())
})

test('notifications cannot be forged or created without a matching source event', async () => {
  await seed({ withPost: false })
  const aliceDb = dbFor('alice')
  await assertFails(setDoc(doc(aliceDb, 'notifications/arbitrary'), notification({
    type: 'system',
  })))
  await assertFails(setDoc(doc(aliceDb, 'notifications/spoofed-actor'), notification({
    type: 'connection_request', actorUid: 'bob', connectionId: 'alice_bob',
  })))

  const batch = writeBatch(aliceDb)
  batch.set(doc(aliceDb, 'connections/alice_bob'), {
    id: 'alice_bob', fromUid: 'alice', toUid: 'bob', participants: ['alice', 'bob'],
    status: 'pending', profiles: { alice: { name: 'Alice' } }, createdAt: now(),
    notificationKey: 'wrong-recipient-key',
  })
  batch.set(doc(aliceDb, 'notifications/wrong-recipient-key'), notification({
    recipientUid: 'carol', type: 'connection_request', connectionId: 'alice_bob',
  }))
  await assertFails(batch.commit())
})

test('message notifications require the matching new chat message', async () => {
  await seed({ withPost: false })
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'chats/alice_bob'), {
      id: 'alice_bob', participants: ['alice', 'bob'], lastMessage: '',
      createdAt: now(), updatedAt: now(),
    })
  })
  const aliceDb = dbFor('alice')
  const batch = writeBatch(aliceDb)
  batch.set(doc(aliceDb, 'chats/alice_bob/messages/message-one'), {
    id: 'message-one', senderUid: 'alice', text: 'Hello', createdAt: now(),
  })
  batch.update(doc(aliceDb, 'chats/alice_bob'), { lastMessage: 'Hello', updatedAt: now() })
  batch.set(doc(aliceDb, 'notifications/message_message-one'), notification({
    recipientUid: 'bob', type: 'message_received', chatId: 'alice_bob', messageId: 'message-one',
  }))
  await assertSucceeds(batch.commit())
})

test('private Space request and owner decision notifications are atomic', async () => {
  await seed({ members: ['alice'], visibility: 'private', withPost: false })
  const bobDb = dbFor('bob')
  const requestBatch = writeBatch(bobDb)
  requestBatch.set(doc(bobDb, `${SPACE_PATH}/joinRequests/bob`), {
    uid: 'bob', status: 'pending', createdAt: now(), notificationKey: 'join-request-key',
  })
  requestBatch.set(doc(bobDb, 'notifications/join-request-key'), notification({
    recipientUid: 'alice', actorUid: 'bob', actorName: 'Bob', type: 'space_join_request',
    spaceId: SPACE_ID, spaceName: 'Campus Coders', requestUid: 'bob',
  }))
  await assertSucceeds(requestBatch.commit())

  const aliceDb = dbFor('alice')
  const decisionBatch = writeBatch(aliceDb)
  decisionBatch.update(doc(aliceDb, `${SPACE_PATH}/joinRequests/bob`), {
    status: 'approved', reviewedBy: 'alice', reviewedAt: now(),
  })
  decisionBatch.update(doc(aliceDb, SPACE_PATH), {
    members: ['alice', 'bob'], memberCount: 2, membershipApproval: deleteField(),
  })
  decisionBatch.set(doc(aliceDb, 'users/bob/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  decisionBatch.set(doc(aliceDb, 'notifications/space_decision_join-request-key'), notification({
    recipientUid: 'bob', actorUid: 'alice', actorName: 'Alice', type: 'space_join_approved',
    spaceId: SPACE_ID, spaceName: 'Campus Coders', requestUid: 'bob',
  }))
  await assertSucceeds(decisionBatch.commit())
})

test('private Space rejection sends a validated decision notification', async () => {
  await seed({ members: ['alice'], visibility: 'private', withPost: false })
  const carolDb = dbFor('carol')
  const requestBatch = writeBatch(carolDb)
  requestBatch.set(doc(carolDb, `${SPACE_PATH}/joinRequests/carol`), {
    uid: 'carol', status: 'pending', createdAt: now(), notificationKey: 'rejected-request-key',
  })
  requestBatch.set(doc(carolDb, 'notifications/rejected-request-key'), notification({
    recipientUid: 'alice', actorUid: 'carol', actorName: 'Carol', type: 'space_join_request',
    spaceId: SPACE_ID, spaceName: 'Campus Coders', requestUid: 'carol',
  }))
  await assertSucceeds(requestBatch.commit())

  const aliceDb = dbFor('alice')
  const rejectionBatch = writeBatch(aliceDb)
  rejectionBatch.update(doc(aliceDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'rejected', reviewedBy: 'alice', reviewedAt: now(),
  })
  rejectionBatch.set(doc(aliceDb, 'notifications/space_decision_rejected-request-key'), notification({
    recipientUid: 'carol', actorUid: 'alice', actorName: 'Alice', type: 'space_join_rejected',
    spaceId: SPACE_ID, spaceName: 'Campus Coders', requestUid: 'carol',
  }))
  await assertSucceeds(rejectionBatch.commit())
})

test('space creation succeeds for the caller’s protected campus', async () => {
  await seed({ withPost: false })
  const data = space({ members: ['carol'], memberCount: 1, createdBy: 'carol' })
  const db = dbFor('carol')
  const batch = writeBatch(db)
  batch.set(doc(db, 'spaces/new-space'), data)
  batch.set(doc(db, 'users/carol/spaceMemberships/new-space'), {
    spaceId: 'new-space', joinedAt: now(),
  })
  await assertSucceeds(batch.commit())
  const createdSpace = await getDoc(doc(db, 'spaces/new-space'))
  const membership = await getDoc(doc(db, 'users/carol/spaceMemberships/new-space'))
  assert.equal(createdSpace.data().visibility, 'public')
  assert.deepEqual(createdSpace.data().members, ['carol'])
  assert.equal(createdSpace.data().memberCount, 1)
  assert.equal(createdSpace.data().isActive, true)
  assert.equal(membership.data().spaceId, 'new-space')
})

test('only a trusted administrator can activate or deactivate a Space', async () => {
  await seed({ members: ['alice'], withPost: false, isActive: true })
  const adminDb = dbFor('admin', { campusRole: 'admin' })
  const ref = doc(adminDb, SPACE_PATH)
  await assertSucceeds(updateDoc(ref, { isActive: false }))
  assert.equal((await getDoc(ref)).data().isActive, false)
  await assertSucceeds(updateDoc(ref, { isActive: true }))
  assert.equal((await getDoc(ref)).data().isActive, true)
})

test('students, legacy moderators, and admin mixed-field updates cannot change Space status', async () => {
  await seed({ members: ['alice'], withPost: false })
  await assertFails(updateDoc(doc(dbFor('alice'), SPACE_PATH), { isActive: false }))
  await assertFails(updateDoc(doc(dbFor('moderator'), SPACE_PATH), { isActive: false }))
  await assertFails(updateDoc(doc(dbFor('admin', { campusRole: 'admin' }), SPACE_PATH), {
    isActive: false,
    members: ['alice', 'carol'],
    memberCount: 2,
  }))
})

test('active Space count queries remain scoped to public and administrator-campus Spaces', async () => {
  await seed({ withPost: false })
  await testEnv.withSecurityRulesDisabled(async context => {
    const adminDb = context.firestore()
    await setDoc(doc(adminDb, 'spaces/public-inactive'), space({ visibility: 'public', isActive: false }))
    await setDoc(doc(adminDb, 'spaces/campus-active'), space({ visibility: 'campus', isActive: true }))
    await setDoc(doc(adminDb, 'spaces/campus-other'), space({ visibility: 'campus', campus: 'South Campus', isActive: true }))
    await setDoc(doc(adminDb, 'spaces/private-active'), space({ visibility: 'private', isActive: true }))
  })

  const adminDb = dbFor('admin', { campusRole: 'admin' })
  const publicCount = await assertSucceeds(getCountFromServer(query(
    collection(adminDb, 'spaces'),
    where('visibility', '==', 'public'),
    where('isActive', '==', true),
  )))
  const campusCount = await assertSucceeds(getCountFromServer(query(
    collection(adminDb, 'spaces'),
    where('visibility', '==', 'campus'),
    where('campus', '==', 'North Campus'),
    where('isActive', '==', true),
  )))
  assert.equal(publicCount.data().count, 1)
  assert.equal(campusCount.data().count, 1)
})

test('student discovery returns only active public and matching-campus Spaces', async () => {
  await seed({ members: ['alice'], withPost: false, isActive: true })
  await testEnv.withSecurityRulesDisabled(async context => {
    const adminDb = context.firestore()
    await setDoc(doc(adminDb, 'spaces/public-inactive'), space({ visibility: 'public', isActive: false }))
    await setDoc(doc(adminDb, 'spaces/campus-active'), space({ visibility: 'campus', isActive: true }))
    await setDoc(doc(adminDb, 'spaces/campus-inactive'), space({ visibility: 'campus', isActive: false }))
  })

  const studentDb = dbFor('carol')
  const publicSpaces = await assertSucceeds(getDocs(query(
    collection(studentDb, 'spaces'),
    where('visibility', '==', 'public'),
    where('isActive', '==', true),
  )))
  const campusSpaces = await assertSucceeds(getDocs(query(
    collection(studentDb, 'spaces'),
    where('visibility', '==', 'campus'),
    where('campus', '==', 'North Campus'),
    where('isActive', '==', true),
  )))
  assert.deepEqual(publicSpaces.docs.map(item => item.id), [SPACE_ID])
  assert.deepEqual(campusSpaces.docs.map(item => item.id), ['campus-active'])
})

test('inactive status does not alter existing Space visibility or membership behavior', async () => {
  await seed({ members: ['alice'], isActive: false })
  const aliceDb = dbFor('alice')
  assert.equal((await assertSucceeds(getDocs(query(
    collection(aliceDb, 'spaces'),
    where('visibility', '==', 'public'),
    where('isActive', '==', true),
  )))).size, 0)
  assert.equal((await assertSucceeds(getDoc(doc(aliceDb, SPACE_PATH)))).data().isActive, false)
  assert.equal((await assertSucceeds(getDoc(doc(aliceDb, `${SPACE_PATH}/posts/${POST_ID}`)))).exists(), true)

  const bobDb = dbFor('bob')
  const join = writeBatch(bobDb)
  join.update(doc(bobDb, SPACE_PATH), { members: ['alice', 'bob'], memberCount: 2 })
  join.set(doc(bobDb, 'users/bob/spaceMemberships/north-space'), { spaceId: SPACE_ID, joinedAt: now() })
  await assertSucceeds(join.commit())
  assert.equal((await getDoc(doc(bobDb, SPACE_PATH))).data().isActive, false)
})

test('private Space creation includes its initial membership index atomically', async () => {
  await seed({ withPost: false })
  const db = dbFor('carol')
  const batch = writeBatch(db)
  batch.set(doc(db, 'spaces/new-private-space'), space({
    visibility: 'private', members: ['carol'], memberCount: 1, createdBy: 'carol',
  }))
  batch.set(doc(db, 'users/carol/spaceMemberships/new-private-space'), {
    spaceId: 'new-private-space', joinedAt: now(),
  })
  await assertSucceeds(batch.commit())
  assert.equal((await getDoc(doc(db, 'spaces/new-private-space'))).data().visibility, 'private')
  assert.equal((await getDoc(doc(db, 'users/carol/spaceMemberships/new-private-space'))).data().spaceId, 'new-private-space')
})

test('space creation and membership index must be atomic', async () => {
  await seed({ withPost: false })
  const db = dbFor('carol')
  const data = space({ members: ['carol'], memberCount: 1, createdBy: 'carol' })
  await assertFails(setDoc(doc(db, 'spaces/without-index'), data))
  await assertFails(setDoc(doc(db, 'users/carol/spaceMemberships/without-space'), {
    spaceId: 'without-space', joinedAt: now(),
  }))
  await testEnv.withSecurityRulesDisabled(async context => {
    const adminDb = context.firestore()
    assert.equal((await getDoc(doc(adminDb, 'spaces/without-index'))).exists(), false)
    assert.equal((await getDoc(doc(adminDb, 'users/carol/spaceMemberships/without-space'))).exists(), false)
  })
})

test('non-members cannot create a membership index without a Space membership', async () => {
  await seed({ members: ['alice', 'bob'], withPost: false })
  await assertFails(setDoc(doc(dbFor('carol'), 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  }))
  await assertFails(setDoc(doc(dbFor('carol'), 'users/dave/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  }))
})

test('an existing member can repair their own missing membership index', async () => {
  await seed({ members: ['alice', 'bob', 'carol'], withPost: false })
  await assertSucceeds(setDoc(doc(dbFor('carol'), 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  }))
})

test('new Space creation rejects campus visibility and invalid visibility values', async () => {
  await seed({ withPost: false })
  const db = dbFor('carol')
  for (const visibility of ['campus', 'unlisted', null]) {
    const ref = doc(db, `spaces/invalid-${visibility || 'missing'}`)
    const data = space({ members: ['carol'], memberCount: 1, createdBy: 'carol', visibility })
    if (visibility === null) delete data.visibility
    const batch = writeBatch(db)
    batch.set(ref, data)
    batch.set(doc(db, `users/carol/spaceMemberships/${ref.id}`), {
      spaceId: ref.id, joinedAt: now(),
    })
    await assertFails(batch.commit())
  }
})

test('space creation under another campus is denied', async () => {
  await seed({ withPost: false })
  const data = space({
    campus: 'North Campus',
    members: ['dave'],
    memberCount: 1,
    createdBy: 'dave',
  })
  await assertFails(setDoc(doc(dbFor('dave'), 'spaces/foreign-space'), data))
})

test('space creation rejects duplicate member UIDs', async () => {
  await seed({ withPost: false })
  const data = space({
    members: ['carol', 'carol'],
    memberCount: 2,
    createdBy: 'carol',
  })
  await assertFails(setDoc(doc(dbFor('carol'), 'spaces/duplicate-space'), data))
})

test('membership updates reject duplicate-list manipulation', async () => {
  await seed({ members: ['alice', 'bob', 'carol'], withPost: false })
  await assertFails(
    updateDoc(doc(dbFor('alice'), SPACE_PATH), {
      members: ['bob', 'bob'],
      memberCount: 2,
    }),
  )
})

test('a member can join and leave only themselves with an accurate count', async () => {
  await seed({ members: ['alice'], withPost: false })
  const db = dbFor('bob')
  const ref = doc(db, SPACE_PATH)
  const joinBatch = writeBatch(db)
  joinBatch.update(ref, { members: ['alice', 'bob'], memberCount: 2 })
  joinBatch.set(doc(db, 'users/bob/spaceMemberships/north-space'), { spaceId: SPACE_ID, joinedAt: now() })
  await assertSucceeds(joinBatch.commit())
  const leaveBatch = writeBatch(db)
  leaveBatch.update(ref, { members: ['alice'], memberCount: 1 })
  leaveBatch.delete(doc(db, 'users/bob/spaceMemberships/north-space'))
  await assertSucceeds(leaveBatch.commit())
  const saved = await getDoc(ref)
  assert.deepEqual(saved.data().members, ['alice'])
  assert.equal(saved.data().memberCount, 1)
})

test('a member cannot add or remove another user', async () => {
  await seed({ members: ['alice', 'bob'], withPost: false })
  const ref = doc(dbFor('alice'), SPACE_PATH)
  await assertFails(
    updateDoc(ref, { members: ['alice', 'bob', 'carol'], memberCount: 3 }),
  )
  await assertFails(updateDoc(ref, { members: ['alice'], memberCount: 1 }))
})

test('direct memberCount manipulation is denied', async () => {
  await seed({ withPost: false })
  await assertFails(
    updateDoc(doc(dbFor('alice'), SPACE_PATH), { memberCount: 99 }),
  )
})

test('non-members cannot create posts or comments', async () => {
  await seed()
  const db = dbFor('carol')
  await assertFails(
    setDoc(doc(db, `${SPACE_PATH}/posts/nonmember-post`),
      post({ authorUid: 'carol', authorName: 'Carol' })),
  )
  await assertFails(
    setDoc(
      doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/nonmember-comment`),
      comment({ authorUid: 'carol', authorName: 'Carol' }),
    ),
  )
})

test('post and comment author UID spoofing is denied', async () => {
  await seed()
  const db = dbFor('bob')
  await assertFails(
    setDoc(doc(db, `${SPACE_PATH}/posts/spoofed-post`),
      post({ authorUid: 'alice', authorName: 'Alice' })),
  )
  await assertFails(
    setDoc(
      doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/spoofed-comment`),
      comment({ authorUid: 'alice', authorName: 'Alice' }),
    ),
  )
})

test('post and comment author-name mismatch is denied', async () => {
  await seed()
  const db = dbFor('bob')
  await assertFails(
    setDoc(doc(db, `${SPACE_PATH}/posts/mismatched-post`),
      post({ authorUid: 'bob', authorName: 'Alice' })),
  )
  await assertFails(
    setDoc(
      doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/mismatched-comment`),
      comment({ authorUid: 'bob', authorName: 'Alice' }),
    ),
  )
})

test('anonymous posts and comments omit identity fields', async () => {
  await seed()
  const db = dbFor('bob')
  const anonymousPost = post({ authorName: 'Anonymous', isAnonymous: true })
  delete anonymousPost.authorUid
  const anonymousComment = comment({ authorName: 'Anonymous', isAnonymous: true })
  delete anonymousComment.authorUid
  await assertSucceeds(
    setDoc(doc(db, `${SPACE_PATH}/posts/anonymous-post`),
      anonymousPost),
  )
  await assertSucceeds(
    setDoc(
      doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/anonymous-comment`),
      anonymousComment,
    ),
  )
  await assertFails(
    setDoc(doc(db, `${SPACE_PATH}/posts/leaking-post`),
      post({ authorName: 'Anonymous', isAnonymous: true })),
  )
  await assertFails(
    setDoc(
      doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/leaking-comment`),
      comment({ authorName: 'Anonymous', isAnonymous: true }),
    ),
  )
})

test('cross-campus users cannot read private space, posts, or comments', async () => {
  await seed({ visibility: 'private' })
  const db = dbFor('dave')
  await assertFails(getDoc(doc(db, SPACE_PATH)))
  await assertFails(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertFails(
    getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)),
  )
  await assertFails(getDocs(query(collection(db, 'spaces'), where('visibility', '==', 'private'))))
})

test('North Campus users discover public Spaces created at Tech Park', async () => {
  await seed({ campus: 'Tech Park Campus', members: ['alice'] })
  const db = dbFor('carol')
  const result = await assertSucceeds(
    getDocs(query(collection(db, 'spaces'), where('visibility', '==', 'public'))),
  )
  assert.equal(result.size, 1)
  await assertSucceeds(getDoc(doc(db, SPACE_PATH)))
})

test('users can join public Spaces across campuses', async () => {
  await seed({ campus: 'Tech Park Campus', members: ['alice'], withPost: false })
  const db = dbFor('carol')
  const batch = writeBatch(db)
  batch.update(doc(db, SPACE_PATH), { members: ['alice', 'carol'], memberCount: 2 })
  batch.set(doc(db, 'users/carol/spaceMemberships/north-space'), { spaceId: SPACE_ID, joinedAt: now() })
  await assertSucceeds(batch.commit())
})

test('private Spaces are excluded from public discovery', async () => {
  await seed({ visibility: 'private' })
  const db = dbFor('carol')
  const result = await assertSucceeds(
    getDocs(query(collection(db, 'spaces'), where('visibility', '==', 'public'))),
  )
  assert.equal(result.size, 0)
  await assertFails(getDocs(collection(db, 'spaces')))
  await assertFails(getDoc(doc(db, SPACE_PATH)))
})

test('private join requests do not grant read access until approved', async () => {
  await seed({ visibility: 'private' })
  const db = dbFor('carol')
  await assertFails(getDoc(doc(db, SPACE_PATH)))
  await assertFails(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertFails(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)))
  await assertFails(updateDoc(doc(db, SPACE_PATH), {
    members: ['alice', 'bob', 'carol'], memberCount: 3,
  }))
  await assertFails(setDoc(doc(db, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  }))
  await createPendingJoinRequest('carol')
  await assertFails(getDoc(doc(db, SPACE_PATH)))
})

test('private members cannot self-join or create their own membership index', async () => {
  await seed({ visibility: 'private', withPost: false })
  const db = dbFor('carol')
  const batch = writeBatch(db)
  batch.update(doc(db, SPACE_PATH), { members: ['alice', 'bob', 'carol'], memberCount: 3 })
  batch.set(doc(db, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  await assertFails(batch.commit())
  await assertFails(setDoc(doc(db, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  }))
})

test('only the owner or staff can approve a private membership request', async () => {
  await seed({ visibility: 'private', members: ['alice', 'bob'], withPost: false })
  await testEnv.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), SPACE_PATH), { membershipApproval: 'stale-carol' })
  })
  const requestRef = doc(dbFor('carol'), `${SPACE_PATH}/joinRequests/carol`)
  const requestKey = await createPendingJoinRequest('carol')

  const approveAs = async (reviewerUid) => {
    const reviewerDb = dbFor(reviewerUid)
    const batch = writeBatch(reviewerDb)
    batch.update(doc(reviewerDb, SPACE_PATH), {
      // Existing members may reorder; exact membership and one requester add remain required.
      members: ['bob', 'alice', 'carol'], memberCount: 3,
      membershipApproval: deleteField(),
    })
    batch.update(doc(reviewerDb, `${SPACE_PATH}/joinRequests/carol`), {
      status: 'approved', reviewedBy: reviewerUid, reviewedAt: now(),
    })
    batch.set(doc(reviewerDb, 'users/carol/spaceMemberships/north-space'), {
      spaceId: SPACE_ID, joinedAt: now(),
    })
    addSpaceDecisionNotification(batch, reviewerDb, reviewerUid, 'carol', requestKey, true)
    return batch.commit()
  }

  await assertFails(approveAs('bob'))
  await assertSucceeds(approveAs('alice'))
  const saved = await getDoc(doc(dbFor('alice'), SPACE_PATH))
  assert.deepEqual(saved.data().members, ['bob', 'alice', 'carol'])
  assert.equal(saved.data().memberCount, 3)
  assert.equal('membershipApproval' in saved.data(), false)

  await testEnv.clearFirestore()
  await seed({ visibility: 'private', members: ['alice'], withPost: false })
  const staffRequestKey = await createPendingJoinRequest('carol')
  const staffDb = dbFor('moderator')
  const staffBatch = writeBatch(staffDb)
  staffBatch.update(doc(staffDb, SPACE_PATH), {
    members: ['alice', 'carol'], memberCount: 2, membershipApproval: deleteField(),
  })
  staffBatch.update(doc(staffDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'approved', reviewedBy: 'moderator', reviewedAt: now(),
  })
  staffBatch.set(doc(staffDb, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  addSpaceDecisionNotification(staffBatch, staffDb, 'moderator', 'carol', staffRequestKey, true)
  await assertSucceeds(staffBatch.commit())
  const staffApproved = await getDoc(doc(staffDb, SPACE_PATH))
  assert.deepEqual(staffApproved.data().members, ['alice', 'carol'])
  assert.equal('membershipApproval' in staffApproved.data(), false)
})

test('a moderator cannot approve their own private join request', async () => {
  await assertStaffCannotApproveOwnRequest('moderator')
})

test('an admin cannot approve their own private join request', async () => {
  await assertStaffCannotApproveOwnRequest('admin', { campusRole: 'admin' })
})

test('stale approved requests cannot be reused after a member leaves', async () => {
  await seed({ visibility: 'private', members: ['alice'], withPost: false })
  const carolDb = dbFor('carol')
  const requestKey = await createPendingJoinRequest('carol')

  const ownerDb = dbFor('alice')
  const approval = writeBatch(ownerDb)
  approval.update(doc(ownerDb, SPACE_PATH), { members: ['alice', 'carol'], memberCount: 2 })
  approval.update(doc(ownerDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'approved', reviewedBy: 'alice', reviewedAt: now(),
  })
  approval.set(doc(ownerDb, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  addSpaceDecisionNotification(approval, ownerDb, 'alice', 'carol', requestKey, true)
  await assertSucceeds(approval.commit())

  const leave = writeBatch(carolDb)
  leave.update(doc(carolDb, SPACE_PATH), { members: ['alice'], memberCount: 1 })
  leave.delete(doc(carolDb, 'users/carol/spaceMemberships/north-space'))
  await assertSucceeds(leave.commit())

  const reuse = writeBatch(ownerDb)
  reuse.update(doc(ownerDb, SPACE_PATH), { members: ['alice', 'carol'], memberCount: 2 })
  reuse.set(doc(ownerDb, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  await assertFails(reuse.commit())

  await assertFails(updateDoc(doc(carolDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'approved', reviewedBy: 'carol', reviewedAt: now(),
  }))

  const repeatKey = 'request-carol-again'
  const repeatBatch = writeBatch(carolDb)
  repeatBatch.update(doc(carolDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'pending',
    createdAt: Timestamp.fromMillis(now().toMillis() + 1),
    notificationKey: repeatKey,
    reviewedBy: deleteField(),
    reviewedAt: deleteField(),
  })
  repeatBatch.set(doc(carolDb, 'notifications', repeatKey), notification({
    recipientUid: 'alice', actorUid: 'carol', actorName: 'Carol', type: 'space_join_request',
    spaceId: SPACE_ID, spaceName: 'Campus Coders', requestUid: 'carol',
  }))
  await assertSucceeds(repeatBatch.commit())
  const reapprove = writeBatch(ownerDb)
  reapprove.update(doc(ownerDb, SPACE_PATH), { members: ['carol', 'alice'], memberCount: 2 })
  reapprove.update(doc(ownerDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'approved', reviewedBy: 'alice', reviewedAt: now(),
  })
  reapprove.set(doc(ownerDb, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  addSpaceDecisionNotification(reapprove, ownerDb, 'alice', 'carol', repeatKey, true)
  await assertSucceeds(reapprove.commit())
})

test('a requester can reset a rejected request without approving themselves', async () => {
  await seed({ visibility: 'private', members: ['alice'], withPost: false })
  const bobDb = dbFor('bob')
  const requestRef = doc(bobDb, `${SPACE_PATH}/joinRequests/bob`)
  const requestKey = await createPendingJoinRequest('bob')

  const ownerDb = dbFor('alice')
  const rejection = writeBatch(ownerDb)
  rejection.update(doc(ownerDb, `${SPACE_PATH}/joinRequests/bob`), {
    status: 'rejected', reviewedBy: 'alice', reviewedAt: now(),
  })
  addSpaceDecisionNotification(rejection, ownerDb, 'alice', 'bob', requestKey, false)
  await assertSucceeds(rejection.commit())

  const nextRequestKey = 'request-bob-again'
  const reset = writeBatch(bobDb)
  reset.update(requestRef, {
    status: 'pending',
    createdAt: Timestamp.fromMillis(now().toMillis() + 1),
    notificationKey: nextRequestKey,
    reviewedBy: deleteField(),
    reviewedAt: deleteField(),
  })
  reset.set(doc(bobDb, 'notifications', nextRequestKey), notification({
    recipientUid: 'alice', actorUid: 'bob', actorName: 'Bob', type: 'space_join_request',
    spaceId: SPACE_ID, spaceName: 'Campus Coders', requestUid: 'bob',
  }))
  await assertSucceeds(reset.commit())
  await assertFails(updateDoc(requestRef, {
    status: 'approved', reviewedBy: 'bob', reviewedAt: now(),
  }))
  assert.equal((await getDoc(requestRef)).data().status, 'pending')
})

test('private approval rejects persistent membershipApproval metadata', async () => {
  await seed({ visibility: 'private', members: ['alice'], withPost: false })
  const carolDb = dbFor('carol')
  const requestKey = await createPendingJoinRequest('carol')
  const ownerDb = dbFor('alice')
  const batch = writeBatch(ownerDb)
  batch.update(doc(ownerDb, SPACE_PATH), {
    members: ['alice', 'carol'], memberCount: 2, membershipApproval: 'carol',
  })
  batch.update(doc(ownerDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'approved', reviewedBy: 'alice', reviewedAt: now(),
  })
  batch.set(doc(ownerDb, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  addSpaceDecisionNotification(batch, ownerDb, 'alice', 'carol', requestKey, true)
  await assertFails(batch.commit())
})

test('private approvals cannot exploit duplicate legacy members to add extra UIDs', async () => {
  await seed({ visibility: 'private', members: ['alice', 'alice'], withPost: false })
  const carolDb = dbFor('carol')
  const requestKey = await createPendingJoinRequest('carol')
  const aliceDb = dbFor('alice')
  const maliciousBatch = writeBatch(aliceDb)
  maliciousBatch.update(doc(aliceDb, SPACE_PATH), {
    members: ['alice', 'carol', 'dave'], memberCount: 3,
  })
  maliciousBatch.update(doc(aliceDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'approved', reviewedBy: 'alice', reviewedAt: now(),
  })
  maliciousBatch.set(doc(aliceDb, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  addSpaceDecisionNotification(maliciousBatch, aliceDb, 'alice', 'carol', requestKey, true)
  await assertFails(maliciousBatch.commit())

  const validBatch = writeBatch(aliceDb)
  validBatch.update(doc(aliceDb, SPACE_PATH), {
    members: ['alice', 'carol'], memberCount: 2,
  })
  validBatch.update(doc(aliceDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'approved', reviewedBy: 'alice', reviewedAt: now(),
  })
  validBatch.set(doc(aliceDb, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  addSpaceDecisionNotification(validBatch, aliceDb, 'alice', 'carol', requestKey, true)
  await assertSucceeds(validBatch.commit())
})

test('approved private members can read Space details, posts, and comments', async () => {
  await seed({ visibility: 'private', members: ['alice'] })
  const carolDb = dbFor('carol')
  const requestKey = await createPendingJoinRequest('carol')
  const aliceDb = dbFor('alice')
  const batch = writeBatch(aliceDb)
  batch.update(doc(aliceDb, SPACE_PATH), {
    members: ['alice', 'carol'], memberCount: 2,
  })
  batch.update(doc(aliceDb, `${SPACE_PATH}/joinRequests/carol`), {
    status: 'approved', reviewedBy: 'alice', reviewedAt: now(),
  })
  batch.set(doc(aliceDb, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  addSpaceDecisionNotification(batch, aliceDb, 'alice', 'carol', requestKey, true)
  await assertSucceeds(batch.commit())
  await assertSucceeds(getDoc(doc(carolDb, SPACE_PATH)))
  await assertSucceeds(getDoc(doc(carolDb, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertSucceeds(getDoc(doc(carolDb, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)))
  await assertSucceeds(getDoc(doc(carolDb, 'users/carol/spaceMemberships/north-space')))
  const memberships = await assertSucceeds(getDocs(collection(carolDb, 'users/carol/spaceMemberships')))
  assert.equal(memberships.size, 1)
  await assertFails(getDocs(collection(carolDb, 'users/alice/spaceMemberships')))
})

test('legacy Spaces without visibility remain readable within their campus', async () => {
  await seed({ campus: 'North Campus', members: ['alice'], legacy: true })
  const db = dbFor('carol')
  await assertSucceeds(getDoc(doc(db, SPACE_PATH)))
  await assertSucceeds(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertSucceeds(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)))
})

test('legacy Spaces without visibility deny cross-campus reads of details and content', async () => {
  await seed({ campus: 'North Campus', members: ['alice'], legacy: true })
  const db = dbFor('eve')
  await assertFails(getDoc(doc(db, SPACE_PATH)))
  await assertFails(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertFails(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)))
})

test('existing legacy members retain access across campuses', async () => {
  await seed({ campus: 'North Campus', members: ['alice', 'eve'], legacy: true })
  const db = dbFor('eve')
  await assertSucceeds(getDoc(doc(db, SPACE_PATH)))
  await assertSucceeds(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertSucceeds(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)))
})

test('cross-campus users cannot join a legacy Space or create its membership index', async () => {
  await seed({ campus: 'North Campus', members: ['alice'], legacy: true, withPost: false })
  const db = dbFor('eve')
  const batch = writeBatch(db)
  batch.update(doc(db, SPACE_PATH), { members: ['alice', 'eve'], memberCount: 2 })
  batch.set(doc(db, 'users/eve/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  await assertFails(batch.commit())
  assert.equal((await getDoc(doc(dbFor('alice'), SPACE_PATH))).data().members.includes('eve'), false)
  assert.equal((await getDoc(doc(dbFor('eve'), 'users/eve/spaceMemberships/north-space'))).exists(), false)
})

test('same-campus users can join campus-scoped legacy Spaces atomically', async () => {
  await seed({ campus: 'North Campus', members: ['alice'], legacy: true, withPost: false })
  const db = dbFor('carol')
  const batch = writeBatch(db)
  batch.update(doc(db, SPACE_PATH), { members: ['alice', 'carol'], memberCount: 2 })
  batch.set(doc(db, 'users/carol/spaceMemberships/north-space'), {
    spaceId: SPACE_ID, joinedAt: now(),
  })
  await assertSucceeds(batch.commit())
})

test('campus-tagged legacy Spaces are listable only within their campus', async () => {
  await seed({ campus: 'North Campus', members: ['alice'], legacy: true, withPost: false })
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'spaces/campus-tagged'), space({
      campus: 'North Campus', visibility: 'campus', members: ['alice'], memberCount: 1,
    }))
  })
  const sameCampus = await assertSucceeds(getDocs(query(
    collection(dbFor('carol'), 'spaces'),
    where('visibility', '==', 'campus'),
    where('campus', '==', 'North Campus'),
  )))
  assert.deepEqual(sameCampus.docs.map(item => item.id), ['campus-tagged'])
  await assertFails(getDocs(query(
    collection(dbFor('eve'), 'spaces'),
    where('visibility', '==', 'campus'),
    where('campus', '==', 'North Campus'),
  )))
})

test('public discovery excludes private and campus-scoped Spaces', async () => {
  await seed({ campus: 'Tech Park Campus', members: ['alice'], withPost: false })
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'spaces/private-space'), space({
      campus: 'North Campus', visibility: 'private', members: ['alice'], memberCount: 1,
    }))
    await setDoc(doc(db, 'spaces/campus-space'), space({
      campus: 'North Campus', visibility: 'campus', members: ['alice'], memberCount: 1,
    }))
  })
  const result = await assertSucceeds(getDocs(query(
    collection(dbFor('carol'), 'spaces'), where('visibility', '==', 'public'),
  )))
  assert.deepEqual(result.docs.map(item => item.id), [SPACE_ID])
})

test('same-campus users can read spaces, posts, comments, and campus listing', async () => {
  await seed()
  const db = dbFor('carol')
  await assertSucceeds(getDoc(doc(db, SPACE_PATH)))
  await assertSucceeds(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertSucceeds(
    getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)),
  )
  const result = await assertSucceeds(
    getDocs(query(collection(db, 'spaces'), where('visibility', '==', 'public'), where('campus', '==', 'North Campus'))),
  )
  assert.equal(result.size, 1)
})

test('content authors and staff can delete posts and comments', async () => {
  await seed()
  const dbAlice = dbFor('alice')
  const dbBob = dbFor('bob')
  await assertSucceeds(
    deleteDoc(doc(dbAlice, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)),
  )
  await assertSucceeds(deleteDoc(doc(dbAlice, `${SPACE_PATH}/posts/${POST_ID}`)))

  for (const staffUid of ['moderator', 'admin']) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore()
      await setDoc(doc(db, `${SPACE_PATH}/posts/staff-target-${staffUid}`), post())
      await setDoc(
        doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/staff-target-${staffUid}`),
        comment(),
      )
    })
    const staffDb = dbFor(staffUid, staffUid === 'admin' ? { campusRole: 'admin' } : {})
    await assertSucceeds(
      deleteDoc(doc(staffDb, `${SPACE_PATH}/posts/staff-target-${staffUid}`)),
    )
    await assertSucceeds(
      deleteDoc(
        doc(staffDb, `${SPACE_PATH}/posts/${POST_ID}/comments/staff-target-${staffUid}`),
      ),
    )
  }
})

test('non-author non-staff cannot delete another author’s content', async () => {
  await seed()
  const db = dbFor('bob')
  await assertFails(deleteDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertFails(
    deleteDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)),
  )
})

test('only staff can read and delete orphan comments', async () => {
  await seed({ withPost: false })
  const orphanPath = `${SPACE_PATH}/posts/missing-post/comments/orphan-comment`
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), orphanPath), comment())
  })
  const memberDb = dbFor('alice')
  await assertFails(getDoc(doc(memberDb, orphanPath)))
  await assertFails(deleteDoc(doc(memberDb, orphanPath)))
  const staffDb = dbFor('moderator')
  await assertSucceeds(getDoc(doc(staffDb, orphanPath)))
  await assertSucceeds(deleteDoc(doc(staffDb, orphanPath)))
})
