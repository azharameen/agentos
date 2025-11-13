import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Public } from "../common/decorators/public.decorator";
import { TokenUsageService } from "../agent/services/token-usage.service";

@ApiTags("Health")
@Controller()
export class HealthController {
  constructor(private readonly tokenUsageService: TokenUsageService) {}

  @Public()
  @Get("health")
  @ApiOperation({ summary: "Health check endpoint" })
  @ApiResponse({
    status: 200,
    description: "Service is healthy",
    schema: {
      example: {
        status: "ok",
        timestamp: "2025-01-10T12:00:00.000Z",
        uptime: 3600,
      },
    },
  })
  healthCheck() {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Public()
  @Get("ready")
  @ApiOperation({ summary: "Readiness check endpoint" })
  @ApiResponse({
    status: 200,
    description: "Service is ready to accept requests",
  })
  readinessCheck() {
    return {
      status: "ready",
      timestamp: new Date().toISOString(),
    };
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
