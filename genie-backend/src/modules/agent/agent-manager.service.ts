import { Injectable, Logger } from "@nestjs/common";
import { ProjectContextLoaderService } from "../rag/project-context-loader.service";
import { SourceAnalyzerService } from "../rag/source-analyzer.service";
import { CodeOpsService } from "../code-ops/code-ops.service";
import { ValidationService } from "../shared/validation.service";
import { LangChainAgentService } from "./langchain-agent.service";
import { RagService } from "../rag/rag.service";
import {
  ChatMessage,
  ChatResponse,
  SuggestedAction,
  ReferenceType,
  ActionType,
} from "../../shared/chat.interface";
import {
  ChangeSet,
  PreviewResult,
  ApplyResult,
} from "../../shared/code-ops.interface";
import type { ProjectContext } from "../../shared/project.interface";

/**
 * AgentManager orchestrates all agent-related services
 * Coordinates project understanding, code analysis, and code operations
 */
@Injectable()
export class AgentManagerService {
  private readonly logger = new Logger(AgentManagerService.name);

  constructor(
    private readonly projectContextLoader: ProjectContextLoaderService,
    private readonly sourceAnalyzer: SourceAnalyzerService,
    private readonly codeOps: CodeOpsService,
    private readonly validation: ValidationService,
    private readonly langchain: LangChainAgentService,
    private readonly rag: RagService,
  ) { }

