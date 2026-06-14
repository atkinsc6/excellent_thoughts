# FairwayOS

A full-featured golf league management web app. Built with React 18 + Vite, Tailwind CSS, and localStorage — no backend required.

## Features

- **Scoring formats** — Stroke play, Stableford, Match Play, Better Ball, Scramble
- **Handicaps** — World Handicap System (WHS) differentials, automatic index calculation
- **Skins** — Gross/net, carryover tracking, per-round and season payouts
- **CTP** — Closest-to-pin weekly and season leaderboards
- **Leaderboard** — Season standings with gross/net/Stableford toggles
- **Schedule & Tee Sheet** — Events calendar, playing groups, printable tee sheets
- **Teams & Ryder Cup** — Team assignment, Ryder Cup match format
- **Awards** — Auto-computed season awards (Season Champ, Birdie Machine, Skin King, etc.)
- **Courses** — 60+ built-in US courses, GHIN search, full manual scorecard entry
- **Player profiles** — Stats, round history, handicap trend
- **PWA** — Installable on mobile, offline-capable

## Tech stack

- React 18 + Vite
- Tailwind CSS v4
- React Router v6
- Recharts
- lucide-react
- date-fns
- vite-plugin-pwa

## Running locally

```bash
git clone https://github.com/atkinsc6/Fairway-OS.git
cd Fairway-OS
npm install
npm run dev
```

Opens at `http://localhost:5173`. Node 18+ required. No environment variables or backend needed.

## Building for production

```bash
npm run build
npm run preview   # preview the built app locally
```

## Deployment

GitHub Actions automatically deploys to GitHub Pages on every push to `main`. The live app is at:

**https://atkinsc6.github.io/Fairway-OS/**

To activate Pages in a fresh fork: go to **Settings → Pages → Source: GitHub Actions**.

## Data persistence

All data is stored in `localStorage` under `fos_{leagueId}_*` keys. Nothing leaves the browser.
