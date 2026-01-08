# VocabLoop Work Log

## 1.1 Forgetting Curve Visualizer
**Completed:** 2026-01-06T15:15:00Z
**Files Changed:**
- src/utils/retention.ts — Created retention calculation utilities (calculateRetention, generateRetentionCurve, generateProjection, getCurrentRetention)
- src/utils/retention.test.ts — Added 19 unit tests covering edge cases
- src/components/ForgettingCurve.tsx — Created SVG chart component with modal, review event markers, projection line
- src/pages/Library.tsx — Added chart button next to Edit/Delete, ForgettingCurve modal integration
- src/pages/Review.tsx — Added chart button in revealed answer section, modal integration, keyboard shortcut guard

**Implementation Notes:**
- Used SM-2 retention formula: R = e^(-t/S) where S is stability derived from interval
- SVG chart renders retention curve with colored dots for each review grade (red=again, orange=hard, green=good, blue=easy)
- Dashed projection line shows predicted future retention decay
- Large percentage display shows current retention
- Full dark mode support with color switching based on isDark prop
- Modal closes on Escape key and clicking outside
- Keyboard shortcuts (1-4 for grading) disabled when modal is open in Review page

**Verification:**
- All 19 unit tests pass
- Build compiles successfully
- Chart button visible in Library and Review pages
- Modal opens/closes correctly
- Dark mode colors render properly

---

## 1.2 "Weakest Hour" Insights
**Completed:** 2026-01-06T15:22:00Z
**Files Changed:**
- src/utils/hourlyAnalytics.ts — Created hourly analytics utilities (analyzeReviewsByHour, findOptimalHours, generateInsightMessage, getHeatmapColor)
- src/utils/hourlyAnalytics.test.ts — Added 21 unit tests for all analytics functions
- src/components/HourlyHeatmap.tsx — 24-cell heatmap with tooltip on hover/tap
- src/components/WeakestHourInsight.tsx — Wrapper component showing heatmap + insight message
- src/pages/Stats.tsx — Integrated WeakestHourInsight after Time Analytics section

**Implementation Notes:**
- Success is defined as grade !== 'again' (hard, good, easy all count as success)
- Hours with <5 reviews are grayed out and marked as insufficient data
- Color scale: red (bad) → orange → yellow → green (good)
- Insight message compares best and worst time periods with actionable advice
- Shows "Not enough data yet" message if total reviews < 50
- Full dark mode support

**Verification:**
- All 21 unit tests pass (240 total tests)
- Build compiles successfully
- Heatmap displays on Stats page
- Tooltip shows on hover/tap
- Insight message generates correctly

---

## 1.3 Tag Performance Showdown
**Completed:** 2026-01-06T15:28:00Z
**Files Changed:**
- src/utils/tagAnalytics.ts — Created tag analytics utilities (getTagStats, getCardsWithTag, compareTagMetric, extractAllTags, formatting helpers)
- src/utils/tagAnalytics.test.ts — Added 29 unit tests for all analytics functions
- src/components/TagCompare.tsx — Side-by-side tag comparison component with dropdowns, metrics table, and most forgotten cards
- src/pages/Library.tsx — Added "Compare Tags" button, compareMode state, TagCompare integration

**Implementation Notes:**
- Metrics compared: card count, success rate, avg ease, avg interval, mastered count, time to mastery
- Visual indicators (↑ green = better, ↓ red = needs work) show which tag performs better
- "Most Forgotten" cards listed for each tag with click-to-edit functionality
- extractAllTags utility function placed in tagAnalytics.ts for reuse
- Compare Tags mode hides card list and shows comparison component
- Requires at least 2 tags to enable Compare Tags button

**Verification:**
- All 29 unit tests pass (269 total tests)
- Build compiles successfully
- Compare Tags button appears when 2+ tags exist
- Side-by-side comparison table displays correctly
- Clicking forgotten card exits compare mode and opens edit modal
- Dark mode colors render properly

---

## 2.1 Cloud Sync with Conflict Resolution
**Completed:** 2026-01-06T16:50:00Z
**Files Changed:**
- docs/SCHEMA.md — Complete PostgreSQL schema for Supabase with RLS policies, indexes, and setup instructions
- .env.example — Environment variable template for Supabase configuration
- src/lib/supabase.ts — Supabase client configuration with conditional initialization
- src/types/database.ts — TypeScript types for database tables
- src/utils/auth.ts — Authentication utilities (signInWithEmail, signOut, getCurrentUser, onAuthStateChange, ensureUserProfile)
- src/utils/encryption.ts — AES-GCM encryption for card content using Web Crypto API
- src/utils/sync.ts — Full sync engine with upload, download, merge, and incremental sync
- src/utils/sync.test.ts — 8 unit tests for merge logic
- src/hooks/useAuth.ts — React hook for auth state management
- src/components/AuthModal.tsx — Magic link sign-in modal
- src/components/AccountMenu.tsx — Dropdown menu showing signed-in user with sign-out option
- src/components/SyncIndicator.tsx — Header sync status icon with tooltip
- src/components/ConflictResolver.tsx — Modal for resolving sync conflicts with Keep Local/Remote/Both options
- src/App.tsx — Integrated auth state, SyncIndicator, AccountMenu, and AuthModal

