import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateTaxDto {
  @ApiPropertyOptional({ example: 'IVA Angola 2027' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'general' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'angola' })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({ example: 0.16, minimum: 0, maximum: 1 })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  rate?: number;

  @ApiPropertyOptional({ example: '2027-01-01T00:00:00.000Z' })
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @ApiPropertyOptional({ example: '2027-12-31T23:59:59.000Z', nullable: true })
  @IsDateString()
  @IsOptional()
  effectiveTo?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
