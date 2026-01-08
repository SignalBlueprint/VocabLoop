---
repo: VocabLoop
source: VISION.md
generated: 2026-01-06
status: draft
---

# VocabLoop Task Backlog

## Overview

This task list implements the VocabLoop vision: transforming a solid Spanish vocabulary PWA into a comprehensive language learning platform. Starting with quick wins that leverage existing ReviewLog data for insights (forgetting curves, optimal study times, tag performance), then expanding to cloud sync and multiplayer features, and eventually building toward conversational AI practice and pronunciation training. The goal is to evolve from "a flashcard app" to "the invisible infrastructure layer that makes Spanish vocabulary appear when you need it."

---

## Horizon 1: Quick Wins (Days)

### 1.1 Forgetting Curve Visualizer

**Goal:** Users can tap any card and see a visual chart showing their retention over time, with review markers and decay predictions.

**Tasks:**

- [x] Create retention calculation utility — `src/utils/retention.ts`
  - [x] Implement `calculateRetention(intervalDays: number, daysSinceReview: number): number` using SM-2 retention formula (R = e^(-t/S) where S is stability derived from interval)
  - [x] Implement `generateRetentionCurve(reviews: ReviewLog[], createdAt: number): DataPoint[]` that returns array of {day, retention, isReview} for charting
  - [x] Add unit tests in `src/utils/retention.test.ts` with edge cases (no reviews, single review, many reviews)

- [x] Create ForgettingCurve chart component — `src/components/ForgettingCurve.tsx`
  - [x] Accept props: `cardId: string`, `onClose: () => void`
  - [x] Fetch card data via `getCard(cardId)` and review history via `getReviewsForCard(cardId)`
  - [x] Render SVG line chart with X-axis (days since creation) and Y-axis (retention %)
  - [x] Plot retention decay curve as a line
  - [x] Mark review events as dots on the curve with grade color coding (red=again, orange=hard, green=good, blue=easy)
  - [x] Add dashed projection line showing predicted future retention
  - [x] Show current retention percentage as large number
  - [x] Include close button (X) in top-right corner

- [x] Add "📈" button to Library card list — `src/pages/Library.tsx`
  - [x] Add chart icon button next to each card's edit/delete buttons
  - [x] On click, open ForgettingCurve modal for that card
  - [x] Manage modal open/close state with `selectedCardForCurve` state variable

- [x] Add "📈" button to card detail in Review — `src/pages/Review.tsx`
  - [x] After card reveal, show small chart icon button
  - [x] Opens same ForgettingCurve modal component
  - [x] Ensure modal doesn't interfere with keyboard shortcuts

- [x] Style ForgettingCurve for dark mode compatibility — `src/components/ForgettingCurve.tsx`
  - [x] Use CSS variables for colors that respect dark mode
  - [x] Test chart visibility in both light and dark themes

**Acceptance Criteria:**
- Chart button visible on every card in Library and during Review
- Clicking chart button opens modal with retention curve
- Curve shows historical reviews as colored dots
- Dashed line shows projected future retention
- Current retention percentage displayed prominently
- Works in both light and dark mode

**Estimated Effort:** 4-6 hours

**Dependencies:** None

---

### 1.2 "Weakest Hour" Insights

**Goal:** Stats page shows a heatmap of success rates by hour, revealing when users learn best.

**Tasks:**

- [x] Create time-based analytics utility — `src/utils/hourlyAnalytics.ts`
  - [x] Implement `analyzeReviewsByHour(reviews: ReviewLog[]): HourlyStats[]` returning array of 24 objects with {hour, totalReviews, successCount, successRate}
  - [x] Define success as grade !== 'again'
  - [x] Implement `findOptimalHours(hourlyStats: HourlyStats[]): { best: number[], worst: number[] }` returning top 3 best and worst hours
  - [x] Implement `generateInsightMessage(hourlyStats: HourlyStats[]): string` returning actionable text like "You perform 23% better in mornings (8-10am) than late night (10pm-12am)"
  - [x] Add unit tests in `src/utils/hourlyAnalytics.test.ts`

