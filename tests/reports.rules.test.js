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
  getCountFromServer,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'

const PROJECT_ID = 'demo-campusconnect'
const now = Timestamp.fromMillis(1_700_000_000_000)
let testEnv

const dbFor = (uid, claims = {}) => testEnv.authenticatedContext(uid, claims).firestore()

const report = (reporterUid = 'student', extra = {}) => ({
  reporterUid,
  targetType: 'profile',
  targetId: 'target-student',
  category: 'spam',
  reason: 'This public profile appears to contain spam.',
  status: 'pending',
  createdAt: now,
  updatedAt: now,
  ...extra,
})

async function seed() {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    for (const uid of ['student', 'other-student', 'target-student', 'admin']) {
      await setDoc(doc(db, `users/${uid}`), {
        uid, id: uid, role: 'student', campus: 'North Campus', name: uid, email: `${uid}@test.local`,
      })
    }
    await setDoc(doc(db, 'users/legacy-admin'), {
      uid: 'legacy-admin', id: 'legacy-admin', role: 'admin', campus: 'North Campus',
    })
    await setDoc(doc(db, 'publicProfiles/target-student'), {
      uid: 'target-student', name: 'Target Student', campus: 'North Campus',
      discoverable: true, createdAt: now,
    })
    await setDoc(doc(db, 'spaces/public-space'), {
      name: 'Public Space', campus: 'North Campus', visibility: 'public', members: ['student'],
    })
    await setDoc(doc(db, 'spaces/campus-space'), {
      name: 'Campus Space', campus: 'North Campus', visibility: 'campus', members: ['student'],
    })
    await setDoc(doc(db, 'spaces/private-space'), {
      name: 'Private Space', campus: 'North Campus', visibility: 'private', members: ['student'],
    })
    await setDoc(doc(db, 'spaces/public-space/posts/public-post'), {
      authorUid: 'target-student', text: 'A public post', createdAt: now,
    })
    await setDoc(doc(db, 'spaces/private-space/posts/private-post'), {
      authorUid: 'target-student', text: 'Private post content', createdAt: now,
    })
  })
}

async function seedReport(id, data = report()) {
  await testEnv.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), `reports/${id}`), data)
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

