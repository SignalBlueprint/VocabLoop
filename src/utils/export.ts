import type { Card, ReviewLog } from '../types';
import { getAllCards } from '../db/cards';
import { getAllReviews } from '../db/reviews';

interface ExportData {
  version: number;
  exportedAt: number;
  cards: Card[];
  reviews: ReviewLog[];
}

/**
 * Export all cards and reviews as a JSON file.
 */
export async function exportDeck(): Promise<void> {
  const cards = await getAllCards();
  const reviews = await getAllReviews();

  const data: ExportData = {
    version: 1,
    exportedAt: Date.now(),
    cards,
    reviews,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `vocabloop-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Validate import data structure.
 */
export function validateImportData(data: unknown): data is ExportData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  if (typeof d.version !== 'number') return false;
  if (!Array.isArray(d.cards)) return false;

  // Validate each card has required fields
  for (const card of d.cards) {
    if (!card || typeof card !== 'object') return false;
    const c = card as Record<string, unknown>;
    if (typeof c.id !== 'string') return false;
    if (typeof c.front !== 'string') return false;
    if (typeof c.back !== 'string') return false;
  }

  return true;
}

/**
 * Parse import file and return the data.
 */
export async function parseImportFile(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);

        if (!validateImportData(data)) {
          reject(new Error('Invalid file format'));
          return;
        }

        resolve(data);
      } catch {
        reject(new Error('Failed to parse file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}
