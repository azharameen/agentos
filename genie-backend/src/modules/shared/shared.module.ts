import { Module, Global, forwardRef } from "@nestjs/common";
import { DatabasePoolService } from "./database-pool.service";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { AzureOpenAIAdapter } from "./azure-openai-adapter.service";
import { ObservabilityService } from "./observability.service";
import { TokenUsageService } from "./token-usage.service";
import { TracingService } from "./tracing.service";
import { ValidationService } from "./validation.service";
import { AgentMonitoringService } from "./agent-monitoring.service";
import { ConfigModule } from "@nestjs/config";
import { MemoryModule } from "../memory/memory.module";

@Global()
@Module({
    imports: [ConfigModule, forwardRef(() => MemoryModule)],
    providers: [
        DatabasePoolService,
        CircuitBreakerService,
        AzureOpenAIAdapter,
        ObservabilityService,
        TokenUsageService,
        TracingService,
        ValidationService,
        AgentMonitoringService,
    ],
    exports: [
        DatabasePoolService,
        CircuitBreakerService,
        AzureOpenAIAdapter,
        ObservabilityService,
        TokenUsageService,
        TracingService,
        ValidationService,
        AgentMonitoringService,
    ],
})
export class SharedModule { }
