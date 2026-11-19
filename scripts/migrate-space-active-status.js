import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { migrateMissingSpaceActiveStatus, parseSpaceMigrationArgs } from './space-active-status-migration.js'

const run = async () => {
  const options = parseSpaceMigrationArgs(process.argv.slice(2))
  const credential = process.env.FIRESTORE_EMULATOR_HOST ? undefined : applicationDefault()
  const app = initializeApp({ projectId: options.projectId, ...(credential ? { credential } : {}) })
  try {
    const result = await migrateMissingSpaceActiveStatus(getFirestore(app), options)
    console.log(JSON.stringify({ projectId: options.projectId, ...result }, null, 2))
    if (options.dryRun) {
      console.log('Dry run only. Re-run with --apply --confirm-project <same-project-id> to write isActive=true to missing fields.')
    }
  } finally {
    await app.delete()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  run().catch(error => {
    console.error(error.message || String(error))
    process.exitCode = 1
  })
}
