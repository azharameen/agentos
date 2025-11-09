import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsBoolean,
} from "class-validator";
import { AGENT_MODELS } from "../../shared/agent-models.constants";

/**
 * DTO for agentic task execution
 */
export class AgenticTaskDto {
  @ApiProperty({
    description: "The user prompt or task to execute",
    example:
      "Calculate 25 * 4 and then tell me what day it will be 10 days from now",
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: "Session ID for maintaining conversation context",
    example: "session-123-abc",
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: "Model to use for the agent",
    example: AGENT_MODELS[0].name,
    enum: AGENT_MODELS.map((m) => m.name),
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: "Temperature for LLM (0.0 to 1.0)",
    example: 0.7,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  temperature?: number;

  @ApiPropertyOptional({
    description: "Maximum iterations for agent execution",
    example: 10,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxIterations?: number;

  @ApiPropertyOptional({
    description:
      "Enable only specific tool categories (e.g., math, string, web)",
    example: ["math", "datetime"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledToolCategories?: string[];

  @ApiPropertyOptional({
    description: "Use only specific tools by name",
    example: ["calculator", "current_time"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificTools?: string[];

  @ApiPropertyOptional({
    description:
      "Use simple mode (direct LLM call without agent orchestration)",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  simpleMode?: boolean;

  @ApiPropertyOptional({
    description:
      "Use LangGraph workflow instead of LangChain AgentExecutor (enables advanced graph-based reasoning)",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  useGraph?: boolean;

  @ApiPropertyOptional({
    description:
      "Enable RAG (Retrieval-Augmented Generation) for context-aware responses",
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableRAG?: boolean;
}

/**
 * DTO for agent response
 */
export class AgenticResponseDto {
  @ApiProperty({
    description: "The agent output/response",
    example:
      "The result of 25 * 4 is 100. Ten days from now will be November 17, 2025.",
  })
  output: string;

  @ApiProperty({
    description: "Model used for execution",
    example: "gpt-4",
  })
  model: string;

  @ApiProperty({
    description: "Session ID",
    example: "session-123-abc",
  })
  sessionId: string;

  @ApiPropertyOptional({
    description: "Tools used during execution",
    example: ["calculator", "date_calculator"],
    type: [String],
  })
  toolsUsed?: string[];

  @ApiPropertyOptional({
    description: "Intermediate steps (for debugging)",
    type: "array",
  })
  intermediateSteps?: any[];
}
