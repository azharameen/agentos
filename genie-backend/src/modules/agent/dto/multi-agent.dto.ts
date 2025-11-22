import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { CoordinationMode } from "../multi-agent-coordinator.service";
/**
 * Multi-agent execution response DTO
 */
export class MultiAgentResponseDto {
  @ApiProperty({
    description: "Aggregated response from all agents",
    type: "object",
    additionalProperties: true,
  })
  results: Record<string, any>;
}

/**
 * Agent role DTO
 */
export class AgentRoleDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  toolCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificTools?: string[];

  @IsOptional()
  @IsString()
  systemPrompt?: string;
}

/**
 * Multi-agent execution request DTO
 */
export class MultiAgentExecutionDto {
  @IsString()
  prompt: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AgentRoleDto)
  agents: AgentRoleDto[];

  @IsEnum(CoordinationMode)
  mode: CoordinationMode;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10)
  maxRounds?: number;
}
