import type { Card, ReviewLog } from '../types';
import { supabase, canUseCloudFeatures } from '../lib/supabase';
import { getCurrentUser } from './auth';
import { getAllCards, importCards } from '../db/cards';
import { getAllReviews } from '../db/reviews';
import { bulkPut } from '../db/index';
import {
  getEncryptionKey,
  encryptCardContent,
  decryptCardContent,
  clearEncryptionKey,
} from './encryption';

// Database record types (matches schema in docs/SCHEMA.md)
interface DbCardRecord {
  id: string;
  user_id: string;
  type: 'BASIC' | 'CLOZE' | 'VERB';
  front: string;
  back: string;
  example_es: string | null;
  example_en: string | null;
  notes: string | null;
  tags: string[];
  cloze_sentence: string | null;
  cloze_word: string | null;
  ease: number;
  interval_days: number;
  reps: number;
  due_at: number;
  lapses: number;
  last_reviewed_at: number | null;
  created_at: number;
  updated_at: number;
  server_updated_at: string;
  deleted_at: string | null;
}

interface DbReviewRecord {
  id: string;
  user_id: string;
  card_id: string;
  reviewed_at: number;
  grade: 'again' | 'hard' | 'good' | 'easy';
  previous_interval: number;
  new_interval: number;
  previous_due_at: number;
  new_due_at: number;
  server_created_at: string;
}

// Local storage keys
const LAST_SYNC_KEY = 'vocabloop_last_sync';
const PENDING_CHANGES_KEY = 'vocabloop_pending_changes';

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export interface SyncResult {
  success: boolean;
  error?: string;
  cardsUploaded: number;
  cardsDownloaded: number;
  reviewsUploaded: number;
  reviewsDownloaded: number;
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  cardId: string;
  localCard: Card;
  remoteCard: Card;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
}

export interface PendingChange {
  type: 'card' | 'review';
  action: 'create' | 'update' | 'delete';
  id: string;
  timestamp: number;
}

/**
 * Get last sync timestamp
 */
export function getLastSyncTime(): number | null {
  const stored = localStorage.getItem(LAST_SYNC_KEY);
  return stored ? parseInt(stored, 10) : null;
}

/**
 * Set last sync timestamp
 */
function setLastSyncTime(timestamp: number): void {
  localStorage.setItem(LAST_SYNC_KEY, timestamp.toString());
}

/**
 * Get pending changes queue
 */
export function getPendingChanges(): PendingChange[] {
  const stored = localStorage.getItem(PENDING_CHANGES_KEY);
  return stored ? JSON.parse(stored) : [];
}

/**
 * Add a pending change (for offline support)
 */
export function addPendingChange(change: Omit<PendingChange, 'timestamp'>): void {
  const pending = getPendingChanges();
  pending.push({ ...change, timestamp: Date.now() });
  localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(pending));
}

/**
 * Clear pending changes after successful sync
 */
function clearPendingChanges(): void {
  localStorage.removeItem(PENDING_CHANGES_KEY);
}

// Type for database card insert
type DbCardInsert = Omit<DbCardRecord, 'server_updated_at' | 'deleted_at'> & {
  server_updated_at?: string;
  deleted_at?: string | null;
};

// Type for database review insert
type DbReviewInsert = Omit<DbReviewRecord, 'server_created_at'> & {
  server_created_at?: string;
};

/**
 * Convert local Card to database format
 */
function cardToDb(card: Card, userId: string): DbCardInsert {
  return {
    id: card.id,
    user_id: userId,
    type: card.type,
    front: card.front,
    back: card.back,
    example_es: card.exampleEs || null,
    example_en: card.exampleEn || null,
    notes: card.notes || null,
    tags: card.tags,
    cloze_sentence: card.clozeSentence || null,
    cloze_word: card.clozeWord || null,
    ease: card.ease,
    interval_days: card.intervalDays,
    reps: card.reps,
    due_at: card.dueAt,
    lapses: card.lapses,
    last_reviewed_at: card.lastReviewedAt || null,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
  };
}

/**
 * Convert database format to local Card
 */
function dbToCard(dbCard: DbCardRecord): Card {
  return {
    id: dbCard.id,
    type: dbCard.type,
    front: dbCard.front,
    back: dbCard.back,
    exampleEs: dbCard.example_es || undefined,
    exampleEn: dbCard.example_en || undefined,
    notes: dbCard.notes || undefined,
    tags: dbCard.tags,
    clozeSentence: dbCard.cloze_sentence || undefined,
    clozeWord: dbCard.cloze_word || undefined,
    ease: dbCard.ease,
    intervalDays: dbCard.interval_days,
    reps: dbCard.reps,
    dueAt: dbCard.due_at,
    lapses: dbCard.lapses,
    lastReviewedAt: dbCard.last_reviewed_at || undefined,
    createdAt: dbCard.created_at,
    updatedAt: dbCard.updated_at,
  };
}

