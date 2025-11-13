import * as Joi from "joi";

export const validationSchema = Joi.object({
  // Server
  PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  CORS_ORIGINS: Joi.string().default("*"),

  // Azure OpenAI (Required - minimal set)
  AZURE_OPENAI_ENDPOINT: Joi.string().uri().required(),
  AZURE_OPENAI_API_KEY: Joi.string().required(),
  AZURE_OPENAI_API_VERSION: Joi.string().default("2024-10-21"),
  AZURE_OPENAI_CHAT_DEPLOYMENT: Joi.string().default("gpt-4"),
  AZURE_OPENAI_GPT5_PRO_DEPLOYMENT: Joi.string().optional(),
  AZURE_OPENAI_GPT5_CODEX_DEPLOYMENT: Joi.string().optional(),
  AZURE_OPENAI_DEPLOYMENT_EMBEDDING: Joi.string().default(
    "text-embedding-3-small-2-agentos",
  ),
  AZURE_OPENAI_EMBEDDING_DEPLOYMENT: Joi.string().optional(), // Alias for compatibility

  // Database
  DB_DIR: Joi.string().default("./data"),
  VECTORSTORE_DB_DIR: Joi.string().default("./data"),
  LANGGRAPH_DB_DIR: Joi.string().default("./data"),
  MEMORY_DB_DIR: Joi.string().default("./data"),

  // RAG (Simplified)
  USE_SQLITE_VECTORSTORE: Joi.string().valid("true", "false").default("true"),
  RAG_SQLITE_PATH: Joi.string().default("./data/rag_store.sqlite"),
  RAG_TOP_K: Joi.number().min(1).max(20).default(3),
  RAG_SIMILARITY_THRESHOLD: Joi.number().min(0).max(1).default(0.7),
  ENABLE_HNSW_INDEX: Joi.string().valid("true", "false").default("false"),

  // Agent
  DEFAULT_AGENT_MODEL: Joi.string().default("gpt-4"),
  DEFAULT_TEMPERATURE: Joi.number().min(0).max(2).default(0.7),
  MAX_AGENT_ITERATIONS: Joi.number().min(1).max(50).default(10),

  // Tools
  TOOL_TIMEOUT_MS: Joi.number().min(1000).default(30000),
  TOOL_MAX_RETRIES: Joi.number().min(0).max(10).default(3),
  TOOL_ENABLE_LOGGING: Joi.string().valid("true", "false").default("true"),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid("debug", "info", "warn", "error")
    .default("info"),
  VERBOSE_LOGGING: Joi.string().valid("true", "false").default("false"),

  // Features
  ENABLE_RAG: Joi.string().valid("true", "false").default("true"),
  ENABLE_MEMORY_PERSISTENCE: Joi.string()
    .valid("true", "false")
    .default("true"),
  ENABLE_LANGGRAPH_WORKFLOWS: Joi.string()
    .valid("true", "false")
    .default("true"),
  ENABLE_STREAMING: Joi.string().valid("true", "false").default("true"),

  // Throttle
  THROTTLE_TTL: Joi.number().min(1000).default(60000),
  THROTTLE_LIMIT: Joi.number().min(1).default(10),

  // Auth (Optional)
  API_KEYS: Joi.string().optional(),
  JWT_SECRET: Joi.string().optional(),
  SESSION_SECRET: Joi.string().optional(),

  // Azure Content Safety (Optional)
  AZURE_CONTENT_SAFETY_ENDPOINT: Joi.string().uri().optional(),
  AZURE_CONTENT_SAFETY_API_KEY: Joi.string().optional(),
  CONTENT_SAFETY_ENABLED: Joi.string().valid("true", "false").default("false"),
  CONTENT_SAFETY_HATE_THRESHOLD: Joi.number().min(0).max(6).default(4),
  CONTENT_SAFETY_VIOLENCE_THRESHOLD: Joi.number().min(0).max(6).default(4),
  CONTENT_SAFETY_SEXUAL_THRESHOLD: Joi.number().min(0).max(6).default(4),
  CONTENT_SAFETY_SELFHARM_THRESHOLD: Joi.number().min(0).max(6).default(4),
});