- [x] Create HourlyHeatmap component — `src/components/HourlyHeatmap.tsx`
  - [x] Accept props: `hourlyStats: HourlyStats[]`
  - [x] Render 24-cell horizontal bar chart (one cell per hour)
  - [x] Color cells from red (low success) to green (high success) based on success rate
  - [x] Show hour labels below (12am, 6am, 12pm, 6pm, 12am)
  - [x] On hover/tap, show tooltip with exact stats: "8am: 45 reviews, 89% success"
  - [x] Gray out hours with <5 reviews (insufficient data)

- [x] Create WeakestHourInsight component — `src/components/WeakestHourInsight.tsx`
  - [x] Accept props: `reviews: ReviewLog[]`
  - [x] Compute hourly stats using utility function
  - [x] Render HourlyHeatmap
  - [x] Display insight message below heatmap
  - [x] Show "Not enough data yet" if total reviews < 50

- [x] Integrate into Stats page — `src/pages/Stats.tsx`
  - [x] Add new section titled "Your Learning Rhythm"
  - [x] Fetch all reviews via `getAllReviews()`
  - [x] Render WeakestHourInsight component
  - [x] Position below existing streak/XP stats

**Acceptance Criteria:**
- Stats page shows 24-hour heatmap of success rates
- Colors clearly distinguish good vs bad hours
- Hovering shows detailed stats per hour
- Actionable insight message displayed
- Hours with insufficient data are grayed out
- Component shows appropriate message when <50 total reviews

**Estimated Effort:** 3-4 hours

**Dependencies:** None

---

### 1.3 Tag Performance Showdown

**Goal:** Users can compare two tags side-by-side to see which vocabulary categories need more work.

**Tasks:**

- [x] Create tag analytics utility — `src/utils/tagAnalytics.ts`
  - [x] Implement `getTagStats(cards: Card[], reviews: ReviewLog[], tag: string): TagStats` returning {tag, cardCount, avgEase, avgInterval, successRate, avgTimeToMastery, mostForgotten: Card[]}
  - [x] Calculate successRate from reviews of cards with this tag
  - [x] Calculate avgTimeToMastery as average days from creation to first interval >= 21 days
  - [x] Find mostForgotten as top 3 cards by lapses count
  - [x] Add unit tests in `src/utils/tagAnalytics.test.ts`

- [x] Create TagCompare component — `src/components/TagCompare.tsx`
  - [x] Accept props: `allCards: Card[]`, `allReviews: ReviewLog[]`, `allTags: string[]`
  - [x] Two dropdown selectors to pick tags to compare
  - [x] Side-by-side display of TagStats for each selected tag
  - [x] Visual indicators (green arrow up, red arrow down) showing which tag performs better on each metric
  - [x] List "Most Forgotten Cards" for each tag with links to those cards

- [x] Add "Compare Tags" mode to Library page — `src/pages/Library.tsx`
  - [x] Add toggle button "Compare Tags" near search/filter controls
  - [x] When enabled, hide card list and show TagCompare component
  - [x] Pass cards, reviews, and unique tags to component
  - [x] Toggle button text changes to "Back to Cards" when in compare mode

- [x] Extract unique tags utility — `src/utils/tags.ts`
  - [x] Implement `extractAllTags(cards: Card[]): string[]` returning sorted unique tags
  - [x] Reuse this in Library.tsx tag filter and TagCompare

**Acceptance Criteria:**
- "Compare Tags" button visible in Library page
- Can select two different tags from dropdowns
- Side-by-side stats show: card count, avg ease, success rate, time to mastery
- Clear visual indicators show which tag is performing better
- Most forgotten cards listed for each tag
- Can click to return to normal Library view

**Estimated Effort:** 4-5 hours

**Dependencies:** None

---

## Horizon 2: System Expansions (Weeks)

### 2.1 Cloud Sync with Conflict Resolution

**Goal:** Users can sync their vocabulary across devices, with data encrypted and stored in the cloud.

**New Infrastructure Required:**
- Supabase project with PostgreSQL database
- Authentication via magic link email
- Row-level security policies
- Edge functions for sync logic

**Migration Notes:**
- Existing IndexedDB data must be exportable as initial cloud upload
- Users without accounts continue offline-only (graceful degradation)
- First sync is a full upload; subsequent syncs are incremental

**Tasks:**

