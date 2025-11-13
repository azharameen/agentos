import {
  Controller,
  Post,
  Body,
  UseGuards
} from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags, ApiBody } from "@nestjs/swagger";
import { ThrottlerGuard } from "@nestjs/throttler";

import { AgenticTaskDto, AgenticResponseDto } from "./dto/agentic-task.dto";
import { AgentOrchestratorService } from "./services/agent-orchestrator.service";


@UseGuards(ThrottlerGuard)
@Controller("agent")
// TODO: Add API key/auth guard for production security
@ApiTags("Agent")
export class AgentController {
  constructor(private readonly agentOrchestrator: AgentOrchestratorService) { }

  @Post("execute")
  @ApiOperation({
    summary: "Execute agentic workflow (multi-agent, debate, router, etc.)",
    description: "Executes agentic workflows with advanced modes via DTO.",
  })
  @ApiBody({ type: AgenticTaskDto })
  @ApiResponse({
    status: 200,
    description: "Agentic workflow execution result.",
    type: AgenticResponseDto,
  })
  async executeAgenticTask(@Body() body: AgenticTaskDto): Promise<AgenticResponseDto> {
    return await this.agentOrchestrator.executeAgenticTask(body);
  }

}
