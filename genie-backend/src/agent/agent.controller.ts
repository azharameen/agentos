import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Delete,
  Sse,
  MessageEvent,
  Query,
} from "@nestjs/common";
import { AgentExecutionResult } from "../shared/agent.interface";
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiQuery,
} from "@nestjs/swagger";
import { Observable } from "rxjs";
import { AgentService } from "./agent.service";
import { AgentQueryDto } from "./agent-query.dto";
import { AgentOrchestratorService } from "./services/agent-orchestrator.service";
import { AgenticTaskDto, AgenticResponseDto } from "./dto/agentic-task.dto";
import { RagService } from "./services/rag.service";
import {
  AddDocumentsDto,
  AddDocumentsResponseDto,
  RagQueryDto,
  RagQueryResponseDto,
  RagStatsDto,
  DocumentListDto,
} from "./dto/rag.dto";
import { v4 as uuidv4 } from "uuid";
import { AzureOpenAIAdapter } from "./services/azure-openai-adapter.service";
import { AgentMemoryService } from "./services/agent-memory.service";
import { ContentSafetyService } from "./services/content-safety.service";
import { CopilotKitEventType } from "../shared/copilotkit-events.enum";
import { MultiAgentCoordinatorService } from "./services/multi-agent-coordinator.service";
import { MultiAgentExecutionDto } from "./dto/multi-agent.dto";
import { WorkflowVersioningService } from "./services/workflow-versioning.service";
import {
  CreateWorkflowVersionDto,
  PruneSnapshotsDto,
} from "./dto/workflow-versioning.dto";

@ApiTags("Agent")
@Controller("agent")
export class AgentController {
  /**
   * Helper to emit CopilotKit-compliant SSE event with runtime validation
   */
  private emitCopilotKitEvent(
    subscriber: any,
    type: CopilotKitEventType,
    data: any,
  ) {
    // Emit CopilotKit event in { type, data } format, no strict validation
    (subscriber as { next: (event: { data: string }) => void }).next({
      data: JSON.stringify({ type, data }),
    });
  }
  constructor(
    private readonly agentService: AgentService,
    private readonly orchestrator: AgentOrchestratorService,
    private readonly ragService: RagService,
    private readonly azureAdapter: AzureOpenAIAdapter,
    private readonly memoryService: AgentMemoryService,
    private readonly contentSafety: ContentSafetyService,
    private readonly multiAgentCoordinator: MultiAgentCoordinatorService,
    private readonly workflowVersioning: WorkflowVersioningService,
  ) { }

  @Post("query")
  @ApiOperation({
    summary: "Query the AI agent with a prompt and model (legacy endpoint).",
    description:
      "⚠️ DEPRECATED: Use POST /agent/execute instead for full agentic capabilities including tool use, RAG, and workflows.",
    deprecated: true,
  })
  @ApiBody({ type: AgentQueryDto })
  @ApiResponse({ status: 200, description: "Agent response." })
  async queryAgent(@Body() dto: AgentQueryDto) {
    return this.agentService.queryAgent(dto);
  }

