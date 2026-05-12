import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class BlockOrderDto {
  @ApiProperty({ example: 'Pedido suspeito — aguarda verificação documental.' })
  @IsString()
  @MinLength(5)
  reason: string;
}
