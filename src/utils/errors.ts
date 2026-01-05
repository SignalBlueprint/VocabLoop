/**
 * User-friendly error messages for common error scenarios
 */

export function getErrorMessage(error: unknown, context: string): string {
  // Check for specific error types
  if (error instanceof Error) {
    // IndexedDB errors
    if (error.name === 'QuotaExceededError') {
      return 'Storage is full. Try exporting and deleting some cards.';
    }
    if (error.name === 'InvalidStateError') {
      return 'Database connection lost. Please refresh the page.';
    }
    if (error.message.includes('IndexedDB')) {
      return 'Database error. Please refresh the page and try again.';
    }

    // Network errors
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      return 'Network error. Please check your connection.';
    }

    // File errors
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      return 'Invalid file format. Please use a valid VocabLoop export file.';
    }
  }

  // Context-specific fallbacks
  switch (context) {
    case 'save-card':
      return 'Could not save card. Please try again.';
    case 'delete-card':
      return 'Could not delete card. Please try again.';
    case 'load-cards':
      return 'Could not load cards. Please refresh the page.';
    case 'review':
      return 'Could not save review. Your progress may not be saved.';
    case 'export':
      return 'Export failed. Please try again.';
    case 'import':
      return 'Import failed. Please check the file and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

/**
 * Log error with context for debugging while returning user-friendly message
 */
export function handleError(error: unknown, context: string): string {
  console.error(`[${context}]`, error);
  return getErrorMessage(error, context);
}