  @Post("execute")
  @ApiOperation({
    summary:
      "Unified endpoint for all agentic tasks (single-agent, multi-agent, streaming)",
    description:
      "This unified endpoint supports all agentic capabilities:\n" +
      "- Single-agent autonomous task execution with tool use and planning\n" +
      "- Multi-agent collaboration with various coordination modes\n" +
      "- Streaming (SSE) for real-time updates\n" +
      "- RAG for context-aware responses\n\n" +
      "**Mode Selection:**\n" +
      "- `stream: false` (default) → Returns final result as JSON\n" +
      "- `stream: true` → Returns SSE stream with real-time updates\n" +
      "- `multiAgent: false` (default) → Single-agent execution\n" +
      "- `multiAgent: true` → Multi-agent collaboration (requires 'agents' and 'mode')\n\n" +
      "**Parameters:**\n" +
      "- prompt (string, required): The user prompt or task\n" +
      "- stream (boolean, optional): Enable streaming mode (default: false)\n" +
      "- multiAgent (boolean, optional): Enable multi-agent mode (default: false)\n" +
      "- agents (array, optional): Agent roles for multi-agent execution\n" +
      "- mode (enum, optional): Collaboration mode (sequential|parallel|debate|router)\n" +
      "- sessionId (string, optional): Session ID for conversation context\n" +
      "- model (string, optional): Model to use\n" +
      "- temperature (number, optional): LLM temperature (0.0-1.0)\n" +
      "- maxIterations (number, optional): Max agent steps\n" +
      "- maxRounds (number, optional): Max collaboration rounds (multi-agent)\n" +
      "- enabledToolCategories (array, optional): Tool categories to enable\n" +
      "- specificTools (array, optional): Specific tools to use\n" +
      "- simpleMode (boolean, optional): Direct LLM call without orchestration\n" +
      "- useGraph (boolean, optional): Use LangGraph workflow\n" +
      "- enableRAG (boolean, optional): Enable RAG context\n\n" +
      "**Example - Single-Agent Sync:**\n" +
      '{\n  "prompt": "Calculate 25 * 4",\n  "stream": false\n}\n\n' +
      "**Example - Single-Agent Streaming:**\n" +
      '{\n  "prompt": "Summarize this document",\n  "stream": true\n}\n\n' +
      "**Example - Multi-Agent Parallel:**\n" +
      '{\n  "prompt": "Analyze this problem",\n  "multiAgent": true,\n  "mode": "parallel",\n  "agents": [{"id": "expert1", "name": "Math Expert", ...}]\n}',
  })
  @ApiBody({ type: AgenticTaskDto })
  @ApiResponse({
    status: 200,
    description:
      "Agentic task execution result (sync mode) or SSE stream (streaming mode).",
    schema: {
      oneOf: [
        {
          description: "Sync response (stream: false)",
          example: {
            output: "The result is 100",
            model: "gpt-4",
            sessionId: "session-123",
            toolsUsed: ["calculator"],
            intermediateSteps: [],
          },
        },
        {
          description: "SSE event (stream: true)",
          example: {
            type: "TEXT_MESSAGE_CONTENT",
            data: { messageId: "msg-1", delta: "Hello", content: "Hello" },
          },
        },
      ],
    },
  })
  executeAgenticTask(
    @Body() dto: AgenticTaskDto,
  ): Promise<AgenticResponseDto> | Observable<MessageEvent> {
    console.log("[AgentController] /agent/execute called with payload:", dto);

    // Validate required parameters
    if (!dto.prompt || typeof dto.prompt !== "string" || dto.prompt.trim().length === 0) {
      // Return 400 Bad Request for missing prompt
      const error: any = new Error("Missing required parameter: prompt");
      error.status = 400;
      throw error;
    }

    // Route to streaming if requested
    if (dto.stream) {
      return this.executeAgenticTaskStream(dto);
    }

    // Route to multi-agent if requested
    if (dto.multiAgent) {
      return this.executeMultiAgentTask(dto);
    }

    // Single-agent sync execution
    return this.executeSingleAgentTask(dto);
  }

  /**
   * Single-agent synchronous execution (internal)
   */
  private async executeSingleAgentTask(
    dto: AgenticTaskDto,
  ): Promise<AgenticResponseDto> {
    const sessionId = dto.sessionId || `session-${uuidv4()}`;

    let result: AgentExecutionResult;
    try {
      result = dto.simpleMode
        ? await this.orchestrator.executeSimpleQuery(dto.prompt, sessionId, {
          model: dto.model,
          temperature: dto.temperature,
          enabledToolCategories: dto.enabledToolCategories,
          specificTools: dto.specificTools,
        })
        : await this.orchestrator.executeTask(dto.prompt, sessionId, {
          model: dto.model,
          temperature: dto.temperature,
          maxIterations: dto.maxIterations,
          enabledToolCategories: dto.enabledToolCategories,
          specificTools: dto.specificTools,
          useGraph: dto.useGraph,
          enableRAG: dto.enableRAG,
        });
      console.log("[AgentController] Single-agent task completed:", result);
    } catch (err) {
      console.error("[AgentController] Single-agent task error:", err);
      throw err;
    }

    return {
      output: result.output,
      model: result.model,
      sessionId: result.sessionId,
      toolsUsed: result.toolsUsed,
      intermediateSteps: result.intermediateSteps,
    };
  }

  /**
   * Multi-agent synchronous execution (internal)
   */
  private async executeMultiAgentTask(
    dto: AgenticTaskDto,
  ): Promise<AgenticResponseDto> {
    if (!dto.agents || dto.agents.length === 0) {
      throw new Error("Multi-agent mode requires 'agents' parameter");
    }
    if (!dto.mode) {
      throw new Error("Multi-agent mode requires 'mode' parameter");
    }

    const sessionId = dto.sessionId || `session-${uuidv4()}`;

    try {
      const result = await this.multiAgentCoordinator.execute({
        prompt: dto.prompt,
        agents: dto.agents,
        mode: dto.mode,
        sessionId,
        model: dto.model,
        temperature: dto.temperature,
        maxRounds: dto.maxRounds,
      });

      console.log("[AgentController] Multi-agent task completed:", result);
      return result as any; // MultiAgentCoordinator returns compatible format
    } catch (err) {
      console.error("[AgentController] Multi-agent task error:", err);
      throw err;
    }
  }

