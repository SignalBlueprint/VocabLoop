# VocabLoop Enhancement Roadmap

A prioritized list of feature enhancements and design improvements for VocabLoop.

---

## Quick Wins (High Impact, Low Effort)

### Review Experience
- [ ] **Session Summary** - Show stats when review completes (time, cards reviewed, XP earned, accuracy)
- [ ] **Smart Card Order** - Show harder cards (low success rate) first in session
- [ ] **Streak Action Path** - "You need X reviews in Y hours to save your streak"
- [ ] **Review Direction Indicator** - Visual badge showing current mode (ES→EN, EN→ES, Mixed)

### Mobile & Touch
- [ ] **Larger Touch Targets** - Increase button sizes to minimum 44x44px
- [ ] **Haptic Feedback** - Vibration on swipe gestures (where supported)
- [ ] **Swipe Tutorial** - Show swipe hints only for first-time users

### Accessibility
- [ ] **Focus Ring Improvements** - More visible focus indicators on all interactive elements
- [ ] **Alt Text for Emojis** - Add title/aria-label to all emoji indicators
- [ ] **Number Pad Support** - Allow numpad 1-4 as alternative to top row

---

## High Value Features (High Impact, Medium Effort)

### Learning & Analytics
- [ ] **Time of Day Analysis** - Show when user is most productive (morning vs evening)
- [ ] **Card Difficulty Ranking** - Full list of cards ranked by success rate (not just bottom 10)
- [ ] **Forgetting Curve Graph** - Visualize retention over time for each card
- [ ] **Learning Velocity** - Cards learned per week trend chart

### Gamification
- [ ] **Daily Quests** - 3 daily objectives beyond weekly challenges
  - "Review 5 cards you're struggling with"
  - "Add 3 new cards"
  - "Practice verbs for 5 minutes"
- [ ] **Streak Milestones** - Celebrations at 7, 14, 30, 50, 100 days with bonus XP
- [ ] **Streak Insurance** - Spend XP to save a broken streak (1x per week)
- [ ] **XP Multiplier Events** - Weekend 2x XP, holiday bonuses

### Review Enhancements
- [ ] **Immersion Mode** - Option to hide English completely until after grading
- [ ] **Card Flip Animation** - Smooth 3D flip when revealing answer
- [ ] **Quick Add in Review** - Add new cards without leaving review session
- [ ] **Related Words** - When struggling, suggest related vocabulary

### Design Polish
- [ ] **Card Design Refresh** - Better shadows, spacing, typography hierarchy
- [ ] **Progress Ring Animations** - Entrance animations for all progress indicators
- [ ] **Icon System** - Replace emoji with consistent icon set (Lucide/Heroicons)
- [ ] **Error State Illustrations** - Friendly illustrations for empty/error states

---

## Medium Priority Enhancements

### Performance
- [ ] **Virtual Scrolling** - For libraries with 1000+ cards
- [ ] **IndexedDB Indexes** - Query by mastery level, tags without fetching all
- [ ] **Session Caching** - Cache last review session to prevent reloading

### Content Expansion
- [ ] **More Verb Tenses** - Add subjunctive, conditional, imperative
- [ ] **Reflexive Verbs** - Add common reflexive verbs to verb mode
- [ ] **Top 1000 Words** - Expand frequency list beyond 500
- [ ] **Domain Vocabularies** - Travel, food, business, medical word packs
- [ ] **Regional Variants** - Spain vs Latin America pronunciation/vocabulary

### Learning Features
- [ ] **Grammar Pattern Groups** - Auto-categorize cards by grammar (gendered nouns, verb types)
- [ ] **Pronunciation Challenges** - Test recognition of similar-sounding words
- [ ] **Synonym Suggestions** - When adding cards, suggest related synonyms
- [ ] **IPA Transcription** - Show phonetic spelling for difficult words

### Mobile Experience
- [ ] **Bottom Navigation** - Move nav tabs to bottom for easier thumb reach
- [ ] **Landscape Optimization** - Better layout for horizontal orientation
- [ ] **Long Press Menu** - Quick actions (edit, delete, tag) on card long press
- [ ] **Pull to Refresh** - Refresh home page stats with pull gesture

