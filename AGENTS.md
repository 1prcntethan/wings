# AGENTS.md: WINGS

WINGS is a mobile-first calisthenics PWA (React, Vite, Firebase Auth + Firestore, Cloudflare Pages) with ~1.2k real monthly users. The app lives in the `/wings` subfolder.

**Before any non-trivial task, read `docs/CONTEXT.md`** (product brief, priorities, out of scope). Check every request against it. If a request is out of scope, say so before building anything.

## Priorities (in order)
1. Codebase cleanup
2. Reliability and polish (validation, optimistic UI, loading/empty/error states, mobile bugs)
3. Finish skill guides
4. Security basics
5. New features

Don't start a lower priority while a higher one is unfinished unless asked.

## Out of scope
- Editing login, create account, or reset password (see below)
- Native apps, monetization, a full social network, an AI coach
- Stack changes (replacing Firebase, React, or Vite)
- Data model changes that break existing users

If asked for one of these, flag it before building.

## Workflow
- Before editing, state a short plan: files to touch, why, and what could break. Wait for approval on anything in a PROTECTED area.
- One task per change. Keep diffs small. No drive-by refactors, renames, or reformatting outside the task.
- Audit tasks: report findings first, then fix only what is broken, with minimal diffs.
- Do not add dependencies without asking. Prefer what's already in package.json.
- After changes, run the lint and build scripts `lint` and `build` (`npm run lint`, `npm run build` in `wings/package.json`). Report failures; never silence them.
- If requirements are ambiguous, ask one question instead of guessing.

## PROTECTED (never modify without explicit approval)
- Firestore security rules `firestore.rules` and auth logic `wings/src/config/auth-context.jsx`, `wings/src/config/auth.js`, `wings/src/pages/loginpage.jsx` (`/login`), `wings/src/pages/createaccount.jsx` (`/createaccount`), `wings/src/pages/resetpassword.jsx` (`/resetpassword`)
- Streak, rank, and progress calculation `wings/src/config/firestore.js` (`logWorkout` writes streak; `updateSkill` writes skill progress; `ensureUserDoc` / `updateUserData` create the user doc), `wings/src/pages/dashboard.jsx` (`calculateRank` and RP totals, display only), `wings/src/pages/skilltree.jsx` (calls `updateSkill`), `wings/src/utilites/skilltorp.js` (skill RP weights)
- Firestore document shapes and field names. Never rename or remove a field; changes need a migration plan for existing users' data.
- Skill graph data and prerequisite relationships `wings/src/pages/skilltree.jsx` (`initialNodes`, `initialEdges`); related maps in `wings/src/utilites/skillLinks.js`, `wings/src/utilites/skilltodb.js`, `wings/src/utilites/skilltitles.js`, `wings/src/utilites/skilldifficulties.js`, `wings/src/utilites/skilltorp.js`
- `.env*`, Firebase config `wings/src/config/firebase.js`, deployment config (Cloudflare, CNAME)

## Auth screens: verify only, do not edit
There is no separate onboarding flow. The account screens are `wings/src/pages/loginpage.jsx` (`/login`), `wings/src/pages/createaccount.jsx` (`/createaccount`), and `wings/src/pages/resetpassword.jsx` (`/resetpassword`), plus `wings/src/config/auth.js` and `wings/src/config/auth-context.jsx`.

Do not change these files. Do not change their steps, copy, layout, or order. The task is a check only: report whether sign-in, sign-up, and password reset fail gracefully.
- Every Firebase Auth error code shows a clear user-facing message (e.g. `auth/email-already-in-use`, `auth/invalid-credential`, `auth/weak-password`, `auth/invalid-email`, `auth/too-many-requests`, `auth/network-request-failed`, `auth/popup-closed-by-user`, `auth/user-disabled`), with a safe fallback for unknown codes.
- Firestore failures (`permission-denied`, `unavailable`, `deadline-exceeded`) are caught, shown, and retryable.
- No unhandled rejections, blank screens, or stuck spinners.
- Submit buttons are disabled while a request is in flight.
- Leaving midway and coming back never leaves a broken state.
- Raw error codes and stack traces are never shown to users.
Report findings only. Do not patch these screens.

## Architecture conventions
- All Firestore access goes through `wings/src/config/firestore.js`. Components never call Firestore directly.
- Guide and skill content is data rendered by a shared template. Never create per-skill page components.
- Every Firestore listener returns its unsubscribe in `useEffect` cleanup.
- Never trust client values for streak or rank; validate in rules or server code.
- Dates use a stored timezone and a `YYYY-MM-DD` day key, never raw `new Date()` comparisons.

## UI rules
- Mobile-first. Check every change at 360px and 390px, and as an installed PWA.
- UI drafts are fine. Ethan owns colors, fonts, and spacing and will edit those himself. Do not block work on brand tokens.
- Every async view needs loading, empty, and error states.
- Use the existing styling approach only: plain CSS (global `wings/src/index.css` and `wings/src/App.css`, plus a colocated `*.css` file imported by each page and component; no Tailwind config and no CSS modules). No new styling systems.
- Use optimistic updates for progress actions, with rollback and a toast on failure.
- Validate all user input (Zod schema) before writing.
- Lazy-load heavy routes (React Flow, guides).

## Code quality
- No dead code, commented-out blocks, or leftover `console.log`s.
- Small, single-purpose components. Split anything over ~200 lines.
- Match existing naming conventions. Don't invent new patterns.
- When fixing a bug in streak, rank, or progress logic, add a test.

## Never
- Never put secrets or API keys in client code.
- Never delete user data or write migration or destructive scripts without a dry-run mode.
- Never push to main or deploy.

## Definition of done
- Lint and build pass
- Works at 360px and 390px, and as an installed PWA
- Loading, empty, and error states handled
- No PROTECTED area touched without approval
- No dead code or stray console logs
- `docs/CONTEXT.md` updated if priorities or scope changed