- [x] Set up Supabase project and database schema
  - [x] Create Supabase project at supabase.com
  - [x] Create `users` table: id (uuid), email, created_at, last_sync_at
  - [x] Create `cards` table mirroring Card interface + user_id foreign key + server_updated_at
  - [x] Create `reviews` table mirroring ReviewLog interface + user_id foreign key
  - [x] Create `sync_log` table: id, user_id, action, timestamp, payload_hash
  - [x] Enable Row Level Security: users can only access their own data
  - [x] Document schema in `docs/SCHEMA.md`

- [x] Create Supabase client configuration — `src/lib/supabase.ts`
  - [x] Install @supabase/supabase-js: `npm install @supabase/supabase-js`
  - [x] Create client with environment variables for URL and anon key
  - [x] Export typed client with database types
  - [x] Add `.env.example` with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY placeholders

- [x] Implement authentication flow — `src/utils/auth.ts`
  - [x] Implement `signInWithEmail(email: string): Promise<void>` sending magic link
  - [x] Implement `signOut(): Promise<void>`
  - [x] Implement `getCurrentUser(): User | null`
  - [x] Implement `onAuthStateChange(callback): Unsubscribe`

- [x] Create Auth UI components
  - [x] Create `src/components/AuthModal.tsx` with email input and "Send Magic Link" button
  - [x] Create `src/components/AccountMenu.tsx` showing logged-in email and sign-out option
  - [x] Add auth state to App.tsx with context provider

- [x] Implement sync engine — `src/utils/sync.ts`
  - [x] Implement `uploadLocalData(userId: string): Promise<SyncResult>` pushing all IndexedDB cards/reviews to Supabase
  - [x] Implement `downloadRemoteData(userId: string): Promise<{cards: Card[], reviews: ReviewLog[]}>`
  - [x] Implement `mergeData(local: Card[], remote: Card[]): Card[]` using last-write-wins by updatedAt
  - [x] Implement `syncAll(): Promise<SyncResult>` orchestrating full sync cycle
  - [x] Store last sync timestamp in localStorage
  - [x] Add unit tests for merge logic in `src/utils/sync.test.ts`

- [x] Implement incremental sync — `src/utils/sync.ts`
  - [x] Track changed cards since last sync using updatedAt > lastSyncAt
  - [x] Push only changed cards to reduce bandwidth
  - [x] Pull only cards with server_updated_at > lastSyncAt

- [x] Create SyncIndicator component — `src/components/SyncIndicator.tsx`
  - [x] Show sync status icon in header: synced (green check), syncing (spinning), error (red X), offline (gray)
  - [x] Click to manually trigger sync
  - [x] Show "Last synced: 5 minutes ago" on hover

- [x] Integrate sync into app lifecycle — `src/App.tsx`
  - [x] Auto-sync on app load if authenticated
  - [ ] Auto-sync after card add/edit/delete (deferred - hooks not integrated)
  - [ ] Auto-sync every 5 minutes when online (deferred - interval not implemented)
  - [x] Handle offline gracefully (queue changes, sync when back online)

- [x] Create conflict resolution UI — `src/components/ConflictResolver.tsx`
  - [x] Show when same card edited on multiple devices
  - [x] Display both versions side-by-side
  - [x] Let user choose "Keep Local", "Keep Remote", or "Keep Both"
  - [x] Store merge decisions in sync_log for audit

- [x] Add encryption layer — `src/utils/encryption.ts`
  - [x] Implement `encryptCard(card: Card, key: string): EncryptedCard`
  - [x] Implement `decryptCard(encrypted: EncryptedCard, key: string): Card`
  - [x] Derive key from user password or store in secure localStorage
  - [ ] Document encryption approach in `docs/SECURITY.md` (deferred)

**Acceptance Criteria:**
- User can sign in with email magic link
- After sign-in, all local cards sync to cloud
- Opening app on new device downloads cards from cloud
- Sync indicator shows current status
- Offline edits queue and sync when online
- Conflicts show resolution UI
- Card content encrypted at rest in database

**Estimated Effort:** 20-30 hours

**Dependencies:** Supabase account, domain for magic links

---

### 2.2 Multiplayer Sprint Mode

**Goal:** Two users can compete in real-time, racing to translate vocabulary cards.

**New Infrastructure Required:**
- WebSocket server (Node.js with ws or Socket.io)
- Room management system
- Real-time score synchronization
- Match history storage

