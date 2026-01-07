import { describe, it, expect } from 'vitest';
import { mergeCards } from './sync';
import type { Card } from '../types';

// Helper to create a test card
function createCard(overrides: Partial<Card> = {}): Card {
  const id = overrides.id || `card_${Math.random().toString(36).slice(2, 9)}`;
  const now = Date.now();
  return {
    id,
    type: 'BASIC',
    front: 'test front',
    back: 'test back',
    tags: ['test'],
    ease: 2.5,
    intervalDays: 7,
    reps: 3,
    dueAt: now,
    lapses: 0,
    createdAt: now - 30 * 24 * 60 * 60 * 1000,
    updatedAt: now,
    ...overrides,
  };
}

describe('mergeCards', () => {
  it('keeps local-only cards', () => {
    const localCards = [createCard({ id: 'local-only' })];
    const remoteCards: Card[] = [];

    const { merged, conflicts } = mergeCards(localCards, remoteCards);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('local-only');
    expect(conflicts).toHaveLength(0);
  });

  it('keeps remote-only cards', () => {
    const localCards: Card[] = [];
    const remoteCards = [createCard({ id: 'remote-only' })];

    const { merged, conflicts } = mergeCards(localCards, remoteCards);

    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('remote-only');
    expect(conflicts).toHaveLength(0);
  });

  it('keeps newer card when same id exists on both sides', () => {
    const now = Date.now();
    const localCards = [
      createCard({
        id: 'shared',
        front: 'local version',
        updatedAt: now - 60000, // 1 minute ago
      }),
    ];
    const remoteCards = [
      createCard({
        id: 'shared',
        front: 'remote version',
        updatedAt: now, // now
      }),
    ];

    const { merged, conflicts } = mergeCards(localCards, remoteCards);

    expect(merged).toHaveLength(1);
    expect(merged[0].front).toBe('remote version');
    expect(conflicts).toHaveLength(0);
  });

  it('keeps local card when it is newer', () => {
    const now = Date.now();
    const localCards = [
      createCard({
        id: 'shared',
        front: 'local version',
        updatedAt: now, // now
      }),
    ];
    const remoteCards = [
      createCard({
        id: 'shared',
        front: 'remote version',
        updatedAt: now - 60000, // 1 minute ago
      }),
    ];

    const { merged } = mergeCards(localCards, remoteCards);

    expect(merged).toHaveLength(1);
    expect(merged[0].front).toBe('local version');
  });

  it('detects conflicts when timestamps are close', () => {
    const now = Date.now();
    const localCards = [
      createCard({
        id: 'shared',
        front: 'local version',
        updatedAt: now - 30000, // 30 seconds ago
      }),
    ];
    const remoteCards = [
      createCard({
        id: 'shared',
        front: 'remote version',
        updatedAt: now, // now
      }),
    ];

    const { merged, conflicts } = mergeCards(localCards, remoteCards);

    // Still merges (keeps newer) but flags as conflict
    expect(merged).toHaveLength(1);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].cardId).toBe('shared');
    expect(conflicts[0].localCard.front).toBe('local version');
    expect(conflicts[0].remoteCard.front).toBe('remote version');
  });

  it('does not flag conflict when timestamps are identical', () => {
    const now = Date.now();
    const localCards = [
      createCard({
        id: 'shared',
        updatedAt: now,
      }),
    ];
    const remoteCards = [
      createCard({
        id: 'shared',
        updatedAt: now,
      }),
    ];

    const { merged, conflicts } = mergeCards(localCards, remoteCards);

    expect(merged).toHaveLength(1);
    expect(conflicts).toHaveLength(0);
  });

  it('handles multiple cards from both sides', () => {
    const now = Date.now();
    const localCards = [
      createCard({ id: 'local-1' }),
      createCard({ id: 'shared-1', front: 'local', updatedAt: now }),
      createCard({ id: 'local-2' }),
    ];
    const remoteCards = [
      createCard({ id: 'remote-1' }),
      createCard({ id: 'shared-1', front: 'remote', updatedAt: now - 100000 }),
      createCard({ id: 'remote-2' }),
    ];

    const { merged } = mergeCards(localCards, remoteCards);

    expect(merged).toHaveLength(5);

    const sharedCard = merged.find((c) => c.id === 'shared-1');
    expect(sharedCard?.front).toBe('local'); // local is newer
  });

  it('handles empty arrays', () => {
    const { merged, conflicts } = mergeCards([], []);

    expect(merged).toHaveLength(0);
    expect(conflicts).toHaveLength(0);
  });
});

// Note: getLastSyncTime and getPendingChanges use localStorage
// which is not available in Node test environment.
// These functions are tested through integration/e2e tests.
