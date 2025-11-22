/**
 * Image Component with Loading States
 * Handles image loading, errors, and provides accessible fallbacks
 */

import React, { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { ImageProps } from '@/types/markdown.types';

/**
 * Image component with loading states and error handling
 * Memoized for performance optimization
 */
export const Image = React.memo<ImageProps>(
    ({ src, alt = '', ...props }) => {
        const [isLoading, setIsLoading] = useState(true);
        const [hasError, setHasError] = useState(false);

        // Handle image load
        const handleLoad = () => {
            setIsLoading(false);
            setHasError(false);
        };

        // Handle image error
        const handleError = () => {
            setIsLoading(false);
            setHasError(true);
        };

        // Render error state
        if (hasError) {
            return (
                <div
                    className="flex items-center justify-center gap-2 my-4 p-8 bg-muted rounded-lg border border-border"
                    role="img"
                    aria-label={alt || 'Failed to load image'}
                >
                    <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        {alt || 'Failed to load image'}
                    </span>
                </div>
            );
        }

        return (
            <div className="relative my-4">
                {/* Loading skeleton */}
                {isLoading && (
                    <div
                        className="absolute inset-0 bg-muted animate-pulse rounded-lg"
                        aria-label="Loading image"
                    />
                )}

                {/* Actual image */}
                <img
                    src={src}
                    alt={alt}
                    loading="lazy"
                    onLoad={handleLoad}
                    onError={handleError}
                    className={`rounded-lg max-w-full h-auto transition-opacity ${isLoading ? 'opacity-0' : 'opacity-100'
                        }`}
                    {...props}
                />
            </div>
        );
    },
    (prev, next) => {
        // Only re-render if src or alt changes
        return prev.src === next.src && prev.alt === next.alt;
    }
);

Image.displayName = 'Image';
