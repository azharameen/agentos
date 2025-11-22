import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsObject } from "class-validator";

export class ContentSafetyStatusDto {
  @ApiProperty({ description: "Whether content safety filtering is enabled" })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description: "Configured thresholds for each category",
    type: "object",
    additionalProperties: true,
  })
  @ApiProperty({
    description: "Configured thresholds for each category",
    type: "object",
    additionalProperties: true,
  })
  @IsObject()
  thresholds: Record<string, number>;
}
