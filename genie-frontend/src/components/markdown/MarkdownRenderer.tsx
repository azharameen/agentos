/**
 * Main Markdown Renderer Component
 * Production-ready markdown rendering with streaming optimization
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { remarkPlugins } from './plugins/remark-config';
import { rehypePlugins } from './plugins/rehype-config';
import { markdownComponents } from './components';
import { MarkdownErrorBoundary } from './MarkdownErrorBoundary';
import type { MarkdownRendererProps } from '@/types/markdown.types';

/**
 * Production Markdown Renderer
 * 
 * Features:
 * - Streaming optimization with memoization
 * - Full TypeScript type safety
 * - Comprehensive component overrides
 * - Syntax highlighting and math rendering
 * - Security-first approach
 * - Accessibility compliant
 * - Error Boundary protection
 * 
 * @example
 * ```tsx
 * <MarkdownRenderer 
 *   content={markdownString}
 *   isStreaming={true}
 *   enableMemoization={true}
 * />
 * ```
 */
export const MarkdownRenderer = React.memo<MarkdownRendererProps>(
    ({
        content,
        isStreaming = false,
        enableMemoization = true,
        className,
        onCopyCode,
    }) => {
        return (
            <div className={className}>
                <MarkdownErrorBoundary>
                    <ReactMarkdown
                        remarkPlugins={remarkPlugins}
                        rehypePlugins={rehypePlugins}
                        components={markdownComponents}
                    >
                        {content}
                    </ReactMarkdown>
                </MarkdownErrorBoundary>

                {/* Streaming cursor indicator */}
                {isStreaming && (
                    <span
                        className="inline-block animate-pulse text-foreground ml-1"
                        aria-label="Content is streaming"
                    >
                        ▍
                    </span>
                )}
            </div>
        );
    },
    (prev, next) => {
        // Only re-render if content or streaming state changes
        return (
            prev.content === next.content &&
            prev.isStreaming === next.isStreaming &&
            prev.enableMemoization === next.enableMemoization
        );
    }
);

MarkdownRenderer.displayName = 'MarkdownRenderer';
