import { registerAs } from "@nestjs/config";

export default registerAs("app", () => ({
  port: Number.parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  corsOrigins: process.env.CORS_ORIGINS?.split(",") || ["*"],

  azure: {
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiKey: process.env.AZURE_OPENAI_API_KEY,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-10-21",
    deployments: {
      chat: process.env.AZURE_OPENAI_CHAT_DEPLOYMENT || "gpt-4",
      gpt5Pro: process.env.AZURE_OPENAI_GPT5_PRO_DEPLOYMENT || "gpt-5-pro",
      gpt5Codex:
        process.env.AZURE_OPENAI_GPT5_CODEX_DEPLOYMENT || "gpt-5-codex",
      embedding:
        process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT ||
        "text-embedding-3-small-2-agentos",
    },
  },

  langchain: {
    tracingEnabled: process.env.LANGCHAIN_TRACING_V2 === "true",
    apiKey: process.env.LANGCHAIN_API_KEY,
    project: process.env.LANGCHAIN_PROJECT || "genie-backend",
    endpoint: process.env.LANGCHAIN_ENDPOINT,
  },

  database: {
    dir: process.env.DB_DIR || "./data",
    vectorstoreDir: process.env.VECTORSTORE_DB_DIR || "./data",
    langgraphDir: process.env.LANGGRAPH_DB_DIR || "./data",
    memoryDir: process.env.MEMORY_DB_DIR || "./data",
  },

  rag: {
    useSqlite: process.env.USE_SQLITE_VECTORSTORE === "true",
    topK: Number.parseInt(process.env.RAG_TOP_K || "3", 10),
    similarityThreshold: Number.parseFloat(
      process.env.RAG_SIMILARITY_THRESHOLD || "0.7",
    ),
    enableHnsw: process.env.ENABLE_HNSW_INDEX === "true",
  },

  agent: {
    defaultModel: process.env.DEFAULT_AGENT_MODEL || "gpt-4",
    defaultTemperature: Number.parseFloat(
      process.env.DEFAULT_TEMPERATURE || "0.7",
    ),
    maxIterations: Number.parseInt(
      process.env.MAX_AGENT_ITERATIONS || "10",
      10,
    ),
  },

  tools: {
    timeout: Number.parseInt(process.env.TOOL_TIMEOUT_MS || "30000", 10),
    maxRetries: Number.parseInt(process.env.TOOL_MAX_RETRIES || "3", 10),
    enableLogging: process.env.TOOL_ENABLE_LOGGING === "true",
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    verbose: process.env.VERBOSE_LOGGING === "true",
  },

  features: {
    enableRag: process.env.ENABLE_RAG !== "false",
    enableMemoryPersistence: process.env.ENABLE_MEMORY_PERSISTENCE !== "false",
    enableLanggraphWorkflows:
      process.env.ENABLE_LANGGRAPH_WORKFLOWS !== "false",
    enableStreaming: process.env.ENABLE_STREAMING !== "false",
  },

  throttle: {
    ttl: Number.parseInt(process.env.THROTTLE_TTL || "60000", 10),
    limit: Number.parseInt(process.env.THROTTLE_LIMIT || "10", 10),
  },

  auth: {
    apiKeys: process.env.API_KEYS?.split(",").filter((k) => k.trim()) || [],
    jwtSecret: process.env.JWT_SECRET,
    sessionSecret: process.env.SESSION_SECRET,
  },

  contentSafety: {
    enabled: process.env.CONTENT_SAFETY_ENABLED === "true",
    endpoint: process.env.AZURE_CONTENT_SAFETY_ENDPOINT,
    apiKey: process.env.AZURE_CONTENT_SAFETY_API_KEY,
    thresholds: {
      hate: Number.parseInt(
        process.env.CONTENT_SAFETY_HATE_THRESHOLD || "4",
        10,
      ),
      violence: Number.parseInt(
        process.env.CONTENT_SAFETY_VIOLENCE_THRESHOLD || "4",
        10,
      ),
      sexual: Number.parseInt(
        process.env.CONTENT_SAFETY_SEXUAL_THRESHOLD || "4",
        10,
      ),
      selfHarm: Number.parseInt(
        process.env.CONTENT_SAFETY_SELFHARM_THRESHOLD || "4",
        10,
      ),
    },
  },
}));
