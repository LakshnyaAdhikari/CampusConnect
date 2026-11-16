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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

const PROJECT_ID = 'demo-campusconnect'
const SPACE_ID = 'north-space'
const SPACE_PATH = `spaces/${SPACE_ID}`
const POST_ID = 'post-one'
const COMMENT_ID = 'comment-one'
const now = () => Timestamp.fromMillis(1_700_000_000_000)

let testEnv

function dbFor(uid) {
  return testEnv.authenticatedContext(uid).firestore()
}

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
  members = ['alice', 'bob'],
  memberCount = members.length,
  createdBy = 'alice',
} = {}) {
  return {
    name: 'Campus Coders',
    description: 'A test space',
    category: 'Technology',
    campus,
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

async function seed({ members = ['alice', 'bob'], withPost = true } = {}) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore()
    const profiles = [
      profile('alice'),
      profile('bob'),
      profile('carol'),
      profile('dave', 'South Campus'),
      profile('moderator', 'North Campus', 'moderator'),
      profile('admin', 'North Campus', 'admin'),
    ]
    for (const item of profiles) {
      await setDoc(doc(db, `users/${item.uid}`), item)
    }
    await setDoc(doc(db, SPACE_PATH), space({ members }))
    if (withPost) {
      await setDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`), post())
      await setDoc(
        doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`),
        comment(),
      )
    }
  })
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

test('space creation succeeds for the caller’s protected campus', async () => {
  await seed({ withPost: false })
  const data = space({ members: ['carol'], memberCount: 1, createdBy: 'carol' })
  const db = dbFor('carol')
  await assertSucceeds(setDoc(doc(db, 'spaces/new-space'), data))
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
  await assertSucceeds(updateDoc(ref, { members: ['alice', 'bob'], memberCount: 2 }))
  await assertSucceeds(updateDoc(ref, { members: ['alice'], memberCount: 1 }))
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

test('cross-campus users cannot read another campus space, posts, or comments', async () => {
  await seed()
  const db = dbFor('dave')
  await assertFails(getDoc(doc(db, SPACE_PATH)))
  await assertFails(getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}`)))
  await assertFails(
    getDoc(doc(db, `${SPACE_PATH}/posts/${POST_ID}/comments/${COMMENT_ID}`)),
  )
  await assertFails(getDocs(collection(db, 'spaces')))
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
    getDocs(query(collection(db, 'spaces'), where('campus', '==', 'North Campus'))),
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
    const staffDb = dbFor(staffUid)
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
