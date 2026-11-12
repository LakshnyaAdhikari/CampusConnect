# CampusConnect

CampusConnect is a campus connection app built with React 18, Vite, Tailwind, React Router, Firebase SDK, and a complete in-memory mock mode.

## Setup

Run `npm install`, copy `.env.example` to `.env`, then run `npm run dev`. Build with `npm run build`.

## Mock and real modes

`VITE_MOCK_SERVICES=all` is the default and allows the whole product to run without Firebase. Set a comma-separated service list to mock selected services. Each service has an isolated mock branch and a placeholder real branch for the backend integration work.

## Contract summary

The app uses `pairId(a, b)` for connections and chats, returns timestamp milliseconds, and supports students, moderators, and admins. Mock data includes users, connections, messages, spaces, anonymous posts, comments, and reports.

## Workflow

Frontend owns pages, layouts, reusable UI, mock data, mock service branches, and Tailwind. Backend owns real Firestore branches, matching, hooks internals, Firebase setup details, and security rules. Contract changes should be proposed in a small PR and shared with the other contributor.