**Migration Notes:**
- Can start with serverless WebSocket (Supabase Realtime or Pusher)
- Fallback to single-player speed mode if connection fails

**Tasks:**

- [x] Design multiplayer protocol — `docs/MULTIPLAYER_PROTOCOL.md`
  - [x] Document message types: JOIN_ROOM, ROOM_JOINED, GAME_START, CARD_SHOWN, ANSWER_SUBMITTED, ROUND_RESULT, GAME_END
  - [x] Define room state machine: WAITING → COUNTDOWN → PLAYING → FINISHED
  - [x] Specify timing: 60-second matches, 5-second card timer
  - [x] Document anti-cheat considerations (server validates answers)

- [x] Set up WebSocket server — `server/index.ts`
  - [x] Initialize new Node.js project in `server/` directory
  - [x] Install dependencies: `npm init -y && npm install ws uuid`
  - [x] Create WebSocket server listening on port 3001
  - [x] Implement room management: createRoom, joinRoom, leaveRoom
  - [x] Store active rooms in memory Map
  - [x] Add room code generation (6 alphanumeric characters)

- [x] Implement game logic on server — `server/game.ts`
  - [x] Load card pool from shared JSON file
  - [x] Implement round management: select card, broadcast to players, collect answers
  - [x] Score answers: first correct answer = 2 points, second correct = 1 point, wrong = 0
  - [x] Track scores per player throughout match
  - [x] Broadcast final results when time expires

- [x] Create WebSocket client hook — `src/hooks/useMultiplayer.ts`
  - [x] Implement `connect(roomCode: string, playerName: string): void`
  - [x] Implement `disconnect(): void`
  - [x] Implement `submitAnswer(answer: string): void`
  - [x] Expose state: connectionStatus, roomState, players, currentCard, scores, timeRemaining
  - [x] Handle reconnection on disconnect

- [x] Create room lobby UI — `src/pages/MultiplayerLobby.tsx`
  - [x] Two modes: "Create Room" and "Join Room"
  - [x] Create room shows room code to share
  - [x] Join room has input for room code
  - [x] Player name input
  - [x] Show list of players in room
  - [x] "Start Game" button (only room creator)
  - [x] Countdown timer before game starts

- [x] Create multiplayer game UI — `src/pages/MultiplayerGame.tsx`
  - [x] Full-screen game view
  - [x] Show current card (Spanish word)
  - [x] Text input for English translation
  - [x] Submit on Enter key
  - [x] Real-time scoreboard showing both players
  - [x] Timer countdown (60 seconds total, 5 seconds per card)
  - [x] Visual feedback on correct/incorrect answers

- [x] Create match results UI — `src/pages/MultiplayerResults.tsx`
  - [x] Show final scores with winner highlighted
  - [x] List cards both players struggled with
  - [x] "Play Again" and "Back to Home" buttons
  - [ ] Share result option (copy to clipboard) — deferred

- [x] Add multiplayer navigation — `src/App.tsx`
  - [x] Add "Multiplayer" option to navigation/menu (GameHub)
  - [x] Add 'multiplayer-lobby', 'multiplayer-game', 'multiplayer-results' to Page type
  - [x] Route to appropriate components

- [x] Store match history — `src/utils/matchHistory.ts`
  - [x] Save completed matches to localStorage
  - [x] Track: date, opponent, score, win/loss
  - [ ] Display match history in Stats or dedicated page — deferred

**Acceptance Criteria:**
- User can create a room and receive shareable code
- Second user can join with room code
- Both see same cards simultaneously
- Answers scored in real-time with live leaderboard
- Match ends after 60 seconds
- Results show winner and problem cards
- Match history persisted locally

**Estimated Effort:** 25-35 hours

**Dependencies:** Node.js hosting (Railway, Render, or Fly.io)

---

### 2.3 Adaptive Curriculum Engine

**Goal:** "Smart Sessions" dynamically mix due reviews, weak-tag reinforcement, and new cards based on real-time performance.

**New Infrastructure Required:**
- Session configuration system
- Real-time performance tracking during session
- Recommendation algorithm

**Migration Notes:**
- Existing Review page continues to work (not replaced)
- Smart Session is an alternative review mode
- Can start simple and iterate on algorithm

