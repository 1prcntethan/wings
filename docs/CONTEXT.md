# WINGS: Product Brief

## What Wings is
A Progressive Web App for learning and mastering calisthenics skills (planche, front lever, muscle-up, etc.) through prerequisite-based progression trees. It teaches users how to train and build their own workouts rather than handing them a fixed plan.

Live at wingssw.com. Solo-built by Ethan.

## Who it's for
- Bodyweight athletes, from beginners to intermediates chasing their first skills (first pull-up, first muscle-up, a first lever hold).
- Mostly mobile users who arrive from Instagram (~33k followers) and open the app on their phone, often straight from a reel.
- People who want to understand *why* a progression works, not just follow a program.
- ~1.2k monthly active users today. They have real progress and streaks that must never be lost.

## The goal of this upgrade
Take Wings from "a project with traction" to a polished, trustworthy app that can be launched properly. In practice:
- Every screen feels intentional and works on a phone.
- Nothing breaks or dead-ends when something goes wrong (bad input, network failure, auth errors).
- The codebase is clean enough that a senior engineer reading it finds nothing embarrassing.

## Upgrade goals, in priority order
1. **Clean up the codebase.** Remove dead code and duplication, use one styling convention, and make guide content data rather than per-skill components.
2. **Reliability and polish.** Input validation, optimistic UI, loading/empty/error states, better visuals, and fixes for mobile resize bugs. This includes the auth-screen error check below. UI drafts are fine; Ethan will edit colors, fonts, and spacing.
3. **Finish the skill guides.**
4. **Security basics.** Streaks and ranks shouldn't be client-trusted, and Firestore rules should be tight.
5. **New features, only if they're useful.** Candidates, in order: readiness criteria per skill, a workout/hold logger, shareable progress cards, reminders, streak freeze, and a workout builder.

## Auth screens: verify only, do not edit
There is no separate onboarding flow. Login, create account, and reset password stay as they are. Do not change `wings/src/pages/loginpage.jsx`, `wings/src/pages/createaccount.jsx`, `wings/src/pages/resetpassword.jsx`, or their copy, layout, or order. The task is to check that they fail gracefully and report findings. Do not patch these screens.
- Every Firebase Auth error code is handled with a clear, user-facing message (e.g. `auth/email-already-in-use`, `auth/invalid-credential`, `auth/weak-password`, `auth/invalid-email`, `auth/too-many-requests`, `auth/network-request-failed`, `auth/popup-closed-by-user`, `auth/user-disabled`), plus a safe fallback for any unknown code.
- Firestore errors during user-doc creation or profile writes (`permission-denied`, `unavailable`, `deadline-exceeded`) are caught, shown to the user, and retryable.
- No unhandled promise rejections, blank screens, or stuck spinners at any step.
- Submit buttons are disabled while a request is in flight, so double-taps can't create duplicate writes.
- Offline and slow-network behavior is sane.
- A user who leaves midway and comes back doesn't end up in a broken state.
- Error messages never expose raw error codes or stack traces.

## Out of scope for this upgrade (proposed)
- Editing login, create account, or reset password (see above).
- A native iOS/Android app. Wings stays a PWA.
- Monetization, subscriptions, or ads.
- A full social network (comments, DMs, feeds). Friends/follows only after the leaderboard is secured.
- AI coach or video form-checking. Revisit after everything above is done.
- Replacing Firebase, React, or Vite, or any rewrite of the stack.
- Changes to the existing user data model that would break existing users' accounts.

## Non-negotiables
- Existing users' progress, streaks, and accounts must survive every change.
- Mobile-first: if it doesn't work at phone width, it isn't done.
- Visual identity stays clean, minimal, and consistent. Ethan owns colors, fonts, and spacing. Drafts are fine; he will edit them.
- No new dependencies without discussion.

## How to use this file
When asked to work on something, check it against the priority order above. If a request falls under "out of scope," say so before building it.
