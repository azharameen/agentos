import { Module, forwardRef } from "@nestjs/common";
import { RagController } from "./rag.controller";
import { RagService } from "./rag.service";
import { ProjectContextLoaderService } from "./project-context-loader.service";
import { SourceAnalyzerService } from "./source-analyzer.service";
import { SharedModule } from "../shared/shared.module";
import { MemoryModule } from "../memory/memory.module";

@Module({
    imports: [SharedModule, forwardRef(() => MemoryModule)],
    controllers: [RagController],
    providers: [
        RagService,
        ProjectContextLoaderService,
        SourceAnalyzerService,
    ],
    exports: [
        RagService,
        ProjectContextLoaderService,
        SourceAnalyzerService,
    ],
})
export class RagModule { }
