import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsNotEmpty } from "class-validator";

export class ExecuteWorkflowDto {
    @ApiProperty({
        description: "Prompt or input for the workflow",
        example: "Analyze the security of this project",
    })
    @IsString()
    @IsNotEmpty()
    prompt: string;

    @ApiPropertyOptional({
        description: "Session ID for maintaining conversation context",
        example: "session-123",
    })
    @IsOptional()
    @IsString()
    sessionId?: string;

    @ApiPropertyOptional({
        description: "Specific version of the workflow to execute (default: latest)",
        example: "1",
    })
    @IsOptional()
    @IsString()
    version?: string;
}
