/**
 * Memoized Code Block Component
 * Handles both inline code and code blocks with syntax highlighting
 */

import React, { useMemo } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { useCodeCopy } from '../hooks/useCodeCopy';
import { parseCodeBlock, downloadTextFile } from '../utils/markdown-utils';
import type { CodeBlockProps } from '@/types/markdown.types';

/**
 * CodeBlock component with syntax highlighting, copy, and download functionality
 * Uses synchronous client-side highlighting for robust streaming support
 */
export const CodeBlock = React.memo<CodeBlockProps>(
    ({ inline, className, children, ...props }) => {
        const { copied, copyText } = useCodeCopy(2000);

        // Parse code block
        const { code, language } = parseCodeBlock(children, className);

        // Synchronous highlighting using useMemo
        // This prevents flashing/jank during streaming updates
        const highlightedCode = useMemo(() => {
            if (inline || !code) return '';

            try {
                const hasLang = hljs.getLanguage(language);
                const langToUse = hasLang ? language : 'plaintext';
                return hljs.highlight(code, { language: langToUse }).value;
            } catch (err) {
                console.warn('Highlighting failed:', err);
                return code.replace(/[&<>"']/g, (m) => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                })[m] || m);
            }
        }, [code, language, inline]);

        // If inline code, return simple code element
        if (inline) {
            return (
                <code
                    className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono"
                    {...props}
                >
                    {children}
                </code>
            );
        }

        const handleDownload = () => {
            const extension = language === 'plaintext' ? 'txt' : language;
            downloadTextFile(code, `code.${extension}`);
        };

        return (
            <div className="relative my-4 group" role="region" aria-label={`Code block in ${language}`}>
                {/* Toolbar */}
                <div className="absolute top-2 right-2 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs font-mono px-2 py-1 rounded bg-muted text-muted-foreground select-none">
                        {language}
                    </span>

                    <button
                        onClick={() => copyText(code)}
                        className="p-1.5 rounded bg-muted hover:bg-muted/80 transition-colors"
                        title={copied ? 'Copied!' : 'Copy code'}
                        aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
                    >
                        {copied ? (
                            <Check className="h-4 w-4 text-green-500" />
                        ) : (
                            <Copy className="h-4 w-4 text-muted-foreground" />
                        )}
                    </button>

                    <button
                        onClick={handleDownload}
                        className="p-1.5 rounded bg-muted hover:bg-muted/80 transition-colors"
                        title="Download code"
                        aria-label="Download code as file"
                    >
                        <Download className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Code block */}
                <pre className="overflow-x-auto rounded-lg bg-[#282c34] p-4 text-sm" {...props}>
                    <code
                        className={`hljs language-${language}`}
                        dangerouslySetInnerHTML={{ __html: highlightedCode || code }}
                    />
                </pre>
            </div>
        );
    },
    (prev, next) => {
        // Strict equality check for children (string content)
        // This is safe because strings are immutable and React handles this well
        return (
            prev.children === next.children &&
            prev.inline === next.inline &&
            prev.className === next.className
        );
    }
);

CodeBlock.displayName = 'CodeBlock';
