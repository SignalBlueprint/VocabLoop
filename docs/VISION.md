---
repo: VocabLoop
scan_date: 2026-01-06
status: draft
---

# VocabLoop Vision Document

## Foundation Read

VocabLoop is a privacy-first Progressive Web App that teaches Spanish vocabulary through spaced repetition (SM-2 algorithm) and gamification. The core loop: users add or import vocabulary cards, review them when the scheduler says they're due, grade their recall (again/hard/good/easy), and watch intervals stretch as words move from "New" to "Mastered" across five progression stages. The value delivery is immediate—a 20-card starter deck loads automatically, text-to-speech provides native pronunciation, and XP/achievements/streaks transform repetitive memorization into a game where forgetting means falling behind.

## Architecture Snapshot

### Stack
- **Frontend:** React 19 + TypeScript 5.9 (strict mode), Vite 7, Tailwind CSS 4
- **Audio:** Web SpeechSynthesis API (native browser TTS)
- **Testing:** Vitest 4.0 with 200 passing unit tests
- **Tooling:** ESLint 9, no external UI libraries

### Data
- **Primary Store:** IndexedDB with 3 object stores (`cards`, `reviews`, `settings`)
- **Preference Store:** localStorage for UI state (dark mode, sound, immersion)
- **Key Models:**
  - `Card` (SM-2 fields: ease, interval, reps, dueAt, lapses + type: BASIC/CLOZE/VERB)
  - `ReviewLog` (complete history with grade, previous/new intervals)
- **Static Data:** 117 starter cards, 70+ verb conjugations, 500-word frequency list

### Patterns
- **Architecture:** Modular SPA with state-based routing (no React Router)
- **State Management:** Local component state + IndexedDB as source of truth
- **API Style:** Direct IndexedDB access through abstraction layer (`/src/db/`)
- **Gamification Engine:** XP system (30 levels), 20+ achievements, dual streaks, weekly challenges

### Gaps
- **No cloud sync** — data lives only in browser (main risk)
- **No authentication** — can't sync across devices
- **No CI/CD pipeline** — GitHub Actions not configured
- **No E2E tests** — only unit tests for utilities
- **Limited verb coverage** — no subjunctive, conditional, imperative tenses

## Latent Potential

**80% Built But Not Exposed:**
- **ReviewLog is a goldmine** — every review is timestamped with grade and interval changes, but there's no forgetting curve visualization, no "optimal study time" analysis, no "learning velocity" trend line. The data exists; the insights don't.
- **Tag system is underutilized** — cards have tags, but there's no tag-vs-tag performance comparison, no "your weakest category" surfacing, no smart recommendations based on tag success rates.
- **Mastery levels enable adaptive curriculum** — the 5-stage progression (New→Learning→Reviewing→Known→Mastered) could power graduated difficulty, but currently all modes treat cards equally.

**Abstractions Ready for Extension:**
- **Scheduler module** is cleanly separated — could swap SM-2 for SM-17, FSRS, or a custom ML-based algorithm without touching UI code
- **Game mode architecture** already handles 9 modes — adding new game types is plug-and-play
- **DB layer abstraction** makes IndexedDB→PostgreSQL sync feasible without rewriting queries

**Data Collected But Underused:**
- Study time tracking captures session durations but doesn't suggest optimal session length
- Achievement unlock timestamps could show engagement patterns but aren't analyzed
- Card difficulty (lapses, ease) could rank curriculum but doesn't inform card selection

---

## Horizon 1: Quick Wins (Days)

### 1. Forgetting Curve Visualizer
Picture this: you tap a struggling card and see a small chart showing its retention over time—a decaying curve with review markers where it bounced back up, and a projection showing when you'll likely forget it again. For power users, this transforms "trust the algorithm" into "understand your brain." The data already lives in ReviewLog; this is pure visualization work. Users finally see *why* they're reviewing a card today instead of next week.

### 2. "Weakest Hour" Insights
After two weeks of reviews, the Stats page gains a new panel: a heatmap showing your success rate by hour of day. "You get 78% right at 8am but only 61% at 10pm—morning person detected." Below it, a single actionable line: "Consider shifting late-night reviews to early morning." This uses existing ReviewLog timestamps and adds a 50-line analysis function. Users discover their optimal learning window without being told to track it manually.

### 3. Tag Performance Showdown
The Library page adds a "Compare Tags" mode. Select two tags—say "verbs" and "food"—and see side-by-side metrics: average ease, success rate, time to mastery, most-forgotten cards. Suddenly you know that food vocabulary sticks but verbs are bleeding out. The UI is a split-screen dashboard; the data is already indexed by tag. Users stop wondering "what should I focus on?" and start seeing the answer.

---

## Horizon 2: System Expansions (Weeks)

### 1. Cloud Sync with Conflict Resolution
You open VocabLoop on your laptop and see cards you added on your phone yesterday. A small sync indicator pulses in the corner; a banner shows "3 cards updated from mobile." Behind the scenes: a lightweight backend (Supabase or Firebase) stores encrypted IndexedDB snapshots, authenticated via email magic link. Conflict resolution follows "last write wins" with a recoverable merge history. The PWA finally becomes truly cross-device. Users stop fearing "clear browser data" because their 500-card deck survives in the cloud.

