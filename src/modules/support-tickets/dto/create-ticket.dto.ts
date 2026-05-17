import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString, MinLength } from 'class-validator';

export enum TicketType {
  technical  = 'technical',
  licensing  = 'licensing',
  billing    = 'billing',
  compliance = 'compliance',
  other      = 'other',
}

export class CreateTicketDto {
  @ApiProperty({ enum: TicketType, example: TicketType.licensing })
  @IsEnum(TicketType)
  type: TicketType;

  @ApiProperty({ example: 'Empresa bloqueada sem motivo aparente' })
  @IsString()
  @MinLength(5)
  subject: string;

  @ApiPropertyOptional({ example: { description: 'Detalhes adicionais...', attachments: [] } })
  @IsObject()
  @IsOptional()
  content?: object;
}
