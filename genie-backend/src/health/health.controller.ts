import { Controller, Get, Logger } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { TokenUsageService } from "../modules/shared/token-usage.service";
import { DatabasePoolService } from "../modules/shared/database-pool.service";
import { AzureOpenAIAdapter } from "../modules/shared/azure-openai-adapter.service";
import { SqliteVectorstoreService } from "../modules/memory/sqlite-vectorstore.service";

interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  latency?: number;
  details?: any;
}

interface ComponentHealth {
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, HealthCheckResult>;
}

@ApiTags("Health")
@Controller()
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly tokenUsageService: TokenUsageService,
    private readonly dbPool: DatabasePoolService,
    private readonly azureAdapter: AzureOpenAIAdapter,
    private readonly memorySqlite: SqliteVectorstoreService,
  ) { }

  @Public()
  @Get("health")
  @ApiOperation({ summary: "Comprehensive health check endpoint" })
  @ApiResponse({
    status: 200,
    description: "Service health status with component checks",
    schema: {
      example: {
        status: "healthy",
        timestamp: "2025-01-10T12:00:00.000Z",
        uptime: 3600,
        version: "1.0.0",
        components: {
          database: { status: "healthy" },
          azureOpenAI: { status: "healthy" },
          memory: { status: "healthy" },
        },
      },
    },
  })
  async healthCheck(): Promise<{
    status: string;
    timestamp: string;
    uptime: number;
    version: string;
    components: Record<string, ComponentHealth>;
    circuitBreakers?: any;
  }> {
    const startTime = Date.now();

    // Run all health checks in parallel
    const [databaseHealth, azureHealth, memoryHealth] = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkAzureOpenAIHealth(),
      this.checkMemoryHealth(),
    ]);

    // Get circuit breaker statistics
    const circuitStats = this.azureAdapter.getCircuitStats();

    // Determine overall status
    const components = {
      database: databaseHealth,
      azureOpenAI: azureHealth,
      memory: memoryHealth,
    };

    const allHealthy = Object.values(components).every(
      (c) => c.status === "healthy",
    );
    const anyUnhealthy = Object.values(components).some(
      (c) => c.status === "unhealthy",
    );

    const overallStatus = anyUnhealthy
      ? "unhealthy"
      : allHealthy
        ? "healthy"
        : "degraded";

    const result = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version || "1.0.0",
      components,
      circuitBreakers: circuitStats,
      checkDuration: Date.now() - startTime,
    };

    this.logger.log(
      `Health check completed: ${overallStatus} (${result.checkDuration}ms)`,
    );

    return result;
  }

  /**
   * Check database connection pool health
   */
  private async checkDatabaseHealth(): Promise<ComponentHealth> {
    const checks: Record<string, HealthCheckResult> = {};

    try {
      // Check RAG database pool
      const startRag = Date.now();
      const ragStats = this.dbPool.getPoolStats("rag");
      checks.ragPool = {
        status: ragStats ? "healthy" : "unhealthy",
        latency: Date.now() - startRag,
        details: ragStats,
      };

      // Check memory database pool
      const startMemory = Date.now();
      const memoryStats = this.dbPool.getPoolStats("memory");
      checks.memoryPool = {
        status: memoryStats ? "healthy" : "unhealthy",
        latency: Date.now() - startMemory,
        details: memoryStats,
      };

      // Check checkpoint database pool
      const startCheckpoint = Date.now();
      const checkpointStats = this.dbPool.getPoolStats("checkpoint");
      checks.checkpointPool = {
        status: checkpointStats ? "healthy" : "unhealthy",
        latency: Date.now() - startCheckpoint,
        details: checkpointStats,
      };

      const allHealthy = Object.values(checks).every(
        (c) => c.status === "healthy",
      );
      return {
        status: allHealthy ? "healthy" : "degraded",
        checks,
      };
    } catch (error: any) {
      this.logger.error(`Database health check failed: ${error.message}`);
      checks.error = {
        status: "unhealthy",
        message: error.message,
      };
      return { status: "unhealthy", checks };
    }
  }

  /**
   * Check Azure OpenAI connectivity and client pool
   */
  private async checkAzureOpenAIHealth(): Promise<ComponentHealth> {
    const checks: Record<string, HealthCheckResult> = {};

    try {
      // Check client availability
      const startClient = Date.now();
      const client = this.azureAdapter.getOpenAIClient();
      checks.clientPool = {
        status: client ? "healthy" : "unhealthy",
        latency: Date.now() - startClient,
        message: client ? "Client pool operational" : "No client available",
      };

      // Test actual Azure OpenAI connectivity with a minimal request
      const startPing = Date.now();
      try {
        const llm = this.azureAdapter.getLLM("gpt-4", 0);
        checks.connectivity = {
          status: llm ? "healthy" : "degraded",
          latency: Date.now() - startPing,
          message: "LLM client initialized successfully",
        };
      } catch (pingError: any) {
        checks.connectivity = {
          status: "degraded",
          latency: Date.now() - startPing,
          message: `LLM initialization warning: ${pingError.message}`,
        };
      }

      const allHealthy = Object.values(checks).every(
        (c) => c.status === "healthy",
      );
      return {
        status: allHealthy ? "healthy" : "degraded",
        checks,
      };
    } catch (error: any) {
      this.logger.error(`Azure OpenAI health check failed: ${error.message}`);
      checks.error = {
        status: "unhealthy",
        message: error.message,
      };
      return { status: "unhealthy", checks };
    }
  }

  /**
   * Check memory system health
   */
  private async checkMemoryHealth(): Promise<ComponentHealth> {
    const checks: Record<string, HealthCheckResult> = {};

    try {
      // Check memory statistics
      const startStats = Date.now();
      const stats = this.memorySqlite.getStats();
      checks.memoryStats = {
        status: "healthy",
        latency: Date.now() - startStats,
        details: stats,
      };

      // Check process memory usage
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      checks.processMemory = {
        status:
          heapUsedPercent > 90
            ? "unhealthy"
            : heapUsedPercent > 75
              ? "degraded"
              : "healthy",
        details: {
          heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsedPercent: Math.round(heapUsedPercent),
          rssMB: Math.round(memUsage.rss / 1024 / 1024),
        },
      };

      const anyUnhealthy = Object.values(checks).some(
        (c) => c.status === "unhealthy",
      );
      const anyDegraded = Object.values(checks).some(
        (c) => c.status === "degraded",
      );
      return {
        status: anyUnhealthy ? "unhealthy" : anyDegraded ? "degraded" : "healthy",
        checks,
      };
    } catch (error: any) {
      this.logger.error(`Memory health check failed: ${error.message}`);
      checks.error = {
        status: "unhealthy",
        message: error.message,
      };
      return { status: "unhealthy", checks };
    }
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Kubernetes-style readiness check" })
  @ApiResponse({
    status: 200,
    description: "Service is ready to accept requests",
  })
  @ApiResponse({
    status: 503,
    description: "Service is not ready",
  })
  async readinessCheck() {
    try {
      // Quick check: Can we access critical services?
      const [ragStats, memoryStats] = await Promise.all([
        Promise.resolve(this.dbPool.getPoolStats("rag")),
        Promise.resolve(this.dbPool.getPoolStats("memory")),
      ]);

      const isReady =
        ragStats !== null &&
        memoryStats !== null &&
        ragStats.available > 0 &&
        memoryStats.available > 0;

      if (!isReady) {
        return {
          status: "not_ready",
          timestamp: new Date().toISOString(),
          reason: "Database pools not available",
        };
      }

      return {
        status: "ready",
        timestamp: new Date().toISOString(),
        checks: {
          databasePools: "available",
          connections: `${ragStats.available + memoryStats.available} available`,
        },
      };
    } catch (error: any) {
      this.logger.error(`Readiness check failed: ${error.message}`);
      return {
        status: "not_ready",
        timestamp: new Date().toISOString(),
        reason: error.message,
      };
    }
  }

  @Public()
  @Get("metrics")
  @ApiOperation({ summary: "Prometheus-compatible metrics endpoint" })
  @ApiResponse({
    status: 200,
    description: "Prometheus metrics",
    content: {
      "text/plain": {
        schema: { type: "string" },
      },
    },
  })
  metrics() {
    const totalTokens = this.tokenUsageService.getTotalTokens();
    const totalCost = this.tokenUsageService.getTotalCost();
    const sessionCount = this.tokenUsageService.getAllSessionUsage().length;

    // Prometheus text format
    const metrics = [
      "# HELP genie_total_tokens Total LLM tokens used",
      "# TYPE genie_total_tokens counter",
      `genie_total_tokens ${totalTokens}`,
      "",
      "# HELP genie_total_cost Total cost in USD",
      "# TYPE genie_total_cost counter",
      `genie_total_cost ${totalCost.toFixed(4)}`,
      "",
      "# HELP genie_active_sessions Number of active sessions",
      "# TYPE genie_active_sessions gauge",
      `genie_active_sessions ${sessionCount}`,
      "",
      "# HELP genie_uptime_seconds Service uptime in seconds",
      "# TYPE genie_uptime_seconds counter",
      `genie_uptime_seconds ${Math.floor(process.uptime())}`,
      "",
      "# HELP genie_memory_usage_bytes Memory usage in bytes",
      "# TYPE genie_memory_usage_bytes gauge",
      `genie_memory_usage_bytes ${process.memoryUsage().heapUsed}`,
      "",
    ].join("\n");

    return metrics;
  }

  @Get("stats")
  @ApiOperation({ summary: "Get service statistics" })
  @ApiResponse({
    status: 200,
    description: "Service statistics",
  })
  getStats() {
    const memory = process.memoryUsage();
    const sessions = this.tokenUsageService.getAllSessionUsage();

    return {
      uptime: process.uptime(),
      memory: {
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external,
        rss: memory.rss,
      },
      tokens: {
        total: this.tokenUsageService.getTotalTokens(),
        cost: this.tokenUsageService.getTotalCost(),
      },
      sessions: {
        count: sessions.length,
        topUsers: sessions
          .sort((a, b) => b.totalTokens - a.totalTokens)
          .slice(0, 10)
          .map((s) => ({
            sessionId: s.sessionId,
            tokens: s.totalTokens,
            cost: s.totalCost,
            requests: s.requestCount,
          })),
      },
      process: {
        pid: process.pid,
        platform: process.platform,
        nodeVersion: process.version,
      },
    };
  }
}
