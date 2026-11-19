# Admin backend service contracts

These services live in `src/features/admin/service.js` and use the shared Firebase `auth` and `db` exports. Pass the signed-in AuthContext UID as the final argument when the caller has it; the service waits for Firebase Auth restoration and rejects a UID mismatch. Admin operations also verify the trusted `campusRole: "admin"` token claim before reading or writing.

All functions return promises and reject with validation errors, `auth/*` errors, Firebase `permission-denied`, or the underlying Firestore error. Do not treat a client side role or profile field as authorization. Firestore Rules remain authoritative.

## Overview

### `getDashboardStats(filters = {}, expectedUid, onMetricSettled)`

`filters.campus` optionally scopes discoverable student count to an exact campus. Space counts are limited to public Spaces and campus Spaces matching the administrator's own `/users/{uid}.campus`. Active Spaces count only `isActive == true` within those same visible scopes; private and other-campus Spaces are not included. Reports are counted by each supported status.

Returns:

```js
{
  discoverableStudents: number | null,
  visibleSpaces: number | null,
  spaces: { public: number | null, campus: number | null, active: number | null },
  reports: { pending: number | null, under_review: number | null, resolved: number | null, dismissed: number | null },
  metrics: {
    discoverableStudents: { status: 'success', value: number, metric: string } | { status: 'error', code: string, message: string, metric: string },
    publicSpaces: MetricResult,
    campusSpaces: MetricResult,
    activeSpaces: MetricResult,
    visibleSpaces: MetricResult,
    pendingReports: MetricResult,
    underReviewReports: MetricResult,
    resolvedReports: MetricResult,
    dismissedReports: MetricResult
  },
  unsupported: []
}
```

`MetricResult` is `{ status: 'success', value: number, metric: string }`, `{ status: 'error', code: string, message: string, metric: string }`, or `{ status: 'unavailable', reason: string, metric: string }`. Each count is settled independently; the optional `onMetricSettled(metric, result)` callback fires as each individual metric settles. Failed values are `null` in the compatibility fields and carry an error state in `metrics`. The combined visible Spaces total is unavailable if either constituent count failed. Read models treat a missing `isActive` field as active until the explicit migration runs.

### `getDashboardMetric(metric, expectedUid)`

Loads one retryable metric without repeating the other Overview aggregations. Supported metric keys are `discoverableStudents`, `publicSpaces`, `campusSpaces`, `activeSpaces`, `pendingReports`, `underReviewReports`, `resolvedReports`, and `dismissedReports`. Returns the numeric count, or an unavailable state for `campusSpaces` when the administrator profile has no campus. Firebase errors reject and are surfaced only on that metric.

### `getRegistrationTrends(filters = {}, expectedUid)`

Accepts `startDate`, `endDate`, `campus`, and `interval: 'month'` (default). Dates may be `Date`, milliseconds, or date strings. At most 36 monthly buckets are allowed. Counts include only discoverable public profiles and use their existing `createdAt` timestamp.

Returns `[{ period: 'YYYY-MM', start: milliseconds, end: milliseconds, count: number }]`.

### `getCampusStats({ campuses }, expectedUid)`

Requires an explicit array of at most 50 campus names. Returns `[{ campus, students }]`. Requiring names avoids a full directory scan merely to discover campus labels.

### `getRecentActivity(filters = {}, expectedUid)`

Returns `{ supported: false, items: [], reason }`. There is no global activity collection or supported activity event schema. Space posts are not represented as a global feed.

## Student management

### `listStudents(filters = {}, expectedUid)`

Filters: `namePrefix`, `campus`, `interest`, `skill`, `skillField: 'teach' | 'learn'`, `sortBy: 'name' | 'createdAt'`, `direction: 'asc' | 'desc'`, `startDate`, `endDate`, `pageSize` (1–100), and `cursor`.

Only `/publicProfiles` documents with `discoverable == true` are queried. `interest` and `skill` cannot be combined in one request because Firestore supports one array membership constraint for this query. Name-prefix search requires name sorting; registration date bounds require `sortBy: 'createdAt'`.

Returns `{ items: PublicProfile[], nextCursor }`. Each item includes only the existing public profile fields plus `uid`, `id`, `role: 'student'`, and `createdAt` in milliseconds. `nextCursor` is opaque to callers and may be passed back as `cursor`; it is `null` at the end.

