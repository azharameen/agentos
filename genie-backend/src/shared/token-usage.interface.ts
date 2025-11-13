export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface SessionTokenUsage {
  sessionId: string;
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  lastRequestAt: Date;
  createdAt: Date;
}

export interface TokenQuota {
  maxTokensPerSession?: number;
  maxTokensPerRequest?: number;
  maxCostPerSession?: number;
  maxRequestsPerSession?: number;
}