  /**
   * Streaming execution (internal)
   */
  private executeAgenticTaskStream(
    dto: AgenticTaskDto,
  ): Observable<MessageEvent> {
    console.log("[AgentController] Streaming mode enabled");

    return new Observable((subscriber) => {
      const abortController = new AbortController();
      const signal = abortController.signal;

      const cleanup = () => {
        console.log("[AgentController] Stream cancelled");
        abortController.abort();
      };

      (async () => {
        try {
          const sessionId = dto.sessionId || `session-${uuidv4()}`;

          // Multi-agent streaming not yet supported
          if (dto.multiAgent) {
            subscriber.error(
              new Error(
                "Streaming mode not yet supported for multi-agent execution",
              ),
            );
            return;
          }

          const stream = await this.orchestrator.executeTaskStream(
            dto.prompt,
            sessionId,
            {
              model: dto.model,
              temperature: dto.temperature,
              maxIterations: dto.maxIterations,
              enabledToolCategories: dto.enabledToolCategories,
              specificTools: dto.specificTools,
              useGraph: dto.useGraph,
              enableRAG: dto.enableRAG,
              signal,
            },
          );

          for await (const chunk of stream) {
            if (signal.aborted) {
              console.log("[AgentController] Stream aborted");
              break;
            }

            if (
              chunk?.type &&
              chunk?.data &&
              Object.values(CopilotKitEventType).includes(chunk.type)
            ) {
              this.emitCopilotKitEvent(
                subscriber,
                chunk.type as CopilotKitEventType,
                chunk.data,
              );
            }
          }

          subscriber.complete();
        } catch (err) {
          if (err.name === "AbortError" || signal.aborted) {
            console.log("[AgentController] Stream cancelled by client");
            subscriber.complete();
          } else {
            console.error("[AgentController] Stream error:", err);
            subscriber.error(err);
          }
        }
      })();

      return cleanup;
    });
  }

  @Post("multi-execute")
  @ApiOperation({
    summary:
      "Execute a multi-agent task with role-based collaboration (DEPRECATED)",
    description:
      "⚠️ **DEPRECATED**: Use `POST /agent/execute` with `multiAgent: true` instead.\n\n" +
      "**Migration:**\n" +
      "```json\n" +
      '{\n  "prompt": "Your task",\n  "multiAgent": true,\n  "mode": "parallel",\n  "agents": [...]\n' +
      "}\n" +
      "```\n\n" +
      "This endpoint will be removed in a future version. Please migrate to the unified `/agent/execute` endpoint.",
    deprecated: true,
  })
  @ApiBody({ type: MultiAgentExecutionDto })
  @ApiResponse({
    status: 200,
    description: "Multi-agent execution result",
    schema: {
      example: {
        output: "AI research summary...",
        agents: [
          {
            id: "math-expert",
            name: "Math Expert",
            description: "Handles all math questions",
            toolCategories: ["math"],
            specificTools: ["calculator"],
            systemPrompt: "You are a math expert.",
          },
          {
            id: "science-expert",
            name: "Science Expert",
            description: "Handles all science questions",
            toolCategories: ["science"],
            specificTools: ["encyclopedia"],
            systemPrompt: "You are a science expert.",
          },
        ],
        collaborationMode: "parallel",
        sessionId: "session-456-def",
      },
    },
  })
  async executeMultiAgent(@Body() dto: MultiAgentExecutionDto) {
    return this.multiAgentCoordinator.execute({
      prompt: dto.prompt,
      agents: dto.agents,
      mode: dto.mode,
      sessionId: dto.sessionId,
      model: dto.model,
      temperature: dto.temperature,
      maxRounds: dto.maxRounds,
    });
  }

  @Get("models")
  @ApiOperation({
    summary: "Get available AI models",
    description:
      'Returns a list of all available AI models for agent execution.\n\nResponse:\n- models (array): List of model names.\n\nExample response:\n{\n  "models": ["gpt-4", "gpt-3.5-turbo"]\n}',
  })
  @ApiResponse({
    status: 200,
    description: "List of available models.",
    schema: {
      example: {
        models: ["gpt-4", "gpt-3.5-turbo"],
      },
    },
  })
  getAvailableModels() {
    return {
      models: this.orchestrator.getAvailableModels(),
    };
  }

