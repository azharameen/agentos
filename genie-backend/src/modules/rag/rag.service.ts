import { Injectable, Logger, Optional } from "@nestjs/common";
import { AzureOpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { BaseRetriever } from "@langchain/core/retrievers";
import { LongTermMemoryEntry } from "../../shared/agent.interface";
import { v4 as uuidv4 } from "uuid";
import { SqliteVectorstoreService } from "../memory/sqlite-vectorstore.service";

/**
 * Simple in-memory vector store entry
 */
interface VectorStoreEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
}

/**
 * RagService
 * Retrieval-Augmented Generation (RAG) service for context-aware AI responses.
 *
 * Responsibilities:
 * - Embedding generation using Azure OpenAI
 * - In-memory and SQLite vector store support
 * - Document storage, retrieval, and semantic search
 * - Provenance tracking and retriever interface for LangChain
 *
 * Usage:
 * Injected via NestJS DI. Use addDocuments to store, similaritySearch for retrieval, and query for API DTOs.
 */
@Injectable()
export class RagService {
  /**
   * Queries RAG knowledge base (DTO wrapper).
   * @param dto RagQueryDto containing query, topK, minScore, etc.
   * @returns Query result with provenance
   */
  async query(dto: import("../agent/dto/rag.dto").RagQueryDto) {
    // Use similaritySearchWithProvenance for best results
    const k = dto.topK ?? 3;
    const options = dto.minScore ? { minScore: dto.minScore } : undefined;
    const results = await this.similaritySearchWithProvenance(
      dto.query,
      k,
      options,
    );
    return { results };
  }
  /**
   * Lists all documents in the RAG store.
   * @returns Object with documents and count
   */
  listDocuments() {
    const docs = this.getAllDocuments();
    return { documents: docs, count: docs.length };
  }

  /**
   * Clears all documents from the RAG store.
   * @returns Success message
   */
  async clearDocuments() {
    await this.clearAll();
    return { message: "All documents cleared successfully" };
  }
  private readonly logger = new Logger(RagService.name);
  private embeddings: AzureOpenAIEmbeddings;
  private vectorStore: VectorStoreEntry[] = [];
  private documents: Map<string, LongTermMemoryEntry> = new Map();
  private useSqlite: boolean = false;
  private sqliteService?: SqliteVectorstoreService;

  constructor(@Optional() sqliteService?: SqliteVectorstoreService) {
    this.initializeEmbeddings();
    // Feature flag: USE_SQLITE_VECTORSTORE
    if (
      (process.env.USE_SQLITE_VECTORSTORE || "").toLowerCase() === "true" &&
      sqliteService
    ) {
      this.useSqlite = true;
      this.sqliteService = sqliteService;
      this.logger.log("RAG service configured to use SQLite vectorstore");
    }
  }

