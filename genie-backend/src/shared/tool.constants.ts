/**
 * Tool Categories
 * Defines categories for organizing agent tools
 */
export enum ToolCategory {
  WEB = 'web',
  FILESYSTEM = 'filesystem',
  GIT = 'git',
  TODO = 'todo',
  MATH = 'math',
  STRING = 'string',
  DATETIME = 'datetime',
  GENERAL = 'general',
  RAG = 'rag',
}

/**
 * Tool configuration defaults
 */
export const TOOL_DEFAULTS = {
  MAX_RETRIES: 3,
  TIMEOUT_MS: 30000,
  ENABLE_LOGGING: true,
};
