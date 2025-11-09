import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Database from "better-sqlite3";
import * as path from "node:path";
import * as fs from "node:fs";
import { BaseMessage, HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

/**
 * Memory SQLite Service
 * Implements persistent conversation memory storage using SQLite
 *
 * Features:
 * - Session-based conversation history
 * - Long-term memory storage with metadata
 * - Message indexing and search
 * - Automatic context window management
 * - Memory summarization support
 * - Integration ready for vector-based memory retrieval
 *
 * Database Schema:
 * - conversation_messages: Session-specific message history
 * - long_term_memory: Persistent facts and context
 * - memory_summaries: Condensed conversation summaries
 */
@Injectable()
export class MemorySqliteService implements OnModuleInit {
  private readonly logger = new Logger(MemorySqliteService.name);
  private db: Database.Database | null = null;
  private isInitialized = false;

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize SQLite database for memory storage
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

      const dbPath = path.join(dbDir, "agent_memory.db");
      this.logger.log(`Initializing agent memory database at ${dbPath}`);

      this.db = new Database(dbPath);

      // Create schema
      this.createSchema();

      this.isInitialized = true;
      this.logger.log("Memory SQLite service initialized successfully");
    } catch (error: any) {
      this.logger.error(`Failed to initialize memory database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create database schema
   */
  private createSchema(): void {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    // Conversation messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('system', 'human', 'ai')),
        content TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Long-term memory table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS long_term_memory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        category TEXT,
        importance REAL DEFAULT 0.5,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        last_accessed_at DATETIME
      )
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
      )
    `);

    // Indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_conversation_messages_session_id
        ON conversation_messages(session_id, created_at DESC);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_long_term_memory_session_id
        ON long_term_memory(session_id);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_long_term_memory_key
        ON long_term_memory(key);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_memory_summaries_session_id
        ON memory_summaries(session_id, created_at DESC);
    `);

    this.logger.debug("Memory database schema created successfully");
  }

  /**
   * Add message to conversation history
   */
  async addMessage(
    sessionId: string,
    role: "system" | "human" | "ai",
    content: string,
    metadata: any = {}
  ): Promise<number> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const metadataJson = JSON.stringify(metadata);

      const stmt = this.db.prepare(`
        INSERT INTO conversation_messages (session_id, role, content, metadata)
        VALUES (?, ?, ?, ?)
      `);

      const result = stmt.run(sessionId, role, content, metadataJson);

      this.logger.debug(
        `Added ${role} message for session ${sessionId} (ID: ${result.lastInsertRowid})`
      );

      return Number(result.lastInsertRowid);
    } catch (error: any) {
      this.logger.error(`Failed to add message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent conversation history
   */
  async getRecentMessages(
    sessionId: string,
    limit: number = 10
  ): Promise<BaseMessage[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        SELECT role, content, metadata, created_at
        FROM conversation_messages
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);

      const rows = stmt.all(sessionId, limit) as any[];

      // Reverse to get chronological order
      const messages = rows.reverse().map((row) => {
        const metadata = row.metadata ? JSON.parse(row.metadata) : {};

        switch (row.role) {
          case "system":
            return new SystemMessage({ content: row.content, ...metadata });
          case "human":
            return new HumanMessage({ content: row.content, ...metadata });
          case "ai":
            return new AIMessage({ content: row.content, ...metadata });
          default:
            return new HumanMessage({ content: row.content, ...metadata });
        }
      });

      return messages;
    } catch (error: any) {
      this.logger.error(`Failed to get recent messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all conversation history (paginated)
   */
  async getAllMessages(
    sessionId: string,
    offset: number = 0,
    limit: number = 50
  ): Promise<{ messages: BaseMessage[]; total: number }> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      // Get total count
      const countStmt = this.db.prepare(`
        SELECT COUNT(*) as total
        FROM conversation_messages
        WHERE session_id = ?
      `);
      const countRow = countStmt.get(sessionId) as any;
      const total = countRow.total || 0;

      // Get messages
      const stmt = this.db.prepare(`
        SELECT role, content, metadata
        FROM conversation_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `);

      const rows = stmt.all(sessionId, limit, offset) as any[];

      const messages = rows.map((row) => {
        const metadata = row.metadata ? JSON.parse(row.metadata) : {};

        switch (row.role) {
          case "system":
            return new SystemMessage({ content: row.content, ...metadata });
          case "human":
            return new HumanMessage({ content: row.content, ...metadata });
          case "ai":
            return new AIMessage({ content: row.content, ...metadata });
          default:
            return new HumanMessage({ content: row.content, ...metadata });
        }
      });

      return { messages, total };
    } catch (error: any) {
      this.logger.error(`Failed to get all messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear conversation history for a session
   */
  async clearConversation(sessionId: string): Promise<number> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        DELETE FROM conversation_messages
        WHERE session_id = ?
      `);

      const result = stmt.run(sessionId);

      this.logger.log(
        `Cleared ${result.changes} messages for session ${sessionId}`
      );

      return result.changes;
    } catch (error: any) {
      this.logger.error(`Failed to clear conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store long-term memory (facts, preferences, context)
   */
  async setLongTermMemory(
    sessionId: string | null,
    key: string,
    value: string,
    options: {
      category?: string;
      importance?: number;
      metadata?: any;
    } = {}
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const metadataJson = JSON.stringify(options.metadata || {});

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO long_term_memory
        (session_id, key, value, category, importance, metadata, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);

      stmt.run(
        sessionId,
        key,
        value,
        options.category || "general",
        options.importance || 0.5,
        metadataJson
      );

      this.logger.debug(
        `Stored long-term memory: ${key} (session: ${sessionId || "global"})`
      );
    } catch (error: any) {
      this.logger.error(`Failed to set long-term memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve long-term memory
   */
  async getLongTermMemory(
    key: string,
    sessionId?: string
  ): Promise<string | null> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      let stmt: Database.Statement;
      let row: any;

      if (sessionId) {
        // Session-specific memory
        stmt = this.db.prepare(`
          SELECT value, id
          FROM long_term_memory
          WHERE key = ? AND session_id = ?
          ORDER BY updated_at DESC
          LIMIT 1
        `);
        row = stmt.get(key, sessionId);
      } else {
        // Global memory
        stmt = this.db.prepare(`
          SELECT value, id
          FROM long_term_memory
          WHERE key = ? AND session_id IS NULL
          ORDER BY updated_at DESC
          LIMIT 1
        `);
        row = stmt.get(key);
      }

      if (!row) {
        return null;
      }

      // Update access tracking
      this.db
        .prepare(`
          UPDATE long_term_memory
          SET access_count = access_count + 1,
              last_accessed_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `)
        .run(row.id);

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
    sessionId?: string
  ): Promise<Array<{ key: string; value: string; importance: number }>> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      let stmt: Database.Statement;

      if (sessionId) {
        stmt = this.db.prepare(`
          SELECT key, value, importance
          FROM long_term_memory
          WHERE category = ? AND session_id = ?
          ORDER BY importance DESC, updated_at DESC
        `);
      } else {
        stmt = this.db.prepare(`
          SELECT key, value, importance
          FROM long_term_memory
          WHERE category = ? AND session_id IS NULL
          ORDER BY importance DESC, updated_at DESC
        `);
      }

      const rows = sessionId
        ? stmt.all(category, sessionId)
        : stmt.all(category);

      return rows as Array<{ key: string; value: string; importance: number }>;
    } catch (error: any) {
      this.logger.error(`Failed to search long-term memory: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save conversation summary
   */
  async saveSummary(
    sessionId: string,
    summary: string,
    messageCount: number,
    startMessageId?: number,
    endMessageId?: number
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO memory_summaries
        (session_id, summary, message_count, start_message_id, end_message_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(sessionId, summary, messageCount, startMessageId, endMessageId);

      this.logger.debug(
        `Saved summary for session ${sessionId} (${messageCount} messages)`
      );
    } catch (error: any) {
      this.logger.error(`Failed to save summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conversation summaries
   */
  async getSummaries(sessionId: string, limit: number = 5): Promise<string[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        SELECT summary
        FROM memory_summaries
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);

      const rows = stmt.all(sessionId, limit) as any[];

      return rows.map((row) => row.summary);
    } catch (error: any) {
      this.logger.error(`Failed to get summaries: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get memory statistics
   */
  getStats(sessionId?: string): {
    totalMessages: number;
    totalLongTermMemories: number;
    totalSummaries: number;
  } {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      let messagesCount: any;
      let longTermCount: any;
      let summariesCount: any;

      if (sessionId) {
        messagesCount = this.db
          .prepare(
            "SELECT COUNT(*) as count FROM conversation_messages WHERE session_id = ?"
          )
          .get(sessionId);

        longTermCount = this.db
          .prepare(
            "SELECT COUNT(*) as count FROM long_term_memory WHERE session_id = ?"
          )
          .get(sessionId);

        summariesCount = this.db
          .prepare(
            "SELECT COUNT(*) as count FROM memory_summaries WHERE session_id = ?"
          )
          .get(sessionId);
      } else {
        messagesCount = this.db
          .prepare("SELECT COUNT(*) as count FROM conversation_messages")
          .get();

        longTermCount = this.db
          .prepare("SELECT COUNT(*) as count FROM long_term_memory")
          .get();

        summariesCount = this.db
          .prepare("SELECT COUNT(*) as count FROM memory_summaries")
          .get();
      }

      return {
        totalMessages: messagesCount?.count || 0,
        totalLongTermMemories: longTermCount?.count || 0,
        totalSummaries: summariesCount?.count || 0
      };
    } catch (error: any) {
      this.logger.error(`Failed to get stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async onModuleDestroy() {
    if (this.db) {
      this.db.close();
      this.logger.log("Memory database connection closed");
    }
  }
}
