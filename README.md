# WINGS

**A calisthenics progression app built for people who train with their bodyweight, not a gym membership.**

[![Live App](https://img.shields.io/badge/live-wings-4ecdc4?style=flat-square)](https://your-wings-url.pages.dev)
[![Made with React](https://img.shields.io/badge/React-Vite-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Deployed on Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com)

<!-- Swap this for a real screenshot or GIF of the app in use -->
![WINGS app screenshot](./assets/screenshot-hero.png)

---

## What it is

WINGS is a Progressive Web App for tracking and progressing calisthenics skills — think planches, levers, and muscle-ups — without needing equipment beyond a bar and your own bodyweight. It grew out of my own training and is now used by a real community: **1,200+ monthly active users** and a **peak of 1,000 daily active users**, backed by a **33k-follower Instagram audience**.

Most fitness apps assume gym equipment and generic programming. WINGS is built specifically around bodyweight skill progressions — the kind of structured, prerequisite-based training that calisthenics athletes actually follow.

## Features

- 🏋️ Skill-based progression tracking (prerequisite chains, not just "workouts")
- 📱 Installable PWA — works offline, feels native on mobile
- ⚡ Fast, lightweight — built on Vite for near-instant loads
- ☁️ Real-time sync via Firebase (progress persists across devices)
- 🎨 Clean, minimal UI designed to stay out of your way mid-workout

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | React, Vite |
| Backend / Data | Firebase (Auth, Firestore) |
| Hosting | Cloudflare Pages |
| Delivery | Progressive Web App (installable, offline-capable) |

## Why these choices

- **Vite over CRA** — faster dev/build cycles, smaller bundle, better DX for a solo-maintained project shipping frequently.
- **Firebase** — auth + real-time database out of the box meant I could focus engineering time on the training logic instead of backend plumbing.
- **PWA over native app** — one codebase, no app store review cycle, and calisthenics users are frequently checking progress mid-session where "just open the link" beats "download from store."
- **Cloudflare Pages** — free tier, global edge caching, and git-based deploys fit a fast-iterating solo project well.

## Traction

| Metric | Value |
|---|---|
| Instagram community | 33,000+ followers |
| Monthly active users | 1,200+ |
| Peak daily active users | 1,000 |

## Local development

Clone and run locally if you want to explore the codebase or contribute:

```bash
git clone https://github.com/1prcntethan/wings.git
cd wings
npm install
npm run dev
```

You'll need your own Firebase project credentials in a `.env.local` file (see `.env.example`).

## Roadmap

- [ ] Add social/leaderboard features
- [ ] Expand progression library
- [ ] Offline-first data sync improvements

## License

<!-- Pick one: MIT is standard for portfolio/open projects, or "All rights reserved" if you want to keep it closed-source while public -->
This project is licensed under the MIT License — see [LICENSE](./LICENSE) for details.

## Contact

Built by [Ethan Tay](https://github.com/1prcntethan) — [ethan.tay@uw.edu](mailto:ethan.tay@uw.edu) · [LinkedIn](https://linkedin.com/in/ethanjtay)
