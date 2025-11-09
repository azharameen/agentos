import { Injectable, Logger } from "@nestjs/common";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  SafeToolWrapper,
  ToolMetadata,
  SafeToolConfig,
} from "../tools/tool.interface";
import { ToolCategory } from "../../shared/tool.constants";

/**
 * ToolRegistryService
 * Manages registration, discovery, and invocation of agent tools
 * Following Single Responsibility Principle: Only manages tool lifecycle
 *
 * Updated to use SafeToolWrapper for enhanced safety, validation, and error handling
 */
@Injectable()
export class ToolRegistryService {
  private readonly logger = new Logger(ToolRegistryService.name);

  // Map of tool name to SafeToolWrapper (for enhanced safety)
  private safeTools = new Map<string, SafeToolWrapper>();

  // Map of tool name to raw LangChain tool (for backward compatibility)
  private tools = new Map<string, DynamicStructuredTool>();

  // Map of tool name to metadata
  private toolMetadata = new Map<string, ToolMetadata>();

  /**
   * Register a SafeToolWrapper (enhanced version with validation and safety features)
   */
  registerSafeTool(safeTool: SafeToolWrapper): void {
    const metadata = safeTool.getMetadata();
    const tool = safeTool.getTool();

    this.safeTools.set(metadata.name, safeTool);
    this.tools.set(metadata.name, tool);
    this.toolMetadata.set(metadata.name, metadata);

    this.logger.log(
      `Registered safe tool: ${metadata.name} (${metadata.category})`,
    );
  }

  /**
   * Register a new tool with the agent (legacy method - creates SafeToolWrapper internally)
   */
  registerTool(
    name: string,
    description: string,
    schema: z.ZodObject<any>,
    func: (input: any) => Promise<string>,
    category: ToolCategory = ToolCategory.GENERAL,
    enabled: boolean = true,
    safetyConfig?: SafeToolConfig,
  ): void {
    try {
      const tool = new DynamicStructuredTool({
        name,
        description,
        schema,
        func,
      });

      const metadata: ToolMetadata = {
        name,
        description,
        category,
        enabled,
      };

      const safeTool = new SafeToolWrapper(tool, metadata, safetyConfig);

      this.safeTools.set(name, safeTool);
      this.tools.set(name, tool);
      this.toolMetadata.set(name, metadata);

      this.logger.log(`Registered tool: ${name} (${category})`);
    } catch (error: any) {
      this.logger.error(`Failed to register tool ${name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a SafeToolWrapper by name
   */
  getSafeTool(name: string): SafeToolWrapper | undefined {
    const safeTool = this.safeTools.get(name);
    if (!safeTool || !safeTool.isEnabled()) {
      return undefined;
    }
    return safeTool;
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): DynamicStructuredTool | undefined {
    const metadata = this.toolMetadata.get(name);
    if (!metadata?.enabled) {
      this.logger.warn(`Tool ${name} is disabled or not found`);
      return undefined;
    }
    return this.tools.get(name);
  }

  /**
   * Get all enabled tools
   */
  getAllTools(): DynamicStructuredTool[] {
    const enabledTools: DynamicStructuredTool[] = [];

    for (const [name, metadata] of this.toolMetadata.entries()) {
      if (metadata.enabled) {
        const tool = this.tools.get(name);
        if (tool) {
          enabledTools.push(tool);
        }
      }
    }

    return enabledTools;
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): DynamicStructuredTool[] {
    const categoryTools: DynamicStructuredTool[] = [];

    for (const [name, metadata] of this.toolMetadata.entries()) {
      if (metadata.enabled && metadata.category === category) {
        const tool = this.tools.get(name);
        if (tool) {
          categoryTools.push(tool);
        }
      }
    }

    return categoryTools;
  }

  /**
   * Get tool metadata
   */
  getToolMetadata(name: string): ToolMetadata | undefined {
    return this.toolMetadata.get(name);
  }

  /**
   * Get all tool metadata
   */
  getAllToolMetadata(): ToolMetadata[] {
    return Array.from(this.toolMetadata.values());
  }

  /**
   * Enable or disable a tool
   */
  setToolEnabled(name: string, enabled: boolean): void {
    const metadata = this.toolMetadata.get(name);
    if (metadata) {
      metadata.enabled = enabled;
      this.logger.log(`Tool ${name} ${enabled ? "enabled" : "disabled"}`);
    } else {
      this.logger.warn(
        `Cannot set enabled state for non-existent tool: ${name}`,
      );
    }
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    const deleted = this.tools.delete(name) && this.toolMetadata.delete(name);
    if (deleted) {
      this.logger.log(`Unregistered tool: ${name}`);
    }
    return deleted;
  }

  /**
   * Check if a tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.has(name) && this.toolMetadata.has(name);
  }

  /**
   * Get tool statistics
   */
  getToolStats(): {
    totalTools: number;
    enabledTools: number;
    disabledTools: number;
    categories: string[];
  } {
    const metadata = Array.from(this.toolMetadata.values());
    const categories = [
      ...new Set(metadata.map((m) => m.category || "general")),
    ];

    return {
      totalTools: metadata.length,
      enabledTools: metadata.filter((m) => m.enabled).length,
      disabledTools: metadata.filter((m) => !m.enabled).length,
      categories,
    };
  }

  /**
   * Invoke a tool directly (for testing or manual invocation)
   */
  async invokeTool(name: string, input: any): Promise<string> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found or disabled`);
    }

    try {
      this.logger.debug(
        `Invoking tool ${name} with input: ${JSON.stringify(input)}`,
      );
      const result = await tool.invoke(input);
      this.logger.debug(`Tool ${name} returned: ${result}`);
      return result;
    } catch (error) {
      this.logger.error(`Tool ${name} invocation failed: ${error.message}`);
      throw error;
    }
  }
}