**Implementation Notes:**
- Supabase client conditionally created only when env vars are present (graceful degradation)
- Authentication via magic link (passwordless email)
- Card content encrypted client-side with AES-GCM before upload (front, back, examples, notes, cloze fields)
- Encryption key derived from user ID using PBKDF2
- Sync uses last-write-wins strategy with 1-minute threshold for conflict detection
- Conflicts flagged when same card modified within 1 minute on different devices
- Incremental sync only transfers changed cards since lastSyncAt
- SyncIndicator shows: idle (sync icon), syncing (spinning), success (checkmark), error (X), offline (wifi-off)
- Auto-sync on app load when authenticated
- Pending changes queued in localStorage for offline support

**Deferred Items:**
- Auto-sync after card add/edit/delete (requires hooks in card operations)
- Auto-sync every 5 minutes (requires setInterval)
- docs/SECURITY.md documentation

**Verification:**
- All 277 unit tests pass (8 new for sync merge logic)
- Build compiles successfully
- Sign in button visible in header when Supabase configured
- AuthModal opens with email input and magic link flow
- AccountMenu shows email and sign-out when authenticated
- SyncIndicator visible when authenticated
- ConflictResolver component renders correctly

---

## 2.2 Multiplayer Sprint Mode
**Completed:** 2026-01-06T17:15:00Z
**Files Changed:**

**Server (new `server/` directory):**
- server/package.json — Node.js project with ws and uuid dependencies
- server/tsconfig.json — TypeScript configuration for server
- server/src/types.ts — Type definitions (RoomState, Player, Room, GameCard, ClientMessage, ServerMessage)
- server/src/cards.ts — 80-word Spanish vocabulary pool with multiple accepted English translations
- server/src/game.ts — Room management, game logic, scoring (first correct = 2pts, second = 1pt)
- server/src/index.ts — WebSocket server entry point on port 3001

**Client:**
- src/hooks/useMultiplayer.ts — WebSocket client hook managing connection, room state, game state
- src/pages/MultiplayerLobby.tsx — Create/join room UI, waiting room with player list, start game button
- src/pages/MultiplayerGame.tsx — Active gameplay: Spanish word display, answer input, real-time scoreboard, timer
- src/pages/MultiplayerResults.tsx — End-of-game results: final scores, winner highlight, word breakdown, accuracy stats
- src/utils/matchHistory.ts — localStorage persistence for match history with stats aggregation
- src/components/GameHub.tsx — Added Multiplayer as featured game option
- src/types/index.ts — Added 'multiplayer-lobby', 'multiplayer-game', 'multiplayer-results' to Page type
- src/App.tsx — Added imports and routes for multiplayer pages

**Documentation:**
- docs/MULTIPLAYER_PROTOCOL.md — WebSocket protocol specification

**Implementation Notes:**
- WebSocket server in separate `server/` directory with own package.json
- Room state machine: DISCONNECTED → CONNECTING → WAITING → COUNTDOWN → PLAYING → FINISHED
- 6-character alphanumeric room codes generated server-side
- 60-second total game time with 5 seconds per card
- First correct answer = 2 points, second correct = 1 point
- Server validates all answers against accepted translations (case-insensitive)
- Client hook manages all WebSocket state with automatic cleanup on unmount
- Match results saved to localStorage with getMatchStats() for aggregation
- Multiplayer featured prominently in GameHub grid

**Deferred Items:**
- Share result option (copy to clipboard)
- Match history display in Stats page
- Rematch with same players
- Spectator mode

**Verification:**
- All 277 unit tests pass
- Build compiles successfully
- Multiplayer option visible in Games & Practice hub
- Lobby UI renders create/join modes correctly
- Game UI displays Spanish words, input, scoreboard, timer
- Results UI shows winner, scores, and word breakdown

---

## 2.3 Adaptive Curriculum Engine
**Completed:** 2026-01-08T17:10:00Z
**Files Changed:**

