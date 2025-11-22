/**
 * Environment Configuration
 * Centralized configuration for environment variables
 */

export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  REQUEST_TIMEOUT: Number.parseInt(process.env.NEXT_PUBLIC_REQUEST_TIMEOUT_MS || '30000', 10),
  MAX_MESSAGE_LENGTH: Number.parseInt(process.env.NEXT_PUBLIC_MAX_MESSAGE_LENGTH || '10000', 10),
  ENABLE_VOICE_INPUT: process.env.NEXT_PUBLIC_ENABLE_VOICE_INPUT === 'true',
  ENABLE_FILE_UPLOAD: process.env.NEXT_PUBLIC_ENABLE_FILE_UPLOAD === 'true',
} as const;

// Validate critical config
if (!ENV.API_URL) {
  console.error('NEXT_PUBLIC_API_URL is not set. API calls will fail.');
}

export default ENV;