  @Sse("stream")
  @ApiOperation({
    summary: "Stream agent execution with real-time updates (DEPRECATED)",
    description:
      "⚠️ **DEPRECATED**: Use `POST /agent/execute` with `stream: true` instead.\n\n" +
      "**Migration:**\n" +
      "```json\n" +
      'POST /agent/execute\n{\n  "prompt": "Your task",\n  "stream": true\n' +
      "}\n" +
      "```\n\n" +
      "This endpoint will be removed in a future version. Please migrate to the unified `/agent/execute` endpoint.",
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description:
      "SSE stream of CopilotKit agent events. Each event is an object with 'type' and 'data'. Example: { type: 'TEXT_MESSAGE_CONTENT', data: { messageId, delta, content, metadata } }",
    schema: {
      example: {
        type: "TEXT_MESSAGE_CONTENT",
        data: {
          messageId: "session-123-msg-1",
          delta: "Hello",
          content: "Hello",
          metadata: {},
        },
      },
    },
  })
  @ApiQuery({
    name: "prompt",
    type: String,
    required: true,
    description: "The user prompt to execute.",
  })
  @ApiQuery({
    name: "sessionId",
    type: String,
    required: false,
    description: "Session identifier (optional).",
  })
  @ApiQuery({
    name: "model",
    type: String,
    required: false,
    description: "Model to use (optional).",
  })
  @ApiQuery({
    name: "temperature",
    type: Number,
    required: false,
    description: "LLM temperature (optional).",
  })
  @ApiQuery({
    name: "maxIterations",
    type: Number,
    required: false,
    description: "Maximum agent steps (optional).",
  })
  @ApiQuery({
    name: "enabledToolCategories",
    type: String,
    required: false,
    description: "Comma-separated tool categories (optional).",
  })
  @ApiQuery({
    name: "specificTools",
    type: String,
    required: false,
    description: "Comma-separated tool names (optional).",
  })
  @ApiQuery({
    name: "useGraph",
    type: Boolean,
    required: false,
    description: "Use LangGraph workflow (optional).",
  })
  @ApiQuery({
    name: "enableRAG",
    type: Boolean,
    required: false,
    description: "Enable RAG context (optional).",
  })
  streamAgenticTask(@Query() query: AgentQueryDto): Observable<MessageEvent> {
    console.log("[AgentController] /agent/stream called with query:", query);

    // Validate required parameters
    if (!query.prompt || query.prompt.trim().length === 0) {
      return new Observable((subscriber) => {
        subscriber.error({
          status: 400,
          message: "Missing required parameter: prompt",
        });
      });
    }

    return new Observable((subscriber) => {
      const abortController = new AbortController();
      const signal = abortController.signal;

      // Cleanup on unsubscribe/disconnect
      const cleanup = () => {
        console.log("[AgentController] Stream cancelled, aborting execution");
        abortController.abort();
      };

      (async () => {
        try {
          const sessionId =
            query.sessionId && typeof query.sessionId === "string"
              ? query.sessionId
              : `session-${uuidv4()}`;

          // Stream agent execution with cancellation support
          const stream = await this.orchestrator.executeTaskStream(
            query.prompt,
            sessionId,
            {
              model: query.model,
              temperature: (query as any).temperature
                ? Number((query as any).temperature)
                : 0.7,
              maxIterations: (query as any).maxIterations
                ? Number((query as any).maxIterations)
                : 10,
              enabledToolCategories: (query as any).enabledToolCategories,
              specificTools: (query as any).specificTools,
              useGraph: (query as any).useGraph === "true",
              enableRAG: (query as any).enableRAG === "true",
              signal, // Pass AbortSignal to orchestrator
            },
          );

          // Emit CopilotKit-compliant SSE events
          for await (const chunk of stream) {
            // Check if cancelled
            if (signal.aborted) {
              console.log("[AgentController] Stream aborted, breaking loop");
              break;
            }

            if (
              chunk?.type &&
              chunk?.data &&
              Object.values(CopilotKitEventType).includes(chunk.type)
            ) {
              this.emitCopilotKitEvent(
                subscriber,
                chunk.type as CopilotKitEventType,
                chunk.data,
              );
            } else if (
              chunk &&
              chunk.type &&
              !Object.values(CopilotKitEventType).includes(chunk.type)
            ) {
              this.emitCopilotKitEvent(
                subscriber,
                CopilotKitEventType.RUN_ERROR,
                { message: `Invalid event type: ${chunk.type}` },
              );
            }
          }

          subscriber.complete();
        } catch (err) {
          if (err.name === "AbortError" || signal.aborted) {
            console.log("[AgentController] Stream cancelled by client");
            subscriber.complete();
          } else {
            console.error("[AgentController] /agent/stream error:", err);
            subscriber.error(err);
          }
        }
      })();

      // Return cleanup function for Observable teardown
      return cleanup;
    });
  }

