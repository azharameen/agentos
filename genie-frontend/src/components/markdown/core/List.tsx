/**
 * List Components (Ordered and Unordered)
 * Handles markdown lists with proper styling and nesting
 */

import React from 'react';
import type { ListProps, MarkdownComponentProps } from '@/types/markdown.types';

/**
 * Unordered List component
 */
export const UnorderedList = React.memo<ListProps>(
    ({ children, ...props }) => (
        <ul className="list-disc list-outside ml-6 my-2 space-y-1" {...props}>
            {children}
        </ul>
    )
);

UnorderedList.displayName = 'UnorderedList';

/**
 * Ordered List component
 */
export const OrderedList = React.memo<ListProps>(
    ({ children, ...props }) => (
        <ol className="list-decimal list-outside ml-6 my-2 space-y-1" {...props}>
            {children}
        </ol>
    )
);

OrderedList.displayName = 'OrderedList';

/**
 * List Item component
 */
export const ListItem = React.memo<MarkdownComponentProps>(
    ({ children, ...props }) => (
        <li className="my-1" {...props}>
            {children}
        </li>
    )
);

ListItem.displayName = 'ListItem';
