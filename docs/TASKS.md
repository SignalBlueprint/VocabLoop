# VocabLoop Task Backlog

## Legend
- **Priority:** P0 (critical MVP), P1 (important), P2 (nice-to-have)
- **Status:** TODO, IN_PROGRESS, PARTIAL, DONE, BLOCKED
- **Area:** Core, UI, Data, Review, Library, Stats, Import/Export, Spanish, Audio, Verbs

---

## P0 Tasks (Critical MVP)

| ID | Title | Status | Area | Files | Acceptance Criteria | Notes |
|----|-------|--------|------|-------|---------------------|-------|
| P0-01 | Initialize Vite + React + TypeScript project | DONE | Core | package.json, vite.config.ts, tsconfig.json | `npm run dev` starts dev server | - |
| P0-02 | Setup Tailwind CSS | DONE | Core | vite.config.ts, src/index.css | Tailwind classes work in components | Using @tailwindcss/vite |
| P0-03 | Define data models (Card, ReviewLog) | DONE | Data | src/types/index.ts | TypeScript interfaces match spec | All card fields defined |
| P0-04 | Create IndexedDB wrapper | DONE | Data | src/db/index.ts | CRUD operations work, data persists | Simple Promise-based API |
| P0-05 | Implement Card CRUD operations | DONE | Data | src/db/cards.ts | Add, get, update, delete cards | Uses IndexedDB wrapper |
| P0-06 | Implement ReviewLog operations | DONE | Data | src/db/reviews.ts | Log reviews, query by date | - |
| P0-07 | Create SM-2 scheduling module | DONE | Review | src/scheduler/index.ts | Pure functions, testable logic | intervalDays, ease updates |
| P0-08 | Build Add Card form | DONE | UI | src/components/AddCard.tsx | Quick-add mode, Enter-to-save | Mobile-first design |
| P0-09 | Build Review Session page | DONE | UI | src/pages/Review.tsx | Show front → reveal → grade | Keyboard shortcuts |
| P0-10 | Implement grade buttons | DONE | Review | src/components/GradeButtons.tsx | Again/Hard/Good/Easy buttons | 1/2/3/4 shortcuts |
| P0-11 | Build Home page with due count | DONE | UI | src/pages/Home.tsx | "Due now: N", "Start review" | Empty state when 0 |
| P0-12 | Add navigation/routing | DONE | UI | src/App.tsx | Home, Add, Review, Library pages | Simple state-based routing |
| P0-13 | Toast notification system | DONE | UI | src/components/Toast.tsx | Confirmation on card add | Auto-dismiss |
| P0-14 | Handle empty/loading/error states | DONE | UI | various | Graceful UX for all states | - |

---

## P1 Tasks (Important)

| ID | Title | Status | Area | Files | Acceptance Criteria | Notes |
|----|-------|--------|------|-------|---------------------|-------|
| P1-01 | Build Library page | DONE | Library | src/pages/Library.tsx | List all cards | Scrollable list |
| P1-02 | Add search to Library | DONE | Library | src/pages/Library.tsx | Filter by Spanish/English/tags | Debounced input |
| P1-03 | Edit card modal | DONE | Library | src/components/EditCard.tsx | Edit all fields, save changes | Modal with all fields |
| P1-04 | Delete card with confirmation | DONE | Library | src/pages/Library.tsx | Confirm before delete | Inline confirmation |
| P1-05 | Bulk delete (multi-select) | DONE | Library | src/pages/Library.tsx | Select multiple, delete all | Checkbox UI, confirm dialog |
| P1-06 | Stats dashboard | DONE | Stats | src/pages/Stats.tsx | Due, reviewed today, streak, learned | - |
| P1-07 | Calculate streak correctly | DONE | Stats | src/utils/streak.ts | Days with ≥1 review | Handle timezone |
| P1-08 | Export deck as JSON | DONE | Import/Export | src/utils/export.ts | Download JSON file | Include all cards |
| P1-09 | Import JSON (merge/replace) | DONE | Import/Export | src/utils/import.ts | Parse, validate, store | User chooses mode |
| P1-10 | Backup reminder UI | DONE | Import/Export | src/components/BackupReminder.tsx, src/pages/Home.tsx | Periodic reminder | 7-day interval, dismissable |
| P1-11 | Add example sentence fields to form | DONE | UI | src/components/AddCard.tsx | exampleEs, exampleEn, notes | Optional fields |
| P1-12 | Show examples in review | DONE | Review | src/pages/Review.tsx | Display after reveal | If present |
| P1-13 | Tag input component | DONE | UI | src/components/TagInput.tsx | Add/remove tags | Chip-style, suggestions |
| P1-14 | Filter Library by tag | DONE | Library | src/pages/Library.tsx | Tag dropdown filter | Pill buttons |
| P1-15 | Responsive mobile layout | DONE | UI | index.html, src/index.css | Usable on phone screens | Touch targets, safe areas |

