import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveAuthenticatedUser } from '../src/features/admin/auth-session.js'

test('admin service waits for Firebase auth restoration before resolving the context UID', async () => {
  let ready = false
  const user = { uid: 'admin-1' }
  const auth = {
    get currentUser() { return ready ? user : null },
    async authStateReady() { ready = true },
  }
  assert.deepEqual(await resolveAuthenticatedUser(auth, 'admin-1'), { uid: 'admin-1', user })
  assert.equal(ready, true)
})

test('admin service rejects an empty Firebase session after initialization', async () => {
  const auth = { currentUser: null, async authStateReady() {} }
  await assert.rejects(resolveAuthenticatedUser(auth, 'admin-1'), { code: 'auth/no-current-user' })
})

test('admin service rejects a Firebase user that differs from AuthContext', async () => {
  const auth = { currentUser: { uid: 'student-1' }, async authStateReady() {} }
  await assert.rejects(resolveAuthenticatedUser(auth, 'admin-1'), { code: 'auth/user-mismatch' })
})

test('admin service reports missing Firebase initialization explicitly', async () => {
  await assert.rejects(resolveAuthenticatedUser(null), { code: 'auth/not-initialized' })
})
