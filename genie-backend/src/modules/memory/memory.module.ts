import { Module, forwardRef } from "@nestjs/common";
import { MemoryController } from "./memory.controller";
import { AgentMemoryService } from "./agent-memory.service";
import { MemorySqliteService } from "./memory-sqlite.service";
import { UnifiedMemoryService } from "./unified-memory.service";
import { SqliteVectorstoreService } from "./sqlite-vectorstore.service";
import { HnswVectorstoreService } from "./hnsw-vectorstore.service";
import { SharedModule } from "../shared/shared.module";

@Module({
    imports: [forwardRef(() => SharedModule)],
    controllers: [MemoryController],
    providers: [
        AgentMemoryService,
        MemorySqliteService,
        UnifiedMemoryService,
        SqliteVectorstoreService,
        HnswVectorstoreService,
    ],
    exports: [
        AgentMemoryService,
        UnifiedMemoryService,
        MemorySqliteService,
        SqliteVectorstoreService,
        HnswVectorstoreService,
    ],
})
export class MemoryModule { }
