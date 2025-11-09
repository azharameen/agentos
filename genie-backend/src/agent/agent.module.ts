import { Module } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { AgentMemoryService } from "./services/agent-memory.service";
import { ToolRegistryService } from "./services/tool-registry.service";
import { AgentToolsService } from "./services/agent-tools.service";
import { AzureOpenAIAdapter } from "./services/azure-openai-adapter.service";
import { AgentOrchestratorService } from "./services/agent-orchestrator.service";
import { LangChainAgentService } from "./services/langchain-agent.service";
import { RagService } from "./services/rag.service";
import { SqliteVectorstoreService } from "./services/sqlite-vectorstore.service";
import { HnswVectorstoreService } from "./services/hnsw-vectorstore.service";
import { LangGraphWorkflowService } from "./services/langgraph-workflow.service";
import { LangGraphPersistenceService } from "./services/langgraph-persistence.service";
import { MemorySqliteService } from "./services/memory-sqlite.service";
import { ObservabilityService } from "./services/observability.service";

@Module({
  controllers: [AgentController],
  providers: [
    AgentService,
    AgentMemoryService,
    ToolRegistryService,
    AgentToolsService,
    AzureOpenAIAdapter,
    AgentOrchestratorService,
    LangChainAgentService,
    RagService,
    SqliteVectorstoreService,
    HnswVectorstoreService,
    LangGraphWorkflowService,
    LangGraphPersistenceService,
    MemorySqliteService,
    ObservabilityService,
  ],
  exports: [
    AgentOrchestratorService,
    AgentMemoryService,
    ToolRegistryService,
    RagService,
    SqliteVectorstoreService,
    HnswVectorstoreService,
    LangChainAgentService,
    LangGraphWorkflowService,
    LangGraphPersistenceService,
    MemorySqliteService,
    ObservabilityService,
  ],
})
export class AgentModule {}