**Tasks:**

- [x] Design curriculum algorithm — `docs/CURRICULUM_ALGORITHM.md`
  - [x] Document card selection weights: 60% due, 25% weak tags, 15% new
  - [x] Define "weak tag" criteria: tags with successRate < 70% and cardCount >= 5
  - [x] Specify confidence recovery: if 2 consecutive failures, insert easier card
  - [x] Plan session summary insights

- [x] Create curriculum engine — `src/utils/curriculum.ts`
  - [x] Implement `identifyWeakTags(cards: Card[], reviews: ReviewLog[]): string[]`
  - [x] Implement `selectNextCard(config: SessionConfig, recentResults: ReviewResult[]): Card`
  - [x] Implement `calculateMix(dueCards: Card[], weakTagCards: Card[], newCards: Card[]): Card[]`
  - [x] Track in-session performance for dynamic adjustment
  - [x] Add unit tests in `src/utils/curriculum.test.ts`

- [x] Create SessionConfig type — `src/types/index.ts`
  - [x] Add interface: `SessionConfig { mode: 'smart' | 'due-only' | 'tag-focus', targetCards: number, tagFocus?: string }`
  - [x] Add interface: `ReviewResult { cardId: string, grade: Grade, timeMs: number }`

- [x] Create SmartSession page — `src/pages/SmartSession.tsx`
  - [x] Session configuration screen: card count slider (10-50), mode selector
  - [x] Use curriculum engine to select cards
  - [x] Track performance during session
  - [x] Adjust upcoming cards based on results (insert easier if struggling)
  - [x] Same review UI as regular Review page

- [x] Create session summary — `src/components/SmartSessionSummary.tsx`
  - [x] Show cards reviewed, success rate, time spent
  - [x] Highlight "Struggled with [tag]" if tag had low success
  - [x] Suggest "Tomorrow's session will include more [tag] practice"
  - [x] Compare to average session performance

- [x] Add Smart Session to navigation — `src/App.tsx`
  - [x] Add "Smart Session" button on Home page alongside "Start Review" (added to GameHub)
  - [x] Add 'smart-session' to Page type
  - [x] Route to SmartSession component

- [x] Create tag weakness tracking — `src/utils/tagWeakness.ts`
  - [x] Implement `updateTagWeakness(tag: string, result: ReviewResult): void`
  - [x] Store rolling 7-day success rate per tag in localStorage
  - [x] Implement `getWeakestTags(count: number): string[]`

- [x] Implement confidence recovery logic — `src/utils/curriculum.ts`
  - [x] Track consecutive failures in session
  - [x] After 2 failures, next card is from a strong tag (successRate > 85%)
  - [x] Reset counter after any success
  - [x] Log confidence interventions for analysis

**Acceptance Criteria:**
- Home page offers "Smart Session" alongside regular review
- Can configure session length and mode
- Session dynamically mixes due cards, weak tag cards, and new cards
- Struggling triggers easier card insertion
- Session summary shows performance insights
- Weak tags identified and surfaced

**Estimated Effort:** 15-20 hours

**Dependencies:** None (builds on existing infrastructure)

---

## Horizon 3: Blue Sky

### 3.1 Conversational Practice Mode

**Goal:** Users practice vocabulary in context through AI-powered Spanish conversations.

**Open Questions:**
- Which LLM provider? (OpenAI, Anthropic, local model)
- How to enforce vocabulary level constraints?
- How to handle API costs?
- Should conversations be stored/exportable?

**Proof of Concept Scope:**
- Single character personality
- 5-turn conversation limit
- Only uses words from user's "Known" or "Mastered" cards
- Basic profanity/safety filter

**Tasks:**

- [ ] Research LLM integration options — `docs/LLM_RESEARCH.md`
  - [ ] Evaluate OpenAI GPT-4o-mini (cost, latency, quality)
  - [ ] Evaluate Anthropic Claude Haiku (cost, latency, quality)
  - [ ] Evaluate local models (Ollama + Llama) for privacy-first option
  - [ ] Document API pricing and rate limits
  - [ ] Recommend approach with rationale

