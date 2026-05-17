import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class EscalateTicketDto {
  @ApiProperty({ example: 'Situação complexa que requer decisão do STATE.' })
  @IsString()
  @MinLength(10)
  reason: string;
}
