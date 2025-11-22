/**
 * Markdown System Main Exports
 * 
 * Production-ready markdown rendering system with:
 * - Full TypeScript type safety
 * - Streaming optimization with memoization
 * - Comprehensive component library
 * - Industry-standard plugin configuration
 * - Security and accessibility features
 */

// Main renderer
export { MarkdownRenderer } from './MarkdownRenderer';

// Component configuration
export { markdownComponents } from './components';

// Core components (for custom usage)
export * from './core';

// Hooks
export * from './hooks';

// Utils
export * from './utils';

// Plugins
export * from './plugins';

// Types
export type * from '@/types/markdown.types';
