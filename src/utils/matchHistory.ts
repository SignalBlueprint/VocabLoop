import type { CardResult } from '../hooks/useMultiplayer';

export interface MatchResult {
  id: string;
  date: number;
  myName: string;
  opponentName: string;
  myScore: number;
  opponentScore: number;
  outcome: 'win' | 'loss' | 'tie';
  cardResults: CardResult[];
}

const STORAGE_KEY = 'vocabloop_match_history';
const MAX_HISTORY = 50; // Keep last 50 matches

/**
 * Get all match history from localStorage
 */
export function getMatchHistory(): MatchResult[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as MatchResult[];
  } catch {
    return [];
  }
}

/**
 * Save a match result to history
 */
export function saveMatchResult(result: Omit<MatchResult, 'id'>): MatchResult {
  const history = getMatchHistory();

  const newResult: MatchResult = {
    ...result,
    id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  };

  // Add to beginning (most recent first)
  history.unshift(newResult);

  // Trim to max history
  if (history.length > MAX_HISTORY) {
    history.splice(MAX_HISTORY);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage full or unavailable
  }

  return newResult;
}

/**
 * Clear all match history
 */
export function clearMatchHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Get match statistics
 */
export function getMatchStats(): {
  totalMatches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  avgScore: number;
  avgOpponentScore: number;
  totalCardsCorrect: number;
  totalCardsPlayed: number;
} {
  const history = getMatchHistory();

  if (history.length === 0) {
    return {
      totalMatches: 0,
      wins: 0,
      losses: 0,
      ties: 0,
      winRate: 0,
      avgScore: 0,
      avgOpponentScore: 0,
      totalCardsCorrect: 0,
      totalCardsPlayed: 0,
    };
  }

  const wins = history.filter(m => m.outcome === 'win').length;
  const losses = history.filter(m => m.outcome === 'loss').length;
  const ties = history.filter(m => m.outcome === 'tie').length;

  const totalScore = history.reduce((sum, m) => sum + m.myScore, 0);
  const totalOpponentScore = history.reduce((sum, m) => sum + m.opponentScore, 0);

  const totalCardsCorrect = history.reduce((sum, m) =>
    sum + m.cardResults.filter(c => c.player1Correct).length, 0);
  const totalCardsPlayed = history.reduce((sum, m) => sum + m.cardResults.length, 0);

  return {
    totalMatches: history.length,
    wins,
    losses,
    ties,
    winRate: Math.round((wins / history.length) * 100),
    avgScore: Math.round(totalScore / history.length * 10) / 10,
    avgOpponentScore: Math.round(totalOpponentScore / history.length * 10) / 10,
    totalCardsCorrect,
    totalCardsPlayed,
  };
}
