# CampusConnect

CampusConnect is a campus connection app built with React 18, Vite, Tailwind, React Router, Firebase SDK, and a complete in-memory mock mode.

## Live app

[Open CampusConnect](https://campus-connect-zeta-one.vercel.app)

## Setup

Run `npm install`, copy `.env.example` to `.env`, then run `npm run dev`. Build with `npm run build`.

## Mock and real modes

If `VITE_MOCK_SERVICES` is unset, all services use mock data. Set a comma-separated list to mock only selected services; for example, `VITE_MOCK_SERVICES=spaces,admin` keeps those services mocked while the others use their Firebase branches.

## Discover matching

Discover calculates scores from exact tag matches and sorts profiles from highest to lowest score. The base score is +3 for each complementary skill match, +2 for each shared interest, and +1 for each shared goal. It adds conditional bonuses for reciprocal skill exchange (+5), deeper interest overlap (+1 for two shared interests or +4 for three or more), same-campus compatibility (+2 when another match exists), and matches across multiple categories (+2 for two categories or +5 for skills, interests, and goals together). The “For You” tab shows profiles with a score above zero. This is rule-based matching, not AI matching.

## Contract summary

The app uses `pairId(a, b)` for connections and chats, returns timestamp milliseconds, and supports students, moderators, and admins. Mock data includes users, connections, messages, spaces, anonymous posts, comments, and reports.

## Workflow

Frontend owns pages, layouts, reusable UI, mock data, mock service branches, and Tailwind. Backend owns real Firestore branches, matching, hooks internals, Firebase setup details, and security rules. Contract changes should be proposed in a small PR and shared with the other contributor.
