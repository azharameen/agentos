/**
 * Input Validation and Sanitization Utilities
 */

const MAX_MESSAGE_LENGTH = Number.parseInt(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH || '10000', 10);

/**
 * Sanitize user input to prevent XSS attacks
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Remove script tags and event handlers
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Validate message input
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitized?: string;
}

export function validateMessage(input: string): ValidationResult {
  // Check if empty
  if (!input || !input.trim()) {
    return {
      isValid: false,
      error: 'Message cannot be empty'
    };
  }

  // Sanitize first
  const sanitized = sanitizeInput(input);

  // Check length
  if (sanitized.length > MAX_MESSAGE_LENGTH) {
    return {
      isValid: false,
      error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.`
    };
  }

  // Check for malicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /onerror=/i,
    /onclick=/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(sanitized)) {
      return {
        isValid: false,
        error: 'Message contains invalid content'
      };
    }
  }

  return {
    isValid: true,
    sanitized
  };
}

/**
 * Validate session name
 */
export function validateSessionName(name: string): ValidationResult {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      error: 'Session name cannot be empty'
    };
  }

  const sanitized = sanitizeInput(name);

  if (sanitized.length > 100) {
    return {
      isValid: false,
      error: 'Session name too long. Maximum 100 characters.'
    };
  }

  return {
    isValid: true,
    sanitized
  };
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Check if a URL is safe
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
