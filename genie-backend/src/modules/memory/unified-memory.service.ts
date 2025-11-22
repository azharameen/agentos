import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";
import Database from "better-sqlite3";
import * as path from "node:path";
import * as fs from "node:fs";

/**
 * Unified Memory Service
 * 
 * Consolidates three memory layers into a single, cohesive interface:
 * 1. Session Memory - Short-term conversation history and context
 * 2. Long-Term Memory - Persistent facts, preferences, and knowledge
 * 3. Workflow Memory - Durable workflow state and checkpoints
 * 
 * Benefits:
 * - Single point of access for all memory operations
 * - Consistent API across memory types
 * - Unified persistence layer (single SQLite database)
 * - Improved testability and maintainability
 * - Automatic cleanup and optimization
 * 
 * Migration from old services:
 * - AgentMemoryService → session methods
 * - MemorySqliteService → long-term methods
 * - LangGraphPersistenceService → workflow methods
 */
@Injectable()
export class UnifiedMemoryService implements OnModuleInit {
  private readonly logger = new Logger(UnifiedMemoryService.name);
  private db: Database.Database | null = null;
  private isInitialized = false;

  // Cache for active sessions (performance optimization)
  private readonly sessionCache = new Map<string, {
    conversationHistory: BaseMessage[];
    context: Record<string, any>;
    lastAccessedAt: Date;
  }>();

  // Memory cleanup configuration
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private readonly CACHE_SIZE_LIMIT = 100; // Max sessions in cache

  async onModuleInit() {
    await this.initialize();
    this.startMemoryCleanup();
  }

  /**
   * Initialize unified memory database
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const dbDir = process.env.MEMORY_DB_DIR || "./data";
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = path.join(dbDir, "unified_memory.db");
      this.logger.log(`Initializing unified memory database at ${dbPath}`);

      this.db = new Database(dbPath);
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("synchronous = NORMAL");

      this.createSchema();
      this.isInitialized = true;
      this.logger.log("Unified memory service initialized successfully");
    } catch (error: any) {
      this.logger.error(`Failed to initialize unified memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create unified database schema
   */
  private createSchema(): void {
    if (!this.db) throw new Error("Database not initialized");

    // Session messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('system', 'human', 'ai')),
        content TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_session_messages_session_id 
      ON session_messages(session_id, created_at);
    `);

    // Session context table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_context (
        session_id TEXT PRIMARY KEY,
        context TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Long-term memory table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS long_term_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        importance REAL DEFAULT 0.5,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        last_accessed_at DATETIME
      );
      
      CREATE INDEX IF NOT EXISTS idx_long_term_memory_key ON long_term_memory(key);
      CREATE INDEX IF NOT EXISTS idx_long_term_memory_session_id ON long_term_memory(session_id);
      CREATE INDEX IF NOT EXISTS idx_long_term_memory_category ON long_term_memory(category);
    `);

