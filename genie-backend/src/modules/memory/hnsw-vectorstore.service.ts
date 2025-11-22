import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import {
  SqliteVectorstoreService,
  SQLiteVectorDocument,
} from "./sqlite-vectorstore.service";
import { HierarchicalNSW } from "hnswlib-node";
import * as fs from "fs";
import * as path from "path";

/**
 * HNSW-Enhanced Vector Store Service
 *
 * Wraps SqliteVectorstoreService with HNSW (Hierarchical Navigable Small World) index
 * for Approximate Nearest Neighbor (ANN) search.
 *
 * Performance:
 * - Naive cosine similarity: O(n) where n = number of documents
 * - HNSW: O(log n) query time with high recall (>95%)
 *
 * Use Cases:
 * - Large document collections (>10,000 docs)
 * - Real-time similarity search requirements
 * - Production RAG systems with high query throughput
 */
@Injectable()
export class HnswVectorstoreService implements OnModuleInit {
  private readonly logger = new Logger(HnswVectorstoreService.name);
  private enabled: boolean;
  private index: HierarchicalNSW | null = null;
  private indexPath: string;
  private readonly dimensions = 1536; // Azure OpenAI text-embedding-3-small dimension
  private idToDocMap: Map<number, string> = new Map(); // HNSW numeric ID -> document ID
  private docToIdMap: Map<string, number> = new Map(); // document ID -> HNSW numeric ID
  private nextHnswId = 0;

  constructor(private readonly sqliteVectorstore: SqliteVectorstoreService) {
    // Enable HNSW index via environment variable
    this.enabled = process.env.ENABLE_HNSW_INDEX === "true";
    const dbDir = process.env.DB_DIR || "./data";
    this.indexPath = path.join(dbDir, "hnsw_index.dat");

    if (!this.enabled) {
      this.logger.log(
        "HNSW index disabled. Set ENABLE_HNSW_INDEX=true to enable ANN search.",
      );
    }
  }

