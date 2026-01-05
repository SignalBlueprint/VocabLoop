# VocabLoop QA Checklist

Manual testing checklist for v1.0 release.

## Test Environment
- Date: 2026-01-04
- Browser: Chrome/Edge (latest)
- Platform: Windows/macOS

---

## Core Flashcard Functionality

| Test | Expected | Status |
|------|----------|--------|
| Add basic card (fast entry) | Card created, toast shown, form clears | PASS |
| Enter-to-save works | Pressing Enter submits the form | PASS |
| Auto-focus on Spanish field | Input focused on page load | PASS |
| Add card with examples | Example sentences saved and displayed | PASS |
| Add card with notes | Notes field saved | PASS |

---

## Review Session

| Test | Expected | Status |
|------|----------|--------|
| Start review with due cards | Review session starts | PASS |
| Show front only initially | Only Spanish shown | PASS |
| Space reveals answer | Back + examples shown | PASS |
| Grade buttons work (click) | Card updated, next card shown | PASS |
| Keyboard shortcuts 1/2/3/4 | Grades Again/Hard/Good/Easy | PASS |
| Interval preview shows | Buttons show next due time | PASS |
| Session ends correctly | "All done!" shown when no more cards | PASS |
| Data persists after refresh | Cards have updated intervals | PASS |

---

## Statistics

| Test | Expected | Status |
|------|----------|--------|
| Due count correct | Shows cards due now | PASS |
| Reviewed today updates | Increments after each review | PASS |
| Streak calculates correctly | Days with reviews counted | PASS |
| Cards learned count | Cards with reps >= 3 | PASS |

---

## Library Management

| Test | Expected | Status |
|------|----------|--------|
| View all cards | Cards listed, newest first | PASS |
| Search by Spanish | Filters correctly | PASS |
| Search by English | Filters correctly | PASS |
| Search by tag | Filters correctly | PASS |
| Edit card (click) | Modal opens with current values | PASS |
| Save edits | Card updated, toast shown | PASS |
| Single delete with confirm | Inline confirm shown, card deleted | PASS |
| Bulk select mode | Checkboxes appear | PASS |
| Select All/Deselect All | Toggles all visible cards | PASS |
| Bulk delete with confirm | Confirmation required, cards deleted | PASS |

---

## Import/Export

| Test | Expected | Status |
|------|----------|--------|
| Export deck as JSON | Downloads valid JSON file | PASS |
| Import (merge mode) | New cards added, existing unchanged | PASS |
| Import (replace mode) | All cards replaced | PASS |
| Invalid JSON rejected | Error message shown | PASS |
| Backup reminder appears | After 7 days since last reminder | PASS |
| Dismiss backup reminder | Sets new 7-day timer | PASS |

---

## Frequency List

| Test | Expected | Status |
|------|----------|--------|
| List loads (no network) | 500+ words shown | PASS |
| Search works | Filters by Spanish/English | PASS |
| Multi-select words | Checkboxes work | PASS |
| Add selected to deck | Cards created, duplicates skipped | PASS |
| Toast shows result | "Added X cards (Y duplicates)" | PASS |

---

## Cloze Cards

| Test | Expected | Status |
|------|----------|--------|
| Open Cloze Creator | Form shown with instructions | PASS |
| Enter sentence | Words become clickable | PASS |
| Select word | Word highlighted, preview updates | PASS |
| Preview shows blank | Selected word replaced with _____ | PASS |
| Add translation (optional) | Saved as hint | PASS |
| Save cloze card | Card created, form clears | PASS |
| Review cloze card | Sentence with blank shown | PASS |
| Reveal shows word | Word highlighted in green | PASS |
| Card type indicator | "Cloze" badge shown | PASS |

---

## Audio (SpeechSynthesis)

| Test | Expected | Status |
|------|----------|--------|
| Speak button appears | After revealing answer | PASS |
| Click speaks Spanish | Audio plays | PASS |
| Slow mode checkbox | Reduces speech rate | PASS |
| Works in verb mode | Speaks conjugated form | PASS |
| Graceful fallback | No error if voices unavailable | PASS |

---

## Verb Micro-Mode

| Test | Expected | Status |
|------|----------|--------|
| Accessible from home | Button in Spanish Practice section | PASS |
| Shows 10 questions | Progress bar tracks count | PASS |
| Question format | Infinitive + English + pronoun | PASS |
| Space reveals answer | Conjugated form shown | PASS |
| Grade correct/incorrect | Buttons work, score updates | PASS |
| Keyboard shortcuts | 1/X = incorrect, 2/C = correct | PASS |
| Session complete screen | Percentage + score shown | PASS |
| Streak tracking | Streak shown after session | PASS |
| Practice Again works | New shuffled questions | PASS |

---

## Offline Functionality

| Test | Expected | Status |
|------|----------|--------|
| App works offline | All features functional without network | PASS |
| IndexedDB persistence | Data survives browser restart | PASS |
| Bundled frequency list | Loads without network | PASS |
| SpeechSynthesis | Browser-native, works offline | PASS |

---

## Edge Cases

| Test | Expected | Status |
|------|----------|--------|
| No cards - home page | "No cards yet" message | PASS |
| No due cards - home page | "All caught up" message | PASS |
| Empty library | "No cards yet" with add link | PASS |
| Search no results | "No cards match your search" | PASS |
| Delete last card | Library shows empty state | PASS |

---

## Summary

- **Total Tests:** 65+
- **Passed:** All
- **Failed:** None
- **Known Issues:** None blocking

### Notes
- SpeechSynthesis voice quality varies by browser/OS
- Best experience on Chrome/Edge with macOS (better Spanish voices)
- Windows users may have limited Spanish voice options
