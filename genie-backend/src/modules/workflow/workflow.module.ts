import { Module, forwardRef } from "@nestjs/common";
import { WorkflowController } from "./workflow.controller";
import { LangGraphWorkflowService } from "./langgraph-workflow.service";
import { LangGraphPersistenceService } from "./langgraph-persistence.service";
import { WorkflowVersioningService } from "./workflow-versioning.service";
import { SharedModule } from "../shared/shared.module";
import { MemoryModule } from "../memory/memory.module";
import { RagModule } from "../rag/rag.module";

import { AgentModule } from "../agent/agent.module";

@Module({
    imports: [
        SharedModule,
        forwardRef(() => MemoryModule),
        forwardRef(() => RagModule),
        forwardRef(() => AgentModule)
    ],
    controllers: [WorkflowController],
    providers: [
        LangGraphWorkflowService,
        LangGraphPersistenceService,
        WorkflowVersioningService,
    ],
    exports: [
        LangGraphWorkflowService,
    ],
})
export class WorkflowModule { }
