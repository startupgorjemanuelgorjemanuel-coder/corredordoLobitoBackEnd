import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nome Actualizado' })
  @IsString()
  @MinLength(2)
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ description: 'UUID da empresa' })
  @IsUUID()
  @IsOptional()
  companyId?: string;
}