    // Workflow checkpoints table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workflow_checkpoints (
        thread_id TEXT NOT NULL,
        checkpoint_ns TEXT NOT NULL DEFAULT '',
        checkpoint_id TEXT NOT NULL,
        parent_checkpoint_id TEXT,
        checkpoint BLOB NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_workflow_checkpoints_thread_id 
      ON workflow_checkpoints(thread_id, created_at);
    `);

    // Memory summaries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        summary TEXT NOT NULL,
        message_count INTEGER NOT NULL,
        start_message_id INTEGER,
        end_message_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_memory_summaries_session_id 
      ON memory_summaries(session_id, created_at);
    `);

    this.logger.debug("Unified memory schema created successfully");
  }

  // ============================================================
  // SESSION MEMORY API
  // ============================================================

  /**
   * Add message to session conversation history
   */
  async addMessage(sessionId: string, role: "system" | "human" | "ai", content: string, metadata: any = {}): Promise<number> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const metadataJson = JSON.stringify(metadata);

      const stmt = this.db.prepare(`
        INSERT INTO session_messages (session_id, role, content, metadata)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(sessionId, role, content, metadataJson);

      // Update cache
      if (this.sessionCache.has(sessionId)) {
        const session = this.sessionCache.get(sessionId)!;
        const message = this.createMessage(role, content, metadata);
        session.conversationHistory.push(message);
        session.lastAccessedAt = new Date();
      }

      this.logger.debug(`Added ${role} message for session ${sessionId}`);
      return Number(result.lastInsertRowid);
    } catch (error: any) {
      this.logger.error(`Failed to add message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent conversation history
   */
  async getRecentMessages(sessionId: string, limit: number = 10): Promise<BaseMessage[]> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const stmt = this.db.prepare(`
        SELECT role, content, metadata
        FROM session_messages
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);

      const rows = stmt.all(sessionId, limit) as any[];
      const messages = rows.reverse().map(row =>
        this.createMessage(row.role, row.content, JSON.parse(row.metadata || '{}'))
      );

      // Update cache
      if (this.sessionCache.has(sessionId)) {
        const session = this.sessionCache.get(sessionId)!;
        session.lastAccessedAt = new Date();
      }

      return messages;
    } catch (error: any) {
      this.logger.error(`Failed to get recent messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all messages for a session (paginated)
   */
  async getAllMessages(sessionId: string, offset: number = 0, limit: number = 50): Promise<{ messages: BaseMessage[]; total: number }> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const countStmt = this.db.prepare(`SELECT COUNT(*) as total FROM session_messages WHERE session_id = ?`);
      const countRow = countStmt.get(sessionId) as any;
      const total = countRow.total || 0;

      const stmt = this.db.prepare(`
        SELECT role, content, metadata
        FROM session_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `);

      const rows = stmt.all(sessionId, limit, offset) as any[];
      const messages = rows.map(row =>
        this.createMessage(row.role, row.content, JSON.parse(row.metadata || '{}'))
      );

      return { messages, total };
    } catch (error: any) {
      this.logger.error(`Failed to get all messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update session context
   */
  async updateContext(sessionId: string, context: Record<string, any>): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const existingContext = await this.getContext(sessionId);
      const mergedContext = { ...existingContext, ...context };
      const contextJson = JSON.stringify(mergedContext);

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO session_context (session_id, context, last_accessed_at, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      stmt.run(sessionId, contextJson);

      // Update cache
      if (this.sessionCache.has(sessionId)) {
        const session = this.sessionCache.get(sessionId)!;
        session.context = mergedContext;
        session.lastAccessedAt = new Date();
      }

      this.logger.debug(`Updated context for session ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Failed to update context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get session context
   */
  async getContext(sessionId: string): Promise<Record<string, any>> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      // Check cache first
      if (this.sessionCache.has(sessionId)) {
        const session = this.sessionCache.get(sessionId)!;
        session.lastAccessedAt = new Date();
        return { ...session.context };
      }

      const stmt = this.db.prepare(`SELECT context FROM session_context WHERE session_id = ?`);
      const row = stmt.get(sessionId) as any;

      if (!row) {
        return {};
      }

      const context = JSON.parse(row.context);

      // Update last accessed timestamp
      this.db.prepare(`
        UPDATE session_context 
        SET last_accessed_at = CURRENT_TIMESTAMP 
        WHERE session_id = ?
      `).run(sessionId);

      return context;
    } catch (error: any) {
      this.logger.error(`Failed to get context: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear session memory
   */
  async clearSession(sessionId: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      this.db.prepare(`DELETE FROM session_messages WHERE session_id = ?`).run(sessionId);
      this.db.prepare(`DELETE FROM session_context WHERE session_id = ?`).run(sessionId);
      this.db.prepare(`DELETE FROM memory_summaries WHERE session_id = ?`).run(sessionId);

      this.sessionCache.delete(sessionId);

      this.logger.log(`Cleared session: ${sessionId}`);
    } catch (error: any) {
      this.logger.error(`Failed to clear session: ${error.message}`);
      throw error;
    }
  }

  // ============================================================
  // LONG-TERM MEMORY API
  // ============================================================

  /**
   * Store long-term memory entry
   */
  async setLongTermMemory(
    key: string,
    value: string,
    options: {
      sessionId?: string;
      category?: string;
      importance?: number;
      metadata?: any;
    } = {}
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const metadataJson = JSON.stringify(options.metadata || {});

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO long_term_memory
        (session_id, key, value, category, importance, metadata, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        options.sessionId || null,
        key,
        value,
        options.category || "general",
        options.importance || 0.5,
        metadataJson
      );

      this.logger.debug(`Stored long-term memory: ${key}`);
    } catch (error: any) {
      this.logger.error(`Failed to set long-term memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve long-term memory entry
   */
  async getLongTermMemory(key: string, sessionId?: string): Promise<string | null> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      let stmt: Database.Statement;
      let row: any;

      if (sessionId) {
        stmt = this.db.prepare(`
          SELECT value, id FROM long_term_memory
          WHERE key = ? AND session_id = ?
          ORDER BY updated_at DESC LIMIT 1
        `);
        row = stmt.get(key, sessionId);
      } else {
        stmt = this.db.prepare(`
          SELECT value, id FROM long_term_memory
          WHERE key = ? AND session_id IS NULL
          ORDER BY updated_at DESC LIMIT 1
        `);
        row = stmt.get(key);
      }

      if (!row) return null;

      // Update access tracking
      this.db.prepare(`
        UPDATE long_term_memory
        SET access_count = access_count + 1, last_accessed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(row.id);

      return row.value;
    } catch (error: any) {
      this.logger.error(`Failed to get long-term memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search long-term memory by category
   */
  async searchLongTermMemory(
    category: string,
    sessionId?: string,
    limit: number = 10
  ): Promise<Array<{ key: string; value: string; importance: number }>> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      let stmt: Database.Statement;

      if (sessionId) {
        stmt = this.db.prepare(`
          SELECT key, value, importance FROM long_term_memory
          WHERE category = ? AND session_id = ?
          ORDER BY importance DESC, updated_at DESC
          LIMIT ?
        `);
      } else {
        stmt = this.db.prepare(`
          SELECT key, value, importance FROM long_term_memory
          WHERE category = ? AND session_id IS NULL
          ORDER BY importance DESC, updated_at DESC
          LIMIT ?
        `);
      }

      const rows = sessionId
        ? stmt.all(category, sessionId, limit)
        : stmt.all(category, limit);

      return rows as Array<{ key: string; value: string; importance: number }>;
    } catch (error: any) {
      this.logger.error(`Failed to search long-term memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete long-term memory entry
   */
  async deleteLongTermMemory(key: string, sessionId?: string): Promise<boolean> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      let stmt: Database.Statement;

      if (sessionId) {
        stmt = this.db.prepare(`DELETE FROM long_term_memory WHERE key = ? AND session_id = ?`);
        stmt.run(key, sessionId);
      } else {
        stmt = this.db.prepare(`DELETE FROM long_term_memory WHERE key = ? AND session_id IS NULL`);
        stmt.run(key);
      }

      this.logger.debug(`Deleted long-term memory: ${key}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to delete long-term memory: ${error.message}`);
      return false;
    }
  }

  // ============================================================
  // WORKFLOW MEMORY API
  // ============================================================

  /**
   * Save workflow checkpoint
   */
  async saveCheckpoint(
    threadId: string,
    checkpointId: string,
    checkpoint: any,
    metadata: any = {},
    parentCheckpointId?: string
  ): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const checkpointBlob = Buffer.from(JSON.stringify(checkpoint), "utf-8");
      const metadataJson = JSON.stringify(metadata);

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO workflow_checkpoints
        (thread_id, checkpoint_id, checkpoint, metadata, parent_checkpoint_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(threadId, checkpointId, checkpointBlob, metadataJson, parentCheckpointId || null);

      this.logger.debug(`Saved workflow checkpoint ${checkpointId} for thread ${threadId}`);
    } catch (error: any) {
      this.logger.error(`Failed to save checkpoint: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get workflow checkpoint
   */
  async getCheckpoint(threadId: string, checkpointId?: string): Promise<any | null> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      let stmt: Database.Statement;
      let row: any;

      if (checkpointId) {
        stmt = this.db.prepare(`
          SELECT checkpoint, metadata, parent_checkpoint_id, checkpoint_id
          FROM workflow_checkpoints
          WHERE thread_id = ? AND checkpoint_id = ?
        `);
        row = stmt.get(threadId, checkpointId);
      } else {
        stmt = this.db.prepare(`
          SELECT checkpoint, metadata, parent_checkpoint_id, checkpoint_id
          FROM workflow_checkpoints
          WHERE thread_id = ?
          ORDER BY created_at DESC LIMIT 1
        `);
        row = stmt.get(threadId);
      }

      if (!row) return null;

      return {
        threadId,
        checkpointId: row.checkpoint_id,
        parentCheckpointId: row.parent_checkpoint_id,
        checkpoint: JSON.parse(row.checkpoint.toString("utf-8")),
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      };
    } catch (error: any) {
      this.logger.error(`Failed to get checkpoint: ${error.message}`);
      throw error;
    }
  }

  /**
   * List workflow checkpoints
   */
  async listCheckpoints(threadId: string, limit: number = 10): Promise<any[]> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const stmt = this.db.prepare(`
        SELECT checkpoint_id, parent_checkpoint_id, metadata, created_at
        FROM workflow_checkpoints
        WHERE thread_id = ?
        ORDER BY created_at DESC LIMIT ?
      `);

      const rows = stmt.all(threadId, limit) as any[];

      return rows.map(row => ({
        threadId,
        checkpointId: row.checkpoint_id,
        parentCheckpointId: row.parent_checkpoint_id,
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: row.created_at
      }));
    } catch (error: any) {
      this.logger.error(`Failed to list checkpoints: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete workflow checkpoints
   */
  async deleteCheckpoints(threadId: string, checkpointId?: string): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      if (checkpointId) {
        this.db.prepare(`DELETE FROM workflow_checkpoints WHERE thread_id = ? AND checkpoint_id = ?`)
          .run(threadId, checkpointId);
      } else {
        this.db.prepare(`DELETE FROM workflow_checkpoints WHERE thread_id = ?`)
          .run(threadId);
      }

      this.logger.log(`Deleted checkpoints for thread ${threadId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete checkpoints: ${error.message}`);
      throw error;
    }
  }

  // ============================================================
  // MEMORY ANALYTICS & MANAGEMENT
  // ============================================================

  /**
   * Get comprehensive memory statistics
   */
  getStats(sessionId?: string): {
    sessions: { total: number; totalMessages: number };
    longTermMemory: { total: number; totalSizeBytes: number };
    workflows: { total: number; totalCheckpoints: number };
  } {
    if (!this.db) throw new Error("Database not initialized");

    try {
      let sessionsCount: any;
      let messagesCount: any;
      let longTermCount: any;
      let workflowsCount: any;
      let checkpointsCount: any;

      if (sessionId) {
        sessionsCount = this.db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM session_context WHERE session_id = ?`).get(sessionId);
        messagesCount = this.db.prepare(`SELECT COUNT(*) as count FROM session_messages WHERE session_id = ?`).get(sessionId);
        longTermCount = this.db.prepare(`SELECT COUNT(*) as count FROM long_term_memory WHERE session_id = ?`).get(sessionId);
        workflowsCount = { count: 0 };
        checkpointsCount = { count: 0 };
      } else {
        sessionsCount = this.db.prepare(`SELECT COUNT(DISTINCT session_id) as count FROM session_context`).get();
        messagesCount = this.db.prepare(`SELECT COUNT(*) as count FROM session_messages`).get();
        longTermCount = this.db.prepare(`SELECT COUNT(*) as count FROM long_term_memory`).get();
        workflowsCount = this.db.prepare(`SELECT COUNT(DISTINCT thread_id) as count FROM workflow_checkpoints`).get();
        checkpointsCount = this.db.prepare(`SELECT COUNT(*) as count FROM workflow_checkpoints`).get();
      }

      // Calculate total size of long-term memory
      const sizeQuery = sessionId
        ? this.db.prepare(`SELECT SUM(LENGTH(value)) as size FROM long_term_memory WHERE session_id = ?`).get(sessionId)
        : this.db.prepare(`SELECT SUM(LENGTH(value)) as size FROM long_term_memory`).get();

      return {
        sessions: {
          total: sessionsCount?.count || 0,
          totalMessages: messagesCount?.count || 0
        },
        longTermMemory: {
          total: longTermCount?.count || 0,
          totalSizeBytes: (sizeQuery as any)?.size || 0
        },
        workflows: {
          total: workflowsCount?.count || 0,
          totalCheckpoints: checkpointsCount?.count || 0
        }
      };
    } catch (error: any) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cleanup old memory (sessions, checkpoints)
   */
  async cleanup(olderThanDays: number = 30): Promise<{
    sessionsDeleted: number;
    checkpointsDeleted: number;
  }> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      // Delete old sessions
      const sessionsStmt = this.db.prepare(`
        DELETE FROM session_messages 
        WHERE session_id IN (
          SELECT session_id FROM session_context 
          WHERE last_accessed_at < datetime(?)
        )
      `);
      const sessionsResult = sessionsStmt.run(cutoffDate.toISOString());

      this.db.prepare(`DELETE FROM session_context WHERE last_accessed_at < datetime(?)`).run(cutoffDate.toISOString());

      // Delete old checkpoints
      const checkpointsStmt = this.db.prepare(`
        DELETE FROM workflow_checkpoints WHERE created_at < datetime(?)
      `);
      const checkpointsResult = checkpointsStmt.run(cutoffDate.toISOString());

      this.logger.log(`Cleanup: ${sessionsResult.changes} messages, ${checkpointsResult.changes} checkpoints deleted`);

      return {
        sessionsDeleted: sessionsResult.changes,
        checkpointsDeleted: checkpointsResult.changes
      };
    } catch (error: any) {
      this.logger.error(`Failed to cleanup: ${error.message}`);
      throw error;
    }
  }

  // ============================================================
  // PRIVATE HELPERS
  // ============================================================

  private createMessage(role: string, content: string, metadata: any = {}): BaseMessage {
    switch (role) {
      case "system":
        return new SystemMessage({ content, ...metadata });
      case "human":
        return new HumanMessage({ content, ...metadata });
      case "ai":
        return new AIMessage({ content, ...metadata });
      default:
        return new HumanMessage({ content, ...metadata });
    }
  }

  private startMemoryCleanup(): void {
    setInterval(() => {
      this.cleanupStaleCache();
    }, this.SESSION_TIMEOUT_MS);
  }

  private cleanupStaleCache(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessionCache.entries()) {
      const timeSinceLastAccess = now.getTime() - session.lastAccessedAt.getTime();
      if (timeSinceLastAccess > this.SESSION_TIMEOUT_MS) {
        this.sessionCache.delete(sessionId);
        cleaned++;
      }
    }

    // Limit cache size
    if (this.sessionCache.size > this.CACHE_SIZE_LIMIT) {
      const entries = Array.from(this.sessionCache.entries())
        .sort(([, a], [, b]) => a.lastAccessedAt.getTime() - b.lastAccessedAt.getTime());

      const toRemove = entries.length - this.CACHE_SIZE_LIMIT;
      for (let i = 0; i < toRemove; i++) {
        this.sessionCache.delete(entries[i][0]);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`Cleaned up ${cleaned} cached sessions`);
    }
  }

  async onModuleDestroy() {
    if (this.db) {
      this.db.close();
      this.logger.log("Unified memory database connection closed");
    }
  }

  // ============================================================
  // MEMORY CONTROLLER API (Legacy compatibility)
  // ============================================================

  /**
   * Lists all session IDs from database
   */
  async listSessions(): Promise<string[]> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const rows = this.db.prepare(`
        SELECT DISTINCT session_id FROM session_messages
        ORDER BY session_id
      `).all() as Array<{ session_id: string }>;

      return rows.map(row => row.session_id);
    } catch (error: any) {
      this.logger.error(`Failed to list sessions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets detailed memory analytics
   */
  async getMemoryAnalytics(): Promise<{
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
      cacheSize: number;
      memoryPressure: "low" | "medium" | "high";
    };
  }> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      // Session analytics
      const sessionStats = this.db.prepare(`
        SELECT 
          COUNT(DISTINCT session_id) as total_sessions,
          COUNT(*) as total_messages,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM session_messages
      `).get() as any;

      const avgMessages = sessionStats.total_sessions > 0
        ? sessionStats.total_messages / sessionStats.total_sessions
        : 0;

      // Long-term memory analytics
      const ltmStats = this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(LENGTH(value)) as total_size,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM long_term_memory
      `).get() as any;

      const avgSize = ltmStats.total > 0 ? ltmStats.total_size / ltmStats.total : 0;

      // Memory pressure calculation
      let memoryPressure: "low" | "medium" | "high" = "low";
      if (sessionStats.total_sessions > 100 || ltmStats.total > 1000) {
        memoryPressure = "high";
      } else if (sessionStats.total_sessions > 50 || ltmStats.total > 500) {
        memoryPressure = "medium";
      }

      return {
        sessions: {
          total: sessionStats.total_sessions || 0,
          avgMessagesPerSession: Math.round(avgMessages * 100) / 100,
          oldestSession: sessionStats.oldest ? new Date(sessionStats.oldest) : null,
          newestSession: sessionStats.newest ? new Date(sessionStats.newest) : null,
          totalMessages: sessionStats.total_messages || 0,
        },
        longTermMemory: {
          total: ltmStats.total || 0,
          totalSizeBytes: ltmStats.total_size || 0,
          avgSizeBytes: Math.round(avgSize),
          oldestEntry: ltmStats.oldest ? new Date(ltmStats.oldest) : null,
          newestEntry: ltmStats.newest ? new Date(ltmStats.newest) : null,
        },
        systemHealth: {
          cacheSize: this.sessionCache.size,
          memoryPressure,
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to get memory analytics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Exports all memory data (backup)
   */
  async exportMemory(): Promise<{
    exportedAt: Date;
    sessions: Array<{
      sessionId: string;
      messages: Array<{ role: string; content: string; metadata: any; created_at: string }>;
      context: Record<string, any>;
    }>;
    longTermMemory: Array<{
      key: string;
      value: string;
      category: string;
      importance: number;
      metadata: any;
      created_at: string;
    }>;
  }> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      // Export sessions
      const sessionIds = await this.listSessions();
      const sessions: Array<{
        sessionId: string;
        messages: Array<{ role: string; content: string; metadata: any; created_at: string }>;
        context: Record<string, any>;
      }> = [];

      for (const sessionId of sessionIds) {
        const messages = this.db.prepare(`
          SELECT role, content, metadata, created_at
          FROM session_messages
          WHERE session_id = ?
          ORDER BY created_at ASC
        `).all(sessionId) as any[];

        const contextRow = this.db.prepare(`
          SELECT context FROM session_context WHERE session_id = ?
        `).get(sessionId) as any;

        sessions.push({
          sessionId,
          messages,
          context: contextRow ? JSON.parse(contextRow.context) : {},
        });
      }

      // Export long-term memory
      const ltmRows = this.db.prepare(`
        SELECT key, value, category, importance, metadata, created_at
        FROM long_term_memory
      `).all() as any[];

      return {
        exportedAt: new Date(),
        sessions,
        longTermMemory: ltmRows,
      };
    } catch (error: any) {
      this.logger.error(`Failed to export memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Imports memory data (restore from backup)
   */
  async importMemory(data: {
    sessions: Array<{
      sessionId: string;
      messages: Array<{ role: string; content: string; metadata: any; created_at: string }>;
      context: Record<string, any>;
    }>;
    longTermMemory: Array<{
      key: string;
      value: string;
      category: string;
      importance: number;
      metadata: any;
      created_at: string;
    }>;
  }): Promise<{
    sessionsImported: number;
    messagesImported: number;
    longTermMemoryImported: number;
    errors: string[];
  }> {
    if (!this.db) throw new Error("Database not initialized");

    const errors: string[] = [];
    let sessionsImported = 0;
    let messagesImported = 0;
    let longTermMemoryImported = 0;

    try {
      // Import sessions
      for (const sessionData of data.sessions || []) {
        try {
          // Import messages
          for (const msg of sessionData.messages) {
            await this.addMessage(
              sessionData.sessionId,
              msg.role as any,
              msg.content,
              msg.metadata ? JSON.parse(msg.metadata) : {}
            );
            messagesImported++;
          }

          // Import context
          if (Object.keys(sessionData.context).length > 0) {
            await this.updateContext(sessionData.sessionId, sessionData.context);
          }

          sessionsImported++;
        } catch (error: any) {
          errors.push(`Failed to import session ${sessionData.sessionId}: ${error.message}`);
        }
      }

      // Import long-term memory
      for (const entry of data.longTermMemory || []) {
        try {
          await this.setLongTermMemory(entry.key, entry.value, {
            category: entry.category,
            importance: entry.importance,
            metadata: entry.metadata ? JSON.parse(entry.metadata) : {},
          });
          longTermMemoryImported++;
        } catch (error: any) {
          errors.push(`Failed to import long-term memory ${entry.key}: ${error.message}`);
        }
      }

      this.logger.log(
        `Imported ${sessionsImported} sessions, ${messagesImported} messages, ${longTermMemoryImported} long-term entries`
      );

      if (errors.length > 0) {
        this.logger.warn(`Import completed with ${errors.length} errors`);
      }

      return {
        sessionsImported,
        messagesImported,
        longTermMemoryImported,
        errors,
      };
    } catch (error: any) {
      this.logger.error(`Failed to import memory: ${error.message}`);
      throw error;
    }
  }
}
