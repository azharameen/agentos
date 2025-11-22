/**
 * Heading Components (H1-H6)
 * Handles markdown headings with proper hierarchy and styling
 */

import React from 'react';
import type { HeadingProps } from '@/types/markdown.types';

/**
 * Base heading component with level-based styling
 */
const BaseHeading = React.memo<HeadingProps>(
    ({ level, children, ...props }) => {
        const Tag = `h${level}` as keyof JSX.IntrinsicElements;

        const classes = {
            1: 'text-3xl font-bold mt-6 mb-4',
            2: 'text-2xl font-bold mt-5 mb-3',
            3: 'text-xl font-bold mt-4 mb-2',
            4: 'text-lg font-semibold mt-3 mb-2',
            5: 'text-base font-semibold mt-3 mb-1',
            6: 'text-sm font-semibold mt-2 mb-1',
        };

        return (
            <Tag className={classes[level]} {...props}>
                {children}
            </Tag>
        );
    }
);

BaseHeading.displayName = 'BaseHeading';

// Export individual heading components
export const H1 = (props: Omit<HeadingProps, 'level'>) => <BaseHeading level={1} {...props} />;
export const H2 = (props: Omit<HeadingProps, 'level'>) => <BaseHeading level={2} {...props} />;
export const H3 = (props: Omit<HeadingProps, 'level'>) => <BaseHeading level={3} {...props} />;
export const H4 = (props: Omit<HeadingProps, 'level'>) => <BaseHeading level={4} {...props} />;
export const H5 = (props: Omit<HeadingProps, 'level'>) => <BaseHeading level={5} {...props} />;
export const H6 = (props: Omit<HeadingProps, 'level'>) => <BaseHeading level={6} {...props} />;

H1.displayName = 'H1';
H2.displayName = 'H2';
H3.displayName = 'H3';
H4.displayName = 'H4';
H5.displayName = 'H5';
H6.displayName = 'H6';
