import {
  IsString,
  IsNumber,
  IsOptional,
  IsObject,
  IsArray,
  Min,
  Max,
  IsBoolean,
} from "class-validator";

/**
 * Create workflow version DTO
 */
export class CreateWorkflowVersionDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

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
  maxIterations?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledToolCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specificTools?: string[];

  @IsOptional()
  @IsBoolean()
  useGraph?: boolean;

  @IsOptional()
  @IsBoolean()
  enableRAG?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * Snapshot prune request DTO
 */
export class PruneSnapshotsDto {
  @IsNumber()
  @Min(1)
  olderThanDays: number;
}
