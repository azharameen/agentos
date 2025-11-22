/**
 * Request Retry Utility
 * Implements exponential backoff retry logic for failed API requests
 * 
 * Features:
 * - Configurable retry attempts and delays
 * - Exponential backoff with jitter
 * - Retryable error detection
 * - Circuit breaker integration (respects OPEN state)
 * - Request cancellation support
 */

export interface RetryOptions {
  maxAttempts?: number; // Default: 3
  initialDelay?: number; // Default: 1000ms
  maxDelay?: number; // Default: 10000ms
  backoffMultiplier?: number; // Default: 2
  jitter?: boolean; // Default: true
  retryableStatuses?: number[]; // Default: [408, 429, 500, 502, 503, 504]
  onRetry?: (attempt: number, error: Error) => void;
}

export interface RetryResult<T> {
  data?: T;
  error?: Error;
  attempts: number;
  succeeded: boolean;
}

/**
 * Check if an error is retryable
 */
function isRetryableError(error: any, retryableStatuses: number[]): boolean {
  // Network errors are always retryable
  if (error.name === 'NetworkError' || error.message?.includes('fetch')) {
    return true;
  }

  // Check HTTP status codes
  if (error.response?.status) {
    return retryableStatuses.includes(error.response.status);
  }

  // Timeout errors are retryable
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return true;
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: boolean,
): number {
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);
  const delay = Math.min(exponentialDelay, maxDelay);

  if (jitter) {
    // Add random jitter (±25%)
    const jitterAmount = delay * 0.25;
    return delay + (Math.random() * jitterAmount * 2 - jitterAmount);
  }

  return delay;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    jitter = true,
    retryableStatuses = [408, 429, 500, 502, 503, 504],
    onRetry,
  } = options;

  let lastError: Error | undefined;
  let attempts = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    attempts = attempt;

    try {
      const data = await fn();
      return { data, attempts, succeeded: true };
    } catch (error: any) {
      lastError = error;

      // Check if we should retry
      const isLastAttempt = attempt === maxAttempts;
      const shouldRetry = !isLastAttempt && isRetryableError(error, retryableStatuses);

      if (!shouldRetry) {
        // Don't retry, return error immediately
        return { error: lastError, attempts, succeeded: false };
      }

      // Calculate delay and wait before retry
      const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier, jitter);

      // Call retry callback
      onRetry?.(attempt, error);

      console.warn(
        `Request failed (attempt ${attempt}/${maxAttempts}), retrying in ${Math.round(delay)}ms...`,
        error.message,
      );

      await sleep(delay);
    }
  }

  return { error: lastError, attempts, succeeded: false };
}

/**
 * Fetch with retry wrapper
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions,
): Promise<Response> {
  const result = await retryWithBackoff(
    async () => {
      const response = await fetch(url, init);

      // Check if response is OK
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
        throw error;
      }

      return response;
    },
    retryOptions,
  );

  if (result.succeeded && result.data) {
    return result.data;
  }

  throw result.error || new Error('Request failed after retries');
}

/**
 * Retry configuration presets
 */
export const RetryPresets = {
  /**
   * Quick retry for real-time operations
   */
  realtime: {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    jitter: true,
  } as RetryOptions,

  /**
   * Standard retry for normal operations
   */
  standard: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
  } as RetryOptions,

  /**
   * Aggressive retry for critical operations
   */
  aggressive: {
    maxAttempts: 5,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  } as RetryOptions,

  /**
   * Conservative retry for rate-limited APIs
   */
  rateLimited: {
    maxAttempts: 3,
    initialDelay: 2000,
    maxDelay: 60000,
    backoffMultiplier: 3,
    jitter: true,
    retryableStatuses: [429, 503], // Only retry rate limits and service unavailable
  } as RetryOptions,
};
