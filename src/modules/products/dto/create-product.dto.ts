import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Cimento Portland 50kg' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({ example: 'Cimento para construção civil de alta resistência' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'general', description: 'Usado pelo motor de imposto para calcular a taxa correcta' })
  @IsString()
  @MinLength(2)
  category: string;

  @ApiProperty({ example: 'uuid-da-empresa' })
  @IsString()
  companyId: string;
}
