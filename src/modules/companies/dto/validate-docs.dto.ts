import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ValidateDocsDto {
  @ApiProperty({ example: true, description: 'true = válido (avança para under_review), false = devolve para pending' })
  @IsBoolean()
  valid: boolean;

  @ApiPropertyOptional({ example: 'Documentação completa e válida.' })
  @IsString()
  @IsOptional()
  notes?: string;
}
