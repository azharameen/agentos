import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AzureChatOpenAI } from "@langchain/openai";
import { ModelConfig } from "../../shared/agent-models.interface";
import { ModelType } from "../../shared/agent-models.enum";
import { AGENT_MODELS } from "../../shared/agent-models.constants";
import { DEFAULT_AGENT_MODEL } from "../../shared/agent-models.constants";

/**
 * AzureOpenAIAdapter
 * Provides LangChain-compatible Azure OpenAI LLM instances
 * Following Single Responsibility Principle: Only manages LLM instantiation and configuration
 */
@Injectable()
export class AzureOpenAIAdapter {
  private readonly logger = new Logger(AzureOpenAIAdapter.name);
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly models: ModelConfig[] = AGENT_MODELS;

  constructor(private readonly configService: ConfigService) {
    this.endpoint = this.configService.get<string>("app.azure.endpoint", "");
    this.apiKey = this.configService.get<string>("app.azure.apiKey", "");
  }

  /**
   * Get a LangChain-compatible Azure OpenAI LLM instance
   */
  getLLM(modelName?: string, temperature: number = 0.7): AzureChatOpenAI {
    if (!this.endpoint || !this.apiKey) {
      throw new Error("Azure OpenAI endpoint or API key not configured");
    }

    // Default to DEFAULT_AGENT_MODEL if no model specified
    const selectedModelName = modelName || DEFAULT_AGENT_MODEL;
    const modelConfig = this.models.find((m) => m.name === selectedModelName);

    if (!modelConfig) {
      this.logger.warn(
        `Model ${selectedModelName} not found, falling back to ${DEFAULT_AGENT_MODEL}`,
      );
      return this.getLLM(DEFAULT_AGENT_MODEL, temperature);
    }

    // Only support chat models for LangChain agents
    if (modelConfig.type !== ModelType.CHAT) {
      this.logger.warn(
        `Model ${selectedModelName} is not a chat model, falling back to ${DEFAULT_AGENT_MODEL}`,
      );
      return this.getLLM(DEFAULT_AGENT_MODEL, temperature);
    }

    this.logger.log(
      `Creating LangChain LLM for model: ${modelConfig.name} (deployment: ${modelConfig.deployment})`,
    );

    return new AzureChatOpenAI({
      azureOpenAIApiKey: this.apiKey,
      azureOpenAIApiInstanceName: this.extractInstanceName(this.endpoint),
      azureOpenAIApiDeploymentName: modelConfig.deployment,
      azureOpenAIApiVersion: modelConfig.apiVersion,
      temperature,
      maxTokens: 2048,
    });
  }

  /**
   * Get available model names
   */
  getAvailableModels(): string[] {
    // Return all model names, not just chat models
    return this.models.map((m) => m.name);
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelName: string): ModelConfig | undefined {
    return this.models.find((m) => m.name === modelName);
  }

  /**
   * Extract instance name from endpoint URL
   */
  private extractInstanceName(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      // Extract the first part of the hostname (e.g., "my-instance" from "my-instance.openai.azure.com")
      return url.hostname.split(".")[0];
    } catch {
      this.logger.error(
        `Failed to extract instance name from endpoint: ${endpoint}`,
      );
      throw new Error("Invalid Azure OpenAI endpoint format");
    }
  }
}
