import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';
import { TargetAudienceDto } from './create-report.dto';

export class UpdateReportDto {
  @ApiPropertyOptional({ example: 'Relatório Operacional Q1 2026 — Versão Corrigida' })
  @IsString()
  @MinLength(5)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Q1 2026 (Jan–Mar)' })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @ApiPropertyOptional({ enum: TargetAudienceDto })
  @IsEnum(TargetAudienceDto)
  @IsOptional()
  targetAudience?: TargetAudienceDto;
}
