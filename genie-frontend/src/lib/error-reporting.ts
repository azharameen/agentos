/**
 * Error Reporting Service
 * Centralized error logging and reporting
 * 
 * TODO: Integrate with external service (Sentry, LogRocket, etc.)
 */

export interface ErrorContext {
  component?: string;
  userId?: string;
  sessionId?: string;
  [key: string]: any;
}

class ErrorReportingService {
  private isInitialized = false;

  /**
   * Initialize error reporting service
   * Call this in the app startup (e.g., _app.tsx or layout.tsx)
   */
  initialize(config?: { dsn?: string; environment?: string }) {
    if (this.isInitialized) {
      console.warn('Error reporting already initialized');
      return;
    }

    // TODO: Initialize Sentry or other error tracking service
    // Example:
    // Sentry.init({
    //   dsn: config?.dsn || process.env.NEXT_PUBLIC_SENTRY_DSN,
    //   environment: config?.environment || process.env.NODE_ENV,
    // });

    this.isInitialized = true;
    console.log('Error reporting service initialized');
  }

  /**
   * Log an error with context
   */
  logError(error: Error, context?: ErrorContext) {
    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reported:', error, context);
    }

    // TODO: Send to error tracking service
    // Example:
    // Sentry.captureException(error, {
    //   extra: context,
    // });
  }

  /**
   * Log a message (non-error event)
   */
  logMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
    if (process.env.NODE_ENV === 'development') {
      console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](message);
    }

    // TODO: Send to logging service
  }

  /**
   * Set user context for error reports
   */
  setUserContext(userId: string, email?: string) {
    // TODO: Set user context in error tracking service
    // Example:
    // Sentry.setUser({ id: userId, email });
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext() {
    // TODO: Clear user context in error tracking service
    // Example:
    // Sentry.setUser(null);
  }

  /**
   * Add breadcrumb for debugging context
   */
  addBreadcrumb(message: string, data?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Breadcrumb:', message, data);
    }

    // TODO: Add breadcrumb to error tracking service
    // Example:
    // Sentry.addBreadcrumb({
    //   message,
    //   data,
    //   level: 'info',
    // });
  }
}

// Export singleton instance
export const errorReportingService = new ErrorReportingService();
