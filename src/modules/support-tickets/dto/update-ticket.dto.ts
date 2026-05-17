import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateTicketDto {
  @ApiPropertyOptional({ example: 'Assunto corrigido' })
  @IsString()
  @MinLength(5)
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  content?: object;
}
