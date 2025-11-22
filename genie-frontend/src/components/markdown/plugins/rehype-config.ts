/**
 * Rehype plugin configuration
 * Rehype plugins process HTML syntax tree after markdown conversion
 */

import rehypeKatex from 'rehype-katex';

/**
 * Standard rehype plugins for HTML processing
 * 
 * - rehypeKatex: Render LaTeX math expressions
 * 
 * Note: rehype-highlight is intentionally omitted to allow
 * component-level highlighting in CodeBlock.tsx for better streaming support.
 */
export const rehypePlugins = [
    rehypeKatex,
];
