/**
 * Link Component with Security and External Link Indicators
 * Handles internal and external links with proper security attributes
 */

import React from 'react';
import { ExternalLink } from 'lucide-react';
import { isExternalUrl, isHashUrl } from '../utils/markdown-utils';
import type { LinkProps } from '@/types/markdown.types';

/**
 * Link component with security features and external link indicators
 * Memoized for performance optimization
 */
export const Link = React.memo<LinkProps>(
    ({ href, children, ...props }) => {
        const external = isExternalUrl(href);
        const hash = isHashUrl(href);

        return (
            <a
                href={href}
                className="text-primary hover:underline transition-colors inline-flex items-center gap-1"
                target={external ? '_blank' : undefined}
                rel={external ? 'noopener noreferrer' : undefined}
                aria-label={external ? `${children} (opens in new tab)` : undefined}
                {...props}
            >
                {children}
                {external && (
                    <ExternalLink
                        className="inline-block h-3 w-3"
                        aria-hidden="true"
                    />
                )}
            </a>
        );
    },
    (prev, next) => {
        // Only re-render if href or children change
        return prev.href === next.href && prev.children === next.children;
    }
);

Link.displayName = 'Link';
