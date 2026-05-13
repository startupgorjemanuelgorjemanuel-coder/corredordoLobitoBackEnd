import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class StaffValidateProductDto {
  @ApiProperty({ example: true, description: 'true = documentação válida, false = devolve ao PRODUCER' })
  @IsBoolean()
  valid: boolean;

  @ApiPropertyOptional({ example: 'Especificações técnicas completas e conformes.', minLength: 5 })
  @IsString()
  @MinLength(5)
  @IsOptional()
  notes?: string;
}
