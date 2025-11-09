import { Injectable, Logger } from "@nestjs/common";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import {
  SessionMemory,
  LongTermMemoryEntry,
} from "../../shared/agent.interface";

/**
 * Session memory structure
 */

/**
 * AgentMemoryService
 * Handles short-term (session-based) and long-term memory for the agent
 * Following Single Responsibility Principle: Only manages memory operations
 */
@Injectable()
export class AgentMemoryService {
  private readonly logger = new Logger(AgentMemoryService.name);

  // Short-term memory: session-based conversation history and context
  private readonly sessionMemoryStore = new Map<string, SessionMemory>();

  // Long-term memory: persistent facts, knowledge, and learned information
  private readonly longTermMemoryStore = new Map<string, LongTermMemoryEntry>();

  // Memory cleanup interval (30 minutes)
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  constructor() {
    // Start periodic cleanup of stale sessions
    this.startMemoryCleanup();
  }

  /**
   * Get or create session memory
   */
  getSession(sessionId: string): SessionMemory {
    if (!this.sessionMemoryStore.has(sessionId)) {
      const newSession: SessionMemory = {
        sessionId,
        conversationHistory: [],
        context: {},
        createdAt: new Date(),
        lastAccessedAt: new Date(),
      };
      this.sessionMemoryStore.set(sessionId, newSession);
      this.logger.log(`Created new session: ${sessionId}`);
    }

    const session = this.sessionMemoryStore.get(sessionId)!;
    session.lastAccessedAt = new Date();
    return session;
  }

  /**
   * Add a message to conversation history
   */
  addMessage(sessionId: string, role: "human" | "ai", content: string): void {
    const session = this.getSession(sessionId);
    const message =
      role === "human" ? new HumanMessage(content) : new AIMessage(content);

    session.conversationHistory.push(message);
    this.logger.debug(`Added ${role} message to session ${sessionId}`);
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): BaseMessage[] {
    const session = this.getSession(sessionId);
    return [...session.conversationHistory];
  }

  /**
   * Get recent conversation history (last N messages)
   */
  getRecentHistory(sessionId: string, count: number = 10): BaseMessage[] {
    const history = this.getConversationHistory(sessionId);
    return history.slice(-count);
  }

  /**
   * Update session context
   */
  updateContext(sessionId: string, context: Record<string, any>): void {
    const session = this.getSession(sessionId);
    session.context = { ...session.context, ...context };
    this.logger.debug(`Updated context for session ${sessionId}`);
  }

  /**
   * Get session context
   */
  getContext(sessionId: string): Record<string, any> {
    const session = this.getSession(sessionId);
    return { ...session.context };
  }

  /**
   * Clear session memory
   */
  clearSession(sessionId: string): void {
    this.sessionMemoryStore.delete(sessionId);
    this.logger.log(`Cleared session: ${sessionId}`);
  }

  /**
   * Add entry to long-term memory
   */
  addToLongTermMemory(
    content: string,
    metadata: Record<string, any> = {},
    embedding?: number[],
  ): string {
    const id = `ltm_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const entry: LongTermMemoryEntry = {
      id,
      content,
      metadata,
      embedding,
      createdAt: new Date(),
    };

    this.longTermMemoryStore.set(id, entry);
    this.logger.debug(`Added long-term memory entry: ${id}`);
    return id;
  }

  /**
   * Search long-term memory by keyword (simple text search)
   */
  searchLongTermMemory(
    query: string,
    limit: number = 5,
  ): LongTermMemoryEntry[] {
    const results: LongTermMemoryEntry[] = [];
    const queryLower = query.toLowerCase();

    for (const entry of this.longTermMemoryStore.values()) {
      if (entry.content.toLowerCase().includes(queryLower)) {
        results.push(entry);
        if (results.length >= limit) break;
      }
    }

    this.logger.debug(
      `Found ${results.length} long-term memory entries for query: ${query}`,
    );
    return results;
  }

  /**
   * Get long-term memory entry by ID
   */
  getLongTermMemory(id: string): LongTermMemoryEntry | undefined {
    return this.longTermMemoryStore.get(id);
  }

  /**
   * Delete long-term memory entry
   */
  deleteLongTermMemory(id: string): boolean {
    const deleted = this.longTermMemoryStore.delete(id);
    if (deleted) {
      this.logger.debug(`Deleted long-term memory entry: ${id}`);
    }
    return deleted;
  }

  /**
   * Get all sessions (for debugging/monitoring)
   */
  getAllSessions(): string[] {
    return Array.from(this.sessionMemoryStore.keys());
  }

  /**
   * Get memory statistics
   */
  getMemoryStats(): {
    activeSessions: number;
    longTermEntries: number;
    totalMessages: number;
  } {
    let totalMessages = 0;
    for (const session of this.sessionMemoryStore.values()) {
      totalMessages += session.conversationHistory.length;
    }

    return {
      activeSessions: this.sessionMemoryStore.size,
      longTermEntries: this.longTermMemoryStore.size,
      totalMessages,
    };
  }

  /**
   * Start periodic cleanup of stale sessions
   */
  private startMemoryCleanup(): void {
    setInterval(() => {
      this.cleanupStaleSessions();
    }, this.SESSION_TIMEOUT_MS);
  }

  /**
   * Clean up sessions that haven't been accessed recently
   */
  private cleanupStaleSessions(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessionMemoryStore.entries()) {
      const timeSinceLastAccess =
        now.getTime() - session.lastAccessedAt.getTime();
      if (timeSinceLastAccess > this.SESSION_TIMEOUT_MS) {
        this.sessionMemoryStore.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} stale sessions`);
    }
  }
}
