import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import Database from "better-sqlite3";
import * as path from "node:path";
import * as fs from "node:fs";

/**
 * LangGraph Persistence Service
 * Implements SQLite-backed workflow state storage for durable LangGraph workflows
 *
 * Features:
 * - Persistent workflow state snapshots
 * - Time-travel debugging (rewind to previous states)
 * - Human-in-the-loop support (pause/resume workflows)
 * - Multi-threaded conversation tracking
 * - Automatic cleanup of old checkpoints
 *
 * Database Schema:
 * - workflow_states table: Stores workflow state snapshots
 *
 * Note: This is a simplified persistence service. For full LangGraph checkpointing,
 * use MemorySaver (in-memory) or SqliteSaver from @langchain/langgraph-checkpoint-sqlite.
 * This service provides custom state management for workflow orchestration.
 */
@Injectable()
export class LangGraphPersistenceService implements OnModuleInit {
  private readonly logger = new Logger(LangGraphPersistenceService.name);
  private db: Database.Database | null = null;
  private isInitialized = false;

  async onModuleInit() {
    await this.initialize();
  }

  /**
   * Initialize SQLite database for checkpointing
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const dbDir = process.env.LANGGRAPH_DB_DIR || "./data";
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const dbPath = path.join(dbDir, "langgraph_checkpoints.db");
      this.logger.log(`Initializing LangGraph checkpoints database at ${dbPath}`);

      this.db = new Database(dbPath);

      // Create schema
      this.createSchema();

      this.isInitialized = true;
      this.logger.log("LangGraph persistence service initialized successfully");
    } catch (error: any) {
      this.logger.error(`Failed to initialize persistence: ${error.message}`);
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

    // Checkpoints table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoints (
        thread_id TEXT NOT NULL,
        checkpoint_ns TEXT NOT NULL DEFAULT '',
        checkpoint_id TEXT NOT NULL,
        parent_checkpoint_id TEXT,
        type TEXT,
        checkpoint BLOB NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
      )
    `);

    // Checkpoint writes table (for pending operations)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS checkpoint_writes (
        thread_id TEXT NOT NULL,
        checkpoint_ns TEXT NOT NULL DEFAULT '',
        checkpoint_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        idx INTEGER NOT NULL,
        channel TEXT NOT NULL,
        type TEXT,
        value BLOB,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx),
        FOREIGN KEY (thread_id, checkpoint_ns, checkpoint_id)
          REFERENCES checkpoints (thread_id, checkpoint_ns, checkpoint_id)
          ON DELETE CASCADE
      )
    `);

    // Indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id ON checkpoints(thread_id);
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_checkpoints_created_at ON checkpoints(created_at);
    `);

    this.logger.debug("Database schema created successfully");
  }

  /**
   * Get workflow state by thread ID and optional state ID
   */
  async getWorkflowState(
    threadId: string,
    stateId?: string
  ): Promise<any | undefined> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      let stmt: Database.Statement;
      let row: any;

      if (stateId) {
        // Get specific checkpoint
        stmt = this.db.prepare(`
          SELECT checkpoint, metadata, parent_checkpoint_id, checkpoint_id
          FROM checkpoints
          WHERE thread_id = ? AND checkpoint_id = ?
        `);
        row = stmt.get(threadId, stateId);
      } else {
        // Get latest checkpoint
        stmt = this.db.prepare(`
          SELECT checkpoint, metadata, parent_checkpoint_id, checkpoint_id
          FROM checkpoints
          WHERE thread_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `);
        row = stmt.get(threadId);
      }

      if (!row) {
        return undefined;
      }

      const state = JSON.parse(row.checkpoint.toString("utf-8"));
      const metadata = row.metadata ? JSON.parse(row.metadata) : {};

