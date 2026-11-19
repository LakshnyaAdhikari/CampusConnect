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
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore'

const PROJECT_ID = 'demo-campusconnect'
const SPACE_PATH = 'spaces/rbac-space'
const POST_PATH = `${SPACE_PATH}/posts/other-author-post`
const now = Timestamp.fromMillis(1_700_000_000_000)
let testEnv

const dbFor = (uid, claims = {}) => testEnv.authenticatedContext(uid, claims).firestore()

async function seed() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    const profiles = [
      { uid: 'student', id: 'student', email: 'student@test.local', name: 'Student Name', campus: 'North Campus', role: 'student', createdAt: now },
      { uid: 'moderator', id: 'moderator', email: 'moderator@test.local', name: 'Moderator Name', campus: 'North Campus', role: 'moderator', createdAt: now },
      { uid: 'legacy-admin', id: 'legacy-admin', email: 'legacy-admin@test.local', name: 'Legacy Admin', campus: 'North Campus', role: 'admin', createdAt: now },
    ]
    for (const profile of profiles) await setDoc(doc(db, `users/${profile.uid}`), profile)
    await setDoc(doc(db, SPACE_PATH), {
      name: 'RBAC Test Space', description: 'Private test space', category: 'Testing',
      campus: 'North Campus', visibility: 'private', createdBy: 'owner',
      members: ['owner', 'student'], memberCount: 2, createdAt: now,
    })
    await setDoc(doc(db, POST_PATH), {
      authorUid: 'owner', authorName: 'Owner', isAnonymous: false,
      text: 'Seeded post', createdAt: now,
    })
  })
}

before(async () => {
  const rules = await readFile(new URL('../firestore.rules.test', import.meta.url), 'utf8')
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules },
  })
})

beforeEach(async () => {
  await testEnv.clearFirestore()
  await seed()
})

after(async () => {
  await testEnv.cleanup()
})

test('unauthenticated users cannot read protected Space data', async () => {
  await assertFails(getDoc(doc(testEnv.unauthenticatedContext().firestore(), SPACE_PATH)))
})

test('an authenticated student can use permitted member operations', async () => {
  const db = dbFor('student')
  await assertSucceeds(getDoc(doc(db, SPACE_PATH)))
  await assertSucceeds(setDoc(doc(db, `${SPACE_PATH}/posts/student-post`), {
    authorUid: 'student', authorName: 'Student Name', isAnonymous: false,
    text: 'Student post', createdAt: now,
  }))
})

test('a student cannot perform Space moderation reserved for staff', async () => {
  await assertFails(deleteDoc(doc(dbFor('student'), POST_PATH)))
})

test('a student cannot promote themselves through profile updates', async () => {
  await assertFails(updateDoc(doc(dbFor('student'), 'users/student'), { role: 'admin' }))
})

test('a student cannot add an admin custom-claim field to their Firestore profile', async () => {
  await assertFails(updateDoc(doc(dbFor('student'), 'users/student'), {
    campusRole: 'admin',
  }))
})

test('a legacy profile role admin without the trusted claim grants no admin access', async () => {
  const db = dbFor('legacy-admin')
  await assertFails(getDoc(doc(db, SPACE_PATH)))
  await assertFails(deleteDoc(doc(db, POST_PATH)))
})

test('the trusted admin claim permits the existing staff Space operations', async () => {
  const db = dbFor('claimed-admin', { campusRole: 'admin' })
  await assertSucceeds(getDoc(doc(db, SPACE_PATH)))
  await assertSucceeds(deleteDoc(doc(db, POST_PATH)))
})

test('an administrator cannot read another user private profile or list users', async () => {
  const db = dbFor('claimed-admin', { campusRole: 'admin' })
  await assertFails(getDoc(doc(db, 'users/student')))
  await assertFails(getDocs(collection(db, 'users')))
})

test('legacy moderators retain Space moderation but not broad user access', async () => {
  const db = dbFor('moderator')
  await assertSucceeds(getDoc(doc(db, SPACE_PATH)))
  await assertSucceeds(deleteDoc(doc(db, POST_PATH)))
  await assertFails(getDoc(doc(db, 'users/student')))
  await assertFails(getDocs(collection(db, 'users')))
})

test('ordinary students do not receive broad user access', async () => {
  await assertFails(getDocs(collection(dbFor('student'), 'users')))
})