/**
 * Convert local ReviewLog to database format
 */
function reviewToDb(review: ReviewLog, userId: string): DbReviewInsert {
  return {
    id: review.id,
    user_id: userId,
    card_id: review.cardId,
    reviewed_at: review.reviewedAt,
    grade: review.grade,
    previous_interval: review.previousInterval,
    new_interval: review.newInterval,
    previous_due_at: review.previousDueAt,
    new_due_at: review.newDueAt,
  };
}

/**
 * Encrypt card content before upload
 */
async function encryptCard(card: DbCardInsert, userId: string): Promise<DbCardInsert> {
  const key = await getEncryptionKey(userId);
  const encrypted = await encryptCardContent(
    {
      front: card.front,
      back: card.back,
      exampleEs: card.example_es || '',
      exampleEn: card.example_en || '',
      notes: card.notes || '',
      clozeSentence: card.cloze_sentence || '',
      clozeWord: card.cloze_word || '',
    },
    key
  );

  return {
    ...card,
    front: encrypted.front,
    back: encrypted.back,
    example_es: encrypted.exampleEs || null,
    example_en: encrypted.exampleEn || null,
    notes: encrypted.notes || null,
    cloze_sentence: encrypted.clozeSentence || null,
    cloze_word: encrypted.clozeWord || null,
  };
}

/**
 * Decrypt card content after download
 */
async function decryptCard(dbCard: DbCardRecord, userId: string): Promise<DbCardRecord> {
  const key = await getEncryptionKey(userId);
  const decrypted = await decryptCardContent(
    {
      front: dbCard.front,
      back: dbCard.back,
      exampleEs: dbCard.example_es || '',
      exampleEn: dbCard.example_en || '',
      notes: dbCard.notes || '',
      clozeSentence: dbCard.cloze_sentence || '',
      clozeWord: dbCard.cloze_word || '',
    },
    key
  );

  return {
    ...dbCard,
    front: decrypted.front,
    back: decrypted.back,
    example_es: decrypted.exampleEs || null,
    example_en: decrypted.exampleEn || null,
    notes: decrypted.notes || null,
    cloze_sentence: decrypted.clozeSentence || null,
    cloze_word: decrypted.clozeWord || null,
  };
}

/**
 * Upload all local data to cloud (initial sync)
 */