  @Get("tools/categories")
  @ApiOperation({ summary: "Get available tool categories" })
  @ApiResponse({ status: 200, description: "List of tool categories." })
  getToolCategories() {
    return {
      categories: this.orchestrator.getAvailableToolCategories(),
    };
  }

  @Get("session/:sessionId/stats")
  @ApiOperation({ summary: "Get session statistics" })
  @ApiResponse({ status: 200, description: "Session statistics." })
  getSessionStats(@Param("sessionId") sessionId: string) {
    return this.orchestrator.getSessionStats(sessionId);
  }

  // ========== RAG Endpoints ==========

  @Post("rag/documents")
  @ApiOperation({
    summary: "Add documents to the RAG knowledge base",
    description:
      'Upload text documents to the RAG vector store for semantic search and context-aware responses.\n\nParameters:\n- documents (string[]): Array of text documents to add.\n- metadata (array, optional): Optional metadata for each document.\n\nExample request body:\n{\n  "documents": ["Doc 1 text", "Doc 2 text"],\n  "metadata": [{"source": "docs"}, {"source": "manual"}]\n}\n\nExample response:\n{\n  "documentIds": ["doc-uuid-1", "doc-uuid-2"],\n  "count": 2\n}',
  })
  @ApiBody({ type: AddDocumentsDto })
  @ApiResponse({
    status: 200,
    description: "Documents added successfully.",
    schema: {
      example: {
        documentIds: ["doc-uuid-1", "doc-uuid-2"],
        count: 2,
      },
    },
    type: AddDocumentsResponseDto,
  })
  async addDocuments(
    @Body() dto: AddDocumentsDto,
  ): Promise<AddDocumentsResponseDto> {
    const documentIds = await this.ragService.addDocuments(
      dto.documents,
      dto.metadata,
    );

    return {
      documentIds: documentIds,
      count: documentIds.length,
    };
  }

  @Post("rag/query")
  @ApiOperation({
    summary: "Query the RAG system with context retrieval",
    description:
      'Perform a RAG-enhanced query that retrieves relevant context from the knowledge base before generating a response.\n\nParameters:\n- query (string): Query to search for.\n- sessionId (string, optional): Session ID.\n- topK (number, optional): Number of similar documents to retrieve.\n- model (string, optional): Model to use.\n- minScore (number, optional): Minimum similarity score threshold.\n\nExample request body:\n{\n  "query": "What is LangChain?",\n  "topK": 3,\n  "model": "gpt-4",\n  "minScore": 0.7\n}\n\nExample response:\n{\n  "answer": "LangChain is a framework...",\n  "retrievedDocuments": [{"content": "...", "metadata": {}}],\n  "sessionId": "session-123-abc",\n  "model": "gpt-4"\n}',
  })
  @ApiBody({ type: RagQueryDto })
  @ApiResponse({
    status: 200,
    description: "RAG query result with retrieved context.",
    schema: {
      example: {
        answer: "LangChain is a framework...",
        retrievedDocuments: [
          {
            content: "LangChain is a framework...",
            metadata: { source: "docs" },
          },
        ],
        sessionId: "session-123-abc",
        model: "gpt-4",
      },
    },
    type: RagQueryResponseDto,
  })
  async ragQuery(@Body() dto: RagQueryDto): Promise<RagQueryResponseDto> {
    const sessionId = dto.sessionId || `session-${uuidv4()}`;
    const topK = dto.topK || 3;

    // Retrieve relevant documents with provenance
    const retrievedWithProvenance =
      await this.ragService.similaritySearchWithProvenance(dto.query, topK, {
        minScore: dto.minScore || 0.7,
      });

    // Build context from retrieved documents with provenance metadata
    const context = retrievedWithProvenance
      .map(
        ({ document, score, provenance }, i) =>
          `[${i + 1}] (score: ${score.toFixed(3)}, doc: ${provenance.documentId.substring(0, 8)}...)\n${document.pageContent}`,
      )
      .join("\n\n");

    // Get LLM
    const llm = this.azureAdapter.getLLM(dto.model);

    // Get conversation history
    const history = this.memoryService.getRecentHistory(sessionId, 5);

    // Build prompt with context
    const prompt = `Context from knowledge base:\n${context}\n\nUser question: ${dto.query}\n\nPlease answer based on the context provided.`;

    // Generate response
    const messages = [...history, { role: "user", content: prompt }];
    const response = await llm.invoke(messages as any);

    // Update memory
    this.memoryService.addMessage(sessionId, "human", dto.query);
    this.memoryService.addMessage(sessionId, "ai", response.content as string);

    return {
      answer: response.content as string,
      retrievedDocuments: retrievedWithProvenance.map(
        ({ document, score, provenance }) => ({
          content: document.pageContent,
          metadata: document.metadata,
          score,
          provenance,
        }),
      ),
      sessionId: sessionId,
      model: dto.model || "gpt-4",
    };
  }

