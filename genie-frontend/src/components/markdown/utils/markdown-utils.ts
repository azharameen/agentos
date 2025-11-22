/**
 * Utility functions for markdown processing
 */

import type { ParsedCodeBlock } from '@/types/markdown.types';

/**
 * Parse code block to extract code string and language
 */
export function parseCodeBlock(children: any, className?: string): ParsedCodeBlock {
    let code = '';

    if (Array.isArray(children)) {
        code = children
            .map((child) => (typeof child === 'string' ? child : ''))
            .join('');
    } else if (typeof children === 'string') {
        code = children;
    }

    const language = className ? className.replace('language-', '') : 'plaintext';

    return {
        code: code.trim(),
        language,
        inline: false,
    };
}

/**
 * Check if a URL is external (starts with http/https)
 */
export function isExternalUrl(url?: string): boolean {
    if (!url) return false;
    return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Check if a URL is a hash/anchor link
 */
export function isHashUrl(url?: string): boolean {
    if (!url) return false;
    return url.startsWith('#');
}

/**
 * Simple hash function for content
 * Used for memoization keys
 */
export function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
}

/**
 * Split markdown content into blocks for memoization
 */
export function splitMarkdownBlocks(content: string): Array<{ id: string; content: string; hash: string }> {
    const blocks = content.split('\n\n').filter(block => block.trim());

    return blocks.map((block, index) => ({
        id: `block-${index}`,
        content: block,
        hash: hashString(block),
    }));
}

/**
 * Download text content as a file
 */
export function downloadTextFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy text:', err);
        return false;
    }
}
