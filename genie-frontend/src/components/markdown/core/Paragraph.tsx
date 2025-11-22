/**
 * Smart Paragraph Component
 * Prevents block-level elements from being wrapped in <p> tags
 */

import React from 'react';
import type { MarkdownComponentProps } from '@/types/markdown.types';
import { CodeBlock } from './CodeBlock';

/**
 * List of block-level element tag names
 */
const BLOCK_ELEMENT_TYPES = [
    'pre',
    'div',
    'blockquote',
    'ul',
    'ol',
    'table',
    'hr',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'form', 'fieldset', 'address',
    'section', 'article', 'aside',
    'header', 'footer', 'nav', 'main',
];

/**
 * Check if a React child element is or contains block-level content
 */
function containsBlockElement(child: any): boolean {
    if (!child || typeof child !== 'object') return false;

    // Check if it's a React element
    if (!('type' in child)) return false;

    // CRITICAL FIX: Check if it's our CodeBlock component directly
    // This handles the case where ReactMarkdown passes our component
    if (child.type === CodeBlock) {
        // If it's a CodeBlock, check if it's inline or not
        // Block code blocks should not be wrapped in <p>
        return child.props && !child.props.inline;
    }

    // If it's an HTML element (string type), check if it's a block element
    if (typeof child.type === 'string') {
        return BLOCK_ELEMENT_TYPES.includes(child.type);
    }

    // Check the node prop which ReactMarkdown passes
    if (child.props && child.props.node) {
        const node = child.props.node;

        // Check if the node represents a code block
        if (node.tagName === 'code') {
            // Check if it's inline or block code
            const isInline = child.props.inline === true;
            return !isInline;  // Block code = true, inline code = false
        }

        // Check if node is a block-level HTML element
        if (node.tagName && BLOCK_ELEMENT_TYPES.includes(node.tagName)) {
            return true;
        }
    }

    // For any other unknown React component, be conservative
    // and assume it might be a block to avoid nesting issues
    if (typeof child.type === 'function' || typeof child.type === 'object') {
        return true;
    }

    return false;
}

/**
 * Paragraph component that prevents HTML structure violations
 * by detecting and unwrapping block-level children
 * 
 * Memoized for performance optimization
 */
export const Paragraph = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => {
        // Check if any children are block elements
        let hasBlock = false;

        const childArray = React.Children.toArray(children);
        for (const child of childArray) {
            if (containsBlockElement(child)) {
                hasBlock = true;
                break;
            }
        }

        // If contains block elements, return fragment without <p> wrapper
        // This prevents invalid HTML like <p><div>...</div></p>
        if (hasBlock) {
            return <>{children}</>;
        }

        // Otherwise render normal paragraph
        return <p className="my-2" {...props}>{children}</p>;
    },
    (prev, next) => {
        // Only re-render if children change
        return prev.children === next.children;
    }
);

Paragraph.displayName = 'Paragraph';
