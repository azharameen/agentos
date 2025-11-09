import { Injectable, Logger } from "@nestjs/common";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";

export interface SQLiteVectorDocument {
  id: string;
  content: string;
  metadata: Record<string, any>;
  embedding: number[];
  createdAt: string;
}

@Injectable()
export class SqliteVectorstoreService {
  private readonly logger = new Logger(SqliteVectorstoreService.name);
  private db!: Database.Database;
  private dbPath: string;

  constructor() {
    // Use env var or default path
    this.dbPath = process.env.RAG_SQLITE_PATH || "./data/rag_store.sqlite";
    this.initialize();
  }

  private initialize() {
    // Ensure directory exists
    const dir = this.dbPath
      .replace(/\\/g, "/")
      .split("/")
      .slice(0, -1)
      .join("/");
    if (dir && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");

    // Create tables
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        metadata TEXT,
        embedding TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      )
      .run();

    // Index content for faster lookups
    this.db
      .prepare(
        `CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at)`,
      )
      .run();

    this.logger.log(`SQLite vectorstore initialized at ${this.dbPath}`);
  }

  addDocument(
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {},
  ): string {
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const stmt = this.db.prepare(
      `INSERT INTO documents (id, content, metadata, embedding, created_at) VALUES (?, ?, ?, ?, ?)`,
    );
    stmt.run(
      id,
      content,
      JSON.stringify(metadata || {}),
      JSON.stringify(embedding),
      createdAt,
    );
    return id;
  }

  addDocuments(
    contents: string[],
    embeddings: number[][],
    metadatas?: Record<string, any>[],
  ): string[] {
    const ids: string[] = [];
    const insert = this.db.prepare(
      `INSERT INTO documents (id, content, metadata, embedding, created_at) VALUES (?, ?, ?, ?, ?)`,
    );
    const now = new Date().toISOString();
    const insertMany = this.db.transaction(
      (rows: Array<[string, string, string, string, string]>) => {
        for (const r of rows) insert.run(...r);
      },
    );

    const rows: Array<[string, string, string, string, string]> = [];
    for (let i = 0; i < contents.length; i++) {
      const id = uuidv4();
      const content = contents[i];
      const embedding = embeddings[i];
      const meta = metadatas?.[i] || {};
      rows.push([
        id,
        content,
        JSON.stringify(meta),
        JSON.stringify(embedding),
        now,
      ]);
      ids.push(id);
    }

    insertMany(rows);
    return ids;
  }

  getDocument(id: string): SQLiteVectorDocument | undefined {
    const row: any = this.db
      .prepare(`SELECT * FROM documents WHERE id = ?`)
      .get(id);
    if (!row) return undefined;
    return {
      id: row.id,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      embedding: JSON.parse(row.embedding),
      createdAt: row.created_at,
    };
  }

  getAllDocuments(): SQLiteVectorDocument[] {
    const rows = this.db
      .prepare(`SELECT * FROM documents ORDER BY created_at DESC`)
      .all();
    return rows.map((row: any) => ({
      id: row.id,
      content: row.content,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      embedding: JSON.parse(row.embedding),
      createdAt: row.created_at,
    }));
  }

  deleteDocument(id: string): boolean {
    const res = this.db.prepare(`DELETE FROM documents WHERE id = ?`).run(id);
    return res.changes > 0;
  }

  clearAll(): void {
    this.db.prepare(`DELETE FROM documents`).run();
  }

  // Naive similarity search: load all embeddings and compute cosine similarity in JS
  similaritySearch(
    queryEmbedding: number[],
    k = 5,
  ): Array<{
    id: string;
    score: number;
    content: string;
    metadata: Record<string, any>;
  }> {
    const rows = this.db
      .prepare(`SELECT id, content, metadata, embedding FROM documents`)
      .all();
    const results = rows
      .map((row: any) => {
        const emb = JSON.parse(row.embedding) as number[];
        const score = this.cosineSimilarity(queryEmbedding, emb);
        return {
          id: row.id,
          content: row.content,
          metadata: row.metadata ? JSON.parse(row.metadata) : {},
          score,
        };
      })
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, k);

    return results;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}
