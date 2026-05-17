import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Nome Actualizado' })
  @IsString()
  @MinLength(2)
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: '+244 923 000 001' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ description: 'UUID da empresa' })
  @IsUUID()
  @IsOptional()
  companyId?: string;
}
