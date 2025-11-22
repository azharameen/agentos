import { Injectable, Logger } from "@nestjs/common";
import { ContentSafetyService } from "../safety/content-safety.service";
import { RagService } from "../rag/rag.service";
import { UnifiedMemoryService } from "../memory/unified-memory.service";

/**
 * Agent Planning Service
 * 
 * Handles pre-execution planning and preparation:
 * - Content safety validation
 * - RAG context retrieval
 * - Memory context loading
 * - Tool selection and configuration
 * 
 * Extracted from AgentOrchestratorService for better separation of concerns
 * Updated to use UnifiedMemoryService for all memory operations
 */
@Injectable()
export class AgentPlanningService {
  private readonly logger = new Logger(AgentPlanningService.name);

  constructor(
    private readonly contentSafety: ContentSafetyService,
    private readonly ragService: RagService,
    private readonly memoryService: UnifiedMemoryService,
  ) { }

  /**
   * Validate input prompt for content safety
   */
  async validatePrompt(
    prompt: string,
    sessionId: string,
  ): Promise<{
    safe: boolean;
    violations?: Array<{
      category: string;
      severity: number;
      threshold: number;
    }>;
  }> {
    try {
      const safetyResult = await this.contentSafety.analyzeText(prompt);

      if (!safetyResult.safe) {
        this.logger.warn(
          `Content safety violation for session ${sessionId}: ${JSON.stringify(safetyResult.violations)}`,
        );
      }

      return safetyResult;
    } catch (error: any) {
      this.logger.error(`Content safety check failed: ${error.message}`);
      // Fail open: allow execution if safety check fails
      return { safe: true };
    }
  }

  /**
   * Gather RAG context if enabled
   */
  async gatherRAGContext(
    prompt: string,
    sessionId: string,
    enableRAG: boolean = true,
  ): Promise<string | null> {
    if (!enableRAG) {
      return null;
    }

    try {
      const ragResults = await this.ragService.similaritySearch(prompt, 3);

      if (ragResults.length > 0) {
        const context = ragResults
          .map((r, i) => `[Context ${i + 1}]: ${r.pageContent}`)
          .join('\n\n');

        this.logger.debug(
          `Retrieved ${ragResults.length} RAG documents for session ${sessionId}`,
        );

        return context;
      }

      return null;
    } catch (error: any) {
      this.logger.warn(`RAG retrieval failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Load conversation history and context from memory
   */
  async loadMemoryContext(
    sessionId: string,
    maxMessages: number = 10,
  ): Promise<{
    conversationHistory: any[];
    sessionContext: Record<string, any>;
  }> {
    try {
      const conversationHistory = await this.memoryService.getRecentMessages(
        sessionId,
        maxMessages,
      );

      const sessionContext = await this.memoryService.getContext(sessionId);

      this.logger.debug(
        `Loaded ${conversationHistory.length} messages from memory for session ${sessionId}`,
      );

      return {
        conversationHistory,
        sessionContext,
      };
    } catch (error: any) {
      this.logger.error(`Failed to load memory context: ${error.message}`);
      return {
        conversationHistory: [],
        sessionContext: {},
      };
    }
  }

  /**
   * Prepare enhanced prompt with RAG context
   */
  prepareEnhancedPrompt(
    originalPrompt: string,
    ragContext: string | null,
    sessionContext: Record<string, any>
  ): string {
    let enhancedPrompt = originalPrompt;

    if (ragContext) {
      enhancedPrompt = `You have access to the following relevant information:\n\n${ragContext}\n\nUser Request: ${originalPrompt}`;
    }

    // Add session context if available
    if (Object.keys(sessionContext).length > 0) {
      const contextStr = Object.entries(sessionContext)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");

      enhancedPrompt = `[Session Context: ${contextStr}]\n\n${enhancedPrompt}`;
    }

    return enhancedPrompt;
  }

  /**
   * Select and configure tools based on options
   */
  selectTools(options: {
    enabledToolCategories?: string[];
    specificTools?: string[];
  }): {
    enabledCategories: string[];
    specificTools: string[];
  } {
    return {
      enabledCategories: options.enabledToolCategories || ["all"],
      specificTools: options.specificTools || []
    };
  }
}
