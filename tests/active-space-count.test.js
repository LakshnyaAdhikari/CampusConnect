import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { after, before, test } from 'node:test'
import { doc, setDoc } from 'firebase/firestore'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { getActiveVisibleSpaceCount } from '../src/features/admin/space-count.js'

const PROJECT_ID = 'demo-campusconnect'
let testEnv

before(async () => {
  const rules = await readFile(new URL('../firestore.rules.test', import.meta.url), 'utf8')
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: '127.0.0.1', port: 8080, rules },
  })
})

after(async () => testEnv.cleanup())

test('Overview counts all active public and matching-campus Spaces including legacy records', async () => {
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, 'users/student'), { campus: 'North Campus' })
    for (let index = 0; index < 130; index += 1) {
      await setDoc(doc(db, `spaces/public-${String(index).padStart(3, '0')}`), {
        visibility: 'public', campus: 'South Campus', isActive: true,
      })
    }
    await setDoc(doc(db, 'spaces/public-legacy'), { visibility: 'public' })
    await setDoc(doc(db, 'spaces/public-inactive'), { visibility: 'public', isActive: false })
    await setDoc(doc(db, 'spaces/campus-active'), { visibility: 'campus', campus: 'North Campus', isActive: true })
    await setDoc(doc(db, 'spaces/campus-legacy'), { visibility: 'campus', campus: 'North Campus' })
    await setDoc(doc(db, 'spaces/campus-inactive'), { visibility: 'campus', campus: 'North Campus', isActive: false })
    await setDoc(doc(db, 'spaces/campus-other'), { visibility: 'campus', campus: 'South Campus', isActive: true })
    await setDoc(doc(db, 'spaces/private-active'), { visibility: 'private', campus: 'North Campus', isActive: true })
  })

  const studentDb = testEnv.authenticatedContext('student').firestore()
  const count = await getActiveVisibleSpaceCount(studentDb, 'North Campus')
  assert.equal(count, 133)
})