- [ ] Design conversation system prompt — `src/prompts/conversation.ts`
  - [ ] Create character persona (friendly neighbor)
  - [ ] Include vocabulary constraints: "Only use these Spanish words: [list]"
  - [ ] Specify behavior: introduce one new word per exchange, stay simple
  - [ ] Add safety guidelines
  - [ ] Export as configurable template

- [ ] Create LLM client abstraction — `src/lib/llm.ts`
  - [ ] Define interface: `sendMessage(messages: Message[], config: LLMConfig): Promise<string>`
  - [ ] Implement OpenAI adapter
  - [ ] Implement Anthropic adapter
  - [ ] Support streaming responses
  - [ ] Handle rate limits and errors gracefully

- [ ] Create vocabulary extraction utility — `src/utils/vocabExtract.ts`
  - [ ] Implement `getKnownVocabulary(cards: Card[]): string[]` filtering cards with intervalDays >= 7
  - [ ] Implement `formatVocabForPrompt(words: string[]): string`
  - [ ] Implement `detectNewWord(response: string, knownWords: string[]): string | null`

- [ ] Create ChatSession component — `src/components/ChatSession.tsx`
  - [ ] Chat bubble UI with user messages right, AI messages left
  - [ ] Text input with send button
  - [ ] Typing indicator during AI response
  - [ ] Show detected new word with definition when introduced
  - [ ] Limit to 5 turns in POC

- [ ] Create ConversationPage — `src/pages/Conversation.tsx`
  - [ ] Character selection (single character for POC)
  - [ ] Display character avatar and name
  - [ ] Embed ChatSession component
  - [ ] "End Conversation" button
  - [ ] Vocabulary boosts: cards used correctly in conversation get interval bonus

- [ ] Implement vocabulary tracking — `src/utils/conversationReview.ts`
  - [ ] Track words used correctly in conversation
  - [ ] Apply interval boost to those cards (e.g., +1 day)
  - [ ] Track words user stumbled on for extra review
  - [ ] Log conversation as special review type

- [ ] Add conversation to navigation — `src/App.tsx`
  - [ ] Add "Chat Practice" to main navigation
  - [ ] Add 'conversation' to Page type
  - [ ] Show character with speech bubble on Home page as entry point

**Acceptance Criteria:**
- Can start conversation with AI character
- AI uses only vocabulary user has learned
- New words introduced gradually (one per exchange)
- Words used correctly get SRS interval boost
- Conversation limited to 5 turns in POC
- Graceful error handling for API issues

**Estimated Effort:** 20-30 hours

**Dependencies:** LLM API account, API key management

---

### 3.2 Pronunciation Challenge Mode

**Goal:** Users record themselves speaking Spanish and receive feedback on pronunciation quality.

**Open Questions:**
- Which speech recognition API? (Web Speech API, Whisper, Azure)
- How to score pronunciation quality?
- Is phoneme-level feedback feasible?
- How to handle browser microphone permissions?

**Proof of Concept Scope:**
- Single-word pronunciation only
- Binary feedback (correct/incorrect based on transcription match)
- Side-by-side waveform visualization
- Chrome/Edge only (Web Speech API)

**Tasks:**

- [ ] Research speech recognition options — `docs/SPEECH_RESEARCH.md`
  - [ ] Test Web Speech API for Spanish recognition accuracy
  - [ ] Evaluate Whisper API (accuracy, latency, cost)
  - [ ] Evaluate Azure Speech Services (pronunciation assessment feature)
  - [ ] Document browser compatibility
  - [ ] Recommend approach

- [ ] Create audio recording hook — `src/hooks/useAudioRecorder.ts`
  - [ ] Implement `startRecording(): Promise<void>` requesting microphone permission
  - [ ] Implement `stopRecording(): Promise<Blob>`
  - [ ] Implement `getWaveformData(): Float32Array` for visualization
  - [ ] Handle permission denied gracefully
  - [ ] Clean up MediaStream on unmount

- [ ] Create speech recognition service — `src/utils/speechRecognition.ts`
  - [ ] Implement `transcribeAudio(blob: Blob): Promise<string>` using Web Speech API
  - [ ] Implement `comparePronunciation(expected: string, actual: string): PronunciationResult`
  - [ ] PronunciationResult: { match: boolean, confidence: number, issues?: string[] }
  - [ ] Handle Spanish-specific recognition settings

