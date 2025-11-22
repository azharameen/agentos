/**
 * Markdown Component Configuration
 * Maps markdown elements to custom React components
 */

import type { MarkdownComponents } from '@/types/markdown.types';
import {
    CodeBlock,
    Paragraph,
    Image,
    Link,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableHeaderCell,
    TableDataCell,
    UnorderedList,
    OrderedList,
    ListItem,
    H1, H2, H3, H4, H5, H6,
    Blockquote,
    HorizontalRule,
    Strong,
    Emphasis,
    Pre,
} from './core';

/**
 * Complete component override configuration for ReactMarkdown
 * Following industry best practices for markdown rendering
 */
export const markdownComponents: MarkdownComponents = {
    // Code blocks and inline code
    code: CodeBlock,
    pre: Pre,

    // Paragraphs with block element detection
    p: Paragraph,

    // Links with security features
    a: Link,

    // Images with loading states
    img: Image,

    // Headings with proper hierarchy
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    h5: H5,
    h6: H6,

    // Lists
    ul: UnorderedList,
    ol: OrderedList,
    li: ListItem,

    // Tables
    table: Table,
    thead: TableHead,
    tbody: TableBody,
    tr: TableRow,
    th: TableHeaderCell,
    td: TableDataCell,

    // Blockquote and misc
    blockquote: Blockquote,
    hr: HorizontalRule,
    strong: Strong,
    em: Emphasis,
};
