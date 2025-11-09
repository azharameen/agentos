import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsIn } from "class-validator";
import { AGENT_MODELS } from "../shared/agent-models.constants";

export class AgentQueryDto {
  @ApiProperty({
    example: "session-123",
    required: false,
    description: "Session identifier (optional)",
  })
  @IsString()
  sessionId?: string;
  @ApiProperty({
    example: "What is the capital of France?",
    description: "Prompt to send to the AI agent",
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    example: AGENT_MODELS[0].name,
    enum: AGENT_MODELS.map((m) => m.name),
    description: "Model to use for the AI agent",
  })
  @IsString()
  @IsIn(AGENT_MODELS.map((m) => m.name))
  model: string;
}
