/**
 * Blockquote and Misc Components
 * Handles blockquotes, horizontal rules, and text formatting
 */

import React from 'react';
import type { BlockquoteProps, MarkdownComponentProps } from '@/types/markdown.types';

/**
 * Blockquote component
 */
export const Blockquote = React.memo<BlockquoteProps>(
    ({ children, ...props }) => (
        <blockquote
            className="border-l-4 border-primary pl-4 my-4 italic text-muted-foreground"
            {...props}
        >
            {children}
        </blockquote>
    )
);

Blockquote.displayName = 'Blockquote';

/**
 * Horizontal Rule component
 */
export const HorizontalRule = React.memo<MarkdownComponentProps>(
    ({ ...props }) => (
        <hr className="my-6 border-border" {...props} />
    )
);

HorizontalRule.displayName = 'HorizontalRule';

/**
 * Strong (bold) component
 */
export const Strong = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => (
        <strong className="font-bold" {...props}>
            {children}
        </strong>
    )
);

Strong.displayName = 'Strong';

/**
 * Emphasis (italic) component
 */
export const Emphasis = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => (
        <em className="italic" {...props}>
            {children}
        </em>
    )
);

Emphasis.displayName = 'Emphasis';

/**
 * Pre (preformatted) component
 * 
 * CRITICAL FIX: Unwraps <pre> tags when they contain code blocks.
 * ReactMarkdown wraps block code in <pre><code>...</code></pre>.
 * Our CodeBlock component renders its own structure including a <pre>.
 * To avoid invalid HTML (<pre><div>...</div></pre>), we must unwrap the outer <pre>.
 */
export const Pre = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => {
        // Check if the child is a code element (which maps to our CodeBlock)
        const childArray = React.Children.toArray(children);
        if (childArray.length === 1 && React.isValidElement(childArray[0])) {
            const child = childArray[0] as React.ReactElement<any>;
            // ReactMarkdown passes 'code' as the type for code blocks
            // We check if the child is a 'code' element or our CodeBlock component
            if (child.type === 'code' || (child.props && child.props.node && child.props.node.tagName === 'code')) {
                return <>{children}</>;
            }
        }

        // Default behavior for non-code block preformatted text
        return (
            <pre className="overflow-x-auto" {...props}>
                {children}
            </pre>
        );
    }
);

Pre.displayName = 'Pre';
