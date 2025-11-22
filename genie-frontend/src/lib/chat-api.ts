/**
 * Enhanced chat utilities for project-aware conversations
 * With automatic retry logic for failed requests
 */

import ENV from "./env";
import { fetchWithRetry, RetryPresets } from "./retry";

export interface ChatOptions {
  projectName?: string;
  sessionId?: string;
  useRAG?: boolean;
}

export interface ChatResponse {
  message: {
    role: string;
    content: string;
    timestamp: string;
    metadata?: {
      projectName?: string;
    };
  };
  suggestedActions?: Array<{
    id: string;
    type: string;
    description: string;
    canExecute: boolean;
  }>;
  references?: Array<{
    type: string;
    path: string;
    name?: string;
  }>;
}

export async function sendChatMessage(
  message: string,
  options?: ChatOptions & { signal?: AbortSignal }
): Promise<ChatResponse> {
  const { signal, ...chatOptions } = options || {};

  const response = await fetchWithRetry(
    `${ENV.API_URL}/agent/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        ...chatOptions,
      }),
      signal, // PERFORMANCE FIX: Support request cancellation
    },
    {
      ...RetryPresets.standard,
      onRetry: (attempt, error) => {
        console.warn(`Retrying chat request (attempt ${attempt}):`, error.message);
      },
    },
  );

  return response.json();
}

export async function analyzeAndSuggest(
  projectName: string,
  filePath: string,
  signal?: AbortSignal
): Promise<ChatResponse> {
  const response = await fetchWithRetry(
    `${ENV.API_URL}/agent/analyze-suggest`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectName,
        filePath,
      }),
      signal, // PERFORMANCE FIX: Support request cancellation
    },
    {
      ...RetryPresets.standard,
      onRetry: (attempt, error) => {
        console.warn(`Retrying analysis request (attempt ${attempt}):`, error.message);
      },
    },
  );

  return response.json();
}