- [ ] Create WaveformVisualizer component — `src/components/WaveformVisualizer.tsx`
  - [ ] Accept props: `audioData: Float32Array`, `color: string`
  - [ ] Render waveform using Canvas or SVG
  - [ ] Animate during recording
  - [ ] Support playback progress indicator

- [ ] Create PronunciationCard component — `src/components/PronunciationCard.tsx`
  - [ ] Display Spanish word with "Listen" button (uses existing TTS)
  - [ ] "Record" button to capture user pronunciation
  - [ ] Side-by-side waveform comparison (native vs user)
  - [ ] Show result: checkmark for match, X for mismatch
  - [ ] "Try Again" button

- [ ] Create PronunciationPage — `src/pages/Pronunciation.tsx`
  - [ ] Session of 10 words from user's deck
  - [ ] Progress indicator
  - [ ] Score tracking (X/10 correct)
  - [ ] Session summary with problem words

- [ ] Add pronunciation to navigation — `src/App.tsx`
  - [ ] Add "Pronunciation" to game modes or main nav
  - [ ] Add 'pronunciation' to Page type
  - [ ] Show microphone icon

- [ ] Create pronunciation history — `src/utils/pronunciationHistory.ts`
  - [ ] Store attempts: cardId, timestamp, result
  - [ ] Track improvement over time per word
  - [ ] Identify persistent problem words

**Acceptance Criteria:**
- Can record pronunciation of Spanish words
- Receives pass/fail feedback based on recognition
- Visual waveform shows recording
- Can replay native pronunciation for comparison
- Session tracks score out of 10
- Works in Chrome and Edge

**Estimated Effort:** 20-25 hours

**Dependencies:** HTTPS (required for microphone), compatible browser

---

## Moonshot: VocabLoop as Language Learning OS

### Phase 1: Foundation — Browser Extension

**Goal:** Create browser extension that highlights vocabulary on any Spanish webpage.

**Tasks:**

- [ ] Set up extension project — `extension/`
  - [ ] Create manifest.json (Manifest V3 for Chrome)
  - [ ] Create background.js service worker
  - [ ] Create content.js content script
  - [ ] Create popup.html/popup.js for extension popup
  - [ ] Add extension icons (16, 48, 128px)

- [ ] Implement vocabulary highlighting — `extension/content.js`
  - [ ] Inject CSS for highlight classes (.vocab-known, .vocab-learning, .vocab-unknown)
  - [ ] Get vocabulary list from extension storage (synced from main app)
  - [ ] Scan page text nodes for Spanish words
  - [ ] Wrap matched words in spans with appropriate class
  - [ ] Green = mastered (interval >= 21), Yellow = learning (interval 1-20), underline = unknown

- [ ] Implement word click handler — `extension/content.js`
  - [ ] Click highlighted word shows popup with translation
  - [ ] Click unknown word shows "Add to VocabLoop" button
  - [ ] Capture sentence context for cloze card creation

- [ ] Create vocabulary sync — `extension/background.js`
  - [ ] Fetch vocabulary from VocabLoop cloud (requires auth)
  - [ ] Store in extension storage
  - [ ] Refresh every 30 minutes
  - [ ] Show sync status in popup

- [ ] Create extension popup UI — `extension/popup.html`
  - [ ] Show connection status to VocabLoop account
  - [ ] Display stats: X words known, Y learning
  - [ ] Toggle highlighting on/off
  - [ ] Link to open main VocabLoop app

- [ ] Build and test extension
  - [ ] Test on Spanish news sites (El País, BBC Mundo)
  - [ ] Test performance on long pages
  - [ ] Package for Chrome Web Store

**Acceptance Criteria:**
- Extension installs in Chrome
- Spanish words highlighted by familiarity level
- Clicking words shows translation
- Can add unknown words to deck
- Syncs with VocabLoop account

**Estimated Effort:** 15-20 hours

**Dependencies:** Cloud sync (Horizon 2.1)

---

### Phase 2: Core Feature — Cross-Platform Companion

**Goal:** Build mobile companion app that syncs with web and provides quick review access.

**Tasks:**