  /**
   * Chat with the agent about code
   * Provides context-aware responses and code suggestions
   */
  async chat(
    message: string,
    options?: {
      projectName?: string;
      sessionId?: string;
      useRAG?: boolean;
    },
  ): Promise<ChatResponse> {
    this.logger.log(
      `Processing chat request for project: ${options?.projectName || "general"}`,
    );

    try {
      // Get project context if project specified
      let contextInfo = "";
      let context: ProjectContext | undefined;
      if (options?.projectName) {
        context = this.projectContextLoader.getCachedContext(
          options.projectName,
        );
        if (context) {
          contextInfo = this.buildContextSummary(context);
        } else {
          this.logger.warn(
            `Project ${options.projectName} not found, proceeding without context`,
          );
        }
      }

      // Query RAG for relevant documentation if enabled
      let ragContext = "";
      if (options?.useRAG && options?.projectName) {
        const ragResults = await this.rag.query({
          query: message,
          topK: 3,
        });
        ragContext = ragResults.results
          .map(
            (r) =>
              `[${r.document.metadata.source || "Unknown"}]: ${r.document.pageContent}`,
          )
          .join("\n\n");
      }

      // Build enhanced prompt with context
      const enhancedPrompt = this.buildEnhancedPrompt(
        message,
        contextInfo,
        ragContext,
      );

      // TODO: Integrate with LangChainAgentService.execute() with proper parameters
      // For now, return a formatted response based on context
      const responseOutput =
        contextInfo || ragContext
          ? `**Project Context:**\n${contextInfo}\n\n**Relevant Documentation:**\n${ragContext}\n\n**Your Query:** ${message}\n\nI can help you with code analysis, refactoring, and understanding your project. What specific aspect would you like to explore?`
          : `I received your message: "${enhancedPrompt}"\n\nTo provide better assistance, please register your project first using the /agent/projects/register endpoint.`;

      // Parse response for suggested actions
      const suggestedActions: SuggestedAction[] = [];

      const chatMessage: ChatMessage = {
        role: "agent",
        content: responseOutput,
        timestamp: new Date(),
        metadata: {
          projectName: options?.projectName,
        },
      };

      return {
        message: chatMessage,
        suggestedActions,
        references: context
          ? [
            {
              type: ReferenceType.FILE,
              path: context.rootPath,
              name: context.registration.name,
            },
          ]
          : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Chat failed: ${(error as Error).message || "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Analyze code and suggest improvements
   */
  async analyzeAndSuggest(
    projectName: string,
    filePath: string,
  ): Promise<ChatResponse> {
    this.logger.log(`Analyzing ${filePath} in ${projectName}`);

    try {
      // Analyze the file
      const analysis = await this.sourceAnalyzer.analyzeFile(
        projectName,
        filePath,
        { detailed: true },
      );

      // Generate suggestions based on analysis
      const suggestions: SuggestedAction[] = [];

      // Check for missing documentation
      const undocumentedSymbols = analysis.symbols.filter(
        (s) => !s.documentation,
      );
      if (undocumentedSymbols.length > 0) {
        suggestions.push({
          id: `doc-${Date.now()}`,
          type: ActionType.EXPLANATION,
          description: `${undocumentedSymbols.length} symbol(s) could benefit from documentation`,
          canExecute: false,
        });
      }

      const chatMessage: ChatMessage = {
        role: "agent",
        content:
          `Analysis complete for ${filePath}:\n\n` +
          `- Found ${analysis.symbols.length} symbols\n` +
          `- ${analysis.imports.length} imports\n` +
          `- ${analysis.exports.length} exports\n` +
          `- ${suggestions.length} suggestions for improvement`,
        timestamp: new Date(),
        metadata: {
          projectName,
        },
      };

      return {
        message: chatMessage,
        suggestedActions: suggestions,
      };
    } catch (error) {
      this.logger.error(
        `Analysis failed: ${(error as Error).message || "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Generate code changes based on natural language request
   */
  async generateCodeChanges(
    projectName: string,
    request: string,
    targetFiles?: string[],
  ): Promise<PreviewResult> {
    this.logger.log(`Generating code changes for ${projectName}: ${request}`);

    try {
      // Get project context
      const context = this.projectContextLoader.getCachedContext(projectName);
      if (!context) {
        throw new Error(`Project "${projectName}" not found`);
      }

      // TODO: Use LangChain to understand the request and generate changes
      // For now, create an empty changeset as a placeholder
      const changeSet: ChangeSet = {
        projectName,
        changes: [],
        metadata: {
          reason: request,
          timestamp: new Date(),
        },
      };

      // Preview the changes
      return this.codeOps.previewChanges(changeSet);
    } catch (error) {
      this.logger.error(
        `Code generation failed: ${(error as Error).message || "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Apply code changes with validation
   */
  async applyChangesWithValidation(
    changeSet: ChangeSet,
    skipValidation = false,
  ): Promise<ApplyResult> {
    this.logger.log(
      `Applying changes to ${changeSet.projectName} with ${changeSet.changes.length} changes`,
    );

    try {
      // Apply changes with backup
      const result = await this.codeOps.applyChanges(changeSet, {
        createBackup: true,
        skipValidation,
        gitCommit: false,
        dryRun: false,
      });

      // If validation failed, offer rollback
      if (result.validation && !result.validation.passed) {
        this.logger.warn(
          `Validation failed: ${result.validation.errors.length} errors`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Apply changes failed: ${(error as Error).message || "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Build a summary of project context for LLM
   */
  private buildContextSummary(context: ProjectContext): string {
    return `
Project: ${context.registration.name}
Type: ${context.registration.type || "unknown"}
Path: ${context.rootPath}
Files: ${context.files.length}
Package: ${context.packageJson?.name || "N/A"} v${context.packageJson?.version || "N/A"}

Key dependencies: ${Object.keys(context.packageJson?.dependencies || {})
        .slice(0, 10)
        .join(", ")}
    `.trim();
  }

  /**
   * Build enhanced prompt with context
   */
  private buildEnhancedPrompt(
    userMessage: string,
    contextInfo: string,
    ragContext: string,
  ): string {
    let prompt = userMessage;

    if (contextInfo) {
      prompt = `${contextInfo}\n\n${prompt}`;
    }

    if (ragContext) {
      prompt = `${prompt}\n\nRelevant documentation:\n${ragContext}`;
    }

    return prompt;
  }

  /**
   * Extract suggested actions from agent response
   * TODO: Enhance with better pattern matching and structured output parsing
   */
  private extractSuggestedActions(
    output: string,
  ): SuggestedAction[] {
    const actions: SuggestedAction[] = [];

    // Look for code blocks in the output - these are informational
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/g;
    const matches = Array.from(output.matchAll(codeBlockRegex));

    if (matches.length > 0) {
      actions.push({
        id: `code-review-${Date.now()}`,
        type: ActionType.ANALYSIS,
        description: `Found ${matches.length} code block(s) in response`,
        canExecute: false,
      });
    }

    // Look for refactoring suggestions
    if (output.toLowerCase().includes("refactor")) {
      actions.push({
        id: `refactor-${Date.now()}`,
        type: ActionType.CODE_REFACTORING,
        description: "Consider refactoring this code",
        canExecute: false,
      });
    }

    return actions;
  }
}
