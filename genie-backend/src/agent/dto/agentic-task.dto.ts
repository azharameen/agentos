import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  Max,
  IsBoolean,
  IsEnum,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AGENT_MODELS } from "../../shared/agent-models.constants";

/**
 * Agent role configuration for multi-agent execution
 */
export class AgentRoleDto {
  @ApiProperty({
    description: "Unique identifier for the agent",
    example: "math-expert",
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Display name for the agent",
    example: "Math Expert",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Description of the agent's capabilities",
    example: "Handles all mathematical calculations and analysis",
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    description: "Tool categories this agent can use",
    example: ["math", "calculator"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolCategories?: string[];

  @ApiPropertyOptional({
    description: "Specific tools this agent can use",
    example: ["calculator", "scientific_calculator"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificTools?: string[];

  @ApiPropertyOptional({
    description: "Custom system prompt for this agent",
    example: "You are a math expert. Focus on accuracy and show your work.",
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

/**
 * Collaboration mode for multi-agent execution
 */
export enum CoordinationMode {
  SEQUENTIAL = "sequential",
  PARALLEL = "parallel",
  DEBATE = "debate",
  ROUTER = "router",
}

/**
 * DTO for unified agentic task execution (single-agent, multi-agent, streaming)
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

  @ApiPropertyOptional({
    description:
      "Enable streaming mode (SSE) for real-time updates. If true, returns Observable<MessageEvent>; if false, returns final result.",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiPropertyOptional({
    description:
      "Enable multi-agent collaboration mode. If true, 'agents' and 'mode' parameters are required.",
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  multiAgent?: boolean;

  @ApiPropertyOptional({
    description:
      "List of agent roles for multi-agent execution (required if multiAgent is true)",
    type: [AgentRoleDto],
    example: [
      {
        id: "math-expert",
        name: "Math Expert",
        description: "Handles mathematical calculations",
        toolCategories: ["math"],
        specificTools: ["calculator"],
        systemPrompt: "You are a math expert.",
      },
      {
        id: "science-expert",
        name: "Science Expert",
        description: "Handles science questions",
        toolCategories: ["science"],
        specificTools: ["encyclopedia"],
        systemPrompt: "You are a science expert.",
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentRoleDto)
  agents?: AgentRoleDto[];

  @ApiPropertyOptional({
    description:
      "Collaboration mode for multi-agent execution (required if multiAgent is true)",
    enum: CoordinationMode,
    example: CoordinationMode.PARALLEL,
  })
  @IsOptional()
  @IsEnum(CoordinationMode)
  mode?: CoordinationMode;

  @ApiPropertyOptional({
    description: "Maximum rounds of collaboration for multi-agent execution",
    example: 3,
    minimum: 1,
    maximum: 10,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRounds?: number;
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