  @Post("rag/query-with-provenance")
  @ApiOperation({
    summary: "Query RAG with full provenance tracking",
    description:
      'Enhanced RAG query that returns full provenance metadata for retrieved documents including document IDs, similarity scores, retrieval timestamps, and source tracking.\n\nParameters:\n- query (string): Query to search for.\n- topK (number, optional): Number of similar documents to retrieve.\n- minScore (number, optional): Minimum similarity score threshold.\n\nExample request body:\n{\n  "query": "What is LangChain?",\n  "topK": 3,\n  "minScore": 0.7\n}\n\nExample response:\n{\n  "query": "What is LangChain?",\n  "results": [{"content": "...", "score": 0.9, "provenance": {"documentId": "doc-uuid-1"}}],\n  "count": 1,\n  "parameters": {"topK": 3, "minScore": 0.7}\n}',
  })
  @ApiBody({ type: RagQueryDto })
  @ApiResponse({
    status: 200,
    description: "RAG query result with full provenance details.",
    schema: {
      example: {
        query: "What is LangChain?",
        results: [
          {
            content: "LangChain is a framework...",
            score: 0.9,
            provenance: {
              documentId: "doc-uuid-1",
              metadata: { source: "docs" },
            },
          },
        ],
        count: 1,
        parameters: { topK: 3, minScore: 0.7 },
      },
    },
  })
  async ragQueryWithProvenance(@Body() dto: RagQueryDto): Promise<any> {
    const topK = dto.topK || 3;
    const minScore = dto.minScore || 0.7;

    // Retrieve with full provenance
    const results = await this.ragService.similaritySearchWithProvenance(
      dto.query,
      topK,
      { minScore },
    );

    return {
      query: dto.query,
      results: results.map(({ document, score, provenance }) => ({
        content: document.pageContent,
        score,
        provenance: {
          ...provenance,
          metadata: document.metadata,
        },
      })),
      count: results.length,
      parameters: {
        topK,
        minScore,
      },
    };
  }

  @Get("rag/documents")
  @ApiOperation({
    summary: "List all documents in the RAG knowledge base",
    description:
      'Retrieve all documents stored in the RAG vector store.\n\nResponse:\n- documents (array): List of all documents.\n- count (number): Total count.\n\nExample response:\n{\n  "documents": [{"id": "doc-uuid-1", "content": "...", "metadata": {}}],\n  "count": 1\n}',
  })
  @ApiResponse({
    status: 200,
    description: "List of all documents.",
    schema: {
      example: {
        documents: [
          {
            id: "doc-uuid-1",
            content: "LangChain is a framework...",
            metadata: { source: "docs" },
            createdAt: "2024-05-01T12:00:00Z",
          },
        ],
        count: 1,
      },
    },
    type: DocumentListDto,
  })
  async listDocuments(): Promise<DocumentListDto> {
    const documents = this.ragService.getAllDocuments();

    return {
      documents: documents,
      count: documents.length,
    };
  }

  @Get("rag/stats")
  @ApiOperation({
    summary: "Get RAG system statistics",
    description:
      'Retrieve statistics about the RAG system, including document count and store status.\n\nResponse:\n- totalDocuments (number): Total number of documents.\n- vectorStoreInitialized (boolean): Whether the vector store is initialized.\n\nExample response:\n{\n  "totalDocuments": 42,\n  "vectorStoreInitialized": true\n}',
  })
  @ApiResponse({
    status: 200,
    description: "RAG system statistics.",
    schema: {
      example: {
        totalDocuments: 42,
        vectorStoreInitialized: true,
      },
    },
    type: RagStatsDto,
  })
  async getRagStats(): Promise<RagStatsDto> {
    return this.ragService.getStats();
  }

