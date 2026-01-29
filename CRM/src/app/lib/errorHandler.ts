// Error handling utilities

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Network error detection
export const isNetworkError = (error: any): boolean => {
  if (!error) return false;
  
  // Check for network-related error messages
  const networkErrorMessages = [
    'network',
    'fetch',
    'connection',
    'timeout',
    'offline',
    'failed to fetch',
  ];

  const errorMessage = error.message?.toLowerCase() || '';
  return networkErrorMessages.some((msg) => errorMessage.includes(msg));
};

// Retry logic with exponential backoff
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Don't retry if it's not a network error or retryable error
      if (!isNetworkError(error) && !(error instanceof AppError && error.retryable)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Unknown error');
};

// Offline detection
export const isOffline = (): boolean => {
  return !navigator.onLine;
};

// Error message formatting for user display
export const formatErrorMessage = (error: any): string => {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    // Check for common Supabase errors
    if (error.message.includes('JWT')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (error.message.includes('permission') || error.message.includes('policy')) {
      return 'You do not have permission to perform this action.';
    }
    if (isNetworkError(error)) {
      return 'Network error. Please check your connection and try again.';
    }
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
};

// Global error handler
export const handleError = (error: any, context?: string): void => {
  const message = formatErrorMessage(error);
  console.error(`Error${context ? ` in ${context}` : ''}:`, error);
  
  // You can integrate with a logging service here
  // For now, we'll just log to console
};

// Queue for offline operations
class OfflineQueue {
  private queue: Array<() => Promise<void>> = [];

  add(operation: () => Promise<void>): void {
    this.queue.push(operation);
  }

  async process(): Promise<void> {
    if (isOffline()) {
      console.log('Offline - operations queued');
      return;
    }

    const operations = [...this.queue];
    this.queue = [];

    for (const operation of operations) {
      try {
        await operation();
      } catch (error) {
        console.error('Error processing queued operation:', error);
        // Re-queue failed operations
        this.queue.push(operation);
      }
    }
  }

  clear(): void {
    this.queue = [];
  }

  get length(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Back online - processing queued operations');
    offlineQueue.process();
  });

  window.addEventListener('offline', () => {
    console.log('Gone offline - operations will be queued');
  });
}