### `getStudentPublicProfile(uid, expectedUid)`

Returns the discoverable public profile, or `null` when it is missing or not discoverable. It never reads `/users` or Firebase Auth account lists.

## Space management

### `listSpaces(filters = {}, expectedUid)`

Filters: `category`, `campus`, `visibility: 'all' | 'public' | 'campus'`, `pageSize` (1–100), and `cursor`. Results include public Spaces across campuses and campus-scoped Spaces only for the administrator's own campus. Private Spaces and their contents are excluded. A request for a different campus is rejected.

Returns `{ items: SpaceSummary[], nextCursor }`. Summaries contain name, description, category, campus, visibility, active status, creator UID, member count, and creation time; the `members` array and posts are not returned. A missing legacy `isActive` field is normalized as active.

### `getSpaceDetails(spaceId, expectedUid)`

Returns a visible public or own-campus Space summary, or `null` for missing, private, or out-of-campus Spaces. It does not return posts or private membership data.

### `getSpaceStats(spaceId, expectedUid)`

For a visible Space, returns `{ spaceId, memberCount, postCount, latestPostAt, recentPostCount, activeMembers }`. `postCount` is an aggregate count; `latestPostAt` comes from at most five recent visible posts. `activeMembers` is `null` because the schema has no activity window for member presence. Private Spaces return `null`.

### `updateSpaceActiveStatus(spaceId, isActive, expectedUid)`

Changes only the `isActive` boolean on a visible Space and returns the refreshed Space summary. Firestore Rules require the trusted admin claim and reject updates that combine status changes with other field changes. Existing visibility, membership, and content permissions are unchanged.

## Reports and moderation

### `createReport(input, expectedUid)` / `listMyReports(expectedUid)`

Report creation accepts `{ targetType, targetId, spaceId?, category, reason }`. `reporterUid` always comes from Firebase Auth, and existing Rules validate the target. Own-report listing is constrained by that authenticated UID.

### `listReports(filters = {}, expectedUid)`

Filters: `status`, `category`, inclusive `startDate` / `endDate`, `pageSize` (1–100), and `cursor`. Requires the trusted admin claim. Returns `{ items: Report[], nextCursor }`. For compatibility with the existing dashboard, the legacy call `listReports(uid)` still returns the full array; new callers should use the filters object to get bounded pages. `listReportPage(filters, expectedUid)` is an explicit alias for the paginated contract.

### `getReportDetails(reportId, expectedUid)`

Returns a report or `null`; requires the trusted admin claim.

### `updateReportStatus(reportId, status, expectedUid)`

Allows transitions from `pending` or `under_review` to `under_review`, `resolved`, or `dismissed`. The trusted claim is checked client side and Rules enforce authorization and immutable original report fields.

### `addModeratorNote(reportId, note, expectedUid)` / `listModerationNotes(reportId, expectedUid)`

Notes are restricted to administrators by both service checks and Firestore Rules. Notes are append-only and limited to 1,000 characters.

### `getReportHistory(reportId, expectedUid)`

Returns `{ report, notes, statusHistory: [], statusHistorySupported: false }`. Notes are the only moderation history currently stored; status-change history has no schema and is not fabricated.

### Compatibility method `updateReport(reportId, { status, moderatorNote }, expectedUid)`

Updates a report and optionally appends a private note in a Firestore batch for the existing dashboard. It retains the same trusted claim and Rules requirements.

## Data and cost limits

The feature adds `spaces.isActive: boolean`. New Spaces start active; document reads treat a missing legacy field as active. Student discovery queries require `isActive == true`, so run the migration before deploying this discovery behavior to make legacy Spaces discoverable. The migration at `scripts/migrate-space-active-status.js` defaults to dry-run and only fills missing fields. Preview with `npm run migrate:spaces-active-status -- --project <project-id> --dry-run`; applying requires `--apply --confirm-project <same-project-id>`. Non-emulator writes are restricted to `campusconnect-63b7d`; emulator use remains supported. The migration has not been run automatically. Count aggregations and paginated directory queries are available for new frontend integrations. The pre-existing `loadAdminDashboard` compatibility function still returns complete student and visible Space arrays for the current dashboard; replace it with count and page calls before using it for a large production directory.

No Cloud Functions, service account, Auth user listing, private student profiles, private Space content, or new paid Firebase products are used.
