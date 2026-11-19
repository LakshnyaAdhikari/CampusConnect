import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, beforeEach, test } from 'node:test'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  migrateMissingSpaceActiveStatus,
  parseSpaceMigrationArgs,
  PRODUCTION_FIREBASE_PROJECT_ID,
} from '../scripts/space-active-status-migration.js'

const PROJECT_ID = 'demo-campusconnect'
let testEnv
let adminApp
let db

before(async () => {
  const rules = await readFile(new URL('../firestore.rules.test', import.meta.url), 'utf8')
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules },
  })
  adminApp = initializeApp({ projectId: PROJECT_ID }, 'space-active-migration-tests')
  db = getFirestore(adminApp)
})

beforeEach(async () => testEnv.clearFirestore())

after(async () => {
  await deleteApp(adminApp)
  await testEnv.cleanup()
})

test('migration defaults to dry-run, requires project confirmation, and safeguards production target', () => {
  assert.deepEqual(parseSpaceMigrationArgs(['--project', PROJECT_ID]), {
    projectId: PROJECT_ID,
    dryRun: true,
  })
  assert.throws(() => parseSpaceMigrationArgs(['--project', PROJECT_ID, '--apply']), /explicit confirmation/)
  assert.throws(() => parseSpaceMigrationArgs([
    '--project', PROJECT_ID,
    '--apply',
    '--confirm-project', 'another-project',
  ], { emulatorHost: '' }), /explicit confirmation/)
  assert.throws(() => parseSpaceMigrationArgs([
    '--project', 'staging-campusconnect',
    '--apply',
    '--confirm-project', 'staging-campusconnect',
  ], { emulatorHost: '' }), new RegExp(PRODUCTION_FIREBASE_PROJECT_ID))
  assert.deepEqual(parseSpaceMigrationArgs([
    '--project', PROJECT_ID,
    '--apply',
    '--confirm-project', PROJECT_ID,
  ], { emulatorHost: '127.0.0.1:8080' }), { projectId: PROJECT_ID, dryRun: false })
  assert.deepEqual(parseSpaceMigrationArgs([
    '--project', PROJECT_ID,
    '--apply',
    '--confirm-project', PROJECT_ID,
  ]), { projectId: PROJECT_ID, dryRun: false })
})

test('migration fills only missing isActive fields and is idempotent', async () => {
  const spaces = db.collection('spaces')
  await spaces.doc('missing-status').set({
    name: 'Legacy Space', visibility: 'public', members: ['alice'], memberCount: 1,
  })
  await spaces.doc('already-active').set({ name: 'Active Space', visibility: 'public', isActive: true, members: ['bob'] })
  await spaces.doc('already-inactive').set({ name: 'Inactive Space', isActive: false, members: ['carol'] })

  const dryRun = await migrateMissingSpaceActiveStatus(db, { dryRun: true, pageSize: 2 })
  assert.deepEqual(dryRun, { scanned: 3, missing: 1, updated: 0, alreadySet: 2, dryRun: true })
  assert.equal((await spaces.doc('missing-status').get()).data().isActive, undefined)

  const studentDb = testEnv.authenticatedContext('student').firestore()
  const discovery = () => getDocs(query(
    collection(studentDb, 'spaces'),
    where('visibility', '==', 'public'),
    where('isActive', '==', true),
  ))
  const beforeMigration = await discovery()
  assert.deepEqual(beforeMigration.docs.map(snapshot => snapshot.id), ['already-active'])

  const applied = await migrateMissingSpaceActiveStatus(db, { dryRun: false, pageSize: 2 })
  assert.deepEqual(applied, { scanned: 3, missing: 1, updated: 1, alreadySet: 2, dryRun: false })
  assert.deepEqual((await spaces.doc('missing-status').get()).data(), {
    name: 'Legacy Space', visibility: 'public', members: ['alice'], memberCount: 1, isActive: true,
  })
  assert.equal((await spaces.doc('already-active').get()).data().isActive, true)
  assert.equal((await spaces.doc('already-inactive').get()).data().isActive, false)

  const repeated = await migrateMissingSpaceActiveStatus(db, { dryRun: false, pageSize: 2 })
  assert.deepEqual(repeated, { scanned: 3, missing: 0, updated: 0, alreadySet: 3, dryRun: false })
  const afterMigration = await discovery()
  assert.deepEqual(afterMigration.docs.map(snapshot => snapshot.id), ['already-active', 'missing-status'])
})

test('migration paginates all documents across page boundaries', async () => {
  const spaces = db.collection('spaces')
  for (const id of ['space-a', 'space-b', 'space-c', 'space-d', 'space-e']) {
    await spaces.doc(id).set({ name: id })
  }

  const result = await migrateMissingSpaceActiveStatus(db, { dryRun: false, pageSize: 2 })
  assert.deepEqual(result, { scanned: 5, missing: 5, updated: 5, alreadySet: 0, dryRun: false })
  for (const id of ['space-a', 'space-b', 'space-c', 'space-d', 'space-e']) {
    assert.equal((await spaces.doc(id).get()).data().isActive, true)
  }
})

test('migration preserves a status changed concurrently after the scan', async () => {
  const spaceRef = db.collection('spaces').doc('concurrently-deactivated')
  await spaceRef.set({ name: 'Concurrent status update', members: ['alice'] })
  let concurrentUpdateApplied = false

  const wrapQuery = queryRef => ({
    limit: size => wrapQuery(queryRef.limit(size)),
    startAfter: cursor => wrapQuery(queryRef.startAfter(cursor)),
    get: async () => {
      const snapshot = await queryRef.get()
      if (!concurrentUpdateApplied) {
        concurrentUpdateApplied = true
        await spaceRef.update({ isActive: false })
      }
      return snapshot
    },
  })
  const racingDb = {
    collection: name => ({
      orderBy: (...args) => wrapQuery(db.collection(name).orderBy(...args)),
    }),
    runTransaction: db.runTransaction.bind(db),
  }

  const result = await migrateMissingSpaceActiveStatus(racingDb, { dryRun: false, pageSize: 10 })
  assert.deepEqual(result, { scanned: 1, missing: 1, updated: 0, alreadySet: 1, dryRun: false })
  assert.equal((await spaceRef.get()).data().isActive, false)
  assert.deepEqual((await spaceRef.get()).data().members, ['alice'])
})