test('an authenticated student can submit a valid public-profile report', async () => {
  const db = dbFor('student')
  await assertSucceeds(setDoc(doc(db, 'reports/student-profile-report'), {
    ...report('student'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
})

test('a student can report public and same-campus Spaces and posts', async () => {
  const db = dbFor('student')
  for (const [id, target] of [
    ['public-space-report', { targetType: 'space', targetId: 'public-space' }],
    ['campus-space-report', { targetType: 'space', targetId: 'campus-space' }],
    ['public-post-report', { targetType: 'post', targetId: 'public-post', spaceId: 'public-space' }],
  ]) {
    await assertSucceeds(setDoc(doc(db, `reports/${id}`), {
      ...report('student', target),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  }
})

test('an unauthenticated user cannot submit a report', async () => {
  const db = testEnv.unauthenticatedContext().firestore()
  await assertFails(setDoc(doc(db, 'reports/anonymous-report'), {
    ...report('student'), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }))
})

test('a student cannot submit a report for another reporter UID', async () => {
  const db = dbFor('student')
  await assertFails(setDoc(doc(db, 'reports/forged-reporter'), {
    ...report('other-student'), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }))
})

test('a student cannot submit a report with a resolved initial status or moderator fields', async () => {
  const db = dbFor('student')
  await assertFails(setDoc(doc(db, 'reports/forged-status'), {
    ...report('student', { status: 'resolved' }),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }))
  await assertFails(setDoc(doc(db, 'reports/forged-reviewer'), {
    ...report('student', { reviewedBy: 'admin', reviewedAt: now, moderatorNote: 'forged' }),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }))
})

test('a student can read their own report', async () => {
  await seedReport('own-report', report('student'))
  await assertSucceeds(getDoc(doc(dbFor('student'), 'reports/own-report')))
  await assertSucceeds(getDocs(query(collection(dbFor('student'), 'reports'), where('reporterUid', '==', 'student'))))
})

test('a student cannot read another student report', async () => {
  await seedReport('other-report', report('other-student'))
  await assertFails(getDoc(doc(dbFor('student'), 'reports/other-report')))
})

test('a student cannot update or delete their report', async () => {
  await seedReport('student-report', report('student'))
  const db = dbFor('student')
  await assertFails(updateDoc(doc(db, 'reports/student-report'), { status: 'resolved' }))
  await assertFails(deleteDoc(doc(db, 'reports/student-report')))
})

test('a normal Google account cannot list all reports', async () => {
  await seedReport('student-report', report('student'))
  const db = dbFor('google-user', { firebase: { sign_in_provider: 'google.com' } })
  await assertFails(getDocs(collection(db, 'reports')))
  await assertFails(getDocs(collection(dbFor('legacy-admin'), 'reports')))
})

test('an administrator with the trusted claim can read all reports', async () => {
  await seedReport('student-report', report('student'))
  const db = dbFor('trusted-admin', { campusRole: 'admin' })
  const snapshot = await assertSucceeds(getDocs(collection(db, 'reports')))
  assert.equal(snapshot.size, 1)
})

test('trusted administrators can count Reports by status without granting students broad report access', async () => {
  await seedReport('own-pending-report', report('student', { status: 'pending' }))
  await seedReport('other-pending-report', report('other-student', { status: 'pending' }))
  await seedReport('other-review-report', report('other-student', { status: 'under_review' }))

  const adminDb = dbFor('trusted-admin', { campusRole: 'admin' })
  const pendingCount = await assertSucceeds(getCountFromServer(query(
    collection(adminDb, 'reports'),
    where('status', '==', 'pending'),
  )))
  const reviewCount = await assertSucceeds(getCountFromServer(query(
    collection(adminDb, 'reports'),
    where('status', '==', 'under_review'),
  )))
  assert.equal(pendingCount.data().count, 2)
  assert.equal(reviewCount.data().count, 1)

  const studentDb = dbFor('student')
  await assertFails(getCountFromServer(query(
    collection(studentDb, 'reports'),
    where('status', '==', 'pending'),
  )))
})

test('an administrator can constrain report queries by status, category, and creation date', async () => {
  await seedReport('matching-report', report('student', {
    status: 'under_review', category: 'safety', createdAt: now,
  }))
  await seedReport('other-status-report', report('student', {
    status: 'pending', category: 'safety', createdAt: now,
  }))
  const db = dbFor('trusted-admin', { campusRole: 'admin' })
  const filtered = await assertSucceeds(getDocs(query(
    collection(db, 'reports'),
    where('status', '==', 'under_review'),
    where('category', '==', 'safety'),
    where('createdAt', '>=', now),
  )))
  assert.equal(filtered.size, 1)
  assert.equal(filtered.docs[0].id, 'matching-report')
})

test('an administrator can update report status and moderation fields', async () => {
  await seedReport('student-report', report('student'))
  const db = dbFor('trusted-admin', { campusRole: 'admin' })
  const batch = writeBatch(db)
  batch.update(doc(db, 'reports/student-report'), {
    status: 'under_review',
    reviewedBy: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  batch.set(doc(db, 'reports/student-report/moderationNotes/review-note'), {
    authorUid: 'trusted-admin',
    note: 'Review started.',
    createdAt: serverTimestamp(),
  })
  await assertSucceeds(batch.commit())
})

test('moderation notes are readable only by administrators', async () => {
  await seedReport('student-report', report('student'))
  const adminDb = dbFor('trusted-admin', { campusRole: 'admin' })
  const noteRef = doc(adminDb, 'reports/student-report/moderationNotes/note-1')
  await assertSucceeds(setDoc(noteRef, {
    authorUid: 'trusted-admin',
    note: 'Review started.',
    createdAt: serverTimestamp(),
  }))
  await assertSucceeds(getDoc(noteRef))
  await assertFails(getDoc(doc(dbFor('student'), 'reports/student-report/moderationNotes/note-1')))
})

test('an administrator cannot modify immutable report fields', async () => {
  await seedReport('student-report', report('student'))
  const db = dbFor('trusted-admin', { campusRole: 'admin' })
  await assertFails(updateDoc(doc(db, 'reports/student-report'), {
    reason: 'Changed original report content',
    status: 'resolved',
    reviewedBy: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(doc(db, 'reports/student-report'), {
    targetId: 'another-target',
    status: 'resolved',
    reviewedBy: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
  await assertFails(updateDoc(doc(db, 'reports/student-report'), {
    reporterUid: 'trusted-admin',
    status: 'resolved',
    reviewedBy: 'trusted-admin',
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
})

test('reports cannot target private Space posts or private messages', async () => {
  const db = dbFor('student')
  await assertFails(setDoc(doc(db, 'reports/private-profile-report'), {
    ...report('student', { targetId: 'other-student' }),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }))
  await assertFails(setDoc(doc(db, 'reports/private-post-report'), {
    ...report('student', { targetType: 'post', targetId: 'private-post', spaceId: 'private-space' }),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }))
  await assertFails(setDoc(doc(db, 'reports/private-message-report'), {
    ...report('student', { targetType: 'message', targetId: 'private-message', chatId: 'private-chat' }),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }))
})

test('unauthenticated users cannot read or list reports', async () => {
  await seedReport('student-report', report('student'))
  const db = testEnv.unauthenticatedContext().firestore()
  await assertFails(getDoc(doc(db, 'reports/student-report')))
  await assertFails(getDocs(collection(db, 'reports')))
})
