import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { TokenUsageService } from "../modules/shared/token-usage.service";
import { DatabasePoolService } from "../modules/shared/database-pool.service";
import { AzureOpenAIAdapter } from "../modules/shared/azure-openai-adapter.service";
import { SqliteVectorstoreService } from "../modules/memory/sqlite-vectorstore.service";

@Module({
  controllers: [HealthController],
  providers: [
    TokenUsageService,
    DatabasePoolService,
    AzureOpenAIAdapter,
    SqliteVectorstoreService,
  ],
})
export class HealthModule { }