**Documentation:**
- docs/CURRICULUM_ALGORITHM.md — Comprehensive algorithm design document covering card selection weights, weak tag criteria, confidence recovery, session state, and insights

**Core Engine:**
- src/utils/curriculum.ts — Full curriculum engine implementation with:
  - `identifyWeakTags()` — Tags with success rate < 70% and >= 5 cards
  - `identifyStrongTags()` — Tags with success rate >= 85% for confidence recovery
  - `selectNextCard()` — Weighted random card selection with confidence recovery trigger
  - `calculateMix()` — Session card distribution (60% due, 25% weak tag, 15% new)
  - `createSessionState()` / `updateSessionState()` — Session state management
  - `calculateSessionStats()` — Session performance metrics
  - `analyzeSessionTagPerformance()` — Per-tag success analysis
  - `generateSessionInsights()` — Actionable insight message generation
- src/utils/curriculum.test.ts — 33 unit tests covering all curriculum functions

**Types:**
- src/types/index.ts — Added SessionConfig, SessionMode, ReviewResult types and 'smart-session' to Page type

**UI Components:**
- src/pages/SmartSession.tsx — Complete Smart Session page with:
  - Configuration screen: mode selector (Smart Mix, Due Only, Tag Focus), card count slider (10-50)
  - Tag dropdown for tag-focus mode
  - Confidence recovery toggle
  - Same review UI as regular Review page with swipe gestures
  - Confidence boost indicator when recovery cards are shown
  - Session progress tracking
- src/components/SmartSessionSummary.tsx — Session summary component showing:
  - Cards reviewed, success rate, XP earned
  - Duration and average response time
  - Confidence boost usage count
  - Tag performance breakdown with success rates
  - Actionable insights

**Tag Weakness Tracking:**
- src/utils/tagWeakness.ts — Rolling 7-day tag performance tracking:
  - `updateTagWeakness()` — Track review results per tag per day
  - `getWeakestTags()` — Get tags with lowest rolling success rate
  - Trend detection (improving/stable/declining)
  - localStorage persistence with automatic cleanup

**Navigation:**
- src/components/GameHub.tsx — Added Smart Session as featured game (first position)
- src/App.tsx — Added SmartSession import and route

**Implementation Notes:**
- Default weights: 60% due cards, 25% weak tag cards, 15% new cards
- Weak tag threshold: success rate < 70% with minimum 5 cards
- Strong tag threshold: success rate >= 85% with minimum 3 cards
- Confidence recovery: After 2 consecutive failures, insert easier card from strong tags
- Session modes: smart (adaptive), due-only (traditional), tag-focus (specific tag)
- Tag weakness tracking uses 7-day rolling window with trend analysis
- GameHub now shows 4 featured games in 2x2 grid

**Verification:**
- All 33 new curriculum tests pass
- TypeScript type check passes
- Smart Session accessible from GameHub
- Configuration screen renders all options
- Review UI matches standard Review page
- Session summary shows all metrics and insights

---

## 3.1 Conversational Practice Mode (Infrastructure)
**Completed:** 2026-01-08T17:50:00Z
**Files Changed:**

**Documentation:**
- docs/LLM_RESEARCH.md — Comprehensive LLM provider evaluation comparing OpenAI GPT-4o-mini, Anthropic Claude 3.5 Haiku, and Ollama/Llama local models with pricing, latency, and capability comparison

**LLM Client Abstraction:**
- src/lib/llm.ts — Multi-provider LLM client with:
  - `LLMProvider` interface with `sendMessage()` and `streamMessage()` methods
  - `OpenAIProvider` — GPT-4o-mini adapter with streaming SSE support
  - `AnthropicProvider` — Claude Haiku adapter with Anthropic API format
  - `OllamaProvider` — Local model adapter for privacy mode
  - `createLLMProvider()` — Factory function for provider instantiation
  - `getBestAvailableProvider()` — Auto-detect configured providers
  - API key storage/retrieval from localStorage
  - Error handling with `LLMError` class (rate_limit, invalid_key, network, etc.)
  - Retry helper with exponential backoff

**Conversation Prompts:**
- src/prompts/conversation.ts — Character personas and prompt engineering:
  - `CharacterPersona` interface with name, avatar, personality, topics
  - `CHARACTERS` array with María (friendly neighbor) as POC character
  - `buildSystemPrompt()` — Generates LLM system prompt with vocabulary constraints
  - `extractNewWordFromResponse()` — Detects new vocabulary introduced by AI
  - `isPrimarilyEnglish()` — Detects if user wrote in English
  - `CONVERSATION_LIMITS` — POC limits (5 turns, 500 tokens, 10/day)
  - Difficulty levels: beginner, intermediate, advanced

