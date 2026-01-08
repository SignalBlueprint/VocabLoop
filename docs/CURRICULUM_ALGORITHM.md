# VocabLoop Adaptive Curriculum Algorithm

## Overview

The Adaptive Curriculum Engine powers "Smart Sessions" that dynamically mix due reviews, weak-tag reinforcement, and new cards based on real-time performance. Unlike standard review sessions that only show due cards, Smart Sessions optimize for long-term retention by addressing weakness patterns and maintaining learner confidence.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Smart Session Flow                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐     ┌──────────────┐     ┌──────────────────┐   │
│   │ Session  │────►│  Curriculum  │────►│ Card Selection   │   │
│   │ Config   │     │   Engine     │     │ (weighted mix)   │   │
│   └──────────┘     └──────────────┘     └────────┬─────────┘   │
│                           ▲                      │              │
│                           │                      ▼              │
│                    ┌──────┴──────┐        ┌──────────────┐     │
│                    │ Performance │◄───────│   Review     │     │
│                    │  Tracker    │        │   UI         │     │
│                    └─────────────┘        └──────────────┘     │
│                           │                                     │
│                           ▼                                     │
│                    ┌─────────────┐                              │
│                    │ Confidence  │                              │
│                    │ Recovery    │                              │
│                    └─────────────┘                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Card Selection Weights

The default card mix for Smart Sessions follows a 60/25/15 distribution:

| Category | Weight | Description |
|----------|--------|-------------|
| **Due Cards** | 60% | Cards past their due date that need review |
| **Weak Tag Cards** | 25% | Cards from tags with poor performance |
| **New Cards** | 15% | Fresh cards not yet learned |

### Example Session (20 cards)

```
Due cards:      12 (60%)
Weak tag cards:  5 (25%)
New cards:       3 (15%)
```

### Dynamic Adjustment

Weights adjust based on available cards:

1. **No due cards**: Redistribute to 60% weak tag, 40% new
2. **No weak tags identified**: Redistribute to 75% due, 25% new
3. **No new cards**: Redistribute to 75% due, 25% weak tag
4. **Only one category available**: 100% from that category

## Weak Tag Criteria

A tag is classified as "weak" when it meets **both** conditions:

```typescript
interface WeakTagCriteria {
  successRate: number;    // < 70% (based on last 30 days of reviews)
  minimumCardCount: number; // >= 5 cards with this tag
}
```

### Success Rate Calculation

```typescript
successRate = (reviewsNotAgain / totalReviews) * 100

// Where:
// - reviewsNotAgain = reviews where grade !== 'again'
// - totalReviews = all reviews in last 30 days for tag's cards
```

### Weak Tag Ranking

When multiple weak tags exist, prioritize by:

1. **Lowest success rate** (worst performing first)
2. **Most card count** (tie-breaker: larger impact)

### Example

| Tag | Cards | Success Rate | Status |
|-----|-------|--------------|--------|
| verbs | 45 | 62% | ⚠️ Weak (< 70%, >= 5 cards) |
| food | 12 | 85% | ✅ Strong |
| animals | 8 | 58% | ⚠️ Weak |
| colors | 3 | 40% | ❌ Insufficient data (< 5 cards) |

## Confidence Recovery Logic

Consecutive failures trigger easier card insertion to maintain learner motivation.

### Trigger Condition

```
IF consecutiveFailures >= 2:
    INSERT card from strong tag (successRate > 85%)
    RESET consecutiveFailures counter
```

### Strong Tag Selection

A "strong tag" for confidence recovery must have:
- `successRate >= 85%`
- `cardCount >= 3`
- Card selected should have `intervalDays >= 7` (well-learned)

### Recovery Flow

```
┌─────────────┐
│ User fails  │
│ card #1     │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ failures=1  │
│ Next card:  │
│ normal mix  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ User fails  │
│ card #2     │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ failures=2 → TRIGGER    │
│ Next card: strong tag   │
│ (confidence booster)    │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ User succeeds           │
│ failures=0 → RESET      │
│ Resume normal mix       │
└─────────────────────────┘
```

### Edge Cases

- **No strong tags available**: Skip recovery, continue normal mix
- **Strong tag but no due cards from it**: Use any card with `intervalDays >= 14`
- **All attempts at confidence recovery also fail**: Log for analytics, show encouragement message

## Session Configuration

```typescript
interface SessionConfig {
  mode: 'smart' | 'due-only' | 'tag-focus';
  targetCards: number;      // 10-50 cards per session
  tagFocus?: string;        // For 'tag-focus' mode only

  // Optional overrides (defaults shown)
  weights?: {
    due: number;            // default: 60
    weakTag: number;        // default: 25
    new: number;            // default: 15
  };

  enableConfidenceRecovery?: boolean;  // default: true
}
```

### Session Modes

| Mode | Description |
|------|-------------|
| `smart` | Full adaptive algorithm with weighted mix |
| `due-only` | Traditional SRS: only shows due cards |
| `tag-focus` | Focus on specific tag (e.g., "verbs") |

## Card Selection Algorithm