---

## P2 Tasks (Nice-to-Have / Phase 2-3)

| ID | Title | Status | Area | Files | Acceptance Criteria | Notes |
|----|-------|--------|------|-------|---------------------|-------|
| P2-01 | Create Top 1000 words JSON | DONE | Spanish | src/data/frequency.json | 500+ entries with Spanish/English | Curated list |
| P2-02 | Frequency list browser page | DONE | Spanish | src/pages/FrequencyList.tsx | Browse, search list | - |
| P2-03 | Multi-select add from frequency list | DONE | Spanish | src/pages/FrequencyList.tsx | Select and add to deck | Skip duplicates |
| P2-04 | Cloze card type support | DONE | Data | src/types/index.ts | CLOZE type in Card | clozeSentence, clozeWord fields |
| P2-05 | Cloze review display | DONE | Review | src/pages/Review.tsx | Show blank, reveal word | Highlights answer in green |
| P2-06 | Create cloze from sentence | DONE | UI | src/pages/ClozeCreator.tsx | Select word to blank | Click-to-select UI |
| P2-07 | Speech synthesis integration | DONE | Audio | src/utils/speech.ts | Play Spanish audio | es-ES voice |
| P2-08 | Speak button in review | DONE | Audio | src/pages/Review.tsx | 🔊 button plays audio | With slow mode |
| P2-09 | Slow mode toggle | DONE | Audio | src/pages/Review.tsx | Reduce speech rate | Checkbox toggle |
| P2-10 | Verb conjugation data | DONE | Verbs | src/data/verbs.json | Common verbs, present tense | 15 verbs |
| P2-11 | Verb micro-mode page | DONE | Verbs | src/pages/VerbMode.tsx | 10 questions per day | - |
| P2-12 | Verb conjugation review flow | DONE | Verbs | src/pages/VerbMode.tsx | Infinitive + pronoun → reveal | - |
| P2-13 | Verb streak tracking | DONE | Verbs | src/utils/verbStreak.ts | Separate streak | localStorage-based tracking |
| P2-14 | Bulk tag multiple cards | DONE | Library | src/pages/Library.tsx | Select and tag | TagInput in select mode |
| P2-15 | Simple charts for stats | DONE | Stats | src/pages/Stats.tsx | Visual representation | 7-day bar chart |
| P2-16 | Dark mode | DONE | UI | src/hooks/useDarkMode.ts, src/App.tsx | Toggle theme | Header/nav dark mode |
| P2-17 | PWA manifest + service worker | DONE | Core | public/manifest.json, sw.js | Installable | Network-first caching |
| P2-18 | Undo delete action | DONE | Library | src/pages/Library.tsx | Restore deleted card | Toast with undo action |

---

## Completed Tasks