- [ ] Evaluate mobile framework — `docs/MOBILE_RESEARCH.md`
  - [ ] Compare React Native vs Capacitor vs PWA-only approach
  - [ ] Consider code sharing with existing React codebase
  - [ ] Document pros/cons of each
  - [ ] Recommend approach

- [ ] Set up Capacitor project — `mobile/`
  - [ ] Initialize Capacitor: `npm install @capacitor/core @capacitor/cli`
  - [ ] Add iOS and Android platforms
  - [ ] Configure app icon and splash screen
  - [ ] Set up native build pipelines

- [ ] Implement native features
  - [ ] Push notifications for review reminders
  - [ ] Background sync for offline review
  - [ ] Widget for home screen showing due count
  - [ ] Native share extension for adding words from other apps

- [ ] Create Quick Review widget
  - [ ] iOS: WidgetKit implementation
  - [ ] Android: App Widget implementation
  - [ ] Show single due card with flip gesture
  - [ ] Grade directly from widget

- [ ] App Store preparation
  - [ ] Create app store listings
  - [ ] Screenshots and promotional images
  - [ ] Privacy policy for both stores
  - [ ] Submit for review

**Acceptance Criteria:**
- Native apps for iOS and Android
- Full feature parity with web
- Push notifications work
- Home screen widget shows due cards
- Can review directly from widget

**Estimated Effort:** 40-60 hours

**Dependencies:** Cloud sync, Apple Developer account, Google Play account

---

### Phase 3: Full Vision — Platform Ecosystem

**Goal:** VocabLoop becomes embeddable infrastructure that other apps can integrate.

**Tasks:**

- [ ] Design embeddable widget SDK — `docs/WIDGET_SDK.md`
  - [ ] Define widget types: inline word highlight, popup card, mini-review
  - [ ] Design JavaScript embed API
  - [ ] Plan OAuth flow for third-party apps
  - [ ] Specify rate limits and pricing tiers

- [ ] Build widget SDK — `sdk/`
  - [ ] Create embeddable JavaScript bundle
  - [ ] Implement authentication handshake
  - [ ] Create React component library for integrators
  - [ ] Build demo integration site

- [ ] Create API layer — `api/`
  - [ ] RESTful API for vocabulary CRUD
  - [ ] WebSocket API for real-time features
  - [ ] OAuth2 provider for third-party auth
  - [ ] Rate limiting and usage tracking

- [ ] Build partner integrations
  - [ ] YouTube subtitle overlay prototype
  - [ ] Netflix language learning extension
  - [ ] Kindle vocabulary builder integration

- [ ] Implement skill tree gamification
  - [ ] Define skill categories (Conversationalist, Grammar Geek, Culture Maven)
  - [ ] Create unlock requirements for each skill
  - [ ] Design visual skill tree UI
  - [ ] Add badges and achievements per skill

- [ ] Expand vocabulary corpus
  - [ ] Grow from 500 to 50,000 words
  - [ ] Add domain tags (medical, legal, travel, business)
  - [ ] Add regional variants (Spain, Mexico, Argentina)
  - [ ] Add difficulty ratings and frequency ranks

**Acceptance Criteria:**
- Other apps can embed VocabLoop widgets
- API available for integrations
- Skill tree provides long-term progression
- Expanded vocabulary with domain specializations
- Partner integrations functional

**Estimated Effort:** 100+ hours

**Dependencies:** All previous phases, significant infrastructure investment

---

## Suggested Starting Point

### Start with: Horizon 1.1 — Forgetting Curve Visualizer

**Why this task?**
1. **High impact, low effort** — Pure frontend work using existing ReviewLog data
2. **Differentiates VocabLoop** — Neither Anki nor Duolingo visualize this data
3. **Builds understanding** — Users who see their forgetting curve engage more deeply
4. **Foundation for insights** — The retention calculation utility can power future analytics
5. **Quick win** — Achievable in a single focused session (4-6 hours)

**What it unblocks:**
- Proves the value of leveraging ReviewLog data for insights
- Retention calculation utility reusable for Weakest Hour and Tag Performance features
- Creates pattern for adding visualization components
- Motivates users to generate more review data (creating flywheel)

**First subtask:**
```
Create src/utils/retention.ts with calculateRetention() and generateRetentionCurve()
Add tests in src/utils/retention.test.ts
```

This gives you the core logic to visualize, making the UI work straightforward.
