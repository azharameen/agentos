/**
 * Custom hook for code copy functionality with visual feedback
 */

import { useState, useCallback } from 'react';
import { copyToClipboard } from '../utils/markdown-utils';
import type { UseCodeCopyReturn } from '@/types/markdown.types';

/**
 * Hook to handle code copying with temporary "copied" state
 * @param duration - How long to show "copied" state in milliseconds
 */
export function useCodeCopy(duration: number = 2000): UseCodeCopyReturn {
    const [copied, setCopied] = useState(false);
    const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const copyText = useCallback(async (text: string) => {
        // Clear existing timeout if any
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        const success = await copyToClipboard(text);

        if (success) {
            setCopied(true);
            const id = setTimeout(() => {
                setCopied(false);
                setTimeoutId(null);
            }, duration);
            setTimeoutId(id);
        }
    }, [duration, timeoutId]);

    const resetCopied = useCallback(() => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            setTimeoutId(null);
        }
        setCopied(false);
    }, [timeoutId]);

    return {
        copied,
        copyText,
        resetCopied,
    };
}
