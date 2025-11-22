import { Module, forwardRef } from "@nestjs/common";
import { AgentController } from "./agent.controller";
import { AgentService } from "./agent.service";
import { ToolRegistryService } from "./tool-registry.service";
import { AgentToolsService } from "./agent-tools.service";
import { AgentOrchestratorService } from "./agent-orchestrator.service";
import { AgentPlanningService } from "./agent-planning.service";
import { AgentExecutionService } from "./agent-execution.service";
import { AgentCoordinationService } from "./agent-coordination.service";
import { SqliteProjectRepository } from './repositories/sqlite-project.repository';
import { LangChainAgentService } from "./langchain-agent.service";
import { MultiAgentCoordinatorService } from "./multi-agent-coordinator.service";
import { AgentManagerService } from "./agent-manager.service";
import { SharedModule } from "../shared/shared.module";
import { MemoryModule } from "../memory/memory.module";
import { RagModule } from "../rag/rag.module";
import { WorkflowModule } from "../workflow/workflow.module";
import { SafetyModule } from "../safety/safety.module";
import { CodeOpsModule } from "../code-ops/code-ops.module";

@Module({
  imports: [
    SharedModule,
    MemoryModule,
    RagModule,
    forwardRef(() => WorkflowModule),
    SafetyModule,
    CodeOpsModule,
  ],
  controllers: [
    AgentController,
  ],
  providers: [
    // Core agent services
    ToolRegistryService,
    LangChainAgentService,

    // Refactored orchestration services
    AgentPlanningService,
    AgentExecutionService,
    AgentCoordinationService,

    // Legacy and high-level services
    AgentOrchestratorService,
    AgentToolsService,
    AgentService,
    AgentManagerService,
    MultiAgentCoordinatorService,

    // Repositories
    SqliteProjectRepository,
    {
      provide: 'IProjectRepository',
      useClass: SqliteProjectRepository,
    },
  ],
  exports: [
    AgentOrchestratorService,
    AgentCoordinationService,
    AgentPlanningService,
    AgentExecutionService,
    ToolRegistryService,
    LangChainAgentService,
    'IProjectRepository',
  ],
})
export class AgentModule { }