**Vocabulary Extraction:**
- src/utils/vocabExtract.ts — Extract user's known vocabulary from cards:
  - `getMasteryLevel()` — Classify cards as learning/familiar/mastered
  - `extractWordFromCard()` — Get Spanish word from BASIC/VERB/CLOZE cards
  - `extractWordsFromSentence()` — Parse words with stopword filtering
  - `extractVocabulary()` — Get VocabItem array with mastery levels
  - `buildVocabContext()` — Generate comma-separated vocab string for prompts
- src/utils/vocabExtract.test.ts — 22 unit tests for vocabulary extraction

**Conversation Tracking:**
- src/utils/conversationReview.ts — Track conversation sessions and learned words:
  - `recordConversationSession()` — Save completed sessions to localStorage
  - `LearnedWord` interface for words introduced during conversations
  - `getConversationStats()` — Aggregate statistics
  - `canStartConversation()` — Check daily limit (10/day)
  - `getFlashcardSuggestions()` — Convert learned words to card suggestions

**UI Components:**
- src/components/ChatSession.tsx — Core chat interface:
  - Real-time streaming message display
  - Typing indicator with animated dots
  - Turn counter showing progress to limit
  - New word highlighting when AI introduces vocabulary
  - English detection with Spanish encouragement
  - Error states with retry capability
  - Session end handling
- src/pages/Conversation.tsx — Full conversation page with:
  - Provider setup (OpenAI/Anthropic selection, API key input)
  - Character selection screen
  - Difficulty level selector
  - Vocabulary summary showing card count
  - Cost estimates for API usage
  - Help links to get API keys

**Navigation:**
- src/types/index.ts — Added 'conversation' to Page type
- src/components/GameHub.tsx — Added Conversation as featured game (second position)
- src/App.tsx — Added ConversationPage import and route

**Implementation Notes:**
- Primary provider: OpenAI GPT-4o-mini (~$0.001/conversation)
- Secondary provider: Anthropic Claude Haiku (~$0.004/conversation)
- Optional: Ollama for local/privacy mode
- API keys stored in localStorage (client-side only for POC)
- Streaming responses for better UX
- Vocabulary constraints in system prompt guide AI to use known words
- New word introduction format: "[word] - it means [meaning]"
- Session limits: 5 turns max, 500 tokens per response
- Featured in GameHub 2x2 grid (replacing Matching as featured)

**Deferred Items:**
- Speech recognition integration (requires Web Speech API)
- Pronunciation feedback
- Backend proxy for API key security
- More character personas
- Conversation history in Stats page

**Verification:**
- All 339 unit tests pass (22 new for vocab extraction)
- TypeScript type check passes
- Build compiles successfully
- Conversation accessible from GameHub
- Provider setup screen renders correctly
- Character selection and difficulty work
- Chat session UI displays messages and streaming

---

## 3.2 Pronunciation Challenge Mode (Infrastructure)
**Completed:** 2026-01-08T18:35:00Z
**Files Changed:**

**Documentation:**
- docs/SPEECH_RESEARCH.md — Comprehensive speech recognition research comparing Web Speech API, OpenAI Whisper, Azure Speech Services, and local Whisper with recommendations

**Audio Recording:**
- src/hooks/useAudioRecorder.ts — Audio recording hook with:
  - `startRecording()` / `stopRecording()` / `cancelRecording()` methods
  - Real-time audio level monitoring (0-1 scale)
  - Waveform data extraction for visualization
  - Duration tracking
  - Error handling for permission denied, no device, not supported
  - MediaRecorder with WebM/MP4 output

**Speech Recognition:**
- src/utils/speechRecognition.ts — Speech recognition service with:
  - `recognizeSpeech()` — Single-shot recognition
  - `createSpeechSession()` — Reusable recognition session
  - `comparePronunciation()` — Compare expected vs transcribed text
  - `calculateSimilarity()` — Levenshtein distance-based similarity
  - `normalizeSpanish()` — Accent and punctuation normalization
  - `speakSpanish()` — Text-to-speech for native pronunciation
  - Spanish dialect support (es-ES, es-MX, es-AR, es-CO)

**Visualization Components:**
- src/components/WaveformVisualizer.tsx:
  - `WaveformVisualizer` — Canvas-based waveform display
  - `AudioLevelIndicator` — Simple level bar
  - `WaveformBars` — Animated vertical bars
  - `RecordingIndicator` — Combined duration + level display

**Pronunciation UI:**
- src/components/PronunciationCard.tsx — Single word practice card with:
  - Listen button (native TTS pronunciation)
  - Record button with real-time waveform
  - Result display (pass/fail with similarity percentage)
  - Try again / next word controls
  - Error handling for unsupported browsers

