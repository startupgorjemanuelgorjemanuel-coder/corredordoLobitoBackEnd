import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreatePriceProposalDto {
  @ApiProperty({ example: 'uuid-do-produto' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 45.00, description: 'Preço proposto em USD' })
  @IsNumber()
  @Min(0)
  proposedPrice: number;

  @ApiPropertyOptional({ example: 'USD', default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'Preço baseado no mercado regional de cimento em Q1 2026.' })
  @IsString()
  @IsOptional()
  justification?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  validFrom?: string;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  @IsDateString()
  @IsOptional()
  validTo?: string;
}
