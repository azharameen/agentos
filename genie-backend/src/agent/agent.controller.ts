import { Controller, Post, Body, Res, HttpStatus } from "@nestjs/common";
import { ApiOperation, ApiBody, ApiResponse } from "@nestjs/swagger";
import { AgenticTaskDto } from "./dto/agentic-task.dto";
import { AgentOrchestratorService } from "./services/agent-orchestrator.service";
import type { Response } from "express";

@Controller("agent")
export class AgentController {
  constructor(private readonly agentOrchestrator: AgentOrchestratorService) { }

  @Post("execute")
  @ApiOperation({
    summary: "Execute agentic workflow (multi-agent, debate, router, etc.)",
    description: "Executes agentic workflows with advanced modes via DTO."
  })
  @ApiBody({ type: AgenticTaskDto })
  @ApiResponse({
    status: 200,
    description: "Agentic workflow execution result.",
    type: Object
  })
  async executeAgenticTask(
    @Body() body: AgenticTaskDto,
    @Res() res: Response
  ): Promise<any> {
    // Always stream response
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");
    try {
      const sessionId = body.sessionId ?? `session-${Math.random().toString(36).substring(2, 10)}`;
      const stream = this.agentOrchestrator.executeTaskStream(
        body.prompt,
        sessionId,
        {
          model: body.model,
          temperature: body.temperature,
          maxIterations: body.maxIterations,
          enabledToolCategories: body.enabledToolCategories,
          specificTools: body.specificTools,
          useGraph: body.useGraph,
          enableRAG: body.enableRAG
        }
      );
      for await (const chunk of stream) {
        // Always write as newline-delimited JSON
        console.log(chunk);
        res.write(JSON.stringify(chunk) + "\n");
      }
      res.end();
    } catch (err) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR);
      res.write(
        JSON.stringify({
          type: "RUN_ERROR",
          data: { error: (err as Error).message }
        }) + "\n"
      );
      res.end();
    }
    return;
  }
}
