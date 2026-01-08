# VocabLoop Skill Tree System

Design document for the gamification skill tree that provides long-term progression goals.

## Overview

The skill tree transforms vocabulary learning into an RPG-like progression system. Users unlock skills, earn badges, and see their mastery grow across different categories of Spanish proficiency.

## Skill Categories

### 1. Vocabulario (Vocabulary)

**Theme:** Building word knowledge
**Color:** Emerald (#10b981)
**Icon:** Book

| Skill | Requirement | Badge |
|-------|-------------|-------|
| Word Collector | Learn 50 words | Collector |
| Vocabulary Builder | Learn 200 words | Builder |
| Word Hoarder | Learn 500 words | Hoarder |
| Lexicon Master | Learn 1000 words | Lexicon |
| Dictionary | Learn 2500 words | Dictionary |

### 2. Consistencia (Consistency)

**Theme:** Daily practice habits
**Color:** Blue (#3b82f6)
**Icon:** Calendar

| Skill | Requirement | Badge |
|-------|-------------|-------|
| Getting Started | 3-day streak | Starter |
| Week Warrior | 7-day streak | Weekly |
| Habit Forming | 14-day streak | Habitual |
| Monthly Master | 30-day streak | Monthly |
| Century Club | 100-day streak | Centurion |
| Year of Spanish | 365-day streak | Yearly |

### 3. Precisión (Precision)

**Theme:** Review accuracy
**Color:** Yellow (#eab308)
**Icon:** Target

| Skill | Requirement | Badge |
|-------|-------------|-------|
| Careful Student | 80% accuracy in 50 reviews | Careful |
| Sharp Mind | 85% accuracy in 200 reviews | Sharp |
| Precision Expert | 90% accuracy in 500 reviews | Precise |
| Nearly Perfect | 95% accuracy in 1000 reviews | Flawless |

### 4. Velocidad (Speed)

**Theme:** Quick recall
**Color:** Orange (#f97316)
**Icon:** Lightning

| Skill | Requirement | Badge |
|-------|-------------|-------|
| Quick Thinker | Answer 50 cards in <3s avg | Quick |
| Speed Demon | Answer 200 cards in <2s avg | Speedy |
| Lightning Fast | Answer 500 cards in <1.5s avg | Lightning |
| Instant Recall | Answer 1000 cards in <1s avg | Instant |

### 5. Maestría (Mastery)

**Theme:** Long-term retention
**Color:** Purple (#8b5cf6)
**Icon:** Crown

| Skill | Requirement | Badge |
|-------|-------------|-------|
| Apprentice | Master 25 words (interval >21 days) | Apprentice |
| Journeyman | Master 100 words | Journeyman |
| Expert | Master 250 words | Expert |
| Master | Master 500 words | Master |
| Grandmaster | Master 1000 words | Grandmaster |

### 6. Explorador (Explorer)

**Theme:** Using different features
**Color:** Teal (#14b8a6)
**Icon:** Compass

| Skill | Requirement | Badge |
|-------|-------------|-------|
| Curious | Try 3 different game modes | Curious |
| Adventurer | Complete 10 sessions in each game mode | Adventurer |
| Explorer | Use all features (conversation, pronunciation, multiplayer) | Explorer |
| Completionist | Unlock 50% of all skills | Completionist |

### 7. Social (Social)

**Theme:** Multiplayer and community
**Color:** Pink (#ec4899)
**Icon:** Users

| Skill | Requirement | Badge |
|-------|-------------|-------|
| First Match | Complete 1 multiplayer match | Competitor |
| Regular Player | Complete 10 multiplayer matches | Regular |
| Winner | Win 5 multiplayer matches | Winner |
| Champion | Win 25 multiplayer matches | Champion |
| Undefeated | Win 10 matches in a row | Undefeated |

### 8. Conversador (Conversationalist)

**Theme:** AI conversation practice
**Color:** Indigo (#6366f1)
**Icon:** Chat

| Skill | Requirement | Badge |
|-------|-------------|-------|
| First Words | Complete 1 AI conversation | Talkative |
| Chatty | Complete 10 AI conversations | Chatty |
| Conversationalist | Complete 50 AI conversations | Conversational |
| Fluent Speaker | Use 100 unique words in conversations | Fluent |

### 9. Pronunciación (Pronunciation)

**Theme:** Speaking practice
**Color:** Rose (#f43f5e)
**Icon:** Microphone

| Skill | Requirement | Badge |
|-------|-------------|-------|
| First Sound | Complete 1 pronunciation session | Speaker |
| Clear Voice | Achieve 80% accuracy in 50 words | Clear |
| Perfect Accent | Achieve 95% accuracy in 100 words | Perfect |
| Native-Like | Achieve 90% accuracy in 500 words | Native |

## Skill Tree Visualization

```
                    ╭─────────────╮
                    │  VOCABULARIO│
                    │    📚 🟢    │
                    ╰──────┬──────╯
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ╭──────┴─────╮  ╭──────┴──────╮  ╭─────┴──────╮
    │CONSISTENCIA│  │   MAESTRÍA  │  │  PRECISIÓN │
    │   📅 🔵    │  │    👑 🟣    │  │   🎯 🟡   │
    ╰──────┬─────╯  ╰──────┬──────╯  ╰─────┬──────╯
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ╭──────┴──────╮
                    │  VELOCIDAD  │
                    │    ⚡ 🟠    │
                    ╰──────┬──────╯
                           │
           ┌───────────────┼───────────────┐
           │               │               │
    ╭──────┴─────╮  ╭──────┴──────╮  ╭─────┴──────╮
    │ EXPLORADOR │  │   SOCIAL    │  │CONVERSADOR │
    │   🧭 🩵    │  │    👥 💗    │  │   💬 🔷    │
    ╰──────┬─────╯  ╰──────┬──────╯  ╰─────┬──────╯
           │               │               │
           └───────────────┼───────────────┘
                           │
                    ╭──────┴──────╮
                    │PRONUNCIACIÓN│
                    │    🎤 🌹    │
                    ╰─────────────╯
```

## Badge Display

Badges are displayed:
- In user profile/stats page
- During review when milestone reached
- In skill tree visualization (unlocked vs locked)

### Badge States

1. **Locked** - Gray silhouette, requirements shown
2. **In Progress** - Colored with progress bar
3. **Unlocked** - Full color with checkmark
4. **Featured** - User's selected showcase badges (max 3)

## Progress Tracking

### Data Model

```typescript
interface SkillProgress {
  categoryId: string;
  skillId: string;
  currentValue: number;
  targetValue: number;
  unlockedAt: number | null;
  featured: boolean;
}

interface UserSkills {
  userId: string;
  skills: SkillProgress[];
  featuredBadges: string[]; // Max 3 skill IDs
  totalXP: number;
  level: number;
}
```

### XP System

Each skill unlock grants XP:
- Tier 1 skills: 100 XP
- Tier 2 skills: 250 XP
- Tier 3 skills: 500 XP
- Tier 4 skills: 1000 XP
- Tier 5 skills: 2500 XP

Levels based on total XP:
- Level 1: 0 XP
- Level 2: 500 XP
- Level 3: 1500 XP
- Level 4: 3500 XP
- Level 5: 7000 XP
- Level 10: 25000 XP
- Level 20: 100000 XP

## UI Components

### Skill Tree Page

- Visual tree layout showing all categories
- Tap category to expand and see skills
- Progress bars on each skill
- Celebration animation on unlock

### Profile Badge Section

- Grid of 3 featured badges
- "View All" expands to full skill tree
- Badges show shine animation when new

### Achievement Toast

- Slides in from top when skill unlocked
- Shows badge icon, name, and XP gained
- Tap to go to skill tree

## Implementation Notes

### Storage

- Store SkillProgress in localStorage
- Sync with cloud if authenticated
- Check for unlocks after each review

### Performance

- Calculate progress on-demand, not real-time
- Cache unlocked skills
- Batch achievement checks (every 10 reviews)

### Accessibility

- All badges have alt text descriptions
- Progress announced to screen readers
- Keyboard navigable skill tree