export async function uploadLocalData(): Promise<SyncResult> {
  if (!canUseCloudFeatures() || !supabase) {
    return {
      success: false,
      error: 'Cloud sync not configured',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: 'Not authenticated',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }

  try {
    // Get all local data
    const localCards = await getAllCards();
    const localReviews = await getAllReviews();

    // Encrypt and convert cards
    const dbCards: DbCardInsert[] = [];
    for (const card of localCards) {
      const dbCard = cardToDb(card, user.id);
      const encrypted = await encryptCard(dbCard, user.id);
      dbCards.push(encrypted);
    }

    // Convert reviews
    const dbReviews = localReviews.map((r) => reviewToDb(r, user.id));

    // Upload cards (upsert to handle existing)
    if (dbCards.length > 0) {
      const { error: cardsError } = await supabase
        .from('cards')
        .upsert(dbCards, { onConflict: 'id' });

      if (cardsError) {
        throw new Error(`Failed to upload cards: ${cardsError.message}`);
      }
    }

    // Upload reviews (upsert to handle existing)
    if (dbReviews.length > 0) {
      const { error: reviewsError } = await supabase
        .from('reviews')
        .upsert(dbReviews, { onConflict: 'id' });

      if (reviewsError) {
        throw new Error(`Failed to upload reviews: ${reviewsError.message}`);
      }
    }

    // Log sync
    await supabase.from('sync_log').insert({
      user_id: user.id,
      action: 'upload',
      cards_affected: dbCards.length,
      reviews_affected: dbReviews.length,
    });

    setLastSyncTime(Date.now());
    clearPendingChanges();

    return {
      success: true,
      cardsUploaded: dbCards.length,
      cardsDownloaded: 0,
      reviewsUploaded: dbReviews.length,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }
}

/**
 * Download all remote data (initial sync on new device)
 */
export async function downloadRemoteData(): Promise<SyncResult> {
  if (!canUseCloudFeatures() || !supabase) {
    return {
      success: false,
      error: 'Cloud sync not configured',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: 'Not authenticated',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }

  try {
    // Fetch all cards
    const { data: dbCards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .is('deleted_at', null);

    if (cardsError) {
      throw new Error(`Failed to download cards: ${cardsError.message}`);
    }

    // Fetch all reviews
    const { data: dbReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id);

    if (reviewsError) {
      throw new Error(`Failed to download reviews: ${reviewsError.message}`);
    }

    // Decrypt and convert cards
    const cards: Card[] = [];
    for (const dbCard of dbCards || []) {
      const decrypted = await decryptCard(dbCard, user.id);
      cards.push(dbToCard(decrypted));
    }

    // Convert reviews
    const reviews: ReviewLog[] = (dbReviews || []).map((r) => ({
      id: r.id,
      cardId: r.card_id,
      reviewedAt: r.reviewed_at,
      grade: r.grade,
      previousInterval: r.previous_interval,
      newInterval: r.new_interval,
      previousDueAt: r.previous_due_at,
      newDueAt: r.new_due_at,
    }));

    // Import to local database
    if (cards.length > 0) {
      await importCards(cards);
    }

    if (reviews.length > 0) {
      await bulkPut('reviews', reviews);
    }

    // Log sync
    await supabase.from('sync_log').insert({
      user_id: user.id,
      action: 'download',
      cards_affected: cards.length,
      reviews_affected: reviews.length,
    });

    setLastSyncTime(Date.now());

    return {
      success: true,
      cardsUploaded: 0,
      cardsDownloaded: cards.length,
      reviewsUploaded: 0,
      reviewsDownloaded: reviews.length,
      conflicts: [],
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }
}

/**
 * Merge local and remote data using last-write-wins strategy
 * Returns conflicts for cards modified within 1 minute on both sides
 */
export function mergeCards(
  localCards: Card[],
  remoteCards: Card[]
): { merged: Card[]; conflicts: ConflictInfo[] } {
  const conflicts: ConflictInfo[] = [];
  const merged: Card[] = [];
  const processedIds = new Set<string>();

  // Create lookup map for remote cards
  const remoteMap = new Map(remoteCards.map((c) => [c.id, c]));

  // Process local cards
  for (const localCard of localCards) {
    processedIds.add(localCard.id);
    const remoteCard = remoteMap.get(localCard.id);

    if (!remoteCard) {
      // Local only - keep local
      merged.push(localCard);
    } else {
      // Exists on both sides
      const timeDiff = Math.abs(localCard.updatedAt - remoteCard.updatedAt);
      const ONE_MINUTE = 60 * 1000;

      if (timeDiff < ONE_MINUTE && localCard.updatedAt !== remoteCard.updatedAt) {
        // Close timestamps - potential conflict
        conflicts.push({
          cardId: localCard.id,
          localCard,
          remoteCard,
          localUpdatedAt: localCard.updatedAt,
          remoteUpdatedAt: remoteCard.updatedAt,
        });
        // For now, keep the newer one
        merged.push(localCard.updatedAt > remoteCard.updatedAt ? localCard : remoteCard);
      } else {
        // Clear winner - keep the newer one
        merged.push(localCard.updatedAt > remoteCard.updatedAt ? localCard : remoteCard);
      }
    }
  }

  // Add remote-only cards
  for (const remoteCard of remoteCards) {
    if (!processedIds.has(remoteCard.id)) {
      merged.push(remoteCard);
    }
  }

  return { merged, conflicts };
}

/**
 * Full sync operation
 */
export async function syncAll(): Promise<SyncResult> {
  if (!canUseCloudFeatures() || !supabase) {
    return {
      success: false,
      error: 'Cloud sync not configured',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: 'Not authenticated',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }

  const lastSync = getLastSyncTime();

  // First sync - check if we have local or remote data
  if (!lastSync) {
    const localCards = await getAllCards();
    const { count } = await supabase
      .from('cards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (localCards.length > 0 && (count === null || count === 0)) {
      // Have local, no remote - upload
      return uploadLocalData();
    } else if (localCards.length === 0 && count && count > 0) {
      // No local, have remote - download
      return downloadRemoteData();
    } else if (localCards.length > 0 && count && count > 0) {
      // Both have data - merge needed
      const downloadResult = await downloadRemoteData();
      if (!downloadResult.success) {
        return downloadResult;
      }
      // After download, upload to ensure remote has all local
      return uploadLocalData();
    } else {
      // Both empty - just set sync time
      setLastSyncTime(Date.now());
      return {
        success: true,
        cardsUploaded: 0,
        cardsDownloaded: 0,
        reviewsUploaded: 0,
        reviewsDownloaded: 0,
        conflicts: [],
      };
    }
  }

  // Incremental sync
  return incrementalSync(lastSync);
}

/**
 * Incremental sync - only sync changes since last sync
 */
async function incrementalSync(since: number): Promise<SyncResult> {
  if (!canUseCloudFeatures() || !supabase) {
    return {
      success: false,
      error: 'Cloud sync not configured',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: 'Not authenticated',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }

  try {
    // Get local changes since last sync
    const allLocalCards = await getAllCards();
    const localChangedCards = allLocalCards.filter((c) => c.updatedAt > since);

    const allLocalReviews = await getAllReviews();
    const localNewReviews = allLocalReviews.filter((r) => r.reviewedAt > since);

    // Get remote changes since last sync
    const sinceIso = new Date(since).toISOString();
    const { data: remoteChangedCards, error: cardsError } = await supabase
      .from('cards')
      .select('*')
      .eq('user_id', user.id)
      .gt('server_updated_at', sinceIso);

    if (cardsError) {
      throw new Error(`Failed to fetch remote changes: ${cardsError.message}`);
    }

    const { data: remoteNewReviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('*')
      .eq('user_id', user.id)
      .gt('server_created_at', sinceIso);

    if (reviewsError) {
      throw new Error(`Failed to fetch remote reviews: ${reviewsError.message}`);
    }

    // Decrypt remote cards
    const decryptedRemoteCards: Card[] = [];
    for (const dbCard of remoteChangedCards || []) {
      const decrypted = await decryptCard(dbCard, user.id);
      decryptedRemoteCards.push(dbToCard(decrypted));
    }

    // Merge cards
    const { merged, conflicts } = mergeCards(localChangedCards, decryptedRemoteCards);

    // Upload local changes
    let cardsUploaded = 0;
    if (localChangedCards.length > 0) {
      const dbCards: DbCardInsert[] = [];
      for (const card of localChangedCards) {
        const dbCard = cardToDb(card, user.id);
        const encrypted = await encryptCard(dbCard, user.id);
        dbCards.push(encrypted);
      }

      const { error } = await supabase.from('cards').upsert(dbCards, { onConflict: 'id' });
      if (error) {
        throw new Error(`Failed to upload cards: ${error.message}`);
      }
      cardsUploaded = dbCards.length;
    }

    // Upload new reviews
    let reviewsUploaded = 0;
    if (localNewReviews.length > 0) {
      const dbReviews = localNewReviews.map((r) => reviewToDb(r, user.id));
      const { error } = await supabase.from('reviews').upsert(dbReviews, { onConflict: 'id' });
      if (error) {
        throw new Error(`Failed to upload reviews: ${error.message}`);
      }
      reviewsUploaded = dbReviews.length;
    }

    // Import remote changes to local
    let cardsDownloaded = 0;
    const remoteOnlyCards = merged.filter(
      (c) => !localChangedCards.some((lc) => lc.id === c.id)
    );
    if (remoteOnlyCards.length > 0) {
      await importCards(remoteOnlyCards);
      cardsDownloaded = remoteOnlyCards.length;
    }

    // Import remote reviews
    let reviewsDownloaded = 0;
    const remoteReviews: ReviewLog[] = (remoteNewReviews || []).map((r) => ({
      id: r.id,
      cardId: r.card_id,
      reviewedAt: r.reviewed_at,
      grade: r.grade,
      previousInterval: r.previous_interval,
      newInterval: r.new_interval,
      previousDueAt: r.previous_due_at,
      newDueAt: r.new_due_at,
    }));

    // Filter out reviews we already have
    const existingReviewIds = new Set(allLocalReviews.map((r) => r.id));
    const newRemoteReviews = remoteReviews.filter((r) => !existingReviewIds.has(r.id));

    if (newRemoteReviews.length > 0) {
      await bulkPut('reviews', newRemoteReviews);
      reviewsDownloaded = newRemoteReviews.length;
    }

    // Log sync
    await supabase.from('sync_log').insert({
      user_id: user.id,
      action: 'merge',
      cards_affected: cardsUploaded + cardsDownloaded,
      reviews_affected: reviewsUploaded + reviewsDownloaded,
    });

    setLastSyncTime(Date.now());
    clearPendingChanges();

    return {
      success: true,
      cardsUploaded,
      cardsDownloaded,
      reviewsUploaded,
      reviewsDownloaded,
      conflicts,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      cardsUploaded: 0,
      cardsDownloaded: 0,
      reviewsUploaded: 0,
      reviewsDownloaded: 0,
      conflicts: [],
    };
  }
}

/**
 * Clear sync data on sign out
 */
export function clearSyncData(): void {
  localStorage.removeItem(LAST_SYNC_KEY);
  localStorage.removeItem(PENDING_CHANGES_KEY);
  clearEncryptionKey();
}

/**
 * Check if online
 */
export function isOnline(): boolean {
  return navigator.onLine;
}
