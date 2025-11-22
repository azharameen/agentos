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
  IsNotEmpty,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
} from "class-validator";
import { Type } from "class-transformer";
import { AGENT_MODELS } from "../../../shared/agent-models.constants";
import {
  IsSanitized,
  IsValidSessionId,
  IsModelName,
} from "../../../common/validators/custom-validators";

/**
 * Agent role configuration for multi-agent execution
 */
export class AgentRoleDto {
  @ApiProperty({
    description: "Unique identifier for the agent",
    example: "math-expert",
  })
  @IsString()
  @IsNotEmpty({ message: "Agent ID cannot be empty" })
  @MaxLength(50, { message: "Agent ID must not exceed 50 characters" })
  id: string;

  @ApiProperty({
    description: "Display name for the agent",
    example: "Math Expert",
  })
  @IsString()
  @IsNotEmpty({ message: "Agent name cannot be empty" })
  @MaxLength(100, { message: "Agent name must not exceed 100 characters" })
  name: string;

  @ApiProperty({
    description: "Description of the agent's capabilities",
    example: "Handles all mathematical calculations and analysis",
  })
  @IsString()
  @IsNotEmpty({ message: "Agent description cannot be empty" })
  @MaxLength(500, {
    message: "Agent description must not exceed 500 characters",
  })
  description: string;
  @ApiPropertyOptional({
    description: "Tool categories this agent can use",
    example: ["math", "calculator"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20, {
    message: "Cannot specify more than 20 tool categories per agent",
  })
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  toolCategories?: string[];
  @ApiPropertyOptional({
    description: "Specific tools this agent can use",
    example: ["calculator", "scientific_calculator"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, {
    message: "Cannot specify more than 50 tools per agent",
  })
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  specificTools?: string[];
  @ApiPropertyOptional({
    description: "Custom system prompt for this agent",
    example: "You are a math expert. Focus on accuracy and show your work.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000, {
    message: "System prompt must not exceed 2000 characters",
  })
  @IsSanitized()
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
  @IsNotEmpty({ message: "Prompt cannot be empty" })
  @MaxLength(10000, {
    message: "Prompt must not exceed 10000 characters",
  })
  @IsSanitized({ message: "Prompt contains potentially dangerous content" })
  prompt: string;
  @ApiPropertyOptional({
    description: "Session ID for maintaining conversation context",
    example: "session-123-abc",
  })
  @IsOptional()
  @IsString()
  @IsValidSessionId()
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
    description: "Agent persona to use (e.g., 'default', 'coder', 'writer')",
    example: "coder",
  })
  @IsOptional()
  @IsString()
  agent?: string;
  @ApiPropertyOptional({
    description: "Temperature for LLM (0.0 to 1.0)",
    example: 0.7,
    minimum: 0.0,
    maximum: 1.0,
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
  @ArrayMaxSize(20, {
    message: "Cannot enable more than 20 tool categories",
  })
  @IsString({ each: true })
  @MaxLength(50, {
    each: true,
    message: "Tool category name must not exceed 50 characters",
  })
  enabledToolCategories?: string[];

  @ApiPropertyOptional({
    description: "Use only specific tools by name",
    example: ["calculator", "current_time"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50, {
    message: "Cannot specify more than 50 tools",
  })
  @IsString({ each: true })
  @MaxLength(100, {
    each: true,
    message: "Tool name must not exceed 100 characters",
  })
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
  @ArrayMinSize(1, {
    message: "At least one agent is required for multi-agent mode",
  })
  @ArrayMaxSize(10, {
    message: "Cannot specify more than 10 agents",
  })
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
