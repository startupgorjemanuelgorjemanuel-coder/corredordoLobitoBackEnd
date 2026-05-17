import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResolveAlertDto {
  @ApiProperty({ example: 'Investigado e confirmado como falso positivo — empresa com histórico limpo.' })
  @IsString()
  @MinLength(10)
  notes: string;
}
