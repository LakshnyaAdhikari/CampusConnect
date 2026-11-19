import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  EXPECTED_PROJECT_ID,
  parseProvisionArgs,
  provisionAdmin,
} from '../scripts/provision-admin.mjs'

function fakeAuth(target = {
  uid: 'test-admin-uid',
  email: 'admin@test.local',
  displayName: 'Test Admin',
  customClaims: { department: 'engineering', campusRole: 'student' },
}, projectId = EXPECTED_PROJECT_ID) {
  const calls = { lookups: [], updates: [] }
  return {
    app: { options: { projectId } },
    calls,
    getUserByEmail: async email => {
      calls.lookups.push(email)
      if (target instanceof Error) throw target
      return target
    },
    setCustomUserClaims: async (uid, claims) => calls.updates.push({ uid, claims }),
  }
}

test('dry run looks up the target but never sets custom claims', async () => {
  const authClient = fakeAuth()
  const result = await provisionAdmin({
    email: 'admin@test.local', dryRun: true, authClient,
  })
  assert.equal(result.modified, false)
  assert.deepEqual(authClient.calls.lookups, ['admin@test.local'])
  assert.equal(authClient.calls.updates.length, 0)
})

test('provisioning preserves unrelated claims and assigns only the fixed admin claim', async () => {
  const authClient = fakeAuth()
  const result = await provisionAdmin({
    email: 'admin@test.local', authClient,
    configuredProjectIds: [EXPECTED_PROJECT_ID],
    confirmProject: async projectId => projectId,
    role: 'moderator',
  })
  assert.equal(result.modified, true)
  assert.deepEqual(authClient.calls.updates, [{
    uid: 'test-admin-uid',
    claims: { department: 'engineering', campusRole: 'admin' },
  }])
})

test('a mismatched configured Firebase project is rejected before lookup or write', async () => {
  const authClient = fakeAuth(undefined, 'another-project')
  await assert.rejects(
    provisionAdmin({
      email: 'admin@test.local', authClient,
      confirmProject: async projectId => projectId,
    }),
    /Authentication client project is another-project, expected campusconnect-63b7d/,
  )
  assert.equal(authClient.calls.lookups.length, 0)
  assert.equal(authClient.calls.updates.length, 0)
})

test('confirmation cancellation does not modify claims', async () => {
  const authClient = fakeAuth()
  const result = await provisionAdmin({
    email: 'admin@test.local', authClient,
    confirmProject: async () => 'cancel',
  })
  assert.equal(result.cancelled, true)
  assert.equal(authClient.calls.updates.length, 0)
})

test('CLI arguments reject attempts to select a different role', () => {
  assert.deepEqual(parseProvisionArgs(['admin@test.local', '--dry-run']), {
    email: 'admin@test.local', dryRun: true,
  })
  assert.throws(
    () => parseProvisionArgs(['admin@test.local', '--role', 'moderator']),
    /Usage:/,
  )
})

test('a missing Firebase Auth user is reported without changing claims', async () => {
  const authClient = fakeAuth(Object.assign(new Error('not found'), { code: 'auth/user-not-found' }))
  await assert.rejects(
    provisionAdmin({ email: 'missing@test.local', authClient }),
    /No Firebase Authentication account exists/,
  )
  assert.equal(authClient.calls.updates.length, 0)
})