      return {
        threadId,
        stateId: row.checkpoint_id,
        parentStateId: row.parent_checkpoint_id,
        state,
        metadata
      };
    } catch (error: any) {
      this.logger.error(`Failed to get workflow state: ${error.message}`);
      throw error;
    }
  }

  /**
   * List workflow states for a thread
   */
  async listWorkflowStates(
    threadId: string,
    limit: number = 10
  ): Promise<any[]> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        SELECT checkpoint, metadata, parent_checkpoint_id, checkpoint_id, created_at
        FROM checkpoints
        WHERE thread_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);

      const rows = stmt.all(threadId, limit) as any[];

      return rows.map(row => ({
        threadId,
        stateId: row.checkpoint_id,
        parentStateId: row.parent_checkpoint_id,
        state: JSON.parse(row.checkpoint.toString("utf-8")),
        metadata: row.metadata ? JSON.parse(row.metadata) : {},
        createdAt: row.created_at
      }));
    } catch (error: any) {
      this.logger.error(`Failed to list workflow states: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save workflow state
   */
  async saveWorkflowState(
    threadId: string,
    stateId: string,
    state: any,
    metadata: any = {},
    parentStateId?: string
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stateBlob = Buffer.from(JSON.stringify(state), "utf-8");
      const metadataJson = JSON.stringify(metadata);

      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO checkpoints
        (thread_id, checkpoint_id, checkpoint, metadata, parent_checkpoint_id)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(threadId, stateId, stateBlob, metadataJson, parentStateId || null);

      this.logger.debug(`Saved workflow state ${stateId} for thread ${threadId}`);
    } catch (error: any) {
      this.logger.error(`Failed to save workflow state: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete checkpoint
   */
  async deleteCheckpoint(
    threadId: string,
    checkpointId: string,
    checkpointNs: string = "",
  ): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        DELETE FROM checkpoints
        WHERE thread_id = ? AND checkpoint_ns = ? AND checkpoint_id = ?
      `);

      stmt.run(threadId, checkpointNs, checkpointId);

      this.logger.debug(
        `Deleted checkpoint ${checkpointId} for thread ${threadId}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to delete checkpoint: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete all checkpoints for a thread
   */
  async deleteThread(threadId: string, checkpointNs: string = ""): Promise<void> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        DELETE FROM checkpoints
        WHERE thread_id = ? AND checkpoint_ns = ?
      `);

      stmt.run(threadId, checkpointNs);

      this.logger.log(`Deleted all checkpoints for thread ${threadId}`);
    } catch (error: any) {
      this.logger.error(`Failed to delete thread: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cleanup old checkpoints (older than specified days)
   */
  async cleanupOldCheckpoints(olderThanDays: number = 30): Promise<number> {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const stmt = this.db.prepare(`
        DELETE FROM checkpoints
        WHERE created_at < datetime('now', '-' || ? || ' days')
      `);

      const result = stmt.run(olderThanDays);
      const deletedCount = result.changes;

      this.logger.log(
        `Cleaned up ${deletedCount} checkpoints older than ${olderThanDays} days`,
      );

      return deletedCount;
    } catch (error: any) {
      this.logger.error(`Failed to cleanup old checkpoints: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get checkpoint statistics
   */
  getStats(): {
    totalCheckpoints: number;
    totalThreads: number;
    oldestCheckpoint: string | null;
    newestCheckpoint: string | null;
  } {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    try {
      const totalCheckpoints = this.db
        .prepare("SELECT COUNT(*) as count FROM checkpoints")
        .get() as any;

      const totalThreads = this.db
        .prepare("SELECT COUNT(DISTINCT thread_id) as count FROM checkpoints")
        .get() as any;

      const oldestCheckpoint = this.db
        .prepare("SELECT MIN(created_at) as oldest FROM checkpoints")
        .get() as any;

      const newestCheckpoint = this.db
        .prepare("SELECT MAX(created_at) as newest FROM checkpoints")
        .get() as any;

      return {
        totalCheckpoints: totalCheckpoints.count || 0,
        totalThreads: totalThreads.count || 0,
        oldestCheckpoint: oldestCheckpoint.oldest || null,
        newestCheckpoint: newestCheckpoint.newest || null,
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
      this.logger.log("Database connection closed");
    }
  }
}
