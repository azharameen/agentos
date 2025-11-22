/**
 * Remark plugin configuration
 * Remark plugins process markdown syntax tree before conversion to HTML
 */

import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkEmoji from 'remark-emoji';

/**
 * Standard remark plugins for markdown processing
 * 
 * - remarkGfm: GitHub Flavored Markdown (tables, strikethrough, task lists)
 * - remarkMath: Math notation support ($...$ and $$...$$)
 * - remarkEmoji: Convert :emoji: to actual emoji
 */
export const remarkPlugins = [
    remarkGfm,
    remarkMath,
    remarkEmoji,
];
