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
