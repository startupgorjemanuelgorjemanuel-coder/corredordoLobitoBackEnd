import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class LogsQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ example: 'order', description: 'Filtrar por tipo de entidade' })
  @IsString()
  @IsOptional()
  entity?: string;

  @ApiPropertyOptional({ example: 'uuid-do-pedido', description: 'Filtrar por ID de entidade' })
  @IsString()
  @IsOptional()
  entityId?: string;

  @ApiPropertyOptional({ example: 'BLOCK_ORDER', description: 'Filtrar por tipo de acção' })
  @IsString()
  @IsOptional()
  action?: string;
}