```typescript
function selectNextCard(
  config: SessionConfig,
  state: SessionState
): Card | null {

  // 1. Check for confidence recovery trigger
  if (state.consecutiveFailures >= 2 && config.enableConfidenceRecovery) {
    const recoveryCard = selectConfidenceRecoveryCard(state);
    if (recoveryCard) {
      return recoveryCard;
    }
  }

  // 2. Determine category based on weights
  const category = weightedRandomSelect([
    { type: 'due', weight: config.weights.due },
    { type: 'weakTag', weight: config.weights.weakTag },
    { type: 'new', weight: config.weights.new }
  ]);

  // 3. Get available cards from category
  const pool = getCardPool(category, state);

  // 4. Fallback if pool empty
  if (pool.length === 0) {
    return selectFromAnyAvailable(state);
  }

  // 5. Select from pool (prioritize unseen in session)
  return selectFromPool(pool, state.reviewedInSession);
}
```

### Card Pool Selection

```typescript
function getCardPool(category: string, state: SessionState): Card[] {
  switch (category) {
    case 'due':
      return state.allCards.filter(c => c.dueAt <= Date.now());

    case 'weakTag':
      const weakTags = identifyWeakTags(state.allCards, state.recentReviews);
      return state.allCards.filter(c =>
        c.tags.some(t => weakTags.includes(t)) &&
        !state.reviewedInSession.has(c.id)
      );

    case 'new':
      return state.allCards.filter(c =>
        c.reps === 0 &&
        !state.reviewedInSession.has(c.id)
      );
  }
}
```

## Session State Tracking

```typescript
interface SessionState {
  // Configuration
  config: SessionConfig;

  // Cards
  allCards: Card[];
  recentReviews: ReviewLog[];

  // Session progress
  reviewedInSession: Set<string>;  // Card IDs reviewed this session
  sessionResults: ReviewResult[];  // Results so far

  // Performance tracking
  consecutiveFailures: number;
  sessionSuccessRate: number;

  // Weak tag tracking
  identifiedWeakTags: string[];
  weakTagCardsReviewed: number;
}

interface ReviewResult {
  cardId: string;
  grade: Grade;
  timeMs: number;        // Response time
  wasRecoveryCard: boolean;
}
```

## Session Summary Insights

After session completion, generate actionable insights:

### Insight Categories

1. **Performance Summary**
   ```
   "You reviewed 25 cards with 84% success rate"
   "Average response time: 3.2 seconds"
   ```

2. **Tag Performance**
   ```
   "Struggled with 'verbs' (60% success) - more practice recommended"
   "Strong performance on 'food' (95% success)"
   ```

3. **Confidence Recovery Impact**
   ```
   "Confidence boosters helped: 3 easy cards inserted after struggles"
   "Recovery rate after boosters: 80%"
   ```

4. **Tomorrow Prediction**
   ```
   "Tomorrow's session will include more 'verb' practice"
   "Estimated 18 cards due tomorrow"
   ```

### Insight Generation Rules

| Condition | Insight |
|-----------|---------|
| Tag success < 60% | "Struggled with [tag] - more practice scheduled" |
| Overall success > 90% | "Excellent session! Consider adding new cards" |
| Many confidence recoveries | "Tough session - great job pushing through!" |
| Response time trending down | "Getting faster! Automaticity improving" |

## Rolling Tag Weakness Tracking

Track 7-day rolling success rates per tag for persistent analysis:

```typescript
interface TagWeaknessRecord {
  tag: string;
  dailyStats: {
    date: string;         // YYYY-MM-DD
    reviews: number;
    successes: number;
  }[];

  // Computed
  rollingSuccessRate: number;  // Last 7 days
  trend: 'improving' | 'stable' | 'declining';
}
```

### Storage

Store in localStorage:
```
vocabloop_tag_weakness: {
  [tag: string]: TagWeaknessRecord
}
```

### Update Trigger

Update after each review session completes.

## Performance Considerations

### Efficient Weak Tag Identification

- Cache weak tag calculation (invalidate on new reviews)
- Only analyze reviews from last 30 days
- Limit to top 5 weak tags for selection pool

### Session Card Preloading

- Calculate full session card order upfront when possible
- Re-evaluate only when confidence recovery triggers
- Batch database reads at session start

## Testing Strategy

### Unit Tests Required

1. `calculateMix()` - verify weight distribution
2. `identifyWeakTags()` - correct filtering criteria
3. `selectNextCard()` - proper category selection
4. `confidenceRecovery()` - trigger conditions
5. `generateInsights()` - appropriate messages

### Edge Case Tests

- Session with 0 due cards
- Session with no weak tags
- Session with all new cards
- 5+ consecutive failures
- Session ends mid-recovery

## Future Enhancements

1. **Time-aware selection**: Prefer cards from user's optimal hours
2. **Difficulty ramping**: Start easy, increase difficulty mid-session
3. **Interleaving**: Mix card types (basic, cloze, verb) strategically
4. **Fatigue detection**: Shorter sessions if response times degrade
5. **Personalized weights**: Learn optimal mix per user over time
