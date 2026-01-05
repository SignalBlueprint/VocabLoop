# VocabLoop Roadmap

A spaced repetition app for learning Spanish, built with Vite + React + TypeScript + Tailwind CSS.

---

## Phase 0: MVP Flashcards + Review + Persistence

**Goal:** Core flashcard functionality with working SRS algorithm and offline persistence.

### Features
- Data model: Card, ReviewLog with all required fields
- IndexedDB persistence layer with simple wrapper
- Add card form (Spanish front, English back, optional fields)
- Quick-add mode: Enter-to-save, auto-focus, toast confirmation
- Review session: show front → reveal back → grade (Again/Hard/Good/Easy)
- SM-2-ish scheduling algorithm
- Keyboard shortcuts: Space to reveal, 1/2/3/4 to grade
- Session ends when no due cards remain
- Basic UI navigation (Home, Add, Review)

### Acceptance Criteria
- [ ] Can add a new card with Spanish/English fields
- [ ] Cards persist after page refresh (IndexedDB)
- [ ] Can start review session when due cards exist
- [ ] Grading updates card's interval, ease, dueAt correctly
- [ ] Keyboard shortcuts work in review mode
- [ ] App works offline
- [ ] "Due now: N" count displays correctly
- [ ] Empty states shown when no cards/no due cards

---

## Phase 1: Library + Stats + Import/Export

**Goal:** Full deck management, statistics dashboard, and data portability.

### Features
- Library view: searchable list of all cards
- Search by Spanish, English, or tags
- Edit card modal/page
- Delete card with confirmation
- Bulk delete (multi-select)
- Stats dashboard:
  - Due count
  - Reviewed today
  - Streak (days with ≥1 review)
  - Cards learned (reps ≥ 3)
- Export deck as JSON
- Import JSON (merge or replace option)
- Backup reminder UI

### Acceptance Criteria
- [ ] Can search cards by any text field
- [ ] Can edit any card field and save
- [ ] Can delete single card with confirmation
- [ ] Can bulk-delete multiple selected cards
- [ ] Stats display accurate counts
- [ ] Streak calculates correctly across days
- [ ] Export downloads valid JSON file
- [ ] Import merges or replaces cards correctly
- [ ] Backup reminder appears periodically

---

## Phase 2: Frequency List + Cloze Mode

**Goal:** Spanish-specific learning tools for vocabulary acquisition.

### Features
- Top 1000 Spanish words JSON file (bundled)
- "Add from list" screen with multi-select
- Quick add selected words to deck
- Cloze card type (fill-in-the-blank)
- Cloze review: show sentence with blank → reveal word → grade
- Create cloze from example sentence (select word to hide)

### Acceptance Criteria
- [ ] Frequency list loads from local JSON (no network)
- [ ] Can browse and search frequency list
- [ ] Can multi-select and add words to deck
- [ ] Cloze cards display with blank correctly
- [ ] Cloze review flow works like standard cards
- [ ] Can create cloze by selecting word in sentence
- [ ] Card type field distinguishes BASIC vs CLOZE

---

## Phase 3: Pronunciation + Verb Micro-Mode

**Goal:** Audio support and specialized verb conjugation practice.

### Features
- "🔊 Speak" button using Web SpeechSynthesis API
- Spanish voice selection (es-ES preferred)
- Slow mode toggle or rate slider
- Verb conjugation micro-mode (separate from main reviews)
- Daily 10 conjugation questions
- Common verbs: ser, estar, tener, ir, hacer, poder, decir, ver, dar, saber, querer
- Present tense focus initially
- Show: infinitive + pronoun → reveal conjugation → grade
- Separate conjugation streak tracking

### Acceptance Criteria
- [ ] Speak button plays Spanish audio
- [ ] Slow mode reduces speech rate
- [ ] Verb micro-mode accessible from home screen
- [ ] Shows 10 conjugation prompts per day
- [ ] Conjugation review: infinitive + pronoun → conjugated form
- [ ] Grading works for conjugation cards
- [ ] Conjugation progress tracked separately
- [ ] Works offline (SpeechSynthesis is browser-native)

---

## Future Considerations (Post-MVP)

- Additional verb tenses (preterite, imperfect, subjunctive)
- More frequency lists (Top 5000, specialized vocabularies)
- Spaced repetition analytics and graphs
- Dark mode
- PWA with install prompt
- Cloud sync (optional backend)
- Shared decks / community imports
