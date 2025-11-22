/**
 * TypeScript Type Definitions for Markdown System
 * Provides type safety for all markdown components and configurations
 */

import type { ReactNode, HTMLAttributes, ImgHTMLAttributes, AnchorHTMLAttributes } from 'react';

/**
 * Base props for all markdown components
 */
export interface MarkdownComponentProps extends HTMLAttributes<HTMLElement> {
    node?: any;
    children?: ReactNode;
}

/**
 * Code block component props
 */
export interface CodeBlockProps extends MarkdownComponentProps {
    inline?: boolean;
    className?: string;
}

/**
 * Parsed code block data
 */
export interface ParsedCodeBlock {
    code: string;
    language: string;
    inline: boolean;
}

/**
 * Image component props
 */
export interface ImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'node'> {
    node?: any;
    src?: string;
    alt?: string;
}

/**
 * Link component props
 */
export interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'node'> {
    node?: any;
    href?: string;
    children?: ReactNode;
}

/**
 * Table component props
 */
export interface TableProps extends MarkdownComponentProps {
    className?: string;
}

/**
 * List component props
 */
export interface ListProps extends MarkdownComponentProps {
    ordered?: boolean;
    depth?: number;
}

/**
 * Heading component props
 */
export interface HeadingProps extends MarkdownComponentProps {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Blockquote component props
 */
export interface BlockquoteProps extends MarkdownComponentProps {
    className?: string;
}

/**
 * Main markdown renderer props
 */
export interface MarkdownRendererProps {
    content: string;
    isStreaming?: boolean;
    enableMemoization?: boolean;
    className?: string;
    onCopyCode?: (code: string) => void;
}

/**
 * Memoized markdown block
 */
export interface MemoizedBlock {
    id: string;
    content: string;
    hash: string;
}

/**
 * Code copy hook return type
 */
export interface UseCodeCopyReturn {
    copied: boolean;
    copyText: (text: string) => Promise<void>;
    resetCopied: () => void;
}

/**
 * Markdown configuration
 */
export interface MarkdownConfig {
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    components?: Record<string, React.ComponentType<any>>;
    className?: string;
}

/**
 * Component override map for react-markdown
 */
export interface MarkdownComponents {
    code?: React.ComponentType<CodeBlockProps>;
    p?: React.ComponentType<MarkdownComponentProps>;
    a?: React.ComponentType<LinkProps>;
    img?: React.ComponentType<ImageProps>;
    h1?: React.ComponentType<HeadingProps>;
    h2?: React.ComponentType<HeadingProps>;
    h3?: React.ComponentType<HeadingProps>;
    h4?: React.ComponentType<HeadingProps>;
    h5?: React.ComponentType<HeadingProps>;
    h6?: React.ComponentType<HeadingProps>;
    ul?: React.ComponentType<ListProps>;
    ol?: React.ComponentType<ListProps>;
    li?: React.ComponentType<MarkdownComponentProps>;
    blockquote?: React.ComponentType<BlockquoteProps>;
    table?: React.ComponentType<TableProps>;
    thead?: React.ComponentType<MarkdownComponentProps>;
    tbody?: React.ComponentType<MarkdownComponentProps>;
    tr?: React.ComponentType<MarkdownComponentProps>;
    th?: React.ComponentType<MarkdownComponentProps>;
    td?: React.ComponentType<MarkdownComponentProps>;
    hr?: React.ComponentType<MarkdownComponentProps>;
    pre?: React.ComponentType<MarkdownComponentProps>;
    strong?: React.ComponentType<MarkdownComponentProps>;
    em?: React.ComponentType<MarkdownComponentProps>;
    [key: string]: React.ComponentType<any> | undefined;
}
