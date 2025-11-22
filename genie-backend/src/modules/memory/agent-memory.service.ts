import { Injectable, Logger } from "@nestjs/common";
import { BaseMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import {
  SessionMemory,
  LongTermMemoryEntry,
} from "../../shared/agent.interface";

/**
 * AgentMemoryService
 * Handles short-term (session-based) and long-term memory for the agent.
 *
 * @deprecated Use UnifiedMemoryService instead. This service will be removed in a future release.
 * 
 * Migration Guide:
 * 1. Replace AgentMemoryService with UnifiedMemoryService in your imports
 * 2. Update constructor injection: `private readonly memory: UnifiedMemoryService`
 * 3. Update method calls:
 *    - `addMessage()` → `await memory.addMessage()` (now async with persistent storage)
 *    - `getConversationHistory()` → `await memory.getRecentMessages(sessionId, limit)`
 *    - `getContext()` → `await memory.getContext(sessionId)`
 *    - `updateContext()` → `await memory.updateContext(sessionId, context)`
 *    - `clearSession()` → `await memory.clearSession(sessionId)`
 *    - `listSessions()` → `await memory.listSessions()`
 *    - `getMemoryAnalytics()` → `await memory.getMemoryAnalytics()`
 *    - `exportMemory()` → `await memory.exportMemory()`
 *    - `importMemory()` → `await memory.importMemory(data)`
 * 
 * Benefits of migration:
 * - Persistent SQLite storage (survives restarts)
 * - Unified memory architecture (session, long-term, workflow)
 * - Better performance with caching and indexing
 * - Automatic cleanup and optimization
 *
 * Responsibilities:
 * - Manages session-based conversation history and context
 * - Stores and retrieves long-term memory entries (facts, knowledge)
 * - Provides memory analytics, pruning, import/export, and cleanup
 *
 * Usage:
 * Injected via NestJS DI. Use addMessage to append to history, getSession/getContext for retrieval, and pruneMemory for cleanup.
 */
@Injectable()
export class AgentMemoryService {
  /**
   * Lists all session IDs currently in memory.
   * @returns Array of session IDs
   */
  listSessions(): string[] {
    return Array.from(this.sessionMemoryStore.keys());
  }
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
   * Gets or creates session memory for a given session ID.
   * @param sessionId Session identifier
   * @returns SessionMemory object
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
   * Adds a message to conversation history for a session.
   * @param sessionId Session identifier
   * @param role "human" or "ai"
   * @param content Message content
   */
  addMessage(sessionId: string, role: "human" | "ai", content: string): void {
    const session = this.getSession(sessionId);
    const message =
      role === "human" ? new HumanMessage(content) : new AIMessage(content);

    session.conversationHistory.push(message);
    this.logger.debug(`Added ${role} message to session ${sessionId}`);
  }

  /**
   * Gets conversation history for a session.
   * @param sessionId Session identifier
   * @returns Array of BaseMessage objects
   */
  getConversationHistory(sessionId: string): BaseMessage[] {
    const session = this.getSession(sessionId);
    return [...session.conversationHistory];
  }

  /**
   * Gets recent conversation history (last N messages).
   * @param sessionId Session identifier
   * @param count Number of messages to retrieve (default 10)
   * @returns Array of BaseMessage objects
   */
  getRecentHistory(sessionId: string, count: number = 10): BaseMessage[] {
    const history = this.getConversationHistory(sessionId);
    return history.slice(-count);
  }

  /**
   * Updates session context for a session.
   * @param sessionId Session identifier
   * @param context Context object to merge
   */
  updateContext(sessionId: string, context: Record<string, any>): void {
    const session = this.getSession(sessionId);
    session.context = { ...session.context, ...context };
    this.logger.debug(`Updated context for session ${sessionId}`);
  }

  /**
   * Gets session context for a session.
   * @param sessionId Session identifier
   * @returns Context object
   */
  getContext(sessionId: string): Record<string, any> {
    const session = this.getSession(sessionId);
    return { ...session.context };
  }

  /**
   * Clears session memory for a given session ID.
   * @param sessionId Session identifier
   */
  clearSession(sessionId: string): void {
    this.sessionMemoryStore.delete(sessionId);
    this.logger.log(`Cleared session: ${sessionId}`);
  }

  /**
   * Adds an entry to long-term memory.
   * @param content Entry content
   * @param metadata Optional metadata
   * @param embedding Optional embedding vector
   * @returns Entry ID
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
   * Searches long-term memory by keyword (simple text search).
   * @param query Search query
   * @param limit Max results to return (default 5)
   * @returns Array of LongTermMemoryEntry
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
   * Gets long-term memory entry by ID.
   * @param id Entry ID
   * @returns LongTermMemoryEntry or undefined
   */
  getLongTermMemory(id: string): LongTermMemoryEntry | undefined {
    return this.longTermMemoryStore.get(id);
  }

  /**
   * Deletes long-term memory entry by ID.
   * @param id Entry ID
   * @returns True if deleted, false otherwise
   */
  deleteLongTermMemory(id: string): boolean {
    const deleted = this.longTermMemoryStore.delete(id);
    if (deleted) {
      this.logger.debug(`Deleted long-term memory entry: ${id}`);
    }
    return deleted;
  }

  /**
   * Gets all session IDs (for debugging/monitoring).
   * @returns Array of session IDs
   */
  getAllSessions(): string[] {
    return Array.from(this.sessionMemoryStore.keys());
  }

  /**
   * Gets memory statistics (active sessions, long-term entries, total messages).
   * @returns Memory stats object
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
   * Gets detailed memory analytics (sessions, long-term memory, system health).
   * @returns Analytics object
   */
  getMemoryAnalytics(): {
    sessions: {
      total: number;
      avgMessagesPerSession: number;
      oldestSession: Date | null;
      newestSession: Date | null;
      totalMessages: number;
    };
    longTermMemory: {
      total: number;
      totalSizeBytes: number;
      avgSizeBytes: number;
      oldestEntry: Date | null;
      newestEntry: Date | null;
    };
    systemHealth: {
      staleSessions: number;
      largeSessionsCount: number;
      memoryPressure: "low" | "medium" | "high";
    };
  } {
    let totalMessages = 0;
    let oldestSessionDate: Date | null = null;
    let newestSessionDate: Date | null = null;
    let staleSessions = 0;
    let largeSessionsCount = 0;
    const now = new Date();
    const LARGE_SESSION_THRESHOLD = 50; // messages

    for (const session of this.sessionMemoryStore.values()) {
      const messageCount = session.conversationHistory.length;
      totalMessages += messageCount;

      if (messageCount > LARGE_SESSION_THRESHOLD) {
        largeSessionsCount++;
      }

      const timeSinceLastAccess =
        now.getTime() - session.lastAccessedAt.getTime();
      if (timeSinceLastAccess > this.SESSION_TIMEOUT_MS * 0.8) {
        staleSessions++;
      }

      if (!oldestSessionDate || session.createdAt < oldestSessionDate) {
        oldestSessionDate = session.createdAt;
      }
      if (!newestSessionDate || session.createdAt > newestSessionDate) {
        newestSessionDate = session.createdAt;
      }
    }

    let totalLTMSize = 0;
    let oldestLTMDate: Date | null = null;
    let newestLTMDate: Date | null = null;

    for (const entry of this.longTermMemoryStore.values()) {
      const entrySize =
        entry.content.length + JSON.stringify(entry.metadata).length;
      totalLTMSize += entrySize;

      if (!oldestLTMDate || entry.createdAt < oldestLTMDate) {
        oldestLTMDate = entry.createdAt;
      }
      if (!newestLTMDate || entry.createdAt > newestLTMDate) {
        newestLTMDate = entry.createdAt;
      }
    }

    const avgMessagesPerSession =
      this.sessionMemoryStore.size > 0
        ? totalMessages / this.sessionMemoryStore.size
        : 0;
    const avgLTMSize =
      this.longTermMemoryStore.size > 0
        ? totalLTMSize / this.longTermMemoryStore.size
        : 0;

    // Determine memory pressure
    let memoryPressure: "low" | "medium" | "high" = "low";
    if (
      this.sessionMemoryStore.size > 100 ||
      this.longTermMemoryStore.size > 1000
    ) {
      memoryPressure = "high";
    } else if (
      this.sessionMemoryStore.size > 50 ||
      this.longTermMemoryStore.size > 500
    ) {
      memoryPressure = "medium";
    }

    return {
      sessions: {
        total: this.sessionMemoryStore.size,
        avgMessagesPerSession: Math.round(avgMessagesPerSession * 100) / 100,
        oldestSession: oldestSessionDate,
        newestSession: newestSessionDate,
        totalMessages,
      },
      longTermMemory: {
        total: this.longTermMemoryStore.size,
        totalSizeBytes: totalLTMSize,
        avgSizeBytes: Math.round(avgLTMSize),
        oldestEntry: oldestLTMDate,
        newestEntry: newestLTMDate,
      },
      systemHealth: {
        staleSessions,
        largeSessionsCount,
        memoryPressure,
      },
    };
  }

  /**
   * Exports memory to JSON (backup/transfer).
   * @returns Exported memory object
   */
  exportMemory(): {
    exportedAt: Date;
    sessions: Array<{
      sessionId: string;
      conversationHistory: Array<{
        type: string;
        content: string;
        additionalKwargs?: Record<string, any>;
      }>;
      context: Record<string, any>;
      createdAt: Date;
      lastAccessedAt: Date;
    }>;
    longTermMemory: LongTermMemoryEntry[];
  } {
    const sessions = Array.from(this.sessionMemoryStore.values()).map(
      (session) => ({
        sessionId: session.sessionId,
        conversationHistory: session.conversationHistory.map((msg) => ({
          type: msg._getType(),
          content:
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content),
          additionalKwargs: (msg as any).additional_kwargs || {},
        })),
        context: session.context,
        createdAt: session.createdAt,
        lastAccessedAt: session.lastAccessedAt,
      }),
    );

    const longTermMemory = Array.from(this.longTermMemoryStore.values());

    this.logger.log(
      `Exported ${sessions.length} sessions and ${longTermMemory.length} long-term memory entries`,
    );

    return {
      exportedAt: new Date(),
      sessions,
      longTermMemory,
    };
  }

  /**
   * Imports memory from JSON (restore from backup).
   * @param data Memory data to import
   * @returns Import result (counts, errors)
   */
  importMemory(data: {
    sessions: Array<{
      sessionId: string;
      conversationHistory: Array<{
        type: string;
        content: string;
        additionalKwargs?: Record<string, any>;
      }>;
      context: Record<string, any>;
      createdAt: Date | string;
      lastAccessedAt: Date | string;
    }>;
    longTermMemory: Array<{
      id: string;
      content: string;
      metadata: Record<string, any>;
      embedding?: number[];
      createdAt: Date | string;
    }>;
  }): {
    sessionsImported: number;
    longTermMemoryImported: number;
    errors: string[];
  } {
    const errors: string[] = [];
    let sessionsImported = 0;
    let longTermMemoryImported = 0;

    // Import sessions
    for (const sessionData of data.sessions || []) {
      try {
        const conversationHistory: BaseMessage[] = [];

        for (const msgData of sessionData.conversationHistory) {
          if (msgData.type === "human") {
            conversationHistory.push(new HumanMessage(msgData.content));
          } else if (msgData.type === "ai") {
            conversationHistory.push(new AIMessage(msgData.content));
          }
        }

        const session: SessionMemory = {
          sessionId: sessionData.sessionId,
          conversationHistory,
          context: sessionData.context || {},
          createdAt: new Date(sessionData.createdAt),
          lastAccessedAt: new Date(sessionData.lastAccessedAt),
        };

        this.sessionMemoryStore.set(sessionData.sessionId, session);
        sessionsImported++;
      } catch (error) {
        errors.push(
          `Failed to import session ${sessionData.sessionId}: ${error.message}`,
        );
      }
    }

    // Import long-term memory
    for (const entryData of data.longTermMemory || []) {
      try {
        const entry: LongTermMemoryEntry = {
          id: entryData.id,
          content: entryData.content,
          metadata: entryData.metadata || {},
          embedding: entryData.embedding,
          createdAt: new Date(entryData.createdAt),
        };

        this.longTermMemoryStore.set(entryData.id, entry);
        longTermMemoryImported++;
      } catch (error) {
        errors.push(
          `Failed to import long-term memory ${entryData.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Imported ${sessionsImported} sessions and ${longTermMemoryImported} long-term memory entries`,
    );
    if (errors.length > 0) {
      this.logger.warn(`Import completed with ${errors.length} errors`);
    }

    return {
      sessionsImported,
      longTermMemoryImported,
      errors,
    };
  }

  /**
   * Prunes memory based on strategy (max sessions, messages, long-term entries, recent days).
   * @param strategy Pruning strategy object
   * @returns Prune result (counts)
   */
  pruneMemory(strategy: {
    maxSessions?: number;
    maxMessagesPerSession?: number;
    maxLongTermEntries?: number;
    keepRecentDays?: number;
  }): {
    sessionsPruned: number;
    messagesPruned: number;
    longTermEntriesPruned: number;
  } {
    let sessionsPruned = 0;
    let messagesPruned = 0;
    let longTermEntriesPruned = 0;
    const now = new Date();

    // Prune sessions by age (keepRecentDays)
    if (strategy.keepRecentDays !== undefined) {
      const cutoffTime =
        now.getTime() - strategy.keepRecentDays * 24 * 60 * 60 * 1000;

      for (const [sessionId, session] of this.sessionMemoryStore.entries()) {
        if (session.lastAccessedAt.getTime() < cutoffTime) {
          this.sessionMemoryStore.delete(sessionId);
          sessionsPruned++;
        }
      }
    }

    // Prune oldest sessions if exceeding maxSessions
    if (
      strategy.maxSessions !== undefined &&
      this.sessionMemoryStore.size > strategy.maxSessions
    ) {
      const sessions = Array.from(this.sessionMemoryStore.entries()).sort(
        ([, a], [, b]) =>
          a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime(),
      );

      const toRemove = sessions.length - strategy.maxSessions + sessionsPruned;
      for (let i = 0; i < toRemove && i < sessions.length; i++) {
        this.sessionMemoryStore.delete(sessions[i][0]);
        sessionsPruned++;
      }
    }

    // Prune messages within sessions
    if (strategy.maxMessagesPerSession !== undefined) {
      for (const session of this.sessionMemoryStore.values()) {
        const currentLength = session.conversationHistory.length;
        if (currentLength > strategy.maxMessagesPerSession) {
          const toKeep = strategy.maxMessagesPerSession;
          session.conversationHistory =
            session.conversationHistory.slice(-toKeep);
          messagesPruned += currentLength - toKeep;
        }
      }
    }

    // Prune oldest long-term memory entries
    if (
      strategy.maxLongTermEntries !== undefined &&
      this.longTermMemoryStore.size > strategy.maxLongTermEntries
    ) {
      const entries = Array.from(this.longTermMemoryStore.entries()).sort(
        ([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      const toRemove = entries.length - strategy.maxLongTermEntries;
      for (let i = 0; i < toRemove && i < entries.length; i++) {
        this.longTermMemoryStore.delete(entries[i][0]);
        longTermEntriesPruned++;
      }
    }

    this.logger.log(
      `Pruned ${sessionsPruned} sessions, ${messagesPruned} messages, ${longTermEntriesPruned} long-term entries`,
    );

    return {
      sessionsPruned,
      messagesPruned,
      longTermEntriesPruned,
    };
  }

  /**
   * Starts periodic cleanup of stale sessions (runs every SESSION_TIMEOUT_MS).
   */
  private startMemoryCleanup(): void {
    setInterval(() => {
      this.cleanupStaleSessions();
    }, this.SESSION_TIMEOUT_MS);
  }

  /**
   * Cleans up sessions that haven't been accessed recently (older than SESSION_TIMEOUT_MS).
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
