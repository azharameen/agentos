import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsIn, IsOptional, IsNotEmpty } from "class-validator";
import { AGENT_MODELS } from "../../../shared/agent-models.constants";

/**
 * DTO for legacy agent query endpoint
 * @deprecated Use AgenticTaskDto with /agent/execute instead
 */
export class AgentQueryDto {
    @ApiPropertyOptional({
        description:
            "Session identifier for maintaining conversation context across multiple requests",
        example: "session-123-abc-def",
    })
    @IsOptional()
    @IsString()
    sessionId?: string;

    @ApiProperty({
        description: "The user prompt or query to send to the AI agent",
        example: "What is the capital of France?",
    })
    @IsString()
    @IsNotEmpty()
    prompt: string;

    @ApiProperty({
        description: "AI model to use for generating the response",
        example: AGENT_MODELS[0]?.name || "gpt-4",
        enum: AGENT_MODELS.map((m) => m.name),
    })
    @IsString()
    @IsIn(AGENT_MODELS.map((m) => m.name), {
        message: `model must be one of: ${AGENT_MODELS.map((m) => m.name).join(", ")}`,
    })
    model: string;
}
