import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateTaxDto {
  @ApiProperty({ example: 'IVA Angola' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'general', description: 'Categoria do produto a que se aplica' })
  @IsString()
  category: string;

  @ApiProperty({ example: 'angola', description: 'Código do país ou "all" para regra global' })
  @IsString()
  country: string;

  @ApiProperty({ example: 0.14, description: 'Taxa como decimal (0.14 = 14%)', minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  rate: number;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  effectiveFrom: string;

  @ApiPropertyOptional({ example: '2027-12-31T23:59:59.000Z', description: 'null = sem expiração' })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
