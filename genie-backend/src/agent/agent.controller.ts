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
import { CopilotKitEventType } from "../shared/copilotkit-events.enum";

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
    summary: "Execute an agentic task with autonomous tool use and planning",
    description:
      "This endpoint uses LangChain agents or LangGraph workflows to autonomously plan, execute tools, and reason through complex tasks. Supports RAG for context-aware responses.",
  })
  @ApiBody({ type: AgenticTaskDto })
  @ApiResponse({
    status: 200,
    description: "Agentic task execution result.",
    type: AgenticResponseDto,
  })
  async executeAgenticTask(
    @Body() dto: AgenticTaskDto,
  ): Promise<AgenticResponseDto> {
    // Debug: Log incoming payload
    console.log("[AgentController] /agent/execute called with payload:", dto);
    // Generate session ID if not provided
    const sessionId =
      dto.sessionId && typeof dto.sessionId === "string"
        ? dto.sessionId
        : `session-${uuidv4()}`;

    // Execute based on mode
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
      // Debug: Log outgoing response
      console.log("[AgentController] /agent/execute response:", result);
    } catch (err) {
      console.error("[AgentController] /agent/execute error:", err);
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
  @Get("models")
  @ApiOperation({ summary: "Get available AI models" })
  @ApiResponse({ status: 200, description: "List of available models." })
  getAvailableModels() {
    return {
      models: this.orchestrator.getAvailableModels(),
    };
  }

  @Sse("stream")
  @ApiOperation({
    summary: "Stream agent execution with real-time updates",
    description:
      "Server-Sent Events endpoint that streams agent execution progress, intermediate steps, and LLM tokens in real-time.\n\n" +
      "Required query parameters:\n" +
      "- prompt (string): The user prompt to execute.\n" +
      "Optional query parameters:\n" +
      "- sessionId (string): Session identifier.\n" +
      "- model (string): Model to use.\n" +
      "- temperature (number): LLM temperature.\n" +
      "- maxIterations (number): Max agent steps.\n" +
      "- enabledToolCategories (string): Comma-separated tool categories.\n" +
      "- specificTools (string): Comma-separated tool names.\n" +
      "- useGraph (boolean): Use LangGraph workflow.\n" +
      "- enableRAG (boolean): Enable RAG context.\n\n" +
      "\nSSE Event Format (CopilotKit):\n" +
      "Each event is sent as: { type: string, data: object }\n" +
      "The backend does not strictly validate required fields; the frontend should handle missing or extra fields gracefully.\n" +
      "Allowed 'type' values: TEXT_MESSAGE_CONTENT, TOOL_CALL_START, RUN_FINISHED, RUN_ERROR, ...\n" +
      "Example event:\n" +
      "{\n  type: 'TEXT_MESSAGE_CONTENT',\n  data: { messageId: 'session-123-msg-1', delta: 'Hello', content: 'Hello', metadata: {} }\n}" +
      "\nSee CopilotKit docs for full event type list.",
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
      (async () => {
        try {
          const sessionId =
            query.sessionId && typeof query.sessionId === "string"
              ? query.sessionId
              : `session-${uuidv4()}`;

          // Stream agent execution
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
            },
          );

          // Emit CopilotKit-compliant SSE events
          for await (const chunk of stream) {
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
          console.error("[AgentController] /agent/stream error:", err);
          subscriber.error(err);
        }
      })();
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
      "Upload text documents to the RAG vector store for semantic search and context-aware responses.",
  })
  @ApiBody({ type: AddDocumentsDto })
  @ApiResponse({
    status: 200,
    description: "Documents added successfully.",
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
      "Perform a RAG-enhanced query that retrieves relevant context from the knowledge base before generating a response.",
  })
  @ApiBody({ type: RagQueryDto })
  @ApiResponse({
    status: 200,
    description: "RAG query result with retrieved context.",
    type: RagQueryResponseDto,
  })
  async ragQuery(@Body() dto: RagQueryDto): Promise<RagQueryResponseDto> {
    const sessionId = dto.sessionId || `session-${uuidv4()}`;
    const topK = dto.topK || 3;

    // Retrieve relevant documents
    const retrievedDocs = await this.ragService.similaritySearch(
      dto.query,
      topK,
    );

    // Build context from retrieved documents
    const context = retrievedDocs
      .map((doc, i) => `[${i + 1}] ${doc.pageContent}`)
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
      retrievedDocuments: retrievedDocs.map((doc) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      })),
      sessionId: sessionId,
      model: dto.model || "gpt-4",
    };
  }

  @Get("rag/documents")
  @ApiOperation({
    summary: "List all documents in the RAG knowledge base",
    description: "Retrieve all documents stored in the RAG vector store.",
  })
  @ApiResponse({
    status: 200,
    description: "List of all documents.",
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
      "Retrieve statistics about the RAG system, including document count and store status.",
  })
  @ApiResponse({
    status: 200,
    description: "RAG system statistics.",
    type: RagStatsDto,
  })
  async getRagStats(): Promise<RagStatsDto> {
    return this.ragService.getStats();
  }

  @Delete("rag/documents")
  @ApiOperation({
    summary: "Clear all documents from the RAG knowledge base",
    description: "Remove all documents from the RAG vector store.",
  })
  @ApiResponse({
    status: 200,
    description: "All documents cleared.",
  })
  async clearDocuments() {
    await this.ragService.clearAll();
    return {
      message: "All documents cleared successfully",
    };
  }
}