  @Delete("rag/documents")
  @ApiOperation({
    summary: "Clear all documents from the RAG knowledge base",
    description:
      'Remove all documents from the RAG vector store.\n\nResponse:\n- message (string): Confirmation message.\n\nExample response:\n{\n  "message": "All documents cleared successfully"\n}',
  })
  @ApiResponse({
    status: 200,
    description: "All documents cleared.",
    schema: {
      example: {
        message: "All documents cleared successfully",
      },
    },
  })
  async clearDocuments() {
    await this.ragService.clearAll();
    return {
      message: "All documents cleared successfully",
    };
  }

  // ==================== Memory Management Endpoints ====================

  @Get("memory/analytics")
  @ApiOperation({
    summary: "Get detailed memory analytics",
    description:
      "Retrieve comprehensive analytics about memory usage, including session statistics, long-term memory stats, and system health indicators.",
  })
  @ApiResponse({
    status: 200,
    description: "Memory analytics.",
  })
  getMemoryAnalytics() {
    return this.memoryService.getMemoryAnalytics();
  }

  @Get("memory/export")
  @ApiOperation({
    summary: "Export all memory data (backup)",
    description:
      "Export all session memory and long-term memory to JSON format for backup or transfer.",
  })
  @ApiResponse({
    status: 200,
    description: "Memory data exported successfully.",
  })
  exportMemory() {
    return this.memoryService.exportMemory();
  }

