import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

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

  @ApiPropertyOptional({
    example: { norma: 'ISO 9001', peso: '50kg', resistencia: 'C30', certificado: 'IANORQ-2026' },
    description: 'Especificações técnicas adicionais do produto em formato JSON livre',
  })
  @IsObject()
  @IsOptional()
  metadata?: object;
}
