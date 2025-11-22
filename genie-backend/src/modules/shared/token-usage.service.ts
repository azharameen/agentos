import { Injectable, Logger } from "@nestjs/common";
import {
  TokenUsage,
  SessionTokenUsage,
  TokenQuota,
} from "../../shared/token-usage.interface";

/**
 * Token Usage Tracking Service
 * Tracks LLM token usage per session for cost monitoring and quota enforcement
 */
@Injectable()
export class TokenUsageService {
  private readonly logger = new Logger(TokenUsageService.name);
  private readonly sessionUsage = new Map<string, SessionTokenUsage>();

  // Token pricing (USD per 1K tokens) - GPT-4 example
  private readonly PRICING = {
    "gpt-4": { prompt: 0.03, completion: 0.06 },
    "gpt-4-turbo": { prompt: 0.01, completion: 0.03 },
    "gpt-3.5-turbo": { prompt: 0.0005, completion: 0.0015 },
  };

  /**
   * Track token usage for a session
   */
  trackUsage(
    sessionId: string,
    usage: TokenUsage,
    model: string = "gpt-4",
  ): void {
    const cost = this.calculateCost(usage, model);

    const existing = this.sessionUsage.get(sessionId);
    if (existing) {
      existing.totalTokens += usage.totalTokens;
      existing.totalCost += cost;
      existing.requestCount += 1;
      existing.lastRequestAt = new Date();
    } else {
      this.sessionUsage.set(sessionId, {
        sessionId,
        totalTokens: usage.totalTokens,
        totalCost: cost,
        requestCount: 1,
        lastRequestAt: new Date(),
        createdAt: new Date(),
      });
    }

    this.logger.debug(
      `Session ${sessionId}: +${usage.totalTokens} tokens, $${cost.toFixed(4)} cost`,
    );
  }

  /**
   * Get token usage for a session
   */
  getSessionUsage(sessionId: string): SessionTokenUsage | undefined {
    return this.sessionUsage.get(sessionId);
  }

  /**
   * Get all session usage stats
   */
  getAllSessionUsage(): SessionTokenUsage[] {
    return Array.from(this.sessionUsage.values());
  }

  /**
   * Check if session exceeds quota
   */
  checkQuota(sessionId: string, quota: TokenQuota): boolean {
    const usage = this.sessionUsage.get(sessionId);
    if (!usage) return true; // No usage yet, quota OK

    if (
      quota.maxTokensPerSession &&
      usage.totalTokens > quota.maxTokensPerSession
    ) {
      this.logger.warn(
        `Session ${sessionId} exceeded token quota: ${usage.totalTokens}/${quota.maxTokensPerSession}`,
      );
      return false;
    }

    if (quota.maxCostPerSession && usage.totalCost > quota.maxCostPerSession) {
      this.logger.warn(
        `Session ${sessionId} exceeded cost quota: $${usage.totalCost.toFixed(4)}/$${quota.maxCostPerSession}`,
      );
      return false;
    }

    if (
      quota.maxRequestsPerSession &&
      usage.requestCount > quota.maxRequestsPerSession
    ) {
      this.logger.warn(
        `Session ${sessionId} exceeded request quota: ${usage.requestCount}/${quota.maxRequestsPerSession}`,
      );
      return false;
    }

    return true;
  }

  /**
   * Reset session usage
   */
  resetSession(sessionId: string): void {
    this.sessionUsage.delete(sessionId);
    this.logger.log(`Reset usage for session ${sessionId}`);
  }

  /**
   * Clear old sessions (older than maxAge milliseconds)
   */
  clearOldSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleared = 0;

    for (const [sessionId, usage] of this.sessionUsage.entries()) {
      if (now - usage.lastRequestAt.getTime() > maxAgeMs) {
        this.sessionUsage.delete(sessionId);
        cleared++;
      }
    }

    if (cleared > 0) {
      this.logger.log(`Cleared ${cleared} old sessions`);
    }

    return cleared;
  }

  /**
   * Calculate cost based on token usage and model
   */
  private calculateCost(usage: TokenUsage, model: string): number {
    const pricing =
      this.PRICING[model as keyof typeof this.PRICING] || this.PRICING["gpt-4"];

    const promptCost = (usage.promptTokens / 1000) * pricing.prompt;
    const completionCost = (usage.completionTokens / 1000) * pricing.completion;

    return promptCost + completionCost;
  }

  /**
   * Get total cost across all sessions
   */
  getTotalCost(): number {
    return Array.from(this.sessionUsage.values()).reduce(
      (sum, usage) => sum + usage.totalCost,
      0,
    );
  }

  /**
   * Get total tokens across all sessions
   */
  getTotalTokens(): number {
    return Array.from(this.sessionUsage.values()).reduce(
      (sum, usage) => sum + usage.totalTokens,
      0,
    );
  }
}