  @Post("memory/import")
  @ApiOperation({
    summary: "Import memory data (restore from backup)",
    description:
      "Import session memory and long-term memory from JSON backup. Returns statistics about imported data and any errors encountered.",
  })
  @ApiBody({
    description: "Memory backup data",
    schema: {
      type: "object",
      properties: {
        sessions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sessionId: { type: "string" },
              conversationHistory: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    content: { type: "string" },
                    additionalKwargs: { type: "object" },
                  },
                },
              },
              context: { type: "object" },
              createdAt: { type: "string" },
              lastAccessedAt: { type: "string" },
            },
          },
        },
        longTermMemory: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              content: { type: "string" },
              metadata: { type: "object" },
              embedding: { type: "array", items: { type: "number" } },
              createdAt: { type: "string" },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Memory data imported successfully.",
  })
  importMemory(@Body() data: any) {
    return this.memoryService.importMemory(data);
  }

  @Post("memory/prune")
  @ApiOperation({
    summary: "Prune memory based on strategy",
    description:
      "Remove old or excess memory entries based on specified pruning strategy. Useful for managing memory usage in production.",
  })
  @ApiBody({
    description: "Pruning strategy configuration",
    schema: {
      type: "object",
      properties: {
        maxSessions: {
          type: "number",
          description: "Maximum number of sessions to keep (oldest removed)",
        },
        maxMessagesPerSession: {
          type: "number",
          description: "Maximum messages per session (oldest removed)",
        },
        maxLongTermEntries: {
          type: "number",
          description: "Maximum long-term memory entries (oldest removed)",
        },
        keepRecentDays: {
          type: "number",
          description: "Only keep sessions accessed within N days",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Memory pruned successfully.",
  })
  pruneMemory(
    @Body()
    strategy: {
      maxSessions?: number;
      maxMessagesPerSession?: number;
      maxLongTermEntries?: number;
      keepRecentDays?: number;
    },
  ) {
    return this.memoryService.pruneMemory(strategy);
  }

  @Delete("memory/session/:sessionId")
  @ApiOperation({
    summary: "Clear a specific session",
    description:
      "Delete all conversation history and context for a specific session.",
  })
  @ApiResponse({
    status: 200,
    description: "Session cleared successfully.",
  })
  clearSession(@Param("sessionId") sessionId: string) {
    this.memoryService.clearSession(sessionId);
    return {
      message: `Session ${sessionId} cleared successfully`,
    };
  }

  @Get("memory/sessions")
  @ApiOperation({
    summary: "List all active sessions",
    description: "Get a list of all active session IDs in memory.",
  })
  @ApiResponse({
    status: 200,
    description: "List of active sessions.",
  })
  listSessions() {
    return {
      sessions: this.memoryService.getAllSessions(),
      count: this.memoryService.getAllSessions().length,
    };
  }

  // ==================== Content Safety Endpoints ====================

  @Get("content-safety/status")
  @ApiOperation({
    summary: "Get content safety configuration and status",
    description:
      "Returns whether content safety filtering is enabled and the configured thresholds for each category.",
  })
  @ApiResponse({
    status: 200,
    description: "Content safety status and configuration.",
  })
  getContentSafetyStatus() {
    return this.contentSafety.getConfig();
  }

  @Post("content-safety/analyze")
  @ApiOperation({
    summary: "Analyze text for content safety violations",
    description:
      "Test content safety filtering on provided text. Returns safety result with any violations detected.",
  })
  @ApiBody({
    description: "Text to analyze",
    schema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text content to analyze for safety violations",
        },
      },
      required: ["text"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Content safety analysis result.",
  })
  async analyzeContent(@Body() body: { text: string }) {
    return this.contentSafety.analyzeText(body.text);
  }

  @Post("workflows/versions")
  @ApiOperation({
    summary: "Create a new workflow version",
    description:
      "Store a workflow configuration with version history for debugging and rollback.",
  })
  @ApiBody({ type: CreateWorkflowVersionDto })
  @ApiResponse({ status: 201, description: "Workflow version created." })
  async createWorkflowVersion(@Body() dto: CreateWorkflowVersionDto) {
    return this.workflowVersioning.createVersion(
      dto.name,
      dto.description,
      {
        model: dto.model,
        temperature: dto.temperature,
        maxIterations: dto.maxIterations,
        enabledToolCategories: dto.enabledToolCategories,
        specificTools: dto.specificTools,
        useGraph: dto.useGraph,
        enableRAG: dto.enableRAG,
      },
      dto.metadata,
    );
  }

  @Get("workflows")
  @ApiOperation({ summary: "List all workflow names" })
  @ApiResponse({ status: 200, description: "List of workflow names." })
  async listWorkflows() {
    const workflows = await this.workflowVersioning.listWorkflows();
    return { workflows };
  }

  @Get("workflows/:name/versions")
  @ApiOperation({ summary: "Get all versions of a workflow" })
  @ApiResponse({ status: 200, description: "List of workflow versions." })
  async getWorkflowVersions(@Param("name") name: string) {
    return this.workflowVersioning.getVersions(name);
  }

  @Get("workflows/:name/versions/:version")
  @ApiOperation({ summary: "Get a specific workflow version" })
  @ApiResponse({ status: 200, description: "Workflow version details." })
  async getWorkflowVersion(
    @Param("name") name: string,
    @Param("version") version: string,
  ) {
    return this.workflowVersioning.getVersion(name, parseInt(version, 10));
  }

  @Get("workflows/:name/versions/latest")
  @ApiOperation({ summary: "Get the latest version of a workflow" })
  @ApiResponse({ status: 200, description: "Latest workflow version." })
  async getLatestWorkflowVersion(@Param("name") name: string) {
    return this.workflowVersioning.getLatestVersion(name);
  }

  @Get("workflows/:name/versions/:version/snapshots")
  @ApiOperation({ summary: "Get execution snapshots for a workflow version" })
  @ApiResponse({ status: 200, description: "List of execution snapshots." })
  async getVersionSnapshots(
    @Param("name") name: string,
    @Param("version") version: string,
  ) {
    const versionObj = await this.workflowVersioning.getVersion(
      name,
      parseInt(version, 10),
    );
    return this.workflowVersioning.getSnapshots(versionObj.id);
  }

  @Post("workflows/snapshots/prune")
  @ApiOperation({
    summary: "Prune old execution snapshots",
    description: "Delete snapshots older than specified number of days.",
  })
  @ApiBody({ type: PruneSnapshotsDto })
  @ApiResponse({ status: 200, description: "Number of snapshots pruned." })
  async pruneSnapshots(@Body() dto: PruneSnapshotsDto) {
    const prunedCount = await this.workflowVersioning.pruneSnapshots(
      dto.olderThanDays,
    );
    return { prunedCount };
  }

  @Get("workflows/:name/compare/:version1/:version2")
  @ApiOperation({ summary: "Compare two workflow versions" })
  @ApiResponse({
    status: 200,
    description: "Comparison of workflow versions with differences.",
  })
  async compareWorkflowVersions(
    @Param("name") name: string,
    @Param("version1") version1: string,
    @Param("version2") version2: string,
  ) {
    return this.workflowVersioning.compareVersions(
      name,
      parseInt(version1, 10),
      parseInt(version2, 10),
    );
  }
}
