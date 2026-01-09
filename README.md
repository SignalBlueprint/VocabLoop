<!-- SB:APP
name: VocabLoop
slug: vocabloop
type: web
health: green
owner: Grif
last_verified: 2026-01-06
-->

# VocabLoop

[![Tests](https://img.shields.io/badge/tests-200%20passing-brightgreen)](https://github.com/SignalBlueprint/VocabLoop)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

<!-- SB:SECTION:STATUS -->
## Status

```
[█████████████████░░░] 88% complete
```

**Current Focus:** Horizon 3 (Blue Sky) & Moonshot
**Last Updated:** 2026-01-09

| Section | Progress | Tasks |
|---------|----------|-------|
| Horizon 1 | `██████████` 100% | 64/64 |
| Horizon 2 | `█████████░` 97% | 138/143 |
| Horizon 3 | `████████░░` 89% | 75/84 |
| Moonshot  | `██████░░░░` 66% | 63/95 |

See [docs/PROGRESS.md](docs/PROGRESS.md) for full details.

**Note:** Fully functional PWA with 339+ passing tests. Cloud sync now available!
<!-- SB:SECTION:STATUS:END -->

**Master Spanish vocabulary with science-backed spaced repetition, engaging mini-games, and comprehensive progress tracking.**

A feature-rich, offline-first PWA for learning Spanish. Built with React 19 + TypeScript + Tailwind CSS 4.

---

## Why VocabLoop?

- **Learn Smarter** - SM-2 algorithm schedules reviews at optimal intervals for long-term retention
- **Stay Motivated** - XP, achievements, streaks, and weekly challenges keep you coming back
- **Multiple Learning Modes** - 9 different ways to practice: flashcards, quizzes, games, listening, and more
- **Works Offline** - All data stored locally, no account required, your privacy respected
- **Start Instantly** - Pre-built starter decks get you learning in seconds

---

## Key Features

### 9 Learning Modes

| Mode | Description |
|------|-------------|
| **Review** | Core spaced repetition with 4-button grading (Again/Hard/Good/Easy) |
| **Verb Drills** | Conjugate 70+ verbs across present, preterite, and future tenses |
| **Quiz** | Multiple choice questions to test your knowledge |
| **Matching** | Memory-style card matching game |
| **Typing** | Type translations to reinforce spelling and recall |
| **Speed Round** | Fast-paced drills for quick thinking |
| **Listening** | Audio comprehension with Spanish text-to-speech |
| **Custom Study** | Build focused sessions by tag, mastery level, or card type |
| **Cloze Creator** | Generate fill-in-the-blank sentence cards |

### Smart Spaced Repetition

- **SM-2 Algorithm** - Scientifically-proven scheduling for optimal memory retention
- **Interval Previews** - See exactly when you'll review each card next
- **Bidirectional Practice** - Spanish→English, English→Spanish, or Mixed mode
- **Mastery Tracking** - Cards progress through 5 levels: New → Learning → Reviewing → Known → Mastered
- **Undo Reviews** - Made a mistake? Undo within 90 seconds

### Gamification & Motivation

| Feature | Details |
|---------|---------|
| **XP System** | Earn 2-25 XP per review with streak bonuses |
| **30 Levels** | Progress from Novice to Maestro |
| **Weekly Challenges** | 3 rotating challenges with XP rewards |
| **15+ Achievements** | Bronze, Silver, Gold, and Platinum tiers |
| **Dual Streaks** | Separate review and verb practice streaks |
| **Daily Goals** | Set targets from 1-100 cards with progress ring |
| **Daily Quests** | Fresh objectives each day |
| **Streak Insurance** | Protect your streak when life gets busy |

### Rich Analytics

- **12-Week Activity Graph** - GitHub-style contribution heatmap
- **Mastery Distribution** - Visual breakdown of card progress
- **Weak Areas Report** - Identify your bottom 10 struggling cards and tags
- **Study Time Tracking** - Daily, weekly, and all-time statistics
- **Success Rate Metrics** - Track improvement over time
- **Streak Risk Alerts** - Get warned before you lose your streak

### Spanish-Specific Tools

- **70+ Verb Conjugations** - Present, preterite, and future tenses with full tables
- **Top 500 Frequency List** - Most common Spanish words, ready to import
- **Text-to-Speech** - Native Spanish pronunciation with slow mode
- **Immersion Mode** - Hide English translations for deeper practice
- **Word of the Day** - Daily curated vocabulary with examples

### Card Management

- **3 Card Types** - Basic vocabulary, cloze (fill-in-blank), and verb conjugation
- **Smart Search** - Find cards by Spanish, English, or tags
- **Mastery Filters** - View cards by learning stage
- **Bulk Operations** - Multi-select, tag, and delete
- **Tag System** - Organize vocabulary by topic with autocomplete

### Import & Export

- **6 Starter Decks** - 117 pre-made cards (phrases, numbers, food, travel, colors, family)
- **JSON Backup** - Full export with all metadata and progress
- **Batch Import** - Paste word lists with flexible separators (tab, comma, semicolon, colon)
- **Merge or Replace** - Choose how to handle duplicates
- **Weekly Backup Reminders** - Never lose your progress

### Offline-First Design

- **No Account Required** - Start learning immediately
- **IndexedDB Storage** - All data persists locally in your browser
- **PWA Ready** - Install as an app on mobile or desktop
- **Offline Indicator** - Always know your connection status
- **Works Anywhere** - Study on planes, trains, or off-grid

---

## Quick Start

New users automatically receive a **20-card starter deck** and a guided onboarding tutorial. Start reviewing immediately or import additional decks from the home screen.

### Installation

```bash
# Prerequisites: Node.js 18+

# Clone the repository
git clone https://github.com/SignalBlueprint/VocabLoop.git
cd VocabLoop

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests (200 tests)
npm test
```

<!-- SB:SECTION:HOW_TO_RUN -->
## How to Run

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start dev server (Vite) |
| `npm run build` | TypeScript compile + production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage |
| `npm run lint` | Lint with ESLint |
<!-- SB:SECTION:HOW_TO_RUN:END -->

<!-- SB:SECTION:ENV -->
## Environment Variables

No environment variables required. App runs entirely client-side with IndexedDB storage.
<!-- SB:SECTION:ENV:END -->

<!-- SB:SECTION:ENTRY_POINTS -->
## Entry Points

| Entry | Path | Description |
|-------|------|-------------|
| Main | `src/main.tsx` | React app bootstrap |
| App | `src/App.tsx` | Root component with routing |
| Index HTML | `index.html` | HTML entry with PWA manifest |
| Service Worker | `public/sw.js` | Offline caching |

### Routes (in-app)

| Route | Page | Description |
|-------|------|-------------|
| Home | `src/pages/Home.tsx` | Dashboard with XP, streaks, challenges |
| Review | `src/pages/Review.tsx` | Core SRS review engine |
| Library | `src/pages/Library.tsx` | Card management |
| Stats | `src/pages/Stats.tsx` | Analytics and export/import |
| Quiz | `src/pages/Quiz.tsx` | Multiple choice game |
| VerbMode | `src/pages/VerbMode.tsx` | Verb conjugation practice |
| MatchingGame | `src/pages/MatchingGame.tsx` | Memory matching game |
| TypingChallenge | `src/pages/TypingChallenge.tsx` | Type-the-answer game |
| SpeedRound | `src/pages/SpeedRound.tsx` | Fast-paced drills |
| ListeningMode | `src/pages/ListeningMode.tsx` | Audio comprehension |
| CustomStudy | `src/pages/CustomStudy.tsx` | Build focused sessions |
| ClozeCreator | `src/pages/ClozeCreator.tsx` | Fill-in-blank generator |
| FrequencyList | `src/pages/FrequencyList.tsx` | Top 500 word browser |
<!-- SB:SECTION:ENTRY_POINTS:END -->

---

## Controls

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Reveal card answer |
| `1` | Grade: Again (forgot) |
| `2` | Grade: Hard |
| `3` | Grade: Good |
| `4` | Grade: Easy |
| `?` | Show all shortcuts |
| `Esc` | Close modals |

### Mobile Gestures

| Swipe | Action |
|-------|--------|
| Left | Again |
| Right | Good |
| Up | Easy |
| Down | Hard |

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React 19 + TypeScript 5.9 |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 4 |
| Persistence | IndexedDB |
| Audio | Web SpeechSynthesis API |
| Testing | Vitest |

---

## Project Structure

```
src/
├── pages/              # 14 main screens
│   ├── Home            # Dashboard with streaks, XP, challenges
│   ├── Review          # Core SRS review engine
│   ├── Library         # Card management and search
│   ├── Stats           # Analytics and data export/import
│   ├── VerbMode        # Verb conjugation practice
│   ├── Quiz            # Multiple choice game
│   ├── MatchingGame    # Memory matching game
│   ├── TypingChallenge # Type-the-answer game
│   ├── SpeedRound      # Fast-paced drills
│   ├── ListeningMode   # Audio comprehension
│   ├── CustomStudy     # Build focused sessions
│   ├── ClozeCreator    # Fill-in-blank card generator
│   └── FrequencyList   # Top 500 word browser
│
├── components/         # 25+ reusable UI components
│   ├── FlipCard        # 3D card flip animation
│   ├── GradeButtons    # Review grading interface
│   ├── XPDisplay       # Level and XP progress
│   ├── Achievements    # Achievement badges and notifications
│   ├── ContributionGraph # Activity heatmap
│   └── ...more
│
├── scheduler/          # SM-2 spaced repetition algorithm
├── db/                 # IndexedDB data layer
├── hooks/              # Custom React hooks (dark mode, swipe, online status)
├── utils/              # Business logic (XP, achievements, streaks, speech)
├── types/              # TypeScript interfaces
│
└── data/               # Static vocabulary data
    ├── starterDecks.json   # 117 pre-made cards in 6 decks
    ├── verbs.json          # 70+ verbs with full conjugations
    └── frequency.json      # Top 500 Spanish words
```

---

## Data Storage

All data is stored locally in your browser using IndexedDB:

| Data Type | Contents |
|-----------|----------|
| Cards | Vocabulary with SRS metadata and mastery tracking |
| Review Logs | Complete history for statistics and streak calculation |
| Settings | Dark mode, daily goals, review preferences |
| Progress | XP, levels, achievements, challenges, study time |

**No backend required.** Data persists across sessions and works completely offline.

### Important Notes

- **Backup regularly** - Clearing browser data deletes your cards (weekly reminders will prompt you)
- **Best browsers** - Chrome and Edge provide optimal text-to-speech support
- **Voice quality** - macOS generally has better Spanish voices than Windows

---

## User Experience Features

- **Dark Mode** - Full app theme support, persisted across sessions
- **Onboarding** - 5-step guided tutorial for new users
- **Toast Notifications** - Contextual feedback with action buttons
- **Confetti Celebrations** - Achievement and milestone animations
- **Loading Skeletons** - Smooth async operation feedback
- **Mobile-First Design** - Optimized for touch and small screens

---

## Roadmap: UI/UX Improvements

The following enhancements would improve user experience and bring key features to the forefront:

### High Priority - Surface Best Features

| Improvement | Benefit |
|-------------|---------|
| **Quick Actions on Home** | Add prominent "Start Quiz" and "Practice Verbs" buttons alongside Review to showcase mini-games immediately |
| **Progress Summary Card** | Show weekly stats preview (cards reviewed, XP earned, streak) at top of home screen |
| **Feature Discovery Tooltips** | Highlight underutilized features like Immersion Mode, Custom Study, and Listening Mode for new users |
| **Learning Mode Carousel** | Replace grid icons with a swipeable carousel showing mode descriptions and card counts |

### Medium Priority - Enhanced Engagement

| Improvement | Benefit |
|-------------|---------|
| **Session Streak Counter** | Show consecutive correct answers during review with celebration at milestones (5, 10, 15) |
| **Daily Recap Modal** | End-of-day summary showing XP earned, cards reviewed, streaks maintained |
| **Smart Study Suggestions** | "You have 15 weak cards - start a focused session?" prompts based on analytics |
| **Achievement Progress Bars** | Show progress toward next achievement tier on home screen |

### Visual Polish

| Improvement | Benefit |
|-------------|---------|
| **Animated XP Gains** | Float "+10 XP" animations when earning points during review |
| **Card Flip Sound** | Subtle audio feedback during card reveal (already supported, could be default-on) |
| **Mastery Badge on Cards** | Show colored mastery indicator (emerald/amber/red) directly on library cards |
| **Streak Fire Animation** | Animated flame icon for active streaks instead of static emoji |

### Accessibility & Usability

| Improvement | Benefit |
|-------------|---------|
| **Larger Touch Targets** | Increase mini-game grid buttons for easier mobile tapping |
| **High Contrast Mode** | Alternative color scheme for users with visual impairments |
| **Reduced Motion Option** | Disable confetti and animations for motion-sensitive users |
| **Voice Commands** | "Again", "Good", "Easy" voice input for hands-free review |

### Data & Insights

| Improvement | Benefit |
|-------------|---------|
| **Learning Velocity Graph** | Chart showing cards mastered per week over time |
| **Tag Performance Dashboard** | Compare success rates across vocabulary categories |
| **Optimal Review Time** | Suggest best time of day based on past performance patterns |
| **Export to Anki** | Allow deck export in Anki-compatible format for users switching tools |

---

<!-- SB:SECTION:NEXT_UPGRADES -->
## Next Upgrades

1. **Add cloud sync option** - Prevent data loss risk by offering optional account-based backup
2. **Export to Anki format** - Allow users to export decks in Anki-compatible format for portability
3. **Add high contrast mode** - Improve accessibility for users with visual impairments
<!-- SB:SECTION:NEXT_UPGRADES:END -->

---

## License

MIT
