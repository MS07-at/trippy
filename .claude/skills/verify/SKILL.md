---
name: verify
description: Launch and drive trippy (Next.js + Convex) to verify changes end-to-end in the browser.
---

# Verifying trippy changes

## Launch
- `pnpm dev` runs `convex dev` + `next dev --turbopack`. Port 3000 is often taken by another local app (a "Vodka Club" site) — Next falls back to **3001**; check the dev log for the actual port.
- After adding/renaming Convex functions or schema fields, run `pnpm exec convex codegen` (this also pushes functions to the dev deployment).

## Getting into the app
- `/` is a static landing page; the app lives at `/trip/<slug>`.
- Create throwaway data via the Convex CLI instead of clicking through signup:
  - `pnpm exec convex run users:register '{"username":"...","password":"..."}'` → returns `{id, token, username}`
  - `pnpm exec convex run vacations:create '{"name":"...","userId":"<id>","nights":4,"people":2}'` → returns `{id, slug}`
  - `destinations:create`, `travelOptions:add`, `apartments:add` all take `userId` for auth.
- Log in in the browser by setting localStorage and reloading:
  `localStorage.setItem("trippy_auth", JSON.stringify({id, username, token}))` (key `trippy_auth`).

## Driving
- Edit mode is behind the "Bearbeiten" toggle in the header; "Fertig" exits.
- Full-page snapshots are huge; prefer `preview_evaluate` returning compact objects from `document.body.innerText` matches.
- Server-side guards are easy to probe with `pnpm exec convex run votes:cast ...` etc. — errors surface as `Uncaught Error: <message>`.

## Cleanup
- `pnpm exec convex run vacations:remove '{"id":"...","userId":"..."}'` cascades to destinations/options/apartments/votes.
- There is **no** users:remove mutation — throwaway users stay in the dev deployment.
- Kill the dev server (`pkill -f "next dev --turbopack"; pkill -f "convex dev"`).
