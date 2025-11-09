import { ModelType } from './agent-models.enum';
import { ModelConfig } from './agent-models.interface';

export const AGENT_MODELS: ModelConfig[] = [
  {
    name: 'gpt-4',
    deployment: 'gpt-4',
    apiVersion: '2024-05-01-preview',
    type: ModelType.CHAT
  },
  {
    name: 'gpt-5-pro',
    deployment: 'gpt-5-pro-agentos',
    apiVersion: '2024-12-01-preview',
    type: ModelType.CHAT
  },
  {
    name: 'gpt-5-codex',
    deployment: 'gpt-5-codex-agentos',
    apiVersion: '2025-04-01-preview',
    type: ModelType.RESPONSE
  }
];

// Embedding model configuration
export const EMBEDDING_MODEL = {
  name: "text-embedding-3-small",
  deployment: "text-embedding-3-small-2-agentos",
  apiVersion: "2024-02-01",
  dimensions: 1536,
};

// Default model for agentic tasks
export const DEFAULT_AGENT_MODEL = AGENT_MODELS[0].name;