| ID | Title | Completed Date | Notes |
|----|-------|----------------|-------|
| P0-01 | Initialize Vite + React + TypeScript project | 2026-01-04 | Vite 7.x, React 19 |
| P0-02 | Setup Tailwind CSS | 2026-01-04 | Using @tailwindcss/vite plugin |
| P0-03 | Define data models (Card, ReviewLog) | 2026-01-04 | Card, ReviewLog, Grade types |
| P0-04 | Create IndexedDB wrapper | 2026-01-04 | Generic CRUD operations |
| P0-05 | Implement Card CRUD operations | 2026-01-04 | - |
| P0-06 | Implement ReviewLog operations | 2026-01-04 | - |
| P0-07 | Create SM-2 scheduling module | 2026-01-04 | calculateSchedule, applySchedule |
| P0-08 | Build Add Card form | 2026-01-04 | Quick-add with Enter key |
| P0-09 | Build Review Session page | 2026-01-04 | Keyboard shortcuts work |
| P0-10 | Implement grade buttons | 2026-01-04 | Shows interval previews |
| P0-11 | Build Home page with due count | 2026-01-04 | - |
| P0-12 | Add navigation/routing | 2026-01-04 | Tab-based navigation |
| P0-13 | Toast notification system | 2026-01-04 | useToast hook |
| P0-14 | Handle empty/loading/error states | 2026-01-04 | - |
| P1-01 | Build Library page | 2026-01-04 | - |
| P1-02 | Add search to Library | 2026-01-04 | Filters by all text fields |
| P1-04 | Delete card with confirmation | 2026-01-04 | Inline confirm/cancel |
| P1-03 | Edit card modal | 2026-01-04 | Modal with all card fields |
| P1-06 | Stats dashboard | 2026-01-04 | Due, today, streak, learned |
| P1-07 | Calculate streak correctly | 2026-01-04 | - |
| P1-08 | Export deck as JSON | 2026-01-04 | - |
| P1-09 | Import JSON (merge/replace) | 2026-01-04 | Modal with merge/replace options |
| P1-11 | Add example sentence fields to form | 2026-01-04 | Optional expandable section |
| P1-12 | Show examples in review | 2026-01-04 | Already implemented in Review.tsx |
| P2-01 | Create Top 1000 words JSON | 2026-01-04 | 500+ words in frequency.json |
| P2-02 | Frequency list browser page | 2026-01-04 | Multi-select add |
| P2-03 | Multi-select add from frequency list | 2026-01-04 | Skip duplicates |
| P2-07 | Speech synthesis integration | 2026-01-04 | speak(), initVoices() |
| P2-08 | Speak button in review | 2026-01-04 | - |
| P2-09 | Slow mode toggle | 2026-01-04 | - |
| P2-10 | Verb conjugation data | 2026-01-04 | 15 verbs with present tense |
| P2-11 | Verb micro-mode page | 2026-01-04 | 10 questions per session |
| P2-12 | Verb conjugation review flow | 2026-01-04 | - |
| P1-05 | Bulk delete (multi-select) | 2026-01-04 | Select all/deselect all, confirm dialog |
| P1-10 | Backup reminder UI | 2026-01-04 | 7-day interval, localStorage tracking |
| P2-04 | Cloze card type support | 2026-01-04 | clozeSentence, clozeWord fields |
| P2-05 | Cloze review display | 2026-01-04 | Blanks shown, answer highlighted |
| P2-06 | Create cloze from sentence | 2026-01-04 | Click-to-select word UI |
| P2-13 | Verb streak tracking | 2026-01-04 | localStorage-based, shown in VerbMode |
| P1-13 | Tag input component | 2026-01-04 | Chip-style UI with autocomplete suggestions |
| P1-14 | Filter Library by tag | 2026-01-04 | Pill button filters |
| P2-16 | Dark mode | 2026-01-04 | Toggle in header, localStorage persistence |
| P1-15 | Responsive mobile layout | 2026-01-04 | Touch targets, safe areas, mobile meta tags |
| P2-14 | Bulk tag multiple cards | 2026-01-04 | TagInput in select mode with Apply button |
| P2-15 | Simple charts for stats | 2026-01-04 | 7-day bar chart for review history |
| P2-17 | PWA manifest + service worker | 2026-01-04 | Network-first caching strategy |
| P2-18 | Undo delete action | 2026-01-04 | Toast with Undo action button |

---

## Blocked Tasks

| ID | Title | Blocked By | Notes |
|----|-------|------------|-------|
| - | - | - | - |
