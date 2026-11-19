import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

export const EXPECTED_PROJECT_ID = 'campusconnect-63b7d'

export function parseProvisionArgs(args) {
  const dryRun = args.includes('--dry-run')
  const emailArgs = args.filter(arg => arg !== '--dry-run')
  if (emailArgs.length !== 1 || emailArgs[0].startsWith('--') || args.some(arg => arg.startsWith('--') && arg !== '--dry-run')) {
    throw new Error('Usage: node scripts/provision-admin.mjs <account-email> [--dry-run]')
  }

  const email = emailArgs[0].trim()
  if (!email || !email.includes('@')) throw new Error('Provide a valid target account email address.')
  return { email, dryRun }
}

function assertExpectedProject(projectIds = []) {
  const mismatch = projectIds.find(projectId => projectId && projectId !== EXPECTED_PROJECT_ID)
  if (mismatch) {
    throw new Error(`Refusing to run: configured project is ${mismatch}, expected ${EXPECTED_PROJECT_ID}.`)
  }
}

export async function provisionAdmin({
  email,
  dryRun = false,
  configuredProjectIds = [],
  authClient,
  confirmProject,
  report = () => {},
}) {
  assertExpectedProject(configuredProjectIds)
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    throw new Error('Provide a valid target account email address.')
  }
  if (!authClient?.getUserByEmail || !authClient?.setCustomUserClaims) {
    throw new Error('A Firebase Authentication Admin client is required.')
  }
  const authProjectId = authClient.app?.options?.projectId
  if (authProjectId !== EXPECTED_PROJECT_ID) {
    throw new Error(`Refusing to run: Authentication client project is ${authProjectId || '(unset)'}, expected ${EXPECTED_PROJECT_ID}.`)
  }

  let target
  try {
    target = await authClient.getUserByEmail(email)
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      throw new Error(`No Firebase Authentication account exists for ${email}.`)
    }
    throw error
  }

  report({
    projectId: EXPECTED_PROJECT_ID,
    email: target.email || email,
    displayName: target.displayName || '(not set)',
    uid: target.uid,
  })

  if (dryRun) return { modified: false, target }
  if (typeof confirmProject !== 'function') {
    throw new Error('Interactive confirmation is required. Re-run in a terminal or use --dry-run.')
  }
  if (await confirmProject(EXPECTED_PROJECT_ID) !== EXPECTED_PROJECT_ID) {
    return { modified: false, cancelled: true, target }
  }

  await authClient.setCustomUserClaims(target.uid, {
    ...(target.customClaims || {}),
    campusRole: 'admin',
  })
  return { modified: true, target }
}

async function askForProjectConfirmation(projectId) {
  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error('Interactive confirmation is required. Re-run in a terminal or use --dry-run.')
  }
  const prompt = createInterface({ input: stdin, output: stdout })
  try {
    return await prompt.question(`Type ${projectId} to grant this account administrator access: `)
  } finally {
    prompt.close()
  }
}

async function main() {
  const { email, dryRun } = parseProvisionArgs(process.argv.slice(2))
  const app = initializeApp({
    credential: applicationDefault(),
    projectId: EXPECTED_PROJECT_ID,
  })

  try {
    const result = await provisionAdmin({
      email,
      dryRun,
      configuredProjectIds: [process.env.GCLOUD_PROJECT, process.env.GOOGLE_CLOUD_PROJECT],
      authClient: getAuth(app),
      confirmProject: dryRun ? undefined : askForProjectConfirmation,
      report: target => {
        console.log(`Project: ${target.projectId}`)
        console.log(`Account: ${target.email}`)
        console.log(`Display name: ${target.displayName}`)
        console.log(`UID: ${target.uid}`)
      },
    })

    if (result.cancelled) {
      console.error('Confirmation did not match. No claims were changed.')
      return 1
    }
    if (dryRun) console.log('Dry run only. No claims were changed.')
    else console.log('Administrator claim assigned. The user must refresh their ID token or sign in again.')
    return 0
  } finally {
    await app.delete()
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().then(code => { process.exitCode = code }).catch(error => {
    console.error(error.message)
    process.exitCode = 1
  })
}