  async onModuleInit() {
    if (!this.enabled) return;

    try {
      // Initialize HNSW index
      this.index = new HierarchicalNSW("cosine", this.dimensions);

      // Try to load existing index
      if (
        fs.existsSync(this.indexPath) &&
        fs.existsSync(this.indexPath + ".meta")
      ) {
        this.logger.log("Loading existing HNSW index...");
        await this.loadIndex();
        this.logger.log(
          `HNSW index loaded with ${this.index.getCurrentCount()} vectors`,
        );
      } else {
        this.logger.log("Building new HNSW index from SQLite documents...");
        await this.rebuildIndex();
        this.logger.log(
          `HNSW index built with ${this.index.getCurrentCount()} vectors`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to initialize HNSW index", error);
      this.enabled = false;
    }
  }

  /**
   * Add document to both SQLite and HNSW index
   */
  addDocument(
    content: string,
    embedding: number[],
    metadata: Record<string, any> = {},
  ): string {
    const docId = this.sqliteVectorstore.addDocument(
      content,
      embedding,
      metadata,
    );

    if (this.enabled && this.index) {
      try {
        const hnswId = this.nextHnswId++;
        this.index.addPoint(embedding, hnswId);
        this.idToDocMap.set(hnswId, docId);
        this.docToIdMap.set(docId, hnswId);

        // Persist index periodically (every 100 additions)
        if (this.nextHnswId % 100 === 0) {
          this.saveIndex().catch((err) =>
            this.logger.error("Failed to save HNSW index", err),
          );
        }
      } catch (error) {
        this.logger.error("Failed to add document to HNSW index", error);
      }
    }

    return docId;
  }

  /**
   * Batch add documents (more efficient)
   */
  addDocuments(
    contents: string[],
    embeddings: number[][],
    metadatas?: Record<string, any>[],
  ): string[] {
    const docIds = this.sqliteVectorstore.addDocuments(
      contents,
      embeddings,
      metadatas,
    );

    if (this.enabled && this.index) {
      try {
        for (let i = 0; i < embeddings.length; i++) {
          const hnswId = this.nextHnswId++;
          const docId = docIds[i];
          this.index.addPoint(embeddings[i], hnswId);
          this.idToDocMap.set(hnswId, docId);
          this.docToIdMap.set(docId, hnswId);
        }

        // Save index after batch
        this.saveIndex().catch((err) =>
          this.logger.error("Failed to save HNSW index", err),
        );
      } catch (error) {
        this.logger.error("Failed to add documents to HNSW index", error);
      }
    }

    return docIds;
  }

  /**
   * Similarity search using HNSW index (ANN) or fallback to naive search
   */
  async similaritySearch(
    queryEmbedding: number[],
    k = 5,
  ): Promise<
    Array<{
      id: string;
      score: number;
      content: string;
      metadata: Record<string, any>;
    }>
  > {
    if (this.enabled && this.index && this.index.getCurrentCount() > 0) {
      try {
        // HNSW ANN search
        const result = this.index.searchKnn(queryEmbedding, k);
        const docs: Array<{
          id: string;
          score: number;
          content: string;
          metadata: Record<string, any>;
        }> = [];

        for (let i = 0; i < result.neighbors.length; i++) {
          const hnswId = result.neighbors[i];
          const docId = this.idToDocMap.get(hnswId);
          if (!docId) continue;

          const doc = this.sqliteVectorstore.getDocument(docId);
          if (doc) {
            docs.push({
              id: doc.id,
              content: doc.content,
              metadata: doc.metadata,
              score: 1 - result.distances[i], // Convert distance to similarity (0-1)
            });
          }
        }

        this.logger.debug(
          `HNSW search returned ${docs.length} results for k=${k}`,
        );
        return docs;
      } catch (error) {
        this.logger.error(
          "HNSW search failed, falling back to naive search",
          error,
        );
      }
    }

    // Fallback to naive cosine similarity
    this.logger.debug("Using naive cosine similarity search");
    return this.sqliteVectorstore.similaritySearch(queryEmbedding, k);
  }

  /**
   * Get document by ID (delegates to SQLite)
   */
  getDocument(id: string): SQLiteVectorDocument | undefined {
    return this.sqliteVectorstore.getDocument(id);
  }

  /**
   * Get all documents (delegates to SQLite)
   */
  getAllDocuments(): SQLiteVectorDocument[] {
    return this.sqliteVectorstore.getAllDocuments();
  }

  /**
   * Delete document from both SQLite and HNSW index
   */
  deleteDocument(id: string): boolean {
    const deleted = this.sqliteVectorstore.deleteDocument(id);

    if (deleted && this.enabled && this.index) {
      const hnswId = this.docToIdMap.get(id);
      if (hnswId !== undefined) {
        // Note: hnswlib-node doesn't support deletion, must rebuild index
        this.docToIdMap.delete(id);
        this.idToDocMap.delete(hnswId);
        this.logger.warn(
          "Document deleted from SQLite. HNSW index should be rebuilt for optimal performance.",
        );
      }
    }

    return deleted;
  }

  /**
   * Clear all documents and rebuild index
   */
  async clearAll(): Promise<void> {
    this.sqliteVectorstore.clearAll();

    if (this.enabled && this.index) {
      // Reset HNSW index
      this.index = new HierarchicalNSW("cosine", this.dimensions);
      this.idToDocMap.clear();
      this.docToIdMap.clear();
      this.nextHnswId = 0;

      // Delete index files
      if (fs.existsSync(this.indexPath)) fs.unlinkSync(this.indexPath);
      if (fs.existsSync(this.indexPath + ".meta"))
        fs.unlinkSync(this.indexPath + ".meta");
    }
  }

  /**
   * Rebuild HNSW index from SQLite database
   * Use this after deletions or on startup
   */
  async rebuildIndex(): Promise<void> {
    if (!this.enabled || !this.index) return;

    this.logger.log("Rebuilding HNSW index from SQLite...");
    const startTime = Date.now();

    // Reset mappings
    this.idToDocMap.clear();
    this.docToIdMap.clear();
    this.nextHnswId = 0;

    // Get all documents
    const docs = this.sqliteVectorstore.getAllDocuments();
    if (docs.length === 0) {
      this.logger.log("No documents to index");
      return;
    }

    // Initialize index with max elements
    this.index.initIndex(docs.length, 16, 200); // M=16, efConstruction=200 (balanced speed/accuracy)

    // Add all vectors
    for (const doc of docs) {
      const hnswId = this.nextHnswId++;
      this.index.addPoint(doc.embedding, hnswId);
      this.idToDocMap.set(hnswId, doc.id);
      this.docToIdMap.set(doc.id, hnswId);
    }

    await this.saveIndex();

    const duration = Date.now() - startTime;
    this.logger.log(
      `HNSW index rebuilt with ${docs.length} vectors in ${duration}ms`,
    );
  }

  /**
   * Save HNSW index to disk
   */
  private async saveIndex(): Promise<void> {
    if (!this.index) return;

    try {
      // Ensure directory exists
      const dir = path.dirname(this.indexPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save index
      this.index.writeIndexSync(this.indexPath);

      // Save metadata (ID mappings)
      const metadata = {
        nextHnswId: this.nextHnswId,
        idToDocMap: Array.from(this.idToDocMap.entries()),
        docToIdMap: Array.from(this.docToIdMap.entries()),
      };
      fs.writeFileSync(
        this.indexPath + ".meta",
        JSON.stringify(metadata),
        "utf-8",
      );

      this.logger.debug(`HNSW index saved to ${this.indexPath}`);
    } catch (error) {
      this.logger.error("Failed to save HNSW index", error);
      throw error;
    }
  }

  /**
   * Load HNSW index from disk
   */
  private async loadIndex(): Promise<void> {
    if (!this.index) return;

    try {
      // Load metadata
      const metaStr = fs.readFileSync(this.indexPath + ".meta", "utf-8");
      const metadata = JSON.parse(metaStr);

      this.nextHnswId = metadata.nextHnswId;
      this.idToDocMap = new Map(metadata.idToDocMap);
      this.docToIdMap = new Map(metadata.docToIdMap);

      // Load index
      const maxElements = this.idToDocMap.size;
      this.index.initIndex(maxElements, 16, 200);
      this.index.readIndexSync(this.indexPath);

      this.logger.debug(`HNSW index loaded from ${this.indexPath}`);
    } catch (error) {
      this.logger.error("Failed to load HNSW index", error);
      throw error;
    }
  }

  /**
   * Get statistics about the HNSW index
   */
  getIndexStats(): {
    enabled: boolean;
    vectorCount: number;
    indexPath: string;
  } {
    return {
      enabled: this.enabled,
      vectorCount: this.index ? this.index.getCurrentCount() : 0,
      indexPath: this.indexPath,
    };
  }

  /**
   * Benchmark: Compare HNSW vs naive search performance
   */
  async benchmark(
    queryEmbedding: number[],
    k = 5,
    iterations = 100,
  ): Promise<{
    hnswAvgMs: number;
    naiveAvgMs: number;
    speedup: number;
    hnswResults: number;
    naiveResults: number;
  }> {
    // Benchmark HNSW
    const hnswStart = Date.now();
    let hnswResults = 0;
    for (let i = 0; i < iterations; i++) {
      const results = await this.similaritySearch(queryEmbedding, k);
      hnswResults = results.length;
    }
    const hnswAvgMs = (Date.now() - hnswStart) / iterations;

    // Benchmark naive
    const naiveStart = Date.now();
    let naiveResults = 0;
    for (let i = 0; i < iterations; i++) {
      const results = this.sqliteVectorstore.similaritySearch(
        queryEmbedding,
        k,
      );
      naiveResults = results.length;
    }
    const naiveAvgMs = (Date.now() - naiveStart) / iterations;

    return {
      hnswAvgMs: Math.round(hnswAvgMs * 100) / 100,
      naiveAvgMs: Math.round(naiveAvgMs * 100) / 100,
      speedup: Math.round((naiveAvgMs / hnswAvgMs) * 100) / 100,
      hnswResults,
      naiveResults,
    };
  }
}