- src/pages/Pronunciation.tsx — Full practice session:
  - Setup screen with word count slider (5-20)
  - Progress bar during session
  - Results summary with per-word breakdown
  - Score calculation and encouragement messages
  - Browser support detection with fallback message

**Navigation:**
- src/types/index.ts — Added 'pronunciation' to Page type
- src/components/GameHub.tsx — Added Pronunciation to games list
- src/App.tsx — Added Pronunciation import and route

**Implementation Notes:**
- Uses Web Speech API (free, simple) as recommended in research
- Chrome/Edge only (Firefox not supported)
- Fuzzy matching with Levenshtein distance (70% threshold)
- Real-time waveform visualization during recording
- Audio level monitoring for visual feedback
- Spanish dialect configurable (defaults to es-ES)
- Session results tracked per word (attempts, similarity)

**Deferred Items:**
- Whisper API integration (premium accuracy)
- Azure Pronunciation Assessment (phoneme feedback)
- Pronunciation history tracking
- Detailed phoneme-level feedback
- Per-word pronunciation scores in card history

**Verification:**
- All 339 tests pass (no new tests for browser APIs)
- TypeScript type check passes
- Build compiles successfully (671KB bundle)
- Pronunciation accessible from GameHub
- Setup screen shows word count selection
- Browser support detection works
- Recording UI shows waveform and level

---

## Moonshot Phase 1: Browser Extension (Infrastructure)
**Completed:** 2026-01-08T19:00:00Z
**Files Changed:**

**Extension Core:**
- extension/manifest.json — Chrome Manifest V3 configuration with permissions for storage, activeTab, all URLs; content scripts, background service worker, popup, and options page
- extension/background.js — Service worker handling:
  - Vocabulary sync from VocabLoop cloud API
  - Local vocabulary import from VocabLoop app
  - Chrome storage management for vocabulary cache
  - Alarm-based periodic sync (every 30 minutes)
  - Message passing between popup/content scripts
  - Pending words queue for offline operation
- extension/content.js — Content script for page highlighting:
  - DOM tree walker for text node processing
  - Vocabulary word matching with mastered/learning/unknown levels
  - Dynamic highlighting with performance batching
  - Hover tooltips showing English translations
  - Click handler for unknown words with "Add to VocabLoop" popup
  - MutationObserver for dynamically loaded content
  - Toggle support for enabling/disabling highlights

**Styles:**
- extension/content.css — Highlight styles:
  - Green background for mastered words (interval >= 21)
  - Yellow background for learning words (interval 1-20)
  - Dotted underline for unknown Spanish words
  - Hover tooltips with translations (CSS pseudo-elements)
  - Add word popup styling
  - Dark mode support via prefers-color-scheme

**Popup UI:**
- extension/popup.html — Extension popup interface
- extension/popup.css — Popup styling with toggles, stats cards, sync status
- extension/popup.js — Popup functionality:
  - Vocabulary stats display (mastered/learning counts)
  - Sync button with loading state
  - Highlighting toggle
  - Translation tooltip toggle
  - Connection status (connect/disconnect VocabLoop account)
  - Settings panel navigation

**Settings:**
- extension/options.html — Full settings page with:
  - API URL configuration
  - Auth token input
  - All toggle options
  - Save/reset functionality

**Assets:**
- extension/icons/ — Placeholder PNG icons (16, 48, 128px)
- extension/icons/generate-icons.js — Node.js script to generate proper icons
- extension/README.md — Extension documentation with installation, setup, and development instructions

**Implementation Notes:**
- Manifest V3 compliant (modern Chrome extension format)
- Service worker for background operations (no persistent background page)
- Content script injects CSS and scans text nodes
- Performance optimized with request animation frame batching
- Vocabulary categorized by SRS interval:
  - Mastered: interval >= 21 days (green)
  - Learning: interval 1-20 days (yellow)
  - Unknown: detected Spanish word not in deck (underline)
- Hover shows English translation tooltip
- Click unknown word to add to VocabLoop deck
- Supports offline operation with pending word queue
- Auto-sync every 30 minutes when connected
- Dark mode support via CSS media query

**Deferred Items:**
- Chrome Web Store packaging and submission
- Production icon design
- End-to-end testing on Spanish news sites
- Firefox compatibility (requires manifest modifications)
- Safari extension port

**Verification:**
- Extension structure complete
- Manifest validates correctly
- All scripts and styles in place
- Placeholder icons created
- Ready for developer mode testing in Chrome

---
