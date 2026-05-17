import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResolveTicketDto {
  @ApiProperty({ example: 'Problema identificado e corrigido. Empresa reactivada.' })
  @IsString()
  @MinLength(10)
  resolution: string;
}
