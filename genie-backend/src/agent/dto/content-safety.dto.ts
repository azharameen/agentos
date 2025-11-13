import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ContentSafetyAnalyzeDto {
  @ApiProperty({ description: 'Text content to analyze for safety violations' })
  @IsString()
  text: string;
}
