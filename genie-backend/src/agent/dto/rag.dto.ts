import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsArray, IsOptional, IsNumber, Min } from "class-validator";

/**
 * DTO for adding documents to RAG store
 */
export class AddDocumentsDto {
  @ApiProperty({
    description: "Array of text documents to add to the RAG store",
    example: [
      "LangChain is a framework for developing applications powered by language models.",
      "LangGraph is a library for building stateful, multi-actor applications with LLMs.",
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  documents: string[];

  @ApiPropertyOptional({
    description:
      "Optional metadata for each document (must match documents array length)",
    example: [
      { source: "docs", category: "langchain" },
      { source: "docs", category: "langgraph" },
    ],
    type: "array",
  })
  @IsOptional()
  @IsArray()
  metadata?: Record<string, any>[];
}

/**
 * DTO for RAG query
 */
export class RagQueryDto {
  @ApiProperty({
    description: "Query to search for in the RAG knowledge base",
    example: "What is LangChain and how does it work?",
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    description: "Session ID for maintaining conversation context",
    example: "session-123-abc",
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: "Number of similar documents to retrieve (default: 3)",
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  topK?: number;

  @ApiPropertyOptional({
    description: "Model to use for response generation",
    example: "gpt-4",
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description:
      "Minimum similarity score threshold for retrieved documents (0.0-1.0, default: 0.7)",
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minScore?: number;
}

/**
 * Response DTO for adding documents
 */
export class AddDocumentsResponseDto {
  @ApiProperty({
    description: "IDs of the added documents",
    example: ["doc-uuid-1", "doc-uuid-2"],
    type: [String],
  })
  documentIds: string[];

  @ApiProperty({
    description: "Number of documents added",
    example: 2,
  })
  count: number;
}

/**
 * Response DTO for RAG query
 */
export class RagQueryResponseDto {
  @ApiProperty({
    description: "The agent's response based on retrieved context",
    example:
      "LangChain is a framework for developing applications powered by language models. It provides tools for chaining LLM calls, integrating external data sources, and building complex workflows.",
  })
  answer: string;

  @ApiProperty({
    description: "Retrieved documents used as context",
    example: [
      {
        content:
          "LangChain is a framework for developing applications powered by language models.",
        metadata: { source: "docs", category: "langchain" },
      },
    ],
    type: "array",
  })
  retrievedDocuments: Array<{
    content: string;
    metadata: Record<string, any>;
  }>;

  @ApiProperty({
    description: "Session ID",
    example: "session-123-abc",
  })
  sessionId: string;

  @ApiProperty({
    description: "Model used for generation",
    example: "gpt-4",
  })
  model: string;
}

/**
 * Response DTO for RAG stats
 */
export class RagStatsDto {
  @ApiProperty({
    description: "Total number of documents in the RAG store",
    example: 42,
  })
  totalDocuments: number;

  @ApiProperty({
    description: "Whether the vector store is initialized",
    example: true,
  })
  vectorStoreInitialized: boolean;
}

/**
 * Response DTO for document list
 */
export class DocumentListDto {
  @ApiProperty({
    description: "List of all documents in the RAG store",
    type: "array",
  })
  documents: Array<{
    id: string;
    content: string;
    metadata: Record<string, any>;
    createdAt: Date;
  }>;

  @ApiProperty({
    description: "Total count of documents",
    example: 42,
  })
  count: number;
}
