import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export enum ReportTypeDto {
  OPERATIONAL = 'operational',
  FISCAL      = 'fiscal',
  STRATEGIC   = 'strategic',
  COMPLIANCE  = 'compliance',
}

export enum TargetAudienceDto {
  PUBLIC     = 'public',
  GOVERNMENT = 'government',
  INTERNAL   = 'internal',
}

export class CreateReportDto {
  @ApiProperty({ example: 'Relatório Operacional Q1 2026' })
  @IsString()
  @MinLength(5)
  title: string;

  @ApiProperty({ enum: ReportTypeDto })
  @IsEnum(ReportTypeDto)
  type: ReportTypeDto;

  @ApiPropertyOptional({ example: 'Q1 2026 (Jan–Mar)' })
  @IsString()
  @IsOptional()
  period?: string;

  @ApiPropertyOptional({ description: 'Conteúdo estruturado do relatório (JSON livre)' })
  @IsObject()
  @IsOptional()
  content?: Record<string, any>;

  @ApiProperty({ enum: TargetAudienceDto, default: TargetAudienceDto.INTERNAL })
  @IsEnum(TargetAudienceDto)
  @IsOptional()
  targetAudience?: TargetAudienceDto = TargetAudienceDto.INTERNAL;
}
