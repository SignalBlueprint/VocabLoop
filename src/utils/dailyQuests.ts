import { addXP } from './xp';

const QUESTS_KEY = 'vocabloop_daily_quests';

export interface Quest {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  xpReward: number;
  type: 'reviews' | 'cards_added' | 'verbs' | 'streak_maintain' | 'perfect_reviews';
}

export interface QuestProgress {
  questId: string;
  current: number;
  claimed: boolean;
}

interface DailyQuestState {
  date: string; // YYYY-MM-DD
  questIds: string[];
  progress: Record<string, QuestProgress>;
}

// All available quests to pick from
const QUEST_POOL: Quest[] = [
  // Review quests
  { id: 'review_5', title: 'Quick Review', description: 'Review 5 cards', icon: '📚', target: 5, xpReward: 15, type: 'reviews' },
  { id: 'review_10', title: 'Steady Learner', description: 'Review 10 cards', icon: '📖', target: 10, xpReward: 25, type: 'reviews' },
  { id: 'review_20', title: 'Dedicated Student', description: 'Review 20 cards', icon: '🎓', target: 20, xpReward: 40, type: 'reviews' },
  { id: 'review_30', title: 'Study Session', description: 'Review 30 cards', icon: '💪', target: 30, xpReward: 60, type: 'reviews' },

  // Perfect review quests
  { id: 'perfect_3', title: 'Triple Perfect', description: 'Get 3 perfect (Good/Easy) reviews', icon: '✨', target: 3, xpReward: 20, type: 'perfect_reviews' },
  { id: 'perfect_5', title: 'Flawless Five', description: 'Get 5 perfect reviews in a row', icon: '🌟', target: 5, xpReward: 35, type: 'perfect_reviews' },
  { id: 'perfect_10', title: 'Perfect Ten', description: 'Get 10 perfect reviews', icon: '💎', target: 10, xpReward: 50, type: 'perfect_reviews' },

  // Card creation quests
  { id: 'add_1', title: 'New Word', description: 'Add 1 new card', icon: '➕', target: 1, xpReward: 10, type: 'cards_added' },
  { id: 'add_3', title: 'Growing Deck', description: 'Add 3 new cards', icon: '📝', target: 3, xpReward: 20, type: 'cards_added' },
  { id: 'add_5', title: 'Vocabulary Builder', description: 'Add 5 new cards', icon: '🏗️', target: 5, xpReward: 35, type: 'cards_added' },

  // Verb practice quests
  { id: 'verbs_5', title: 'Verb Warm-up', description: 'Practice 5 verb conjugations', icon: '🔤', target: 5, xpReward: 15, type: 'verbs' },
  { id: 'verbs_10', title: 'Conjugation Pro', description: 'Practice 10 verb conjugations', icon: '📝', target: 10, xpReward: 30, type: 'verbs' },

  // Streak quests
  { id: 'streak_maintain', title: 'Keep It Going', description: 'Maintain your streak today', icon: '🔥', target: 1, xpReward: 20, type: 'streak_maintain' },
];

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getState(): DailyQuestState | null {
  const stored = localStorage.getItem(QUESTS_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveState(state: DailyQuestState): void {
  localStorage.setItem(QUESTS_KEY, JSON.stringify(state));
}

// Deterministic shuffle based on date
function seededShuffle<T>(array: T[], seed: string): T[] {
  const result = [...array];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash = hash & hash;
  }

  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash) + i;
    hash = hash & hash;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function selectDailyQuests(date: string): string[] {
  // Shuffle quests deterministically based on date
  const shuffled = seededShuffle(QUEST_POOL, date);

  // Select 3 quests, trying to get variety in types
  const selected: Quest[] = [];
  const usedTypes = new Set<string>();

  for (const quest of shuffled) {
    if (selected.length >= 3) break;

    // Prefer quests of different types
    if (!usedTypes.has(quest.type) || selected.length < 2) {
      selected.push(quest);
      usedTypes.add(quest.type);
    }
  }

  // If we don't have 3 yet, fill in
  for (const quest of shuffled) {
    if (selected.length >= 3) break;
    if (!selected.includes(quest)) {
      selected.push(quest);
    }
  }

  return selected.map(q => q.id);
}

// Initialize or get today's quests
export function getDailyQuests(): Array<{ quest: Quest; progress: QuestProgress }> {
  const today = getTodayKey();
  let state = getState();

  // Check if we need new quests for today
  if (!state || state.date !== today) {
    const questIds = selectDailyQuests(today);
    state = {
      date: today,
      questIds,
      progress: {},
    };

    // Initialize progress for each quest
    for (const id of questIds) {
      state.progress[id] = { questId: id, current: 0, claimed: false };
    }

    saveState(state);
  }

  // Return quests with their progress
  return state.questIds.map(id => {
    const quest = QUEST_POOL.find(q => q.id === id)!;
    const progress = state!.progress[id] || { questId: id, current: 0, claimed: false };
    return { quest, progress };
  });
}

// Update progress for a specific quest type
export function updateQuestProgress(type: Quest['type'], increment: number = 1): void {
  const today = getTodayKey();
  const state = getState();

  if (!state || state.date !== today) return;

  for (const questId of state.questIds) {
    const quest = QUEST_POOL.find(q => q.id === questId);
    if (quest && quest.type === type && !state.progress[questId].claimed) {
      state.progress[questId].current = Math.min(
        state.progress[questId].current + increment,
        quest.target
      );
    }
  }

  saveState(state);
}

// Claim XP for a completed quest
export function claimQuestReward(questId: string): number {
  const today = getTodayKey();
  const state = getState();

  if (!state || state.date !== today) return 0;

  const quest = QUEST_POOL.find(q => q.id === questId);
  const progress = state.progress[questId];

  if (!quest || !progress || progress.claimed) return 0;
  if (progress.current < quest.target) return 0;

  // Award XP
  addXP(quest.xpReward);
  progress.claimed = true;
  saveState(state);

  return quest.xpReward;
}

// Check if all daily quests are complete
export function areAllQuestsComplete(): boolean {
  const quests = getDailyQuests();
  return quests.every(q => q.progress.current >= q.quest.target && q.progress.claimed);
}

// Get time until quests reset
export function getTimeUntilReset(): { hours: number; minutes: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
}
