// Weekly challenge system utilities

interface ChallengeData {
  weekStart: string;          // ISO date string of week start
  challenges: ChallengeProgress[];
  completedChallenges: string[]; // IDs of completed challenges
}

interface ChallengeProgress {
  id: string;
  current: number;
  completed: boolean;
  claimedXP: boolean;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  xpReward: number;
  type: 'reviews' | 'streak' | 'perfect_sessions' | 'cards_learned' | 'minutes_studied';
}

const STORAGE_KEY = 'vocabloop_weekly_challenges';

// Weekly challenges - refreshed every Sunday
const CHALLENGE_POOL: Challenge[] = [
  {
    id: 'weekly_reviews_50',
    title: 'Review Warrior',
    description: 'Complete 50 reviews this week',
    icon: '⚔️',
    target: 50,
    xpReward: 150,
    type: 'reviews',
  },
  {
    id: 'weekly_reviews_100',
    title: 'Review Master',
    description: 'Complete 100 reviews this week',
    icon: '🏆',
    target: 100,
    xpReward: 300,
    type: 'reviews',
  },
  {
    id: 'weekly_streak_5',
    title: 'Consistent Learner',
    description: 'Maintain a 5-day streak',
    icon: '🔥',
    target: 5,
    xpReward: 200,
    type: 'streak',
  },
  {
    id: 'weekly_streak_7',
    title: 'Week Warrior',
    description: 'Maintain a 7-day streak',
    icon: '💪',
    target: 7,
    xpReward: 350,
    type: 'streak',
  },
  {
    id: 'weekly_perfect_3',
    title: 'Perfectionist',
    description: 'Complete 3 perfect sessions (no "Again" grades)',
    icon: '✨',
    target: 3,
    xpReward: 250,
    type: 'perfect_sessions',
  },
  {
    id: 'weekly_cards_10',
    title: 'Knowledge Seeker',
    description: 'Learn 10 new cards (3+ reviews)',
    icon: '📚',
    target: 10,
    xpReward: 200,
    type: 'cards_learned',
  },
  {
    id: 'weekly_minutes_30',
    title: 'Dedicated Student',
    description: 'Study for 30 minutes this week',
    icon: '⏱️',
    target: 30,
    xpReward: 175,
    type: 'minutes_studied',
  },
  {
    id: 'weekly_minutes_60',
    title: 'Time Investor',
    description: 'Study for 60 minutes this week',
    icon: '⌛',
    target: 60,
    xpReward: 300,
    type: 'minutes_studied',
  },
];

// Get start of current week (Sunday)
function getWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart.toISOString().split('T')[0];
}

// Get challenge data from storage
function getChallengeData(): ChallengeData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as ChallengeData;
      // Check if it's a new week
      const currentWeekStart = getWeekStart();
      if (data.weekStart !== currentWeekStart) {
        // New week - generate new challenges
        return generateNewWeekChallenges();
      }
      return data;
    }
  } catch {
    // Ignore errors
  }
  return generateNewWeekChallenges();
}

// Save challenge data
function saveChallengeData(data: ChallengeData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Generate new challenges for the week
function generateNewWeekChallenges(): ChallengeData {
  // Pick 3 random challenges from the pool
  const shuffled = [...CHALLENGE_POOL].sort(() => Math.random() - 0.5);
  const selectedChallenges = shuffled.slice(0, 3);

  const data: ChallengeData = {
    weekStart: getWeekStart(),
    challenges: selectedChallenges.map(c => ({
      id: c.id,
      current: 0,
      completed: false,
      claimedXP: false,
    })),
    completedChallenges: [],
  };

  saveChallengeData(data);
  return data;
}

// Get current week's challenges with progress
export function getWeeklyChallenges(): { challenge: Challenge; progress: ChallengeProgress }[] {
  const data = getChallengeData();

  return data.challenges.map(progress => {
    const challenge = CHALLENGE_POOL.find(c => c.id === progress.id);
    if (!challenge) {
      // Fallback in case challenge was removed from pool
      return {
        challenge: CHALLENGE_POOL[0],
        progress,
      };
    }
    return { challenge, progress };
  });
}

// Update challenge progress
export function updateChallengeProgress(type: Challenge['type'], value: number): void {
  const data = getChallengeData();

  for (const progress of data.challenges) {
    const challenge = CHALLENGE_POOL.find(c => c.id === progress.id);
    if (challenge && challenge.type === type) {
      progress.current = value;
      if (value >= challenge.target && !progress.completed) {
        progress.completed = true;
      }
    }
  }

  saveChallengeData(data);
}

// Increment challenge progress
export function incrementChallengeProgress(type: Challenge['type'], amount: number = 1): void {
  const data = getChallengeData();

  for (const progress of data.challenges) {
    const challenge = CHALLENGE_POOL.find(c => c.id === progress.id);
    if (challenge && challenge.type === type) {
      progress.current += amount;
      if (progress.current >= challenge.target && !progress.completed) {
        progress.completed = true;
      }
    }
  }

  saveChallengeData(data);
}

// Claim XP for a completed challenge
export function claimChallengeXP(challengeId: string): number {
  const data = getChallengeData();
  const progress = data.challenges.find(p => p.id === challengeId);
  const challenge = CHALLENGE_POOL.find(c => c.id === challengeId);

  if (!progress || !challenge || !progress.completed || progress.claimedXP) {
    return 0;
  }

  progress.claimedXP = true;
  saveChallengeData(data);

  return challenge.xpReward;
}

// Get days remaining in the week
export function getDaysRemainingInWeek(): number {
  const now = new Date();
  const dayOfWeek = now.getDay();
  return 6 - dayOfWeek; // Days until Saturday (end of challenge week)
}

// Check if there are unclaimed rewards
export function hasUnclaimedRewards(): boolean {
  const data = getChallengeData();
  return data.challenges.some(p => p.completed && !p.claimedXP);
}
