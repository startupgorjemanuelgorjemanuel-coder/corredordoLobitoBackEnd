import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectReportDto {
  @ApiProperty({ example: 'Dados insuficientes para o período indicado. Rever secção 3.2.' })
  @IsString()
  @MinLength(10)
  reason: string;
}