### Accessibility
- [ ] **Screen Reader Optimization** - aria-live regions for dynamic content
- [ ] **Color Blind Mode** - Alternative color schemes
- [ ] **Font Size Settings** - User-adjustable base font size
- [ ] **High Contrast Mode** - Extra contrast for low vision users
- [ ] **Keyboard Navigation** - Arrow keys for library navigation

---

## Strategic Features (High Impact, Large Effort)

### Social & Multiplayer
- [ ] **Friend Leaderboards** - Compare XP, streaks, cards learned with friends
- [ ] **Study Groups** - Create groups, share decks, see group progress
- [ ] **Multiplayer Challenges** - Real-time or async race to complete reviews
- [ ] **Deck Sharing** - Share decks via QR code or link

### Advanced Learning
- [ ] **Adaptive Difficulty** - Auto-adjust based on performance patterns
- [ ] **Spaced Repetition Tuning** - Per-card-type ease factors
- [ ] **Learning Path Recommendations** - Suggest what to learn next
- [ ] **Predicted Mastery Dates** - When will each card be fully learned?

### Content
- [ ] **Example Sentence Database** - Multiple examples per word
- [ ] **Image Support** - Add images to cards for visual learning
- [ ] **Audio Recordings** - Native speaker recordings (vs TTS)
- [ ] **Grammar Explanations** - Inline grammar notes and rules

### Analytics
- [ ] **Learning Analytics Dashboard** - Comprehensive insights page
- [ ] **Export Reports** - PDF/CSV progress reports
- [ ] **Comparison Mode** - Week vs week, month vs month stats
- [ ] **Retention Predictions** - ML-based forgetting predictions

---

## Mini-Games & Modes

### New Practice Modes
- [ ] **Speed Round** - 30-second timer per card, bonus XP for fast answers
- [ ] **Memory Match** - Pair Spanish-English cards in grid
- [ ] **Word Chain** - Words must start with last letter of previous
- [ ] **Listening Only** - Audio plays, user types what they hear
- [ ] **Boss Battles** - Hard cards that require 3 correct reviews for bonus XP

---

## Technical Improvements

### Code Quality
- [ ] **Component Library** - Extract reusable UI components
- [ ] **E2E Tests** - Add Playwright tests for critical flows
- [ ] **Error Boundaries** - Graceful error handling throughout
- [ ] **Analytics Events** - Track feature usage for prioritization

### Infrastructure
- [ ] **Cloud Sync** - Optional account system with cloud backup
- [ ] **Push Notifications** - Streak reminders, daily goal nudges
- [ ] **Widget Support** - iOS/Android home screen widgets
- [ ] **Watch App** - Quick review on smartwatch

---

## Priority Matrix

| Priority | Impact | Effort | Examples |
|----------|--------|--------|----------|
| P0 | High | Small | Session summary, streak action path, touch targets |
| P1 | High | Medium | Daily quests, time analysis, card flip animation |
| P2 | Medium | Medium | Virtual scrolling, verb tenses, bottom nav |
| P3 | High | Large | Leaderboards, study groups, adaptive difficulty |
| P4 | Medium | Large | Cloud sync, native audio, ML predictions |

---

## Suggested Implementation Order

### Phase 1: Polish (1-2 weeks)
1. Session summary after review
2. Card flip animation
3. Streak milestones with celebrations
4. Touch target improvements
5. Focus ring accessibility

### Phase 2: Engagement (2-3 weeks)
1. Daily quests system
2. Streak insurance feature
3. Time of day analytics
4. Card difficulty ranking page
5. Immersion mode toggle

### Phase 3: Content (2-3 weeks)
1. Expand verb tenses (subjunctive, conditional)
2. Top 1000 frequency list
3. Example sentence library
4. Related word suggestions

### Phase 4: Performance (1-2 weeks)
1. Virtual scrolling for library
2. IndexedDB query optimization
3. Session caching

### Phase 5: Social (4+ weeks)
1. Deck sharing with QR codes
2. Friend leaderboards
3. Study groups
4. Multiplayer challenges

---

## Notes

- All features should support dark mode
- Mobile-first design approach
- Maintain offline-first architecture
- Consider accessibility from the start
- Keep bundle size reasonable (<500KB gzipped)
