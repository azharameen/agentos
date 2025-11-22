/**
 * Custom hook for memoizing markdown content blocks
 * Optimizes performance during streaming by preventing re-parsing
 */

import { useMemo } from 'react';
import type { MemoizedBlock } from '@/types/markdown.types';

/**
 * Hook to split and memoize markdown content into blocks
 * Prevents re-parsing of unchanged content during streaming
 * 
 * IMPORTANT: Block splitting is now DISABLED for streaming to prevent
 * breaking code blocks that contain \n\n inside them.
 * 
 * @param content - The markdown content to memoize
 * @param enableMemoization - Whether to enable block-level memoization (DEPRECATED - always returns single block)
 * @returns Array with single block (block splitting disabled)
 */
export function useMemoizedMarkdown(
    content: string,
    enableMemoization: boolean = true
): MemoizedBlock[] {
    return useMemo(() => {
        // ALWAYS return single block to avoid breaking code blocks
        // Block splitting on \n\n was breaking code blocks during streaming
        return [{
            id: 'single-block',
            content,
            hash: content.length.toString(),
        }];
    }, [content]);
}
