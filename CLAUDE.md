# FairwayOS — Golf League Management App

## Overview
FairwayOS is a full-featured golf league management web application. Direct competitor to FringeGolfers.com. Built with React 18 + Vite, Tailwind CSS, Recharts, React Router v6, and localStorage for all persistence (no backend).

## Tech Stack
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + custom CSS variables (design system)
- **Charts**: Recharts
- **Routing**: React Router v6
- **Icons**: lucide-react
- **Dates**: date-fns
- **Persistence**: localStorage only (no backend)

## Design System

### CSS Variables (defined in `src/index.css`)
```css
--color-bg: #F9F6F0          /* ivory/cream background */
--color-surface: #FFFFFF      /* card surfaces */
--color-primary: #1B4332      /* deep forest green */
--color-primary-light: #2D6A4F
--color-accent: #B8972A       /* brushed gold */
--color-text: #1A1A1A
--color-muted: #6B7280
--color-border: #E5E0D8
--color-danger: #DC2626
```

### Typography
- **Display/Headings**: Cormorant Garamond (Google Fonts, serif)
- **Body/UI**: DM Sans (Google Fonts, sans-serif)

### Component Style
- Subtle shadows (`shadow-sm`, `shadow-md`)
- `rounded-lg` corners
- Gold accent on active/hover states
- Green primary buttons
- Ivory card surfaces

## Data Model

### League
```js
{
  id: string,
  name: string,           // "Westside Golf League"
  season: string,         // "2025"
  homeCoursId: string,
  startDate: string,      // ISO date
  endDate: string,
  scoringFormats: string[], // ['stroke', 'stableford']
  handicapSystem: 'whs' | 'manual' | 'none',
  handicapAllowance: 0.9 | 0.95 | 1.0,
  skinsType: 'gross' | 'net' | 'both',
  skinsEntry: number,     // $ per skin
  ctpEnabled: boolean,
  ctpHoles: number[],     // designated CTP holes
  pointsTable: { place: number, points: number }[],
  inviteCode: string,     // 6-char code
}
```

### Player
```js
{
  id: string,
  name: string,
  email: string,
  role: 'commissioner' | 'player',
  handicapIndex: number,  // WHS index
  teePreference: 'black' | 'blue' | 'white' | 'gold' | 'red',
  roundsPlayed: number,   // derived
  differentials: Differential[],
}
```

### Course
```js
{
  id: string,
  name: string,
  city: string,
  state: string,
  country: string,
  par: number,
  tees: Tee[],
  holes: Hole[],       // 18 holes
  isHomeCourse: boolean,
}
```

### Tee
```js
{
  name: string,        // 'Black', 'Blue', 'White', 'Gold', 'Red'
  rating: number,      // e.g. 74.8
  slope: number,       // e.g. 142
  yardage: number,
}
```

### Hole
```js
{
  number: number,      // 1-18
  par: number,
  strokeIndex: number, // handicap index for this hole (1-18)
  yardages: { [teeName]: number },
}
```

### Round
```js
{
  id: string,
  date: string,        // ISO date
  courseId: string,
  tee: string,         // tee name played
  playerIds: string[], // players in this round
  scores: PlayerScore[], // one per player
  ctpResults: CtpResult[],
  skinsResults: SkinResult[], // per hole
}
```

### PlayerScore
```js
{
  playerId: string,
  grossScores: number[],   // 18 scores
  playingHandicap: number, // course handicap applied for this round
  netScores: number[],     // grossScores[i] - strokes received on hole i
  stablefordPoints: number[], // per hole
  totalGross: number,
  totalNet: number,
  totalStableford: number,
}
```

### CtpResult
```js
{
  hole: number,
  winnerId: string,
  distance: string,   // optional, e.g. "4'2\""
}
```

### SkinResult
```js
{
  hole: number,
  winnerId: string | null,  // null = carryover
  carryover: boolean,
  gross: boolean,           // gross or net skin
}
```

### Differential
```js
{
  roundId: string,
  date: string,
  courseId: string,
  grossScore: number,
  adjustedGross: number,
  differential: number,   // (adjustedGross - rating) * 113 / slope
}
```

## Handicap Calculations (WHS)

### Course Handicap
```
courseHCP = round(handicapIndex × (slope / 113) + (rating - par))
```

### Playing Handicap
```
playingHCP = round(courseHCP × allowance%)
```

### Differential
```
differential = (adjustedGross - courseRating) × 113 / slopeRating
```

### Handicap Index
- Take best 8 differentials from last 20 rounds
- Average × 0.96
- Cap at 54.0

## Skins Logic
- Each hole contested: lowest score wins the skin
- Tie on a hole = carryover (skin added to next hole)
- Net skins: use net scores for comparison
- Payout = (number of skins won) × ($ per skin entry × players in group)

## Scoring
- **Net score**: gross − playing handicap strokes received on that hole
- **Stableford**: 2 + (par − net score); minimum 0 per hole
- Stroke index determines which holes receive strokes (highest priority = index 1)

## File Structure
```
src/
  components/
    layout/
      Sidebar.jsx        - Desktop left nav
      TopBar.jsx         - Page header / breadcrumb
      MobileNav.jsx      - Bottom tab bar (mobile)
    ui/
      Button.jsx
      Card.jsx
      Modal.jsx
      Table.jsx
      Badge.jsx
      Input.jsx
      Select.jsx
    screens/
      Dashboard.jsx
      ScorecardEntry.jsx
      Leaderboard.jsx
      SkinsTracker.jsx
      CtpTracker.jsx
      HandicapTracker.jsx
      Members.jsx
      Courses.jsx
      LeagueSettings.jsx
  data/
    mockData.js          - All seed data (players, rounds, scores)
    courses.js           - 20+ real USA courses
  hooks/
    useLeague.js         - localStorage read/write for all state
    useHandicap.js       - WHS differential calculations
  utils/
    scoring.js           - gross/net/stableford calculations
    skins.js             - skins and carryover logic
  App.jsx
  main.jsx
CLAUDE.md
```

## Module List
1. **Dashboard** — Season stats bar, recent round card, standings table, handicap trend chart, upcoming event
2. **Scorecard Entry** — 18-hole grid, inline editable cells, auto-calc net/stableford, skins per hole, CTP
3. **Leaderboard** — Season/single round toggle, gross/net/stableford toggle, sortable table, stat cards
4. **Skins Tracker** — Gross/net toggle, weekly result cards, season leaderboard, carryover badges
5. **CTP Tracker** — Per-round results, season leaderboard
6. **Handicap Tracker** — Differential history table, WHS index calculation, trend chart, manual override
7. **Members** — Roster table, invite modal (6-char code), edit/remove player
8. **Courses** — Searchable list, add course modal, set home course, course detail view
9. **League Settings** — Name, dates, scoring formats, handicap system, skins config, points table

## localStorage Keys
- `fairwayos_league` — league settings object
- `fairwayos_players` — array of players
- `fairwayos_rounds` — array of rounds
- `fairwayos_courses` — array of courses
- `fairwayos_initialized` — boolean, true after first seed

## Development
```bash
npm install
npm run dev        # starts on http://localhost:5173
npm run build
```
