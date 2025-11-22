/**
 * Table Components with Responsive Wrapper
 * Handles markdown tables with proper styling and overflow
 */

import React from 'react';
import type { TableProps, MarkdownComponentProps } from '@/types/markdown.types';

/**
 * Table component with responsive wrapper
 */
export const Table = React.memo<TableProps>(
    ({ children, ...props }) => (
        <div className="overflow-x-auto my-4 rounded-lg border border-border">
            <table className="min-w-full divide-y divide-border" {...props}>
                {children}
            </table>
        </div>
    )
);

Table.displayName = 'Table';

/**
 * Table Head component
 */
export const TableHead = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => (
        <thead className="bg-muted" {...props}>
            {children}
        </thead>
    )
);

TableHead.displayName = 'TableHead';

/**
 * Table Body component
 */
export const TableBody = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => (
        <tbody className="divide-y divide-border bg-background" {...props}>
            {children}
        </tbody>
    )
);

TableBody.displayName = 'TableBody';

/**
 * Table Row component
 */
export const TableRow = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => (
        <tr className="hover:bg-muted/50 transition-colors" {...props}>
            {children}
        </tr>
    )
);

TableRow.displayName = 'TableRow';

/**
 * Table Header Cell component
 */
export const TableHeaderCell = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => (
        <th
            className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground"
            {...props}
        >
            {children}
        </th>
    )
);

TableHeaderCell.displayName = 'TableHeaderCell';

/**
 * Table Data Cell component
 */
export const TableDataCell = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => (
        <td className="px-4 py-2 text-sm" {...props}>
            {children}
        </td>
    )
);

TableDataCell.displayName = 'TableDataCell';