### 2. Multiplayer Sprint Mode
Friday night. You share a room code with a friend learning Spanish. For 60 seconds, the same cards flash to both of you—first to type the correct translation scores a point. Real-time WebSocket leaderboard shows who's ahead. At the end: "You beat Maria 12-9! She struggled with 'nevertheless' too." Suddenly vocabulary review has social stakes. The infrastructure: a thin Node.js relay server, presence detection, and score synchronization. Users who've plateaued find new motivation in competition.

### 3. Adaptive Curriculum Engine
Instead of reviewing whatever's due, users can start a "Smart Session" that dynamically mixes cards: 60% due reviews, 25% weak-tag reinforcement, 15% new cards from the frequency list. The engine watches your in-session performance—if you miss two verbs in a row, it inserts an easier verb to rebuild confidence. Session ends with: "You struggled with preterite tense today—tomorrow's session will include more practice." The scheduler abstraction makes this possible; the challenge is the recommendation algorithm tuning.

---

## Horizon 3: Blue Sky

### 1. Conversational Practice Mode
You tap "Chat" and a simulated Spanish-speaking character greets you: "Hola, soy tu vecino nuevo. Acabo de mudarme aquí." You type a response using vocabulary you've learned; the AI character responds naturally, gently introducing one new word per exchange that matches your current level. Words you use correctly in conversation get their intervals boosted; words you stumble on get flagged for extra review. The character has a personality—maybe they're a curious neighbor, a café owner, a travel companion. Vocabulary stops being isolated flashcards and becomes tools for communication. Under the hood: an LLM with guardrails to stay at the user's level, tight integration with the card database to track vocabulary exposure, and a "conversation log" that becomes exportable practice material.

### 2. Pronunciation Challenge Mode
A Spanish audio clip plays: "¿Quieres ir al cine?" You record yourself repeating it. The app shows a waveform comparison—your prosody overlaid on the native speaker's. A score appears: "Rhythm: 85%, Stress: 72%, Vowel clarity: 91%." Problem spots are highlighted: "Your 'cine' sounds like 'seen-ay'—try closing the 'e' sound." Over weeks, users track their accent improvement. No vocabulary knowledge required—this is pure pronunciation training, complementing the cognitive work of flashcards. Technically: Web Audio API for recording, a pronunciation scoring model (Mozilla's DeepSpeech or a cloud ASR with phoneme alignment), and a new data store for pronunciation attempts.

---

## Moonshot

**VocabLoop Becomes a Language Learning Operating System**

Imagine VocabLoop three years from now: it's no longer "a flashcard app" but the connective tissue for your entire Spanish learning journey. You're reading a Spanish news article in the browser—a VocabLoop extension highlights words from your deck in green (known), yellow (learning), and underlines words you've never seen. Click an unknown word: it's instantly added to your deck with context from the article. Watching a Spanish YouTube video? The companion app shows real-time subtitles with your vocabulary overlaid—words you've mastered are dimmed, words due for review pulse gently. Your progress syncs to a public profile where you can see friends' streaks, compare weekly XP, and join "vocabulary clubs" focused on specific domains (medical Spanish, legal Spanish, travel Spanish).

The core SRS engine becomes an embeddable widget—other language apps can plug into VocabLoop's scheduler. You stop "using VocabLoop" and start "having VocabLoop everywhere." A browser extension, a mobile companion, a desktop menubar app, embedded widgets in language exchange platforms. The 500-word frequency list becomes a 50,000-word corpus with domain tags, difficulty ratings, and regional variants. The gamification layer evolves into a skill tree: unlock "Conversationalist" by completing 100 chat sessions, "Grammar Geek" by mastering all verb tenses, "Culture Maven" by learning 200 idioms.

Resources unlimited, this is what VocabLoop becomes: the invisible infrastructure layer that makes Spanish vocabulary appear when you need it, reinforces it when you'd forget it, and celebrates every step from "¿Qué?" to fluency.

---

## Next Move

### Most Promising Idea: Forgetting Curve Visualizer

**Why this one?** It's the rare feature that's high-impact yet low-effort. The data already exists in ReviewLog—every review is timestamped with grade and interval changes. This is pure frontend work: a small chart component that takes a card's review history and plots retention decay with review bounce-backs. It transforms the abstract "spaced repetition" into something visceral and personal. Users who see their forgetting curve become more engaged with the system because they understand *why* it works. It also differentiates VocabLoop from Anki (which buries this data) and Duolingo (which hides it entirely).

### First Experiment (< 1 day)

Build a prototype forgetting curve for a single card:
1. Add a "📈" button to the card detail view in Library
2. Query ReviewLog for that card's history
3. Plot a simple line chart: X-axis is days since card creation, Y-axis is estimated retention (calculate from intervals and grades using SM-2's retention formula)
4. Mark review events as dots on the curve
5. Ship it behind a feature flag and test with 5 users

**Success metric:** Do users who see the curve review that card within 24 hours at higher rates than those who don't?

### One Question That Would Sharpen the Vision

**"What causes users to abandon VocabLoop after the first week?"**

The app has strong Day-1 experience (starter deck, onboarding, immediate gratification). But what happens on Day 8 when the novelty fades and 47 cards are due? Understanding the dropout moment—is it overwhelm? boredom? lack of variety?—would prioritize the roadmap. If it's overwhelm, the Adaptive Curriculum Engine jumps to Horizon 1. If it's boredom, Multiplayer Sprint Mode becomes urgent. If it's lack of visible progress, the Forgetting Curve Visualizer is exactly right. The answer determines everything.
