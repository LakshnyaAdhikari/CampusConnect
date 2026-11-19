import { FieldPath } from 'firebase-admin/firestore'

export const PRODUCTION_FIREBASE_PROJECT_ID = 'campusconnect-63b7d'

const hasOwn = (value, field) => Object.prototype.hasOwnProperty.call(value, field)

export const parseSpaceMigrationArgs = (args, { emulatorHost = process.env.FIRESTORE_EMULATOR_HOST } = {}) => {
  const valueAfter = flag => {
    const index = args.indexOf(flag)
    return index < 0 ? '' : (args[index + 1] || '')
  }
  const projectId = valueAfter('--project')
  const confirmedProject = valueAfter('--confirm-project')
  const apply = args.includes('--apply')
  const dryRunFlag = args.includes('--dry-run')

  if (!projectId) throw new Error('Specify the Firebase project with --project <project-id>.')
  if (apply && dryRunFlag) throw new Error('Choose either --dry-run or --apply, not both.')
  if (apply && confirmedProject !== projectId) {
    throw new Error('Applying requires --confirm-project <same-project-id> as an explicit confirmation.')
  }
  if (apply && !emulatorHost && projectId !== PRODUCTION_FIREBASE_PROJECT_ID) {
    throw new Error(`Production migration writes are restricted to Firebase project ${PRODUCTION_FIREBASE_PROJECT_ID}.`)
  }
  if (!apply && confirmedProject) throw new Error('--confirm-project is only valid together with --apply.')

  return { projectId, dryRun: !apply }
}

/**
 * Idempotently add isActive=true only to Space documents where the field is
 * absent. Each write re-reads the document transactionally to preserve a
 * status set concurrently after the scan began.
 */
export const migrateMissingSpaceActiveStatus = async (db, { dryRun = true, pageSize = 200 } = {}) => {
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 500) {
    throw new Error('pageSize must be an integer from 1 to 500.')
  }

  const summary = { scanned: 0, missing: 0, updated: 0, alreadySet: 0, dryRun }
  let cursor = null

  while (true) {
    let pageQuery = db.collection('spaces')
      .orderBy(FieldPath.documentId())
      .limit(pageSize)
    if (cursor) pageQuery = pageQuery.startAfter(cursor)
    const page = await pageQuery.get()
    if (page.empty) break

    for (const snapshot of page.docs) {
      summary.scanned += 1
      if (hasOwn(snapshot.data(), 'isActive')) {
        summary.alreadySet += 1
        continue
      }
      summary.missing += 1
      if (dryRun) continue

      const updated = await db.runTransaction(async transaction => {
        const latest = await transaction.get(snapshot.ref)
        if (!latest.exists || hasOwn(latest.data(), 'isActive')) return false
        transaction.update(snapshot.ref, { isActive: true })
        return true
      })
      if (updated) summary.updated += 1
      else summary.alreadySet += 1
    }

    cursor = page.docs.at(-1)
    if (page.size < pageSize) break
  }

  return summary
}