  /**
   * Initializes Azure OpenAI embeddings for RAG.
   * Throws error if credentials are missing.
   */
  private initializeEmbeddings(): void {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;

    if (!endpoint || !apiKey) {
      this.logger.error(
        "Azure OpenAI credentials not configured for RAG service",
      );
      throw new Error("Azure OpenAI credentials required for RAG");
    }

    try {
      this.embeddings = new AzureOpenAIEmbeddings({
        azureOpenAIApiKey: apiKey,
        azureOpenAIApiInstanceName: this.extractInstanceName(endpoint),
        azureOpenAIApiDeploymentName: "text-embedding-3-small-2-agentos",
        azureOpenAIApiVersion: "2024-02-01",
      });

      this.logger.log("RAG service initialized with Azure OpenAI embeddings");
    } catch (error: any) {
      this.logger.error(`Failed to initialize embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Adds documents to the vector store (in-memory or SQLite).
   * @param texts Array of document texts
   * @param metadata Optional array of metadata objects
   * @returns Array of document IDs
   */
  async addDocuments(
    texts: string[],
    metadata?: Record<string, any>[],
  ): Promise<string[]> {
    try {
      const ids: string[] = [];

      // Generate embeddings for all texts (batch if possible)
      const embeddings = await this.generateEmbeddings(texts);

      if (this.useSqlite && this.sqliteService) {
        const sqliteIds = this.sqliteService.addDocuments(
          texts,
          embeddings,
          metadata,
        );
        // Mirror into documents map
        sqliteIds.forEach((id, i) => {
          const entry: LongTermMemoryEntry = {
            id,
            content: texts[i],
            metadata: metadata?.[i] || {},
            embedding: embeddings[i],
            createdAt: new Date(),
          };
          this.documents.set(id, entry);
          ids.push(id);
        });
        this.logger.log(`Added ${ids.length} documents to SQLite vector store`);
        return ids;
      }

      for (let i = 0; i < texts.length; i++) {
        const id = uuidv4();
        const text = texts[i];
        const meta = metadata?.[i] || {};
        const embedding = embeddings[i];

        // Add to in-memory vector store
        this.vectorStore.push({
          id,
          content: text,
          embedding,
          metadata: meta,
        });

        // Store in memory map
        const entry: LongTermMemoryEntry = {
          id,
          content: text,
          metadata: meta,
          embedding,
          createdAt: new Date(),
        };
        this.documents.set(id, entry);
        ids.push(id);

        this.logger.debug(`Added document: ${id}`);
      }

      this.logger.log(
        `Added ${texts.length} documents to in-memory vector store`,
      );
      return ids;
    } catch (error: any) {
      this.logger.error(`Failed to add documents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Searches for similar documents using cosine similarity.
   * @param query Query string
   * @param k Number of top results to return (default 5)
   * @returns Array of Document objects
   */
  async similaritySearch(query: string, k: number = 5): Promise<Document[]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);
      if (this.useSqlite && this.sqliteService) {
        const hits = this.sqliteService.similaritySearch(queryEmbedding, k);
        return hits.map(
          (h) => new Document({ pageContent: h.content, metadata: h.metadata }),
        );
      }

      // Calculate cosine similarity for each document (in-memory fallback)
      const results = this.vectorStore
        .map((entry) => ({
          entry,
          score: this.cosineSimilarity(queryEmbedding, entry.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(
          ({ entry }) =>
            new Document({
              pageContent: entry.content,
              metadata: entry.metadata,
            }),
        );

      this.logger.log(
        `Found ${results.length} similar documents for query: "${query.substring(0, 50)}..."`,
      );
      return results;
    } catch (error: any) {
      this.logger.error(`Similarity search failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Searches with scores and provenance metadata.
   * Returns documents with enhanced metadata for traceability.
   * @param query Query string
   * @param k Number of top results to return (default 5)
   * @returns Array of [Document, score] tuples
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 5,
  ): Promise<[Document, number][]> {
    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddings.embedQuery(query);
      if (this.useSqlite && this.sqliteService) {
        const hits = this.sqliteService.similaritySearch(queryEmbedding, k);
        return hits.map(
          (h) =>
            [
              new Document({
                pageContent: h.content,
                metadata: {
                  ...h.metadata,
                  // RAG Provenance metadata
                  _rag_document_id: h.id,
                  _rag_similarity_score: h.score,
                  _rag_retrieved_at: new Date().toISOString(),
                  _rag_retrieval_query: query.substring(0, 100),
                },
              }),
              h.score,
            ] as [Document, number],
        );
      }

      // Calculate cosine similarity for each document (in-memory fallback)
      const results = this.vectorStore
        .map((entry) => ({
          entry,
          score: this.cosineSimilarity(queryEmbedding, entry.embedding),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k)
        .map(
          ({ entry, score }) =>
            [
              new Document({
                pageContent: entry.content,
                metadata: {
                  ...entry.metadata,
                  // RAG Provenance metadata
                  _rag_document_id: entry.id,
                  _rag_similarity_score: score,
                  _rag_retrieved_at: new Date().toISOString(),
                  _rag_retrieval_query: query.substring(0, 100),
                },
              }),
              score,
            ] as [Document, number],
        );

      this.logger.log(
        `Found ${results.length} similar documents with provenance for query: "${query.substring(0, 50)}..."`,
      );
      return results;
    } catch (error: any) {
      this.logger.error(
        `Similarity search with score failed: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Searches with full provenance details (enhanced version).
   * Returns documents with extended metadata including source tracking.
   * @param query Query string
   * @param k Number of top results to return (default 5)
   * @param options Provenance options (includeScores, minScore, etc.)
   * @returns Array of provenance result objects
   */
  async similaritySearchWithProvenance(
    query: string,
    k: number = 5,
    options?: {
      includeScores?: boolean;
      includeEmbeddings?: boolean;
      minScore?: number;
    },
  ): Promise<
    Array<{
      document: Document;
      score: number;
      provenance: {
        documentId: string;
        retrievedAt: string;
        query: string;
        rank: number;
        chunkIndex?: number;
        source?: string;
        timestamp?: string;
      };
    }>
  > {
    try {
      const resultsWithScore = await this.similaritySearchWithScore(query, k);

      // Filter by minimum score if specified
      const filtered = options?.minScore
        ? resultsWithScore.filter(([, score]) => score >= options.minScore!)
        : resultsWithScore;

      // Map to provenance format
      const withProvenance = filtered.map(([doc, score], index) => ({
        document: doc,
        score,
        provenance: {
          documentId: doc.metadata._rag_document_id || "unknown",
          retrievedAt:
            doc.metadata._rag_retrieved_at || new Date().toISOString(),
          query: doc.metadata._rag_retrieval_query || query,
          rank: index + 1,
          chunkIndex: doc.metadata.chunk_index,
          source: doc.metadata.source,
          timestamp: doc.metadata.timestamp,
        },
      }));

      this.logger.log(
        `Found ${withProvenance.length} documents with full provenance for query: "${query.substring(0, 50)}..."`,
      );
      return withProvenance;
    } catch (error: any) {
      this.logger.error(
        `Similarity search with score failed: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Calculates cosine similarity between two vectors.
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity score
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Vectors must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Gets document by ID.
   * @param id Document ID
   * @returns LongTermMemoryEntry or undefined
   */
  getDocument(id: string): LongTermMemoryEntry | undefined {
    return this.documents.get(id);
  }

  /**
   * Gets all documents in the RAG store.
   * @returns Array of LongTermMemoryEntry
   */
  getAllDocuments(): LongTermMemoryEntry[] {
    return Array.from(this.documents.values());
  }

  /**
   * Deletes document by ID.
   * @param id Document ID
   * @returns True if deleted, false otherwise
   */
  async deleteDocument(id: string): Promise<boolean> {
    const deleted = this.documents.delete(id);
    if (this.useSqlite && this.sqliteService) {
      const s = this.sqliteService.deleteDocument(id);
      if (s) this.logger.log(`Deleted document from sqlite: ${id}`);
      return s;
    }

    if (deleted) {
      this.logger.log(`Deleted document: ${id}`);
    }
    return deleted;
  }

  /**
   * Clears all documents and resets vector store.
   */
  async clearAll(): Promise<void> {
    this.documents.clear();
    this.vectorStore = []; // Reset vector store
    if (this.useSqlite && this.sqliteService) {
      this.sqliteService.clearAll();
    }
    this.logger.log("Cleared all documents and reset vector store");
  }

  /**
   * Gets statistics for RAG store (total documents, vector store status).
   * @returns Stats object
   */
  getStats(): {
    totalDocuments: number;
    vectorStoreInitialized: boolean;
  } {
    return {
      totalDocuments: this.documents.size,
      vectorStoreInitialized: this.vectorStore.length > 0,
    };
  }

  /**
   * Extracts instance name from Azure OpenAI endpoint URL.
   * @param endpoint Endpoint URL
   * @returns Instance name string
   */
  private extractInstanceName(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      return url.hostname.split(".")[0];
    } catch {
      this.logger.error(
        `Failed to extract instance name from endpoint: ${endpoint}`,
      );
      throw new Error("Invalid Azure OpenAI endpoint format");
    }
  }

  /**
   * Generates embedding for a single text (utility method).
   * @param text Text to embed
   * @returns Embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const embedding = await this.embeddings.embedQuery(text);
      return embedding;
    } catch (error: any) {
      this.logger.error(`Failed to generate embedding: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates embeddings for multiple texts.
   * @param texts Array of texts to embed
   * @returns Array of embedding vectors
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      const embeddings = await this.embeddings.embedDocuments(texts);
      return embeddings;
    } catch (error: any) {
      this.logger.error(`Failed to generate embeddings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Creates a LangChain-compatible retriever.
   * Returns a retriever that can be used in chains and agents.
   * @param options Retriever options (k)
   * @returns BaseRetriever instance
   */
  asRetriever(options?: { k?: number }): BaseRetriever {
    const k = options?.k || 5;
    const self = this;

    class RagRetriever extends BaseRetriever {
      lc_namespace = ["rag", "retriever"];
      k: number;

      constructor() {
        super();
        this.k = k;
      }

      async _getRelevantDocuments(query: string): Promise<Document[]> {
        return self.similaritySearch(query, this.k);
      }
    }

    return new RagRetriever();
  }
}
