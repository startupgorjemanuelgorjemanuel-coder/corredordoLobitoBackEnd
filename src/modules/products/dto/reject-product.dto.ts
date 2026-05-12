import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RejectProductDto {
  @ApiProperty({ example: 'Produto não cumpre os requisitos mínimos de qualidade definidos.', minLength: 5 })
  @IsString()
  @MinLength(5)
  reason: string;
}
