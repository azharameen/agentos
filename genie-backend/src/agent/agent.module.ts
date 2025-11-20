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
import { AzureOpenAIProvider } from "./providers/azure-openai.provider";
import { TokenUsageService } from "./services/token-usage.service";
import { TracingService } from "./services/tracing.service";
import { ContentSafetyService } from "./services/content-safety.service";
import { MultiAgentCoordinatorService } from "./services/multi-agent-coordinator.service";
import { WorkflowVersioningService } from "./services/workflow-versioning.service";
import { WorkflowController } from "./workflow.controller";
import { ContentSafetyController } from "./content-safety.controller";
import { RagController } from "./rag.controller";
import { MemoryController } from "./memory.controller";
import { ProjectContextLoaderService } from "./services/project-context-loader.service";
import { SourceAnalyzerService } from "./services/source-analyzer.service";
import { CodeOpsService } from "./services/code-ops.service";
import { ValidationService } from "./services/validation.service";
import { AgentManagerService } from "./services/agent-manager.service";

@Module({
  controllers: [
    AgentController,
    WorkflowController,
    ContentSafetyController,
    RagController,
    MemoryController,
  ],
  providers: [
    AzureOpenAIProvider,
    AgentService,
    AgentMemoryService,
    ToolRegistryService,
    ProjectContextLoaderService,
    SourceAnalyzerService,
    CodeOpsService,
    ValidationService,
    AgentManagerService,
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
    TokenUsageService,
    TracingService,
    ContentSafetyService,
    MultiAgentCoordinatorService,
    WorkflowVersioningService,
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
export class AgentModule { }
